/**
 * @name            jPulse Framework / WebApp / Utils / Redis Manager
 * @tagline         Redis connection management with cluster support and graceful fallback
 * @description     Manages Redis connections for sessions, WebSocket, broadcasting, and metrics
 * @file            webapp/utils/redis-manager.js
 * @version         1.1.7
 * @release         2025-11-18
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import Redis from 'ioredis';

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

    // Recently processed message cache for deduplication
    static recentlyProcessedMessages = new Set();

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
    static instanceId = global.appConfig.system.instanceId;

    // Broadcast callback registry for automatic channel handling
    static broadcastCallbacks = new Map();
    static subscribedChannels = new Set();

    // Self-message behavior configuration (omitSelf: true/false per channel/pattern)
    static _selfMessageConfig = new Map([
        ['view:helloNotification:message:sent', true], // Built-in notifications: omit self
        ['view:*', false], // Default for custom view channels: include self
        ['controller:*', true], // Default for controller channels: omit self (server-side)
        ['model:*', true], // Default for model channels: omit self (server-side)
    ]);

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

            // W-082: Subscribe to a single master pattern to prevent duplicate message events.
            // The application will handle dispatching to the correct, most specific callback.
            if (RedisManager.connections.broadcast.subscriber) {
                const masterPattern = RedisManager.getKey('broadcast', '*');
                RedisManager.connections.broadcast.subscriber.psubscribe(masterPattern);
                RedisManager.connections.broadcast.subscriber.on('pmessage', (pattern, channel, messageStr) => {
                    RedisManager._handleBroadcastMessage(channel, messageStr);
                });
                global.LogController?.logInfo(null, 'redis-manager._createConnections',
                    `Subscribed to master broadcast pattern: ${masterPattern}`);
            }

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
            // Build URL based on configuration - support both single server and cluster deployments
            let instanceUrl;
            if (global.appConfig.deployment?.mode === 'prod' && global.appConfig.deployment?.prod?.url) {
                // Use production URL if configured
                instanceUrl = global.appConfig.deployment.prod.url;
            } else {
                // Default to localhost for development
                instanceUrl = `http://localhost:${global.appConfig.system.port}`;
            }

            const instanceData = {
                instanceId,
                hostname: global.appConfig.system.hostname,
                pid: global.appConfig.system.pid,
                port: global.appConfig.system.port,
                url: instanceUrl,
                registeredAt: Date.now(),
                lastSeen: Date.now()
            };

            // Register instance in Redis
            const instanceKey = RedisManager.getKey('instance', instanceId);
            const instanceTTL = RedisManager.config?.connections?.metrics?.instanceTtl || 120;
            await RedisManager.getClient('metrics').setex(instanceKey, instanceTTL, JSON.stringify(instanceData));

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
     * Get all registered instances from Redis (public API)
     * @returns {Promise<Array>} Array of instance data
     */
    static async getRegisteredInstances() {
        return await this._getRegisteredInstances();
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

                        // Check if instance is still alive (within configured TTL)
                        const instanceTTL = RedisManager.config?.connections?.metrics?.instanceTtl || 120;
                        if (Date.now() - parsed.lastSeen < (instanceTTL * 1000)) {
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
        if (RedisManager.isAvailable) {
            // Redis available - publish to Redis for cluster-wide distribution
            const publisher = RedisManager.getClient('broadcast', 'publisher');

            if (!publisher) {
                // Graceful fallback: call local callbacks if publisher not available
                RedisManager._handleCallbackMessage(channel, data, RedisManager.instanceId);
                return true;
            }

            try {
                const message = {
                    channel,
                    data,
                    instanceId: RedisManager.instanceId,
                    timestamp: Date.now()
                };

                const key = RedisManager.getKey('broadcast', channel);
                await publisher.publish(key, JSON.stringify(message));

                global.LogController?.logInfo(null, 'redis-manager.publishBroadcast',
                    `Broadcast published: ${channel} from ${RedisManager.instanceId}`);
                return true;
            } catch (error) {
                global.LogController?.logError(null, 'redis-manager.publishBroadcast',
                    `Failed to publish broadcast ${channel}: ${error.message}`);
                // Fallback to local callbacks on error
                RedisManager._handleCallbackMessage(channel, data, RedisManager.instanceId);
                return true;
            }
        } else {
            // Redis not available - call local callbacks directly (single-instance mode)
            RedisManager._handleCallbackMessage(channel, data, RedisManager.instanceId);
            global.LogController?.logInfo(null, 'redis-manager.publishBroadcast',
                `Broadcast handled locally (Redis unavailable): ${channel} from ${RedisManager.instanceId}`);
            return true;
        }
    }

    /**
     * Publish message with automatic callback registration and self-message control
     * @param {string} channel - Channel name to publish and subscribe to
     * @param {Object} data - Message data to broadcast
     * @param {Function} callback - Callback function (channel, data, sourceInstanceId) => void
     * @param {Object} options - Optional configuration
     * @param {boolean} options.omitSelf - Whether to omit self-messages (default: false)
     * @returns {boolean} True if published and subscribed successfully, false if Redis unavailable
     */
    static async publishBroadcastWithCallback(channel, data, callback, options = {}) {
        const { omitSelf = false } = options;

        // First register the callback for this channel
        RedisManager.registerBroadcastCallback(channel, callback, { omitSelf });

        // Then publish the message
        return await RedisManager.publishBroadcast(channel, data);
    }


    /**
     * Register a callback for a broadcast channel
     * @param {string} channel - Channel name or pattern (supports wildcards: 'controller:*')
     * @param {Function} callback - Callback function (channel, data, sourceInstanceId) => void
     * @param {Object} options - Optional configuration
     * @param {boolean} options.omitSelf - If true, callback won't be invoked for messages from its
     *        own instance. This is useful to avoid processing own broadcasts (e.g., health metrics).
     *        Default: false for 'view:*', true for 'controller:*' and 'model:*'
     */
    static registerBroadcastCallback(channel, callback, options = {}) {
        if (typeof callback !== 'function') {
            global.LogController?.logError(null, 'redis-manager.registerBroadcastCallback',
                `Callback must be a function for channel: ${channel}`);
            return;
        }

        // Validate channel schema before registering
        if (!options._skipChannelValidation && !RedisManager._validateChannelSchema(channel)) {
            global.LogController?.logError(null, 'redis-manager.registerBroadcastCallback',
                `Invalid channel schema: ${channel}`);
            return;
        }

        // Store the callback regardless of Redis availability (for potential future use)
        RedisManager.broadcastCallbacks.set(channel, callback);

        // Configure self-message behavior if specified
        if (options.omitSelf === true) {
            RedisManager._selfMessageConfig.set(channel, true);
        }

        // W-082: Do not subscribe here. Subscription is handled centrally at startup.
        if (RedisManager.isAvailable) {
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
        // Validate channel schema first
        if (!RedisManager._validateChannelSchema(channel)) {
            global.LogController?.logWarning(null, 'redis-manager._handleCallbackMessage',
                `Invalid channel schema: ${channel}`);
            return;
        }

        // Find matching callback using improved pattern matching
        // Sort by specificity: longer patterns first, then non-wildcard patterns
        const sortedCallbacks = Array.from(RedisManager.broadcastCallbacks.entries()).sort((a, b) => {
            const aPattern = a[0];
            const bPattern = b[0];

            // Prioritize longer (more specific) patterns first
            if (aPattern.length !== bPattern.length) {
                return bPattern.length - aPattern.length;
            }

            // For same length, prioritize non-wildcard over wildcard patterns
            const aHasWildcard = aPattern.includes('*') || aPattern.includes('?');
            const bHasWildcard = bPattern.includes('*') || bPattern.includes('?');
            if (aHasWildcard !== bHasWildcard) {
                return aHasWildcard ? 1 : -1; // Non-wildcard first
            }

            return 0;
        });

        // Only call the FIRST (most specific) matching callback
        for (const [registeredChannel, callback] of sortedCallbacks) {
            if (RedisManager._channelMatches(channel, registeredChannel)) {
                // Check if we should omit self-messages for this callback
                const shouldOmitSelf = RedisManager._selfMessageConfig.get(registeredChannel);
                if (shouldOmitSelf && sourceInstanceId === RedisManager.instanceId) {
                    // Skip callback if omitSelf is true and message is from self
                    return;
                }

                try {
                    callback(channel, data, sourceInstanceId);
                } catch (error) {
                    global.LogController._logError(null, 'redis-manager._handleCallbackMessage',
                        `Error in callback for channel ${channel}: ${error.message}`);
                }
                break; // Exit after calling the first match
            }
        }
    }

    /**
     * Check if a channel matches a registered pattern
     * @private
     */
    static _channelMatches(channel, pattern) {
        if (channel === pattern) {
            return true;
        }

        // Handle wildcard patterns (e.g., 'view:*' matches 'view:config:refresh')
        if (pattern.endsWith('*')) {
            const prefix = pattern.slice(0, -1);
            return channel.startsWith(prefix);
        }

        return false;
    }

    /**
     * Validate channel schema with corrected regex
     * @private
     */
    static _validateChannelSchema(channel) {
        // Updated regex: handles both full patterns and wildcards
        // - Full: component:scope:type:action[:word]* (minimum 4 parts, maximum 17)
        // - Wildcard: component:scope:type:action[:word]*:* (minimum 2 parts, maximum 16)
        const channelRegex = /^(model|view|controller)((:[\w\.\-]+){3,16}|(:[\w\.\-]+){1,15}:\*)$/;

        if (!channelRegex.test(channel)) {
            global.LogController?.logWarning(null, 'redis-manager._validateChannelSchema',
                `Invalid channel format: ${channel}. Expected: (model|view|controller):scope:type:action[:word]*[:*]?`);
            return false;
        }

        return true; // Empty parts check is handled by the regex (+ qualifier)
    }

    /**
     * Handle incoming broadcast messages
     * @private
     */
    static _handleBroadcastMessage(channel, messageStr) {
        try {
            // Remove prefix from channel
            const prefix = RedisManager.getKey('broadcast', '');
            const originalChannel = channel.startsWith(prefix) ? channel.substring(prefix.length) : channel;

            const message = JSON.parse(messageStr);

            // Dispatch to registered callbacks
            RedisManager._handleCallbackMessage(originalChannel, message.data, message.instanceId);
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager._handleBroadcastMessage',
                `Error parsing broadcast message on channel ${channel}: ${error.message}`);
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

            subscriber.punsubscribe(...prefixedChannels);

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
