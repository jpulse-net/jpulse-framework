/**
 * @name            jPulse Framework / WebApp / Utils / Body Limit
 * @tagline         Per-route body size limit helpers
 * @description     Parse body-parser size strings, pre-mount per-route JSON/urlencoded
 *                  parsers ahead of the global default, and turn oversize bodies into the
 *                  framework JSON error envelope.
 * @file            webapp/utils/body-limit.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.15, Grok 4.6
 */

import bodyParser from 'body-parser';

/** Comfortable ceiling against a 1 GB PM2 worker heap. Above this, warn at startup. */
export const BODY_LIMIT_WARN_BYTES = 25 * 1024 * 1024;

const SIZE_UNITS = {
    b: 1,
    k: 1024,
    kb: 1024,
    m: 1024 * 1024,
    mb: 1024 * 1024,
    g: 1024 * 1024 * 1024,
    gb: 1024 * 1024 * 1024
};

/**
 * Parse a body-parser-style size (`'25mb'`, `'1024'`, 1024) to bytes.
 * @param {string|number} limit
 * @returns {number|null} bytes, or null if unparseable
 */
export function parseBodyLimit(limit) {
    if (typeof limit === 'number' && Number.isFinite(limit) && limit >= 0) {
        return Math.floor(limit);
    }
    if (typeof limit !== 'string') {
        return null;
    }
    const trimmed = limit.trim();
    if (!trimmed) {
        return null;
    }
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(gb|mb|kb|g|m|k|b)?$/i);
    if (!match) {
        return null;
    }
    const n = parseFloat(match[1]);
    if (!Number.isFinite(n) || n < 0) {
        return null;
    }
    const unit = (match[2] || 'b').toLowerCase();
    return Math.round(n * SIZE_UNITS[unit]);
}

/**
 * Mount JSON + urlencoded parsers for each route that declared bodyLimit, using
 * method+path so a later global parser sees req._body and skips.
 * @param {object} app - Express app
 * @param {Array<{method: string, path: string, bodyLimit: string|number}>} routes
 * @param {object} appConfig
 * @param {{info?: Function, warn?: Function}} [log]
 */
export function mountRouteBodyLimitParsers(app, routes, appConfig, log = {}) {
    const urlencodedBase = {
        extended: true,
        ...(appConfig?.middleware?.bodyParser?.urlencoded || {})
    };
    const jsonBase = { ...(appConfig?.middleware?.bodyParser?.json || {}) };

    for (const route of routes || []) {
        const method = String(route.method || '').toLowerCase();
        const routePath = route.path;
        const bodyLimit = route.bodyLimit;
        const bytes = parseBodyLimit(bodyLimit);
        if (bytes == null) {
            log.warn?.(`Invalid bodyLimit '${bodyLimit}' on ${String(route.method || '').toUpperCase()} ${routePath} — using global default`);
            continue;
        }
        if (typeof app[method] !== 'function') {
            log.warn?.(`Cannot mount bodyLimit on unsupported method ${method} ${routePath}`);
            continue;
        }
        if (bytes > BODY_LIMIT_WARN_BYTES) {
            log.warn?.(`bodyLimit '${bodyLimit}' on ${method.toUpperCase()} ${routePath} exceeds 25mb; a body this size can consume several hundred MB per request against a 1 GB worker heap — raise max_old_space_size, max_memory_restart, client_max_body_size and client_body_timeout together`);
        }
        app[method](routePath, bodyParser.json({ ...jsonBase, limit: bodyLimit }));
        app[method](routePath, bodyParser.urlencoded({ ...urlencodedBase, limit: bodyLimit }));
        log.info?.(`bodyLimit ${bodyLimit} mounted on ${method.toUpperCase()} ${routePath}`);
    }
}

/**
 * Express error handler: body-parser oversize → JSON 413 on /api/*.
 * @param {Error} err
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
export function handleBodyParserError(err, req, res, next) {
    if (!err || (err.type !== 'entity.too.large' && err.status !== 413 && err.statusCode !== 413)) {
        return next(err);
    }
    if (global.LogController?.logWarning) {
        global.LogController.logWarning(req, 'app.bodyParser',
            `warning: request body too large (${err.length ?? '?'} > ${err.limit ?? '?'})`);
    }
    const details = (err.limit != null || err.length != null)
        ? { limit: err.limit, length: err.length }
        : null;
    const CommonUtils = global.CommonUtils;
    if (CommonUtils?.sendError) {
        return CommonUtils.sendError(req, res, 413, 'Request body too large', 'PAYLOAD_TOO_LARGE', details);
    }
    return res.status(413).json({
        success: false,
        error: 'Request body too large',
        code: 'PAYLOAD_TOO_LARGE',
        path: req.originalUrl,
        ...(details ? { details } : {})
    });
}

export default {
    BODY_LIMIT_WARN_BYTES,
    parseBodyLimit,
    mountRouteBodyLimitParsers,
    handleBodyParserError
};

// EOF webapp/utils/body-limit.js
