# W-076: Redis Caching and 1.0 Release Prep

## Context
- **Objective**: Deploy jPulse Framework v1.0 to jpulse.net in production
- **Timeline**: Days, not weeks
- **Requirements**: Support PM2 clustering (multiple instances), no load balancing needed initially

## Multi-Instance Metrics Design Summary

### Current Challenge
- Health/metrics API returns data from single PM2 instance (whichever handles the request)
- In load-balanced environments, incomplete picture of cluster health
- Need aggregated view across all app server instances

### Proposed Redis-Based Solution
**API Response Structure** (`/api/1/metrics`):
```javascript
{
    success: true,
    data: {
        // Framework/API level only
        status: 'ok',
        timestamp: '2025-10-10T21:43:00.000Z',

        // Cluster-wide aggregated statistics
        statistics: {
            totalServers: 1,
            totalInstances: 4,
            totalProcesses: 4,
            runningProcesses: 3,
            stoppedProcesses: 0,
            erroredProcesses: 1,
            // WebSocket cluster-wide statistics
            totalWebSocketConnections: 25,
            totalWebSocketMessages: 5000,
            totalWebSocketNamespaces: 3,
            webSocketNamespaces: [
                {
                    path: '/ws/chat',
                    totalConnections: 15,
                    totalMessages: 2500,
                    instanceCount: 3,
                    serverCount: 1,
                    status: 'green',
                    lastActivity: '2025-10-10T21:43:00.000Z'
                }
            ],
            lastUpdated: '2025-10-10T21:43:00.000Z'
        },

        // Per-server details (hardware/OS + MongoDB server)
        servers: [
            {
                serverName: 'web01.example.com',
                serverId: 1, // extracted from hostname

                // Server-level: hardware/OS only
                platform: 'linux',
                arch: 'x64',
                nodeVersion: 'v18.17.0',
                cpus: 4,
                loadAverage: [1.2, 1.1, 0.9],
                freeMemory: 2048,
                totalMemory: 8192,

                // MongoDB server status (separate from app database config)
                mongodb: {
                    status: 'running',
                    version: '6.0.8',
                    connections: { current: 12, available: 838 },
                    uptime: 86400,
                    host: 'mongodb.example.com:27017'
                },

                instances: [
                    {
                        pid: 12345,
                        pm2Available: true,
                        pm2ProcessName: 'jpulse-web-0',
                        status: 'online',

                        // Instance-specific application data
                        version: '0.9.6',
                        release: '2025-10-10',
                        environment: 'production',
                        database: { status: 'connected', name: 'jp-prod' },
                        deployment: {
                            mode: 'production',
                            config: { port: 8080, db: 'jp-prod' }
                        },

                        uptime: 12345,
                        uptimeFormatted: '3h 25m 45s',
                        memory: { used: 128, total: 256 },
                        cpu: 15.2,
                        restarts: 2,

                        websockets: {
                            uptime: 12345,
                            localConnections: 8,
                            localMessages: 1200,
                            namespaces: [/* instance-specific WS data */]
                        },
                        processInfo: { ppid: 1234, memoryUsage: {...} }
                    },
                    {
                        pid: 12346,
                        // Different instance, different deployment on same server
                        version: '0.9.5',
                        environment: 'dev',
                        database: { status: 'connected', name: 'jp-dev' },
                        deployment: {
                            mode: 'dev',
                            config: { port: 8081, db: 'jp-dev' }
                        }
                        // ... more instance data
                    }
                    // ... more PM2 instances on this server
                ]
            }
            // ... more servers in load-balanced setup
        ]
    }
}
```

**Implementation Strategy**:
1. Background metrics collector stores instance data in Redis (TTL: 60s)
2. Health controller aggregates all Redis data for cluster view
3. Graceful fallback to single-instance when Redis unavailable
4. UI shows cluster overview + expandable instance details

**Benefits**:
- Complete cluster visibility from any load-balanced request
- Fault-tolerant with Redis unavailable fallback
- Backward compatible with existing single-instance deployments
- Foundation for production monitoring and alerting

---

## Release Sequence Strategy

### Pre-1.0 Releases (0.9.x series)
Build production readiness incrementally, saving Redis for the 1.0 milestone:

**W-078, v0.9.6: Health and Metrics Endpoints** ⭐⭐⭐⭐
- **APIs**: `/api/1/health`, `/api/1/metrics`
- **Why First**: Quick win, essential for production monitoring
- **Impact**: Production deployment readiness without breaking changes

**W-079, v0.9.7 Cache Invalidation Strategy** ⭐⭐⭐
- **Feature**: Template/config updates without restart
- **Why Second**: Improves production operations before clustering
- **Impact**: Better deployment experience, works with current single-instance setup

**W-080, v0.9.8 Cursor-Based Pagination** ⭐⭐
- **Feature**: Future-proof API design
- **Why Third**: Last breaking change before 1.0, improves performance
- **Impact**: Better handling of large datasets, eliminates MongoDB skip limitations

### W-076, v1.0.0: Redis Caching Infrastructure ⭐⭐⭐⭐⭐
**The Big One**: True production clustering capability
**Why Last**:
- Makes 1.0 a meaningful milestone (production clustering)
- All other features work in single-instance mode first
- Redis becomes the "unlock" for true scalability
- Symbolic: v1.0 = production-ready with clustering

**Implementation Areas**:
- Replace in-memory docTypes cache with Redis
- Move session storage from MongoDB to Redis (faster)
- Template cache sharing across PM2 instances
- Config cache distribution
- Cluster-aware cache invalidation

