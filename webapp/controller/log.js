/**
 * @name            Bubble Framework / WebApp / Controller / Log
 * @tagline         Log Controller for Bubble Framework WebApp
 * @description     This is the log controller for the Bubble Framework WebApp
 * @file            webapp/controller/log.js
 * @version         0.1.3
 * @release         2025-08-24
 * @repository      https://github.com/peterthoeny/bubble-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import LogModel from '../model/log.js';
import os from 'os';

/**
 * Log Controller - handles /api/1/log/* REST API endpoints and logging utilities
 */
class LogController {

    /**
     * Search log entries
     * GET /api/1/log/search
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async search(req, res) {
        try {
            LogController.consoleApi(req, `log.search( ${JSON.stringify(req.query)} )`);

            const results = await LogModel.search(req.query);

            res.json({
                success: true,
                message: `Found ${results.data.length} log entries`,
                ...results
            });

        } catch (error) {
            LogController.error(req, `Log search failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Internal server error while searching logs',
                code: 'SEARCH_ERROR',
                details: error.message
            });
        }
    }

    /**
     * Get context information from request and environment
     * @param {object} req - Express request object
     * @returns {object} Context information
     */
    static getContext(req = null) {
        const context = {
            loginId: '(guest)',
            ip: '0.0.0.0',
            vm: 0,
            id: 0
        };

        // Extract login ID from session
        if (req?.session?.username) {
            context.loginId = req.session.username;
        }

        // Extract IP address from request
        if (req) {
            context.ip = req.ip || 
                       req.connection?.remoteAddress || 
                       req.socket?.remoteAddress ||
                       (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
                       '0.0.0.0';

            // Clean up IPv6 mapped IPv4 addresses
            if (context.ip.startsWith('::ffff:')) {
                context.ip = context.ip.substring(7);
            }
        }

        // Extract VM number from hostname
        try {
            const hostname = os.hostname();
            const vmMatch = hostname.match(/(\d+)$/);
            if (vmMatch) {
                context.vm = parseInt(vmMatch[1]);
            }
        } catch (error) {
            // Ignore hostname errors
        }

        // Extract pm2 instance ID
        if (process.env.pm_id) {
            context.id = parseInt(process.env.pm_id) || 0;
        } else if (process.env.NODE_APP_INSTANCE) {
            context.id = parseInt(process.env.NODE_APP_INSTANCE) || 0;
        }

        return context;
    }

    /**
     * Format timestamp for logging
     * @returns {string} Formatted timestamp (YYYY-MM-DD HH:MM:SS)
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
     * Console logging with unified format
     * Format: "- YYYY-MM-DD HH:MM:SS, msg, loginId, ip:1.2.3.4, vm:123, id:8, actual message text"
     * @param {object} req - Express request object
     * @param {string} message - Message to log
     */
    static console(req, message) {
        const timestamp = LogController.formatTimestamp();
        const context = LogController.getContext(req);
        const logLine = `- ${timestamp}, msg, ${context.loginId}, ip:${context.ip}, vm:${context.vm}, id:${context.id}, ${message}`;
        console.log(logLine);
    }

    /**
     * Console logging for initial API or page requests
     * Format: "==YYYY-MM-DD HH:MM:SS, ===, loginId, ip:1.2.3.4, vm:123, id:8, === actual message"
     * @param {object} req - Express request object
     * @param {string} message - Message to log
     */
    static consoleApi(req, message) {
        const timestamp = LogController.formatTimestamp();
        const context = LogController.getContext(req);

        const logLine = `==${timestamp}, ===, ${context.loginId}, ip:${context.ip}, vm:${context.vm}, id:${context.id}, === ${message}`;
        console.log(logLine);
    }

    /**
     * Error logging with unified format
     * Format: "- YYYY-MM-DD HH:MM:SS, ERR, loginId, ip:1.2.3.4, vm:123, id:8, actual error message"
     * @param {object} req - Express request object
     * @param {string} error - Error message to log
     */
    static error(req, error) {
        const timestamp = LogController.formatTimestamp();
        const context = LogController.getContext(req);

        const logLine = `- ${timestamp}, ERR, ${context.loginId}, ip:${context.ip}, vm:${context.vm}, id:${context.id}, ${error}`;
        console.error(logLine);
    }

    /**
     * Log document changes to database
     * @param {object} req - Express request object
     * @param {string} docType - Document type ('config', 'user', etc.)
     * @param {string} action - Action performed ('create', 'update', 'delete')
     * @param {*} docId - Document ID
     * @param {object} oldDoc - Original document (for updates/deletes)
     * @param {object} newDoc - New document (for creates/updates)
     * @returns {Promise<object>} Created log entry
     */
    static async logChange(req, docType, action, docId, oldDoc = null, newDoc = null) {
        try {
            const context = LogController.getContext(req);
            const createdBy = context.loginId;

            // Log to database
            const logEntry = await LogModel.logChange(docType, action, docId, oldDoc, newDoc, createdBy);

            // Also log to console
            let message = `${docType} ${action}: ${docId}`;
            if (logEntry.data.changes && logEntry.data.changes.length > 0) {
                // Convert array format back to readable string for console
                const changeStrings = logEntry.data.changes.map(([field, oldVal, newVal]) => {
                    const oldStr = LogController.formatValueForConsole(oldVal);
                    const newStr = LogController.formatValueForConsole(newVal);
                    return `${field}: ${oldStr} ==> ${newStr}`;
                });
                message += ` (${changeStrings.join(', ')})`;
            }
            LogController.console(req, message);

            return logEntry;
        } catch (error) {
            LogController.error(req, `Failed to log change: ${error.message}`);
            throw error;
        }
    }

    /**
     * Format value for console display
     * @param {*} value - Value to format
     * @returns {string} Formatted value
     */
    static formatValueForConsole(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (value === '') return '""';
        if (typeof value === 'string') return `"${value}"`;
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    /**
     * Utility function to create schema-based query (exposed for other controllers)
     * @param {object} schema - Schema definition
     * @param {object} queryParams - URI query parameters
     * @param {array} ignoreFields - Fields to ignore
     * @returns {object} MongoDB query object
     */
    static schemaBasedQuery(schema, queryParams, ignoreFields = []) {
        return LogModel.schemaBasedQuery(schema, queryParams, ignoreFields);
    }
}

// Export both the class and individual functions for convenience
export default LogController;

// Named exports for direct function access
export const { search, console: logConsole, consoleApi, error: logError, logChange, schemaBasedQuery } = LogController;

// EOF log.js
