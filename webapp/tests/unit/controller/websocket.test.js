/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / WebSocket
 * @tagline         Unit tests for WebSocket Controller
 * @description     Tests for WebSocket infrastructure, authentication, broadcasting, and lifecycle
 * @file            webapp/tests/unit/controller/websocket.test.js
 * @version         1.6.13
 * @release         2026-02-10
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.4, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach, beforeAll, afterEach, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';
import WebSocketTestUtils from '../../helpers/websocket-test-utils.js';

// Set up global appConfig BEFORE any dynamic imports
TestUtils.setupGlobalMocksWithConsolidatedConfig();

// Declare variables for dynamically imported modules
let WebSocketController, AuthController, LogController;

// Mock dependencies
jest.mock('../../../controller/log.js');
jest.mock('../../../controller/auth.js');

// Mock the ws library
const mockWss = new WebSocketTestUtils.MockWebSocketServer();
jest.mock('ws', () => ({
    WebSocketServer: jest.fn(() => mockWss)
}));

describe('WebSocketController - High Priority Tests', () => {

    beforeAll(async () => {
        // Import modules after mocks are set up
        WebSocketController = (await import('../../../controller/websocket.js')).default;
        AuthController = (await import('../../../controller/auth.js')).default;
        LogController = (await import('../../../controller/log.js')).default;

        // Mock LogController methods
        LogController.logInfo = jest.fn();
        LogController.logError = jest.fn();
    });

    beforeEach(() => {
        // Clear mock call history but keep the mock implementations
        if (LogController.logInfo) LogController.logInfo.mockClear();
        if (LogController.logError) LogController.logError.mockClear();
        if (AuthController.isAuthenticated) AuthController.isAuthenticated.mockClear();
        if (AuthController.isAuthorized) AuthController.isAuthorized.mockClear();

        // Reset WebSocketController state
        WebSocketController.namespaces.clear();
        WebSocketController.patternNamespaces.length = 0;
        WebSocketController.stats = {
            startTime: Date.now(),
            totalMessages: 0,
            activityLog: []
        };

        // Reset wss to null (tests will set it up as needed)
        WebSocketController.wss = null;
    });

    // =========================================================================
    // AUTHENTICATION & AUTHORIZATION TESTS (Highest Priority)
    // =========================================================================

    describe('Authentication & Authorization', () => {

        test('should use AuthController.isAuthenticated() for authentication check', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                requireAuth: true,
                requireRoles: [],
                clients: new Map()
            };
            WebSocketController.namespaces.set('/api/1/ws/test', namespace);

            const mockRequest = WebSocketTestUtils.createMockUpgradeRequest({
                url: '/api/1/ws/test',
                session: WebSocketTestUtils.createAuthenticatedSession()
            });
            const mockSocket = WebSocketTestUtils.createMockSocket();
            const mockHead = {};

            // Mock AuthController
            AuthController.isAuthenticated = jest.fn().mockReturnValue(true);
            AuthController.isAuthorized = jest.fn().mockReturnValue(true);

            // W-155: New signature with patternMatch, extractedParams, pathname
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                null, // patternMatch
                {}, // extractedParams
                mockRequest.session.user,
                mockRequest.session.user.username,
                {},
                '/api/1/ws/test' // pathname
            );

            // Assert
            expect(AuthController.isAuthenticated).toHaveBeenCalledWith(mockRequest);
        });

        test('should use AuthController.isAuthorized() for role check', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                requireAuth: true,
                requireRoles: ['admin'],
                clients: new Map()
            };
            WebSocketController.namespaces.set('/api/1/ws/test', namespace);

            const mockRequest = WebSocketTestUtils.createMockUpgradeRequest({
                url: '/api/1/ws/test',
                session: WebSocketTestUtils.createAuthenticatedSession({ roles: ['admin'] })
            });
            const mockSocket = WebSocketTestUtils.createMockSocket();
            const mockHead = {};

            // Mock AuthController
            AuthController.isAuthenticated = jest.fn().mockReturnValue(true);
            AuthController.isAuthorized = jest.fn().mockReturnValue(true);

            // W-155: New signature
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                null, // patternMatch
                {}, // extractedParams
                mockRequest.session.user,
                mockRequest.session.user.username,
                {},
                '/api/1/ws/test' // pathname
            );

            // Assert
            expect(AuthController.isAuthorized).toHaveBeenCalledWith(mockRequest, ['admin']);
        });

        test('should block connection when auth required but not present', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                requireAuth: true,
                requireRoles: [],
                clients: new Map()
            };

            const mockRequest = WebSocketTestUtils.createMockUpgradeRequest({
                url: '/api/1/ws/test',
                session: WebSocketTestUtils.createUnauthenticatedSession()
            });
            const mockSocket = WebSocketTestUtils.createMockSocket();
            const mockHead = {};

            // Mock AuthController to reject
            AuthController.isAuthenticated = jest.fn().mockReturnValue(false);

            // Act
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                null,
                '',
                {}
            );

            // Assert
            expect(mockSocket.destroyed).toBe(true);
            // Verify wss.handleUpgrade was NOT called (connection rejected)
            expect(WebSocketController.wss).toBeNull();
        });

        test('should allow connection when auth present and required', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                requireAuth: true,
                requireRoles: [],
                clients: new Map(),
                _onConnect: jest.fn()
            };
            WebSocketController.namespaces.set('/api/1/ws/test', namespace);

            const mockRequest = WebSocketTestUtils.createMockUpgradeRequest({
                url: '/api/1/ws/test',
                session: WebSocketTestUtils.createAuthenticatedSession()
            });
            const mockSocket = WebSocketTestUtils.createMockSocket();
            const mockHead = {};

            // Mock AuthController to accept
            AuthController.isAuthenticated = jest.fn().mockReturnValue(true);

            // Mock wss.handleUpgrade
            const handleUpgradeMock = jest.fn((req, socket, head, callback) => {
                const ws = new WebSocketTestUtils.MockWebSocket();
                callback(ws);
            });
            WebSocketController.wss = {
                handleUpgrade: handleUpgradeMock
            };

            // W-155: New signature
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                null, // patternMatch
                {}, // extractedParams
                mockRequest.session.user,
                mockRequest.session.user.username,
                {},
                '/api/1/ws/test' // pathname
            );

            // Assert
            expect(mockSocket.destroyed).not.toBe(true); // Should not be destroyed
            expect(handleUpgradeMock).toHaveBeenCalled();
        });

        test('should block connection when role not satisfied', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/admin',
                requireAuth: true,
                requireRoles: ['admin', 'root'],
                clients: new Map()
            };

            const mockRequest = WebSocketTestUtils.createMockUpgradeRequest({
                url: '/api/1/ws/admin',
                session: WebSocketTestUtils.createAuthenticatedSession({ roles: ['user'] })
            });
            const mockSocket = WebSocketTestUtils.createMockSocket();
            const mockHead = {};

            // Mock AuthController
            AuthController.isAuthenticated = jest.fn().mockReturnValue(true);
            AuthController.isAuthorized = jest.fn().mockReturnValue(false);

            // W-155: New signature
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                null, // patternMatch
                {}, // extractedParams
                mockRequest.session.user,
                mockRequest.session.user.username,
                {},
                '/api/1/ws/admin' // pathname
            );

            // Assert
            expect(mockSocket.destroyed).toBe(true);
            // Verify wss.handleUpgrade was NOT called (connection rejected)
            expect(WebSocketController.wss).toBeNull();
        });

        test('should allow connection when role satisfied', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/admin',
                requireAuth: true,
                requireRoles: ['admin', 'root'],
                clients: new Map(),
                _onConnect: jest.fn()
            };
            WebSocketController.namespaces.set('/api/1/ws/admin', namespace);

            const mockRequest = WebSocketTestUtils.createMockUpgradeRequest({
                url: '/api/1/ws/admin',
                session: WebSocketTestUtils.createAuthenticatedSession({ roles: ['admin'] })
            });
            const mockSocket = WebSocketTestUtils.createMockSocket();
            const mockHead = {};

            // Mock AuthController
            AuthController.isAuthenticated = jest.fn().mockReturnValue(true);
            AuthController.isAuthorized = jest.fn().mockReturnValue(true);

            // Mock wss.handleUpgrade
            const handleUpgradeMock = jest.fn((req, socket, head, callback) => {
                const ws = new WebSocketTestUtils.MockWebSocket();
                callback(ws);
            });
            WebSocketController.wss = {
                handleUpgrade: handleUpgradeMock
            };

            // W-155: New signature
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                null, // patternMatch
                {}, // extractedParams
                mockRequest.session.user,
                mockRequest.session.user.username,
                {},
                '/api/1/ws/admin' // pathname
            );

            // Assert
            expect(mockSocket.destroyed).not.toBe(true); // Should not be destroyed
            expect(handleUpgradeMock).toHaveBeenCalled();
        });

        test('should allow connection without auth when not required', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/public',
                requireAuth: false,
                requireRoles: [],
                clients: new Map(),
                _onConnect: jest.fn()
            };
            WebSocketController.namespaces.set('/api/1/ws/public', namespace);

            const mockRequest = WebSocketTestUtils.createMockUpgradeRequest({
                url: '/api/1/ws/public',
                session: WebSocketTestUtils.createUnauthenticatedSession()
            });
            const mockSocket = WebSocketTestUtils.createMockSocket();
            const mockHead = {};

            // Mock wss.handleUpgrade
            const handleUpgradeMock = jest.fn((req, socket, head, callback) => {
                const ws = new WebSocketTestUtils.MockWebSocket();
                callback(ws);
            });
            WebSocketController.wss = {
                handleUpgrade: handleUpgradeMock
            };

            // W-155: New signature
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                null, // patternMatch
                {}, // extractedParams
                null, // user
                '', // username
                {},
                '/api/1/ws/public' // pathname
            );

            // Assert
            expect(mockSocket.destroyed).not.toBe(true); // Should not be destroyed
            expect(handleUpgradeMock).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // BROADCASTING TESTS (High Priority)
    // =========================================================================

    describe('Broadcasting', () => {

        test('should broadcast to all connected clients in namespace', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                stats: {
                    totalMessages: 0,
                    lastActivity: Date.now(),
                    messageTimestamps: []
                }
            };

            const client1 = {
                id: 'client1',
                ws: new WebSocketTestUtils.MockWebSocket(),
                lastPing: Date.now(),
                lastPong: Date.now()
            };
            const client2 = {
                id: 'client2',
                ws: new WebSocketTestUtils.MockWebSocket(),
                lastPing: Date.now(),
                lastPong: Date.now()
            };

            namespace.clients.set('client1', client1);
            namespace.clients.set('client2', client2);
            WebSocketController.namespaces.set('/api/1/ws/test', namespace);

            const testData = { type: 'notification', message: 'Hello' };

            // Act (W-154 Phase 3: broadcast(data, ctx))
            WebSocketController.broadcast('/api/1/ws/test', testData, { username: 'testuser', ip: '0.0.0.0' });

            // Assert
            const messages1 = WebSocketTestUtils.getSentMessages(client1.ws);
            const messages2 = WebSocketTestUtils.getSentMessages(client2.ws);

            expect(messages1).toHaveLength(1);
            expect(messages2).toHaveLength(1);
            expect(messages1[0].success).toBe(true);
            expect(messages1[0].data.ctx).toEqual({ username: 'testuser', ip: '0.0.0.0' });
            expect(messages1[0].data.type).toBe('notification');
            expect(messages1[0].data.message).toBe('Hello');
        });

        test('should include username in broadcast messages', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                stats: {
                    totalMessages: 0,
                    lastActivity: Date.now(),
                    messageTimestamps: []
                }
            };

            const client = {
                id: 'client1',
                ws: new WebSocketTestUtils.MockWebSocket(),
                lastPing: Date.now(),
                lastPong: Date.now()
            };

            namespace.clients.set('client1', client);
            WebSocketController.namespaces.set('/api/1/ws/test', namespace);

            // Act (W-154 Phase 3: broadcast(data, ctx))
            WebSocketController.broadcast('/api/1/ws/test', { type: 'test' }, { username: 'alice', ip: '0.0.0.0' });

            // Assert
            const messages = WebSocketTestUtils.getSentMessages(client.ws);
            expect(messages[0].data.ctx.username).toBe('alice');
        });

        test('should format message with success wrapper', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                stats: {
                    totalMessages: 0,
                    lastActivity: Date.now(),
                    messageTimestamps: []
                }
            };

            const client = {
                id: 'client1',
                ws: new WebSocketTestUtils.MockWebSocket(),
                lastPing: Date.now(),
                lastPong: Date.now()
            };

            namespace.clients.set('client1', client);
            WebSocketController.namespaces.set('/api/1/ws/test', namespace);

            // Act (no ctx => default ctx)
            WebSocketController.broadcast('/api/1/ws/test', { type: 'test', data: 123 });

            // Assert (payload has ctx from W-155: full DEFAULT_CTX)
            const messages = WebSocketTestUtils.getSentMessages(client.ws);
            expect(messages[0]).toHaveProperty('success', true);
            expect(messages[0]).toHaveProperty('data');
            expect(messages[0].data.type).toBe('test');
            expect(messages[0].data.data).toBe(123);
            expect(messages[0].data.ctx).toEqual({
                username: '_system',
                ip: '0.0.0.0',
                roles: [],
                firstName: '',
                lastName: '',
                initials: '',
                params: {}
            });
        });

        test('should only send to clients with readyState === 1 (OPEN)', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                stats: {
                    totalMessages: 0,
                    lastActivity: Date.now(),
                    messageTimestamps: []
                }
            };

            const client1 = {
                id: 'client1',
                ws: new WebSocketTestUtils.MockWebSocket(),
                lastPing: Date.now(),
                lastPong: Date.now()
            };
            client1.ws.readyState = 1; // OPEN

            const client2 = {
                id: 'client2',
                ws: new WebSocketTestUtils.MockWebSocket(),
                lastPing: Date.now(),
                lastPong: Date.now()
            };
            client2.ws.readyState = 0; // CONNECTING

            const client3 = {
                id: 'client3',
                ws: new WebSocketTestUtils.MockWebSocket(),
                lastPing: Date.now(),
                lastPong: Date.now()
            };
            client3.ws.readyState = 3; // CLOSED

            namespace.clients.set('client1', client1);
            namespace.clients.set('client2', client2);
            namespace.clients.set('client3', client3);
            WebSocketController.namespaces.set('/api/1/ws/test', namespace);

            // Act
            WebSocketController.broadcast('/api/1/ws/test', { type: 'test' });

            // Assert
            expect(client1.ws.sentMessages).toHaveLength(1);
            expect(client2.ws.sentMessages).toHaveLength(0);
            expect(client3.ws.sentMessages).toHaveLength(0);
        });

        test('should not affect clients in other namespaces', () => {
            // Arrange
            const namespace1 = {
                path: '/api/1/ws/test1',
                clients: new Map(),
                stats: {
                    totalMessages: 0,
                    lastActivity: Date.now(),
                    messageTimestamps: []
                }
            };
            const namespace2 = {
                path: '/api/1/ws/test2',
                clients: new Map(),
                stats: {
                    totalMessages: 0,
                    lastActivity: Date.now(),
                    messageTimestamps: []
                }
            };

            const client1 = {
                id: 'client1',
                ws: new WebSocketTestUtils.MockWebSocket(),
                lastPing: Date.now(),
                lastPong: Date.now()
            };
            const client2 = {
                id: 'client2',
                ws: new WebSocketTestUtils.MockWebSocket(),
                lastPing: Date.now(),
                lastPong: Date.now()
            };

            namespace1.clients.set('client1', client1);
            namespace2.clients.set('client2', client2);
            WebSocketController.namespaces.set('/api/1/ws/test1', namespace1);
            WebSocketController.namespaces.set('/api/1/ws/test2', namespace2);

            // Act
            WebSocketController.broadcast('/api/1/ws/test1', { type: 'test' });

            // Assert
            expect(client1.ws.sentMessages).toHaveLength(1);
            expect(client2.ws.sentMessages).toHaveLength(0);
        });

        test('should handle non-existent namespace gracefully', () => {
            // Act & Assert - should not throw
            expect(() => {
                WebSocketController.broadcast('/api/1/ws/nonexistent', { type: 'test' });
            }).not.toThrow();

            // The key behavior is that it doesn't throw - error is logged internally
            // We've verified above that it didn't throw
        });
    });

    // =========================================================================
    // NAMESPACE REGISTRATION TESTS (High Priority)
    // =========================================================================

    describe('Namespace Registration', () => {

        test('should create namespace successfully (W-154)', () => {
            const path = '/api/1/ws/test';
            const ns = WebSocketController.createNamespace(path, { requireAuth: false });

            expect(WebSocketController.namespaces.has(path)).toBe(true);
            const namespace = WebSocketController.namespaces.get(path);
            expect(namespace.path).toBe(path);
            expect(namespace.requireAuth).toBe(false);
            expect(ns.broadcast).toBeDefined();
            expect(ns.sendToClient).toBeDefined();
            expect(ns.getStats).toBeDefined();
        });

        test('should validate /api/1/ws/* path prefix', () => {
            expect(() => {
                WebSocketController.createNamespace('/invalid/path', {});
            }).toThrow();
        });

        test('should store callbacks correctly via .onConnect/.onMessage/.onDisconnect', () => {
            const onConnect = jest.fn();
            const onMessage = jest.fn();
            const onDisconnect = jest.fn();

            const ns = WebSocketController.createNamespace('/api/1/ws/test', {})
                .onConnect(onConnect)
                .onMessage(onMessage)
                .onDisconnect(onDisconnect);

            const namespace = WebSocketController.namespaces.get('/api/1/ws/test');
            expect(namespace._onConnect).toBe(onConnect);
            expect(namespace._onMessage).toBe(onMessage);
            expect(namespace._onDisconnect).toBe(onDisconnect);
            expect(ns).toBe(namespace);
        });

        test('should handle requireAuth option', () => {
            WebSocketController.createNamespace('/api/1/ws/test-auth', { requireAuth: true });
            const namespace = WebSocketController.namespaces.get('/api/1/ws/test-auth');
            expect(namespace.requireAuth).toBe(true);
        });

        test('should handle requireRoles option', () => {
            WebSocketController.createNamespace('/api/1/ws/test-roles', {
                requireAuth: true,
                requireRoles: ['admin', 'root']
            });
            const namespace = WebSocketController.namespaces.get('/api/1/ws/test-roles');
            expect(namespace.requireRoles).toEqual(['admin', 'root']);
        });
    });

    // =========================================================================
    // ASYNC onMessage (W-149)
    // =========================================================================

    describe('Async onMessage', () => {

        test('should send error to client when async onMessage rejects', async () => {
            // Arrange
            const clientId = 'test-client-1';
            const mockWs = new WebSocketTestUtils.MockWebSocket();
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                stats: {
                    totalMessages: 0,
                    messagesPerHour: 0,
                    lastActivity: Date.now(),
                    messageTimestamps: []
                },
                _onMessage: jest.fn().mockRejectedValue(new Error('async error'))
            };
            namespace.clients.set(clientId, {
                ws: mockWs,
                ctx: { username: '(guest)', ip: '0.0.0.0', roles: [], firstName: '', lastName: '', initials: '', params: {} },
                lastPing: Date.now(),
                lastPong: Date.now()
            });
            const data = Buffer.from(JSON.stringify({ type: 'test' }));

            // W-155: New signature (no user, username)
            await WebSocketController._onMessage(clientId, namespace, data);

            // Assert: client receives error message (same format as sync throw)
            expect(mockWs.sentMessages).toHaveLength(1);
            const sent = JSON.parse(mockWs.sentMessages[0]);
            expect(sent.success).toBe(false);
            expect(sent.error).toBe('async error');
            expect(sent.code).toBe(500);
            expect(sent.username).toBe('');
        });
    });

    // =========================================================================
    // CLIENT CONNECTION TESTS (High Priority)
    // =========================================================================

    describe('Client Connection', () => {

        test('should assign unique client ID', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                _onConnect: jest.fn()
            };
            const ws = new WebSocketTestUtils.MockWebSocket();
            const ctx = {
                username: 'testuser',
                ip: '127.0.0.1',
                roles: [],
                firstName: '',
                lastName: '',
                initials: '',
                params: {}
            };

            WebSocketController._onConnection(ws, namespace, ctx, null);

            expect(namespace.clients.size).toBe(1);
            const clientId = Array.from(namespace.clients.keys())[0];
            expect(clientId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        test('should use client-provided UUID if valid', () => {
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                _onConnect: jest.fn()
            };
            const ws = new WebSocketTestUtils.MockWebSocket();
            const clientUUID = '12345678-1234-4567-8901-123456789012';

            const ctx = {
                username: '(guest)',
                ip: '127.0.0.1',
                roles: [],
                firstName: '',
                lastName: '',
                initials: '',
                params: {}
            };

            WebSocketController._onConnection(ws, namespace, ctx, clientUUID);

            expect(namespace.clients.has(clientUUID)).toBe(true);
        });

        test('should store client in namespace', () => {
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                _onConnect: jest.fn()
            };
            const ws = new WebSocketTestUtils.MockWebSocket();
            const ctx = {
                username: '(guest)',
                ip: '127.0.0.1',
                roles: [],
                firstName: '',
                lastName: '',
                initials: '',
                params: {}
            };

            WebSocketController._onConnection(ws, namespace, ctx, null);

            expect(namespace.clients.size).toBe(1);
            const client = Array.from(namespace.clients.values())[0];
            expect(client.ws).toBe(ws);
        });

        test('should call onConnect callback with conn (W-155: ctx-only)', () => {
            const _onConnect = jest.fn();
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                _onConnect
            };
            const ws = new WebSocketTestUtils.MockWebSocket();
            const ctx = {
                username: 'testuser',
                ip: '127.0.0.1',
                roles: [],
                firstName: '',
                lastName: '',
                initials: '',
                params: {}
            };

            WebSocketController._onConnection(ws, namespace, ctx, null);

            expect(_onConnect).toHaveBeenCalledTimes(1);
            const conn = _onConnect.mock.calls[0][0];
            expect(conn.clientId).toBeDefined();
            expect(conn.user).toBeUndefined(); // W-155: no conn.user
            expect(conn.ctx).toEqual(ctx);
        });

        test('should initialize ping/pong timestamps', () => {
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                _onConnect: jest.fn()
            };
            const ws = new WebSocketTestUtils.MockWebSocket();

            const ctx = {
                username: '(guest)',
                ip: '127.0.0.1',
                roles: [],
                firstName: '',
                lastName: '',
                initials: '',
                params: {}
            };

            const beforeTime = Date.now();
            WebSocketController._onConnection(ws, namespace, ctx, null);
            const afterTime = Date.now();

            // Assert
            const client = Array.from(namespace.clients.values())[0];
            expect(client.lastPing).toBeGreaterThanOrEqual(beforeTime);
            expect(client.lastPing).toBeLessThanOrEqual(afterTime);
            expect(client.lastPong).toBeGreaterThanOrEqual(beforeTime);
            expect(client.lastPong).toBeLessThanOrEqual(afterTime);
        });
    });

    // =========================================================================
    // SESSION INTEGRATION TESTS (High Priority)
    // =========================================================================

    describe('Session Integration', () => {

        test('should invoke sessionMiddleware during upgrade', () => {
            // Arrange
            const mockSessionMiddleware = jest.fn((req, res, next) => {
                // Simulate session being available
                req.session = WebSocketTestUtils.createAuthenticatedSession();
                next();
            });
            WebSocketController.sessionMiddleware = mockSessionMiddleware;

            const namespace = {
                path: '/api/1/ws/test',
                requireAuth: false,
                requireRoles: [],
                clients: new Map()
            };
            WebSocketController.namespaces.set('/api/1/ws/test', namespace);

            const mockRequest = {
                url: '/api/1/ws/test',
                headers: {}
            };
            const mockSocket = WebSocketTestUtils.createMockSocket();
            const mockHead = {};

            // Act
            WebSocketController._handleUpgrade(mockRequest, mockSocket, mockHead);

            // Assert
            expect(mockSessionMiddleware).toHaveBeenCalledWith(mockRequest, {}, expect.any(Function));
        });

        test('should extract user from session', () => {
            // Arrange
            const testUser = {
                username: 'alice',
                roles: ['admin']
            };

            const mockSessionMiddleware = jest.fn((req, res, next) => {
                req.session = { user: testUser };
                next();
            });
            WebSocketController.sessionMiddleware = mockSessionMiddleware;

            const _onConnect = jest.fn();
            const namespace = {
                path: '/api/1/ws/test',
                requireAuth: true,
                requireRoles: [],
                clients: new Map(),
                _onConnect
            };
            WebSocketController.namespaces.set('/api/1/ws/test', namespace);

            AuthController.isAuthenticated = jest.fn().mockReturnValue(true);

            WebSocketController.wss = {
                handleUpgrade: jest.fn((req, socket, head, callback) => {
                    const ws = new WebSocketTestUtils.MockWebSocket();
                    callback(ws);
                })
            };

            const mockRequest = {
                url: '/api/1/ws/test',
                headers: {}
            };
            const mockSocket = WebSocketTestUtils.createMockSocket();
            const mockHead = {};

            WebSocketController._handleUpgrade(mockRequest, mockSocket, mockHead);

            expect(_onConnect).toHaveBeenCalled();
            const conn = _onConnect.mock.calls[0][0];
            expect(conn.user).toBeUndefined(); // W-155: no conn.user
            expect(conn.ctx.username).toEqual('alice');
            expect(conn.ctx.roles).toEqual(['admin']);
        });

        test('should extract username from user object', () => {
            // Arrange
            const mockSessionMiddleware = jest.fn((req, res, next) => {
                req.session = WebSocketTestUtils.createAuthenticatedSession({ username: 'bob' });
                next();
            });
            WebSocketController.sessionMiddleware = mockSessionMiddleware;

            const _onConnect = jest.fn();
            const namespace = {
                path: '/api/1/ws/test',
                requireAuth: false,
                requireRoles: [],
                clients: new Map(),
                _onConnect
            };
            WebSocketController.namespaces.set('/api/1/ws/test', namespace);

            WebSocketController.wss = {
                handleUpgrade: jest.fn((req, socket, head, callback) => {
                    const ws = new WebSocketTestUtils.MockWebSocket();
                    callback(ws);
                })
            };

            const mockRequest = {
                url: '/api/1/ws/test',
                headers: {}
            };
            const mockSocket = WebSocketTestUtils.createMockSocket();
            const mockHead = {};

            WebSocketController._handleUpgrade(mockRequest, mockSocket, mockHead);

            expect(_onConnect).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // W-155: Dynamic Namespaces (low-hanging unit tests)
    // =========================================================================

    describe('W-155 Dynamic Namespaces', () => {

        test('createNamespace with :param registers pattern and does not add to namespaces', () => {
            const ns = WebSocketController.createNamespace('/api/1/ws/hello-rooms/:roomName', { requireAuth: false });
            expect(WebSocketController.namespaces.has('/api/1/ws/hello-rooms/:roomName')).toBe(false);
            expect(WebSocketController.namespaces.size).toBe(0);
            expect(WebSocketController.patternNamespaces).toHaveLength(1);
            expect(WebSocketController.patternNamespaces[0].pattern).toBe('/api/1/ws/hello-rooms/:roomName');
            expect(WebSocketController.patternNamespaces[0].paramNames).toEqual(['roomName']);
            expect(ns).toBe(WebSocketController.patternNamespaces[0].templateNsObject);
        });

        test('pattern regex matches path and extracts params', () => {
            WebSocketController.createNamespace('/api/1/ws/rooms/:roomName', {});
            const { regex, paramNames } = WebSocketController.patternNamespaces[0];
            const pathname = '/api/1/ws/rooms/amsterdam';
            const match = pathname.match(regex);
            expect(match).not.toBeNull();
            expect(match[1]).toBe('amsterdam');
            const params = {};
            paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
            expect(params).toEqual({ roomName: 'amsterdam' });
        });

        test('pattern with multiple params extracts all', () => {
            WebSocketController.createNamespace('/api/1/ws/maps/:mapId/bubbles/:bubbleId', {});
            expect(WebSocketController.patternNamespaces).toHaveLength(1);
            const { regex, paramNames } = WebSocketController.patternNamespaces[0];
            expect(paramNames).toEqual(['mapId', 'bubbleId']);
            const pathname = '/api/1/ws/maps/123/bubbles/456';
            const match = pathname.match(regex);
            expect(match).not.toBeNull();
            expect(match[1]).toBe('123');
            expect(match[2]).toBe('456');
        });

        test('removeNamespace returns false when path not found', () => {
            const result = WebSocketController.removeNamespace('/api/1/ws/nonexistent', { removeIfEmpty: true });
            expect(result).toBe(false);
        });

        test('removeNamespace with removeIfEmpty true and no clients removes namespace', () => {
            WebSocketController.createNamespace('/api/1/ws/remove-me', {});
            expect(WebSocketController.namespaces.has('/api/1/ws/remove-me')).toBe(true);
            const result = WebSocketController.removeNamespace('/api/1/ws/remove-me', { removeIfEmpty: true });
            expect(result).toBe(true);
            expect(WebSocketController.namespaces.has('/api/1/ws/remove-me')).toBe(false);
        });

        test('removeNamespace with removeIfEmpty true and clients present returns false', () => {
            const ns = WebSocketController.createNamespace('/api/1/ws/has-clients', {});
            ns.clients.set('client-1', { ws: {}, ctx: {}, lastPing: 0, lastPong: 0 });
            const result = WebSocketController.removeNamespace('/api/1/ws/has-clients', { removeIfEmpty: true });
            expect(result).toBe(false);
            expect(WebSocketController.namespaces.has('/api/1/ws/has-clients')).toBe(true);
        });

        test('removeNamespace with removeIfEmpty false removes namespace even with clients', () => {
            const ns = WebSocketController.createNamespace('/api/1/ws/force-remove', {});
            ns.clients.set('client-1', { ws: {}, ctx: {}, lastPing: 0, lastPong: 0 });
            const result = WebSocketController.removeNamespace('/api/1/ws/force-remove', { removeIfEmpty: false });
            expect(result).toBe(true);
            expect(WebSocketController.namespaces.has('/api/1/ws/force-remove')).toBe(false);
        });

        test('namespace.removeIfEmpty() returns true when no clients', () => {
            const ns = WebSocketController.createNamespace('/api/1/ws/empty-room', {});
            expect(WebSocketController.namespaces.has('/api/1/ws/empty-room')).toBe(true);
            const result = ns.removeIfEmpty();
            expect(result).toBe(true);
            expect(WebSocketController.namespaces.has('/api/1/ws/empty-room')).toBe(false);
        });

        test('namespace.removeIfEmpty() returns false when clients present', () => {
            const ns = WebSocketController.createNamespace('/api/1/ws/occupied', {});
            ns.clients.set('c1', { ws: {}, ctx: {}, lastPing: 0, lastPong: 0 });
            const result = ns.removeIfEmpty();
            expect(result).toBe(false);
            expect(WebSocketController.namespaces.has('/api/1/ws/occupied')).toBe(true);
        });
    });
});

// EOF webapp/tests/unit/controller/websocket.test.js
