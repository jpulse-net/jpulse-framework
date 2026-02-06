/**
 * @name            jPulse Framework / WebApp / Controller / App Cluster
 * @description     App Cluster controller for multi-instance communication (WebSocket, broadcast, cache)
 * @file            webapp/controller/appCluster.js
 * @version         1.6.10
 * @release         2026-02-07
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.4, Claude Sonnet 4.5
 */

// Import required modules (ES module syntax)
import LogController from './log.js';
import WebSocketController from './websocket.js';
import RedisManager from '../utils/redis-manager.js';
import CommonUtils from '../utils/common.js';

/**
 * App Cluster Controller
 * Provides complete infrastructure for jPulse.appCluster API:
 * - WebSocket handling (subscribe/relay broadcasts)
 * - Broadcast REST API (publish, status)
 * - Cache REST API (set, get, delete)
 */
class AppClusterController {

    // Static registry to track client channel subscriptions
    // Map<clientId, Set<channelNames>>
    static clientChannels = new Map();

    /**
     * Initialize the controller and register WebSocket namespace
     */
    static initialize() {
        try {
            // Register WebSocket namespace for framework broadcast system
            // Uses jp- prefix to indicate framework-internal WebSocket
            WebSocketController.registerNamespace('/api/1/ws/jp-broadcast', {
                onConnect: this.handleConnect.bind(this),
                onMessage: this.handleMessage.bind(this),
                onDisconnect: this.handleDisconnect.bind(this)
            });

            // Subscribe to ALL broadcast messages to relay to interested WebSocket clients
            // Use RedisManager callback registration for automatic channel handling
            const options = { _skipChannelValidation: true }; // Skip only for internal use
            RedisManager.registerBroadcastCallback('controller:*', (channel, data, options) => {
                this.relayToInterestedClients(channel, data);
            }, options);
            RedisManager.registerBroadcastCallback('view:*', (channel, data, options) => {
                this.relayToInterestedClients(channel, data);
            }, options);
            RedisManager.registerBroadcastCallback('model:*', (channel, data, options) => {
                this.relayToInterestedClients(channel, data);
            }, options);

            LogController.logInfo(null, 'appCluster.initialize', 'App Cluster controller initialized with generic WebSocket namespace');
        } catch (error) {
            LogController.logError(null, 'appCluster.initialize', `Initialization failed: ${error.message}`);
        }
    }

    /**
     * Handle WebSocket client connection
     * @param {string} clientId - WebSocket client ID
     * @param {Object} user - User object (if authenticated)
     */
    static handleConnect(clientId, user) {
        // Initialize client's channel subscriptions in our registry
        AppClusterController.clientChannels.set(clientId, new Map());

        LogController.logInfo(
            user ? user.username : null,
            'appCluster.handleConnect',
            `Client connected to app cluster namespace (${clientId})`
        );

        // Send welcome message
        WebSocketController.sendToClient(
            clientId,
            '/api/1/ws/jp-broadcast',
            {
                type: 'welcome',
                message: 'Connected to App Cluster broadcast system',
                timestamp: new Date().toISOString()
            }
        );
    }

    /**
     * Handle WebSocket messages from clients
     * @param {string} clientId - WebSocket client ID
     * @param {Object} data - Message data from client
     * @param {Object} user - User object (if authenticated)
     */
    static handleMessage(clientId, data, user) {
        try {
            const clientChannels = AppClusterController.clientChannels.get(clientId);
            if (!clientChannels) {
                LogController.logError(
                    user ? user.username : null,
                    'appCluster.handleMessage',
                    `Client ${clientId} not found in registry`
                );
                return;
            }

            if (data.type === 'subscribe') {
                // Client wants to subscribe to a channel
                const { channel, omitSelf = false } = data;
                if (channel && typeof channel === 'string') {
                    const clientChannels = AppClusterController.clientChannels.get(clientId);
                    clientChannels.set(channel, { omitSelf });

                    LogController.logInfo(
                        user ? user.username : null,
                        'appCluster.handleMessage',
                        `Client subscribed to channel: ${channel} (omitSelf: ${omitSelf})`
                    );

                    // Acknowledge subscription
                    WebSocketController.sendToClient(
                        clientId,
                        '/api/1/ws/jp-broadcast',
                        {
                            type: 'subscribed',
                            channel: channel,
                            timestamp: new Date().toISOString()
                        }
                    );
                }
            } else if (data.type === 'unsubscribe') {
                // Client wants to unsubscribe from a channel
                const { channel } = data;
                if (channel && typeof channel === 'string') {
                    clientChannels.delete(channel);

                    LogController.logInfo(
                        user ? user.username : null,
                        'appCluster.handleMessage',
                        `Client unsubscribed from channel: ${channel}`
                    );

                    // Acknowledge unsubscription
                    WebSocketController.sendToClient(
                        clientId,
                        '/api/1/ws/jp-broadcast',
                        {
                            type: 'unsubscribed',
                            channel: channel,
                            timestamp: new Date().toISOString()
                        }
                    );
                }
            } else if (data.type === 'ping') {
                // Client is sending a ping for connection health check
                // Respond with pong
                WebSocketController.sendToClient(
                    clientId,
                    '/api/1/ws/jp-broadcast',
                    {
                        type: 'pong',
                        timestamp: new Date().toISOString()
                    }
                );
            } else {
                LogController.logInfo(
                    user ? user.username : null,
                    'appCluster.handleMessage',
                    `Received unknown message type: ${data.type}`
                );
            }
        } catch (error) {
            LogController.logError(
                user ? user.username : null,
                'appCluster.handleMessage',
                `Error handling message: ${error.message}`
            );
        }
    }

