/**
 * @name            jPulse Framework / WebApp / Main Application
 * @tagline         WebApp for jPulse Framework
 * @description     This is the main application file of the jPulse Framework WebApp
 * @file            webapp/app.js
 * @version         0.8.5
 * @release         2025-10-03
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
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import CommonUtils from './utils/common.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname); // Parent of webapp/

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
            console.log(CommonUtils.formatLogMessage('app', 'Created .jpulse directory at project root'));
        }

        // Check if JSON needs regeneration
        const needsRegeneration = shouldRegenerateConfig(fs, confPath, jsonPath);

        if (needsRegeneration) {
            console.log(CommonUtils.formatLogMessage('app', 'Configuration changed, regenerating .jpulse/app.json...'));
            const config = await generateConsolidatedConfig(fs, confPath);

            // Save consolidated config (remove internal _sources before saving)
            const configToSave = { ...config };
            delete configToSave._sources;
            fs.writeFileSync(jsonPath, JSON.stringify(configToSave, null, 2));

            // Save source metadata from config
            fs.writeFileSync(sourcesPath, JSON.stringify(config._sources, null, 2));

            console.log(CommonUtils.formatLogMessage('app', 'Generated consolidated configuration in .jpulse/app.json'));
            return config;
        } else {
            // Load from cached JSON
            console.log(CommonUtils.formatLogMessage('app', 'Using cached configuration from .jpulse/app.json'));
            return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        }

    } catch (error) {
        console.error(CommonUtils.formatLogMessage('app', `error: Failed to load configuration: ${error.message}`, 'ERR'));
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
    // Phase 1: Load framework config
    const frameworkConfig = loadConfigFile(fs, confPath);

    // W-014: Add site config merging
    const siteConfigPath = path.join(projectRoot, 'site/webapp/app.conf');
    let config = frameworkConfig;
    const sources = [{ path: confPath, type: 'framework', timestamp: fs.statSync(confPath).mtime }];

    if (fs.existsSync(siteConfigPath)) {
        const siteConfig = loadConfigFile(fs, siteConfigPath);
        config = deepMerge(frameworkConfig, siteConfig);
        sources.push({ path: siteConfigPath, type: 'site', timestamp: fs.statSync(siteConfigPath).mtime });
        console.log(CommonUtils.formatLogMessage('app', 'Merged site configuration from site/webapp/app.conf'));
    }

    // Set dirName for path resolution
    config.app.dirName = __dirname;

    // Store source information for cache invalidation
    config._sources = sources;

    // FIXME: W-045 plugin config merging will go here

    return config;
}

// Load configuration
const appConfig = await loadAppConfig();

// Make appConfig globally available for other modules
appConfig.app.dirName = __dirname;
global.appConfig = appConfig;
//console.log('DEBUG appConfig:', JSON.stringify(appConfig, null, 2));

// Load the i18n object and initialize core modules
const { bootstrap } = await import('./utils/bootstrap.js');
const modules = await bootstrap({ isTest: false });

// W-014: Initialize site registry for auto-discovery
const SiteRegistry = (await import('./utils/site-registry.js')).default;
const registryStats = await SiteRegistry.initialize();
console.log(CommonUtils.formatLogMessage('app', `Site registry initialized - ${registryStats.controllers} controllers, ${registryStats.apis} APIs`));

// W-014: Initialize context extensions system
const ContextExtensions = (await import('./utils/context-extensions.js')).default;
await ContextExtensions.initialize();
console.log(CommonUtils.formatLogMessage('app', 'Context extensions initialized'));

// W-049: Build view registry for optimized routing
function buildViewRegistry() {

    // Scan framework view directories
    const frameworkViewPath = path.join(appConfig.app.dirName, 'view');
    let frameworkDirs = [];
    try {
        frameworkDirs = fs.readdirSync(frameworkViewPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
    } catch (error) {
        // Framework view directory doesn't exist
    }

    // Scan site view directories (takes precedence)
    const siteViewPath = path.join(path.dirname(appConfig.app.dirName), 'site/webapp/view');
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
console.log(CommonUtils.formatLogMessage('app', `View registry built - [${global.viewRegistry.viewList.map(v => `'${v}'`).join(', ')}]`));

// Load routing
const routes = await import('./routes.js').then(m => m.default);

// Main application function
async function startApp() {
    // Core modules are already initialized by bootstrap

    // Create Express application
    const app = express();

    // Configure middleware
    app.use(cors(appConfig.middleware.cors));
    app.use(bodyParser.urlencoded(appConfig.middleware.bodyParser.urlencoded));
    app.use(bodyParser.json(appConfig.middleware.bodyParser.json));

    // Configure session with MongoDB store
    app.use(session({
        secret: appConfig.middleware.session.secret,
        resave: appConfig.middleware.session.resave,
        saveUninitialized: appConfig.middleware.session.saveUninitialized,
        store: MongoStore.create({
            clientPromise: Promise.resolve(modules.database.getClient()),  // Use bootstrap result
            dbName: appConfig.deployment[appConfig.deployment.mode].db,
            collectionName: 'sessions',
            touchAfter: appConfig.middleware.session.touchAfter
        })
    }));

    // All app routing is handled by routes.js
    app.use('/', routes);

    // Get port from configuration
    const mode = appConfig.deployment.mode;
    const port = appConfig.deployment[mode].port;

    // Start the server
    app.listen(port, () => {
        // Use LogController for structured logging (no req object for server startup)
        LogController.logInfo(null, 'app', `jPulse Framework WebApp v${appConfig.app.version} (${appConfig.app.release})`);
        LogController.logInfo(null, 'app', `Server running in ${appConfig.deployment[mode].name} mode on port ${port}`);
        LogController.logInfo(null, 'app', `Database: ${appConfig.deployment[mode].db}`);
    });
}

// Start the application
startApp().catch(error => {
    // Use LogController for error logging (no req object for startup errors)
    LogController.logError(null, 'app', `error: Failed to start application: ${error.message}`);
    process.exit(1);
});

// EOF webapp/app.js
