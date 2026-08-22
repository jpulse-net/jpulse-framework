/**
 * @name            jPulse Framework / WebApp / Utils / UrlFetch
 * @tagline         Hardened URL fetch for untrusted hosts
 * @description     One framework-owned way to fetch a URL that a user, a saved configuration, or
 *                   any other untrusted input chose. SSRF defenses (DNS pin + private-address
 *                   guard), size caps on encoded and decoded bytes, per-hop redirect re-validation,
 *                   and stall/total timeouts — written once so callers do not reimplement them.
 *                   Resolves, never rejects, matching jPulse.api.call() / ws.request().
 * @usage           Usage:
 *                  const res = await UrlFetch.fetch(url);
 *                  const res = await UrlFetch.fetch(url, { as: 'json', allowedHosts: ['api.example.com'] });
 *                  const limits = UrlFetch.getEffectiveOptions({ maxBytes: 1048576 });
 * @file            webapp/utils/url-fetch.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import zlib from 'node:zlib';
import { domainToASCII } from 'node:url';
import CounterManager from './time-based-counters.js';

const DEFAULTS = {
    maxBytes: 10485760,
    timeoutMs: 30000,
    stallTimeoutMs: 10000,
    maxRedirects: 5,
    allowedSchemes: ['https', 'http'],
    blockedHosts: [],
    userAgent: '',
    allowPrivateAddresses: false,
    rateLimit: {
        limit: 60,
        windowSeconds: 60
    }
};

const HOP_BY_HOP = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    'host',
    'content-length'
]);

const DEFAULT_SENSITIVE_HEADERS = [
    'authorization',
    'cookie',
    'cookie2',
    'proxy-authorization'
];

const REDIRECT_GET = new Set([301, 302, 303]);
const REDIRECT_ALL = new Set([301, 302, 303, 307, 308]);

const PRIVATE_V4 = new net.BlockList();
PRIVATE_V4.addSubnet('0.0.0.0', 8, 'ipv4');
PRIVATE_V4.addSubnet('10.0.0.0', 8, 'ipv4');
PRIVATE_V4.addSubnet('100.64.0.0', 10, 'ipv4');
PRIVATE_V4.addSubnet('127.0.0.0', 8, 'ipv4');
PRIVATE_V4.addSubnet('169.254.0.0', 16, 'ipv4');
PRIVATE_V4.addSubnet('172.16.0.0', 12, 'ipv4');
PRIVATE_V4.addSubnet('192.0.0.0', 24, 'ipv4');
PRIVATE_V4.addSubnet('192.168.0.0', 16, 'ipv4');
PRIVATE_V4.addSubnet('198.18.0.0', 15, 'ipv4');
PRIVATE_V4.addSubnet('224.0.0.0', 4, 'ipv4');
PRIVATE_V4.addSubnet('240.0.0.0', 4, 'ipv4');

const PRIVATE_V6 = new net.BlockList();
PRIVATE_V6.addAddress('::', 'ipv6');
PRIVATE_V6.addAddress('::1', 'ipv6');
PRIVATE_V6.addSubnet('fc00::', 7, 'ipv6');
PRIVATE_V6.addSubnet('fe80::', 10, 'ipv6');
PRIVATE_V6.addSubnet('64:ff9b::', 96, 'ipv6');
PRIVATE_V6.addSubnet('ff00::', 8, 'ipv6');

const DEFAULT_DEPS = {
    lookup: dns.lookup.bind(dns),
    httpRequest: http.request,
    httpsRequest: https.request
};

function logInfo(req, scope, message) {
    global.LogController?.logInfo?.(req, scope, message);
}

function logWarning(req, scope, message) {
    global.LogController?.logWarning?.(req, scope, message);
}

function incrementCounter(name) {
    try {
        CounterManager.getCounter('urlFetch', name).increment();
    } catch {
        // counters are observability only
    }
}

function siteConfig() {
    const cfg = global.appConfig?.utils?.urlFetch || {};
    const rateLimit = cfg.rateLimit && typeof cfg.rateLimit === 'object' ? cfg.rateLimit : {};
    return {
        maxBytes: positiveNumber(cfg.maxBytes, DEFAULTS.maxBytes),
        timeoutMs: positiveNumber(cfg.timeoutMs, DEFAULTS.timeoutMs),
        stallTimeoutMs: positiveNumber(cfg.stallTimeoutMs, DEFAULTS.stallTimeoutMs),
        maxRedirects: nonNegativeNumber(cfg.maxRedirects, DEFAULTS.maxRedirects),
        allowedSchemes: parseSchemeList(cfg.allowedSchemes, DEFAULTS.allowedSchemes),
        blockedHosts: parseHostList(cfg.blockedHosts),
        userAgent: typeof cfg.userAgent === 'string' ? cfg.userAgent : DEFAULTS.userAgent,
        allowPrivateAddresses: cfg.allowPrivateAddresses === true,
        rateLimit: {
            limit: positiveNumber(rateLimit.limit, DEFAULTS.rateLimit.limit),
            windowSeconds: positiveNumber(rateLimit.windowSeconds, DEFAULTS.rateLimit.windowSeconds)
        }
    };
}

function defaultUserAgent(siteUa) {
    if (siteUa) {
        return siteUa;
    }
    const version = global.appConfig?.app?.jPulse?.version || '0';
    return `jPulse-UrlFetch/${version}`;
}

function positiveNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function nonNegativeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function minCeiling(callerVal, siteVal, { zeroOk = false } = {}) {
    if (callerVal == null || callerVal === '') {
        return siteVal;
    }
    const n = Number(callerVal);
    if (!Number.isFinite(n) || n < 0 || (!zeroOk && n === 0)) {
        return siteVal;
    }
    return Math.min(n, siteVal);
}

function parseSchemeList(value, fallback) {
    const list = Array.isArray(value)
        ? value
        : (typeof value === 'string' && value.trim() ? value.split(/[,\s]+/) : null);
    if (!list) {
        return fallback.slice();
    }
    const out = [];
    for (const item of list) {
        const scheme = String(item || '').trim().toLowerCase().replace(/:$/, '');
        if (scheme && !out.includes(scheme)) {
            out.push(scheme);
        }
    }
    return out.length ? out : fallback.slice();
}

function intersectSchemes(callerVal, siteVal) {
    if (callerVal == null || callerVal === '') {
        return siteVal.slice();
    }
    const caller = parseSchemeList(callerVal, []);
    if (!caller.length) {
        return siteVal.slice();
    }
    return siteVal.filter((s) => caller.includes(s));
}

/**
 * Split a host list that may be an array, a comma/whitespace-separated string, or nested.
 * @param {string|string[]|null|undefined} value
 * @returns {string[]}
 */
