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

import { ObjectId } from 'mongodb';

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
        try {
            // Get user ID (default to 'demo' for this demo)
            const userId = req.session?.user?.id || 'demo-user';

            // Query todos from database
            const todos = await global.db.collection('helloClusterTodos')
                .find({ userId })
                .sort({ createdAt: -1 })
                .toArray();

            res.json({
                success: true,
                message: 'Todos retrieved successfully',
                data: {
                    todos,
                    count: todos.length
                }
            });

        } catch (error) {
            console.error('Error retrieving todos:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve todos',
                error: error.message
            });
        }
    }

    /**
     * Create a new todo
     * POST /api/1/helloClusterTodo
     */
    static async apiCreate(req, res) {
        try {
            const { text, priority = 'medium' } = req.body;

            // Validation
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Task description is required'
                });
            }

            if (!['low', 'medium', 'high'].includes(priority)) {
                return res.status(400).json({
                    success: false,
                    message: 'Priority must be low, medium, or high'
                });
            }

            // Get user info
            const userId = req.session?.user?.id || 'demo-user';
            const userName = req.session?.user?.username || 'Demo User';

            // Create todo document
            const todoData = {
                text: text.trim(),
                priority,
                completed: false,
                userId,
                createdBy: userName,
                updatedBy: userName,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Insert into database
            const result = await global.db.collection('helloClusterTodos').insertOne(todoData);

            if (!result.insertedId) {
                throw new Error('Failed to insert todo into database');
            }

            // Get the created todo with the ID
            const createdTodo = {
                ...todoData,
                _id: result.insertedId
            };

            // Broadcast change to all cluster instances
            await HelloClusterTodoController._broadcastChange('created', createdTodo, req);

            res.status(201).json({
                success: true,
                message: 'Todo created successfully',
                data: {
                    todo: createdTodo
                }
            });

        } catch (error) {
            console.error('Error creating todo:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create todo',
                error: error.message
            });
        }
    }

    /**
     * Toggle todo completion status
     * PUT /api/1/helloClusterTodo/:id/toggle
     */
    static async apiToggle(req, res) {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid todo ID'
                });
            }

            const userId = req.session?.user?.id || 'demo-user';
            const userName = req.session?.user?.username || 'Demo User';

            // Find and update the todo
            const collection = global.db.collection('helloClusterTodos');
            const currentTodo = await collection.findOne({
                _id: new ObjectId(id),
                userId
            });

            if (!currentTodo) {
                return res.status(404).json({
                    success: false,
                    message: 'Todo not found'
                });
            }

            // Toggle completion status
            const updatedTodo = await collection.findOneAndUpdate(
                { _id: new ObjectId(id), userId },
                {
                    $set: {
                        completed: !currentTodo.completed,
                        updatedBy: userName,
                        updatedAt: new Date()
                    }
                },
                { returnDocument: 'after' }
            );

            if (!updatedTodo.value) {
                throw new Error('Failed to update todo');
            }

            // Broadcast change to all cluster instances
            await HelloClusterTodoController._broadcastChange('updated', updatedTodo.value, req);

            res.json({
                success: true,
                message: 'Todo updated successfully',
                data: {
                    todo: updatedTodo.value
                }
            });

        } catch (error) {
            console.error('Error toggling todo:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle todo',
                error: error.message
            });
        }
    }

    /**
     * Delete a todo
     * DELETE /api/1/helloClusterTodo/:id
     */
    static async apiDelete(req, res) {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid todo ID'
                });
            }

            const userId = req.session?.user?.id || 'demo-user';

            // Find the todo first (for broadcasting)
            const collection = global.db.collection('helloClusterTodos');
            const todoToDelete = await collection.findOne({
                _id: new ObjectId(id),
                userId
            });

            if (!todoToDelete) {
                return res.status(404).json({
                    success: false,
                    message: 'Todo not found'
                });
            }

            // Delete the todo
            const result = await collection.deleteOne({
                _id: new ObjectId(id),
                userId
            });

            if (result.deletedCount === 0) {
                throw new Error('Failed to delete todo');
            }

            // Broadcast change to all cluster instances
            await HelloClusterTodoController._broadcastChange('deleted', todoToDelete, req);

            res.json({
                success: true,
                message: 'Todo deleted successfully',
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
     * Get todo statistics
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
     * Private method to broadcast changes to all cluster instances
     */
    static async _broadcastChange(action, todo, req) {
        try {
            // Import BroadcastController dynamically to avoid circular dependencies
            const BroadcastController = global.BroadcastController;

            if (!BroadcastController) {
                console.warn('BroadcastController not available - skipping broadcast');
                return;
            }

            // Prepare broadcast data
            const broadcastData = {
                action,
                todo,
                userId: req.session?.user?.id || 'demo-user',
                timestamp: new Date().toISOString(),
                serverInstance: global.RedisManager?.instanceId || 'unknown'
            };

            // Broadcast to all cluster instances
            await BroadcastController.publish(
                'controller:helloClusterTodo:list:changed',
                broadcastData
            );

            // Also broadcast specific item update
            await BroadcastController.publish(
                'controller:helloClusterTodo:item:updated',
                broadcastData
            );

            console.log(`📡 Broadcasted todo ${action}:`, todo._id);

        } catch (error) {
            console.error('Error broadcasting todo change:', error);
            // Don't fail the main operation if broadcasting fails
        }
    }
}

export default HelloClusterTodoController;
