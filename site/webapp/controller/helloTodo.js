/**
 * @name            jPulse Framework / Site / WebApp / Controller / Hello Todo
 * @tagline         Demo Todo Controller for MVC Learning
 * @description     Example of complete MVC pattern with REST API endpoints
 * @file            site/webapp/controller/helloTodo.js
 * @version         0.8.3
 * @release         2025-09-30
 * @author          Site Developer
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import HelloTodoModel from '../model/helloTodo.js';

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

    /**
     * API: GET /api/1/hello-todo
     * Retrieve all todos, sorted by creation date (newest first)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async api(req, res) {
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

            LogController.logInfo(req, 'helloTodo.api', `success: retrieved ${todos.length} todos`);

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
        try {
            LogController.logRequest(req, 'helloTodo.apiCreate', '');

            const { title, userFirstName, userLastName } = req.body;

            // Validate required fields
            if (!title?.trim()) {
                LogController.logError(req, 'helloTodo.apiCreate', 'validation error: title is required');
                return CommonUtils.sendError(req, res, 400, 'Title is required', 'VALIDATION_ERROR');
            }

            // Get username from authenticated user or use 'guest'
            const username = req.user?.username || 'guest';

            // Create todo with user context
            const todoData = {
                title: title.trim(),
                username: username,
                userFirstName: userFirstName || req.user?.profile?.firstName || '',
                userLastName: userLastName || req.user?.profile?.lastName || ''
            };

            const todo = await HelloTodoModel.create(todoData);

            res.json({
                success: true,
                data: todo,
                message: 'Todo created successfully'
            });

            LogController.logInfo(req, 'helloTodo.apiCreate', `success: created todo "${title}" for user ${username}`);

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
        try {
            LogController.logRequest(req, 'helloTodo.apiToggle', '');

            const { id } = req.params;

            if (!id) {
                LogController.logError(req, 'helloTodo.apiToggle', 'validation error: id parameter is required');
                return CommonUtils.sendError(req, res, 400, 'Todo ID is required', 'VALIDATION_ERROR');
            }

            const todo = await HelloTodoModel.toggleComplete(id);

            res.json({
                success: true,
                data: todo,
                message: `Todo ${todo.completed ? 'completed' : 'reopened'} successfully`
            });

            LogController.logInfo(req, 'helloTodo.apiToggle', `success: toggled todo ${id} to ${todo.completed ? 'completed' : 'pending'}`);

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
        try {
            LogController.logRequest(req, 'helloTodo.apiDelete', '');

            const { id } = req.params;

            if (!id) {
                LogController.logError(req, 'helloTodo.apiDelete', 'validation error: id parameter is required');
                return CommonUtils.sendError(req, res, 400, 'Todo ID is required', 'VALIDATION_ERROR');
            }

            await HelloTodoModel.delete(id);

            res.json({
                success: true,
                data: { id },
                message: 'Todo deleted successfully'
            });

            LogController.logInfo(req, 'helloTodo.apiDelete', `success: deleted todo ${id}`);

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
        try {
            LogController.logRequest(req, 'helloTodo.apiStats', '');

            const stats = await HelloTodoModel.getStats();

            res.json({
                success: true,
                data: stats,
                message: 'Todo statistics retrieved successfully'
            });

            LogController.logInfo(req, 'helloTodo.apiStats', `success: retrieved stats (${stats.total} total, ${stats.completed} completed)`);

        } catch (error) {
            LogController.logError(req, 'helloTodo.apiStats', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to retrieve todo statistics', 'HELLO_TODO_STATS_ERROR');
        }
    }
}

export default HelloTodoController;

// EOF site/webapp/controller/helloTodo.js