export function parseHostList(value) {
    if (value == null || value === '') {
        return [];
    }
    if (Array.isArray(value)) {
        const out = [];
        for (const item of value) {
            out.push(...parseHostList(item));
        }
        return out;
    }
    if (typeof value !== 'string') {
        return [];
    }
    return value.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean).map(normalizeHostPattern);
}

/**
 * Node's URL.hostname keeps IPv6 brackets (`[::1]`). net.isIP() does not accept them.
 * @param {string} hostname
 * @returns {string}
 */
function unbracketIpLiteral(hostname) {
    const raw = String(hostname || '').trim();
    if (raw.startsWith('[') && raw.endsWith(']') && raw.length > 2) {
        return raw.slice(1, -1);
    }
    return raw;
}

/**
 * Punycode + lowercase + strip trailing dots. Wildcard prefix `*.` is preserved.
 * IPv6 literals are returned without brackets so later net.isIP() checks work.
 * @param {string} hostname
 * @returns {string}
 */
export function normalizeHost(hostname) {
    const raw = String(hostname || '').trim().replace(/\.+$/, '');
    if (!raw) {
        return '';
    }
    const lower = raw.toLowerCase();
    const ipCandidate = unbracketIpLiteral(lower);
    if (net.isIP(ipCandidate)) {
        return ipCandidate;
    }
    try {
        const ascii = domainToASCII(lower);
        return ascii || lower;
    } catch {
        return lower;
    }
}

function normalizeHostPattern(pattern) {
    const raw = String(pattern || '').trim();
    if (raw.startsWith('*.')) {
        const rest = normalizeHost(raw.slice(2));
        return rest ? `*.${rest}` : '';
    }
    return normalizeHost(raw);
}

/**
 * Exact host, or `*.example.com` matching subdomains but not the apex.
 * @param {string} hostname
 * @param {string[]} list
 * @returns {boolean}
 */
export function hostMatchesList(hostname, list) {
    if (!list || !list.length) {
        return false;
    }
    const host = normalizeHost(hostname);
    if (!host) {
        return false;
    }
    for (const entry of list) {
        const pattern = normalizeHostPattern(entry);
        if (!pattern) {
            continue;
        }
        if (pattern.startsWith('*.')) {
            const suffix = pattern.slice(2);
            if (suffix && host !== suffix && host.endsWith(`.${suffix}`)) {
                return true;
            }
        } else if (host === pattern) {
            return true;
        }
    }
    return false;
}

function isBlockedSpecialHost(hostname) {
    const host = normalizeHost(hostname);
    if (!host) {
        return true;
    }
    if (host === 'localhost' || host.endsWith('.localhost')) {
        return true;
    }
    if (host === 'local' || host.endsWith('.local')) {
        return true;
    }
    if (host === 'internal' || host.endsWith('.internal')) {
        return true;
    }
    return false;
}

function unwrapIpv4Mapped(address) {
    const lower = String(address || '').toLowerCase();
    if (!lower.startsWith('::ffff:')) {
        return null;
    }
    const rest = lower.slice(7);
    if (net.isIPv4(rest)) {
        return rest;
    }
    const parts = rest.split(':');
    if (parts.length === 2) {
        const hi = parseInt(parts[0], 16);
        const lo = parseInt(parts[1], 16);
        if (Number.isInteger(hi) && Number.isInteger(lo) && hi >= 0 && lo >= 0 && hi <= 0xffff && lo <= 0xffff) {
            return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
        }
    }
    return null;
}

