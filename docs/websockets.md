# jPulse Framework / Docs / WebSocket Real-Time Communication v1.0.4

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
- **No Automatic Retry**: Applications control message delivery guarantees (see Best Practices)

---

## Quick Start

### Server-Side: Register a Namespace

Controllers can register WebSocket namespaces to handle real-time communication:

```javascript
// site/webapp/controller/myController.js
import WebSocketController from '../../../webapp/controller/websocket.js';

class MyController {
    static async initialize() {
        // Register WebSocket namespace
        const wsHandle = WebSocketController.registerNamespace('/api/1/ws/my-app', {
            requireAuth: false,  // Optional authentication
            requireRoles: [],    // Optional role restrictions
            onConnect: (clientId, user) => {
                const username = user?.username || 'anonymous';
                console.log(`Client ${clientId} (${username}) connected`);
                // Send welcome message (username automatically included)
                wsHandle.sendToClient(clientId, {
                    type: 'welcome',
                    message: 'Connected to my-app!'
                });
            },
            onMessage: (clientId, data, user) => {
                // data.username is automatically included
                console.log(`Message from ${data.username || 'anonymous'}:`, data);
                // Broadcast to all clients (username automatically included)
                wsHandle.broadcast({
                    type: 'update',
                    from: clientId,
                    data: data
                }, user?.username || '');
            },
            onDisconnect: (clientId, user) => {
                console.log(`Client ${clientId} disconnected`);
            }
        });

        return wsHandle;
    }
}
```

### Client-Side: Connect and Communicate

Views can connect to namespaces using the `jPulse.ws` utilities:

```javascript
// In your view or Vue component
const ws = jPulse.ws.connect('/api/1/ws/my-app')
    .onMessage((data, message) => {
        if (data) {
            console.log('Received:', data);
            // Handle successful message
            if (data.type === 'update') {
                updateUI(data);
            }
        } else {
            // Handle error message
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

### Registering Namespaces

All namespace paths **must** start with `/api/1/ws/` prefix (enforced by framework).

```javascript
WebSocketController.registerNamespace(path, options)
```

**Parameters:**

- `path` (string, required): Namespace path, must start with `/api/1/ws/`
- `options` (object, optional):
  - `requireAuth` (boolean): Require user authentication (default: `false`)
  - `requireRoles` (array): Required user roles (default: `[]`)
  - `onConnect` (function): Handler when client connects
  - `onMessage` (function): Handler when message received
  - `onDisconnect` (function): Handler when client disconnects

**Returns:** Namespace handle with methods:
- `broadcast(data)`: Send to all connected clients
- `sendToClient(clientId, data)`: Send to specific client
- `getStats()`: Get namespace statistics

**Example:**

```javascript
const wsHandle = WebSocketController.registerNamespace('/api/1/ws/dashboard', {
    requireAuth: true,
    requireRoles: ['admin', 'viewer'],
    onConnect: (clientId, user) => {
        // Send initial data to new client
        wsHandle.sendToClient(clientId, {
            type: 'init',
            data: getDashboardData()
        });
    },
    onMessage: (clientId, data, user) => {
        // Process message and broadcast update
        if (data.type === 'refresh') {
            wsHandle.broadcast({
                type: 'data-update',
                data: getLatestData()
            });
        }
    },
    onDisconnect: (clientId, user) => {
        console.log(`User ${user?.username} disconnected`);
    }
});
```

### Broadcasting Messages

**Broadcast to all clients in namespace:**

```javascript
wsHandle.broadcast({
    type: 'notification',
    message: 'Server restarting in 5 minutes'
});
```

**Send to specific client:**

```javascript
wsHandle.sendToClient(clientId, {
    type: 'private-message',
    message: 'This is just for you!'
});
```

### Message Format

All messages follow the standard API format:

**Success:**
```javascript
{
    success: true,
    data: {
        // Your data here
        username: 'john_doe'  // Automatically added by framework
    }
}
```

**Error:**
```javascript
{
    success: false,
    error: 'Error message',
    code: 500,
    username: ''  // Empty for system messages
}
```

**Important:** All messages include `username` field:
- Set to the authenticated user's username if logged in
- Empty string (`''`) if not authenticated or for system messages
- Automatically added by framework to all outgoing messages

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

Register message handler. Callback receives `(data, message)` where:
- `data`: The data payload (if success), or `null` (if error)
- `message`: Full message object with `success`, `data`, `error`, etc.

```javascript
ws.onMessage((data, message) => {
    if (data) {
        // Handle success
        console.log('Received:', data);
    } else {
        // Handle error
        console.error('Error:', message.error);
    }
});
```

Returns connection handle for chaining.

#### onStatusChange(callback)

Register status change handler. Callback receives `(newStatus, oldStatus)`.

Status values: `'connecting'`, `'connected'`, `'reconnecting'`, `'disconnected'`

```javascript
ws.onStatusChange((status, oldStatus) => {
    console.log(`Status: ${oldStatus} -> ${status}`);
    updateConnectionIndicator(status);
});
```

Returns connection handle for chaining.

#### getStatus()

Get current connection status.

```javascript
const status = ws.getStatus();
// Returns: 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
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
WebSocketController.registerNamespace('/api/1/ws/secure-chat', {
    requireAuth: true,  // Users must be logged in
    onConnect: (clientId, user) => {
        // user object available
        console.log(`User ${user.username} connected`);
    }
});
```

If user is not authenticated, connection is rejected.

### Requiring Specific Roles

```javascript
WebSocketController.registerNamespace('/api/1/ws/admin-panel', {
    requireAuth: true,
    requireRoles: ['admin', 'root'],  // Only admins
    onConnect: (clientId, user) => {
        console.log(`Admin ${user.username} connected`);
    }
});
```

If user doesn't have required role, connection is rejected.

### Accessing User Information

The `user` object is available in all handlers when authentication is enabled:

```javascript
onMessage: (clientId, data, user) => {
    if (user) {
        console.log(`Message from ${user.username}:`, data);
    }
}
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
onMessage: (clientId, data, user) => {
    if (data.type === 'cursor-move') {
        // Broadcast position to all other clients
        wsHandle.broadcast({
            type: 'cursor',
            clientId: clientId,
            username: user?.username || 'guest',
            emoji: data.emoji,
            x: data.x,
            y: data.y
        }, user?.username || '');
    }
}

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

