/**
 * @name            jPulse Framework / Site / WebApp / Controller / Hello Cluster Todo
 * @tagline         Collaborative Todo Demo Controller - Server-Side Broadcasting Pattern
 * @description     Full MVC pattern with database persistence and Redis broadcasting
 * @file            site/webapp/controller/helloClusterTodo.js
 * @version         1.3.0
 * @release         2025-11-30
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import HelloTodoModel from '../model/helloTodo.js';
const LogController = global.LogController;
const CommonUtils = global.CommonUtils;

/**
 * HelloClusterTodo Controller
 * Demonstrates server-side broadcasting pattern with full MVC architecture
 */
class HelloClusterTodoController {

    /**
     * Get all todos for the current user
     * GET /api/1/helloClusterTodo
     */
    static async api(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'helloClusterTodo.api', '');

        try {
            const todos = await HelloTodoModel.findAll();
            const stats = await HelloTodoModel.getStats();

            res.json({
                success: true,
                todos,
                stats
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloClusterTodo.api', `success: ${todos.length} todos retrieved in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloClusterTodo.api', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to retrieve todos', 'HELLO_CLUSTER_TODO_RETRIEVE_ERROR');
        }
    }

    /**
     * Create a new todo
     * POST /api/1/helloClusterTodo
     */
    static async apiCreate(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'helloClusterTodo.apiCreate', JSON.stringify({ text: req.body.text }));

        try {
            const { text } = req.body;

            // Validation
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                LogController.logError(req, 'helloClusterTodo.apiCreate', 'error: Task description is required');
                return CommonUtils.sendError(req, res, 400, 'Task description is required', 'HELLO_CLUSTER_TODO_CREATE_ERROR');
            }

            const userName = req.session?.user?.username || 'guest';
            const userFirstName = req.session?.user?.firstName || 'Anonymous';
            const userLastName = req.session?.user?.lastName || 'User';

            // Create todo document using the model, mapping `text` to `title`
            const createdTodo = await HelloTodoModel.create({
                title: text.trim(), // USE `title` to match the model
                username: userName,
                userFirstName,
                userLastName
            });

            // Broadcast change to all cluster instances
            await HelloClusterTodoController._broadcastChange('created', createdTodo, req, req.body.uuid);

            res.status(201).json({
                success: true,
                todo: createdTodo
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloClusterTodo.apiCreate', `success: todo created for user ${userName} in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloClusterTodo.apiCreate', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to create todo', 'HELLO_CLUSTER_TODO_CREATE_ERROR');
        }
    }

    /**
     * Toggle todo completion status
     * PUT /api/1/helloClusterTodo/:id/toggle
     */
    static async apiToggle(req, res) {
        const startTime = Date.now();
        const { id } = req.params;
        LogController.logRequest(req, 'helloClusterTodo.apiToggle', id);

        try {
            const updatedTodo = await HelloTodoModel.toggleComplete(id);

            // Broadcast change to all cluster instances
            await HelloClusterTodoController._broadcastChange('updated', updatedTodo, req, req.body.uuid);

            res.json({
                success: true,
                todo: updatedTodo
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloClusterTodo.apiToggle', `success: todo ${id} toggled in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloClusterTodo.apiToggle', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to toggle todo', 'HELLO_CLUSTER_TODO_TOGGLE_ERROR');
        }
    }

    /**
     * Delete a todo
     * DELETE /api/1/helloClusterTodo/:id
     */
    static async apiDelete(req, res) {
        const startTime = Date.now();
        const { id } = req.params;
        LogController.logRequest(req, 'helloClusterTodo.apiDelete', id);

        try {
            // Find the todo first for broadcasting
            const todoToDelete = await HelloTodoModel.findById(id);
            if (!todoToDelete) {
                LogController.logError(req, 'helloClusterTodo.apiDelete', `error: Todo ${id} not found`);
                return CommonUtils.sendError(req, res, 404, 'Task not found', 'HELLO_CLUSTER_TODO_DELETE_ERROR');
            }

            // Delete from database using the model
            await HelloTodoModel.delete(id);

            // Broadcast change to all cluster instances
            await HelloClusterTodoController._broadcastChange('deleted', todoToDelete, req, req.body.uuid);

            res.json({
                success: true,
                message: 'Task deleted and synchronized successfully',
                data: {
                    deletedId: id
                }
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloClusterTodo.apiDelete', `success: todo ${id} deleted in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloClusterTodo.apiDelete', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to delete todo', 'HELLO_CLUSTER_TODO_DELETE_ERROR');
        }
    }

    /**
     * Get todo statistics (not used in this demo, but could be)
     * GET /api/1/helloClusterTodo/stats
     */
    static async apiStats(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'helloClusterTodo.apiStats', '');

        try {
            const userId = req.session?.user?.id || 'demo-user';
            const collection = global.db.collection('helloClusterTodos');

            // Get aggregated statistics
            const stats = await collection.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        completed: { $sum: { $cond: ['$completed', 1, 0] } },
                        pending: { $sum: { $cond: ['$completed', 0, 1] } },
                        highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
                        mediumPriority: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
                        lowPriority: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } }
                    }
                }
            ]).toArray();

            const result = stats.length > 0 ? stats[0] : {
                total: 0,
                completed: 0,
                pending: 0,
                highPriority: 0,
                mediumPriority: 0,
                lowPriority: 0
            };

            // Remove the _id field
            delete result._id;

            res.json({
                success: true,
                message: 'Statistics retrieved successfully',
                data: {
                    stats: result
                }
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloClusterTodo.apiStats', `success: statistics retrieved in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloClusterTodo.apiStats', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to retrieve statistics', 'HELLO_CLUSTER_TODO_STATS_ERROR');
        }
    }

    /**
     * Broadcasts changes to interested clients via Redis
     * @param {string} action - The action performed (created, updated, deleted)
     * @param {object} todo - The todo item that was changed
     * @param {object} req - The Express request object for context
     * @param {string} clientUuid - The unique ID of the client making the request
     * @private
     */
    static async _broadcastChange(action, todo, req, clientUuid = null) {
        if (!global.RedisManager || !global.RedisManager.isRedisAvailable()) {
            LogController.logInfo(req, 'helloClusterTodo._broadcastChange', 'warning: Redis not available, skipping broadcast');
            return;
        }

        const userData = req.session?.user || { username: 'guest', firstName: 'Anonymous', lastName: 'User' };

        // Determine channel based on action
        const isListChange = (action === 'created' || action === 'deleted');
        const channel = isListChange
            ? 'view:helloClusterTodo:list:changed'
            : 'view:helloClusterTodo:item:updated';

        const payload = {
            action: action,
            user: userData,
            todo: todo, // Include the full todo object in the payload
            uuid: clientUuid
        };

        try {
            await global.RedisManager.publishBroadcast(channel, payload);
            LogController.logInfo(req, 'helloClusterTodo._broadcastChange', `success: broadcasted [${action}] on channel [${channel}]`);
        } catch (error) {
            LogController.logError(req, 'helloClusterTodo._broadcastChange', `error: Failed to broadcast change: ${error.message}`);
        }
    }
}

export default HelloClusterTodoController;
