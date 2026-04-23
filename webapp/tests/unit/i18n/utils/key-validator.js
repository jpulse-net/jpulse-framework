/**
 * @name            jPulse Framework / WebApp / Tests / Unit / I18N / Utils / Key Validator
 * @tagline         Validate translation keys against reference
 * @description     Utility to compare key sets and identify missing/extra keys
 * @file            webapp/tests/unit/i18n/utils/key-validator.js
 * @version         1.6.45
 * @release         2026-04-23
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

/**
 * Validate keys against reference translation file
 * @param {string[]} referenceKeys - Reference keys (from en.conf)
 * @param {string[]} targetKeys - Target keys to validate
 * @returns {object} Object with missing and extra keys
 *                   { missing: [...], extra: [...] }
 */
export function validateKeys(referenceKeys, targetKeys) {
    const referenceSet = new Set(referenceKeys);
    const targetSet = new Set(targetKeys);

    const missing = referenceKeys.filter(key => !targetSet.has(key));
    const extra = targetKeys.filter(key => !referenceSet.has(key));

    return { missing, extra };
}

/**
 * Validate a single key against reference keys.
 *
 * W-185 (v1.6.42+): in addition to exact-leaf matches, a key that is a *prefix* of one or
 * more reference keys (i.e. a subtree node) is also considered valid. This supports the
 * subtree-embedding syntax `{{i18n.path.to.subtree}}` which resolves to the full nested
 * translation object — legitimate whenever at least one leaf exists under that prefix.
 *
 * @param {string[]} referenceKeys - Reference keys (from en.conf)
 * @param {string} key - Key to validate (may be a leaf or a subtree prefix)
 * @returns {boolean} True if key exists as a leaf, or is a prefix of at least one leaf
 */
export function isValidKey(referenceKeys, key) {
    if (referenceKeys.includes(key)) {
        return true;
    }
    const prefix = key + '.';
    return referenceKeys.some(k => k.startsWith(prefix));
}

// EOF webapp/tests/unit/i18n/utils/key-validator.js
