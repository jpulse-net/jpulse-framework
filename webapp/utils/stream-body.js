/**
 * @name            jPulse Framework / WebApp / Utils / Stream Body
 * @tagline         Pipe an unread request body with a byte cap
 * @description     Stream a raw request body to a writable dest, counting bytes against
 *                  the route's bodyLimit. Over-cap destroys req and dest and sends the
 *                  same 413 PAYLOAD_TOO_LARGE envelope as the JSON/urlencoded parsers.
 * @file            webapp/utils/stream-body.js
 * @version         1.8.0
 * @release         2026-09-08
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.19, Grok 4.6
 */

import { parseBodyLimit } from './body-limit.js';

/**
 * @param {string|number|undefined} value
 * @returns {number|null}
 */
function parseContentLength(value) {
    if (value == null || value === '') {
        return null;
    }
    const n = Number.parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 0) {
        return null;
    }
    return n;
}

/**
 * @param {object} req
 * @param {object} dest
 */
function destroyPair(req, dest) {
    if (req && typeof req.destroy === 'function') {
        req.destroy();
    }
    if (dest && typeof dest.destroy === 'function') {
        dest.destroy();
    }
}

/**
 * @param {object} req
 * @param {object} res
 * @param {number} limit
 * @param {number} length
 */
function sendPayloadTooLarge(req, res, limit, length) {
    if (global.LogController?.logWarning) {
        global.LogController.logWarning(req, 'app.streamBody',
            `warning: request body too large (${length ?? '?'} > ${limit ?? '?'})`);
    }
    const details = { limit, length };
    const CommonUtils = global.CommonUtils;
    if (CommonUtils?.sendError) {
        return CommonUtils.sendError(req, res, 413, 'Request body too large', 'PAYLOAD_TOO_LARGE', details);
    }
    if (res && !res.headersSent && typeof res.status === 'function') {
        return res.status(413).json({
            success: false,
            error: 'Request body too large',
            code: 'PAYLOAD_TOO_LARGE',
            path: req.originalUrl,
            details
        });
    }
}

class StreamBody {
    /**
     * Pipe the unread request body to dest, counting bytes against the route cap.
     * On success returns the byte count. On over-cap, destroys req and dest, sends
     * 413 PAYLOAD_TOO_LARGE, and returns null. dest may contain a prefix of the
     * rejected body — the caller must unlink a partial file.
     * @param {object} req
     * @param {object} res
     * @param {object} dest - writable stream
     * @param {{maxBytes?: string|number}} [options]
     * @returns {Promise<number|null>}
     */
    static pipe(req, res, dest, options = {}) {
        const maxBytes = options.maxBytes != null
            ? parseBodyLimit(options.maxBytes)
            : req.jpulseStreamMaxBytes;
        if (maxBytes == null) {
            return Promise.reject(new Error(
                'StreamBody.pipe: maxBytes is required (set bodyLimit on the route or pass { maxBytes })'
            ));
        }
        if (!dest || typeof dest.write !== 'function') {
            return Promise.reject(new Error('StreamBody.pipe: dest must be a writable stream'));
        }

        const declared = parseContentLength(req.headers?.['content-length']);
        if (declared != null && declared > maxBytes) {
            destroyPair(req, dest);
            sendPayloadTooLarge(req, res, maxBytes, declared);
            return Promise.resolve(null);
        }

        return new Promise((resolve, reject) => {
            let bytes = 0;
            let settled = false;
            let tooLarge = false;

            const settle = (err, value) => {
                if (settled) {
                    return;
                }
                settled = true;
                req.removeListener('data', onData);
                req.removeListener('end', onEnd);
                req.removeListener('error', onReqError);
                dest.removeListener('error', onDestError);
                dest.removeListener('finish', onFinish);
                if (err) {
                    reject(err);
                } else {
                    resolve(value);
                }
            };

            const abortTooLarge = () => {
                tooLarge = true;
                destroyPair(req, dest);
                sendPayloadTooLarge(req, res, maxBytes, bytes);
                settle(null, null);
            };

            const onData = (chunk) => {
                if (settled) {
                    return;
                }
                const next = bytes + chunk.length;
                if (next > maxBytes) {
                    bytes = next;
                    abortTooLarge();
                    return;
                }
                bytes = next;
                try {
                    const ok = dest.write(chunk);
                    if (ok === false && typeof req.pause === 'function') {
                        req.pause();
                        dest.once('drain', () => {
                            if (typeof req.resume === 'function') {
                                req.resume();
                            }
                        });
                    }
                } catch (err) {
                    if (typeof req.destroy === 'function') {
                        req.destroy();
                    }
                    settle(err);
                }
            };

            const onEnd = () => {
                if (settled) {
                    return;
                }
                if (typeof dest.end === 'function') {
                    dest.end();
                } else {
                    settle(null, bytes);
                }
            };

            const onFinish = () => {
                if (settled) {
                    return;
                }
                settle(null, bytes);
            };

            const onReqError = (err) => {
                if (settled || tooLarge) {
                    return;
                }
                if (typeof dest.destroy === 'function') {
                    dest.destroy();
                }
                settle(err);
            };

            const onDestError = (err) => {
                if (settled || tooLarge) {
                    return;
                }
                if (typeof req.destroy === 'function') {
                    req.destroy();
                }
                settle(err);
            };

            req.on('data', onData);
            req.on('end', onEnd);
            req.on('error', onReqError);
            dest.on('error', onDestError);
            dest.on('finish', onFinish);

            if (req.readableEnded) {
                onEnd();
            }
        });
    }
}

export { StreamBody };
export default StreamBody;

// EOF webapp/utils/stream-body.js
