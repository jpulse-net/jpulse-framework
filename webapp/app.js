/**
 * @name            jPulse Framework / WebApp / Main Application
 * @tagline         WebApp for jPulse Framework
 * @description     This is the main application file of the jPulse Framework WebApp
 * @file            webapp/app.js
 * @version         0.9.7
 * @release         2025-10-12
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

// Load required modules
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';
import CommonUtils from './utils/common.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname); // Parent of webapp/

// common logging function for app
function appLog(message, level = 'msg') {
    console.log(CommonUtils.formatLogMessage('app', message, level));
}

// Smart configuration loader with timestamp-based caching
async function loadAppConfig() {
    try {
        const fs = await import('fs');

        // Configuration paths
        const confPath = path.join(__dirname, 'app.conf');
        const jpulseDir = path.join(projectRoot, '.jpulse');
        const jsonPath = path.join(jpulseDir, 'app.json');
        const sourcesPath = path.join(jpulseDir, 'config-sources.json');

        // Ensure .jpulse directory exists
        if (!fs.existsSync(jpulseDir)) {
            fs.mkdirSync(jpulseDir, { recursive: true });
            appLog('Created .jpulse directory at project root');
        }

        // Check if JSON needs regeneration
        let config = null;
        const needsRegeneration = shouldRegenerateConfig(fs, confPath, jsonPath);

        if (needsRegeneration) {
            appLog('Configuration changed, regenerating .jpulse/app.json...');
            config = await generateConsolidatedConfig(fs, confPath);

            // Save consolidated config (remove internal _sources before saving)
            const configToSave = { ...config };
            delete configToSave._sources;
            fs.writeFileSync(jsonPath, JSON.stringify(configToSave, null, 2));

            // Save source metadata from config
            fs.writeFileSync(sourcesPath, JSON.stringify(config._sources, null, 2));

            appLog('Generated consolidated configuration in .jpulse/app.json');
            return config;
        } else {
            // Load config from cached JSON
            appLog('Using cached configuration from .jpulse/app.json');
            config = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        }

        // Set config.system metadata that may change between app instances on same server
        const hostname = os.hostname();
        const serverName = hostname.split('.')[0];
        const serverId = parseInt(serverName.replace(/^[^0-9]*([0-9]*).*$/, '$1') || '0', 10) || 0;
        const pm2Id = parseInt(process.env.pm_id || process.env.NODE_APP_INSTANCE || '0', 10) || 0;
        const pid = process.pid;
        config.system.hostname = hostname;
        config.system.serverName = serverName;
        config.system.serverId = serverId;
        config.system.pm2Id = pm2Id;
        config.system.pid = pid;
        config.system.instanceName = `${serverName}:${pm2Id}:${pid}`;
        config.system.instanceId = `${serverId}:${pm2Id}:${pid}`;
        console.log('DEBUG: process.env.NODE_APP_INSTANCE: ' + process.env.NODE_APP_INSTANCE);
        appLog(`appConfig.system.hostname: Set to ${hostname}`);
        appLog(`appConfig.system.serverName: Set to ${serverName}`);
        appLog(`appConfig.system.serverId: Set to ${serverId}`);
        appLog(`appConfig.system.pm2Id: Set to ${pm2Id}`);
        appLog(`appConfig.system.pid: Set to ${pid}`);
        appLog(`appConfig.system.instanceName: Set to ${config.system.instanceName}`);
        appLog(`appConfig.system.instanceId: Set to ${config.system.instanceId}`);

        // Initialize config.system.port number
        const portArgIndex = process.argv.indexOf('--port');
        let port = 0;
        let portSuffix = '';
        if (portArgIndex > -1 && process.argv[portArgIndex + 1]) {
            port = parseInt(process.argv[portArgIndex + 1], 10);
            if (port > 0) {
                portSuffix = `via --port command line argument`;
            }
        }
        if (!port) {
            port = parseInt(process.env.PORT, 10);
            if(port > 0) {
                portSuffix = `via PORT environment variable`;
            }
        }
        if (!port) {
            const mode = config.deployment?.mode || 'dev';
            port = config.deployment?.[mode]?.port;
            if(port > 0) {
                portSuffix = `via configured value for ${mode} mode`;
            } else {
                port = 8080;
                portSuffix = `(fallback)`;
            }
        }
        config.system.port = port;
        appLog(`appConfig.system.port: Set to ${port} ${portSuffix}`);

        return config;

    } catch (error) {
        appLog(`error: Failed to load configuration: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

// Check if configuration needs regeneration
function shouldRegenerateConfig(fs, confPath, jsonPath) {
    // If JSON doesn't exist, regenerate
    if (!fs.existsSync(jsonPath)) {
        return true;
    }
    const jsonStat = fs.statSync(jsonPath);
    // Check framework config timestamp
    const confStat = fs.statSync(confPath);
    if (confStat.mtime > jsonStat.mtime) {
        return true;
    }
    // W-014: Check site config timestamp if it exists
    const siteConfigPath = path.join(projectRoot, 'site/webapp/app.conf');
    if (fs.existsSync(siteConfigPath)) {
        const siteConfStat = fs.statSync(siteConfigPath);
        if (siteConfStat.mtime > jsonStat.mtime) {
            return true;
        }
    }
    return false;
}

// Deep merge utility for configuration objects
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                // Recursively merge objects
                result[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                // Override primitive values and arrays
                result[key] = source[key];
            }
        }
    }
    return result;
}

// Load configuration file with error handling
function loadConfigFile(fs, configPath) {
    try {
        const content = fs.readFileSync(configPath, 'utf8');
        return new Function(`return (${content})`)();
    } catch (error) {
        throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
    }
}

// Generate consolidated configuration with site override support
async function generateConsolidatedConfig(fs, confPath) {
    // Step 1: Load jPulse Framework config (webapp/app.conf)
    let config = loadConfigFile(fs, confPath);

    // Step 2: Set system directories
    config.system.projectRoot = projectRoot;
    config.system.appDir = __dirname;
    config.system.siteDir = path.join(projectRoot, 'site', 'webapp');

    // Step 3: Merge site config (W-014)
    const siteConfigPath = path.join(projectRoot, 'site/webapp/app.conf');
    const sources = [{ path: confPath, type: 'framework', timestamp: fs.statSync(confPath).mtime }];
    if (fs.existsSync(siteConfigPath)) {
        const siteConfig = loadConfigFile(fs, siteConfigPath);
        config = deepMerge(config, siteConfig);
        sources.push({ path: siteConfigPath, type: 'site', timestamp: fs.statSync(siteConfigPath).mtime });
        appLog('Merged site configuration from site/webapp/app.conf');
    }

    // Step 4: Merge plugin config (W-045)
    //FIXME: Implementation of W-045 plugin system

    // Step 5: Store source information for cache invalidation
    config._sources = sources;

    return config;
}

// Load configuration
const appConfig = await loadAppConfig();
appLog('App configuration: ' + JSON.stringify(appConfig));

// Make appConfig globally available for other modules
global.appConfig = appConfig;

// Load the i18n object and initialize core modules
const { bootstrap } = await import('./utils/bootstrap.js');
const modules = await bootstrap({ isTest: false });

// W-014: Initialize site registry for auto-discovery
const SiteRegistry = (await import('./utils/site-registry.js')).default;
const registryStats = await SiteRegistry.initialize();
appLog(`Site registry initialized - ${registryStats.controllers} controllers, ${registryStats.apis} APIs`);

// W-014: Initialize context extensions system
const ContextExtensions = (await import('./utils/context-extensions.js')).default;
await ContextExtensions.initialize();
appLog('Context extensions initialized');

// W-049: Build view registry for optimized routing
function buildViewRegistry() {

    // Scan framework view directories
    const frameworkViewPath = path.join(appConfig.system.appDir, 'view');
    let frameworkDirs = [];
    try {
        frameworkDirs = fs.readdirSync(frameworkViewPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
    } catch (error) {
        // Framework view directory doesn't exist
    }

    // Scan site view directories (takes precedence)
    const siteViewPath = path.join(path.dirname(appConfig.system.siteDir), 'view');
    let siteDirs = [];
    try {
        siteDirs = fs.readdirSync(siteViewPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
    } catch (error) {
        // Site view directory doesn't exist
    }

    // Combine with site precedence
    const viewSet = new Set([...siteDirs, ...frameworkDirs]);
    const viewList = Array.from(viewSet).sort();
    const viewRouteRE = new RegExp('^/(' + viewList.join('|') + ')(/|$)');

    return { viewList, viewRouteRE };
}

global.viewRegistry = buildViewRegistry();
appLog(`View registry built - [${global.viewRegistry.viewList.map(v => `'${v}'`).join(', ')}]`);

// Load routing
const routes = await import('./routes.js').then(m => m.default);

// Load WebSocket controller
const WebSocketController = (await import('./controller/websocket.js')).default;

// Main application function
async function startApp() {
    // Core modules are already initialized by bootstrap

    // Create Express application
    const app = express();

    // Configure middleware
    app.use(cors(appConfig.middleware.cors));
    app.use(bodyParser.urlencoded(appConfig.middleware.bodyParser.urlencoded));
    app.use(bodyParser.json(appConfig.middleware.bodyParser.json));

    // W-076: Configure session middleware using pre-configured store from bootstrap
    const sessionMiddleware = session({
        secret: appConfig.middleware.session.secret,
        resave: appConfig.middleware.session.resave,
        saveUninitialized: appConfig.middleware.session.saveUninitialized,
        store: modules.sessionStore,
        cookie: {
            secure: appConfig.deployment.mode === 'production',
            httpOnly: true,
            maxAge: appConfig.middleware.session.cookie.maxAge
        }
    });
    app.use(sessionMiddleware);

    // All app routing is handled by routes.js
    app.use('/', routes);

    // Start the HTTP server
    const server = app.listen(appConfig.system.port, () => {
        const mode = appConfig.deployment?.mode || 'dev';
        const dbMode = appConfig.database?.mode || 'standalone';
        const dbName = appConfig.database?.[dbMode]?.name || 'jp-dev';
        LogController.logInfo(null, 'app', `jPulse Framework WebApp v${appConfig.app.jPulse.version} (${appConfig.app.jPulse.release})`);
        LogController.logInfo(null, 'app', `Server running in ${mode} mode on port ${appConfig.system.port}`);
        LogController.logInfo(null, 'app', `Database: ${dbName} (${dbMode} mode)`);
    });

    // Initialize WebSocket server with session middleware
    await WebSocketController.initialize(server, sessionMiddleware);

    // Initialize site WebSocket controllers
    try {
        const HelloWebsocketController = (await import('../site/webapp/controller/helloWebsocket.js')).default;
        await HelloWebsocketController.initialize();
    } catch (error) {
        // Site controller may not exist - that's ok
        LogController.logInfo(null, 'app', 'No site WebSocket controllers to initialize');
    }
}

// Start the application
startApp().catch(error => {
    // Use LogController for error logging (no req object for startup errors)
    LogController.logError(null, 'app', `error: Failed to start application: ${error.message}`);
    process.exit(1);
});

// Graceful shutdown handling
import cacheManager from './utils/cache-manager.js';

async function gracefulShutdown(signal) {
    LogController.logInfo(null, 'app', `${signal} received, shutting down gracefully`);

    try {
        // Shutdown Redis connections
        // Shutdown health controller broadcasting
        await modules.healthController.shutdown();

        await modules.redisManager.shutdown();

        // Shutdown cache manager
        cacheManager.shutdown();

        LogController.logInfo(null, 'app', 'Graceful shutdown completed');
    } catch (error) {
        LogController.logError(null, 'app', `Error during shutdown: ${error.message}`);
    }

    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// EOF webapp/app.js
