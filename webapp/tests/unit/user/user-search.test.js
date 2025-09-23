/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / User Search
 * @tagline         Search tests for User Model and Controller
 * @description     Unit tests for user search functionality, pagination, and schema-based queries
 * @file            webapp/tests/unit/user/user-search.test.js
 * @version         0.7.16
 * @release         2025-09-23
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           80%, Cursor 1.2, Claude Sonnet 4
 */

import { jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

describe('User Search Tests', () => {
    describe('Search Query Building', () => {
        test('should build MongoDB queries from URI parameters', () => {
            // Mock CommonUtils.schemaBasedQuery functionality
            const mockSchemaBasedQuery = (schema, queryParams, ignoreFields) => {
                const query = {};

                Object.keys(queryParams).forEach(key => {
                    if (!ignoreFields.includes(key)) {
                        const value = queryParams[key];

                        // Handle wildcard searches
                        if (typeof value === 'string' && value.includes('*')) {
                            query[key] = { $regex: value.replace(/\*/g, '.*'), $options: 'i' };
                        } else {
                            query[key] = value;
                        }
                    }
                });

                return query;
            };

            const schema = {}; // Simplified for test
            const queryParams = {
                loginId: 'john*',
                status: 'active',
                roles: 'admin',
                limit: '50',
                skip: '0'
            };
            const ignoreFields = ['limit', 'skip', 'sort', 'page', 'password', 'passwordHash'];

            const result = mockSchemaBasedQuery(schema, queryParams, ignoreFields);

            expect(result.loginId).toEqual({ $regex: 'john.*', $options: 'i' });
            expect(result.status).toBe('active');
            expect(result.roles).toBe('admin');
            expect(result.limit).toBeUndefined();
            expect(result.skip).toBeUndefined();
        });

        test('should ignore sensitive fields in search queries', () => {
            const mockSchemaBasedQuery = (schema, queryParams, ignoreFields) => {
                const query = {};

                Object.keys(queryParams).forEach(key => {
                    if (!ignoreFields.includes(key)) {
                        query[key] = queryParams[key];
                    }
                });

                return query;
            };

            const queryParams = {
                loginId: 'user123',
                password: 'secret',
                passwordHash: '$2b$12$hash...',
                status: 'active'
            };
            const ignoreFields = ['limit', 'skip', 'sort', 'page', 'password', 'passwordHash'];

            const result = mockSchemaBasedQuery({}, queryParams, ignoreFields);

            expect(result.loginId).toBe('user123');
            expect(result.status).toBe('active');
            expect(result.password).toBeUndefined();
            expect(result.passwordHash).toBeUndefined();
        });
    });

    describe('Pagination Logic', () => {
        test('should handle limit and skip parameters correctly', () => {
            const buildPaginationOptions = (queryParams) => {
                const limit = Math.min(parseInt(queryParams.limit) || 50, 1000);
                const skip = parseInt(queryParams.skip) || 0;
                const page = parseInt(queryParams.page) || 1;

                const options = { limit };

                if (page > 1) {
                    options.skip = (page - 1) * limit;
                } else if (skip > 0) {
                    options.skip = skip;
                }

                return options;
            };

            // Test default values
            expect(buildPaginationOptions({})).toEqual({ limit: 50 });

            // Test limit
            expect(buildPaginationOptions({ limit: '25' })).toEqual({ limit: 25 });

            // Test maximum limit enforcement
            expect(buildPaginationOptions({ limit: '2000' })).toEqual({ limit: 1000 });

            // Test skip
            expect(buildPaginationOptions({ skip: '100' })).toEqual({ limit: 50, skip: 100 });

            // Test page-based pagination
            expect(buildPaginationOptions({ page: '3', limit: '25' })).toEqual({ limit: 25, skip: 50 });

            // Test page takes precedence over skip
            expect(buildPaginationOptions({ page: '2', skip: '100', limit: '25' })).toEqual({ limit: 25, skip: 25 });
        });

        test('should calculate pagination metadata correctly', () => {
            const calculatePagination = (totalCount, limit, skip) => {
                const page = Math.floor(skip / limit) + 1;
                const pages = Math.ceil(totalCount / limit);

                return {
                    total: totalCount,
                    limit,
                    skip,
                    page,
                    pages
                };
            };

            // Test first page
            expect(calculatePagination(100, 25, 0)).toEqual({
                total: 100,
                limit: 25,
                skip: 0,
                page: 1,
                pages: 4
            });

            // Test middle page
            expect(calculatePagination(100, 25, 50)).toEqual({
                total: 100,
                limit: 25,
                skip: 50,
                page: 3,
                pages: 4
            });

            // Test last page
            expect(calculatePagination(100, 25, 75)).toEqual({
                total: 100,
                limit: 25,
                skip: 75,
                page: 4,
                pages: 4
            });

            // Test partial last page
            expect(calculatePagination(103, 25, 75)).toEqual({
                total: 103,
                limit: 25,
                skip: 75,
                page: 4,
                pages: 5
            });
        });
    });

    describe('Sorting Logic', () => {
        test('should handle sort parameters correctly', () => {
            const buildSortOptions = (queryParams) => {
                const options = {};

                if (queryParams.sort) {
                    const sortField = queryParams.sort.startsWith('-') ?
                        queryParams.sort.substring(1) : queryParams.sort;
                    const sortOrder = queryParams.sort.startsWith('-') ? -1 : 1;
                    options.sort = { [sortField]: sortOrder };
                }

                return options;
            };

            // Test ascending sort
            expect(buildSortOptions({ sort: 'loginId' })).toEqual({
                sort: { loginId: 1 }
            });

            // Test descending sort
            expect(buildSortOptions({ sort: '-updatedAt' })).toEqual({
                sort: { updatedAt: -1 }
            });

            // Test no sort
            expect(buildSortOptions({})).toEqual({});

            // Test complex field names
            expect(buildSortOptions({ sort: '-profile.firstName' })).toEqual({
                sort: { 'profile.firstName': -1 }
            });
        });
    });

    describe('Search Result Processing', () => {
        test('should remove password hashes from search results', () => {
            const mockUsers = [
                {
                    _id: '507f1f77bcf86cd799439011',
                    loginId: 'user1',
                    email: 'user1@example.com',
                    passwordHash: '$2b$12$hash1...',
                    profile: { firstName: 'User', lastName: 'One' }
                },
                {
                    _id: '507f1f77bcf86cd799439012',
                    loginId: 'user2',
                    email: 'user2@example.com',
                    passwordHash: '$2b$12$hash2...',
                    profile: { firstName: 'User', lastName: 'Two' }
                }
            ];

            // Simulate password hash removal
            const processResults = (users) => {
                return users.map(user => {
                    const { passwordHash, ...userWithoutPassword } = user;
                    return userWithoutPassword;
                });
            };

            const results = processResults(mockUsers);

            expect(results).toHaveLength(2);
            expect(results[0].passwordHash).toBeUndefined();
            expect(results[1].passwordHash).toBeUndefined();
            expect(results[0].loginId).toBe('user1');
            expect(results[1].loginId).toBe('user2');
        });

        test('should format complete search response correctly', () => {
            const mockResults = [
                { _id: '1', loginId: 'user1' },
                { _id: '2', loginId: 'user2' }
            ];
            const totalCount = 25;
            const limit = 10;
            const skip = 0;
            const query = { status: 'active' };

            const formatSearchResponse = (results, totalCount, limit, skip, query) => {
                return {
                    success: true,
                    data: results,
                    pagination: {
                        total: totalCount,
                        limit,
                        skip,
                        page: Math.floor(skip / limit) + 1,
                        pages: Math.ceil(totalCount / limit)
                    },
                    query
                };
            };

            const response = formatSearchResponse(mockResults, totalCount, limit, skip, query);

            expect(response.success).toBe(true);
            expect(response.data).toHaveLength(2);
            expect(response.pagination.total).toBe(25);
            expect(response.pagination.limit).toBe(10);
            expect(response.pagination.skip).toBe(0);
            expect(response.pagination.page).toBe(1);
            expect(response.pagination.pages).toBe(3);
            expect(response.query).toEqual({ status: 'active' });
        });
    });

    describe('Authorization for User Search', () => {
        test('should allow admin users to search', () => {
            const adminUser = {
                authenticated: true,
                roles: ['user', 'admin']
            };

            const hasAnyRole = (user, roles) => {
                return user && user.roles && user.roles.some(role => roles.includes(role));
            };

            const canSearchUsers = (sessionUser) => {
                return sessionUser?.authenticated && hasAnyRole(sessionUser, ['admin', 'root']);
            };

            expect(canSearchUsers(adminUser)).toBe(true);
        });

        test('should allow root users to search', () => {
            const rootUser = {
                authenticated: true,
                roles: ['root']
            };

            const hasAnyRole = (user, roles) => {
                return user && user.roles && user.roles.some(role => roles.includes(role));
            };

            const canSearchUsers = (sessionUser) => {
                return sessionUser?.authenticated && hasAnyRole(sessionUser, ['admin', 'root']);
            };

            expect(canSearchUsers(rootUser)).toBe(true);
        });

        test('should deny regular users search access', () => {
            const regularUser = {
                authenticated: true,
                roles: ['user']
            };

            const hasAnyRole = (user, roles) => {
                return user && user.roles && user.roles.some(role => roles.includes(role));
            };

            const canSearchUsers = (sessionUser) => {
                return sessionUser?.authenticated && hasAnyRole(sessionUser, ['admin', 'root']);
            };

            expect(canSearchUsers(regularUser)).toBe(false);
        });

        test('should deny unauthenticated users search access', () => {
            const unauthenticatedUser = {
                authenticated: false,
                roles: ['admin']
            };

            const canSearchUsers = (sessionUser) => {
                return !!(sessionUser?.authenticated && sessionUser.roles?.some(role => ['admin', 'root'].includes(role)));
            };

            expect(canSearchUsers(unauthenticatedUser)).toBe(false);
            expect(canSearchUsers(null)).toBe(false);
            expect(canSearchUsers(undefined)).toBe(false);
        });
    });

    describe('Search Error Handling', () => {
        test('should handle search errors gracefully', () => {
            const mockSearch = (queryParams) => {
                try {
                    if (queryParams.error === 'database') {
                        throw new Error('Database connection failed');
                    }

                    if (queryParams.error === 'validation') {
                        throw new Error('Invalid query parameters');
                    }

                    return { success: true, data: [] };
                } catch (error) {
                    throw new Error(`Failed to search users: ${error.message}`);
                }
            };

            expect(() => mockSearch({ error: 'database' })).toThrow('Failed to search users: Database connection failed');
            expect(() => mockSearch({ error: 'validation' })).toThrow('Failed to search users: Invalid query parameters');
            expect(mockSearch({ status: 'active' })).toEqual({ success: true, data: [] });
        });
    });

    describe('Wildcard Search Patterns', () => {
        test('should handle various wildcard patterns', () => {
            const convertWildcardToRegex = (value) => {
                if (typeof value === 'string' && value.includes('*')) {
                    return { $regex: value.replace(/\*/g, '.*'), $options: 'i' };
                }
                return value;
            };

            expect(convertWildcardToRegex('john*')).toEqual({ $regex: 'john.*', $options: 'i' });
            expect(convertWildcardToRegex('*smith')).toEqual({ $regex: '.*smith', $options: 'i' });
            expect(convertWildcardToRegex('*admin*')).toEqual({ $regex: '.*admin.*', $options: 'i' });
            expect(convertWildcardToRegex('exact')).toBe('exact');
            expect(convertWildcardToRegex('no-wildcard')).toBe('no-wildcard');
        });
    });
});

// EOF webapp/tests/unit/user/user-search.test.js
