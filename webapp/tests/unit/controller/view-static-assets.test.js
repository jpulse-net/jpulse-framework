/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / View Static Assets
 * @tagline         Unit tests for ViewController raw/static asset serving
 * @description     Ensures binary assets are served raw (no Handlebars), JSON is served raw, and SVG content-type is correct
 * @file            webapp/tests/unit/controller/view-static-assets.test.js
 * @version         1.6.9
 * @release         2026-02-06
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 2.2, GPT-5.2
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

jest.mock('../../../controller/log.js', () => ({
    logRequest: jest.fn(),
    logError: jest.fn(),
    logInfo: jest.fn()
}));

// Mock i18n + handlebars so we can assert they are NOT called for raw assets
beforeEach(() => {
    global.i18n = {
        translate: jest.fn().mockReturnValue(''),
        expandI18nHandlebars: jest.fn((req, content) => content)
    };
    global.HandlebarController = {
        expandHandlebars: jest.fn(async (req, content) => content)
    };
});

describe('ViewController raw/static assets', () => {
    let ViewController;
    let PathResolver;
    let fsModule;
    let originalAppConfig;

    beforeEach(async () => {
        originalAppConfig = global.appConfig;
        global.appConfig = {
            system: { appDir: '/tmp', siteDir: '/tmp' },
            controller: {
                view: {
                    defaultTemplate: 'index.shtml',
                    rawExtensions: {
                        binary: [ '.gif', '.ico', '.jpg', '.jpeg', '.png', '.webp' ],
                        text: [ '.json' ]
                    },
                    contentTypes: {
                        '.css': 'text/css',
                        '.gif': 'image/gif',
                        '.html': 'text/html',
                        '.ico': 'image/x-icon',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.js': 'application/javascript',
                        '.json': 'application/json; charset=utf-8',
                        '.png': 'image/png',
                        '.shtml': 'text/html',
                        '.svg': 'image/svg+xml; charset=utf-8',
                        '.tmpl': 'text/html',
                        '.webp': 'image/webp'
                    }
                }
            }
        };

        // ViewController imports fs via: import fs from 'fs'
        // So we must spy on the DEFAULT export object (not the ESM namespace named exports)
        fsModule = (await import('fs')).default;
        PathResolver = (await import('../../../utils/path-resolver.js')).default;
        ViewController = (await import('../../../controller/view.js')).default;

        ViewController.templateCache = { getFileSync: jest.fn() };
        ViewController.isSPA = jest.fn().mockReturnValue(false);
    });

    afterEach(() => {
        global.appConfig = originalAppConfig;
        jest.restoreAllMocks();
    });

    test('should serve .png as raw bytes and skip i18n/Handlebars expansion', async () => {
        const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        jest.spyOn(fsModule, 'readFileSync').mockReturnValue(buffer);
        jest.spyOn(PathResolver, 'resolveModuleWithPlugins').mockReturnValue('/tmp/dark.png');

        const req = {
            path: '/themes/dark.png',
            originalUrl: '/themes/dark.png',
            session: {},
            protocol: 'http',
            hostname: 'localhost',
            url: '/themes/dark.png',
            query: {},
            get: jest.fn().mockReturnValue('localhost:3000')
        };

        const res = {
            set: jest.fn(),
            send: jest.fn()
        };

        await ViewController.load(req, res);

        expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/png');
        expect(res.send).toHaveBeenCalledWith(buffer);
        expect(global.i18n.expandI18nHandlebars).not.toHaveBeenCalled();
        expect(global.HandlebarController.expandHandlebars).not.toHaveBeenCalled();
        expect(ViewController.templateCache.getFileSync).not.toHaveBeenCalled();
    });

    test('should serve .json as raw text and skip i18n/Handlebars expansion', async () => {
        jest.spyOn(fsModule, 'readFileSync').mockImplementation((p, enc) => {
            if (enc === 'utf8') {
                return '{"name":"dark"}';
            }
            return Buffer.from('{"name":"dark"}', 'utf8');
        });
        jest.spyOn(PathResolver, 'resolveModuleWithPlugins').mockReturnValue('/tmp/dark.json');

        const req = {
            path: '/themes/dark.json',
            originalUrl: '/themes/dark.json',
            session: {},
            protocol: 'http',
            hostname: 'localhost',
            url: '/themes/dark.json',
            query: {},
            get: jest.fn().mockReturnValue('localhost:3000')
        };

        const res = {
            set: jest.fn(),
            send: jest.fn()
        };

        await ViewController.load(req, res);

        expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
        expect(res.send).toHaveBeenCalledWith('{"name":"dark"}');
        expect(global.i18n.expandI18nHandlebars).not.toHaveBeenCalled();
        expect(global.HandlebarController.expandHandlebars).not.toHaveBeenCalled();
        expect(ViewController.templateCache.getFileSync).not.toHaveBeenCalled();
    });

    test('should set svg content-type when serving expanded content', async () => {
        // For svg: should go through templateCache + i18n + handlebars, but content-type must be svg
        jest.spyOn(PathResolver, 'resolveModuleWithPlugins').mockReturnValue('/tmp/diagram.svg');
        ViewController.templateCache.getFileSync.mockReturnValue('<svg></svg>');

        const req = {
            path: '/docs/images/diagram.svg',
            originalUrl: '/docs/images/diagram.svg',
            session: {},
            protocol: 'http',
            hostname: 'localhost',
            url: '/docs/images/diagram.svg',
            query: {},
            get: jest.fn().mockReturnValue('localhost:3000')
        };

        const res = {
            set: jest.fn(),
            send: jest.fn()
        };

        await ViewController.load(req, res);

        expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/svg+xml; charset=utf-8');
        expect(res.send).toHaveBeenCalledWith('<svg></svg>');
        expect(global.i18n.expandI18nHandlebars).toHaveBeenCalled();
        expect(global.HandlebarController.expandHandlebars).toHaveBeenCalled();
    });
});

// EOF webapp/tests/unit/controller/view-static-assets.test.js


