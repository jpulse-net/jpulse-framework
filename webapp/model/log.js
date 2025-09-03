/**
 * @name            jPulse Framework / WebApp / Model / Log
 * @tagline         Log Model for jPulse Framework WebApp
 * @description     This is the log model for the jPulse Framework WebApp using native MongoDB driver
 * @file            webapp/model/log.js
 * @version         0.4.3
 * @release         2025-09-03
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import database from '../database.js';
import CommonUtils from '../utils/common.js';

/**
 * Log Model - handles logging infrastructure with native MongoDB driver
 * Tracks document changes and provides search functionality
 */
class LogModel {
    /**
     * Schema definition for validation
     */
    static schema = {
        data: {
            docId: { type: 'mixed', required: true }, // ObjectId or String
            docType: { type: 'string', required: true }, // 'config', 'user', etc.
            action: { type: 'string', required: true, enum: ['create', 'update', 'delete'] },
            changes: { type: 'array', default: [] } // array of [fieldPath, oldValue, newValue]
        },
        createdAt: { type: 'date', auto: true },
        createdBy: { type: 'string', default: '' },
        docVersion: { type: 'number', default: 1 }
    };

    /**
     * Get MongoDB collection
     * @returns {Collection} MongoDB collection instance
     */
    static getCollection() {
        const db = database.getDb();
        return db.collection('logs');
    }

    /**
     * Validate document against schema
     * @param {object} doc - Document to validate
     * @returns {object} Validation result with success flag and errors
     */
    static validate(doc) {
        const errors = [];

        // Validate required fields
        if (!doc.data) {
            errors.push('data field is required');
        } else {
            if (!doc.data.docId) {
                errors.push('data.docId is required');
            }
            if (!doc.data.docType || typeof doc.data.docType !== 'string') {
                errors.push('data.docType is required and must be a string');
            }
            if (!doc.data.action || !['create', 'update', 'delete'].includes(doc.data.action)) {
                errors.push('data.action must be one of: create, update, delete');
            }
        }
        return {
            success: errors.length === 0,
            errors
        };
    }

    /**
     * Apply default values to document
     * @param {object} doc - Document to process
     * @returns {object} Document with defaults applied
     */
    static applyDefaults(doc) {
        const now = new Date();
        return {
            ...doc,
            data: {
                changes: [],
                ...doc.data
            },
            createdAt: doc.createdAt || now,
            createdBy: doc.createdBy || '',
            docVersion: doc.docVersion || 1
        };
    }

