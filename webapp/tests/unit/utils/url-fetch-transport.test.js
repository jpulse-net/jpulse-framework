/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / UrlFetch Transport
 * @tagline         Unit tests for UrlFetch http(s) transport with injected deps
 * @description     Redirects, size caps, gzip bombs, timeouts, content-type, json, non-2xx
 * @file            webapp/tests/unit/utils/url-fetch-transport.test.js
 * @version         1.7.16
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import net from 'node:net';
import zlib from 'node:zlib';
import UrlFetch from '../../../utils/url-fetch.js';

class FakeRequest extends EventEmitter {
    constructor() {
        super();
        this._chunks = [];
        this.destroyed = false;
    }
    write(chunk) {
        this._chunks.push(Buffer.from(chunk));
        return true;
    }
    end(chunk) {
        if (chunk) {
            this.write(chunk);
        }
        queueMicrotask(() => this.emit('_end'));
    }
    destroy(err) {
        this.destroyed = true;
        if (err) {
            this.emit('error', err);
        }
    }
}

function makeIncoming({ statusCode = 200, headers = {}, body = '', chunks = null, delayMs = 0 }) {
    async function* gen() {
        if (delayMs) {
            await new Promise((r) => setTimeout(r, delayMs));
        }
        if (chunks) {
            for (const chunk of chunks) {
                yield Buffer.from(chunk);
                if (delayMs) {
                    await new Promise((r) => setTimeout(r, delayMs));
                }
            }
            return;
        }
        yield Buffer.isBuffer(body) ? body : Buffer.from(String(body));
    }
    const res = Readable.from(gen());
    res.statusCode = statusCode;
    res.headers = {};
    for (const [key, value] of Object.entries(headers)) {
        res.headers[key.toLowerCase()] = value;
    }
    return res;
}

function lookupFor(map) {
    return (hostname, options, cb) => {
        if (typeof options === 'function') {
            cb = options;
        }
        const rec = map[hostname];
        if (!rec) {
            const err = new Error(`ENOTFOUND ${hostname}`);
            err.code = 'ENOTFOUND';
            cb(err);
            return;
        }
        const list = (Array.isArray(rec) ? rec : [rec]).map((item) => {
            if (typeof item === 'string') {
                return { address: item, family: net.isIPv6(item) ? 6 : 4 };
            }
            return item;
        });
        if (options && options.all) {
            cb(null, list);
            return;
        }
        cb(null, list[0].address, list[0].family);
    };
}

function installTransport({ lookup, handler }) {
    const requestFn = (opts, callback) => {
        const req = new FakeRequest();
        req.on('_end', () => {
            const body = Buffer.concat(req._chunks);
            Promise.resolve()
                .then(() => handler(opts, body))
                .then((res) => {
                    if (!req.destroyed) {
                        callback(res);
                    }
                })
                .catch((err) => req.emit('error', err));
        });
        return req;
    };
    UrlFetch._deps.lookup = lookup;
    UrlFetch._deps.httpRequest = requestFn;
    UrlFetch._deps.httpsRequest = requestFn;
}

