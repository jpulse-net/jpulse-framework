/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Markdown Themes Dynamic
 * @tagline         Unit tests for W-129: themes dynamic markdown generators
 * @description     Tests for themes-default, themes-count, themes-list, and themes-list-table generators
 * @file            webapp/tests/unit/controller/markdown-themes-dynamic.test.js
 * @version         1.5.1
 * @release         2026-01-25
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, GPT-5.2
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import MarkdownController from '../../../controller/markdown.js';

// Mock LogController to keep tests quiet and avoid dependency on global.LogController
jest.mock('../../../controller/log.js', () => ({
    logInfo: jest.fn(),
    logError: jest.fn(),
    logRequest: jest.fn()
}));

describe('W-129: MarkdownController themes dynamic generators', () => {
    let originalAppConfig;
    let originalThemeManager;

    beforeEach(() => {
        originalAppConfig = global.appConfig;
        originalThemeManager = global.ThemeManager;

        global.appConfig = {
            system: {
                appDir: path.resolve(__dirname, '../../..'),
                siteDir: path.resolve(__dirname, '../../../site/webapp')
            },
            controller: {
                markdown: { cache: { enabled: false } }
            },
            utils: {
                theme: { default: 'light' }
            }
        };
    });

    afterEach(() => {
        global.appConfig = originalAppConfig;
        global.ThemeManager = originalThemeManager;
    });

    test('themes-default should return valid configured theme id', async () => {
        global.appConfig.utils.theme.default = 'dark';
        const generator = MarkdownController.DYNAMIC_CONTENT_REGISTRY['themes-default'].generator;
        const result = await generator({});
        expect(result).toBe('dark');
    });

    test('themes-default should fall back to light for invalid theme id', async () => {
        global.appConfig.utils.theme.default = '../../evil';
        const generator = MarkdownController.DYNAMIC_CONTENT_REGISTRY['themes-default'].generator;
        const result = await generator({});
        expect(result).toBe('light');
    });

    test('themes-list-table should return no-themes message when config is not ready', async () => {
        global.appConfig.system.appDir = null;
        global.appConfig.system.siteDir = null;
        global.ThemeManager = null;

        const md = await MarkdownController._generateThemesTable({});
        expect(md).toBe('_No themes match the criteria._');
    });

    test('themes-count should count all themes (and filtered by source)', async () => {
        global.ThemeManager = {
            themeCache: {}, // prevent initialize() attempt in _getThemes
            discoverThemes: () => ([
                { name: 'light', label: 'Light', description: 'Light theme', author: 'jPulse', source: 'framework' },
                { name: 'dark', label: 'Dark', description: 'Dark theme', author: 'jPulse', source: 'framework' },
                { name: 'ocean', label: 'Ocean', description: 'Ocean theme', author: 'Plugin', source: 'plugin', pluginName: 'ocean-theme' }
            ])
        };

        const countAll = await MarkdownController.DYNAMIC_CONTENT_REGISTRY['themes-count'].generator({});
        expect(countAll).toBe('3');

        const countFramework = await MarkdownController.DYNAMIC_CONTENT_REGISTRY['themes-count'].generator({ source: 'framework' });
        expect(countFramework).toBe('2');
    });

    test('themes-list-table should sort by source and render plugin source label', async () => {
        global.ThemeManager = {
            themeCache: {},
            discoverThemes: () => ([
                { name: 'site-theme', label: 'Site', description: 'Site theme', author: 'Site', source: 'site' },
                { name: 'b', label: 'B', description: 'B', author: 'jPulse', source: 'framework' },
                { name: 'a', label: 'A', description: 'A', author: 'jPulse', source: 'framework' },
                { name: 'plugin-theme', label: 'Plugin', description: 'Plugin theme', author: 'Plugin', source: 'plugin', pluginName: 'hello-world-theme' }
            ])
        };

        const md = await MarkdownController._generateThemesTable({});

        // Framework themes should appear before plugin and site, and framework should be sorted by name
        const idxA = md.indexOf('**`a`**');
        const idxB = md.indexOf('**`b`**');
        const idxPlugin = md.indexOf('**`plugin-theme`**');
        const idxSite = md.indexOf('**`site-theme`**');

        expect(idxA).toBeGreaterThan(-1);
        expect(idxB).toBeGreaterThan(-1);
        expect(idxPlugin).toBeGreaterThan(-1);
        expect(idxSite).toBeGreaterThan(-1);
        expect(idxA).toBeLessThan(idxB);
        expect(idxB).toBeLessThan(idxPlugin);
        expect(idxPlugin).toBeLessThan(idxSite);

        expect(md).toContain('**Source:** Plugin: `hello-world-theme`');
        expect(md).toContain('| Preview | Details |');
    });

    test('themes-list should render bullet list with plugin source annotation', async () => {
        global.ThemeManager = {
            themeCache: {},
            discoverThemes: () => ([
                { name: 'light', label: 'Light', description: 'Default', author: 'jPulse', source: 'framework' },
                { name: 'plugin-x', label: 'Plugin X', description: 'From plugin', author: 'Someone', source: 'plugin', pluginName: 'x-theme' }
            ])
        };

        const md = await MarkdownController._generateThemesList({});
        expect(md).toContain('- **`light`** (Light)');
        expect(md).toContain('_(framework)_');
        expect(md).toContain('- **`plugin-x`** (Plugin X)');
        expect(md).toContain('_(Plugin: x-theme)_');
    });
});

// EOF webapp/tests/unit/controller/markdown-themes-dynamic.test.js
