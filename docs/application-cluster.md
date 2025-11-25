# jPulse Framework / Docs / Application Cluster Communication v1.2.5

## Overview

The jPulse Framework provides enterprise-grade application clustering for multi-server deployments. When you run multiple application instances behind a load balancer, the Application Cluster system ensures that data changes and notifications are synchronized across all servers in real-time.

**Key Capability:** When a user makes a change on Server A, all users connected to Server B, C, D... see the update instantly.

### Key Features

- **Redis-Powered Broadcasting**: Pub/sub messaging across server instances
- **Automatic UUID Management**: Client UUIDs handled transparently via `jPulse.appCluster.fetch()`
- **omitSelf Support**: Control whether sender receives their own broadcasts
- **Channel Architecture**: Enforced `model:*`, `view:*`, `controller:*` naming conventions
- **Graceful Fallback**: Works in single-server mode without Redis
- **MPA & SPA Support**: Works seamlessly with both architectures
- **No Persistent Connections**: Lower resource overhead than WebSocket

---

## Quick Decision: App Cluster vs. WebSocket

```
┌──────────────────────────────────────────────────────────────┐
│      WHAT TYPE OF REAL-TIME COMMUNICATION DO YOU NEED?       │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
  BROADCAST NOTIFICATIONS              BI-DIRECTIONAL CHAT
  "State changed, notify all"          "Server ↔ Client conversation"
        │                                       │
        │                                       │
        ▼                                       ▼
┌──────────────────────┐              ┌──────────────────────┐
│  App Cluster         │              │    WebSocket         │
│  (This Doc)          │              │  (websockets.md)     │
│                      │              │                      │
│ • REST API + Notify  │              │ • Persistent connect │
│ • No connection      │              │ • Request/response   │
│ • Lower overhead     │              │ • Connection events  │
│ • Broadcast only     │              │ • Bi-directional     │
│                      │              │                      │
│ Example:             │              │ Example:             │
│ Collaborative editing│              │ Live chat messages   │
└──────────────────────┘              └──────────────────────┘
```

**Both use Redis for multi-instance coordination!** The difference is the communication pattern, not whether they scale across servers.

---

## Comparison: App Cluster vs. WebSocket

Both technologies work across multiple server instances using Redis pub/sub. Here are the real differences:

| Feature | App Cluster Broadcasting | WebSocket |
|---------|-------------------------|-----------|
| **Communication Pattern** | Broadcast-only (one-way notifications) | Bi-directional (request/response) |
| **Connection Model** | No persistent connection (HTTP-based) | Persistent WebSocket per client |
| **Primary Use Case** | State synchronization & notifications | Interactive real-time communication |
| **Client Initiates** | ✅ Via REST API + auto-broadcast | ✅ Via ws.send() |
| **Server Initiates** | ✅ Via RedisManager.publishBroadcast() | ✅ Via wsHandle.broadcast() |
| **Multi-Instance Support** | ✅ Redis pub/sub | ✅ Redis pub/sub |
| **Single-Instance Fallback** | ❌ Requires Redis | ✅ Works without Redis |
| **Resource Overhead** | ✅ Lower (no persistent connections) | ⚠️ Higher (maintains connections) |
| **Connection Lifecycle** | ❌ N/A (no connection) | ✅ connect/disconnect/reconnect events |
| **omitSelf Filtering** | ✅ Built-in automatic | ⚠️ Manual implementation |
| **Channel Types** | `model:*`, `view:*`, `controller:*` | Namespaces `/api/1/ws/*` |
| **Client API** | `jPulse.appCluster.broadcast.*` | `jPulse.ws.connect()` |
| **Server API** | `RedisManager.publishBroadcast()` | `WebSocketController.registerNamespace()` |
| **Architecture** | REST API for actions + broadcasts for sync | WebSocket for primary communication |
| **Best For** | "Something changed, notify everyone" | "Ongoing conversation with server" |
| **Examples** | • Collaborative to-do list<br/>• Global notifications<br/>• Config updates<br/>• Cache invalidation | • Chat applications<br/>• Live cursors/presence<br/>• Real-time gaming<br/>• Request/response patterns |

### The Key Insight

```
App Cluster = "REST API does the work, broadcasts notify"
              (Make changes via API, broadcasts keep everyone in sync)

WebSocket   = "WebSocket IS the primary communication"
              (Real-time conversation, server pushes updates)
```

---

## When to Use What?

### ✅ Use Application Cluster Broadcasting When:

- **Synchronizing state across multiple servers**
  - User on Server A edits a document
  - Users on Server B, C, D need to see the change

- **Broadcasting after API operations**
  - REST API validates and saves data
  - Broadcast notifies all connected clients

- **Global system notifications**
  - "System maintenance starting in 5 minutes"
  - "New feature available!"

- **Lower resource requirements**
  - No persistent connections per client
  - HTTP-based with broadcast subscriptions

