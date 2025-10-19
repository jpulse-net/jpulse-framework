/**
 * @name            jPulse Framework / WebApp / Utils / Common
 * @tagline         Common Utilities for jPulse Framework WebApp
 * @description     Shared utility functions used across the jPulse Framework WebApp
 * @file            webapp/utils/common.js
 * @version         0.9.7
 * @release         2025-10-12
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

/**
 * Common Utilities - shared functions for the jPulse Framework
 *
 * This module provides utility functions that can be used across models,
 * controllers, and other components of the framework.
 */
class CommonUtils {

    /**
     * Create schema-based MongoDB query from URI parameters
     *
     * Converts URI query parameters into a MongoDB query object based on
     * schema field types. Supports various data types and query patterns.
     *
     * @param {object} schema - Schema definition for field types
     * @param {object} queryParams - URI query parameters
     * @param {array} ignoreFields - Fields to ignore in query building (default: [])
     * @returns {object} MongoDB query object
     *
     * @example
     * const schema = {
     *   name: { type: 'string' },
     *   age: { type: 'number' },
     *   active: { type: 'boolean' },
     *   createdAt: { type: 'date' },
     *   status: { type: 'string', enum: ['active', 'inactive'] }
     * };
     *
     * const params = { name: 'john*', age: '25', active: 'true' };
     * const query = CommonUtils.schemaBasedQuery(schema, params);
     * // Returns: {
     * //   name: { $regex: /john.*\/i },
     * //   age: 25,
     * //   active: true
     * // }
     */
    static schemaBasedQuery(schema, queryParams, ignoreFields = []) {
        const query = {};

        // Handle null/undefined queryParams
        if (!queryParams || typeof queryParams !== 'object') {
            return query;
        }

        for (const [key, value] of Object.entries(queryParams)) {
            // Skip empty values and ignored fields
            if (ignoreFields.includes(key) || !value || (typeof value === 'string' && value.trim() === '')) continue;

            // Get field schema information
            const fieldSchema = CommonUtils.getFieldSchema(schema, key);
            if (!fieldSchema) continue;

            // Build query based on field type
            if (fieldSchema.type === 'date') {
                const dateQuery = CommonUtils.buildDateQuery(value);
                if (dateQuery !== null) {
                    query[key] = dateQuery;
                }
            } else if (fieldSchema.type === 'array') {
                // Handle array fields (like roles)
                let arrayValues;
                if (typeof value === 'string' && value.includes(',')) {
                    // Handle comma-separated values like "admin,user"
                    arrayValues = value.split(',').map(v => v.trim()).filter(v => v);
                } else {
                    // Single value
                    arrayValues = [String(value).trim()];
                }

                if (fieldSchema.enum) {
                    // For enum arrays, filter valid values and check if array contains any of them
                    const validValues = arrayValues.filter(v => fieldSchema.enum.includes(v));
                    if (validValues.length > 0) {
                        query[key] = { $in: validValues };
                    }
                } else {
                    // For non-enum arrays, check if array contains any of the values
                    query[key] = { $in: arrayValues };
                }
            } else if (fieldSchema.enum) {
                // Handle enum fields (before string type check)
                if (fieldSchema.enum.includes(value)) {
                    query[key] = value;
                } else {
                    // Skip invalid enum values
                    continue;
                }
            } else if (fieldSchema.type === 'string') {
                // Ensure value is a string before processing
                const stringValue = String(value);
                // Support partial string matching with wildcards
                if (stringValue.includes('*') || stringValue.includes('%')) {
                    const regex = stringValue.replace(/[*%]/g, '.*');
                    query[key] = { $regex: new RegExp(regex, 'i') };
                } else {
                    // Case-insensitive partial matching for strings (including email)
                    query[key] = { $regex: new RegExp(stringValue, 'i') };
                }
            } else if (fieldSchema.type === 'number') {
                const num = parseFloat(value);
                if (!isNaN(num) && isFinite(num)) {
                    query[key] = num;
                }
            } else if (fieldSchema.type === 'boolean') {
                query[key] = value.toLowerCase() === 'true';
            } else {
                // Default to exact match for unknown types
                query[key] = value;
            }
        }

        return query;
    }

