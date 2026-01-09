/**
 * @name            jPulse Framework / WebApp / Controller / Log
 * @tagline         Log Controller for jPulse Framework WebApp
 * @description     This is the log controller for the jPulse Framework WebApp
 * @file            webapp/controller/log.js
 * @version         1.4.9
 * @release         2026-01-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import LogModel from '../model/log.js';
import CommonUtils from '../utils/common.js';
import os from 'os';
import CounterManager from '../utils/time-based-counters.js';

/**
 * Log Controller - handles /api/1/log/* REST API endpoints and logging utilities
 */
class LogController {

    // Cache for docTypes with TTL
    static docTypesCache = {
        data: [],
        timestamp: 0,
        ttl: 300000 // 5 minutes
    };

    // Time-based counter for log entries (W-112)
    static entriesCounter = null;

    /**
     * Initialize LogController
     * @returns {object} LogController instance
     */
    static async initialize() {
        // LogController doesn't need complex initialization, but this provides consistency
        // Future enhancements could add log configuration, log level setup, etc.
        console.log(CommonUtils.formatLogMessage('LogController', 'Initialized and ready'));

        // Note: docTypes population happens later in postInitialize() after database is ready

        // Initialize time-based counter for log entries (W-112)
        this.entriesCounter = CounterManager.getCounter('log', 'entries');

        // Register metrics provider (W-112)
        try {
            const MetricsRegistry = (await import('../utils/metrics-registry.js')).default;
            MetricsRegistry.register('log', () => LogController.getMetrics(), {
                async: true,
                category: 'controller'
            });
        } catch (error) {
            // MetricsRegistry might not be available yet
            console.warn('LogController: Failed to register metrics provider:', error.message);
        }

        return LogController;
    }

    /**
     * Post-initialization after database is ready
     * @returns {Promise<void>}
     */
    static async postInitialize() {
        // Populate appConfig.system.docTypes after database is available
        await LogController.populateDocTypes();
    }

    /**
     * Populate appConfig.system.docTypes with caching
     * @returns {Promise<void>}
     */
    static async populateDocTypes() {
        try {
            const docTypes = await LogModel.getDistinctDocTypes();
            global.appConfig.system.docTypes = docTypes;

            // Update cache
            LogController.docTypesCache = {
                data: docTypes,
                timestamp: Date.now(),
                ttl: 300000 // 5 minutes
            };

            console.log(CommonUtils.formatLogMessage('LogController', `Populated appConfig.system.docTypes with ${docTypes.length} types: ${docTypes.join(', ')}`));
        } catch (error) {
            console.log(CommonUtils.formatLogMessage('LogController', `Failed to populate docTypes: ${error.message}`));
            global.appConfig.system.docTypes = ['config', 'user']; // Fallback
        }
    }

