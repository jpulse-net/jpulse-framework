/**
 * @name            jPulse Framework / WebApp / Controller / Health
 * @tagline         Health Controller for jPulse Framework WebApp
 * @description     This is the health controller for the jPulse Framework WebApp
 * @file            webapp/controller/health.js
 * @version         0.9.7
 * @release         2025-10-12
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import LogController from './log.js';
import WebSocketController from './websocket.js';
import AuthController from './auth.js';
import os from 'os';
import process from 'process';

/**
 * Health Controller - handles /api/1/health and /api/1/metrics REST API endpoints
 * W-076: Enhanced with Redis-based clustering for multi-instance health aggregation
 */
class HealthController {

    // Instance health data cache
    static instanceHealthCache = new Map();

    // Health broadcasting interval
    static healthBroadcastInterval = null;

    // Configuration for health broadcasting
    static config = {
        broadcastInterval: 30000,  // 30 seconds
        instanceTTL: 90000,        // 90 seconds (3x broadcast interval)
        enableBroadcasting: true
    };

    /**
     * Initialize health metrics clustering
     * Called during application bootstrap
     */
    static async initialize() {
        try {
            const appConfig = global.appConfig;

            // Only initialize Redis health clustering if Redis is enabled
            if (!appConfig.redis?.enabled) {
                LogController.logInfo(null, 'health.initialize', 'Redis health clustering disabled (single-instance mode)');
                return;
            }

            // W-076: Use RedisManager for health metrics broadcasting
            // Register callback for health metrics from other instances
            global.RedisManager.registerBroadcastCallback('controller:health:metrics:*', (channel, data, sourceInstanceId) => {
                // Extract instance ID from channel (controller:health:metrics:instanceId)
                const instanceId = channel.replace('controller:health:metrics:', '');

                // Store health data from other instances
                this._storeInstanceHealth(instanceId, data, sourceInstanceId);
            });

            // Start periodic health broadcasting
            this._startHealthBroadcasting();

            LogController.logInfo(null, 'health.initialize', 'Redis health metrics clustering initialized');

        } catch (error) {
            LogController.logError(null, 'health.initialize', `error: ${error.message} - falling back to single-instance mode`);
        }
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
    }

    /**
     * Health check endpoint
     * GET /api/1/health
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async health(req, res) {
        const startTime = Date.now();

        // Check if health logging is enabled
        const omitHealthLogs = global.appConfig?.controller?.health?.omitHealthLogs || false;
        if (!omitHealthLogs) {
            LogController.logRequest(req, 'health.health', '');
        }

        try {
            const response = {
                success: true,
                status: 'ok',
                data: {
                    version: global.appConfig.app.jPulse.version,
                    release: global.appConfig.app.jPulse.release,
                    uptime: Math.floor(process.uptime()),
                    environment: global.appConfig.deployment.mode,
                    database: 'connected', // TODO: Add actual database health check
                    timestamp: new Date().toISOString()
                }
            };

            res.json(response);

            if (!omitHealthLogs) {
                const duration = Date.now() - startTime;
                LogController.logInfo(req, 'health.health', `success: completed in ${duration}ms`);
            }

        } catch (error) {
            if (omitHealthLogs) {
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
     * GET /api/1/metrics
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async metrics(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'health.metrics', '');

        try {
            const isAdmin = AuthController.isAuthorized(req, ['admin', 'root']);

            // Base metrics available to all users (framework level only)
            const baseMetrics = {
                success: true,
                data: {
                    status: 'ok',
                    timestamp: new Date().toISOString()
                }
            };

            // Additional metrics for admin users
            if (isAdmin) {
                const wsStats = WebSocketController.getStats();
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

                // Get PM2 status
                const pm2Status = await HealthController._getPM2Status();

                // W-076: Build cluster-wide statistics with Redis aggregation
                const statistics = await HealthController._buildClusterStatistics(pm2Status, wsStats, baseMetrics.data.timestamp);
                baseMetrics.data.statistics = statistics;

                // W-076: Build servers array with cross-instance data
                const servers = await HealthController._buildClusterServersArray(systemInfo, wsStats, pm2Status, baseMetrics.data.timestamp);
                baseMetrics.data.servers = servers;
            }

            res.json(baseMetrics);

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'health.metrics',
                `success: completed in ${duration}ms (admin: ${isAdmin})`);

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
     * Admin status page
     * GET /admin/system-status.shtml
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next middleware function
     */
    static async adminStatus(req, res, next) {
        const startTime = Date.now();
        LogController.logRequest(req, 'health.adminStatus', '');

        try {
            // Get comprehensive metrics for admin page
            const uptime = Math.floor(process.uptime());
            const memUsage = process.memoryUsage();
            const wsStats = WebSocketController.getStats();

            const statusData = {
                system: {
                    status: 'ok',
                    version: global.appConfig.app.jPulse.version,
                    release: global.appConfig.app.jPulse.release,
                    uptime: uptime,
                    uptimeFormatted: HealthController._formatUptime(uptime),
                    environment: global.appConfig.deployment.mode,
                    platform: os.platform(),
                    arch: os.arch(),
                    nodeVersion: process.version,
                    hostname: os.hostname(),
                    cpus: os.cpus().length
                },
                memory: {
                    heap: {
                        used: Math.round(memUsage.heapUsed / 1024 / 1024),
                        total: Math.round(memUsage.heapTotal / 1024 / 1024),
                        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
                    },
                    system: {
                        free: Math.round(os.freemem() / 1024 / 1024),
                        total: Math.round(os.totalmem() / 1024 / 1024),
                        percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
                    }
                },
                database: {
                    status: 'connected', // TODO: Add actual database health check
                    name: global.appConfig.deployment[global.appConfig.deployment.mode].db
                },
                websockets: {
                    uptime: wsStats.uptime,
                    totalMessages: wsStats.totalMessages,
                    namespaces: wsStats.namespaces,
                    totalConnections: wsStats.namespaces.reduce((total, ns) => total + ns.clientCount, 0)
                },
                loadAverage: os.loadavg(),
                timestamp: new Date().toISOString()
            };

            // Set template variables for the status page
            req.templateVars = {
                pageTitle: 'System Status',
                statusData: statusData
            };

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'health.adminStatus', `success: completed in ${duration}ms`);

            // Let the view controller handle rendering
            next();

        } catch (error) {
            LogController.logError(req, 'health.adminStatus', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'Status page error', 'STATUS_PAGE_ERROR');
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

            // Include current instance
            const currentInstanceData = this._getCurrentInstanceHealthData(pm2Status, wsStats);
            allInstances.set('current', currentInstanceData);

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
            return this._buildServersArray(systemInfo, wsStats, pm2Status, timestamp);
        }

