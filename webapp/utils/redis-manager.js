/**
 * @name            jPulse Framework / WebApp / Utils / Redis Manager
 * @tagline         Redis connection management with cluster support and graceful fallback
 * @description     Manages Redis connections for sessions, WebSocket, broadcasting, and metrics
 * @file            webapp/utils/redis-manager.js
 * @version         1.0.0
 * @release         2025-10-12
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import Redis from 'ioredis';
import os from 'os';

/**
 * Redis Connection Manager for jPulse Framework
 *
 * Provides centralized Redis connection management with:
 * - Single Redis instance and Redis Cluster support
 * - Graceful fallback when Redis unavailable
 * - Separate connection pools for different services
 * - Instance identification for cluster coordination
 * - Health monitoring and automatic reconnection
 */
class RedisManager {

    // Static instance for singleton pattern
    static instance = null;

    // Connection pools
    static connections = {
        session: null,
        websocket: {
            publisher: null,
            subscriber: null
        },
        broadcast: {
            publisher: null,
            subscriber: null
        },
        metrics: null
    };

    // Redis availability status
    static isAvailable = false;
    static config = null;
    static instanceId = null;

    // Broadcast callback registry for automatic channel handling
    static broadcastCallbacks = new Map();
    static subscribedChannels = new Set();

    /**
     * Initialize Redis Manager
     * @param {Object} redisConfig - Redis configuration from app.conf
     * @returns {RedisManager} Singleton instance
     */
    static initialize(redisConfig) {
        if (RedisManager.instance) {
            return RedisManager.instance;
        }

        RedisManager.config = redisConfig;
        // Use centralized instanceId from appConfig.system
        RedisManager.instanceId = global.appConfig.system.instanceId;

        // Only create connections if Redis is enabled
        if (redisConfig.enabled) {
            RedisManager._createConnections();
        } else {
            global.LogController?.logInfo(null, 'redis-manager.initialize',
                'Redis disabled - graceful fallback mode (sessions: memory, websocket: local, cache: ignore, metrics: local)');
        }

        RedisManager.instance = RedisManager;
        return RedisManager.instance;
    }

    /**
     * Generate unique instance identifier
     * Format: {hostname_numeric}:{pm2_id} or {hostname_short}:{pm2_id}
     * @private
     */
    static _generateInstanceId() {
        const hostname = os.hostname();
        const pm2Id = process.env.pm_id || process.env.NODE_APP_INSTANCE || '0';
        const pid = process.pid;

        // Use a combination of hostname, PM2 ID, and PID for uniqueness
        // This handles local testing (different PIDs) and PM2 clustering (different PM2 IDs)
        return `${hostname}:${pm2Id}:${pid}`;
    }

    /**
     * Create Redis connections based on configuration
     * @private
     */
    static _createConnections() {
        try {
            const config = RedisManager.config;

            // Create base Redis client factory
            const createClient = (purpose) => {
                const clientConfig = config.mode === 'cluster'
                    ? RedisManager._createClusterConfig(purpose)
                    : RedisManager._createSingleConfig(purpose);

                const client = config.mode === 'cluster'
                    ? new Redis.Cluster(config.cluster.nodes, clientConfig)
                    : new Redis(clientConfig);

                // Add connection event handlers
                RedisManager._addConnectionHandlers(client, purpose);

                return client;
            };

            // Create service-specific connections
            RedisManager.connections.session = createClient('session');
            RedisManager.connections.websocket.publisher = createClient('websocket-pub');
            RedisManager.connections.websocket.subscriber = createClient('websocket-sub');
            RedisManager.connections.broadcast.publisher = createClient('broadcast-pub');
            RedisManager.connections.broadcast.subscriber = createClient('broadcast-sub');
            RedisManager.connections.metrics = createClient('metrics');

            global.LogController?.logInfo(null, 'redis-manager._createConnections',
                `Redis connections created in ${config.mode} mode for instance ${RedisManager.instanceId}`);

        } catch (error) {
            global.LogController?.logError(null, 'redis-manager._createConnections',
                `Failed to create Redis connections: ${error.message}`);
            RedisManager.isAvailable = false;
        }

        // Test connection to set isAvailable flag properly
        // This is needed because lazyConnect: true doesn't trigger connect events until first operation
        if (RedisManager.config.enabled) {
            RedisManager._testConnection();
        }
    }

