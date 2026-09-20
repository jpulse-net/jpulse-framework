/**
 * @name            jPulse Framework / WebApp / Utils / Set Headers
 * @tagline         Apply middleware.setHeaders entries, including alias keys
 * @description     Resolves availableHeaders as a plain value (key is the header name)
 *                  or { header, value } so an alias can select a variant of an existing header.
 * @file            webapp/utils/set-headers.js
 * @version         2.0.7
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.19, Grok 4.6
 */

/**
 * Apply configured security headers to a response.
 * @param {object} res - Node / Express response
 * @param {object} [setHeadersConf]
 * @param {string[]} [setHeadersConf.headers]
 * @param {object} [setHeadersConf.availableHeaders]
 * @param {function} [logMissing] - (message) => void when a listed key is absent
 */
function applySetHeaders(res, setHeadersConf, logMissing) {
    const keys = setHeadersConf?.headers;
    const available = setHeadersConf?.availableHeaders;
    if (!Array.isArray(keys) || !available || typeof res?.setHeader !== 'function') {
        return;
    }
    for (const key of keys) {
        const entry = available[key];
        if (entry == null || entry === '') {
            if (typeof logMissing === 'function') {
                logMissing(`Header "${key}" not found in middleware.setHeaders.availableHeaders`);
            }
            continue;
        }
        if (typeof entry === 'object' && entry.header && entry.value != null) {
            res.setHeader(entry.header, entry.value);
        } else {
            res.setHeader(key, entry);
        }
    }
}

export { applySetHeaders };
export default applySetHeaders;

// EOF webapp/utils/set-headers.js
