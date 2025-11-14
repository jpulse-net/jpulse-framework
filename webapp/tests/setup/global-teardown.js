/**
 * @name            jPulse Framework / WebApp / Tests / Setup / Global Teardown
 * @tagline         Jest Global Teardown
 * @description     Global teardown for Jest tests runs once after all tests complete
 * @file            webapp/tests/setup/global-teardown.js
 * @version         1.1.6
 * @release         2025-11-14
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
    } catch (error) {
        console.log('🧽 Redis/Cache cleanup: Ensuring all connections and timers are stopped');
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
        await cleanupRedisAndCache();
        generateCleanupReport();

        console.log('✅ Jest Global Teardown: Cleanup completed successfully!');
    } catch (error) {
        console.error('❌ Jest Global Teardown failed:', error);
        // Don't throw - we don't want cleanup failures to fail the test run
    }
}

// EOF webapp/tests/setup/global-teardown.js
