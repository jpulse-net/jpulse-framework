/**
 * @name            jPulse Framework / WebApp / Utils / Send Stream
 * @tagline         Stream a file-like response with ranges and RFC 5987 filenames
 * @description     One helper for byte responses: Content-Disposition, range requests,
 *                  conditional GET, and teardown of the upstream stream on client disconnect.
 * @file            webapp/utils/send-stream.js
 * @version         2.0.1
 * @release         2026-09-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.19, Grok 4.6
 */

import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const DEFAULT_MIME = 'application/octet-stream';

/**
 * @param {*} source
 * @returns {'buffer'|'factory'|'readable'|null}
 */
function sourceKind(source) {
    if (Buffer.isBuffer(source)) {
        return 'buffer';
    }
    if (typeof source === 'function') {
        return 'factory';
    }
    if (source && typeof source.pipe === 'function') {
        return 'readable';
    }
    return null;
}

/**
 * @param {number|undefined} size
 * @returns {number|null}
 */
function normalizeSize(size) {
    if (size == null || size === '') {
        return null;
    }
    const n = typeof size === 'number' ? size : Number(size);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        return null;
    }
    return n;
}

/**
 * @param {string|undefined} filename
 * @returns {string}
 */
function inferMimeType(filename) {
    if (!filename) {
        return DEFAULT_MIME;
    }
    const ext = path.extname(filename).toLowerCase();
    const map = global.appConfig?.utils?.sendStream?.contentTypes;
    if (ext && map && typeof map[ext] === 'string' && map[ext]) {
        return map[ext];
    }
    return DEFAULT_MIME;
}

/**
 * @param {string} name
 * @returns {string}
 */
function basenameOnly(name) {
    const stripped = String(name).replace(/[\r\n]/g, '');
    const parts = stripped.split(/[/\\]/);
    return parts[parts.length - 1] || 'download';
}

/**
 * @param {string} name
 * @returns {string}
 */
