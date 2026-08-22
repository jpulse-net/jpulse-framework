/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Body Limit
 * @tagline         Unit tests for per-route body size limit helpers
 * @description     parseBodyLimit, mountRouteBodyLimitParsers, handleBodyParserError
 * @file            webapp/tests/unit/utils/body-limit.test.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.15, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
    BODY_LIMIT_WARN_BYTES,
    parseBodyLimit,
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
