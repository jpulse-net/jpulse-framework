/**
 * @name            jPulse Framework / WebApp / Translations / I18N
 * @tagline         Internationalization for the jPulse Framework WebApp
 * @description     This is the i18n file for the jPulse Framework WebApp
 * @file            webapp/translations/i18n.js
 * @version         0.2.8
 * @release         2025-08-27
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           70%, Cursor 1.2, Claude Sonnet 4
 */

// Load required modules for path resolution and file system operations
import { join } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import logController from '../controller/log.js';

/**
 * Deep clone an object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (Array.isArray(obj)) return obj.map(item => deepClone(item));
    const cloned = {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

/**
 * Get all paths from an object (dot notation)
 */
function getObjectPaths(obj, prefix = '') {
    const paths = [];
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const currentPath = prefix ? `${prefix}.${key}` : key;
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                // It's a nested object, get its paths
                paths.push(...getObjectPaths(obj[key], currentPath));
            } else {
                // It's a leaf value
                paths.push(currentPath);
            }
        }
    }
    return paths;
}

/**
 * Set a value in an object using dot notation path
 */
function setValueByPath(obj, keyPath, value) {
    const keys = keyPath.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
}

/**
 * Get a value from an object using dot notation path
 */
function getValueByPath(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;
    for (const key of keys) {
        if (current && typeof current === 'object' && current.hasOwnProperty(key)) {
            current = current[key];
        } else {
            return undefined;
        }
    }
    return current;
}

/**
 * Audit and fix missing translations
 */
function auditAndFixTranslations(defaultLang, targetLang, langCode) {
    const defaultPaths = getObjectPaths(defaultLang);
    const targetPaths = getObjectPaths(targetLang);
    const missing = defaultPaths.filter(keyPath => !targetPaths.includes(keyPath));
    const extra = targetPaths.filter(keyPath => !defaultPaths.includes(keyPath));
    // Group missing paths by parent object for cleaner reporting
    const missingGroups = [];
    const processedPaths = new Set();
    missing.forEach(keyPath => {
        if (processedPaths.has(keyPath)) return;
        const parts = keyPath.split('.');
        const parentPath = parts.slice(0, -1).join('.');
        // Check if entire parent object is missing
        if (parentPath && !getValueByPath(targetLang, parentPath)) {
            missingGroups.push(parentPath);
            // Mark all child paths as processed
            missing.forEach(childPath => {
                if (childPath.startsWith(parentPath + '.')) {
                    processedPaths.add(childPath);
                }
            });
            processedPaths.add(keyPath);
        } else {
            missingGroups.push(keyPath);
            processedPaths.add(keyPath);
        }
    });
    // Group extra paths similarly
    const extraGroups = [];
    const processedExtraPaths = new Set();
    extra.forEach(keyPath => {
        if (processedExtraPaths.has(keyPath)) return;
        const parts = keyPath.split('.');
        const parentPath = parts.slice(0, -1).join('.');
        // Check if entire parent object is extra
        if (parentPath && !getValueByPath(defaultLang, parentPath)) {
            extraGroups.push(parentPath);
            // Mark all child paths as processed
            extra.forEach(childPath => {
                if (childPath.startsWith(parentPath + '.')) {
                    processedExtraPaths.add(childPath);
                }
            });
            processedExtraPaths.add(keyPath);
        } else {
            extraGroups.push(keyPath);
            processedExtraPaths.add(keyPath);
        }
    });
    // Log audit results
    if (missingGroups.length > 0) {
        logController.error(null, `i18n: - missing: ${missingGroups.join(', ')}`);
    }
    if (extraGroups.length > 0) {
        logController.error(null, `i18n: - extra: ${extraGroups.join(', ')}`);
    }
    // Copy missing fields from default language
    missing.forEach(keyPath => {
        const defaultValue = getValueByPath(defaultLang, keyPath);
        if (defaultValue !== undefined) {
            setValueByPath(targetLang, keyPath, defaultValue);
        }
    });
    return { missing: missingGroups, extra: extraGroups };
}

/**
 * Function to dynamically discover and load all translation files
 * Automatically finds all lang-*.conf files in the translations directory
 */
