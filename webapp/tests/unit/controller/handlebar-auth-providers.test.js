/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar Auth Providers
 * @tagline         W-195: authProviders context injection for /auth/login.shtml
 * @description     Tests that _buildInternalContext() populates `authProviders` (sorted by
 *                   `order`) from the onAuthGetLoginProviders hook only on the login page, and
 *                   leaves it empty elsewhere so sites without an external-auth plugin pay
 *                   zero cost
 * @file            webapp/tests/unit/controller/handlebar-auth-providers.test.js
 * @version         1.7.4
 * @release         2026-07-30
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.12, Claude Sonnet 5
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('W-195: authProviders context injection', () => {
    let HandlebarController;

    function makeReq(path) {
        return {
            session: { user: null },
            user: null,
            url: path,
            path,
            query: {},
            protocol: 'http',
            hostname: 'localhost',
            get: (header) => (header === 'host' ? 'localhost:3000' : '')
        };
    }

    beforeEach(() => {
        HandlebarController = global.HandlebarController;
        global.HookManager?.clear?.();
    });

    afterEach(() => {
        global.HookManager?.clear?.();
    });

    test('should be empty on non-login pages even if a provider hook is registered', async () => {
        global.HookManager.register('onAuthGetLoginProviders', 'test-plugin', (context) => {
            context.providers.push({ id: 'oauth', label: 'Sign in with Acme', initUrl: '/init' });
            return context;
        });

        const template = '{{#each authProviders}}{{this.label}}{{/each}}';
        const result = await HandlebarController.expandHandlebars(makeReq('/dashboard.shtml'), template, {});

        expect(result.trim()).toBe('');
    });

    test('should be empty on the login page when no plugin registers the hook', async () => {
        const template = '{{#each authProviders}}{{this.label}}{{/each}}';
        const result = await HandlebarController.expandHandlebars(makeReq('/auth/login.shtml'), template, {});

        expect(result.trim()).toBe('');
    });

    test('should render providers on the login page, sorted by order', async () => {
        global.HookManager.register('onAuthGetLoginProviders', 'ldap-plugin', (context) => {
            context.providers.push({ id: 'ldap', label: 'LDAP', initUrl: '/ldap/init', order: 100 });
            return context;
        });
        global.HookManager.register('onAuthGetLoginProviders', 'oauth-plugin', (context) => {
            context.providers.push({ id: 'oauth', label: 'Acme SSO', initUrl: '/oauth/init', order: 50 });
            return context;
        });

        const template = '{{#each authProviders}}[{{this.label}}]{{/each}}';
        const result = await HandlebarController.expandHandlebars(makeReq('/auth/login.shtml'), template, {});

        // order: 50 (Acme SSO) before order: 100 (LDAP)
        expect(result.trim()).toBe('[Acme SSO][LDAP]');
    });

    test('providers without an explicit order should default to 100 and sort after lower orders', async () => {
        global.HookManager.register('onAuthGetLoginProviders', 'no-order-plugin', (context) => {
            context.providers.push({ id: 'no-order', label: 'NoOrder', initUrl: '/x' });
            return context;
        });
        global.HookManager.register('onAuthGetLoginProviders', 'priority-plugin', (context) => {
            context.providers.push({ id: 'first', label: 'First', initUrl: '/y', order: 10 });
            return context;
        });

        const template = '{{#each authProviders}}[{{this.label}}]{{/each}}';
        const result = await HandlebarController.expandHandlebars(makeReq('/auth/login.shtml'), template, {});

        expect(result.trim()).toBe('[First][NoOrder]');
    });
});

describe('W-195: controller.auth.localAuthRestriction survives context filtering (regression)', () => {
    // Regression coverage for a bug found during manual QA: appConfig.controller.* is stripped
    // by _filterContext()'s withoutAuth list for unauthenticated requests, and /auth/login.shtml
    // is by definition always viewed unauthenticated. So reading
    // appConfig.controller.auth.localAuthRestriction directly in the template always resolved to
    // undefined there, making the local-auth-restriction UI logic permanently think the site was
    // restricted. The fix adds the specific leaf path 'controller.auth.localAuthRestriction' to
    // app.conf's controller.handlebar.contextFilter.alwaysAllow list, which _filterContext()
    // already supports for plain config values (unlike authProviders, this needs no hook
    // execution, so no dedicated JS injection is needed - alwaysAllow handles it declaratively).
    let HandlebarController;
    let savedRestriction;

    function makeReq(path) {
        return {
            session: { user: null },
            user: null,
            url: path,
            path,
            query: {},
            protocol: 'http',
            hostname: 'localhost',
            get: (header) => (header === 'host' ? 'localhost:3000' : '')
        };
    }

    beforeEach(() => {
        HandlebarController = global.HandlebarController;
        savedRestriction = global.appConfig.controller.auth.localAuthRestriction;
    });

    afterEach(() => {
        global.appConfig.controller.auth.localAuthRestriction = savedRestriction;
    });

    test('is allow-listed in app.conf contextFilter', () => {
        const allowList = global.appConfig.controller.handlebar.contextFilter.alwaysAllow;
        expect(allowList).toContain('controller.auth.localAuthRestriction');
    });

    test('survives filtering and reflects the real config value on an unauthenticated login-page request', async () => {
        global.appConfig.controller.auth.localAuthRestriction = 'admins-only';

        const context = await HandlebarController._buildInternalContext(makeReq('/auth/login.shtml'));

        expect(context.appConfig.controller.auth.localAuthRestriction).toBe('admins-only');
    });

    test('sibling secrets under controller.auth remain stripped (allow-list is leaf-specific)', async () => {
        const context = await HandlebarController._buildInternalContext(makeReq('/auth/login.shtml'));

        // Only the localAuthRestriction leaf is restored - ldap/oauth2 credentials stay hidden
        expect(context.appConfig.controller.auth.ldap).toBeUndefined();
        expect(context.appConfig.controller.auth.oauth2).toBeUndefined();
    });

    test('also survives filtering on non-login pages (alwaysAllow is not path-scoped)', async () => {
        global.appConfig.controller.auth.localAuthRestriction = 'disabled';

        const context = await HandlebarController._buildInternalContext(makeReq('/dashboard.shtml'));

        expect(context.appConfig.controller.auth.localAuthRestriction).toBe('disabled');
    });
});

// EOF webapp/tests/unit/controller/handlebar-auth-providers.test.js
