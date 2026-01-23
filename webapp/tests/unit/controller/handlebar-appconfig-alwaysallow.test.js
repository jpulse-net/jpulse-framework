/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar appConfig alwaysAllow
 * @tagline         Unit tests for W-129: appConfig.system allowlist exposure (unauthenticated)
 * @description     Tests for contextFilter.alwaysAllow to re-expose specific appConfig.system keys after filtering
 * @file            webapp/tests/unit/controller/handlebar-appconfig-alwaysallow.test.js
 * @version         1.4.17
 * @release         2026-01-23
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, GPT-5.2
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('W-129: Handlebars Context Filter - appConfig.system alwaysAllow', () => {
    let HandlebarController;
    let originalContextFilter;
    let originalThemeDefault;
    let originalSystemServerId;

    beforeEach(() => {
        HandlebarController = global.HandlebarController;

        if (!global.appConfig) {
            global.appConfig = {};
        }
        if (!global.appConfig.controller) {
            global.appConfig.controller = {};
        }
        if (!global.appConfig.controller.handlebar) {
            global.appConfig.controller.handlebar = {};
        }

        originalContextFilter = global.appConfig.controller.handlebar.contextFilter;
        originalThemeDefault = global.appConfig?.utils?.theme?.default;
        originalSystemServerId = global.appConfig?.system?.serverId;

        if (!global.appConfig.utils) {
            global.appConfig.utils = {};
        }
        if (!global.appConfig.utils.theme) {
            global.appConfig.utils.theme = {};
        }
        if (!global.appConfig.system) {
            global.appConfig.system = {};
        }

        global.appConfig.utils.theme.default = 'light';
        global.appConfig.system.serverId = 123;

        global.appConfig.controller.handlebar.contextFilter = {
            withoutAuth: ['system'],
            withAuth: [],
            alwaysAllow: ['system.defaultTheme', 'system.htmlAttrs']
        };
    });

    afterEach(() => {
        global.appConfig.controller.handlebar.contextFilter = originalContextFilter;

        if (originalThemeDefault === undefined) {
            delete global.appConfig.utils.theme.default;
        } else {
            global.appConfig.utils.theme.default = originalThemeDefault;
        }

        if (originalSystemServerId === undefined) {
            delete global.appConfig.system.serverId;
        } else {
            global.appConfig.system.serverId = originalSystemServerId;
        }
    });

    test('should re-expose appConfig.system.defaultTheme and appConfig.system.htmlAttrs for unauthenticated users', async () => {
        const mockReq = {
            session: { user: null },
            url: '/test',
            path: '/test',
            query: {},
            protocol: 'http',
            hostname: 'localhost',
            get: (header) => (header === 'host' ? 'localhost:3000' : ''),
            componentRegistry: new Map(),
            componentCallStack: []
        };

        const template = '{{appConfig.system.defaultTheme}}|{{appConfig.system.htmlAttrs}}';
        const result = await HandlebarController.expandHandlebars(mockReq, template, {});

        const parts = result.split('|');
        expect(parts[0]).toBe('light');
        expect(parts[1]).toContain('lang="');
        expect(parts[1]).toContain('data-theme="');
        expect(parts[1]).toContain('data-theme="light"');
    });

    test('should not re-expose other appConfig.system keys for unauthenticated users', async () => {
        const mockReq = {
            session: { user: null },
            url: '/test',
            path: '/test',
            query: {},
            protocol: 'http',
            hostname: 'localhost',
            get: (header) => (header === 'host' ? 'localhost:3000' : ''),
            componentRegistry: new Map(),
            componentCallStack: []
        };

        const template = '{{appConfig.system.serverId}}';
        const result = await HandlebarController.expandHandlebars(mockReq, template, {});

        expect(result.trim()).toBe('');
    });
});

// EOF webapp/tests/unit/controller/handlebar-appconfig-alwaysallow.test.js
