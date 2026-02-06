/**
 * @name            jPulse Framework / Site / WebApp / Controller / Hello Todo
 * @tagline         Demo Todo Controller for MVC Learning
 * @description     Example of complete MVC pattern with REST API endpoints
 * @file            site/webapp/controller/helloTodo.js
 * @version         1.6.9
 * @release         2026-02-06
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import HelloTodoModel from '../model/helloTodo.js';
import HelloWebsocketController from './helloWebsocket.js';

// Access global utilities
const LogController = global.LogController;
const CommonUtils = global.CommonUtils;

/**
 * Hello Todo Controller - Complete MVC Demo with REST API
 *
 * This demonstrates how to create a full Controller with REST API endpoints
 * for a Model-View-Controller pattern. Perfect for learning jPulse Framework patterns.
 *
 * Key Learning Points:
 * - REST API endpoint design (GET, POST, PUT, DELETE)
 * - Request validation and error handling
 * - Logging integration with LogController
 * - User context and authentication integration
 * - Consistent response format
 *
 * API Endpoints:
 * - GET    /api/1/hello-todo        - List all todos
 * - POST   /api/1/hello-todo        - Create new todo
 * - PUT    /api/1/hello-todo/:id/toggle - Toggle todo completion
 * - DELETE /api/1/hello-todo/:id    - Delete todo
 */
class HelloTodoController {
    // W-129: Allow unauthenticated access to this demo API (default would be auth 'user' via SiteControllerRegistry)
    static routes = [
        { method: 'GET', path: '/api/1/helloTodo', handler: 'api', auth: 'none' },
        { method: 'POST', path: '/api/1/helloTodo', handler: 'apiCreate', auth: 'none' },
        { method: 'PUT', path: '/api/1/helloTodo/:id/toggle', handler: 'apiToggle', auth: 'none' },
        { method: 'DELETE', path: '/api/1/helloTodo/:id', handler: 'apiDelete', auth: 'none' },
        { method: 'GET', path: '/api/1/helloTodo/stats', handler: 'apiStats', auth: 'none' }
    ];