    /**
     * Refresh docTypes cache if needed
     * @returns {Promise<void>}
     */
    static async refreshDocTypesCache() {
        const now = Date.now();
        if (now - LogController.docTypesCache.timestamp > LogController.docTypesCache.ttl) {
            await LogController.populateDocTypes();
        }
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

            LogController.logInfo(req, 'log.search', `success: ${results.count} docs found in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.log.searchSuccess', { count: results.count });
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
     * Handle CSP violation reports
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async reportCspViolation(req, res) {
        try {
            LogController.logRequest(req, 'log.reportCspViolation', `CSP report: ${JSON.stringify(req.body).replace(/\\n/g, '').replace(/^(.{60}).*?(.{40})$/gs, '$1...$2')}`);

            let violation = {};
            let reportFormat = 'unknown';

            // Handle both CSP Level 2 (report-uri) and Level 3 (report-to) formats
            if (Array.isArray(req.body) && req.body.length > 0) {
                // CSP Level 3 Reporting API format (report-to)
                // Format: [{ type: 'csp-violation', body: {...}, ... }]
                reportFormat = 'report-to (Level 3)';
                const report = req.body[0];
                if (report.type === 'csp-violation' && report.body) {
                    violation = {
                        documentUri: report.body.documentURL || report.url,
                        violatedDirective: report.body.violatedDirective,
                        effectiveDirective: report.body.effectiveDirective,
                        blockedUri: report.body.blockedURL,
                        originalPolicy: report.body.originalPolicy,
                        sourceFile: report.body.sourceFile,
                        lineNumber: report.body.lineNumber,
                        columnNumber: report.body.columnNumber,
                        statusCode: report.body.statusCode,
                        disposition: report.body.disposition,
                        sample: report.body.sample,
                        userAgent: report.user_agent,
                        age: report.age
                    };
                }
            } else if (req.body?.['csp-report']) {
                // CSP Level 2 report-uri format
                // Format: { "csp-report": {...} }
                reportFormat = 'report-uri (Level 2)';
                const cspReport = req.body['csp-report'];
                violation = {
                    documentUri: cspReport['document-uri'],
                    violatedDirective: cspReport['violated-directive'],
                    effectiveDirective: cspReport['effective-directive'],
                    blockedUri: cspReport['blocked-uri'],
                    originalPolicy: cspReport['original-policy'],
                    sourceFile: cspReport['source-file'] || cspReport['script-sample'],
                    lineNumber: cspReport['line-number'],
                    columnNumber: cspReport['column-number'],
                    statusCode: cspReport['status-code'],
                    disposition: cspReport['disposition'],
                    referrer: cspReport['referrer']
                };
            } else {
                // Unknown format - log as-is
                reportFormat = 'unknown';
                violation = req.body;
            }

            // Add timestamp and format
            const details = {
                format: reportFormat,
                timestamp: new Date().toISOString(),
                ...violation
            };

            // Clean up undefined values for cleaner logs
            Object.keys(details).forEach(key => {
                if (details[key] === undefined) {
                    delete details[key];
                }
            });

            // Log the violation with appropriate level
            const logMessage = `CSP violation, ${reportFormat}: ${violation.violatedDirective || violation.effectiveDirective || 'unknown'} blocked ${violation.blockedUri || 'unknown'} on ${violation.documentUri || 'unknown'}, details: ${JSON.stringify(details).replace(/\\n/g, '')}`;
            LogController.logWarning(req, 'log.reportCspViolation', logMessage);

            // Respond with 204 No Content (standard for report endpoints)
            res.status(204).end();
        } catch (error) {
            LogController.logError(req, 'log.reportCspViolation', `Error handling CSP report: ${error.message}`);
            // Still return 204 to avoid browser retries
            res.status(204).end();
        }
    }

   /**
     * Unified console logging of request messages
     * Format: "==\ttimestamp\t===\tusername\tip\tvm\tid\t==scope==\tmessage"
     * @param {object} req - Express request object
     * @param {string} scope - Functional scope (e.g., 'view.load', 'user.signup')
     * @param {string} message - Message to log
     */
    static logRequest(req, scope, message) {
        // make request logs stand out more by using '====' instead of '-' and 'request'
        const logScope = `===${scope}===`;
        const logLine = CommonUtils.formatLogMessage(logScope, message, '====', req);
        console.log(logLine.replace(/^-/, '===='));

        // Track request for health metrics (exclude health endpoints to avoid recursion)
        if (global.HealthController && !scope.includes('health.')) {
            global.HealthController.trackRequest();
        }
    }

    /**
     * Unified console logging of informational messages
     * Format: "-\t<timestamp>\tinfo\t<username>\t<ip>\t<vm>\t<id>\t<scope>\t<message>"
     * @param {object} req - Express request object
     * @param {string} scope - Functional scope (e.g., 'view.load', 'user.signup')
     * @param {string} message - Message to log
     */
    static logInfo(req, scope, message) {
        const logLine = CommonUtils.formatLogMessage(scope, message, 'info', req);
        console.log(logLine);
    }

    /**
     * Unified console logging of warning messages
     * Format: "-\t<timestamp>\twarning\t<username>\t<ip>\t<vm>\t<id>\t<scope>\t<message>"
     * @param {object} req - Express request object
     * @param {string} scope - Functional scope (e.g., 'view.load', 'user.signup')
     * @param {string} error - Error message to log (should start with 'error: ' or 'warning: ')
     */
    static logWarning(req, scope, error) {
        const logLine = CommonUtils.formatLogMessage(scope, error, 'warning', req);
        console.log(logLine);
    }

    /**
     * Unified console logging of error messages
     * Format: "-\t<timestamp>\tERROR\t<username>\t<ip>\t<vm>\t<id>\t<scope>\t<message>"
     * @param {object} req - Express request object
     * @param {string} scope - Functional scope (e.g., 'view.load', 'user.signup')
     * @param {string} error - Error message to log (should start with 'error: ' or 'warning: ')
     */
    static logError(req, scope, error) {
        const logLine = CommonUtils.formatLogMessage(scope, error, 'ERROR', req);
        console.log(logLine);

        // Track error for health metrics (exclude health endpoints to avoid recursion)
        if (global.HealthController && !scope.includes('health.')) {
            global.HealthController.trackError();
        }
    }

    /**
     * Get log controller metrics (W-112)
     * @returns {Promise<Object>} Component metrics with standardized structure
     */
    static async getMetrics() {
        try {
            const logStats = await LogModel.getLogStats();
            const logCounterStats = CounterManager.getGroupStats('log');

            return {
                component: 'LogController',
                status: 'ok',
                initialized: true,
                stats: {
                    entriesLast24h: logStats.last24h || 0,
                    entriesLastHour: logCounterStats.entries?.lastHour || 0,
                    entriesTotal: logStats.total || 0,
                    docsCreated24h: logStats.byActionLast24h?.create || 0,
                    docsUpdated24h: logStats.byActionLast24h?.update || 0,
                    docsDeleted24h: logStats.byActionLast24h?.delete || 0,
                    docsCreatedTotal: logStats.byAction?.create || 0,
                    docsUpdatedTotal: logStats.byAction?.update || 0,
                    docsDeletedTotal: logStats.byAction?.delete || 0,
                    byDocType: logStats.byDocTypeLast24h || {},
                    // Hidden metrics (visualize: false)
                    byDocTypeAll: logStats.byDocType || {}
                },
                meta: {
                    ttl: 60000,  // 1 minute - database query
                    category: 'controller',
                    fields: {
                        'entriesLast24h': {
                            global: true,        // Database-backed, same across instances
                            aggregate: 'first'   // Use DB value (accurate)
                        },
                        'entriesLastHour': {
                            aggregate: 'sum',    // Sum counter across instances (per-instance tracking)
                            visualize: false     // Hide counter (use DB value instead)
                        },
                        'entriesTotal': {
                            global: true,
                            aggregate: 'first',
                            visualize: false     // Hide total (too large)
                        },
                        'docsCreated24h': {
                            global: true,
                            aggregate: 'first'   // Database-backed, same across instances
                        },
                        'docsUpdated24h': {
                            global: true,
                            aggregate: 'first'   // Database-backed, same across instances
                        },
                        'docsDeleted24h': {
                            global: true,
                            aggregate: 'first'   // Database-backed, same across instances
                        },
                        'docsCreatedTotal': {
                            global: true,
                            aggregate: 'first',
                            visualize: false     // Hide total
                        },
                        'docsUpdatedTotal': {
                            global: true,
                            aggregate: 'first',
                            visualize: false     // Hide total
                        },
                        'docsDeletedTotal': {
                            global: true,
                            aggregate: 'first',
                            visualize: false     // Hide total
                        },
                        'byDocType': {
                            global: true,
                            aggregate: false,   // Complex object, don't aggregate
                            // Dynamic fields - each docType gets sum aggregation
                        },
                        'byActionAll': {
                            global: true,
                            aggregate: false,
                            visualize: false    // Hide (use byAction instead)
                        },
                        'byDocTypeAll': {
                            global: true,
                            aggregate: false,
                            visualize: false    // Hide (use byDocType instead)
                        }
                    }
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            // If database query fails, return basic stats from counter only
            const logCounterStats = CounterManager.getGroupStats('log');
            return {
                component: 'LogController',
                status: 'error',
                initialized: true,
                stats: {
                    entriesLastHour: logCounterStats.entries?.lastHour || 0
                },
                meta: {
                    ttl: 60000,
                    category: 'controller',
                    fields: {
                        'entriesLastHour': { aggregate: 'sum' }
                    }
                },
                timestamp: new Date().toISOString()
            };
        }
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

            // Increment counter for metrics (W-112)
            this.entriesCounter.increment();

            // Refresh docTypes cache if needed (new docType might have been added)
            await LogController.refreshDocTypesCache();

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
