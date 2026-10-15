/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Shared Module
 * @tagline         Unit tests for SharedModule.load
 * @description     Resolution order, @export, plain-JS checks, sandbox, and include-cache behavior
 * @file            webapp/tests/unit/utils/shared-module.test.js
 * @version         2.0.14
 * @release         2026-10-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.21, Grok 4.7
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import LogController from '../../../controller/log.js';
import PathResolver from '../../../utils/path-resolver.js';
import cacheManager from '../../../utils/cache-manager.js';
import SharedModule from '../../../utils/shared-module.js';

function header(exportName) {
    return `{{!--\n * @name            shared/${exportName}\n * @export          ${exportName}\n--}}\n`;
}

function sharedDebugCalls() {
    return LogController.logDebug.mock.calls.filter((call) => call[1] === 'sharedModule.load');
}

function writeView(root, rel, source) {
    const full = path.join(root, 'view', rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, source);
    return full;
}

describe('SharedModule.load', () => {
    let root;
    let appDir;
    let siteDir;
    let pluginRoot;
    let savedConfig;
    let savedPluginRef;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'jp-shared-'));
        appDir = path.join(root, 'webapp');
        siteDir = path.join(root, 'site', 'webapp');
        pluginRoot = path.join(root, 'plugins', 'demo');
        fs.mkdirSync(appDir, { recursive: true });
        fs.mkdirSync(siteDir, { recursive: true });
        fs.mkdirSync(path.join(pluginRoot, 'webapp'), { recursive: true });

        savedConfig = global.appConfig;
        global.appConfig = {
            system: {
                appDir,
                siteDir
            },
            controller: {
                handlebar: {
                    cacheIncludes: { enabled: true, checkInterval: 0 }
                }
            }
        };

        savedPluginRef = PathResolver.pluginManagerRef;
        PathResolver.pluginManagerRef = {
            initialized: true,
            getActivePlugins() {
                return [{ name: 'demo', path: pluginRoot }];
            }
        };
        PathResolver.clearCache();

        jest.spyOn(LogController, 'logDebug').mockImplementation(() => {});
        jest.spyOn(LogController, 'logError').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        PathResolver.pluginManagerRef = savedPluginRef;
        PathResolver.clearCache();
        global.appConfig = savedConfig;
        fs.rmSync(root, { recursive: true, force: true });
    });

    test('site wins over plugin wins over framework', () => {
        const rel = 'map/order.tmpl';
        const body = (value) => `${header('sharedOrder')}const sharedOrder = ${JSON.stringify(value)};\n`;
        writeView(appDir, rel, body('framework'));
        writeView(path.join(pluginRoot, 'webapp'), rel, body('plugin'));
        const siteFile = writeView(siteDir, rel, body('site'));

        expect(SharedModule.load(rel)).toBe('site');

        fs.rmSync(siteFile);
        PathResolver.clearCache();
        expect(SharedModule.load(rel)).toBe('plugin');

        fs.rmSync(path.join(pluginRoot, 'webapp', 'view', rel));
        PathResolver.clearCache();
        expect(SharedModule.load(rel)).toBe('framework');
    });

    test('rejects parent segments, absolute paths, and a non-.tmpl path', () => {
        expect(() => SharedModule.load('../secret.tmpl')).toThrow(/Prohibited path/);
        expect(() => SharedModule.load('/etc/passwd.tmpl')).toThrow(/Prohibited path/);
        expect(() => SharedModule.load('map/search/query.js')).toThrow(/must end in \.tmpl/);
        expect(LogController.logError).toHaveBeenCalled();
    });

    test('returns a top-level const named by @export', () => {
        writeView(siteDir, 'map/search/query.tmpl',
            `${header('mapSearchQuery')}const mapSearchQuery = {\n    add(a, b) { return a + b; }\n};\n`);

        const mod = SharedModule.load('map/search/query.tmpl');
        expect(mod.add(2, 3)).toBe(5);
        expect(sharedDebugCalls()).toEqual([
            [null, 'sharedModule.load', 'compiled: map/search/query.tmpl']
        ]);
    });

    test('throws when the @export binding is missing', () => {
        writeView(siteDir, 'missing.tmpl',
            `${header('missingName')}const other = 1;\n`);

        expect(() => SharedModule.load('missing.tmpl')).toThrow(/export "missingName" is not defined/);
        expect(LogController.logError).toHaveBeenCalled();
        expect(sharedDebugCalls()).toEqual([]);
    });

    test('strips handlebars comments before running', () => {
        const source = [
            '{{!--',
            ' * @name            strip',
            ' * @export          sharedStrip',
            ' * {{not code}}',
            '--}}',
            'const sharedStrip = {{!-- gone --}}{ n: 1 };',
            '{{!-- {{would break}} --}}',
            ''
        ].join('\n');
        writeView(siteDir, 'strip.tmpl', source);

        expect(SharedModule.load('strip.tmpl')).toEqual({ n: 1 });
    });

    test('rejects handlebars in code', () => {
        writeView(siteDir, 'markup.tmpl',
            `${header('sharedMarkup')}const sharedMarkup = { raw: {{name}} };\n`);

        expect(() => SharedModule.load('markup.tmpl')).toThrow(/contains Handlebars/);
    });

    test('keeps handlebars braces inside a string, a template, and comments', () => {
        const source = [
            header('sharedPlain').trimEnd(),
            '// {{comment}}',
            '/* {{block}} */',
            'const sharedPlain = {',
            '    text: \'{{string}}\',',
            '    tpl: `{{template}}`',
            '};',
            ''
        ].join('\n');
        writeView(siteDir, 'plain.tmpl', source);

        expect(SharedModule.load('plain.tmpl')).toEqual({
            text: '{{string}}',
            tpl: '{{template}}'
        });
    });

    test('does not provide window, document, jPulse, require, process, or fs', () => {
        writeView(siteDir, 'probe.tmpl', [
            header('sharedProbe').trimEnd(),
            'const sharedProbe = {',
            '    window: typeof window,',
            '    document: typeof document,',
            '    jPulse: typeof jPulse,',
            '    require: typeof require,',
            '    process: typeof process,',
            '    fs: typeof fs,',
            '    console: typeof console',
            '};',
            ''
        ].join('\n'));

        expect(SharedModule.load('probe.tmpl')).toEqual({
            window: 'undefined',
            document: 'undefined',
            jPulse: 'undefined',
            require: 'undefined',
            process: 'undefined',
            fs: 'undefined',
            console: 'object'
        });
    });

    test('returns the cached export until the file cache refreshes', () => {
        const rel = 'cached.tmpl';
        const full = writeView(siteDir, rel,
            `${header('sharedCached')}const sharedCached = { value: 1 };\n`);

        const first = SharedModule.load(rel);
        const second = SharedModule.load(rel);
        expect(second).toBe(first);
        expect(sharedDebugCalls()).toHaveLength(1);

        fs.writeFileSync(full, `${header('sharedCached')}const sharedCached = { value: 2 };\n`);
        const later = new Date(Date.now() + 10000);
        fs.utimesSync(full, later, later);
        const stale = SharedModule.load(rel);
        expect(stale).toBe(first);
        expect(stale.value).toBe(1);

        cacheManager.refreshCache('SharedModuleCache', full);
        const fresh = SharedModule.load(rel);
        expect(fresh).not.toBe(first);
        expect(fresh.value).toBe(2);
        expect(sharedDebugCalls()).toHaveLength(2);
    });

    test('recompiles on every load when the include cache is disabled', () => {
        global.appConfig.controller.handlebar.cacheIncludes = { enabled: false, checkInterval: 0 };
        const rel = 'live.tmpl';
        const full = writeView(siteDir, rel,
            `${header('sharedLive')}const sharedLive = { value: 1 };\n`);

        const first = SharedModule.load(rel);
        expect(first.value).toBe(1);

        fs.writeFileSync(full, `${header('sharedLive')}const sharedLive = { value: 2 };\n`);
        const second = SharedModule.load(rel);
        expect(second).not.toBe(first);
        expect(second.value).toBe(2);
        expect(sharedDebugCalls()).toHaveLength(2);
    });
});

// EOF webapp/tests/unit/utils/shared-module.test.js
