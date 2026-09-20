/**
 * @name            jPulse Framework / WebApp / Tests / Integration / Send Stream
 * @tagline         Real HTTP range / 304 / 416 paths for sendStream
 * @description     Exercises CommonUtils.sendStream over Express + supertest so Node
 *                  enforces Content-Length and suppresses a 304 body.
 * @file            webapp/tests/integration/send-stream.test.js
 * @version         2.0.6
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.19, Grok 4.6
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { Readable } from 'stream';
import { sendStream } from '../../utils/send-stream.js';

const BODY = Buffer.from('0123456789abcdef');

function createApp() {
    const app = express();
    app.get('/bytes', async (req, res) => {
        await sendStream(req, res, ({ start, end }) => {
            return Readable.from(BODY.subarray(start, end + 1));
        }, {
            mimeType: 'application/octet-stream',
            size: BODY.length,
            filename: 'Bericht München.pdf',
            etag: 'v1',
            lastModified: new Date('2026-01-01T00:00:00.000Z')
        });
    });
    return app;
}

describe('sendStream over HTTP', () => {
    let app;

    beforeAll(() => {
        if (!global.appConfig) {
            global.appConfig = { utils: { sendStream: { contentTypes: {} } } };
        }
        app = createApp();
    });

    test('GET without Range is 200 with the full body', async () => {
        const res = await request(app).get('/bytes');
        expect(res.status).toBe(200);
        expect(res.headers['content-length']).toBe('16');
        expect(res.headers['accept-ranges']).toBe('bytes');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers.etag).toBe('"v1"');
        expect(Buffer.from(res.body).toString()).toBe('0123456789abcdef');
    });

    test('Range bytes=0-3 is 206 with Content-Length 4', async () => {
        const res = await request(app).get('/bytes').set('Range', 'bytes=0-3');
        expect(res.status).toBe(206);
        expect(res.headers['content-range']).toBe('bytes 0-3/16');
        expect(res.headers['content-length']).toBe('4');
        expect(Buffer.from(res.body).toString()).toBe('0123');
    });

    test('unsatisfiable Range is 416 with an empty body', async () => {
        const res = await request(app).get('/bytes').set('Range', 'bytes=99-');
        expect(res.status).toBe(416);
        expect(res.headers['content-range']).toBe('bytes */16');
        expect(!res.body || res.body.length === 0).toBe(true);
    });

    test('If-None-Match matching etag is 304 with no body', async () => {
        const res = await request(app).get('/bytes').set('If-None-Match', '"v1"');
        expect(res.status).toBe(304);
        expect(!res.body || res.body.length === 0).toBe(true);
    });

    test('HEAD is headers only', async () => {
        const res = await request(app).head('/bytes');
        expect(res.status).toBe(200);
        expect(res.headers['content-length']).toBe('16');
        expect(res.text).toBeUndefined();
    });
});

// EOF webapp/tests/integration/send-stream.test.js
