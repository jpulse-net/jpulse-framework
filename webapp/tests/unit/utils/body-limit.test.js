/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Body Limit
 * @tagline         Unit tests for per-route body size limit helpers
 * @description     parseBodyLimit, mountRouteBodyLimitParsers, handleBodyParserError
 * @file            webapp/tests/unit/utils/body-limit.test.js
 * @version         2.0.3
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.19, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import {
    BODY_LIMIT_WARN_BYTES,
    parseBodyLimit,
    assertRouteBodyOptions,
    mountStreamBodyGuards,
    assertStreamRouteGuards,
    mountRouteBodyLimitParsers,
    handleBodyParserError
} from '../../../utils/body-limit.js';

describe('parseBodyLimit', () => {
    test('parses body-parser size strings', () => {
        expect(parseBodyLimit('25mb')).toBe(25 * 1024 * 1024);
        expect(parseBodyLimit('10mb')).toBe(10 * 1024 * 1024);
        expect(parseBodyLimit('1kb')).toBe(1024);
        expect(parseBodyLimit('512')).toBe(512);
        expect(parseBodyLimit('25MB')).toBe(25 * 1024 * 1024);
        expect(parseBodyLimit('25m')).toBe(25 * 1024 * 1024);
    });

    test('parses numeric bytes', () => {
        expect(parseBodyLimit(1024)).toBe(1024);
        expect(parseBodyLimit(0)).toBe(0);
    });

    test('returns null for unparseable values', () => {
        expect(parseBodyLimit('huge')).toBeNull();
        expect(parseBodyLimit('')).toBeNull();
        expect(parseBodyLimit('  ')).toBeNull();
        expect(parseBodyLimit(null)).toBeNull();
        expect(parseBodyLimit(undefined)).toBeNull();
        expect(parseBodyLimit(-1)).toBeNull();
        expect(parseBodyLimit({})).toBeNull();
    });
});

describe('mountRouteBodyLimitParsers', () => {
    const appConfig = {
        middleware: {
            bodyParser: {
                json: { limit: '10mb' },
                urlencoded: { extended: true, limit: '10mb' }
            }
        }
    };

    test('mounts json and urlencoded parsers on the declared method', () => {
        const app = { post: jest.fn() };
        const log = { info: jest.fn(), warn: jest.fn() };
        mountRouteBodyLimitParsers(app, [
            { method: 'POST', path: '/api/1/ai/fetch-source', bodyLimit: '25mb' }
        ], appConfig, log);
        expect(app.post).toHaveBeenCalledTimes(2);
        expect(app.post.mock.calls[0][0]).toBe('/api/1/ai/fetch-source');
        expect(typeof app.post.mock.calls[0][1]).toBe('function');
        expect(app.post.mock.calls[1][0]).toBe('/api/1/ai/fetch-source');
        expect(log.info).toHaveBeenCalledWith(
            expect.stringContaining('bodyLimit 25mb mounted on POST /api/1/ai/fetch-source')
        );
        expect(log.warn).not.toHaveBeenCalled();
    });

    test('does not warn at the 25mb comfort threshold', () => {
        const app = { post: jest.fn() };
        const log = { info: jest.fn(), warn: jest.fn() };
        mountRouteBodyLimitParsers(app, [
            { method: 'post', path: '/api/1/x', bodyLimit: '25mb' }
        ], appConfig, log);
        expect(parseBodyLimit('25mb')).toBe(BODY_LIMIT_WARN_BYTES);
        expect(log.warn).not.toHaveBeenCalled();
    });

    test('warns when bodyLimit exceeds 25mb', () => {
        const app = { post: jest.fn() };
        const log = { info: jest.fn(), warn: jest.fn() };
        mountRouteBodyLimitParsers(app, [
            { method: 'POST', path: '/api/1/x', bodyLimit: '50mb' }
        ], appConfig, log);
        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('exceeds 25mb'));
        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('/api/1/x'));
        expect(app.post).toHaveBeenCalled();
    });

    test('skips invalid bodyLimit and leaves the global default in place', () => {
        const app = { post: jest.fn() };
        const log = { info: jest.fn(), warn: jest.fn() };
        mountRouteBodyLimitParsers(app, [
            { method: 'POST', path: '/api/1/x', bodyLimit: 'huge' }
        ], appConfig, log);
        expect(app.post).not.toHaveBeenCalled();
        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("Invalid bodyLimit 'huge'"));
    });

    test('does nothing when the route list is empty', () => {
        const app = { post: jest.fn() };
        mountRouteBodyLimitParsers(app, [], appConfig, { info: jest.fn(), warn: jest.fn() });
        expect(app.post).not.toHaveBeenCalled();
    });

    test('skips stream routes instead of mounting parsers', () => {
        const app = { post: jest.fn() };
        const log = { info: jest.fn(), warn: jest.fn() };
        mountRouteBodyLimitParsers(app, [
            { method: 'POST', path: '/api/1/files', bodyLimit: '50mb', bodyMode: 'stream' }
        ], appConfig, log);
        expect(app.post).not.toHaveBeenCalled();
        expect(log.info).not.toHaveBeenCalled();
    });
});

