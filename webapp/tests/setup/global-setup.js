/**
 * @name            jPulse Framework / WebApp / Tests / Setup / Global Setup
 * @tagline         Jest Global Setup
 * @description     Global setup for Jest tests runs once before all tests start
 * @file            webapp/tests/setup/global-setup.js
 * @version         1.6.7
 * @release         2026-02-04
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
const TEST_FILE = 'webapp/tests/setup/global-setup.js';

/**
 * Global warning collector for test warnings
 * Collects all WARNING: messages during test execution
 */
if (!global.testWarnings) {
    global.testWarnings = [];
    const originalConsoleLog = console.log;

    // Intercept console.log to collect warnings
    console.log = function(...args) {
        const message = args.join(' ');
        // Check if message contains WARNING: (may have leading spaces from Jest formatting)
        if (message.includes('WARNING:')) {
            // Extract just the WARNING: part and everything after
            const warningIndex = message.indexOf('WARNING:');
            if (warningIndex !== -1) {
                const warningMessage = message.substring(warningIndex);
                global.testWarnings.push(warningMessage);
            }
        }
        // Always call original to preserve normal output
        originalConsoleLog.apply(console, args);
    };
}

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
        console.log(`⚠️  WARNING: Failed to initialize global appConfig: ${error.message} [${TEST_FILE}]`);
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
        console.log(`⚠️  WARNING: Failed to initialize LogController: ${error.message} [${TEST_FILE}]`);
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
        console.log(`⚠️  WARNING: Database initialization failed: ${error.message} [${TEST_FILE}]`);
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
                    console.log(`⚠️  WARNING: Could not remove ${file}: ${error.message} [${TEST_FILE}]`);
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

        // Use shared bootstrap sequence with Redis disabled for tests
        const { bootstrap } = await import('../../utils/bootstrap.js');
        await bootstrap({ isTest: true, skipDatabase: false, skipRedis: true });

        // W-014: Initialize site controller registry AFTER bootstrap to ensure db is ready for controllers
        const SiteControllerRegistryModule = await import('../../utils/site-controller-registry.js');
        await SiteControllerRegistryModule.default.initialize();
        console.log('🔧 SiteControllerRegistry initialized for tests');

        // W-014: Initialize context extensions system
        const ContextExtensionsModule = await import('../../utils/context-extensions.js');
        await ContextExtensionsModule.default.initialize();
        console.log('🔧 ContextExtensions initialized for tests');

        console.log('✅ Jest Global Setup: Test environment ready!');
    } catch (error) {
        console.log(`⚠️  WARNING: Jest Global Setup failed: ${error.message || error} [${TEST_FILE}]`);
        throw error;
    }
}

// EOF webapp/tests/setup/global-setup.js