    /**
     * Test Redis connection to set isAvailable flag
     * @private
     */
    static async _testConnection() {
        try {
            const sessionClient = RedisManager.connections.session;
            if (sessionClient) {
                await sessionClient.ping();
                RedisManager.isAvailable = true;
                global.LogController?.logInfo(null, 'redis-manager._testConnection',
                    'Redis connection test successful - Redis available');

                // Register this instance for discovery
                await RedisManager._registerInstance();
            }
        } catch (error) {
            RedisManager.isAvailable = false;
            global.LogController?.logInfo(null, 'redis-manager._testConnection',
                `Redis connection test failed: ${error.message} - using fallback mode`);
        }
    }

    /**
     * Register this instance in Redis for discovery by other instances
     * @private
     */
    static async _registerInstance() {
        if (!RedisManager.isAvailable) return;

        try {
            const instanceId = RedisManager.instanceId;
            const instanceData = {
                instanceId,
                hostname: global.appConfig.system.hostname,
                pid: global.appConfig.system.pid,
                port: global.appConfig.system.port,
                url: `http://localhost:${global.appConfig.system.port}`,
                registeredAt: Date.now(),
                lastSeen: Date.now()
            };

            // Register instance in Redis
            const instanceKey = RedisManager.getKey('instance', instanceId);
            await RedisManager.getClient('metrics').setex(instanceKey, 300, JSON.stringify(instanceData)); // 5 minute TTL

            // Add to instances set for easy discovery
            await RedisManager.getClient('metrics').sadd('instances', instanceId);

            global.LogController?.logInfo(null, 'redis-manager._registerInstance',
                `Registered instance ${instanceId} in Redis`);

        } catch (error) {
            global.LogController?.logError(null, 'redis-manager._registerInstance',
                `Failed to register instance: ${error.message}`);
        }
    }

    /**
     * Get all registered instances from Redis
     * @returns {Promise<Array>} Array of instance data
     * @private
     */
    static async _getRegisteredInstances() {
        if (!RedisManager.isAvailable) return [];

        try {
            const instanceIds = await RedisManager.getClient('metrics').smembers('instances');

            const instances = [];
            for (const instanceId of instanceIds) {
                try {
                    const instanceKey = RedisManager.getKey('instance', instanceId);
                    const instanceData = await RedisManager.getClient('metrics').get(instanceKey);

                    if (instanceData) {
                        const parsed = JSON.parse(instanceData);

                        // Check if instance is still alive (within 2 minutes)
                        if (Date.now() - parsed.lastSeen < 120000) {
                            instances.push(parsed);
                        } else {
                            // Clean up expired instance
                            await RedisManager.getClient('metrics').srem('instances', instanceId);
                            await RedisManager.getClient('metrics').del(instanceKey);
                        }
                    }
                } catch (error) {
                    // Skip invalid instance data
                }
            }

            return instances;

        } catch (error) {
            global.LogController?.logError(null, 'redis-manager._getRegisteredInstances',
                `Failed to get registered instances: ${error.message}`);
            return [];
        }
    }

    /**
     * Create single Redis instance configuration
     * @private
     */
    static _createSingleConfig(purpose) {
        const config = RedisManager.config.single;
        return {
            host: config.host,
            port: config.port,
            password: config.password || undefined,
            db: config.db || 0,
            connectTimeout: config.connectTimeout || 10000,
            lazyConnect: config.lazyConnect !== false,
            retryDelayOnFailover: config.retryDelayOnFailover || 100,
            maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
            enableOfflineQueue: true, // Allow queuing commands during connection
            connectionName: `jpulse-${purpose}-${RedisManager.instanceId}`
        };
    }

    /**
     * Create Redis Cluster configuration
     * @private
     */
    static _createClusterConfig(purpose) {
        const config = RedisManager.config.cluster;
        return {
            redisOptions: {
                password: config.password || undefined,
                connectTimeout: config.redisOptions?.connectTimeout || 10000,
                lazyConnect: config.redisOptions?.lazyConnect !== false,
                connectionName: `jpulse-${purpose}-${RedisManager.instanceId}`
            },
            enableOfflineQueue: true, // Allow queuing commands during connection
            retryDelayOnFailover: config.retryDelayOnFailover || 100,
            maxRetriesPerRequest: config.maxRetriesPerRequest || 3
        };
    }

