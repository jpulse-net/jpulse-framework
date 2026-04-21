/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / Extension schema defaults
 * @tagline         applyExtensionSchemaDefaults for GET /api/1/user
 * @description     Merges plugin/site extendSchema defaults into API user payloads
 * @file            webapp/tests/unit/user/user-extension-schema-defaults.test.js
 * @version         1.6.42
 * @release         2026-04-21
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.6, Auto
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

describe('UserModel.applyExtensionSchemaDefaults', () => {
    let UserModel;
    let savedExtensions;
    let savedMetadata;

    beforeAll(async () => {
        if (!global.appConfig) global.appConfig = {};
        const { default: UserModelModule } = await import('../../../model/user.js');
        UserModel = UserModelModule;
    });

    beforeEach(() => {
        savedExtensions = [...UserModel.schemaExtensions];
        savedMetadata = { ...UserModel.schemaExtensionsMetadata };
    });

    afterEach(() => {
        UserModel.schemaExtensions = savedExtensions;
        UserModel.schemaExtensionsMetadata = savedMetadata;
        UserModel.initializeSchema();
    });

    test('fills missing top-level extension block from schema defaults', () => {
        UserModel.schemaExtensions = [];
        UserModel.schemaExtensionsMetadata = {};
        UserModel.extendSchema({
            bubblemap: {
                _meta: { plugin: 'test' },
                trackBubbleHistory: { type: 'boolean', default: false }
            }
        });

        const out = UserModel.applyExtensionSchemaDefaults({
            username: 'u1',
            email: 'a@b.c',
            profile: { firstName: 'A', lastName: 'B' }
        });

        expect(out.bubblemap).toEqual({ trackBubbleHistory: false });
    });

    test('stored extension values override schema defaults', () => {
        UserModel.schemaExtensions = [];
        UserModel.schemaExtensionsMetadata = {};
        UserModel.extendSchema({
            bubblemap: {
                trackBubbleHistory: { type: 'boolean', default: false }
            }
        });

        const out = UserModel.applyExtensionSchemaDefaults({
            username: 'u1',
            email: 'a@b.c',
            profile: { firstName: 'A', lastName: 'B' },
            bubblemap: { trackBubbleHistory: true }
        });

        expect(out.bubblemap.trackBubbleHistory).toBe(true);
    });

    test('merges partial extension object with nested defaults', () => {
        UserModel.schemaExtensions = [];
        UserModel.schemaExtensionsMetadata = {};
        UserModel.extendSchema({
            bubblemap: {
                trackBubbleHistory: { type: 'boolean', default: false },
                maxNodes: { type: 'number', default: 100 }
            }
        });

        const out = UserModel.applyExtensionSchemaDefaults({
            username: 'u1',
            email: 'a@b.c',
            profile: { firstName: 'A', lastName: 'B' },
            bubblemap: { trackBubbleHistory: true }
        });

        expect(out.bubblemap.trackBubbleHistory).toBe(true);
        expect(out.bubblemap.maxNodes).toBe(100);
    });
});

// EOF webapp/tests/unit/user/user-extension-schema-defaults.test.js
