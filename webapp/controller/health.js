/**
 * @name            jPulse Framework / WebApp / Controller / Health
 * @tagline         Health Controller for jPulse Framework WebApp
 * @note            ATTENTION: When new sensitive metrics data is added, it needs to be sanitized
 *                  for non-admin users in the _sanitizeMetricsData() method!
 * @description     This is the health controller for the jPulse Framework WebApp
 * @file            webapp/controller/health.js
 * @version         1.3.0
 * @release         2025-11-30
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.0, Claude Sonnet 4.5
 */

import LogController from './log.js';
import WebSocketController from './websocket.js';
import AuthController from './auth.js';
import os from 'os';
import process from 'process';

/**
 * Health Controller - handles /api/1/health/status and /api/1/health/metrics REST API endpoints
 * W-076: Enhanced with Redis-based clustering for multi-instance health aggregation
 */
class HealthController {

    // Instance health data cache
    static instanceHealthCache = new Map();

    // Health broadcasting interval
    static healthBroadcastInterval = null;

    // Health data cache to avoid expensive repeated calls
    static healthDataCache = new Map();
    static lastCacheUpdate = 0;

    // Request/Error metrics tracking (1-minute rolling window)
    static metricsWindow = {
        requests: [],
        errors: [],
        windowMs: 60000  // 1 minute
    };

    // Configuration for health broadcasting
    static get config() {
        const healthConfig = global.appConfig?.controller?.health || {};
        return {
            broadcastInterval: (healthConfig.broadcastInterval || 30) * 1000, // Convert seconds to ms
            cacheInterval: (healthConfig.cacheInterval || 15) * 1000,        // Convert seconds to ms
            instanceTTL: (healthConfig.instanceTTL || 45) * 1000,            // 45s = 1.5x broadcast interval (was 90s)
            enableBroadcasting: global.appConfig?.redis?.enabled !== false,   // Use Redis enabled status
            omitStatusLogs: healthConfig.omitStatusLogs || false,
            // W-087: Component health status providers (instance-specific)
            componentProviders: healthConfig.componentProviders || [
                { name: 'email', provider: 'EmailController', method: 'getHealthStatus' }
            ]
        };
    }

    /**
     * Add component health statuses to instance object
     * @param {object} instance - Instance object to add components to
     * @returns {object} Instance object with component health statuses added
     * @private
     */
    static _addComponentHealthStatuses(instance) {
        const timestamp = new Date().toISOString();
        const componentProviders = this.config.componentProviders || [];

        componentProviders.forEach(component => {
            try {
                const provider = global[component.provider];
                if (provider && typeof provider[component.method] === 'function') {
                    const healthStatus = provider[component.method]();
                    // Normalize null values to empty string/object for easier parsing
                    // Add timestamp from HealthController (not from component)
                    instance[component.name] = {
                        ...healthStatus,
                        message: healthStatus.message ?? '',
                        details: healthStatus.details ?? {},
                        timestamp: timestamp
                    };
                } else {
                    // Provider not available or method doesn't exist
                    instance[component.name] = {
                        status: 'not_configured',
                        configured: false,
                        message: `${component.provider} not initialized`,
                        details: {}, // Empty object instead of null for easier parsing
                        timestamp: timestamp
                    };
                }
            } catch (error) {
                LogController.logError(null, 'health._addComponentHealthStatuses',
                    `error: Failed to get health status for ${component.name}: ${error.message}`);
                instance[component.name] = {
                    status: 'error',
                    configured: false,
                    message: `Error getting ${component.name} health status: ${error.message}`,
                    details: {}, // Empty object instead of null for easier parsing
                    timestamp: timestamp
                };
            }
        });

        return instance;
    }

    /**
     * Track an HTTP request for metrics
     */
    static trackRequest() {
        const now = Date.now();
        this.metricsWindow.requests.push(now);
        this._cleanupMetricsWindow();
    }

    /**
     * Track an HTTP error for metrics
     */
    static trackError() {
        const now = Date.now();
        this.metricsWindow.errors.push(now);
        this._cleanupMetricsWindow();
    }

    /**
     * Clean up old entries outside the metrics window
     * @private
     */
    static _cleanupMetricsWindow() {
        const cutoff = Date.now() - this.metricsWindow.windowMs;
        this.metricsWindow.requests = this.metricsWindow.requests.filter(t => t > cutoff);
        this.metricsWindow.errors = this.metricsWindow.errors.filter(t => t > cutoff);
    }

    /**
     * Get current metrics for this instance
     * @returns {Object} Request and error counts
     * @private
     */
    static _getMetrics() {
        this._cleanupMetricsWindow();
        return {
            requestsPerMin: this.metricsWindow.requests.length,
            errorsPerMin: this.metricsWindow.errors.length,
            errorRate: this.metricsWindow.requests.length > 0
                ? (this.metricsWindow.errors.length / this.metricsWindow.requests.length * 100).toFixed(2)
                : '0.00'
        };
    }

    /**
     * Initialize health metrics clustering
     * Called during application bootstrap
     */
    static async initialize() {
        if (!this.config.enableBroadcasting || !global.RedisManager?.isRedisAvailable()) {
            return;
        }

        // W-077: Use registerBroadcastCallback for consistent, centralized handling
        // omitSelf: true - Skip processing our own broadcasts to avoid duplicate instance entries
        // (one from local _buildServersArray() + one from Redis would = duplicate)
        global.RedisManager.registerBroadcastCallback('controller:health:metrics:*', (channel, data, sourceInstanceId) => {
            // Check if this is a shutdown broadcast
            if (channel.includes(':shutdown:')) {
                const instanceId = channel.replace('controller:health:metrics:shutdown:', '');
                this._removeInstanceHealth(instanceId);
                LogController.logInfo(null, 'health.initialize', `Instance ${instanceId} shutdown - removed from cache`);
                return;
            }

            // Extract instance ID from channel (controller:health:metrics:instanceId)
            const instanceId = channel.replace('controller:health:metrics:', '');
            if (instanceId && data) {
                // Store the received health data from other instances
                this._storeInstanceHealth(instanceId, data, sourceInstanceId);
            }
        }, { omitSelf: true });

        // Start broadcasting this instance's health
        this._startHealthBroadcasting();
    }

