/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Auth Begin Session
 * @tagline         Unit tests for AuthController.beginAuthenticatedSession() (W-206)
 * @description     The public facade over the multi-step login machinery, used by every caller
 *                   that proved identity outside login() - a mailed password reset link, a mailed
 *                   verification link. Covers the remaining-step hand-off, session creation when
 *                   none remain, redirect validation, and the fact that a required step (e.g.
 *                   MFA) is never skipped
 * @file            webapp/tests/unit/controller/auth-begin-session.test.js
 * @version         1.7.12
 * @release         2026-08-12
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           85%, Cursor 3.15, Claude Opus 5
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

TestUtils.setupGlobalMocksWithConsolidatedConfig();

jest.mock('../../../model/user.js');
jest.mock('../../../controller/log.js');

let AuthController, UserModel;

describe('AuthController.beginAuthenticatedSession() (W-206)', () => {
    beforeAll(async () => {
        const ConfigModel = (await import('../../../model/config.js')).default;
        ConfigModel.setEffectiveGeneralCache({ roles: ['user', 'admin', 'root'], adminRoles: ['admin', 'root'] });

        AuthController = (await import('../../../controller/auth.js')).default;
        UserModel = (await import('../../../model/user.js')).default;
    });

    let mockReq;
    const user = {
        _id: 'user-1',
        username: 'pruser',
        email: 'pruser@example.com',
        profile: { firstName: 'Pat', lastName: 'Reyes' },
        roles: ['user'],
        preferences: {},
        emailVerified: true
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = { session: {}, body: {} };

        global.i18n = {
            translate: jest.fn((req, key) => key),
            translateForUser: jest.fn((u, key) => key)
        };
        global.LogController = { logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() };
        global.HookManager = { execute: jest.fn(async (name, context) => context) };

        UserModel.getEmailVerificationPolicy.mockReturnValue('off');
        UserModel.updateById.mockResolvedValue(user);

        jest.spyOn(global.CommonUtils, 'isSafeRedirectUrl').mockImplementation((req, url) => url === '/dashboard');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('creates the session and returns warnings when no step remains', async () => {
        const result = await AuthController.beginAuthenticatedSession(mockReq, user, 'internal');

        expect(result.nextStep).toBeNull();
        expect(mockReq.session.user).toEqual(expect.objectContaining({ username: 'pruser', isAuthenticated: true }));
        expect(mockReq.session.pendingAuth).toBeUndefined();
        expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('never skips a required step: a plugin step (e.g. MFA) is reported and NO session is created', async () => {
        global.HookManager.execute = jest.fn(async (name, context) => {
            if (name === 'onAuthGetSteps') {
                context.requiredSteps.push({ step: 'mfa', priority: 100, page: '/auth/mfa-verify.shtml' });
            }
            return context;
        });

        const result = await AuthController.beginAuthenticatedSession(mockReq, user, 'internal');

        expect(result).toEqual(expect.objectContaining({ nextStep: 'mfa', page: '/auth/mfa-verify.shtml' }));
        expect(mockReq.session.user).toBeUndefined();
        expect(mockReq.session.pendingAuth).toEqual(expect.objectContaining({
            userId: 'user-1', username: 'pruser', requiredSteps: ['credentials', 'mfa']
        }));
    });

    test('honors the caller-supplied completedSteps, so a step already proven is not demanded twice', async () => {
        global.HookManager.execute = jest.fn(async (name, context) => {
            if (name === 'onAuthGetSteps') {
                context.requiredSteps.push({ step: 'mfa', priority: 100, page: '/auth/mfa-verify.shtml' });
            }
            return context;
        });

        const result = await AuthController.beginAuthenticatedSession(mockReq, user, 'internal', {
            completedSteps: ['credentials', 'mfa']
        });

        expect(result.nextStep).toBeNull();
        expect(mockReq.session.user).toBeDefined();
    });

    test('validates the redirect once and echoes the safe value back, so callers need not re-check', async () => {
        const result = await AuthController.beginAuthenticatedSession(mockReq, user, 'internal', {
            redirect: '/dashboard'
        });

        expect(result.redirect).toBe('/dashboard');
    });

    test('drops an unsafe redirect', async () => {
        const result = await AuthController.beginAuthenticatedSession(mockReq, user, 'internal', {
            redirect: 'https://evil.example.com/'
        });

        expect(result.redirect).toBeNull();
    });

    test('replaces a pendingAuth left over from an abandoned attempt by a different account', async () => {
        mockReq.session.pendingAuth = {
            userId: 'someone-else', username: 'otherguy',
            completedSteps: ['credentials'], requiredSteps: ['credentials', 'mfa'],
            createdAt: 1
        };
        global.HookManager.execute = jest.fn(async (name, context) => {
            if (name === 'onAuthGetSteps') {
                context.requiredSteps.push({ step: 'mfa', priority: 100, page: '/auth/mfa-verify.shtml' });
            }
            return context;
        });

        await AuthController.beginAuthenticatedSession(mockReq, user, 'internal');

        expect(mockReq.session.pendingAuth.userId).toBe('user-1');
        expect(mockReq.session.pendingAuth.username).toBe('pruser');
        // Fresh createdAt: the mail round trip that got us here must not be charged against the
        // window for whatever step comes next
        expect(mockReq.session.pendingAuth.createdAt).toBeGreaterThan(1);
    });

    test('does not gate on account status - callers own that check (same contract as completeExternalAuth)', async () => {
        const result = await AuthController.beginAuthenticatedSession(
            mockReq, { ...user, status: 'suspended' }, 'internal'
        );

        expect(result.nextStep).toBeNull();
        expect(mockReq.session.user).toBeDefined();
    });
});

// EOF webapp/tests/unit/controller/auth-begin-session.test.js
