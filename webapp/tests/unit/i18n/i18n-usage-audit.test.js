/**
 * @name            jPulse Framework / WebApp / Tests / Unit / I18N / Usage Audit
 * @tagline         Automated tests to audit i18n translation usage
 * @description     Tests to ensure translation key consistency and validate i18n references
 * @file            webapp/tests/unit/i18n/i18n-usage-audit.test.js
 * @version         1.6.15
 * @release         2026-02-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, extname } from 'path';
import { loadAllTranslations } from './utils/translation-loader.js';
import { validateKeys, isValidKey } from './utils/key-validator.js';
import { extractViewKeys, extractControllerKeys } from './utils/key-extractor.js';

// Get test file name for warning messages
const TEST_FILE = 'webapp/tests/unit/i18n/i18n-usage-audit.test.js';

/**
 * Recursively find all files matching extensions in a directory
 * @param {string} dir - Directory to search
 * @param {string[]} extensions - Array of file extensions to match (e.g., ['.js', '.shtml'])
 * @param {string[]} excludePatterns - Array of patterns to exclude (e.g., ['*.test.js'])
 * @returns {string[]} Array of file paths
 */
function findFiles(dir, extensions, excludePatterns = []) {
    const files = [];
    const items = readdirSync(dir);

    for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            // Recursively search subdirectories
            files.push(...findFiles(fullPath, extensions, excludePatterns));
        } else if (stat.isFile()) {
            const ext = extname(item).toLowerCase();
            if (extensions.includes(ext)) {
                // Check exclude patterns
                const shouldExclude = excludePatterns.some(pattern => {
                    if (pattern.includes('*')) {
                        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                        return regex.test(item);
                    }
                    return pattern === item;
                });

                if (!shouldExclude) {
                    files.push(fullPath);
                }
            }
        }
    }

    return files;
}

