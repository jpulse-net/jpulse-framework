/**
 * @name            jPulse Framework / WebApp / Utils / I18N
 * @tagline         Internationalization for the jPulse Framework WebApp
 * @description     This is the i18n file for the jPulse Framework WebApp
 * @file            webapp/utils/i18n.js
 * @version         1.4.11
 * @release         2026-01-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

// Load required modules for path resolution and file system operations
import { join } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import cacheManager from './cache-manager.js';
import { getValueByPath, setValueByPath } from './common.js';

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
        global.LogController.logWarning(null, 'i18n', `warning: missing in ${langCode}.conf: ${missingGroups.join(', ')}`);
    }
    if (extraGroups.length > 0) {
        global.LogController.logWarning(null, 'i18n', `warning: extra in ${langCode}.conf: ${extraGroups.join(', ')}`);
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
 * Automatically finds all *.conf files in the translations directory
 * W-079: Enhanced with simplified CacheManager for automatic refresh
 */
async function loadTranslations() {
    // Handle case where appConfig might not be available yet (e.g., in tests)
    const config = global.appConfig;

    if (!config) {
        throw new Error('appConfig must be available before loading translations. Set up global.appConfig first.');
    }

    // W-079: Initialize translation cache using simplified CacheManager
    if (!translationCache) {
        const cacheConfig = config.utils?.i18n?.cache || { enabled: true };

        // In test mode, disable caching to prevent hanging
        const isTestMode = process.env.NODE_ENV === 'test' || global.isTestEnvironment;
        if (isTestMode) {
            cacheConfig.enabled = false; // Disable caching in tests
        }

        translationCache = cacheManager.register(cacheConfig, 'TranslationCache');
    }

    const i18n = {
        langs: {},
        default: config.utils?.i18n?.default || 'en'
    };

    try {
        // Dynamically discover all language files
        const translationsDir = join(config.system.appDir, 'translations');

        // Check if translations directory exists
        if (!existsSync(translationsDir)) {
            global.LogController.logError(null, 'i18n', `error: Translations directory not found: ${translationsDir}`);
            process.exit(1);
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
            global.LogController.logError(null, 'i18n', `error: No translation files found in ${translationsDir}`);
            process.exit(1);
        }

        // Sort files to load default language first
        const defaultFile = `${i18n.default}.conf`;
        const sortedFiles = langFiles.sort((a, b) => {
            if (a.name === defaultFile) return -1;
            if (b.name === defaultFile) return 1;
            return a.name.localeCompare(b.name);
        });

        global.LogController.logInfo(null, 'i18n', `Loading ${sortedFiles.length} translation files...`);
        let defaultLangData = null;

        // W-079: Load each translation file using simplified cache
        for (const file of sortedFiles) {
            try {
                const content = translationCache.getFileSync(file.filePath);

                if (content === null) {
                    global.LogController.logError(null, 'i18n', `warning: Translation file not found: ${file.filePath}`);
                    continue;
                }

                // Safely evaluate the translation file content
                const fn = new Function(`return (
                    ${content}
                )`); // extra newlines in case content ends in a // comment
                const obj = fn();
                const lang = Object.keys(obj)[0];

                if (lang && obj[lang]) {
                    i18n.langs[lang] = obj[lang];
                    global.LogController.logInfo(null, 'i18n', `✓ Loaded language: ${lang} (${obj[lang].lang || lang})`);

                    // Store default language data for auditing
                    if (lang === i18n.default) {
                        defaultLangData = deepClone(obj[lang]);
                    } else if (defaultLangData) {
                        // Audit and fix non-default languages
                        auditAndFixTranslations(defaultLangData, i18n.langs[lang], lang);
                    }
                } else {
                    global.LogController.logError(null, 'i18n', `warning: Invalid structure in ${file.filePath}`);
                }
            } catch (fileError) {
                global.LogController.logError(null, 'i18n', `error: Error loading translation file ${file.filePath}: ${fileError.message}`);
            }
        }
        return i18n;
    } catch (error) {
        global.LogController.logError(null, 'i18n', `error: Failed to load translations: ${error.message}`);
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
            global.LogController.logError(null, 'i18n', `warning: Default language '${this.default}' not found. Available languages: ${Object.keys(this.langs).join(', ')}`);
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
        global.LogController.logError(null, 'i18n', `warning: Language '${langCode}' not found, falling back to '${this.default}'`);
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
     * Get translation for a nested key path (internal function)
     * @param {string} langCode - Language code
     * @param {string} keyPath - Dot-separated key path (e.g., 'login.notAuthenticated')
     * @param {object} context - Context object (single level key/value pairs)
     * @returns {string} Translation or key path if not found
     */
    _translate(langCode, keyPath, context = {}) {
        const lang = this.getLang(langCode);
        const keys = keyPath.split('.');
        let result = lang;
        for (const key of keys) {
            if (result && typeof result === 'object' && result.hasOwnProperty(key)) {
                result = result[key];
            } else {
                global.LogController.logError(null, 'i18n', `error: Translation not found: ${langCode}.${keyPath}`);
                return keyPath; // Return key path as fallback
            }
        }
        if (context) {
            result = result.replace(/{{(.*?)}}/g, (match, p1) => context[p1] || match);
        }
        return result;
    }

    /**
     * Get translation with user's preferred language from request session
     * @param {object} req - Express request object (to get user's language preference)
     * @param {string} keyPath - Dot-separated key path
     * @param {object} context - Context object (single level key/value pairs)
     * @param {string} fallbackLang - Fallback language code (optional)
     * @returns {string} Translation
     */
    translate(req, keyPath, context = {}, fallbackLang = this.default) {
        // Extract user's preferred language from request session
        const userLang = req?.session?.user?.preferences?.language || this.default;

        // Try user's preferred language first
        let result = this._translate(userLang, keyPath, context);

        // If not found and fallback is different, try fallback
        if (result === keyPath && fallbackLang !== userLang) {
            result = this._translate(fallbackLang, keyPath, context);
        }

        return result;
    }

    /**
     * Expand only i18n handlebars in content, leaving other handlebars untouched
     * This is used to preprocess i18n translations before main template processing
     * @param {object} req - Express request object (for user language preference)
     * @param {string} content - Template content with handlebars
     * @returns {string} Content with i18n handlebars expanded
     */
    expandI18nHandlebars(req, content) {
        // Only process {{i18n.}} and {{@i18n.}} handlebars
        return content.replace(/\{\{(@?i18n\.[^}]+)\}\}/g, (match, expression) => {
            try {
                // Remove @ prefix if present (for escaped handlebars)
                const cleanExpression = expression.replace(/^@/, '');

                // Parse i18n key and parameters
                const parts = cleanExpression.split(/\s+/);
                const key = parts[0].replace('i18n.', '');

                // Extract parameters if any
                let params = {};
                if (parts.length > 1) {
                    // Simple parameter parsing - could be enhanced if needed
                    const paramString = parts.slice(1).join(' ');
                    try {
                        params = JSON.parse(paramString);
                    } catch (e) {
                        // If JSON parsing fails, use empty params
                        params = {};
                    }
                }

                // Use the translate method - this handles user language preferences automatically
                return this.translate(req, key, params);
            } catch (error) {
                // Return original match if translation fails
                return match;
            }
        });
    }
}

