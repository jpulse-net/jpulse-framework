/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Stream Body
 * @tagline         Unit tests for StreamBody.pipe
 * @description     Byte counting, 413 PAYLOAD_TOO_LARGE envelope, Content-Length early reject
 * @file            webapp/tests/unit/utils/stream-body.test.js
 * @version         1.8.2
 * @release         2026-09-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.19, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PassThrough, Writable } from 'stream';
import StreamBody from '../../../utils/stream-body.js';

function collectDest() {
    const chunks = [];
    const dest = new Writable({
        write(chunk, _enc, cb) {
            chunks.push(Buffer.from(chunk));
            cb();
        }
    });
    dest.collected = () => Buffer.concat(chunks).toString();
    dest.writtenBytes = () => chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    return dest;
}

function readableReq(chunks, headers = {}) {
    const req = new PassThrough();
    req.headers = headers;
    req.originalUrl = '/api/1/files';
    process.nextTick(() => {
        for (const chunk of chunks) {
            req.write(chunk);
        }
        req.end();
    });
    return req;
}

describe('StreamBody.pipe', () => {
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

    test('pipes the body and returns the byte count from the route cap', async () => {
        const req = readableReq(['hello', ' ', 'world']);
        req.jpulseStreamMaxBytes = 100;
        const dest = collectDest();
        const res = {};
        const bytes = await StreamBody.pipe(req, res, dest);
        expect(bytes).toBe(11);
        expect(dest.collected()).toBe('hello world');
        expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
    });

    test('accepts a maxBytes override string', async () => {
        const req = readableReq(['abcd']);
        const dest = collectDest();
        const bytes = await StreamBody.pipe(req, {}, dest, { maxBytes: '1kb' });
        expect(bytes).toBe(4);
        expect(dest.collected()).toBe('abcd');
    });

    test('rejects when neither route cap nor maxBytes is set', async () => {
        const req = readableReq(['x']);
        const dest = collectDest();
        await expect(StreamBody.pipe(req, {}, dest)).rejects.toThrow('maxBytes is required');
    });

    test('over-cap destroys req and dest and sends PAYLOAD_TOO_LARGE', async () => {
        const req = readableReq(['hello ', 'world!!!']);
        req.jpulseStreamMaxBytes = 10;
        const dest = collectDest();
        const destroyDest = jest.spyOn(dest, 'destroy');
        const destroyReq = jest.spyOn(req, 'destroy');
        const res = {};
        const bytes = await StreamBody.pipe(req, res, dest);
        expect(bytes).toBeNull();
        expect(dest.writtenBytes()).toBeLessThanOrEqual(10);
        expect(destroyReq).toHaveBeenCalled();
        expect(destroyDest).toHaveBeenCalled();
        expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
            req, res, 413, 'Request body too large', 'PAYLOAD_TOO_LARGE',
            { limit: 10, length: expect.any(Number) }
        );
        const details = global.CommonUtils.sendError.mock.calls[0][5];
        expect(details.length).toBeGreaterThan(10);
        expect(global.LogController.logWarning).toHaveBeenCalled();
    });

    test('Content-Length over cap rejects before writing dest', async () => {
        const req = readableReq(['0123456789abcdef'], { 'content-length': '16' });
        req.jpulseStreamMaxBytes = 10;
        const dest = collectDest();
        const destroyDest = jest.spyOn(dest, 'destroy');
        const res = {};
        const bytes = await StreamBody.pipe(req, res, dest);
        expect(bytes).toBeNull();
        expect(dest.writtenBytes()).toBe(0);
        expect(destroyDest).toHaveBeenCalled();
        expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
            req, res, 413, 'Request body too large', 'PAYLOAD_TOO_LARGE',
            { limit: 10, length: 16 }
        );
    });
});

// EOF webapp/tests/unit/utils/stream-body.test.js