    /**
     * Create field-by-field diff between two documents
     * @param {object} oldDoc - Original document
     * @param {object} newDoc - Updated document
     * @param {string} prefix - Field path prefix for nested objects
     * @returns {array} Array of changes: [[fieldPath, oldValue, newValue], ...]
     */
    static createFieldDiff(oldDoc, newDoc, prefix = '') {
        const changes = [];
        // Handle null/undefined cases
        if (!oldDoc && !newDoc) return [];
        if (!oldDoc) oldDoc = {};
        if (!newDoc) newDoc = {};
        // Get all unique keys from both documents
        const allKeys = new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)]);
        for (const key of allKeys) {
            const fieldPath = prefix ? `${prefix}.${key}` : key;
            const oldValue = oldDoc[key];
            const newValue = newDoc[key];
            // Skip metadata fields that change automatically
            if (['createdAt', 'updatedAt', 'saveCount'].includes(key)) {
                continue;
            }
            // Handle nested objects
            if (typeof oldValue === 'object' && oldValue !== null &&
                typeof newValue === 'object' && newValue !== null &&
                !Array.isArray(oldValue) && !Array.isArray(newValue) &&
                !(oldValue instanceof Date) && !(newValue instanceof Date)) {
                const nestedChanges = LogModel.createFieldDiff(oldValue, newValue, fieldPath);
                if (nestedChanges.length > 0) {
                    changes.push(...nestedChanges);
                }
                continue;
            }
            // Only log actual changes (skip cases where newValue becomes undefined/null from a defined value)
            // This handles partial updates where only some fields are provided
            if (oldValue !== newValue) {
                // Skip if new value is undefined and old value was defined (partial update)
                if (newValue === undefined && oldValue !== undefined) {
                    continue;
                }
                // Skip if both are falsy but different types (e.g., null vs undefined)
                if (!oldValue && !newValue && oldValue !== newValue) {
                    continue;
                }

                changes.push([fieldPath, oldValue, newValue]);
            }
        }
        return changes;
    }

    /**
     * Format value for display in diff
     * @param {*} value - Value to format
     * @returns {string} Formatted value
     */
    static formatValue(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (value === '') return '""';
        if (typeof value === 'string') return `"${value}"`;
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    /**
     * Create a new log entry
     * @param {object} logData - Log entry data
     * @returns {Promise<object>} Created log entry with _id
     */
    static async create(logData) {
        // Validate input
        const validation = LogModel.validate(logData);
        if (!validation.success) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        // Apply defaults
        const doc = LogModel.applyDefaults(logData);
        try {
            const collection = LogModel.getCollection();
            const result = await collection.insertOne(doc);
            return {
                _id: result.insertedId,
                ...doc
            };
        } catch (error) {
            throw new Error(`Failed to create log entry: ${error.message}`);
        }
    }

    /**
     * Find log entries with optional query
     * @param {object} query - MongoDB query object
     * @param {object} options - Query options (sort, limit, skip)
     * @returns {Promise<array>} Array of log entries
     */
    static async find(query = {}, options = {}) {
        try {
            const collection = LogModel.getCollection();
            // Default sort by createdAt descending (newest first)
            const defaultOptions = {
                sort: { createdAt: -1 },
                limit: 100,
                ...options
            };
            const cursor = collection.find(query, defaultOptions);
            return await cursor.toArray();
        } catch (error) {
            throw new Error(`Failed to find log entries: ${error.message}`);
        }
    }

    /**
     * Search log entries using schema-based query building
     * @param {object} queryParams - URI query parameters
     * @param {object} options - Query options
     * @returns {Promise<object>} Search results with metadata
     */
    static async search(queryParams, options = {}) {
        try {
            // Build MongoDB query from URI parameters
            const ignoreFields = ['limit', 'skip', 'sort', 'page'];
            const query = CommonUtils.schemaBasedQuery(LogModel.schema, queryParams, ignoreFields);
            // Handle pagination
            const limit = Math.min(parseInt(queryParams.limit) || 50, 1000);
            const skip = parseInt(queryParams.skip) || 0;
            const page = parseInt(queryParams.page) || 1;
            if (page > 1) {
                options.skip = (page - 1) * limit;
            } else if (skip > 0) {
                options.skip = skip;
            }
            options.limit = limit;
            // Handle sorting
            if (queryParams.sort) {
                const sortField = queryParams.sort.startsWith('-') ?
                    queryParams.sort.substring(1) : queryParams.sort;
                const sortOrder = queryParams.sort.startsWith('-') ? -1 : 1;
                options.sort = { [sortField]: sortOrder };
            }
            // Execute search
            const results = await LogModel.find(query, options);
            // Get total count for pagination
            const collection = LogModel.getCollection();
            const totalCount = await collection.countDocuments(query);
            return {
                success: true,
                data: results,
                pagination: {
                    total: totalCount,
                    limit,
                    skip: options.skip || 0,
                    page: Math.floor((options.skip || 0) / limit) + 1,
                    pages: Math.ceil(totalCount / limit)
                },
                query: query
            };
        } catch (error) {
            throw new Error(`Failed to search log entries: ${error.message}`);
        }
    }

    /**
     * Log a document change (create, update, delete)
     * @param {string} docType - Type of document ('config', 'user', etc.)
     * @param {string} action - Action performed ('create', 'update', 'delete')
     * @param {*} docId - Document ID
     * @param {object} oldDoc - Original document (for updates/deletes)
     * @param {object} newDoc - New document (for creates/updates)
     * @param {string} createdBy - User who performed the action
     * @returns {Promise<object>} Created log entry
     */
    static async logChange(docType, action, docId, oldDoc = null, newDoc = null, createdBy = '') {
        let changes = [];
        if (action === 'create') {
            changes = [['action', null, 'created']];
        } else if (action === 'delete') {
            changes = [['action', 'exists', 'deleted']];
        } else if (action === 'update' && oldDoc && newDoc) {
            changes = LogModel.createFieldDiff(oldDoc, newDoc);
        }
        const logData = {
            data: {
                docId,
                docType,
                action,
                changes
            },
            createdBy
        };
        return await LogModel.create(logData);
    }
}

export default LogModel;

// EOF webapp/model/log.js