## Deferred Post-1.0 (Nice-to-have)
- **W-037: Themes** - UX enhancement
- **W-0: Broadcast Messages** - Admin feature
- **W-0: Site-Specific Translations** - Customization feature

## Timeline
- **v0.9.6**: 1 day (Health/Metrics)
- **v0.9.7**: 1-2 days (Cache Invalidation)
- **v0.9.8**: 1-2 days (Cursor Pagination)
- **v1.0.0**: 2-3 days (Redis Infrastructure)

**Total**: 5-8 days to production-ready v1.0 with PM2 clustering

## Success Criteria for 1.0
- ✅ PM2 cluster mode works with shared Redis caching
- ✅ Sessions persist across instance restarts/scaling
- ✅ Health endpoints respond for monitoring
- ✅ Template updates propagate across all instances
- ✅ Cursor-based pagination handles large datasets efficiently
- ✅ Production-ready for jpulse.net deployment

This sequence builds confidence incrementally while making v1.0 a true production clustering milestone!

==========================================================================

## Redis Architecture for Scalable MPA/SPA Framework

## Overview

This document outlines the Redis integration strategy for jPulse, a horizontally scalable web application framework that supports both Multi-Page Applications (MPA) and Single-Page Applications (SPA with Vue.js). The architecture is designed to share real-time data across multiple application instances running on PM2 clusters and multiple servers behind a load balancer.

## System Architecture
```
                 Load Balancer
                       |
          +------------+-------------+
          |            |             |
    +----------+  +----------+  +----------+
    | Server 1 |  | Server 2 |  | Server 3 |
    | (PM2 x4) |  | (PM2 x4) |  | (PM2 x4) |
    +----------+  +----------+  +----------+
          |            |             |
          +------------+-------------+
                       |
                  Redis Cluster
                   (Sentinel)
                       |
              MongoDB Replica Set
```

**Key Components:**
- **Load Balancer**: Routes HTTP and WebSocket traffic across servers
- **Application Servers**: Multiple physical/virtual servers
- **PM2 Clusters**: 4-8 Node.js instances per server
- **Redis**: Central data hub for real-time state sharing
- **MongoDB**: Primary database with replica set for user data, logs, config

**Key Principle**: Redis acts as the central nervous system, enabling all instances to communicate and share state in real-time.

---

## 1. WebSocket Message Broadcasting Strategy

### Problem
When a WebSocket message arrives at one instance on a specific endpoint, all other instances need to be notified so they can push updates to their connected clients on that same endpoint. The platform supports multiple independent WebSocket endpoints that must remain isolated from each other.

### Multiple Endpoint Architecture

The platform provides 4 default WebSocket endpoints, and site admins can define custom endpoints:

**Default Endpoints:**
- `/ws/jpulse-ws-status` - System status updates
- `/ws/jpulse-ws-test` - Testing and development
- `/ws/hello-emoji` - Emoji/reaction features
- `/ws/hello-todo` - Todo list real-time sync

**Key Requirement:** Messages on one endpoint must not interfere with other endpoints. User A on `/ws/hello-emoji` should only receive emoji messages, not status updates from `/ws/jpulse-ws-status`.

### Solution: Redis Pub/Sub with Endpoint Namespacing

**Architecture Pattern:**
- Each instance maintains local WebSocket connections **grouped by endpoint**
- Each instance has TWO Redis clients: one publisher, one subscriber (Redis requirement)
- Messages are published to **endpoint-namespaced Redis channels**
- All instances subscribe to all endpoint patterns
- When a message arrives via Redis, each instance checks its local connections for that specific endpoint and forwards if needed

**Connection Tracking Structure:**
```
    localConnections = Map<endpoint, Map<userId, Set<WebSocket>>>

    Example:
    {
      'jpulse-ws-status': {
        'user123': Set[ws1, ws2],
        'user456': Set[ws3]
      },
      'hello-emoji': {
        'user123': Set[ws4],        // Same user, different endpoint
        'user789': Set[ws5]
      }
    }
```

**Channel Structure:**

All channels include endpoint namespace for isolation:
```
    ws:{endpoint}:broadcast              → Broadcast to all users on this endpoint
    ws:{endpoint}:user:{userId}          → Message to specific user on this endpoint
    ws:{endpoint}:room:{roomId}          → Message to room on this endpoint

    Examples:
    ws:jpulse-ws-status:broadcast
    ws:jpulse-ws-status:user:123
    ws:hello-emoji:broadcast
    ws:hello-emoji:user:123
    ws:hello-todo:room:project-5
```

**Message Flow:**

    User A (on Instance 1, /ws/hello-emoji) sends message
        ↓
    Instance 1 receives WebSocket message
        ↓
    Instance 1 publishes to Redis: ws:hello-emoji:user:B
        ↓
    Redis broadcasts to ALL subscriber instances
        ↓
    All instances receive message
        ↓
    Each instance checks: "Do I have User B on hello-emoji endpoint?"
        ↓
    Instance 3 has User B on hello-emoji → sends via local WebSocket
    Other instances ignore (no connection on that endpoint)

**Tracking Online Users:**

Redis Sets track which instances have each user connected to each endpoint:
```
    Key: ws:online:{endpoint}:{userId}
    Value: Set of instance IDs
    TTL: 5 minutes (refreshed on heartbeat)

    Examples:
    ws:online:jpulse-ws-status:user123 → ["server-1-12345"]
    ws:online:hello-emoji:user123 → ["server-1-12345", "server-2-67890"]
```

This allows:
- Checking if a user is online on a specific endpoint
- Finding which instances have a user connected
- Per-endpoint analytics
- Automatic cleanup when instance crashes (TTL expires)

