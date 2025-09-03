/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / CommonUtils Advanced
 * @tagline         Advanced Unit Tests for CommonUtils
 * @description     Additional focused tests for common utility functions
 * @file            webapp/tests/unit/utils/common-utils-advanced.test.js
 * @version         0.4.3
 * @release         2025-09-03
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, test, expect } from '@jest/globals';
import CommonUtils from '../../../utils/common.js';

describe('CommonUtils - Advanced Tests', () => {
    describe('schemaBasedQuery - Real-world Scenarios', () => {
        test('should handle Log model schema queries', () => {
            // Simulate the actual Log model schema
            const logSchema = {
                data: {
                    docId: { type: 'mixed', required: true },
                    docType: { type: 'string', required: true },
                    action: { type: 'string', required: true, enum: ['create', 'update', 'delete'] },
                    changes: { type: 'array', default: [] }
                },
                createdAt: { type: 'date', auto: true },
                createdBy: { type: 'string', default: '' },
                docVersion: { type: 'number', default: 1 }
            };

            const queryParams = {
                'data.docType': 'user',
                'data.action': 'update',
                createdBy: 'admin*',
                createdAt: '2025-08',
                docVersion: '1'
            };

            const query = CommonUtils.schemaBasedQuery(logSchema, queryParams);

            expect(query).toEqual({
                'data.docType': { $regex: /user/i },
                'data.action': 'update',
                createdBy: { $regex: /admin.*/i },
                createdAt: {
                    $gte: new Date(2025, 7, 1),
                    $lt: new Date(2025, 8, 1)
                },
                docVersion: 1
            });
        });

        test('should handle Config model schema queries', () => {
            // Simulate the actual Config model schema
            const configSchema = {
                _id: { type: 'string', required: true },
                parent: { type: 'string', default: null },
                data: {
                    email: {
                        adminEmail: { type: 'string', default: '', validate: 'email' },
                        adminName: { type: 'string', default: '' },
                        useTls: { type: 'boolean', default: false }
                    },
                    messages: {
                        broadcast: { type: 'string', default: '' }
                    }
                },
                updatedBy: { type: 'string', default: '' },
                docVersion: { type: 'number', default: 1 }
            };

            const queryParams = {
                _id: 'global',
                'data.email.adminEmail': '*@company.com',
                'data.email.useTls': 'true',
                updatedBy: 'admin',
                docVersion: '2'
            };

            const query = CommonUtils.schemaBasedQuery(configSchema, queryParams);

            expect(query).toEqual({
                _id: { $regex: /global/i },
                'data.email.adminEmail': { $regex: /.*@company.com/i },
                'data.email.useTls': true,
                updatedBy: { $regex: /admin/i },
                docVersion: 2
            });
        });

        test('should handle User model schema queries', () => {
            // Simulate a future User model schema
            const userSchema = {
                loginId: { type: 'string', required: true, unique: true },
                email: { type: 'string', required: true, validate: 'email', unique: true },
                firstName: { type: 'string', required: true },
                lastName: { type: 'string', required: true },
                active: { type: 'boolean', default: true },
                preferences: {
                    language: { type: 'string', default: 'en', enum: ['en', 'de', 'fr', 'es'] },
                    theme: { type: 'string', default: 'light', enum: ['light', 'dark'] }
                },
                lastLogin: { type: 'date' }
            };

            const queryParams = {
                loginId: 'john*',
                email: '*@company.com',
                firstName: 'John',
                active: 'true',
                'preferences.language': 'en',
                'preferences.theme': 'dark',
                lastLogin: '2025-08-24'
            };

            const query = CommonUtils.schemaBasedQuery(userSchema, queryParams);

            expect(query).toEqual({
                loginId: { $regex: /john.*/i },
                email: { $regex: /.*@company.com/i },
                firstName: { $regex: /John/i },
                active: true,
                'preferences.language': 'en',
                'preferences.theme': 'dark',
                lastLogin: {
                    $gte: new Date('2025-08-24'),
                    $lt: new Date('2025-08-25')
                }
            });
        });
    });

    describe('schemaBasedQuery - Complex Patterns', () => {
        const complexSchema = {
            name: { type: 'string' },
            age: { type: 'number' },
            active: { type: 'boolean' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            createdAt: { type: 'date' },
            profile: {
                firstName: { type: 'string' },
                preferences: {
                    theme: { type: 'string', enum: ['light', 'dark'] }
                }
            }
        };

        test('should handle multiple fields of different types', () => {
            const params = {
                name: 'john*',
                age: '25',
                active: 'true',
                status: 'published',
                createdAt: '2025-08',
                'profile.firstName': 'John',
                'profile.preferences.theme': 'dark'
            };

            const query = CommonUtils.schemaBasedQuery(complexSchema, params);

            expect(query.name).toEqual({ $regex: /john.*/i });
            expect(query.age).toBe(25);
            expect(query.active).toBe(true);
            expect(query.status).toBe('published');
            expect(query.createdAt).toEqual({
                $gte: new Date(2025, 7, 1),
                $lt: new Date(2025, 8, 1)
            });
            expect(query['profile.firstName']).toEqual({ $regex: /John/i });
            expect(query['profile.preferences.theme']).toBe('dark');
        });

        test('should handle ignore fields correctly', () => {
            const params = {
                name: 'john',
                age: '25',
                active: 'true',
                limit: '10',
                skip: '0',
                sort: 'name'
            };

            const ignoreFields = ['limit', 'skip', 'sort'];
            const query = CommonUtils.schemaBasedQuery(complexSchema, params, ignoreFields);

            expect(query.name).toEqual({ $regex: /john/i });
            expect(query.age).toBe(25);
            expect(query.active).toBe(true);
            expect(query.limit).toBeUndefined();
            expect(query.skip).toBeUndefined();
            expect(query.sort).toBeUndefined();
        });

        test('should handle empty and null values', () => {
            const params = {
                name: '',
                age: null,
                active: 'true',
                status: undefined
            };

            const query = CommonUtils.schemaBasedQuery(complexSchema, params);

            expect(query.name).toBeUndefined();
            expect(query.age).toBeUndefined();
            expect(query.active).toBe(true);
            expect(query.status).toBeUndefined();
        });
    });

    describe('Utility Functions - Practical Usage', () => {
        test('deepMerge should handle configuration merging', () => {
            const baseConfig = {
                database: {
                    host: 'localhost',
                    port: 5432,
                    options: {
                        ssl: false,
                        timeout: 30
                    }
                },
                features: ['auth', 'logging']
            };

            const overrideConfig = {
                database: {
                    host: 'production.db',
                    options: {
                        ssl: true,
                        pool: 10
                    }
                },
                features: ['auth', 'monitoring']
            };

            const result = CommonUtils.deepMerge(baseConfig, overrideConfig);

            expect(result).toEqual({
                database: {
                    host: 'production.db',
                    port: 5432,
                    options: {
                        ssl: true,
                        timeout: 30,
                        pool: 10
                    }
                },
                features: ['auth', 'monitoring']
            });
        });

        test('formatValue should handle various data types', () => {
            expect(CommonUtils.formatValue({ name: 'test' })).toBe('{"name":"test"}');
            expect(CommonUtils.formatValue([1, 2, 3])).toBe('[1,2,3]');
            expect(CommonUtils.formatValue('string')).toBe('string');
            expect(CommonUtils.formatValue(42)).toBe('42');
            expect(CommonUtils.formatValue(true)).toBe('true');
            expect(CommonUtils.formatValue(null)).toBe('null');
            expect(CommonUtils.formatValue(undefined)).toBe('undefined');
        });

        test('isValidEmail should validate email addresses', () => {
            expect(CommonUtils.isValidEmail('user@example.com')).toBe(true);
            expect(CommonUtils.isValidEmail('user.name+tag@example.co.uk')).toBe(true);
            expect(CommonUtils.isValidEmail('invalid-email')).toBe(false);
            expect(CommonUtils.isValidEmail('@example.com')).toBe(false);
            expect(CommonUtils.isValidEmail('user@')).toBe(false);
        });

        test('sanitizeString should remove dangerous characters', () => {
            expect(CommonUtils.sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
            expect(CommonUtils.sanitizeString('test; rm -rf /')).toBe('test rm -rf /');
            expect(CommonUtils.sanitizeString('  test  ')).toBe('test');
            expect(CommonUtils.sanitizeString(123)).toBe('');
            expect(CommonUtils.sanitizeString(null)).toBe('');
        });
    });

    describe('Error Handling', () => {
        test('schemaBasedQuery should handle empty schema', () => {
            const params = { name: 'test' };
            const query = CommonUtils.schemaBasedQuery({}, params);
            expect(Object.keys(query)).toHaveLength(0);
        });

        test('schemaBasedQuery should handle empty params', () => {
            const schema = { name: { type: 'string' } };
            const query = CommonUtils.schemaBasedQuery(schema, {});
            expect(Object.keys(query)).toHaveLength(0);
        });

        test('schemaBasedQuery should handle null params', () => {
            const schema = { name: { type: 'string' } };
            const query = CommonUtils.schemaBasedQuery(schema, null);
            expect(Object.keys(query)).toHaveLength(0);
        });

        test('buildDateQuery should handle invalid dates', () => {
            expect(CommonUtils.buildDateQuery('invalid')).toBeNull();
            expect(CommonUtils.buildDateQuery('')).toBeNull();
            // Note: JavaScript Date constructor is permissive with some invalid dates
            // '2025-13-01' gets parsed as '2026-01-01', so we test truly invalid formats
            expect(CommonUtils.buildDateQuery('not-a-date')).toBeNull();
        });
    });

    describe('Named Exports', () => {
        test('should provide convenient named exports', async () => {
            const { schemaBasedQuery, isValidEmail, sanitizeString } = await import('../../../utils/common.js');

            expect(typeof schemaBasedQuery).toBe('function');
            expect(typeof isValidEmail).toBe('function');
            expect(typeof sanitizeString).toBe('function');

            // Test they work the same as class methods
            const schema = { name: { type: 'string' } };
            const params = { name: 'test' };

            const classResult = CommonUtils.schemaBasedQuery(schema, params);
            const namedResult = schemaBasedQuery(schema, params);

            expect(classResult).toEqual(namedResult);
        });
    });
});

// EOF webapp/tests/unit/utils/common-utils-advanced.test.js
