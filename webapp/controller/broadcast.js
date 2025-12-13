/**
 * @name            jPulse Framework / WebApp / Controller / Broadcast
 * @tagline         Server-side broadcast API for jPulse.appCluster
 * @description     Provides REST API endpoints for cross-instance broadcasting
 * @file            webapp/controller/broadcast.js
 * @version         1.3.13
 * @release         2025-12-13
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import RedisManager from '../utils/redis-manager.js';
import LogController from './log.js';
// i18n will be available globally after bootstrap

/**
 * Broadcast Controller - handles cross-instance communication via Redis pub/sub
 *
 * Provides the server-side backend for jPulse.appCluster API.
 * Enables site owners to broadcast messages across all instances in a cluster.
 */
class BroadcastController {

    /**
     * Publish message to broadcast channel
     * POST /api/1/broadcast/:channel
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async publish(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'broadcast.publish', '');

        try {
            const { channel } = req.params;
            const { data } = req.body;

            // Validate channel name (must follow the MVC convention)
            if (!channel.match(/^(controller|model|view)(:[\w\-]+){3,}$/)) {
                LogController.logError(req, 'broadcast.publish', 'error: invalid channel name, it must follow the MVC convention: {model|controller|view}:{component}:{domain}:{action}');
                const message = global.i18n.translate(req, 'controller.broadcast.invalidChannelName');
                return global.CommonUtils.sendError(req, res, 400, message, 'INVALID_CHANNEL_NAME');
            }

            // Validate data
            if (!data || typeof data !== 'object') {
                LogController.logError(req, 'broadcast.publish', 'error: request body must contain a data object');
                const message = global.i18n.translate(req, 'controller.broadcast.dataRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'INVALID_DATA');
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
                LogController.logInfo(req, 'broadcast.publish', `Published to ${channel}, completed in ${elapsed}ms`);

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
                LogController.logInfo(req, 'broadcast.publish', `Broadcast skipped (Redis unavailable): ${channel}, completed in ${elapsed}ms`);

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
            LogController.logError(req, 'broadcast.publish', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.broadcast.publishFailed');
            return global.CommonUtils.sendError(req, res, 500, message, 'BROADCAST_ERROR', error.message);
        }
    }

    /**
     * Get broadcast system status and instance information
     * GET /api/1/broadcast/status
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async status(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'broadcast.status', '');

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
            LogController.logInfo(req, 'broadcast.status', `Status retrieved, completed in ${elapsed}ms`);

            const message = global.i18n.translate(req, 'controller.broadcast.statusRetrieved');
            status.message = message;
            status.elapsed = elapsed;
            res.json(status);

        } catch (error) {
            LogController.logError(req, 'broadcast.status', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.broadcast.statusFailed');
            return global.CommonUtils.sendError(req, res, 500, message, 'STATUS_ERROR', error.message);
        }
    }

    /**
     * Initialize broadcast subscriptions (called during app startup)
     * Sets up framework-level broadcast listeners
     */
    static initialize() {
        // W-076: No manual subscriptions needed - callbacks are registered automatically
        // Each controller registers its own callbacks via RedisManager.registerBroadcastCallback()
        LogController.logInfo(null, 'broadcast.initialize', 'Broadcast controller initialized (callback-based system)');
    }

}

export default BroadcastController;

// EOF webapp/controller/broadcast.js
