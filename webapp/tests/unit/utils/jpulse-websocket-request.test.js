/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse WebSocket Request
 * @tagline         Unit tests for jPulse.ws.request / reply (W-208)
 * @description     Loads real jpulse-common.js and exercises the request/response client API
 * @file            webapp/tests/unit/utils/jpulse-websocket-request.test.js
 * @version         1.7.16
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.5
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { TextEncoder } from 'util';

class MockWebSocket {
    static OPEN = 1;
    static CLOSED = 3;
    constructor(url) {
        this.url = url;
        this.readyState = MockWebSocket.OPEN;
        this.sentMessages = [];
        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        MockWebSocket.instances.push(this);
        queueMicrotask(() => {
            if (typeof this.onopen === 'function') this.onopen();
        });
    }
    send(data) {
        this.sentMessages.push(data);
    }
    close(code = 1000) {
        this.readyState = MockWebSocket.CLOSED;
        if (typeof this.onclose === 'function') {
            this.onclose({ code });
        }
    }
    deliver(obj) {
        if (typeof this.onmessage === 'function') {
            this.onmessage({ data: JSON.stringify(obj) });
        }
    }
}
MockWebSocket.instances = [];

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:8080',
    pretendToBeVisual: true
});

const win = dom.window;
win.WebSocket = MockWebSocket;
win.TextEncoder = TextEncoder;

// jpulse-common.js assigns window.jPulse; run it only inside the JSDOM context
// Do not touch global.window / global.WebSocket — other suites in the same worker rely on them
const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
let jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');
jpulseCommonContent = jpulseCommonContent.replace(
    /\{\{i18n\.controller\.handlebar\.date\.fromNow\}\}/g,
    '{}'
);
const context = vm.createContext(win);
vm.runInContext(jpulseCommonContent, context);

const jPulse = win.jPulse;

describe('jPulse.ws request/response (W-208)', () => {

    beforeEach(() => {
        MockWebSocket.instances = [];
        jPulse.ws._connections.clear();
        win.sessionStorage.clear();
        win.localStorage.clear();
    });

    afterEach(() => {
        jPulse.ws._connections.forEach((conn) => {
            if (conn.handle) conn.handle.disconnect();
        });
        jPulse.ws._connections.clear();
    });

    async function connectAndWelcome(path = '/api/1/ws/w208-client', limits = { maxSize: 65536, interval: 1000, maxMessages: 50 }) {
        const handle = jPulse.ws.connect(path);
        await Promise.resolve(); // onopen microtask
        const sock = MockWebSocket.instances[MockWebSocket.instances.length - 1];
        sock.deliver({
            success: true,
            data: {
                type: 'connected',
                clientId: 'cid-1',
                namespace: path,
                limits
            }
        });
        return { handle, sock };
    }

    test('request() resolves on matching reply', async () => {
        const { handle, sock } = await connectAndWelcome();
        const promise = handle.request({ type: 'get-data', data: { id: 1 } });
        expect(sock.sentMessages).toHaveLength(1);
        const sent = JSON.parse(sock.sentMessages[0]);
        expect(sent.requestId).toBeTruthy();
        expect(sent.type).toBe('get-data');

        sock.deliver({
            success: true,
            data: { type: 'response', data: { id: 1, value: 'ok' } },
            requestId: sent.requestId
        });

        const res = await promise;
        expect(res.success).toBe(true);
        expect(res.data.data.value).toBe('ok');
        expect(res.requestId).toBe(sent.requestId);
    });

    test('correlated reply is not delivered to onMessage handlers', async () => {
        const { handle, sock } = await connectAndWelcome();
        const seen = [];
        handle.onMessage((msg) => seen.push(msg));

        const promise = handle.request({ type: 'q' });
        const sent = JSON.parse(sock.sentMessages[0]);
        sock.deliver({ success: true, data: { type: 'a' }, requestId: sent.requestId });
        await promise;
        expect(seen).toHaveLength(0);

        sock.deliver({ success: true, data: { type: 'broadcast' }, requestId: 'unknown-id' });
        expect(seen).toHaveLength(1);
        expect(seen[0].data.type).toBe('broadcast');
    });

    test('request() resolves REQUEST_TIMEOUT', async () => {
        const { handle } = await connectAndWelcome();
        const res = await handle.request({ type: 'slow' }, { timeoutMs: 30 });
        expect(res.success).toBe(false);
        expect(res.code).toBe('REQUEST_TIMEOUT');
    }, 5000);

    test('request() resolves NOT_CONNECTED when socket closed', async () => {
        const handle = jPulse.ws.connect('/api/1/ws/w208-closed');
        const sock = MockWebSocket.instances[0];
        sock.readyState = MockWebSocket.CLOSED;
        const res = await handle.request({ type: 'x' });
        expect(res.success).toBe(false);
        expect(res.code).toBe('NOT_CONNECTED');
    });

    test('request() resolves MESSAGE_TOO_LARGE from size pre-check', async () => {
        const { handle } = await connectAndWelcome('/api/1/ws/w208-small', {
            maxSize: 20,
            interval: 1000,
            maxMessages: 50
        });
        const res = await handle.request({
            type: 'big',
            data: { padding: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }
        });
        expect(res.success).toBe(false);
        expect(res.code).toBe('MESSAGE_TOO_LARGE');
        expect(res.details.limit).toBe(20);
    });

    test('disconnect() settles pending with CONNECTION_LOST', async () => {
        const { handle } = await connectAndWelcome();
        const promise = handle.request({ type: 'q' }, { timeoutMs: 60000 });
        handle.disconnect();
        const res = await promise;
        expect(res.success).toBe(false);
        expect(res.code).toBe('CONNECTION_LOST');
    });

    test('socket close settles pending with CONNECTION_LOST', async () => {
        const { handle, sock } = await connectAndWelcome();
        const promise = handle.request({ type: 'q' }, { timeoutMs: 60000 });
        sock.close(1006);
        const res = await promise;
        expect(res.success).toBe(false);
        expect(res.code).toBe('CONNECTION_LOST');
    });

    test('reply() echoes requestId from server-initiated request', async () => {
        const { handle, sock } = await connectAndWelcome();
        let inbound = null;
        handle.onMessage((msg) => { inbound = msg; });

        sock.deliver({
            success: true,
            data: { type: 'tool-call', data: { name: 'read' } },
            requestId: 'srv-1'
        });
        expect(inbound.requestId).toBe('srv-1');

        const ok = handle.reply(inbound, { type: 'tool-result', data: { text: 'hi' } });
        expect(ok).toBe(true);
        const sent = JSON.parse(sock.sentMessages[sock.sentMessages.length - 1]);
        expect(sent.requestId).toBe('srv-1');
        expect(sent.type).toBe('tool-result');
    });

    test('getLimits() returns welcome limits', async () => {
        const { handle } = await connectAndWelcome('/api/1/ws/w208-lim', {
            maxSize: 4096,
            interval: 500,
            maxMessages: 10
        });
        expect(handle.getLimits()).toEqual({
            maxSize: 4096,
            interval: 500,
            maxMessages: 10
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-websocket-request.test.js
