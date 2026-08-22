/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Model / User Password Reset
 * @tagline         Unit tests for the W-206 password reset model primitives
 * @description     Covers UserModel.issuePasswordReset(), verifyPasswordResetToken(),
 *                   resetPasswordByToken(), invalidatePasswordReset(), and the two notice mails -
 *                   the token issue-probe-consume lifecycle, the 1h TTL, both per-account
 *                   limiters, the detached send, and the mechanism-only contract (no status,
 *                   hasLocalPassword or restriction checks anywhere in this layer)
 * @file            webapp/tests/unit/model/user-password-reset.test.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           85%, Cursor 3.15, Claude Opus 5
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import bcrypt from 'bcrypt';

// The mail send is deliberately detached (see issuePasswordReset()), so assertions about it have
// to let the microtask queue - including the dynamic import() - drain first
const flushDetached = () => new Promise((resolve) => setImmediate(resolve));

describe('UserModel password reset primitives (W-206)', () => {
    let UserModel, EmailController;

    const USER_ID = '507f1f77bcf86cd799439011';
    const mockReq = { protocol: 'https', get: () => 'example.com' };
    const mockUser = {
        _id: USER_ID,
        username: 'pruser',
        email: 'pruser@example.com',
        profile: { firstName: 'Pat' },
        status: 'active'
    };

    beforeAll(async () => {
        UserModel = (await import('../../../model/user.js')).default;
        EmailController = (await import('../../../controller/email.js')).default;
    });

    beforeEach(() => {
        global.RedisManager = {
            cacheGetToken: jest.fn().mockResolvedValue(null),
            cacheSetToken: jest.fn().mockResolvedValue(true),
            cacheDelToken: jest.fn().mockResolvedValue(true),
            cacheCheckRateLimit: jest.fn().mockResolvedValue({ allowed: true, count: 1, retryAfter: 0 })
        };
        global.LogController = { logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() };
        // Same singleton the dynamic import() inside the model resolves to (shared ESM module
        // registry), so spying here intercepts the calls made through that import
        jest.spyOn(EmailController, 'sendEmailFromTranslation').mockResolvedValue(
            { success: true, messageId: 'msg-1', errorCode: null, error: null }
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('issuePasswordReset()', () => {
        test('stores a bcrypt-hashed secret under controller:user:passwordResetLink with a 1h TTL', async () => {
            await UserModel.issuePasswordReset(mockReq, mockUser);

            expect(global.RedisManager.cacheSetToken).toHaveBeenCalledWith(
                'controller:user:passwordResetLink', USER_ID, expect.any(String), 3600
            );
            const [, , storedHash] = global.RedisManager.cacheSetToken.mock.calls[0];
            expect(storedHash).toMatch(/^\$2[aby]\$/);
        });

        test('rate-limits sends per account: 3 per 10 minutes against controller:user:passwordResetSend', async () => {
            await UserModel.issuePasswordReset(mockReq, mockUser);

            expect(global.RedisManager.cacheCheckRateLimit).toHaveBeenCalledWith(
                'controller:user:passwordResetSend', USER_ID, { limit: 3, windowSeconds: 600 }
            );
        });

        test('returns PASSWORD_RESET_RATE_LIMITED (with retryAfter) without storing or sending when the budget is spent', async () => {
            global.RedisManager.cacheCheckRateLimit.mockResolvedValue({ allowed: false, count: 4, retryAfter: 300000 });

            const result = await UserModel.issuePasswordReset(mockReq, mockUser);
            await flushDetached();

            expect(result).toEqual({ success: false, errorCode: 'PASSWORD_RESET_RATE_LIMITED', retryAfter: 300000 });
            expect(global.RedisManager.cacheSetToken).not.toHaveBeenCalled();
            expect(EmailController.sendEmailFromTranslation).not.toHaveBeenCalled();
        });

        test('skips the send limiter entirely when enforceSendLimit is false (the admin-send path)', async () => {
            global.RedisManager.cacheCheckRateLimit.mockResolvedValue({ allowed: false, count: 9, retryAfter: 300000 });

            const result = await UserModel.issuePasswordReset(mockReq, mockUser, { enforceSendLimit: false });

            expect(result).toEqual({ success: true, errorCode: null });
            expect(global.RedisManager.cacheCheckRateLimit).not.toHaveBeenCalledWith(
                'controller:user:passwordResetSend', expect.anything(), expect.anything()
            );
            expect(global.RedisManager.cacheSetToken).toHaveBeenCalled();
        });

        test('mails model.user.passwordReset with a link pointing at the reset PAGE, so a scanner prefetch cannot consume the token', async () => {
            await UserModel.issuePasswordReset(mockReq, mockUser);
            await flushDetached();

            expect(EmailController.sendEmailFromTranslation).toHaveBeenCalledWith(mockReq, expect.objectContaining({
                user: mockUser,
                key: 'model.user.passwordReset',
                context: expect.objectContaining({
                    firstName: 'Pat',
                    resetUrl: expect.stringMatching(
                        new RegExp(`^https://example\\.com/auth/reset-password\\.shtml\\?token=${USER_ID}\\.`)
                    )
                })
            }));
        });

        test('resolves before the mail is sent - awaiting SMTP would make an existing account answer measurably slower than a nonexistent one', async () => {
            const result = await UserModel.issuePasswordReset(mockReq, mockUser);

            expect(result).toEqual({ success: true, errorCode: null });
            expect(EmailController.sendEmailFromTranslation).not.toHaveBeenCalled();

            await flushDetached();
            expect(EmailController.sendEmailFromTranslation).toHaveBeenCalled();
        });

        test('a send failure is logged but never rejects - the stored token stays valid and the user can retry', async () => {
            EmailController.sendEmailFromTranslation.mockResolvedValue(
                { success: false, errorCode: 'SEND_FAILED', error: 'no smtp' }
            );

            const result = await UserModel.issuePasswordReset(mockReq, mockUser);
            await flushDetached();

            expect(result.success).toBe(true);
            expect(global.LogController.logError).toHaveBeenCalledWith(
                mockReq, 'user.issuePasswordReset', expect.stringContaining('failed to send')
            );
            expect(global.RedisManager.cacheDelToken).not.toHaveBeenCalled();
        });

        test('awaitSend:true surfaces SMTP failure and drops the just-stored token so nobody holds a dead link', async () => {
            EmailController.sendEmailFromTranslation.mockResolvedValue(
                { success: false, errorCode: 'SEND_FAILED', error: 'connect ECONNREFUSED 127.0.0.1:587' }
            );

            const result = await UserModel.issuePasswordReset(mockReq, mockUser, {
                enforceSendLimit: false,
                awaitSend: true
            });

            expect(result).toEqual({
                success: false,
                errorCode: 'EMAIL_SEND_FAILED',
                error: 'connect ECONNREFUSED 127.0.0.1:587'
            });
            expect(global.RedisManager.cacheDelToken).toHaveBeenCalledWith(
                'controller:user:passwordResetLink', USER_ID
            );
        });

        test('awaitSend:true returns success only after SMTP accepts the message', async () => {
            const result = await UserModel.issuePasswordReset(mockReq, mockUser, {
                enforceSendLimit: false,
                awaitSend: true
            });

            expect(result).toEqual({ success: true, errorCode: null });
            expect(EmailController.sendEmailFromTranslation).toHaveBeenCalled();
            expect(global.RedisManager.cacheDelToken).not.toHaveBeenCalled();
        });
    });

    describe('verifyPasswordResetToken() - read-only probe', () => {
        test('rejects a malformed token without touching Redis', async () => {
            const result = await UserModel.verifyPasswordResetToken(mockReq, 'garbage');

            expect(result).toEqual({ valid: false, errorCode: 'PASSWORD_RESET_INVALID_TOKEN' });
            expect(global.RedisManager.cacheGetToken).not.toHaveBeenCalled();
        });

        test('rejects a token whose user ID half is not a valid ObjectId', async () => {
            const result = await UserModel.verifyPasswordResetToken(mockReq, 'not-an-id.somesecret');

            expect(result).toEqual({ valid: false, errorCode: 'PASSWORD_RESET_INVALID_TOKEN' });
            expect(global.RedisManager.cacheGetToken).not.toHaveBeenCalled();
        });

        test('reports PASSWORD_RESET_EXPIRED when nothing is stored for that user', async () => {
            const result = await UserModel.verifyPasswordResetToken(mockReq, `${USER_ID}.somesecret`);

            expect(result).toEqual({ valid: false, errorCode: 'PASSWORD_RESET_EXPIRED' });
        });

        test('reports PASSWORD_RESET_INVALID_TOKEN when the stored hash does not match the presented secret', async () => {
            global.RedisManager.cacheGetToken.mockResolvedValue(await bcrypt.hash('the-real-secret', 10));

            const result = await UserModel.verifyPasswordResetToken(mockReq, `${USER_ID}.a-guess`);

            expect(result).toEqual({ valid: false, errorCode: 'PASSWORD_RESET_INVALID_TOKEN' });
        });

        test('accepts a matching token and, crucially, does NOT consume it - a reload must not destroy the only way in', async () => {
            global.RedisManager.cacheGetToken.mockResolvedValue(await bcrypt.hash('the-real-secret', 10));

            const first = await UserModel.verifyPasswordResetToken(mockReq, `${USER_ID}.the-real-secret`);
            const second = await UserModel.verifyPasswordResetToken(mockReq, `${USER_ID}.the-real-secret`);

            expect(first).toEqual({ valid: true, errorCode: null });
            expect(second).toEqual({ valid: true, errorCode: null });
            expect(global.RedisManager.cacheDelToken).not.toHaveBeenCalled();
        });
    });

    describe('resetPasswordByToken()', () => {
        const validSecret = 'the-real-secret';
        const validToken = `${USER_ID}.${validSecret}`;

        beforeEach(async () => {
            global.RedisManager.cacheGetToken.mockResolvedValue(await bcrypt.hash(validSecret, 10));
            jest.spyOn(UserModel, 'findById').mockResolvedValue({ ...mockUser, passwordHash: 'old-hash' });
            jest.spyOn(UserModel, 'updateById').mockImplementation((id, data) =>
                Promise.resolve({ ...mockUser, ...data, passwordHash: 'new-hash' })
            );
        });

        test('bounds guessing: checks the 5-per-15-minutes attempt limiter before comparing the secret', async () => {
            await UserModel.resetPasswordByToken(mockReq, validToken, 'a-good-password');

            expect(global.RedisManager.cacheCheckRateLimit).toHaveBeenCalledWith(
                'controller:user:passwordResetAttempt', USER_ID, { limit: 5, windowSeconds: 900 }
            );
        });

        test('returns PASSWORD_RESET_RATE_LIMITED once the attempt budget is spent, without writing anything', async () => {
            global.RedisManager.cacheCheckRateLimit.mockResolvedValue({ allowed: false, count: 6, retryAfter: 900000 });

            const result = await UserModel.resetPasswordByToken(mockReq, validToken, 'a-good-password');

            expect(result).toEqual(expect.objectContaining({
                success: false, errorCode: 'PASSWORD_RESET_RATE_LIMITED', retryAfter: 900000
            }));
            expect(UserModel.updateById).not.toHaveBeenCalled();
        });

        test('rejects a wrong secret without writing anything', async () => {
            const result = await UserModel.resetPasswordByToken(mockReq, `${USER_ID}.wrong`, 'a-good-password');

            expect(result).toEqual(expect.objectContaining({ success: false, errorCode: 'PASSWORD_RESET_INVALID_TOKEN' }));
            expect(UserModel.updateById).not.toHaveBeenCalled();
        });

        test('a too-short password fails the policy WITHOUT consuming the token, so the same link still works', async () => {
            const result = await UserModel.resetPasswordByToken(mockReq, validToken, 'short');

            expect(result).toEqual(expect.objectContaining({ success: false, errorCode: 'PASSWORD_POLICY_ERROR' }));
            expect(UserModel.updateById).not.toHaveBeenCalled();
            expect(global.RedisManager.cacheDelToken).not.toHaveBeenCalled();
        });

        test('writes the new password, sets hasLocalPassword, and flips emailVerified with a stamped date', async () => {
            const result = await UserModel.resetPasswordByToken(mockReq, validToken, 'a-good-password');

            // Assert errorCode too: a missing passwordPolicy in appConfig used to throw TypeError
            // inside validatePassword(), which this method swallowed as PASSWORD_POLICY_ERROR -
            // success:false with no update, green locally (full .jpulse/app.json) and red on CI.
            expect(result).toEqual(expect.objectContaining({ success: true, errorCode: null }));
            expect(UserModel.updateById).toHaveBeenCalledWith(USER_ID, expect.objectContaining({
                password: 'a-good-password',
                hasLocalPassword: true,
                emailVerified: true,
                emailVerifiedAt: expect.any(Date),
                updatedBy: 'pruser'
            }));
        });

        test('consumes the token on success, so the link is single-use', async () => {
            await UserModel.resetPasswordByToken(mockReq, validToken, 'a-good-password');

            expect(global.RedisManager.cacheDelToken).toHaveBeenCalledWith(
                'controller:user:passwordResetLink', USER_ID
            );
        });

        test('returns the updated user without the password hash', async () => {
            const result = await UserModel.resetPasswordByToken(mockReq, validToken, 'a-good-password');

            expect(result.user).toEqual(expect.objectContaining({ username: 'pruser' }));
            expect(result.user).not.toHaveProperty('passwordHash');
        });

        test('mechanism only: a suspended account is still reset here - eligibility is the controller\'s call, not the model\'s', async () => {
            UserModel.findById.mockResolvedValue({ ...mockUser, status: 'suspended', hasLocalPassword: false });

            const result = await UserModel.resetPasswordByToken(mockReq, validToken, 'a-good-password');

            expect(result.success).toBe(true);
        });
    });

    describe('invalidatePasswordReset()', () => {
        test('drops the stored token - public because every other password-write path calls it', async () => {
            await UserModel.invalidatePasswordReset(USER_ID);

            expect(global.RedisManager.cacheDelToken).toHaveBeenCalledWith(
                'controller:user:passwordResetLink', USER_ID
            );
        });
    });

    describe('notice mails', () => {
        test('sendPasswordResetSsoNotice() mails the explainer with a login URL and no credential', async () => {
            await UserModel.sendPasswordResetSsoNotice(mockReq, mockUser);

            expect(EmailController.sendEmailFromTranslation).toHaveBeenCalledWith(mockReq, expect.objectContaining({
                user: mockUser,
                key: 'model.user.passwordResetSso',
                context: expect.objectContaining({ loginUrl: 'https://example.com/auth/login.shtml' })
            }));
            const [, options] = EmailController.sendEmailFromTranslation.mock.calls[0];
            expect(JSON.stringify(options.context)).not.toContain('token');
        });

        test('sendPasswordChangedNotice() mails the after-the-fact alert', async () => {
            await UserModel.sendPasswordChangedNotice(mockReq, mockUser);

            expect(EmailController.sendEmailFromTranslation).toHaveBeenCalledWith(mockReq, expect.objectContaining({
                user: mockUser,
                key: 'model.user.passwordChanged'
            }));
        });

        test('neither notice throws when the send fails - they are courtesies, not blocking controls', async () => {
            EmailController.sendEmailFromTranslation.mockRejectedValue(new Error('smtp exploded'));

            await expect(UserModel.sendPasswordResetSsoNotice(mockReq, mockUser)).resolves.toBeUndefined();
            await expect(UserModel.sendPasswordChangedNotice(mockReq, mockUser)).resolves.toBeUndefined();
        });
    });
});

// EOF webapp/tests/unit/model/user-password-reset.test.js
