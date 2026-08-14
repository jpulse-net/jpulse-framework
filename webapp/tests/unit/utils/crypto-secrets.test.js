/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / CryptoSecrets
 * @tagline         Unit tests for the shared at-rest secret encryption helper (W-196)
 * @description     Round-trip, salt-namespacing, and tamper-detection tests for
 *                   encryptSecret()/decryptSecret()
 * @file            webapp/tests/unit/utils/crypto-secrets.test.js
 * @version         1.7.14
 * @release         2026-08-14
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.12, Claude Sonnet 5
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { encryptSecret, decryptSecret } from '../../../utils/crypto-secrets.js';

// W-196: shared secret encryption helper, added because no such utility existed before
// the auth-oauth plugin needed one to store OAuth client secrets at rest
describe('crypto-secrets (W-196)', () => {
    const originalAppConfig = global.appConfig;

    beforeEach(() => {
        global.appConfig = { security: { sessionSecret: 'test-session-secret-for-unit-tests' } };
    });

    afterEach(() => {
        global.appConfig = originalAppConfig;
    });

    test('round-trips a plaintext secret through encrypt then decrypt', () => {
        const plaintext = 'super-secret-oauth-client-secret-value';
        const encrypted = encryptSecret(plaintext, 'oauth-provider-salt');

        expect(encrypted).not.toBe(plaintext);
        expect(typeof encrypted).toBe('string');
        expect(decryptSecret(encrypted, 'oauth-provider-salt')).toBe(plaintext);
    });

    test('produces different ciphertext each time (random iv) for the same plaintext', () => {
        const plaintext = 'same-secret-both-times';
        const first = encryptSecret(plaintext, 'oauth-provider-salt');
        const second = encryptSecret(plaintext, 'oauth-provider-salt');

        expect(first).not.toBe(second);
        expect(decryptSecret(first, 'oauth-provider-salt')).toBe(plaintext);
        expect(decryptSecret(second, 'oauth-provider-salt')).toBe(plaintext);
    });

    test('fails to decrypt when the salt does not match the one used to encrypt', () => {
        const encrypted = encryptSecret('some-secret', 'oauth-provider-salt');
        expect(() => decryptSecret(encrypted, 'a-different-salt')).toThrow();
    });

    test('fails to decrypt tampered ciphertext (auth tag mismatch)', () => {
        const encrypted = encryptSecret('some-secret', 'oauth-provider-salt');
        const buf = Buffer.from(encrypted, 'base64');
        buf[buf.length - 1] ^= 0xff; // flip a byte in the ciphertext
        const tampered = buf.toString('base64');

        expect(() => decryptSecret(tampered, 'oauth-provider-salt')).toThrow();
    });

    test('falls back to a default derivation base when sessionSecret is not configured', () => {
        global.appConfig = {};
        const plaintext = 'fallback-path-secret';
        const encrypted = encryptSecret(plaintext, 'oauth-provider-salt');

        expect(decryptSecret(encrypted, 'oauth-provider-salt')).toBe(plaintext);
    });

    test('rejects empty plaintext', () => {
        expect(() => encryptSecret('', 'oauth-provider-salt')).toThrow();
    });

    test('rejects a missing salt', () => {
        expect(() => encryptSecret('some-secret', '')).toThrow();
        expect(() => encryptSecret('some-secret', undefined)).toThrow();
    });

    test('rejects decrypting a too-short/invalid ciphertext', () => {
        expect(() => decryptSecret(Buffer.from('x').toString('base64'), 'oauth-provider-salt')).toThrow();
    });
});

// EOF webapp/tests/unit/utils/crypto-secrets.test.js
