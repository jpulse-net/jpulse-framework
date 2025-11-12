/**
 * @name            jPulse Framework / Site / WebApp / Controller / Hello WebSocket
 * @tagline         WebSocket Demo Controller for Real-Time Communication Examples
 * @description     Demonstrates WebSocket patterns: emoji cursor tracking and collaborative todo
 * @file            site/webapp/controller/helloWebsocket.js
 * @version         1.1.5
 * @release         2025-11-12
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import WebSocketController from '../../../webapp/controller/websocket.js';
import HelloTodoController from './helloTodo.js';

// Access global utilities
const LogController = global.LogController;
const CommonUtils = global.CommonUtils;

/**
 * Hello WebSocket Controller
 *
 * Demonstrates two real-time WebSocket patterns:
 * 1. Emoji Cursor: Ephemeral position tracking (no persistence)
 * 2. Collaborative Todo: Integration with existing REST API + WebSocket broadcasts
 *
 * Educational focus:
 * - How to register WebSocket namespaces
 * - How to broadcast messages to all clients
 * - How to layer WebSocket onto existing MVC architecture
 */
class HelloWebsocketController {

    // Store namespace handles for broadcasting
    static wsHandles = {
        emoji: null,
        todo: null
    };

    /**
     * Initialize WebSocket namespaces
     * Called during application startup
     */
    static async initialize() {
        LogController.logInfo(null, 'helloWebsocket.initialize', 'Registering WebSocket namespaces');

        // Register emoji cursor namespace
        this._registerEmojiNamespace();

        // Register collaborative todo namespace
        this._registerTodoNamespace();

        LogController.logInfo(null, 'helloWebsocket.initialize', 'WebSocket namespaces registered successfully');
    }

    /**
     * Register /api/1/ws/hello-emoji namespace for cursor tracking demo
     * @private
     */
    static _registerEmojiNamespace() {
        this.wsHandles.emoji = WebSocketController.registerNamespace('/api/1/ws/hello-emoji', {
            requireAuth: false,
            requireRoles: [],

            onConnect: (clientId, user) => {
                const username = user?.username || 'guest';
                LogController.logInfo(null, 'helloWebsocket.emoji.onConnect',
                    `Client ${clientId} (${username}) connected to emoji demo`);

                // Send welcome message with current user count
                const stats = this.wsHandles.emoji.getStats();
                this.wsHandles.emoji.sendToClient(clientId, {
                    type: 'welcome',
                    message: 'Connected to emoji cursor demo',
                    userCount: stats.clients
                });
            },

            onMessage: (clientId, data, user) => {
                const username = user?.username || 'guest';

                // Handle different message types
                if (data.type === 'emoji-select') {
                    // User selected an emoji - broadcast to all
                    LogController.logInfo(null, 'helloWebsocket.emoji.onMessage',
                        `${username} selected emoji: ${data.emoji}`);

                    this.wsHandles.emoji.broadcast({
                        type: 'user-emoji',
                        clientId: clientId,
                        username: username,
                        emoji: data.emoji
                    }, username);

                } else if (data.type === 'cursor-move') {
                    // User moved cursor - broadcast position
                    // Note: Client should throttle these messages (every 50ms)
                    this.wsHandles.emoji.broadcast({
                        type: 'cursor',
                        clientId: clientId,
                        username: username,
                        emoji: data.emoji,
                        x: data.x,
                        y: data.y
                    }, username);
                }
            },

            onDisconnect: (clientId, user) => {
                const username = user?.username || 'guest';
                LogController.logInfo(null, 'helloWebsocket.emoji.onDisconnect',
                    `Client ${clientId} (${username}) disconnected from emoji demo`);

                // Notify others that user left
                const stats = this.wsHandles.emoji.getStats();
                this.wsHandles.emoji.broadcast({
                    type: 'user-left',
                    clientId: clientId,
                    username: username,
                    userCount: stats.clients
                }, '');
            }
        });
    }

    /**
     * Register /api/1/ws/hello-todo namespace for collaborative todo demo
     * @private
     */
    static _registerTodoNamespace() {
        this.wsHandles.todo = WebSocketController.registerNamespace('/api/1/ws/hello-todo', {
            requireAuth: false,
            requireRoles: [],

            onConnect: (clientId, user) => {
                const username = user?.username || 'guest';
                LogController.logInfo(null, 'helloWebsocket.todo.onConnect',
                    `Client ${clientId} (${username}) connected to todo demo`);

                // Send welcome message
                const stats = this.wsHandles.todo.getStats();
                this.wsHandles.todo.sendToClient(clientId, {
                    type: 'welcome',
                    message: 'Connected to collaborative todo demo',
                    userCount: stats.clients
                });
            },

            onMessage: (clientId, data, user) => {
                const username = user?.username || 'guest';
                LogController.logInfo(null, 'helloWebsocket.todo.onMessage',
                    `${username} sent: ${data.type}`);

                // For todo demo, we primarily receive events, not handle them here
                // The REST API (helloTodo controller) will broadcast changes
                // But we can echo presence/typing indicators here if needed
                if (data.type === 'ping') {
                    this.wsHandles.todo.sendToClient(clientId, {
                        type: 'pong',
                        timestamp: Date.now()
                    }, username);
                }
            },

            onDisconnect: (clientId, user) => {
                const username = user?.username || 'guest';
                LogController.logInfo(null, 'helloWebsocket.todo.onDisconnect',
                    `Client ${clientId} (${username}) disconnected from todo demo`);

                // Notify others
                const stats = this.wsHandles.todo.getStats();
                this.wsHandles.todo.broadcast({
                    type: 'user-left',
                    username: username,
                    userCount: stats.clients
                }, '');
            }
        });
    }

    /**
     * Broadcast todo created event
     * Called by helloTodo controller after successful creation
     */
    static broadcastTodoCreated(todo, username) {
        if (this.wsHandles.todo) {
            this.wsHandles.todo.broadcast({
                type: 'todo-created',
                todo: todo,
                username: username
            }, username);
        }
    }

    /**
     * Broadcast todo updated event
     * Called by helloTodo controller after successful update
     */
    static broadcastTodoUpdated(todo, username) {
        if (this.wsHandles.todo) {
            this.wsHandles.todo.broadcast({
                type: 'todo-updated',
                todo: todo,
                username: username
            }, username);
        }
    }

    /**
     * Broadcast todo deleted event
     * Called by helloTodo controller after successful deletion
     */
    static broadcastTodoDeleted(todoId, username) {
        if (this.wsHandles.todo) {
            this.wsHandles.todo.broadcast({
                type: 'todo-deleted',
                todoId: todoId,
                username: username
            }, username);
        }
    }

    /**
     * View handler for /hello-websocket/
     */
    static async index(req, res) {
        LogController.logRequest(req, 'helloWebsocket.index', '');

        // Get WebSocket stats for display
        const emojiStats = this.wsHandles.emoji?.getStats() || { clients: 0, messages: 0 };
        const todoStats = this.wsHandles.todo?.getStats() || { clients: 0, messages: 0 };

        res.render('hello-websocket/index', {
            emojiStats: emojiStats,
            todoStats: todoStats
        });
    }
}

export default HelloWebsocketController;