    /**
     * Shutdown health metrics clustering
     * Called during graceful shutdown
     */
    static shutdown() {
        if (this.healthBroadcastInterval) {
            clearInterval(this.healthBroadcastInterval);
            this.healthBroadcastInterval = null;
            LogController.logInfo(null, 'health.shutdown', 'Health broadcasting stopped');
        }

        // Broadcast removal to other instances via Redis
        if (global.RedisManager?.isRedisAvailable()) {
            const channel = `controller:health:metrics:shutdown:${global.appConfig.system.instanceId}`;

            global.RedisManager.publishBroadcast(channel, {
                action: 'shutdown',
                instanceId: global.appConfig.system.instanceId,
                timestamp: new Date().toISOString()
            });

            LogController.logInfo(null, 'health.shutdown', `Broadcasted shutdown for instance ${global.appConfig.system.instanceId}`);
        }

        // Clear health data cache to prevent memory leaks
        this.healthDataCache.clear();
        this.lastCacheUpdate = 0;
        LogController.logInfo(null, 'health.shutdown', 'Health data cache cleared');
    }

    /**
     * Health check endpoint
     * GET /api/1/health/status
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async status(req, res) {
        const startTime = Date.now();

        // Check if health logging is enabled
        const omitStatusLogs = HealthController.config.omitStatusLogs;
        if (!omitStatusLogs) {
            LogController.logRequest(req, 'health.health', '');
        }

        try {

            const requiredRoles = global.appConfig.controller?.health?.requiredRoles?.status || [ '_public', 'user' ];
            const isAuthorized = AuthController.isAuthorized(req, requiredRoles);

            let response;
            if(isAuthorized) {
                response = {
                    success: true,
                    message: 'jPulse Framework health status',
                    data: {
                        version: global.appConfig.app.jPulse.version,
                        release: global.appConfig.app.jPulse.release,
                        uptime: Math.floor(process.uptime()),
                        environment: global.appConfig.deployment.mode,
                        database: 'connected', // TODO: Add actual database health check
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                response = {
                    success: false,
                    message: 'Not authorized to see jPulse Framework health status'
                };
            }
            res.json(response);

            if (!omitStatusLogs) {
                const duration = Date.now() - startTime;
                LogController.logInfo(req, 'health.health', `success: completed in ${duration}ms`);
            }

        } catch (error) {
            if (omitStatusLogs) {
                // Catch up with log request before error log
                LogController.logRequest(req, 'health.health', '');
            }
            LogController.logError(req, 'health.health', `error: ${error.message}`);
            res.status(500).json({
                success: false,
                status: 'error',
                error: 'Health check failed',
                code: 'HEALTH_CHECK_ERROR'
            });
        }
    }

    /**
     * Metrics endpoint with role-based access
     * GET /api/1/health/metrics
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async metrics(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'health.metrics', '');

        try {
            // Aggressively clean up stale cache entries on every metrics request
            HealthController._cleanupExpiredHealthData();

            const requiredRoles = global.appConfig.controller?.health?.requiredRoles?.metrics || [ 'admin', 'root' ];
            const isAuthorized = AuthController.isAuthorized(req, requiredRoles);

            // Base metrics available to all users (framework level only)
            const baseMetrics = {
                success: true,
                message: 'jPulse Framework metrics data',
                data: {
                    timestamp: new Date().toISOString()
                }
            };

            // Additional metrics for admin users
            if (isAuthorized) {
                const wsStats = WebSocketController.getStats();
                const systemInfo = {
                    platform: os.platform(),
                    arch: os.arch(),
                    nodeVersion: process.version,
                    cpus: os.cpus().length,
                    hostname: os.hostname(),
                    loadAverage: os.loadavg(),
                    freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
                    totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
                    uptime: Math.floor(os.uptime()),
                    uptimeFormatted: HealthController._formatUptime(os.uptime())
                };

                // Get PM2 status
                const pm2Status = await HealthController._getPM2Status();

                // W-076: Build cluster-wide statistics with Redis aggregation
                const statistics = await HealthController._buildClusterStatistics(pm2Status, wsStats, baseMetrics.data.timestamp);
                baseMetrics.data.statistics = statistics;

                // W-076: Build servers array with cross-instance data
                const servers = await HealthController._buildClusterServersArray(systemInfo, wsStats, pm2Status, baseMetrics.data.timestamp);
                baseMetrics.data.servers = servers;

            } else {
                baseMetrics.success = false;
                baseMetrics.message = 'Not authorized to see more jPulse Framework metrics data';
            }

            const isAdmin = AuthController.isAuthorized(req, [ 'admin', 'root' ]);
            if(!isAdmin) {
                // Obfuscate sensitive metrics data for non-admin users
                // ATTENTION: When new sensitive metrics data is added, it needs to be sanitized as well
                HealthController._sanitizeMetricsData(baseMetrics.data);
            }

            res.json(baseMetrics);

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'health.metrics',
                `success: completed in ${duration}ms (isAuthorized: ${isAuthorized})`);

        } catch (error) {
            LogController.logError(req, 'health.metrics', `error: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Metrics collection failed',
                code: 'METRICS_ERROR'
            });
        }
    }
    /**
     * Build cluster-wide statistics (legacy method for single-instance fallback)
     * ATTENTION: When new sensitive metrics data is added, it needs to be sanitized as well
     * @param {Object} metricsData - Metrics data to sanitize
     * @param {Object} wsStats - WebSocket statistics
     * @param {string} timestamp - Current timestamp
     * @returns {Object} Statistics object
     * @private
     */
    static _sanitizeMetricsData(metricsData) {
        if(Array.isArray(metricsData.servers)) {
            metricsData.servers.forEach(server => {
                server.serverName = '********';
                server.serverId = '999';
                server.hostname = '********';
                server.ip = '192.99.99.99';
                Object.keys(server.database.connections).forEach(key => {
                    server.database.connections[key] = 99999;
                });
                server.database.hostname = '********';
                server.database.database = '********';
                server.database.dataSize = 99999;
                server.database.storageSize = 99999;
                server.instances.forEach(instance => {
                    instance.pid = 99999;
                    instance.port = 9999;
                    instance.instanceName = '********:' + instance.pm2Id + ':99999';
                    instance.instanceId = '999:' + instance.pm2Id + ':99999';
                    instance.database.name = '********';
                    instance.processInfo.ppid = 99999;
                    Object.keys(instance.processInfo.memoryUsage).forEach(key => {
                        instance.processInfo.memoryUsage[key] = 99999;
                    });
                    Object.keys(instance.processInfo.resourceUsage).forEach(key => {
                        instance.processInfo.resourceUsage[key] = 99999;
                    });
                    // Sanitize component health statuses (W-087)
                    // Email component: obfuscate adminEmail
                    if (instance.email && instance.email.details && instance.email.details.adminEmail) {
                        instance.email.details.adminEmail = '********@********';
                    }
                    // Note: handlebars and view components don't contain sensitive data
                });
            });
        }
    }