describe('assertRouteBodyOptions', () => {
    test('allows a stream route with a parseable bodyLimit', () => {
        expect(() => assertRouteBodyOptions([
            { method: 'POST', path: '/api/1/files', bodyMode: 'stream', bodyLimit: '50mb' }
        ])).not.toThrow();
    });

    test('throws when bodyMode is not stream', () => {
        expect(() => assertRouteBodyOptions([
            { method: 'POST', path: '/api/1/files', bodyMode: 'json', bodyLimit: '50mb' }
        ])).toThrow("Invalid bodyMode 'json' on POST /api/1/files");
    });

    test('throws when stream route omits bodyLimit', () => {
        expect(() => assertRouteBodyOptions([
            { method: 'POST', path: '/api/1/files', bodyMode: 'stream' }
        ])).toThrow("bodyMode: 'stream' on POST /api/1/files requires bodyLimit");
    });

    test('throws when stream bodyLimit is unparseable', () => {
        expect(() => assertRouteBodyOptions([
            { method: 'POST', path: '/api/1/files', bodyMode: 'stream', bodyLimit: 'huge' }
        ])).toThrow("Invalid bodyLimit 'huge' on streaming route POST /api/1/files");
    });

    test('throws on GET or HEAD plus stream', () => {
        expect(() => assertRouteBodyOptions([
            { method: 'GET', path: '/api/1/files', bodyMode: 'stream', bodyLimit: '50mb' }
        ])).toThrow("bodyMode: 'stream' is not allowed on GET /api/1/files");
        expect(() => assertRouteBodyOptions([
            { method: 'HEAD', path: '/api/1/files', bodyMode: 'stream', bodyLimit: '50mb' }
        ])).toThrow("bodyMode: 'stream' is not allowed on HEAD /api/1/files");
    });
});

describe('mountStreamBodyGuards', () => {
    test('mounts a skip guard and logs the stream cap', () => {
        const app = { post: jest.fn() };
        const log = { info: jest.fn(), warn: jest.fn() };
        mountStreamBodyGuards(app, [
            { method: 'POST', path: '/api/1/files', bodyLimit: '50mb', bodyMode: 'stream' }
        ], log);
        expect(app.post).toHaveBeenCalledTimes(1);
        expect(app.post.mock.calls[0][0]).toBe('/api/1/files');
        const guard = app.post.mock.calls[0][1];
        expect(guard._jpulseStreamSkip).toBe(true);
        const req = {};
        const next = jest.fn();
        guard(req, {}, next);
        expect(req._body).toBe(true);
        expect(req.jpulseStreamMaxBytes).toBe(50 * 1024 * 1024);
        expect(next).toHaveBeenCalled();
        expect(log.info).toHaveBeenCalledWith(
            expect.stringContaining('bodyMode=stream bodyLimit=50mb mounted on POST /api/1/files')
        );
        expect(log.warn).not.toHaveBeenCalled();
    });

    test('does not warn at a 50mb stream cap', () => {
        const app = { post: jest.fn() };
        const log = { info: jest.fn(), warn: jest.fn() };
        mountStreamBodyGuards(app, [
            { method: 'POST', path: '/api/1/files', bodyLimit: '50mb', bodyMode: 'stream' }
        ], log);
        expect(log.warn).not.toHaveBeenCalled();
    });

    test('throws when stream route omits bodyLimit', () => {
        const app = { post: jest.fn() };
        expect(() => mountStreamBodyGuards(app, [
            { method: 'POST', path: '/api/1/files', bodyMode: 'stream' }
        ], { info: jest.fn(), warn: jest.fn() })).toThrow('requires bodyLimit');
        expect(app.post).not.toHaveBeenCalled();
    });
});

describe('assertStreamRouteGuards', () => {
    test('passes when the skip guard is mounted and no route-scoped parser exists', () => {
        const app = express();
        const routes = [{ method: 'POST', path: '/api/1/files', bodyLimit: '1mb', bodyMode: 'stream' }];
        mountStreamBodyGuards(app, routes);
        app.use(bodyParser.json({ limit: '10mb' }));
        expect(() => assertStreamRouteGuards(app, routes)).not.toThrow();
    });

    test('throws when a route-scoped parser is mounted on a stream path', () => {
        const app = express();
        const routes = [{ method: 'POST', path: '/api/1/files', bodyLimit: '1mb', bodyMode: 'stream' }];
        mountStreamBodyGuards(app, routes);
        app.post('/api/1/files', bodyParser.json({ limit: '10mb' }));
        expect(() => assertStreamRouteGuards(app, routes)).toThrow(
            'Streaming route POST /api/1/files has a body parser mounted (jsonParser)'
        );
    });

    test('throws when the skip guard is missing', () => {
        const app = express();
        app.use(bodyParser.json({ limit: '10mb' }));
        expect(() => assertStreamRouteGuards(app, [
            { method: 'POST', path: '/api/1/files' }
        ])).toThrow('Streaming route POST /api/1/files is missing the stream body skip guard');
    });
});

