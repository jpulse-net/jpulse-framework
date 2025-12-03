/**
 * @name            jPulse Framework / Site / WebApp / Controller / Hello Vue
 * @tagline         Demo Vue.js SPA Controller
 * @description     Example of Vue.js Single Page Application integration
 * @file            site/webapp/controller/helloVue.js
 * @version         1.3.5
 * @release         2025-12-03
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import HelloTodoModel from '../model/helloTodo.js';

// Access global utilities
const LogController = global.LogController;
const CommonUtils = global.CommonUtils;

/**
 * Hello Vue Controller - Vue.js SPA Demo
 *
 * This demonstrates how to create a Vue.js Single Page Application (SPA)
 * with URL routing, reactive components, and API integration.
 *
 * Key Learning Points:
 * - Vue.js SPA architecture with URL routing
 * - Component-based reactive data binding
 * - Integration with jPulse.api.call() utilities
 * - Browser history support (back/forward buttons)
 * - Clean separation of views within single component
 *
 * API Endpoints:
 * - GET /api/1/hello-vue/demo-data - Get demo data for Vue.js examples
 */
class HelloVueController {

    /**
     * API: GET /api/1/hello-vue/demo-data
     * Provide demo data for Vue.js SPA examples
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async api(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'helloVue.api', '');

            // Get some sample todos for demonstration
            const todos = await HelloTodoModel.findAll();

            // Create demo data structure
            const demoData = {
                message: 'Hello from Vue.js SPA!',
                timestamp: new Date().toISOString(),
                todos: todos.slice(0, 5), // Just first 5 for demo
                stats: {
                    totalTodos: todos.length,
                    completedTodos: todos.filter(t => t.completed).length,
                    pendingTodos: todos.filter(t => !t.completed).length
                },
                features: [
                    'URL routing without page reloads',
                    'Reactive data binding',
                    'Component-based architecture',
                    'API integration with jPulse.api.call()',
                    'Browser history support'
                ]
            };

            res.json({
                success: true,
                data: demoData,
                message: 'Vue.js demo data retrieved successfully'
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloVue.api', `success: demo data retrieved in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloVue.api', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to retrieve Vue.js demo data', 'HELLO_VUE_ERROR');
        }
    }
}

export default HelloVueController;

// EOF webapp/controller/helloVue.js