    /**
     * W-076: Build cluster-wide statistics with Redis aggregation
     * @param {Object|null} pm2Status - PM2 status data
     * @param {Object} wsStats - WebSocket statistics
     * @param {string} timestamp - Current timestamp
     * @returns {Promise<Object>} Cluster statistics object
     * @private
     */
    static async _buildClusterStatistics(pm2Status, wsStats, timestamp) {
        const appConfig = global.appConfig;

        // If Redis not enabled, fall back to single-instance stats
        if (!appConfig.redis?.enabled) {
            return this._buildStatistics(pm2Status, wsStats, timestamp);
        }

        try {
            // Clean up expired cache entries before aggregating
            this._cleanupExpiredHealthData();

            // Get all instance health data from cache
            const allInstances = this._getAllInstancesHealth();

            // Aggregate statistics across all instances
            let totalServers = new Set();
            let totalInstances = 0;
            let totalProcesses = 0;
            let runningProcesses = 0;
            let stoppedProcesses = 0;
            let erroredProcesses = 0;
            let totalWebSocketConnections = 0;
            let totalWebSocketMessages = 0;
            let totalWebSocketNamespaces = 0;
            let webSocketNamespaces = new Map();

            // Include current instance using appConfig.system.instanceId for deduplication
            const currentInstanceData = await this._getCurrentInstanceHealthData(pm2Status, wsStats);
            allInstances.set(global.appConfig.system.instanceId, currentInstanceData);

            // Aggregate data from all instances
            allInstances.forEach((instanceData, instanceId) => {
                totalServers.add(instanceData.hostname);
                totalInstances += instanceData.totalInstances;
                totalProcesses += instanceData.totalProcesses;
                runningProcesses += instanceData.runningProcesses;
                stoppedProcesses += instanceData.stoppedProcesses;
                erroredProcesses += instanceData.erroredProcesses;
                totalWebSocketConnections += instanceData.totalWebSocketConnections;
                totalWebSocketMessages += instanceData.totalWebSocketMessages;

                // Aggregate WebSocket namespaces
                instanceData.webSocketNamespaces.forEach(ns => {
                    if (!webSocketNamespaces.has(ns.path)) {
                        webSocketNamespaces.set(ns.path, {
                            path: ns.path,
                            totalConnections: 0,
                            totalMessages: 0,
                            instanceCount: 0,
                            serverCount: new Set(),
                            status: 'green',
                            lastActivity: ns.lastActivity
                        });
                    }

                    const aggregatedNs = webSocketNamespaces.get(ns.path);
                    aggregatedNs.totalConnections += ns.totalConnections;
                    aggregatedNs.totalMessages += ns.totalMessages;
                    aggregatedNs.instanceCount += 1;
                    aggregatedNs.serverCount.add(instanceData.hostname);

                    // Use most recent activity and worst status
                    if (new Date(ns.lastActivity) > new Date(aggregatedNs.lastActivity)) {
                        aggregatedNs.lastActivity = ns.lastActivity;
                    }
                    if (ns.status === 'red' || (ns.status === 'yellow' && aggregatedNs.status === 'green')) {
                        aggregatedNs.status = ns.status;
                    }
                });
            });

            // Convert namespace map to array and finalize server counts
            const webSocketNamespacesArray = Array.from(webSocketNamespaces.values()).map(ns => ({
                ...ns,
                serverCount: ns.serverCount.size
            }));

            totalWebSocketNamespaces = webSocketNamespacesArray.length;

            return {
                totalServers: totalServers.size,
                totalInstances,
                totalProcesses,
                runningProcesses,
                stoppedProcesses,
                erroredProcesses,
                totalWebSocketConnections,
                totalWebSocketMessages,
                totalWebSocketNamespaces,
                webSocketNamespaces: webSocketNamespacesArray,
                lastUpdated: timestamp
            };

        } catch (error) {
            LogController.logError(null, 'health._buildClusterStatistics', `error: ${error.message} - falling back to single-instance`);
            return this._buildStatistics(pm2Status, wsStats, timestamp);
        }
    }