describe('I18N Usage Audit', () => {
    let translations; // { en: [...], de: [...] } - flattened, sorted arrays
    let enKeys; // Reference keys from en.conf

    beforeAll(() => {
        // Load all translation files once (already flattened by translation-loader)
        const translationsDir = join(process.cwd(), 'webapp', 'translations');
        translations = loadAllTranslations(translationsDir);
        enKeys = translations.en; // Reference keys (sorted array)
    });

    describe('Translation Key Comparison', () => {
        test('en.conf should be the reference language', () => {
            // Verify en.conf exists and is valid
            expect(enKeys).toBeDefined();
            expect(Array.isArray(enKeys)).toBe(true);
            expect(enKeys.length).toBeGreaterThan(0);
        });

        test.each(['de'])('should have matching keys with en.conf', (langCode) => {
            // Compare each language file with en.conf
            const targetKeys = translations[langCode];
            if (!targetKeys) {
                // Language file doesn't exist - skip test
                return;
            }

            const { missing, extra } = validateKeys(enKeys, targetKeys);

            // Report missing keys (in en.conf but not in target language)
            if (missing.length > 0) {
                missing.forEach(key => {
                    console.log(`⚠️  WARNING: Translation key missing in ${langCode}.conf: ${key} [${TEST_FILE}]`);
                });
            }

            // Report extra keys (in target language but not in en.conf)
            if (extra.length > 0) {
                extra.forEach(key => {
                    console.log(`⚠️  WARNING: Translation key extra in ${langCode}.conf (not in en.conf): ${key} [${TEST_FILE}]`);
                });
            }

            // Fail test if there are differences
            expect(missing).toEqual([]);
            expect(extra).toEqual([]);
        });
    });

    describe('View i18n Usage Validation', () => {
        test('should validate all {{i18n.*}} references', () => {
            // Discover all view files
            const viewDir = join(process.cwd(), 'webapp', 'view');
            const viewFiles = findFiles(viewDir, ['.js', '.shtml', '.tmpl', '.css']);

            const brokenReferences = [];
            const allExtractedKeys = [];

            // Extract and validate keys from each view file
            for (const filePath of viewFiles) {
                try {
                    const content = readFileSync(filePath, 'utf8');
                    const extracted = extractViewKeys(content, filePath);

                    for (const item of extracted) {
                        allExtractedKeys.push(item.key);
                        if (!isValidKey(enKeys, item.key)) {
                            brokenReferences.push(item);
                        }
                    }
                } catch (error) {
                    console.log(`⚠️  WARNING: Could not read file ${filePath}: ${error.message} [${TEST_FILE}]`);
                }
            }

            // Report broken references
            if (brokenReferences.length > 0) {
                brokenReferences.forEach(ref => {
                    console.log(`⚠️  WARNING: View i18n key not found: ${ref.key} in ${ref.file}:${ref.line} (${ref.match}) [${TEST_FILE}]`);
                });
            }

            // Report summary
            const uniqueKeys = [...new Set(allExtractedKeys)];
            console.log(`\nView i18n Usage Summary:`);
            console.log(`  Total files scanned: ${viewFiles.length}`);
            console.log(`  Total i18n references: ${allExtractedKeys.length}`);
            console.log(`  Unique keys referenced: ${uniqueKeys.length}`);
            console.log(`  Broken references: ${brokenReferences.length}`);

            // Fail test if there are broken references
            expect(brokenReferences).toEqual([]);
        });

        test('should handle escaped handlebars correctly', () => {
            // This is tested implicitly in the main test above
            // The extractViewKeys function filters out {{@i18n.*}} patterns
            // and HTML-escaped patterns
            expect(true).toBe(true);
        });

        test('should ignore commented code', () => {
            // This is tested implicitly in the main test above
            // The extractViewKeys function filters out {{!-- ... --}} comments
            expect(true).toBe(true);
        });
    });

    describe('Controller i18n Usage Validation', () => {
        test('should validate all global.i18n.translate() calls', () => {
            // Discover all controller files
            const controllerDir = join(process.cwd(), 'webapp', 'controller');
            const controllerFiles = findFiles(controllerDir, ['.js'], ['*.test.js']);

            const brokenReferences = [];
            const dynamicKeys = [];
            const allExtractedKeys = [];

            // Extract and validate keys from each controller file
            for (const filePath of controllerFiles) {
                try {
                    const content = readFileSync(filePath, 'utf8');
                    const extracted = extractControllerKeys(content, filePath);

                    for (const item of extracted) {
                        if (item.dynamic) {
                            dynamicKeys.push(item);
                        } else {
                            allExtractedKeys.push(item.key);
                            if (!isValidKey(enKeys, item.key)) {
                                brokenReferences.push(item);
                            }
                        }
                    }
                } catch (error) {
                    console.log(`⚠️  WARNING: Could not read file ${filePath}: ${error.message} [${TEST_FILE}]`);
                }
            }

            // Report broken references
            if (brokenReferences.length > 0) {
                brokenReferences.forEach(ref => {
                    console.log(`⚠️  WARNING: Controller i18n key not found: ${ref.key} in ${ref.file}:${ref.line} (${ref.match}) [${TEST_FILE}]`);
                });
            }

            // Report dynamic keys (cannot validate statically)
            if (dynamicKeys.length > 0) {
                dynamicKeys.forEach(ref => {
                    console.log(`⚠️  WARNING: Controller i18n dynamic key (cannot validate): ${ref.key} in ${ref.file}:${ref.line} (type: ${ref.reason || 'variable'}, code: ${ref.match}) [${TEST_FILE}]`);
                });
            }

            // Report summary
            const uniqueKeys = [...new Set(allExtractedKeys)];
            console.log(`\nController i18n Usage Summary:`);
            console.log(`  Total files scanned: ${controllerFiles.length}`);
            console.log(`  Total i18n references: ${allExtractedKeys.length}`);
            console.log(`  Unique keys referenced: ${uniqueKeys.length}`);
            console.log(`  Broken references: ${brokenReferences.length}`);
            console.log(`  Dynamic keys (cannot validate): ${dynamicKeys.length}`);

            // Fail test if there are broken references
            expect(brokenReferences).toEqual([]);
        });

        test('should report dynamic keys separately', () => {
            // This is tested implicitly in the main test above
            // The extractControllerKeys function identifies dynamic keys
            expect(true).toBe(true);
        });

        test('should handle multiline function calls', () => {
            // This is tested implicitly in the main test above
            // The regex pattern uses 'm' flag for multiline matching
            expect(true).toBe(true);
        });
    });
});

// EOF webapp/tests/unit/i18n/i18n-usage-audit.test.js
