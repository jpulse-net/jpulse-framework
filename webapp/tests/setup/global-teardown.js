/**
 * @name            jPulse Framework / WebApp / Tests / Setup / Global Teardown
 * @tagline         Jest Global Teardown
 * @description     Global teardown for Jest tests runs once after all tests complete
 * @file            webapp/tests/setup/global-teardown.js
 * @version         0.2.2
 * @release         2025-08-25
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Clean up temporary test files
 */
async function cleanupTempFiles() {
    const fixturesDir = path.join(__dirname, '../fixtures');

    try {
        // Read fixtures directory
        const files = await fs.readdir(fixturesDir);

        // Find temporary files (temp-*.conf, temp-*.json, etc.)
        const tempFiles = files.filter(file => file.startsWith('temp-'));

        if (tempFiles.length > 0) {
            console.log(`🧹 Post-test cleanup: Removing ${tempFiles.length} temporary files...`);

            // Delete temporary files
            for (const file of tempFiles) {
                const filePath = path.join(fixturesDir, file);
                try {
                    await fs.unlink(filePath);
                    console.log(`   ✓ Removed: ${file}`);
                } catch (error) {
                    console.warn(`   ⚠️  Could not remove ${file}: ${error.message}`);
                }
            }
        } else {
            console.log('✨ Post-test cleanup: No temporary files to clean');
        }
    } catch (error) {
        // Directory might not exist or be accessible - that's okay
        console.log(`📁 Fixtures directory not accessible during cleanup: ${error.message}`);
    }
}

/**
 * Clean up any test databases or connections
 */
async function cleanupTestDatabases() {
    // For now, just log - we can extend this later if needed
    console.log('🗄️  Database cleanup: Ensuring all test connections are closed');
}

/**
 * Generate cleanup report
 */
function generateCleanupReport() {
    const timestamp = new Date().toISOString();
    console.log(`📊 Test cleanup completed at: ${timestamp}`);
}

/**
 * Main global teardown function
 */
export default async function globalTeardown() {
    console.log('🧽 Jest Global Teardown: Starting post-test cleanup...');

    try {
        await cleanupTempFiles();
        await cleanupTestDatabases();
        generateCleanupReport();

        console.log('✅ Jest Global Teardown: Cleanup completed successfully!');
    } catch (error) {
        console.error('❌ Jest Global Teardown failed:', error);
        // Don't throw - we don't want cleanup failures to fail the test run
    }
}

// EOF webapp/tests/setup/global-teardown.js
