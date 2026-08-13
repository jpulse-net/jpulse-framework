/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Bootstrap
 * @tagline         Unit Tests for Bootstrap safety-check helpers
 * @description     Tests for standalone bootstrap helper functions (not the full bootstrap sequence,
 *                   which has heavy side effects and is already exercised by the Jest global setup):
 *                   checkLocalAuthRestrictionSafety() (W-195) and checkEmailVerificationSafety() (W-205)
 * @file            webapp/tests/unit/utils/bootstrap.test.js
 * @version         1.7.13
 * @release         2026-08-13
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.14, Claude Sonnet 5
 */

import { describe, test, expect, jest } from '@jest/globals';
import { checkLocalAuthRestrictionSafety, checkEmailVerificationSafety } from '../../../utils/bootstrap.js';

// W-195: Bootstrap safety check for localAuthRestriction: 'disabled'
describe('checkLocalAuthRestrictionSafety (W-195)', () => {
    function makeHookManager(hasHandlers) {
        return { hasHandlers: jest.fn().mockReturnValue(hasHandlers) };
    }

    test('downgrades to admins-only when disabled and no external auth plugin is enabled', () => {
        const appConfig = { controller: { auth: { localAuthRestriction: 'disabled' } } };
        const hookManager = makeHookManager(false);
        const log = jest.fn();

        checkLocalAuthRestrictionSafety(appConfig, hookManager, log);

        expect(appConfig.controller.auth.localAuthRestriction).toBe('admins-only');
        expect(hookManager.hasHandlers).toHaveBeenCalledWith('onAuthGetLoginProviders');
        expect(log).toHaveBeenCalledWith(expect.stringContaining("downgraded to 'admins-only'"), 'warn');
    });

    test('leaves disabled as-is when an external auth plugin is enabled', () => {
        const appConfig = { controller: { auth: { localAuthRestriction: 'disabled' } } };
        const hookManager = makeHookManager(true);
        const log = jest.fn();

        checkLocalAuthRestrictionSafety(appConfig, hookManager, log);

        expect(appConfig.controller.auth.localAuthRestriction).toBe('disabled');
        expect(log).not.toHaveBeenCalled();
    });

    test('does not touch admins-only regardless of plugin state', () => {
        const appConfig = { controller: { auth: { localAuthRestriction: 'admins-only' } } };
        const hookManager = makeHookManager(false);
        const log = jest.fn();

        checkLocalAuthRestrictionSafety(appConfig, hookManager, log);

        expect(appConfig.controller.auth.localAuthRestriction).toBe('admins-only');
        expect(log).not.toHaveBeenCalled();
    });

    test('does not touch none (default) regardless of plugin state', () => {
        const appConfig = { controller: { auth: { localAuthRestriction: 'none' } } };
        const hookManager = makeHookManager(false);
        const log = jest.fn();

        checkLocalAuthRestrictionSafety(appConfig, hookManager, log);

        expect(appConfig.controller.auth.localAuthRestriction).toBe('none');
        expect(log).not.toHaveBeenCalled();
    });

    test('does not throw when controller.auth config is missing entirely', () => {
        const appConfig = {};
        const hookManager = makeHookManager(false);
        const log = jest.fn();

        expect(() => checkLocalAuthRestrictionSafety(appConfig, hookManager, log)).not.toThrow();
        expect(log).not.toHaveBeenCalled();
    });
});

// W-205 Phase 6: Bootstrap safety check for emailVerification: 'required' with SMTP unconfigured
describe('checkEmailVerificationSafety (W-205)', () => {
    function makeEmailController(isConfigured) {
        return { isConfigured: jest.fn().mockReturnValue(isConfigured) };
    }

    test('warns when required and SMTP is not configured', () => {
        const appConfig = { controller: { user: { emailVerification: 'required' } } };
        const emailController = makeEmailController(false);
        const log = jest.fn();

        checkEmailVerificationSafety(appConfig, emailController, log);

        expect(emailController.isConfigured).toHaveBeenCalledTimes(1);
        expect(log).toHaveBeenCalledWith(expect.stringContaining("degraded to 'nag'"), 'warn');
        // Read-only: unlike checkLocalAuthRestrictionSafety(), this never mutates appConfig -
        // the actual degrade is evaluated live by UserModel.getEmailVerificationPolicy()
        expect(appConfig.controller.user.emailVerification).toBe('required');
    });

    test('does not warn when required and SMTP is configured', () => {
        const appConfig = { controller: { user: { emailVerification: 'required' } } };
        const emailController = makeEmailController(true);
        const log = jest.fn();

        checkEmailVerificationSafety(appConfig, emailController, log);

        expect(log).not.toHaveBeenCalled();
    });

    test('does not warn for nag regardless of SMTP state', () => {
        const appConfig = { controller: { user: { emailVerification: 'nag' } } };
        const emailController = makeEmailController(false);
        const log = jest.fn();

        checkEmailVerificationSafety(appConfig, emailController, log);

        expect(log).not.toHaveBeenCalled();
    });

    test('does not warn for off regardless of SMTP state', () => {
        const appConfig = { controller: { user: { emailVerification: 'off' } } };
        const emailController = makeEmailController(false);
        const log = jest.fn();

        checkEmailVerificationSafety(appConfig, emailController, log);

        expect(log).not.toHaveBeenCalled();
    });

    test('does not throw when controller.user config is missing entirely', () => {
        const appConfig = {};
        const emailController = makeEmailController(false);
        const log = jest.fn();

        expect(() => checkEmailVerificationSafety(appConfig, emailController, log)).not.toThrow();
        expect(log).not.toHaveBeenCalled();
    });
});

// EOF webapp/tests/unit/utils/bootstrap.test.js
