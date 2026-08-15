/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Model / User Email Verification
 * @tagline         Unit tests for the W-205 email verification model primitives
 * @description     Covers UserModel.hasValidEmailVerification(), issueEmailVerification(),
 *                   verifyEmailByToken(), verifyEmailByCode(), sendEmailChangedNotice(), and
 *                   sendEmailChangedAlert() - the token/code issue-verify-invalidate lifecycle,
 *                   both TTLs, both rate limiters, and the two admin-email-change notices
 * @file            webapp/tests/unit/model/user-email-verification.test.js
 * @version         1.7.15
 * @release         2026-08-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.14, Claude Sonnet 5
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import bcrypt from 'bcrypt';

describe('UserModel email verification primitives (W-205)', () => {
    let UserModel, EmailController;

    const mockReq = { protocol: 'https', get: () => 'example.com' };
    const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'evuser',
        email: 'evuser@example.com',
        profile: { firstName: 'Ev' }
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
        // Same singleton issueEmailVerification()'s dynamic import() resolves to (shared ESM
        // module registry), so spying here also intercepts the call made through that import
        jest.spyOn(EmailController, 'sendEmailFromTranslation').mockResolvedValue(
            { success: true, messageId: 'msg-1', errorCode: null, error: null }
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('hasValidEmailVerification()', () => {
        test('returns true when a link hash exists', async () => {
            global.RedisManager.cacheGetToken.mockImplementation(
                (path) => Promise.resolve(path.includes('emailVerifyLink') ? 'stored-hash' : null)
            );
            expect(await UserModel.hasValidEmailVerification(mockUser._id)).toBe(true);
        });

        test('returns true when a code hash exists', async () => {
            global.RedisManager.cacheGetToken.mockImplementation(
                (path) => Promise.resolve(path.includes('emailVerifyCode') ? 'stored-hash' : null)
            );
            expect(await UserModel.hasValidEmailVerification(mockUser._id)).toBe(true);
        });

        test('returns false when neither exists', async () => {
            expect(await UserModel.hasValidEmailVerification(mockUser._id)).toBe(false);
        });
    });

    describe('issueEmailVerification()', () => {
        test('returns EMAIL_VERIFY_RATE_LIMITED (with retryAfter) without storing or sending, when the send limiter rejects', async () => {
            global.RedisManager.cacheCheckRateLimit.mockResolvedValue({ allowed: false, count: 4, retryAfter: 300 });

            const result = await UserModel.issueEmailVerification(mockReq, mockUser);

            expect(result).toEqual({ success: false, errorCode: 'EMAIL_VERIFY_RATE_LIMITED', retryAfter: 300 });
            expect(global.RedisManager.cacheSetToken).not.toHaveBeenCalled();
            expect(EmailController.sendEmailFromTranslation).not.toHaveBeenCalled();
        });

        test('rate-limits sends per account: cacheCheckRateLimit is called against controller:user:emailVerifySend, limit 3 per 10 minutes', async () => {
            await UserModel.issueEmailVerification(mockReq, mockUser);

            expect(global.RedisManager.cacheCheckRateLimit).toHaveBeenCalledWith(
                'controller:user:emailVerifySend', mockUser._id, { limit: 3, windowSeconds: 600 }
            );
        });

        test('stores a hashed link token with a 24h TTL and a hashed code with a 30m TTL', async () => {
            await UserModel.issueEmailVerification(mockReq, mockUser);

            expect(global.RedisManager.cacheSetToken).toHaveBeenCalledWith(
                'controller:user:emailVerifyLink', mockUser._id, expect.any(String), 86400
            );
            expect(global.RedisManager.cacheSetToken).toHaveBeenCalledWith(
                'controller:user:emailVerifyCode', mockUser._id, expect.any(String), 1800
            );
            // Stored values are bcrypt hashes, not the raw secret/code
            const [, , storedLinkHash] = global.RedisManager.cacheSetToken.mock.calls
                .find((call) => call[0] === 'controller:user:emailVerifyLink');
            expect(storedLinkHash).toMatch(/^\$2[aby]\$/);
        });

        test('returns success and sends via sendEmailFromTranslation with the model.user.emailVerify key, user, verifyUrl and a 6-digit code', async () => {
            const result = await UserModel.issueEmailVerification(mockReq, mockUser);

            expect(result).toEqual({ success: true, errorCode: null });
            expect(EmailController.sendEmailFromTranslation).toHaveBeenCalledWith(mockReq, expect.objectContaining({
                user: mockUser,
                key: 'model.user.emailVerify',
                context: expect.objectContaining({
                    firstName: 'Ev',
                    verifyUrl: expect.stringMatching(
                        new RegExp(`^https://example\\.com/api/1/user/email-verify/confirm\\?token=${mockUser._id}\\.`)
                    ),
                    code: expect.stringMatching(/^\d{6}$/)
                })
            }));
        });

        test('defaults firstName to an empty string when profile.firstName is absent', async () => {
            await UserModel.issueEmailVerification(mockReq, { ...mockUser, profile: {} });

            expect(EmailController.sendEmailFromTranslation.mock.calls[0][1].context.firstName).toBe('');
        });

        test('still returns success and only logs (never throws) when the send itself fails', async () => {
            EmailController.sendEmailFromTranslation.mockResolvedValue({ success: false, error: 'SMTP down' });

            const result = await UserModel.issueEmailVerification(mockReq, mockUser);

            expect(result).toEqual({ success: true, errorCode: null });
            expect(global.LogController.logError).toHaveBeenCalled();
        });
    });

    describe('verifyEmailByToken()', () => {
        beforeEach(() => {
            jest.spyOn(UserModel, 'findById').mockResolvedValue({ ...mockUser, passwordHash: 'secret-hash' });
            jest.spyOn(UserModel, 'updateById').mockResolvedValue(
                { ...mockUser, emailVerified: true, emailVerifiedAt: new Date() }
            );
        });

        test('rejects a token with no dot separator', async () => {
            const result = await UserModel.verifyEmailByToken(mockReq, 'not-a-valid-token');
            expect(result).toEqual({ success: false, errorCode: 'EMAIL_VERIFY_INVALID_TOKEN', user: null });
        });

        test('rejects a token whose user-id prefix is not a valid ObjectId', async () => {
            const result = await UserModel.verifyEmailByToken(mockReq, 'not-an-object-id.somesecret');
            expect(result.errorCode).toBe('EMAIL_VERIFY_INVALID_TOKEN');
        });

        test('rejects a token with an empty secret', async () => {
            const result = await UserModel.verifyEmailByToken(mockReq, `${mockUser._id}.`);
            expect(result.errorCode).toBe('EMAIL_VERIFY_INVALID_TOKEN');
        });

        test('returns EMAIL_VERIFY_EXPIRED when no link hash is stored (already used, or TTL expired)', async () => {
            const result = await UserModel.verifyEmailByToken(mockReq, `${mockUser._id}.somesecret`);
            expect(result).toEqual({ success: false, errorCode: 'EMAIL_VERIFY_EXPIRED', user: null });
        });

        test('rejects a wrong secret compared against a real stored hash', async () => {
            global.RedisManager.cacheGetToken.mockResolvedValue(await bcrypt.hash('the-real-secret', 10));

            const result = await UserModel.verifyEmailByToken(mockReq, `${mockUser._id}.wrong-secret`);

            expect(result.errorCode).toBe('EMAIL_VERIFY_INVALID_TOKEN');
        });

        test('completes verification on a matching secret: flips the flag, stamps emailVerifiedAt, strips passwordHash', async () => {
            global.RedisManager.cacheGetToken.mockResolvedValue(await bcrypt.hash('the-real-secret', 10));

            const result = await UserModel.verifyEmailByToken(mockReq, `${mockUser._id}.the-real-secret`);

            expect(result.success).toBe(true);
            expect(UserModel.updateById).toHaveBeenCalledWith(
                mockUser._id, { emailVerified: true, emailVerifiedAt: expect.any(Date) }
            );
            expect(result.user.passwordHash).toBeUndefined();
        });

        test('invalidates both the link and the code credential on success (either one satisfies verification)', async () => {
            global.RedisManager.cacheGetToken.mockResolvedValue(await bcrypt.hash('the-real-secret', 10));

            await UserModel.verifyEmailByToken(mockReq, `${mockUser._id}.the-real-secret`);

            expect(global.RedisManager.cacheDelToken).toHaveBeenCalledWith('controller:user:emailVerifyLink', mockUser._id);
            expect(global.RedisManager.cacheDelToken).toHaveBeenCalledWith('controller:user:emailVerifyCode', mockUser._id);
        });

        test('returns EMAIL_VERIFY_INVALID_TOKEN when the account no longer exists by the time the link is clicked', async () => {
            global.RedisManager.cacheGetToken.mockResolvedValue(await bcrypt.hash('the-real-secret', 10));
            UserModel.findById.mockResolvedValue(null);

            const result = await UserModel.verifyEmailByToken(mockReq, `${mockUser._id}.the-real-secret`);

            expect(result).toEqual({ success: false, errorCode: 'EMAIL_VERIFY_INVALID_TOKEN', user: null });
        });
    });

    describe('verifyEmailByCode()', () => {
        beforeEach(() => {
            jest.spyOn(UserModel, 'findById').mockResolvedValue({ ...mockUser, passwordHash: 'secret-hash' });
            jest.spyOn(UserModel, 'updateById').mockResolvedValue(
                { ...mockUser, emailVerified: true, emailVerifiedAt: new Date() }
            );
        });

        test('rate-limits attempts per account: cacheCheckRateLimit is called against controller:user:emailVerifyAttempt, limit 5 per 15 minutes', async () => {
            await UserModel.verifyEmailByCode(mockReq, mockUser._id, '000000');

            expect(global.RedisManager.cacheCheckRateLimit).toHaveBeenCalledWith(
                'controller:user:emailVerifyAttempt', mockUser._id, { limit: 5, windowSeconds: 900 }
            );
        });

        test('returns EMAIL_VERIFY_RATE_LIMITED (with retryAfter) before even reading the stored code, once the limiter rejects', async () => {
            global.RedisManager.cacheCheckRateLimit.mockResolvedValue({ allowed: false, count: 6, retryAfter: 120 });

            const result = await UserModel.verifyEmailByCode(mockReq, mockUser._id, '123456');

            expect(result).toEqual({ success: false, errorCode: 'EMAIL_VERIFY_RATE_LIMITED', retryAfter: 120, user: null });
            expect(global.RedisManager.cacheGetToken).not.toHaveBeenCalled();
        });

        test('returns EMAIL_VERIFY_EXPIRED when no code hash is stored', async () => {
            const result = await UserModel.verifyEmailByCode(mockReq, mockUser._id, '123456');
            expect(result).toEqual({ success: false, errorCode: 'EMAIL_VERIFY_EXPIRED', user: null });
        });

        test('rejects a wrong code compared against a real stored hash', async () => {
            global.RedisManager.cacheGetToken.mockResolvedValue(await bcrypt.hash('000000', 10));

            const result = await UserModel.verifyEmailByCode(mockReq, mockUser._id, '111111');

            expect(result).toEqual({ success: false, errorCode: 'EMAIL_VERIFY_INVALID_CODE', user: null });
        });

        test('completes verification on a matching code', async () => {
            global.RedisManager.cacheGetToken.mockResolvedValue(await bcrypt.hash('000000', 10));

            const result = await UserModel.verifyEmailByCode(mockReq, mockUser._id, '000000');

            expect(result.success).toBe(true);
            expect(UserModel.updateById).toHaveBeenCalledWith(
                mockUser._id, { emailVerified: true, emailVerifiedAt: expect.any(Date) }
            );
        });

        test('code is compared as a string, so a numeric code argument still matches', async () => {
            global.RedisManager.cacheGetToken.mockResolvedValue(await bcrypt.hash('123456', 10));

            const result = await UserModel.verifyEmailByCode(mockReq, mockUser._id, 123456);

            expect(result.success).toBe(true);
        });
    });

    describe('sendEmailChangedNotice() / sendEmailChangedAlert()', () => {
        test('sendEmailChangedNotice sends to the user (new address) with the emailChangedNotice key', async () => {
            await UserModel.sendEmailChangedNotice(mockReq, mockUser);

            expect(EmailController.sendEmailFromTranslation).toHaveBeenCalledWith(mockReq, expect.objectContaining({
                user: mockUser,
                key: 'model.user.emailChangedNotice',
                context: expect.objectContaining({ firstName: 'Ev' })
            }));
        });

        test('sendEmailChangedAlert sends to the OLD address (options.to) but still resolves language from the (new) user document', async () => {
            await UserModel.sendEmailChangedAlert(mockReq, mockUser, 'old@example.com');

            expect(EmailController.sendEmailFromTranslation).toHaveBeenCalledWith(mockReq, expect.objectContaining({
                user: mockUser,
                to: 'old@example.com',
                key: 'model.user.emailChangedAlert',
                context: expect.objectContaining({ firstName: 'Ev', maskedNewEmail: expect.any(String) })
            }));
        });

        test('neither notice nor alert throws when the send itself fails - both are courtesy, non-blocking mail', async () => {
            EmailController.sendEmailFromTranslation.mockResolvedValue({ success: false, error: 'SMTP down' });

            await expect(UserModel.sendEmailChangedNotice(mockReq, mockUser)).resolves.toBeUndefined();
            await expect(UserModel.sendEmailChangedAlert(mockReq, mockUser, 'old@example.com')).resolves.toBeUndefined();
            expect(global.LogController.logError).toHaveBeenCalledTimes(2);
        });
    });
});

// EOF webapp/tests/unit/model/user-email-verification.test.js
