/**
 * @name            jPulse Framework / WebApp / Controller / WebSocket
 * @tagline         WebSocket Controller for Real-Time Communication
 * @description     Manages WebSocket namespaces, client connections, and provides admin stats
 * @file            webapp/controller/websocket.js
 * @version         0.9.7
 * @release         2025-10-12
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4.5
 */

import { WebSocketServer as WSServer } from 'ws';
import { parse as parseUrl } from 'url';
import AuthController from './auth.js';

// Access global utilities
const LogController = global.LogController;
const CommonUtils = global.CommonUtils;
const ViewController = global.ViewController;

/**
 * WebSocket Controller - Enterprise-grade WebSocket infrastructure
 *
 * Features:
 * - Namespace-based isolation (enforces /api/1/ws/* prefix)
 * - Optional authentication/authorization per namespace
 * - Bidirectional ping/pong with auto-reconnect
 * - Statistics tracking and admin monitoring
 * - Activity logging (ephemeral, last 100 messages)
 * - Standard API message format
 *
 * Usage:
 * Server-side (in controller):
 *   WebSocketController.registerNamespace('/api/1/ws/my-app', {
 *     requireAuth: false,
 *     onConnect: (client, user) => {},
 *     onMessage: (client, data, user) => {},
 *     onDisconnect: (client, user) => {}
 *   });
 *
 * Client-side (in view):
 *   const ws = jPulse.ws.connect('/api/1/ws/my-app')
 *     .onMessage(data => console.log(data));
 *   ws.send({ type: 'action', payload: {...} });
 */
class WebSocketController {

    // WebSocket server instance
    static wss = null;

    // Session middleware (for parsing sessions during upgrade)
    static sessionMiddleware = null;

    // Redis clients for multi-instance coordination (optional)
    static redis = {
        publisher: null,
        subscriber: null,
        enabled: false,
        callbackRegistered: false
    };

    // Instance registry for cross-instance broadcasting when Redis is unavailable
    static instanceRegistry = new Map();
    static lastRegistryUpdate = 0;

    // Namespace registry
    static namespaces = new Map();

    // Global statistics
    static stats = {
        startTime: Date.now(),
        totalMessages: 0,
        activityLog: [] // Last 100 messages
    };

    // Ping/pong configuration
    static websocketConf = global.appConfig?.controller?.websocket || {};
    static {
        this.websocketConf.pingInterval ??= 30000;
        this.websocketConf.pongTimeout ??= 5000;
        this.websocketConf.reconnectBaseInterval ??= 5000;
        this.websocketConf.reconnectMaxInterval ??= 30000;
        this.websocketConf.instanceRegistryInterval ??= 30000;
    }