**Pseudo-code:**
```
    class WebSocketManager {
      constructor() {
        publisher = new Redis()
        subscriber = new Redis()
        localConnections = Map<endpoint, Map<userId, Set<WebSocket>>>
        instanceId = hostname + "-" + pid

        // Subscribe to all endpoint patterns (handles dynamic endpoints)
        subscriber.psubscribe('ws:*:broadcast', 'ws:*:user:*', 'ws:*:room:*')
        subscriber.on('pmessage', handleRedisMessage)
      }

      registerConnection(endpoint, userId, ws) {
        if (!localConnections.has(endpoint)) {
          localConnections.set(endpoint, new Map())
        }
        localConnections.get(endpoint).get(userId).add(ws)

        redis.sadd('ws:online:' + endpoint + ':' + userId, instanceId)
        redis.expire('ws:online:' + endpoint + ':' + userId, 300)

        ws.on('close', () => unregisterConnection(endpoint, userId, ws))
      }

      sendToUser(endpoint, userId, data) {
        channel = 'ws:' + endpoint + ':user:' + userId
        message = { endpoint, userId, data, sourceInstance: instanceId }
        publisher.publish(channel, JSON.stringify(message))
      }

      broadcastToEndpoint(endpoint, data) {
        channel = 'ws:' + endpoint + ':broadcast'
        message = { endpoint, data, sourceInstance: instanceId }
        publisher.publish(channel, JSON.stringify(message))
      }

      handleRedisMessage(pattern, channel, messageStr) {
        message = JSON.parse(messageStr)
        endpoint = extractFromChannel(channel)  // Parse "ws:hello-emoji:user:123"

        if (!localConnections.has(endpoint)) return

        if (channel.includes(':broadcast')) {
          // Send to all local connections on this endpoint
          for each userId, connections in localConnections.get(endpoint) {
            for each ws in connections {
              ws.send(message.data)
            }
          }
        }
        else if (channel.includes(':user:')) {
          userId = extractFromChannel(channel)
          if (localConnections.get(endpoint).has(userId)) {
            for each ws in localConnections.get(endpoint).get(userId) {
              ws.send(message.data)
            }
          }
        }
      }
    }
```

**WebSocket Server Setup:**
```
    setupWebSocket() {
      endpoints = ['/ws/jpulse-ws-status', '/ws/jpulse-ws-test',
                   '/ws/hello-emoji', '/ws/hello-todo']

      for each endpoint {
        wss = new WebSocketServer({ noServer: true })

        wss.on('connection', (ws, request) => {
          session = getSession(request)
          endpointName = endpoint.replace('/ws/', '')

          if (session.userId) {
            wsManager.registerConnection(endpointName, session.userId, ws)

            ws.on('message', (data) => {
              msg = JSON.parse(data)
              switch (msg.type) {
                case 'broadcast': wsManager.broadcastToEndpoint(endpointName, msg.data)
                case 'user': wsManager.sendToUser(endpointName, msg.userId, msg.data)
              }
            })
          }
        })

        server.on('upgrade', (request, socket, head) => {
          if (request.url == endpoint) {
            wss.handleUpgrade(request, socket, head, (ws) => {
              wss.emit('connection', ws, request)
            })
          }
        })
      }
    }
```

**API Endpoints:**
```
    // Broadcast to specific endpoint
    POST /api/1/ws/:endpoint/broadcast
    Body: { message: "Hello" }

    // Send to user on specific endpoint
    POST /api/1/ws/:endpoint/user/:userId
    Body: { data: {...} }

    // Check online status on specific endpoint
    GET /api/1/ws/:endpoint/user/:userId/online
    → { online: true, instances: ["server-1-12345"] }

    // Get stats per endpoint
    GET /api/1/ws/stats
    → {
        "jpulse-ws-status": { users: 42, connections: 58 },
        "hello-emoji": { users: 156, connections: 203 }
      }
```

**Key Benefits:**
- **Isolation**: Messages on one endpoint don't interfere with others
- **Selective subscriptions**: Users only get messages from endpoints they're connected to
- **Scalability**: Each endpoint scales independently
- **Flexibility**: Admins can create custom endpoints without code changes
- **Analytics**: Track usage per endpoint
- **Security**: Different auth rules per endpoint

**Dynamic Endpoint Registration:**

When admins create custom endpoints:
```
    registerEndpoint(endpointName) {
      registeredEndpoints.add(endpointName)
      // Pattern subscriptions automatically handle new endpoints
      // No additional Redis subscriptions needed
    }
```

**Client Usage Example:**
```
    // User connects to multiple endpoints simultaneously
    const statusWs = new WebSocket('ws://localhost:3000/ws/jpulse-ws-status')
    const emojiWs = new WebSocket('ws://localhost:3000/ws/hello-emoji')

    statusWs.onmessage = (e) => updateStatus(JSON.parse(e.data))
    emojiWs.onmessage = (e) => showEmoji(JSON.parse(e.data))

    // Messages stay isolated per endpoint
    emojiWs.send(JSON.stringify({ type: 'user', userId: '456', data: { emoji: '🎉' } }))
```

**Performance:**
- Redis pub/sub handles 100,000+ msgs/sec
- Each WebSocket message = 1 Redis publish
- Sub-5ms message delivery across all instances
- Supports hundreds of custom endpoints
- Memory: ~100 bytes per user per endpoint in Redis

---

## 2. Session Management Strategy

### Default: Redis-Only (Recommended for 95% of Applications)

**Why Redis for Sessions:**
- Sessions MUST be shared across all instances (required for load balancing)
- Sub-millisecond performance (vs 10-50ms for MongoDB)
- Automatic TTL management (expired sessions disappear automatically)
- Built-in for this exact use case
- Simple to implement and maintain

