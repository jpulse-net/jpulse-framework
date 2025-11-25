/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Auth Controller
 * @tagline         Unit tests for Auth Controller
 * @description     Tests for authentication controller middleware and utility functions
 * @file            webapp/tests/unit/controller/auth-controller.test.js
 * @version         1.2.5
 * @release         2025-11-25
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

// Import Jest globals and test utilities first
import { describe, test, expect, beforeEach, beforeAll, afterEach, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

// Set up global appConfig BEFORE any dynamic imports
TestUtils.setupGlobalMocksWithConsolidatedConfig();

// Declare variables for dynamically imported modules
let AuthController, CommonUtils, LogController, UserModel;

// Mock dependencies (must be before beforeAll)
jest.mock('../../../model/user.js');
jest.mock('../../../controller/log.js');
jest.mock('../../../utils/common.js');

describe('AuthController', () => {
    // Dynamic imports after appConfig is set up
    beforeAll(async () => {
        AuthController = (await import('../../../controller/auth.js')).default;
        CommonUtils = (await import('../../../utils/common.js')).default;
        LogController = (await import('../../../controller/log.js')).default;
        UserModel = (await import('../../../model/user.js')).default;
    });

    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        // Mock request object
        mockReq = {
            session: {},
            body: {},
            originalUrl: '/api/1/test',
            headers: {
                'x-forwarded-for': '127.0.0.1'
            },
            connection: {
                remoteAddress: '127.0.0.1'
            },
            ip: '127.0.0.1'
        };

        // Mock response object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            redirect: jest.fn()
        };

        // Mock next function
        mockNext = jest.fn();

        // Mock i18n translate function with new signature: translate(req, key, context)
        global.i18n = {
            default: 'en', // Add default property for getUserLanguage tests
            translate: jest.fn((req, key, context = {}) => {
                // Return predictable test values based on the key
                const translations = {
                    'controller.auth.roleRequired': `Insufficient privileges. Required role(s): ${context.roles}`,
                    'controller.auth.authenticationRequired': 'Authentication required',
                    'controller.auth.invalidCredentials': 'Invalid username/email or password',
                    'controller.auth.loginSuccess': 'Login successful',
                    'controller.auth.loginInternalError': `Internal server error during login: ${context.error}`,
                    'controller.auth.logoutSuccessful': 'Logout successful',
                    'controller.auth.logoutFailed': 'Failed to log out'
                };
                return translations[key] || key;
            })
        };

        // Set up spies on global modules (since auth controller uses global.*)
        jest.spyOn(global.CommonUtils, 'sendError').mockImplementation(() => {});
        jest.spyOn(global.LogController, 'logError').mockImplementation(() => {});
        jest.spyOn(global.LogController, 'logInfo').mockImplementation(() => {});

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('Authentication Helper Functions', () => {
        describe('isAuthenticated', () => {
            test('should return true for authenticated user', () => {
                mockReq.session.user = { isAuthenticated: true };

                const result = AuthController.isAuthenticated(mockReq);

                expect(result).toBe(true);
            });

            test('should return false for unauthenticated user', () => {
                mockReq.session.user = { isAuthenticated: false };

                const result = AuthController.isAuthenticated(mockReq);

                expect(result).toBe(false);
            });

            test('should return false for missing user session', () => {
                mockReq.session = {};

                const result = AuthController.isAuthenticated(mockReq);

                expect(result).toBe(false);
            });

            test('should return false for missing session', () => {
                delete mockReq.session;

                const result = AuthController.isAuthenticated(mockReq);

                expect(result).toBe(false);
            });
        });

        describe('isAuthorized', () => {
            test('should return true when user has required role', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['admin', 'user']
                };

                const result = AuthController.isAuthorized(mockReq, ['admin']);

                expect(result).toBe(true);
            });

            test('should return true when user has any of the required roles', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['user', 'editor']
                };

                const result = AuthController.isAuthorized(mockReq, ['admin', 'editor']);

                expect(result).toBe(true);
            });

            test('should return false when user lacks required role', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['user']
                };

                const result = AuthController.isAuthorized(mockReq, ['admin']);

                expect(result).toBe(false);
            });

            test('should return false for unauthenticated user', () => {
                mockReq.session.user = { isAuthenticated: false };

                const result = AuthController.isAuthorized(mockReq, ['admin']);

                expect(result).toBe(false);
            });

            test('should return false for missing user session', () => {
                mockReq.session = {};

                const result = AuthController.isAuthorized(mockReq, ['admin']);

                expect(result).toBe(false);
            });
        });

        describe('getUserLanguage', () => {
            test('should return user preferred language', () => {
                mockReq.session.user = {
                    preferences: { language: 'de' }
                };

                const result = AuthController.getUserLanguage(mockReq);

                expect(result).toBe('de');
            });

            test('should return default language when no user preference', () => {
                mockReq.session.user = {};

                const result = AuthController.getUserLanguage(mockReq);

                expect(result).toBe('en'); // Default from our test i18n setup
            });

            test('should return default language for missing session', () => {
                mockReq.session = {};

                const result = AuthController.getUserLanguage(mockReq);

                expect(result).toBe('en');
            });
        });
    });

    describe('Middleware Functions', () => {
        describe('requireAuthentication', () => {
            test('should call next() for authenticated user', () => {
                mockReq.session.user = { isAuthenticated: true };

                AuthController.requireAuthentication(mockReq, mockRes, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
            });

            test('should send error for unauthenticated user', () => {
                mockReq.session.user = { isAuthenticated: false };

                AuthController.requireAuthentication(mockReq, mockRes, mockNext);

                expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
                );
                expect(mockNext).not.toHaveBeenCalled();
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.requireAuthentication', 'error: Authentication required - access denied'
                );
            });

            test('should send error for missing user session', () => {
                mockReq.session = {};

                AuthController.requireAuthentication(mockReq, mockRes, mockNext);

                expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
                );
                expect(mockNext).not.toHaveBeenCalled();
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.requireAuthentication', 'error: Authentication required - access denied'
                );
            });
        });

        describe('requireRole', () => {
            test('should call next() for user with required role', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['admin'],
                    username: 'testuser'
                };

                const middleware = AuthController.requireRole(['admin']);
                middleware(mockReq, mockRes, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
            });

            test('should send error for user without required role', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['user'],
                    username: 'testuser'
                };

                const middleware = AuthController.requireRole(['admin', 'root']);
                middleware(mockReq, mockRes, mockNext);

                // Update the expected message to match the i18n translation
                expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 403, 'Insufficient privileges. Required role(s): admin, root', 'INSUFFICIENT_PRIVILEGES'
                );
                expect(mockNext).not.toHaveBeenCalled();
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.requireRole', 'error: Role required (admin, root) - access denied for user testuser'
                );
            });

            test('should send error for unauthenticated user', () => {
                mockReq.session.user = { isAuthenticated: false };

                const middleware = AuthController.requireRole(['admin']);
                middleware(mockReq, mockRes, mockNext);

                expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
                );
                expect(mockNext).not.toHaveBeenCalled();
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.requireRole', 'error: Authentication required for role check - access denied'
                );
            });
        });
    });

    describe('Login/Logout Functions', () => {
        describe('login', () => {
            test('should authenticate user with valid credentials', async () => {
                const mockUser = {
                    _id: 'user123',
                    username: 'testuser',
                    email: 'testuser@example.com',  // Add valid email
                    profile: {
                        firstName: 'Test',
                        lastName: 'User',
                        nickName: 'Test'
                    },
                    roles: ['user'],
                    preferences: undefined,
                    loginCount: 0
                };

                UserModel.authenticate.mockResolvedValue(mockUser);

                mockReq.body = {
                    identifier: 'testuser',
                    password: 'validpassword'
                };

                await AuthController.login(mockReq, mockRes);

                expect(mockReq.session.user).toEqual({
                    isAuthenticated: true,
                    id: 'user123',
                    username: 'testuser',
                    email: 'testuser@example.com',  // Should have valid email
                    firstName: 'Test',
                    lastName: 'User',
                    nickName: 'Test',
                    initials: 'TU',
                    preferences: undefined,
                    roles: ['user']
                });
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: true,
                    data: {
                        user: {
                            isAuthenticated: true,
                            id: 'user123',
                            username: 'testuser',
                            email: 'testuser@example.com',
                            firstName: 'Test',
                            lastName: 'User',
                            nickName: 'Test',
                            initials: 'TU',
                            preferences: undefined,
                            roles: ['user']
                        }
                    },
                    message: 'Login successful',
                    elapsed: expect.any(Number)
                });
            });

            test('should reject invalid credentials', async () => {
                UserModel.authenticate.mockResolvedValue(null); // Return null for invalid credentials

                mockReq.body = {
                    identifier: 'testuser',
                    password: 'wrongpassword'
                };

                await AuthController.login(mockReq, mockRes);

                expect(mockReq.session.user).toBeUndefined();

                // AuthController uses direct res.status().json(), not CommonUtils.sendError
                expect(mockRes.status).toHaveBeenCalledWith(401);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Invalid username/email or password',  // Updated to match i18n
                    code: 'INVALID_CREDENTIALS'
                });

                // Should NOT call CommonUtils.sendError
                expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
            });

            test('should handle authentication errors', async () => {
                UserModel.authenticate.mockRejectedValue(new Error('Database connection failed'));

                mockReq.body = {
                    identifier: 'testuser',
                    password: 'password'
                };

                await AuthController.login(mockReq, mockRes);

                // AuthController uses direct res.status().json(), not CommonUtils.sendError
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Internal server error during login: Database connection failed',  // Updated to match i18n with context
                    code: 'INTERNAL_ERROR',
                    details: 'Database connection failed'
                });

                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.login', 'error: Database connection failed'
                );

                // Should NOT call CommonUtils.sendError
                expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
            });
        });

        describe('logout', () => {
            test('should logout authenticated user', () => {
                mockReq.session = {
                    user: { isAuthenticated: true, username: 'testuser' },
                    destroy: jest.fn(callback => callback())
                };

                AuthController.logout(mockReq, mockRes);

                expect(mockReq.session.destroy).toHaveBeenCalled();
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: true,
                    message: 'Logout successful',
                    elapsed: expect.any(Number)
                });
            });

            test('should handle logout for unauthenticated user', () => {
                mockReq.session = {
                    destroy: jest.fn(callback => callback(null)) // Mock successful destroy
                };

                AuthController.logout(mockReq, mockRes);

                expect(mockReq.session.destroy).toHaveBeenCalled();
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: true,
                    message: 'Logout successful',
                    elapsed: expect.any(Number)
                });
            });

            test('should handle session destruction errors', () => {
                const error = new Error('Session destruction failed');
                mockReq.session = {
                    user: { isAuthenticated: true, username: 'testuser' },
                    destroy: jest.fn(callback => callback(error))
                };

                AuthController.logout(mockReq, mockRes);

                // AuthController uses direct res.status().json(), not CommonUtils.sendError
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Failed to log out',  // Updated to match i18n (corrected spelling)
                    code: 'LOGOUT_ERROR'
                });

                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.logout', 'error: Session destruction failed'
                );

                // Should NOT call CommonUtils.sendError
                expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
            });
        });
    });

    describe('Session Management', () => {
        describe('updateUserSession', () => {
            test('should update user session with new data', () => {
                mockReq.session = {
                    user: {
                        isAuthenticated: true,
                        username: 'testuser',
                        firstName: 'Old',           // Flattened structure, not profile.firstName
                        lastName: 'Name',           // Flattened structure, not profile.lastName
                        preferences: {}
                    }
                };

                const updatedData = {
                    profile: { firstName: 'New', lastName: 'Name' },
                    preferences: { language: 'de' }
                };

                AuthController.updateUserSession(mockReq, updatedData);

                // updateUserSession updates the flattened session structure
                expect(mockReq.session.user.firstName).toBe('New');  // Direct property, not profile.firstName
                expect(mockReq.session.user.lastName).toBe('Name');   // Direct property, not profile.lastName
                expect(mockReq.session.user.initials).toBe('NN');     // Should be calculated from New Name
                expect(mockReq.session.user.preferences).toEqual({ language: 'de' });
                expect(mockReq.session.user.username).toBe('testuser'); // Preserved
                expect(mockReq.session.user.isAuthenticated).toBe(true); // Preserved
            });

            test('should handle missing session gracefully', () => {
                mockReq.session = {};

                const updatedData = { profile: { firstName: 'Test' } };

                // Should not throw error
                expect(() => {
                    AuthController.updateUserSession(mockReq, updatedData);
                }).not.toThrow();
            });
        });
    });
});

// EOF webapp/tests/unit/controller/auth-controller.test.js
