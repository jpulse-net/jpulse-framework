/**
 * @name            jPulse Framework / WebApp / Controller / WebSocket
 * @tagline         WebSocket Controller for Real-Time Communication
 * @description     Manages WebSocket namespaces, client connections, and provides admin stats
 * @file            webapp/controller/websocket.js
 * @version         1.6.15
 * @release         2026-02-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.4, Claude Sonnet 4.5
 */

import { WebSocketServer as WSServer } from 'ws';
import { parse as parseUrl } from 'url';
import AuthController from './auth.js';
import ConfigModel from '../model/config.js';

// Access global utilities
const LogController = global.LogController;
const CommonUtils = global.CommonUtils;
const ViewController = global.ViewController;

/** W-155: default context when none supplied (system / no user) */
const DEFAULT_CTX = { username: '_system', ip: '0.0.0.0', roles: [], firstName: '', lastName: '', initials: '', params: {} };

/**
 * WebSocket namespace instance (W-154/W-155). Create via WebSocketController.createNamespace(path, options).
 * Handlers receive a single conn object: onConnect(conn), onMessage(conn), onDisconnect(conn).
 * W-155: conn = { clientId, ctx } for onConnect/onDisconnect; onMessage also has conn.message.
 * ctx = { username, ip, roles, firstName, lastName, initials, params }.
 */
class WebSocketNamespace {
    constructor(path, options = {}) {
        this.path = path;
        this.requireAuth = options.requireAuth || false;
        this.requireRoles = options.requireRoles || [];
        this.onCreate = options.onCreate || null; // W-155: onCreate hook for dynamic namespaces
        this._onConnect = null;
        this._onMessage = null;
        this._onDisconnect = null;
        this.clients = new Map();
        this.stats = {
            totalMessages: 0,
            messagesPerHour: 0,
            lastActivity: Date.now(),
            messageTimestamps: []
        };
    }

    onConnect(fn) {
        this._onConnect = fn;
        return this;
    }

    onMessage(fn) {
        this._onMessage = fn;
        return this;
    }

    onDisconnect(fn) {
        this._onDisconnect = fn;
        return this;
    }

    broadcast(data, ctx = null) {
        return WebSocketController.broadcast(this.path, data, ctx);
    }

    sendToClient(clientId, data, ctx = null) {
        return WebSocketController.sendToClient(clientId, this.path, data, ctx);
    }

    getStats() {
        return WebSocketController._getNamespaceStats(this.path);
    }

    /**
     * W-155: Remove this namespace if it has no connected clients
     * @returns {boolean} True if namespace was removed, false if it still has clients
     */
    removeIfEmpty() {
        return WebSocketController.removeNamespace(this.path, { removeIfEmpty: true });
    }
}

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
 * Usage (W-154):
 *   const ns = WebSocketController.createNamespace('/api/1/ws/my-app', { requireAuth: false });
 *   ns.onConnect((conn) => {}).onMessage((conn) => {}).onDisconnect((conn) => {});
 *   ns.broadcast(data); ns.sendToClient(clientId, data);
 *
 * Message payload convention: use { type, data } for event payloads (data = event-specific body).
 * Client-side (in view):
 *   const ws = jPulse.ws.connect('/api/1/ws/my-app')
 *     .onMessage((msg) => { if (msg.success) use msg.data; });
 *   ws.send({ type: 'action', data: {...} });
 */
class WebSocketController {

    // WebSocket server instance
    static wss = null;

    // Session middleware (for parsing sessions during upgrade)
    static sessionMiddleware = null;

    // Registered namespaces (path → WebSocketNamespace instance)
    static namespaces = new Map();

