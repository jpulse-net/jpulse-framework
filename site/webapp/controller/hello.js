/**
 * @name            jPulse Framework / Site / WebApp / Controller / Hello World Override Demo
 * @tagline         Demo Site Controller Override
 * @description     Example of how to override framework controllers
 * @file            site/webapp/controller/hello.js
 * @version         0.5.3
 * @release         2025-09-08
 * @author          Site Developer
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
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
        try {
            LogController.logInfo(req, 'hello.api: Site API override accessed');
            
            res.json({
                message: 'Hello from site override API!',
                site: appConfig.app.name,
                version: appConfig.app.version,
                customFeature: appConfig.app.customFeature || false,
                timestamp: new Date().toISOString(),
                demo: {
                    description: 'This API is served by site/webapp/controller/hello.js',
                    viewDemo: 'Visit /hello/ to see the corresponding view override',
                    pathResolution: 'site/webapp/ → webapp/ (framework fallback)'
                }
            });
            
        } catch (error) {
            LogController.logError(req, `hello.api: error: ${error.message}`);
            CommonUtils.sendError(res, 500, 'API error');
        }
    }
}

export default HelloController;

// EOF site/webapp/controller/hello.js
