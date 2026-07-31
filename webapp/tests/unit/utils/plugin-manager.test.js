/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / PluginManager
 * @tagline         Unit tests for PluginManager registry persistence & concurrency safety (W-199)
 * @description     Tests atomic writes, warn-instead-of-silent-reset on a corrupt registry, and
 *                   re-read-before-merge behavior in enablePlugin()/disablePlugin()/rescan() that
 *                   prevents one PM2 instance's stale in-memory registry from clobbering a peer
 *                   instance's more recent change
 * @file            webapp/tests/unit/utils/plugin-manager.test.js
 * @version         1.7.6
 * @release         2026-07-31
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           85%, Cursor 3.13, Claude Sonnet 5
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import PluginManager from '../../../utils/plugin-manager.js';

/**
 * Write a minimal, valid plugin.json for a test plugin
 * @param {string} pluginsDir - Path to the plugins/ directory
 * @param {string} name - Plugin name
 * @param {object} overrides - Fields to override in the generated plugin.json
 * @returns {string} Path to the created plugin directory
 */
function writePluginJson(pluginsDir, name, overrides = {}) {
    const pluginDir = path.join(pluginsDir, name);
    fs.mkdirSync(pluginDir, { recursive: true });
    const pluginJson = {
        name,
        version: '1.0.0',
        description: `Test plugin ${name}`,
        author: 'Test Author',
        autoEnable: false,
        ...overrides
    };
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify(pluginJson, null, 2));
    return pluginDir;
}

/**
 * Reset PluginManager's module-level static state between tests (it's a singleton class)
 */
function resetPluginManagerState() {
    PluginManager.registry = { plugins: [], loadOrder: [], lastScan: null };
    PluginManager.discovered = new Map();
    PluginManager.initialized = false;
}

