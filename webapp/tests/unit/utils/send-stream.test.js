/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Send Stream
 * @tagline         Unit tests for CommonUtils.sendStream
 * @description     Ranges, HEAD, conditionals, RFC 5987 filenames, disconnect teardown
 * @file            webapp/tests/unit/utils/send-stream.test.js
 * @version         2.0.9
 * @release         2026-09-21
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.19, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PassThrough, Readable } from 'stream';
import { sendStream } from '../../../utils/send-stream.js';

const BODY = Buffer.from('0123456789abcdef'); // 16 bytes

function createRes() {
    const res = new PassThrough();
    res.statusCode = 200;
    res._headers = {};
    res._headersSent = false;
    Object.defineProperty(res, 'headersSent', {
        get() {
            return res._headersSent;
        },
        set(v) {
            res._headersSent = v;
        }
    });
    res.setHeader = (name, value) => {
        res._headers[String(name).toLowerCase()] = String(value);
    };
    res.getHeader = (name) => res._headers[String(name).toLowerCase()];
    const origWrite = res.write.bind(res);
    res.write = (chunk, enc, cb) => {
        res._headersSent = true;
        return origWrite(chunk, enc, cb);
    };
    const origEnd = res.end.bind(res);
    res.end = (chunk, enc, cb) => {
        res._headersSent = true;
        return origEnd(chunk, enc, cb);
    };
    return res;
}

function collect(res) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(Buffer.from(c)));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
    });
}

function factoryFrom(buf) {
    return ({ start, end }) => {
        const to = end == null ? buf.length : end + 1;
        return Readable.from(buf.subarray(start, to));
    };
}

