/**
 * @name            jPulse Framework / WebApp / Tests / Integration / Auth Middleware
 * @tagline         Integration tests for Auth Controller middleware
 * @description     Tests for authentication middleware integration patterns
 * @file            webapp/tests/integration/auth-middleware.test.js
 * @version         0.3.3
 * @release         2025-08-31
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import AuthController from '../../controller/auth.js';
import CommonUtils from '../../utils/common.js';

// Mock dependencies
jest.mock('../../model/user.js');
jest.mock('../../controller/log.js', () => ({
    consoleApi: jest.fn(),
    console: jest.fn(),
    error: jest.fn()
}));

describe('Auth Middleware Integration Patterns', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            session: {},
            originalUrl: '/api/1/test'
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            redirect: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('Middleware Chain Integration', () => {
        test('should successfully chain authentication and role middleware', async () => {
            // Setup user with admin role
            mockReq.session = {
                user: {
                    id: 'admin123',
                    loginId: 'adminuser',
                    roles: ['user', 'admin'],
                    authenticated: true
                }
            };

            // Test authentication middleware
            AuthController.requireAuthentication(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);

            // Reset next call count
            mockNext.mockClear();

            // Test role middleware
            const roleMiddleware = AuthController.requireRole(['admin']);
            roleMiddleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        test('should stop chain at authentication failure', async () => {
            mockReq.session = {}; // No authentication

            const sendErrorSpy = jest.spyOn(CommonUtils, 'sendError').mockImplementation();

            // Authentication should fail
            AuthController.requireAuthentication(mockReq, mockRes, mockNext);
            expect(sendErrorSpy).toHaveBeenCalledWith(
                mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
            );
            expect(mockNext).not.toHaveBeenCalled();

            sendErrorSpy.mockRestore();
        });

        test('should stop chain at role authorization failure', async () => {
            // Setup authenticated user without admin role
            mockReq.session = {
                user: {
                    id: 'user123',
                    loginId: 'regularuser',
                    roles: ['user'],
                    authenticated: true
                }
            };

            const sendErrorSpy = jest.spyOn(CommonUtils, 'sendError').mockImplementation();

            // Authentication should pass
            AuthController.requireAuthentication(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);

            // Role check should fail
            mockNext.mockClear();
            const roleMiddleware = AuthController.requireRole(['admin', 'root']);
            roleMiddleware(mockReq, mockRes, mockNext);
            
            expect(sendErrorSpy).toHaveBeenCalledWith(
                mockReq, mockRes, 403, 'Required role: admin, root', 'INSUFFICIENT_PRIVILEGES'
            );
            expect(mockNext).not.toHaveBeenCalled();

            sendErrorSpy.mockRestore();
        });
    });

    describe('Real-world Route Protection Scenarios', () => {
        test('should simulate user profile access (auth required)', async () => {
            // Simulate GET /api/1/user/profile middleware chain
            mockReq.originalUrl = '/api/1/user/profile';
            mockReq.session = {
                user: {
                    id: 'user123',
                    loginId: 'testuser',
                    roles: ['user'],
                    authenticated: true
                }
            };

            // Should pass authentication
            AuthController.requireAuthentication(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        test('should simulate admin user search (role required)', async () => {
            // Simulate GET /api/1/user/search middleware chain
            mockReq.originalUrl = '/api/1/user/search';
            mockReq.session = {
                user: {
                    id: 'admin123',
                    loginId: 'adminuser',
                    roles: ['user', 'admin'],
                    authenticated: true
                }
            };

            // Should pass role check
            const roleMiddleware = AuthController.requireRole(['admin', 'root']);
            roleMiddleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        test('should simulate log search access (auth required)', async () => {
            // Simulate GET /api/1/log/search middleware chain
            mockReq.originalUrl = '/api/1/log/search';
            mockReq.session = {
                user: {
                    id: 'user123',
                    loginId: 'testuser',
                    roles: ['user'],
                    authenticated: true
                }
            };

            // Should pass authentication
            AuthController.requireAuthentication(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        test('should deny regular user access to admin endpoints', async () => {
            // Simulate regular user trying to access admin endpoint
            mockReq.originalUrl = '/api/1/user/search';
            mockReq.session = {
                user: {
                    id: 'user123',
                    loginId: 'regularuser',
                    roles: ['user'],
                    authenticated: true
                }
            };

            const sendErrorSpy = jest.spyOn(CommonUtils, 'sendError').mockImplementation();

            // Should fail role check
            const roleMiddleware = AuthController.requireRole(['admin', 'root']);
            roleMiddleware(mockReq, mockRes, mockNext);
            
            expect(sendErrorSpy).toHaveBeenCalledWith(
                mockReq, mockRes, 403, 'Required role: admin, root', 'INSUFFICIENT_PRIVILEGES'
            );
            expect(mockNext).not.toHaveBeenCalled();

            sendErrorSpy.mockRestore();
        });
    });

    describe('Error Handling Integration', () => {
        test('should use CommonUtils.sendError for API requests', async () => {
            mockReq.originalUrl = '/api/1/user/profile';
            mockReq.session = {}; // Unauthenticated

            const sendErrorSpy = jest.spyOn(CommonUtils, 'sendError').mockImplementation();

            AuthController.requireAuthentication(mockReq, mockRes, mockNext);

            expect(sendErrorSpy).toHaveBeenCalledWith(
                mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
            );

            sendErrorSpy.mockRestore();
        });

        test('should use CommonUtils.sendError for web requests', async () => {
            mockReq.originalUrl = '/user/profile.shtml';
            mockReq.session = {}; // Unauthenticated

            const sendErrorSpy = jest.spyOn(CommonUtils, 'sendError').mockImplementation();

            AuthController.requireAuthentication(mockReq, mockRes, mockNext);

            expect(sendErrorSpy).toHaveBeenCalledWith(
                mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
            );

            sendErrorSpy.mockRestore();
        });
    });

    describe('Edge Case Integration', () => {
        test('should handle malformed session data', async () => {
            mockReq.session = {
                user: {
                    // Missing authenticated property
                    id: 'user123',
                    loginId: 'testuser',
                    roles: ['user']
                }
            };

            const sendErrorSpy = jest.spyOn(CommonUtils, 'sendError').mockImplementation();

            AuthController.requireAuthentication(mockReq, mockRes, mockNext);

            expect(sendErrorSpy).toHaveBeenCalled();
            expect(mockNext).not.toHaveBeenCalled();

            sendErrorSpy.mockRestore();
        });

        test('should handle missing roles in session', async () => {
            mockReq.session = {
                user: {
                    id: 'user123',
                    loginId: 'testuser',
                    authenticated: true
                    // Missing roles property
                }
            };

            const sendErrorSpy = jest.spyOn(CommonUtils, 'sendError').mockImplementation();

            const roleMiddleware = AuthController.requireRole(['user']);
            roleMiddleware(mockReq, mockRes, mockNext);

            expect(sendErrorSpy).toHaveBeenCalledWith(
                mockReq, mockRes, 403, 'Required role: user', 'INSUFFICIENT_PRIVILEGES'
            );
            expect(mockNext).not.toHaveBeenCalled();

            sendErrorSpy.mockRestore();
        });

        test('should handle role middleware with single string role', async () => {
            mockReq.session = {
                user: {
                    id: 'user123',
                    loginId: 'testuser',
                    roles: ['user'],
                    authenticated: true
                }
            };

            // Test single role as string (not array)
            const roleMiddleware = AuthController.requireRole('user');
            roleMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });
});