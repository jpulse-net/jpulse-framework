/**
 * @name            jPulse Framework / WebApp / Tests / Setup / Global Setup
 * @tagline         Jest Global Setup
 * @description     Global setup for Jest tests runs once before all tests start
 * @file            webapp/tests/setup/global-setup.js
 * @version         0.7.14
 * @release         2025-09-18
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize global appConfig for all tests
 */
async function initializeGlobalConfig() {
    try {
        // Import Jest-independent config loader
        const { setupGlobalAppConfig } = await import('../helpers/config-loader.js');

        // Set up global appConfig using consolidated configuration
        const success = setupGlobalAppConfig();

        if (success) {
            console.log('🔧 Global appConfig initialized from consolidated config');
        } else {
            console.log('🔧 Global appConfig initialized with fallback config');
        }
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize global appConfig:', error.message);
        throw error;
    }
}

/**
 * Initialize LogController for tests
 */
async function initializeLogController() {
    try {
        // Import LogController after appConfig is available
        const LogController = await import('../../controller/log.js');

        // Make LogController globally available
        global.LogController = LogController.default;

        console.log('📝 LogController initialized for test environment');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize LogController:', error.message);
        throw error;
    }
}

/**
 * Initialize database connection for tests
 */
async function initializeTestDatabase() {
    try {
        // Import database module after appConfig is set up
        const Database = await import('../../database.js');

        // Wait for database to be fully initialized
        const connected = await Database.default.initialize();

        if (connected) {
            console.log('🗄️  Database initialization completed successfully');
        } else {
            console.log('🗄️  Database initialization failed (continuing without database)');
        }
        return connected;
    } catch (error) {
        console.warn('⚠️  Database initialization failed:', error.message);
        return false;
    }
}

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
        // Clean up any leftover files first
        await cleanupTempFiles();
        await cleanupTestDatabases();

        // Initialize global configuration
        await initializeGlobalConfig();

        // Make CommonUtils globally available BEFORE bootstrap
        const CommonUtilsModule = await import('../../utils/common.js');
        global.CommonUtils = CommonUtilsModule.default;
        console.log('🔧 CommonUtils initialized globally for tests');

        // Use shared bootstrap sequence
        const { bootstrap } = await import('../../utils/bootstrap.js');
        await bootstrap({ isTest: true, skipDatabase: false });

        console.log('✅ Jest Global Setup: Test environment ready!');
    } catch (error) {
        console.error('❌ Jest Global Setup failed:', error);
        throw error;
    }
}

// EOF webapp/tests/setup/global-setup.js
