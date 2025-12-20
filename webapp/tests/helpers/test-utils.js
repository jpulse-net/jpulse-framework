/**
 * @name            jPulse Framework / WebApp / Tests / Helpers / Test Utils
 * @tagline         Test utilities for the jPulse Framework WebApp
 * @description     Common utilities and helpers for testing
 * @file            webapp/tests/helpers/test-utils.js
 * @version         1.3.20
 * @release         2025-12-20
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

// Calculate project root using process.cwd() for Jest compatibility
// This assumes tests are run from the project root (which is standard)
const projectRoot = process.cwd();

// Get test file name for warning messages
const TEST_FILE = 'webapp/tests/helpers/test-utils.js';

/**
 * Test utilities for jPulse Framework testing
 */
export class TestUtils {

    /**
     * Load consolidated configuration (preferred method for tests)
     * Uses the same logic as app.js for consistency
     * @param {string|null} configPath - Optional specific config path, otherwise uses consolidated config
     * @returns {Object} Parsed configuration object
     */
    static async loadTestConfig(configPath = null) {
        try {
            if (configPath) {
                // Load specific test config file (for custom test scenarios)
                const content = fs.readFileSync(configPath, 'utf8');
                const fn = new Function(`return (${content})`);
                return fn();
            } else {
                // Use consolidated configuration (same as app.js)
                const jsonPath = path.join(projectRoot, '.jpulse', 'app.json');

                if (fs.existsSync(jsonPath)) {
                    // Load from consolidated JSON (preferred)
                    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                } else {
                    // Fallback to direct .conf loading if JSON doesn't exist
                    const confPath = path.join(projectRoot, 'webapp', 'app.conf');
                    return this.loadTestConfig(confPath);
                }
            }
        } catch (error) {
            throw new Error(`Failed to load test config: ${error.message}`);
        }
    }

    /**
     * Get the consolidated configuration synchronously
     * For tests that need immediate access to config
     * @returns {Object} Parsed configuration object
     */
    static getConsolidatedConfig() {
        try {
            const jsonPath = path.join(projectRoot, '.jpulse', 'app.json');

            if (fs.existsSync(jsonPath)) {
                return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            } else {
                // If consolidated config doesn't exist, create it from app.conf
                const confPath = path.join(projectRoot, 'webapp', 'app.conf');
                const content = fs.readFileSync(confPath, 'utf8');
                const config = new Function(`return (${content})`)();

                // Optionally save it for future use
                const jpulseDir = path.dirname(jsonPath);
                if (!fs.existsSync(jpulseDir)) {
                    fs.mkdirSync(jpulseDir, { recursive: true });
                }
                fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

                return config;
            }
        } catch (error) {
            throw new Error(`Failed to get consolidated config: ${error.message}`);
        }
    }

    /**
     * Load configuration from a .conf file (legacy method for specific test cases)
     * @param {string} configPath - Path to the .conf file
     * @returns {Object} Parsed configuration object
     */
    static async loadLegacyTestConfig(configPath) {
        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const fn = new Function(`return (${content})`);
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
                const fn = new Function(`return (${content})`);
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
     * Setup global mocks with consolidated configuration
     * Convenience method that loads the consolidated config automatically
     */
    static setupGlobalMocksWithConsolidatedConfig() {
        try {
            const config = this.getConsolidatedConfig();
            global.appConfig = config;
            // Removed the console.log for cleaner test output
        } catch (error) {
            console.log(`⚠️  WARNING: Failed to setup consolidated config, using fallback: ${error.message} [${TEST_FILE}]`);
            // Fallback config must include all properties that modules need
            global.appConfig = {
                app: {
                    name: 'Test App',
                    version: '0.0.0'
                },
                system: {
                    appDir: path.join(projectRoot, 'webapp'),
                    siteDir: path.join(projectRoot, 'site', 'webapp'),
                    projectRoot: projectRoot
                },
                deployment: { mode: 'test', test: { port: 9999 } },
                i18n: { default: 'en' }, // Critical for i18n default language (legacy test support)
                // Add other critical config sections that modules might need
                database: { mode: 'standalone' },
                controller: {
                    config: {
                        defaultDocName: 'global'
                    },
                    handlebar: {
                        cacheIncludes: {
                            enabled: false  // Disabled for tests
                        },
                        contextFilter: {
                            withoutAuth: [],
                            withAuth: []
                        },
                        maxIncludeDepth: 10
                    },
                    view: { defaultTemplate: 'index.shtml' }
                }
            };
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
     * Create a temporary directory for testing
     * @returns {string} Path to temporary directory
     */
    static createTempDir() {
        const tempDir = path.join('./webapp/tests/fixtures', `temp-dir-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
        return tempDir;
    }

    /**
     * Remove temporary directory and all its contents
     * @param {string} dirPath - Path to directory to remove
     */
    static removeTempDir(dirPath) {
        try {
            if (fs.existsSync(dirPath)) {
                fs.rmSync(dirPath, { recursive: true, force: true });
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

// EOF webapp/tests/helpers/test-utils.js