**Storage Pattern:**
```
    Key: sess:{sessionId}
    Value: JSON serialized session data
    TTL: 86400 seconds (24 hours, configurable)
```

**Session-to-User Mapping (for logout-all functionality):**
```
    Key: user:sessions:{userId}
    Value: Set of session IDs
    TTL: 7 days
```

**Configuration:**

Environment variables needed:
- REDIS_HOST
- REDIS_PORT
- REDIS_PASSWORD (optional)
- SESSION_SECRET (required, 32+ characters)
- SESSION_TTL (default: 86400 seconds)

**Session Flow:**
```
              User logs in on Instance 1
                          ↓
           Express-session creates session
                          ↓
 Session middleware saves to Redis: sess:{sessionId}
                          ↓
         Cookie sent to user with sessionId
                          ↓
User makes request, load balancer sends to Instance 3
                          ↓
    Instance 3 reads sess:{sessionId} from Redis
                          ↓
           User authenticated seamlessly
                          ↓
      Any updates to session saved back to Redis
                          ↓
     All instances see updated session immediately
```

**Implementation Pattern:**
```
    sessionConfig = {
      store: new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 86400
      }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,  // Reset TTL on each request
      cookie: {
        secure: true,     // HTTPS only in production
        httpOnly: true,   // Prevent XSS
        maxAge: 86400000, // 24 hours
        sameSite: 'lax'
      }
    }

    app.use(session(sessionConfig))
```

**What Happens if Redis Fails:**
- Existing sessions: Lost (users need to re-login)
- New logins: Will fail until Redis is restored
- Application: Continues running, session operations error

**Mitigation:**
- Redis Sentinel (3+ sentinels) for automatic failover
- Redis persistence (AOF) enabled
- Monitor Redis health
- For most apps, users re-logging in is acceptable

### Enterprise Option: Hybrid Storage (Contact Us)

**For mission-critical applications** where session loss is unacceptable:
- Banking/financial services
- Healthcare (HIPAA)
- E-commerce with shopping carts
- Applications with compliance requirements

**Hybrid Pattern:**
```
    Redis (Primary)         MongoDB (Backup)
    -------------------     --------------------------
    All reads               Periodic writes
    All writes              (every 5 min or on change)
    Sub-ms latency          Disk persistence
                            Auto-recovery on startup
```

**Flow:**
```
              Session created/updated
                          ↓
         Write to Redis immediately (fast)
                          ↓
       Check: Last MongoDB write > 5 minutes ago?
                          ↓
      If yes: Write to MongoDB (async, background)
                          ↓
        Mark: Last synced timestamp in Redis

            On startup or Redis failure:
                          ↓
        Read all active sessions from MongoDB
                          ↓
                   Restore to Redis
                          ↓
                Resume normal operation
```

**Background Sync Job:**
- Runs every 1 minute
- Finds sessions modified since last sync
- Writes to MongoDB in batch
- Handles cleanup of expired sessions

**Decision Tree for Platform Owners:**
```
    Is session loss acceptable (users can re-login)?
      ├─ YES → Use Redis-only (default, included)
      └─ NO  → Contact us for hybrid storage setup
```

**Platform Positioning:**
- **Included**: Redis sessions with persistence
- **Enterprise Add-on**: Hybrid storage with guaranteed durability
- **Support**: "Contact us to discuss your requirements"

---

## 3. Metrics & Health Data Distribution

### Problem
Need centralized real-time visibility into all instances' health across all servers, but don't want a single point of failure or complex aggregation service.

### Strategy: Self-Reporting with TTL Auto-Cleanup

**Each Instance Reports Its Own Health:**
- Every 10 seconds, write health metrics to Redis
- Key: `health:instance:{instanceId}`
- TTL: 30 seconds
- **If instance crashes, it automatically disappears after 30 seconds**

**Health Data Structure:**
```
    {
      instanceId: "server-1-12345",
      serverId: "server-1",
      timestamp: 1234567890000,
      uptime: 3600,
      memory: {
        used: 67108864,
        total: 134217728,
        rss: 89128960
      },
      cpu: {
        user: 1234567,
        system: 234567,
        loadAvg: [0.5, 0.7, 0.8]
      },
      connections: {
        websocket: 42,
        http: 15
      }
    }
```

**Historical Metrics (Optional):**
```
    Key: health:history:{instanceId}
    Type: Sorted Set (scored by timestamp)
    Keep: Last hour only
    Cleanup: Remove entries older than 1 hour
```

**Aggregate Metrics Calculation:**

To get cluster-wide metrics, any instance (or monitoring tool) can:

1. Get all keys: health:instance:*
2. Read all health data
3. Aggregate in real-time:
    - Total instances
    - Total memory used
    - Total connections
    - Average CPU load
    - Per-server breakdown

**Custom Application Metrics:**
```
    // Track custom counters
    Key: metric:{metricName}:{instanceId}
    Value: Counter value
    TTL: 5 minutes

    - metric:api_requests:server-1-12345 = 1234
    - metric:errors:server-1-12345 = 5
    - metric:active_users:server-1-12345 = 42
```

**Request Tracking:**
```
    Key: requests:{instanceId}:{minute_timestamp}
    Type: Hash
    Fields: endpoint:statusCode → count
    TTL: 1 hour

    Example:
    requests:server-1-12345:1234567890000
      "/api/1/metrics/users:200" = 145
      "/api/1/metrics/users:404" = 3
      "/api/1/metrics/posts:200" = 67
```

