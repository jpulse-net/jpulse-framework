/**
 * @name            jPulse Framework / WebApp
 * @tagline         WebApp for jPulse Framework
 * @description     This is the main application file of the jPulse Framework WebApp
 * @file            webapp/app.js
 * @version         0.3.7
 * @release         2025-09-01
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

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration loader for .conf files
async function loadAppConfig() {
    try {
        const fs = await import('fs');
        const configPath = path.join(__dirname, 'app.conf');
        const content = fs.readFileSync(configPath, 'utf8');
        const fn = new Function(`return (
            ${content}
        )`); // extra newlines in case content ends in a // comment
        const appConfig = fn();
        //console.log('appConfig:', JSON.stringify(appConfig, null, 2));
        return appConfig;
    } catch (error) {
        console.error('Error: Failed to load configuration from app.conf', error);
        process.exit(1);
    }
}

// Load configuration
const appConfig = await loadAppConfig();

// Make appConfig globally available for other modules
appConfig.app.dirName = __dirname;
global.appConfig = appConfig;
console.log('DEBUG appConfig:', JSON.stringify(appConfig, null, 2));

// Load the i18n object
const i18n = await import('./utils/i18n.js').then(m => m.default);

// Make i18n globally available for other modules
global.i18n = i18n;

// Load log controller first for proper logging
const LogController = await import('./controller/log.js').then(m => m.default);

// Make LogController globally available for other modules
global.LogController = LogController;
LogController.logInfo(null, `app: appConfig.app.dirName: ${appConfig.app.dirName}`);

// Load database connections
const database = await import('./database.js').then(m => m.default);

// Load routing
const routes = await import('./routes.js').then(m => m.default);

// Main application function
async function startApp() {
    // Create Express application
    const app = express();

    // Configure middleware
    app.use(cors(appConfig.middleware.cors));
    app.use(bodyParser.urlencoded(appConfig.middleware.bodyParser.urlencoded));
    app.use(bodyParser.json(appConfig.middleware.bodyParser.json));

    // Configure session with MongoDB store
    const sessionConfig = {
        ...appConfig.session,
        store: MongoStore.create({
            clientPromise: Promise.resolve(database.getClient()),
            dbName: appConfig.deployment[appConfig.deployment.mode].db,
            collectionName: 'sessions',
            ttl: Math.floor(appConfig.session.cookie.maxAge / 1000) // TTL in seconds
        })
    };
    app.use(session(sessionConfig));

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