**Real-World Examples:**
- ✅ Collaborative editing (Google Docs style)
- ✅ Shopping cart updates across instances
- ✅ Real-time dashboards (admin sees all user changes)
- ✅ Global notifications and alerts
- ✅ Configuration updates (cache invalidation)
- ✅ Multi-user task management

### ✅ Use WebSocket When:

- **Persistent bi-directional communication needed**
  - Client sends message, server responds
  - Server pushes updates without client request

- **Request/response patterns**
  - Client: "Give me current data"
  - Server: "Here it is"

- **Connection lifecycle important**
  - Need to know when user connects/disconnects
  - Send welcome messages on connect
  - Clean up resources on disconnect

- **Namespace isolation per feature**
  - `/api/1/ws/chat` separate from `/api/1/ws/game`
  - Different auth requirements per namespace

**Real-World Examples:**
- ✅ Chat applications (messages back and forth)
- ✅ Live cursors and presence (ephemeral data)
- ✅ Real-time gaming (high-frequency updates)
- ✅ Interactive dashboards (user requests data)
- ✅ Collaborative whiteboards (drawing in real-time)

### ✅ Use BOTH When:

Many applications benefit from using both technologies together:

```javascript
// Example: Multi-server chat application

// WebSocket: Real-time message delivery
const ws = jPulse.ws.connect('/api/1/ws/chat');
ws.send({ type: 'message', text: 'Hello!' });
ws.onMessage((data) => displayMessage(data));

// App Cluster: User status across servers
// (Status changes via REST API, not WebSocket)
jPulse.appCluster.broadcast.subscribe('view:chat:user:status',
    (data) => {
        updateUserStatus(data.userId, data.status);
    },
    { omitSelf: true }
);

// Update status via REST API
await jPulse.appCluster.fetch('/api/1/user/status', {
    method: 'PUT',
    body: { status: 'away' }
});
// ^ This automatically broadcasts to all servers
```

**Why this works:**
- WebSocket handles the high-frequency chat messages
- App Cluster handles user status (less frequent, needs persistence)
- Each technology does what it's best at

---

## Quick Start

### Pattern A: Client-Side Broadcasting (Simple)

**Use Case:** Global notifications without server-side logic or persistence

```javascript
// Subscribe to notifications
jPulse.appCluster.broadcast.subscribe(
    'view:myApp:notification:sent',
    (data) => {
        // Show notification to user
        jPulse.UI.toast.show(
            `📡 ${data.senderName}: ${data.message}`,
            'info'
        );
    },
    { omitSelf: true }  // Don't receive your own messages
);

// Publish notification (goes to ALL servers)
jPulse.appCluster.broadcast.publish(
    'view:myApp:notification:sent',
    {
        message: 'Hello from another server!',
        senderName: 'John Doe',
        timestamp: Date.now()
    }
);
```

**Perfect for:**
- System announcements
- Status updates
- Alerts and warnings
- Ephemeral notifications

**Live Example:** `/hello-app-cluster/notifications.shtml`

---

### Pattern B: Server-Side Broadcasting (Production)

**Use Case:** Collaborative applications with database persistence and validation

```javascript
// ============================================
// CLIENT SIDE
// ============================================

// Subscribe to list changes
jPulse.appCluster.broadcast.subscribe(
    'view:myApp:list:changed',
    (data) => {
        if (data.action === 'created') {
            addItemToUI(data.item);
        } else if (data.action === 'deleted') {
            removeItemFromUI(data.item._id);
        }
    },
    { omitSelf: true }
);

// Create item via API (automatic UUID injection)
const response = await jPulse.appCluster.fetch('/api/1/myController', {
    method: 'POST',
    body: { title: 'New task', description: 'Details here' }
});

if (response.success) {
    // Optimistic UI update (for sender only)
    addItemToUI(response.item);
}

// ============================================
// SERVER SIDE (Controller)
// ============================================

class MyController {
    static async apiCreate(req, res) {
        try {
            // 1. Validate input
            const { title, description } = req.body;
            if (!title) {
                return CommonUtils.sendError(req, res, 400,
                    'Title is required', 'VALIDATION_ERROR');
            }

            // 2. Save to database
            const item = await MyModel.create({
                title,
                description,
                username: req.session?.user?.username || 'guest',
                createdAt: new Date()
            });

            // 3. Return success response
            res.json({ success: true, item });

            // 4. Broadcast change to ALL server instances
            await MyController._broadcastChange('created', item, req);

        } catch (error) {
            LogController.logError(req, 'myController.apiCreate',
                `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500,
                'Failed to create item', 'CREATE_ERROR');
        }
    }

    static async _broadcastChange(action, item, req) {
        // Graceful fallback if Redis not available
        if (!global.RedisManager?.isRedisAvailable()) {
            return;
        }

        const payload = {
            action,        // 'created', 'updated', 'deleted'
            item,          // The item data
            user: {
                username: req.session?.user?.username || 'guest',
                firstName: req.session?.user?.firstName || '',
                lastName: req.session?.user?.lastName || ''
            },
            timestamp: new Date().toISOString()
        };

        // Broadcast to client-facing channel (view:)
        await global.RedisManager.publishBroadcast(
            'view:myApp:list:changed',
            payload
        );
    }
}
```

**Perfect for:**
- Collaborative editing
- Multi-user task management
- Real-time dashboards
- Shopping carts across instances
- Audit trails and logging

**Live Example:** `/hello-app-cluster/collaborative-todo.shtml`

---

## Architecture Deep Dive

### How It Works: Multi-Server Synchronization

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Server A   │       │   Server B   │       │   Server C   │
│   :8080      │       │   :8081      │       │   :8082      │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │
       │  1. User creates     │                      │
       │     item via API     │                      │
       │                      │                      │
       ▼                      │                      │
  [Controller]                │                      │
       │                      │                      │
  2. Validate                 │                      │
  3. Save to DB               │                      │
       │                      │                      │
       ▼                      │                      │
  [Broadcast]                 │                      │
       │                      │                      │
       └──────────────────────┼──────────────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │    Redis    │
                       │   Pub/Sub   │
                       └─────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  Browser 1   │       │  Browser 2   │       │  Browser 3   │
│  (Server A)  │       │  (Server B)  │       │  (Server C)  │
│              │       │              │       │              │
│ ✅ Shows     │       │ ✅ Shows     │       │ ✅ Shows     │
│    new item  │       │    new item  │       │    new item  │
│  (optimistic)│       │  (broadcast) │       │  (broadcast) │
└──────────────┘       └──────────────┘       └──────────────┘
```

