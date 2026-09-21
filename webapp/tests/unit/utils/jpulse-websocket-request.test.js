/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse WebSocket Request
 * @tagline         Unit tests for jPulse.ws.request / reply (W-208)
 * @description     Loads real jpulse-common.js and exercises the request/response client API
 * @file            webapp/tests/unit/utils/jpulse-websocket-request.test.js
 * @version         2.0.9
 * @release         2026-09-21
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { TextEncoder } from 'util';

class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 3;
    static autoOpen = true;
    constructor(url) {
        this.url = url;
        this.readyState = MockWebSocket.autoOpen ? MockWebSocket.OPEN : MockWebSocket.CONNECTING;
        this.sentMessages = [];
        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        MockWebSocket.instances.push(this);
        if (MockWebSocket.autoOpen) {
            queueMicrotask(() => {
                if (typeof this.onopen === 'function') this.onopen();
            });
        }
    }
    open() {
        this.readyState = MockWebSocket.OPEN;
        if (typeof this.onopen === 'function') {
            this.onopen();
        }
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
        const { handle } = await connectAndWelcome('/api/1/ws/w208-closed');
        handle.disconnect();
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

describe('jPulse.ws send queue (W-235)', () => {

    beforeEach(() => {
        MockWebSocket.instances = [];
        MockWebSocket.autoOpen = false;
        jPulse.ws._connections.clear();
        win.sessionStorage.clear();
        win.localStorage.clear();
    });

    afterEach(() => {
        MockWebSocket.autoOpen = true;
        jPulse.ws._connections.forEach((conn) => {
            if (conn.handle) conn.handle.disconnect();
        });
        jPulse.ws._connections.clear();
    });

    function connectHeld(path, options) {
        const handle = jPulse.ws.connect(path, options);
        const sock = MockWebSocket.instances[MockWebSocket.instances.length - 1];
        return { handle, sock };
    }

    test('send before open is delivered once, in order', () => {
        const { handle, sock } = connectHeld('/api/1/ws/w235-order');
        expect(handle.send({ type: 'a' })).toBe(true);
        expect(handle.send({ type: 'b' })).toBe(true);
        expect(sock.sentMessages).toHaveLength(0);
        sock.open();
        expect(sock.sentMessages).toHaveLength(2);
        expect(JSON.parse(sock.sentMessages[0]).type).toBe('a');
        expect(JSON.parse(sock.sentMessages[1]).type).toBe('b');
    });

    test('send while disconnected or auth-required is refused', () => {
        const { handle, sock } = connectHeld('/api/1/ws/w235-refuse');
        sock.open();
        handle.disconnect();
        expect(handle.send({ type: 'late' })).toBe(false);
        expect(sock.sentMessages.some((row) => {
            try {
                return JSON.parse(row).type === 'late';
            } catch (_err) {
                return false;
            }
        })).toBe(false);

        const second = connectHeld('/api/1/ws/w235-auth');
        expect(second.handle.send({ type: 'queued' })).toBe(true);
        second.sock.close(4401);
        expect(second.handle.getStatus()).toBe('auth-required');
        expect(second.handle.send({ type: 'after-auth' })).toBe(false);
    });

    test('over-length drops the oldest; over-age is dropped at flush', async () => {
        const { handle, sock } = connectHeld('/api/1/ws/w235-len', { maxQueueLength: 2 });
        expect(handle.send({ type: 'one' })).toBe(true);
        expect(handle.send({ type: 'two' })).toBe(true);
        expect(handle.send({ type: 'three' })).toBe(true);
        sock.open();
        const types = sock.sentMessages.map((row) => JSON.parse(row).type);
        expect(types).toEqual(['two', 'three']);

        const aged = connectHeld('/api/1/ws/w235-age', { maxQueueAgeMs: 5 });
        expect(aged.handle.send({ type: 'stale' })).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 15));
        aged.sock.open();
        expect(aged.sock.sentMessages).toHaveLength(0);
    });

    test('disconnect and 4401 clear the outbox', () => {
        const { handle, sock } = connectHeld('/api/1/ws/w235-disc');
        expect(handle.send({ type: 'gone' })).toBe(true);
        handle.disconnect();
        sock.open();
        expect(sock.sentMessages).toHaveLength(0);

        const auth = connectHeld('/api/1/ws/w235-4401');
        expect(auth.handle.send({ type: 'auth-gone' })).toBe(true);
        auth.sock.close(4401);
        expect(auth.handle.getStatus()).toBe('auth-required');
        auth.sock.readyState = MockWebSocket.OPEN;
        if (typeof auth.sock.onopen === 'function') {
            auth.sock.onopen();
        }
        expect(auth.sock.sentMessages).toHaveLength(0);
    });

    test('queued request times out on the enqueue clock and a drop is NOT_CONNECTED', async () => {
        const { handle } = connectHeld('/api/1/ws/w235-req-timeout');
        const timed = handle.request({ type: 'slow' }, { timeoutMs: 30 });
        const res = await timed;
        expect(res.success).toBe(false);
        expect(res.code).toBe('REQUEST_TIMEOUT');

        const drop = connectHeld('/api/1/ws/w235-req-drop', { maxQueueLength: 1 });
        const first = drop.handle.request({ type: 'keep' });
        const second = drop.handle.request({ type: 'newer' });
        const dropped = await first;
        expect(dropped.success).toBe(false);
        expect(dropped.code).toBe('NOT_CONNECTED');
        drop.sock.open();
        const sent = JSON.parse(drop.sock.sentMessages[0]);
        expect(sent.type).toBe('newer');
        drop.sock.deliver({
            success: true,
            data: { type: 'ok' },
            requestId: sent.requestId
        });
        const kept = await second;
        expect(kept.success).toBe(true);
    });

    test('flush runs before connected status callbacks', () => {
        const { handle, sock } = connectHeld('/api/1/ws/w235-flush-order');
        const order = [];
        handle.onStatusChange((status) => {
            if (status === 'connected') {
                order.push('status');
                handle.send({ type: 'from-status' });
            }
        });
        handle.send({ type: 'queued' });
        const origSend = sock.send.bind(sock);
        sock.send = (data) => {
            order.push(JSON.parse(data).type);
            origSend(data);
        };
        sock.open();
        expect(order).toEqual(['queued', 'status', 'from-status']);
    });
});

// EOF webapp/tests/unit/utils/jpulse-websocket-request.test.js
