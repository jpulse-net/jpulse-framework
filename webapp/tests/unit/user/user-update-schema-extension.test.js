/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / User Update Schema Extension
 * @tagline         Unit tests for W-170: regular-user schema-extension block filtering
 * @description     Tests for the update() filteredData logic: regular users may now persist
 *                  schema-extension blocks where _meta.userCard.visible is true on self-update.
 * @file            webapp/tests/unit/user/user-update-schema-extension.test.js
 * @version         1.6.37
 * @release         2026-04-12
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.5, Claude Sonnet 4.6
 */

import { describe, test, expect } from '@jest/globals';

// Simulates the W-170 filteredData logic in UserController.update() for the regular-user path.
// Mirrors webapp/controller/user.js update() lines 673-683.
function buildFilteredDataForRegularUser(updateData, schemaExtensions) {
    const filteredData = {};
    if (updateData.profile) filteredData.profile = updateData.profile;
    if (updateData.preferences) filteredData.preferences = updateData.preferences;
    for (const blockKey of Object.keys(schemaExtensions)) {
        const meta = schemaExtensions[blockKey]?._meta;
        if (meta?.userCard?.visible && updateData[blockKey] !== undefined) {
            filteredData[blockKey] = updateData[blockKey];
        }
    }
    return filteredData;
}

describe('W-170: UserController.update() — regular-user schema-extension filtering', () => {

    const schemaExtensions = {
        bubblemap: {
            _meta: { plugin: 'bubblemap', userCard: { visible: true, label: 'BubbleMap' } },
            colStep: { type: 'number', default: 160 },
            rowStep: { type: 'number', default: 40 }
        },
        mfa: {
            _meta: { plugin: 'auth-mfa', userCard: { visible: false } },
            enabled: { type: 'boolean', default: false }
        },
        ldap: {
            _meta: { plugin: 'auth-ldap' }  // no userCard at all
        }
    };

    test('passes through userCard.visible extension block when present in updateData', () => {
        const updateData = {
            bubblemap: { colStep: 200, rowStep: 48 }
        };
        const result = buildFilteredDataForRegularUser(updateData, schemaExtensions);
        expect(result.bubblemap).toEqual({ colStep: 200, rowStep: 48 });
    });

    test('blocks extension block where userCard.visible is false', () => {
        const updateData = {
            bubblemap: { colStep: 200 },
            mfa: { enabled: true }
        };
        const result = buildFilteredDataForRegularUser(updateData, schemaExtensions);
        expect(result.bubblemap).toBeDefined();
        expect(result.mfa).toBeUndefined();
    });

    test('blocks extension block where _meta has no userCard', () => {
        const updateData = {
            ldap: { dn: 'cn=user,dc=example,dc=com' }
        };
        const result = buildFilteredDataForRegularUser(updateData, schemaExtensions);
        expect(result.ldap).toBeUndefined();
    });

    test('does not include visible block when absent from updateData', () => {
        const updateData = {
            profile: { firstName: 'Alice' }
        };
        const result = buildFilteredDataForRegularUser(updateData, schemaExtensions);
        expect(result.bubblemap).toBeUndefined();
    });

    test('always passes through profile and preferences', () => {
        const updateData = {
            profile: { firstName: 'Alice', lastName: 'Smith' },
            preferences: { language: 'fr', theme: 'dark' }
        };
        const result = buildFilteredDataForRegularUser(updateData, schemaExtensions);
        expect(result.profile).toEqual({ firstName: 'Alice', lastName: 'Smith' });
        expect(result.preferences).toEqual({ language: 'fr', theme: 'dark' });
    });

    test('does not pass profile when absent from updateData', () => {
        const updateData = {
            preferences: { language: 'en' }
        };
        const result = buildFilteredDataForRegularUser(updateData, schemaExtensions);
        expect(result.profile).toBeUndefined();
        expect(result.preferences).toBeDefined();
    });

    test('handles multiple visible extension blocks simultaneously', () => {
        const multiSchema = {
            blockA: { _meta: { userCard: { visible: true } } },
            blockB: { _meta: { userCard: { visible: true } } },
            blockC: { _meta: { userCard: { visible: false } } }
        };
        const updateData = {
            blockA: { x: 1 },
            blockB: { y: 2 },
            blockC: { z: 3 }
        };
        const result = buildFilteredDataForRegularUser(updateData, multiSchema);
        expect(result.blockA).toEqual({ x: 1 });
        expect(result.blockB).toEqual({ y: 2 });
        expect(result.blockC).toBeUndefined();
    });

    test('passes through extension block value of zero/false/empty-string (not just truthy)', () => {
        const multiSchema = {
            bubblemap: { _meta: { userCard: { visible: true } } }
        };
        const updateData = { bubblemap: { colStep: 0 } };
        const result = buildFilteredDataForRegularUser(updateData, multiSchema);
        expect(result.bubblemap).toEqual({ colStep: 0 });
    });

    test('does not pass through undefined extension block value', () => {
        const updateData = { bubblemap: undefined };
        const result = buildFilteredDataForRegularUser(updateData, schemaExtensions);
        expect(result.bubblemap).toBeUndefined();
    });

    test('handles empty schemaExtensions without error', () => {
        const updateData = {
            profile: { firstName: 'Bob' },
            bubblemap: { colStep: 160 }
        };
        const result = buildFilteredDataForRegularUser(updateData, {});
        expect(result.profile).toBeDefined();
        expect(result.bubblemap).toBeUndefined();
    });
});

// EOF webapp/tests/unit/user/user-update-schema-extension.test.js