    // W-155: Pattern namespaces (for dynamic namespace creation)
    // Array of { pattern, regex, paramNames, templateNsObject } for path-param matching
    static patternNamespaces = [];

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
            httpServer.on('upgrade', (req, socket, head) => {
                this._handleUpgrade(req, socket, head);
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

            // Register metrics provider (W-112)
            (async () => {
                try {
                    const MetricsRegistry = (await import('../utils/metrics-registry.js')).default;
                    MetricsRegistry.register('websocket', () => WebSocketController.getMetrics(), {
                        async: false,
                        category: 'controller'
                    });
                } catch (error) {
                    // MetricsRegistry might not be available yet, will be registered later
                    console.warn('WebSocketController: Failed to register metrics provider:', error.message);
                }
            })();

            LogController.logInfo(null, 'websocket.initialize', 'WebSocket server initialized successfully');

        } catch (error) {
            LogController.logError(null, 'websocket.initialize', `error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a WebSocket namespace (W-154/W-155).
     * Returns instance with .onConnect(fn).onMessage(fn).onDisconnect(fn) (chainable) and .broadcast()/.sendToClient()/.getStats().
     * Handlers receive single conn: onConnect(conn), onMessage(conn), onDisconnect(conn). W-155: conn = { clientId, ctx }; onMessage conn also has message.
     *
     * W-155: For dynamic namespaces, provide path with :param placeholders (e.g. /api/1/ws/bubblemap/:mapId).
     * Set options.onCreate = (req, ctx) => ctx | null | number for per-connect authz and ctx amendment.
     *
     * @param {string} path - Namespace path (must start with /api/1/ws/). May include :param placeholders for dynamic namespaces.
     * @param {Object} options - { requireAuth?, requireRoles?, onCreate? }
     * @returns {WebSocketNamespace}
     */
    static createNamespace(path, options = {}) {
        try {
            if (!path.startsWith('/api/1/ws/')) {
                throw new Error(`Namespace path must start with /api/1/ws/ (got: ${path})`);
            }

            // W-155: Check if path contains :param patterns
            const hasParams = path.includes(':');

            if (hasParams) {
                // Pattern namespace: store pattern + template namespace object for lazy creation
                // Convert Express-style :param to regex and extract param names
                const paramNames = [];
                const regexPattern = path
                    .split('/')
                    .map(segment => {
                        if (segment.startsWith(':')) {
                            paramNames.push(segment.slice(1));
                            return '([^/]+)'; // match any non-slash chars
                        }
                        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape special chars
                    })
                    .join('/');
                const regex = new RegExp(`^${regexPattern}$`);

                // Create template namespace object (not yet in namespaces map)
                const templateNsObject = new WebSocketNamespace(path, options);

                // Store pattern
                this.patternNamespaces.push({
                    pattern: path,
                    regex,
                    paramNames,
                    templateNsObject
                });

                LogController.logInfo(null, 'websocket.createNamespace', `Registered pattern namespace: ${path}`);
                return templateNsObject;

            } else {
                // Literal namespace: create immediately
                if (this.namespaces.has(path)) {
                    throw new Error(`Namespace ${path} is already registered`);
                }
                const namespace = new WebSocketNamespace(path, options);
                this.namespaces.set(path, namespace);
                LogController.logInfo(null, 'websocket.createNamespace', `Registered namespace: ${path}`);
                return namespace;
            }

        } catch (error) {
            LogController.logError(null, 'websocket.createNamespace', `error: ${error.message}`);
            throw error;
        }
    }

    /**
     * W-155: Remove a namespace (optionally only if empty)
     * @param {string} path - Namespace path to remove
     * @param {Object} options - { removeIfEmpty?: boolean }
     * @returns {boolean} True if namespace was removed, false otherwise
     */
    static removeNamespace(path, options = {}) {
        try {
            const namespace = this.namespaces.get(path);
            if (!namespace) {
                LogController.logInfo(null, 'websocket.removeNamespace', `Namespace not found (already removed?): ${path}`);
                return false;
            }

            if (options.removeIfEmpty) {
                if (namespace.clients.size > 0) {
                    LogController.logInfo(null, 'websocket.removeNamespace', `Namespace ${path} still has ${namespace.clients.size} clients, not removing`);
                    return false;
                }
            }

            this.namespaces.delete(path);
            LogController.logInfo(null, 'websocket.removeNamespace', `Removed namespace: ${path}`);
            return true;

        } catch (error) {
            LogController.logError(null, 'websocket.removeNamespace', `error: ${error.message}`);
            return false;
        }
    }

    /**
     * Broadcast message to all clients in namespace (W-154 Phase 3: payload includes ctx)
     * @param {string} namespacePath - Namespace path
     * @param {Object} data - Data to broadcast ({ type, data } or similar)
     * @param {Object|null} ctx - Context { username?, ip? }; default DEFAULT_CTX if null/undefined
     */
    static async broadcast(namespacePath, data, ctx = null) {
        const namespace = this.namespaces.get(namespacePath);
        if (!namespace) {
            LogController.logError(ctx, 'websocket.broadcast', `error: Namespace not found: ${namespacePath}`);
            return;
        }

        const resolvedCtx = ctx ?? DEFAULT_CTX;
        const payload = { ...data, ctx: resolvedCtx };

        // Broadcast to local clients
        this._localBroadcast(namespacePath, payload);

        // Publish to Redis for other instances (if Redis is available)
        if (global.RedisManager?.isRedisAvailable()) {
            try {
                const channelSuffix = namespacePath.replace(/^\//, '').replace(/\//g, ':');
                const channel = `controller:websocket:broadcast:${channelSuffix}`;
                global.RedisManager.publishBroadcast(channel, payload);
                LogController.logInfo(ctx, 'websocket.broadcast', `Published to Redis channel: ${channel}`);
            } catch (error) {
                LogController.logError(ctx, 'websocket.broadcast', `Redis broadcast failed: ${error.message}`);
            }
        } else {
            LogController.logInfo(ctx, 'websocket.broadcast',
                'Redis not available - single instance mode');
        }
    }

    /**
     * Broadcast to local clients only (called by broadcast and Redis subscriber). Payload has ctx (W-154 Phase 3).
     * @private
     */
    static _localBroadcast(namespacePath, payload) {
        const namespace = this.namespaces.get(namespacePath);
        if (!namespace) {
            return;
        }

        const message = this._formatMessage(true, payload);
        const messageStr = JSON.stringify(message);

        let sentCount = 0;
        namespace.clients.forEach((client) => {
            if (client.ws.readyState === 1) { // WebSocket.OPEN
                client.ws.send(messageStr);
                sentCount++;
            }
        });

        this._recordMessage(namespace);

        if (payload.type !== 'ping' && payload.type !== 'pong' && (sentCount > 0 || this.redis.enabled)) {
            LogController.logInfo(payload.ctx, 'websocket._localBroadcast',
                `Broadcast to ${sentCount} clients in ${namespacePath} (from: ${payload.ctx?.username || 'system'})`);
        }
    }

    /**
     * Send message to specific client (W-154 Phase 3: payload includes ctx)
     * @param {string} clientId - Client ID
     * @param {string} namespacePath - Namespace path
     * @param {Object} data - Data to send
     * @param {Object|null} ctx - Context { username?, ip? }; default DEFAULT_CTX if null/undefined
     */
    static sendToClient(clientId, namespacePath, data, ctx = null) {
        const namespace = this.namespaces.get(namespacePath);
        if (!namespace) {
            LogController.logError(ctx, 'websocket.sendToClient', `error: Namespace not found: ${namespacePath}`);
            return;
        }

        const client = namespace.clients.get(clientId);
        if (!client || client.ws.readyState !== 1) {
            LogController.logError(ctx, 'websocket.sendToClient', `error: Client not found or not open: ${clientId}`);
            return;
        }

        const payload = { ...data, ctx: ctx ?? DEFAULT_CTX };
        const message = this._formatMessage(true, payload);
        client.ws.send(JSON.stringify(message));

        this._recordMessage(namespace);
    }


    /**
     * Get WebSocket metrics (standardized getMetrics() format for W-112)
     * @returns {Object} Component metrics with standardized structure
     */
    static getMetrics() {
        // Convert to seconds for consistency
        const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
        let totalConnections = 0;
        const namespaceStats = [];

        this.namespaces.forEach((namespace, path) => {
            const clientCount = namespace.clients.size;
            totalConnections += clientCount;

            // Calculate status
            const timeSinceActivity = Date.now() - namespace.stats.lastActivity;
            let status;
            const inactiveTimeout = global.appConfig?.controller?.websocket?.statusTimeouts?.inactive || 1800000;
            const warningTimeout = global.appConfig?.controller?.websocket?.statusTimeouts?.warning || 300000;

            if (timeSinceActivity > inactiveTimeout || clientCount === 0) {
                status = 'red';
            } else if (timeSinceActivity > warningTimeout) {
                status = 'yellow';
            } else {
                status = 'green';
            }

            // Count active authenticated users (for admin status page; W-155: use ctx)
            const activeUsers = new Set();
            namespace.clients.forEach((client) => {
                if (client.ctx?.username && client.ctx.username !== '(guest)' && client.ctx.username !== '_system') {
                    activeUsers.add(client.ctx.username);
                }
            });

            namespaceStats.push({
                path,
                status,
                clientCount,
                totalMessages: namespace.stats.totalMessages,
                lastActivity: new Date(namespace.stats.lastActivity).toISOString(),
                // Additional fields for admin status page (visualize: false)
                activeUsers: activeUsers.size,
                messagesPerMin: this._calculateMessagesPerMinute(namespace)
            });
        });

        // Determine overall status based on namespaces
        let overallStatus = 'ok';
        const hasRedNamespaces = namespaceStats.some(ns => ns.status === 'red');
        const hasYellowNamespaces = namespaceStats.some(ns => ns.status === 'yellow');
        if (hasRedNamespaces) {
            overallStatus = 'error';
        } else if (hasYellowNamespaces) {
            overallStatus = 'warning';
        }

        return {
            component: 'WebSocketController',
            status: overallStatus,
            initialized: this.wss !== null,
            stats: {
                uptime,
                totalConnections,
                totalMessages: this.stats.totalMessages,
                totalNamespaces: this.namespaces.size,
                namespaces: namespaceStats,
                // Additional field for admin status page (visualize: false)
                activityLog: this.stats.activityLog.slice(-(global.appConfig?.controller?.websocket?.activityLogMaxSize || 100))
            },
            meta: {
                ttl: 0,  // Fast, no caching needed
                category: 'controller',
                fields: {
                    'uptime': {
                        aggregate: 'max'  // Longest uptime across instances
                    },
                    'totalConnections': {
                        aggregate: 'sum'  // Sum connections across instances
                    },
                    'totalMessages': {
                        aggregate: 'sum'  // Sum messages across instances
                    },
                    'totalNamespaces': {
                        aggregate: 'first'  // Same across instances
                    },
                    'namespaces': {
                        aggregate: false,   // Complex object, don't aggregate
                        visualize: false    // Don't visualize in UI (too complex)
                    },
                    'activityLog': {
                        aggregate: false,   // Complex array, don't aggregate
                        visualize: false    // Only for admin status page
                    }
                }
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Admin status page
     * GET /admin/websocket-status
     */
    static async websocketStatus(req, res) {
        LogController.logRequest(req, 'websocket.websocketStatus', '');

        const metrics = this.getMetrics();
        // Extract stats in format expected by websocket-status.shtml
        const stats = {
            uptime: metrics.stats.uptime,
            totalMessages: metrics.stats.totalMessages,
            namespaces: metrics.stats.namespaces,
            activityLog: metrics.stats.activityLog
        };

        return ViewController.render(req, res, 'admin/websocket-status.shtml', {
            pageTitle: 'WebSocket Status',
            stats
        });
    }

    // ===== INTERNAL METHODS =====

    /**
     * W-158: Check if namespace path is in publicAccess whitelist.
     * Whitelist entries: exact suffix (e.g. 'jpulse-ws-status') or prefix pattern (e.g. 'hello-*').
     * @param {string} path - Full path e.g. /api/1/ws/jpulse-ws-status
     * @returns {boolean}
     * @private
     */
    static _isPathWhitelisted(path) {
        const list = global.appConfig?.controller?.websocket?.publicAccess?.whitelisted;
        if (!Array.isArray(list) || list.length === 0) return false;
        const base = '/api/1/ws/';
        const suffix = path.startsWith(base) ? path.slice(base.length) : path;
        for (const entry of list) {
            if (typeof entry !== 'string' || !entry.trim()) continue;
            const t = entry.trim();
            if (t.endsWith('*')) {
                const prefix = t.slice(0, -1);
                if (suffix.startsWith(prefix)) return true;
            } else if (suffix === t || path === base + t) {
                return true;
            }
        }
        return false;
    }

    /**
     * W-158: Filter metrics stats to only whitelisted namespaces (for public clients).
     * @param {Object} metrics - Full getMetrics() result
     * @returns {Object} New object with stats.namespaces and stats.activityLog filtered
     * @private
     */
    static _filterStatsByWhitelist(metrics) {
        const list = global.appConfig?.controller?.websocket?.publicAccess?.whitelisted;
        if (!Array.isArray(list) || list.length === 0) {
            return { ...metrics, stats: { ...metrics.stats, namespaces: [], activityLog: [] } };
        }
        const isWhitelisted = (path) => this._isPathWhitelisted(path);
        const namespaces = (metrics.stats?.namespaces || []).filter(ns => isWhitelisted(ns.path));
        const activityLog = (metrics.stats?.activityLog || []).filter(entry => isWhitelisted(entry.namespace));
        return {
            ...metrics,
            stats: {
                ...metrics.stats,
                namespaces,
                activityLog
            }
        };
    }

    /**
     * Handle WebSocket upgrade request
     * W-155: Enhanced with pattern matching for dynamic namespaces
     * @private
     */
    static _handleUpgrade(req, socket, head) {
        try {
            const urlParts = parseUrl(req.url, true);
            const pathname = urlParts.pathname;
            const query = urlParts.query;

            // W-155: Try exact match first, then pattern match
            let namespace = this.namespaces.get(pathname);
            let patternMatch = null;
            let extractedParams = {};

            // Always try pattern matching to extract params (even if exact namespace exists)
            // This ensures params are populated on every connection, not just first creation
            for (const pattern of this.patternNamespaces) {
                const match = pathname.match(pattern.regex);
                if (match) {
                    patternMatch = pattern;
                    // Extract params from match groups
                    for (let i = 0; i < pattern.paramNames.length; i++) {
                        extractedParams[pattern.paramNames[i]] = match[i + 1];
                    }
                    LogController.logInfo(req, 'websocket._handleUpgrade', `Pattern matched: ${pattern.pattern}, extracted params: ${JSON.stringify(extractedParams)}`);
                    break;
                }
            }

            // If no exact namespace and no pattern match, reject
            if (!namespace && !patternMatch) {
                LogController.logError(req, 'websocket._handleUpgrade', `error: Unknown namespace: ${pathname}`);
                socket.destroy();
                return;
            }

            // Parse session using middleware
            const res = {}; // Dummy response object
            this.sessionMiddleware(req, res, () => {
                // Session is now available in req.session
                const user = req.session?.user || null;
                const username = user?.username || '';

                this._completeUpgrade(req, socket, head, namespace, patternMatch, extractedParams, user, username, query, pathname);
            });

        } catch (error) {
            LogController.logError(req, 'websocket._handleUpgrade', `error: ${error.message}`);
            socket.destroy();
        }
    }

    /**
     * Complete WebSocket upgrade after session is parsed
     * W-155: Enhanced with onCreate hook and dynamic namespace creation
     * @private
     */
    static _completeUpgrade(req, socket, head, namespace, patternMatch, extractedParams, user, username, query, pathname) {
        try {

            // W-155: If pattern match, get-or-create literal namespace
            if (patternMatch) {
                // Check if literal namespace already exists
                if (!this.namespaces.has(pathname)) {
                    // Create literal namespace by copying template
                    const template = patternMatch.templateNsObject;
                    const literalNs = new WebSocketNamespace(pathname, {
                        requireAuth: template.requireAuth,
                        requireRoles: template.requireRoles,
                        onCreate: template.onCreate
                    });
                    // Copy handlers from template
                    literalNs._onConnect = template._onConnect;
                    literalNs._onMessage = template._onMessage;
                    literalNs._onDisconnect = template._onDisconnect;
                    this.namespaces.set(pathname, literalNs);
                    LogController.logInfo(req, 'websocket._completeUpgrade', `Created literal namespace from pattern: ${pathname}`);
                }
                namespace = this.namespaces.get(pathname);
            }

            // W-158: When publicAccess.enabled and path whitelisted, allow without auth/roles
            const publicAccess = global.appConfig?.controller?.websocket?.publicAccess;
            const allowPublic = publicAccess?.enabled === true && this._isPathWhitelisted(pathname);

            if (!allowPublic) {
                if (namespace.requireAuth && !AuthController.isAuthenticated(req)) {
                    LogController.logError(req, 'websocket._completeUpgrade', `error: Authentication required for ${namespace.path}`);
                    socket.destroy();
                    return;
                }
                if (namespace.requireRoles.length > 0 && !AuthController.isAuthorized(req, namespace.requireRoles)) {
                    LogController.logError(req, 'websocket._completeUpgrade', `error: Insufficient roles for ${namespace.path}`);
                    socket.destroy();
                    return;
                }
            }

            // Extract optional client-provided UUID
            const clientUUID = query.uuid || null;

            // W-155: Build ctx with all identity fields from session + request
            const commonUtils = global.CommonUtils;
            const requestContext = commonUtils ? commonUtils.getLogContext(req) : {};
            const ip = requestContext.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '0.0.0.0';

            let ctx = {
                username: user?.username || '',
                ip,
                roles: user?.roles || [],
                firstName: user?.firstName || '',
                lastName: user?.lastName || '',
                initials: user?.initials || '',
                params: extractedParams || {}  // W-155: populated for dynamic namespaces
            };
            if (allowPublic) {
                const adminRoles = ConfigModel.getEffectiveAdminRoles();
                ctx.isPublic = !AuthController.isAuthorized(req, adminRoles);
            }

            // W-155: Call onCreate hook if present (pattern namespaces)
            if (namespace.onCreate) {
                try {
                    const onCreateResult = namespace.onCreate(req, ctx);
                    if (onCreateResult === null) {
                        // Reject with default code
                        LogController.logError(req, 'websocket._completeUpgrade', `onCreate rejected connection for ${namespace.path}`);
                        socket.destroy();
                        return;
                    } else if (typeof onCreateResult === 'number') {
                        // Reject with custom close code
                        LogController.logError(req, 'websocket._completeUpgrade', `onCreate rejected connection with code ${onCreateResult} for ${namespace.path}`);
                        socket.destroy();
                        return;
                    } else if (typeof onCreateResult === 'object' && onCreateResult !== null) {
                        // Accept and amend ctx
                        ctx = onCreateResult;
                    }
                } catch (error) {
                    LogController.logError(req, 'websocket._completeUpgrade', `onCreate error: ${error.message}`);
                    socket.destroy();
                    return;
                }
            }

            // Complete WebSocket handshake
            this.wss.handleUpgrade(req, socket, head, (ws) => {
                this._onConnection(ws, namespace, ctx, clientUUID);
            });

        } catch (error) {
            LogController.logError(req, 'websocket._completeUpgrade', `error: ${error.message}`);
            socket.destroy();
        }
    }

    /**
     * Handle new WebSocket connection
     * W-155: ctx-only identity (no user/username params)
     * @private
     */
    static _onConnection(ws, namespace, ctx, clientUUID) {
        // Use client-provided UUID if available, otherwise generate one
        const clientId = clientUUID || this._generateClientId();

        // W-155: Store client with ctx only (no user, username). W-158: messageTimestamps for rate limit
        const client = {
            ws,
            ctx,
            lastPing: Date.now(),
            lastPong: Date.now(),
            messageTimestamps: []
        };
        namespace.clients.set(clientId, client);

        LogController.logInfo(ctx, 'websocket._onConnection', `Client ${clientId} (${ctx.username}) connected to ${namespace.path}`);

        // Send welcome message with sanitized ctx
        ws.send(JSON.stringify(this._formatMessage(true, {
            type: 'connected',
            clientId,
            namespace: namespace.path,
            ctx: {
                username: ctx.username,
                roles: ctx.roles,
                firstName: ctx.firstName,
                lastName: ctx.lastName,
                initials: ctx.initials
                // Omit: ip (sensitive), params (internal)
            }
        })));

        // Call onConnect handler (W-155: conn = { clientId, ctx })
        if (namespace._onConnect) {
            try {
                const conn = { clientId, ctx };
                namespace._onConnect(conn);
            } catch (error) {
                LogController.logError(ctx, 'websocket._onConnection', `onConnect error: ${error.message}`);
            }
        }

        // Handle messages
        ws.on('message', (data) => {
            void this._onMessage(clientId, namespace, data);
        });

        // Handle pong responses
        ws.on('pong', () => {
            client.lastPong = Date.now();
        });

        // Handle disconnection
        ws.on('close', () => {
            this._onDisconnect(clientId, namespace);
        });

        // Handle errors
        ws.on('error', (error) => {
            LogController.logError(ctx, 'websocket._onConnection', `WebSocket error: ${error.message}`);
        });
    }

    /**
     * Handle incoming message
     * W-155: ctx-only (no user/username params)
     * Supports sync and async onMessage handlers; async rejections are sent to client like sync throws.
     * @private
     */
    static async _onMessage(clientId, namespace, data) {
        const client = namespace.clients.get(clientId);
        const ctx = client?.ctx || null;

        // W-158: Message size limit
        const limits = global.appConfig?.controller?.websocket?.messageLimits;
        const maxSize = limits?.maxSize ?? 65536;
        const rawLength = Buffer.isBuffer(data) ? data.length : (typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : 0);
        if (rawLength > maxSize) {
            LogController.logInfo(ctx, 'websocket._onMessage', `Dropped oversized message: ${rawLength} > ${maxSize}`);
            return;
        }

        // W-158: Per-client rate limit
        const interval = limits?.interval ?? 1000;
        const maxMessages = limits?.maxMessages ?? 50;
        const now = Date.now();
        const timestamps = client?.messageTimestamps || [];
        const windowStart = now - interval;
        const recent = timestamps.filter(t => t > windowStart);
        if (recent.length >= maxMessages) {
            LogController.logInfo(ctx, 'websocket._onMessage', `Rate limit exceeded: ${recent.length} in ${interval}ms`);
            return;
        }
        recent.push(now);
        if (client) client.messageTimestamps = recent;

        try {
            const message = JSON.parse(data.toString());

            // Add username to incoming message
            message.username = ctx?.username || '';

            // Log activity (skip ping/pong)
            if (message.type !== 'ping' && message.type !== 'pong') {
                this._addActivityLog(namespace.path, 'received', message);
            }

            // Update stats
            this._recordMessage(namespace);

            // Call onMessage handler (W-155: conn = { clientId, message, ctx })
            if (namespace._onMessage) {
                try {
                    const conn = { clientId, message, ctx };
                    const result = namespace._onMessage(conn);
                    if (result != null && typeof result.then === 'function') {
                        await result;
                    }
                } catch (error) {
                    LogController.logError(ctx, 'websocket._onMessage', `onMessage error: ${error.message}`);
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
            LogController.logError(ctx, 'websocket._onMessage', `error: ${error.message}`);
            // Send error back to client
            const clientForSend = namespace.clients.get(clientId);
            if (clientForSend) {
                const errorMsg = this._formatMessage(false, null, 'Invalid message format', 400);
                errorMsg.username = ''; // System message
                clientForSend.ws.send(JSON.stringify(errorMsg));
            }
        }
    }

    /**
     * Handle client disconnection
     * W-155: ctx-only (no user param)
     * @private
     */
    static _onDisconnect(clientId, namespace) {
        const client = namespace.clients.get(clientId);
        const ctx = client?.ctx || null;

        // Remove client first so onDisconnect handler sees correct client count (e.g. for user-left broadcast)
        namespace.clients.delete(clientId);
        LogController.logInfo(ctx, 'websocket._onDisconnect', `Client ${clientId} disconnected from ${namespace.path}`);

        if (namespace._onDisconnect) {
            try {
                const conn = { clientId, ctx };
                namespace._onDisconnect(conn);
            } catch (error) {
                LogController.logError(ctx, 'websocket._onDisconnect', `onDisconnect error: ${error.message}`);
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
                        LogController.logInfo(client.ctx || null, 'websocket._startHealthChecks', `Terminating unresponsive client ${clientId}`);
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
            const instances = await global.RedisManager.getRegisteredInstances();
            const currentInstanceId = this._getCurrentInstanceId();

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

            // W-076: Use RedisManager for WebSocket broadcasting
            // Register callback for WebSocket broadcasts from other instances (unconditionally)
            if (!this.redis.callbackRegistered) {
                const callback = (channel, data, sourceInstanceId) => {
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
                };

                // Register the callback with Redis manager (this also handles subscription)
                global.RedisManager.registerBroadcastCallback('controller:websocket:broadcast:*', callback);

                this.redis.callbackRegistered = true;
            }

            // Redis subscription is handled by registerBroadcastCallback above
            if (isRedisAvailable) {
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
        const path = '/api/1/ws/jpulse-ws-status';
        const ns = this.createNamespace(path, {
            requireAuth: true,
            requireRoles: ConfigModel.getEffectiveAdminRoles()
        });
        ns.onConnect((conn) => {
            const metrics = this.getMetrics();
            const filtered = conn.ctx.isPublic ? this._filterStatsByWhitelist(metrics) : metrics;
            const stats = {
                uptime: filtered.stats.uptime,
                totalMessages: filtered.stats.totalMessages,
                namespaces: filtered.stats.namespaces,
                activityLog: filtered.stats.activityLog
            };
            ns.sendToClient(conn.clientId, { type: 'stats-update', data: stats }, conn.ctx);

            const interval = setInterval(() => {
                const namespace = this.namespaces.get(path);
                const client = namespace?.clients.get(conn.clientId);
                if (!client || client.ws.readyState !== 1) {
                    clearInterval(interval);
                    return;
                }
                const m = this.getMetrics();
                const filteredPeriodic = client.ctx?.isPublic ? this._filterStatsByWhitelist(m) : m;
                ns.sendToClient(conn.clientId, {
                    type: 'stats-update',
                    data: {
                        uptime: filteredPeriodic.stats.uptime,
                        totalMessages: filteredPeriodic.stats.totalMessages,
                        namespaces: filteredPeriodic.stats.namespaces,
                        activityLog: filteredPeriodic.stats.activityLog
                    }
                }, null);
            }, 5000);

            const namespace = this.namespaces.get(path);
            const client = namespace.clients.get(conn.clientId);
            if (client) {
                client.statsInterval = interval;
            }
        });
        ns.onMessage((conn) => {
            if (conn.message.type === 'admin-connected') {
                LogController.logInfo(conn.ctx, 'websocket._registerAdminStatsNamespace', `Admin monitoring connected: ${conn.message.message}`);
            }
        });
        ns.onDisconnect((conn) => {
            const namespace = this.namespaces.get(path);
            const c = namespace?.clients.get(conn.clientId);
            if (c && c.statsInterval) {
                clearInterval(c.statsInterval);
            }
        });
    }


    /**
     * Register /api/1/ws/jpulse-ws-test namespace for testing
     * @private
     */
    static _registerTestNamespace() {
        const ns = this.createNamespace('/api/1/ws/jpulse-ws-test', { requireAuth: true });
        ns.onConnect((conn) => {
            LogController.logInfo(conn.ctx, 'websocket._registerTestNamespace', `Test client connected: ${conn.clientId}`);
        });
        ns.onMessage((conn) => {
            LogController.logInfo(conn.ctx, 'websocket._registerTestNamespace', `Test message received: ${JSON.stringify(conn.message)}`);
            ns.broadcast({
                type: 'echo',
                data: {
                    originalMessage: conn.message,
                    serverTimestamp: new Date().toISOString(),
                    clientId: conn.clientId
                }
            }, conn.ctx);
        });
        ns.onDisconnect((conn) => {
            LogController.logInfo(conn.ctx, 'websocket._registerTestNamespace', `Test client disconnected: ${conn.clientId}`);
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

        // Keep only configured number of entries
        const maxSize = global.appConfig?.controller?.websocket?.activityLogMaxSize || 100;
        if (this.stats.activityLog.length > maxSize) {
            this.stats.activityLog.shift();
        }
    }


    /**
     * Generate unique client ID (UUID v4)
     * @private
     */
    static _generateClientId() {
        return global.CommonUtils.generateUuid();
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
