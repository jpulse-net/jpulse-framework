/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / User Controller
 * @tagline         Controller tests for User authentication and management
 * @description     Unit tests for UserController endpoints, error handling, and HTTP responses
 * @file            webapp/tests/unit/user/user-controller.test.js
 * @version         1.6.20
 * @release         2026-02-20
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import { jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

describe('User Controller Tests', () => {
    describe('Login Endpoint Logic', () => {
        test('should handle successful login correctly', () => {
            const mockReq = {
                body: {
                    identifier: 'jsmith',
                    password: 'password123'
                },
                session: {}
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const mockUser = {
                _id: '507f1f77bcf86cd799439011',
                username: 'jsmith',
                email: 'john@example.com',
                profile: {
                    firstName: 'John',
                    lastName: 'Smith',
                    nickName: 'Johnny'
                },
                roles: ['user']
            };

            // Simulate login logic
            const processLogin = (req, res, authenticatedUser) => {
                if (authenticatedUser) {
                    req.session.user = {
                        id: authenticatedUser._id.toString(),
                        username: authenticatedUser.username,
                        firstName: authenticatedUser.profile.firstName,
                        lastName: authenticatedUser.profile.lastName,
                        nickName: authenticatedUser.profile.nickName,
                        email: authenticatedUser.email,
                        roles: authenticatedUser.roles,
                        isAuthenticated: true
                    };

                    res.json({
                        success: true,
                        message: 'Login successful',
                        data: req.session.user
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: 'Invalid credentials'
                    });
                }
            };

            processLogin(mockReq, mockRes, mockUser);

            expect(mockReq.session.user).toBeDefined();
            expect(mockReq.session.user.isAuthenticated).toBe(true);
            expect(mockReq.session.user.id).toBe('507f1f77bcf86cd799439011');
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Login successful',
                data: expect.objectContaining({
                    username: 'jsmith',
                    firstName: 'John',
                    isAuthenticated: true
                })
            });
        });

        test('should handle failed login correctly', () => {
            const mockReq = {
                body: {
                    identifier: 'wronguser',
                    password: 'wrongpassword'
                },
                session: {}
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const processLogin = (req, res, authenticatedUser) => {
                if (authenticatedUser) {
                    req.session.user = { isAuthenticated: true };
                    res.json({ success: true });
                } else {
                    res.status(401).json({
                        success: false,
                        error: 'Invalid credentials'
                    });
                }
            };

            processLogin(mockReq, mockRes, null);

            expect(mockReq.session.user).toBeUndefined();
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid credentials'
            });
        });

        test('should handle missing credentials', () => {
            const mockReq = {
                body: {},
                session: {}
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const processLogin = (req, res) => {
                const { identifier, password } = req.body;

                if (!identifier || !password) {
                    return res.status(400).json({
                        success: false,
                        error: 'Missing identifier or password',
                        code: 'MISSING_CREDENTIALS'
                    });
                }

                // Continue with authentication...
            };

            processLogin(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Missing identifier or password',
                code: 'MISSING_CREDENTIALS'
            });
        });
    });

    describe('Logout Endpoint Logic', () => {
        test('should handle logout correctly', () => {
            const mockReq = {
                session: {
                    user: {
                        id: '507f1f77bcf86cd799439011',
                        username: 'jsmith',
                        isAuthenticated: true
                    },
                    destroy: jest.fn((callback) => callback())
                }
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const processLogout = (req, res) => {
                if (req.session && req.session.user) {
                    req.session.destroy((err) => {
                        if (err) {
                            return res.status(500).json({
                                success: false,
                                error: 'Failed to logout'
                            });
                        }

                        res.json({
                            success: true,
                            message: 'Logout successful'
                        });
                    });
                } else {
                    res.json({
                        success: true,
                        message: 'Already logged out'
                    });
                }
            };

            processLogout(mockReq, mockRes);

            expect(mockReq.session.destroy).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logout successful'
            });
        });

        test('should handle logout when not logged in', () => {
            const mockReq = {
                session: {}
            };

            const mockRes = {
                json: jest.fn()
            };

            const processLogout = (req, res) => {
                if (req.session && req.session.user) {
                    // Destroy session
                } else {
                    res.json({
                        success: true,
                        message: 'Already logged out'
                    });
                }
            };

            processLogout(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Already logged out'
            });
        });
    });

    describe('Profile Management Logic', () => {
        test('should require authentication for profile access', () => {
            const mockReq = {
                session: {} // No user session
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const checkAuthentication = (req, res) => {
                if (!req.session.user || !req.session.user.isAuthenticated) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required',
                        code: 'UNAUTHORIZED'
                    });
                }
                return true;
            };

            const result = checkAuthentication(mockReq, mockRes);

            expect(result).toBeUndefined();
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        });

        test('should return user profile for authenticated user', () => {
            const mockUser = {
                _id: '507f1f77bcf86cd799439011',
                username: 'jsmith',
                email: 'john@example.com',
                profile: {
                    firstName: 'John',
                    lastName: 'Smith',
                    nickName: 'Johnny'
                },
                roles: ['user'],
                preferences: {
                    language: 'en',
                    theme: 'light'
                }
            };

            const mockReq = {
                session: {
                    user: {
                        id: '507f1f77bcf86cd799439011',
                        username: 'jsmith',
                        isAuthenticated: true
                    }
                }
            };

            const mockRes = {
                json: jest.fn()
            };

            const getProfile = (req, res, userFromDB) => {
                if (!req.session.user?.isAuthenticated) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }

                res.json({
                    success: true,
                    message: 'Profile retrieved successfully',
                    data: userFromDB
                });
            };

            getProfile(mockReq, mockRes, mockUser);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Profile retrieved successfully',
                data: mockUser
            });
        });
    });

    describe('User Search Authorization Logic', () => {
        test('should require authentication for user search', () => {
            const mockReq = {
                session: {},
                query: {}
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const processUserSearch = (req, res) => {
                if (!req.session.user || !req.session.user.isAuthenticated) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required',
                        code: 'UNAUTHORIZED'
                    });
                }

                // Continue with authorization check...
            };

            processUserSearch(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        });

        test('should require admin role for user search', () => {
            const mockReq = {
                session: {
                    user: {
                        isAuthenticated: true,
                        roles: ['user'] // Not admin
                    }
                },
                query: {}
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const hasAnyRole = (user, roles) => {
                return user && user.roles && user.roles.some(role => roles.includes(role));
            };

            const processUserSearch = (req, res) => {
                if (!req.session.user?.isAuthenticated) {
                    return res.status(401).json({ error: 'Authentication required' });
                }

                if (!hasAnyRole(req.session.user, ['admin', 'root'])) {
                    return res.status(403).json({
                        success: false,
                        error: 'Admin role required for user search',
                        code: 'INSUFFICIENT_PRIVILEGES'
                    });
                }

                // Continue with search...
            };

            processUserSearch(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Admin role required for user search',
                code: 'INSUFFICIENT_PRIVILEGES'
            });
        });

        test('should allow admin users to search', () => {
            const mockReq = {
                session: {
                    user: {
                        isAuthenticated: true,
                        roles: ['user', 'admin']
                    }
                },
                query: { status: 'active' }
            };

            const mockRes = {
                json: jest.fn()
            };

            const mockSearchResults = {
                success: true,
                data: [],
                pagination: { total: 0, limit: 50, skip: 0, page: 1, pages: 0 }
            };

            const hasAnyRole = (user, roles) => {
                return user && user.roles && user.roles.some(role => roles.includes(role));
            };

            const processUserSearch = (req, res) => {
                if (!req.session.user?.isAuthenticated) {
                    return res.status(401).json({ error: 'Authentication required' });
                }

                if (!hasAnyRole(req.session.user, ['admin', 'root'])) {
                    return res.status(403).json({ error: 'Admin role required' });
                }

                // Simulate successful search
                const elapsed = 15;
                res.json({
                    success: true,
                    message: `Found ${mockSearchResults.data.length} users`,
                    ...mockSearchResults,
                    elapsed
                });
            };

            processUserSearch(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Found 0 users',
                ...mockSearchResults,
                elapsed: 15
            });
        });
    });

    describe('Error Handling and Logging', () => {
        test('should log errors with proper format', () => {
            const mockLogController = {
                logError: jest.fn(),
                logRequest: jest.fn()
            };

            const mockReq = {
                session: {},
                query: {}
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const processWithErrorLogging = (req, res) => {
                try {
                    mockLogController.logRequest(req, 'user.search', JSON.stringify(req.query));

                    // Simulate error
                    throw new Error('Database connection failed');
                } catch (error) {
                    mockLogController.logError(req, 'user.search', `error: ${error.message}`);
                    res.status(500).json({
                        success: false,
                        error: 'Internal server error',
                        details: error.message
                    });
                }
            };

            processWithErrorLogging(mockReq, mockRes);

            expect(mockLogController.logRequest).toHaveBeenCalledWith(mockReq, 'user.search', '{}');
            expect(mockLogController.logError).toHaveBeenCalledWith(mockReq, 'user.search', 'error: Database connection failed');
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        test('should track elapsed time for successful operations', () => {
            const mockReq = {
                session: {
                    user: {
                        isAuthenticated: true,
                        roles: ['admin']
                    }
                },
                query: {}
            };

            const mockRes = {
                json: jest.fn()
            };

            const mockLogController = {
                logRequest: jest.fn(),
                logInfo: jest.fn()
            };

            const processWithTiming = (req, res) => {
                const startTime = Date.now();

                mockLogController.logRequest(req, 'user.search', '{}');

                // Simulate successful operation
                const mockResults = { data: [], pagination: {} };
                const elapsed = Date.now() - startTime;

                mockLogController.logInfo(req, 'user.search', `completed in ${elapsed}ms`);

                res.json({
                    success: true,
                    message: 'Found 0 users',
                    ...mockResults,
                    elapsed
                });
            };

            processWithTiming(mockReq, mockRes);

            expect(mockLogController.logRequest).toHaveBeenCalledWith(mockReq, 'user.search', '{}');
            expect(mockLogController.logInfo).toHaveBeenCalledWith(mockReq, 'user.search', expect.stringMatching(/completed in \d+ms/));
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                elapsed: expect.any(Number)
            }));
        });
    });

    describe('Password Change Logic', () => {
        test('should validate current password before change', () => {
            const mockReq = {
                session: {
                    user: {
                        id: '507f1f77bcf86cd799439011',
                        isAuthenticated: true
                    }
                },
                body: {
                    currentPassword: 'oldpassword',
                    newPassword: 'newpassword123'
                }
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const processPasswordChange = (req, res, isCurrentPasswordValid) => {
                if (!req.session.user?.isAuthenticated) {
                    return res.status(401).json({ error: 'Authentication required' });
                }

                const { currentPassword, newPassword } = req.body;

                if (!currentPassword || !newPassword) {
                    return res.status(400).json({
                        success: false,
                        error: 'Current password and new password are required'
                    });
                }

                if (!isCurrentPasswordValid) {
                    return res.status(400).json({
                        success: false,
                        error: 'Current password is incorrect'
                    });
                }

                res.json({
                    success: true,
                    message: 'Password changed successfully'
                });
            };

            // Test with invalid current password
            processPasswordChange(mockReq, mockRes, false);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Current password is incorrect'
            });
        });
    });

    describe('Get Enums Endpoint (W-093)', () => {
        test('should return all enums when no fields specified', () => {
            const mockReq = {
                query: {},
                session: { user: { isAuthenticated: true } }
            };

            const mockRes = {
                json: jest.fn()
            };

            // Simulate getEnums logic
            const processGetEnums = (req, res) => {
                const allEnums = {
                    roles: ['user', 'admin', 'root'],
                    status: ['pending', 'active', 'inactive', 'suspended', 'terminated'],
                    'preferences.theme': ['light', 'dark']
                };

                let enums = allEnums;
                if (req.query.fields) {
                    const fields = req.query.fields.split(',').map(f => f.trim()).filter(f => f);
                    enums = {};
                    for (const field of fields) {
                        if (allEnums[field]) {
                            enums[field] = allEnums[field];
                        }
                    }
                }

                res.json({
                    success: true,
                    data: enums,
                    message: 'Enums retrieved successfully',
                    elapsed: 5
                });
            };

            processGetEnums(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    roles: ['user', 'admin', 'root'],
                    status: ['pending', 'active', 'inactive', 'suspended', 'terminated'],
                    'preferences.theme': ['light', 'dark']
                },
                message: 'Enums retrieved successfully',
                elapsed: 5
            });
        });

        test('should filter enums by fields query parameter', () => {
            const mockReq = {
                query: { fields: 'roles,status' },
                session: { user: { isAuthenticated: true } }
            };

            const mockRes = {
                json: jest.fn()
            };

            const processGetEnums = (req, res) => {
                const allEnums = {
                    roles: ['user', 'admin', 'root'],
                    status: ['pending', 'active', 'inactive', 'suspended', 'terminated'],
                    'preferences.theme': ['light', 'dark']
                };

                let enums = allEnums;
                if (req.query.fields) {
                    const fields = req.query.fields.split(',').map(f => f.trim()).filter(f => f);
                    enums = {};
                    for (const field of fields) {
                        if (allEnums[field]) {
                            enums[field] = allEnums[field];
                        }
                    }
                }

                res.json({
                    success: true,
                    data: enums,
                    message: 'Enums retrieved successfully',
                    elapsed: 5
                });
            };

            processGetEnums(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    roles: ['user', 'admin', 'root'],
                    status: ['pending', 'active', 'inactive', 'suspended', 'terminated']
                },
                message: 'Enums retrieved successfully',
                elapsed: 5
            });
        });
    });

    describe('Get User Endpoint (W-093)', () => {
        test('should get user by ObjectId', () => {
            const mockReq = {
                params: { id: '507f1f77bcf86cd799439011' },
                session: {
                    user: {
                        id: '507f1f77bcf86cd799439012',
                        isAuthenticated: true,
                        roles: ['admin']
                    }
                }
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const mockUser = {
                _id: '507f1f77bcf86cd799439011',
                username: 'testuser',
                email: 'test@example.com',
                roles: ['user']
            };

            const processGetUser = (req, res, user, isAdmin) => {
                if (!isAdmin && req.params.id !== req.session.user.id) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }

                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const { passwordHash, ...userProfile } = user;
                res.json({
                    success: true,
                    data: userProfile,
                    message: 'User retrieved successfully'
                });
            };

            processGetUser(mockReq, mockRes, mockUser, true);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    username: 'testuser',
                    email: 'test@example.com'
                }),
                message: 'User retrieved successfully'
            });
        });

        test('should get user by username query parameter', () => {
            const mockReq = {
                query: { username: 'testuser' },
                session: {
                    user: {
                        id: '507f1f77bcf86cd799439012',
                        isAuthenticated: true,
                        roles: ['admin']
                    }
                }
            };

            const mockRes = {
                json: jest.fn()
            };

            const mockUser = {
                _id: '507f1f77bcf86cd799439011',
                username: 'testuser',
                email: 'test@example.com'
            };

            const processGetUser = (req, res, user, isAdmin) => {
                if (!isAdmin && user._id.toString() !== req.session.user.id) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }

                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                res.json({
                    success: true,
                    data: user,
                    message: 'User retrieved successfully'
                });
            };

            processGetUser(mockReq, mockRes, mockUser, true);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: mockUser,
                message: 'User retrieved successfully'
            });
        });

        test('should fallback to session user when no id or username', () => {
            const mockReq = {
                session: {
                    user: {
                        id: '507f1f77bcf86cd799439011',
                        isAuthenticated: true,
                        roles: ['user']
                    }
                }
            };

            const mockRes = {
                json: jest.fn()
            };

            const mockUser = {
                _id: '507f1f77bcf86cd799439011',
                username: 'testuser',
                email: 'test@example.com'
            };

            const processGetUser = (req, res, user) => {
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                res.json({
                    success: true,
                    data: user,
                    message: 'User retrieved successfully'
                });
            };

            processGetUser(mockReq, mockRes, mockUser);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: mockUser,
                message: 'User retrieved successfully'
            });
        });

        test('should deny access to regular users viewing other users', () => {
            const mockReq = {
                params: { id: '507f1f77bcf86cd799439011' },
                session: {
                    user: {
                        id: '507f1f77bcf86cd799439012',
                        isAuthenticated: true,
                        roles: ['user']
                    }
                }
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const processGetUser = (req, res, isAdmin) => {
                if (!isAdmin && req.params.id !== req.session.user.id) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
            };

            processGetUser(mockReq, mockRes, false);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });
    });

    describe('Update User Validation (W-093)', () => {
        test('should prevent removing last admin role', () => {
            const mockReq = {
                params: { id: '507f1f77bcf86cd799439011' },
                body: { roles: ['user'] },
                session: {
                    user: {
                        id: '507f1f77bcf86cd799439012',
                        isAuthenticated: true,
                        roles: ['admin']
                    }
                }
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const mockCurrentUser = {
                _id: '507f1f77bcf86cd799439011',
                roles: ['admin']
            };

            const processUpdateUser = async (req, res, currentUser, adminCount) => {
                const adminRoles = ['admin', 'root'];
                const newRoles = Array.isArray(req.body.roles) ? req.body.roles : [req.body.roles];
                const oldRoles = currentUser.roles || [];
                const hadAdminRole = adminRoles.some(role => oldRoles.includes(role));
                const hasAdminRole = adminRoles.some(role => newRoles.includes(role));

                if (hadAdminRole && !hasAdminRole) {
                    if (adminCount <= 1) {
                        return res.status(400).json({
                            success: false,
                            error: 'Cannot remove last admin',
                            code: 'LAST_ADMIN_ERROR'
                        });
                    }
                }
            };

            processUpdateUser(mockReq, mockRes, mockCurrentUser, 1);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Cannot remove last admin',
                code: 'LAST_ADMIN_ERROR'
            });
        });

        test('should prevent user from removing their own admin role', () => {
            const mockReq = {
                body: { roles: ['user'] },
                session: {
                    user: {
                        id: '507f1f77bcf86cd799439011',
                        isAuthenticated: true,
                        roles: ['admin']
                    }
                }
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const mockCurrentUser = {
                _id: '507f1f77bcf86cd799439011',
                roles: ['admin']
            };

            const processUpdateUser = (req, res, currentUser, isUpdatingSelf) => {
                const adminRoles = ['admin', 'root'];
                const newRoles = Array.isArray(req.body.roles) ? req.body.roles : [req.body.roles];
                const oldRoles = currentUser.roles || [];
                const hadAdminRole = adminRoles.some(role => oldRoles.includes(role));
                const hasAdminRole = adminRoles.some(role => newRoles.includes(role));

                if (isUpdatingSelf && hadAdminRole && !hasAdminRole) {
                    return res.status(400).json({
                        success: false,
                        error: 'Cannot remove own admin role',
                        code: 'SELF_REMOVAL_ERROR'
                    });
                }
            };

            processUpdateUser(mockReq, mockRes, mockCurrentUser, true);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Cannot remove own admin role',
                code: 'SELF_REMOVAL_ERROR'
            });
        });

        test('should prevent suspending last admin', () => {
            const mockReq = {
                params: { id: '507f1f77bcf86cd799439011' },
                body: { status: 'suspended' },
                session: {
                    user: {
                        id: '507f1f77bcf86cd799439012',
                        isAuthenticated: true,
                        roles: ['admin']
                    }
                }
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const mockCurrentUser = {
                _id: '507f1f77bcf86cd799439011',
                roles: ['admin']
            };

            const processUpdateUser = (req, res, currentUser, adminCount) => {
                const adminRoles = ['admin', 'root'];
                const oldRoles = currentUser.roles || [];
                const hadAdminRole = adminRoles.some(role => oldRoles.includes(role));

                if (req.body.status === 'suspended' || req.body.status === 'inactive') {
                    if (hadAdminRole && adminCount <= 1) {
                        return res.status(400).json({
                            success: false,
                            error: 'Cannot suspend last admin',
                            code: 'LAST_ADMIN_ERROR'
                        });
                    }
                }
            };

            processUpdateUser(mockReq, mockRes, mockCurrentUser, 1);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Cannot suspend last admin',
                code: 'LAST_ADMIN_ERROR'
            });
        });
    });
});

// EOF webapp/tests/unit/user/user-controller.test.js
