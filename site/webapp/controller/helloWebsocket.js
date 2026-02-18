/**
 * @name            jPulse Framework / Site / WebApp / Controller / Hello WebSocket
 * @tagline         WebSocket Demo Controller for Real-Time Communication Examples
 * @description     Demonstrates WebSocket patterns: emoji cursor tracking and collaborative todo
 * @file            site/webapp/controller/helloWebsocket.js
 * @version         1.6.18
 * @release         2026-02-18
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
        notes: null,
        rooms: null  // W-155: Dynamic rooms (pattern namespace)
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

        // W-155: Register dynamic rooms namespace (pattern-based)
        this._registerRoomsNamespace();

        LogController.logInfo(null, 'helloWebsocket.initialize', 'WebSocket namespaces registered successfully');
    }

    /**
     * Register /api/1/ws/hello-emoji namespace for cursor tracking demo
     * @private
     */
    static _registerEmojiNamespace() {
        const emoji = WebSocketController.createNamespace('/api/1/ws/hello-emoji', { requireAuth: false, requireRoles: [] });
        this.wsHandles.emoji = emoji;

        emoji.onConnect(({ clientId, ctx }) => {
            const username = ctx?.username || 'guest';
            LogController.logInfo(ctx, 'helloWebsocket.emoji.onConnect',
                `Client ${clientId} (${username}) connected to emoji demo`);
            const stats = emoji.getStats();
            emoji.sendToClient(clientId, {
                type: 'welcome',
                data: { message: 'Connected to emoji cursor demo', userCount: stats.clientCount }
            }, ctx);
        });

        emoji.onMessage(({ clientId, message: data, ctx }) => {
            const username = ctx?.username || 'guest';
            if (data.type === 'emoji-select') {
                LogController.logInfo(ctx, 'helloWebsocket.emoji.onMessage',
                    `${username} selected emoji: ${data.emoji}`);
                emoji.broadcast({
                    type: 'user-emoji',
                    data: { clientId, username, emoji: data.emoji }
                }, ctx);
            } else if (data.type === 'cursor-move') {
                emoji.broadcast({
                    type: 'cursor',
                    data: { clientId, username, emoji: data.emoji, x: data.x, y: data.y }
                }, ctx);
            }
        });

        emoji.onDisconnect(({ clientId, ctx }) => {
            const username = ctx?.username || 'guest';
            LogController.logInfo(ctx, 'helloWebsocket.emoji.onDisconnect',
                `Client ${clientId} (${username}) disconnected from emoji demo`);
            const stats = emoji.getStats();
            emoji.broadcast({
                type: 'user-left',
                data: { clientId, username, userCount: stats.clientCount }
            }, ctx);
        });
    }

    /**
     * Register /api/1/ws/hello-todo namespace for collaborative todo demo
     * @private
     */
    static _registerTodoNamespace() {
        const todo = WebSocketController.createNamespace('/api/1/ws/hello-todo', { requireAuth: false, requireRoles: [] });
        this.wsHandles.todo = todo;

        todo.onConnect(({ clientId, ctx }) => {
            const username = ctx?.username || 'guest';
            LogController.logInfo(ctx, 'helloWebsocket.todo.onConnect',
                `Client ${clientId} (${username}) connected to todo demo`);
            const stats = todo.getStats();
            todo.sendToClient(clientId, {
                type: 'welcome',
                data: { message: 'Connected to collaborative todo demo', userCount: stats.clientCount }
            }, ctx);
        });

        todo.onMessage(({ clientId, message, ctx }) => {
            const username = ctx?.username || 'guest';
            LogController.logInfo(ctx, 'helloWebsocket.todo.onMessage',
                `${username} sent: ${message.type}`);
            if (message.type === 'ping') {
                todo.sendToClient(clientId, { type: 'pong', data: { timestamp: Date.now() } }, ctx);
            }
        });

        todo.onDisconnect(({ clientId, ctx }) => {
            const username = ctx?.username || 'guest';
            LogController.logInfo(ctx, 'helloWebsocket.todo.onDisconnect',
                `Client ${clientId} (${username}) disconnected from todo demo`);
            const stats = todo.getStats();
            todo.broadcast({
                type: 'user-left',
                data: { username, userCount: stats.clientCount }
            }, ctx);
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
        const notes = WebSocketController.createNamespace('/api/1/ws/hello-notes', { requireAuth: false, requireRoles: [] });
        this.wsHandles.notes = notes;

        notes.onConnect(async ({ clientId, ctx }) => {
            const username = ctx?.username || 'guest';
            LogController.logInfo(ctx, 'helloWebsocket.notes.onConnect',
                `Client ${clientId} (${username}) connected to notes demo`);
            const stats = notes.getStats();
            notes.sendToClient(clientId, {
                type: 'welcome',
                data: { message: 'Connected to sticky notes demo', userCount: stats.clientCount }
            }, ctx);
            try {
                const notesList = await this._notesGetAll();
                notes.sendToClient(clientId, {
                    type: 'notes-init',
                    data: { notes: notesList, username: '' }
                }, null);
            } catch (err) {
                LogController.logError(ctx, 'helloWebsocket.notes.onConnect', `notes-init: ${err.message}`);
            }
        });

        notes.onMessage(async ({ clientId, message: data, ctx }) => {
            const username = (data.username != null && String(data.username).trim() !== '')
                ? String(data.username).trim().slice(0, 100)
                : (ctx?.username || 'guest');
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
                    notes.broadcast({ type: 'note-created', data: { note, username } }, ctx);
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
                        notes.broadcast({ type: 'note-updated', data: { note, username } }, ctx);
                    }
                } else if (data.type === 'note-delete') {
                    const id = data.id;
                    if (!id) return;
                    const removed = await this._notesDelete(id);
                    if (removed) {
                        notes.broadcast({ type: 'note-deleted', data: { noteId: id, username } }, ctx);
                    }
                }
            } catch (err) {
                LogController.logError(ctx, 'helloWebsocket.notes.onMessage', err.message);
                notes.sendToClient(clientId, { type: 'error', data: { error: err.message } }, null);
            }
        });

        notes.onDisconnect(({ clientId, user, ctx }) => {
            const username = user?.username || 'guest';
            LogController.logInfo(ctx, 'helloWebsocket.notes.onDisconnect',
                `Client ${clientId} (${username}) disconnected from notes demo`);
            const stats = notes.getStats();
            notes.broadcast({
                type: 'user-left',
                data: { username, userCount: stats.clientCount }
            }, ctx);
        });
    }

    /**
     * W-155: Register /api/1/ws/hello-rooms/:roomName namespace for dynamic rooms demo
     * Demonstrates pattern-based namespace with onCreate hook and per-room isolation
     * @private
     */
    static _registerRoomsNamespace() {
        const rooms = WebSocketController.createNamespace('/api/1/ws/hello-rooms/:roomName', {
            requireAuth: false,
            requireRoles: [],
            onCreate: (req, ctx) => {
                // W-155: onCreate hook receives req and ctx
                const { roomName } = ctx.params;
                LogController.logInfo(ctx, 'helloWebsocket.rooms.onCreate', `onCreate for room: ${roomName} (params: ${JSON.stringify(ctx.params)})`);

                // Safety check
                if (!roomName) {
                    LogController.logError(ctx, 'helloWebsocket.rooms.onCreate', 'Room name missing from params');
                    return null;
                }

                // Validate room name (demo: allow only specific rooms)
                const allowedRooms = ['amsterdam', 'berlin', 'cairo'];
                if (!allowedRooms.includes(roomName.toLowerCase())) {
                    LogController.logError(ctx, 'helloWebsocket.rooms.onCreate', `Rejected unknown room: ${roomName}`);
                    return null; // reject
                }

                return ctx; // accept
            }
        });
        this.wsHandles.rooms = rooms;

        rooms.onConnect(({ clientId, ctx }) => {
            const username = ctx?.username || 'guest';
            const roomName = ctx?.params?.roomName || 'unknown';
            LogController.logInfo(ctx, 'helloWebsocket.rooms.onConnect',
                `Client ${clientId} (${username}) joined room: ${roomName}`);

            const roomPath = `/api/1/ws/hello-rooms/${roomName}`;
            const roomNs = WebSocketController.namespaces.get(roomPath);
            if (!roomNs) return;

            // Multi-instance: use Redis counter so all instances see same room count
            const sendWelcomeAndStats = (userCount) => {
                roomNs.sendToClient(clientId, {
                    type: 'welcome',
                    data: { message: `Welcome to room ${roomName}!`, userCount, roomName }
                }, ctx);
                roomNs.broadcast({
                    type: 'room-stats',
                    data: { userCount, roomName }
                }, ctx);
            };

            if (global.RedisManager?.isRedisAvailable()) {
                global.RedisManager.cacheIncr('controller:helloWebsocket:roomcount', roomName)
                    .then((count) => {
                        sendWelcomeAndStats(count != null ? count : roomNs.getStats().clientCount);
                    })
                    .catch(() => {
                        sendWelcomeAndStats(roomNs.getStats().clientCount);
                    });
            } else {
                sendWelcomeAndStats(roomNs.getStats().clientCount);
            }
        });

        rooms.onMessage(({ clientId, message, ctx }) => {
            const username = ctx?.username || 'guest';
            const roomName = ctx?.params?.roomName || 'unknown';

            if (message.type === 'chat') {
                LogController.logInfo(ctx, 'helloWebsocket.rooms.onMessage',
                    `${username} in ${roomName}: ${message.data?.text?.slice(0, 50)}`);

                // Broadcast to all clients in this specific room
                const roomPath = `/api/1/ws/hello-rooms/${roomName}`;
                const roomNs = WebSocketController.namespaces.get(roomPath);
                if (roomNs) {
                    roomNs.broadcast({
                        type: 'chat',
                        data: {
                            username,
                            text: message.data?.text || '',
                            timestamp: Date.now()
                        }
                    }, ctx);
                }
            } else if (message.type === 'ping') {
                const roomPath = `/api/1/ws/hello-rooms/${roomName}`;
                const roomNs = WebSocketController.namespaces.get(roomPath);
                if (roomNs) {
                    roomNs.sendToClient(clientId, { type: 'pong', data: { timestamp: Date.now() } }, ctx);
                }
            }
        });

        rooms.onDisconnect(({ clientId, ctx }) => {
            const username = ctx?.username || 'guest';
            const roomName = ctx?.params?.roomName || 'unknown';
            LogController.logInfo(ctx, 'helloWebsocket.rooms.onDisconnect',
                `Client ${clientId} (${username}) left room: ${roomName}`);

            const roomPath = `/api/1/ws/hello-rooms/${roomName}`;
            const roomNs = WebSocketController.namespaces.get(roomPath);
            if (!roomNs) return;

            const broadcastUserLeft = (userCount) => {
                roomNs.broadcast({
                    type: 'user-left',
                    data: { username, userCount: Math.max(0, userCount), roomName }
                }, ctx);
            };

            // Multi-instance: use Redis counter so count is correct across instances
            if (global.RedisManager?.isRedisAvailable()) {
                global.RedisManager.cacheDecr('controller:helloWebsocket:roomcount', roomName)
                    .then((count) => {
                        broadcastUserLeft(count != null ? count : roomNs.getStats().clientCount);
                    })
                    .catch(() => {
                        broadcastUserLeft(roomNs.getStats().clientCount);
                    });
            } else {
                broadcastUserLeft(roomNs.getStats().clientCount);
            }
        });
    }

    /**
     * Broadcast todo created event
     * Called by helloTodo controller after successful creation
     * @param {Object} req - Optional Express request (for log context)
     */
    static broadcastTodoCreated(todo, username, req = null) {
        if (this.wsHandles.todo) {
            const ctx = global.RedisManager.getBroadcastContext(req);
            this.wsHandles.todo.broadcast({
                type: 'todo-created',
                data: { todo, username }
            }, ctx);
        }
    }

    /**
     * Broadcast todo updated event
     * Called by helloTodo controller after successful update
     * @param {Object} req - Optional Express request (for log context)
     */
    static broadcastTodoUpdated(todo, username, req = null) {
        if (this.wsHandles.todo) {
            const ctx = global.RedisManager.getBroadcastContext(req);
            this.wsHandles.todo.broadcast({
                type: 'todo-updated',
                data: { todo, username }
            }, ctx);
        }
    }

    /**
     * Broadcast todo deleted event
     * Called by helloTodo controller after successful deletion
     * @param {Object} req - Optional Express request (for log context)
     */
    static broadcastTodoDeleted(todoId, username, req = null) {
        if (this.wsHandles.todo) {
            const ctx = global.RedisManager.getBroadcastContext(req);
            this.wsHandles.todo.broadcast({
                type: 'todo-deleted',
                data: { todoId, username }
            }, ctx);
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

        // W-155: Get stats for all active dynamic rooms
        const roomStats = [];
        const roomNames = ['amsterdam', 'berlin', 'cairo'];
        for (const roomName of roomNames) {
            const roomPath = `/api/1/ws/hello-rooms/${roomName}`;
            const roomNs = WebSocketController.namespaces.get(roomPath);
            if (roomNs) {
                const stats = roomNs.getStats();
                roomStats.push({ roomName, ...stats });
            } else {
                roomStats.push({ roomName, clientCount: 0, totalMessages: 0 });
            }
        }

        res.render('hello-websocket/index', {
            emojiStats: emojiStats,
            todoStats: todoStats,
            notesStats: notesStats,
            roomStats: roomStats
        });
    }
}

export default HelloWebsocketController;

// EOF site/webapp/controller/helloWebsocket.js