**Error Tracking:**
```
    Key: errors:recent
    Type: List (LPUSH)
    Max: 100 (LTRIM to keep last 100)
    No TTL (manually managed)

    Each error:
    {
      message: "Error message",
      stack: "Stack trace",
      instanceId: "server-1-12345",
      timestamp: 1234567890000,
      context: { url, method, userId }
    }
```

**Pseudo-code:**
```
    class MetricsManager {
      constructor() {
        redis = new Redis()
        instanceId = hostname + "-" + pid

        startReporting()
      }

      startReporting() {
        setInterval(() => {
          metrics = {
            instanceId: instanceId,
            timestamp: Date.now(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            connections: {
              websocket: global.wsConnections,
              http: global.httpConnections
            }
          }

          // Write with 30 second TTL
          redis.setex(
            'health:instance:' + instanceId,
            30,
            JSON.stringify(metrics)
          )
        }, 10000)  // Every 10 seconds
      }

      async getAllInstancesHealth() {
        keys = await redis.keys('health:instance:*')
        instances = []

        for each key {
          data = await redis.get(key)
          instances.push(JSON.parse(data))
        }

        return instances
      }

      async getAggregateMetrics() {
        instances = await getAllInstancesHealth()

        return {
          totalInstances: instances.length,
          totalMemory: sum(instances.map(i => i.memory.used)),
          totalConnections: sum(instances.map(i => i.connections)),
          servers: groupBy(instances, 'serverId')
        }
      }

      incrementMetric(name, value = 1) {
        key = 'metric:' + name + ':' + instanceId
        redis.incrby(key, value)
        redis.expire(key, 300)  // 5 minutes
      }

      async getAggregateMetric(name) {
        keys = await redis.keys('metric:' + name + ':*')
        total = 0

        for each key {
          value = await redis.get(key)
          total += parseInt(value)
        }

        return total
      }
    }
```

**Dashboard API Endpoints:**

`GET /api/1/health`
→ Returns all instance health data

`GET /api/1/metrics`
→ Returns aggregate metrics across cluster

`GET /api/1/metrics/servers`
→ Returns health grouped by server

`GET /api/1/metrics/requests?minutes=5`
→ Returns request stats for last N minutes

`GET /api/1/metrics/errors/recent?count=10`
→ Returns recent errors

**Key Benefits:**
- No central aggregation service needed
- Automatic cleanup of dead instances
- Real-time cluster visibility
- Minimal Redis storage (only active instances)
- Easy to extend with custom metrics

---

## 4. Configuration Cache Strategy

### Problem
Configuration data stored in MongoDB is accessed frequently but changes rarely. Reading from MongoDB on every request adds latency and database load.

### Solution: Three-Level Cache

**Cache Levels:**
```
    1. Local Memory (in-process)  →  <1ms access
    2. Redis (shared)             →  <5ms access
    3. MongoDB (source of truth)  →  10-50ms access
```

**Read Flow:**

          Request for config 'feature:new_ui'
                          ↓
              Check local memory cache
                          ↓
             Found? → Return immediately
                          ↓
                Not found → Check Redis
                          ↓
         Found? → Store in local cache → Return
                          ↓
              Not found → Check MongoDB
                          ↓
Found? → Store in Redis → Store in local cache → Return
                          ↓
               Not found → Return null

**Write Flow:**

        Update config 'feature:new_ui' = true
                          ↓
         Write to MongoDB (source of truth)
                          ↓
            Write to Redis (shared cache)
                          ↓
                  Update local cache
                          ↓
      Publish 'cache:invalidate' message to Redis
                          ↓
          All other instances receive message
                          ↓
   All instances clear their local cache for this key
                          ↓
       Next read will pull fresh data from Redis

**Cache Invalidation (KISS Approach):**

Simple pub/sub message:
```
    Channel: cache:invalidate
    Message: {
      key: 'config:features:new_ui',
      timestamp: 1234567890000
    }
```

All instances subscribe to this channel. When they receive it, they delete the key from their local cache. Next read pulls fresh data from Redis.

**Key Patterns:**
```
    config:{collection}:{key}         → Configuration item
    config:{collection}:{key}:updated → Last update timestamp
```

**TTL Strategy:**
```
    Local memory: 5 minutes
    Redis: 10 minutes (or longer for stable config)
    MongoDB: Permanent
```

**Feature Flags:**
```
    Key: config:features:feature:{featureName}
    Value: { enabled: true/false, metadata }
    TTL: 60 seconds (short for quick rollout/rollback)
```

**Pseudo-code:**
```
    class ConfigCacheManager {
      constructor(mongoDb) {
        redis = new Redis()
        subscriber = new Redis()
        db = mongoDb
        localCache = new Map()

        subscriber.subscribe('cache:invalidate')
        subscriber.on('message', handleInvalidation)
      }

      async getConfig(key, collection = 'config') {
        cacheKey = 'config:' + collection + ':' + key

        // Level 1: Local memory
        if (localCache.has(cacheKey)) {
          cached = localCache.get(cacheKey)
          if (Date.now() < cached.expiry) {
            return cached.data
          }
          localCache.delete(cacheKey)
        }

        // Level 2: Redis
        redisData = await redis.get(cacheKey)
        if (redisData) {
          data = JSON.parse(redisData)
          localCache.set(cacheKey, {
            data: data,
            expiry: Date.now() + 300000  // 5 minutes
          })
          return data
        }

        // Level 3: MongoDB
        doc = await db.collection(collection).findOne({ key: key })
        if (doc) {
          data = doc.value

          // Cache in Redis
          await redis.setex(cacheKey, 600, JSON.stringify(data))  // 10 min

          // Cache locally
          localCache.set(cacheKey, {
            data: data,
            expiry: Date.now() + 300000
          })

          return data
        }

        return null
      }

      async setConfig(key, value, collection = 'config') {
        cacheKey = 'config:' + collection + ':' + key

        // Update MongoDB (source of truth)
        await db.collection(collection).updateOne(
          { key: key },
          { $set: { key: key, value: value, updatedAt: new Date() } },
          { upsert: true }
        )

        // Update Redis
        await redis.setex(cacheKey, 600, JSON.stringify(value))

        // Update local cache
        localCache.set(cacheKey, {
          data: value,
          expiry: Date.now() + 300000
        })

        // Invalidate on all other instances
        await redis.publish('cache:invalidate', JSON.stringify({
          key: cacheKey,
          timestamp: Date.now()
        }))
      }

      handleInvalidation(channel, message) {
        data = JSON.parse(message)
        localCache.delete(data.key)
      }

      async isFeatureEnabled(featureName) {
        feature = await getConfig('feature:' + featureName, 'features')
        return feature ? feature.enabled : false
      }
    }
```

