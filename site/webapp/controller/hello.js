/**
 * @name            jPulse Framework / Site / WebApp / Controller / Hello World Override Demo
 * @tagline         Demo Site Controller Override
 * @description     Example of how to override framework controllers
 * @file            site/webapp/controller/hello.js
 * @version         1.1.7
 * @release         2025-11-18
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

/**
 * Demo Hello Controller - Site Override Example
 *
 * This demonstrates how site-specific controllers can provide
 * API endpoints. Views are handled automatically by the framework.
 */
class HelloController {

    /**
     * API endpoint example - accessible via /api/1/hello
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async api(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'hello.api', '');
            res.json({
                success: true,
                message: 'Hello from site override API!',
                site: appConfig.app.site.name,
                version: appConfig.app.jPulse.version,
                customFeature: appConfig.app.customFeature || false,
                timestamp: new Date().toISOString(),
                demo: {
                    description: 'This API is served by site/webapp/controller/hello.js',
                    viewDemo: 'Visit /hello/ to see the corresponding view override',
                    pathResolution: 'site/webapp/ → webapp/ (framework fallback)'
                }
            });
            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'hello.api', `success: completed in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'hello.api', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'API error', 'INTERNAL_ERROR');
        }
    }
}

export default HelloController;

// EOF site/webapp/controller/hello.js