    /**
     * W-076: Build servers array with cross-instance data
     * @param {Object} systemInfo - System information
     * @param {Object} wsStats - WebSocket statistics
     * @param {Object|null} pm2Status - PM2 status data
     * @param {string} timestamp - Current timestamp
     * @returns {Promise<Array>} Servers array with cluster data
     * @private
     */
    static async _buildClusterServersArray(systemInfo, wsStats, pm2Status, timestamp) {
        const appConfig = global.appConfig;

        // If Redis not enabled, fall back to single-server array
        if (!appConfig.redis?.enabled) {
            return await this._buildServersArray(systemInfo, wsStats, pm2Status, timestamp);
        }

        try {
            // Clean up expired cache entries before aggregating
            this._cleanupExpiredHealthData();

            // Get all instance health data from cache
            const allInstances = this._getAllInstancesHealth();

            // Include current instance using appConfig.system.instanceId for deduplication
            const currentInstanceData = await this._getCurrentInstanceHealthData(pm2Status, wsStats);
            allInstances.set(global.appConfig.system.instanceId, currentInstanceData);

            // Group instances by server (hostname)
            const serverMap = new Map();

            allInstances.forEach((instanceData) => {
                const hostname = instanceData.hostname;

                if (!serverMap.has(hostname)) {
                    serverMap.set(hostname, {
                        serverName: hostname,
                        serverId: this._extractServerIdFromHostname(hostname),
                        hostname: instanceData.hostname || hostname,
                        platform: instanceData.platform,
                        arch: instanceData.arch,
                        nodeVersion: instanceData.nodeVersion,
                        cpus: instanceData.cpus,
                        loadAverage: instanceData.loadAverage,
                        freeMemory: instanceData.freeMemory,
                        totalMemory: instanceData.totalMemory,
                        database: instanceData.database,
                        instances: []
                    });
                }

                // Add instance to server
                const server = serverMap.get(hostname);
                server.instances.push(...instanceData.instances);
            });

            // Add server uptime to each server
            serverMap.forEach(server => {
                server.uptime = os.uptime();
                server.uptimeFormatted = this._formatUptime(os.uptime());
                server.ip = this._getPrimaryIpAddress();
            });

            return Array.from(serverMap.values());

        } catch (error) {
            LogController.logError(null, 'health._buildClusterServersArray', `error: ${error.message} - falling back to single-server`);
            return await this._buildServersArray(systemInfo, wsStats, pm2Status, timestamp);
        }
    }

    /**
     * Build cluster-wide statistics (legacy method for single-instance fallback)
     * @param {Object|null} pm2Status - PM2 status data
     * @param {Object} wsStats - WebSocket statistics
     * @param {string} timestamp - Current timestamp
     * @returns {Object} Statistics object
     * @private
     */
    static _buildStatistics(pm2Status, wsStats, timestamp) {
        // For single server deployment, aggregate local data
        const totalWebSocketConnections = wsStats.namespaces.reduce((total, ns) => total + ns.clientCount, 0);

        // Build WebSocket namespace statistics
        const webSocketNamespaces = wsStats.namespaces.map(ns => ({
            path: ns.path,
            totalConnections: ns.clientCount,
            totalMessages: ns.totalMessages,
            instanceCount: 1, // Single instance for now
            serverCount: 1,   // Single server for now
            status: ns.status,
            lastActivity: ns.lastActivity
        }));

        return {
            totalServers: 1,
            totalInstances: pm2Status ? pm2Status.totalProcesses : 1,
            totalProcesses: pm2Status ? pm2Status.totalProcesses : 1,
            runningProcesses: pm2Status ? pm2Status.running : 1,
            stoppedProcesses: pm2Status ? pm2Status.stopped : 0,
            erroredProcesses: pm2Status ? pm2Status.errored : 0,
            totalWebSocketConnections: totalWebSocketConnections,
            totalWebSocketMessages: wsStats.totalMessages,
            totalWebSocketNamespaces: wsStats.namespaces.length,
            webSocketNamespaces: webSocketNamespaces,
            lastUpdated: timestamp
        };
    }

