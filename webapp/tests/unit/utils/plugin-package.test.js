/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Plugin Package
 * @tagline         Unit tests for plugin package shape, bundle members, and dependency planning
 * @description     Covers single vs bundle vs both-shapes, validatePluginJson bundle/deps,
 *                  companion primary lookup, and dependency install planning
 * @file            webapp/tests/unit/utils/plugin-package.test.js
 * @version         2.0.6
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
    validatePluginJson,
    detectPluginPackageShape,
    findBundlePrimaryForCompanion,
    planPluginDependencyInstalls,
    normalizePluginDependency,
    formatMissingPluginDependency,
    stageBundleForPack,
    unstageBundleAfterPack
} from '../../../utils/plugin-package.js';

function writeJson(filePath, obj) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 4) + '\n');
}

describe('plugin-package', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jpulse-plugin-package-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    describe('validatePluginJson', () => {
        test('rejects bundle.members self-reference', () => {
            const result = validatePluginJson({
                name: 'demo-primary',
                version: '1.0.0',
                bundle: { members: ['demo-primary'] }
            });
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('must not include the primary'))).toBe(true);
        });

        test('rejects a dependency object missing version', () => {
            const result = validatePluginJson({
                name: 'demo',
                version: '1.0.0',
                dependencies: {
                    plugins: {
                        'ai-core': { npmPackage: '@jpulse-net/plugin-ai-core' }
                    }
                }
            });
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('missing required field: version'))).toBe(true);
        });

        test('accepts string and object dependency forms', () => {
            const result = validatePluginJson({
                name: 'demo',
                version: '1.0.0',
                summary: 'Demo',
                author: 'Test',
                jpulseVersion: '>=2.0.0',
                dependencies: {
                    plugins: {
                        'other-plugin': '>=1.0.0',
                        'ai-core': { version: '>=1.0.0', npmPackage: '@jpulse-net/plugin-ai-core' }
                    }
                }
            });
            expect(result.valid).toBe(true);
        });
    });

    describe('detectPluginPackageShape', () => {
        test('detects a single plugin', () => {
            writeJson(path.join(tmpDir, 'plugin.json'), { name: 'auth-oauth', version: '1.0.0' });
            const shape = detectPluginPackageShape(tmpDir);
            expect(shape.type).toBe('single');
            expect(shape.members).toHaveLength(1);
            expect(shape.members[0].name).toBe('auth-oauth');
        });

        test('detects a bundle with two members', () => {
            writeJson(path.join(tmpDir, 'plugins', 'demo-primary', 'plugin.json'), {
                name: 'demo-primary',
                version: '1.0.0'
            });
            writeJson(path.join(tmpDir, 'plugins', 'demo-secondary', 'plugin.json'), {
                name: 'demo-secondary',
                version: '1.0.0'
            });
            const shape = detectPluginPackageShape(tmpDir);
            expect(shape.type).toBe('bundle');
            expect(shape.members.map(m => m.name).sort()).toEqual(['demo-primary', 'demo-secondary']);
        });

        test('rejects both a root plugin.json and plugins/*/plugin.json', () => {
            writeJson(path.join(tmpDir, 'plugin.json'), { name: 'oops', version: '1.0.0' });
            writeJson(path.join(tmpDir, 'plugins', 'demo-primary', 'plugin.json'), {
                name: 'demo-primary',
                version: '1.0.0'
            });
            const shape = detectPluginPackageShape(tmpDir);
            expect(shape.type).toBe('invalid');
            expect(shape.error).toMatch(/both a root plugin\.json/);
        });
    });

    describe('findBundlePrimaryForCompanion', () => {
        test('finds the sibling primary that lists this companion', () => {
            writeJson(path.join(tmpDir, 'demo-primary', 'plugin.json'), {
                name: 'demo-primary',
                version: '1.0.0',
                bundle: { members: ['demo-secondary'] }
            });
            writeJson(path.join(tmpDir, 'demo-secondary', 'plugin.json'), {
                name: 'demo-secondary',
                version: '1.0.0'
            });
            expect(findBundlePrimaryForCompanion(tmpDir, 'demo-secondary')).toBe('demo-primary');
            expect(findBundlePrimaryForCompanion(tmpDir, 'demo-primary')).toBeNull();
        });
    });

    describe('planPluginDependencyInstalls', () => {
        test('plans a fetch when npmPackage is set and the plugin is missing', () => {
            const plan = planPluginDependencyInstalls([{
                name: 'provider',
                dependencies: {
                    plugins: {
                        'ai-core': { version: '>=1.0.0', npmPackage: '@jpulse-net/plugin-ai-core' }
                    }
                }
            }], {
                isInstalled: () => false,
                inFlightPackages: new Set()
            });
            expect(plan.fetches).toEqual([
                { depName: 'ai-core', npmPackage: '@jpulse-net/plugin-ai-core' }
            ]);
            expect(plan.errors).toEqual([]);
        });

        test('does not guess @jpulse-net/plugin-<name> when npmPackage is absent', () => {
            const plan = planPluginDependencyInstalls([{
                name: 'provider',
                dependencies: {
                    plugins: {
                        'ai-core': '>=1.0.0'
                    }
                }
            }], {
                isInstalled: () => false,
                inFlightPackages: new Set()
            });
            expect(plan.fetches).toEqual([]);
            expect(plan.errors).toEqual(['ai-core']);
        });

        test('reports a circular npmPackage already in flight', () => {
            const plan = planPluginDependencyInstalls([{
                name: 'a',
                dependencies: {
                    plugins: {
                        b: { version: '>=1.0.0', npmPackage: '@scope/pkg-b' }
                    }
                }
            }], {
                isInstalled: () => false,
                inFlightPackages: new Set(['@scope/pkg-b'])
            });
            expect(plan.circular).toEqual(['@scope/pkg-b']);
            expect(plan.fetches).toEqual([]);
        });
    });

    describe('stageBundleForPack / unstageBundleAfterPack', () => {
        function writeBundleSource(pluginsDir) {
            const primaryDir = path.join(pluginsDir, 'demo-primary');
            const companionDir = path.join(pluginsDir, 'demo-secondary');
            writeJson(path.join(primaryDir, 'plugin.json'), {
                name: 'demo-primary',
                version: '1.2.0',
                bundle: { members: ['demo-secondary'] }
            });
            writeJson(path.join(primaryDir, 'package.json'), {
                name: '@jpulse-net/plugin-demo-primary',
                version: '1.2.0',
                files: ['plugins']
            });
            fs.mkdirSync(path.join(primaryDir, 'webapp'), { recursive: true });
            fs.writeFileSync(path.join(primaryDir, 'webapp', 'marker.txt'), 'primary');
            writeJson(path.join(companionDir, 'plugin.json'), {
                name: 'demo-secondary',
                version: '1.0.0'
            });
            writeJson(path.join(companionDir, 'package.json'), {
                name: 'plugin-demo-secondary-guard',
                private: true
            });
            fs.mkdirSync(path.join(companionDir, 'webapp'), { recursive: true });
            fs.writeFileSync(path.join(companionDir, 'webapp', 'marker.txt'), 'companion');
            return { primaryDir, companionDir };
        }

        test('stages both members without recursing into the staging directory', () => {
            const pluginsDir = path.join(tmpDir, 'plugins');
            const { primaryDir } = writeBundleSource(pluginsDir);

            const result = stageBundleForPack(primaryDir, pluginsDir);

            expect(result.members.sort()).toEqual(['demo-primary', 'demo-secondary']);
            const stagingDir = path.join(primaryDir, 'plugins');
            expect(fs.readFileSync(path.join(stagingDir, 'demo-primary', 'webapp', 'marker.txt'), 'utf8'))
                .toBe('primary');
            expect(fs.readFileSync(path.join(stagingDir, 'demo-secondary', 'webapp', 'marker.txt'), 'utf8'))
                .toBe('companion');
            expect(fs.existsSync(path.join(stagingDir, 'demo-primary', 'plugins'))).toBe(false);
            expect(fs.existsSync(path.join(primaryDir, 'plugin.json'))).toBe(true);
        });

        test('strips the companion guard package.json and syncs its version', () => {
            const pluginsDir = path.join(tmpDir, 'plugins');
            const { primaryDir, companionDir } = writeBundleSource(pluginsDir);

            stageBundleForPack(primaryDir, pluginsDir);

            const stagingDir = path.join(primaryDir, 'plugins');
            expect(fs.existsSync(path.join(stagingDir, 'demo-secondary', 'package.json'))).toBe(false);
            expect(fs.existsSync(path.join(stagingDir, 'demo-primary', 'package.json'))).toBe(true);
            const stagedCompanion = JSON.parse(fs.readFileSync(
                path.join(stagingDir, 'demo-secondary', 'plugin.json'), 'utf8'
            ));
            expect(stagedCompanion.version).toBe('1.2.0');
            const sourceCompanion = JSON.parse(fs.readFileSync(
                path.join(companionDir, 'plugin.json'), 'utf8'
            ));
            expect(sourceCompanion.version).toBe('1.0.0');
        });

        test('re-staging replaces a stale staging directory', () => {
            const pluginsDir = path.join(tmpDir, 'plugins');
            const { primaryDir } = writeBundleSource(pluginsDir);
            const stagingDir = path.join(primaryDir, 'plugins');
            fs.mkdirSync(path.join(stagingDir, 'demo-primary'), { recursive: true });
            fs.writeFileSync(path.join(stagingDir, 'demo-primary', 'stale.txt'), 'stale');

            stageBundleForPack(primaryDir, pluginsDir);

            expect(fs.existsSync(path.join(stagingDir, 'demo-primary', 'stale.txt'))).toBe(false);
            expect(fs.existsSync(path.join(stagingDir, 'demo-secondary', 'plugin.json'))).toBe(true);
        });

        test('is a no-op for a single plugin and for an assembled tree', () => {
            const pluginsDir = path.join(tmpDir, 'plugins');
            const singleDir = path.join(pluginsDir, 'auth-oauth');
            writeJson(path.join(singleDir, 'plugin.json'), { name: 'auth-oauth', version: '1.0.0' });
            expect(stageBundleForPack(singleDir, pluginsDir)).toBeNull();
            expect(fs.existsSync(path.join(singleDir, 'plugins'))).toBe(false);

            const assembledDir = path.join(tmpDir, 'assembled');
            writeJson(path.join(assembledDir, 'package.json'), { name: '@scope/pkg', version: '1.0.0' });
            writeJson(path.join(assembledDir, 'plugins', 'demo-primary', 'plugin.json'), {
                name: 'demo-primary',
                version: '1.0.0'
            });
            expect(stageBundleForPack(assembledDir, pluginsDir)).toBeNull();
        });

        test('a missing member directory is an error', () => {
            const pluginsDir = path.join(tmpDir, 'plugins');
            const primaryDir = path.join(pluginsDir, 'demo-primary');
            writeJson(path.join(primaryDir, 'plugin.json'), {
                name: 'demo-primary',
                version: '1.0.0',
                bundle: { members: ['gone'] }
            });
            expect(() => stageBundleForPack(primaryDir, pluginsDir)).toThrow(/gone/);
        });

        test('unstage removes staging but leaves an unrelated plugins directory', () => {
            const pluginsDir = path.join(tmpDir, 'plugins');
            const { primaryDir } = writeBundleSource(pluginsDir);
            stageBundleForPack(primaryDir, pluginsDir);

            expect(unstageBundleAfterPack(primaryDir)).toBe(true);
            expect(fs.existsSync(path.join(primaryDir, 'plugins'))).toBe(false);
            expect(unstageBundleAfterPack(primaryDir)).toBe(false);

            fs.mkdirSync(path.join(primaryDir, 'plugins', 'something-else'), { recursive: true });
            expect(unstageBundleAfterPack(primaryDir)).toBe(false);
            expect(fs.existsSync(path.join(primaryDir, 'plugins', 'something-else'))).toBe(true);
        });
    });

    describe('normalizePluginDependency / formatMissingPluginDependency', () => {
        test('string form has no npmPackage', () => {
            expect(normalizePluginDependency('>=1.0.0')).toEqual({
                version: '>=1.0.0',
                npmPackage: null
            });
        });

        test('enable message includes the package name when known', () => {
            expect(formatMissingPluginDependency('ai-core', '@jpulse-net/plugin-ai-core'))
                .toBe('Missing required dependency: ai-core (install @jpulse-net/plugin-ai-core)');
            expect(formatMissingPluginDependency('ai-core', null))
                .toBe('Missing required dependency: ai-core');
        });
    });
});

// EOF webapp/tests/unit/utils/plugin-package.test.js
