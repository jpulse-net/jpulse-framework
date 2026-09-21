/**
 * @name            jPulse Framework / WebApp / Controller / Log
 * @tagline         Log Controller for jPulse Framework WebApp
 * @description     This is the log controller for the jPulse Framework WebApp
 * @file            webapp/controller/log.js
 * @version         2.0.8
 * @release         2026-09-20
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 3.20, Grok 4.6
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

    // W-243: per-area logDebug gate
    static DEBUG_CACHE_PATH = 'controller:log:debug';
    static DEBUG_CACHE_KEY = 'areas';
    static DEBUG_CHANNEL = 'controller:log:debug:changed';
    static debugState = {
        areas: [],
        expiresAt: null,
        timer: null,
        liveOverride: false
    };
    static observedAreas = new Set();
    static registeredAreas = new Map();
    static scopeAreaCache = new Map();

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

        LogController.applyBootDebugAreas({ log: true });

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
        await LogController.initializeDebugPropagation();
    }

    /**
     * Populate appConfig.system.docTypes with caching
     * @param {object} [options]
     * @param {boolean} [options.refresh=false] - TTL refresh (logDebug); boot/init stays logInfo
     * @returns {Promise<void>}
     */
    static async populateDocTypes(options = {}) {
        const isRefresh = options.refresh === true;
        try {
            const docTypes = await LogModel.getDistinctDocTypes();
            global.appConfig.system.docTypes = docTypes;

            // Update cache
            LogController.docTypesCache = {
                data: docTypes,
                timestamp: Date.now(),
                ttl: 300000 // 5 minutes
            };

            const message = `Populated appConfig.system.docTypes with ${docTypes.length} types: ${docTypes.join(', ')}`;
            if (isRefresh) {
                LogController.logDebug(null, 'log.refreshDocTypesCache', message);
            } else {
                LogController.logInfo(null, 'log.populateDocTypes', message);
            }
        } catch (error) {
            LogController.logError(null, 'log.populateDocTypes', `Failed to populate docTypes: ${error.message}`);
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
            await LogController.populateDocTypes({ refresh: true });
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
            const message = global.i18n.translate(req, 'controller.log.searchError', { error: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'SEARCH_ERROR');
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
        LogController.observeScope(scope);
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
        LogController.observeScope(scope);
        const logLine = CommonUtils.formatLogMessage(scope, message, 'info', req);
        console.log(logLine);
    }

    /**
     * Unified console logging of debug messages (W-243)
     * Format: "-\t<timestamp>\tdebug\t<username>\t<ip>\t<vm>\t<id>\t<scope>\t<message>"
     * Emitted only when the scope's area is in the live or boot debug set.
     * @param {object} req - Express request object or log context
     * @param {string} scope - Functional scope (e.g., 'websocket._localBroadcast')
     * @param {string} message - Message to log
     */
    static logDebug(req, scope, message) {
        const area = LogController.observeScope(scope);
        if (!LogController.shouldEmitDebug(scope)) {
            LogController.incrementSuppressed(area);
            return;
        }
        const logLine = CommonUtils.formatLogMessage(scope, message, 'debug', req);
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
        LogController.observeScope(scope);
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
        LogController.observeScope(scope);
        const logLine = CommonUtils.formatLogMessage(scope, error, 'ERROR', req);
        console.log(logLine);

        // Track error for health metrics (exclude health endpoints to avoid recursion)
        if (global.HealthController && !scope.includes('health.')) {
            global.HealthController.trackError();
        }
    }

    /**
     * Whether a producer should build an expensive debug message (W-243).
     * Permissive: true when the query is broader than an enabled tag
     * (`debugEnabled('handlebar')` while only `handlebar.component` is on)
     * so a guard never suppresses a line the gate would print.
     * @param {string} areaOrScope - Area or full scope
     * @returns {boolean}
     */
    static debugEnabled(areaOrScope) {
        const tags = LogController.getActiveDebugTags();
        if (tags.includes('*')) {
            return true;
        }
        if (!areaOrScope) {
            return false;
        }
        const query = String(areaOrScope);
        for (const tag of tags) {
            if (query.startsWith(tag) || tag.startsWith(query)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Normalize controller.log.debug / JPULSE_LOG_DEBUG / API body to a tag list.
     * @param {*} value - array, boolean, comma string, or '*'
     * @returns {string[]}
     */
    static normalizeDebugAreas(value) {
        if (value === true || value === '*') {
            return ['*'];
        }
        if (value === false || value == null || value === '') {
            return [];
        }
        if (Array.isArray(value)) {
            const out = [];
            for (const item of value) {
                out.push(...LogController.normalizeDebugAreas(item));
            }
            return out;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '*' || trimmed.toLowerCase() === 'true') {
                return ['*'];
            }
            if (trimmed.toLowerCase() === 'false') {
                return [];
            }
            return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
        }
        return [];
    }

    /**
     * Boot default from JPULSE_LOG_DEBUG (wins) or appConfig.controller.log.debug.
     * @returns {string[]}
     */
    static getBootDebugAreas() {
        const env = process.env.JPULSE_LOG_DEBUG;
        if (env != null && String(env).trim() !== '') {
            return LogController.normalizeDebugAreas(env);
        }
        return LogController.normalizeDebugAreas(global.appConfig?.controller?.log?.debug);
    }

    /**
     * Live-override TTL in minutes. Default 30.
     * @returns {number}
     */
    static getDebugTtlMinutes() {
        const n = Number(global.appConfig?.controller?.log?.debugTtl);
        return Number.isFinite(n) && n > 0 ? n : 30;
    }

    /**
     * Currently active debug tags (live override or boot default).
     * @returns {string[]}
     */
    static getActiveDebugTags() {
        return LogController.debugState.areas || [];
    }

    /**
     * Apply boot default (no TTL). Logs only when the set is non-empty.
     * @param {object} [options]
     * @param {boolean} [options.log]
     */
    static applyBootDebugAreas(options = {}) {
        const areas = LogController.getBootDebugAreas();
        LogController.debugState.liveOverride = false;
        const shouldLog = options.log !== false && areas.length > 0;
        LogController.applyDebugState(areas, null, { log: shouldLog });
    }

    /**
     * Replace the in-memory debug set and optional expiry timer.
     * @param {string[]} areas
     * @param {number|null} expiresAt - epoch ms
     * @param {object} [options]
     * @param {boolean} [options.log]
     */
    static applyDebugState(areas, expiresAt, options = {}) {
        const normalized = LogController.normalizeDebugAreas(areas);
        LogController.debugState.areas = normalized;
        LogController.debugState.expiresAt = expiresAt || null;
        if (LogController.debugState.timer) {
            clearTimeout(LogController.debugState.timer);
            LogController.debugState.timer = null;
        }
        if (expiresAt && expiresAt > Date.now()) {
            LogController.debugState.timer = setTimeout(() => {
                LogController.expireDebugOverride();
            }, expiresAt - Date.now());
            if (typeof LogController.debugState.timer.unref === 'function') {
                LogController.debugState.timer.unref();
            }
        }
        if (options.log) {
            if (normalized.length) {
                const mins = expiresAt ? Math.max(1, Math.round((expiresAt - Date.now()) / 60000)) : null;
                const ttlNote = mins != null ? ` (expires in ${mins}m)` : '';
                LogController.logInfo(null, 'log.setDebug',
                    `Debug areas enabled: ${normalized.join(', ')}${ttlNote}`);
            } else {
                LogController.logInfo(null, 'log.setDebug', 'Debug areas off');
            }
        }
    }

    /**
     * Live override expired — restore boot default.
     */
    static expireDebugOverride() {
        LogController.logInfo(null, 'log.setDebug', 'Debug areas expired, all off');
        LogController.applyBootDebugAreas({ log: true });
    }

    /**
     * Set live debug areas and propagate cluster-wide when Redis is up.
     * @param {*} areas - same shapes as normalizeDebugAreas
     * @param {number} [ttlMinutes]
     * @returns {Promise<{areas: string[], expiresAt: number|null}>}
     */
    static async setDebugAreas(areas, ttlMinutes) {
        const normalized = LogController.normalizeDebugAreas(areas);
        const ttl = ttlMinutes != null ? Number(ttlMinutes) : LogController.getDebugTtlMinutes();
        const safeTtl = Number.isFinite(ttl) && ttl > 0 ? ttl : LogController.getDebugTtlMinutes();
        const expiresAt = normalized.length ? Date.now() + safeTtl * 60 * 1000 : null;
        LogController.debugState.liveOverride = normalized.length > 0;
        LogController.applyDebugState(normalized, expiresAt, { log: true });

        const payload = { areas: normalized, expiresAt };
        try {
            const RM = global.RedisManager;
            if (RM?.isRedisAvailable?.()) {
                if (normalized.length && expiresAt) {
                    const ttlSec = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
                    await RM.cacheSet(LogController.DEBUG_CACHE_PATH, LogController.DEBUG_CACHE_KEY,
                        JSON.stringify(payload), { ttl: ttlSec });
                } else if (RM.cacheDel) {
                    await RM.cacheDel(LogController.DEBUG_CACHE_PATH, LogController.DEBUG_CACHE_KEY);
                }
                await RM.publishBroadcast(LogController.DEBUG_CHANNEL, payload);
            }
        } catch (error) {
            LogController.logWarning(null, 'log.setDebug',
                `warning: failed to propagate debug areas: ${error.message}`);
        }
        return { areas: normalized, expiresAt };
    }

    /**
     * Current live/boot debug set.
     * @returns {{areas: string[], expiresAt: number|null}}
     */
    static getDebugAreas() {
        return {
            areas: [...(LogController.debugState.areas || [])],
            expiresAt: LogController.debugState.expiresAt || null
        };
    }

    /**
     * Optional label/category for an area. Never required for listing or toggling.
     * @param {string} area
     * @param {object} [options]
     * @param {string} [options.label]
     * @param {string} [options.category]
     */
    static registerDebugArea(area, options = {}) {
        if (!area || typeof area !== 'string') {
            return;
        }
        LogController.registeredAreas.set(area, {
            label: options.label || area,
            category: options.category || 'framework'
        });
        LogController.observedAreas.add(area);
    }

    /**
     * Union of registry controllers, observed scopes, and registered labels.
     * @returns {Array<{area: string, source: string, label: string, suppressed: number, plugin?: string}>}
     */
    static getDebugRegistry() {
        const areas = new Map();
        const add = (area, source, plugin) => {
            if (!area) {
                return;
            }
            const existing = areas.get(area);
            const registered = LogController.registeredAreas.get(area);
            const next = {
                area,
                source: existing?.source === 'site' || existing?.source === 'plugin'
                    ? existing.source
                    : (source || registered?.category || 'framework'),
                plugin: plugin || existing?.plugin || null,
                label: registered?.label || existing?.label || area,
                suppressed: LogController.getSuppressedCount(area)
            };
            areas.set(area, next);
        };

        const controllers = global.SiteControllerRegistry?.registry?.controllers
            || global.SiteControllerRegistry?.getControllers?.();
        if (controllers) {
            const list = typeof controllers.values === 'function'
                ? controllers.values()
                : controllers;
            for (const controller of list) {
                const source = typeof controller.source === 'string' && controller.source.startsWith('plugin:')
                    ? 'plugin'
                    : (controller.source === 'site' ? 'site' : 'framework');
                const plugin = source === 'plugin' ? controller.source.slice(7) : null;
                add(controller.name, source, plugin);
            }
        }
        for (const [area, meta] of LogController.registeredAreas) {
            add(area, meta.category === 'site' || meta.category === 'plugin' ? meta.category : 'framework');
        }
        for (const area of LogController.observedAreas) {
            add(area, 'framework');
        }
        return [...areas.values()].sort((a, b) => a.area.localeCompare(b.area));
    }

    /**
     * First scope segment, memoized. A dotless scope is its own area.
     * @param {string} scope
     * @returns {string}
     */
    static scopeToArea(scope) {
        if (!scope || typeof scope !== 'string') {
            return '';
        }
        const cached = LogController.scopeAreaCache.get(scope);
        if (cached !== undefined) {
            return cached;
        }
        const dot = scope.indexOf('.');
        const area = dot === -1 ? scope : scope.slice(0, dot);
        LogController.scopeAreaCache.set(scope, area);
        return area;
    }

    /**
     * Record a scope's area for the admin list.
     * @param {string} scope
     * @returns {string} area
     */
    static observeScope(scope) {
        const area = LogController.scopeToArea(scope);
        if (area) {
            LogController.observedAreas.add(area);
        }
        return area;
    }

    /**
     * Whether logDebug should print this scope (prefix match, not the permissive guard).
     * @param {string} scope
     * @returns {boolean}
     */
    static shouldEmitDebug(scope) {
        const tags = LogController.getActiveDebugTags();
        if (tags.includes('*')) {
            return true;
        }
        const s = String(scope || '');
        for (const tag of tags) {
            if (s.startsWith(tag)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Increment the suppressed-line counter for an area.
     * @param {string} area
     */
    static incrementSuppressed(area) {
        if (!area) {
            return;
        }
        CounterManager.getCounter('log-debug', area).increment();
    }

    /**
     * Total suppressed debug lines for an area since process start.
     * @param {string} area
     * @returns {number}
     */
    static getSuppressedCount(area) {
        if (!area) {
            return 0;
        }
        return CounterManager.getCounter('log-debug', area).getStats().total || 0;
    }

    /**
     * Read a live override from Redis (join mid-window) and subscribe to changes.
     * @returns {Promise<void>}
     */
    static async initializeDebugPropagation() {
        const RM = global.RedisManager;
        if (!RM) {
            return;
        }
        try {
            if (RM.isRedisAvailable?.()) {
                const raw = await RM.cacheGet(LogController.DEBUG_CACHE_PATH, LogController.DEBUG_CACHE_KEY);
                if (raw) {
                    const stored = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    if (stored?.areas && stored.expiresAt && stored.expiresAt > Date.now()) {
                        LogController.debugState.liveOverride = true;
                        LogController.applyDebugState(stored.areas, stored.expiresAt, { log: true });
                    }
                }
            }
            if (typeof RM.registerBroadcastCallback === 'function') {
                RM.registerBroadcastCallback(LogController.DEBUG_CHANNEL, (channel, data) => {
                    if (!data) {
                        return;
                    }
                    const payload = data.areas != null ? data : (data.data || data);
                    const areas = payload.areas || [];
                    const expiresAt = payload.expiresAt || null;
                    if (expiresAt && expiresAt <= Date.now()) {
                        LogController.expireDebugOverride();
                        return;
                    }
                    LogController.debugState.liveOverride = areas.length > 0;
                    LogController.applyDebugState(areas, expiresAt, { log: true });
                }, { omitSelf: true });
            }
        } catch (error) {
            LogController.logWarning(null, 'log.setDebug',
                `warning: failed to load debug areas: ${error.message}`);
        }
    }

    /**
     * GET /api/1/log/debug — registry + current state (admin).
     * @param {object} req
     * @param {object} res
     */
    static async getDebug(req, res) {
        try {
            const state = LogController.getDebugAreas();
            res.json({
                success: true,
                data: {
                    ...state,
                    ttlMinutes: LogController.getDebugTtlMinutes(),
                    registry: LogController.getDebugRegistry()
                }
            });
        } catch (error) {
            LogController.logError(req, 'log.getDebug', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, error.message, 'DEBUG_GET_ERROR');
        }
    }

    /**
     * PUT /api/1/log/debug — set live areas (admin).
     * @param {object} req
     * @param {object} res
     */
    static async setDebug(req, res) {
        try {
            LogController.logRequest(req, 'log.setDebug', JSON.stringify({
                areas: req.body?.areas,
                ttlMinutes: req.body?.ttlMinutes
            }));
            const state = await LogController.setDebugAreas(req.body?.areas, req.body?.ttlMinutes);
            LogController.logInfo(req, 'log.setDebug',
                `success: ${state.areas.join(',') || 'off'}`);
            res.json({
                success: true,
                data: {
                    ...state,
                    ttlMinutes: LogController.getDebugTtlMinutes(),
                    registry: LogController.getDebugRegistry()
                }
            });
        } catch (error) {
            LogController.logError(req, 'log.setDebug', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, error.message, 'DEBUG_SET_ERROR');
        }
    }

    /**
     * Reset debug gate state (tests only).
     */
    static _resetDebugStateForTests() {
        if (LogController.debugState?.timer) {
            clearTimeout(LogController.debugState.timer);
        }
        LogController.debugState = {
            areas: [],
            expiresAt: null,
            timer: null,
            liveOverride: false
        };
        LogController.observedAreas = new Set();
        LogController.registeredAreas = new Map();
        LogController.scopeAreaCache = new Map();
        CounterManager.resetGroup('log-debug');
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
                    byDocTypeAll: logStats.byDocType || {},
                    debugAreas: LogController.getActiveDebugTags(),
                    debugSuppressed: CounterManager.getGroupStats('log-debug')
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
                        },
                        'debugAreas': {
                            aggregate: false,
                            visualize: false
                        },
                        'debugSuppressed': {
                            aggregate: false,
                            visualize: false
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
     * @param {string} action - Action performed ('create', 'update', 'delete', 'read')
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
     * Log that a secret field was revealed. Records who asked and which path — never the value.
     * @param {object} req - Express request object
     * @param {string} docType - Document type ('config', 'plugin', …)
     * @param {*} docId - Document ID
     * @param {string} fieldPath - Display path (e.g. 'email.smtpPass')
     * @returns {Promise<object>} Created log entry
     */
    static async logReveal(req, docType, docId, fieldPath) {
        try {
            const context = CommonUtils.getLogContext(req);
            const createdBy = context.username;
            const logEntry = await LogModel.logReveal(docType, docId, fieldPath, createdBy);
            this.entriesCounter.increment();
            await LogController.refreshDocTypesCache();
            LogController.logInfo(req, 'log.reveal', `${docType} read: ${docId} (${fieldPath})`);
            return logEntry;
        } catch (error) {
            LogController.logError(req, 'log.reveal', `error: Failed to log reveal: ${error.message}`);
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
export const { search, getDebug, setDebug, logConsole, logRequest, logError, logChange } = LogController;

// EOF webapp/controller/log.js