    /**
     * Handle WebSocket client disconnection
     * @param {string} clientId - WebSocket client ID
     * @param {Object} user - User object (if authenticated)
     */
    static handleDisconnect(clientId, user) {
        const clientChannels = AppClusterController.clientChannels.get(clientId);
        const channelCount = clientChannels ? clientChannels.size : 0;

        LogController.logInfo(
            user ? user.username : null,
            'appCluster.handleDisconnect',
            `Client disconnected from app cluster namespace (${clientId}) - cleaned up ${channelCount} channel subscriptions`
        );

        // Clean up client's channel subscriptions from our registry
        AppClusterController.clientChannels.delete(clientId);
    }

    /**
     * Relay broadcast messages to interested WebSocket clients
     * This is called when a broadcast message is received via Redis
     * @param {string} channel - Broadcast channel name
     * @param {Object} data - Broadcast message data
     */
    static relayToInterestedClients(channel, data) {
        try {
            // Get all connected clients in the jp-broadcast namespace
            const namespace = WebSocketController.namespaces.get('/api/1/ws/jp-broadcast');
            if (!namespace) {
                return; // No namespace registered
            }

            let relayedCount = 0;

            // Send to clients interested in this specific channel
            namespace.clients.forEach((client, clientId) => {
                const clientChannels = AppClusterController.clientChannels.get(clientId);
                if (!clientChannels) return;

                // Check all of client's subscriptions (including wildcards) against the incoming message channel
                for (const [subscribedChannel, channelOptions] of clientChannels.entries()) {
                    if (RedisManager._channelMatches(channel, subscribedChannel)) {
                        const shouldOmitSelf = channelOptions?.omitSelf || false;

                        // Skip self-messages if client has omitSelf enabled
                        if (shouldOmitSelf && data.uuid === clientId) {
                            continue; // Don't send to this client for this matching subscription
                        }

                        if (client.ws.readyState === 1) { // WebSocket.OPEN
                            const message = {
                                success: true,
                                data: {
                                    type: 'broadcast',
                                    channel: channel,
                                    data: data,
                                    timestamp: new Date().toISOString()
                                }
                            };
                            client.ws.send(JSON.stringify(message));
                            relayedCount++;
                            // A message should only be sent once, even if it matches multiple
                            // of a client's subscriptions (e.g., 'view:*' and 'view:todo:*').
                            break;
                        }
                    }
                }
            });

            if (relayedCount > 0) {
                LogController.logInfo(
                    null,
                    'appCluster.relayToInterestedClients',
                    `Relayed broadcast to ${relayedCount} clients on channel: ${channel}`
                );
            }
        } catch (error) {
            LogController.logError(
                null,
                'appCluster.relayToInterestedClients',
                `Error relaying to WebSocket clients: ${error.message}`
            );
        }
    }

    /**
     * ========================================================================
     * Broadcast REST API (merged from broadcast.js)
     * ========================================================================
     */