### Message Flow Sequence

**Step 1: User Action (Browser 1 → Server A)**
```
Browser 1 → POST /api/1/myController
            body: { title: "New task", uuid: "abc-123" }
```

**Step 2: Server Processes (Server A)**
```
Controller → Validate input
          → Save to MongoDB
          → Return { success: true, item: {...} }
          → Publish to Redis: "view:myApp:list:changed"
```

**Step 3: Redis Distributes (Redis → All Servers)**
```
Redis → Server A: Receives broadcast (omits uuid abc-123)
      → Server B: Receives broadcast
      → Server C: Receives broadcast
```

**Step 4: Clients Update (All Servers → Browsers)**
```
AppClusterController (on each server)
  → Relays to WebSocket clients subscribed to "view:myApp:list:changed"
  → Applies omitSelf filter (Browser 1 skipped)

Result:
  Browser 1: Already updated (optimistic)
  Browser 2: Receives broadcast, updates UI
  Browser 3: Receives broadcast, updates UI
```

### Components

#### 1. **RedisManager** (Server-Side)
Manages Redis pub/sub connections and message routing.

```javascript
// Publish broadcast
await RedisManager.publishBroadcast('view:myApp:event', data);

// Subscribe to broadcasts (server-to-server)
RedisManager.registerBroadcastCallback('controller:myApp:*',
    (channel, data, sourceInstanceId) => {
        // Handle server-side events
    }
);
```

#### 2. **AppClusterController** (Server-Side)
Relays Redis broadcasts to WebSocket clients.

```javascript
// Automatically initialized by framework
// Subscribes to: controller:*, view:*, model:*
// Relays to interested WebSocket clients
```

#### 3. **jPulse.appCluster** (Client-Side)
Client-side API for subscribing and publishing.

```javascript
// Subscribe
jPulse.appCluster.broadcast.subscribe(channel, callback, options);

// Publish
jPulse.appCluster.broadcast.publish(channel, data);

// API wrapper with auto-UUID
jPulse.appCluster.fetch(url, options);
```

---

## Client-Side API Reference

### jPulse.appCluster.broadcast.subscribe()

Subscribe to broadcast messages from any server instance.

**Syntax:**
```javascript
jPulse.appCluster.broadcast.subscribe(channel, callback, options)
```

**Parameters:**
- `channel` (string, required): Channel name (must start with `view:`)
- `callback` (function, required): `(data) => void` - Handler for messages
- `options` (object, optional):
  - `omitSelf` (boolean): Skip messages originated by this client (default: `false`)

**Returns:** Subscription handle (for future unsubscribe support)

**Example:**
```javascript
jPulse.appCluster.broadcast.subscribe(
    'view:myApp:task:updated',
    (data) => {
        console.log('Task updated:', data.task);
        updateTaskInUI(data.task);
    },
    { omitSelf: true }
);
```

**Channel Restrictions:**
- Client-side code can only subscribe to `view:*` channels
- Attempting to subscribe to `controller:*` or `model:*` throws error
- This is for security and architectural consistency

---

### jPulse.appCluster.broadcast.publish()

Publish broadcast message to all server instances (client-to-Redis directly).

**Syntax:**
```javascript
jPulse.appCluster.broadcast.publish(channel, data, options)
```

