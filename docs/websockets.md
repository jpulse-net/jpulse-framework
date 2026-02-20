# jPulse Docs / WebSocket Real-Time Communication v1.6.21

> **Need multi-server broadcasting instead?** If you're running multiple server instances and need to synchronize state changes across all servers (like collaborative editing), see [Application Cluster Communication](application-cluster.md) which uses REST API + Redis broadcasts for simpler state synchronization.

## Overview

The jPulse Framework provides enterprise-grade WebSocket infrastructure for real-time bidirectional communication between server and browser. This enables use cases of MPAs and SPAs like:

- Live collaboration (multiple users editing simultaneously)
- Real-time dashboards and monitoring
- Instant notifications and updates
- Interactive games and applications
- Chat and messaging systems

### Key Features

- **Namespace Isolation**: Multiple independent WebSocket channels (`/api/1/ws/chat`, `/api/1/ws/dashboard`, etc.)
- **Persistent Client UUID**: Client-generated UUID v4 persists across reconnections and page reloads
- **Auto-Reconnection**: Progressive backoff reconnection (5s → 30s max)
- **Health Monitoring**: Bidirectional ping/pong with automatic cleanup
- **Authentication**: Optional authentication and role-based access per namespace
- **Username Tracking**: All messages include username (empty string if not authenticated)
- **Statistics**: Built-in monitoring and activity logging
- **Standard API**: Consistent message format matching HTTP API conventions
- **MPA & SPA Support**: Works seamlessly with both Multi-Page and Single-Page Applications
- **Dynamic Namespaces**: One namespace per resource (e.g. per room or per map) via path patterns and lazy creation — see [Dynamic Namespaces (Per-Resource Rooms)](#dynamic-namespaces-per-resource-rooms)
- **No Automatic Retry**: Applications control message delivery guarantees (see Best Practices)

---

## Two Ways to Use WebSocket

The framework supports two main patterns for real-time communication:

**Pattern A: REST for CRUD, WebSocket for sync** — Client performs create/update/delete via REST (POST/PUT/DELETE). Server validates, persists, returns response, then **broadcasts** a notification over WebSocket (`entity-created`, `entity-updated`, `entity-deleted`). All connected clients (including the actor) update their views from that broadcast. **Use when:** Single source of truth (REST + DB), strong validation and error handling, and clients that may work without WebSocket (e.g. mobile app, scripts). **Example:** Collaborative todo at `/hello-websocket/` (REST API + WS broadcasts).

**Pattern B: WebSocket for CRUD** — Client sends CRUD **actions** over WebSocket (e.g. `note-create`, `note-update`, `note-delete`). Server validates, persists (e.g. via Redis store or model), and **broadcasts the outcome** to all clients. No REST for these mutations. **Use when:** Collaborative feel (e.g. shared canvas, live editor) where every change is sent and saved in real time; WebSocket is the primary way to mutate and sync. **Example:** Sticky Notes demo at `/hello-websocket/` (see demo tab "Sticky Notes").

| Aspect | Pattern A: REST + WS sync | Pattern B: WS for CRUD |
|--------|---------------------------|-------------------------|
| Who does the mutation? | REST endpoint | WebSocket handler (onMessage) |
| Persistence | REST handler writes to DB | WS handler (or code it calls) writes to store/DB |
| Sync to other clients | Broadcast after REST success | Broadcast after WS handler success |
| Best for | Forms, lists, "submit then sync" | Canvas, live collaboration, "edit in real time" |

**When to use which:** Use **Pattern A** when you want a single source of truth (REST + DB), strong validation, and clients that may not use WebSocket. Use **Pattern B** when you want a "live" collaborative experience where mutations go over WebSocket and are saved in real time on the server.

---

## Quick Start

### Server-Side: Create a Namespace

Controllers create WebSocket namespaces with `createNamespace(path, options?)`. Handlers receive a single **conn** object with `clientId` and **ctx** (no separate `user`); chain `.onConnect()`, `.onMessage()`, `.onDisconnect()`. Use `broadcast(data, ctx)` and `sendToClient(clientId, data, ctx)` so logging and Redis relay use the connection context.

```javascript
// site/webapp/controller/myController.js
import WebSocketController from '../../../webapp/controller/websocket.js';

class MyController {
    static async initialize() {
        const ns = WebSocketController.createNamespace('/api/1/ws/my-app', {
            requireAuth: false,
            requireRoles: []
        });

        ns.onConnect(({ clientId, ctx }) => {
            console.log(`Client ${clientId} (${ctx?.username || 'anonymous'}) connected`);
            ns.sendToClient(clientId, {
                type: 'welcome',
                data: { message: 'Connected to my-app!' }
            }, ctx);
        })
        .onMessage(({ clientId, message, ctx }) => {
            console.log(`Message from ${ctx?.username || 'anonymous'}:`, message);
            ns.broadcast({
                type: 'update',
                data: { from: clientId, ...message }
            }, ctx);
        })
        .onDisconnect(({ clientId, ctx }) => {
            console.log(`Client ${clientId} disconnected`);
        });

        return ns;
    }
}
```

### Client-Side: Connect and Communicate

Views connect to namespaces using `jPulse.ws.connect()`. The message handler receives a single **message** object: use `message.success` and `message.data` (app payload with `type`, `data`, and optionally `ctx`).

```javascript
// In your view or Vue component
const ws = jPulse.ws.connect('/api/1/ws/my-app')
    .onMessage((message) => {
        if (message.success) {
            const payload = message.data ?? {};
            console.log('Received:', payload.type, payload);
            if (payload.type === 'update') {
                updateUI(payload.data);
            }
        } else {
            console.error('Error:', message.error);
        }
    })
    .onStatusChange((status, oldStatus) => {
        console.log(`Connection: ${oldStatus} -> ${status}`);
        updateConnectionIndicator(status);
    });

// Send message to server
ws.send({
    type: 'user-action',
    action: 'click',
    data: { x: 100, y: 200 }
});

// Check connection status
if (ws.isConnected()) {
    console.log('Ready to send messages');
}

// Disconnect when done
ws.disconnect();
```

---

## Server-Side API

### Creating Namespaces

All namespace paths **must** start with `/api/1/ws/` prefix (enforced by framework).

```javascript
const ns = WebSocketController.createNamespace(path, options?)
ns.onConnect(fn).onMessage(fn).onDisconnect(fn)  // chainable; each returns the namespace
```

**Parameters:**

- `path` (string, required): Namespace path, must start with `/api/1/ws/`. For per-resource rooms (e.g. one room per ID), use a **path pattern** with `:param` — see [Dynamic Namespaces (Per-Resource Rooms)](#dynamic-namespaces-per-resource-rooms).
- `options` (object, optional):
  - `requireAuth` (boolean): Require user authentication (default: `false`)
  - `requireRoles` (array): Required user roles (default: `[]`)
  - `onCreate` (function): For dynamic namespaces only — called when a namespace is created from a pattern; see [Dynamic Namespaces](#dynamic-namespaces-per-resource-rooms).

**Handlers** (set via chainable setters):

- `onConnect(conn)`: Called when a client connects. **conn** = `{ clientId, ctx }`. **ctx** = `{ username, ip, roles, firstName, lastName, initials, params }` (identity and logging; `params` from path for dynamic namespaces).
- `onMessage(conn)`: Called when a message is received. **conn** = `{ clientId, message, ctx }`.
- `onDisconnect(conn)`: Called when a client disconnects. **conn** = `{ clientId, ctx }`.

**Async onMessage:** The `onMessage` handler may be async. If it returns a Promise, the framework awaits it. If the Promise rejects (or the handler throws), the framework sends an error message back to the client (`success: false`, `error`, `code`). This allows CRUD-over-WebSocket handlers to use async models (e.g. Redis, MongoDB) without wrapping in try/catch.

**Namespace methods:**

- `broadcast(data, ctx)`: Send to all connected clients. **ctx** (optional) is used for logging and Redis relay; pass `conn.ctx` from handlers or `null` when broadcasting from REST (no connection).
- `sendToClient(clientId, data, ctx)`: Send to a specific client. Pass `conn.ctx` (or `null`).
- `getStats()`: Get namespace statistics (e.g. `clientCount`).

**Example:**

```javascript
const ns = WebSocketController.createNamespace('/api/1/ws/dashboard', {
    requireAuth: true,
    requireRoles: ['admin', 'viewer']
});

ns.onConnect(({ clientId, ctx }) => {
    ns.sendToClient(clientId, {
        type: 'init',
        data: getDashboardData()
    }, ctx);
})
.onMessage(({ clientId, message, ctx }) => {
    if (message.type === 'refresh') {
        ns.broadcast({
            type: 'data-update',
            data: getLatestData()
        }, ctx);
    }
})
.onDisconnect(({ clientId, ctx }) => {
    console.log(`User ${ctx?.username} disconnected`);
});
```

### Dynamic Namespaces (Per-Resource Rooms)

Use **dynamic namespaces** when you need one logical channel per resource (e.g. one room per `roomName`, one map per `mapId`) instead of a single shared namespace. The framework creates namespaces **lazily** when the first client connects to a path that matches a registered pattern.

**When to use:** Per-resource isolation (chat rooms, collaborative maps, game instances). For a single shared channel, use a literal path like `/api/1/ws/my-chat`.

**Registration:** Pass a path **pattern** with `:param` segments. The framework registers both the pattern and a template; when a client connects to a concrete path (e.g. `/api/1/ws/hello-rooms/lobby`), it either finds an existing namespace or creates one and runs `onCreate`.

```javascript
// One namespace per room; path pattern with :roomName
const ns = WebSocketController.createNamespace('/api/1/ws/hello-rooms/:roomName', {
    requireAuth: false,
    onCreate: async (req, ctx) => {
        // Validate or init: ctx.params = { roomName: 'lobby' }
        if (!ctx.params?.roomName || ctx.params.roomName.length > 64) return null;  // reject
        return ctx;  // accept; return number to close with custom code
    }
});
ns.onConnect(({ clientId, ctx }) => { /* ... */ })
  .onMessage(({ clientId, message, ctx }) => { /* ... */ })
  .onDisconnect(({ clientId, ctx }) => { /* ... */ });
```

**onCreate(req, ctx):** Called when a new namespace is created for a matched path. **ctx** includes `params` (e.g. `{ roomName: 'lobby' }`). Return **ctx** to accept the connection, **null** to reject, or a **number** to close with a custom close code.

**Lifecycle:** Namespaces are created on first connect. When a namespace has zero clients, you can remove it so the next connect creates a fresh one: use **removeNamespace** or **namespace.removeIfEmpty()** (see below). The framework does not require sticky sessions for multi-instance; use Redis (or similar) for cross-instance counts or broadcasts.

**Removing namespaces:**

- `WebSocketController.removeNamespace(path, { removeIfEmpty })` — **path** is the concrete path (e.g. `/api/1/ws/hello-rooms/lobby`). If `removeIfEmpty: true`, the namespace is removed only when it has no connected clients.
- `namespace.removeIfEmpty()` — instance method; removes this namespace if client count is zero.

**Multi-instance:** With multiple server instances, a given room may have clients on different instances. For room-wide user counts, use a shared counter (e.g. Redis) and broadcast counts (e.g. `room-stats`, `user-left`) so all clients see the same value. See the Dynamic Rooms demo at `/hello-websocket/` for a reference.

**App-layer responsibilities (limitations):** The framework does not replay or store messages for disconnected clients. After a temporary connection outage, the client rejoins the same namespace (or a newly created one for that path) but receives no catch-up of messages sent while offline. The **app layer** must handle sync: for example, on reconnect (e.g. via `onStatusChange` → `'connected'`), refetch current state via REST (e.g. load room messages, map state, or user list) so the client is up to date. See [Handling Reconnect and Missed Updates](#handling-reconnect-and-missed-updates) for the recommended pattern.

---

### Broadcasting Messages

**Broadcast to all clients in namespace:** Pass **ctx** (e.g. `conn.ctx`) for logging and Redis relay; use `null` when broadcasting from a REST handler (no connection context).

```javascript
ns.broadcast({
    type: 'notification',
    data: { message: 'Server restarting in 5 minutes' }
}, ctx);
```

**Send to specific client:**

```javascript
ns.sendToClient(clientId, {
    type: 'private-message',
    data: { message: 'This is just for you!' }
}, ctx);
```

### Message Format

**Wire format** (what the client receives):

**Success:**
```javascript
{
    success: true,
    data: {
        type: 'welcome',      // or your app type
        data: { ... },        // app payload
        ctx: { username: 'john_doe', ip: '1.2.3.4' }  // for logging/display
    }
}
```

**Error:**
```javascript
{
    success: false,
    error: 'Error message',
    code: 500
}
```

**Server payload convention:** When you call `broadcast(data, ctx)` or `sendToClient(clientId, data, ctx)`, the framework builds the app payload as `{ type, data, ctx }`. Your **data** object should have `type` and `data` (event body); **ctx** is added by the framework from the argument you pass (default `{ username: '', ip: '0.0.0.0' }` if null). This ensures consistent logging and Redis relay across all namespaces.

---

## Client-Side API

### Connecting to Namespace

```javascript
jPulse.ws.connect(path, options)
```

**Parameters:**

- `path` (string, required): Namespace path (e.g., `/api/1/ws/my-app`)
- `options` (object, optional):
  - `reconnectBaseInterval` (number): Base reconnection interval in ms (default: 5000)
  - `reconnectMaxInterval` (number): Max reconnection interval in ms (default: 30000)
  - `maxReconnectAttempts` (number): Max reconnection attempts (default: 10)
  - `pingInterval` (number): Ping interval in ms (default: 30000)

**Returns:** Connection handle with methods

**Example:**

```javascript
const ws = jPulse.ws.connect('/api/1/ws/my-app', {
    reconnectBaseInterval: 3000,  // Start with 3s
    reconnectMaxInterval: 20000,  // Cap at 20s
    maxReconnectAttempts: 15
});
```

### Connection Handle Methods

#### send(data)

Send message to server.

```javascript
ws.send({
    type: 'action',
    payload: { foo: 'bar' }
});
```

Returns `true` if sent successfully, `false` if connection not open.

#### onMessage(callback)

Register message handler. Callback receives a single **message** object:
- `message.success`: `true` or `false`
- `message.data`: App payload when success — `{ type, data?, ctx? }`
- `message.error`, `message.code`: When success is false

```javascript
ws.onMessage((message) => {
    if (message.success) {
        const payload = message.data ?? {};
        console.log('Received:', payload.type, payload.data);
    } else {
        console.error('Error:', message.error);
    }
});
```

Returns connection handle for chaining.

#### onStatusChange(callback)

Register status change handler. Callback receives `(newStatus, oldStatus)`.

Status values:
- `'connecting'` — initial connection attempt in progress
- `'connected'` — socket open and healthy
- `'reconnecting'` — connection lost, auto-reconnect scheduled
- `'disconnected'` — max reconnect attempts exhausted, connection abandoned
- `'auth-required'` — server closed socket with code 4401 (session expired); auto-reconnect suppressed

```javascript
ws.onStatusChange((status, oldStatus) => {
    console.log(`Status: ${oldStatus} -> ${status}`);
    updateConnectionIndicator(status);
    if (status === 'auth-required') {
        window.location.href = '/auth/login.shtml';
    }
});
```

Returns connection handle for chaining.

#### getStatus()

Get current connection status.

```javascript
const status = ws.getStatus();
// Returns: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'auth-required'
```

#### isConnected()

Check if currently connected.

```javascript
if (ws.isConnected()) {
    ws.send({ type: 'ping' });
}
```

#### disconnect()

Disconnect and prevent auto-reconnection.

```javascript
ws.disconnect();
```

---

## Connection Lifecycle

### 1. Initial Connection

```javascript
const ws = jPulse.ws.connect('/api/1/ws/my-app');
// Status: 'connecting'
```

The client:
- Generates or retrieves persistent UUID from localStorage
- Establishes WebSocket connection to the server
- Sends UUID as query parameter: `/api/1/ws/my-app?uuid=<uuid>`
- Server recognizes returning clients by UUID across reconnections

### 2. Connected

```javascript
// Status: 'connected'
ws.onStatusChange((status) => {
    if (status === 'connected') {
        // Ready to send/receive messages
        ws.send({ type: 'hello' });
    }
});
```

### 3. Disconnection

If connection drops (network issue, server restart, etc.):

```javascript
// Status: 'reconnecting'
```

Client automatically attempts reconnection with progressive backoff:
- Attempt 1: 5 seconds
- Attempt 2: 10 seconds
- Attempt 3: 15 seconds
- ...
- Attempt 6+: 30 seconds (max)

### 4. Reconnected

```javascript
// Status: 'connected' again
```

Connection restored, messages can flow again.

### 5. Failed Reconnection

After `maxReconnectAttempts` (default 10):

```javascript
// Status: 'disconnected'
```

No more automatic reconnection attempts. User must manually reconnect or reload page.

### Handling Reconnect and Missed Updates

The framework **auto-reconnects** with progressive backoff but does not replay messages that were sent while the client was disconnected. Recommended approach:

- **Baseline:** On reconnect, refetch state via REST (e.g. load list, open item) so the client is in sync. Use **onStatusChange** to detect when status becomes `'connected'` and trigger a refresh.

```javascript
ws.onStatusChange((status, oldStatus) => {
    if (status === 'connected' && oldStatus === 'reconnecting') {
        // Refetch current view state from REST
        loadTodos();
    }
});
```

- **Optional:** Use **onStatusChange** to show a "Reconnecting…" indicator and clear it when `status === 'connected'`.
- **Future:** Message replay or "missed events" APIs are not implemented; treat as tech debt if needed.

---

## Connection Health

### Ping/Pong Mechanism

The framework maintains connection health through bidirectional ping/pong:

**Client → Server:**
- Client sends ping every 30 seconds
- Server responds with pong
- If no pong received within 5 seconds, connection considered dead

**Server → Client:**
- Server sends ping every 30 seconds
- Client responds with pong
- If no pong received, server terminates connection

This ensures both sides detect dead connections quickly.

---

## Authentication & Authorization

### Requiring Authentication

```javascript
const ns = WebSocketController.createNamespace('/api/1/ws/secure-chat', {
    requireAuth: true
});
ns.onConnect(({ clientId, ctx }) => {
    console.log(`User ${ctx?.username} connected`);
});
```

If user is not authenticated, connection is rejected.

### Requiring Specific Roles

```javascript
const ns = WebSocketController.createNamespace('/api/1/ws/admin-panel', {
    requireAuth: true,
    requireRoles: ['admin', 'root']
});
ns.onConnect(({ clientId, ctx }) => {
    console.log(`Admin ${ctx?.username} connected`);
});
```

If user doesn't have required role, connection is rejected.

### Public Access (Demo / Non-Admin)

When **public access** is enabled in config, unauthenticated or non-admin users may connect to **whitelisted** namespaces and receive limited data. Use this for admin-demo pages or read-only dashboards.

**Config** (`app.conf` → `controller.websocket.publicAccess`):

- `enabled` (boolean): When `true`, whitelisted namespaces accept connections without requiring auth/admin. Default `false`.
- `whitelisted` (array of strings): Namespace path patterns. Entries are matched against the full path (e.g. `/api/1/ws/jpulse-ws-status`): exact suffix (e.g. `jpulse-ws-status`) or prefix pattern (e.g. `hello-*` for `/api/1/ws/hello-emoji`, `/api/1/ws/hello-todo`).

When a client connects via public access (path whitelisted and `enabled`), the server sets **ctx.isPublic** for that connection. For the **jpulse-ws-status** namespace, clients with `ctx.isPublic` receive stats filtered by the same whitelist: only whitelisted namespaces and activity-log entries appear; no field-level sanitization. Other namespaces (e.g. jpulse-ws-test) do not change payload for public clients but are still subject to message limits.

### Message Limits (DoS Protection)

**Config** (`app.conf` → `controller.websocket.messageLimits`):

- `maxSize` (number): Max size in bytes for a single incoming message (default 65536 = 64 KB). Larger messages are dropped.
- `interval` (number): Time window in milliseconds for rate limiting (default 1000).
- `maxMessages` (number): Max messages per client per `interval` (default 50). Excess messages in the window are dropped.

Limits apply per connection. Dropped messages are not processed and are logged at info level.

### Accessing User and Context

Handlers receive **conn** with `clientId` and **ctx** only (there is no `conn.user`). **ctx** = `{ username, ip, roles, firstName, lastName, initials, params, isPublic? }` for identity and logging; **params** is set for dynamic namespaces (e.g. `{ roomName: 'lobby' }`); **isPublic** is set when the client connected via public access (whitelisted namespace and `publicAccess.enabled`). Use `conn.ctx` when calling `broadcast()` or `sendToClient()` so logs and Redis relay include the correct context.

```javascript
ns.onMessage(({ clientId, message, ctx }) => {
    if (ctx.username) {
        console.log(`Message from ${ctx.username}:`, message);
    }
    ns.broadcast({ type: 'echo', data: message }, ctx);
});
```

---

## Monitoring & Statistics

### Admin Dashboard

Access real-time WebSocket statistics at:

```
/admin/websocket-stats.shtml
```

(Requires admin role)

The dashboard shows:
- **Global Stats**: Uptime, total messages
- **Per-Namespace Stats**:
  - Status indicator (🟢 green = active, 🟡 yellow = idle, 🔴 red = stale/inactive)
  - Number of connected clients
  - Number of active users (if auth enabled)
  - Messages per hour
  - Total messages processed
  - Last activity timestamp
- **Activity Log**: Messages of last 5 minutes across all namespaces

### Status Indicators

- 🟢 **Green**: Active (messages in last 5 minutes)
- 🟡 **Yellow**: Idle (no messages 5-30 minutes, but clients connected)
- 🔴 **Red**: Stale (no messages 30+ minutes OR no clients connected)

### Programmatic Access

Get statistics from your code:

```javascript
const stats = WebSocketController.getStats();
// Returns: { uptime, totalMessages, namespaces: [...], activityLog: [...] }
```

---

## Common Patterns

### Pattern 1: Ephemeral Real-Time Tracking (No Database)

**Use Case:** Track temporary state that doesn't need persistence (cursor positions, presence, live annotations).

**Example:** Emoji cursor tracking from `/hello-websocket/`

```javascript
// Server: Simply broadcast positions, no database
ns.onMessage(({ clientId, message: data, ctx }) => {
    if (data.type === 'cursor-move') {
        ns.broadcast({
            type: 'cursor',
            data: {
                clientId,
                username: ctx?.username || 'guest',
                emoji: data.emoji,
                x: data.x,
                y: data.y
            }
        }, ctx);
    }
});

// Client: Throttle high-frequency events
let lastSent = 0;
function handleMouseMove(event) {
    const now = Date.now();
    if (now - lastSent >= 50) {  // 20 updates/second
        lastSent = now;
        ws.send({
            type: 'cursor-move',
            emoji: selectedEmoji,
            x: calculateX(event),
            y: calculateY(event)
        });
    }
}
```

**Key Points:**
- No database queries needed
- Fast and lightweight
- State lives only in memory
- Perfect for transient data
- Use throttling for high-frequency events (mouse movements, scroll positions)

### Pattern 2 (Pattern A): REST for CRUD + WebSocket for sync

**Use Case:** Add real-time updates to existing REST API without breaking it. This is **Pattern A** (REST for CRUD, WebSocket for notifications). For **Pattern B** (WebSocket for CRUD), see the Sticky Notes demo in the same `/hello-websocket/` app.

**Example:** Collaborative todo list from `/hello-websocket/`

```javascript
// Server: Enhance existing REST controller with WebSocket broadcasts
class TodoController {
    static async apiCreate(req, res) {
        const todo = await TodoModel.create(todoData);
        res.json({ success: true, data: todo });

        // Broadcast to WebSocket clients (ctx from req for logging)
        if (HelloWebsocketController.broadcastTodoCreated) {
            HelloWebsocketController.broadcastTodoCreated(todo, username, req);
        }
    }
}

// WebSocket controller: broadcast with ctx for logging/relay
class HelloWebsocketController {
    static broadcastTodoCreated(todo, username, req = null) {
        if (this.wsHandles.todo) {
            const ctx = global.RedisManager.getBroadcastContext(req);
            this.wsHandles.todo.broadcast({
                type: 'todo-created',
                data: { todo, username }
            }, ctx);
        }
    }
}

// Client: Use REST for actions, WebSocket for notifications
async function addTodo(title) {
    const response = await jPulse.api.post('/api/1/todo', { title });
    // WebSocket will notify everyone when it's saved
}

// Client: Listen for WebSocket updates (single message arg)
ws.onMessage((message) => {
    if (message.success && message.data?.type === 'todo-created') {
        const d = message.data.data ?? {};
        if (d.todo) todos.push(d.todo);
    }
});
```

**Benefits:**
- ✅ REST API continues to work independently
- ✅ Non-WebSocket clients (mobile apps, scripts) still work
- ✅ Business logic stays in one place (controller)
- ✅ WebSocket layer can be added/removed without breaking app
- ✅ Validation and error handling already in REST API
- ✅ All clients stay synchronized

### Pattern 3: Real-Time Notifications

```javascript
// Server: Broadcast notification to all clients
ns.broadcast({
    type: 'notification',
    data: { level: 'info', message: 'New feature released!' }
}, ctx);

// Client: Display notification
ws.onMessage((message) => {
    if (message.success && message.data?.type === 'notification') {
        const d = message.data.data ?? {};
        jPulse.UI.toast.show(d.message, d.level);
    }
});
```

### Pattern 4: Live Data Updates

```javascript
// Server: Send updates when data changes
function onDataChange(newData, ctx) {
    ns.broadcast({ type: 'data-update', data: newData }, ctx);
}

// Client: Update UI reactively
ws.onMessage((message) => {
    if (message.success && message.data?.type === 'data-update') {
        updateDashboard(message.data.data);
    }
});
```

### Pattern 5: User Presence

```javascript
// Server: Track connected users
const connectedUsers = new Map();

ns.onConnect(({ clientId, ctx }) => {
    connectedUsers.set(clientId, ctx?.username);
    ns.broadcast({
        type: 'user-joined',
        data: { username: ctx?.username, count: connectedUsers.size }
    }, ctx);
})
.onDisconnect(({ clientId, ctx }) => {
    connectedUsers.delete(clientId);
    ns.broadcast({
        type: 'user-left',
        data: { username: ctx?.username, count: connectedUsers.size }
    }, ctx);
});

// Client: Show user count
ws.onMessage((message) => {
    if (!message.success) return;
    const payload = message.data ?? {};
    if (payload.type === 'user-joined' || payload.type === 'user-left') {
        document.getElementById('userCount').textContent =
            `${payload.data?.count ?? 0} users online`;
    }
});
```

### Pattern 6: Request/Response

```javascript
// Client: Send request with ID
const requestId = Date.now();
ws.send({
    type: 'get-data',
    requestId: requestId,
    query: { foo: 'bar' }
});

ws.onMessage((message) => {
    if (message.success && message.data?.type === 'response') {
        const d = message.data.data ?? {};
        if (d.requestId === requestId) console.log('Response received:', d.result);
    }
});

// Server: Send response with matching ID
ns.onMessage(({ clientId, message: data, ctx }) => {
    if (data.type === 'get-data') {
        const result = processQuery(data.query);
        ns.sendToClient(clientId, {
            type: 'response',
            data: { requestId: data.requestId, result }
        }, ctx);
    }
});
```

---

## Vue.js Integration

WebSocket works seamlessly with Vue.js reactive data. Use the single-argument message callback (`message.success`, `message.data`):

```javascript
const HelloApp = {
    data() {
        return {
            connectionStatus: 'disconnected',
            messages: [],
            ws: null
        };
    },
    mounted() {
        this.ws = jPulse.ws.connect('/api/1/ws/my-app')
            .onMessage((message) => {
                if (message.success && message.data) {
                    this.messages.push(message.data);
                }
            })
            .onStatusChange((status) => {
                this.connectionStatus = status;
            });
    },
    beforeUnmount() {
        if (this.ws) this.ws.disconnect();
    },
    methods: {
        sendMessage(text) {
            this.ws.send({ type: 'message', text });
        }
    },
    template: `
        <div>
            <div>Status: {{ connectionStatus }}</div>
            <div v-for="msg in messages">{{ msg.data?.text ?? msg.type }}</div>
            <button @click="sendMessage('Hello!')">Send</button>
        </div>
    `
};
```

---

## Best Practices

### 1. Use Specific Types

Always include a `type` field in your messages to distinguish different message kinds:

```javascript
ws.send({ type: 'user-action', action: 'click' });
ws.send({ type: 'data-update', data: {...} });
ws.send({ type: 'ping' });
```

### 2. Handle Connection Status

Always respond to connection status changes:

```javascript
ws.onStatusChange((status) => {
    if (status === 'disconnected') {
        showWarning('Connection lost. Please reload.');
    } else if (status === 'reconnecting') {
        showWarning('Reconnecting…');
    } else if (status === 'connected') {
        hideWarning();
    } else if (status === 'auth-required') {
        // Session expired — redirect to login immediately
        window.location.href = '/auth/login.shtml';
    }
});
```

### 3. Handle Session Expiry

When a user's session is destroyed (logout on another tab, session timeout) the server
detects the expired session on the next ping cycle and closes the socket with close code **4401**.
The client library maps this to `'auth-required'` status and **suppresses auto-reconnect** —
attempting to reconnect would fail with `AUTH_REQUIRED` anyway.

```javascript
// Minimal pattern: redirect on session expiry
const ws = jPulse.ws.connect('/api/1/ws/my-app')
    .onStatusChange((status) => {
        if (status === 'auth-required') {
            window.location.href = '/auth/login.shtml';
        }
    });
```

**How it works (framework internals):**
1. Server sends `{ success: false, code: 'SESSION_EXPIRED' }` message
2. Server closes socket with WS close code 4401
3. Client `onclose` handler detects code 4401, sets status `'auth-required'`, removes connection
4. No reconnect timer is scheduled — the connection is gone

**Polling alternative (no WebSocket):**
If you need to detect session expiry without an active WebSocket, poll the zero-cost endpoint:

```javascript
setInterval(async () => {
    const result = await jPulse.api.get('/api/1/auth/status');
    if (result.success && !result.data.authenticated) {
        window.location.href = '/auth/login.shtml';
    }
}, 15000); // Every 15 seconds
```

### 5. Clean Up Connections

Always disconnect when component unmounts or page unloads:

```javascript
// Vue.js
beforeUnmount() {
    this.ws.disconnect();
}

// Plain JavaScript
window.addEventListener('beforeunload', () => {
    ws.disconnect();
});
```

### 6. Validate Messages

Always validate incoming messages:

```javascript
ws.onMessage((message) => {
    if (!message.success || !message.data?.type) {
        console.warn('Invalid or error message:', message);
        return;
    }
    // Process valid message: message.data.type, message.data.data
});
```

### 7. Rate Limiting

Don't flood the server with messages:

```javascript
let lastSent = 0;
const MIN_INTERVAL = 100; // 100ms

function sendSafe(data) {
    const now = Date.now();
    if (now - lastSent >= MIN_INTERVAL) {
        ws.send(data);
        lastSent = now;
    }
}
```

### 8. Use Namespaces Wisely

Create separate namespaces for different purposes:

- `/api/1/ws/notifications` - Global notifications
- `/api/1/ws/chat` - Chat messages
- `/api/1/ws/dashboard` - Live dashboard data
- `/api/1/ws/game` - Game state updates

Don't mix unrelated functionality in one namespace.

### 9. Message Delivery is "Fire and Forget"

**Important:** The WebSocket framework does **not** automatically retry failed messages or track message delivery.

- Messages are sent once
- No automatic acknowledgment or retry mechanism
- No queue for failed messages
- Application is responsible for implementing delivery guarantees if needed

**Why?**
- Keeps framework simple and performant
- Different applications have different reliability requirements
- Gives you full control over retry logic

**If you need guaranteed delivery:**

```javascript
// Client-side: Implement acknowledgment system
let messageId = 0;
const pendingMessages = new Map();

function sendWithAck(ws, data) {
    const id = ++messageId;
    const message = { ...data, id };

    pendingMessages.set(id, {
        data: message,
        timestamp: Date.now(),
        retries: 0
    });

    ws.send(message);

    // Set timeout for acknowledgment
    setTimeout(() => checkAck(ws, id), 5000);
}

function checkAck(ws, id) {
    if (pendingMessages.has(id)) {
        const msg = pendingMessages.get(id);
        if (msg.retries < 3) {
            msg.retries++;
            ws.send(msg.data);
            setTimeout(() => checkAck(ws, id), 5000);
        } else {
            // Give up after 3 retries
            console.error('Message delivery failed:', msg.data);
            pendingMessages.delete(id);
        }
    }
}

// Handle acknowledgments
ws.onMessage((message) => {
    if (message.success && message.data?.type === 'ack') {
        const mid = message.data.data?.messageId;
        if (mid) pendingMessages.delete(mid);
    }
});

// Server-side: Send acknowledgments
ns.onMessage(({ clientId, message: data, ctx }) => {
    // Process message...
    ns.sendToClient(clientId, {
        type: 'ack',
        data: { messageId: data.id }
    }, ctx);
});
```

This gives you full control over retry logic, timeouts, and failure handling based on your application's needs.

---

## Examples

See the following examples for complete implementations:

### Hello WebSocket Demo (`/hello-websocket/`)

A comprehensive interactive demo with two real-world patterns:

**1. Emoji Cursor Tracking** - Ephemeral real-time tracking
- See other users' mouse cursors in real-time
- No database persistence (ephemeral state)
- Demonstrates throttling for high-frequency events (50ms)
- Perfect example of lightweight real-time tracking
- **Pattern:** Ephemeral tracking (Pattern 1)

**2. Collaborative Todo List** - REST for CRUD + WebSocket for sync (Pattern A)
- Add, complete, and delete todos with instant sync
- REST API handles all CRUD operations
- WebSocket broadcasts changes to all users
- Shows how to layer real-time onto existing MVC

**3. Sticky Notes** - WebSocket for CRUD (Pattern B)
- Collaborative sticky notes on a canvas; create, update, delete over WebSocket
- Server persists in Redis and broadcasts; all clients see changes in real time
- No REST for note mutations; demonstrates Pattern B

**4. Dynamic Rooms** - Per-resource namespaces (dynamic namespaces)
- One WebSocket namespace per room; path pattern `/api/1/ws/hello-rooms/:roomName`
- `onCreate` validation, room chat, multi-instance user count via Redis + `room-stats` / `user-left` broadcasts
- See [Dynamic Namespaces (Per-Resource Rooms)](#dynamic-namespaces-per-resource-rooms)

**Pattern B caveat — echo overwrites typing:** The server broadcasts `note-updated` to all clients, including the sender. If you apply every incoming `note-updated` to your local state, your own (stale) echo can overwrite the textarea while the user is still typing and drop characters — worse under load or in a PM2 cluster. **Fix:** When handling `note-updated`, do not apply the update if you have pending debounced input for that note (e.g. `if (this.textDebounce[data.note.id]) return;`). Apply updates only when you are not currently editing that note.

**Also includes:**
- Code examples (copy-paste ready)
- Architecture explanation
- Best practices

### Admin WebSocket Stats (`/admin/websocket-stats.shtml`)

Real-time monitoring dashboard (requires admin role):
- Live namespace statistics
- Active client counts
- Message rates and activity logs
- Connection health indicators
- **Pattern:** Live data updates (Pattern 4)

### Multi-instance behavior

When you run two or more server instances (e.g. behind a load balancer), each instance holds its **own** WebSocket clients per namespace — there is no shared connection list. When your code calls `broadcast(data, ctx)`, the framework (1) sends the payload to that instance’s local clients only (`_localBroadcast` to N clients) and (2) publishes the same payload to a Redis channel for that namespace. Every instance (including the one that broadcast) subscribes to that channel; when a message is received from Redis, the framework runs `_localBroadcast` to its local clients in that namespace. So all clients in the namespace get the message whether they are on the same instance as the sender or another one. **Logs:** on the instance where the message originated you see your app log (e.g. `onMessage` or `helloTodo.apiCreate`) plus “Broadcast to N clients” and “Published to Redis channel”; on other instances you see only “Broadcast to N clients” (delivery from Redis). No sticky sessions are required; which instance handles the HTTP upgrade is independent of which instance later broadcasts.

---

## Troubleshooting

### Connection Fails Immediately

**Problem:** Connection closes right after opening.

**Solutions:**
- Check namespace is registered on server
- Verify path starts with `/api/1/ws/`
- Check authentication requirements
- Check role requirements

### Messages Not Received

**Problem:** Messages sent but not received.

**Solutions:**
- Check connection status: `ws.getStatus()`
- Verify message format (must be JSON-serializable)
- Check server-side `onMessage` handler
- Look for JavaScript errors in console

### Reconnection Not Working

**Problem:** Connection doesn't reconnect after disconnect.

**Solutions:**
- Check `maxReconnectAttempts` not exceeded
- Verify `shouldReconnect` flag not set to false
- Check network connectivity
- Restart browser/clear cache

### High Latency

**Problem:** Messages delayed.

**Solutions:**
- Check network conditions
- Verify server not overloaded
- Check for slow `onMessage` handlers (use async/await properly)
- Monitor WebSocket stats dashboard for bottlenecks

---

## API Reference Summary

### Server-Side

```javascript
const ns = WebSocketController.createNamespace(path, options?)
ns.onConnect((conn) => {}).onMessage((conn) => {}).onDisconnect((conn) => {})
ns.broadcast(data, ctx)
ns.sendToClient(clientId, data, ctx)
ns.getStats()
WebSocketController.getStats()
```

- **conn**: `{ clientId, ctx }` (onMessage also has `message`). **ctx** = `{ username, ip, roles, firstName, lastName, initials, params }` for identity and logging; **params** for dynamic namespaces.
- **data**: Object with `type` and `data` (event body). Framework adds **ctx** to payload for wire/Redis.

### Client-Side

```javascript
jPulse.ws.connect(path, options)
ws.send(data)
ws.onMessage((message) => {})   // message.success, message.data, message.error
ws.onStatusChange(callback)
ws.getStatus()
ws.isConnected()
ws.disconnect()
jPulse.ws.getConnections()
```

---

## Next Steps

- Read [Application Cluster Communication](application-cluster.md) for multi-server broadcasting patterns
- Read [Front-End Development Guide](front-end-development.md) for MPA/SPA patterns
- Explore `/hello-websocket/` example application
- Check out [API Reference](api-reference.md) for complete API documentation
- Visit `/admin/websocket-stats.shtml` to monitor your WebSocket namespaces