    /**
     * Add connection event handlers
     * @private
     */
    static _addConnectionHandlers(client, purpose) {
        client.on('connect', () => {
            global.LogController?.logInfo(null, 'redis-manager._addConnectionHandlers',
                `Redis ${purpose} connected`);
            RedisManager.isAvailable = true;
        });

        client.on('ready', () => {
            global.LogController?.logInfo(null, 'redis-manager._addConnectionHandlers',
                `Redis ${purpose} ready`);
        });

        client.on('error', (error) => {
            global.LogController?.logError(null, 'redis-manager._addConnectionHandlers',
                `Redis ${purpose} error: ${error.message}`);
            RedisManager.isAvailable = false;
        });

        client.on('close', () => {
            global.LogController?.logInfo(null, 'redis-manager._addConnectionHandlers',
                `Redis ${purpose} connection closed`);
            RedisManager.isAvailable = false;
        });

        client.on('reconnecting', () => {
            global.LogController?.logInfo(null, 'redis-manager._addConnectionHandlers',
                `Redis ${purpose} reconnecting`);
        });
    }

    /**
     * Get Redis client for specific service
     * @param {string} service - Service name: 'session', 'websocket', 'broadcast', 'metrics'
     * @param {string} type - For pub/sub services: 'publisher' or 'subscriber'
     * @returns {Redis|null} Redis client or null if unavailable
     */
    static getClient(service, type = null) {
        if (!RedisManager.config?.enabled || !RedisManager.isAvailable) {
            return null;
        }

        if (type) {
            return RedisManager.connections[service]?.[type] || null;
        }

        return RedisManager.connections[service] || null;
    }

    /**
     * Check if Redis is available
     * @returns {boolean} True if Redis is available
     */
    static isRedisAvailable() {
        return RedisManager.config?.enabled && RedisManager.isAvailable;
    }

    /**
     * Get instance identifier
     * @returns {string} Instance ID in format hostname:pm2_id
     */
    static getInstanceId() {
        return RedisManager.instanceId;
    }

    /**
     * Get Redis configuration
     * @returns {Object} Redis configuration object
     */
    static getConfig() {
        return RedisManager.config;
    }

    /**
     * Get key with service prefix
     * @param {string} service - Service name
     * @param {string} key - Base key
     * @returns {string} Prefixed key
     */
    static getKey(service, key) {
        const prefix = RedisManager.config?.connections?.[service]?.keyPrefix || '';
        return `${prefix}${key}`;
    }

    /**
     * Get TTL for service
     * @param {string} service - Service name
     * @returns {number} TTL in seconds
     */
    static getTTL(service) {
        return RedisManager.config?.connections?.[service]?.ttl || 3600;
    }

    /**
     * Graceful shutdown - close all connections
     */
    static async shutdown() {
        global.LogController?.logInfo(null, 'redis-manager.shutdown', 'Closing Redis connections');

        const closePromises = [];

        // Close all connections
        Object.values(RedisManager.connections).forEach(connection => {
            if (connection && typeof connection.disconnect === 'function') {
                closePromises.push(connection.disconnect());
            } else if (connection && typeof connection === 'object') {
                // Handle pub/sub connections
                Object.values(connection).forEach(subConnection => {
                    if (subConnection && typeof subConnection.disconnect === 'function') {
                        closePromises.push(subConnection.disconnect());
                    }
                });
            }
        });

        // Clean up broadcast callback subscriptions
        if (RedisManager.connections.broadcast?.subscriber) {
            try {
                // Unsubscribe from all broadcast patterns
                if (RedisManager.connections.broadcast.subscriber.unsubscribe) {
                    await RedisManager.connections.broadcast.subscriber.unsubscribe();
                }
                if (RedisManager.connections.broadcast.subscriber.punsubscribe) {
                    await RedisManager.connections.broadcast.subscriber.punsubscribe();
                }
            } catch (error) {
                // Ignore errors during shutdown - connections may already be closed
                global.LogController?.logInfo(null, 'redis-manager.shutdown',
                    `Unsubscribe cleanup completed: ${error.message}`);
            }
        }

        try {
            await Promise.all(closePromises);
            global.LogController?.logInfo(null, 'redis-manager.shutdown', 'All Redis connections closed');
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.shutdown',
                `Error closing Redis connections: ${error.message}`);
        }

