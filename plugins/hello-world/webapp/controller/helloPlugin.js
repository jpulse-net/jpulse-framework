/**
 * @name            jPulse Framework / Plugins / Hello World / Controller
 * @tagline         Hello Plugin Controller
 * @description     Simple API controller demonstrating plugin structure
 * @file            plugins/hello-world/webapp/controller/helloPlugin.js
 * @version         1.3.2
 * @author          jPulse Team, https://jpulse.net
 * @license         BSL 1.1
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import HelloPluginModel from '../model/helloPlugin.js';
import PluginModel from '../../../../webapp/model/plugin.js';
import LogController from '../../../../webapp/controller/log.js';

/**
 * Hello Plugin Controller - demonstrates plugin API endpoints
 * Auto-discovered by jPulse Framework
 */
class HelloPluginController {

    /**
     * Get plugin data
     * GET /api/1/helloPlugin
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async api(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'helloPlugin.api', '');

            // Get plugin configuration
            const pluginConfig = await PluginModel.getByName('hello-world');

            const config = pluginConfig?.config || {
                message: 'Hello from the plugin system!',
                enabled: true
            };

            // Get sample data from model
            const data = await HelloPluginModel.getData();

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'helloPlugin.api', `success: completed in ${elapsed}ms`);

            res.json({
                success: true,
                data: {
                    plugin: 'hello-world',
                    version: '1.0.0',
                    config: config,
                    sampleData: data
                },
                message: 'Hello plugin data retrieved successfully',
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'helloPlugin.api', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'Failed to retrieve hello plugin data', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get plugin statistics
     * GET /api/1/helloPlugin/stats
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async apiStats(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'helloPlugin.stats', '');

            const stats = await HelloPluginModel.getStats();

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'helloPlugin.stats', `success: completed in ${elapsed}ms`);

            res.json({
                success: true,
                data: stats,
                message: 'Hello plugin statistics retrieved successfully',
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'helloPlugin.stats', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'Failed to retrieve hello plugin statistics', 'INTERNAL_ERROR', error.message);
        }
    }
}

export default HelloPluginController;

// EOF plugins/hello-world/webapp/controller/helloPlugin.js