        try {
            // Get all instance health data from cache
            const allInstances = this._getAllInstancesHealth();

            // Include current instance
            const currentInstanceData = this._getCurrentInstanceHealthData(pm2Status, wsStats);
            allInstances.set('current', currentInstanceData);

            // Group instances by server (hostname)
            const serverMap = new Map();

            allInstances.forEach((instanceData, instanceId) => {
                const hostname = instanceData.hostname;

                if (!serverMap.has(hostname)) {
                    serverMap.set(hostname, {
                        serverName: hostname,
                        serverId: this._extractServerIdFromHostname(hostname),
                        platform: instanceData.platform,
                        arch: instanceData.arch,
                        nodeVersion: instanceData.nodeVersion,
                        cpus: instanceData.cpus,
                        loadAverage: instanceData.loadAverage,
                        freeMemory: instanceData.freeMemory,
                        totalMemory: instanceData.totalMemory,
                        mongodb: instanceData.mongodb,
                        instances: []
                    });
                }

                // Add instance to server
                const server = serverMap.get(hostname);
                server.instances.push(...instanceData.instances);
            });

            return Array.from(serverMap.values());

        } catch (error) {
            LogController.logError(null, 'health._buildClusterServersArray', `error: ${error.message} - falling back to single-server`);
            return this._buildServersArray(systemInfo, wsStats, pm2Status, timestamp);
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
    static _buildServersArray(systemInfo, wsStats, pm2Status, timestamp) {
        const hostname = systemInfo.hostname;
        const serverId = HealthController._extractServerIdFromHostname(hostname);

        // Build instances array
        const instances = [];

        if (pm2Status && pm2Status.processes) {
            // Multiple PM2 instances
            pm2Status.processes.forEach(p => {
                const uptime = Math.floor((Date.now() - p.uptime) / 1000);
                const memUsage = process.memoryUsage();

                instances.push({
                    pid: p.pid,
                    pm2Available: true,
                    pm2ProcessName: p.name,
                    status: p.status,

                    // Instance-specific data (moved from top-level and server-level)
                    version: global.appConfig.app.jPulse.version,
                    release: global.appConfig.app.jPulse.release,
                    environment: global.appConfig.deployment.mode,
                    database: {
                        status: 'connected', // TODO: Add actual database health check
                        name: global.appConfig.deployment[global.appConfig.deployment.mode].db
                    },
                    deployment: {
                        mode: global.appConfig.deployment.mode,
                        config: global.appConfig.deployment[global.appConfig.deployment.mode]
                    },

                    uptime: uptime,
                    uptimeFormatted: HealthController._formatUptime(uptime),
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
            });
        } else {
            // Single instance (no PM2 or PM2 not available)
            const uptime = Math.floor(process.uptime());
            const memUsage = process.memoryUsage();

            instances.push({
                pid: process.pid,
                pm2Available: false,
                reason: pm2Status === null ? "PM2 not installed or not in PATH" : null,

                // Instance-specific data (moved from top-level and server-level)
                version: global.appConfig.app.jPulse.version,
                release: global.appConfig.app.jPulse.release,
                environment: global.appConfig.deployment.mode,
                database: {
                    status: 'connected', // TODO: Add actual database health check
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
        }

        return [{
            serverName: hostname,
            serverId: serverId,

            // Server-level (hardware/OS only)
            platform: systemInfo.platform,
            arch: systemInfo.arch,
            nodeVersion: systemInfo.nodeVersion,
            cpus: systemInfo.cpus,
            loadAverage: systemInfo.loadAverage,
            freeMemory: systemInfo.freeMemory,
            totalMemory: systemInfo.totalMemory,

            // MongoDB server status (separate from app database config)
            mongodb: HealthController._getMongoDBStatus(),

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
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m ${secs}s`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
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
    static _getMongoDBStatus() {
        try {
            // TODO: Implement actual MongoDB server status check
            // This would query MongoDB admin database for server status
            // For now, return basic placeholder structure
            return {
                status: 'unknown', // TODO: Check actual MongoDB server status
                version: 'unknown', // TODO: Get MongoDB version
                connections: {
                    current: 0, // TODO: Get current connections
                    available: 0 // TODO: Get available connections
                },
                uptime: 0, // TODO: Get MongoDB uptime
                host: global.appConfig.deployment[global.appConfig.deployment.mode].db || 'unknown'
            };
        } catch (error) {
            // MongoDB server status not available
            return null;
        }
    }

    /**
     * W-076: Start periodic health broadcasting to Redis
     * @private
     */
    static _startHealthBroadcasting() {
        if (!this.config.enableBroadcasting) return;

        const broadcastHealth = async () => {
            try {
                // Get current instance health data
                const pm2Status = await this._getPM2Status();
                const wsStats = WebSocketController.getStats();
                const healthData = this._getCurrentInstanceHealthData(pm2Status, wsStats);

                // Broadcast to other instances
                const instanceId = global.RedisManager.getInstanceId();
                const channel = `controller:health:metrics:${instanceId}`;

                global.RedisManager.publishBroadcast(channel, healthData);

            } catch (error) {
                LogController.logError(null, 'health._startHealthBroadcasting', `error: ${error.message}`);
            }
        };

        // Broadcast immediately and then on interval
        broadcastHealth();
        this.healthBroadcastInterval = setInterval(broadcastHealth, this.config.broadcastInterval);

        LogController.logInfo(null, 'health._startHealthBroadcasting', `Started health broadcasting every ${this.config.broadcastInterval}ms`);
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
            if (now - healthData.receivedAt > this.config.instanceTTL) {
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
    static _getCurrentInstanceHealthData(pm2Status, wsStats) {
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

        return {
            hostname: systemInfo.hostname,
            platform: systemInfo.platform,
            arch: systemInfo.arch,
            nodeVersion: systemInfo.nodeVersion,
            cpus: systemInfo.cpus,
            loadAverage: systemInfo.loadAverage,
            freeMemory: systemInfo.freeMemory,
            totalMemory: systemInfo.totalMemory,
            mongodb: this._getMongoDBStatus(),
            totalInstances: pm2Status ? pm2Status.totalProcesses : 1,
            totalProcesses: pm2Status ? pm2Status.totalProcesses : 1,
            runningProcesses: pm2Status ? pm2Status.running : 1,
            stoppedProcesses: pm2Status ? pm2Status.stopped : 0,
            erroredProcesses: pm2Status ? pm2Status.errored : 0,
            totalWebSocketConnections,
            totalWebSocketMessages: wsStats.totalMessages,
            webSocketNamespaces,
            instances: this._buildServersArray(systemInfo, wsStats, pm2Status, new Date().toISOString())[0].instances,
            timestamp: new Date().toISOString()
        };
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

            return {
                totalProcesses: jpulseProcesses.length,
                running: jpulseProcesses.filter(p => p.pm2_env.status === 'online').length,
                stopped: jpulseProcesses.filter(p => p.pm2_env.status === 'stopped').length,
                errored: jpulseProcesses.filter(p => p.pm2_env.status === 'errored').length,
                processes: jpulseProcesses.map(p => ({
                    name: p.name,
                    pid: p.pid,
                    status: p.pm2_env.status,
                    uptime: Date.now() - p.pm2_env.created_at,
                    uptimeFormatted: HealthController._formatUptime(Math.floor((Date.now() - p.pm2_env.created_at) / 1000)),
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
