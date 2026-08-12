/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / User Controller Profile Fields
 * @tagline         Unit tests for UserController._filterPublicProfileFields (W-201 follow-up)
 * @description     Regression coverage for the admin-list avatar 'initials' bug found while
 *                   manually testing W-201: the admin branch of _filterPublicProfileFields() never
 *                   computed `initials` (a derived, session-only value never persisted on the DB
 *                   document), so admin/users.shtml's list fell back to '?' for every row.
 * @file            webapp/tests/unit/user/user-controller-profile-fields.test.js
 * @version         1.7.11
 * @release         2026-08-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.13, Claude Sonnet 5
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

TestUtils.setupGlobalMocksWithConsolidatedConfig();

let UserController, ConfigModel;

describe('UserController._filterPublicProfileFields (W-201 follow-up)', () => {
    beforeAll(async () => {
        ConfigModel = (await import('../../../model/config.js')).default;
        ConfigModel.setEffectiveGeneralCache({ roles: ['user', 'admin', 'root'], adminRoles: ['admin', 'root'] });

        UserController = (await import('../../../controller/user.js')).default;
    });

    const rawUser = {
        _id: 'user123',
        username: 'ptester8',
        email: 'ptester8@example.com',
        passwordHash: 'should-never-be-exposed',
        profile: { firstName: 'Peter', lastName: 'Tester8', nickName: '' },
        roles: ['user'],
        status: 'active'
    };

    test("admin viewer: includes computed 'initials', matching the non-admin branch's formula", () => {
        const adminReq = { session: { user: { isAuthenticated: true, roles: ['admin'] } } };

        const filtered = UserController._filterPublicProfileFields(rawUser, adminReq);

        expect(filtered.initials).toBe('PT');
    });

    test('admin viewer: still gets every other raw field, minus passwordHash', () => {
        const adminReq = { session: { user: { isAuthenticated: true, roles: ['admin'] } } };

        const filtered = UserController._filterPublicProfileFields(rawUser, adminReq);

        expect(filtered.username).toBe('ptester8');
        expect(filtered.email).toBe('ptester8@example.com');
        expect(filtered.status).toBe('active');
        expect(filtered.passwordHash).toBeUndefined();
    });

    test("non-admin viewer: 'initials' still computed (pre-existing, unchanged behavior)", () => {
        const userReq = { session: { user: { isAuthenticated: true, roles: ['user'] } } };

        const filtered = UserController._filterPublicProfileFields(rawUser, userReq);

        expect(filtered.initials).toBe('PT');
    });

    test("admin viewer: 'initials' falls back to empty-letter behavior for missing name parts", () => {
        const adminReq = { session: { user: { isAuthenticated: true, roles: ['admin'] } } };
        const userWithoutLastName = { ...rawUser, profile: { firstName: 'Peter', lastName: '' } };

        const filtered = UserController._filterPublicProfileFields(userWithoutLastName, adminReq);

        expect(filtered.initials).toBe('P');
    });
});
