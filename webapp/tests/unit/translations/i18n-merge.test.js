/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Translations / I18N Merge
 * @tagline         Deep-merge of framework, plugin, and site translation files
 * @description     Isolated temp translation trees; does not edit the live webapp/translations
 * @file            webapp/tests/unit/translations/i18n-merge.test.js
 * @version         2.0.5
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initialize, resetForTests } from '../../../utils/i18n.js';

function writeConf(filePath, lang, tree) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `{\n    ${lang}: ${JSON.stringify(tree, null, 4).replace(/\n/g, '\n    ')}\n}\n`);
}

describe('i18n plugin and site merge', () => {
    let tmpDir;
    let originalAppConfig;
    let originalLog;
    let originalPluginManager;

    beforeEach(() => {
        originalAppConfig = global.appConfig;
        originalLog = global.LogController;
        originalPluginManager = global.PluginManager;
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jpulse-i18n-merge-'));
        process.env.NODE_ENV = 'test';
        global.isTestEnvironment = true;
        global.LogController = {
            logInfo: jest.fn(),
            logWarning: jest.fn(),
            logError: jest.fn()
        };
        resetForTests();
    });

    afterEach(() => {
        resetForTests();
        global.appConfig = originalAppConfig;
        global.LogController = originalLog;
        global.PluginManager = originalPluginManager;
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    function setupFramework(extra = {}) {
        const appDir = path.join(tmpDir, 'webapp');
        const siteDir = path.join(tmpDir, 'site', 'webapp');
        fs.mkdirSync(path.join(appDir, 'translations'), { recursive: true });
        writeConf(path.join(appDir, 'translations', 'en.conf'), 'en', {
            lang: 'English',
            view: { ui: { save: 'Save', close: 'Close' } }
        });
        writeConf(path.join(appDir, 'translations', 'de.conf'), 'de', {
            lang: 'Deutsch',
            view: { ui: { save: 'Speichern', close: 'Schliessen' } }
        });
        global.appConfig = {
            system: { appDir, siteDir, projectRoot: tmpDir },
            utils: { i18n: { default: 'en', cache: { enabled: false } } }
        };
        return { appDir, siteDir, ...extra };
    }

    test('framework-only still loads', async () => {
        setupFramework();
        global.PluginManager = { initialized: false, getActivePlugins: () => [] };
        const i18n = await initialize();
        expect(i18n.langs.en.view.ui.save).toBe('Save');
        expect(i18n.langs.de.view.ui.save).toBe('Speichern');
    });

    test('a plugin en.conf adds a key without wiping framework siblings', async () => {
        const { appDir } = setupFramework();
        const pluginPath = path.join(tmpDir, 'plugins', 'demo-primary');
        writeConf(path.join(pluginPath, 'webapp', 'translations', 'en.conf'), 'en', {
            view: { ui: { pluginHello: 'Hello from plugin' } }
        });
        global.PluginManager = {
            initialized: true,
            getActivePlugins: () => [{ name: 'demo-primary', path: pluginPath }]
        };
        const i18n = await initialize();
        expect(i18n.langs.en.view.ui.pluginHello).toBe('Hello from plugin');
        expect(i18n.langs.en.view.ui.save).toBe('Save');
        void appDir;
    });

    test('site en.conf overrides a plugin key and leaves sibling framework keys', async () => {
        const { siteDir } = setupFramework();
        const pluginPath = path.join(tmpDir, 'plugins', 'demo-primary');
        writeConf(path.join(pluginPath, 'webapp', 'translations', 'en.conf'), 'en', {
            view: { ui: { pluginHello: 'Hello from plugin' } }
        });
        writeConf(path.join(siteDir, 'translations', 'en.conf'), 'en', {
            view: { ui: { pluginHello: 'Hello from site' } }
        });
        global.PluginManager = {
            initialized: true,
            getActivePlugins: () => [{ name: 'demo-primary', path: pluginPath }]
        };
        const i18n = await initialize();
        expect(i18n.langs.en.view.ui.pluginHello).toBe('Hello from site');
        expect(i18n.langs.en.view.ui.save).toBe('Save');
    });

    test('a plugin without translations/ does not fail', async () => {
        setupFramework();
        const pluginPath = path.join(tmpDir, 'plugins', 'no-i18n');
        fs.mkdirSync(pluginPath, { recursive: true });
        global.PluginManager = {
            initialized: true,
            getActivePlugins: () => [{ name: 'no-i18n', path: pluginPath }]
        };
        const i18n = await initialize();
        expect(i18n.langs.en.view.ui.save).toBe('Save');
    });

    test('a plugin shipping only en.conf backfills into de', async () => {
        setupFramework();
        const pluginPath = path.join(tmpDir, 'plugins', 'demo-primary');
        writeConf(path.join(pluginPath, 'webapp', 'translations', 'en.conf'), 'en', {
            view: { ui: { pluginHello: 'Hello from plugin' } }
        });
        global.PluginManager = {
            initialized: true,
            getActivePlugins: () => [{ name: 'demo-primary', path: pluginPath }]
        };
        const i18n = await initialize();
        expect(i18n.langs.de.view.ui.pluginHello).toBe('Hello from plugin');
        expect(i18n.langs.de.view.ui.save).toBe('Speichern');
    });
});

// EOF webapp/tests/unit/translations/i18n-merge.test.js