### Pattern 2: Hybrid REST + WebSocket Architecture

**Use Case:** Add real-time updates to existing REST API without breaking it.

**Example:** Collaborative todo list from `/hello-websocket/`

```javascript
// Server: Enhance existing REST controller with WebSocket broadcasts
class TodoController {
    static async apiCreate(req, res) {
        // Existing REST API logic (validation, database, etc.)
        const todo = await TodoModel.create(todoData);
        res.json({ success: true, data: todo });

        // NEW: Broadcast to WebSocket clients
        if (HelloWebsocketController.broadcastTodoCreated) {
            HelloWebsocketController.broadcastTodoCreated(todo, username);
        }
    }
}

// WebSocket controller: Just handle broadcasts, no business logic
class HelloWebsocketController {
    static broadcastTodoCreated(todo, username) {
        this.wsHandles.todo.broadcast({
            type: 'todo-created',
            todo: todo,
            username: username
        });
    }
}

// Client: Use REST for actions, WebSocket for notifications
async function addTodo(title) {
    // Use REST API for the action (validation, persistence)
    const response = await jPulse.api.post('/api/1/todo', { title });

    // WebSocket will notify everyone (including us) when it's saved
    // No need to manually update UI here
}

// Client: Listen for WebSocket updates
ws.onMessage((data) => {
    if (data.type === 'todo-created') {
        // Update UI reactively
        todos.push(data.todo);
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
wsHandle.broadcast({
    type: 'notification',
    level: 'info',
    message: 'New feature released!'
});

// Client: Display notification
ws.onMessage((data) => {
    if (data.type === 'notification') {
        jPulse.UI.toast.show(data.message, data.level);
    }
});
```

