/**
 * @name            jPulse Framework / WebApp / Tests / Helpers / WebSocket Test Utils
 * @tagline         WebSocket test utilities
 * @description     Mock WebSocket classes and helper functions for testing
 * @file            webapp/tests/helpers/websocket-test-utils.js
 * @version         1.6.12
 * @release         2026-02-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { EventEmitter } from 'events';

/**
 * Mock WebSocket class for testing
 */
export class MockWebSocket extends EventEmitter {
    constructor() {
        super();
        this.readyState = 1; // OPEN
        this.sentMessages = [];
        this.pingsSent = 0;
    }

    send(data) {
        this.sentMessages.push(data);
        // Simulate successful send
        setImmediate(() => this.emit('sent', data));
    }

    ping() {
        this.pingsSent++;
    }

    terminate() {
        this.readyState = 3; // CLOSED
        this.emit('close');
    }

    close() {
        this.readyState = 3; // CLOSED
        this.emit('close');
    }

    // Simulate receiving a message
    simulateMessage(data) {
        const buffer = Buffer.from(JSON.stringify(data));
        this.emit('message', buffer);
    }

    // Simulate pong response
    simulatePong() {
        this.emit('pong');
    }

    // Simulate error
    simulateError(error) {
        this.emit('error', error);
    }
}

/**
 * Mock WebSocket Server for testing
 */
export class MockWebSocketServer extends EventEmitter {
    constructor() {
        super();
        this.clients = new Set();
    }

    handleUpgrade(request, socket, head, callback) {
        const ws = new MockWebSocket();
        this.clients.add(ws);
        callback(ws);
    }
}

/**
 * Create a mock authenticated session
 */
export function createAuthenticatedSession(userData = {}) {
    return {
        user: {
            id: userData.id || 'test-user-id',
            username: userData.username || 'testuser',
            email: userData.email || 'test@example.com',
            isAuthenticated: true,
            roles: userData.roles || ['user'],
            firstName: userData.firstName || 'Test',
            lastName: userData.lastName || 'User',
            initials: userData.initials || 'TU'
        }
    };
}

/**
 * Create a mock unauthenticated session
 */
export function createUnauthenticatedSession() {
    return {
        user: null
    };
}

/**
 * Create a mock request object for WebSocket upgrade
 */
export function createMockUpgradeRequest(options = {}) {
    const url = options.url || '/api/1/ws/test';
    const query = options.query || {};
    const session = options.session || createUnauthenticatedSession();

    return {
        url: `${url}?${new URLSearchParams(query).toString()}`,
        session: session,
        headers: options.headers || {},
        connection: {
            remoteAddress: options.remoteAddress || '127.0.0.1'
        }
    };
}

/**
 * Create a mock socket for upgrade
 */
export function createMockSocket() {
    const socket = new EventEmitter();
    socket.destroy = function() {
        this.destroyed = true;
        this.emit('close');
    };
    // Don't initialize destroyed - let destroy() set it
    return socket;
}

/**
 * Wait for a specific event on an emitter
 */
export function waitForEvent(emitter, eventName, timeout = 1000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for event: ${eventName}`));
        }, timeout);

        emitter.once(eventName, (...args) => {
            clearTimeout(timer);
            resolve(args);
        });
    });
}

/**
 * Wait for a message matching criteria
 */
export async function waitForMessage(ws, predicate, timeout = 1000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Timeout waiting for matching message'));
        }, timeout);

        const handler = (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (predicate(message)) {
                    clearTimeout(timer);
                    ws.removeListener('sent', handler);
                    resolve(message);
                }
            } catch (e) {
                // Ignore parse errors
            }
        };

        ws.on('sent', handler);
    });
}

/**
 * Create multiple mock clients
 */
export function createMultipleClients(count) {
    const clients = [];
    for (let i = 0; i < count; i++) {
        clients.push({
            id: `client-${i}`,
            ws: new MockWebSocket(),
            session: createAuthenticatedSession({ username: `user${i}` })
        });
    }
    return clients;
}

/**
 * Mock session middleware for testing
 */
export function createMockSessionMiddleware() {
    return (req, res, next) => {
        // Session is already on req, just call next
        if (typeof next === 'function') {
            next();
        }
    };
}

/**
 * Assert that a message was sent to a WebSocket
 */
export function assertMessageSent(ws, predicate) {
    const found = ws.sentMessages.some(msg => {
        try {
            const parsed = JSON.parse(msg);
            return predicate(parsed);
        } catch (e) {
            return false;
        }
    });

    if (!found) {
        throw new Error('Expected message not found in sent messages');
    }
}

/**
 * Get all sent messages as parsed objects
 */
export function getSentMessages(ws) {
    return ws.sentMessages.map(msg => {
        try {
            return JSON.parse(msg);
        } catch (e) {
            return null;
        }
    }).filter(Boolean);
}

export default {
    MockWebSocket,
    MockWebSocketServer,
    createAuthenticatedSession,
    createUnauthenticatedSession,
    createMockUpgradeRequest,
    createMockSocket,
    waitForEvent,
    waitForMessage,
    createMultipleClients,
    createMockSessionMiddleware,
    assertMessageSent,
    getSentMessages
};

// EOF webapp/tests/helpers/websocket-test-utils.js
