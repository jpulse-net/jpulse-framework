/**
 * @name            jPulse Framework / WebApp / Controller / Health
 * @tagline         Health Controller for jPulse Framework WebApp
 * @description     This is the health controller for the jPulse Framework WebApp
 * @file            webapp/controller/health.js
 * @version         0.9.6
 * @release         2025-10-10
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
 */
class HealthController {

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
                    version: global.appConfig.app.version,
                    release: global.appConfig.app.release,
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
            const uptime = Math.floor(process.uptime());
            const memUsage = process.memoryUsage();

            // Base metrics available to all users
            const baseMetrics = {
                success: true,
                data: {
                    status: 'ok',
                    version: global.appConfig.app.version,
                    release: global.appConfig.app.release,
                    uptime: uptime,
                    uptimeFormatted: HealthController._formatUptime(uptime),
                    environment: global.appConfig.deployment.mode,
                    database: {
                        status: 'connected', // TODO: Add actual database health check
                        name: global.appConfig.deployment[global.appConfig.deployment.mode].db
                    },
                    memory: {
                        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                        total: Math.round(memUsage.heapTotal / 1024 / 1024) // MB
                    },
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

                baseMetrics.data.system = systemInfo;
                baseMetrics.data.websockets = {
                    uptime: wsStats.uptime,
                    totalMessages: wsStats.totalMessages,
                    namespaces: wsStats.namespaces.length,
                    activeConnections: wsStats.namespaces.reduce((total, ns) => total + ns.clientCount, 0)
                };
                baseMetrics.data.process = {
                    pid: process.pid,
                    ppid: process.ppid,
                    memoryUsage: memUsage,
                    resourceUsage: process.resourceUsage ? process.resourceUsage() : null
                };
                baseMetrics.data.deployment = {
                    mode: global.appConfig.deployment.mode,
                    config: global.appConfig.deployment[global.appConfig.deployment.mode]
                };

                // Add PM2 status (always include for admin, even if null)
                baseMetrics.data.pm2 = await HealthController._getPM2Status();
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
                    version: global.appConfig.app.version,
                    release: global.appConfig.app.release,
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