### Pattern 4: Live Data Updates

```javascript
// Server: Send updates when data changes
function onDataChange(newData) {
    wsHandle.broadcast({
        type: 'data-update',
        data: newData
    });
}

// Client: Update UI reactively
ws.onMessage((data) => {
    if (data.type === 'data-update') {
        updateDashboard(data.data);
    }
});
```

### Pattern 5: User Presence

```javascript
// Server: Track connected users
const connectedUsers = new Map();

onConnect: (clientId, user) => {
    connectedUsers.set(clientId, user.username);
    wsHandle.broadcast({
        type: 'user-joined',
        username: user.username,
        count: connectedUsers.size
    });
},
onDisconnect: (clientId, user) => {
    connectedUsers.delete(clientId);
    wsHandle.broadcast({
        type: 'user-left',
        username: user.username,
        count: connectedUsers.size
    });
}

// Client: Show user count
ws.onMessage((data) => {
    if (data.type === 'user-joined' || data.type === 'user-left') {
        document.getElementById('userCount').textContent =
            `${data.count} users online`;
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

ws.onMessage((data) => {
    if (data.type === 'response' && data.requestId === requestId) {
        console.log('Response received:', data.result);
    }
});

// Server: Send response with matching ID
onMessage: (clientId, data) => {
    if (data.type === 'get-data') {
        const result = processQuery(data.query);
        wsHandle.sendToClient(clientId, {
            type: 'response',
            requestId: data.requestId,
            result: result
        });
    }
}
```

---

## Vue.js Integration

WebSocket works seamlessly with Vue.js reactive data:

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
            .onMessage((data) => {
                // Reactive update
                this.messages.push(data);
            })
            .onStatusChange((status) => {
                // Reactive update
                this.connectionStatus = status;
            });
    },
    beforeUnmount() {
        if (this.ws) {
            this.ws.disconnect();
        }
    },
    methods: {
        sendMessage(text) {
            this.ws.send({
                type: 'message',
                text: text
            });
        }
    },
    template: `
        <div>
            <div>Status: {{ connectionStatus }}</div>
            <div v-for="msg in messages">{{ msg.text }}</div>
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
        // Inform user, disable features, etc.
        showWarning('Connection lost. Please reload.');
    } else if (status === 'connected') {
        // Re-enable features
        hideWarning();
    }
});
```

### 3. Clean Up Connections

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

### 4. Validate Messages

Always validate incoming messages:

```javascript
ws.onMessage((data, message) => {
    if (!data || !data.type) {
        console.warn('Invalid message:', message);
        return;
    }
    // Process valid message
});
```

### 5. Rate Limiting

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

### 6. Use Namespaces Wisely

Create separate namespaces for different purposes:

- `/api/1/ws/notifications` - Global notifications
- `/api/1/ws/chat` - Chat messages
- `/api/1/ws/dashboard` - Live dashboard data
- `/api/1/ws/game` - Game state updates

Don't mix unrelated functionality in one namespace.

### 7. Message Delivery is "Fire and Forget"

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
ws.onMessage((data) => {
    if (data.type === 'ack' && data.messageId) {
        pendingMessages.delete(data.messageId);
    }
});

// Server-side: Send acknowledgments
onMessage: (clientId, data) => {
    // Process message...

    // Send acknowledgment
    wsHandle.sendToClient(clientId, {
        type: 'ack',
        messageId: data.id
    });
}
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

**2. Collaborative Todo List** - Hybrid REST + WebSocket
- Add, complete, and delete todos with instant sync
- REST API handles all CRUD operations
- WebSocket broadcasts changes to all users
- Shows how to layer real-time onto existing MVC
- **Pattern:** Hybrid architecture (Pattern 2)

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
WebSocketController.registerNamespace(path, options)
wsHandle.broadcast(data)
wsHandle.sendToClient(clientId, data)
wsHandle.getStats()
WebSocketController.getStats()
```

### Client-Side

```javascript
jPulse.ws.connect(path, options)
ws.send(data)
ws.onMessage(callback)
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
