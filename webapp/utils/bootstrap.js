/**
 * @name            jPulse Framework / WebApp / Utils / Bootstrap
 * @tagline         Shared bootstrap sequence for app and tests
 * @description     Ensures proper module loading order for both app and test environments
 * @file            webapp/utils/bootstrap.js
 * @version         0.9.7
 * @release         2025-10-12
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import CommonUtils from './common.js';

function bootstrapLog(message, level = 'msg') {
    console.log(CommonUtils.formatLogMessage('bootstrap', message, level));
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

            // Step 4.1: Post-initialize LogController now that database is ready
            if (connected) {
                await LogControllerModule.default.postInitialize();
                bootstrapLog('✅ LogController: Post-initialized with database');
            }
        } else {
            bootstrapLog('⏭️  Database: Skipped');
        }

        // Step 5: ViewController (depends on LogController, i18n, database)
        const ViewControllerModule = await import('../controller/view.js');
        bootstrapLog('ViewController: Module loaded, ready for initialization');
        await ViewControllerModule.default.initialize();
        bootstrapLog('✅ ViewController: Initialized');

        // Step 6: Initialize Redis Manager (W-076 - depends on LogController)
        const RedisManagerModule = await import('./redis-manager.js');
        bootstrapLog('RedisManager: Module loaded, ready for initialization');
        RedisManagerModule.default.initialize(global.appConfig.redis);
        bootstrapLog(`✅ RedisManager: Initialized - Instance: ${RedisManagerModule.default.getInstanceId()}, Available: ${RedisManagerModule.default.isRedisAvailable()}`);

        // Step 6.1: Configure session store with Redis fallback (W-076)
        const sessionStore = await RedisManagerModule.default.configureSessionStore(database);
        bootstrapLog('✅ SessionStore: Configured with Redis/fallback');

        // Step 6.2: Initialize broadcast controller (W-076)
        const BroadcastControllerModule = await import('../controller/broadcast.js');
        BroadcastControllerModule.default.initialize();
        bootstrapLog('✅ BroadcastController: Initialized with framework subscriptions');

        // Step 6.3: Initialize health controller clustering (W-076)
        const HealthControllerModule = await import('../controller/health.js');
        HealthControllerModule.default.initialize();
        bootstrapLog('✅ HealthController: Initialized with Redis clustering');

        // Step 7: Set up CommonUtils globally
        global.CommonUtils = CommonUtils;
        bootstrapLog('✅ CommonUtils: Available globally');

        bootstrapLog(`🎉 ${isTest ? 'Test' : 'App'} initialization complete!`);

        return {
            LogController: LogControllerModule.default,
            i18n: i18n,
            database: database,
            redisManager: RedisManagerModule.default,
            sessionStore: sessionStore,
            healthController: HealthControllerModule.default
        };

    } catch (error) {
        bootstrapLog(`❌ Bootstrap failed:`, error.message);
        throw error;
    }
}

// EOF webapp/utils/bootstrap.js
