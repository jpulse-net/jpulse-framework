/**
 * @name            Bubble Framework / WebApp / Database
 * @tagline         WebApp for Bubble Framework
 * @description     This is the database interface for the Bubble Framework WebApp
 * @file            webapp/database.js
 * @version         0.1.3
 * @release         2025-08-24
 * @repository      https://github.com/peterthoeny/bubble-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { MongoClient } from 'mongodb';

let db = null;
let client = null;

/**
 * Initialize database connection
 * @returns {Promise<boolean>} Success status
 */
async function connect() {
    try {
        // Get configuration
        const mode = appConfig.deployment.mode;
        const dbName = appConfig.deployment[mode].db;
        const dbMode = appConfig.database.mode;
        const config = appConfig.database[dbMode];

        // Build connection URL
        let url = config.url.replace('%DB%', dbName);
        if (dbMode === 'replicaSet') {
            url = url.replace('%SERVERS%', config.servers.join(','));
        }

        // For local development, use a simple connection without authentication
        if (url.includes('localhost')) {
            url = `mongodb://localhost:27017/${dbName}`;
        }

        // Create client with simplified options for local development
        const clientOptions = url.includes('localhost') ? {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000
        } : config.options;

        client = new MongoClient(url, clientOptions);

        // Connect to MongoDB
        await client.connect();
        db = client.db(dbName);

        // Use LogController if available, otherwise fallback to console
        if (global.LogController) {
            LogController.console(null, `Connected to MongoDB: ${dbName} (${dbMode} mode)`);
        } else {
            console.log(`Connected to MongoDB: ${dbName} (${dbMode} mode)`);
        }
        return true;
    } catch (error) {
        // Use LogController if available, otherwise fallback to console
        if (global.LogController) {
            LogController.error(null, `Database connection failed (continuing without database): ${error.message}`);
        } else {
            console.warn('Database connection failed (continuing without database):', error.message);
        }
        return false;
    }
}

/**
 * Get database instance
 * @returns {object} MongoDB database instance
 */
function getDb() {
    return db;
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
async function close() {
    if (client) {
        await client.close();
        db = null;
        client = null;
        // Use LogController if available, otherwise fallback to console
        if (global.LogController) {
            LogController.console(null, 'Database connection closed');
        } else {
            console.log('Database connection closed');
        }
    }
}

// Initialize connection when module is loaded
connect().catch(error => {
    // Use LogController if available, otherwise fallback to console
    if (global.LogController) {
        LogController.error(null, `Failed to initialize database connection: ${error.message}`);
    } else {
        console.warn('Failed to initialize database connection:', error.message);
    }
});

export default {
    connect,
    getDb,
    close
};

// EOF database.js
