/**
 * @name            jPulse Framework / WebApp / Tests / Unit / I18N / Find Dynamic Keys
 * @tagline         Helper script to find dynamic i18n key usage
 * @description     Standalone script to search for dynamic i18n key patterns
 * @file            webapp/tests/unit/i18n/find-dynamic-keys.js
 * @version         1.6.16
 * @release         2026-02-12
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { extractControllerKeys } from './utils/key-extractor.js';

// Get script file name for warning messages
const SCRIPT_FILE = 'webapp/tests/unit/i18n/find-dynamic-keys.js';

/**
 * Recursively find all files matching extensions in a directory
 */
function findFiles(dir, extensions, excludePatterns = []) {
    const files = [];
    const items = readdirSync(dir);

    for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            files.push(...findFiles(fullPath, extensions, excludePatterns));
        } else if (stat.isFile()) {
            const ext = extname(item).toLowerCase();
            if (extensions.includes(ext)) {
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

/**
 * Main function to find dynamic keys
 */
function findDynamicKeys() {
    console.log('🔍 Searching for dynamic i18n keys...\n');

    const controllerDir = join(process.cwd(), 'webapp', 'controller');
    const controllerFiles = findFiles(controllerDir, ['.js'], ['*.test.js']);

    const allDynamicKeys = [];

    for (const filePath of controllerFiles) {
        try {
            const content = readFileSync(filePath, 'utf8');
            const extracted = extractControllerKeys(content, filePath);

            const dynamic = extracted.filter(item => item.dynamic);
            if (dynamic.length > 0) {
                allDynamicKeys.push(...dynamic);
            }
        } catch (error) {
            console.log(`⚠️  WARNING: Could not read file ${filePath}: ${error.message} [${SCRIPT_FILE}]`);
        }
    }

    if (allDynamicKeys.length === 0) {
        console.log('✅ No dynamic keys found. All i18n keys are statically analyzable.\n');
        return;
    }

    console.log(`Found ${allDynamicKeys.length} dynamic key(s):\n`);

    // Group by file
    const byFile = {};
    allDynamicKeys.forEach(item => {
        if (!byFile[item.file]) {
            byFile[item.file] = [];
        }
        byFile[item.file].push(item);
    });

    // Report by file
    for (const [file, items] of Object.entries(byFile)) {
        console.log(`${file}:`);
        items.forEach(item => {
            console.log(`  Line ${item.line}: ${item.match}`);
            console.log(`    → Type: ${item.reason || 'variable'}, Key: ${item.key}`);
        });
        console.log('');
    }

    // Summary by type
    const byType = {};
    allDynamicKeys.forEach(item => {
        const type = item.reason || 'variable';
        byType[type] = (byType[type] || 0) + 1;
    });

    console.log('Summary by type:');
    for (const [type, count] of Object.entries(byType)) {
        console.log(`  ${type}: ${count}`);
    }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                     process.argv[1]?.endsWith('find-dynamic-keys.js');
if (isMainModule) {
    findDynamicKeys();
}

export { findDynamicKeys };

// EOF webapp/tests/unit/i18n/find-dynamic-keys.js