**Parameters:**
- `channel` (string, required): Channel name (must start with `view:`)
- `data` (object, required): Message payload (must be JSON-serializable)
- `options` (object, optional):
  - `omitSelf` (boolean): Skip echoing to this client (default: `false`)

**Returns:** Promise<void>

**Example:**
```javascript
jPulse.appCluster.broadcast.publish(
    'view:notifications:alert',
    {
        message: 'Server maintenance in 10 minutes',
        level: 'warning',
        timestamp: Date.now()
    }
);
```

**Use Cases:**
- Global notifications
- System alerts
- Client-initiated broadcasts (no server logic needed)

**Note:** For production applications with validation and persistence, use server-side broadcasting (Pattern B) instead.

---

### jPulse.appCluster.fetch()

Enhanced `fetch()` wrapper that automatically includes client UUID for `omitSelf` filtering.

**Syntax:**
```javascript
jPulse.appCluster.fetch(url, options)
```

**Parameters:**
- `url` (string, required): API endpoint URL
- `options` (object, optional):
  - `method` (string): HTTP method (default: 'GET')
  - `body` (object): Request body (automatically stringified with UUID)
  - `headers` (object): Additional headers
  - All standard fetch options supported

**Returns:** Promise<Response>

**Example:**
```javascript
const response = await jPulse.appCluster.fetch('/api/1/myController', {
    method: 'POST',
    body: {
        title: 'New task',
        description: 'Task details'
    }
    // UUID automatically added to body
});

const result = await response.json();
```

**Why use this?**
- Automatically injects client UUID for `omitSelf` filtering
- Server receives `req.body.uuid` to identify sender
- Broadcasts can skip the originating client
- Follows "don't make me think" principle

---

### jPulse.appCluster.isClusterMode()

Check if Redis clustering is available.

**Syntax:**
```javascript
jPulse.appCluster.isClusterMode()
```

**Returns:** boolean - `true` if Redis available, `false` otherwise

**Example:**
```javascript
if (jPulse.appCluster.isClusterMode()) {
    console.log('Running in cluster mode - broadcasts will reach all servers');
} else {
    console.warn('Redis not available - local-only mode');
    jPulse.UI.toast.show(
        'Running in local mode - updates visible only in this tab',
        'warning'
    );
}
```

---

### jPulse.appCluster.getUuid()

Get the client's unique identifier.

**Syntax:**
```javascript
jPulse.appCluster.getUuid()
```

**Returns:** string - Client UUID (persists across page reloads)

**Example:**
```javascript
const myUuid = jPulse.appCluster.getUuid();
console.log('My client ID:', myUuid);
```

**Note:** Usually not needed directly - `jPulse.appCluster.fetch()` handles this automatically.

---

## Server-Side API Reference

### RedisManager.publishBroadcast()

Publish broadcast message to all server instances.

**Syntax:**
```javascript
await RedisManager.publishBroadcast(channel, data)
```

**Parameters:**
- `channel` (string, required): Channel name (`model:*`, `view:*`, or `controller:*`)
- `data` (object, required): Message payload (must be JSON-serializable)

**Returns:** Promise<boolean> - `true` if published, `false` if Redis unavailable

**Example:**
```javascript
// In a controller
await global.RedisManager.publishBroadcast(
    'view:myApp:item:created',
    {
        action: 'created',
        item: newItem,
        user: req.session.user,
        timestamp: new Date().toISOString()
    }
);
```

**Channel Naming Convention:**
```
<layer>:<component>:<domain>:<action>

Examples:
  view:myApp:task:created
  view:shopping:cart:updated
  controller:myApp:cache:refresh
  model:myApp:data:changed
```

---

### RedisManager.registerBroadcastCallback()

Register callback for server-to-server broadcasts (advanced use).

**Syntax:**
```javascript
RedisManager.registerBroadcastCallback(channel, callback, options)
```

**Parameters:**
- `channel` (string, required): Channel pattern (supports wildcards: `controller:myApp:*`)
- `callback` (function, required): `(channel, data, sourceInstanceId) => void`
- `options` (object, optional):
  - `omitSelf` (boolean): If `true`, callback won't be invoked for messages from this instance
    - **Default:** `false` for `view:*`, `true` for `controller:*` and `model:*`
    - **Use case:** Prevent processing own broadcasts (e.g., health metrics, cache updates)
    - **How it works:** Compares `sourceInstanceId` with this instance before invoking callback

**Returns:** void

**Example:**
```javascript
// Register for server-side events
global.RedisManager.registerBroadcastCallback(
    'controller:myApp:cache:*',
    (channel, data, sourceInstanceId) => {
        console.log(`Cache event from ${sourceInstanceId}:`, channel);
        if (channel === 'controller:myApp:cache:refresh') {
            refreshLocalCache();
        }
    }
);
```

**Example with omitSelf:**
```javascript
// Health metrics - don't process our own broadcasts
global.RedisManager.registerBroadcastCallback(
    'controller:health:metrics:*',
    (channel, data, sourceInstanceId) => {
        // Only processes health data from OTHER instances
        storeInstanceHealthData(data);
    },
    { omitSelf: true }  // Skip messages from this instance
);
```