/**
 * True when `address` is a public unicast IPv4 or IPv6 address.
 * IPv4-mapped IPv6 (`::ffff:a.b.c.d`) is unwrapped and re-checked as IPv4.
 * @param {string} address
 * @returns {boolean}
 */
export function isPublicAddress(address) {
    const raw = unbracketIpLiteral(String(address || '').trim());
    if (!raw) {
        return false;
    }
    const mapped = unwrapIpv4Mapped(raw);
    if (mapped) {
        return isPublicAddress(mapped);
    }
    const kind = net.isIP(raw);
    if (kind === 4) {
        return !PRIVATE_V4.check(raw, 'ipv4');
    }
    if (kind === 6) {
        return !PRIVATE_V6.check(raw, 'ipv6');
    }
    return false;
}

function parseMediaList(value) {
    if (value == null || value === '') {
        return [];
    }
    const items = Array.isArray(value) ? value : String(value).split(/[,\s]+/);
    const out = [];
    for (const item of items) {
        const media = String(item || '').split(';')[0].trim().toLowerCase();
        if (media && !out.includes(media)) {
            out.push(media);
        }
    }
    return out;
}

/**
 * Match a response media type against accept patterns (text/*, exact, or star/star).
 * Empty `patterns` accepts anything.
 * @param {string} contentType
 * @param {string[]} patterns
 * @returns {boolean}
 */
export function matchContentType(contentType, patterns) {
    if (!patterns || !patterns.length) {
        return true;
    }
    const media = String(contentType || '').split(';')[0].trim().toLowerCase();
    if (!media) {
        return false;
    }
    for (const pattern of patterns) {
        const p = String(pattern || '').split(';')[0].trim().toLowerCase();
        if (!p) {
            continue;
        }
        if (p === '*' || p === '*/*') {
            return true;
        }
        if (p.endsWith('/*')) {
            if (media.startsWith(p.slice(0, -1))) {
                return true;
            }
            continue;
        }
        if (media === p) {
            return true;
        }
    }
    return false;
}

function parseContentType(header) {
    const raw = String(header || '');
    const parts = raw.split(';').map((s) => s.trim()).filter(Boolean);
    const mediaType = (parts[0] || '').toLowerCase();
    let charset = '';
    for (let i = 1; i < parts.length; i++) {
        const eq = parts[i].indexOf('=');
        if (eq < 1) {
            continue;
        }
        const key = parts[i].slice(0, eq).trim().toLowerCase();
        let val = parts[i].slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (key === 'charset') {
            charset = val;
        }
    }
    return { mediaType, charset };
}

function decodeText(buffer, charset) {
    const label = charset || 'utf-8';
    try {
        return new TextDecoder(label, { fatal: false, ignoreBOM: true }).decode(buffer);
    } catch {
        return new TextDecoder('utf-8', { fatal: false, ignoreBOM: true }).decode(buffer);
    }
}

function toRequestBody(body) {
    if (body == null || body === '') {
        return null;
    }
    if (Buffer.isBuffer(body)) {
        return body;
    }
    if (typeof body === 'string') {
        return Buffer.from(body, 'utf8');
    }
    if (typeof body === 'object') {
        return Buffer.from(JSON.stringify(body), 'utf8');
    }
    return Buffer.from(String(body), 'utf8');
}

function headerMap(headers) {
    const out = {};
    if (!headers || typeof headers !== 'object') {
        return out;
    }
    for (const [key, value] of Object.entries(headers)) {
        if (value == null) {
            continue;
        }
        const name = String(key).toLowerCase();
        if (HOP_BY_HOP.has(name)) {
            continue;
        }
        out[name] = value;
    }
    return out;
}

function stripSensitive(headers, sensitiveNames) {
    const out = { ...headers };
    for (const name of sensitiveNames) {
        delete out[String(name).toLowerCase()];
    }
    return out;
}

function originOf(parsed) {
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
}

function uniqueStrings(list) {
    const out = [];
    const seen = new Set();
    for (const item of list) {
        if (!item || seen.has(item)) {
            continue;
        }
        seen.add(item);
        out.push(item);
    }
    return out;
}

/**
 * Resolve the options that will actually apply: caller values only ever narrow the site ceiling.
 * @param {object} [caller={}]
 * @returns {object}
 */