let i18nInstance = null;
let translationCache = null;  // W-079: Cache instance from CacheManager

/**
 * Initialize i18n (LogController must be globally available)
 * @returns {object} Initialized i18n instance
 */
export async function initialize() {
    if (i18nInstance) {
        return i18nInstance;
    }

    // LogController should already be available globally from bootstrap
    if (!global.LogController) {
        throw new Error('LogController must be initialized before i18n. Check bootstrap sequence.');
    }

    // Load translations using existing functionality
    const translationData = await loadTranslations();
    i18nInstance = new I18n(translationData);

    // Validate that we have at least one language
    if (Object.keys(i18nInstance.langs).length === 0) {
        global.LogController.logError(null, 'i18n', 'error: No valid translations loaded');
        process.exit(1);
    }

    global.LogController.logInfo(null, 'i18n', `Initialized with languages: ${i18nInstance.getCodes().join(', ')}`);
    global.LogController.logInfo(null, 'i18n', `Default language: ${i18nInstance.default}`);

    return i18nInstance;
}


/**
 * Get the initialized i18n instance
 */
export function getInstance() {
    if (!i18nInstance) {
        throw new Error('i18n not initialized. Call initialize() first.');
    }
    return i18nInstance;
}

// Module is ready for initialization - call initialize() to set up i18n

export default {
    initialize,
    getInstance
};

// EOF webapp/utils/i18n.js
