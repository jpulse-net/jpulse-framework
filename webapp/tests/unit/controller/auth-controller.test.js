/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Auth Controller
 * @tagline         Unit tests for Auth Controller
 * @description     Tests for authentication controller middleware and utility functions
 * @file            webapp/tests/unit/controller/auth-controller.test.js
 * @version         0.3.1
 * @release         2025-08-30
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import AuthController from '../../../controller/auth.js';
import UserModel from '../../../model/user.js';
import LogController from '../../../controller/log.js';
import CommonUtils from '../../../utils/common.js';

// Mock dependencies
jest.mock('../../../model/user.js');
jest.mock('../../../controller/log.js');
jest.mock('../../../utils/common.js');

describe('AuthController', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup mock request
        mockReq = {
            session: {},
            body: {},
            originalUrl: '/api/1/test'
        };

        // Setup mock response
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            redirect: jest.fn().mockReturnThis()
        };

        // Setup mock next function
        mockNext = jest.fn();

        // Setup mock LogController
        LogController.consoleApi = jest.fn();
        LogController.console = jest.fn();
        LogController.error = jest.fn();

        // Setup mock CommonUtils
        CommonUtils.sendError = jest.fn();
    });

    // ============================================================================
    // UTILITY FUNCTIONS TESTS
    // ============================================================================

    describe('Utility Functions', () => {
        describe('isAuthenticated', () => {
            test('should return true for authenticated user', () => {
                mockReq.session.user = { authenticated: true };
                expect(AuthController.isAuthenticated(mockReq)).toBe(true);
            });

            test('should return false for unauthenticated user', () => {
                mockReq.session.user = { authenticated: false };
                expect(AuthController.isAuthenticated(mockReq)).toBe(false);
            });

            test('should return false for missing user session', () => {
                mockReq.session = {};
                expect(AuthController.isAuthenticated(mockReq)).toBe(false);
            });

            test('should return false for missing session', () => {
                mockReq.session = null;
                expect(AuthController.isAuthenticated(mockReq)).toBe(false);
            });

            test('should return false for undefined session', () => {
                delete mockReq.session;
                expect(AuthController.isAuthenticated(mockReq)).toBe(false);
            });
        });

        describe('isAuthorized', () => {
            beforeEach(() => {
                mockReq.session.user = {
                    authenticated: true,
                    roles: ['user', 'admin']
                };
            });

            test('should return true for user with required role (string)', () => {
                expect(AuthController.isAuthorized(mockReq, 'admin')).toBe(true);
            });

            test('should return true for user with required role (array)', () => {
                expect(AuthController.isAuthorized(mockReq, ['admin', 'root'])).toBe(true);
            });

            test('should return false for user without required role', () => {
                expect(AuthController.isAuthorized(mockReq, 'root')).toBe(false);
            });

            test('should return false for user without required roles (array)', () => {
                expect(AuthController.isAuthorized(mockReq, ['root', 'superadmin'])).toBe(false);
            });

            test('should return false for unauthenticated user', () => {
                mockReq.session.user.authenticated = false;
                expect(AuthController.isAuthorized(mockReq, 'admin')).toBe(false);
            });

            test('should return false for user without roles', () => {
                mockReq.session.user.roles = null;
                expect(AuthController.isAuthorized(mockReq, 'admin')).toBe(false);
            });

            test('should return false for user with empty roles array', () => {
                mockReq.session.user.roles = [];
                expect(AuthController.isAuthorized(mockReq, 'admin')).toBe(false);
            });

            test('should return false for missing user session', () => {
                mockReq.session = {};
                expect(AuthController.isAuthorized(mockReq, 'admin')).toBe(false);
            });
        });
    });

    // ============================================================================
    // MIDDLEWARE FUNCTIONS TESTS
    // ============================================================================

    describe('Middleware Functions', () => {
        describe('requireAuthentication', () => {
            test('should call next() for authenticated user', () => {
                mockReq.session.user = { authenticated: true };

                AuthController.requireAuthentication(mockReq, mockRes, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(CommonUtils.sendError).not.toHaveBeenCalled();
            });

            test('should send error for unauthenticated user', () => {
                mockReq.session.user = { authenticated: false };

                AuthController.requireAuthentication(mockReq, mockRes, mockNext);

                expect(CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
                );
                expect(mockNext).not.toHaveBeenCalled();
                expect(LogController.error).toHaveBeenCalledWith(
                    mockReq, 'Authentication required - access denied'
                );
            });

            test('should send error for missing user session', () => {
                mockReq.session = {};

                AuthController.requireAuthentication(mockReq, mockRes, mockNext);

                expect(CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
                );
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        describe('requireRole', () => {
            test('should return middleware function', () => {
                const middleware = AuthController.requireRole(['admin']);
                expect(typeof middleware).toBe('function');
            });

            test('should call next() for user with required role', () => {
                mockReq.session.user = {
                    authenticated: true,
                    roles: ['user', 'admin'],
                    loginId: 'testuser'
                };

                const middleware = AuthController.requireRole(['admin']);
                middleware(mockReq, mockRes, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(CommonUtils.sendError).not.toHaveBeenCalled();
            });

            test('should send error for user without required role', () => {
                mockReq.session.user = {
                    authenticated: true,
                    roles: ['user'],
                    loginId: 'testuser'
                };

                const middleware = AuthController.requireRole(['admin', 'root']);
                middleware(mockReq, mockRes, mockNext);

                expect(CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 403, 'Required role: admin, root', 'INSUFFICIENT_PRIVILEGES'
                );
                expect(mockNext).not.toHaveBeenCalled();
                expect(LogController.error).toHaveBeenCalledWith(
                    mockReq, 'Role required (admin, root) - access denied for user testuser'
                );
            });

            test('should send auth error for unauthenticated user', () => {
                mockReq.session = {};

                const middleware = AuthController.requireRole(['admin']);
                middleware(mockReq, mockRes, mockNext);

                expect(CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
                );
                expect(mockNext).not.toHaveBeenCalled();
                expect(LogController.error).toHaveBeenCalledWith(
                    mockReq, 'Authentication required for role check - access denied'
                );
            });

            test('should handle single role string', () => {
                mockReq.session.user = {
                    authenticated: true,
                    roles: ['admin'],
                    loginId: 'testuser'
                };

                const middleware = AuthController.requireRole('admin');
                middleware(mockReq, mockRes, mockNext);

                expect(mockNext).toHaveBeenCalled();
            });
        });
    });

    // ============================================================================
    // AUTHENTICATION ENDPOINTS TESTS
    // ============================================================================

    describe('Authentication Endpoints', () => {
        describe('login', () => {
            beforeEach(() => {
                mockReq.body = {
                    identifier: 'testuser',
                    password: 'password123'
                };
                mockReq.session = {};
            });

            test('should login user successfully', async () => {
                const mockUser = {
                    _id: 'user123',
                    loginId: 'testuser',
                    email: 'test@example.com',
                    profile: {
                        firstName: 'Test',
                        lastName: 'User',
                        nickName: 'tuser'
                    },
                    roles: ['user'],
                    preferences: { theme: 'light' },
                    loginCount: 5
                };

                UserModel.authenticate.mockResolvedValue(mockUser);
                UserModel.updateById.mockResolvedValue(true);

                await AuthController.login(mockReq, mockRes);

                expect(LogController.consoleApi).toHaveBeenCalledWith(
                    mockReq, 'auth.login( {"identifier":"testuser"} )'
                );
                expect(UserModel.authenticate).toHaveBeenCalledWith('testuser', 'password123');
                expect(UserModel.updateById).toHaveBeenCalledWith('user123', {
                    lastLogin: expect.any(Date),
                    loginCount: 6
                });
                expect(mockReq.session.user).toEqual({
                    id: 'user123',
                    loginId: 'testuser',
                    email: 'test@example.com',
                    firstName: 'Test',
                    lastName: 'User',
                    nickName: 'tuser',
                    initials: 'TU',
                    roles: ['user'],
                    preferences: { theme: 'light' },
                    authenticated: true
                });
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: true,
                    data: { user: mockReq.session.user },
                    message: 'Login successful'
                });
            });

            test('should handle missing credentials', async () => {
                mockReq.body = { identifier: 'testuser' }; // missing password

                await AuthController.login(mockReq, mockRes);

                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Both identifier (loginId or email) and password are required',
                    code: 'MISSING_CREDENTIALS'
                });
            });

            test('should handle invalid credentials', async () => {
                UserModel.authenticate.mockResolvedValue(null);

                await AuthController.login(mockReq, mockRes);

                expect(LogController.error).toHaveBeenCalledWith(
                    mockReq, 'Login failed for identifier: testuser'
                );
                expect(mockRes.status).toHaveBeenCalledWith(401);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            });

            test('should handle authentication errors', async () => {
                UserModel.authenticate.mockRejectedValue(new Error('Database error'));

                await AuthController.login(mockReq, mockRes);

                expect(LogController.error).toHaveBeenCalledWith(
                    mockReq, 'auth.login failed: Database error'
                );
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Internal server error during login',
                    code: 'INTERNAL_ERROR',
                    details: 'Database error'
                });
            });

            test('should handle user with no login count', async () => {
                const mockUser = {
                    _id: 'user123',
                    loginId: 'testuser',
                    email: 'test@example.com',
                    profile: { firstName: 'Test', lastName: 'User' },
                    roles: ['user'],
                    preferences: {}
                    // No loginCount property
                };

                UserModel.authenticate.mockResolvedValue(mockUser);
                UserModel.updateById.mockResolvedValue(true);

                await AuthController.login(mockReq, mockRes);

                expect(UserModel.updateById).toHaveBeenCalledWith('user123', {
                    lastLogin: expect.any(Date),
                    loginCount: 1 // Should default to 0 + 1
                });
            });
        });

        describe('logout', () => {
            test('should logout user successfully', async () => {
                mockReq.session = {
                    user: { loginId: 'testuser' },
                    destroy: jest.fn((callback) => callback(null))
                };

                await AuthController.logout(mockReq, mockRes);

                expect(LogController.consoleApi).toHaveBeenCalledWith(
                    mockReq, 'auth.logout( testuser )'
                );
                expect(mockReq.session.destroy).toHaveBeenCalled();
                expect(LogController.console).toHaveBeenCalledWith(
                    mockReq, 'User testuser logged out successfully'
                );
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: true,
                    message: 'Logout successful'
                });
            });

            test('should handle logout without user session', async () => {
                mockReq.session = {
                    destroy: jest.fn((callback) => callback(null))
                };

                await AuthController.logout(mockReq, mockRes);

                expect(LogController.consoleApi).toHaveBeenCalledWith(
                    mockReq, 'auth.logout( (unknown) )'
                );
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: true,
                    message: 'Logout successful'
                });
            });

            test('should handle session destroy error', async () => {
                const destroyError = new Error('Session destroy failed');
                mockReq.session = {
                    user: { loginId: 'testuser' },
                    destroy: jest.fn((callback) => callback(destroyError))
                };

                await AuthController.logout(mockReq, mockRes);

                expect(LogController.error).toHaveBeenCalledWith(
                    mockReq, 'auth.logout failed: Session destroy failed'
                );
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Failed to logout',
                    code: 'LOGOUT_ERROR'
                });
            });

            test('should handle unexpected logout errors', async () => {
                // Mock session.destroy to throw instead of calling callback
                mockReq.session = {
                    user: { loginId: 'testuser' },
                    destroy: jest.fn(() => { throw new Error('Unexpected error'); })
                };

                await AuthController.logout(mockReq, mockRes);

                expect(LogController.error).toHaveBeenCalledWith(
                    mockReq, 'auth.logout failed: Unexpected error'
                );
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Internal server error during logout',
                    code: 'INTERNAL_ERROR',
                    details: 'Unexpected error'
                });
            });
        });
    });
});