**Cache Warmup (Optional):**

On application startup, pre-load frequently accessed configs:
```
    warmupKeys = [
      'app:name',
      'app:version',
      'api:rate_limit',
      'features:new_dashboard',
      'features:vue_spa'
    ]

    for each key {
      await configCache.getConfig(key)
    }
```

**Key Benefits:**
- Ultra-fast reads (most from local memory)
- Automatic invalidation across all instances
- Reduces MongoDB load by 90%+
- Simple to implement and understand
- Works for both config and feature flags

---

## 5. Main Application Integration

### Initialization Sequence

**Application Startup Flow:**

    1. Connect to MongoDB replica set
        ↓
    2. Initialize Redis clients
        ↓
    3. Create managers:
       - ConfigCacheManager
       - SessionManager
       - MetricsManager
       - WebSocketManager
        ↓
    4. Warm up config cache
        ↓
    5. Recover sessions (if using hybrid)
        ↓
    6. Setup Express middleware
        ↓
    7. Setup routes
        ↓
    8. Setup WebSocket server
        ↓
    9. Setup graceful shutdown handlers
        ↓
    10. Start HTTP server

**Pseudo-code:**
```
    class Application {
      async initialize() {
        // 1. MongoDB
        mongoClient = await MongoClient.connect(mongoUri)
        db = mongoClient.db()

        // 2. Redis-based managers
        configCache = new ConfigCacheManager(db)
        sessionManager = new SessionManager()
        metricsManager = new MetricsManager()
        wsManager = new WebSocketManager()

        // 3. Warmup
        await configCache.warmupCache(['app:*', 'features:*'])

        // 4. Express setup
        app.use(express.json())
        app.use(sessionManager.getMiddleware())
        app.use(trackingMiddleware)

        // 5. Routes
        setupRoutes()

        // 6. WebSocket
        setupWebSocket()

        // 7. Graceful shutdown
        setupShutdown()
      }

      setupRoutes() {
        // Health check
        app.get('/api/1/health', async (req, res) => {
          health = await metricsManager.getAllInstancesHealth()
          res.json({ status: 'healthy', instances: health })
        })

        // Authentication
        app.post('/api/1/auth/login', async (req, res) => {
          user = await authenticateUser(req.body)
          if (user) {
            req.session.userId = user.id
            await sessionManager.linkSessionToUser(req.sessionID, user.id)
            res.json({ success: true, user })
          } else {
            res.status(401).json({ error: 'Invalid credentials' })
          }
        })

        // Logout all devices
        app.post('/api/1/auth/logout-all', async (req, res) => {
          await sessionManager.invalidateUserSessions(req.session.userId)
          res.json({ success: true })
        })

        // Feature flags
        app.get('/api/1/features/:name', async (req, res) => {
          enabled = await configCache.isFeatureEnabled(req.params.name)
          res.json({ enabled })
        })

        // Broadcast message
        app.post('/api/1/broadcast', async (req, res) => {
          await wsManager.broadcast(req.body)
          res.json({ success: true })
        })

        // Send to user
        app.post('/api/1/message/:userId', async (req, res) => {
          await wsManager.sendToUser(req.params.userId, req.body)
          res.json({ success: true })
        })
      }

      setupWebSocket() {
        wss = new WebSocketServer({ noServer: true })

        wss.on('connection', (ws, request) => {
          sessionId = extractSessionId(request)
          session = await sessionManager.getSession(sessionId)

          if (session && session.userId) {
            wsManager.registerConnection(session.userId, ws)

            ws.on('message', async (data) => {
              message = JSON.parse(data)

              switch (message.type) {
                case 'broadcast':
                  await wsManager.broadcast(message.data)
                  break
                case 'user':
                  await wsManager.sendToUser(message.userId, message.data)
                  break
                case 'room':
                  await wsManager.sendToRoom(message.roomId, message.data)
                  break
              }
            })
          }
        })

        server.on('upgrade', (request, socket, head) => {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request)
          })
        })
      }

      setupShutdown() {
        shutdown = async () => {
          console.log('Graceful shutdown starting...')

          // Stop accepting connections
          server.close()

          // Close WebSockets
          wss.clients.forEach(client => client.close())

          // Cleanup managers
          await wsManager.shutdown()
          await metricsManager.shutdown()
          await configCache.shutdown()
          await sessionManager.shutdown()

          // Close MongoDB
          await mongoClient.close()

          console.log('Shutdown complete')
          process.exit(0)
        }

        process.on('SIGTERM', shutdown)
        process.on('SIGINT', shutdown)
      }

      async start() {
        await initialize()
        server = app.listen(port, () => {
          console.log('Server running on port', port)
          console.log('Instance ID:', wsManager.instanceId)
        })
      }
    }
```

