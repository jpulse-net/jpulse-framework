/**
 * @name            jPulse Framework / WebApp / Tests / Integration / Plugin API
 * @tagline         Integration tests for W-045 Plugin API authentication
 * @description     Tests plugin REST API authentication and authorization
 * @file            webapp/tests/integration/plugin-api.test.js
 * @version         1.6.8
 * @release         2026-02-05
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           90%, Cursor 2.0, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Import modules dynamically after global setup completes
let PluginController, AuthController;

// Mock i18n
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
            code: code,
            path: req.path
        });
    })
};

global.CommonUtils = mockCommonUtils;

describe('Plugin API Authentication (W-045)', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(async () => {
        // Dynamic imports ensure global setup has completed
        if (!AuthController) {
            AuthController = (await import('../../controller/auth.js')).default;
            PluginController = (await import('../../controller/plugin.js')).default;
        }

        // Reset mocks
        jest.clearAllMocks();

        // Mock request object
        mockReq = {
            session: {},
            params: {},
            body: {},
            path: '/api/1/plugin',
            originalUrl: '/api/1/plugin',
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
            send: jest.fn().mockReturnThis()
        };

        // Mock next function
        mockNext = jest.fn();
    });

    describe('Public Endpoint: GET /api/1/plugin/:name/info', () => {
        test('should allow unauthenticated access', async () => {
            // Public endpoint - no authentication required
            mockReq.session = {};
            mockReq.params = { name: 'hello-world' };

            // Call directly - no auth middleware needed for public endpoint
            await PluginController.getInfo(mockReq, mockRes);

            // Should call json() (either success or error, but not block on auth)
            expect(mockRes.json).toHaveBeenCalled();

            const response = mockRes.json.mock.calls[0][0];
            // Either success with data, or error (plugin not found), but NOT auth error
            if (!response.success) {
                expect(response.code).not.toBe('AUTH_REQUIRED');
                expect(response.code).not.toBe('AUTH_ROLE_REQUIRED');
            }
        });
    });

    describe('Protected Endpoint: GET /api/1/plugin (list)', () => {
        test('should require authentication', () => {
            mockReq.session = {};

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCommonUtils.sendError).toHaveBeenCalled();

            // Verify it was called with 401 status (unauthenticated) and UNAUTHORIZED code
            const callArgs = mockCommonUtils.sendError.mock.calls[0];
            expect(callArgs[2]).toBe(401); // status
            expect(callArgs[4]).toBe('UNAUTHORIZED'); // code
        });

        test('should deny access to regular users', () => {
            mockReq.session = {
                user: {
                    id: 'user123',
                    loginId: 'regularuser',
                    roles: ['user'],
                    isAuthenticated: true
                }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCommonUtils.sendError).toHaveBeenCalled();

            // Verify it was called with 403 status (insufficient privileges) and appropriate code
            const callArgs = mockCommonUtils.sendError.mock.calls[0];
            expect(callArgs[2]).toBe(403); // status
            expect(callArgs[4]).toBe('INSUFFICIENT_PRIVILEGES'); // code
        });

        test('should allow admin access', () => {
            mockReq.session = {
                user: {
                    id: 'admin123',
                    loginId: 'adminuser',
                    roles: ['user', 'admin'],
                    isAuthenticated: true
                }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockCommonUtils.sendError).not.toHaveBeenCalled();
        });
    });

    describe('Protected Endpoint: GET /api/1/plugin/:name (details)', () => {
        test('should require admin role', () => {
            mockReq.session = {
                user: {
                    id: 'user123',
                    roles: ['user'],
                    isAuthenticated: true
                }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCommonUtils.sendError).toHaveBeenCalled();
        });

        test('should allow admin access', () => {
            mockReq.session = {
                user: {
                    id: 'admin123',
                    roles: ['admin'],
                    isAuthenticated: true
                }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Protected Endpoint: Config Management', () => {
        test('GET /api/1/plugin/:name/config should require admin role', () => {
            mockReq.session = {
                user: { roles: ['user'], isAuthenticated: true }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCommonUtils.sendError).toHaveBeenCalled();
        });

        test('PUT /api/1/plugin/:name/config should require admin role', () => {
            mockReq.session = {
                user: { roles: ['user'], isAuthenticated: true }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCommonUtils.sendError).toHaveBeenCalled();
        });

        test('Admin should pass authentication', () => {
            mockReq.session = {
                user: {
                    id: 'admin123',
                    username: 'admin',
                    roles: ['admin'],
                    isAuthenticated: true
                }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Protected Endpoints: Enable/Disable', () => {
        test('POST /api/1/plugin/:name/enable should require admin', () => {
            mockReq.session = {
                user: { roles: ['user'], isAuthenticated: true }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCommonUtils.sendError).toHaveBeenCalled();
        });

        test('POST /api/1/plugin/:name/disable should require admin', () => {
            mockReq.session = {
                user: { roles: ['user'], isAuthenticated: true }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCommonUtils.sendError).toHaveBeenCalled();
        });

        test('Admin should pass authentication for enable/disable', () => {
            mockReq.session = {
                user: {
                    id: 'admin123',
                    roles: ['admin'],
                    isAuthenticated: true
                }
            };

            const middleware = AuthController.requireRole(['admin', 'root']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });
});

// EOF webapp/tests/integration/plugin-api.test.js