**Use Cases:**
- Server-to-server communication
- Cache invalidation across instances
- Configuration updates
- Health monitoring (with `omitSelf: true` to avoid duplicate local data)

---

## Channel Naming Conventions

### Required Format

All channels must follow this pattern:

```
<layer>:<component>:<domain>:<action>[:<additional>]*
```

**Layers:**
- `model:` - Data layer events (server-to-server)
- `view:` - Client-facing events (server-to-clients)
- `controller:` - Controller events (server-to-server)

**Examples:**

```javascript
// ✅ Good examples
'view:myApp:task:created'
'view:shopping:cart:updated'
'view:dashboard:data:refreshed'
'controller:myApp:cache:refresh'
'controller:health:metrics:updated'
'model:myApp:user:created'

// ❌ Bad examples
'tasks'                          // No layer
'myApp:something'                // Wrong format
'view-tasks-created'             // Wrong separator
'customLayer:myApp:event'        // Invalid layer
```

### Why Enforce This?

1. **Security**: Clients can only subscribe to `view:*` channels
2. **Architecture**: Clear separation of concerns
3. **Debugging**: Easy to trace message flow
4. **Conventions**: Consistent patterns across all sites

### Wildcards

Server-side code can use wildcards:

```javascript
// Subscribe to all task events
RedisManager.registerBroadcastCallback('view:myApp:task:*', callback);

// Subscribe to all myApp events
RedisManager.registerBroadcastCallback('view:myApp:*', callback);

// Subscribe to all controller events
RedisManager.registerBroadcastCallback('controller:*', callback);
```

Client-side wildcards are not currently supported (may be added in future).

---

## Common Patterns

### Pattern 1: Collaborative Editing

**Scenario:** Multiple users editing the same document across different servers.

```javascript
// ============================================
// CLIENT SIDE
// ============================================

// Subscribe to document changes
jPulse.appCluster.broadcast.subscribe(
    'view:editor:document:changed',
    (data) => {
        if (data.action === 'textInserted') {
            insertTextAt(data.position, data.text);
        } else if (data.action === 'textDeleted') {
            deleteTextAt(data.position, data.length);
        }

        // Show who made the change
        showUserCursor(data.user.username, data.position);
    },
    { omitSelf: true }
);

// User types in editor
editor.on('change', async (change) => {
    // Save to server
    await jPulse.appCluster.fetch('/api/1/document/update', {
        method: 'POST',
        body: {
            documentId: currentDocId,
            change: change
        }
    });
});

// ============================================
// SERVER SIDE
// ============================================

class DocumentController {
    static async apiUpdate(req, res) {
        const { documentId, change } = req.body;

        // Apply change to database
        await DocumentModel.applyChange(documentId, change);

        res.json({ success: true });

        // Broadcast to all other users
        await RedisManager.publishBroadcast(
            'view:editor:document:changed',
            {
                documentId,
                action: change.type,
                position: change.position,
                text: change.text,
                length: change.length,
                user: {
                    username: req.session.user.username,
                    userId: req.session.user._id
                }
            }
        );
    }
}
```

---

### Pattern 2: Global System Notifications

**Scenario:** Admin broadcasts maintenance notification to all users on all servers.

```javascript
// ============================================
// CLIENT SIDE (All Users)
// ============================================

jPulse.appCluster.broadcast.subscribe(
    'view:system:notification:global',
    (data) => {
        // Show notification based on level
        jPulse.UI.toast.show(
            data.message,
            data.level  // 'info', 'warning', 'error'
        );

        // If critical, show modal
        if (data.critical) {
            jPulse.UI.modal.show({
                title: 'Important Notice',
                message: data.message,
                buttons: ['OK']
            });
        }
    }
);

// ============================================
// ADMIN PANEL (Admin Only)
// ============================================

async function sendGlobalNotification() {
    const message = document.getElementById('notificationMessage').value;
    const level = document.getElementById('notificationLevel').value;

    // Send via API (with validation & logging)
    await jPulse.appCluster.fetch('/api/1/admin/broadcast-notification', {
        method: 'POST',
        body: {
            message,
            level,
            critical: level === 'error'
        }
    });
}

// ============================================
// SERVER SIDE
// ============================================

class AdminController {
    static async apiBroadcastNotification(req, res) {
        // Verify admin role
        if (!req.session?.user?.roles?.includes('admin')) {
            return CommonUtils.sendError(req, res, 403,
                'Admin access required', 'UNAUTHORIZED');
        }

        const { message, level, critical } = req.body;

        // Log notification
        await NotificationModel.create({
            message,
            level,
            adminUser: req.session.user.username,
            timestamp: new Date()
        });

        // Broadcast to ALL users on ALL servers
        await RedisManager.publishBroadcast(
            'view:system:notification:global',
            {
                message,
                level,
                critical,
                timestamp: new Date().toISOString()
            }
        );

        res.json({ success: true, message: 'Notification sent' });
    }
}
```