    /**
     * Get field schema from nested schema definition
     *
     * Traverses a nested schema object using dot notation to find
     * the schema definition for a specific field path.
     *
     * @param {object} schema - Schema definition
     * @param {string} fieldPath - Dot-notation field path (e.g., 'data.email.adminEmail')
     * @returns {object|null} Field schema or null if not found
     *
     * @example
     * const schema = {
     *   data: {
     *     email: {
     *       adminEmail: { type: 'string', validate: 'email' }
     *     }
     *   }
     * };
     *
     * const fieldSchema = CommonUtils.getFieldSchema(schema, 'data.email.adminEmail');
     * // Returns: { type: 'string', validate: 'email' }
     */
    static getFieldSchema(schema, fieldPath) {
        const parts = fieldPath.split('.');
        let current = schema;

        for (const part of parts) {
            if (current && typeof current === 'object' && current[part]) {
                current = current[part];
            } else {
                return null;
            }
        }

        // Return the schema if it has a type property, null otherwise
        return current && current.type ? current : null;
    }

    /**
     * Build MongoDB date query from string value
     *
     * Converts various date string formats into MongoDB date range queries.
     * Supports year, year-month, and full date formats.
     *
     * @param {string} value - Date string in various formats
     * @returns {object|null} MongoDB date query or null if invalid
     *
     * @example
     * CommonUtils.buildDateQuery('2025');        // Year range
     * CommonUtils.buildDateQuery('2025-08');     // Month range
     * CommonUtils.buildDateQuery('2025-08-24');  // Day range
     */
    static buildDateQuery(value) {
        // Handle different date formats
        if (/^\d{4}$/.test(value)) {
            // Year only: 2025
            const year = parseInt(value);
            return {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            };
        } else if (/^\d{4}-\d{2}$/.test(value)) {
            // Year-Month: 2025-08
            const [year, month] = value.split('-').map(Number);
            return {
                $gte: new Date(year, month - 1, 1),
                $lt: new Date(year, month, 1)
            };
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            // Full date: 2025-08-24
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return null;
            }
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            return {
                $gte: date,
                $lt: nextDay
            };
        } else {
            // Try to parse as full date/time
            const date = new Date(value);
            if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 3000) {
                return date;
            }
        }

        return null;
    }

    /**
     * Deep merge objects
     *
     * Recursively merges multiple objects, with later objects taking precedence.
     * Arrays are replaced, not merged.
     *
     * @param {...object} objects - Objects to merge
     * @returns {object} Merged object
     *
     * @example
     * const base = { a: 1, b: { x: 1, y: 2 } };
     * const override = { b: { y: 3, z: 4 }, c: 5 };
     * const result = CommonUtils.deepMerge(base, override);
     * // Returns: { a: 1, b: { x: 1, y: 3, z: 4 }, c: 5 }
     */
    static deepMerge(...objects) {
        if (objects.length === 0) return {};
        if (objects.length === 1) return objects[0];

        return CommonUtils._deepMergeRecursive({}, objects, new WeakSet());
    }

    /**
     * Internal recursive deep merge with circular reference protection
     * @private
     */
    static _deepMergeRecursive(target, objects, seen) {
        for (const obj of objects) {
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                // Check for circular references
                if (seen.has(obj)) continue;
                seen.add(obj);

                for (const [key, value] of Object.entries(obj)) {
                    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                        // Recursively merge nested objects (but not Dates)
                        target[key] = CommonUtils._deepMergeRecursive(target[key] || {}, [value], seen);
                    } else {
                        // Replace primitive values, arrays, and Date objects
                        target[key] = value;
                    }
                }

                seen.delete(obj);
            }
        }

        return target;
    }

    /**
     * Format value for console/log output
     *
     * Converts various data types into readable string format for logging.
     * Handles objects, arrays, dates, and other complex types.
     *
     * @param {*} value - Value to format
     * @returns {string} Formatted string representation
     *
     * @example
     * CommonUtils.formatValue({ name: 'test' });  // Returns: '{"name":"test"}'
     * CommonUtils.formatValue(new Date());        // Returns: '2025-08-24T23:21:00.000Z'
     * CommonUtils.formatValue([1, 2, 3]);         // Returns: '[1,2,3]'
     */
    static formatValue(value) {
        if (value === null || value === undefined) {
            return String(value);
        }

        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        return String(value);
    }

    /**
     * Generate a UUID v4
     *
     * @param {string} prefix - Optional prefix for the ID (default: '')
     * @returns {string} Unique identifier
     */
    static generateUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
        });
    }

    /**
     * Validate email format
     *
     * Simple email validation using regex pattern.
     *
     * @param {string} email - Email address to validate
     * @returns {boolean} True if valid email format
     *
     * @example
     * CommonUtils.isValidEmail('test@example.com');  // Returns: true
     * CommonUtils.isValidEmail('invalid-email');     // Returns: false
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Sanitize string for safe usage
     *
     * Removes potentially dangerous characters from strings.
     * Useful for preventing injection attacks.
     *
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     *
     * @example
     * CommonUtils.sanitizeString('<script>alert("xss")</script>');
     * // Returns: 'scriptalert("xss")/script'
     */
    static sanitizeString(str) {
        if (typeof str !== 'string') return '';

        return str
            .replace(/[<>]/g, '')           // Remove angle brackets
            .replace(/['"]/g, '')           // Remove quotes
            .replace(/[;&|`]/g, '')         // Remove command injection chars
            .trim();
    }

    /**
     * Send error response with appropriate format based on request type
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {number} statusCode - HTTP status code (404, 500, etc.)
     * @param {string} message - Error message for user
     * @param {string} code - Application error code (NOT_FOUND, INVALID_CREDENTIALS, etc.)
     * @param {string} details - Optional detailed error information for debugging
     *
     * @example
     * // For API requests: returns JSON with success: false
     * CommonUtils.sendError(req, res, 404, 'User not found', 'USER_NOT_FOUND');
     * // Returns: {"success": false, "error": "User not found", "code": "USER_NOT_FOUND", "path": "/api/1/user/123"}
     *
     * // With details for debugging
     * CommonUtils.sendError(req, res, 500, 'Validation failed', 'VALIDATION_ERROR', error.message);
     * // Returns: {"success": false, "error": "Validation failed", "code": "VALIDATION_ERROR", "details": "...", "path": "/api/1/user"}
     *
     * // For view requests: redirects to error page
     * CommonUtils.sendError(req, res, 404, 'Page not found');
     * // Redirects to: /error/index.shtml?msg=Page%20not%20found&code=404
     */
    static sendError(req, res, statusCode, message, code = null, details = null) {
        if (req.originalUrl.startsWith('/api/')) {
            // API requests get JSON error response
            const response = {
                success: false,
                error: message,
                path: req.originalUrl
            };
            if (code) {
                response.code = code;
            }
            if (details) {
                response.details = details;
            }
            return res.status(statusCode).json(response);
        } else {
            // View requests get redirected to error page
            const errorMessage = encodeURIComponent(message);
            return res.redirect(`/error/index.shtml?msg=${errorMessage}&code=${statusCode}`);
        }
    }

    /**
     * Extract context information for logging (username, IP, VM, ID)
     * @param {object} req - Express request object (optional)
     * @returns {object} Context object with username, ip, vm, id
     */
    static getLogContext(req = null) {
        const context = {
            username: '(guest)',
            ip: '0.0.0.0',
            vm: global.appConfig?.system?.serverId || 0,
            id: global.appConfig?.system?.pm2Id || 0
        };

        // Extract username from session
        if (req?.session?.user?.username) {
            context.username = req.session.user.username;
        }

        // Extract IP address from request
        if (req) {
            context.ip = req.ip ||
                       req.connection?.remoteAddress ||
                       req.socket?.remoteAddress ||
                       (req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() ||
                       '0.0.0.0';

            // Clean up IPv6 mapped IPv4 addresses
            if (context.ip.startsWith('::ffff:')) {
                context.ip = context.ip.substring(7);
            }
        }

        return context;
    }

    /**
     * Format timestamp for logging
     * @returns {string} Formatted local timezone timestamp (YYYY-MM-DD HH:MM:SS)
     */
    static formatTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    /**
     * Format log message with timestamp and context in TSV format
     * @param {string} scope - Functional scope (required)
     * @param {string} message - Log message (required)
     * @param {string} level - Log level: 'info' (default), 'warning', 'ERROR'
     * @param {object} req - Express request object (optional)
     * @returns {string} Formatted log message in TSV format:
     *                   "-\t<timestamp>\t<level>\t<username>\t<ip>\t<vm>\t<id>\t<scope>\t<message>"
     */
    static formatLogMessage(scope, message, level = 'info', req = null) {
        const timestamp = CommonUtils.formatTimestamp();
        const context = CommonUtils.getLogContext(req);
        return `-\t${timestamp}\t${level}\t${context.username}\tip:${context.ip}\tvm:${context.vm}\tid:${context.id}\t${scope}\t${message}`;
    }
}

export default CommonUtils;

// Named exports for convenience
export const {
    schemaBasedQuery,
    getFieldSchema,
    buildDateQuery,
    deepMerge,
    formatValue,
    generateUuid,
    isValidEmail,
    sanitizeString,
    sendError,
    getLogContext,
    formatTimestamp,
    formatLogMessage
} = CommonUtils;

// EOF webapp/utils/common.js
