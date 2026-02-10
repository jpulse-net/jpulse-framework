/**
 * @name            jPulse Framework / WebApp / Utils / Redis Manager
 * @tagline         Redis connection management with cluster support and graceful fallback
 * @description     Manages Redis connections for sessions, WebSocket, broadcasting, and metrics
 * @file            webapp/utils/redis-manager.js
 * @version         1.6.13
 * @release         2026-02-10
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.4, Claude Sonnet 4.5
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
        metrics: null,
        cache: null  // W-143: Cache operations
    };

    // Redis availability status
    static isAvailable = false;
    static config = null;
    static instanceId = global.appConfig.system.instanceId;

    // Broadcast callback registry for automatic channel handling
    // Maps channel pattern to array of callbacks (supports multiple listeners per channel)
    static broadcastCallbacks = new Map();
    static subscribedChannels = new Set();

    // Self-message behavior configuration (omitSelf: true/false per channel/pattern)
    static _selfMessageConfig = new Map([
        ['view:helloNotification:message:sent', true], // Built-in notifications: omit self
        ['view:*', false], // Default for custom view channels: include self
        ['controller:*', true], // Default for controller channels: omit self (server-side)
        ['model:*', true], // Default for model channels: omit self (server-side)
    ]);

    // Cache statistics (W-143)
    static _cacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        gets: 0,
        deletes: 0
    };

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

        // Register metrics provider (W-112)
        (async () => {
            try {
                const MetricsRegistry = (await import('./metrics-registry.js')).default;
                MetricsRegistry.register('redis', () => RedisManager.getMetrics(), {
                    async: false,
                    category: 'util'
                });
            } catch (error) {
                // MetricsRegistry might not be available yet, will be registered later
                console.warn('RedisManager: Failed to register stats provider:', error.message);
            }
        })();

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
            RedisManager.connections.cache = createClient('cache');  // W-143: Cache operations

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
            const instancesSetKey = RedisManager.getKey('metrics', 'instances');
            await RedisManager.getClient('metrics').sadd(instancesSetKey, instanceId);

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
            const instancesSetKey = RedisManager.getKey('metrics', 'instances');
            const instanceIds = await RedisManager.getClient('metrics').smembers(instancesSetKey);

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
                            await RedisManager.getClient('metrics').srem(instancesSetKey, instanceId);
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
    /**
     * Get full Redis key with namespace and prefix
     * Namespace format: ${siteId}:${mode}:${prefix}${key}
     * Examples:
     * - bubblemap-net:prod:sess:abc123
     * - jpulse-net:prod:bc:controller:config:data:changed
     * - jpulse-framework:dev:sess:xyz789
     *
     * @param {string} service - Service name (e.g., 'session', 'broadcast')
     * @param {string} key - Key name
     * @returns {string} Namespaced key with prefix
     */
    static getKey(service, key) {

        // Get siteId from config (first choice) or slugified shortName (fallback)
        const appConfig = global.appConfig || {};
        let siteId = appConfig.app?.siteId;
        if (!siteId && appConfig.app?.site?.shortName) {
            siteId = global.CommonUtils.slugifyString(appConfig.app.site.shortName);
        }
        if (!siteId) {
            siteId = 'jpulse';  // Final fallback
        }

        // Get deployment mode (default 'dev')
        const mode = appConfig.deployment?.mode || 'dev';

        // Get service-specific prefix
        const prefix = RedisManager.config?.connections?.[service]?.keyPrefix || '';

        // Return namespaced key: ${siteId}:${mode}:${prefix}${key}
        return `${siteId}:${mode}:${prefix}${key}`;
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
     * Get request context for broadcast payloads (username, ip, vm, id).
     * Attach to payload.ctx so logs (publishBroadcast, app cluster relay) show the correct user.
     * @param {Object} req - Express request object (or null for default context)
     * @returns {Object} Context { username, ip, vm, id }
     */
    static getBroadcastContext(req) {
        return global.CommonUtils.getLogContext(req);
    }

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
                await RedisManager._handleCallbackMessage(channel, data, RedisManager.instanceId);
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

                const logCtx = data?.ctx ?? null;
                global.LogController?.logInfo(logCtx, 'redis-manager.publishBroadcast',
                    `Broadcast published: ${channel} from ${RedisManager.instanceId}`);
                return true;
            } catch (error) {
                const logCtx = data?.ctx ?? null;
                global.LogController?.logError(logCtx, 'redis-manager.publishBroadcast',
                    `Failed to publish broadcast ${channel}: ${error.message}`);
                // Fallback to local callbacks on error
                await RedisManager._handleCallbackMessage(channel, data, RedisManager.instanceId);
                return true;
            }
        } else {
            // Redis not available - call local callbacks directly (single-instance mode)
            await RedisManager._handleCallbackMessage(channel, data, RedisManager.instanceId);
            const logCtx = data?.ctx ?? null;
            global.LogController?.logInfo(logCtx, 'redis-manager.publishBroadcast',
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
        // Support multiple callbacks per channel (use array)
        if (!RedisManager.broadcastCallbacks.has(channel)) {
            RedisManager.broadcastCallbacks.set(channel, []);
        }
        RedisManager.broadcastCallbacks.get(channel).push(callback);

        // Configure self-message behavior if specified
        // Store per callback (use callback as key since multiple callbacks per channel)
        if (options.omitSelf !== undefined) {
            RedisManager._selfMessageConfig.set(callback, options.omitSelf);
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
    static async _handleCallbackMessage(channel, data, sourceInstanceId) {
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

        // Call ALL matching callbacks (multiple controllers may listen to same channel)
        for (const [registeredChannel, callbacks] of sortedCallbacks) {
            if (RedisManager._channelMatches(channel, registeredChannel)) {
                // Iterate through all callbacks for this channel
                for (const callback of callbacks) {
                    // Check if we should omit self-messages for this specific callback
                    const shouldOmitSelf = RedisManager._selfMessageConfig.get(callback);
                    if (shouldOmitSelf && sourceInstanceId === RedisManager.instanceId) {
                        // Skip this callback if omitSelf is true and message is from self
                        continue;
                    }

                    try {
                        await callback(channel, data, sourceInstanceId);
                    } catch (error) {
                        global.LogController._logError(null, 'redis-manager._handleCallbackMessage',
                            `Error in callback for channel ${channel}: ${error.message}`);
                    }
                }
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
    static async _handleBroadcastMessage(channel, messageStr) {
        try {
            // Remove prefix from channel
            const prefix = RedisManager.getKey('broadcast', '');
            const originalChannel = channel.startsWith(prefix) ? channel.substring(prefix.length) : channel;

            const message = JSON.parse(messageStr);

            // Dispatch to registered callbacks
            await RedisManager._handleCallbackMessage(originalChannel, message.data, message.instanceId);
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

    /**
     * Get Redis statistics (standardized getStats() format)
     * @returns {Object} Component stats with standardized structure
     */
    static getMetrics() {
        // Count active connections
        const connectionCounts = {
            session: this.connections.session ? 1 : 0,
            websocket: (this.connections.websocket?.publisher ? 1 : 0) +
                      (this.connections.websocket?.subscriber ? 1 : 0),
            broadcast: (this.connections.broadcast?.publisher ? 1 : 0) +
                      (this.connections.broadcast?.subscriber ? 1 : 0),
            metrics: this.connections.metrics ? 1 : 0,
            cache: this.connections.cache ? 1 : 0  // W-143
        };
        const activeConnections = Object.values(connectionCounts).reduce((a, b) => a + b, 0);

        // Calculate cache hit rate (W-143)
        const cacheHitRate = this._cacheStats.gets > 0
            ? parseFloat(((this._cacheStats.hits / this._cacheStats.gets) * 100).toFixed(2))
            : 0;

        return {
            component: 'RedisManager',
            status: this.isAvailable ? 'ok' : 'error',
            initialized: this.instance !== null,
            stats: {
                isAvailable: this.isAvailable,
                mode: this.config?.mode || 'single',
                activeConnections,
                subscribedChannels: this.subscribedChannels.size,
                messagesProcessed: this.recentlyProcessedMessages.size,
                connectionDetails: connectionCounts,
                config: this.config,  // Sensitive, will be sanitized
                // W-143: Cache statistics
                cache: {
                    hits: this._cacheStats.hits,
                    misses: this._cacheStats.misses,
                    hitRate: cacheHitRate,
                    operations: {
                        sets: this._cacheStats.sets,
                        gets: this._cacheStats.gets,
                        deletes: this._cacheStats.deletes
                    }
                }
            },
            meta: {
                ttl: 30000,  // 30 seconds
                category: 'util',
                fields: {
                    'isAvailable': {
                        aggregate: 'count'  // Count instances with Redis
                    },
                    'mode': {
                        aggregate: 'first'  // Same everywhere
                    },
                    'activeConnections': {
                        aggregate: 'sum'    // Total connections cluster-wide
                    },
                    'subscribedChannels': {
                        aggregate: 'first'  // Same channels
                    },
                    'messagesProcessed': {
                        aggregate: 'sum'    // Total messages
                    },
                    'connectionDetails': {
                        aggregate: false,   // Complex object, don't aggregate
                        visualize: false    // Don't visualize in UI
                    },
                    'config': {
                        aggregate: false,   // Complex object, don't aggregate
                        sanitize: true,     // Override: sanitize config details
                        visualize: false    // Override: don't show in UI
                    },
                    // W-143: Cache metrics aggregation
                    'cache.hits': {
                        aggregate: 'sum'    // Total hits cluster-wide
                    },
                    'cache.misses': {
                        aggregate: 'sum'    // Total misses cluster-wide
                    },
                    'cache.hitRate': {
                        aggregate: 'avg'    // Average hit rate across instances
                    },
                    'cache.operations.sets': {
                        aggregate: 'sum'    // Total sets cluster-wide
                    },
                    'cache.operations.gets': {
                        aggregate: 'sum'    // Total gets cluster-wide
                    },
                    'cache.operations.deletes': {
                        aggregate: 'sum'    // Total deletes cluster-wide
                    }
                }
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * ========================================================================
     * Cache Operations (W-143)
     * ========================================================================
     */

    /**
     * Parse colon-separated cache path
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @returns {Object} { component, namespace, category } or null if invalid
     * @private
     */
    static _parseCachePath(path) {
        if (!path || typeof path !== 'string') {
            global.LogController?.logError(null, 'redis-manager._parseCachePath',
                'Cache path must be a non-empty string');
            return null;
        }

        const parts = path.split(':');
        if (parts.length < 3) {
            global.LogController?.logError(null, 'redis-manager._parseCachePath',
                `Cache path must have at least 3 parts (component:namespace:category), got: ${path}`);
            return null;
        }

        return {
            component: parts[0],
            namespace: parts[1],
            category: parts.slice(2).join(':')  // Everything after namespace is category
        };
    }

    /**
     * Build cache key following naming convention
     * @param {string} component - Layer type ('controller', 'model', 'view', 'util')
     * @param {string} namespace - Component/feature name
     * @param {string} category - Data type
     * @param {string} key - Primary identifier
     * @returns {string} Formatted cache key
     * @private
     */
    static _buildCacheKey(component, namespace, category, key) {
        // Sanitize inputs (replace special chars, preserve wildcards for patterns)
        const sanitize = (str) => String(str).replace(/[^a-zA-Z0-9\-_\.\*]/g, '-');

        const sanitizedComponent = sanitize(component);
        const sanitizedNamespace = sanitize(namespace);
        const sanitizedCategory = sanitize(category);
        const sanitizedKey = sanitize(key);

        // Build key with prefix
        const baseKey = `cache:${sanitizedComponent}:${sanitizedNamespace}:${sanitizedCategory}:${sanitizedKey}`;

        // Use existing getKey() for proper prefixing (respects app.conf)
        return RedisManager.getKey('cache', baseKey.substring(6)); // Remove 'cache:' prefix since getKey adds it
    }

    /**
     * Validate cache operation parameters
     * Follows pub/sub validation pattern: log errors and return false instead of throwing
     * @param {string} component - Layer type
     * @param {string} namespace - Component/feature name
     * @param {string} category - Data type
     * @param {string} key - Primary identifier
     * @returns {boolean} True if valid, false otherwise
     * @private
     */
    static _validateCacheParams(component, namespace, category, key) {
        const validComponents = ['controller', 'model', 'view', 'util'];
        if (!component || !validComponents.includes(component)) {
            global.LogController?.logError(null, 'redis-manager._validateCacheParams',
                `Cache component must be one of: ${validComponents.join(', ')}, got: ${component}`);
            return false;
        }
        if (!namespace || typeof namespace !== 'string') {
            global.LogController?.logError(null, 'redis-manager._validateCacheParams',
                'Cache namespace must be a non-empty string');
            return false;
        }
        if (!category || typeof category !== 'string') {
            global.LogController?.logError(null, 'redis-manager._validateCacheParams',
                'Cache category must be a non-empty string');
            return false;
        }
        if (!key || (typeof key !== 'string' && typeof key !== 'number')) {
            global.LogController?.logError(null, 'redis-manager._validateCacheParams',
                'Cache key must be a non-empty string or number');
            return false;
        }

        // Enforce length limits
        if (namespace.length > 50) {
            global.LogController?.logError(null, 'redis-manager._validateCacheParams',
                `Cache namespace too long (${namespace.length} chars, max 50): ${namespace.substring(0, 50)}...`);
            return false;
        }

        if (category.length > 100) {
            global.LogController?.logError(null, 'redis-manager._validateCacheParams',
                `Cache category too long (${category.length} chars, max 100): ${category.substring(0, 50)}...`);
            return false;
        }

        // Check for reserved characters that might break key structure (warn, don't fail)
        const hasInvalidChars = (str) => /[:\[\]\{\}\s]/.test(str);
        if (hasInvalidChars(namespace) || hasInvalidChars(category)) {
            global.LogController?.logWarning(null, 'redis-manager._validateCacheParams',
                'Cache namespace/category contains special characters, will be sanitized');
        }

        // Total key length check (after building full key)
        const testKey = this._buildCacheKey(component, namespace, category, String(key));
        if (testKey.length > 200) {
            global.LogController?.logError(null, 'redis-manager._validateCacheParams',
                `Cache key too long (${testKey.length} chars, max 200): ${testKey.substring(0, 100)}...`);
            return false;
        }

        return true;
    }

    /**
     * Set cache value with optional TTL
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @param {string} key - Primary identifier
     * @param {string|Buffer} value - Value to cache
     * @param {Object} options - Optional configuration
     * @param {number} options.ttl - TTL in seconds (default: 0 = no expiration)
     * @param {boolean} options.nx - Only set if not exists (default: false)
     * @param {boolean} options.xx - Only set if exists (default: false)
     * @returns {Promise<boolean>} True if set successfully
     */
    static async cacheSet(path, key, value, options = {}) {
        const parsed = RedisManager._parseCachePath(path);
        if (!parsed || !RedisManager._validateCacheParams(parsed.component, parsed.namespace, parsed.category, key)) {
            return false;
        }

        const redis = RedisManager.getClient('cache');
        if (!redis) {
            global.LogController?.logWarning(null, 'redis-manager.cacheSet',
                'Cache unavailable (Redis not available)');
            return false;
        }

        const { ttl = 0, nx = false, xx = false } = options;

        // Handle negative TTL
        const normalizedTTL = ttl < 0 ? 0 : ttl;
        if (ttl < 0) {
            global.LogController?.logWarning(null, 'redis-manager.cacheSet',
                `Negative TTL (${ttl}) treated as indefinite (0)`);
        }

        // Warn on very large TTL (> 1 year)
        if (normalizedTTL > 31536000) {
            global.LogController?.logWarning(null, 'redis-manager.cacheSet',
                `Very large TTL (${normalizedTTL}s = ${(normalizedTTL / 86400).toFixed(1)} days)`);
        }

        try {
            const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);

            // Track metrics
            RedisManager._cacheStats.sets++;

            if (normalizedTTL > 0) {
                await redis.setex(cacheKey, normalizedTTL, value);
            } else {
                const args = [cacheKey, value];
                if (nx) args.push('NX');
                if (xx) args.push('XX');
                await redis.set(...args);
            }

            global.LogController?.logInfo(null, 'redis-manager.cacheSet',
                `Cache set: ${cacheKey} (ttl: ${normalizedTTL > 0 ? normalizedTTL + 's' : 'indefinite'})`);
            return true;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheSet',
                `Failed to set cache: ${error.message}`);
            return false;
        }
    }

    /**
     * Get cache value
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @param {string} key - Primary identifier
     * @returns {Promise<string|null>} Cached value or null if not found
     */
    static async cacheGet(path, key) {
        const parsed = RedisManager._parseCachePath(path);
        if (!parsed) {
            return null;
        }

        const redis = RedisManager.getClient('cache');
        if (!redis) {
            return null;
        }

        try {
            const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);

            // Track metrics
            RedisManager._cacheStats.gets++;

            const value = await redis.get(cacheKey);

            if (value) {
                RedisManager._cacheStats.hits++;
                global.LogController?.logInfo(null, 'redis-manager.cacheGet',
                    `Cache hit: ${cacheKey}`);
            } else {
                RedisManager._cacheStats.misses++;
            }

            return value;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheGet',
                `Failed to get cache: ${error.message}`);
            RedisManager._cacheStats.misses++;
            return null;
        }
    }

    /**
     * Delete cache value
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @param {string} key - Primary identifier
     * @returns {Promise<boolean>} True if deleted
     */
    static async cacheDel(path, key) {
        const parsed = RedisManager._parseCachePath(path);
        if (!parsed) {
            return false;
        }

        const redis = RedisManager.getClient('cache');
        if (!redis) {
            return false;
        }

        try {
            const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);

            // Track metrics
            RedisManager._cacheStats.deletes++;

            const result = await redis.del(cacheKey);

            global.LogController?.logInfo(null, 'redis-manager.cacheDel',
                `Cache deleted: ${cacheKey}`);
            return result > 0;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheDel',
                `Failed to delete cache: ${error.message}`);
            return false;
        }
    }

    /**
     * Check if cache key exists
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @param {string} key - Primary identifier
     * @returns {Promise<boolean>} True if exists
     */
    static async cacheExists(path, key) {
        const parsed = RedisManager._parseCachePath(path);
        if (!parsed) {
            return false;
        }

        const redis = RedisManager.getClient('cache');
        if (!redis) {
            return false;
        }

        try {
            const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);
            const result = await redis.exists(cacheKey);
            return result > 0;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheExists',
                `Failed to check cache existence: ${error.message}`);
            return false;
        }
    }

    /**
     * Set cache value as JSON object
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @param {string} key - Primary identifier
     * @param {Object} obj - Object to cache
     * @param {Object} options - Optional configuration (same as cacheSet)
     * @returns {Promise<boolean>} True if set successfully
     */
    static async cacheSetObject(path, key, obj, options = {}) {
        try {
            const value = JSON.stringify(obj);
            return await RedisManager.cacheSet(path, key, value, options);
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheSetObject',
                `Failed to serialize object: ${error.message}`);
            return false;
        }
    }

    /**
     * Get cache value as parsed JSON object
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @param {string} key - Primary identifier
     * @returns {Promise<Object|null>} Parsed object or null if not found
     */
    static async cacheGetObject(path, key) {
        try {
            const value = await RedisManager.cacheGet(path, key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheGetObject',
                `Failed to parse object: ${error.message}`);
            return null;
        }
    }

    /**
     * Increment counter
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @param {string} key - Primary identifier
     * @returns {Promise<number|null>} New value or null on error
     */
    static async cacheIncr(path, key) {
        const parsed = RedisManager._parseCachePath(path);
        if (!parsed) {
            return null;
        }

        const redis = RedisManager.getClient('cache');
        if (!redis) {
            return null;
        }

        try {
            const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);
            const value = await redis.incr(cacheKey);
            return value;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheIncr',
                `Failed to increment cache: ${error.message}`);
            return null;
        }
    }

    /**
     * Decrement counter
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @param {string} key - Primary identifier
     * @returns {Promise<number|null>} New value or null on error
     */
    static async cacheDecr(path, key) {
        const parsed = RedisManager._parseCachePath(path);
        if (!parsed) {
            return null;
        }

        const redis = RedisManager.getClient('cache');
        if (!redis) {
            return null;
        }

        try {
            const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);
            const value = await redis.decr(cacheKey);
            return value;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheDecr',
                `Failed to decrement cache: ${error.message}`);
            return null;
        }
    }

    /**
     * Increment counter by amount
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @param {string} key - Primary identifier
     * @param {number} amount - Amount to increment
     * @returns {Promise<number|null>} New value or null on error
     */
    static async cacheIncrBy(path, key, amount) {
        const parsed = RedisManager._parseCachePath(path);
        if (!parsed) {
            return null;
        }

        const redis = RedisManager.getClient('cache');
        if (!redis) {
            return null;
        }

        try {
            const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);
            const value = await redis.incrby(cacheKey, amount);
            return value;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheIncrBy',
                `Failed to increment cache by amount: ${error.message}`);
            return null;
        }
    }

    /**
     * Get TTL for cache key
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @param {string} key - Primary identifier
     * @returns {Promise<number|null>} TTL in seconds, -1 if no expiry, -2 if key doesn't exist, null on error
     */
    static async cacheGetTTL(path, key) {
        const parsed = RedisManager._parseCachePath(path);
        if (!parsed) {
            return null;
        }

        const redis = RedisManager.getClient('cache');
        if (!redis) {
            return null;
        }

        try {
            const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);
            const ttl = await redis.ttl(cacheKey);
            return ttl;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheGetTTL',
                `Failed to get cache TTL: ${error.message}`);
            return null;
        }
    }

    /**
     * Set expiration for cache key
     * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
     * @param {string} key - Primary identifier
     * @param {number} ttlSeconds - TTL in seconds
     * @returns {Promise<boolean>} True if expiration was set
     */
    static async cacheExpire(path, key, ttlSeconds) {
        const parsed = RedisManager._parseCachePath(path);
        if (!parsed) {
            return false;
        }

        const redis = RedisManager.getClient('cache');
        if (!redis) {
            return false;
        }

        try {
            const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);
            const result = await redis.expire(cacheKey, ttlSeconds);
            return result > 0;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheExpire',
                `Failed to set cache expiration: ${error.message}`);
            return false;
        }
    }

    /**
     * Set token with TTL (common pattern for OTP, access tokens, etc.)
     * @param {string} path - Colon-separated path: 'component:namespace:purpose'
     *                       (e.g., 'controller:siteMonitor:dashboard')
     * @param {string} identifier - Owner identifier (e.g., uuid, userId)
     * @param {string} token - Token value (typically hashed)
     * @param {number} ttlSeconds - TTL in seconds (default: 3600 = 1 hour)
     * @returns {Promise<boolean>} True if set successfully
     */
    static async cacheSetToken(path, identifier, token, ttlSeconds = 3600) {
        // Automatically prefix with 'token:' in the path if not present
        const tokenPath = path.includes(':token:') ? path : path.replace(/([^:]+:[^:]+):(.+)/, '$1:token:$2');

        return await RedisManager.cacheSet(
            tokenPath,
            identifier,
            token,
            { ttl: ttlSeconds }
        );
    }

    /**
     * Get token value
     * @param {string} path - Colon-separated path: 'component:namespace:purpose'
     * @param {string} identifier - Owner identifier (e.g., uuid, userId)
     * @returns {Promise<string|null>} Token value or null if not found/expired
     */
    static async cacheGetToken(path, identifier) {
        const tokenPath = path.includes(':token:') ? path : path.replace(/([^:]+:[^:]+):(.+)/, '$1:token:$2');

        return await RedisManager.cacheGet(tokenPath, identifier);
    }

    /**
     * Delete token (e.g., on logout, invalidation)
     * @param {string} path - Colon-separated path: 'component:namespace:purpose'
     * @param {string} identifier - Owner identifier (e.g., uuid, userId)
     * @returns {Promise<boolean>} True if deleted
     */
    static async cacheDelToken(path, identifier) {
        const tokenPath = path.includes(':token:') ? path : path.replace(/([^:]+:[^:]+):(.+)/, '$1:token:$2');

        return await RedisManager.cacheDel(tokenPath, identifier);
    }

    /**
     * Validate token (fetch and compare)
     * @param {string} path - Colon-separated path: 'component:namespace:purpose'
     * @param {string} identifier - Owner identifier
     * @param {string} token - Token to validate
     * @param {Function} compareFn - Optional comparison function (stored, provided) => boolean
     * @returns {Promise<boolean>} True if valid
     */
    static async cacheValidateToken(path, identifier, token, compareFn = null) {
        const stored = await RedisManager.cacheGetToken(path, identifier);

        if (!stored) {
            return false;
        }

        if (compareFn) {
            return compareFn(stored, token);
        }

        return stored === token;
    }

    /**
     * Check rate limit using sliding window counter
     * @param {string} path - Colon-separated path: 'component:namespace:action[:type]*'
     *                       (e.g., 'controller:siteMonitor:report:ip')
     * @param {string} key - Identifier to rate limit (e.g., IP address, userId, email)
     * @param {Object} options - Rate limit configuration
     * @param {number} options.limit - Maximum requests allowed (required)
     * @param {number} options.windowSeconds - Time window in seconds (default: 3600 = 1 hour)
     * @returns {Promise<Object>} { allowed: boolean, count: number, retryAfter: number }
     */
    static async cacheCheckRateLimit(path, key, options = {}) {
        const { limit, windowSeconds = 3600 } = options;

        if (!limit) {
            global.LogController?.logError(null, 'redis-manager.cacheCheckRateLimit',
                'Rate limit requires limit option');
            return { allowed: true, count: 0, retryAfter: 0 };
        }

        const parsed = RedisManager._parseCachePath(path);
        if (!parsed) {
            return { allowed: true, count: 0, retryAfter: 0 };
        }

        const redis = RedisManager.getClient('cache');

        if (!redis) {
            // Fallback: no rate limiting if Redis unavailable (fail open)
            global.LogController?.logWarning(null, 'redis-manager.cacheCheckRateLimit',
                'Redis unavailable, skipping rate limit check');
            return { allowed: true, count: 0, retryAfter: 0 };
        }

        try {
            // Add 'rateLimit:' prefix if not present
            const rateLimitPath = parsed.category.startsWith('rateLimit:')
                ? path
                : `${parsed.component}:${parsed.namespace}:rateLimit:${parsed.category}`;

            const finalParsed = RedisManager._parseCachePath(rateLimitPath);
            const cacheKey = RedisManager._buildCacheKey(finalParsed.component, finalParsed.namespace, finalParsed.category, key);

            const count = await redis.incr(cacheKey);

            // Set expiration on first increment
            if (count === 1) {
                await redis.expire(cacheKey, windowSeconds);
            }

            if (count > limit) {
                const ttl = await redis.ttl(cacheKey);
                return {
                    allowed: false,
                    count: count,
                    retryAfter: ttl > 0 ? ttl * 1000 : 0  // Convert to milliseconds
                };
            }

            return {
                allowed: true,
                count: count,
                retryAfter: 0
            };
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheCheckRateLimit',
                `Failed to check rate limit: ${error.message}`);
            return { allowed: true, count: 0, retryAfter: 0 }; // Fail open
        }
    }

    /**
     * Delete all keys matching pattern
     * WARNING: Uses SCAN command which is production-safe but may be slow on large datasets
     * @param {string} path - Colon-separated path with wildcards: 'component:namespace:category*'
     *                       (e.g., 'controller:siteMonitor:token:*')
     * @param {string} keyPattern - Key pattern (can include wildcards, e.g., '*', userId)
     * @returns {Promise<number>} Number of keys deleted
     *
     * @example
     * // Clear all dashboard tokens for a user
     * await RedisManager.cacheDelPattern('controller:auth:token:*', userId);
     *
     * // Clear all cache entries for a product
     * await RedisManager.cacheDelPattern('model:product:*', productId);
     */
    static async cacheDelPattern(path, keyPattern) {
        const parsed = RedisManager._parseCachePath(path);
        if (!parsed || !keyPattern) {
            return 0;
        }

        const redis = RedisManager.getClient('cache');
        if (!redis) return 0;

        try {
            const pattern = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, keyPattern);

            // Use SCAN instead of KEYS for production safety
            const keys = [];
            let cursor = '0';
            do {
                const [nextCursor, foundKeys] = await redis.scan(
                    cursor,
                    'MATCH',
                    pattern,
                    'COUNT',
                    100
                );
                cursor = nextCursor;
                keys.push(...foundKeys);
            } while (cursor !== '0');

            if (keys.length === 0) return 0;

            const deleted = await redis.del(...keys);

            global.LogController?.logInfo(null, 'redis-manager.cacheDelPattern',
                `Deleted ${deleted} keys matching pattern: ${pattern}`);

            return deleted;
        } catch (error) {
            global.LogController?.logError(null, 'redis-manager.cacheDelPattern',
                `Failed to delete pattern: ${error.message}`);
            return 0;
        }
    }
}

export default RedisManager;

// EOF webapp/utils/redis-manager.js
