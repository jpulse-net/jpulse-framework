/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Email From Translation
 * @tagline         Unit tests for EmailController.sendEmailFromTranslation() and _parseEmailMessage()
 * @description     Tests the unix-mail-style translation email envelope (W-205): parsing,
 *                   {{token}} substitution (including the falsy-value fix), and the
 *                   sendEmailFromTranslation() convenience method
 * @file            webapp/tests/unit/controller/email-from-translation.test.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.14, Claude Sonnet 5
 */

import { describe, test, expect, beforeAll, afterEach, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

TestUtils.setupGlobalMocksWithConsolidatedConfig();

describe('EmailController - sendEmailFromTranslation (W-205)', () => {
    let EmailController;

    beforeAll(async () => {
        EmailController = (await import('../../../controller/email.js')).default;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('i18n.substitute() falsy-value fix', () => {
        test('substitutes an empty string instead of leaving the literal {{token}}', () => {
            expect(global.i18n.substitute('Hi {{firstName}},', { firstName: '' })).toBe('Hi ,');
        });

        test('substitutes 0 instead of leaving the literal {{token}}', () => {
            expect(global.i18n.substitute('Count: {{count}}', { count: 0 })).toBe('Count: 0');
        });

        test('leaves an unknown token untouched', () => {
            expect(global.i18n.substitute('Hi {{unknown}},', {})).toBe('Hi {{unknown}},');
        });
    });

    describe('_parseEmailMessage()', () => {
        test('parses a Subject header and body separated by a blank line', () => {
            const message = 'Subject: Hello\n\nLine one\nLine two';
            expect(EmailController._parseEmailMessage(message)).toEqual({
                headers: { Subject: 'Hello' },
                body: 'Line one\nLine two'
            });
        });

        test('parses To/Cc/Bcc/Reply-To/From alongside Subject', () => {
            const message = 'Subject: Hello\n' +
                'To: recipient@example.com\n' +
                'Cc: cc@example.com\n' +
                'Bcc: bcc@example.com\n' +
                'Reply-To: reply@example.com\n' +
                'From: "Sender" <sender@example.com>\n' +
                '\n' +
                'Body text';
            expect(EmailController._parseEmailMessage(message)).toEqual({
                headers: {
                    Subject: 'Hello',
                    To: 'recipient@example.com',
                    Cc: 'cc@example.com',
                    Bcc: 'bcc@example.com',
                    'Reply-To': 'reply@example.com',
                    From: '"Sender" <sender@example.com>'
                },
                body: 'Body text'
            });
        });

        test('matches header names case-insensitively and normalizes them', () => {
            const message = 'subject: Hello\nREPLY-TO: reply@example.com\n\nBody';
            const parsed = EmailController._parseEmailMessage(message);
            expect(parsed.headers.Subject).toBe('Hello');
            expect(parsed.headers['Reply-To']).toBe('reply@example.com');
        });

        test('preserves {{token}} placeholders unsubstituted (parsing happens before substitution)', () => {
            const message = 'Subject: Confirm {{siteName}}\n\nHi {{firstName}},\n\n{{verifyUrl}}';
            const parsed = EmailController._parseEmailMessage(message);
            expect(parsed.headers.Subject).toBe('Confirm {{siteName}}');
            expect(parsed.body).toBe('Hi {{firstName}},\n\n{{verifyUrl}}');
        });

        test('throws when the blank-line separator is missing', () => {
            expect(() => EmailController._parseEmailMessage('Subject: Hello\nNo blank line here'))
                .toThrow(/blank line/);
        });

        test('throws on an unsupported header', () => {
            expect(() => EmailController._parseEmailMessage('Subject: Hello\nX-Custom: evil\n\nBody'))
                .toThrow(/Unsupported email header/);
        });

        test('throws on a malformed header line', () => {
            expect(() => EmailController._parseEmailMessage('Not a header line\n\nBody'))
                .toThrow(/Invalid email header line/);
        });

        test('throws when the required Subject header is missing', () => {
            // No header lines at all -> falls straight into the "missing Subject" case
            expect(() => EmailController._parseEmailMessage('\n\nJust a body')).toThrow(/Subject/);
        });
    });

    describe('sendEmailFromTranslation()', () => {
        test('fails with MISSING_FIELDS when key is missing', async () => {
            const result = await EmailController.sendEmailFromTranslation(null, { to: 'a@example.com' });
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('MISSING_FIELDS');
        });

        test('fails with MISSING_FIELDS when neither user nor to is given', async () => {
            const result = await EmailController.sendEmailFromTranslation(null, { key: 'model.user.emailVerify' });
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('MISSING_FIELDS');
        });

        test('fails with TEMPLATE_ERROR when the translation key does not exist', async () => {
            const result = await EmailController.sendEmailFromTranslation(null, {
                to: 'a@example.com',
                key: 'model.user.doesNotExist'
            });
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('TEMPLATE_ERROR');
        });

        test('resolves subject/text from a real translation key and substitutes context', async () => {
            jest.spyOn(EmailController, 'sendEmail').mockResolvedValue({
                success: true, messageId: 'msg-1', errorCode: null, error: null
            });

            const result = await EmailController.sendEmailFromTranslation(null, {
                to: 'user@example.com',
                key: 'model.user.emailVerify',
                context: { firstName: 'Jane', verifyUrl: 'https://example.com/verify', code: '123456' }
            });

            expect(result.success).toBe(true);
            expect(EmailController.sendEmail).toHaveBeenCalledTimes(1);
            const sentOptions = EmailController.sendEmail.mock.calls[0][0];
            expect(sentOptions.to).toBe('user@example.com');
            expect(sentOptions.subject).toBe('Confirm your email address');
            expect(sentOptions.text).toContain('Hi Jane,');
            expect(sentOptions.text).toContain('https://example.com/verify');
            expect(sentOptions.text).toContain('123456');
            expect(sentOptions.text).not.toContain('{{');
        });

        test('substitutes an empty firstName as blank rather than leaving {{firstName}} (regression)', async () => {
            jest.spyOn(EmailController, 'sendEmail').mockResolvedValue({
                success: true, messageId: 'msg-2', errorCode: null, error: null
            });

            await EmailController.sendEmailFromTranslation(null, {
                to: 'user@example.com',
                key: 'model.user.emailVerify',
                context: { firstName: '', verifyUrl: 'https://example.com/verify', code: '000000' }
            });

            const sentOptions = EmailController.sendEmail.mock.calls[0][0];
            expect(sentOptions.text).toContain('Hi ,');
            expect(sentOptions.text).not.toContain('{{firstName}}');
        });

        test('uses options.to over options.user.email when both are given, but user\'s language for translation', async () => {
            jest.spyOn(EmailController, 'sendEmail').mockResolvedValue({
                success: true, messageId: 'msg-3', errorCode: null, error: null
            });

            const user = { email: 'new@example.com', preferences: { language: 'de' } };
            await EmailController.sendEmailFromTranslation(null, {
                user,
                to: 'old@example.com',
                key: 'model.user.emailChangedAlert',
                context: { firstName: 'Hans', maskedNewEmail: 'ne***@example.com' }
            });

            const sentOptions = EmailController.sendEmail.mock.calls[0][0];
            expect(sentOptions.to).toBe('old@example.com');
            // German translation body starts with "Hallo" instead of English "Hi"
            expect(sentOptions.text).toContain('Hallo Hans,');
        });

        test('falls back to options.user.email when options.to is not given', async () => {
            jest.spyOn(EmailController, 'sendEmail').mockResolvedValue({
                success: true, messageId: 'msg-4', errorCode: null, error: null
            });

            const user = { email: 'user@example.com', preferences: { language: 'en' } };
            await EmailController.sendEmailFromTranslation(null, {
                user,
                key: 'model.user.emailChangedNotice',
                context: { firstName: 'Bob' }
            });

            const sentOptions = EmailController.sendEmail.mock.calls[0][0];
            expect(sentOptions.to).toBe('user@example.com');
            expect(sentOptions.text).toContain('Hi Bob,');
        });

        test('fails with MISSING_FIELDS when no options.to, no translation To: header, and no user', async () => {
            // model.user.emailVerify defines no To: header, so with neither options.to nor
            // options.user there is genuinely no recipient anywhere
            const result = await EmailController.sendEmailFromTranslation(null, {
                key: 'model.user.emailVerify'
            });
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('MISSING_FIELDS');
        });

        test('a translation-defined To: header supplies the recipient when neither options.to nor options.user is given', async () => {
            jest.spyOn(global.i18n, 'translateForUser').mockReturnValue(
                'Subject: Digest\nTo: digest@example.com\n\nBody'
            );
            jest.spyOn(EmailController, 'sendEmail').mockResolvedValue({
                success: true, messageId: 'msg-5', errorCode: null, error: null
            });

            const result = await EmailController.sendEmailFromTranslation(null, { key: 'model.some.digest' });

            expect(result.success).toBe(true);
            expect(EmailController.sendEmail.mock.calls[0][0].to).toBe('digest@example.com');
        });

        test('options.to overrides a translation-defined To: header', async () => {
            jest.spyOn(global.i18n, 'translateForUser').mockReturnValue(
                'Subject: Digest\nTo: digest@example.com\n\nBody'
            );
            jest.spyOn(EmailController, 'sendEmail').mockResolvedValue({
                success: true, messageId: 'msg-6', errorCode: null, error: null
            });

            await EmailController.sendEmailFromTranslation(null, {
                key: 'model.some.digest',
                to: 'override@example.com'
            });

            expect(EmailController.sendEmail.mock.calls[0][0].to).toBe('override@example.com');
        });

        test('options.cc/bcc/replyTo/from override the translation-defined headers', async () => {
            jest.spyOn(global.i18n, 'translateForUser').mockReturnValue(
                'Subject: Digest\n' +
                'Cc: default-cc@example.com\n' +
                'Bcc: default-bcc@example.com\n' +
                'Reply-To: default-reply@example.com\n' +
                'From: "Default" <default@example.com>\n' +
                '\n' +
                'Body'
            );
            jest.spyOn(EmailController, 'sendEmail').mockResolvedValue({
                success: true, messageId: 'msg-7', errorCode: null, error: null
            });

            await EmailController.sendEmailFromTranslation(null, {
                to: 'user@example.com',
                key: 'model.some.digest',
                cc: 'override-cc@example.com',
                bcc: 'override-bcc@example.com',
                replyTo: 'override-reply@example.com',
                from: 'override@example.com'
            });

            const sentOptions = EmailController.sendEmail.mock.calls[0][0];
            expect(sentOptions.cc).toBe('override-cc@example.com');
            expect(sentOptions.bcc).toBe('override-bcc@example.com');
            expect(sentOptions.replyTo).toBe('override-reply@example.com');
            expect(sentOptions.from).toBe('override@example.com');
        });

        test('falls back to the translation-defined Cc/Bcc/Reply-To/From headers when no override option is given', async () => {
            jest.spyOn(global.i18n, 'translateForUser').mockReturnValue(
                'Subject: Digest\n' +
                'Cc: default-cc@example.com\n' +
                'Bcc: default-bcc@example.com\n' +
                'Reply-To: default-reply@example.com\n' +
                'From: "Default" <default@example.com>\n' +
                '\n' +
                'Body'
            );
            jest.spyOn(EmailController, 'sendEmail').mockResolvedValue({
                success: true, messageId: 'msg-8', errorCode: null, error: null
            });

            await EmailController.sendEmailFromTranslation(null, {
                to: 'user@example.com',
                key: 'model.some.digest'
            });

            const sentOptions = EmailController.sendEmail.mock.calls[0][0];
            expect(sentOptions.cc).toBe('default-cc@example.com');
            expect(sentOptions.bcc).toBe('default-bcc@example.com');
            expect(sentOptions.replyTo).toBe('default-reply@example.com');
            expect(sentOptions.from).toBe('"Default" <default@example.com>');
        });
    });

    describe('Real translation content is parseable (en + de)', () => {
        const keys = ['model.user.emailVerify', 'model.user.emailChangedNotice', 'model.user.emailChangedAlert'];

        test.each(keys)('%s parses with a Subject header in English', (key) => {
            const raw = global.i18n.translateForUser({ preferences: { language: 'en' } }, key, {});
            expect(raw).not.toBe(key); // key must resolve, not fall through to the keyPath fallback
            const parsed = EmailController._parseEmailMessage(raw);
            expect(parsed.headers.Subject.length).toBeGreaterThan(0);
            expect(parsed.body.length).toBeGreaterThan(0);
        });

        test.each(keys)('%s parses with a Subject header in German', (key) => {
            const raw = global.i18n.translateForUser({ preferences: { language: 'de' } }, key, {});
            expect(raw).not.toBe(key);
            const parsed = EmailController._parseEmailMessage(raw);
            expect(parsed.headers.Subject.length).toBeGreaterThan(0);
            expect(parsed.body.length).toBeGreaterThan(0);
        });
    });
});

// EOF webapp/tests/unit/controller/email-from-translation.test.js
