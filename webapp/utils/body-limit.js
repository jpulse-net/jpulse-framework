/**
 * @name            jPulse Framework / WebApp / Utils / Body Limit
 * @tagline         Per-route body size limit helpers
 * @description     Parse body-parser size strings, pre-mount per-route JSON/urlencoded
 *                  parsers ahead of the global default, and turn oversize bodies into the
 *                  framework JSON error envelope.
 * @file            webapp/utils/body-limit.js
 * @version         2.0.9
 * @release         2026-09-21
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.19, Grok 4.6
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

const BODY_PARSER_NAMES = new Set(['jsonParser', 'urlencodedParser', 'rawParser', 'textParser']);
const STREAM_BODY_METHODS_BLOCKED = new Set(['get', 'head']);

/**
 * Label for startup errors: `POST /api/1/files`.
 * @param {object} route
 * @returns {string}
 */
function routeLabel(route) {
    const method = String(route?.method || '').toUpperCase() || '?';
    const routePath = route?.path || '?';
    return `${method} ${routePath}`;
}

/**
 * True when an Express layer handle is a body-parser middleware.
 * @param {Function} handle
 * @returns {boolean}
 */
function isBodyParserHandle(handle) {
    if (!handle || handle._jpulseStreamSkip) {
        return false;
    }
    return BODY_PARSER_NAMES.has(handle.name);
}

/**
 * Validate bodyMode / bodyLimit on declared routes. Throws at startup for
 * unknown bodyMode, stream without a parseable bodyLimit, or GET/HEAD + stream.
 * @param {Array<{method: string, path: string, bodyMode?: string, bodyLimit?: string|number}>} routes
 */
export function assertRouteBodyOptions(routes) {
    for (const route of routes || []) {
        const mode = route.bodyMode;
        if (mode == null || mode === '') {
            continue;
        }
        const label = routeLabel(route);
        if (mode !== 'stream') {
            throw new Error(`Invalid bodyMode '${mode}' on ${label} — expected 'stream'`);
        }
        const method = String(route.method || '').toLowerCase();
        if (STREAM_BODY_METHODS_BLOCKED.has(method)) {
            throw new Error(`bodyMode: 'stream' is not allowed on ${label}`);
        }
        if (route.bodyLimit == null || route.bodyLimit === '') {
            throw new Error(`bodyMode: 'stream' on ${label} requires bodyLimit`);
        }
        if (parseBodyLimit(route.bodyLimit) == null) {
            throw new Error(`Invalid bodyLimit '${route.bodyLimit}' on streaming route ${label}`);
        }
    }
}

/**
 * Mount a skip guard on each streaming route so global parsers leave req unread.
 * Sets req._body (body-parser's skip flag) and req.jpulseStreamMaxBytes.
 * @param {object} app - Express app
 * @param {Array<{method: string, path: string, bodyLimit: string|number, bodyMode?: string}>} routes
 * @param {{info?: Function, warn?: Function}} [log]
 */
export function mountStreamBodyGuards(app, routes, log = {}) {
    const streamRoutes = (routes || []).map((route) => ({
        ...route,
        bodyMode: route.bodyMode || 'stream'
    }));
    assertRouteBodyOptions(streamRoutes);
    for (const route of streamRoutes) {
        if (route.bodyMode !== 'stream') {
            continue;
        }
        const method = String(route.method || '').toLowerCase();
        const routePath = route.path;
        const bytes = parseBodyLimit(route.bodyLimit);
        if (typeof app[method] !== 'function') {
            throw new Error(`Cannot mount stream body guard on unsupported method ${routeLabel(route)}`);
        }
        const guard = function streamBodyGuard(req, _res, next) {
            req._body = true;
            req.jpulseStreamMaxBytes = bytes;
            next();
        };
        guard._jpulseStreamSkip = true;
        app[method](routePath, guard);
        log.info?.(`bodyMode=stream bodyLimit=${route.bodyLimit} mounted on ${method.toUpperCase()} ${routePath}`);
    }
}

/**
 * Fail startup if a streaming route is missing its skip guard or has a
 * route-scoped body-parser. Global app.use parsers are expected and are not
 * an error — the skip guard makes them no-ops via req._body.
 * @param {object} app - Express app
 * @param {Array<{method: string, path: string}>} routes
 */
export function assertStreamRouteGuards(app, routes) {
    const router = app?._router || app?.router;
    if (!routes || routes.length === 0) {
        return;
    }
    if (!router?.stack) {
        throw new Error('assertStreamRouteGuards: Express router is not ready');
    }
    for (const route of routes) {
        const method = String(route.method || '').toLowerCase();
        const routePath = route.path;
        let hasGuard = false;
        const parsers = [];
        for (const layer of router.stack) {
            if (!layer.route) {
                continue;
            }
            if (layer.route.path !== routePath) {
                continue;
            }
            if (!layer.route.methods?.[method]) {
                continue;
            }
            for (const stackLayer of layer.route.stack || []) {
                const handle = stackLayer.handle;
                if (handle?._jpulseStreamSkip) {
                    hasGuard = true;
                    continue;
                }
                if (isBodyParserHandle(handle)) {
                    parsers.push(handle.name);
                }
            }
        }
        const label = `${method.toUpperCase()} ${routePath}`;
        if (!hasGuard) {
            throw new Error(`Streaming route ${label} is missing the stream body skip guard`);
        }
        if (parsers.length > 0) {
            throw new Error(`Streaming route ${label} has a body parser mounted (${parsers.join(', ')})`);
        }
    }
}

/**
 * Mount JSON + urlencoded parsers for each route that declared bodyLimit, using
 * method+path so a later global parser sees req._body and skips.
 * Stream routes are skipped — their bodyLimit is a StreamBody cap, not a parser limit.
 * @param {object} app - Express app
 * @param {Array<{method: string, path: string, bodyLimit: string|number, bodyMode?: string}>} routes
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
        if (route.bodyMode === 'stream') {
            continue;
        }
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
    assertRouteBodyOptions,
    mountStreamBodyGuards,
    assertStreamRouteGuards,
    mountRouteBodyLimitParsers,
    handleBodyParserError
};

// EOF webapp/utils/body-limit.js
