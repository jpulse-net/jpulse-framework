/**
 * @name            jPulse Framework / Site / WebApp / Controller / Hello WebSocket
 * @tagline         WebSocket Demo Controller for Real-Time Communication Examples
 * @description     Demonstrates WebSocket patterns: emoji cursor tracking and collaborative todo
 * @file            site/webapp/controller/helloWebsocket.js
 * @version         1.6.6
 * @release         2026-02-03
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.4, Claude Sonnet 4.5
 */

import WebSocketController from '../../../webapp/controller/websocket.js';
import HelloTodoController from './helloTodo.js';

// Access global utilities
const LogController = global.LogController;
const CommonUtils = global.CommonUtils;

/**
 * Hello WebSocket Controller
 *
 * Demonstrates three real-time WebSocket patterns:
 * 1. Emoji Cursor: Ephemeral position tracking (no persistence)
 * 2. Collaborative Todo: REST for CRUD + WebSocket for sync (Pattern A)
 * 3. Sticky Notes: WebSocket for CRUD (Pattern B) — Redis store, broadcast
 *
 * Educational focus:
 * - How to register WebSocket namespaces
 * - How to broadcast messages to all clients
 * - How to layer WebSocket onto existing MVC architecture
 * - Pattern B: CRUD over WebSocket with shared Redis store
 */
class HelloWebsocketController {

    // Store namespace handles for broadcasting
    static wsHandles = {
        emoji: null,
        todo: null,
        notes: null
    };

    // Redis cache path for sticky notes (jPulse assumes Redis)
    static NOTES_CACHE_PATH = 'controller:hello-websocket:notes';
    static NOTES_CACHE_KEY = 'list';

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

        // Register sticky notes namespace (Pattern B: WS for CRUD)
        this._registerNotesNamespace();

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
     * Redis notes store (Pattern B: WS for CRUD). jPulse assumes Redis; no in-memory fallback.
     * For long-term persistence, this would be the place to interface with a model for database storage.
     */
    static async _notesGetAll() {
        const RedisManager = global.RedisManager;
        if (!RedisManager?.isRedisAvailable()) {
            LogController.logError(null, 'helloWebsocket._notesGetAll', 'Redis not available');
            return [];
        }
        const list = await RedisManager.cacheGetObject(this.NOTES_CACHE_PATH, this.NOTES_CACHE_KEY);
        return Array.isArray(list) ? list : [];
    }

    static async _notesCreate(note) {
        const RedisManager = global.RedisManager;
        if (!RedisManager?.isRedisAvailable()) {
            throw new Error('Redis not available');
        }
        const list = await this._notesGetAll();
        list.unshift(note);
        await RedisManager.cacheSetObject(this.NOTES_CACHE_PATH, this.NOTES_CACHE_KEY, list);
        return note;
    }

    static async _notesUpdate(id, data) {
        const RedisManager = global.RedisManager;
        if (!RedisManager?.isRedisAvailable()) {
            throw new Error('Redis not available');
        }
        const list = await this._notesGetAll();
        const index = list.findIndex((n) => n.id === id);
        if (index === -1) return null;
        list[index] = { ...list[index], ...data, id };
        await RedisManager.cacheSetObject(this.NOTES_CACHE_PATH, this.NOTES_CACHE_KEY, list);
        return list[index];
    }

    static async _notesDelete(id) {
        const RedisManager = global.RedisManager;
        if (!RedisManager?.isRedisAvailable()) {
            throw new Error('Redis not available');
        }
        const list = await this._notesGetAll();
        const filtered = list.filter((n) => n.id !== id);
        if (filtered.length === list.length) return false;
        await RedisManager.cacheSetObject(this.NOTES_CACHE_PATH, this.NOTES_CACHE_KEY, filtered);
        return true;
    }