---

### Pattern 3: Real-Time Dashboard

**Scenario:** Admin dashboard showing live data updates from all users across all servers.

```javascript
// ============================================
// CLIENT SIDE (Admin Dashboard)
// ============================================

const DashboardApp = {
    data() {
        return {
            activeUsers: 0,
            recentActions: [],
            stats: {}
        };
    },

    mounted() {
        // Subscribe to activity updates
        jPulse.appCluster.broadcast.subscribe(
            'view:dashboard:activity:update',
            (data) => {
                // Update stats
                this.activeUsers = data.activeUsers;
                this.stats = data.stats;

                // Add to recent actions
                if (data.action) {
                    this.recentActions.unshift({
                        ...data.action,
                        timestamp: Date.now()
                    });

                    // Keep only last 50
                    this.recentActions = this.recentActions.slice(0, 50);
                }
            }
        );

        // Load initial data
        this.loadInitialData();
    },

    methods: {
        async loadInitialData() {
            const response = await jPulse.api.get('/api/1/dashboard/stats');
            if (response.success) {
                this.activeUsers = response.data.activeUsers;
                this.stats = response.data.stats;
            }
        }
    }
};

// ============================================
// SERVER SIDE
// ============================================

// In any controller that performs user actions
class UserController {
    static async apiPerformAction(req, res) {
        // Perform action
        const result = await SomeModel.doSomething(req.body);

        res.json({ success: true, result });

        // Broadcast activity to dashboard
        await RedisManager.publishBroadcast(
            'view:dashboard:activity:update',
            {
                action: {
                    type: 'user_action',
                    user: req.session.user.username,
                    details: result
                },
                activeUsers: await getActiveUserCount(),
                stats: await getDashboardStats()
            }
        );
    }
}

// Periodic stats broadcaster (runs on one instance)
setInterval(async () => {
    await RedisManager.publishBroadcast(
        'view:dashboard:activity:update',
        {
            activeUsers: await getActiveUserCount(),
            stats: await getDashboardStats()
        }
    );
}, 30000); // Every 30 seconds
```

---

### Pattern 4: Shopping Cart Synchronization

**Scenario:** User adds item to cart on one device, sees it on another device/server.

```javascript
// ============================================
// CLIENT SIDE
// ============================================

// Subscribe to cart updates
jPulse.appCluster.broadcast.subscribe(
    'view:shopping:cart:updated',
    (data) => {
        // Update cart UI
        updateCartBadge(data.cart.itemCount);
        updateCartItems(data.cart.items);

        // Show notification if cart changed on another device
        jPulse.UI.toast.show(
            `Cart updated: ${data.action} ${data.item.name}`,
            'info'
        );
    },
    { omitSelf: true }
);

// Add to cart
async function addToCart(productId, quantity) {
    const response = await jPulse.appCluster.fetch('/api/1/cart/add', {
        method: 'POST',
        body: {
            productId,
            quantity
        }
    });

    if (response.success) {
        // Optimistic update
        updateCartBadge(response.cart.itemCount);
    }
}

// ============================================
// SERVER SIDE
// ============================================

class CartController {
    static async apiAdd(req, res) {
        const { productId, quantity } = req.body;
        const userId = req.session.user._id;

        // Add to cart in database
        const cart = await CartModel.addItem(userId, productId, quantity);
        const item = await ProductModel.findById(productId);

        res.json({ success: true, cart });

        // Broadcast to user's other devices/sessions
        await RedisManager.publishBroadcast(
            'view:shopping:cart:updated',
            {
                userId,  // Frontend filters by user
                action: 'added',
                item: {
                    id: item._id,
                    name: item.name,
                    quantity
                },
                cart: {
                    itemCount: cart.items.length,
                    items: cart.items
                }
            }
        );
    }
}
```

---

## Combining App Cluster + WebSocket

For complex applications, you'll often use both technologies together. Each handles what it does best.

### Example: Multi-Server Chat Application

```javascript
// ============================================
// CHAT MESSAGES: Use WebSocket
// ============================================
// Why? High-frequency bi-directional communication

const chatWs = jPulse.ws.connect('/api/1/ws/chat')
    .onMessage((data) => {
        if (data.type === 'message') {
            displayChatMessage(data);
        }
    });

function sendMessage(text) {
    chatWs.send({
        type: 'message',
        text: text,
        roomId: currentRoomId
    });
}

// ============================================
// USER STATUS: Use App Cluster
// ============================================
// Why? Less frequent, needs to persist across servers

jPulse.appCluster.broadcast.subscribe(
    'view:chat:user:status',
    (data) => {
        updateUserStatus(data.userId, data.status);
    },
    { omitSelf: true }
);

async function setStatus(status) {
    // Update via REST API
    await jPulse.appCluster.fetch('/api/1/user/status', {
        method: 'PUT',
        body: { status }
    });
    // Server broadcasts status change to all instances
}

// ============================================
// ROOM UPDATES: Use App Cluster
// ============================================
// Why? Less frequent, needs database persistence

jPulse.appCluster.broadcast.subscribe(
    'view:chat:room:updated',
    (data) => {
        if (data.action === 'user_joined') {
            addUserToRoomList(data.user);
        } else if (data.action === 'user_left') {
            removeUserFromRoomList(data.userId);
        }
    }
);
```

