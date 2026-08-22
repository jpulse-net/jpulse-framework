/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Model / User Before Save Abort
 * @tagline         onUserBeforeSave abort path for UserModel.create() and updateById()
 * @description     A throwing onUserBeforeSave handler must abort create/update with the
 *                  handler's message, not wrap it as a generic "Failed to create/update user".
 * @file            webapp/tests/unit/model/user-before-save-abort.test.js
 * @version         1.7.16
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import HookManager from '../../../utils/hook-manager.js';

const mockCollection = {
    findOne: jest.fn(),
    insertOne: jest.fn(),
    updateOne: jest.fn()
};

jest.mock('../../../database.js', () => ({
    __esModule: true,
    default: {
        getDb: jest.fn()
    }
}));

describe('UserModel onUserBeforeSave abort', () => {
    let UserModel;
    let mockGetDb;

    beforeAll(async () => {
        if (!global.appConfig) global.appConfig = {};
        mockGetDb = (await import('../../../database.js')).default.getDb;
        UserModel = (await import('../../../model/user.js')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetDb.mockImplementation(() => ({
            collection: jest.fn(() => mockCollection)
        }));
        global.LogController = { logInfo: jest.fn(), logWarning: jest.fn(), logError: jest.fn() };
        global.HookManager = HookManager;
        HookManager.clear();
    });

    afterEach(() => {
        HookManager.clear();
    });

    test('create() aborts with the handler message and never inserts', async () => {
        HookManager.register('onUserBeforeSave', 'gate-plugin', () => {
            throw new Error('Username reserved');
        });

        await expect(UserModel.create({
            username: 'newuser',
            email: 'new@example.com',
            passwordHash: 'already-hashed',
            profile: { firstName: 'New', lastName: 'User' }
        })).rejects.toMatchObject({
            message: 'Username reserved',
            hookName: 'onUserBeforeSave',
            pluginName: 'gate-plugin'
        });

        expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    test('updateById() aborts with the handler message and never updates', async () => {
        HookManager.register('onUserBeforeSave', 'gate-plugin', () => {
            throw new Error('Profile change denied');
        });

        await expect(UserModel.updateById('507f1f77bcf86cd799439011', {
            email: 'new@example.com'
        })).rejects.toMatchObject({
            message: 'Profile change denied',
            hookName: 'onUserBeforeSave',
            pluginName: 'gate-plugin'
        });

        expect(mockCollection.updateOne).not.toHaveBeenCalled();
    });
});

// EOF webapp/tests/unit/model/user-before-save-abort.test.js
