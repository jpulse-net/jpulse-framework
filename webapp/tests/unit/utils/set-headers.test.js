/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Set Headers
 * @tagline         Unit tests for applySetHeaders
 * @description     Plain availableHeaders entries emit the key; alias entries emit header/value
 * @file            webapp/tests/unit/utils/set-headers.test.js
 * @version         2.0.0
 * @release         2026-09-14
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.19, Grok 4.6
 */

import { describe, test, expect } from '@jest/globals';
import { applySetHeaders } from '../../../utils/set-headers.js';

function mockRes() {
    const headers = {};
    return {
        headers,
        setHeader(name, value) {
            headers[name] = value;
        }
    };
}

describe('applySetHeaders', () => {
    test('a plain entry emits the key as the header name', () => {
        const res = mockRes();
        applySetHeaders(res, {
            headers: ['X-Content-Type-Options', 'Report-To'],
            availableHeaders: {
                'X-Content-Type-Options': 'nosniff',
                'Report-To': '{"group":"default"}'
            }
        });
        expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
        expect(res.headers['Report-To']).toBe('{"group":"default"}');
        expect(res.headers['Content-Security-Policy-Frameable']).toBeUndefined();
    });

    test('an alias entry emits its mapped header name, not the key', () => {
        const res = mockRes();
        applySetHeaders(res, {
            headers: ['Content-Security-Policy-Frameable'],
            availableHeaders: {
                'Content-Security-Policy-Frameable': {
                    header: 'Content-Security-Policy',
                    value: "default-src 'self'; frame-ancestors 'self'"
                }
            }
        });
        expect(res.headers['Content-Security-Policy']).toBe(
            "default-src 'self'; frame-ancestors 'self'"
        );
        expect(res.headers['Content-Security-Policy-Frameable']).toBeUndefined();
    });

    test('a missing key is skipped and logged', () => {
        const res = mockRes();
        const missing = [];
        applySetHeaders(res, {
            headers: ['Nope'],
            availableHeaders: {}
        }, (msg) => missing.push(msg));
        expect(res.headers).toEqual({});
        expect(missing[0]).toContain('Nope');
    });
});

// EOF webapp/tests/unit/utils/set-headers.test.js
