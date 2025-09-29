/**
 * @name            jPulse Framework / WebApp / Tests / Setup / Global Teardown
 * @tagline         Jest Global Teardown
 * @description     Global teardown for Jest tests runs once after all tests complete
 * @file            webapp/tests/setup/global-teardown.js
 * @version         0.8.2
 * @release         2025-09-29
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           80%, Cursor 1.2, Claude Sonnet 4
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Clean up any test databases or connections
 */
async function cleanupTestDatabases() {
    try {
        // Import database module to access connection management
        const Database = await import('../../database.js');

        // Close any active database connections
        if (Database.default && typeof Database.default.close === 'function') {
            await Database.default.close();
            console.log('🗄️  Database cleanup: Connections closed successfully');
        } else {
            console.log('🗄️  Database cleanup: No active connections to close');
        }
    } catch (error) {
        console.log('🗄️  Database cleanup: Ensuring all test connections are closed');
    }
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
        await cleanupTestDatabases();
        generateCleanupReport();

        console.log('✅ Jest Global Teardown: Cleanup completed successfully!');
    } catch (error) {
        console.error('❌ Jest Global Teardown failed:', error);
        // Don't throw - we don't want cleanup failures to fail the test run
    }
}

// EOF webapp/tests/setup/global-teardown.js
