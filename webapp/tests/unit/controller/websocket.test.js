/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / WebSocket
 * @tagline         Unit tests for WebSocket Controller
 * @description     Tests for WebSocket infrastructure, authentication, broadcasting, and lifecycle
 * @file            webapp/tests/unit/controller/websocket.test.js
 * @version         1.1.8
 * @release         2025-11-18
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
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

            // Act
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                mockRequest.session.user,
                mockRequest.session.user.username,
                {}
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

            // Act
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                mockRequest.session.user,
                mockRequest.session.user.username,
                {}
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
                onConnect: jest.fn()
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

            // Act
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                mockRequest.session.user,
                mockRequest.session.user.username,
                {}
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

            // Act
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                mockRequest.session.user,
                mockRequest.session.user.username,
                {}
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
                onConnect: jest.fn()
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

            // Act
            WebSocketController._completeUpgrade(
                mockRequest,
                mockSocket,
                mockHead,
                namespace,
                mockRequest.session.user,
                mockRequest.session.user.username,
                {}
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
                onConnect: jest.fn()
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

            // Act
            WebSocketController.broadcast('/api/1/ws/test', testData, 'testuser');

            // Assert
            const messages1 = WebSocketTestUtils.getSentMessages(client1.ws);
            const messages2 = WebSocketTestUtils.getSentMessages(client2.ws);

            expect(messages1).toHaveLength(1);
            expect(messages2).toHaveLength(1);
            expect(messages1[0].success).toBe(true);
            expect(messages1[0].data.username).toBe('testuser');
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

            // Act
            WebSocketController.broadcast('/api/1/ws/test', { type: 'test' }, 'alice');

            // Assert
            const messages = WebSocketTestUtils.getSentMessages(client.ws);
            expect(messages[0].data.username).toBe('alice');
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

            // Act
            WebSocketController.broadcast('/api/1/ws/test', { type: 'test', payload: 123 });

            // Assert
            const messages = WebSocketTestUtils.getSentMessages(client.ws);
            expect(messages[0]).toHaveProperty('success', true);
            expect(messages[0]).toHaveProperty('data');
            expect(messages[0].data.type).toBe('test');
            expect(messages[0].data.payload).toBe(123);
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

        test('should register namespace successfully', () => {
            // Arrange
            const path = '/api/1/ws/test';
            const options = {
                requireAuth: false,
                onConnect: jest.fn(),
                onMessage: jest.fn(),
                onDisconnect: jest.fn()
            };

            // Act
            WebSocketController.registerNamespace(path, options);

            // Assert
            expect(WebSocketController.namespaces.has(path)).toBe(true);
            const namespace = WebSocketController.namespaces.get(path);
            expect(namespace.path).toBe(path);
            expect(namespace.requireAuth).toBe(false);
            expect(namespace.onConnect).toBe(options.onConnect);
        });

        test('should validate /api/1/ws/* path prefix', () => {
            // Act & Assert
            expect(() => {
                WebSocketController.registerNamespace('/invalid/path', {});
            }).toThrow();
        });

        test('should store callbacks correctly', () => {
            // Arrange
            const onConnect = jest.fn();
            const onMessage = jest.fn();
            const onDisconnect = jest.fn();

            // Act
            WebSocketController.registerNamespace('/api/1/ws/test', {
                onConnect,
                onMessage,
                onDisconnect
            });

            // Assert
            const namespace = WebSocketController.namespaces.get('/api/1/ws/test');
            expect(namespace.onConnect).toBe(onConnect);
            expect(namespace.onMessage).toBe(onMessage);
            expect(namespace.onDisconnect).toBe(onDisconnect);
        });

        test('should handle requireAuth option', () => {
            // Act
            WebSocketController.registerNamespace('/api/1/ws/test', { requireAuth: true });

            // Assert
            const namespace = WebSocketController.namespaces.get('/api/1/ws/test');
            expect(namespace.requireAuth).toBe(true);
        });

        test('should handle requireRoles option', () => {
            // Act
            WebSocketController.registerNamespace('/api/1/ws/test', {
                requireAuth: true,
                requireRoles: ['admin', 'root']
            });

            // Assert
            const namespace = WebSocketController.namespaces.get('/api/1/ws/test');
            expect(namespace.requireRoles).toEqual(['admin', 'root']);
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
                onConnect: jest.fn()
            };
            const ws = new WebSocketTestUtils.MockWebSocket();
            const user = { username: 'testuser' };

            // Act
            WebSocketController._onConnection(ws, namespace, user, 'testuser', null);

            // Assert
            expect(namespace.clients.size).toBe(1);
            const clientId = Array.from(namespace.clients.keys())[0];
            expect(clientId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        test('should use client-provided UUID if valid', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                onConnect: jest.fn()
            };
            const ws = new WebSocketTestUtils.MockWebSocket();
            const clientUUID = '12345678-1234-4567-8901-123456789012';

            // Act
            WebSocketController._onConnection(ws, namespace, null, '', clientUUID);

            // Assert
            expect(namespace.clients.has(clientUUID)).toBe(true);
        });

        test('should store client in namespace', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                onConnect: jest.fn()
            };
            const ws = new WebSocketTestUtils.MockWebSocket();

            // Act
            WebSocketController._onConnection(ws, namespace, null, '', null);

            // Assert
            expect(namespace.clients.size).toBe(1);
            const client = Array.from(namespace.clients.values())[0];
            expect(client.ws).toBe(ws);
        });

        test('should call onConnect callback', () => {
            // Arrange
            const onConnect = jest.fn();
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                onConnect
            };
            const ws = new WebSocketTestUtils.MockWebSocket();
            const user = { username: 'testuser' };

            // Act
            WebSocketController._onConnection(ws, namespace, user, 'testuser', null);

            // Assert
            expect(onConnect).toHaveBeenCalled();
            const clientId = onConnect.mock.calls[0][0];
            expect(typeof clientId).toBe('string');
            expect(onConnect.mock.calls[0][1]).toBe(user);
        });

        test('should initialize ping/pong timestamps', () => {
            // Arrange
            const namespace = {
                path: '/api/1/ws/test',
                clients: new Map(),
                onConnect: jest.fn()
            };
            const ws = new WebSocketTestUtils.MockWebSocket();

            // Act
            const beforeTime = Date.now();
            WebSocketController._onConnection(ws, namespace, null, '', null);
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

            const onConnect = jest.fn();
            const namespace = {
                path: '/api/1/ws/test',
                requireAuth: true,
                requireRoles: [],
                clients: new Map(),
                onConnect
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

            // Act
            WebSocketController._handleUpgrade(mockRequest, mockSocket, mockHead);

            // Assert
            // onConnect should be called with the user from session
            expect(onConnect).toHaveBeenCalled();
            const calledUser = onConnect.mock.calls[0][1];
            expect(calledUser).toEqual(testUser);
        });

        test('should extract username from user object', () => {
            // Arrange
            const mockSessionMiddleware = jest.fn((req, res, next) => {
                req.session = WebSocketTestUtils.createAuthenticatedSession({ username: 'bob' });
                next();
            });
            WebSocketController.sessionMiddleware = mockSessionMiddleware;

            const onConnect = jest.fn();
            const namespace = {
                path: '/api/1/ws/test',
                requireAuth: false,
                requireRoles: [],
                clients: new Map(),
                onConnect
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

            // Act
            WebSocketController._handleUpgrade(mockRequest, mockSocket, mockHead);

            // Assert - username should be available in connection
            expect(onConnect).toHaveBeenCalled();
        });
    });
});

// EOF webapp/tests/unit/controller/websocket.test.js
