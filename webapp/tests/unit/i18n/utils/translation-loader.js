/**
 * @name            jPulse Framework / WebApp / Tests / Unit / I18N / Utils / Translation Loader
 * @tagline         Load, parse, and flatten translation .conf files to sorted key arrays
 * @description     Utility to load translation files and flatten them to dot-notation key arrays
 * @file            webapp/tests/unit/i18n/utils/translation-loader.js
 * @version         1.6.10
 * @release         2026-02-07
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// Get utility file name for warning messages
const UTILITY_FILE = 'webapp/tests/unit/i18n/utils/translation-loader.js';

/**
 * Recursively flatten nested object to dot-notation paths
 * @param {object} obj - Object to flatten
 * @param {string} prefix - Current path prefix
 * @returns {string[]} Array of dot-notation paths
 */
function flattenKeys(obj, prefix = '') {
    const paths = [];
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const currentPath = prefix ? `${prefix}.${key}` : key;
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                // It's a nested object, get its paths
                paths.push(...flattenKeys(obj[key], currentPath));
            } else {
                // It's a leaf value
                paths.push(currentPath);
            }
        }
    }
    return paths;
}

/**
 * Load and parse a single translation .conf file
 * @param {string} filePath - Path to the .conf file
 * @returns {object|null} Object with language code as key and flattened sorted key array as value, or null on error
 */
export function loadTranslationFile(filePath) {
    try {
        if (!existsSync(filePath)) {
            throw new Error(`Translation file not found: ${filePath}`);
        }

        const content = readFileSync(filePath, 'utf8');

        // Safely evaluate the translation file content (same approach as webapp/utils/i18n.js)
        const fn = new Function(`return (
            ${content}
        )`); // extra newlines in case content ends in a // comment
        const obj = fn();
        const lang = Object.keys(obj)[0];

        if (!lang || !obj[lang]) {
            throw new Error(`Invalid structure in ${filePath}: missing language code`);
        }

        // Extract language data (remove top-level wrapper)
        const langData = obj[lang];

        // Flatten to dot-notation paths
        const keys = flattenKeys(langData);

        // Sort alphabetically for consistent comparison
        keys.sort();

        return { [lang]: keys };
    } catch (error) {
        throw new Error(`Error loading translation file ${filePath}: ${error.message}`);
    }
}

/**
 * Load all translation .conf files from a directory
 * @param {string} translationsDir - Directory containing translation files
 * @returns {object} Object with language codes as keys and flattened sorted key arrays as values
 *                   Example: { en: ['controller.auth.loginDisabled', ...], de: [...] }
 */
export function loadAllTranslations(translationsDir) {
    if (!existsSync(translationsDir)) {
        throw new Error(`Translations directory not found: ${translationsDir}`);
    }

    // Read directory and filter for *.conf files
    const allFiles = readdirSync(translationsDir);
    const langFiles = allFiles
        .filter(file => file.endsWith('.conf'))
        .map(file => ({
            filePath: join(translationsDir, file),
            name: file
        }));

    if (langFiles.length === 0) {
        throw new Error(`No translation files found in ${translationsDir}`);
    }

    const translations = {};

    // Load each translation file
    for (const file of langFiles) {
        try {
            const result = loadTranslationFile(file.filePath);
            Object.assign(translations, result);
        } catch (error) {
            // Log error but continue with other files
            console.log(`⚠️  WARNING: ${error.message} [${UTILITY_FILE}]`);
        }
    }

    return translations;
}

// EOF webapp/tests/unit/i18n/utils/translation-loader.js