    /**
     * Build servers array
     * @param {Object} systemInfo - System information
     * @param {Object} wsStats - WebSocket statistics
     * @param {Object|null} pm2Status - PM2 status data
     * @param {string} timestamp - Current timestamp
     * @returns {Array} Servers array
     * @private
     */
    static async _buildServersArray(systemInfo, wsStats, pm2Status, timestamp) {
        // Clean up stale cache entries before building response
        HealthController._cleanupExpiredHealthData();

        const hostname = systemInfo.hostname;
        const serverId = HealthController._extractServerIdFromHostname(hostname);

        // Build instances array
        const instances = [];

        if (pm2Status && pm2Status.processes) {
            // Multiple PM2 instances
            pm2Status.processes.forEach(p => {
                const memUsage = process.memoryUsage();

                instances.push({
                    pid: p.pid,
                    pm2Id: p.instanceId,
                    port: global.appConfig.system.port,
                    instanceName: global.appConfig.system.instanceName,
                    instanceId: global.appConfig.system.instanceId,
                    pm2Available: true,
                    pm2ProcessName: p.name,
                    status: p.status,

                    // Instance-specific data (moved from top-level and server-level)
                    jPulse: {
                        version: global.appConfig.app.jPulse.version,
                        release: global.appConfig.app.jPulse.release,
                    },
                    site: {
                        version: global.appConfig.app.site.version,
                        release: global.appConfig.app.site.release,
                    },
                    environment: global.appConfig.deployment.mode,
                    database: {
                        status: global.Database?.getDb() ? 'connected' : 'disconnected',
                        name: global.appConfig.deployment[global.appConfig.deployment.mode].db
                    },
                    deployment: {
                        mode: global.appConfig.deployment.mode,
                        config: global.appConfig.deployment[global.appConfig.deployment.mode]
                    },
                    uptime: p.uptime,
                    uptimeFormatted: p.uptimeFormatted,
                    memory: {
                        used: p.memory,
                        total: Math.round(memUsage.heapTotal / 1024 / 1024) // MB
                    },
                    cpu: p.cpu,
                    restarts: p.restarts,
                    websockets: {
                        uptime: wsStats.uptime,
                        localConnections: Math.floor(wsStats.namespaces.reduce((total, ns) => total + ns.clientCount, 0) / pm2Status.processes.length),
                        localMessages: Math.floor(wsStats.totalMessages / pm2Status.processes.length),
                        namespaces: wsStats.namespaces.map(ns => ({
                            path: ns.path,
                            clientCount: Math.floor(ns.clientCount / pm2Status.processes.length),
                            localMessages: Math.floor(ns.totalMessages / pm2Status.processes.length),
                            messagesPerMin: ns.messagesPerMin,
                            lastActivity: ns.lastActivity
                        }))
                    },
                    processInfo: {
                        ppid: process.ppid,
                        memoryUsage: memUsage,
                        resourceUsage: process.resourceUsage ? process.resourceUsage() : null
                    }
                });

                // W-087: Add component health statuses (instance-specific)
                this._addComponentHealthStatuses(instances[instances.length - 1]);
            });
        } else {
            // Single instance (no PM2 or PM2 not available)
            const uptime = Math.floor(process.uptime());
            const memUsage = process.memoryUsage();

            instances.push({
                pid: process.pid,
                pm2Id: global.appConfig.system.pm2Id,
                port: global.appConfig.system.port,
                instanceName: global.appConfig.system.instanceName,
                instanceId: global.appConfig.system.instanceId,
                pm2Available: false,
                reason: pm2Status === null ? "PM2 not installed or not in PATH" : null,

                // Instance-specific data (moved from top-level and server-level)
                jPulse: {
                    version: global.appConfig.app.jPulse.version,
                    release: global.appConfig.app.jPulse.release,
                },
                site: {
                    version: global.appConfig.app.site.version,
                    release: global.appConfig.app.site.release,
                },
                environment: global.appConfig.deployment.mode,
                database: {
                    status: global.Database?.getDb() ? 'connected' : 'disconnected',
                    name: global.appConfig.deployment[global.appConfig.deployment.mode].db
                },
                deployment: {
                    mode: global.appConfig.deployment.mode,
                    config: global.appConfig.deployment[global.appConfig.deployment.mode]
                },

                uptime: uptime,
                uptimeFormatted: HealthController._formatUptime(uptime),
                memory: {
                    used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                    total: Math.round(memUsage.heapTotal / 1024 / 1024) // MB
                },
                websockets: {
                    uptime: wsStats.uptime,
                    localConnections: wsStats.namespaces.reduce((total, ns) => total + ns.clientCount, 0),
                    localMessages: wsStats.totalMessages,
                    namespaces: wsStats.namespaces.map(ns => ({
                        path: ns.path,
                        clientCount: ns.clientCount,
                        localMessages: ns.totalMessages,
                        messagesPerMin: ns.messagesPerMin,
                        lastActivity: ns.lastActivity
                    }))
                },
                processInfo: {
                    ppid: process.ppid,
                    memoryUsage: memUsage,
                    resourceUsage: process.resourceUsage ? process.resourceUsage() : null
                }
            });

            // W-087: Add component health statuses (instance-specific)
            this._addComponentHealthStatuses(instances[instances.length - 1]);
        }

        return [{
            serverName: hostname,
            serverId: serverId,
            hostname: global.appConfig.system.hostname,
            ip: this._getPrimaryIpAddress(),
            uptime: os.uptime(),
            uptimeFormatted: this._formatUptime(os.uptime()),

            // Server-level (hardware/OS only)
            platform: systemInfo.platform,
            arch: systemInfo.arch,
            nodeVersion: systemInfo.nodeVersion,
            cpus: systemInfo.cpus,
            loadAverage: systemInfo.loadAverage,
            freeMemory: systemInfo.freeMemory,
            totalMemory: systemInfo.totalMemory,

            // MongoDB server status (separate from app database config)
            database: await HealthController._getMongoDBStatus(),

            instances: instances
        }];
    }

    /**
     * Extract server ID from hostname
     * @param {string} hostname - Server hostname
     * @returns {number} Server ID extracted from hostname
     * @private
     */
    static _extractServerIdFromHostname(hostname) {
        // Extract number from hostname like 'web01' -> 1, 'app-server-3' -> 3
        const match = hostname.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 1;
    }

