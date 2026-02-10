/**
 * @name            jPulse Framework / WebApp / Tests / Integration / Config Admin Roles (W-147)
 * @tagline         Integration tests for admin roles from config (requireAdminRole consumer)
 * @description     Verifies config cache -> getEffectiveAdminRoles -> requireAdminRole flow:
 *                  admin edit roles (via cache), consumer (requireAdminRole) behavior.
 * @file            webapp/tests/integration/config-admin-roles.test.js
 * @version         1.6.14
 * @release         2026-02-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.4, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

let ConfigModel;
let AuthController;

jest.mock('../../model/user.js');
jest.mock('../../controller/log.js', () => ({
    logRequest: jest.fn(),
    logError: jest.fn(),
    logInfo: jest.fn()
}));

const mockI18n = {
    translate: jest.fn((req, key, context = {}) => {
        const translations = {
            'controller.auth.roleRequired': `Insufficient privileges. Required role(s): ${context.roles || 'admin, root'}`
        };
        return translations[key] || key;
    })
};

global.i18n = mockI18n;

describe('Config admin roles integration (W-147)', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(async () => {
        if (!ConfigModel) {
            ConfigModel = (await import('../../model/config.js')).default;
        }
        if (!AuthController) {
            AuthController = (await import('../../controller/auth.js')).default;
        }
        jest.clearAllMocks();

        mockReq = {
            session: {},
            body: {},
            originalUrl: '/api/1/plugin',
            headers: { 'x-forwarded-for': '192.168.1.100' },
            connection: { remoteAddress: '192.168.1.100' },
            ip: '192.168.1.100'
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
    });

    afterEach(() => {
        ConfigModel.clearEffectiveGeneralCache();
    });

    describe('requireAdminRole uses config cache', () => {
        test('user with custom admin role (from cache) is allowed', () => {
            ConfigModel.setEffectiveGeneralCache({
                roles: ['user', 'customAdmin'],
                adminRoles: ['customAdmin']
            });
            mockReq.session = {
                user: {
                    id: 'u1',
                    loginId: 'u1',
                    roles: ['user', 'customAdmin'],
                    isAuthenticated: true
                }
            };

            const middleware = AuthController.requireAdminRole();
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        test('user without any configured admin role is denied', () => {
            ConfigModel.setEffectiveGeneralCache({
                roles: ['user', 'customAdmin'],
                adminRoles: ['customAdmin']
            });
            mockReq.session = {
                user: {
                    id: 'u2',
                    loginId: 'u2',
                    roles: ['user'],
                    isAuthenticated: true
                }
            };

            const sendErrorSpy = jest.spyOn(global.CommonUtils, 'sendError').mockImplementation(() => {});
            const middleware = AuthController.requireAdminRole();
            middleware(mockReq, mockRes, mockNext);

            expect(sendErrorSpy).toHaveBeenCalledWith(
                mockReq, mockRes, 403,
                expect.stringContaining('customAdmin'),
                'INSUFFICIENT_PRIVILEGES'
            );
            expect(mockNext).not.toHaveBeenCalled();
            sendErrorSpy.mockRestore();
        });

        test('default cache (admin, root): user with admin passes', () => {
            ConfigModel.clearEffectiveGeneralCache();
            mockReq.session = {
                user: {
                    id: 'u3',
                    loginId: 'u3',
                    roles: ['user', 'admin'],
                    isAuthenticated: true
                }
            };

            const middleware = AuthController.requireAdminRole();
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
        });
    });
});

// EOF webapp/tests/integration/config-admin-roles.test.js
