/**
 * @name            Bubble Framework / WebApp / Tests / Helpers / Test Utils
 * @tagline         Test utilities for the Bubble Framework WebApp
 * @description     Common utilities and helpers for testing
 * @file            webapp/tests/helpers/test-utils.js
 * @version         0.1.2
 * @release         2025-08-24
 * @repository      https://github.com/peterthoeny/bubble-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

/**
 * Test utilities for Bubble Framework testing
 */
export class TestUtils {
    
    /**
     * Load configuration from a .conf file (similar to app.js loadAppConfig)
     * @param {string} configPath - Path to the .conf file
     * @returns {Object} Parsed configuration object
     */
    static async loadTestConfig(configPath) {
        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const fn = new Function(`return (
                ${content}
            )`);
            return fn();
        } catch (error) {
            throw new Error(`Failed to load test config from ${configPath}: ${error.message}`);
        }
    }

    /**
     * Load translations from .conf files (similar to i18n.js loadTranslations)
     * @param {string[]} files - Array of translation file paths
     * @returns {Object} i18n object with loaded translations
     */
    static async loadTestTranslations(files) {
        const i18n = {
            langs: {},
            default: 'en'
        };
        
        try {
            for(const file of files) {
                const content = fs.readFileSync(file, 'utf8');
                const fn = new Function(`return (
                    ${content}
                )`);
                const obj = fn();
                const lang = Object.keys(obj)[0];
                i18n.langs[lang] = obj[lang];
            }
            return i18n;
        } catch (error) {
            throw new Error(`Failed to load test translations: ${error.message}`);
        }
    }

    /**
     * Create a mock i18n object with translation function
     * @param {Object} translations - Translation data
     * @param {string} defaultLang - Default language
     * @returns {Object} Mock i18n object
     */
    static createMockI18n(translations, defaultLang = 'en') {
        const i18n = {
            langs: translations,
            default: defaultLang,
            t: (key, ...args) => {
                const keyParts = key.split('.');
                let text = i18n.langs[i18n.default];
                for(const keyPart of keyParts) {
                    if (text && typeof text === 'object') {
                        text = text[keyPart];
                    } else {
                        return `[MISSING: ${key}]`;
                    }
                }
                if (typeof text !== 'string') {
                    return `[MISSING: ${key}]`;
                }
                if(args.length > 0) {
                    text = text.replace(/{(\d+)}/g, (match, p1) => {
                        return args[p1] !== undefined ? args[p1] : match;
                    });
                }
                return text;
            }
        };
        return i18n;
    }

    /**
     * Mock global variables for testing
     * @param {Object} config - Configuration object to set as global.appConfig
     * @param {Object} i18n - i18n object to set as global.i18n
     */
    static setupGlobalMocks(config = null, i18n = null) {
        if (config) {
            global.appConfig = config;
        }
        if (i18n) {
            global.i18n = i18n;
        }
    }

    /**
     * Clean up global mocks after testing
     */
    static cleanupGlobalMocks() {
        delete global.appConfig;
        delete global.i18n;
    }

    /**
     * Create a temporary file for testing
     * @param {string} content - File content
     * @param {string} suffix - File suffix (e.g., '.conf')
     * @returns {string} Path to temporary file
     */
    static createTempFile(content, suffix = '.tmp') {
        const tempDir = './webapp/tests/fixtures';
        const tempFile = path.join(tempDir, `temp-${Date.now()}${suffix}`);
        fs.writeFileSync(tempFile, content, 'utf8');
        return tempFile;
    }

    /**
     * Remove temporary file
     * @param {string} filePath - Path to file to remove
     */
    static removeTempFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            // Ignore cleanup errors in tests
        }
    }

    /**
     * Mock fs.readFileSync for testing file operations
     * @param {Object} mockFiles - Object mapping file paths to content
     * @returns {jest.Mock} Mock function
     */
    static mockFileSystem(mockFiles) {
        const originalReadFileSync = fs.readFileSync;
        const mockReadFileSync = jest.fn((filePath, encoding) => {
            if (mockFiles[filePath]) {
                return mockFiles[filePath];
            }
            // Fall back to real file system for unmocked files
            return originalReadFileSync(filePath, encoding);
        });
        
        fs.readFileSync = mockReadFileSync;
        return mockReadFileSync;
    }

    /**
     * Restore fs.readFileSync after mocking
     */
    static restoreFileSystem() {
        jest.restoreAllMocks();
    }

    /**
     * Wait for async operations to complete
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} Promise that resolves after specified time
     */
    static async wait(ms = 10) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get fixture file path
     * @param {string} filename - Name of fixture file
     * @returns {string} Full path to fixture file
     */
    static getFixturePath(filename) {
        return path.join('./webapp/tests/fixtures', filename);
    }
}

export default TestUtils;

// EOF test-utils.js
