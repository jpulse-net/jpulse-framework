/**
 * @name            jPulse Framework / WebApp / Database
 * @tagline         WebApp for jPulse Framework
 * @description     This is the database interface for the jPulse Framework WebApp
 * @file            webapp/database.js
 * @version         0.7.3
 * @release         2025-09-15
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { MongoClient } from 'mongodb';
import CommonUtils from './utils/common.js';

let db = null;
let client = null;

/**
 * Initialize database connection
 * @returns {Promise<boolean>} Success status
 */
async function connect() {
    try {
        // Check if appConfig is available
        if (!global.appConfig) {
            throw new Error('appConfig is not defined');
        }

        // Get configuration
        const mode = global.appConfig.deployment.mode;
        const dbName = global.appConfig.deployment[mode].db;
        const dbMode = global.appConfig.database.mode;
        const config = global.appConfig.database[dbMode];

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

        console.log(CommonUtils.formatLogMessage(`database: Connected to: ${dbName} (${dbMode} mode)`));
        return true;
    } catch (error) {
        console.error(CommonUtils.formatLogMessage(`database: error: Connection failed (continuing without database): ${error.message}`, 'ERR'));
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
 * Get MongoDB client instance
 * @returns {object} MongoDB client instance
 */
function getClient() {
    return client;
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
        console.log(CommonUtils.formatLogMessage('database: Connection closed'));
    }
}

let isInitialized = false;
let initializationPromise = null;

/**
 * Initialize database connection
 * Returns a promise that resolves when connection is ready
 */
async function initialize() {
    if (isInitialized) {
        return true;
    }

    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            if (!global.appConfig) {
                throw new Error('appConfig must be available before database initialization');
            }

            const connected = await connect();
            isInitialized = connected;
            return connected;
        } catch (error) {
            console.error(CommonUtils.formatLogMessage(`database: error: Failed to initialize database connection: ${error.message}`, 'ERR'));
            isInitialized = false;
            return false;
        }
    })();

    return initializationPromise;
}

/**
 * Check if database is initialized
 */
export function isReady() {
    return isInitialized;
}

// Module is ready for initialization - call initialize() to set up database

export default {
    initialize,
    connect,
    getDb,
    getClient,
    close,
    isReady
};

// EOF webapp/database.js