    /**
     * Initialize WebSocket server
     * @param {http.Server} httpServer - HTTP server instance from Express
     * @param {Function} sessionMiddleware - Express session middleware for parsing sessions
     */
    static async initialize(httpServer, sessionMiddleware) {
        try {
            // Store session middleware
            this.sessionMiddleware = sessionMiddleware;

            // Create WebSocket server attached to HTTP server
            this.wss = new WSServer({ noServer: true });

            // Handle upgrade requests (HTTP to WebSocket)
            httpServer.on('upgrade', (request, socket, head) => {
                this._handleUpgrade(request, socket, head);
            });

            // Initialize Redis pub/sub for multi-instance coordination (optional)
            await this._initializeRedis();

            // Initialize instance registry for cross-instance broadcasting
            await this._updateInstanceRegistry();

            // Register admin stats namespace
            this._registerAdminStatsNamespace();

            // Register test namespace (temporary - for testing before W-075)
            this._registerTestNamespace();

            // Start health checks
            this._startHealthChecks();

            LogController.logInfo(null, 'websocket.initialize', 'WebSocket server initialized successfully');

        } catch (error) {
            LogController.logError(null, 'websocket.initialize', `error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Register a WebSocket namespace
     * @param {string} path - Namespace path (must start with /api/1/ws/)
     * @param {Object} options - Configuration options
     * @returns {Object} Namespace handle for broadcasting
     */
    static registerNamespace(path, options = {}) {
        try {
            // Validate path prefix
            if (!path.startsWith('/api/1/ws/')) {
                throw new Error(`Namespace path must start with /api/1/ws/ (got: ${path})`);
            }

            // Check if namespace already exists
            if (this.namespaces.has(path)) {
                throw new Error(`Namespace ${path} is already registered`);
            }

            // Create namespace configuration
            const namespace = {
                path,
                requireAuth: options.requireAuth || false,
                requireRoles: options.requireRoles || [],
                onConnect: options.onConnect || null,
                onMessage: options.onMessage || null,
                onDisconnect: options.onDisconnect || null,
                clients: new Map(), // clientId -> { ws, user, lastPing, lastPong }
                stats: {
                    totalMessages: 0,
                    messagesPerHour: 0,
                    lastActivity: Date.now(),
                    messageTimestamps: [] // For calculating messages/hour
                }
            };

            // Register namespace
            this.namespaces.set(path, namespace);

            LogController.logInfo(null, 'websocket.registerNamespace', `Registered namespace: ${path}`);

            // Return handle for broadcasting
            return {
                broadcast: (data, fromUsername = '') => this.broadcast(path, data, fromUsername),
                sendToClient: (clientId, data, fromUsername = '') => this.sendToClient(clientId, path, data, fromUsername),
                getStats: () => this._getNamespaceStats(path)
            };

        } catch (error) {
            LogController.logError(null, 'websocket.registerNamespace', `error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Broadcast message to all clients in namespace
     * @param {string} namespacePath - Namespace path
     * @param {Object} data - Data to broadcast
     * @param {string} fromUsername - Optional username of message originator
     */
    static async broadcast(namespacePath, data, fromUsername = '') {
        const namespace = this.namespaces.get(namespacePath);
        if (!namespace) {
            LogController.logError(null, 'websocket.broadcast', `error: Namespace not found: ${namespacePath}`);
            return;
        }

        // Add username to data
        const dataWithUsername = {
            ...data,
            username: fromUsername
        };

        // Broadcast to local clients
        this._localBroadcast(namespacePath, dataWithUsername);

        // Publish to Redis for other instances (if Redis is available)
        if (global.RedisManager?.isRedisAvailable()) {
            try {
                // W-076: Use RedisManager callback-based broadcasting
                // Create channel name: controller:websocket:broadcast:{namespacePath}
                // Remove leading slash and replace slashes with colons for clean channel names
                const channelSuffix = namespacePath.replace(/^\//, '').replace(/\//g, ':');
                const channel = `controller:websocket:broadcast:${channelSuffix}`;
                global.RedisManager.publishBroadcast(channel, dataWithUsername);
                LogController.logInfo(null, 'websocket.broadcast', `Published to Redis channel: ${channel}`);
            } catch (error) {
                LogController.logError(null, 'websocket.broadcast', `Redis broadcast failed: ${error.message}`);
                // Continue with local broadcast even if Redis fails
            }
        } else {
            // Redis not available - use HTTP-based cross-instance broadcasting
            LogController.logInfo(null, 'websocket.broadcast',
                `Redis not available, attempting HTTP broadcast for namespace ${namespacePath}`);
            try {
                await this._broadcastToOtherInstances(namespacePath, dataWithUsername);
            } catch (error) {
                LogController.logError(null, 'websocket.broadcast',
                    `HTTP broadcast failed for namespace ${namespacePath}: ${error.message}`);
            }
        }
    }

    /**
     * Broadcast to local clients only (called by broadcast and Redis subscriber)
     * @private
     */
    static _localBroadcast(namespacePath, dataWithUsername) {
        const namespace = this.namespaces.get(namespacePath);
        if (!namespace) {
            return;
        }

        const message = this._formatMessage(true, dataWithUsername);
        const messageStr = JSON.stringify(message);

        let sentCount = 0;
        namespace.clients.forEach((client) => {
            if (client.ws.readyState === 1) { // WebSocket.OPEN
                client.ws.send(messageStr);
                sentCount++;
            }
        });

        // Update stats
        this._recordMessage(namespace);

        // Log activity (skip ping/pong and only log if there are actual clients or Redis is enabled for cross-instance coordination)
        if (dataWithUsername.type !== 'ping' && dataWithUsername.type !== 'pong' && (sentCount > 0 || this.redis.enabled)) {
            LogController.logInfo(null, 'websocket._localBroadcast', `Broadcast to ${sentCount} clients in ${namespacePath} (from: ${dataWithUsername.username || 'system'})`);
        }
    }

    /**
     * Send message to specific client
     * @param {string} clientId - Client ID
     * @param {string} namespacePath - Namespace path
     * @param {Object} data - Data to send
     * @param {string} fromUsername - Optional username of message originator
     */
    static sendToClient(clientId, namespacePath, data, fromUsername = '') {
        const namespace = this.namespaces.get(namespacePath);
        if (!namespace) {
            LogController.logError(null, 'websocket.sendToClient', `error: Namespace not found: ${namespacePath}`);
            return;
        }

        const client = namespace.clients.get(clientId);
        if (!client || client.ws.readyState !== 1) {
            LogController.logError(null, 'websocket.sendToClient', `error: Client not found or not open: ${clientId}`);
            return;
        }

        // Add username to data
        const dataWithUsername = {
            ...data,
            username: fromUsername
        };

        const message = this._formatMessage(true, dataWithUsername);
        client.ws.send(JSON.stringify(message));

        this._recordMessage(namespace);
    }

    /**
     * Get all statistics for admin page
     * @returns {Object} Complete statistics
     */
    static getStats() {
        const uptime = Date.now() - this.stats.startTime;
        const namespaceStats = [];

        this.namespaces.forEach((namespace, path) => {
            // Calculate status
            const timeSinceActivity = Date.now() - namespace.stats.lastActivity;
            let status;
            if (timeSinceActivity > 1800000 || namespace.clients.size === 0) { // 30 minutes
                status = 'red';
            } else if (timeSinceActivity > 300000) { // 5 minutes
                status = 'yellow';
            } else {
                status = 'green';
            }

            // Count active authenticated users
            const activeUsers = new Set();
            namespace.clients.forEach((client) => {
                if (client.user) {
                    activeUsers.add(client.user.username);
                }
            });

            namespaceStats.push({
                path,
                status,
                clientCount: namespace.clients.size,
                activeUsers: activeUsers.size,
                messagesPerMin: this._calculateMessagesPerMinute(namespace),
                totalMessages: namespace.stats.totalMessages,
                lastActivity: new Date(namespace.stats.lastActivity).toISOString()
            });
        });

        return {
            uptime,
            totalMessages: this.stats.totalMessages,
            namespaces: namespaceStats,
            activityLog: this.stats.activityLog.slice(-100) // Last 100
        };
    }

    /**
     * Admin status page
     * GET /admin/websocket-status
     */
    static async websocketStatus(req, res) {
        LogController.logRequest(req, 'websocket.websocketStatus', '');

        const stats = this.getStats();

        return ViewController.render(req, res, 'admin/websocket-status.shtml', {
            pageTitle: 'WebSocket Status',
            stats
        });
    }

    // ===== INTERNAL METHODS =====

    /**
     * Handle WebSocket upgrade request
     * @private
     */
    static _handleUpgrade(request, socket, head) {
        try {
            const urlParts = parseUrl(request.url, true);
            const pathname = urlParts.pathname;
            const query = urlParts.query;

            // Find matching namespace
            const namespace = this.namespaces.get(pathname);
            if (!namespace) {
                LogController.logError(null, 'websocket._handleUpgrade', `error: Unknown namespace: ${pathname}`);
                socket.destroy();
                return;
            }

            // Parse session using middleware
            const res = {}; // Dummy response object
            this.sessionMiddleware(request, res, () => {
                // Session is now available in request.session
                const user = request.session?.user || null;
                const username = user?.username || '';

                this._completeUpgrade(request, socket, head, namespace, user, username, query);
            });

        } catch (error) {
            LogController.logError(null, 'websocket._handleUpgrade', `error: ${error.message}`);
            socket.destroy();
        }
    }

    /**
     * Complete WebSocket upgrade after session is parsed
     * @private
     */
    static _completeUpgrade(request, socket, head, namespace, user, username, query) {
        try {

            // Check authentication using AuthController for consistency
            if (namespace.requireAuth && !AuthController.isAuthenticated(request)) {
                LogController.logError(null, 'websocket._completeUpgrade', `error: Authentication required for ${namespace.path}`);
                socket.destroy();
                return;
            }

            // Check roles using AuthController for consistency
            if (namespace.requireRoles.length > 0 && !AuthController.isAuthorized(request, namespace.requireRoles)) {
                LogController.logError(null, 'websocket._completeUpgrade', `error: Insufficient roles for ${namespace.path}`);
                socket.destroy();
                return;
            }

            // Extract optional client-provided UUID
            const clientUUID = query.uuid || null;

            // Complete WebSocket handshake
            this.wss.handleUpgrade(request, socket, head, (ws) => {
                this._onConnection(ws, namespace, user, username, clientUUID);
            });

        } catch (error) {
            LogController.logError(null, 'websocket._completeUpgrade', `error: ${error.message}`);
            socket.destroy();
        }
    }

    /**
     * Handle new WebSocket connection
     * @private
     */
    static _onConnection(ws, namespace, user, username, clientUUID) {
        // Use client-provided UUID if available, otherwise generate one
        const clientId = clientUUID || this._generateClientId();

        // Store client
        const client = {
            ws,
            user,
            username,
            lastPing: Date.now(),
            lastPong: Date.now()
        };
        namespace.clients.set(clientId, client);

        LogController.logInfo(null, 'websocket._onConnection', `Client ${clientId} (${username || 'anonymous'}) connected to ${namespace.path}`);

        // Send welcome message
        ws.send(JSON.stringify(this._formatMessage(true, {
            type: 'connected',
            clientId,
            namespace: namespace.path,
            username
        })));

        // Call onConnect handler
        if (namespace.onConnect) {
            try {
                namespace.onConnect(clientId, user);
            } catch (error) {
                LogController.logError(null, 'websocket._onConnection', `onConnect error: ${error.message}`);
            }
        }

        // Handle messages
        ws.on('message', (data) => {
            this._onMessage(clientId, namespace, user, username, data);
        });

        // Handle pong responses
        ws.on('pong', () => {
            client.lastPong = Date.now();
        });

        // Handle disconnection
        ws.on('close', () => {
            this._onDisconnect(clientId, namespace, user);
        });

        // Handle errors
        ws.on('error', (error) => {
            LogController.logError(null, 'websocket._onConnection', `WebSocket error: ${error.message}`);
        });
    }

    /**
     * Handle incoming message
     * @private
     */
    static _onMessage(clientId, namespace, user, username, data) {
        try {
            const message = JSON.parse(data.toString());

            // Add username to incoming message
            message.username = username;

            // Log activity (skip ping/pong)
            if (message.type !== 'ping' && message.type !== 'pong') {
                this._addActivityLog(namespace.path, 'received', message);
            }

            // Update stats
            this._recordMessage(namespace);

            // Call onMessage handler
            if (namespace.onMessage) {
                try {
                    namespace.onMessage(clientId, message, user);
                } catch (error) {
                    LogController.logError(null, 'websocket._onMessage', `onMessage error: ${error.message}`);
                    // Send error back to client
                    const client = namespace.clients.get(clientId);
                    if (client) {
                        const errorMsg = this._formatMessage(false, null, error.message, 500);
                        errorMsg.username = ''; // System message
                        client.ws.send(JSON.stringify(errorMsg));
                    }
                }
            }

        } catch (error) {
            LogController.logError(null, 'websocket._onMessage', `error: ${error.message}`);
            // Send error back to client
            const client = namespace.clients.get(clientId);
            if (client) {
                const errorMsg = this._formatMessage(false, null, 'Invalid message format', 400);
                errorMsg.username = ''; // System message
                client.ws.send(JSON.stringify(errorMsg));
            }
        }
    }

    /**
     * Handle client disconnection
     * @private
     */
    static _onDisconnect(clientId, namespace, user) {
        namespace.clients.delete(clientId);

        LogController.logInfo(null, 'websocket._onDisconnect', `Client ${clientId} disconnected from ${namespace.path}`);

        // Call onDisconnect handler
        if (namespace.onDisconnect) {
            try {
                namespace.onDisconnect(clientId, user);
            } catch (error) {
                LogController.logError(null, 'websocket._onDisconnect', `onDisconnect error: ${error.message}`);
            }
        }
    }

    /**
     * Start periodic health checks (ping/pong)
     * @private
     */
    static _startHealthChecks() {
        setInterval(() => {
            this.namespaces.forEach((namespace) => {
                namespace.clients.forEach((client, clientId) => {
                    // Check if client is still responsive
                    const timeSincePong = Date.now() - client.lastPong;
                    if (timeSincePong > this.websocketConf.pongTimeout + this.websocketConf.pingInterval) {
                        // Client is not responding, terminate connection
                        LogController.logInfo(null, 'websocket._startHealthChecks', `Terminating unresponsive client ${clientId}`);
                        client.ws.terminate();
                        namespace.clients.delete(clientId);
                        return;
                    }

                    // Send ping
                    if (client.ws.readyState === 1) { // WebSocket.OPEN
                        client.ws.ping();
                        client.lastPing = Date.now();
                    }
                });
            });
        }, this.websocketConf.pingInterval);
    }

    /**
     * Update instance registry for cross-instance broadcasting
     * @private
     */
    static async _updateInstanceRegistry() {
        try {
            // Use Redis for instance discovery when available
            if (global.RedisManager?.isRedisAvailable()) {
                await this._discoverRedisInstances();
            } else {
                // Fallback to PM2 or port-based discovery when Redis is unavailable
                const currentInstanceId = this._getCurrentInstanceId();

                if (process.env.PM2_HOME) {
                    this._discoverPM2Instances(currentInstanceId);
                } else {
                    this._discoverCommonPorts(currentInstanceId);
                }
            }

            this.lastRegistryUpdate = Date.now();

        } catch (error) {
            LogController.logError(null, 'websocket._updateInstanceRegistry',
                `Error updating instance registry: ${error.message}`);
        }
    }

    /**
     * Get current instance ID using PM2 or fallback logic
     * @private
     */
    static _getCurrentInstanceId() {
        // Use centralized instanceId from appConfig.system
        return global.appConfig.system.instanceId;
    }

    /**
     * Discover instances using Redis registration
     * @private
     */
    static async _discoverRedisInstances() {
        try {
            const instances = await global.RedisManager._getRegisteredInstances();
            const currentInstanceId = this._getCurrentInstanceId();

            LogController.logInfo(null, 'websocket._discoverRedisInstances',
                `Found ${instances.length} registered instances in Redis`);

            // Update registry with Redis-discovered instances
            for (const instance of instances) {
                if (instance.instanceId !== currentInstanceId) {
                    this.instanceRegistry.set(instance.instanceId, {
                        url: instance.url,
                        lastSeen: instance.lastSeen,
                        status: 'online',
                        type: 'redis'
                    });
                }
            }

        } catch (error) {
            LogController.logError(null, 'websocket._discoverRedisInstances',
                `Error discovering Redis instances: ${error.message}`);
        }
    }

    /**
     * Discover other PM2 instances in the same cluster
     * @private
     */
    static _discoverPM2Instances(currentInstanceId) {
        try {
            // In PM2, instances can communicate via environment variables or PM2 API
            // For now, assume single server with multiple PM2 instances
            const maxInstances = process.env.PM2_MAX_INSTANCES || 1;
            const currentInstance = parseInt(process.env.PM2_INSTANCE_ID || '0');

            for (let i = 0; i < maxInstances; i++) {
                if (i !== currentInstance) {
                    const instanceId = `pm2:${i}`;
                    if (!this.instanceRegistry.has(instanceId)) {
                        // In PM2, instances typically communicate via internal mechanisms
                        // For cross-instance WebSocket, we might need HTTP or other methods
                        this.instanceRegistry.set(instanceId, {
                            instanceId: i,
                            type: 'pm2',
                            lastSeen: Date.now(),
                            status: 'unknown'
                        });
                    }
                }
            }
        } catch (error) {
            LogController.logError(null, 'websocket._discoverPM2Instances',
                `Error discovering PM2 instances: ${error.message}`);
        }
    }

    /**
     * Fallback discovery for non-PM2 single-server setups
     * @private
     */
    static _discoverCommonPorts(currentInstanceId) {
        // Simple fallback: try to discover other instances on common ports
        const currentPort = global.appConfig.system.port;
        const commonPorts = [8080, 8081, 8086];

        commonPorts.forEach(port => {
            if (port !== currentPort) {
                const instanceId = `localhost:${port}`;
                if (!this.instanceRegistry.has(instanceId)) {
                    this.instanceRegistry.set(instanceId, {
                        url: `http://localhost:${port}`,
                        lastSeen: Date.now(),
                        status: 'unknown'
                    });
                }
            }
        });
    }

    /**
     * Broadcast WebSocket message to other instances via HTTP
     * @param {string} namespacePath - WebSocket namespace path
     * @param {Object} data - Message data
     * @private
     */
    static async _broadcastToOtherInstances(namespacePath, data) {
        // Update instance registry if it's stale
        const registryInterval = this.websocketConf.instanceRegistryInterval;
        if (Date.now() - this.lastRegistryUpdate > registryInterval) {
            await this._updateInstanceRegistry();
        }

        // Broadcast to each known instance
        const currentInstanceId = this._getCurrentInstanceId();
        LogController.logInfo(null, 'websocket._broadcastToOtherInstances',
            `Broadcasting to ${this.instanceRegistry.size} other instances from ${currentInstanceId}`);

        for (const [instanceId, instanceInfo] of this.instanceRegistry) {
            try {
                // Skip current instance
                if (instanceId === currentInstanceId) {
                    continue;
                }

                // For HTTP-based instances (different servers), use HTTP broadcasting
                if (instanceInfo.url && instanceInfo.type !== 'pm2') {
                    LogController.logInfo(null, 'websocket._broadcastToOtherInstances',
                        `HTTP broadcasting to ${instanceId} at ${instanceInfo.url}`);

                    const response = await fetch(`${instanceInfo.url}/api/1/websocket/broadcast`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            namespace: namespacePath,
                            data: data,
                            sourceInstance: currentInstanceId
                        })
                    });

                    if (response.ok) {
                        instanceInfo.lastSeen = Date.now();
                        instanceInfo.status = 'online';
                        LogController.logInfo(null, 'websocket._broadcastToOtherInstances',
                            `Successfully broadcast to ${instanceId}`);
                    } else {
                        instanceInfo.status = 'error';
                        LogController.logError(null, 'websocket._broadcastToOtherInstances',
                            `HTTP error broadcasting to ${instanceId}: ${response.status}`);
                    }
                } else if (instanceInfo.type === 'pm2') {
                    LogController.logInfo(null, 'websocket._broadcastToOtherInstances',
                        `Skipping PM2 instance ${instanceId} - needs different communication mechanism`);
                }

            } catch (error) {
                instanceInfo.status = 'offline';
                LogController.logError(null, 'websocket._broadcastToOtherInstances',
                    `Failed to broadcast to ${instanceId}: ${error.message}`);
            }
        }
    }

    /**
     * Initialize Redis pub/sub for multi-instance WebSocket coordination
     * Enables horizontal scaling with PM2 cluster mode
     * @private
     */
    static async _initializeRedis() {
        const appConfig = global.appConfig;

        // Check if Redis is enabled
        if (!appConfig.redis?.enabled) {
            LogController.logInfo(null, 'websocket._initializeRedis', 'Redis coordination disabled (single-instance mode)');
            return;
        }

        try {
            // Check if Redis is actually available before initializing
            const isRedisAvailable = global.RedisManager?.isRedisAvailable() || false;

            if (isRedisAvailable) {
                // W-076: Use RedisManager for WebSocket broadcasting
                // Register callback for WebSocket broadcasts from other instances (only once)
                if (!this.redis.callbackRegistered) {
                    global.RedisManager.registerBroadcastCallback('controller:websocket:broadcast:*', (channel, data, sourceInstanceId) => {
                    // Extract namespace from channel (controller:websocket:broadcast:api:1:ws:namespace)
                    const channelSuffix = channel.replace('controller:websocket:broadcast:', '');
                    // Convert back to path format: api:1:ws:namespace -> /api/1/ws/namespace
                    const namespacePath = '/' + channelSuffix.replace(/:/g, '/');

                    // Only filter messages if Redis is available (cluster mode)
                    const currentRedisAvailable = global.RedisManager?.isRedisAvailable() || false;

                    // Process messages from other instances, or all messages if single instance
                    if (!currentRedisAvailable || sourceInstanceId !== global.appConfig.system.instanceId) {
                        this._localBroadcast(namespacePath, data);
                    }
                    });

                    this.redis.callbackRegistered = true;
                }

                this.redis.enabled = true;
                LogController.logInfo(null, 'websocket._initializeRedis', 'Redis pub/sub initialized for multi-instance WebSocket coordination');
            } else {
                LogController.logInfo(null, 'websocket._initializeRedis', 'Redis not available - using single-instance mode');
                this.redis.enabled = false;
            }

        } catch (error) {
            LogController.logError(null, 'websocket._initializeRedis', `error: ${error.message} - falling back to single-instance mode`);
            this.redis.enabled = false;
        }
    }

    /**
     * Register /api/1/ws/jpulse-ws-status namespace for real-time stats updates
     * @private
     */
    static _registerAdminStatsNamespace() {
        this.registerNamespace('/api/1/ws/jpulse-ws-status', {
            requireAuth: true,
            requireRoles: ['admin', 'root'],
            onConnect: (clientId, user) => {
                // Send initial stats
                const stats = this.getStats();
                this.sendToClient(clientId, '/api/1/ws/jpulse-ws-status', {
                    type: 'stats-update',
                    data: stats
                });

                // Set up interval to send updates every 5 seconds
                const interval = setInterval(() => {
                    const namespace = this.namespaces.get('/api/1/ws/jpulse-ws-status');
                    const client = namespace?.clients.get(clientId);
                    if (!client || client.ws.readyState !== 1) {
                        clearInterval(interval);
                        return;
                    }

                    const stats = this.getStats();
                    this.sendToClient(clientId, '/api/1/ws/jpulse-ws-status', {
                        type: 'stats-update',
                        data: stats
                    });
                }, 5000);

                // Store interval on client for cleanup
                const namespace = this.namespaces.get('/api/1/ws/jpulse-ws-status');
                const client = namespace.clients.get(clientId);
                if (client) {
                    client.statsInterval = interval;
                }
            },
            onMessage: (clientId, message, user) => {
                // Log admin activity messages (like admin-connected)
                if (message.type === 'admin-connected') {
                    LogController.logInfo(null, 'websocket._registerAdminStatsNamespace', `Admin monitoring connected: ${message.message}`);
                }
            },
            onDisconnect: (clientId, user) => {
                // Clean up interval
                const namespace = this.namespaces.get('/api/1/ws/jpulse-ws-status');
                const client = namespace?.clients.get(clientId);
                if (client && client.statsInterval) {
                    clearInterval(client.statsInterval);
                }
            }
        });
    }

    /**
     * Handle HTTP broadcast from other instances (when Redis is unavailable)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async handleHttpBroadcast(req, res) {
        try {
            const { namespace, data, sourceInstance } = req.body;

            LogController.logInfo(null, 'websocket.handleHttpBroadcast',
                `Received HTTP broadcast from ${sourceInstance} for namespace ${namespace}`);

            if (!namespace || !data) {
                LogController.logError(null, 'websocket.handleHttpBroadcast',
                    'Missing namespace or data in HTTP broadcast');
                return res.status(400).json({
                    success: false,
                    error: 'Missing namespace or data'
                });
            }

            // Verify this is not from our own instance
            const currentInstanceId = WebSocketController._getCurrentInstanceId();
            if (sourceInstance === currentInstanceId) {
                LogController.logInfo(null, 'websocket.handleHttpBroadcast',
                    'Ignored self-broadcast');
                return res.status(200).json({ success: true, message: 'Ignored self-broadcast' });
            }

            // Update the source instance in our registry
            WebSocketController.instanceRegistry.set(sourceInstance, {
                url: `http://localhost:${sourceInstance.split(':')[1] || 'unknown'}`,
                lastSeen: Date.now(),
                status: 'online',
                type: 'redis'
            });

            // Broadcast the message locally
            LogController.logInfo(null, 'websocket.handleHttpBroadcast',
                `Broadcasting message locally to namespace ${namespace}`);
            this._localBroadcast(namespace, data);

            res.json({
                success: true,
                message: 'Message broadcast successfully'
            });

        } catch (error) {
            LogController.logError(null, 'websocket.handleHttpBroadcast',
                `Error handling HTTP broadcast: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Register /api/1/ws/jpulse-ws-test namespace for testing
     * @private
     */
    static _registerTestNamespace() {
        this.registerNamespace('/api/1/ws/jpulse-ws-test', {
            requireAuth: true,
            onConnect: (clientId, user) => {
                LogController.logInfo(null, 'websocket._registerTestNamespace', `Test client connected: ${clientId}`);
            },
            onMessage: (clientId, message, user) => {
                // Echo messages back and broadcast to all clients
                LogController.logInfo(null, 'websocket._registerTestNamespace', `Test message received: ${JSON.stringify(message)}`);

                // Broadcast to all clients in namespace
                this.broadcast('/api/1/ws/jpulse-ws-test', {
                    type: 'echo',
                    originalMessage: message,
                    serverTimestamp: new Date().toISOString(),
                    clientId: clientId
                }, message.username || user?.username || '');
            },
            onDisconnect: (clientId, user) => {
                LogController.logInfo(null, 'websocket._registerTestNamespace', `Test client disconnected: ${clientId}`);
            }
        });
    }

    /**
     * Format message in standard API format
     * @private
     */
    static _formatMessage(success, data, error = null, code = null) {
        if (success) {
            return {
                success: true,
                data
            };
        } else {
            return {
                success: false,
                error,
                code
            };
        }
    }

    /**
     * Record message for statistics
     * @private
     */
    static _recordMessage(namespace) {
        const now = Date.now();

        // Update namespace stats
        namespace.stats.totalMessages++;
        namespace.stats.lastActivity = now;
        namespace.stats.messageTimestamps.push(now);

        // Keep only last 5 minutes of timestamps for per-minute calculation
        const fiveMinutesAgo = now - 300000; // 5 minutes
        namespace.stats.messageTimestamps = namespace.stats.messageTimestamps.filter(ts => ts > fiveMinutesAgo);

        // Update global stats
        this.stats.totalMessages++;
    }

    /**
     * Calculate messages per minute for namespace (averaged over last 5 minutes)
     * @private
     */
    static _calculateMessagesPerMinute(namespace) {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const messagesInLastMinute = namespace.stats.messageTimestamps.filter(ts => ts > oneMinuteAgo).length;
        return messagesInLastMinute;
    }

    /**
     * Add entry to activity log
     * @private
     */
    static _addActivityLog(namespace, direction, message) {
        const messageStr = JSON.stringify(message);
        // Truncate to 500 chars for bandwidth conservation (client displays 150 chars)
        const truncated = messageStr.length > 500 ? messageStr.substring(0, 500) : messageStr;

        this.stats.activityLog.push({
            timestamp: new Date().toISOString(),
            namespace,
            direction, // 'sent' or 'received'
            message: truncated
        });

        // Keep only last 100 entries
        if (this.stats.activityLog.length > 100) {
            this.stats.activityLog.shift();
        }
    }

    /**
     * Generate UUID v4
     * @private
     */
    static _generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Generate unique client ID (UUID v4)
     * @private
     */
    static _generateClientId() {
        return this._generateUUID();
    }

    /**
     * Get namespace stats
     * @private
     */
    static _getNamespaceStats(path) {
        const namespace = this.namespaces.get(path);
        if (!namespace) return null;

        return {
            path,
            clientCount: namespace.clients.size,
            totalMessages: namespace.stats.totalMessages,
            messagesPerMin: this._calculateMessagesPerMinute(namespace),
            lastActivity: new Date(namespace.stats.lastActivity).toISOString()
        };
    }
}

export default WebSocketController;

// EOF webapp/controller/websocket.js
