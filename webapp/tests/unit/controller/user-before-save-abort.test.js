/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / User Before Save Abort
 * @tagline         onUserBeforeSave abort path for signup and update
 * @description     A throwing onUserBeforeSave handler must surface as 400 USER_SAVE_REJECTED
 *                  with the handler's message verbatim.
 * @file            webapp/tests/unit/controller/user-before-save-abort.test.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

TestUtils.setupGlobalMocksWithConsolidatedConfig();

jest.mock('../../../model/user.js');
jest.mock('../../../controller/auth.js');
jest.mock('../../../controller/log.js');

let UserController, UserModel, ConfigModel;

describe('UserController onUserBeforeSave abort', () => {
    beforeAll(async () => {
        ConfigModel = (await import('../../../model/config.js')).default;
        ConfigModel.setEffectiveGeneralCache({ roles: ['user', 'admin', 'root'], adminRoles: ['admin', 'root'] });

        UserController = (await import('../../../controller/user.js')).default;
        UserModel = (await import('../../../model/user.js')).default;
    });

    let mockReq, mockRes;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = {
            session: { user: { id: 'user-1', username: 'janedoe' } },
            body: {
                firstName: 'Jane',
                lastName: 'Doe',
                username: 'janedoe',
                email: 'jane@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                acceptTerms: true
            },
            params: { id: 'user-1' },
            query: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        global.i18n = { translate: jest.fn((req, key) => key) };
        global.CommonUtils = {
            ...(global.CommonUtils || {}),
            sendError: jest.fn((req, res, status, message, code) => {
                res.status(status).json({ success: false, error: message, code });
            })
        };
    });

    test('signup() returns 400 USER_SAVE_REJECTED with the handler message', async () => {
        if (!global.appConfig.controller) global.appConfig.controller = {};
        if (!global.appConfig.controller.user) global.appConfig.controller.user = {};
        global.appConfig.controller.user.disableSignup = false;

        const hookError = new Error('Signup blocked by policy');
        hookError.hookName = 'onUserBeforeSave';
        hookError.pluginName = 'gate-plugin';
        global.HookManager = {
            execute: jest.fn().mockRejectedValue(hookError)
        };

        await UserController.signup(mockReq, mockRes);

        expect(UserModel.create).not.toHaveBeenCalled();
        expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            'Signup blocked by policy',
            'USER_SAVE_REJECTED'
        );
    });

    test('update() returns 400 USER_SAVE_REJECTED when UserModel.updateById throws a hook error', async () => {
        const hookError = new Error('Profile change denied');
        hookError.hookName = 'onUserBeforeSave';
        hookError.pluginName = 'gate-plugin';
        UserModel.getSchemaExtensionsMetadata.mockReturnValue({});
        UserModel.findById.mockResolvedValue({
            _id: 'user-1',
            username: 'janedoe',
            roles: ['user'],
            status: 'active'
        });
        UserModel.updateById.mockRejectedValue(hookError);

        mockReq.body = { profile: { firstName: 'Jane' } };
        await UserController.update(mockReq, mockRes);

        expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            'Profile change denied',
            'USER_SAVE_REJECTED'
        );
    });
});

// EOF webapp/tests/unit/controller/user-before-save-abort.test.js
