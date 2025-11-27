/**
 * @name            jPulse Framework / Plugins / Hello World / Controller
 * @tagline         Hello Plugin Controller
 * @description     Simple API controller demonstrating plugin structure
 * @file            plugins/hello-world/webapp/controller/helloPlugin.js
 * @version         1.0.0
 * @author          jPulse Team, https://jpulse.net
 * @license         BSL 1.1
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import HelloPluginModel from '../model/helloPlugin.js';

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
        try {
            // Get plugin configuration
            const PluginModel = (await import('../../../../webapp/model/plugin.js')).default;
            const pluginConfig = await PluginModel.getByName('hello-world');

            const config = pluginConfig?.config || {
                message: 'Hello from the plugin system!',
                enabled: true
            };

            // Get sample data from model
            const data = await HelloPluginModel.getData();

            res.json({
                success: true,
                data: {
                    plugin: 'hello-world',
                    version: '1.0.0',
                    config: config,
                    sampleData: data
                }
            });

        } catch (error) {
            console.error('Hello Plugin API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get plugin statistics
     * GET /api/1/helloPlugin/stats
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async apiStats(req, res) {
        try {
            const stats = await HelloPluginModel.getStats();

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Hello Plugin stats error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

export default HelloPluginController;

// EOF plugins/hello-world/webapp/controller/helloPlugin.js