    /**
     * Publish message to broadcast channel
     * POST /api/1/app-cluster/broadcast/:channel
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async broadcastPublish(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'appCluster.broadcastPublish', '');

        try {
            const { channel } = req.params;
            const { data } = req.body;

            // Validate channel name (must follow the MVC convention)
            if (!channel.match(/^(controller|model|view)(:[\w\-]+){3,}$/)) {
                LogController.logError(req, 'appCluster.broadcastPublish', 'error: invalid channel name, it must follow the MVC convention: {model|controller|view}:{component}:{domain}:{action}');
                const message = global.i18n.translate(req, 'controller.broadcast.invalidChannelName');
                return CommonUtils.sendError(req, res, 400, message, 'INVALID_CHANNEL_NAME');
            }

            // Validate data
            if (!data || typeof data !== 'object') {
                LogController.logError(req, 'appCluster.broadcastPublish', 'error: request body must contain a data object');
                const message = global.i18n.translate(req, 'controller.broadcast.dataRequired');
                return CommonUtils.sendError(req, res, 400, message, 'INVALID_DATA');
            }

            // Pass uuid through if provided by client
            const payload = { ...data };
            if (req.body.uuid) {
                payload.uuid = req.body.uuid;
            }

            // Publish broadcast
            const published = await RedisManager.publishBroadcast(channel, payload);

            if (published) {
                const elapsed = Date.now() - startTime;
                LogController.logInfo(req, 'appCluster.broadcastPublish', `Published to ${channel}, completed in ${elapsed}ms`);

                const message = global.i18n.translate(req, 'controller.broadcast.publishSuccessful', { channel });
                res.json({
                    success: true,
                    data: {
                        channel,
                        instanceId: RedisManager.getInstanceId(),
                        timestamp: new Date().toISOString()
                    },
                    message,
                    elapsed
                });
            } else {
                // Redis unavailable - graceful response
                const elapsed = Date.now() - startTime;
                LogController.logInfo(req, 'appCluster.broadcastPublish', `Broadcast skipped (Redis unavailable): ${channel}, completed in ${elapsed}ms`);

                const message = global.i18n.translate(req, 'controller.broadcast.publishSkipped');
                res.json({
                    success: true,
                    data: {
                        channel,
                        instanceId: RedisManager.getInstanceId(),
                        timestamp: new Date().toISOString(),
                        fallback: true
                    },
                    message,
                    elapsed
                });
            }

        } catch (error) {
            LogController.logError(req, 'appCluster.broadcastPublish', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.broadcast.publishFailed');
            return CommonUtils.sendError(req, res, 500, message, 'BROADCAST_ERROR', error.message);
        }
    }

    /**
     * Get broadcast system status and instance information
     * GET /api/1/app-cluster/broadcast/status
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async broadcastStatus(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'appCluster.broadcastStatus', '');

        try {
            const status = {
                success: true,
                data: {
                    instanceId: RedisManager.getInstanceId(),
                    redisAvailable: RedisManager.isRedisAvailable(),
                    redisMode: RedisManager.getConfig()?.mode || 'unknown',
                    broadcastEnabled: RedisManager.isRedisAvailable(),
                    timestamp: new Date().toISOString()
                }
            };

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'appCluster.broadcastStatus', `Status retrieved, completed in ${elapsed}ms`);

            const message = global.i18n.translate(req, 'controller.broadcast.statusRetrieved');
            status.message = message;
            status.elapsed = elapsed;
            res.json(status);

        } catch (error) {
            LogController.logError(req, 'appCluster.broadcastStatus', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.broadcast.statusFailed');
            return CommonUtils.sendError(req, res, 500, message, 'STATUS_ERROR', error.message);
        }
    }

    /**
     * ========================================================================
     * Cache REST API (W-143)
     * ========================================================================
     */

