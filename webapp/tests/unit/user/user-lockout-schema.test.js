/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / account lockout schema
 * @tagline         W-202 per-account lockout: security schema, defaults, and pure lock helpers
 * @description     Confirms the system-managed security.lockedUntil / security.lastFailedLoginAt
 *                   fields are declared, defaulted to null for new users, and that the pure
 *                   isLocked() / lockRemainingMs() helpers read lockedUntil against the clock
 *                   (see model/user.js, docs/security-and-auth.md#account-lockout)
 * @file            webapp/tests/unit/user/user-lockout-schema.test.js
 * @version         2.0.17
 * @release         2026-11-26
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.30, Grok 4.7
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
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

describe('UserModel account lockout (W-202)', () => {
    let UserModel;
    let CommonUtils;

    beforeAll(async () => {
        if (!global.appConfig) global.appConfig = {};
        UserModel = (await import('../../../model/user.js')).default;
        CommonUtils = (await import('../../../utils/common.js')).default;
    });

    describe('schema', () => {
        test('declares security.lockedUntil and security.lastFailedLoginAt as dates defaulting to null', () => {
            expect(UserModel.baseSchema.security).toEqual({
                lockedUntil: { type: 'date', default: null },
                lastFailedLoginAt: { type: 'date', default: null }
            });
        });

        test('status enum stays admin-controlled and never gains a "locked" value', () => {
            expect(UserModel.baseSchema.status.enum).toEqual(
                ['pending', 'active', 'inactive', 'suspended', 'terminated']
            );
        });
    });

    describe('applyDefaults()', () => {
        test('starts a new user unlocked, with both security fields null', () => {
            const result = UserModel.applyDefaults({
                username: 'newuser',
                email: 'newuser@example.com',
                profile: { firstName: 'New', lastName: 'User' }
            });

            expect(result.security).toEqual({ lockedUntil: null, lastFailedLoginAt: null });
        });

        test('preserves an already-set lockedUntil rather than clearing it', () => {
            const until = new Date(Date.now() + 60000);
            const result = UserModel.applyDefaults({
                username: 'someuser',
                email: 'someuser@example.com',
                profile: { firstName: 'Some', lastName: 'User' },
                security: { lockedUntil: until }
            });

            expect(result.security.lockedUntil).toBe(until);
            expect(result.security.lastFailedLoginAt).toBeNull();
        });
    });

    describe('isLocked()', () => {
        test('is true while lockedUntil is in the future', () => {
            const user = { security: { lockedUntil: new Date(Date.now() + 60000) } };
            expect(UserModel.isLocked(user)).toBe(true);
        });

        test('is false once lockedUntil is in the past', () => {
            const user = { security: { lockedUntil: new Date(Date.now() - 1000) } };
            expect(UserModel.isLocked(user)).toBe(false);
        });

        test('is false when never locked, or on a user with no security block', () => {
            expect(UserModel.isLocked({ security: { lockedUntil: null } })).toBe(false);
            expect(UserModel.isLocked({})).toBe(false);
            expect(UserModel.isLocked(null)).toBe(false);
        });

        test('accepts an ISO string lockedUntil (as it comes back from the API)', () => {
            const user = { security: { lockedUntil: new Date(Date.now() + 60000).toISOString() } };
            expect(UserModel.isLocked(user)).toBe(true);
        });
    });

    describe('lockRemainingMs()', () => {
        test('returns a positive remaining time while locked', () => {
            const user = { security: { lockedUntil: new Date(Date.now() + 60000) } };
            const remaining = UserModel.lockRemainingMs(user);
            expect(remaining).toBeGreaterThan(0);
            expect(remaining).toBeLessThanOrEqual(60000);
        });

        test('returns 0 when not locked or already expired', () => {
            expect(UserModel.lockRemainingMs({ security: { lockedUntil: null } })).toBe(0);
            expect(UserModel.lockRemainingMs({ security: { lockedUntil: new Date(Date.now() - 1000) } })).toBe(0);
            expect(UserModel.lockRemainingMs({})).toBe(0);
        });
    });

    describe('search() lock filter', () => {
        let paginatedSearch;

        beforeEach(() => {
            jest.spyOn(UserModel, 'getCollection').mockReturnValue({});
            paginatedSearch = jest.spyOn(CommonUtils, 'paginatedSearch').mockResolvedValue({ data: [] });
        });

        afterEach(() => {
            paginatedSearch.mockRestore();
            UserModel.getCollection.mockRestore();
        });

        test('locked=1 keeps the status filter and requires lockedUntil in the future', async () => {
            await UserModel.search({ locked: '1', status: 'active', limit: '50' }, { includeLockFilter: true });

            const query = paginatedSearch.mock.calls[0][1].query;
            expect(query.$and).toEqual(expect.arrayContaining([
                expect.objectContaining({ status: 'active' }),
                { 'security.lockedUntil': { $gt: expect.any(Date) } }
            ]));
        });

        test('locked=0 matches a missing lock or one that has already expired', async () => {
            await UserModel.search({ locked: '0' }, { includeLockFilter: true });

            const query = paginatedSearch.mock.calls[0][1].query;
            expect(query.$or).toEqual([
                { 'security.lockedUntil': null },
                { 'security.lockedUntil': { $lte: expect.any(Date) } }
            ]);
        });

        test('locked=0 stays intact beside a status filter', async () => {
            await UserModel.search({ locked: '0', status: 'active' }, { includeLockFilter: true });

            const query = paginatedSearch.mock.calls[0][1].query;
            expect(query.$and).toEqual(expect.arrayContaining([
                expect.objectContaining({ status: 'active' }),
                { $or: [
                    { 'security.lockedUntil': null },
                    { 'security.lockedUntil': { $lte: expect.any(Date) } }
                ] }
            ]));
        });

        test('ignores locked unless the caller is allowed to filter on it', async () => {
            await UserModel.search({ locked: '1', status: 'active' }, {});

            const query = paginatedSearch.mock.calls[0][1].query;
            expect(query.status).toBe('active');
            expect(JSON.stringify(query)).not.toContain('lockedUntil');
        });

        test('a comma list of statuses matches any of them and does not imply a lock', async () => {
            await UserModel.search({ status: 'active,pending', locked: '1' }, { includeLockFilter: true });

            const query = paginatedSearch.mock.calls[0][1].query;
            expect(query.$and).toEqual(expect.arrayContaining([
                { $or: [{ status: 'active' }, { status: 'pending' }] },
                { 'security.lockedUntil': { $gt: expect.any(Date) } }
            ]));
        });

        test('a locked word inside status does not filter the lock', async () => {
            await UserModel.search({ status: 'active,locked' }, { includeLockFilter: true });

            const query = paginatedSearch.mock.calls[0][1].query;
            expect(query.$or).toEqual([
                { status: 'active' },
                { status: 'locked' }
            ]);
            expect(JSON.stringify(query)).not.toContain('lockedUntil');
        });

        test('a custom role is matched even though it is not in the schema enum', async () => {
            await UserModel.search({ roles: 'geek' }, { includeLockFilter: true });

            const query = paginatedSearch.mock.calls[0][1].query;
            expect(query.roles).toEqual({ $in: ['geek'] });
        });

        test('yes and no are not accepted as the lock flag', async () => {
            await UserModel.search({ locked: 'yes' }, { includeLockFilter: true });

            const query = paginatedSearch.mock.calls[0][1].query;
            expect(JSON.stringify(query)).not.toContain('lockedUntil');
        });
    });
});

// EOF webapp/tests/unit/user/user-lockout-schema.test.js