describe('sendStream', () => {
    let originalConfig;

    beforeEach(() => {
        originalConfig = global.appConfig;
        global.appConfig = {
            utils: {
                sendStream: {
                    contentTypes: {
                        '.pdf': 'application/pdf',
                        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    }
                }
            }
        };
    });

    afterEach(() => {
        global.appConfig = originalConfig;
    });

    test('no-range factory returns 200 with Content-Length and Accept-Ranges', async () => {
        const req = { method: 'GET', headers: {} };
        const res = createRes();
        const done = collect(res);
        const result = await sendStream(req, res, factoryFrom(BODY), {
            mimeType: 'application/octet-stream',
            size: BODY.length
        });
        const body = await done;
        expect(result).toEqual({ status: 200, aborted: false });
        expect(res.statusCode).toBe(200);
        expect(res.getHeader('content-length')).toBe('16');
        expect(res.getHeader('accept-ranges')).toBe('bytes');
        expect(res.getHeader('x-content-type-options')).toBe('nosniff');
        expect(body.toString()).toBe('0123456789abcdef');
    });

    test('bytes=0-499 on a 16-byte body clamps and answers 206', async () => {
        const req = { method: 'GET', headers: { range: 'bytes=0-499' } };
        const res = createRes();
        const done = collect(res);
        const result = await sendStream(req, res, factoryFrom(BODY), { size: BODY.length });
        const body = await done;
        expect(result.status).toBe(206);
        expect(res.getHeader('content-range')).toBe('bytes 0-15/16');
        expect(res.getHeader('content-length')).toBe('16');
        expect(body.toString()).toBe('0123456789abcdef');
    });

    test('bytes=0-3 returns the first four bytes', async () => {
        const req = { method: 'GET', headers: { range: 'bytes=0-3' } };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, factoryFrom(BODY), { size: BODY.length });
        const body = await done;
        expect(res.statusCode).toBe(206);
        expect(res.getHeader('content-range')).toBe('bytes 0-3/16');
        expect(res.getHeader('content-length')).toBe('4');
        expect(body.toString()).toBe('0123');
    });

    test('bytes=500- is open-ended from offset 10', async () => {
        const req = { method: 'GET', headers: { range: 'bytes=10-' } };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, factoryFrom(BODY), { size: BODY.length });
        const body = await done;
        expect(res.statusCode).toBe(206);
        expect(res.getHeader('content-range')).toBe('bytes 10-15/16');
        expect(body.toString()).toBe('abcdef');
    });

    test('bytes=-5 is a suffix range', async () => {
        const req = { method: 'GET', headers: { range: 'bytes=-5' } };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, factoryFrom(BODY), { size: BODY.length });
        const body = await done;
        expect(res.statusCode).toBe(206);
        expect(res.getHeader('content-range')).toBe('bytes 11-15/16');
        expect(body.toString()).toBe('bcdef');
    });

    test('start past size is 416 with bytes */size', async () => {
        const req = { method: 'GET', headers: { range: 'bytes=16-' } };
        const res = createRes();
        const done = collect(res);
        const factory = jest.fn(factoryFrom(BODY));
        const result = await sendStream(req, res, factory, { size: BODY.length });
        const body = await done;
        expect(result.status).toBe(416);
        expect(res.getHeader('content-range')).toBe('bytes */16');
        expect(body.length).toBe(0);
        expect(factory).not.toHaveBeenCalled();
    });

    test('any range against size 0 is 416', async () => {
        const req = { method: 'GET', headers: { range: 'bytes=0-0' } };
        const res = createRes();
        const done = collect(res);
        const factory = jest.fn(() => Readable.from([]));
        await sendStream(req, res, factory, { size: 0 });
        await done;
        expect(res.statusCode).toBe(416);
        expect(res.getHeader('content-range')).toBe('bytes */0');
        expect(factory).not.toHaveBeenCalled();
    });

    test('malformed and multi-range headers are ignored and answered 200', async () => {
        for (const range of ['bytes=abc', 'bytes=0-10,20-30', 'items=0-1']) {
            const req = { method: 'GET', headers: { range } };
            const res = createRes();
            const done = collect(res);
            await sendStream(req, res, factoryFrom(BODY), { size: BODY.length });
            const body = await done;
            expect(res.statusCode).toBe(200);
            expect(body.length).toBe(16);
        }
    });

    test('HEAD with Range sends 206 headers and never calls the factory', async () => {
        const req = { method: 'HEAD', headers: { range: 'bytes=0-3' } };
        const res = createRes();
        const done = collect(res);
        const factory = jest.fn(factoryFrom(BODY));
        await sendStream(req, res, factory, { size: BODY.length });
        const body = await done;
        expect(res.statusCode).toBe(206);
        expect(res.getHeader('content-range')).toBe('bytes 0-3/16');
        expect(res.getHeader('content-length')).toBe('4');
        expect(body.length).toBe(0);
        expect(factory).not.toHaveBeenCalled();
    });

    test('HEAD sends headers, no body, and never calls the factory', async () => {
        const req = { method: 'HEAD', headers: {} };
        const res = createRes();
        const done = collect(res);
        const factory = jest.fn(factoryFrom(BODY));
        const result = await sendStream(req, res, factory, { size: BODY.length });
        const body = await done;
        expect(result.status).toBe(200);
        expect(res.getHeader('content-length')).toBe('16');
        expect(body.length).toBe(0);
        expect(factory).not.toHaveBeenCalled();
    });

    test('If-None-Match matching etag is 304 with no factory call', async () => {
        const req = { method: 'GET', headers: { 'if-none-match': '"v1"' } };
        const res = createRes();
        const done = collect(res);
        const factory = jest.fn(factoryFrom(BODY));
        await sendStream(req, res, factory, { size: BODY.length, etag: 'v1' });
        const body = await done;
        expect(res.statusCode).toBe(304);
        expect(res.getHeader('etag')).toBe('"v1"');
        expect(body.length).toBe(0);
        expect(factory).not.toHaveBeenCalled();
    });

    test('If-Modified-Since at second granularity is 304', async () => {
        const modified = new Date('2026-01-01T00:00:00.400Z');
        const req = {
            method: 'GET',
            headers: { 'if-modified-since': 'Thu, 01 Jan 2026 00:00:00 GMT' }
        };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, factoryFrom(BODY), {
            size: BODY.length,
            lastModified: modified
        });
        const body = await done;
        expect(res.statusCode).toBe(304);
        expect(body.length).toBe(0);
    });

    test('If-Range mismatch drops Range and sends the full 200', async () => {
        const req = {
            method: 'GET',
            headers: { range: 'bytes=0-3', 'if-range': '"old"' }
        };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, factoryFrom(BODY), { size: BODY.length, etag: '"new"' });
        const body = await done;
        expect(res.statusCode).toBe(200);
        expect(body.length).toBe(16);
        expect(res.getHeader('content-range')).toBeUndefined();
    });

    test('a weak etag never matches If-Range', async () => {
        const req = {
            method: 'GET',
            headers: { range: 'bytes=0-3', 'if-range': 'W/"v1"' }
        };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, factoryFrom(BODY), { size: BODY.length, etag: 'W/"v1"' });
        const body = await done;
        expect(res.statusCode).toBe(200);
        expect(body.length).toBe(16);
    });

    test('If-Range match still serves the 206 slice', async () => {
        const req = {
            method: 'GET',
            headers: { range: 'bytes=0-3', 'if-range': '"v1"' }
        };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, factoryFrom(BODY), { size: BODY.length, etag: 'v1' });
        const body = await done;
        expect(res.statusCode).toBe(206);
        expect(body.toString()).toBe('0123');
    });

    test('client disconnect destroys the source and resolves aborted', async () => {
        let destroyed = false;
        const source = new Readable({
            read() {
                this.push(Buffer.alloc(64 * 1024));
            }
        });
        source.on('close', () => {
            destroyed = true;
        });
        const req = { method: 'GET', headers: {} };
        const res = createRes();
        const pending = sendStream(req, res, source, { mimeType: 'application/octet-stream' });
        await new Promise((resolve) => setImmediate(resolve));
        res.destroy();
        const result = await pending;
        expect(result.aborted).toBe(true);
        expect(destroyed).toBe(true);
    });

    test('non-ASCII filename carries ASCII fallback and RFC 5987 filename*', async () => {
        const req = { method: 'GET', headers: {} };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, factoryFrom(BODY), {
            size: BODY.length,
            filename: 'Bericht München.pdf'
        });
        await done;
        const cd = res.getHeader('content-disposition');
        expect(cd.startsWith('attachment;')).toBe(true);
        expect(cd).toContain('filename="Bericht M_nchen.pdf"');
        expect(cd).toContain("filename*=UTF-8''Bericht%20M%C3%BCnchen.pdf");
        expect(res.getHeader('content-type')).toBe('application/pdf');
    });

    test('disposition defaults to attachment and inline is opt-in', async () => {
        const req = { method: 'GET', headers: {} };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, BODY, { filename: 'a.xlsx' });
        await done;
        expect(res.getHeader('content-disposition').startsWith('attachment;')).toBe(true);
        expect(res.getHeader('content-type')).toContain('spreadsheetml');

        const res2 = createRes();
        const done2 = collect(res2);
        await sendStream(req, res2, BODY, { filename: 'a.pdf', disposition: 'inline' });
        await done2;
        expect(res2.getHeader('content-disposition').startsWith('inline;')).toBe(true);
    });

    test('a plain Readable ignores Range and omits Accept-Ranges', async () => {
        const req = { method: 'GET', headers: { range: 'bytes=0-3' } };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, Readable.from(BODY), { size: BODY.length });
        const body = await done;
        expect(res.statusCode).toBe(200);
        expect(res.getHeader('accept-ranges')).toBeUndefined();
        expect(body.length).toBe(16);
    });

    test('headers already sent throws a programmer error', async () => {
        const req = { method: 'GET', headers: {} };
        const res = createRes();
        res.headersSent = true;
        await expect(sendStream(req, res, BODY, {})).rejects.toThrow('headers already sent');
    });

    test('Buffer size is inferred and ranges slice without a factory', async () => {
        const req = { method: 'GET', headers: { range: 'bytes=4-7' } };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, BODY, { mimeType: 'text/plain' });
        const body = await done;
        expect(res.statusCode).toBe(206);
        expect(body.toString()).toBe('4567');
    });

    test('HEAD on a Readable destroys the unused stream', async () => {
        const src = Readable.from(BODY);
        const spy = jest.spyOn(src, 'destroy');
        const req = { method: 'HEAD', headers: {} };
        const res = createRes();
        const done = collect(res);
        await sendStream(req, res, src, {});
        await done;
        expect(spy).toHaveBeenCalled();
        expect(res.getHeader('accept-ranges')).toBeUndefined();
    });
});

// EOF webapp/tests/unit/utils/send-stream.test.js