    /**
     * API: GET /api/1/hello-todo
     * Retrieve all todos, sorted by creation date (newest first)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async api(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'helloTodo.api', '');

            const todos = await HelloTodoModel.findAll();
            const stats = await HelloTodoModel.getStats();

            res.json({
                success: true,
                data: todos,
                stats: stats,
                message: `Retrieved ${todos.length} todos successfully`
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloTodo.api', `success: ${todos.length} docs found in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloTodo.api', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to retrieve todos', 'HELLO_TODO_RETRIEVE_ERROR');
        }
    }

    /**
     * API: POST /api/1/hello-todo
     * Create a new todo item
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async apiCreate(req, res) {
        const startTime = Date.now();
        try {
            const { title, userFirstName, userLastName } = req.body;
            LogController.logRequest(req, 'helloTodo.apiCreate', JSON.stringify({ title, userFirstName, userLastName }));

            // Validate required fields
            if (!title?.trim()) {
                LogController.logError(req, 'helloTodo.apiCreate', 'validation error: title is required');
                return CommonUtils.sendError(req, res, 400, 'Title is required', 'VALIDATION_ERROR');
            }

            // Get username from authenticated user or use 'guest'
            const username = req.session?.user?.username || 'guest';

            // Create todo with user context
            const todoData = {
                title: title.trim(),
                username: username,
                userFirstName: userFirstName || req.session?.user?.firstName || '',
                userLastName: userLastName || req.session?.user?.lastName || ''
            };

            const todo = await HelloTodoModel.create(todoData);

            // Log the creation
            await LogController.logChange(req, 'helloTodo', 'create', todo._id, null, todo);

            // Broadcast to WebSocket clients if available
            if (HelloWebsocketController.broadcastTodoCreated) {
                HelloWebsocketController.broadcastTodoCreated(todo, username);
            }

            res.json({
                success: true,
                data: todo,
                message: 'Todo created successfully'
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloTodo.apiCreate', `success: 1 doc created in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloTodo.apiCreate', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to create todo', 'HELLO_TODO_CREATE_ERROR');
        }
    }

    /**
     * API: PUT /api/1/hello-todo/:id/toggle
     * Toggle completion status of a todo
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async apiToggle(req, res) {
        const startTime = Date.now();
        try {
            const { id } = req.params;
            LogController.logRequest(req, 'helloTodo.apiToggle', JSON.stringify({ id }));

            if (!id) {
                LogController.logError(req, 'helloTodo.apiToggle', 'validation error: id parameter is required');
                return CommonUtils.sendError(req, res, 400, 'Todo ID is required', 'VALIDATION_ERROR');
            }

            // Get old todo for logging
            const oldTodo = await HelloTodoModel.findById(id);
            if (!oldTodo) {
                LogController.logError(req, 'helloTodo.apiToggle', `error: todo not found for id: ${id}`);
                return CommonUtils.sendError(req, res, 404, 'Todo not found', 'HELLO_TODO_NOT_FOUND');
            }

            const todo = await HelloTodoModel.toggleComplete(id);

            // Log the update
            await LogController.logChange(req, 'helloTodo', 'update', id, oldTodo, todo);

            // Get username for broadcast
            const username = req.session?.user?.username || 'guest';

            // Broadcast to WebSocket clients if available
            if (HelloWebsocketController.broadcastTodoUpdated) {
                HelloWebsocketController.broadcastTodoUpdated(todo, username);
            }

            res.json({
                success: true,
                data: todo,
                message: `Todo ${todo.completed ? 'completed' : 'reopened'} successfully`
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloTodo.apiToggle', `success: 1 doc updated in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloTodo.apiToggle', `error: ${error.message}`);

            // Handle specific error cases
            if (error.message.includes('Todo not found')) {
                return CommonUtils.sendError(req, res, 404, 'Todo not found', 'HELLO_TODO_NOT_FOUND');
            }
            if (error.message.includes('invalid ObjectId')) {
                return CommonUtils.sendError(req, res, 400, 'Invalid todo ID format', 'INVALID_TODO_ID');
            }

            return CommonUtils.sendError(req, res, 500, 'Failed to update todo', 'HELLO_TODO_UPDATE_ERROR');
        }
    }

    /**
     * API: DELETE /api/1/hello-todo/:id
     * Delete a todo by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async apiDelete(req, res) {
        const startTime = Date.now();
        try {
            const { id } = req.params;
            LogController.logRequest(req, 'helloTodo.apiDelete', JSON.stringify({ id }));

            if (!id) {
                LogController.logError(req, 'helloTodo.apiDelete', 'validation error: id parameter is required');
                return CommonUtils.sendError(req, res, 400, 'Todo ID is required', 'VALIDATION_ERROR');
            }

            // Get old todo for logging
            const oldTodo = await HelloTodoModel.findById(id);
            if (!oldTodo) {
                LogController.logError(req, 'helloTodo.apiDelete', `error: todo not found for id: ${id}`);
                return CommonUtils.sendError(req, res, 404, 'Todo not found', 'HELLO_TODO_NOT_FOUND');
            }

            await HelloTodoModel.delete(id);

            // Log the deletion
            await LogController.logChange(req, 'helloTodo', 'delete', id, oldTodo, null);

            // Get username for broadcast
            const username = req.session?.user?.username || 'guest';

            // Broadcast to WebSocket clients if available
            if (HelloWebsocketController.broadcastTodoDeleted) {
                HelloWebsocketController.broadcastTodoDeleted(id, username);
            }

            res.json({
                success: true,
                data: { id },
                message: 'Todo deleted successfully'
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloTodo.apiDelete', `success: 1 doc deleted in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloTodo.apiDelete', `error: ${error.message}`);

            // Handle specific error cases
            if (error.message.includes('Todo not found')) {
                return CommonUtils.sendError(req, res, 404, 'Todo not found', 'HELLO_TODO_NOT_FOUND');
            }
            if (error.message.includes('invalid ObjectId')) {
                return CommonUtils.sendError(req, res, 400, 'Invalid todo ID format', 'INVALID_TODO_ID');
            }

            return CommonUtils.sendError(req, res, 500, 'Failed to delete todo', 'HELLO_TODO_DELETE_ERROR');
        }
    }

    /**
     * API: GET /api/1/hello-todo/stats
     * Get todo statistics (total, completed, pending)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async apiStats(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'helloTodo.apiStats', '');

            const stats = await HelloTodoModel.getStats();

            res.json({
                success: true,
                data: stats,
                message: 'Todo statistics retrieved successfully'
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloTodo.apiStats', `success: retrieved stats (${stats.total} total, ${stats.completed} completed) in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloTodo.apiStats', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to retrieve todo statistics', 'HELLO_TODO_STATS_ERROR');
        }
    }
}

export default HelloTodoController;

// EOF site/webapp/controller/helloTodo.js