describe('UrlFetch transport', () => {
    const originalAppConfig = global.appConfig;
    const originalLog = global.LogController;
    const originalRedis = global.RedisManager;

    beforeEach(() => {
        global.appConfig = {
            app: { jPulse: { version: '1.7.15' } },
            utils: {
                urlFetch: {
                    maxBytes: 10485760,
                    timeoutMs: 30000,
                    stallTimeoutMs: 10000,
                    maxRedirects: 5,
                    allowedSchemes: ['https', 'http'],
                    blockedHosts: [],
                    userAgent: 'test-agent',
                    allowPrivateAddresses: false,
                    rateLimit: { limit: 60, windowSeconds: 60 }
                }
            }
        };
        global.LogController = {
            logInfo: () => {},
            logWarning: () => {},
            logError: () => {}
        };
        global.RedisManager = null;
    });

    afterEach(() => {
        global.appConfig = originalAppConfig;
        global.LogController = originalLog;
        global.RedisManager = originalRedis;
        UrlFetch._resetDeps();
    });

    test('GET text success pins the vetted address and returns body', async () => {
        const seen = [];
        installTransport({
            lookup: lookupFor({ 'example.com': '93.184.216.34' }),
            handler: (opts) => {
                seen.push(opts);
                return makeIncoming({
                    headers: { 'content-type': 'text/plain; charset=utf-8' },
                    body: 'hello world'
                });
            }
        });

        const res = await UrlFetch.fetch('https://example.com/hi');
        expect(res.success).toBe(true);
        expect(res.code).toBe('OK');
        expect(res.text).toBe('hello world');
        expect(res.status).toBe(200);
        expect(res.contentType).toBe('text/plain');
        expect(res.charset).toBe('utf-8');
        expect(res.finalUrl).toBe('https://example.com/hi');
        expect(seen[0].hostname).toBe('example.com');
        expect(seen[0].method).toBe('GET');
        expect(seen[0].headers['user-agent']).toBe('test-agent');
        seen[0].lookup('example.com', {}, (err, address, family) => {
            expect(err).toBeNull();
            expect(address).toBe('93.184.216.34');
            expect(family).toBe(4);
        });
        seen[0].lookup('example.com', { all: true }, (err, addresses) => {
            expect(err).toBeNull();
            expect(addresses).toEqual([{ address: '93.184.216.34', family: 4 }]);
        });
    });

    test('IP literal that is private fails before connect', async () => {
        let called = false;
        installTransport({
            lookup: lookupFor({}),
            handler: () => {
                called = true;
                return makeIncoming({ body: 'nope' });
            }
        });
        const res = await UrlFetch.fetch('http://127.0.0.1/');
        expect(res.success).toBe(false);
        expect(res.code).toBe('PRIVATE_ADDRESS');
        expect(res.details.address).toBe('127.0.0.1');
        expect(res.error).toContain('allowPrivateAddresses');
        expect(called).toBe(false);
    });

    test('hostname whose DNS includes a private address is rejected', async () => {
        installTransport({
            lookup: lookupFor({ 'evil.example.com': ['8.8.8.8', '169.254.169.254'] }),
            handler: () => makeIncoming({ body: 'nope' })
        });
        const res = await UrlFetch.fetch('https://evil.example.com/');
        expect(res.code).toBe('PRIVATE_ADDRESS');
        expect(res.details.address).toBe('169.254.169.254');
    });

    test('DNS failure', async () => {
        installTransport({
            lookup: lookupFor({}),
            handler: () => makeIncoming({ body: '' })
        });
        const res = await UrlFetch.fetch('https://missing.example/');
        expect(res.code).toBe('DNS_FAILED');
        expect(res.details.host).toBe('missing.example');
    });

    test('Content-Length over the cap fails before the body is used', async () => {
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: () => makeIncoming({
                headers: { 'content-length': '99999', 'content-type': 'text/plain' },
                body: 'tiny'
            })
        });
        const res = await UrlFetch.fetch('https://example.com/', { maxBytes: 10 });
        expect(res.code).toBe('RESPONSE_TOO_LARGE');
        expect(res.details.bytes).toBe(99999);
        expect(res.details.limit).toBe(10);
        expect(res.error).toContain('utils.urlFetch.maxBytes');
    });

    test('lying Content-Length with an oversized body is caught mid-stream', async () => {
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: () => makeIncoming({
                headers: { 'content-length': '4', 'content-type': 'text/plain' },
                body: 'this is much larger than four bytes'
            })
        });
        const res = await UrlFetch.fetch('https://example.com/', { maxBytes: 10 });
        expect(res.code).toBe('RESPONSE_TOO_LARGE');
        expect(res.details.limit).toBe(10);
    });

    test('gzip bomb is capped on decoded bytes', async () => {
        const huge = Buffer.alloc(200000, 0x61);
        const gz = zlib.gzipSync(huge);
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: () => makeIncoming({
                headers: {
                    'content-type': 'text/plain',
                    'content-encoding': 'gzip',
                    'content-length': String(gz.length)
                },
                body: gz
            })
        });
        const res = await UrlFetch.fetch('https://example.com/', { maxBytes: 50000 });
        expect(res.code).toBe('RESPONSE_TOO_LARGE');
        expect(res.details.bytes).toBeGreaterThan(50000);
    });

    test('redirect chain whose second hop resolves private is rejected', async () => {
        installTransport({
            lookup: lookupFor({
                'safe.example': '8.8.8.8',
                'evil.example': '169.254.169.254'
            }),
            handler: (opts) => {
                if (opts.hostname === 'safe.example') {
                    return makeIncoming({
                        statusCode: 302,
                        headers: { location: 'https://evil.example/meta' }
                    });
                }
                return makeIncoming({ body: 'secrets' });
            }
        });
        const res = await UrlFetch.fetch('https://safe.example/start');
        expect(res.code).toBe('PRIVATE_ADDRESS');
        expect(res.details.host).toBe('evil.example');
        expect(res.redirects).toEqual(['https://evil.example/meta']);
    });

    test('too many redirects', async () => {
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: (opts) => makeIncoming({
                statusCode: 302,
                headers: { location: `https://example.com/${opts.path}` }
            })
        });
        const res = await UrlFetch.fetch('https://example.com/a', { maxRedirects: 2 });
        expect(res.code).toBe('TOO_MANY_REDIRECTS');
        expect(res.details.limit).toBe(2);
        expect(res.redirects.length).toBeGreaterThan(2);
    });

    test('303 downgrades to GET and drops the body', async () => {
        const hops = [];
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: (opts, body) => {
                hops.push({ method: opts.method, path: opts.path, body: body.toString() });
                if (opts.path === '/from') {
                    return makeIncoming({
                        statusCode: 303,
                        headers: { location: '/to' }
                    });
                }
                return makeIncoming({
                    headers: { 'content-type': 'text/plain' },
                    body: 'arrived'
                });
            }
        });
        const res = await UrlFetch.fetch('https://example.com/from', {
            method: 'POST',
            body: { hello: 'world' }
        });
        expect(res.success).toBe(true);
        expect(res.text).toBe('arrived');
        expect(hops[0].method).toBe('POST');
        expect(hops[0].body).toContain('hello');
        expect(hops[1].method).toBe('GET');
        expect(hops[1].body).toBe('');
    });

    test('Authorization is stripped on a cross-origin hop', async () => {
        const hops = [];
        installTransport({
            lookup: lookupFor({
                'a.example': '8.8.8.8',
                'b.example': '1.1.1.1'
            }),
            handler: (opts) => {
                hops.push({ host: opts.hostname, auth: opts.headers.authorization || null });
                if (opts.hostname === 'a.example') {
                    return makeIncoming({
                        statusCode: 302,
                        headers: { location: 'https://b.example/next' }
                    });
                }
                return makeIncoming({
                    headers: { 'content-type': 'text/plain' },
                    body: 'ok'
                });
            }
        });
        const res = await UrlFetch.fetch('https://a.example/start', {
            headers: { Authorization: 'Bearer secret-token' }
        });
        expect(res.success).toBe(true);
        expect(hops[0].auth).toBe('Bearer secret-token');
        expect(hops[1].auth).toBeNull();
    });

    test('content type not allowed fails without treating the body as success', async () => {
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: () => makeIncoming({
                headers: { 'content-type': 'application/octet-stream' },
                body: 'zzzz'
            })
        });
        const res = await UrlFetch.fetch('https://example.com/', {
            acceptContentTypes: ['text/*', 'application/json']
        });
        expect(res.code).toBe('CONTENT_TYPE_NOT_ALLOWED');
        expect(res.details.contentType).toBe('application/octet-stream');
        expect(res.text).toBeUndefined();
    });

    test('as json success and parse failure', async () => {
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: (opts) => {
                if (opts.path === '/ok') {
                    return makeIncoming({
                        headers: { 'content-type': 'application/json' },
                        body: '{"n":1}'
                    });
                }
                return makeIncoming({
                    headers: { 'content-type': 'application/json' },
                    body: 'not-json'
                });
            }
        });
        const ok = await UrlFetch.fetch('https://example.com/ok', { as: 'json' });
        expect(ok.success).toBe(true);
        expect(ok.json).toEqual({ n: 1 });

        const bad = await UrlFetch.fetch('https://example.com/bad', { as: 'json' });
        expect(bad.code).toBe('JSON_PARSE_ERROR');
        expect(bad.text).toBe('not-json');
    });

    test('non-2xx still returns status, headers, and body', async () => {
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: () => makeIncoming({
                statusCode: 404,
                headers: { 'content-type': 'application/json', etag: '"abc"' },
                body: '{"error":"missing"}'
            })
        });
        const res = await UrlFetch.fetch('https://example.com/nope', { as: 'json' });
        expect(res.success).toBe(false);
        expect(res.code).toBe('UPSTREAM_ERROR');
        expect(res.status).toBe(404);
        expect(res.json).toEqual({ error: 'missing' });
        expect(res.headers.etag).toBe('"abc"');
    });

    test('method other than GET/POST is an error, not a downgrade', async () => {
        let called = false;
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: () => {
                called = true;
                return makeIncoming({ body: 'nope' });
            }
        });
        const res = await UrlFetch.fetch('https://example.com/', { method: 'PUT' });
        expect(res.code).toBe('METHOD_NOT_ALLOWED');
        expect(called).toBe(false);
    });

    test('rateLimitKey denied returns RATE_LIMIT_EXCEEDED', async () => {
        global.RedisManager = {
            cacheCheckRateLimit: async () => ({ allowed: false, count: 61, retryAfter: 1500 })
        };
        let called = false;
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: () => {
                called = true;
                return makeIncoming({ body: 'nope' });
            }
        });
        const res = await UrlFetch.fetch('https://example.com/', { rateLimitKey: 'user-1' });
        expect(res.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(res.details.retryAfterMs).toBe(1500);
        expect(called).toBe(false);
    });

    test('total timeout vs stall timeout', async () => {
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: () => makeIncoming({
                headers: { 'content-type': 'text/plain' },
                body: 'late',
                delayMs: 80
            })
        });
        const total = await UrlFetch.fetch('https://example.com/total', {
            timeoutMs: 20,
            stallTimeoutMs: 500
        });
        expect(total.code).toBe('REQUEST_TIMEOUT');
        expect(total.details.phase).toBe('total');

        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: () => makeIncoming({
                headers: { 'content-type': 'text/plain' },
                chunks: ['a', 'b', 'c'],
                delayMs: 40
            })
        });
        const stall = await UrlFetch.fetch('https://example.com/stall', {
            timeoutMs: 500,
            stallTimeoutMs: 20
        });
        expect(stall.code).toBe('REQUEST_TIMEOUT');
        expect(stall.details.phase).toBe('stall');
    }, 15000);

    test('fetch never rejects', async () => {
        installTransport({
            lookup: lookupFor({ 'example.com': '8.8.8.8' }),
            handler: () => {
                throw new Error('boom');
            }
        });
        const res = await UrlFetch.fetch('https://example.com/');
        expect(res.success).toBe(false);
        expect(res.code).toBe('NETWORK_ERROR');
    });
});

// EOF webapp/tests/unit/utils/url-fetch-transport.test.js
