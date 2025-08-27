/**
 * @name            jPulse Framework / WebApp / Controller / Log
 * @tagline         Log Controller for jPulse Framework WebApp
 * @description     This is the log controller for the jPulse Framework WebApp
 * @file            webapp/controller/log.js
 * @version         0.2.8
 * @release         2025-08-27
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import LogModel from '../model/log.js';
import CommonUtils from '../utils/common.js';
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
        const startTime = Date.now();
        try {
            LogController.consoleApi(req, `log.search( ${JSON.stringify(req.query)} )`);

            const results = await LogModel.search(req.query);
            const elapsed = Date.now() - startTime;

            LogController.console(req, `log.search completed in ${elapsed}ms`);

            res.json({
                success: true,
                message: `Found ${results.data.length} log entries`,
                ...results,
                elapsed
            });

        } catch (error) {
            LogController.error(req, `log.search failed: ${error.message}`);
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
        const maxLength = (typeof appConfig !== 'undefined' ? appConfig?.log?.maxMsgLength : null) || 256;
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
     * Console logging with unified format
     * Format: "- YYYY-MM-DD HH:MM:SS, msg, loginId, ip:1.2.3.4, vm:123, id:8, actual message text"
     * @param {object} req - Express request object
     * @param {string} message - Message to log
     */
    static console(req, message) {
        const timestamp = LogController.formatTimestamp();
        const context = LogController.getContext(req);
        const sanitizedMessage = LogController.sanitizeMessage(message);
        const logLine = `- ${timestamp}, msg, ${context.loginId}, ip:${context.ip}, vm:${context.vm}, id:${context.id}, ${sanitizedMessage}`;
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
        const sanitizedMessage = LogController.sanitizeMessage(message);

        const logLine = `==${timestamp}, ===, ${context.loginId}, ip:${context.ip}, vm:${context.vm}, id:${context.id}, === ${sanitizedMessage}`;
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
        const sanitizedMessage = LogController.sanitizeMessage(error);

        const logLine = `- ${timestamp}, ERR, ${context.loginId}, ip:${context.ip}, vm:${context.vm}, id:${context.id}, ${sanitizedMessage}`;
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

}

// Export both the class and individual functions for convenience
export default LogController;

// Named exports for direct function access
export const { search, console: logConsole, consoleApi, error: logError, logChange } = LogController;

// EOF webapp/controller/log.js