export function getEffectiveOptions(caller = {}) {
    const site = siteConfig();
    const allowedSchemes = intersectSchemes(caller.allowedSchemes, site.allowedSchemes);
    const blockedHosts = uniqueStrings([
        ...site.blockedHosts,
        ...parseHostList(caller.blockedHosts)
    ]);
    const allowedHosts = parseHostList(caller.allowedHosts);
    const acceptContentTypes = parseMediaList(caller.acceptContentTypes);
    const sensitiveHeaders = uniqueStrings([
        ...DEFAULT_SENSITIVE_HEADERS,
        ...parseMediaList(caller.sensitiveHeaders)
    ]);
    let method = String(caller.method || 'GET').trim().toUpperCase();
    if (!method) {
        method = 'GET';
    }
    let as = String(caller.as || 'text').trim().toLowerCase();
    if (!as) {
        as = 'text';
    }
    return {
        method,
        as,
        allowedHosts,
        blockedHosts,
        acceptContentTypes,
        maxBytes: minCeiling(caller.maxBytes, site.maxBytes),
        timeoutMs: minCeiling(caller.timeoutMs, site.timeoutMs),
        stallTimeoutMs: minCeiling(caller.stallTimeoutMs, site.stallTimeoutMs),
        maxRedirects: minCeiling(caller.maxRedirects, site.maxRedirects, { zeroOk: true }),
        allowedSchemes,
        userAgent: defaultUserAgent(site.userAgent),
        allowPrivateAddresses: site.allowPrivateAddresses === true && caller.allowPrivateAddresses !== false,
        rateLimit: {
            limit: site.rateLimit.limit,
            windowSeconds: site.rateLimit.windowSeconds
        },
        sensitiveHeaders
    };
}

function emptyResult(started) {
    return {
        success: false,
        code: 'NETWORK_ERROR',
        error: '',
        details: {},
        status: 0,
        headers: {},
        contentType: '',
        charset: '',
        bytes: 0,
        encodedBytes: 0,
        finalUrl: '',
        redirects: [],
        elapsedMs: Math.max(0, Date.now() - started)
    };
}

function fail(started, code, error, details = {}, extra = {}) {
    return {
        ...emptyResult(started),
        success: false,
        code,
        error,
        details,
        ...extra,
        elapsedMs: Math.max(0, Date.now() - started)
    };
}

function ok(started, extra) {
    return {
        success: true,
        code: 'OK',
        error: '',
        details: {},
        status: 0,
        headers: {},
        contentType: '',
        charset: '',
        bytes: 0,
        encodedBytes: 0,
        finalUrl: '',
        redirects: [],
        ...extra,
        elapsedMs: Math.max(0, Date.now() - started)
    };
}

const SSRF_CODES = new Set([
    'PRIVATE_ADDRESS',
    'HOST_BLOCKED',
    'HOST_NOT_ALLOWED',
    'CREDENTIALS_IN_URL',
    'SCHEME_NOT_ALLOWED'
]);

function redactUrl(urlString) {
    if (!urlString || typeof urlString !== 'string') {
        return '';
    }
    try {
        const parsed = new URL(urlString);
        parsed.username = '';
        parsed.password = '';
        return parsed.href;
    } catch {
        return urlString.replace(/\/\/[^/@]+@/, '//');
    }
}

function finish(req, result) {
    if (result.finalUrl) {
        result.finalUrl = redactUrl(result.finalUrl);
    }
    if (Array.isArray(result.redirects) && result.redirects.length) {
        result.redirects = result.redirects.map(redactUrl);
    }
    incrementCounter('calls');
    incrementCounter(result.code || (result.success ? 'OK' : 'NETWORK_ERROR'));
    const host = result.details?.host || (result.finalUrl ? safeHost(result.finalUrl) : '');
    const line = `${result.success ? 'ok' : 'fail'}: ${result.code} ${host} status=${result.status} bytes=${result.bytes} ${result.elapsedMs}ms`;
    if (!result.success && SSRF_CODES.has(result.code)) {
        logWarning(req, 'url-fetch.fetch', line);
    } else {
        logInfo(req, 'url-fetch.fetch', line);
    }
    return result;
}

function safeHost(urlString) {
    try {
        return normalizeHost(new URL(urlString).hostname);
    } catch {
        return '';
    }
}

/**
 * URL pre-flight: parse, scheme, credentials, special hosts, allow/block lists.
 * @param {string} urlString
 * @param {object} effective
 * @returns {{ ok: true, parsed: URL, host: string } | { ok: false, code: string, error: string, details: object }}
 */
export function preflightUrl(urlString, effective) {
    if (typeof urlString !== 'string' || !urlString.trim()) {
        return { ok: false, code: 'INVALID_URL', error: 'Invalid URL', details: {} };
    }
    let parsed;
    try {
        parsed = new URL(urlString.trim());
    } catch {
        return { ok: false, code: 'INVALID_URL', error: 'Invalid URL', details: {} };
    }
    const scheme = parsed.protocol.replace(/:$/, '').toLowerCase();
    if (!effective.allowedSchemes.includes(scheme)) {
        return {
            ok: false,
            code: 'SCHEME_NOT_ALLOWED',
            error: `Scheme not allowed: ${scheme} (utils.urlFetch.allowedSchemes)`,
            details: { scheme, allowed: effective.allowedSchemes }
        };
    }
    if (parsed.username !== '' || parsed.password !== '') {
        return {
            ok: false,
            code: 'CREDENTIALS_IN_URL',
            error: 'Embedded credentials in URL are not allowed',
            details: { host: normalizeHost(parsed.hostname) }
        };
    }
    const host = normalizeHost(parsed.hostname);
    if (!host) {
        return { ok: false, code: 'INVALID_URL', error: 'Invalid URL', details: {} };
    }
    if (isBlockedSpecialHost(host)) {
        return {
            ok: false,
            code: 'HOST_BLOCKED',
            error: `Host blocked: ${host}`,
            details: { host }
        };
    }
    if (hostMatchesList(host, effective.blockedHosts)) {
        return {
            ok: false,
            code: 'HOST_BLOCKED',
            error: `Host blocked: ${host}`,
            details: { host }
        };
    }
    if (effective.allowedHosts.length && !hostMatchesList(host, effective.allowedHosts)) {
        return {
            ok: false,
            code: 'HOST_NOT_ALLOWED',
            error: `Host not allowed: ${host}`,
            details: { host }
        };
    }
    parsed.hostname = host;
    return { ok: true, parsed, host };
}

