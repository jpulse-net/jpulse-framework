/**
 * @name            jPulse Framework / Site / WebApp / Controller / Hello Fetch
 * @tagline         Admin-only demo for UrlFetch
 * @description     Teaching endpoint for the hardened outbound fetch utility. Auth is admin
 *                   on purpose: a fetch-any-URL route is otherwise an open proxy.
 * @file            site/webapp/controller/helloFetch.js
 * @version         1.7.16
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 3.15, Grok 4.6
 */

const TEXT_PREVIEW = 8000;

class HelloFetchController {
    static routes = [
        { method: 'GET', path: '/api/1/helloFetch/limits', handler: 'apiLimits', auth: 'admin' },
        { method: 'POST', path: '/api/1/helloFetch', handler: 'apiFetch', auth: 'admin' }
    ];

    static async apiLimits(req, res) {
        const LogController = global.LogController;
        const CommonUtils = global.CommonUtils;
        try {
            LogController.logRequest(req, 'helloFetch.apiLimits', '');
            const limits = global.UrlFetch.getEffectiveOptions();
            res.json({ success: true, data: limits });
            LogController.logInfo(req, 'helloFetch.apiLimits', 'success: returned effective limits');
        } catch (error) {
            LogController.logError(req, 'helloFetch.apiLimits', 'error: ' + error.message);
            return CommonUtils.sendError(req, res, 500, 'Failed to read fetch limits', 'HELLO_FETCH_LIMITS_ERROR');
        }
    }

    static async apiFetch(req, res) {
        const LogController = global.LogController;
        const CommonUtils = global.CommonUtils;
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'helloFetch.apiFetch', '');
            const body = req.body || {};
            const ctx = CommonUtils.getLogContext(req);
            const fetchResult = await global.UrlFetch.fetch(body.url, {
                method: body.method,
                as: body.as,
                headers: body.headers,
                body: body.body,
                allowedHosts: body.allowedHosts,
                blockedHosts: body.blockedHosts,
                acceptContentTypes: body.acceptContentTypes,
                maxBytes: body.maxBytes,
                timeoutMs: body.timeoutMs,
                stallTimeoutMs: body.stallTimeoutMs,
                maxRedirects: body.maxRedirects,
                req,
                rateLimitKey: `hello-fetch:${ctx.username}:${ctx.ip}`
            });
            const data = HelloFetchController._forDemo(fetchResult);
            res.json({ success: true, data });
            LogController.logInfo(req, 'helloFetch.apiFetch',
                `success: ${data.code} in ${Date.now() - startTime}ms`);
        } catch (error) {
            LogController.logError(req, 'helloFetch.apiFetch', 'error: ' + error.message);
            return CommonUtils.sendError(req, res, 500, 'Failed to run outbound fetch', 'HELLO_FETCH_ERROR');
        }
    }

    static _forDemo(result) {
        const data = { ...result };
        if (Buffer.isBuffer(data.buffer)) {
            data.bufferPreview = data.buffer.toString('utf8', 0, TEXT_PREVIEW);
            if (data.buffer.length > TEXT_PREVIEW) {
                data.bufferPreview += '\n… truncated for demo';
            }
            delete data.buffer;
        }
        if (typeof data.text === 'string' && data.text.length > TEXT_PREVIEW) {
            data.text = data.text.slice(0, TEXT_PREVIEW) + '\n… truncated for demo';
        }
        return data;
    }
}

export default HelloFetchController;

// EOF site/webapp/controller/helloFetch.js
