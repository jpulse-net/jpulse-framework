/**
 * @name            jPulse Framework / WebApp / Tests / Setup / Global Setup
 * @tagline         Jest Global Setup
 * @description     Global setup for Jest tests runs once before all tests start
 * @file            webapp/tests/setup/global-setup.js
 * @version         0.3.3
 * @release         2025-08-31
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
            console.log(`🧹 Cleaning up ${tempFiles.length} temporary test files...`);

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
        }
    } catch (error) {
        // Directory might not exist or be accessible - that's okay
        console.log(`📁 Fixtures directory not accessible (this is normal): ${error.message}`);
    }
}

/**
 * Clean up any test databases or connections
 */
async function cleanupTestDatabases() {
    // For now, just log - we can extend this later if needed
    console.log('🗄️  Database cleanup: No active test databases to clean');
}

/**
 * Main global setup function
 */
export default async function globalSetup() {
    console.log('🚀 Jest Global Setup: Starting test environment preparation...');

    try {
        await cleanupTempFiles();
        await cleanupTestDatabases();

        console.log('✅ Jest Global Setup: Test environment ready!');
    } catch (error) {
        console.error('❌ Jest Global Setup failed:', error);
        throw error;
    }
}

// EOF webapp/tests/setup/global-setup.js