function lookupAll(hostname) {
    return new Promise((resolve, reject) => {
        UrlFetch._deps.lookup(hostname, { all: true }, (err, addresses) => {
            if (err) {
                reject(err);
                return;
            }
            if (Array.isArray(addresses)) {
                resolve(addresses);
                return;
            }
            resolve([{ address: addresses, family: 4 }]);
        });
    });
}

async function resolveAndPin(host, effective) {
    if (net.isIP(host)) {
        const family = net.isIPv6(host) ? 6 : 4;
        if (!effective.allowPrivateAddresses && !isPublicAddress(host)) {
            return {
                ok: false,
                code: 'PRIVATE_ADDRESS',
                error: `Private or non-public address: ${host} (${host}). For local development set utils.urlFetch.allowPrivateAddresses to true`,
                details: { host, address: host }
            };
        }
        return { ok: true, pinned: { address: host, family } };
    }
    let records;
    try {
        records = await lookupAll(host);
    } catch (err) {
        return {
            ok: false,
            code: 'DNS_FAILED',
            error: `DNS lookup failed for ${host}`,
            details: { host, cause: err?.code || err?.message || String(err) }
        };
    }
    if (!records || !records.length) {
        return {
            ok: false,
            code: 'DNS_FAILED',
            error: `DNS lookup failed for ${host}`,
            details: { host }
        };
    }
    if (!effective.allowPrivateAddresses) {
        for (const rec of records) {
            const address = rec.address || rec;
            if (!isPublicAddress(address)) {
                return {
                    ok: false,
                    code: 'PRIVATE_ADDRESS',
                    error: `Private or non-public address: ${address} (${host}). For local development set utils.urlFetch.allowPrivateAddresses to true`,
                    details: { host, address }
                };
            }
        }
    }
    const first = records[0];
    const address = first.address || first;
    const family = first.family || (net.isIPv6(address) ? 6 : 4);
    return { ok: true, pinned: { address, family } };
}

function decompressStream(encoding) {
    switch (String(encoding || '').toLowerCase()) {
        case 'gzip':
        case 'x-gzip':
            return zlib.createGunzip();
        case 'deflate':
            return zlib.createInflate();
        case 'br':
            return zlib.createBrotliDecompress();
        default:
            return null;
    }
}

function copyResponseHeaders(headers) {
    const out = {};
    if (!headers) {
        return out;
    }
    for (const [key, value] of Object.entries(headers)) {
        out[String(key).toLowerCase()] = value;
    }
    return out;
}

function requestOnce(parsed, pinned, { method, headers, body, signal }) {
    return new Promise((resolve, reject) => {
        const isHttps = parsed.protocol === 'https:';
        const requestFn = isHttps ? UrlFetch._deps.httpsRequest : UrlFetch._deps.httpRequest;
        const port = parsed.port ? Number(parsed.port) : (isHttps ? 443 : 80);
        const hostname = unbracketIpLiteral(parsed.hostname);
        const reqOptions = {
            protocol: parsed.protocol,
            hostname,
            port,
            path: `${parsed.pathname}${parsed.search}`,
            method,
            headers,
            lookup: (hostname, options, cb) => {
                if (typeof options === 'function') {
                    cb = options;
                    options = {};
                }
                const family = pinned.family === 6 ? 6 : 4;
                // Node 20+ Happy Eyeballs (autoSelectFamily) calls lookup with { all: true }
                // and expects [{ address, family }, ...]. The classic form is (err, address, family).
                if (options && options.all) {
                    cb(null, [{ address: pinned.address, family }]);
                    return;
                }
                cb(null, pinned.address, family);
            }
        };
        if (isHttps && hostname && !net.isIP(hostname)) {
            reqOptions.servername = hostname;
        }

        let settled = false;
        const settle = (fn, arg) => {
            if (settled) {
                return;
            }
            settled = true;
            fn(arg);
        };

        const req = requestFn(reqOptions, (res) => {
            settle(resolve, { req, res });
        });

        req.on('error', (err) => settle(reject, err));

        const onAbort = () => {
            const err = new Error('aborted');
            err.code = 'ABORT_ERR';
            req.destroy(err);
        };
        if (signal) {
            if (signal.aborted) {
                onAbort();
            } else {
                signal.addEventListener('abort', onAbort, { once: true });
            }
        }

        if (body && method === 'POST') {
            req.write(body);
        }
        req.end();
    });
}

