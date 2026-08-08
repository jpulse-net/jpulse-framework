/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Login Page Render
 * @tagline         W-195: End-to-end render of the real login.shtml for localAuthRestriction
 * @description     Renders the actual webapp/view/auth/login.shtml file (not a synthetic
 *                   snippet) through the real _buildInternalContext() + expandHandlebars()
 *                   pipeline, for an unauthenticated request - exactly how it is served in
 *                   production. Regression coverage for a chain of three bugs found during
 *                   manual QA: (1) {{let key=some.property.path}} without parens doesn't
 *                   resolve the property path, (2) {{#if}}/{{#unless}} treat empty arrays as
 *                   truthy, (3) appConfig.controller.* is stripped from the context for
 *                   unauthenticated requests, which login.shtml always is.
 * @file            webapp/tests/unit/controller/login-page-render.test.js
 * @version         1.7.9
 * @release         2026-08-07
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.12, Claude Sonnet 5
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('W-195: login.shtml end-to-end render (real file + real context)', () => {
    let HandlebarController;
    let template;
    let savedRestriction;

    function makeReq(queryParams = {}) {
        return {
            session: { user: null },
            user: null,
            url: '/auth/login.shtml',
            path: '/auth/login.shtml',
            query: queryParams,
            protocol: 'http',
            hostname: 'localhost',
            get: (header) => (header === 'host' ? 'localhost:3000' : ''),
            headers: {}
        };
    }

    async function render(req) {
        const context = await HandlebarController._buildInternalContext(req);
        return HandlebarController.expandHandlebars(req, template, context);
    }

    function hasRestrictedNotice(html) {
        return /<div class="local-restricted-notice">[\s\S]*?<\/div>/.test(html);
    }

    function hasLoginButton(html) {
        return html.includes('id="loginButton">');
    }

    function hasRecoveryBanner(html) {
        return /<div class="local-recovery-banner">[\s\S]*?<\/div>/.test(html);
    }

    function hasProviderButtonsBlock(html) {
        return /<div class="local-auth-methods" id="authMethods">[\s\S]*?<\/div>/.test(html);
    }

    beforeEach(() => {
        HandlebarController = global.HandlebarController;
        const filePath = path.join(process.cwd(), 'webapp/view/auth/login.shtml');
        template = fs.readFileSync(filePath, 'utf8');
        savedRestriction = global.appConfig.controller.auth.localAuthRestriction;
        global.HookManager?.clear?.();
    });

    afterEach(() => {
        global.appConfig.controller.auth.localAuthRestriction = savedRestriction;
        global.HookManager?.clear?.();
    });

    test('localAuthRestriction=none: login form shows, no notice, no bogus divider', async () => {
        global.appConfig.controller.auth.localAuthRestriction = 'none';

        const html = await render(makeReq());

        expect(hasLoginButton(html)).toBe(true);
        expect(hasRestrictedNotice(html)).toBe(false);
        expect(hasRecoveryBanner(html)).toBe(false);
        expect(hasProviderButtonsBlock(html)).toBe(false); // no plugin registered -> no providers
    });

    test('localAuthRestriction=admins-only, no fallback param: form hidden, restricted notice shown', async () => {
        global.appConfig.controller.auth.localAuthRestriction = 'admins-only';

        const html = await render(makeReq());

        expect(hasLoginButton(html)).toBe(false);
        expect(hasRestrictedNotice(html)).toBe(true);
        expect(hasRecoveryBanner(html)).toBe(false);
    });

    test('localAuthRestriction=admins-only, ?localFallback=1: recovery form shown, no notice', async () => {
        global.appConfig.controller.auth.localAuthRestriction = 'admins-only';

        const html = await render(makeReq({ localFallback: '1' }));

        expect(hasLoginButton(html)).toBe(true);
        expect(hasRecoveryBanner(html)).toBe(true);
        expect(hasRestrictedNotice(html)).toBe(false);
    });

    test('localAuthRestriction=disabled, no fallback param: form hidden, restricted notice shown', async () => {
        global.appConfig.controller.auth.localAuthRestriction = 'disabled';

        const html = await render(makeReq());

        expect(hasLoginButton(html)).toBe(false);
        expect(hasRestrictedNotice(html)).toBe(true);
    });

    test('localAuthRestriction=none with a registered auth provider: divider + buttons render, no notice', async () => {
        global.appConfig.controller.auth.localAuthRestriction = 'none';
        global.HookManager.register('onAuthGetLoginProviders', 'test-plugin', (ctx) => {
            ctx.providers.push({ id: 'oauth', label: 'Sign in with Acme', initUrl: '/init', icon: '🔑' });
            return ctx;
        });

        const html = await render(makeReq());

        expect(hasLoginButton(html)).toBe(true);
        expect(hasProviderButtonsBlock(html)).toBe(true);
        expect(html).toContain('Sign in with Acme');
        expect(hasRestrictedNotice(html)).toBe(false);
    });
});

// EOF webapp/tests/unit/controller/login-page-render.test.js