**Middleware Integration:**
```
    // Connection tracking
    app.use((req, res, next) => {
      global.httpConnections++

      res.on('finish', () => {
        global.httpConnections--
        metricsManager.trackRequest(req.path, res.statusCode)
      })

      next()
    })

    // Error tracking
    app.use((err, req, res, next) => {
      metricsManager.trackError(err, {
        url: req.url,
        method: req.method,
        userId: req.session?.userId
      })

      res.status(500).json({ error: 'Internal server error' })
    })
```

**Environment Variables Required:**
```
    NODE_ENV=production
    PORT=3000
    HOSTNAME=server-1                    # Unique per server

    MONGODB_URI=mongodb://mongo1,mongo2,mongo3/myapp?replicaSet=rs0

    REDIS_HOST=redis.internal.com
    REDIS_PORT=6379
    REDIS_PASSWORD=secret                # Optional

    SESSION_SECRET=your-32-char-secret
    SESSION_TTL=86400                    # 24 hours
```

**PM2 Configuration:**
```
    module.exports = {
      apps: [{
        name: 'app',
        script: './app.js',
        instances: 'max',                # Use all CPU cores
        exec_mode: 'cluster',
        env_production: {
          NODE_ENV: 'production',
          PORT: 3000,
          HOSTNAME: 'prod-server-1'      # Change per server
        },
        max_memory_restart: '1G',
        kill_timeout: 5000,
        wait_ready: true,
        autorestart: true
      }]
    }
```

**Graceful Shutdown Behavior:**

    SIGTERM received
        ↓
    Stop accepting new connections
        ↓
    Close all WebSocket connections gracefully
        ↓
    WebSocketManager: Remove instance from ws:online:* sets
        ↓
    MetricsManager: Delete health:instance:* key
        ↓
    ConfigCacheManager: Final cache sync (if needed)
        ↓
    SessionManager: Close Redis connections
        ↓
    MongoDB: Close connection
        ↓
    Exit process

**Health Check Implementation:**
```
    app.get('/health', async (req, res) => {
      checks = {
        redis: await checkRedis(),
        mongodb: await checkMongoDB(),
        instance: {
          id: instanceId,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        }
      }

      allHealthy = checks.redis.ok && checks.mongodb.ok

      res.status(allHealthy ? 200 : 503).json(checks)
    })
```

---

## Summary: Redis Key Patterns

**WebSocket:**
- `ws:broadcast` - Pub/sub channel for global messages
- `ws:user:{userId}` - Pub/sub channel for user messages
- `ws:room:{roomId}` - Pub/sub channel for room messages
- `ws:online:{userId}` - Set of instance IDs (TTL: 5min)

**Sessions:**
- `sess:{sessionId}` - Session data (TTL: 24h)
- `user:sessions:{userId}` - Set of session IDs (TTL: 7d)

**Metrics:**
- `health:instance:{instanceId}` - Instance health (TTL: 30s)
- `health:history:{instanceId}` - Sorted set of history (TTL: 1h)
- `metric:{name}:{instanceId}` - Custom counters (TTL: 5min)
- `requests:{instanceId}:{minute}` - Request hash (TTL: 1h)
- `errors:recent` - List of recent errors (max 100)

**Configuration:**
- `config:{collection}:{key}` - Config value (TTL: 10min)
- `cache:invalidate` - Pub/sub channel for cache invalidation

**Caching:**
- All Redis cached data has TTL
- All health/metrics data auto-expires
- Dead instances automatically cleaned up
- No manual cleanup required

---

## Deployment Checklist

**Redis Setup:**
- [ ] Deploy Redis Cluster or Sentinel (3+ nodes)
- [ ] Enable AOF persistence: `appendonly yes`
- [ ] Set maxmemory: `maxmemory 2gb`
- [ ] Set eviction policy: `maxmemory-policy allkeys-lru`
- [ ] Enable authentication: `requirepass your-password`
- [ ] Restrict network access (firewall or bind)

**Application Setup:**
- [ ] Set all environment variables
- [ ] Generate strong SESSION_SECRET (32+ chars)
- [ ] Configure unique HOSTNAME per server
- [ ] Test Redis connectivity
- [ ] Test MongoDB replica set connectivity
- [ ] Configure PM2 for cluster mode
- [ ] Set up graceful shutdown handlers

**Load Balancer:**
- [ ] Configure WebSocket upgrade support
- [ ] Set up sticky sessions (optional, not needed with Redis)
- [ ] Enable health checks
- [ ] Configure SSL/TLS termination
- [ ] Set appropriate timeouts for long-lived WebSocket connections

**Monitoring:**
- [ ] Track Redis memory usage
- [ ] Monitor active session count
- [ ] Alert on instance failures
- [ ] Monitor WebSocket connection count
- [ ] Track request rates and errors
- [ ] Set up log aggregation

**Testing:**
- [ ] Test session sharing across instances
- [ ] Test WebSocket messages across instances
- [ ] Test graceful shutdown
- [ ] Test Redis failover
- [ ] Load test with multiple instances
- [ ] Test config cache invalidation

---

## Performance Characteristics

**Expected Latencies:**

    Operation                  Latency
    -----------------------------------
    Session read (Redis)       <1ms
    Session write (Redis)      <2ms
    Config read (local cache)  <0.1ms
    Config read (Redis)        <2ms
    Config read (MongoDB)      10-50ms
    WebSocket broadcast        <5ms total
    Health metrics write       <2ms
    Metrics aggregation        <50ms

**Scalability:**

    Configuration          Max Users    Instances
    ------------------------------------------------
    Single server          1,000        1 x 4 PM2
    Small cluster          10,000       3 x 4 PM2
    Medium cluster         100,000      10 x 8 PM2
    Large cluster          1,000,000    50+ x 8 PM2

