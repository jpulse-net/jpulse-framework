/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Config / Config General (W-147)
 * @tagline         Unit tests for ConfigModel data.general, effective cache, sort on read/write
 * @description     Tests for getEffectiveAdminRoles, getEffectiveRoles, setEffectiveGeneralCache,
 *                  ensureGeneralDefaults, findById sort-on-read, updateById sort-on-write
 * @file            webapp/tests/unit/config/config-general.test.js
 * @version         1.6.9
 * @release         2026-02-06
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.4, Claude Sonnet 4.5
 */

import { jest } from '@jest/globals';
import ConfigModel from '../../../model/config.js';

describe('ConfigModel W-147 general (roles, adminRoles)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        ConfigModel.clearEffectiveGeneralCache();
    });

    describe('schema', () => {
        test('getSchema().data.general has roles and adminRoles defaults', () => {
            const schema = ConfigModel.getSchema();
            expect(schema.data.general).toBeDefined();
            expect(Array.isArray(schema.data.general.roles?.default)).toBe(true);
            expect(Array.isArray(schema.data.general.adminRoles?.default)).toBe(true);
            expect(schema.data.general.roles.default).toContain('user');
            expect(schema.data.general.roles.default).toContain('admin');
            expect(schema.data.general.roles.default).toContain('root');
            expect(schema.data.general.adminRoles.default).toContain('admin');
            expect(schema.data.general.adminRoles.default).toContain('root');
        });
    });

    describe('effective cache (sort on read)', () => {
        test('setEffectiveGeneralCache stores sorted; getEffectiveAdminRoles and getEffectiveRoles return sorted', () => {
            ConfigModel.setEffectiveGeneralCache({
                roles: ['root', 'user', 'admin'],
                adminRoles: ['root', 'admin']
            });
            expect(ConfigModel.getEffectiveAdminRoles()).toEqual(['admin', 'root']);
            expect(ConfigModel.getEffectiveRoles()).toEqual(['admin', 'root', 'user']);
        });

        test('getEffectiveAdminRoles and getEffectiveRoles return sorted even when cache has unsorted data', () => {
            ConfigModel.clearEffectiveGeneralCache();
            ConfigModel._effectiveGeneralCache = {
                roles: ['z', 'a', 'm'],
                adminRoles: ['z', 'a']
            };
            expect(ConfigModel.getEffectiveAdminRoles()).toEqual(['a', 'z']);
            expect(ConfigModel.getEffectiveRoles()).toEqual(['a', 'm', 'z']);
        });

        test('clearEffectiveGeneralCache resets to default', () => {
            ConfigModel.setEffectiveGeneralCache({ roles: ['x'], adminRoles: ['x'] });
            ConfigModel.clearEffectiveGeneralCache();
            expect(ConfigModel.getEffectiveAdminRoles()).toEqual(['admin', 'root']);
            expect(ConfigModel.getEffectiveRoles()).toEqual(['admin', 'root', 'user']);
        });
    });

    describe('findById sort on read', () => {
        test('returns doc with data.general.roles and adminRoles sorted', async () => {
            const unsortedDoc = {
                _id: 'global',
                data: {
                    general: {
                        roles: ['root', 'admin', 'user'],
                        adminRoles: ['root', 'admin']
                    }
                }
            };
            const findOne = jest.fn(async () => unsortedDoc);
            jest.spyOn(ConfigModel, 'getCollection').mockReturnValue({ findOne });

            const doc = await ConfigModel.findById('global');

            expect(doc).not.toBeNull();
            expect(doc.data.general.roles).toEqual(['admin', 'root', 'user']);
            expect(doc.data.general.adminRoles).toEqual(['admin', 'root']);
        });

        test('returns null when doc not found', async () => {
            const findOne = jest.fn(async () => null);
            jest.spyOn(ConfigModel, 'getCollection').mockReturnValue({ findOne });

            const doc = await ConfigModel.findById('missing');

            expect(doc).toBeNull();
        });
    });

    describe('updateById sort on write', () => {
        test('persists data.general.roles and adminRoles sorted', async () => {
            const currentDoc = { _id: 'global', saveCount: 1, data: {} };
            const updateOne = jest.fn(async () => ({ matchedCount: 1 }));
            jest.spyOn(ConfigModel, 'findById').mockResolvedValue(currentDoc);
            jest.spyOn(ConfigModel, 'getCollection').mockReturnValue({ updateOne });

            await ConfigModel.updateById('global', {
                _id: 'global',
                data: {
                    general: {
                        roles: ['root', 'user', 'admin'],
                        adminRoles: ['root', 'admin']
                    }
                }
            });

            const setOp = updateOne.mock.calls[0][1].$set;
            expect(setOp['data.general.roles']).toEqual(['admin', 'root', 'user']);
            expect(setOp['data.general.adminRoles']).toEqual(['admin', 'root']);
        });
    });

    describe('ensureGeneralDefaults', () => {
        test('merges existing general and writes sorted roles and adminRoles', async () => {
            const id = 'global';
            const currentDoc = {
                _id: id,
                data: {
                    general: {
                        roles: ['manager', 'root', 'admin', 'user'],
                        adminRoles: ['root', 'admin']
                    }
                }
            };
            const updateOne = jest.fn(async () => ({ matchedCount: 1 }));
            const findOne = jest.fn(async () => currentDoc);
            jest.spyOn(ConfigModel, 'getCollection').mockReturnValue({ findOne, updateOne });
            jest.spyOn(ConfigModel, 'findById').mockImplementation(async () => {
                const setOp = updateOne.mock.calls[0]?.[1]?.$set;
                const general = setOp ? setOp['data.general'] : currentDoc.data.general;
                return { _id: id, data: { general } };
            });

            const result = await ConfigModel.ensureGeneralDefaults(id);

            expect(updateOne).toHaveBeenCalledTimes(1);
            const setOp = updateOne.mock.calls[0][1].$set;
            expect(setOp['data.general'].roles).toEqual(['admin', 'manager', 'root', 'user']);
            expect(setOp['data.general'].adminRoles).toEqual(['admin', 'root']);
            expect(result.data.general.roles).toEqual(['admin', 'manager', 'root', 'user']);
            expect(result.data.general.adminRoles).toEqual(['admin', 'root']);
        });

        test('fills missing general with schema defaults and sorts', async () => {
            const id = 'global';
            const currentDoc = { _id: id, data: {} };
            const updateOne = jest.fn(async () => ({ matchedCount: 1 }));
            const findOne = jest.fn(async () => currentDoc);
            jest.spyOn(ConfigModel, 'getCollection').mockReturnValue({ findOne, updateOne });
            jest.spyOn(ConfigModel, 'findById').mockImplementation(async () => {
                const setOp = updateOne.mock.calls[0][1].$set;
                return { _id: id, data: { general: setOp['data.general'] } };
            });

            await ConfigModel.ensureGeneralDefaults(id);

            const setOp = updateOne.mock.calls[0][1].$set;
            expect(setOp['data.general'].roles).toEqual(['admin', 'root', 'user']);
            expect(setOp['data.general'].adminRoles).toEqual(['admin', 'root']);
        });
    });
});

// EOF webapp/tests/unit/config/config-general.test.js
