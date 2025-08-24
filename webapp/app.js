/**
 * @name            jPulse Framework / WebApp
 * @tagline         WebApp for jPulse Framework
 * @description     This is the main application file of the jPulse Framework WebApp
 * @file            webapp/app.js
 * @version         0.1.5
 * @release         2025-08-24
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

// Configuration loader for .conf files
async function loadAppConfig() {
    try {
        const fs = await import('fs');
        const content = fs.readFileSync('./webapp/app.conf', 'utf8');
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
global.appConfig = appConfig;

// Load the i18n object
const i18n = await import('./translations/i18n.js').then(m => m.default);

// Make i18n globally available for other modules
global.i18n = i18n;

// Load log controller first for proper logging
const LogController = await import('./controller/log.js').then(m => m.default);

// Make LogController globally available for other modules
global.LogController = LogController;

// Load database connection
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
    app.use(session(appConfig.session));

    // Serve static files (this is preempted by nginx if the app is running behind a reverse proxy)
    app.use('/static', express.static('static'));

    // Use routes
    app.use('/', routes);

    // Get port from configuration
    const mode = appConfig.deployment.mode;
    const port = appConfig.deployment[mode].port;

    // Start the server
    app.listen(port, () => {
        // Use LogController for structured logging (no req object for server startup)
        LogController.console(null, `jPulse Framework WebApp v${appConfig.app.version} (${appConfig.app.release})`);
        LogController.console(null, `Server running in ${appConfig.deployment[mode].name} mode on port ${port}`);
        LogController.console(null, `Database: ${appConfig.deployment[mode].db}`);
    });
}

// Start the application
startApp().catch(error => {
    // Use LogController for error logging (no req object for startup errors)
    LogController.error(null, `Failed to start application: ${error.message}`);
    process.exit(1);
});

// EOF app.js