function destroyRes(res) {
    try {
        res.resume?.();
        res.destroy?.();
    } catch {
        // ignore
    }
}

async function readCappedBody(res, { maxBytes, stallTimeoutMs, signal, onStall }) {
    let encodedBytes = 0;
    let decodedBytes = 0;
    const chunks = [];
    const encoding = res.headers?.['content-encoding'] || res.headers?.['Content-Encoding'] || '';
    const decoder = decompressStream(encoding);

    let stallTimer = null;
    const bumpStall = () => {
        if (!stallTimeoutMs) {
            return;
        }
        if (stallTimer) {
            clearTimeout(stallTimer);
        }
        stallTimer = setTimeout(() => {
            onStall?.();
            destroyRes(res);
            decoder?.destroy?.();
        }, stallTimeoutMs);
    };
    bumpStall();

    const tooLarge = (bytes) => {
        const err = new Error('RESPONSE_TOO_LARGE');
        err.code = 'RESPONSE_TOO_LARGE';
        err.bytes = bytes;
        return err;
    };

    const checkAbort = () => {
        if (signal?.aborted) {
            const err = new Error('aborted');
            err.code = 'ABORT_ERR';
            throw err;
        }
    };

    try {
        if (decoder) {
            res.on('data', (chunk) => {
                encodedBytes += chunk.length;
                bumpStall();
                if (encodedBytes > maxBytes) {
                    destroyRes(res);
                    decoder.destroy();
                }
            });
            res.on('error', (err) => decoder.destroy(err));
            res.pipe(decoder);
            for await (const chunk of decoder) {
                checkAbort();
                decodedBytes += chunk.length;
                if (decodedBytes > maxBytes || encodedBytes > maxBytes) {
                    destroyRes(res);
                    decoder.destroy();
                    throw tooLarge(Math.max(decodedBytes, encodedBytes));
                }
                chunks.push(Buffer.from(chunk));
            }
        } else {
            for await (const chunk of res) {
                checkAbort();
                bumpStall();
                encodedBytes += chunk.length;
                decodedBytes = encodedBytes;
                if (decodedBytes > maxBytes) {
                    destroyRes(res);
                    throw tooLarge(decodedBytes);
                }
                chunks.push(Buffer.from(chunk));
            }
        }
    } finally {
        if (stallTimer) {
            clearTimeout(stallTimer);
        }
    }

    return {
        buffer: chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0),
        encodedBytes,
        decodedBytes
    };
}

function populateBody(result, as, buffer, charset) {
    result.bytes = buffer.length;
    if (as === 'buffer') {
        result.buffer = buffer;
        return result;
    }
    const text = decodeText(buffer, charset);
    if (as === 'json') {
        if (!text.trim()) {
            result.text = text;
            if (result.success) {
                result.success = false;
                result.code = 'JSON_PARSE_ERROR';
                result.error = 'Response is not valid JSON';
            }
            return result;
        }
        try {
            result.json = JSON.parse(text);
        } catch (err) {
            result.text = text;
            if (result.success) {
                result.success = false;
                result.code = 'JSON_PARSE_ERROR';
                result.error = 'Response is not valid JSON';
                result.details = { ...result.details, cause: err.message };
            }
        }
        return result;
    }
    result.text = text;
    return result;
}

class UrlFetch {
    static _deps = { ...DEFAULT_DEPS };

    static _resetDeps() {
        this._deps = { ...DEFAULT_DEPS };
    }

    static getEffectiveOptions(caller = {}) {
        return getEffectiveOptions(caller);
    }

    /**
     * Fetch an untrusted URL. Resolves, never rejects.
     * @param {string} url
     * @param {object} [options={}]
     * @returns {Promise<object>}
     */
    static async fetch(url, options = {}) {
        const started = Date.now();
        const req = options.req || options.ctx || null;
        try {
            const result = await UrlFetch._fetchInternal(url, options, started);
            return finish(req, result);
        } catch (err) {
            return finish(req, fail(started, 'NETWORK_ERROR', `Network error: ${err?.message || err}`, {
                cause: err?.message || String(err)
            }));
        }
    }