        // Reset state
        RedisManager.isAvailable = false;
        RedisManager.subscribedChannels.clear();
        RedisManager.connections = {
            session: null,
            websocket: { publisher: null, subscriber: null },
            broadcast: { publisher: null, subscriber: null },
            metrics: null
        };
    }

    /**
     * Configure session store with Redis and graceful fallback
     * @param {Object} database - Database instance for MongoDB fallback
     * @returns {Object} Configured session store
     */
    static async configureSessionStore(database) {
        // Dynamic imports for session stores
        const session = await import('express-session');
        const RedisStore = (await import('connect-redis')).default;
        const MongoStore = (await import('connect-mongo')).default;

        const redisClient = RedisManager.getClient('session');

        if (redisClient) {
            // Use Redis for session storage
            const store = new RedisStore({
                client: redisClient,
                prefix: RedisManager.getKey('session', ''),
                ttl: RedisManager.getTTL('session')
            });
            global.LogController?.logInfo(null, 'redis-manager.configureSessionStore', 'Session store: Redis (cluster-ready)');
            return store;
        } else {
            // Fallback based on configuration
            const fallbackMode = RedisManager.config?.fallback?.sessions || 'memory';

            if (fallbackMode === 'memory') {
                // Use Express built-in MemoryStore
                const store = new session.default.MemoryStore();
                global.LogController?.logInfo(null, 'redis-manager.configureSessionStore', 'Session store: Memory (fallback mode)');
                return store;
            } else {
                // Fallback to MongoDB (existing behavior)
                const store = MongoStore.create({
                    clientPromise: Promise.resolve(database.getClient()),
                    dbName: global.appConfig.deployment[global.appConfig.deployment.mode].db,
                    collectionName: 'sessions',
                    touchAfter: global.appConfig.middleware.session.touchAfter
                });
                global.LogController?.logInfo(null, 'redis-manager.configureSessionStore', 'Session store: MongoDB (fallback mode)');
                return store;
            }
        }
    }

    /**
     * Generic broadcasting system using Redis pub/sub
     * Provides the backend for jPulse.appCluster API
     */

    /**
     * Publish message to broadcast channel
     * @param {string} channel - Channel name (e.g., 'controller:helloDashboard:update', 'view:userProfile:refresh')
     * @param {Object} data - Message data to broadcast
     * @returns {boolean} True if published successfully, false if Redis unavailable
     */
    static async publishBroadcast(channel, data) {
        // Early bailout if Redis is not available - fail silently to avoid log noise
        if (!RedisManager.isAvailable) {
            console.log(`[DEBUG] RedisManager: Redis not available, skipping broadcast publish for ${channel}`);
            return false;
        }

        const publisher = RedisManager.getClient('broadcast', 'publisher');

        if (!publisher) {
            // Graceful fallback: return false without logging (Redis disabled)
            console.log(`[DEBUG] RedisManager: No broadcast publisher available for ${channel}`);
            return false;
        }

        try {
            const message = {
                channel,
                data,
                instanceId: RedisManager.instanceId,
                timestamp: Date.now()
            };

            const key = RedisManager.getKey('broadcast', channel);
            console.log(`[DEBUG] RedisManager: Publishing to ${key} with message: ${JSON.stringify(message).substring(0, 200)}...`);
            await publisher.publish(key, JSON.stringify(message));
            console.log(`[DEBUG] RedisManager: Successfully published broadcast: ${channel} from ${RedisManager.instanceId}`);

            global.LogController?.logInfo(null, 'redis-manager.publishBroadcast',
                `Broadcast published: ${channel} from ${RedisManager.instanceId}`);
            return true;
        } catch (error) {
            console.log(`[DEBUG] RedisManager: Failed to publish broadcast ${channel}: ${error.message}`);
            global.LogController?.logError(null, 'redis-manager.publishBroadcast',
                `Failed to publish broadcast ${channel}: ${error.message}`);
            return false;
        }
    }

    /**
     * Publish message with automatic callback registration
     * This method publishes a broadcast and automatically subscribes to receive responses
     * @param {string} channel - Channel name to publish and subscribe to
     * @param {Object} data - Message data to broadcast
     * @param {Function} callback - Callback function (channel, data, sourceInstanceId) => void
     * @returns {boolean} True if published and subscribed successfully, false if Redis unavailable
     */
    static async publishBroadcastWithCallback(channel, data, callback) {
        // First register the callback for this channel
        RedisManager.registerBroadcastCallback(channel, callback);

        // Then publish the message
        return await RedisManager.publishBroadcast(channel, data);
    }

    /**
     * Register a callback for a broadcast channel
     * @param {string} channel - Channel name or pattern
     * @param {Function} callback - Callback function (channel, data, sourceInstanceId) => void
     */
    static registerBroadcastCallback(channel, callback) {
        if (typeof callback !== 'function') {
            global.LogController?.logError(null, 'redis-manager.registerBroadcastCallback',
                `Callback must be a function for channel: ${channel}`);
            return;
        }

        // Store the callback regardless of Redis availability (for potential future use)
        RedisManager.broadcastCallbacks.set(channel, callback);

        // Only subscribe and log if Redis is available and not already subscribed
        if (RedisManager.isAvailable) {
            // Subscribe to the channel automatically (only if not already subscribed)
            if (!RedisManager.subscribedChannels.has(channel)) {
                RedisManager.subscribeBroadcast([channel], RedisManager._handleCallbackMessage);
                RedisManager.subscribedChannels.add(channel);
            }

            global.LogController?.logInfo(null, 'redis-manager.registerBroadcastCallback',
                `Registered callback for channel: ${channel}`);
        }
        // If Redis is not available, fail silently - callback is stored for potential future use
    }

    /**
     * Internal handler for callback-based messages
     * @private
     */
    static _handleCallbackMessage(channel, data, sourceInstanceId) {
        console.log(`[DEBUG] RedisManager: Handling callback message for channel ${channel} from ${sourceInstanceId}`);
        console.log(`[DEBUG] RedisManager: Current registered callbacks: ${Array.from(RedisManager.broadcastCallbacks.keys()).join(', ')}`);

        // Find matching callback (exact match or pattern match)
        // Sort patterns by specificity (longest first) to prioritize more specific patterns
        const sortedCallbacks = Array.from(RedisManager.broadcastCallbacks.entries()).sort((a, b) => {
            const aPattern = a[0];
            const bPattern = b[0];
            // Prioritize patterns that are more specific (longer patterns first)
            if (aPattern.length !== bPattern.length) {
                return bPattern.length - aPattern.length;
            }
            // For same length, prioritize non-wildcard patterns
            const aHasWildcard = aPattern.includes('*');
            const bHasWildcard = bPattern.includes('*');
            if (aHasWildcard !== bHasWildcard) {
                return aHasWildcard ? 1 : -1;
            }
            return 0;
        });

        let matched = false;
        for (const [registeredChannel, callback] of sortedCallbacks) {
            console.log(`[DEBUG] RedisManager: Checking if ${channel} matches pattern ${registeredChannel}`);
            if (RedisManager._channelMatches(channel, registeredChannel)) {
                console.log(`[DEBUG] RedisManager: Channel ${channel} matches pattern ${registeredChannel}, calling callback`);
                try {
                    callback(channel, data, sourceInstanceId);
                    matched = true;
                } catch (error) {
                    console.log(`[DEBUG] RedisManager: Error in callback for channel ${channel}: ${error.message}`);
                    global.LogController?.logError(null, 'redis-manager._handleCallbackMessage',
                        `Error in callback for channel ${channel}: ${error.message}`);
                }
                break; // Only call the first matching callback
            }
        }

        if (!matched) {
            console.log(`[DEBUG] RedisManager: No matching callback found for channel ${channel}`);
        }
    }

    /**
     * Check if a channel matches a registered pattern
     * @private
     */
    static _channelMatches(channel, pattern) {
        console.log(`[DEBUG] RedisManager: Checking if channel "${channel}" matches pattern "${pattern}"`);
        if (channel === pattern) {
            console.log(`[DEBUG] RedisManager: Exact match found`);
            return true;
        }

        // Handle wildcard patterns (e.g., 'view:*' matches 'view:config:refresh')
        if (pattern.endsWith('*')) {
            const prefix = pattern.slice(0, -1);
            const matches = channel.startsWith(prefix);
            console.log(`[DEBUG] RedisManager: Pattern match check: "${channel}".startsWith("${prefix}") = ${matches}`);
            return matches;
        }

        console.log(`[DEBUG] RedisManager: No match found`);
        return false;
    }

    /**
     * Subscribe to broadcast channels with callback
     * @param {string|Array} channels - Channel name(s) or pattern(s) to subscribe to
     * @param {Function} callback - Callback function (channel, data, sourceInstanceId)
     * @returns {boolean} True if subscribed successfully, false if Redis unavailable
     */
    static subscribeBroadcast(channels, callback) {
        // Early bailout if Redis is not available - fail silently to avoid log noise
        if (!RedisManager.isAvailable) {
            return false;
        }

        const subscriber = RedisManager.getClient('broadcast', 'subscriber');

        if (!subscriber) {
            // Graceful fallback: return false without logging (Redis disabled)
            return false;
        }

        try {
            // Ensure channels is an array
            const channelArray = Array.isArray(channels) ? channels : [channels];

            // Add prefix to channels
            const prefixedChannels = channelArray.map(ch => RedisManager.getKey('broadcast', ch));

            // Subscribe to channels
            if (channelArray.some(ch => ch.includes('*') || ch.includes('?'))) {
                // Pattern subscription
                subscriber.psubscribe(...prefixedChannels);
            } else {
                // Exact channel subscription
                subscriber.subscribe(...prefixedChannels);
            }

            // Set up message handler
            subscriber.on('message', (channel, messageStr) => {
                RedisManager._handleBroadcastMessage(channel, messageStr, callback);
            });

            subscriber.on('pmessage', (pattern, channel, messageStr) => {
                RedisManager._handleBroadcastMessage(channel, messageStr, callback);
            });

            global.LogController?.logInfo(null, 'redis-manager.subscribeBroadcast',
                `Subscribed to broadcast channels: ${channelArray.join(', ')}`);
            return true;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.subscribeBroadcast',
                `Failed to subscribe to broadcasts: ${error.message}`);
            return false;
        }
    }

    /**
     * Handle incoming broadcast messages
     * @private
     */
    static _handleBroadcastMessage(channel, messageStr, callback) {
        try {
            // Remove prefix from channel
            const prefix = RedisManager.getKey('broadcast', '');
            const cleanChannel = channel.startsWith(prefix) ? channel.slice(prefix.length) : channel;
            const message = JSON.parse(messageStr);

            // Determine if we're in single instance mode (Redis unavailable)
            const isSingleInstanceMode = !RedisManager.isRedisAvailable();

            // In cluster mode, ignore messages from our own instance to prevent loops
            // In single instance mode, allow all messages (including self) for testing
            if (!isSingleInstanceMode && message.instanceId === RedisManager.instanceId) {
                return;
            }

            // Call the callback with clean channel name
            callback(cleanChannel, message.data, message.instanceId);

        } catch (error) {
            global.LogController?.logError(null, 'redis-manager._handleBroadcastMessage',
                `Error handling broadcast message: ${error.message}`);
        }
    }

    /**
     * Unsubscribe from broadcast channels
     * @param {string|Array} channels - Channel name(s) to unsubscribe from
     * @returns {boolean} True if unsubscribed successfully
     */
    static unsubscribeBroadcast(channels) {
        const subscriber = RedisManager.getClient('broadcast', 'subscriber');

        if (!subscriber) {
            return false;
        }

        try {
            const channelArray = Array.isArray(channels) ? channels : [channels];
            const prefixedChannels = channelArray.map(ch => RedisManager.getKey('broadcast', ch));

            subscriber.unsubscribe(...prefixedChannels);

            global.LogController?.logInfo(null, 'redis-manager.unsubscribeBroadcast',
                `Unsubscribed from broadcast channels: ${channelArray.join(', ')}`);
            return true;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.unsubscribeBroadcast',
                `Failed to unsubscribe from broadcasts: ${error.message}`);
            return false;
        }
    }

    /**
     * Health check for Redis connections
     * @returns {Object} Health status for all connections
     */
    static async healthCheck() {
        const health = {
            enabled: RedisManager.config?.enabled || false,
            available: RedisManager.isAvailable,
            instanceId: RedisManager.instanceId,
            mode: RedisManager.config?.mode || 'unknown',
            connections: {}
        };

        if (!RedisManager.isAvailable) {
            return health;
        }

        // Test each connection
        const testConnection = async (name, client) => {
            try {
                if (client && typeof client.ping === 'function') {
                    await client.ping();
                    return { status: 'connected', latency: Date.now() };
                }
                return { status: 'unavailable', error: 'No client' };
            } catch (error) {
                return { status: 'error', error: error.message };
            }
        };

        // Test all service connections
        health.connections.session = await testConnection('session', RedisManager.connections.session);
        health.connections.websocketPub = await testConnection('websocket-pub', RedisManager.connections.websocket.publisher);
        health.connections.websocketSub = await testConnection('websocket-sub', RedisManager.connections.websocket.subscriber);
        health.connections.broadcastPub = await testConnection('broadcast-pub', RedisManager.connections.broadcast.publisher);
        health.connections.broadcastSub = await testConnection('broadcast-sub', RedisManager.connections.broadcast.subscriber);
        health.connections.metrics = await testConnection('metrics', RedisManager.connections.metrics);

        return health;
    }
}

export default RedisManager;

// EOF webapp/utils/redis-manager.js