    /**
     * Register /api/1/ws/hello-notes namespace for sticky notes demo (Pattern B: WS for CRUD)
     * @private
     */
    static _registerNotesNamespace() {
        const wsHandle = WebSocketController.registerNamespace('/api/1/ws/hello-notes', {
            requireAuth: false,
            requireRoles: [],

            onConnect: async (clientId, user) => {
                const username = user?.username || 'guest';
                LogController.logInfo(null, 'helloWebsocket.notes.onConnect',
                    `Client ${clientId} (${username}) connected to notes demo`);

                const stats = this.wsHandles.notes.getStats();
                this.wsHandles.notes.sendToClient(clientId, {
                    type: 'welcome',
                    message: 'Connected to sticky notes demo',
                    userCount: stats.clients
                }, username);

                // Send current notes so new client gets state
                try {
                    const notes = await this._notesGetAll();
                    this.wsHandles.notes.sendToClient(clientId, {
                        type: 'notes-init',
                        notes: notes,
                        username: ''
                    }, '');
                } catch (err) {
                    LogController.logError(null, 'helloWebsocket.notes.onConnect', `notes-init: ${err.message}`);
                }
            },

            onMessage: async (clientId, data, user) => {
                // Prefer view-supplied username ({{string.default user.username "guest"}}) for consistency
                const username = (data.username != null && String(data.username).trim() !== '')
                    ? String(data.username).trim().slice(0, 100)
                    : (user?.username || user?.displayName || user?.loginId || 'guest');
                const handle = this.wsHandles.notes;
                if (!handle) return;

                try {
                    if (data.type === 'note-create') {
                        const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
                            ? crypto.randomUUID() : `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                        const note = {
                            id,
                            x: typeof data.x === 'number' ? data.x : 20,
                            y: typeof data.y === 'number' ? data.y : 20,
                            text: (data.text != null ? String(data.text) : '').slice(0, 500),
                            color: (data.color != null ? String(data.color) : '#fff9c4').slice(0, 20),
                            createdAt: Date.now(),
                            createdBy: username
                        };
                        await this._notesCreate(note);
                        handle.broadcast({ type: 'note-created', note, username }, username);
                    } else if (data.type === 'note-update') {
                        const id = data.id;
                        if (!id) return;
                        const updates = {};
                        if (typeof data.x === 'number') updates.x = data.x;
                        if (typeof data.y === 'number') updates.y = data.y;
                        if (data.text !== undefined) updates.text = String(data.text).slice(0, 500);
                        if (data.color !== undefined) updates.color = String(data.color).slice(0, 20);
                        const note = await this._notesUpdate(id, updates);
                        if (note) {
                            handle.broadcast({ type: 'note-updated', note, username }, username);
                        }
                    } else if (data.type === 'note-delete') {
                        const id = data.id;
                        if (!id) return;
                        const removed = await this._notesDelete(id);
                        if (removed) {
                            handle.broadcast({ type: 'note-deleted', noteId: id, username }, username);
                        }
                    }
                } catch (err) {
                    LogController.logError(null, 'helloWebsocket.notes.onMessage', err.message);
                    handle.sendToClient(clientId, {
                        type: 'error',
                        error: err.message
                    }, '');
                }
            },

            onDisconnect: (clientId, user) => {
                const username = user?.username || 'guest';
                LogController.logInfo(null, 'helloWebsocket.notes.onDisconnect',
                    `Client ${clientId} (${username}) disconnected from notes demo`);
                const stats = this.wsHandles.notes.getStats();
                this.wsHandles.notes.broadcast({
                    type: 'user-left',
                    username: username,
                    userCount: stats.clients
                }, '');
            }
        });

        this.wsHandles.notes = wsHandle;
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
        const notesStats = this.wsHandles.notes?.getStats() || { clients: 0, messages: 0 };

        res.render('hello-websocket/index', {
            emojiStats: emojiStats,
            todoStats: todoStats,
            notesStats: notesStats
        });
    }
}

export default HelloWebsocketController;

// EOF site/webapp/controller/helloWebsocket.js