function asciiFallback(name) {
    const ascii = name.replace(/[^\x20-\x7E]/g, '_').replace(/\\/g, '_');
    return ascii.replace(/"/g, '\\"') || 'download';
}

/**
 * @param {string} name
 * @returns {string}
 */
function encodeRfc5987(name) {
    return encodeURIComponent(name).replace(/['()*]/g, (ch) => {
        return '%' + ch.charCodeAt(0).toString(16).toUpperCase();
    });
}

/**
 * @param {string} filename
 * @param {string} disposition
 * @returns {string}
 */
function buildContentDisposition(filename, disposition) {
    const safe = basenameOnly(filename);
    const type = disposition === 'inline' ? 'inline' : 'attachment';
    return `${type}; filename="${asciiFallback(safe)}"; filename*=UTF-8''${encodeRfc5987(safe)}`;
}

/**
 * @param {string|undefined} etag
 * @returns {string|null}
 */
function quoteEtag(etag) {
    if (etag == null || etag === '') {
        return null;
    }
    const raw = String(etag).trim();
    if ((raw.startsWith('W/"') || raw.startsWith('"')) && raw.endsWith('"')) {
        return raw;
    }
    return `"${raw.replace(/"/g, '')}"`;
}

/**
 * @param {string} etag
 * @returns {boolean}
 */
function isWeakEtag(etag) {
    return String(etag).startsWith('W/');
}

/**
 * @param {string} etag
 * @returns {string}
 */
function opaqueTag(etag) {
    let s = String(etag).trim();
    if (s.startsWith('W/')) {
        s = s.slice(2).trim();
    }
    if (s.startsWith('"') && s.endsWith('"')) {
        s = s.slice(1, -1);
    }
    return s;
}

/**
 * @param {Date|number|string|undefined} value
 * @returns {Date|null}
 */
function toDate(value) {
    if (value == null || value === '') {
        return null;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Whole-second comparison: a <= b when both are truncated to seconds.
 * @param {Date} a
 * @param {Date} b
 * @returns {boolean}
 */
function notModifiedSince(a, b) {
    return Math.floor(a.getTime() / 1000) <= Math.floor(b.getTime() / 1000);
}

/**
 * @param {string|undefined} header
 * @returns {string[]}
 */
function parseIfNoneMatch(header) {
    if (header == null || header === '') {
        return [];
    }
    return String(header).split(',').map((part) => part.trim()).filter(Boolean);
}

/**
 * Weak comparison for If-None-Match (RFC 7232).
 * @param {string} offered
 * @param {string[]} candidates
 * @returns {boolean}
 */
function ifNoneMatchHits(offered, candidates) {
    if (candidates.includes('*')) {
        return true;
    }
    const want = opaqueTag(offered);
    return candidates.some((c) => opaqueTag(c) === want);
}

/**
 * Strong comparison for If-Range. A weak offered etag never matches.
 * @param {string} offered
 * @param {string} ifRange
 * @returns {boolean}
 */
function ifRangeEtagMatches(offered, ifRange) {
    if (isWeakEtag(offered) || isWeakEtag(ifRange)) {
        return false;
    }
    return opaqueTag(offered) === opaqueTag(ifRange);
}

/**
 * @param {string} header
 * @returns {boolean}
 */
function looksLikeHttpDate(header) {
    const s = String(header).trim();
    if (s.startsWith('W/') || s.startsWith('"')) {
        return false;
    }
    return !Number.isNaN(Date.parse(s));
}

/**
 * @param {string|undefined} header
 * @param {number} size
 * @returns {{ start: number, end: number }|{ unsatisfiable: true }|null}
 */
function parseByteRange(header, size) {
    if (header == null || header === '') {
        return null;
    }
    const raw = String(header).trim();
    if (!/^bytes=/i.test(raw)) {
        return null;
    }
    const spec = raw.slice(raw.indexOf('=') + 1).trim();
    if (!spec || spec.includes(',')) {
        return null;
    }
    if (spec.startsWith('-')) {
        const digits = spec.slice(1);
        if (!/^\d+$/.test(digits)) {
            return null;
        }
        const suffix = Number.parseInt(digits, 10);
        if (suffix === 0 || size === 0) {
            return { unsatisfiable: true };
        }
        return { start: Math.max(0, size - suffix), end: size - 1 };
    }
    const m = /^(\d+)(?:-(\d*))?$/.exec(spec);
    if (!m) {
        return null;
    }
    const start = Number.parseInt(m[1], 10);
    if (m[2] === undefined || m[2] === '') {
        if (size === 0 || start >= size) {
            return { unsatisfiable: true };
        }
        return { start, end: size - 1 };
    }
    let end = Number.parseInt(m[2], 10);
    if (start > end) {
        return null;
    }
    if (size === 0 || start >= size) {
        return { unsatisfiable: true };
    }
    if (end >= size) {
        end = size - 1;
    }
    return { start, end };
}

/**
 * @param {Error} err
 * @returns {boolean}
 */
function isAbortError(err) {
    if (!err) {
        return false;
    }
    const code = err.code;
    return code === 'ERR_STREAM_PREMATURE_CLOSE'
        || code === 'ECONNRESET'
        || code === 'EPIPE'
        || err.name === 'AbortError';
}

/**
 * Destroy a Readable that will not be piped.
 * @param {*} stream
 */
function destroyUnused(stream) {
    if (stream && typeof stream.destroy === 'function') {
        stream.destroy();
    }
}

/**
 * Stream a file-like response.
 * @param {object} req
 * @param {object} res
 * @param {Buffer|function|object} source
 * @param {object} [options]
 * @param {string} [options.mimeType]
 * @param {number} [options.size]
 * @param {string} [options.filename]
 * @param {string} [options.disposition]
 * @param {string} [options.cacheControl]
 * @param {string} [options.etag]
 * @param {Date|number|string} [options.lastModified]
 * @returns {Promise<{ status: number, aborted: boolean }>}
 */
async function sendStream(req, res, source, options = {}) {
    if (res?.headersSent) {
        throw new Error('CommonUtils.sendStream: headers already sent');
    }

    const kind = sourceKind(source);
    if (!kind) {
        throw new Error('CommonUtils.sendStream: source must be a Readable, a Buffer, or a ({ start, end }) => Readable factory');
    }

    const filename = options.filename != null && options.filename !== ''
        ? String(options.filename)
        : null;
    const mimeType = options.mimeType
        || (filename ? inferMimeType(filename) : DEFAULT_MIME);
    const size = kind === 'buffer' ? source.length : normalizeSize(options.size);
    const canRange = (kind === 'factory' || kind === 'buffer') && size != null;
    const etag = quoteEtag(options.etag);
    const lastModified = toDate(options.lastModified);
    const method = String(req?.method || 'GET').toUpperCase();
    const headers = req?.headers || {};

    let status = 200;
    let range = null;

    const ifNoneMatch = parseIfNoneMatch(headers['if-none-match']);
    if (etag && ifNoneMatch.length > 0 && ifNoneMatchHits(etag, ifNoneMatch)) {
        status = 304;
    } else if (!ifNoneMatch.length && lastModified && headers['if-modified-since']) {
        const ims = toDate(headers['if-modified-since']);
        if (ims && notModifiedSince(lastModified, ims)) {
            status = 304;
        }
    }

    let honorRange = canRange && status === 200;
    if (honorRange && headers['if-range']) {
        const ifRange = String(headers['if-range']).trim();
        let matches = false;
        if (looksLikeHttpDate(ifRange)) {
            const ird = toDate(ifRange);
            matches = !!(lastModified && ird && notModifiedSince(lastModified, ird));
        } else if (etag) {
            matches = ifRangeEtagMatches(etag, ifRange);
        }
        if (!matches) {
            honorRange = false;
        }
    }

    if (honorRange) {
        const parsed = parseByteRange(headers.range, size);
        if (parsed?.unsatisfiable) {
            status = 416;
        } else if (parsed) {
            range = parsed;
            status = 206;
        }
    }

    const isHead = method === 'HEAD';
    const sendBody = !isHead && status !== 304 && status !== 416;

    let body = null;
    if (sendBody) {
        if (kind === 'buffer') {
            const start = range ? range.start : 0;
            const end = range ? range.end : size - 1;
            const slice = size === 0 ? source.subarray(0, 0) : source.subarray(start, end + 1);
            body = Readable.from(slice);
        } else if (kind === 'factory') {
            const start = range ? range.start : 0;
            const end = range ? range.end : (size != null && size > 0 ? size - 1 : undefined);
            body = source({ start, end });
            if (!body || typeof body.pipe !== 'function') {
                throw new Error('CommonUtils.sendStream: factory must return a Readable');
            }
        } else {
            body = source;
        }
    } else if (kind === 'readable') {
        destroyUnused(source);
    }

    res.statusCode = status;
    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (canRange) {
        res.setHeader('Accept-Ranges', 'bytes');
    }
    if (options.cacheControl) {
        res.setHeader('Cache-Control', String(options.cacheControl));
    }
    if (filename) {
        res.setHeader('Content-Disposition',
            buildContentDisposition(filename, options.disposition));
    }
    if (etag) {
        res.setHeader('ETag', etag);
    }
    if (lastModified) {
        res.setHeader('Last-Modified', lastModified.toUTCString());
    }
    if (status === 416) {
        res.setHeader('Content-Range', `bytes */${size}`);
        res.setHeader('Content-Length', '0');
    } else if (status === 206 && range) {
        res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
        res.setHeader('Content-Length', String(range.end - range.start + 1));
    } else if (status === 200 && size != null) {
        res.setHeader('Content-Length', String(size));
    }

    if (!sendBody) {
        res.end();
        return { status, aborted: false };
    }

    let aborted = false;
    const onClose = () => {
        if (!res.writableEnded) {
            aborted = true;
        }
    };
    res.on('close', onClose);

    try {
        await pipeline(body, res);
        return { status, aborted };
    } catch (err) {
        if (aborted || isAbortError(err)) {
            return { status, aborted: true };
        }
        if (typeof res.destroy === 'function' && !res.destroyed) {
            res.destroy(err);
        }
        throw err;
    } finally {
        if (typeof res.off === 'function') {
            res.off('close', onClose);
        } else {
            res.removeListener('close', onClose);
        }
    }
}

export { sendStream, parseByteRange, buildContentDisposition, quoteEtag };
export default sendStream;

// EOF webapp/utils/send-stream.js
