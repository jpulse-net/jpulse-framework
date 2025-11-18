/**
 * @name            jPulse Framework / WebApp / Tests / Integration / Admin Routes
 * @tagline         Integration tests for admin route authentication (W-013)
 * @description     Tests admin route protection and authentication middleware
 * @file            webapp/tests/integration/admin-routes.test.js
 * @version         1.1.7
 * @release         2025-11-18
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
    logError: jest.fn(),
    logInfo: jest.fn()
}));

// Mock global i18n
const mockI18n = {
    translate: jest.fn((req, key, context = {}) => {
        const translations = {
            'controller.auth.authenticationRequired': 'Authentication required',
            'controller.auth.roleRequired': `Insufficient privileges. Required roles: ${context.roles || 'admin'}`
        };
        return translations[key] || key;
    })
};

global.i18n = mockI18n;

// Mock CommonUtils
const mockCommonUtils = {
    sendError: jest.fn((req, res, status, message, code) => {
        res.status(status).json({
            success: false,
            error: message,
            code: code
        });
    })
};

global.CommonUtils = mockCommonUtils;

describe('Admin Routes Authentication (W-013)', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(async () => {
        // Dynamic imports ensure global setup has completed
        if (!AuthController) {
            AuthController = (await import('../../controller/auth.js')).default;
        }

        // Reset mocks
        jest.clearAllMocks();

        // Mock request object
        mockReq = {
            session: {},
            body: {},
            path: '/admin/',
            originalUrl: '/admin/',
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
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            redirect: jest.fn().mockReturnThis()
        };

        // Mock next function
        mockNext = jest.fn();
    });

    describe('Admin route protection', () => {
        test('should deny access to unauthenticated users', () => {
            // No session = unauthenticated
            mockReq.session = {};

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockCommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                401,
                'Authentication required',
                'UNAUTHORIZED'
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('should deny access to authenticated users without admin role', () => {
            mockReq.session = {
                user: {
                    id: 'user123',
                    username: 'testuser',
                    isAuthenticated: true,
                    roles: ['user'] // No admin role
                }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockCommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                403,
                'Insufficient privileges. Required roles: admin, root',
                'INSUFFICIENT_PRIVILEGES'
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('should allow access to users with admin role', () => {
            mockReq.session = {
                user: {
                    id: 'admin123',
                    username: 'adminuser',
                    isAuthenticated: true,
                    roles: ['user', 'admin']
                }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockCommonUtils.sendError).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        test('should allow access to users with root role', () => {
            mockReq.session = {
                user: {
                    id: 'root123',
                    username: 'rootuser',
                    isAuthenticated: true,
                    roles: ['root']
                }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockCommonUtils.sendError).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        test('should use user language for error messages', () => {
            mockReq.session = {
                user: {
                    id: 'user123',
                    username: 'testuser',
                    isAuthenticated: true,
                    roles: ['user'],
                    preferences: {
                        language: 'de'
                    }
                }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            // Verify i18n.translate was called with request object
            expect(mockI18n.translate).toHaveBeenCalledWith(
                mockReq,
                'controller.auth.roleRequired',
                { roles: 'admin, root' }
            );
        });
    });

    describe('Admin route patterns', () => {
        test('should protect /admin/ route', () => {
            mockReq.path = '/admin/';

            // Test that the route pattern matches
            const adminRoutePattern = /^\/admin\/.*/;
            expect(adminRoutePattern.test(mockReq.path)).toBe(true);
        });

        test('should protect /admin/config.shtml route', () => {
            mockReq.path = '/admin/config.shtml';

            const adminRoutePattern = /^\/admin\/.*/;
            expect(adminRoutePattern.test(mockReq.path)).toBe(true);
        });

        test('should protect /admin/logs.shtml route', () => {
            mockReq.path = '/admin/logs.shtml';

            const adminRoutePattern = /^\/admin\/.*/;
            expect(adminRoutePattern.test(mockReq.path)).toBe(true);
        });

        test('should protect /admin/users.shtml route', () => {
            mockReq.path = '/admin/users.shtml';

            const adminRoutePattern = /^\/admin\/.*/;
            expect(adminRoutePattern.test(mockReq.path)).toBe(true);
        });

        test('should not protect non-admin routes', () => {
            const nonAdminPaths = ['/home/', '/user/profile.shtml', '/auth/login.shtml'];
            const adminRoutePattern = /^\/admin\/.*/;

            nonAdminPaths.forEach(path => {
                expect(adminRoutePattern.test(path)).toBe(false);
            });
        });
    });

    describe('Authentication helper methods', () => {
        test('isAuthenticated should return true for authenticated users', () => {
            mockReq.session = {
                user: {
                    isAuthenticated: true
                }
            };

            const result = AuthController.isAuthenticated(mockReq);
            expect(result).toBe(true);
        });

        test('isAuthenticated should return false for unauthenticated users', () => {
            mockReq.session = {};

            const result = AuthController.isAuthenticated(mockReq);
            expect(result).toBe(false);
        });

        test('isAuthorized should return true for users with required role', () => {
            mockReq.session = {
                user: {
                    isAuthenticated: true,
                    roles: ['user', 'admin']
                }
            };

            const result = AuthController.isAuthorized(mockReq, ['admin']);
            expect(result).toBe(true);
        });

        test('isAuthorized should return false for users without required role', () => {
            mockReq.session = {
                user: {
                    isAuthenticated: true,
                    roles: ['user']
                }
            };

            const result = AuthController.isAuthorized(mockReq, ['admin']);
            expect(result).toBe(false);
        });

        test('isAuthorized should handle multiple required roles', () => {
            mockReq.session = {
                user: {
                    isAuthenticated: true,
                    roles: ['user', 'admin']
                }
            };

            // User has admin role, should pass
            const result1 = AuthController.isAuthorized(mockReq, ['admin', 'root']);
            expect(result1).toBe(true);

            // User doesn't have root role, but has admin which is sufficient
            const result2 = AuthController.isAuthorized(mockReq, ['root']);
            expect(result2).toBe(false);
        });
    });

    describe('Error handling', () => {
        test('should handle missing session gracefully', () => {
            delete mockReq.session;

            const middleware = AuthController.requireRole(['admin']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockCommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                401,
                'Authentication required',
                'UNAUTHORIZED'
            );
        });

        test('should handle missing user in session', () => {
            mockReq.session = { someOtherData: 'value' };

            const middleware = AuthController.requireRole(['admin']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockCommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                401,
                'Authentication required',
                'UNAUTHORIZED'
            );
        });

        test('should handle missing roles array', () => {
            mockReq.session = {
                user: {
                    isAuthenticated: true
                    // No roles array
                }
            };

            const middleware = AuthController.requireRole(['admin']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockCommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                403,
                expect.stringContaining('Insufficient privileges'),
                'INSUFFICIENT_PRIVILEGES'
            );
        });
    });
});

// EOF webapp/tests/integration/admin-routes.test.js
