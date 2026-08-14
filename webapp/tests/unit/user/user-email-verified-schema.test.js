/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / emailVerified schema
 * @tagline         W-198 baseSchema primitive: emailVerified
 * @description     Confirms emailVerified is declared with default false, and that
 *                   applyDefaults() explicitly stamps every brand-new signup with false (unlike
 *                   hasLocalPassword's true-default) - existing accounts are never touched by
 *                   applyDefaults() and stay absent, which reads as verified/grandfathered
 *                   (see model/user.js)
 * @file            webapp/tests/unit/user/user-email-verified-schema.test.js
 * @version         1.7.14
 * @release         2026-08-14
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.13, Claude Sonnet 5
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

describe('UserModel.baseSchema.emailVerified (W-198)', () => {
    let UserModel;

    beforeAll(async () => {
        if (!global.appConfig) global.appConfig = {};
        UserModel = (await import('../../../model/user.js')).default;
    });

    test('should be declared as a boolean defaulting to false', () => {
        expect(UserModel.baseSchema.emailVerified).toEqual({ type: 'boolean', default: false });
    });

    test('applyDefaults() should explicitly stamp emailVerified: false for every brand-new signup', () => {
        const result = UserModel.applyDefaults({
            username: 'newuser',
            email: 'newuser@example.com',
            profile: { firstName: 'New', lastName: 'User' }
        });

        expect(result.emailVerified).toBe(false);
    });

    test('applyDefaults() should preserve an explicit emailVerified: true (e.g. admin-provisioned account)', () => {
        const result = UserModel.applyDefaults({
            username: 'preverified',
            email: 'preverified@example.com',
            profile: { firstName: 'Pre', lastName: 'Verified' },
            emailVerified: true
        });

        expect(result.emailVerified).toBe(true);
    });

    test('a pre-existing document with no emailVerified field reads as grandfathered/verified', () => {
        // Simulates a document read straight from the DB, never touched by applyDefaults()
        const legacyUser = {
            username: 'legacyuser',
            email: 'legacy@example.com'
        };

        expect(legacyUser.emailVerified).toBeUndefined();
        // Mirrors how a future consumer (e.g. auth-oauth plugin) must read the flag
        expect(legacyUser.emailVerified !== false).toBe(true);
    });
});

// EOF webapp/tests/unit/user/user-email-verified-schema.test.js