### When to Use Each

In this chat example:

| Feature | Technology | Reason |
|---------|-----------|--------|
| **Chat Messages** | WebSocket | High-frequency, bi-directional, ephemeral |
| **User Status** | App Cluster | REST API updates status, broadcast notifies |
| **Room Join/Leave** | App Cluster | REST API manages rooms, broadcast notifies |
| **Typing Indicators** | WebSocket | High-frequency, ephemeral, no persistence |
| **User Profiles** | App Cluster | REST API updates profile, broadcast notifies |

**Key Insight:** Use App Cluster when changes happen via REST API, use WebSocket for real-time interactions.

---

## Troubleshooting

### Redis Not Available

**Symptom:** Warning toast "Redis not available - running in local-only mode"

**Cause:** Redis server not running or not configured

**Solution:**
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start Redis
redis-server

# Check app.conf configuration
{
    redis: {
        enabled: true,
        mode: 'single',  // or 'cluster'
        single: {
            host: 'localhost',
            port: 6379
        }
    }
}
```

**Fallback Behavior:**
- Single-server mode still works
- Broadcasts only reach clients on same server
- No error thrown, graceful degradation

---

### Messages Not Syncing Across Servers

**Symptom:** Updates appear on same server but not on other servers

**Debug Steps:**

1. **Check Redis connectivity:**
```javascript
// In browser console
console.log('Cluster mode:', jPulse.appCluster.isClusterMode());
// Should be: true
```

2. **Check server logs:**
```bash
tail -f logs/app.log | grep "broadcast"
# Look for: "Published to Redis channel: ..."
```

3. **Verify channel names:**
```javascript
// Client can only subscribe to view: channels
// ✅ Good
jPulse.appCluster.broadcast.subscribe('view:myApp:event', ...);

// ❌ Bad (will throw error)
jPulse.appCluster.broadcast.subscribe('controller:myApp:event', ...);
```

4. **Check omitSelf configuration:**
```javascript
// If using omitSelf, ensure UUID is being sent
const response = await jPulse.appCluster.fetch('/api/1/endpoint', {
    method: 'POST',
    body: { data }
});
// UUID automatically included
```

---

### Performance Concerns

**Symptom:** High Redis bandwidth or slow broadcasts

**Solutions:**

1. **Throttle high-frequency updates:**
```javascript
let lastBroadcast = 0;
const MIN_INTERVAL = 1000; // 1 second

async function updateWithThrottle(data) {
    const now = Date.now();
    if (now - lastBroadcast < MIN_INTERVAL) {
        return; // Skip this update
    }

    lastBroadcast = now;
    await RedisManager.publishBroadcast('view:myApp:update', data);
}
```

2. **Use delta updates instead of full state:**
```javascript
// ❌ Bad: Broadcast entire list
await RedisManager.publishBroadcast('view:myApp:list', {
    items: allItems  // Could be huge
});

// ✅ Good: Broadcast only the change
await RedisManager.publishBroadcast('view:myApp:item:created', {
    item: newItem  // Just one item
});
```

3. **Batch updates:**
```javascript
// Collect changes for 500ms, then broadcast once
let pendingChanges = [];
let broadcastTimer = null;

function scheduleChange(change) {
    pendingChanges.push(change);

    if (!broadcastTimer) {
        broadcastTimer = setTimeout(async () => {
            await RedisManager.publishBroadcast('view:myApp:changes', {
                changes: pendingChanges
            });
            pendingChanges = [];
            broadcastTimer = null;
        }, 500);
    }
}
```

---

### UUID Not Working (omitSelf fails)

**Symptom:** Sender receives their own broadcasts despite `omitSelf: true`

**Cause:** Not using `jPulse.appCluster.fetch()` for API calls

**Solution:**
```javascript
// ❌ Bad: Regular fetch doesn't include UUID
const response = await fetch('/api/1/myController', {
    method: 'POST',
    body: JSON.stringify({ data })
});

// ✅ Good: Use appCluster.fetch
const response = await jPulse.appCluster.fetch('/api/1/myController', {
    method: 'POST',
    body: { data }  // UUID automatically added
});
```

---

## Migration Guide

### Adding Clustering to Existing Application

If you have an existing application and want to add multi-server support:

**Step 1: Install and configure Redis**

```bash
# Install Redis
brew install redis  # macOS
# or
apt-get install redis-server  # Ubuntu

# Start Redis
redis-server

