/**
 * @name            jPulse Framework / WebApp / Controller / Log
 * @tagline         Log Controller for jPulse Framework WebApp
 * @description     This is the log controller for the jPulse Framework WebApp
 * @file            webapp/controller/log.js
 * @version         0.8.0
 * @release         2025-09-27
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import LogModel from '../model/log.js';
import CommonUtils from '../utils/common.js';
import os from 'os';

/**
 * Log Controller - handles /api/1/log/* REST API endpoints and logging utilities
 */
class LogController {

    /**
     * Initialize LogController
     * @returns {object} LogController instance
     */
    static async initialize() {
        // LogController doesn't need complex initialization, but this provides consistency
        // Future enhancements could add log configuration, log level setup, etc.
        console.log(CommonUtils.formatLogMessage('LogController', 'Initialized and ready'));
        return LogController;
    }

    /**
     * Search log entries
     * GET /api/1/log/search
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async search(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'log.search', JSON.stringify(req.query));

            const results = await LogModel.search(req.query);
            const elapsed = Date.now() - startTime;

            LogController.logInfo(req, 'log.search', `success: completed in ${elapsed}ms`);

            const message = i18n.translate(req, 'controller.log.searchSuccess', { count: results.data.length });
            res.json({
                success: true,
                message: message,
                ...results,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'log.search', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.log.searchError');
            return global.CommonUtils.sendError(req, res, 500, message, 'SEARCH_ERROR', error.message);
        }
    }

    /**
     * Sanitize and truncate log messages
     * - Replace non-printable chars (newlines, tabs, etc.) with spaces
     * - Replace multiple spaces with single space
     * - Truncate long messages with "..." showing start and end portions
     * @param {string} message - Message to sanitize
     * @returns {string} Sanitized message
     */
    static sanitizeMessage(message) {
        if (!message || typeof message !== 'string') {
            return String(message || '');
        }

        // Replace non-printable characters with spaces
        let sanitized = message.replace(/[\r\n\t\f\v]/g, ' ');

        // Replace multiple spaces with single space
        sanitized = sanitized.replace(/\s+/g, ' ').trim();

        // Truncate if too long
        const maxLength = (typeof appConfig !== 'undefined' ? appConfig?.controller?.log?.maxMsgLength : null) || 256;
        if (sanitized.length <= maxLength) {
            return sanitized;
        }

        // Take 3/4 for start, 1/4 for end
        const startLength = Math.floor(maxLength * 0.75) - 3; // -3 for " ..."
        const endLength = Math.floor(maxLength * 0.25);

        const startPortion = sanitized.substring(0, startLength);
        const endPortion = sanitized.substring(sanitized.length - endLength);

        return `${startPortion} ... ${endPortion}`;
    }

    /**
     * Unified console logging of request messages
     * Format: "==\ttimestamp\t===\tusername\tip\tvm\tid\t==scope==\tmessage"
     * @param {object} req - Express request object
     * @param {string} scope - Functional scope (e.g., 'view.load', 'user.signup')
     * @param {string} message - Message to log
     */
    static logRequest(req, scope, message) {
        const timestamp = CommonUtils.formatTimestamp();
        const context = CommonUtils.getLogContext(req);
        const sanitizedMessage = LogController.sanitizeMessage(message);
        const logLine = `==\t${timestamp}\t===\t${context.username}\tip:${context.ip}\tvm:${context.vm}\tid:${context.id}\t==${scope}==\t${sanitizedMessage}`;
        console.log(logLine);
    }

    /**
     * Unified console logging of informational messages
     * Format: "-\ttimestamp\tmsg\tusername\tip\tvm\tid\tscope\tmessage"
     * @param {object} req - Express request object
     * @param {string} scope - Functional scope (e.g., 'view.load', 'user.signup')
     * @param {string} message - Message to log
     */
    static logInfo(req, scope, message) {
        const timestamp = CommonUtils.formatTimestamp();
        const context = CommonUtils.getLogContext(req);
        const sanitizedMessage = LogController.sanitizeMessage(message);
        const logLine = `-\t${timestamp}\tmsg\t${context.username}\tip:${context.ip}\tvm:${context.vm}\tid:${context.id}\t${scope}\t${sanitizedMessage}`;
        console.log(logLine);
    }

    /**
     * Unified error logging of error messages
     * Format: "-\ttimestamp\tERR\tusername\tip\tvm\tid\tscope\tmessage"
     * @param {object} req - Express request object
     * @param {string} scope - Functional scope (e.g., 'view.load', 'user.signup')
     * @param {string} error - Error message to log (should start with 'error: ' or 'warning: ')
     */
    static logError(req, scope, error) {
        const timestamp = CommonUtils.formatTimestamp();
        const context = CommonUtils.getLogContext(req);
        const sanitizedMessage = LogController.sanitizeMessage(error);
        const logLine = `-\t${timestamp}\tERR\t${context.username}\tip:${context.ip}\tvm:${context.vm}\tid:${context.id}\t${scope}\t${sanitizedMessage}`;
        console.log(logLine);
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
            const context = CommonUtils.getLogContext(req);
            const createdBy = context.username;

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
            LogController.logInfo(req, 'log.change', message);

            return logEntry;
        } catch (error) {
            LogController.logError(req, 'log.change', `error: Failed to log change: ${error.message}`);
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

}

// Export both the class and individual functions for convenience
export default LogController;

// Named exports for direct function access
export const { search, logConsole, logRequest, logError, logChange } = LogController;

// EOF webapp/controller/log.js
