/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Config / Manifest
 * @tagline         Unit tests for W-137 manifest storage and defaults
 * @description     Tests for ConfigModel.ensureManifestDefaults() and related schema behavior
 * @file            webapp/tests/unit/config/config-manifest.test.js
 * @version         1.5.1
 * @release         2026-01-25
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.3, GPT-5.2
 */

import { jest } from '@jest/globals';
import ConfigModel from '../../../model/config.js';

describe('ConfigModel W-137 manifest', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('schema contains manifest and filters license key for all contexts', () => {
        expect(ConfigModel.schema.data.manifest).toBeDefined();
        expect(ConfigModel.schema.data.manifest.license).toBeDefined();
        expect(ConfigModel.schema.data.manifest.compliance).toBeDefined();

        const withoutAuth = ConfigModel.schema._meta.contextFilter.withoutAuth;
        const withAuth = ConfigModel.schema._meta.contextFilter.withAuth;

        expect(withoutAuth).toContain('data.manifest.license.key');
        expect(withAuth).toContain('data.manifest.license.key');
    });

    test('ensureManifestDefaults merges schema defaults and preserves existing values', async () => {
        const id = 'global';

        const currentDoc = {
            _id: id,
            data: {
                manifest: {
                    license: { tier: 'commercial' },
                    compliance: { adminEmailOptIn: true }
                }
            }
        };

        const updateOne = jest.fn(async () => ({ acknowledged: true, modifiedCount: 1 }));
        const findOne = jest.fn(async () => currentDoc);

        const fakeCollection = { findOne, updateOne };

        const getCollectionSpy = jest.spyOn(ConfigModel, 'getCollection').mockReturnValue(fakeCollection);

        // findById is called after updateOne to return the fresh document.
        // For this unit test we can return the "post-update" structure we expect.
        const findByIdSpy = jest.spyOn(ConfigModel, 'findById').mockImplementation(async () => {
            const setOp = updateOne.mock.calls[0][1].$set;
            return { _id: id, data: { manifest: setOp['data.manifest'] } };
        });

        const result = await ConfigModel.ensureManifestDefaults(id);

        expect(getCollectionSpy).toHaveBeenCalledTimes(1);
        expect(findOne).toHaveBeenCalledWith({ _id: id });
        expect(updateOne).toHaveBeenCalledTimes(1);
        expect(findByIdSpy).toHaveBeenCalledWith(id);

        // Existing values preserved
        expect(result.data.manifest.license.tier).toBe('commercial');
        expect(result.data.manifest.compliance.adminEmailOptIn).toBe(true);

        // Defaults filled
        expect(result.data.manifest.license.key).toBe('');
        expect(result.data.manifest.compliance.siteUuid).toBe('');
    });

    test('ensureManifestDefaults applies overrides', async () => {
        const id = 'global';

        const currentDoc = {
            _id: id,
            data: {
                manifest: {
                    license: { key: '', tier: 'bsl' },
                    compliance: { siteUuid: '', adminEmailOptIn: false }
                }
            }
        };

        const updateOne = jest.fn(async () => ({ acknowledged: true, modifiedCount: 1 }));
        const findOne = jest.fn(async () => currentDoc);
        const fakeCollection = { findOne, updateOne };

        jest.spyOn(ConfigModel, 'getCollection').mockReturnValue(fakeCollection);
        jest.spyOn(ConfigModel, 'findById').mockImplementation(async () => {
            const setOp = updateOne.mock.calls[0][1].$set;
            return { _id: id, data: { manifest: setOp['data.manifest'] } };
        });

        const overrides = {
            'compliance.siteUuid': '96543dee-f630-4399-a562-04a5bd211208'
        };

        const result = await ConfigModel.ensureManifestDefaults(id, overrides);

        expect(result.data.manifest.compliance.siteUuid).toBe('96543dee-f630-4399-a562-04a5bd211208');
        expect(result.data.manifest.compliance.adminEmailOptIn).toBe(false);
    });
});

// webapp/tests/unit/config/config-manifest.test.js