    /**
     * Format uptime in human-readable format
     * @param {number} seconds - Uptime in seconds
     * @returns {string} Formatted uptime string
     * @private
     */
    static _formatUptime(seconds) {
        const years = Math.floor(seconds / 31536000);
        const months = Math.floor((seconds % 31536000) / 2592000);
        const days = Math.floor((seconds % 2592000) / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (years > 0) {
            return `${years}y ${months}mo`;
        } else if (months > 0) {
            return `${months}mo ${days}d`;
        } else if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Get MongoDB server status
     * @returns {Object|null} MongoDB server status or null if not available
     * @private
     */
    static async _getMongoDBStatus() {
        const db = global.Database?.getDb();
        const deploymentMode = global.appConfig.deployment.mode;
        const dbName = global.appConfig.deployment[deploymentMode].db || 'unknown';
        let hostname = global.appConfig.database.standalone?.url || '';
        if(global.appConfig.database.mode === 'replicaSet') {
            // extract first replica set host
            hostname = global.appConfig.database.replicaSet?.servers?.[0] || '';
        }
        hostname = hostname.replace(/(?:mongodb:\/\/)?([^:\.\/]*).*/, '$1') || 'unknown';

        const mongoStatus = {
            type: 'MongoDB',
            status: 'connected',
            version: 'unknown',
            connections: { current: 0, available: 0 },
            uptime: 0,
            hostname: hostname,
            database: dbName,
            collections: 0,
            dataSize: 0,
            storageSize: 0
        };

        // Check if database is available
        if (!db) {
            // This instance is disconnected
            mongoStatus.status = 'disconnected';
            mongoStatus.error = 'Database connection not available';

            // Check if ANY other instance has a connection via Redis
            if (global.RedisManager?.isRedisAvailable()) {
                try {
                    // Look for any recent successful status from other instances
                    const client = RedisManager.getClient('metrics');
                    if (client) {
                        const lastGoodStatus = await client.get('health:database:lastGoodStatus');
                        if (lastGoodStatus) {
                            const parsed = JSON.parse(lastGoodStatus);
                            // If status is recent (< 60 seconds), use it
                            if (Date.now() - parsed.timestamp < 60000) {
                                return parsed.status;  // Use good status from another instance
                            }
                        }
                    }
                } catch (err) {
                    // Fall through to return disconnected status
                }
            }

            return mongoStatus;  // This instance disconnected, no other good status found
        }

        try {
            // This instance IS connected - get fresh status
            const dbStats = db.stats ? await db.stats() : {};

            // Try to get server status from admin (requires clusterMonitor role or higher)
            let serverStatus = {};
            try {
                const adminDb = db.admin();
                serverStatus = adminDb.serverStatus ? await adminDb.serverStatus() : {};
            } catch (adminError) {
                // Admin permissions not available (missing clusterMonitor role)
                // This is fine - we'll use basic db.stats() only
                // To fix: grant clusterMonitor role to the MongoDB admin user
                if (adminError.message.includes('not authorized')) {
                    LogController.logInfo(null, 'health._getMongoDBStatus',
                        'MongoDB admin user lacks clusterMonitor role - using basic stats only');
                } else {
                    LogController.logError(null, 'health._getMongoDBStatus',
                        `Admin status query failed: ${adminError.message}`);
                }
            }

            mongoStatus.version = serverStatus.version || 'unknown';
            mongoStatus.connections = {
                current:   serverStatus.connections?.current || 0,
                available: serverStatus.connections?.available || 0
            };
            mongoStatus.uptime = serverStatus.uptime || 0;
            mongoStatus.collections = dbStats.collections || 0;
            mongoStatus.dataSize = dbStats.dataSize || 0;
            mongoStatus.storageSize = dbStats.storageSize || 0;

            // Cache this good status in Redis for other instances
            if (global.RedisManager?.isRedisAvailable()) {
                try {
                    const client = global.RedisManager.getClient('metrics');
                    if (client) {
                        await client.setex(
                            'health:database:lastGoodStatus',
                            60,
                            JSON.stringify({
                                status: mongoStatus,
                                timestamp: Date.now()
                            })
                        );
                    }
                } catch (err) {
                    LogController.logError(null, 'health._getMongoDBStatus', `Redis cache write failed: ${err.message}`);
                    // Ignore cache errors
                }
            }

            return mongoStatus;

        } catch (error) {
            mongoStatus.status = 'error';
            mongoStatus.error = error.message;
            return mongoStatus;
        }
    }

    /**
     * W-076: Start periodic health broadcasting to Redis with caching optimization
     * @private
     */
    static async _startHealthBroadcasting() {
        if (!HealthController.config.enableBroadcasting) return;

        const broadcastHealth = async () => {
            try {
                // Get optimized health data (with caching)
                const healthData = await this._getOptimizedHealthData();

                // Broadcast to other instances
                // Use appConfig.system.instanceId (serverId:pm2Id:pid) for stable instance identification
                const channel = `controller:health:metrics:${global.appConfig.system.instanceId}`;

                global.RedisManager.publishBroadcast(channel, healthData);

            } catch (error) {
                LogController.logError(null, 'health._startHealthBroadcasting', `error: ${error.message}`);
            }
        };

        // Broadcast immediately and then on interval
        broadcastHealth();
        this.healthBroadcastInterval = setInterval(broadcastHealth, HealthController.config.broadcastInterval);

        LogController.logInfo(null, 'health._startHealthBroadcasting', `Started health broadcasting every ${HealthController.config.broadcastInterval}s (with ${HealthController.config.cacheInterval}s caching)`);
    }

    /**
     * Get health data with caching optimization
     * Checks local cache first, then Redis cache, only fetches expensive data if both are stale
     * @returns {Promise<Object>} Health data
     * @private
     */
    static async _getOptimizedHealthData() {
        const now = Date.now();
        const cacheKey = 'health_data';

        // Check if we have recent cached data locally
        const cachedData = this.healthDataCache.get(cacheKey);
        if (cachedData && (now - this.lastCacheUpdate) < HealthController.config.cacheInterval) {
            return cachedData;
        }

        // Check if Redis has recent data from any instance (cross-instance caching)
        if (global.RedisManager?.isRedisAvailable()) {
            try {
                const redisCacheKey = `health:cache:${global.appConfig.system.instanceId}`;
                const redisData = await global.RedisManager.getClient('metrics').get(redisCacheKey);

                if (redisData) {
                    const parsedData = JSON.parse(redisData);
                    // Check if Redis data is still fresh
                    if (parsedData.timestamp && (now - parsedData.timestamp) < HealthController.config.cacheInterval) {
                        // Use Redis data and cache locally
                        this.healthDataCache.set(cacheKey, parsedData.data);
                        this.lastCacheUpdate = now;
                        return parsedData.data;
                    }
                }
            } catch (error) {
                // Redis cache miss - continue to fetch fresh data
                LogController.logError(null, 'health._getOptimizedHealthData', `Redis cache check failed: ${error.message}`);
            }
        }

        // Cache miss - fetch fresh data
        const pm2Status = await this._getPM2Status();
        const wsStats = WebSocketController.getStats();
        const healthData = await this._getCurrentInstanceHealthData(pm2Status, wsStats);

        // Cache locally
        this.healthDataCache.set(cacheKey, healthData);
        this.lastCacheUpdate = now;

        // Share with other instances via Redis
        if (global.RedisManager?.isRedisAvailable()) {
            try {
                const redisCacheKey = `health:cache:${global.appConfig.system.instanceId}`;
                const cacheData = {
                    data: healthData,
                    timestamp: now
                };
                await global.RedisManager.getClient('metrics').setex(redisCacheKey, Math.floor(HealthController.config.cacheInterval / 1000), JSON.stringify(cacheData));
            } catch (error) {
                LogController.logError(null, 'health._getOptimizedHealthData', `Redis cache write failed: ${error.message}`);
            }
        }

        return healthData;
    }

    /**
     * W-076: Store health data from another instance
     * @param {string} instanceId - Instance ID
     * @param {Object} healthData - Health data from instance
     * @param {string} sourceInstanceId - Source instance ID for verification
     * @private
     */
    static _storeInstanceHealth(instanceId, healthData, sourceInstanceId) {
        // Add timestamp for TTL management
        const healthDataWithTimestamp = {
            ...healthData,
            receivedAt: Date.now(),
            sourceInstanceId
        };

        this.instanceHealthCache.set(instanceId, healthDataWithTimestamp);

        // Clean up expired entries
        this._cleanupExpiredHealthData();
    }

    /**
     * W-076: Remove health data for a shutdown instance
     * @param {string} instanceId - Instance ID to remove
     * @private
     */
    static _removeInstanceHealth(instanceId) {
        if (this.instanceHealthCache.has(instanceId)) {
            this.instanceHealthCache.delete(instanceId);
            LogController.logInfo(null, 'health._removeInstanceHealth', `Removed instance ${instanceId} from cache`);
        }
    }

    /**
     * W-076: Get health data from all instances (excluding expired)
     * @returns {Map} Map of instanceId -> healthData
     * @private
     */
    static _getAllInstancesHealth() {
        this._cleanupExpiredHealthData();
        return new Map(this.instanceHealthCache);
    }

    /**
     * W-076: Clean up expired health data entries
     * @private
     */
    static _cleanupExpiredHealthData() {
        const now = Date.now();
        const expiredKeys = [];

        this.instanceHealthCache.forEach((healthData, instanceId) => {
            if (now - healthData.receivedAt > HealthController.config.instanceTTL) {
                expiredKeys.push(instanceId);
            }
        });

        expiredKeys.forEach(key => {
            this.instanceHealthCache.delete(key);
        });
    }

    /**
     * W-076: Get current instance health data in broadcast format
     * @param {Object|null} pm2Status - PM2 status data
     * @param {Object} wsStats - WebSocket statistics
     * @returns {Object} Current instance health data
     * @private
     */
    static async _getCurrentInstanceHealthData(pm2Status, wsStats) {
        const systemInfo = {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            cpus: os.cpus().length,
            hostname: os.hostname(),
            loadAverage: os.loadavg(),
            freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
            totalMemory: Math.round(os.totalmem() / 1024 / 1024) // MB
        };

        const totalWebSocketConnections = wsStats.namespaces.reduce((total, ns) => total + ns.clientCount, 0);

        // Build WebSocket namespace data
        const webSocketNamespaces = wsStats.namespaces.map(ns => ({
            path: ns.path,
            totalConnections: ns.clientCount,
            totalMessages: ns.totalMessages,
            status: ns.status,
            lastActivity: ns.lastActivity
        }));

        // Build instance data for THIS instance only (not all PM2 processes)
        const mongoStatus = await this._getMongoDBStatus();
        const instances = [];
        const memUsage = process.memoryUsage();
        const metrics = this._getMetrics();

        if (pm2Status && pm2Status.processes) {
            // Running under PM2 - find THIS process in the PM2 status
            const thisProcess = pm2Status.processes.find(p => p.pid === process.pid);

            if (thisProcess) {
                const uptime = Math.floor((Date.now() - thisProcess.uptime) / 1000);

                instances.push({
                    pid: thisProcess.pid,
                    pm2Id: global.appConfig.system.pm2Id,
                    port: global.appConfig.system.port,
                    instanceName: global.appConfig.system.instanceName,
                    instanceId: global.appConfig.system.instanceId,
                    pm2Available: true,
                    pm2ProcessName: thisProcess.name,
                    status: thisProcess.status,
                    uptime: thisProcess.uptime,
                    uptimeFormatted: thisProcess.uptimeFormatted,
                    memory: {
                        used: thisProcess.memory,
                        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                        percentage: Math.round((thisProcess.memory / Math.round(memUsage.heapTotal / 1024 / 1024)) * 100)
                    },
                    cpu: thisProcess.cpu,
                    restarts: thisProcess.restarts,
                    // Application-level metadata (instance-specific)
                    jPulse: {
                        version: global.appConfig.app.jPulse.version,
                        release: global.appConfig.app.jPulse.release,
                    },
                    site: {
                        version: global.appConfig.app.site.version,
                        release: global.appConfig.app.site.release,
                    },
                    environment: global.appConfig.deployment.mode,
                    database: {
                        status: global.Database?.getDb() ? 'connected' : 'disconnected',
                        name: global.appConfig.deployment[global.appConfig.deployment.mode].db
                    },
                    // Request/Error metrics (1-minute window)
                    metrics: {
                        requestsPerMin: metrics.requestsPerMin,
                        errorsPerMin: metrics.errorsPerMin,
                        errorRate: metrics.errorRate
                    },
                    websockets: {
                        uptime: wsStats.uptime,
                        localConnections: wsStats.namespaces.reduce((total, ns) => total + ns.clientCount, 0),
                        localMessages: wsStats.totalMessages,
                        namespaces: wsStats.namespaces.map(ns => ({
                            path: ns.path,
                            clientCount: ns.clientCount,
                            localMessages: ns.totalMessages,
                            messagesPerMin: ns.messagesPerMin,
                            lastActivity: ns.lastActivity
                        }))
                    },
                    processInfo: {
                        ppid: process.ppid,
                        memoryUsage: memUsage,
                        resourceUsage: process.resourceUsage ? process.resourceUsage() : null
                    }
                });

                // W-087: Add component health statuses (instance-specific)
                this._addComponentHealthStatuses(instances[instances.length - 1]);
            }
        } else {
            // Single instance (no PM2 or PM2 not available)
            const uptime = Math.floor(process.uptime());

            instances.push({
                pid: process.pid,
                pm2Id: global.appConfig.system.pm2Id,
                port: global.appConfig.system.port,
                instanceName: global.appConfig.system.instanceName,
                instanceId: global.appConfig.system.instanceId,
                pm2Available: false,
                reason: "PM2 not available",
                uptime: uptime,
                uptimeFormatted: this._formatUptime(uptime),
                memory: {
                    used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                    total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
                },
                cpu: null, // CPU percentage not available without PM2
                // Application-level metadata (instance-specific)
                jPulse: {
                    version: global.appConfig.app.jPulse.version,
                    release: global.appConfig.app.jPulse.release,
                },
                site: {
                    version: global.appConfig.app.site.version,
                    release: global.appConfig.app.site.release,
                },
                environment: global.appConfig.deployment.mode,
                database: {
                    status: global.Database?.getDb() ? 'connected' : 'disconnected',
                    name: global.appConfig.deployment[global.appConfig.deployment.mode].db
                },
                // Request/Error metrics (1-minute window)
                metrics: {
                    requestsPerMin: metrics.requestsPerMin,
                    errorsPerMin: metrics.errorsPerMin,
                    errorRate: metrics.errorRate
                },
                websockets: {
                    uptime: wsStats.uptime,
                    localConnections: wsStats.namespaces.reduce((total, ns) => total + ns.clientCount, 0),
                    localMessages: wsStats.totalMessages,
                    namespaces: wsStats.namespaces.map(ns => ({
                        path: ns.path,
                        clientCount: ns.clientCount,
                        localMessages: ns.totalMessages,
                        messagesPerMin: ns.messagesPerMin,
                        lastActivity: ns.lastActivity
                    }))
                },
                processInfo: {
                    ppid: process.ppid,
                    memoryUsage: memUsage,
                    resourceUsage: process.resourceUsage ? process.resourceUsage() : null
                }
            });

            // W-087: Add component health statuses (instance-specific)
            this._addComponentHealthStatuses(instances[instances.length - 1]);
        }

        // Return data for THIS instance only - aggregation happens at the receiver
        return {
            hostname: systemInfo.hostname,
            platform: systemInfo.platform,
            arch: systemInfo.arch,
            nodeVersion: systemInfo.nodeVersion,
            cpus: systemInfo.cpus,
            loadAverage: systemInfo.loadAverage,
            freeMemory: systemInfo.freeMemory,
            totalMemory: systemInfo.totalMemory,
            database: mongoStatus,
            totalInstances: 1,  // Just this instance
            totalProcesses: 1,  // Just this instance
            runningProcesses: instances.length > 0 && instances[0].status === 'online' ? 1 : 0,
            stoppedProcesses: instances.length > 0 && instances[0].status === 'stopped' ? 1 : 0,
            erroredProcesses: instances.length > 0 && instances[0].status === 'errored' ? 1 : 0,
            totalWebSocketConnections,
            totalWebSocketMessages: wsStats.totalMessages,
            webSocketNamespaces,
            instances: instances,  // Array with single instance
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get primary IP address of the server
     * @returns {string} Primary IP address
     * @private
     */
    static _getPrimaryIpAddress() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if ('IPv4' === iface.family && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }

    /**
     * Get PM2 process information
     * @returns {Promise<Object|null>} PM2 status or null if not available
     * @private
     */
    static async _getPM2Status() {
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);

            const { stdout } = await execAsync('pm2 jlist', { timeout: 2000 });
            const processes = JSON.parse(stdout);

            // Find jPulse processes (name contains 'jpulse')
            const jpulseProcesses = processes.filter(p =>
                p.name && p.name.toLowerCase().includes('jpulse')
            );

            if (jpulseProcesses.length === 0) return null;

            const now = Date.now(); // milliseconds
            return {
                totalProcesses: jpulseProcesses.length,
                running: jpulseProcesses.filter(p => p.pm2_env.status === 'online').length,
                stopped: jpulseProcesses.filter(p => p.pm2_env.status === 'stopped').length,
                errored: jpulseProcesses.filter(p => p.pm2_env.status === 'errored').length,
                processes: jpulseProcesses.map(p => ({
                    name: p.name,
                    pid: p.pid,
                    instanceId: p.pm2_env.INSTANCE_ID || p.pm2_env.NODE_APP_INSTANCE || 0,
                    status: p.pm2_env.status,
                    uptime: Math.floor((now - p.pm2_env.pm_uptime) / 1000),
                    uptimeFormatted: HealthController._formatUptime(Math.floor((now - p.pm2_env.pm_uptime) / 1000)),
                    memory: p.monit ? Math.round(p.monit.memory / 1024 / 1024) : 0, // MB
                    cpu: p.monit ? p.monit.cpu : 0,
                    restarts: p.pm2_env.restart_time || 0
                }))
            };
        } catch (error) {
            // PM2 not available or error occurred
            return null;
        }
    }
}

export default HealthController;

// EOF webapp/controller/health.js
