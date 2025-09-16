/**
 * @name            jPulse Framework / WebApp / Utils / Bootstrap
 * @tagline         Shared bootstrap sequence for app and tests
 * @description     Ensures proper module loading order for both app and test environments
 * @file            webapp/utils/bootstrap.js
 * @version         0.7.6
 * @release         2025-09-16
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           95%, Cursor 1.2, Claude Sonnet 4
 */

import CommonUtils from './common.js';

function bootstrapLog(message, level = 'msg') {
    console.log(CommonUtils.formatLogMessage(`bootstrap: ${message}`, level));
}

/**
 * Bootstrap the jPulse Framework in the correct dependency order
 * @param {object} options - Bootstrap options
 * @param {boolean} options.isTest - Whether this is a test environment
 * @param {boolean} options.skipDatabase - Whether to skip database initialization
 * @returns {object} Initialized modules
 */
export async function bootstrap(options = {}) {
    const { isTest = false, skipDatabase = false } = options;

    bootstrapLog(`🚀 Starting ${isTest ? 'test' : 'app'} initialization...`);

    try {
        // Step 1: Ensure appConfig is available
        if (!global.appConfig) {
            throw new Error('appConfig must be available before bootstrap. Call loadAppConfig() first.');
        }
        bootstrapLog('✅ appConfig: Available');

        // Step 2: Initialize LogController
        const LogControllerModule = await import('../controller/log.js');
        bootstrapLog('LogController: Module loaded, ready for initialization');
        await LogControllerModule.default.initialize();
        global.LogController = LogControllerModule.default;
        bootstrapLog('✅ LogController: Initialized');

        // Step 3: Initialize i18n (depends on LogController being globally available)
        const i18nModule = await import('./i18n.js');
        bootstrapLog('i18n: Module loaded, ready for initialization');
        const i18n = await i18nModule.initialize();  // No parameter needed!
        global.i18n = i18n;
        bootstrapLog('✅ i18n: Initialized');

        // Step 4: Initialize Database (depends on LogController, can use i18n)
        let database = null;
        if (!skipDatabase) {
            const databaseModule = await import('../database.js');
            bootstrapLog('database: Module loaded, ready for initialization');
            const connected = await databaseModule.default.initialize();
            global.Database = databaseModule.default;
            bootstrapLog(`✅ Database: ${connected ? 'Connected' : 'Failed (continuing without)'}`);
            database = databaseModule.default;
        } else {
            bootstrapLog('⏭️  Database: Skipped');
        }

        // Step 5: Set up CommonUtils globally
        global.CommonUtils = CommonUtils;
        bootstrapLog('✅ CommonUtils: Available globally');

        bootstrapLog(`🎉 ${isTest ? 'Test' : 'App'} initialization complete!`);

        return {
            LogController: LogControllerModule.default,
            i18n: i18n,
            database: database
        };

    } catch (error) {
        bootstrapLog(`❌ Bootstrap failed:`, error.message);
        throw error;
    }
}

// EOF webapp/utils/bootstrap.js