**Redis Memory Estimates:**

    Data Type              Per Item    10k Items    100k Items
    ------------------------------------------------------------
    Session                ~1 KB       10 MB        100 MB
    Health metric          ~500 B      5 MB         50 MB
    Config cache           ~200 B      2 MB         20 MB
    WebSocket tracking     ~100 B      1 MB         10 MB

**Total Redis memory for 100k active users:**
- Sessions: 100 MB
- Metrics: 50 MB (for ~100 instances)
- Config: 20 MB
- WebSocket: 10 MB
- **Total: ~200 MB**

---

## Common Issues & Solutions

**Issue: Sessions not persisting across requests**
- Check SESSION_SECRET is set
- Verify Redis is running and accessible
- Check cookie settings (secure flag in dev)
- Enable debug logging

**Issue: WebSocket messages not reaching all users**
- Verify all instances connected to same Redis
- Check Redis pub/sub is working
- Ensure subscriber client is separate from publisher
- Check firewall rules between servers and Redis

**Issue: Config changes not propagating**
- Verify cache:invalidate pub/sub channel is working
- Check all instances are subscribers
- Reduce local cache TTL for testing
- Manually clear Redis cache if needed

**Issue: Instance appears in health but is actually dead**
- TTL too long - reduce to 30 seconds
- Health reporting stopped - check error logs
- Network partition - check connectivity

**Issue: High Redis memory usage**
- Set maxmemory limit
- Enable eviction policy
- Reduce session TTL
- Check for memory leaks in stored data

---

## Next Steps

1. Review this architecture with your team
2. Set up development environment with Docker Compose
3. Implement core managers (WebSocket, Session, Metrics, Config)
4. Test with multiple PM2 instances locally
5. Deploy to staging with 2-3 servers
6. Load test and monitor
7. Deploy to production
8. Create monitoring dashboards
9. Document operational procedures
10. Train team on troubleshooting

==========================================================================

## Final jPulse Framework v1.0 Redis Architecture Plan

### Overview
Production-ready Redis infrastructure for PM2 clustering and multi-server scalability, designed with graceful fallback and site owner extensibility.

### Core Architecture Decisions

**Redis Deployment Strategy**
- Single-server Redis cluster (6 instances, ports 7000-7005) for jpulse.net showcase
- App.conf flag for single vs cluster mode
- Graceful fallback to local-only operation when Redis unavailable

**API Design: jPulse.appCluster**
- Generic broadcasting system hiding Redis implementation details
- Prevents namespace collision with framework-reserved prefixes
- Consistent API for both framework and site owner usage

**Session Management**
- Primary: Redis-based sessions for cross-instance sharing
- Fallback: Express MemoryStore when Redis unavailable
- Breaking change acceptable for v1.0 (no MongoDB session compatibility)

**WebSocket Architecture**
- Endpoint migration: `/ws/namespace` → `/api/1/ws/namespace` for API consistency
- Cross-instance message broadcasting via Redis pub/sub
- Fallback: Local connections only when Redis unavailable
- Activate existing Redis infrastructure in WebSocketController

**Configuration Caching**
- KISS approach: Simple "refresh cache" broadcast messages
- Controller-level integration in ViewController for globalConfig
- Generic pattern: `jPulse.appCluster.broadcast.publish('view:config:refresh')`
- Site owners can register custom cache refresh handlers

**Health Metrics Clustering**
- Each instance reports metrics to Redis with TTL auto-cleanup
- Enhanced `/api/1/metrics` endpoint aggregates cluster-wide data
- Admin dashboard shows multi-instance view
- Fallback: Single-instance metrics when Redis unavailable

### Instance Identification
Format: `{hostname_numeric}:{pm2_id}` (e.g., `025:0`, `025:1`)
Fallback to truncated hostname if no numeric suffix found

### Graceful Fallback Strategy
- **Sessions**: Redis → Memory
- **WebSocket**: Cross-instance → Local-only
- **Config**: Broadcast refresh → Ignore notifications
- **Metrics**: Cluster aggregation → Single-instance
- **Development**: Works without Redis dependency

### Site Owner Integration

**Broadcasting API**
```
jPulse.appCluster.broadcast.subscribe('myApp:event:type', callback)
jPulse.appCluster.broadcast.publish('myApp:event:type', data)
```

**Example Implementation**
- `/hello-app-cluster/` demonstration with HelloAppClusterController
- Cache refresh pattern documentation
- Cross-instance notification examples

### Implementation Phases
1. **Redis Infrastructure & Sessions** (1-2 days): Connection management, session migration, fallback system
2. **Generic Broadcasting System** (1 day): jPulse.appCluster API, config refresh integration
3. **WebSocket Migration & Enhancement** (1 day): Endpoint migration, Redis activation, cross-instance messaging
4. **Health Metrics Clustering** (1 day): Redis aggregation, admin dashboard updates, cluster view

### Configuration Structure
All Redis settings in app.conf with logical hierarchy:
- `redis.mode`: 'single' | 'cluster'
- `redis.cluster.nodes`: Array of {host, port}
- `redis.single`: {host, port}
- `redis.fallback`: Graceful degradation settings

### Success Criteria for v1.0
- PM2 cluster mode with shared Redis state
- Cross-instance WebSocket message broadcasting
- Cluster-wide health metrics aggregation
- Site owner extensible broadcasting system
- Graceful operation without Redis dependency
- Production deployment ready for jpulse.net

This architecture provides showcase-ready clustering capabilities while maintaining development simplicity and production robustness through comprehensive fallback strategies.