describe('PluginManager (W-199 concurrency & persistence safety)', () => {
    let tmpRoot;
    let pluginsDir;
    let registryPath;
    let originalAppConfig;
    let originalLogController;

    beforeEach(() => {
        originalAppConfig = global.appConfig;
        originalLogController = global.LogController;

        tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jpulse-plugin-manager-test-'));
        pluginsDir = path.join(tmpRoot, 'plugins');
        fs.mkdirSync(pluginsDir, { recursive: true });
        registryPath = path.join(tmpRoot, '.jpulse', 'plugins.json');

        global.appConfig = {
            system: { projectRoot: tmpRoot },
            app: { jPulse: { version: '1.7.3' } }
        };

        global.LogController = {
            logInfo: jest.fn(),
            logWarning: jest.fn(),
            logError: jest.fn()
        };

        resetPluginManagerState();
    });

    afterEach(() => {
        try {
            fs.rmSync(tmpRoot, { recursive: true, force: true });
        } catch (error) {
            // ignore cleanup errors
        }
        global.appConfig = originalAppConfig;
        global.LogController = originalLogController;
        resetPluginManagerState();
    });

    describe('saveRegistry() atomic write', () => {
        test('writes plugins.json and leaves no leftover temp file', async () => {
            writePluginJson(pluginsDir, 'plugin-a');

            await PluginManager.initialize();

            expect(fs.existsSync(registryPath)).toBe(true);
            const saved = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            expect(saved.plugins.some(p => p.name === 'plugin-a')).toBe(true);

            const jpulseFiles = fs.readdirSync(path.join(tmpRoot, '.jpulse'));
            expect(jpulseFiles.some(f => f.includes('.tmp.'))).toBe(false);
        });
    });

    describe('initialize() corrupt registry handling', () => {
        test('logs a loud warning instead of silently resetting on corrupt plugins.json', async () => {
            writePluginJson(pluginsDir, 'plugin-a', { autoEnable: false });

            fs.mkdirSync(path.join(tmpRoot, '.jpulse'), { recursive: true });
            fs.writeFileSync(registryPath, '{ this is not valid JSON');

            await PluginManager.initialize();

            expect(global.LogController.logError).toHaveBeenCalledWith(
                null,
                'plugin-manager.initialize',
                expect.stringContaining('Failed to load plugin registry')
            );

            // Still recovers by re-discovering plugins with their default autoEnable value
            const saved = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            const entry = saved.plugins.find(p => p.name === 'plugin-a');
            expect(entry).toBeDefined();
            expect(entry.enabled).toBe(false);
        });
    });

    describe('enablePlugin()/disablePlugin() re-read-before-merge (cross-instance clobber fix)', () => {
        test('enablePlugin() preserves a peer instance\'s concurrent change to a different plugin', async () => {
            writePluginJson(pluginsDir, 'plugin-a', { autoEnable: false });
            writePluginJson(pluginsDir, 'plugin-b', { autoEnable: false });

            // This instance boots and discovers both plugins disabled
            await PluginManager.initialize();
            expect(PluginManager.registry.plugins.find(p => p.name === 'plugin-b').enabled).toBe(false);

            // Simulate a peer PM2 instance enabling plugin-b and persisting that change,
            // while THIS instance's in-memory registry still thinks plugin-b is disabled
            const onDisk = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            const peerEntry = onDisk.plugins.find(p => p.name === 'plugin-b');
            peerEntry.enabled = true;
            peerEntry.enabledAt = new Date().toISOString();
            fs.writeFileSync(registryPath, JSON.stringify(onDisk, null, 2));

            // This (stale) instance now enables plugin-a via its own admin action
            const result = await PluginManager.enablePlugin('plugin-a');
            expect(result.success).toBe(true);

            // Both plugin-a (this instance's change) and plugin-b (peer's change) must be
            // enabled in the final persisted file - the peer's change must NOT be clobbered
            // by this instance's previously-stale in-memory copy
            const final = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            expect(final.plugins.find(p => p.name === 'plugin-a').enabled).toBe(true);
            expect(final.plugins.find(p => p.name === 'plugin-b').enabled).toBe(true);
        });

        test('disablePlugin() preserves a peer instance\'s concurrent change to a different plugin', async () => {
            writePluginJson(pluginsDir, 'plugin-a', { autoEnable: true });
            writePluginJson(pluginsDir, 'plugin-b', { autoEnable: true });

            await PluginManager.initialize();

            // Peer instance disables plugin-b and persists it
            const onDisk = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            const peerEntry = onDisk.plugins.find(p => p.name === 'plugin-b');
            peerEntry.enabled = false;
            peerEntry.status = 'disabled';
            fs.writeFileSync(registryPath, JSON.stringify(onDisk, null, 2));

            // This (stale) instance disables plugin-a via its own admin action
            const result = await PluginManager.disablePlugin('plugin-a');
            expect(result.success).toBe(true);

            const final = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            expect(final.plugins.find(p => p.name === 'plugin-a').enabled).toBe(false);
            expect(final.plugins.find(p => p.name === 'plugin-b').enabled).toBe(false);
        });
    });

    describe('_reloadRegistryFromDisk() resiliency', () => {
        test('keeps current in-memory registry and logs a warning if the on-disk file is corrupt', async () => {
            writePluginJson(pluginsDir, 'plugin-a', { autoEnable: false });
            await PluginManager.initialize();

            fs.writeFileSync(registryPath, '{ not valid json');

            const before = JSON.stringify(PluginManager.registry);
            PluginManager._reloadRegistryFromDisk();

            expect(global.LogController.logError).toHaveBeenCalledWith(
                null,
                'plugin-manager._reloadRegistryFromDisk',
                expect.stringContaining('Failed to re-read plugin registry')
            );
            expect(JSON.stringify(PluginManager.registry)).toBe(before);
        });

        test('is a no-op when the registry file does not exist yet', () => {
            writePluginJson(pluginsDir, 'plugin-a', { autoEnable: false });
            const before = JSON.stringify(PluginManager.registry);

            expect(() => PluginManager._reloadRegistryFromDisk()).not.toThrow();
            expect(JSON.stringify(PluginManager.registry)).toBe(before);
        });
    });
});

// EOF webapp/tests/unit/utils/plugin-manager.test.js
