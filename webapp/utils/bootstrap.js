/**
 * @name            jPulse Framework / WebApp / Utils / Bootstrap
 * @tagline         Shared bootstrap sequence for app and tests
 * @description     Ensures proper module loading order for both app and test environments
 * @file            webapp/utils/bootstrap.js
 * @version         1.6.5
 * @release         2026-02-02
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.4, Claude Sonnet 4.5
 */

import CommonUtils from './common.js';

let isBootstrapped = false;

function bootstrapLog(message, level = 'info') {
    console.log(CommonUtils.formatLogMessage('bootstrap', message, level));
}

/**
 * Bootstrap the jPulse Framework in the correct dependency order
 * @param {object} options - Bootstrap options
 * @param {boolean} options.isTest - Whether this is a test environment
 * @param {boolean} options.skipDatabase - Whether to skip database initialization
 * @param {boolean} options.skipRedis - Whether to skip Redis initialization (for tests)
 * @returns {object} Initialized modules
 */
export async function bootstrap(options = {}) {
    const { isTest = false, skipDatabase = false, skipRedis = false } = options;

    if (isBootstrapped) {
        bootstrapLog('⏭️  Bootstrap already completed, skipping...');
        return;
    }
    isBootstrapped = true;

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

        // Step 5: Initialize HookManager (W-105 - must be before PluginManager)
        const HookManagerModule = await import('./hook-manager.js');
        global.HookManager = HookManagerModule.default;
        bootstrapLog('✅ HookManager: Initialized (available for plugin hook registration)');

        // Step 6: Initialize PluginManager (W-045 - moved up for cleaner dependency flow)
        // Discovers and validates plugins BEFORE views and controllers
        const PluginManagerModule = await import('./plugin-manager.js');
        global.PluginManager = PluginManagerModule.default;
        bootstrapLog('PluginManager: Module loaded, ready for initialization');

        // Step 6.1: Initialize PluginManager
        const pluginStats = await PluginManagerModule.default.initialize();
        // PluginManager.initialize() returns getMetrics() which exposes counts under stats.*
        const discoveredPlugins = pluginStats?.stats?.total ?? 0;
        const enabledPlugins = pluginStats?.stats?.enabled ?? 0;
        const disabledPlugins = pluginStats?.stats?.disabled ?? 0;
        bootstrapLog(`✅ PluginManager: Discovered ${discoveredPlugins} plugins (${enabledPlugins} enabled, ${disabledPlugins} disabled)`);

        // Step 6.2: Load Plugin Model (W-045)
        const PluginModelModule = await import('../model/plugin.js');
        await PluginModelModule.default.ensureIndexes(isTest);
        bootstrapLog('✅ PluginModel: Indexes ensured');

        // Step 6.3: Get active plugins for logging
        const activePlugins = PluginManagerModule.default.getActivePlugins();
        bootstrapLog(`PluginManager: ${activePlugins.length} active plugins in load order: ${activePlugins.map(p => p.name).join(', ') || 'none'}`);

        // Step 6.4: Register plugin hooks (W-105)
        const hookStats = await PluginManagerModule.default.registerPluginHooks();
        if (hookStats.registered > 0) {
            bootstrapLog(`✅ PluginHooks: Registered ${hookStats.registered} hook(s) from ${hookStats.plugins.length} plugin(s)`);
        }

        // Step 7: ViewController (depends on LogController, i18n, database, PluginManager)
        // Now builds view registry WITH plugin directories automatically (no rebuild needed!)
        const ViewControllerModule = await import('../controller/view.js');
        bootstrapLog('ViewController: Module loaded, ready for initialization');
        await ViewControllerModule.default.initialize();
        global.ViewController = ViewControllerModule.default;
        bootstrapLog('✅ ViewController: Initialized');

        // Step 8: Initialize Redis Manager (W-076 - depends on LogController)
        let redisManager = null;
        let sessionStore = null;

        if (!skipRedis) {
            const RedisManagerModule = await import('./redis-manager.js');
            bootstrapLog('RedisManager: Module loaded, ready for initialization');
            await RedisManagerModule.default.initialize(global.appConfig.redis);
            global.RedisManager = RedisManagerModule.default;
            bootstrapLog(`✅ RedisManager: Initialized - Instance: ${RedisManagerModule.default.getInstanceId()}, Available: ${RedisManagerModule.default.isRedisAvailable()}`);

            // Step 8.1: Configure session store with Redis fallback (W-076)
            sessionStore = await RedisManagerModule.default.configureSessionStore(database);
            bootstrapLog('✅ SessionStore: Configured with Redis/fallback');

            redisManager = RedisManagerModule.default;
        } else {
            bootstrapLog('⏭️  RedisManager: Skipped for test environment');

            // W-076: Even in tests, we need a global RedisManager instance in fallback mode
            const RedisManagerModule = await import('./redis-manager.js');
            await RedisManagerModule.default.initialize({ enabled: false });
            global.RedisManager = RedisManagerModule.default;
            bootstrapLog('✅ RedisManager: Initialized in fallback mode for tests');

            // For tests, use simple memory store
            const session = await import('express-session');
            const MemoryStore = session.default.MemoryStore;
            sessionStore = new MemoryStore();
            bootstrapLog('✅ SessionStore: Configured with MemoryStore for tests');
        }

        // Step 9: Initialize app cluster controller (W-143 - merged broadcast functionality)
        try {
            const AppClusterControllerModule = await import('../controller/appCluster.js');
            AppClusterControllerModule.default.initialize();
            bootstrapLog('✅ AppClusterController: Initialized (WebSocket namespace + broadcast + cache APIs)');
        } catch (error) {
            bootstrapLog(`❌ AppClusterController initialization failed: ${error.message}`, 'error');
            bootstrapLog(`Error details: ${error.stack || error}`, 'error');
        }

        // Step 10: Initialize health controller clustering (W-076)
        const HealthControllerModule = await import('../controller/health.js');
        await HealthControllerModule.default.initialize();
        global.HealthController = HealthControllerModule.default;
        bootstrapLog('✅ HealthController: Initialized with Redis clustering and registered globally');

        // Step 10.1: Initialize compliance reporting scheduler (W-137)
        if (!isTest) {
            HealthControllerModule.default.initializeComplianceScheduler();
            bootstrapLog('✅ ComplianceScheduler: Initialized (checking every 15 minutes)');
        }

        // Step 11: Set up CommonUtils globally
        global.CommonUtils = CommonUtils;
        bootstrapLog('✅ CommonUtils: Available globally');

        // Step 12: Make UserModel available globally for plugin schema extensions
        // Plugins may call global.UserModel.extendSchema() during controller initialization
        const UserModelModuleEarly = await import('../model/user.js');
        global.UserModel = UserModelModuleEarly.default;

        // Step 13: Make ConfigModel available globally for plugin schema extensions (W-147)
        // Plugins may call global.ConfigModel.extendSchema() during controller initialization
        const ConfigModelModuleEarly = await import('../model/config.js');
        global.ConfigModel = ConfigModelModuleEarly.default;

        // Step 14: Initialize site controller registry (W-014, W-045)
        // Discovers site controllers and their API methods
        // W-045: Can now also discover plugin controllers since PluginManager is initialized
        let siteControllerRegistry = null;
        if (!isTest) {  // Only for app, not tests
            const SiteControllerRegistryModule = await import('./site-controller-registry.js');
            const registryStats = await SiteControllerRegistryModule.default.initialize();
            global.SiteControllerRegistry = SiteControllerRegistryModule.default;
            siteControllerRegistry = SiteControllerRegistryModule.default;
            bootstrapLog(`✅ SiteControllerRegistry: ${registryStats.controllers} controllers, ${registryStats.apis} APIs`);
        }

        // Step 15: Initialize context extensions (W-014)
        // Extends template context with site-specific data
        const ContextExtensionsModule = await import('./context-extensions.js');
        await ContextExtensionsModule.default.initialize();
        global.ContextExtensions = ContextExtensionsModule.default;
        bootstrapLog('✅ ContextExtensions: Initialized with providers');

        // Step 16: Initialize UserModel schema (W-045 - after plugins loaded, so they can extend schemas)
        // global.UserModel is already available from Step 12
        global.UserModel.initializeSchema();
        bootstrapLog('✅ UserModel: Schema initialized with plugin extensions');

        // Step 17: Initialize ConfigModel schema (W-147 - after plugins loaded, so they can extend config schema)
        global.ConfigModel.initializeSchema();
        bootstrapLog('✅ ConfigModel: Schema initialized with plugin extensions');

        // Step 18: Initialize ThemeManager and extend UserModel theme enum (W-129)
        try {
            const ThemeManagerModule = await import('./theme-manager.js');
            ThemeManagerModule.default.initialize({ isTest });
            global.ThemeManager = ThemeManagerModule.default;
            bootstrapLog('✅ ThemeManager: Initialized');

            // Extend schema with discovered themes for preferences.theme selector
            global.ThemeManager.extendUserModelSchema(global.UserModel);
            bootstrapLog('✅ ThemeManager: Schema extended');
        } catch (error) {
            bootstrapLog(`⚠️  ThemeManager: Initialization failed (continuing without): ${error.message}`, 'error');
        }

        // Step 19: Initialize ConfigController
        const ConfigControllerModule = await import('../controller/config.js');
        ConfigControllerModule.default.initialize();
        global.ConfigController = ConfigControllerModule.default;
        bootstrapLog(`✅ ConfigController: Initialized (defaultDocName: ${ConfigControllerModule.default.getDefaultDocName()})`);

        // Step 20: Initialize HandlebarController (W-088)
        const HandlebarControllerModule = await import('../controller/handlebar.js');
        await HandlebarControllerModule.default.initialize();
        global.HandlebarController = HandlebarControllerModule.default;
        bootstrapLog('✅ HandlebarController: Initialized');

        // Step 21: Auto-discover and register custom Handlebars helpers (W-116)
        // Must be after HandlebarController.initialize() and SiteControllerRegistry.initialize()
        if (!isTest && siteControllerRegistry) {
            const helperCount = await HandlebarControllerModule.default.initializeHandlebarHandlers();
            if (helperCount > 0) {
                bootstrapLog(`✅ Handlebars Helpers: Registered ${helperCount} custom helper(s) from controllers`);
            }
        }

        // Step 22: Initialize EmailController (W-087)
        const EmailControllerModule = await import('../controller/email.js');
        const emailReady = await EmailControllerModule.default.initialize();
        global.EmailController = EmailControllerModule.default;
        if (emailReady) {
            bootstrapLog('✅ EmailController: Initialized');
        } else {
            bootstrapLog('⚠️  EmailController: Not configured (email sending disabled)');
        }

        // Step 23: Initialize UserController (W-112 - register metrics provider)
        const UserControllerModule = await import('../controller/user.js');
        await UserControllerModule.default.initialize();
        global.UserController = UserControllerModule.default;
        bootstrapLog('✅ UserController: Initialized with metrics provider');

        // Step 24: Build viewRegistry for routes.js compatibility
        // Legacy global for routes.js to use
        global.viewRegistry = {
            viewList: global.ViewController.getViewList(),
            viewRouteRE: global.ViewController.getViewRouteRE()
        };
        bootstrapLog(`✅ viewRegistry: Built with ${global.viewRegistry.viewList.length} directories`);

        // Step 25: Prepare WebSocketController (but don't initialize server yet)
        // Server initialization requires Express app and http.Server
        const WebSocketControllerModule = await import('../controller/websocket.js');
        global.WebSocketController = WebSocketControllerModule.default;
        bootstrapLog('✅ WebSocketController: Class available (server init pending)');

        bootstrapLog(`🎉 ${isTest ? 'Test' : 'App'} initialization complete!`);

        return {
            LogController: LogControllerModule.default,
            i18n: i18n,
            database: database,
            redisManager: redisManager,
            sessionStore: sessionStore,
            healthController: HealthControllerModule.default,
            siteControllerRegistry: siteControllerRegistry,
            webSocketController: WebSocketControllerModule.default
        };

    } catch (error) {
        bootstrapLog(`❌ Bootstrap failed:`, error.message);
        throw error;
    }
}

// EOF webapp/utils/bootstrap.js
