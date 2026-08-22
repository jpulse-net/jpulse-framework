/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / User Email Verify Endpoints
 * @tagline         Unit tests for the W-205 email verification API endpoints on UserController
 * @description     Covers emailVerify() (authenticated code entry), emailVerifySend() (authenticated
 *                   resend), and confirmEmailVerify() (unauthenticated link confirm - same-browser
 *                   mid-login completion, other-device/status-only landing, and the error/redirect
 *                   paths for expired/invalid tokens)
 * @file            webapp/tests/unit/controller/user-email-verify-endpoints.test.js
 * @version         1.7.16
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Claude Sonnet 5
 */

import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

TestUtils.setupGlobalMocksWithConsolidatedConfig();

jest.mock('../../../model/user.js');
jest.mock('../../../controller/auth.js');
jest.mock('../../../controller/log.js');

let UserController, UserModel, AuthController, ConfigModel;

describe('UserController: W-205 email verification endpoints', () => {
    beforeAll(async () => {
        ConfigModel = (await import('../../../model/config.js')).default;
        ConfigModel.setEffectiveGeneralCache({ roles: ['user', 'admin', 'root'], adminRoles: ['admin', 'root'] });

        UserController = (await import('../../../controller/user.js')).default;
        UserModel = (await import('../../../model/user.js')).default;
        AuthController = (await import('../../../controller/auth.js')).default;
    });

    let mockReq, mockRes;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = { session: {}, body: {}, query: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            redirect: jest.fn()
        };

        global.i18n = { translate: jest.fn((req, key) => key) };
        jest.spyOn(global.CommonUtils, 'sendError').mockImplementation((req, res, status, message, code) => {
            res.status(status).json({ success: false, error: message, code });
        });
        jest.spyOn(global.CommonUtils, 'maskEmail').mockImplementation((email) => `masked:${email}`);
    });

    describe('emailVerify() - POST /api/1/user/email-verify (authenticated code entry)', () => {
        beforeEach(() => {
            mockReq.session.user = { id: 'user-1', username: 'evuser' };
        });

        test('returns MISSING_CODE when no code is supplied', async () => {
            mockReq.body = {};

            await UserController.emailVerify(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code: 'MISSING_CODE' }));
            expect(UserModel.verifyEmailByCode).not.toHaveBeenCalled();
        });

        test('calls UserModel.verifyEmailByCode with the session user id and the supplied code', async () => {
            mockReq.body = { code: '123456' };
            UserModel.verifyEmailByCode.mockResolvedValue({ success: true, user: { username: 'evuser' } });

            await UserController.emailVerify(mockReq, mockRes);

            expect(UserModel.verifyEmailByCode).toHaveBeenCalledWith(mockReq, 'user-1', '123456');
        });

        test('returns 400 EMAIL_VERIFY_INVALID_CODE on a wrong code', async () => {
            mockReq.body = { code: '000000' };
            UserModel.verifyEmailByCode.mockResolvedValue({ success: false, errorCode: 'EMAIL_VERIFY_INVALID_CODE' });

            await UserController.emailVerify(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code: 'EMAIL_VERIFY_INVALID_CODE' }));
        });

        test('returns 400 EMAIL_VERIFY_EXPIRED when the code has expired', async () => {
            mockReq.body = { code: '000000' };
            UserModel.verifyEmailByCode.mockResolvedValue({ success: false, errorCode: 'EMAIL_VERIFY_EXPIRED' });

            await UserController.emailVerify(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code: 'EMAIL_VERIFY_EXPIRED' }));
        });

        test('returns 429 EMAIL_VERIFY_RATE_LIMITED (with retryAfter) after too many wrong attempts', async () => {
            mockReq.body = { code: '000000' };
            UserModel.verifyEmailByCode.mockResolvedValue({ success: false, errorCode: 'EMAIL_VERIFY_RATE_LIMITED', retryAfter: 900 });

            await UserController.emailVerify(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(429);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, code: 'EMAIL_VERIFY_RATE_LIMITED', retryAfter: 900 })
            );
        });

        test('returns success:true on a matching code', async () => {
            mockReq.body = { code: '123456' };
            UserModel.verifyEmailByCode.mockResolvedValue({ success: true, user: { username: 'evuser' } });

            await UserController.emailVerify(mockReq, mockRes);

            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('emailVerifySend() - POST /api/1/user/email-verify/send (authenticated resend)', () => {
        beforeEach(() => {
            mockReq.session.user = { id: 'user-1', username: 'evuser' };
        });

        test('returns USER_NOT_FOUND when the session user no longer exists', async () => {
            UserModel.findById.mockResolvedValue(null);

            await UserController.emailVerifySend(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'USER_NOT_FOUND' }));
            expect(UserModel.issueEmailVerification).not.toHaveBeenCalled();
        });

        test('does not send (and reports alreadyVerified) when the user is already verified', async () => {
            UserModel.findById.mockResolvedValue({ username: 'evuser', email: 'evuser@example.com', emailVerified: true });

            await UserController.emailVerifySend(mockReq, mockRes);

            expect(UserModel.issueEmailVerification).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, alreadyVerified: true }));
        });

        test('does not send (and reports alreadyVerified) for a grandfathered account (emailVerified: true, emailVerifiedAt: null)', async () => {
            UserModel.findById.mockResolvedValue(
                { username: 'evuser', email: 'evuser@example.com', emailVerified: true, emailVerifiedAt: null }
            );

            await UserController.emailVerifySend(mockReq, mockRes);

            expect(UserModel.issueEmailVerification).not.toHaveBeenCalled();
        });

        test('returns 429 with retryAfter when the send limiter rejects', async () => {
            UserModel.findById.mockResolvedValue({ username: 'evuser', email: 'evuser@example.com', emailVerified: false });
            UserModel.issueEmailVerification.mockResolvedValue(
                { success: false, errorCode: 'EMAIL_VERIFY_RATE_LIMITED', retryAfter: 600 }
            );

            await UserController.emailVerifySend(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(429);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, code: 'EMAIL_VERIFY_RATE_LIMITED', retryAfter: 600 })
            );
        });

        test('issues a fresh credential and returns the masked email on success', async () => {
            UserModel.findById.mockResolvedValue({ username: 'evuser', email: 'evuser@example.com', emailVerified: false });
            UserModel.issueEmailVerification.mockResolvedValue({ success: true, errorCode: null });

            await UserController.emailVerifySend(mockReq, mockRes);

            expect(UserModel.issueEmailVerification).toHaveBeenCalledWith(
                mockReq, expect.objectContaining({ username: 'evuser' })
            );
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true, email: 'masked:evuser@example.com' })
            );
        });
    });

    describe('confirmEmailVerify() - GET /api/1/user/email-verify/confirm?token= (no session required)', () => {
        test('redirects with status=invalid on a bad/tampered token', async () => {
            mockReq.query.token = 'garbage';
            UserModel.verifyEmailByToken.mockResolvedValue({ success: false, errorCode: 'EMAIL_VERIFY_INVALID_TOKEN' });

            await UserController.confirmEmailVerify(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith('/auth/email-verify.shtml?status=invalid');
        });

        test('redirects with status=expired on an expired/already-used token', async () => {
            mockReq.query.token = 'user-1.somesecret';
            UserModel.verifyEmailByToken.mockResolvedValue({ success: false, errorCode: 'EMAIL_VERIFY_EXPIRED' });

            await UserController.confirmEmailVerify(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith('/auth/email-verify.shtml?status=expired');
        });

        test('redirects with status=verified when there is no pendingAuth for this user (other-device click, or arrived outside a login attempt)', async () => {
            mockReq.query.token = 'user-1.goodsecret';
            UserModel.verifyEmailByToken.mockResolvedValue({ success: true, user: { _id: 'user-1', username: 'evuser' } });

            await UserController.confirmEmailVerify(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith('/auth/email-verify.shtml?status=verified');
            expect(AuthController.beginAuthenticatedSession).not.toHaveBeenCalled();
        });

        test("does not touch pendingAuth belonging to a DIFFERENT user (link clicked while another account's login is pending in this browser)", async () => {
            mockReq.query.token = 'user-1.goodsecret';
            mockReq.session.pendingAuth = {
                userId: 'some-other-user', username: 'otherguy',
                requiredSteps: ['credentials', 'email-verify'], completedSteps: ['credentials']
            };
            UserModel.verifyEmailByToken.mockResolvedValue({ success: true, user: { _id: 'user-1', username: 'evuser' } });

            await UserController.confirmEmailVerify(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith('/auth/email-verify.shtml?status=verified');
            expect(mockReq.session.pendingAuth.completedSteps).toEqual(['credentials']);
        });

        // W-206: the pendingAuth rebuild and the step-vs-session decision moved into
        // AuthController.beginAuthenticatedSession(), so these assert the hand-off rather than
        // the two private helpers this endpoint used to call directly.
        test('same-browser mid-login, more steps remain: hands off with email-verify completed and redirects to the next step page (carrying redirect)', async () => {
            mockReq.query.token = 'user-1.goodsecret';
            mockReq.session.pendingAuth = {
                userId: 'user-1', username: 'evuser', authMethod: 'password', redirect: '/dashboard',
                requiredSteps: ['credentials', 'email-verify', 'mfa'], completedSteps: ['credentials']
            };
            const verifiedUser = { _id: 'user-1', username: 'evuser' };
            UserModel.verifyEmailByToken.mockResolvedValue({ success: true, user: verifiedUser });
            AuthController.beginAuthenticatedSession.mockResolvedValue({
                nextStep: 'mfa', page: '/auth/mfa-verify.shtml', data: null, warnings: [], redirect: '/dashboard'
            });

            await UserController.confirmEmailVerify(mockReq, mockRes);

            expect(AuthController.beginAuthenticatedSession).toHaveBeenCalledWith(
                mockReq, verifiedUser, 'password',
                expect.objectContaining({
                    completedSteps: ['credentials', 'email-verify'],
                    redirect: '/dashboard'
                })
            );
            expect(mockRes.redirect).toHaveBeenCalledWith(
                `/auth/mfa-verify.shtml?redirect=${encodeURIComponent('/dashboard')}`
            );
        });

        test('same-browser mid-login, no steps remain: completes the login session and redirects straight to the safe destination', async () => {
            mockReq.query.token = 'user-1.goodsecret';
            mockReq.session.pendingAuth = {
                userId: 'user-1', username: 'evuser', authMethod: 'password', redirect: '/dashboard',
                requiredSteps: ['credentials', 'email-verify'], completedSteps: ['credentials']
            };
            const verifiedUser = { _id: 'user-1', username: 'evuser' };
            UserModel.verifyEmailByToken.mockResolvedValue({ success: true, user: verifiedUser });
            AuthController.beginAuthenticatedSession.mockResolvedValue({
                nextStep: null, page: null, data: null, warnings: [], redirect: '/dashboard'
            });

            await UserController.confirmEmailVerify(mockReq, mockRes);

            expect(AuthController.beginAuthenticatedSession).toHaveBeenCalledWith(
                mockReq, verifiedUser, 'password', expect.objectContaining({ redirect: '/dashboard' })
            );
            expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
        });

        test('carries post-login warnings (e.g. the MFA nag) across the redirect (no AJAX response to read them from)', async () => {
            mockReq.query.token = 'user-1.goodsecret';
            mockReq.session.pendingAuth = {
                userId: 'user-1', username: 'evuser', authMethod: 'password', redirect: '/dashboard',
                requiredSteps: ['credentials', 'email-verify'], completedSteps: ['credentials']
            };
            const verifiedUser = { _id: 'user-1', username: 'evuser' };
            UserModel.verifyEmailByToken.mockResolvedValue({ success: true, user: verifiedUser });
            AuthController.beginAuthenticatedSession.mockResolvedValue({
                nextStep: null,
                page: null,
                data: null,
                warnings: [{ type: 'mfa-not-enabled', toastType: 'info', message: 'Consider enabling MFA' }],
                redirect: '/dashboard'
            });

            await UserController.confirmEmailVerify(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledTimes(1);
            const redirectedUrl = mockRes.redirect.mock.calls[0][0];
            expect(redirectedUrl).toMatch(/^\/dashboard\?toasts=/);

            const encoded = new URL(redirectedUrl, 'https://example.com').searchParams.get('toasts');
            const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
            expect(decoded).toEqual([
                { type: 'mfa-not-enabled', toastType: 'info', message: 'Consider enabling MFA' }
            ]);
        });

        test('falls back to / when beginAuthenticatedSession() rejected the stored redirect as unsafe', async () => {
            mockReq.query.token = 'user-1.goodsecret';
            mockReq.session.pendingAuth = {
                userId: 'user-1', username: 'evuser', authMethod: 'password', redirect: 'https://evil.example.com/',
                requiredSteps: ['credentials', 'email-verify'], completedSteps: ['credentials']
            };
            UserModel.verifyEmailByToken.mockResolvedValue({ success: true, user: { _id: 'user-1', username: 'evuser' } });
            AuthController.beginAuthenticatedSession.mockResolvedValue({
                nextStep: null, page: null, data: null, warnings: [], redirect: null
            });

            await UserController.confirmEmailVerify(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith('/');
        });

        test('falls back to /auth/login.shtml when the next step has no page (defensive, matches AuthController.completeExternalAuth)', async () => {
            mockReq.query.token = 'user-1.goodsecret';
            mockReq.session.pendingAuth = {
                userId: 'user-1', username: 'evuser', authMethod: 'password', redirect: '/dashboard',
                requiredSteps: ['credentials', 'email-verify', 'mfa'], completedSteps: ['credentials']
            };
            UserModel.verifyEmailByToken.mockResolvedValue({ success: true, user: { _id: 'user-1', username: 'evuser' } });
            AuthController.beginAuthenticatedSession.mockResolvedValue({
                nextStep: 'mfa', page: null, data: null, warnings: [], redirect: '/dashboard'
            });

            await UserController.confirmEmailVerify(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith(
                `/auth/login.shtml?redirect=${encodeURIComponent('/dashboard')}`
            );
        });

        test('redirects with status=invalid if an unexpected error is thrown (never leaks the error to the redirect target)', async () => {
            mockReq.query.token = 'user-1.goodsecret';
            UserModel.verifyEmailByToken.mockRejectedValue(new Error('redis down'));

            await UserController.confirmEmailVerify(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith('/auth/email-verify.shtml?status=invalid');
        });
    });

    describe('update() - admin email change resets emailVerified (W-205)', () => {
        const currentUser = {
            _id: 'user-1', username: 'evuser', email: 'old@example.com',
            profile: { firstName: 'Ev' }, roles: ['user'], emailVerified: true, emailVerifiedAt: new Date('2026-01-01')
        };

        beforeEach(() => {
            mockReq.params = { id: 'user-1' };
            mockReq.session.user = { id: 'admin-1', username: 'adminuser', roles: ['admin'] };
            AuthController.isAuthorized.mockReturnValue(true);
            UserModel.findById.mockResolvedValue(currentUser);
            UserModel.findByEmail.mockResolvedValue(null);
            UserModel.getSchemaExtensionsMetadata.mockReturnValue({});
            UserModel.updateById.mockImplementation((id, data) =>
                Promise.resolve({ ...currentUser, ...data })
            );
        });

        test('resets emailVerified/emailVerifiedAt and sends both notices when the admin changes the email without asserting emailVerified', async () => {
            mockReq.body = { email: 'new@example.com' };

            await UserController.update(mockReq, mockRes);

            expect(UserModel.updateById).toHaveBeenCalledWith('user-1', expect.objectContaining({
                email: 'new@example.com', emailVerified: false, emailVerifiedAt: null
            }));
            expect(UserModel.sendEmailChangedNotice).toHaveBeenCalledWith(mockReq, expect.objectContaining({ email: 'new@example.com' }));
            expect(UserModel.sendEmailChangedAlert).toHaveBeenCalledWith(mockReq, expect.objectContaining({ email: 'new@example.com' }), 'old@example.com');
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ emailVerifiedReset: true }));
        });

        test('does NOT reset (and sends no notices) when the same request explicitly asserts emailVerified: true', async () => {
            mockReq.body = { email: 'new@example.com', emailVerified: true };

            await UserController.update(mockReq, mockRes);

            expect(UserModel.updateById).toHaveBeenCalledWith('user-1', expect.objectContaining({
                email: 'new@example.com', emailVerified: true
            }));
            expect(UserModel.updateById.mock.calls[0][1]).not.toHaveProperty('emailVerifiedAt');
            expect(UserModel.sendEmailChangedNotice).not.toHaveBeenCalled();
            expect(UserModel.sendEmailChangedAlert).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ emailVerifiedReset: false }));
        });

        test('does not touch emailVerified at all when the email is not being changed', async () => {
            mockReq.body = { profile: { firstName: 'Updated' } };

            await UserController.update(mockReq, mockRes);

            expect(UserModel.updateById.mock.calls[0][1]).not.toHaveProperty('emailVerified');
            expect(UserModel.updateById.mock.calls[0][1]).not.toHaveProperty('emailVerifiedAt');
            expect(UserModel.sendEmailChangedNotice).not.toHaveBeenCalled();
        });

        test('rejects with EMAIL_EXISTS (and never calls updateById) when the new address belongs to another account', async () => {
            mockReq.body = { email: 'taken@example.com' };
            UserModel.findByEmail.mockResolvedValue({ _id: 'someone-else', email: 'taken@example.com' });

            await UserController.update(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(409);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'EMAIL_EXISTS' }));
            expect(UserModel.updateById).not.toHaveBeenCalled();
        });

        test('a non-admin cannot change their own email at all (field silently dropped, no reset logic reached)', async () => {
            mockReq.session.user = { id: 'user-1', username: 'evuser', roles: ['user'] };
            AuthController.isAuthorized.mockReturnValue(false);
            mockReq.body = { email: 'self-service@example.com', profile: { firstName: 'Ev' } };

            await UserController.update(mockReq, mockRes);

            expect(UserModel.updateById.mock.calls[0][1]).not.toHaveProperty('email');
            expect(UserModel.sendEmailChangedNotice).not.toHaveBeenCalled();
        });
    });
});

// EOF webapp/tests/unit/controller/user-email-verify-endpoints.test.js
