/**
 * @name            jPulse Framework / Site / WebApp / Controller / Hello Cluster Todo
 * @tagline         Collaborative Todo Demo Controller - Server-Side Broadcasting Pattern
 * @description     Full MVC pattern with database persistence and Redis broadcasting
 * @file            site/webapp/controller/helloClusterTodo.js
 * @version         0.9.7
 * @release         2025-10-12
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
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
        try {
            LogController.logRequest(req, 'helloClusterTodo.api', '');

            const todos = await HelloTodoModel.findAll();
            const stats = await HelloTodoModel.getStats();
            res.json({
                success: true,
                todos,
                stats
            });

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'helloClusterTodo.api', `success: ${todos.length} docs found in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'helloClusterTodo.api', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to retrieve todos', 'HELLO_CLUSTER_TODO_RETRIEVE_ERROR');
        }
    }

    static async apiGet(req, res) {
        try {
            const todos = await HelloTodoModel.findAll();
            const stats = await HelloTodoModel.getStats();
            res.json({
                success: true,
                todos,
                stats
            });
        } catch (error) {
            global.LogController.logError(req, 'helloClusterTodo.apiGet', `error: ${error.message}`);
            res.status(500).json({ success: false, message: 'Failed to retrieve todos' });
        }
    }

    /**
     * Create a new todo
     * POST /api/1/helloClusterTodo
     */
    static async apiCreate(req, res) {
        const startTime = Date.now();
        try {
            const { text } = req.body;

            // Validation
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Task description is required'
                });
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
            await HelloClusterTodoController._broadcastChange('created', createdTodo, req);

            res.status(201).json({
                success: true,
                todo: createdTodo
            });
        } catch (error) {
            global.LogController.logError(req, 'helloClusterTodo.apiCreate', `error: ${error.message}`);
            res.status(500).json({ success: false, message: 'Failed to create todo' });
        }
    }

    /**
     * Toggle todo completion status
     * PUT /api/1/helloClusterTodo/:id/toggle
     */
    static async apiToggle(req, res) {
        try {
            const { id } = req.params;
            const updatedTodo = await HelloTodoModel.toggleComplete(id);

            // Broadcast change to all cluster instances
            await HelloClusterTodoController._broadcastChange('updated', updatedTodo, req);

            res.json({
                success: true,
                todo: updatedTodo
            });
        } catch (error) {
            global.LogController.logError(req, 'helloClusterTodo.apiToggle', `error: ${error.message}`);
            res.status(500).json({ success: false, message: 'Failed to toggle todo' });
        }
    }

    /**
     * Delete a todo
     * DELETE /api/1/helloClusterTodo/:id
     */
    static async apiDelete(req, res) {
        try {
            const { id } = req.params;

            // Find the todo first for broadcasting
            const todoToDelete = await HelloTodoModel.findById(id);
            if (!todoToDelete) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }

            // Delete from database using the model
            await HelloTodoModel.delete(id);

            // Broadcast change to all cluster instances
            await HelloClusterTodoController._broadcastChange('deleted', todoToDelete, req);

            res.json({
                success: true,
                message: 'Task deleted and synchronized successfully',
                data: {
                    deletedId: id
                }
            });

        } catch (error) {
            console.error('Error deleting todo:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete todo',
                error: error.message
            });
        }
    }

    /**
     * Get todo statistics (not used in this demo, but could be)
     * GET /api/1/helloClusterTodo/stats
     */
    static async apiStats(req, res) {
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

        } catch (error) {
            console.error('Error retrieving todo statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve statistics',
                error: error.message
            });
        }
    }

    /**
     * Broadcasts changes to interested clients via Redis
     * @param {string} action - The action performed (created, updated, deleted)
     * @param {object} todo - The todo item that was changed
     * @param {object} req - The Express request object for context
     * @private
     */
    static async _broadcastChange(action, todo, req) {
        if (!global.RedisManager || !global.RedisManager.isRedisAvailable()) {
            global.LogController?.logInfo(req, 'helloClusterTodo._broadcastChange', 'warning: Redis not available, skipping broadcast');
            return;
        }

        const senderName = (req.session?.user?.firstName
            ? `${req.session.user.firstName} ${req.session.user.lastName}`
            : req.session?.user?.username) || 'Anonymous User';
        const sender = req.session?.user?.username || 'guest';
        const uuid = req.body.uuid || null; // Client UUID, if provided

        const broadcastPayload = {
            todo: todo,
            action: action,
            sender: sender,
            senderName: senderName,
            uuid: uuid
        };

        const channel = (action === 'created' || action === 'deleted')
            ? 'controller:helloClusterTodo:list:changed'
            : 'controller:helloClusterTodo:item:updated';

        try {
            await global.RedisManager.publishBroadcast(channel, broadcastPayload);
            global.LogController?.logInfo(req, 'helloClusterTodo._broadcastChange', `Broadcasted [${action}] on channel [${channel}]`);
        } catch (error) {
            global.LogController?.logError(req, 'helloClusterTodo._broadcastChange', `Failed to broadcast change: ${error.message}`);
        }
    }
}

export default HelloClusterTodoController;