# Configure in app.conf
{
    redis: {
        enabled: true,
        mode: 'single',
        single: {
            host: 'localhost',
            port: 6379
        }
    }
}
```

**Step 2: Update client code to use jPulse.appCluster.fetch()**

```javascript
// Before (standard fetch)
const response = await fetch('/api/1/myController', {
    method: 'POST',
    body: JSON.stringify({ title: 'New item' })
});

// After (cluster-aware fetch)
const response = await jPulse.appCluster.fetch('/api/1/myController', {
    method: 'POST',
    body: { title: 'New item' }
});
```

**Step 3: Add broadcast subscriptions**

```javascript
// Subscribe to updates
jPulse.appCluster.broadcast.subscribe(
    'view:myApp:list:changed',
    (data) => {
        // Update UI when data changes on any server
        updateUI(data);
    },
    { omitSelf: true }
);
```

**Step 4: Add server-side broadcasts**

```javascript
class MyController {
    static async apiCreate(req, res) {
        // Existing code: validate and save
        const item = await MyModel.create(data);
        res.json({ success: true, item });

        // NEW: Broadcast to all servers
        if (global.RedisManager?.isRedisAvailable()) {
            await global.RedisManager.publishBroadcast(
                'view:myApp:list:changed',
                {
                    action: 'created',
                    item,
                    timestamp: new Date().toISOString()
                }
            );
        }
    }
}
```

**Step 5: Test with multiple servers**

```bash
# Terminal 1: Start first instance
PORT=8080 npm start

# Terminal 2: Start second instance
PORT=8081 npm start

# Terminal 3: Start Redis
redis-server

# Open browsers to both ports and test cross-server updates
```

---

## Examples

### Live Demos

Visit these working examples to see Application Cluster in action:

#### 1. **Global Notifications** (`/hello-app-cluster/notifications.shtml`)
- **Pattern:** Client-Side Broadcasting (Pattern A)
- **Demonstrates:**
  - Direct client-to-Redis publishing
  - No server-side logic or persistence
  - Global notifications across all servers
  - omitSelf filtering
- **Use Case:** System announcements, alerts

#### 2. **Collaborative To-Do** (`/hello-app-cluster/collaborative-todo.shtml`)
- **Pattern:** Server-Side Broadcasting (Pattern B)
- **Demonstrates:**
  - Full MVC with database persistence
  - REST API + broadcast notifications
  - Multi-user collaboration
  - Optimistic UI updates
  - jPulse.appCluster.fetch() automatic UUID injection
- **Use Case:** Collaborative editing, task management

#### 3. **Code Examples** (`/hello-app-cluster/code-examples.shtml`)
- Copy-paste ready code snippets
- Client-side and server-side examples
- Channel naming conventions
- Best practices

#### 4. **Architecture** (`/hello-app-cluster/architecture.shtml`)
- Visual diagrams
- Component descriptions
- Message flow sequences
- Design patterns

### Source Code

All demo source code is available in the framework:

```
site/webapp/
├── controller/
│   └── helloClusterTodo.js      # Server-side controller
├── model/
│   └── helloTodo.js              # MongoDB model
└── view/
    └── hello-app-cluster/
        ├── notifications.shtml    # Pattern A demo
        ├── collaborative-todo.shtml  # Pattern B demo
        ├── code-examples.shtml    # Copy-paste snippets
        └── architecture.shtml     # Architecture docs
```

---

## API Reference Summary

### Client-Side

```javascript
// Subscribe to broadcasts
jPulse.appCluster.broadcast.subscribe(channel, callback, options)

// Publish broadcasts
jPulse.appCluster.broadcast.publish(channel, data, options)

// API calls with automatic UUID
jPulse.appCluster.fetch(url, options)

// Check cluster mode
jPulse.appCluster.isClusterMode()

// Get client UUID
jPulse.appCluster.getUuid()
```

### Server-Side

```javascript
// Publish broadcasts
RedisManager.publishBroadcast(channel, data)

// Register callbacks (server-to-server)
RedisManager.registerBroadcastCallback(channel, callback, options)

// Check Redis availability
RedisManager.isRedisAvailable()
```

---

## See Also

- **[WebSocket Real-Time Communication](websockets.md)** - Persistent bi-directional patterns
- **[MPA vs. SPA Architecture](mpa-vs-spa.md)** - Choosing your architecture
- **[Front-End Development Guide](front-end-development.md)** - Client-side utilities and APIs
- **[REST API Reference](api-reference.md)** - Backend API patterns
- **[Getting Started](getting-started.md)** - Quick start tutorial

---

## Next Steps

1. **Try the demos:** Visit `/hello-app-cluster/` to see it in action
2. **Read the code:** Check out `site/webapp/controller/helloClusterTodo.js`
3. **Start small:** Add one broadcast to your existing app
4. **Scale up:** Deploy multiple instances and watch them sync!

**Questions?** Check the troubleshooting section or visit the live demos for working examples.
