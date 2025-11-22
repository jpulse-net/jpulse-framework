/**
 * @name            jPulse Framework / WebApp / Tests / Integration / Auth Middleware
 * @tagline         Integration tests for authentication middleware
 * @description     Tests authentication middleware behavior in realistic scenarios
 * @file            webapp/tests/integration/auth-middleware.test.js
 * @version         1.2.2
 * @release         2025-11-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Import modules dynamically after global setup completes
let AuthController;
let CommonUtils;

// Mock dependencies
jest.mock('../../model/user.js');
jest.mock('../../controller/log.js', () => ({
    logRequest: jest.fn(),
    console: jest.fn(),
    error: jest.fn()
}));

describe('Auth Middleware Integration', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(async () => {
        // Dynamic imports ensure global setup has completed
        if (!AuthController) {
            AuthController = (await import('../../controller/auth.js')).default;
            CommonUtils = (await import('../../utils/common.js')).default;
        }

        // Mock request object
        mockReq = {
            session: {},
            body: {},
            originalUrl: '/api/1/test',
            headers: {
                'x-forwarded-for': '192.168.1.100'
            },
            connection: {
                remoteAddress: '192.168.1.100'
            },
            ip: '192.168.1.100'
        };

        // Mock response object
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn()
        };

        // Mock next function
        mockNext = jest.fn();

        // Mock i18n translate function with new signature: translate(req, key, context)
        global.i18n = {
            translate: jest.fn((req, key, context = {}) => {
                const translations = {
                    'controller.auth.roleRequired': `Insufficient privileges. Required role(s): ${context.roles}`,
                    'controller.auth.authenticationRequired': 'Authentication required'
                };
                return translations[key] || key;
            })
        };

        // Set up spies
        sendErrorSpy = jest.spyOn(global.CommonUtils, 'sendError').mockImplementation(() => {});
        logErrorSpy = jest.spyOn(global.LogController, 'logError').mockImplementation(() => {});

        // Clear all mocks
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
                    isAuthenticated: true
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

            const sendErrorSpy = jest.spyOn(global.CommonUtils, 'sendError').mockImplementation();

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
                    isAuthenticated: true
                }
            };

            const sendErrorSpy = jest.spyOn(global.CommonUtils, 'sendError').mockImplementation();

            // Authentication should pass
            AuthController.requireAuthentication(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);

            // Role check should fail
            mockNext.mockClear();
            const roleMiddleware = AuthController.requireRole(['admin', 'root']);
            roleMiddleware(mockReq, mockRes, mockNext);

            expect(sendErrorSpy).toHaveBeenCalledWith(
                mockReq, mockRes, 403, 'Insufficient privileges. Required role(s): admin, root', 'INSUFFICIENT_PRIVILEGES'
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
                    isAuthenticated: true
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
                    isAuthenticated: true
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
                    isAuthenticated: true
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
                    isAuthenticated: true
                }
            };

            const sendErrorSpy = jest.spyOn(global.CommonUtils, 'sendError').mockImplementation();

            // Should fail role check
            const roleMiddleware = AuthController.requireRole(['admin', 'root']);
            roleMiddleware(mockReq, mockRes, mockNext);

            expect(sendErrorSpy).toHaveBeenCalledWith(
                mockReq, mockRes, 403, 'Insufficient privileges. Required role(s): admin, root', 'INSUFFICIENT_PRIVILEGES'
            );
            expect(mockNext).not.toHaveBeenCalled();

            sendErrorSpy.mockRestore();
        });
    });

    describe('Error Handling Integration', () => {
        test('should use CommonUtils.sendError for API requests', async () => {
            mockReq.originalUrl = '/api/1/user/profile';
            mockReq.session = {}; // Unauthenticated

            const sendErrorSpy = jest.spyOn(global.CommonUtils, 'sendError').mockImplementation();

            AuthController.requireAuthentication(mockReq, mockRes, mockNext);

            expect(sendErrorSpy).toHaveBeenCalledWith(
                mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
            );

            sendErrorSpy.mockRestore();
        });

        test('should use CommonUtils.sendError for web requests', async () => {
            mockReq.originalUrl = '/user/profile.shtml';
            mockReq.session = {}; // Unauthenticated

            const sendErrorSpy = jest.spyOn(global.CommonUtils, 'sendError').mockImplementation();

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
                    // Missing isAuthenticated property
                    id: 'user123',
                    loginId: 'testuser',
                    roles: ['user']
                }
            };

            const sendErrorSpy = jest.spyOn(global.CommonUtils, 'sendError').mockImplementation();

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
                    isAuthenticated: true
                    // Missing roles property
                }
            };

            const sendErrorSpy = jest.spyOn(global.CommonUtils, 'sendError').mockImplementation();

            const roleMiddleware = AuthController.requireRole(['user']);
            roleMiddleware(mockReq, mockRes, mockNext);

            expect(sendErrorSpy).toHaveBeenCalledWith(
                mockReq, mockRes, 403, 'Insufficient privileges. Required role(s): user', 'INSUFFICIENT_PRIVILEGES'
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
                    isAuthenticated: true
                }
            };

            // Test single role as string (not array)
            const roleMiddleware = AuthController.requireRole('user');
            roleMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });
});

// EOF webapp/tests/integration/auth-middleware.test.js
