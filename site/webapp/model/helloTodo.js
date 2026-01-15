/**
 * @name            jPulse Framework / Site / WebApp / Model / Hello Todo
 * @tagline         Demo Todo Model for MVC Learning
 * @description     Example of complete MVC pattern with MongoDB integration
 * @file            site/webapp/model/helloTodo.js
 * @version         1.4.15
 * @release         2026-01-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import { ObjectId } from 'mongodb';

// Access global database instance
const database = global.Database;

/**
 * Hello Todo Model - Complete MVC Demo with MongoDB
 *
 * This demonstrates how to create a full Model-View-Controller pattern
 * with database persistence. Perfect for learning jPulse Framework patterns.
 *
 * Key Learning Points:
 * - Schema definition and validation
 * - MongoDB collection management
 * - CRUD operations (Create, Read, Update, Delete)
 * - Error handling and logging integration
 * - User context integration
 */
class HelloTodoModel {
    /**
     * Schema definition for validation
     * Demonstrates field types, defaults, and constraints
     */
    static schema = {
        _id: { type: 'objectId', auto: true },
        title: { type: 'string', required: true },
        completed: { type: 'boolean', default: false },
        username: { type: 'string', required: true },
        userFirstName: { type: 'string', default: '' },
        userLastName: { type: 'string', default: '' },
        createdAt: { type: 'date', auto: true },
        updatedAt: { type: 'date', auto: true }
    };

    /**
     * Get MongoDB collection
     * Uses plural naming convention: helloTodos
     * @returns {Collection} MongoDB collection instance
     */
    static getCollection() {
        const db = database.getDb();
        if (!db) {
            throw new Error('Database connection not available');
        }
        return db.collection('helloTodos');
    }

    /**
     * Validate todo data against schema
     * @param {object} data - Todo data to validate
     * @param {boolean} isUpdate - Whether this is an update operation
     * @throws {Error} Validation error with details
     */
    static validate(data, isUpdate = false) {
        const errors = [];

        // Validate title (required for create, optional for update)
        if (!isUpdate && (!data.title || typeof data.title !== 'string')) {
            errors.push('title is required and must be a string');
        }
        if (data.title !== undefined) {
            if (typeof data.title !== 'string' || data.title.trim() === '') {
                errors.push('title must be a non-empty string');
            }
            if (data.title.trim().length > 200) {
                errors.push('title must be 200 characters or less');
            }
        }

        // Validate username (required for create, optional for update)
        if (!isUpdate && (!data.username || typeof data.username !== 'string')) {
            errors.push('username is required and must be a string');
        }
        if (data.username !== undefined) {
            if (typeof data.username !== 'string' || data.username.trim() === '') {
                errors.push('username must be a non-empty string');
            }
        }

        // Validate completed (optional, but must be boolean if provided)
        if (data.completed !== undefined && typeof data.completed !== 'boolean') {
            errors.push('completed must be a boolean');
        }

        // Validate user names (optional, but must be strings if provided)
        if (data.userFirstName !== undefined && typeof data.userFirstName !== 'string') {
            errors.push('userFirstName must be a string');
        }
        if (data.userLastName !== undefined && typeof data.userLastName !== 'string') {
            errors.push('userLastName must be a string');
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Apply default values to todo data
     * @param {object} data - Todo data
     * @returns {object} Data with defaults applied
     */
    static applyDefaults(data) {
        const now = new Date();
        return {
            ...data,
            completed: data.completed !== undefined ? data.completed : false,
            userFirstName: data.userFirstName || '',
            userLastName: data.userLastName || '',
            createdAt: data.createdAt || now,
            updatedAt: now
        };
    }

    /**
     * Find all todos, sorted by creation date (newest first)
     * @returns {Promise<Array>} Array of todo documents
     */
    static async findAll() {
        try {
            const collection = this.getCollection();
            return await collection.find({}).sort({ createdAt: -1 }).toArray();
        } catch (error) {
            throw new Error(`Failed to retrieve todos: ${error.message}`);
        }
    }

    /**
     * Find todos by username
     * @param {string} username - Username to filter by
     * @returns {Promise<Array>} Array of todo documents for the user
     */
    static async findByUsername(username) {
        try {
            const collection = this.getCollection();
            return await collection.find({ username }).sort({ createdAt: -1 }).toArray();
        } catch (error) {
            throw new Error(`Failed to retrieve todos for user: ${error.message}`);
        }
    }

    /**
     * Find a todo by ID
     * @param {string} id - Todo ID to find
     * @returns {Promise<object|null>} Todo document or null if not found
     */
    static async findById(id) {
        try {
            const collection = this.getCollection();
            const objectId = new ObjectId(id);
            return await collection.findOne({ _id: objectId });
        } catch (error) {
            throw new Error(`Failed to find todo by ID: ${error.message}`);
        }
    }

    /**
     * Create a new todo
     * @param {object} todoData - Todo data to create
     * @returns {Promise<object>} Created todo document
     */
    static async create(todoData) {
        try {
            // Validate input data
            this.validate(todoData, false);

            // Apply defaults and prepare for insertion
            const todoToInsert = this.applyDefaults({
                title: todoData.title.trim(),
                username: todoData.username,
                userFirstName: todoData.userFirstName || '',
                userLastName: todoData.userLastName || '',
                completed: false
            });

            const collection = this.getCollection();
            const result = await collection.insertOne(todoToInsert);

            // Return the created document
            return await collection.findOne({ _id: result.insertedId });
        } catch (error) {
            throw new Error(`Failed to create todo: ${error.message}`);
        }
    }

    /**
     * Toggle completion status of a todo
     * @param {string} id - Todo ID to toggle
     * @returns {Promise<object>} Updated todo document
     */
    static async toggleComplete(id) {
        try {
            const collection = this.getCollection();
            const objectId = new ObjectId(id);

            // Find the current todo
            const todo = await collection.findOne({ _id: objectId });
            if (!todo) {
                throw new Error('Todo not found');
            }

            // Toggle completion status
            const updateResult = await collection.updateOne(
                { _id: objectId },
                {
                    $set: {
                        completed: !todo.completed,
                        updatedAt: new Date()
                    }
                }
            );

            if (updateResult.matchedCount === 0) {
                throw new Error('Todo not found');
            }

            // Return updated document
            return await collection.findOne({ _id: objectId });
        } catch (error) {
            throw new Error(`Failed to toggle todo completion: ${error.message}`);
        }
    }

    /**
     * Delete a todo by ID
     * @param {string} id - Todo ID to delete
     * @returns {Promise<boolean>} True if deleted successfully
     */
    static async delete(id) {
        try {
            const collection = this.getCollection();
            const objectId = new ObjectId(id);

            const result = await collection.deleteOne({ _id: objectId });

            if (result.deletedCount === 0) {
                throw new Error('Todo not found');
            }

            return true;
        } catch (error) {
            throw new Error(`Failed to delete todo: ${error.message}`);
        }
    }

    /**
     * Get todo statistics
     * @returns {Promise<object>} Statistics object with counts
     */
    static async getStats() {
        try {
            const collection = this.getCollection();
            const [total, completed] = await Promise.all([
                collection.countDocuments({}),
                collection.countDocuments({ completed: true })
            ]);

            return {
                total,
                completed,
                pending: total - completed
            };
        } catch (error) {
            throw new Error(`Failed to get todo statistics: ${error.message}`);
        }
    }
}

export default HelloTodoModel;

// EOF site/webapp/model/helloTodo.js
