/**
 * @name            jPulse Framework / WebApp / Tests / Setup / Global Teardown
 * @tagline         Jest Global Teardown
 * @description     Global teardown for Jest tests runs once after all tests complete
 * @file            webapp/tests/setup/global-teardown.js
 * @version         1.4.10
 * @release         2026-01-10
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get test file name for warning messages
const TEST_FILE = 'webapp/tests/setup/global-teardown.js';

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
 * Clean up Redis connections and CacheManager timers
 */
async function cleanupRedisAndCache() {
    try {
        // W-076: Shutdown HealthController broadcasting to prevent hanging tests
        const { default: HealthController } = await import('../../controller/health.js');
        if (HealthController && typeof HealthController.shutdown === 'function') {
            HealthController.shutdown();
            console.log('🩺 Health cleanup: HealthController broadcasting stopped successfully');
        } else {
            console.log('🩺 Health cleanup: No HealthController timers to stop');
        }

        // Clean up Redis connections if they exist
        if (global.RedisManager && typeof global.RedisManager.shutdown === 'function') {
            await global.RedisManager.shutdown();
            console.log('🔴 Redis cleanup: Connections closed successfully');
        } else {
            console.log('🔴 Redis cleanup: No active connections to close');
        }

        // Clean up CacheManager timers
        const { default: cacheManager } = await import('../../utils/cache-manager.js');
        if (cacheManager && typeof cacheManager.shutdown === 'function') {
            cacheManager.shutdown();
            console.log('⏱️  Cache cleanup: CacheManager timers stopped successfully');
        } else {
            console.log('⏱️  Cache cleanup: No CacheManager timers to stop');
        }

        // Clean up TimeBasedCounter timers (W-112)
        const { default: CounterManager } = await import('../../utils/time-based-counters.js');
        if (CounterManager && typeof CounterManager.stopAllCleanup === 'function') {
            CounterManager.stopAllCleanup();
            console.log('⏱️  Counter cleanup: TimeBasedCounter timers stopped successfully');
        } else {
            console.log('⏱️  Counter cleanup: No TimeBasedCounter timers to stop');
        }
    } catch (error) {
        console.log('🧽 Redis/Cache cleanup: Ensuring all connections and timers are stopped');
    }
}

/**
 * Generate warning summary
 * Only prints if not running from test-all.js (which will aggregate warnings)
 */
function generateWarningSummary() {
    // Check if warnings were collected
    if (!global.testWarnings) {
        // Warnings collector not initialized - skip summary
        return;
    }

    // Skip summary if running from test-all.js (it will aggregate warnings at the end)
    // Check for test-all.js by looking at environment variable or process title
    const isTestAll = process.env.JEST_RUN_FROM_TEST_ALL === 'true' ||
                      (typeof process.title !== 'undefined' && process.title.includes('test-all'));

    if (isTestAll) {
        // Don't print here - test-all.js will aggregate and print at the end
        return;
    }

    // Always show summary section, even if empty (for consistency)
    console.log('\n============================================================');
    console.log('⚠️  WARNING SUMMARY');
    console.log('============================================================');

    if (global.testWarnings.length === 0) {
        console.log('No warnings reported during test execution.');
    } else {
        // Print unique warnings (deduplicate)
        const uniqueWarnings = [...new Set(global.testWarnings)];
        uniqueWarnings.forEach(warning => {
            console.log(warning);
        });

        console.log(`\nTotal warnings: ${global.testWarnings.length} (${uniqueWarnings.length} unique)`);
    }

    console.log('============================================================\n');
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
        await cleanupRedisAndCache();

        // Generate warning summary before cleanup report
        generateWarningSummary();
        generateCleanupReport();

        console.log('✅ Jest Global Teardown: Cleanup completed successfully!');
    } catch (error) {
        console.log(`⚠️  WARNING: Jest Global Teardown failed: ${error.message || error} [${TEST_FILE}]`);
        // Don't throw - we don't want cleanup failures to fail the test run
    }
}

// EOF webapp/tests/setup/global-teardown.js
