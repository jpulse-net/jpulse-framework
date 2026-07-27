/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / hasLocalPassword schema
 * @tagline         W-195 baseSchema primitive: hasLocalPassword
 * @description     Confirms hasLocalPassword is declared with default true, and that
 *                   applyDefaults() intentionally leaves it unset for new local users (absent
 *                   field reads as true - no migration/backfill needed, see model/user.js)
 * @file            webapp/tests/unit/user/user-has-local-password-schema.test.js
 * @version         1.7.1
 * @release         2026-07-26
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.12, Claude Sonnet 5
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { jest } from '@jest/globals';

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

describe('UserModel.baseSchema.hasLocalPassword (W-195)', () => {
    let UserModel;

    beforeAll(async () => {
        if (!global.appConfig) global.appConfig = {};
        UserModel = (await import('../../../model/user.js')).default;
    });

    test('should be declared as a boolean defaulting to true', () => {
        expect(UserModel.baseSchema.hasLocalPassword).toEqual({ type: 'boolean', default: true });
    });

    test('applyDefaults() should leave hasLocalPassword unset for new local users (absent reads as true)', () => {
        const result = UserModel.applyDefaults({
            username: 'newuser',
            email: 'newuser@example.com',
            profile: { firstName: 'New', lastName: 'User' }
        });

        expect(result.hasLocalPassword).toBeUndefined();
        // Mirrors how consumers (changePassword, settings.tmpl) read the flag
        expect(result.hasLocalPassword !== false).toBe(true);
    });

    test('applyDefaults() should preserve an explicit hasLocalPassword: false (external-auth JIT creation)', () => {
        const result = UserModel.applyDefaults({
            username: 'ssouser',
            email: 'ssouser@example.com',
            profile: { firstName: 'SSO', lastName: 'User' },
            hasLocalPassword: false
        });

        expect(result.hasLocalPassword).toBe(false);
    });
});

// EOF webapp/tests/unit/user/user-has-local-password-schema.test.js
