/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / User Change Password
 * @tagline         Unit tests for UserController.changePassword (W-195 hasLocalPassword logic)
 * @description     Tests that currentPassword verification is skipped for users without a
 *                   usable local password (hasLocalPassword === false), and enforced otherwise
 * @file            webapp/tests/unit/user/user-change-password.test.js
 * @version         1.7.1
 * @release         2026-07-26
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.12, Claude Sonnet 5
 */

import { describe, test, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

TestUtils.setupGlobalMocksWithConsolidatedConfig();

let UserController, UserModel;

jest.mock('../../../model/user.js');
jest.mock('../../../controller/log.js');

describe('UserController.changePassword (W-195)', () => {
    beforeAll(async () => {
        UserController = (await import('../../../controller/user.js')).default;
        UserModel = (await import('../../../model/user.js')).default;
    });

    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            session: { user: { id: 'user123', username: 'testuser' } },
            body: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        global.LogController = {
            logRequest: jest.fn(),
            logError: jest.fn(),
            logInfo: jest.fn(),
            logWarning: jest.fn()
        };
        global.CommonUtils = {
            sendError: jest.fn((req, res, status, message, code) => {
                res.status(status);
                res.json({ success: false, error: message, code });
            })
        };
        global.i18n = {
            translate: jest.fn((req, key) => key)
        };

        UserModel.updateById = jest.fn().mockResolvedValue({});
        UserModel.verifyPassword = jest.fn().mockResolvedValue(true);

        jest.clearAllMocks();
    });

    function mockUserWith(overrides = {}) {
        return {
            _id: 'user123',
            username: 'testuser',
            passwordHash: 'hashed-old-password',
            ...overrides
        };
    }

    describe('hasLocalPassword === true (default) - currentPassword required', () => {
        test('should require currentPassword when missing', async () => {
            UserModel.findById = jest.fn().mockResolvedValue(mockUserWith());
            mockReq.body = { newPassword: 'newPass123!' };

            await UserController.changePassword(mockReq, mockRes);

            expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq, mockRes, 400, 'controller.user.password.missingPasswords', 'MISSING_PASSWORDS'
            );
            expect(UserModel.updateById).not.toHaveBeenCalled();
        });

        test('should reject an invalid currentPassword', async () => {
            UserModel.findById = jest.fn().mockResolvedValue(mockUserWith());
            UserModel.verifyPassword.mockResolvedValue(false);
            mockReq.body = { currentPassword: 'wrong', newPassword: 'newPass123!' };

            await UserController.changePassword(mockReq, mockRes);

            expect(UserModel.verifyPassword).toHaveBeenCalledWith('wrong', 'hashed-old-password');
            expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq, mockRes, 400, 'controller.user.password.invalidCurrentPassword', 'INVALID_CURRENT_PASSWORD'
            );
            expect(UserModel.updateById).not.toHaveBeenCalled();
        });

        test('should succeed and set hasLocalPassword true with a valid currentPassword', async () => {
            UserModel.findById = jest.fn().mockResolvedValue(mockUserWith());
            mockReq.body = { currentPassword: 'oldPass123!', newPassword: 'newPass123!' };

            await UserController.changePassword(mockReq, mockRes);

            expect(UserModel.updateById).toHaveBeenCalledWith('user123', expect.objectContaining({
                password: 'newPass123!',
                hasLocalPassword: true
            }));
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('should treat an absent hasLocalPassword field as true (pre-W-195 users)', async () => {
            UserModel.findById = jest.fn().mockResolvedValue(mockUserWith()); // no hasLocalPassword field at all
            mockReq.body = { newPassword: 'newPass123!' }; // no currentPassword

            await UserController.changePassword(mockReq, mockRes);

            // Same as hasLocalPassword: true - currentPassword is required
            expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq, mockRes, 400, 'controller.user.password.missingPasswords', 'MISSING_PASSWORDS'
            );
        });
    });

    describe('hasLocalPassword === false (JIT external-auth user) - currentPassword skipped', () => {
        test('should succeed without currentPassword', async () => {
            UserModel.findById = jest.fn().mockResolvedValue(mockUserWith({ hasLocalPassword: false }));
            mockReq.body = { newPassword: 'newPass123!' };

            await UserController.changePassword(mockReq, mockRes);

            expect(UserModel.verifyPassword).not.toHaveBeenCalled();
            expect(UserModel.updateById).toHaveBeenCalledWith('user123', expect.objectContaining({
                password: 'newPass123!',
                hasLocalPassword: true
            }));
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('should ignore an unnecessary currentPassword if the caller sends one anyway', async () => {
            UserModel.findById = jest.fn().mockResolvedValue(mockUserWith({ hasLocalPassword: false }));
            mockReq.body = { currentPassword: 'irrelevant', newPassword: 'newPass123!' };

            await UserController.changePassword(mockReq, mockRes);

            expect(UserModel.verifyPassword).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('should require newPassword with the "set password" message when missing', async () => {
            UserModel.findById = jest.fn().mockResolvedValue(mockUserWith({ hasLocalPassword: false }));
            mockReq.body = {};

            await UserController.changePassword(mockReq, mockRes);

            expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq, mockRes, 400, 'controller.user.password.missingNewPassword', 'MISSING_PASSWORDS'
            );
            expect(UserModel.updateById).not.toHaveBeenCalled();
        });
    });

    describe('User lookup failure', () => {
        test('should 404 when the session user no longer exists', async () => {
            UserModel.findById = jest.fn().mockResolvedValue(null);
            mockReq.body = { currentPassword: 'a', newPassword: 'b' };

            await UserController.changePassword(mockReq, mockRes);

            expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq, mockRes, 404, 'controller.user.password.userNotFound', 'USER_NOT_FOUND'
            );
            expect(UserModel.updateById).not.toHaveBeenCalled();
        });
    });
});

// EOF webapp/tests/unit/user/user-change-password.test.js
