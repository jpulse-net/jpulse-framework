/**
 * @name            jPulse Framework / WebApp / Utils / CryptoSecrets
 * @tagline         Shared at-rest encryption helper for plugin-stored secrets
 * @description     Generic AES-256-GCM encrypt/decrypt helper for secrets that plugins need to
 *                   persist at rest (OAuth client secrets, API keys, etc.). Derives its key from
 *                   the app's session secret via scrypt, with a caller-supplied salt so different
 *                   secret classes (e.g. different plugins) don't share a derived key. Introduced
 *                   during W-196 (auth-oauth plugin) because no shared framework encryption
 *                   utility existed - auth-mfa (a separate plugin) duplicates the same
 *                   AES-256-GCM + scrypt pattern inline in its own model for TOTP secrets; it is
 *                   left as-is (not retrofitted onto this util) to avoid touching a shipped,
 *                   independently-versioned plugin as a side effect of this work item.
 * @file            webapp/utils/crypto-secrets.js
 * @version         1.7.1
 * @release         2026-07-26
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.12, Claude Sonnet 5
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const DEFAULT_SECRET = 'jpulse-default-secret-change-me';

/**
 * Derive a symmetric key from the app's session secret and a caller-supplied salt.
 * Different salts (e.g. one per plugin, or one per secret class within a plugin)
 * derive different keys from the same underlying session secret.
 * @param {string} salt - Namespacing salt (required - callers must not share salts across secret classes)
 * @returns {Buffer} 32-byte key
 */
function deriveKey(salt) {
    if (!salt || typeof salt !== 'string') {
        throw new Error('CryptoSecrets: salt is required and must be a non-empty string');
    }
    const sessionSecret = global.appConfig?.security?.sessionSecret || DEFAULT_SECRET;
    return crypto.scryptSync(sessionSecret, salt, KEY_LENGTH);
}

/**
 * Encrypt a plaintext secret for storage at rest.
 * @param {string} plaintext - Secret value to encrypt (e.g. an OAuth client secret)
 * @param {string} salt - Namespacing salt (e.g. 'oauth-provider-salt')
 * @returns {string} base64-encoded payload: iv + authTag + ciphertext
 */
export function encryptSecret(plaintext, salt) {
    if (typeof plaintext !== 'string' || plaintext.length === 0) {
        throw new Error('CryptoSecrets.encryptSecret: plaintext must be a non-empty string');
    }
    const key = deriveKey(salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt a secret previously encrypted with encryptSecret() using the same salt.
 * @param {string} ciphertext - base64 payload produced by encryptSecret()
 * @param {string} salt - Same namespacing salt used at encryption time
 * @returns {string} Decrypted plaintext
 */
export function decryptSecret(ciphertext, salt) {
    if (typeof ciphertext !== 'string' || ciphertext.length === 0) {
        throw new Error('CryptoSecrets.decryptSecret: ciphertext must be a non-empty string');
    }
    const key = deriveKey(salt);
    const buf = Buffer.from(ciphertext, 'base64');
    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('CryptoSecrets.decryptSecret: ciphertext is too short to contain iv + authTag');
    }
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export default { encryptSecret, decryptSecret };

// EOF webapp/utils/crypto-secrets.js
