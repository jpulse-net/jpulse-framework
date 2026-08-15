/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / User Password Reset Endpoints
 * @tagline         Unit tests for the W-206 password reset API endpoints on UserController
 * @description     Covers passwordReset() (public request, uniformly generic response),
 *                   passwordResetVerify() (read-only probe), passwordResetConfirm() (set the
 *                   password, then re-check every gate login() applies before any session), and
 *                   passwordResetSend() (admin, honest response) - plus the eligibility
 *                   classifier and the cross-path token invalidation
 * @file            webapp/tests/unit/controller/user-password-reset-endpoints.test.js
 * @version         1.7.15
 * @release         2026-08-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           85%, Cursor 3.15, Claude Opus 5
 */

import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

TestUtils.setupGlobalMocksWithConsolidatedConfig();

jest.mock('../../../model/user.js');
jest.mock('../../../controller/auth.js');
jest.mock('../../../controller/log.js');

let UserController, UserModel, AuthController, ConfigModel;

describe('UserController: W-206 password reset endpoints', () => {
    beforeAll(async () => {
        ConfigModel = (await import('../../../model/config.js')).default;
        ConfigModel.setEffectiveGeneralCache({ roles: ['user', 'admin', 'root'], adminRoles: ['admin', 'root'] });

        UserController = (await import('../../../controller/user.js')).default;
        UserModel = (await import('../../../model/user.js')).default;
        AuthController = (await import('../../../controller/auth.js')).default;
    });

    let mockReq, mockRes;

    const activeUser = {
        _id: 'user-1',
        username: 'pruser',
        email: 'pruser@example.com',
        profile: { firstName: 'Pat' },
        status: 'active',
        roles: ['user']
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = { session: {}, body: {}, query: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            redirect: jest.fn()
        };

        global.i18n = { translate: jest.fn((req, key) => key) };
        global.EmailController = { isConfigured: jest.fn().mockReturnValue(true) };
        global.appConfig.controller.auth.disableLogin = false;
        global.appConfig.controller.auth.localAuthRestriction = 'none';
        global.appConfig.controller.user.disablePasswordReset = false;
        global.appConfig.controller.user.passwordResetRateLimit = { enabled: true, maxAttempts: 10, windowSeconds: 300 };
        global.RedisManager = {
            cacheCheckRateLimit: jest.fn().mockResolvedValue({ allowed: true, count: 1, retryAfter: 0 })
        };

        jest.spyOn(global.CommonUtils, 'sendError').mockImplementation((req, res, status, message, code) => {
            res.status(status).json({ success: false, error: message, code });
        });
        jest.spyOn(global.CommonUtils, 'maskEmail').mockImplementation((email) => `masked:${email}`);
        jest.spyOn(global.CommonUtils, 'getLogContext').mockReturnValue({ ip: '10.0.0.1' });

        AuthController.userIsAdmin.mockReturnValue(false);
    });

    describe('isPasswordResetAvailable()', () => {
        test('is false when disabled by config, even with working SMTP', () => {
            global.appConfig.controller.user.disablePasswordReset = true;
            expect(UserController.isPasswordResetAvailable()).toBe(false);
        });

        test('is false when SMTP is unconfigured - a fresh install must not promise mail it cannot send', () => {
            global.EmailController.isConfigured.mockReturnValue(false);
            expect(UserController.isPasswordResetAvailable()).toBe(false);
        });

        test('is evaluated live, so configuring SMTP enables the feature with no restart', () => {
            global.EmailController.isConfigured.mockReturnValue(false);
            expect(UserController.isPasswordResetAvailable()).toBe(false);
            global.EmailController.isConfigured.mockReturnValue(true);
            expect(UserController.isPasswordResetAvailable()).toBe(true);
        });
    });

    describe('passwordReset() - POST /api/1/user/password-reset (public request)', () => {
        beforeEach(() => {
            mockReq.body = { identifier: 'pruser' };
            UserModel.findByUsername.mockResolvedValue(null);
            UserModel.findByEmail.mockResolvedValue(null);
            UserModel.issuePasswordReset.mockResolvedValue({ success: true, errorCode: null });
        });

        test('refuses with PASSWORD_RESET_UNAVAILABLE when the feature is off', async () => {
            global.appConfig.controller.user.disablePasswordReset = true;

            await UserController.passwordReset(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PASSWORD_RESET_UNAVAILABLE' }));
            expect(UserModel.findByUsername).not.toHaveBeenCalled();
        });

        test('refuses with LOGIN_DISABLED before any lookup, exactly as login() does', async () => {
            global.appConfig.controller.auth.disableLogin = true;

            await UserController.passwordReset(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'LOGIN_DISABLED' }));
            expect(UserModel.findByUsername).not.toHaveBeenCalled();
        });

        test('applies the per-IP limiter and reports retryAfter in seconds, not milliseconds', async () => {
            global.RedisManager.cacheCheckRateLimit.mockResolvedValue({ allowed: false, count: 11, retryAfter: 120000 });

            await UserController.passwordReset(mockReq, mockRes);

            expect(global.RedisManager.cacheCheckRateLimit).toHaveBeenCalledWith(
                'controller:user:rateLimit:passwordReset', '10.0.0.1', { limit: 10, windowSeconds: 300 }
            );
            expect(mockRes.status).toHaveBeenCalledWith(429);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'RATE_LIMITED', retryAfter: 120 }));
        });

        test('answers generically for an unknown account, and issues nothing', async () => {
            await UserController.passwordReset(mockReq, mockRes);

            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true, message: 'controller.user.passwordReset.requestReceived'
            }));
            expect(UserModel.issuePasswordReset).not.toHaveBeenCalled();
        });

        test('falls back from username to email lookup', async () => {
            mockReq.body = { identifier: 'pruser@example.com' };
            UserModel.findByEmail.mockResolvedValue(activeUser);

            await UserController.passwordReset(mockReq, mockRes);

            expect(UserModel.findByUsername).toHaveBeenCalledWith('pruser@example.com');
            expect(UserModel.findByEmail).toHaveBeenCalledWith('pruser@example.com');
            expect(UserModel.issuePasswordReset).toHaveBeenCalled();
        });

        test('issues a link for an active local account', async () => {
            UserModel.findByUsername.mockResolvedValue(activeUser);

            await UserController.passwordReset(mockReq, mockRes);

            expect(UserModel.issuePasswordReset).toHaveBeenCalledWith(mockReq, activeUser);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'controller.user.passwordReset.requestReceived'
            }));
        });

        test('an SSO-provisioned account gets the explainer mail instead of a token - and the same generic response', async () => {
            UserModel.findByUsername.mockResolvedValue({ ...activeUser, hasLocalPassword: false });

            await UserController.passwordReset(mockReq, mockRes);

            expect(UserModel.sendPasswordResetSsoNotice).toHaveBeenCalled();
            expect(UserModel.issuePasswordReset).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'controller.user.passwordReset.requestReceived'
            }));
        });

        test("a localAuthRestriction'd account gets the explainer mail too - a password it could never sign in with is not worth resetting", async () => {
            global.appConfig.controller.auth.localAuthRestriction = 'admins-only';
            UserModel.findByUsername.mockResolvedValue(activeUser);

            await UserController.passwordReset(mockReq, mockRes);

            expect(UserModel.sendPasswordResetSsoNotice).toHaveBeenCalled();
            expect(UserModel.issuePasswordReset).not.toHaveBeenCalled();
        });

        test("an admin is NOT restricted by 'admins-only', preserving break-glass recovery", async () => {
            global.appConfig.controller.auth.localAuthRestriction = 'admins-only';
            AuthController.userIsAdmin.mockReturnValue(true);
            UserModel.findByUsername.mockResolvedValue({ ...activeUser, roles: ['admin'] });

            await UserController.passwordReset(mockReq, mockRes);

            expect(UserModel.issuePasswordReset).toHaveBeenCalled();
            expect(UserModel.sendPasswordResetSsoNotice).not.toHaveBeenCalled();
        });

        test.each(['suspended', 'terminated'])('a %s account gets no mail at all - the admin owns that conversation', async (status) => {
            UserModel.findByUsername.mockResolvedValue({ ...activeUser, status });

            await UserController.passwordReset(mockReq, mockRes);

            expect(UserModel.issuePasswordReset).not.toHaveBeenCalled();
            expect(UserModel.sendPasswordResetSsoNotice).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'controller.user.passwordReset.requestReceived'
            }));
        });

        test.each(['pending', 'inactive'])('a %s account still gets a link - they may be waiting on approval and deserve working credentials', async (status) => {
            UserModel.findByUsername.mockResolvedValue({ ...activeUser, status });

            await UserController.passwordReset(mockReq, mockRes);

            expect(UserModel.issuePasswordReset).toHaveBeenCalled();
        });

        test('an exhausted per-account budget still answers generically - saying "rate limited" would confirm the account exists', async () => {
            UserModel.findByUsername.mockResolvedValue(activeUser);
            UserModel.issuePasswordReset.mockResolvedValue({
                success: false, errorCode: 'PASSWORD_RESET_RATE_LIMITED', retryAfter: 300000
            });

            await UserController.passwordReset(mockReq, mockRes);

            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true, message: 'controller.user.passwordReset.requestReceived'
            }));
        });

        test('an empty identifier answers generically too, keeping the contract uniform', async () => {
            mockReq.body = {};

            await UserController.passwordReset(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            expect(UserModel.findByUsername).not.toHaveBeenCalled();
        });
    });

    describe('passwordResetVerify() - GET /api/1/user/password-reset/verify (probe)', () => {
        test('returns valid:true for a usable token', async () => {
            mockReq.query.token = 'user-1.secret';
            UserModel.verifyPasswordResetToken.mockResolvedValue({ valid: true, errorCode: null });

            await UserController.passwordResetVerify(mockReq, mockRes);

            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, valid: true }));
        });

        test('returns 400 with the specific code for an expired token', async () => {
            mockReq.query.token = 'user-1.secret';
            UserModel.verifyPasswordResetToken.mockResolvedValue({ valid: false, errorCode: 'PASSWORD_RESET_EXPIRED' });

            await UserController.passwordResetVerify(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                valid: false, code: 'PASSWORD_RESET_EXPIRED'
            }));
        });
    });

    describe('passwordResetConfirm() - POST /api/1/user/password-reset/confirm', () => {
        beforeEach(() => {
            mockReq.body = { token: 'user-1.secret', newPassword: 'a-good-password' };
            UserModel.resetPasswordByToken.mockResolvedValue({ success: true, errorCode: null, user: activeUser });
            AuthController.beginAuthenticatedSession.mockResolvedValue({
                nextStep: null, page: null, data: null, warnings: [], redirect: null
            });
        });

        test('requires a new password', async () => {
            mockReq.body = { token: 'user-1.secret' };

            await UserController.passwordResetConfirm(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MISSING_PASSWORD' }));
            expect(UserModel.resetPasswordByToken).not.toHaveBeenCalled();
        });

        test.each(['PASSWORD_RESET_INVALID_TOKEN', 'PASSWORD_RESET_EXPIRED'])('returns 400 %s and creates no session', async (errorCode) => {
            UserModel.resetPasswordByToken.mockResolvedValue({ success: false, errorCode, user: null });

            await UserController.passwordResetConfirm(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: errorCode }));
            expect(AuthController.beginAuthenticatedSession).not.toHaveBeenCalled();
        });

        test('normalizes the confirm limiter retryAfter to seconds', async () => {
            UserModel.resetPasswordByToken.mockResolvedValue({
                success: false, errorCode: 'PASSWORD_RESET_RATE_LIMITED', retryAfter: 900000, user: null
            });

            await UserController.passwordResetConfirm(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(429);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ retryAfter: 900 }));
        });

        test('reports a password policy failure as 400 PASSWORD_POLICY_ERROR', async () => {
            UserModel.resetPasswordByToken.mockResolvedValue({
                success: false, errorCode: 'PASSWORD_POLICY_ERROR', error: 'Password must be at least 8 characters long', user: null
            });

            await UserController.passwordResetConfirm(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PASSWORD_POLICY_ERROR' }));
        });

        test('sends the password-changed notice on success', async () => {
            await UserController.passwordResetConfirm(mockReq, mockRes);

            expect(UserModel.sendPasswordChangedNotice).toHaveBeenCalledWith(mockReq, activeUser);
        });

        test('signs an active user in through beginAuthenticatedSession()', async () => {
            mockReq.session.user = { id: 'user-1', username: 'pruser' };

            await UserController.passwordResetConfirm(mockReq, mockRes);

            expect(AuthController.beginAuthenticatedSession).toHaveBeenCalledWith(
                mockReq, activeUser, 'internal', expect.any(Object)
            );
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true, passwordUpdated: true, nextStep: null
            }));
        });

        test('never bypasses MFA: a remaining step is reported instead of a session', async () => {
            AuthController.beginAuthenticatedSession.mockResolvedValue({
                nextStep: 'mfa', page: '/auth/mfa-verify.shtml', data: null, warnings: [], redirect: null
            });

            await UserController.passwordResetConfirm(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true, passwordUpdated: true, nextStep: 'mfa', page: '/auth/mfa-verify.shtml'
            }));
        });

        test.each([
            ['pending', 'controller.auth.accountPendingApproval'],
            ['inactive', 'controller.auth.accountInactive']
        ])('a %s account gets its password fixed but no session, and is told why', async (status, expectedKey) => {
            UserModel.resetPasswordByToken.mockResolvedValue({
                success: true, errorCode: null, user: { ...activeUser, status }
            });

            await UserController.passwordResetConfirm(mockReq, mockRes);

            expect(AuthController.beginAuthenticatedSession).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true, passwordUpdated: true, accountStatus: status, accountMessage: expectedKey
            }));
        });

        test('a localAuthRestriction that changed while the link was in flight blocks the session but keeps the new password', async () => {
            global.appConfig.controller.auth.localAuthRestriction = 'disabled';

            await UserController.passwordResetConfirm(mockReq, mockRes);

            expect(AuthController.beginAuthenticatedSession).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true, passwordUpdated: true, accountMessage: 'controller.auth.localAuthRestricted'
            }));
        });
    });

    describe('passwordResetSend() - POST /api/1/user/password-reset/send (admin)', () => {
        beforeEach(() => {
            mockReq.session.user = { id: 'admin-1', username: 'adminuser', roles: ['admin'] };
            mockReq.body = { username: 'pruser' };
            UserModel.findByUsername.mockResolvedValue(activeUser);
            UserModel.issuePasswordReset.mockResolvedValue({ success: true, errorCode: null });
        });

        test('returns 404 when the user does not exist', async () => {
            UserModel.findByUsername.mockResolvedValue(null);

            await UserController.passwordResetSend(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'USER_NOT_FOUND' }));
        });

        test('bypasses the per-account send budget so an admin helping in real time is not blocked by it', async () => {
            await UserController.passwordResetSend(mockReq, mockRes);

            expect(UserModel.issuePasswordReset).toHaveBeenCalledWith(mockReq, activeUser, {
                enforceSendLimit: false,
                awaitSend: true
            });
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true, email: 'masked:pruser@example.com'
            }));
        });

        test('reports SMTP failure honestly instead of promising a link that never left the server', async () => {
            UserModel.issuePasswordReset.mockResolvedValue({
                success: false, errorCode: 'EMAIL_SEND_FAILED', error: 'connect ECONNREFUSED 127.0.0.1:587'
            });

            await UserController.passwordResetSend(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(503);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false, code: 'EMAIL_SEND_FAILED'
            }));
        });

        test.each([
            [{ hasLocalPassword: false }, 'noLocalPassword'],
            [{ status: 'suspended' }, 'accountSuspended'],
            [{ status: 'terminated' }, 'accountTerminated']
        ])('refuses an ineligible account honestly, naming the reason (%#)', async (overrides, expectedReason) => {
            UserModel.findByUsername.mockResolvedValue({ ...activeUser, ...overrides });

            await UserController.passwordResetSend(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(409);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                code: 'PASSWORD_RESET_NOT_ELIGIBLE', reason: expectedReason
            }));
            expect(UserModel.issuePasswordReset).not.toHaveBeenCalled();
        });

        test('refuses when the feature is unavailable', async () => {
            global.EmailController.isConfigured.mockReturnValue(false);

            await UserController.passwordResetSend(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PASSWORD_RESET_UNAVAILABLE' }));
        });
    });

    describe('cross-path invalidation - an outstanding link must die with any other password write', () => {
        test('changePassword() drops the reset token', async () => {
            mockReq.session.user = { id: 'user-1', username: 'pruser' };
            mockReq.body = { currentPassword: 'old-one', newPassword: 'a-good-password' };
            UserModel.findById.mockResolvedValue({ ...activeUser, passwordHash: 'hash', hasLocalPassword: true });
            UserModel.verifyPassword.mockResolvedValue(true);
            UserModel.updateById.mockResolvedValue({ ...activeUser });

            await UserController.changePassword(mockReq, mockRes);

            expect(UserModel.invalidatePasswordReset).toHaveBeenCalledWith('user-1');
        });

        test('an admin setting a password via update() drops the reset token and stamps hasLocalPassword', async () => {
            mockReq.params = { id: 'user-1' };
            mockReq.session.user = { id: 'admin-1', username: 'adminuser', roles: ['admin'] };
            mockReq.body = { password: 'a-good-password' };
            AuthController.isAuthorized.mockReturnValue(true);
            // Pre-existing SSO-JIT shape: a synthetic flag that must not survive Set Password,
            // or password reset keeps treating the account as "no local password"
            UserModel.findById.mockResolvedValue({ ...activeUser, hasLocalPassword: false });
            UserModel.getSchemaExtensionsMetadata.mockReturnValue({});
            UserModel.updateById.mockResolvedValue({ ...activeUser, hasLocalPassword: true });

            await UserController.update(mockReq, mockRes);

            expect(UserModel.updateById).toHaveBeenCalledWith('user-1', expect.objectContaining({
                password: 'a-good-password',
                hasLocalPassword: true
            }));
            expect(UserModel.invalidatePasswordReset).toHaveBeenCalledWith('user-1');
        });

        test('an update() that does not touch the password leaves the reset token alone', async () => {
            mockReq.params = { id: 'user-1' };
            mockReq.session.user = { id: 'admin-1', username: 'adminuser', roles: ['admin'] };
            mockReq.body = { profile: { firstName: 'Patricia' } };
            AuthController.isAuthorized.mockReturnValue(true);
            UserModel.findById.mockResolvedValue(activeUser);
            UserModel.getSchemaExtensionsMetadata.mockReturnValue({});
            UserModel.updateById.mockResolvedValue({ ...activeUser });

            await UserController.update(mockReq, mockRes);

            expect(UserModel.invalidatePasswordReset).not.toHaveBeenCalled();
        });
    });
});

// EOF webapp/tests/unit/controller/user-password-reset-endpoints.test.js