    static async _fetchInternal(url, options, started) {
        const req = options.req || options.ctx || null;
        const effective = getEffectiveOptions(options);

        if (effective.method !== 'GET' && effective.method !== 'POST') {
            return fail(started, 'METHOD_NOT_ALLOWED',
                `Method not allowed: ${effective.method} (GET or POST only)`,
                { method: effective.method });
        }
        if (effective.as !== 'text' && effective.as !== 'json' && effective.as !== 'buffer') {
            return fail(started, 'INVALID_OPTIONS',
                `Invalid as: ${effective.as} (text, json, or buffer)`,
                { as: effective.as });
        }
        if (!effective.allowedSchemes.length) {
            return fail(started, 'SCHEME_NOT_ALLOWED',
                'Scheme not allowed: (empty allowedSchemes after intersecting with utils.urlFetch.allowedSchemes)',
                { scheme: '', allowed: [] });
        }

        if (options.rateLimitKey) {
            const rm = global.RedisManager;
            if (rm?.cacheCheckRateLimit) {
                const rl = await rm.cacheCheckRateLimit(
                    'utils:urlFetch:rateLimit:fetch',
                    String(options.rateLimitKey),
                    {
                        limit: effective.rateLimit.limit,
                        windowSeconds: effective.rateLimit.windowSeconds
                    }
                );
                if (!rl.allowed) {
                    const retryAfterMs = rl.retryAfter || 0;
                    return fail(started, 'RATE_LIMIT_EXCEEDED',
                        `Rate limit exceeded; retry after ${retryAfterMs}ms`,
                        { retryAfterMs });
                }
            }
        }

        const ac = new AbortController();
        const totalTimer = setTimeout(() => {
            const err = new Error('timeout');
            err.phase = 'total';
            ac.abort(err);
        }, effective.timeoutMs);

        let stallPhase = false;
        const onStall = () => {
            stallPhase = true;
            const err = new Error('timeout');
            err.phase = 'stall';
            ac.abort(err);
        };

        const onCallerAbort = () => {
            const err = new Error('aborted');
            err.phase = 'caller';
            ac.abort(err);
        };
        if (options.signal) {
            if (options.signal.aborted) {
                onCallerAbort();
            } else {
                options.signal.addEventListener('abort', onCallerAbort, { once: true });
            }
        }

        const timeoutFail = (host = '') => {
            const phase = stallPhase || ac.signal.reason?.phase === 'stall' ? 'stall' : 'total';
            return fail(started, 'REQUEST_TIMEOUT',
                `Request timed out after ${effective.timeoutMs}ms (${phase})`,
                { timeoutMs: effective.timeoutMs, phase, host });
        };

        try {
            let currentUrl = String(url || '').trim();
            let method = effective.method;
            let body = method === 'POST' ? toRequestBody(options.body) : null;
            let headers = headerMap(options.headers);
            if (!Object.keys(headers).some((k) => k.toLowerCase() === 'user-agent')) {
                headers['user-agent'] = effective.userAgent;
            }
            if (body && method === 'POST') {
                headers['content-length'] = String(body.length);
                if (typeof options.body === 'object' && !Buffer.isBuffer(options.body) && typeof options.body !== 'string') {
                    if (!headers['content-type']) {
                        headers['content-type'] = 'application/json';
                    }
                }
            }

            const redirects = [];
            let hops = 0;

            while (true) {
                if (ac.signal.aborted) {
                    return timeoutFail(safeHost(currentUrl));
                }

                const pre = preflightUrl(currentUrl, effective);
                if (!pre.ok) {
                    return fail(started, pre.code, pre.error, pre.details, { finalUrl: currentUrl, redirects });
                }
                const { parsed, host } = pre;

                const pin = await resolveAndPin(host, effective);
                if (!pin.ok) {
                    return fail(started, pin.code, pin.error, pin.details, { finalUrl: currentUrl, redirects });
                }

                if (ac.signal.aborted) {
                    return timeoutFail(host);
                }

                let hop;
                try {
                    hop = await requestOnce(parsed, pin.pinned, {
                        method,
                        headers,
                        body: method === 'POST' ? body : null,
                        signal: ac.signal
                    });
                } catch (err) {
                    if (ac.signal.aborted || err?.code === 'ABORT_ERR') {
                        if (options.signal?.aborted && !stallPhase && ac.signal.reason?.phase === 'caller') {
                            return fail(started, 'NETWORK_ERROR', 'Network error: aborted',
                                { cause: 'aborted', host }, { finalUrl: currentUrl, redirects });
                        }
                        return timeoutFail(host);
                    }
                    return fail(started, 'NETWORK_ERROR', `Network error: ${err?.message || err}`,
                        { cause: err?.message || String(err), host }, { finalUrl: currentUrl, redirects });
                }

                const { res } = hop;
                const status = Number(res.statusCode) || 0;
                const respHeaders = copyResponseHeaders(res.headers);
                const { mediaType, charset } = parseContentType(respHeaders['content-type']);

                if (REDIRECT_ALL.has(status)) {
                    const location = respHeaders.location;
                    if (location && hops < effective.maxRedirects) {
                        destroyRes(res);
                        let nextUrl;
                        try {
                            nextUrl = new URL(location, parsed).href;
                        } catch {
                            return fail(started, 'INVALID_URL', 'Invalid URL',
                                { host }, { status, headers: respHeaders, finalUrl: currentUrl, redirects });
                        }
                        hops += 1;
                        redirects.push(nextUrl);
                        let nextParsed;
                        try {
                            nextParsed = new URL(nextUrl);
                        } catch {
                            return fail(started, 'INVALID_URL', 'Invalid URL',
                                { host }, { status, headers: respHeaders, finalUrl: currentUrl, redirects });
                        }
                        if (originOf(parsed) !== originOf(nextParsed)) {
                            headers = stripSensitive(headers, effective.sensitiveHeaders);
                        }
                        if (REDIRECT_GET.has(status)) {
                            method = 'GET';
                            body = null;
                            delete headers['content-length'];
                            delete headers['content-type'];
                        }
                        currentUrl = nextUrl;
                        continue;
                    }
                    if (location && hops >= effective.maxRedirects) {
                        destroyRes(res);
                        const chain = [...redirects, String(location)];
                        return fail(started, 'TOO_MANY_REDIRECTS',
                            `Too many redirects: ${effective.maxRedirects} (utils.urlFetch.maxRedirects)`,
                            { redirects: chain, limit: effective.maxRedirects, host },
                            { status, headers: respHeaders, finalUrl: currentUrl, redirects: chain });
                    }
                }

                if (effective.acceptContentTypes.length && !matchContentType(respHeaders['content-type'], effective.acceptContentTypes)) {
                    destroyRes(res);
                    return fail(started, 'CONTENT_TYPE_NOT_ALLOWED',
                        `Content type not allowed: ${respHeaders['content-type'] || '(none)'}`,
                        { contentType: respHeaders['content-type'] || '', allowed: effective.acceptContentTypes, host },
                        { status, headers: respHeaders, contentType: mediaType, charset, finalUrl: currentUrl, redirects });
                }

                const contentLength = parseInt(respHeaders['content-length'], 10);
                if (Number.isFinite(contentLength) && contentLength > effective.maxBytes) {
                    destroyRes(res);
                    return fail(started, 'RESPONSE_TOO_LARGE',
                        `Response too large: ${contentLength} > ${effective.maxBytes} bytes (utils.urlFetch.maxBytes)`,
                        { bytes: contentLength, limit: effective.maxBytes, host },
                        { status, headers: respHeaders, contentType: mediaType, charset, finalUrl: currentUrl, redirects });
                }

                let bodyRead;
                try {
                    bodyRead = await readCappedBody(res, {
                        maxBytes: effective.maxBytes,
                        stallTimeoutMs: effective.stallTimeoutMs,
                        signal: ac.signal,
                        onStall
                    });
                } catch (err) {
                    destroyRes(res);
                    if (err?.code === 'RESPONSE_TOO_LARGE') {
                        return fail(started, 'RESPONSE_TOO_LARGE',
                            `Response too large: ${err.bytes} > ${effective.maxBytes} bytes (utils.urlFetch.maxBytes)`,
                            { bytes: err.bytes, limit: effective.maxBytes, host },
                            { status, headers: respHeaders, contentType: mediaType, charset, finalUrl: currentUrl, redirects });
                    }
                    if (ac.signal.aborted || err?.code === 'ABORT_ERR') {
                        if (options.signal?.aborted && ac.signal.reason?.phase === 'caller') {
                            return fail(started, 'NETWORK_ERROR', 'Network error: aborted',
                                { cause: 'aborted', host },
                                { status, headers: respHeaders, finalUrl: currentUrl, redirects });
                        }
                        return timeoutFail(host);
                    }
                    return fail(started, 'NETWORK_ERROR', `Network error: ${err?.message || err}`,
                        { cause: err?.message || String(err), host },
                        { status, headers: respHeaders, finalUrl: currentUrl, redirects });
                }

                const extra = {
                    status,
                    headers: respHeaders,
                    contentType: mediaType,
                    charset,
                    bytes: bodyRead.decodedBytes,
                    encodedBytes: bodyRead.encodedBytes,
                    finalUrl: currentUrl,
                    redirects
                };

                if (status < 200 || status >= 300) {
                    const result = fail(started, 'UPSTREAM_ERROR',
                        `Upstream responded with HTTP ${status}`,
                        { status, host }, extra);
                    return populateBody(result, effective.as, bodyRead.buffer, charset);
                }

                const result = ok(started, extra);
                return populateBody(result, effective.as, bodyRead.buffer, charset);
            }
        } finally {
            clearTimeout(totalTimer);
            if (options.signal) {
                options.signal.removeEventListener('abort', onCallerAbort);
            }
        }
    }
}

(async () => {
    try {
        const MetricsRegistry = (await import('./metrics-registry.js')).default;
        if (!MetricsRegistry.isRegistered?.('urlFetch')) {
            MetricsRegistry.register('urlFetch', () => {
                const stats = CounterManager.getGroupStats('urlFetch');
                return {
                    component: 'UrlFetch',
                    status: 'ok',
                    stats,
                    meta: {
                        ttl: 15000,
                        category: 'util'
                    }
                };
            }, {
                async: false,
                category: 'util'
            });
        }
    } catch {
        // MetricsRegistry might not be available yet
    }
})();

export default UrlFetch;
export { UrlFetch };

// EOF webapp/utils/url-fetch.js