async function loadTranslations() {
    const i18n = {
        langs: {},
        default: appConfig.i18n?.default || 'en'
    };
    try {
        // Dynamically discover all language files
        const translationsDir = join(appConfig.app.dirName, 'translations');

        // Check if translations directory exists
        if (!existsSync(translationsDir)) {
            console.error('i18n Warning: Translations directory not found:', translationsDir);
            process.exit(1);
        }
        // Read directory and filter for lang-*.conf files
        const allFiles = readdirSync(translationsDir);
        const langFiles = allFiles
            .filter(file => file.startsWith('lang-') && file.endsWith('.conf'))
            .map(file => ({
                filePath: join(translationsDir, file),
                name: file
            }));
        if (langFiles.length === 0) {
            console.error('i18n Warning: No translation files found in', translationsDir);
            process.exit(1);
        }
        // Sort files to load default language first
        const defaultFile = `lang-${i18n.default}.conf`;
        const sortedFiles = langFiles.sort((a, b) => {
            if (a.name === defaultFile) return -1;
            if (b.name === defaultFile) return 1;
            return a.name.localeCompare(b.name);
        });
        logController.console(null, `i18n: Loading ${sortedFiles.length} translation files...`);
        let defaultLangData = null;
        // Load each translation file
        for (const file of sortedFiles) {
            try {
                const content = readFileSync(file.filePath, 'utf8');
                // Safely evaluate the translation file content
                const fn = new Function(`return (
                    ${content}
                )`); // extra newlines in case content ends in a // comment
                const obj = fn();
                const lang = Object.keys(obj)[0];
                if (lang && obj[lang]) {
                    i18n.langs[lang] = obj[lang];
                    logController.console(null, `i18n: ✓ Loaded language: ${lang} (${obj[lang].lang || lang})`);

                    // Store default language data for auditing
                    if (lang === i18n.default) {
                        defaultLangData = deepClone(obj[lang]);
                    } else if (defaultLangData) {
                        // Audit and fix non-default languages
                        auditAndFixTranslations(defaultLangData, i18n.langs[lang], lang);
                    }
                } else {
                    logController.error(null, `i18n: Warning: Invalid structure in ${file.filePath}`);
                }
            } catch (fileError) {
                logController.error(null, `i18n: Error loading translation file ${file.filePath}:`, fileError.message);
            }
        }
        return i18n;
    } catch (error) {
        console.error(`i18n Error: Failed to load translations:`, error);
        process.exit(1);
    }
}

/**
 * Enhanced i18n class with additional methods
 */
class I18n {
    constructor(data) {
        this.langs = data.langs;
        this.default = data.default;
        // Validate default language exists
        if (this.default && !this.langs[this.default]) {
            logController.error(null, `i18n: Warning: Default language '${this.default}' not found. Available languages:`, Object.keys(this.langs));
            // Fallback to first available language
            this.default = Object.keys(this.langs)[0] || 'en';
        }
    }

    /**
     * Get language object by language code
     * @param {string} langCode - Language code (e.g., 'en', 'de')
     * @returns {object} Language object or fallback to default language
     */
    getLang(langCode) {
        if (!langCode) {
            return this.langs[this.default] || {};
        }
        // Return requested language if it exists
        if (this.langs[langCode]) {
            return this.langs[langCode];
        }
        // Fallback to default language
        logController.error(null, `i18n: Warning: Language '${langCode}' not found, falling back to '${this.default}'`);
        return this.langs[this.default] || {};
    }

    /**
     * Get list of available languages
     * @returns {Array<Array<string>>} Array of [langCode, langName] pairs
     */
    getList() {
        return Object.entries(this.langs).map(([code, data]) => {
            // Use the 'lang' property if available, otherwise use the code
            const name = data.lang || code.charAt(0).toUpperCase() + code.slice(1);
            return [code, name];
        });
    }

    /**
     * Get available language codes
     * @returns {Array<string>} Array of language codes
     */
    getCodes() {
        return Object.keys(this.langs);
    }

    /**
     * Check if a language exists
     * @param {string} langCode - Language code to check
     * @returns {boolean} True if language exists
     */
    hasLang(langCode) {
        return langCode && this.langs.hasOwnProperty(langCode);
    }

    /**
     * Get translation for a nested key path
     * @param {string} langCode - Language code
     * @param {string} keyPath - Dot-separated key path (e.g., 'login.notAuthenticated')
     * @returns {string} Translation or key path if not found
     */
    translate(langCode, keyPath) {
        const lang = this.getLang(langCode);
        const keys = keyPath.split('.');
        let result = lang;
        for (const key of keys) {
            if (result && typeof result === 'object' && result.hasOwnProperty(key)) {
                result = result[key];
            } else {
                logController.error(null, `i18n: Translation not found: ${langCode}.${keyPath}`);
                return keyPath; // Return key path as fallback
            }
        }
        return result;
    }

    /**
     * Get translation with fallback chain
     * @param {string} keyPath - Dot-separated key path
     * @param {string} langCode - Primary language code
     * @param {string} fallbackLang - Fallback language code (optional)
     * @returns {string} Translation
     */
    t(keyPath, langCode = this.default, fallbackLang = this.default) {
        // Try primary language
        let result = this.translate(langCode, keyPath);
        // If not found and fallback is different, try fallback
        if (result === keyPath && fallbackLang !== langCode) {
            result = this.translate(fallbackLang, keyPath);
        }
        return result;
    }
}

// Load translations and create enhanced i18n instance
const translationData = await loadTranslations();
const i18n = new I18n(translationData);

// Validate that we have at least one language
if (Object.keys(i18n.langs).length === 0) {
    console.error('Error: No valid translations loaded');
    process.exit(1);
}

logController.console(null, `i18n: Initialized with languages: ${i18n.getCodes().join(', ')}`);
logController.console(null, `i18n: Default language: ${i18n.default}`);
//console.log('DEBUG: i18n.langs', JSON.stringify(i18n.langs, null, 2));

export default i18n;

// EOF webapp/translations/i18n.js