describe('stream route leaves req unread', () => {
    async function withServer(app, fn) {
        const server = http.createServer(app);
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address();
        try {
            await fn(port);
        } finally {
            await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
        }
    }

    function post(port, { contentType, body }) {
        const payload = Buffer.from(body);
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: '127.0.0.1',
                port,
                path: '/api/1/files',
                method: 'POST',
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': payload.length
                }
            }, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    resolve({ status: res.statusCode, json: JSON.parse(Buffer.concat(chunks).toString()) });
                });
            });
            req.on('error', reject);
            req.end(payload);
        });
    }

    function streamApp() {
        const app = express();
        const routes = [{ method: 'POST', path: '/api/1/files', bodyLimit: '1mb', bodyMode: 'stream' }];
        mountStreamBodyGuards(app, routes);
        app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
        app.use(bodyParser.json({ limit: '10mb' }));
        assertStreamRouteGuards(app, routes);
        app.post('/api/1/files', async (req, res) => {
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            res.json({
                readableOnEntry: true,
                body: req.body ?? null,
                bytes: Buffer.concat(chunks).toString()
            });
        });
        return app;
    }

    test('handler can read application/pdf', async () => {
        const app = streamApp();
        await withServer(app, async (port) => {
            const result = await post(port, { contentType: 'application/pdf', body: '%PDF-stream-body' });
            expect(result.status).toBe(200);
            expect(result.json.bytes).toBe('%PDF-stream-body');
            expect(result.json.body).toBeNull();
        });
    });

    test('handler can read application/json that the global parser would otherwise consume', async () => {
        const app = streamApp();
        await withServer(app, async (port) => {
            const result = await post(port, { contentType: 'application/json', body: '{"n":1}' });
            expect(result.status).toBe(200);
            expect(result.json.bytes).toBe('{"n":1}');
            expect(result.json.body).toBeNull();
        });
    });

    test('handler can read urlencoded that the global parser would otherwise consume', async () => {
        const app = streamApp();
        await withServer(app, async (port) => {
            const result = await post(port, {
                contentType: 'application/x-www-form-urlencoded',
                body: 'a=1&b=2'
            });
            expect(result.status).toBe(200);
            expect(result.json.bytes).toBe('a=1&b=2');
            expect(result.json.body).toBeNull();
        });
    });
});

describe('handleBodyParserError', () => {
    let originalCommonUtils;
    let originalLog;

    beforeEach(() => {
        originalCommonUtils = global.CommonUtils;
        originalLog = global.LogController;
        global.CommonUtils = {
            sendError: jest.fn()
        };
        global.LogController = {
            logWarning: jest.fn()
        };
    });

    afterEach(() => {
        global.CommonUtils = originalCommonUtils;
        global.LogController = originalLog;
    });

    test('returns PAYLOAD_TOO_LARGE for entity.too.large', () => {
        const req = { originalUrl: '/api/1/ai/fetch-source' };
        const res = {};
        const next = jest.fn();
        const err = { type: 'entity.too.large', status: 413, limit: 10485760, length: 20971520 };
        handleBodyParserError(err, req, res, next);
        expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
            req, res, 413, 'Request body too large', 'PAYLOAD_TOO_LARGE',
            { limit: 10485760, length: 20971520 }
        );
        expect(next).not.toHaveBeenCalled();
        expect(global.LogController.logWarning).toHaveBeenCalled();
    });

    test('returns PAYLOAD_TOO_LARGE for status 413 without type', () => {
        const req = { originalUrl: '/api/1/foo' };
        const res = {};
        const next = jest.fn();
        handleBodyParserError({ status: 413 }, req, res, next);
        expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
            req, res, 413, 'Request body too large', 'PAYLOAD_TOO_LARGE', null
        );
        expect(next).not.toHaveBeenCalled();
    });

    test('passes other errors through', () => {
        const err = { message: 'boom' };
        const next = jest.fn();
        handleBodyParserError(err, { originalUrl: '/api/1/foo' }, {}, next);
        expect(next).toHaveBeenCalledWith(err);
        expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
    });
});

// EOF webapp/tests/unit/utils/body-limit.test.js