    /**
     * Set cache value (from client)
     * POST /api/1/app-cluster/cache/:category/:key
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    static async cacheSet(req, res) {
        LogController.logRequest(req, 'appCluster.cacheSet', 'Set cache value (client API)');

        // Require authentication for client-side API
        if (!req.session?.user?._id) {
            LogController.logWarning(req, 'appCluster.cacheSet', 'Unauthorized: authentication required');
            return CommonUtils.sendError(req, res, 401,
                'Authentication required', 'UNAUTHORIZED');
        }

        const { category, key } = req.params;
        const { value, ttl } = req.body;

        // Validate required parameters
        if (!category || !key || value === undefined) {
            LogController.logWarning(req, 'appCluster.cacheSet',
                'Missing required parameters: category, key, or value');
            return CommonUtils.sendError(req, res, 400,
                'Missing required parameters', 'INVALID_PARAMS');
        }

        const userId = req.session.user._id;

        try {
            // User-scoped automatically
            const success = await global.RedisManager.cacheSetObject(
                `view:${userId}:${category}`,
                key,
                value,
                { ttl: ttl || 0 }
            );

            if (success) {
                LogController.logInfo(req, 'appCluster.cacheSet',
                    `success: Cache set for user ${userId}, category: ${category}, key: ${key}`);
                return CommonUtils.sendSuccess(req, res, 'Cache set successfully', { success: true });
            } else {
                LogController.logError(req, 'appCluster.cacheSet',
                    'error: Failed to set cache (Redis unavailable or error)');
                return CommonUtils.sendError(req, res, 503,
                    'Cache service temporarily unavailable', 'CACHE_UNAVAILABLE');
            }
        } catch (error) {
            LogController.logError(req, 'appCluster.cacheSet',
                `error: Exception: ${error.message}`);
            return CommonUtils.sendError(req, res, 500,
                'Internal server error', 'INTERNAL_ERROR');
        }
    }

    /**
     * Get cache value (from client)
     * GET /api/1/app-cluster/cache/:category/:key
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    static async cacheGet(req, res) {
        LogController.logRequest(req, 'appCluster.cacheGet', 'Get cache value (client API)');

        // Require authentication for client-side API
        if (!req.session?.user?._id) {
            LogController.logWarning(req, 'appCluster.cacheGet', 'Unauthorized: authentication required');
            return CommonUtils.sendError(req, res, 401,
                'Authentication required', 'UNAUTHORIZED');
        }

        const { category, key } = req.params;

        // Validate required parameters
        if (!category || !key) {
            LogController.logWarning(req, 'appCluster.cacheGet',
                'Missing required parameters: category or key');
            return CommonUtils.sendError(req, res, 400,
                'Missing required parameters', 'INVALID_PARAMS');
        }

        const userId = req.session.user._id;

        try {
            // User-scoped automatically
            const value = await global.RedisManager.cacheGetObject(
                `view:${userId}:${category}`,
                key
            );

            LogController.logInfo(req, 'appCluster.cacheGet',
                `success: Cache retrieved for user ${userId}, category: ${category}, key: ${key}` +
                (value ? ' (hit)' : ' (miss)'));

            return CommonUtils.sendSuccess(req, res, 'Cache retrieved', value);
        } catch (error) {
            LogController.logError(req, 'appCluster.cacheGet',
                `error: Exception: ${error.message}`);
            return CommonUtils.sendError(req, res, 500,
                'Internal server error', 'INTERNAL_ERROR');
        }
    }

    /**
     * Delete cache value (from client)
     * DELETE /api/1/app-cluster/cache/:category/:key
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    static async cacheDelete(req, res) {
        LogController.logRequest(req, 'appCluster.cacheDelete', 'Delete cache value (client API)');

        // Require authentication for client-side API
        if (!req.session?.user?._id) {
            LogController.logWarning(req, 'appCluster.cacheDelete', 'Unauthorized: authentication required');
            return CommonUtils.sendError(req, res, 401,
                'Authentication required', 'UNAUTHORIZED');
        }

        const { category, key } = req.params;

        // Validate required parameters
        if (!category || !key) {
            LogController.logWarning(req, 'appCluster.cacheDelete',
                'Missing required parameters: category or key');
            return CommonUtils.sendError(req, res, 400,
                'Missing required parameters', 'INVALID_PARAMS');
        }

        const userId = req.session.user._id;

        try {
            // User-scoped automatically
            const success = await global.RedisManager.cacheDel(
                `view:${userId}:${category}`,
                key
            );

            if (success) {
                LogController.logInfo(req, 'appCluster.cacheDelete',
                    `success: Cache deleted for user ${userId}, category: ${category}, key: ${key}`);
                return CommonUtils.sendSuccess(req, res, 'Cache deleted successfully', { success: true });
            } else {
                LogController.logInfo(req, 'appCluster.cacheDelete',
                    `success: Cache key not found or already deleted for user ${userId}`);
                return CommonUtils.sendSuccess(req, res, 'Cache key not found', { success: false });
            }
        } catch (error) {
            LogController.logError(req, 'appCluster.cacheDelete',
                `error: Exception: ${error.message}`);
            return CommonUtils.sendError(req, res, 500,
                'Internal server error', 'INTERNAL_ERROR');
        }
    }
}

export default AppClusterController;

// EOF webapp/controller/appCluster.js
