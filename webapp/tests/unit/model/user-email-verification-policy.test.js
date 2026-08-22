/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Model / User Email Verification Policy
 * @tagline         Unit tests for UserModel.getEmailVerificationPolicy() (W-205 Phase 6)
 * @description     Tests the live SMTP-aware degrade from 'required' to 'nag', so a site can never
 *                   configure itself into a signup lockout when SMTP isn't actually set up
 * @file            webapp/tests/unit/model/user-email-verification-policy.test.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.14, Claude Sonnet 5
 */

import { describe, test, expect, beforeAll, afterEach, jest } from '@jest/globals';

// Mock database before importing UserModel - this test only exercises a pure config/global read,
// not any DB-backed method, so a minimal stub is enough
jest.mock('../../../database.js', () => ({
    default: {
        getDb: jest.fn(() => ({
            collection: jest.fn(() => ({}))
        }))
    }
}));

describe('UserModel.getEmailVerificationPolicy() (W-205 Phase 6)', () => {
    let UserModel;
    let originalAppConfig, originalEmailController;

    beforeAll(async () => {
        UserModel = (await import('../../../model/user.js')).default;
    });

    afterEach(() => {
        global.appConfig = originalAppConfig;
        global.EmailController = originalEmailController;
    });

    function setUp({ emailVerification, isConfigured }) {
        originalAppConfig = global.appConfig;
        originalEmailController = global.EmailController;
        global.appConfig = { controller: { user: { emailVerification } } };
        global.EmailController = { isConfigured: jest.fn().mockReturnValue(isConfigured) };
    }

    test("returns 'required' unchanged when SMTP is configured", () => {
        setUp({ emailVerification: 'required', isConfigured: true });
        expect(UserModel.getEmailVerificationPolicy()).toBe('required');
    });

    test("degrades 'required' to 'nag' when SMTP is not configured", () => {
        setUp({ emailVerification: 'required', isConfigured: false });
        expect(UserModel.getEmailVerificationPolicy()).toBe('nag');
    });

    test("leaves 'nag' unchanged regardless of SMTP state", () => {
        setUp({ emailVerification: 'nag', isConfigured: false });
        expect(UserModel.getEmailVerificationPolicy()).toBe('nag');
    });

    test("leaves 'off' unchanged regardless of SMTP state", () => {
        setUp({ emailVerification: 'off', isConfigured: false });
        expect(UserModel.getEmailVerificationPolicy()).toBe('off');
    });

    test("defaults to 'required' when unconfigured, and degrades if SMTP is not configured", () => {
        originalAppConfig = global.appConfig;
        originalEmailController = global.EmailController;
        global.appConfig = { controller: { user: {} } };
        global.EmailController = { isConfigured: jest.fn().mockReturnValue(false) };
        expect(UserModel.getEmailVerificationPolicy()).toBe('nag');
    });

    test('does not throw when global.EmailController is not yet set', () => {
        originalAppConfig = global.appConfig;
        originalEmailController = global.EmailController;
        global.appConfig = { controller: { user: { emailVerification: 'required' } } };
        global.EmailController = undefined;
        expect(() => UserModel.getEmailVerificationPolicy()).not.toThrow();
        expect(UserModel.getEmailVerificationPolicy()).toBe('nag');
    });

    test('re-evaluates live: SMTP becoming configured resumes required enforcement with no restart', () => {
        setUp({ emailVerification: 'required', isConfigured: false });
        expect(UserModel.getEmailVerificationPolicy()).toBe('nag');

        global.EmailController.isConfigured.mockReturnValue(true);
        expect(UserModel.getEmailVerificationPolicy()).toBe('required');
    });
});

// EOF webapp/tests/unit/model/user-email-verification-policy.test.js
