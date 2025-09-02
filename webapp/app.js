/**
 * @name            jPulse Framework / WebApp
 * @tagline         WebApp for jPulse Framework
 * @description     This is the main application file of the jPulse Framework WebApp
 * @file            webapp/app.js
 * @version         0.4.1
 * @release         2025-09-02
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

// Load required modules
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
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
            console.log(CommonUtils.formatLogMessage('app: Created .jpulse directory at project root'));
        }

        // Check if JSON needs regeneration
        const needsRegeneration = shouldRegenerateConfig(fs, confPath, jsonPath);

        if (needsRegeneration) {
            console.log(CommonUtils.formatLogMessage('app: Configuration changed, regenerating .jpulse/app.json...'));
            const config = await generateConsolidatedConfig(fs, confPath);

            // Save consolidated config
            fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

            // Save source metadata
            const sources = [{ path: confPath, type: 'framework', timestamp: fs.statSync(confPath).mtime }];
            fs.writeFileSync(sourcesPath, JSON.stringify(sources, null, 2));

            console.log(CommonUtils.formatLogMessage('app: Generated consolidated configuration in .jpulse/app.json'));
            return config;
        } else {
            // Load from cached JSON
            console.log(CommonUtils.formatLogMessage('app: Using cached configuration from .jpulse/app.json'));
            return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        }

    } catch (error) {
        console.error(CommonUtils.formatLogMessage(`app: error: Failed to load configuration: ${error.message}`, 'ERR'));
        process.exit(1);
    }
}

// Check if configuration needs regeneration
function shouldRegenerateConfig(fs, confPath, jsonPath) {
    // If JSON doesn't exist, regenerate
    if (!fs.existsSync(jsonPath)) {
        return true;
    }

    // If source .conf is newer than cached JSON, regenerate
    const confStat = fs.statSync(confPath);
    const jsonStat = fs.statSync(jsonPath);

    return confStat.mtime > jsonStat.mtime;
}

// Generate consolidated configuration (Phase 1: single source)
async function generateConsolidatedConfig(fs, confPath) {
    // Phase 1: Load framework config only
    const content = fs.readFileSync(confPath, 'utf8');
    const config = new Function(`return (${content})`)();

    // Set dirName just like the main app logic does
    config.app.dirName = __dirname;

    // Future phases will add plugin and site config merging here

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
        LogController.logInfo(null, `app: jPulse Framework WebApp v${appConfig.app.version} (${appConfig.app.release})`);
        LogController.logInfo(null, `app: Server running in ${appConfig.deployment[mode].name} mode on port ${port}`);
        LogController.logInfo(null, `app: Database: ${appConfig.deployment[mode].db}`);
    });
}

// Start the application
startApp().catch(error => {
    // Use LogController for error logging (no req object for startup errors)
    LogController.logError(null, `app: Failed to start application: ${error.message}`);
    process.exit(1);
});

// EOF webapp/app.js
