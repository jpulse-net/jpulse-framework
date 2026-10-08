/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Model / passwordManagedBy
 * @tagline         W-261: directory-owned passwords are refused by authenticate()
 * @description     Confirms the baseSchema field, that new local users are not stamped with it,
 *                   and that authenticate() returns null without checking the hash when it is set
 * @file            webapp/tests/unit/model/user-password-managed-by.test.js
 * @version         2.0.12
 * @release         2026-10-08
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.21, Grok 4.7
 */

import { describe, test, expect, beforeAll, afterEach, jest } from '@jest/globals';

jest.mock('../../../database.js', () => ({
    default: {
        getDb: jest.fn(() => ({
            collection: jest.fn(() => ({
                findOne: jest.fn(),
                insertOne: jest.fn(),
                updateOne: jest.fn()
            }))
        }))
    }
}));

describe('UserModel.passwordManagedBy (W-261)', () => {
    let UserModel;

    beforeAll(async () => {
        if (!global.appConfig) global.appConfig = {};
        UserModel = (await import('../../../model/user.js')).default;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('is declared as a string defaulting to empty', () => {
        expect(UserModel.baseSchema.passwordManagedBy).toEqual({ type: 'string', default: '' });
    });

    test('applyDefaults() leaves it unset for a new local user', () => {
        const result = UserModel.applyDefaults({
            username: 'ada',
            email: 'ada@example.com',
            profile: { firstName: 'Ada', lastName: 'Lovelace' }
        });

        expect(result.passwordManagedBy).toBeUndefined();
    });

    test('authenticate() returns null without checking the hash when the directory owns the password', async () => {
        jest.spyOn(UserModel, 'findByUsername').mockResolvedValue({
            username: 'ada',
            passwordHash: 'hash',
            passwordManagedBy: 'auth-ldap'
        });
        jest.spyOn(UserModel, 'verifyPassword').mockResolvedValue(true);

        const result = await UserModel.authenticate('ada', 'the-real-password');

        expect(result).toBeNull();
        expect(UserModel.verifyPassword).not.toHaveBeenCalled();
    });

    test('authenticate() still checks the hash when passwordManagedBy is empty', async () => {
        jest.spyOn(UserModel, 'findByUsername').mockResolvedValue({
            username: 'ada',
            passwordHash: 'hash',
            passwordManagedBy: '',
            profile: { firstName: 'Ada', lastName: 'Lovelace' }
        });
        jest.spyOn(UserModel, 'verifyPassword').mockResolvedValue(true);

        const result = await UserModel.authenticate('ada', 'the-real-password');

        expect(result).toEqual(expect.objectContaining({ username: 'ada' }));
        expect(result).not.toHaveProperty('passwordHash');
        expect(UserModel.verifyPassword).toHaveBeenCalledWith('the-real-password', 'hash');
    });
});

// EOF webapp/tests/unit/model/user-password-managed-by.test.js
