/**
 * @name            jPulse Framework / WebApp / Tests / Unit / I18N / Utils / Key Validator
 * @tagline         Validate translation keys against reference
 * @description     Utility to compare key sets and identify missing/extra keys
 * @file            webapp/tests/unit/i18n/utils/key-validator.js
 * @version         1.6.0
 * @release         2026-01-27
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
 * Validate a single key against reference keys
 * @param {string[]} referenceKeys - Reference keys (from en.conf)
 * @param {string} key - Key to validate
 * @returns {boolean} True if key exists in reference
 */
export function isValidKey(referenceKeys, key) {
    return referenceKeys.includes(key);
}

// EOF webapp/tests/unit/i18n/utils/key-validator.js
