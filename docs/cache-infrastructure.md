# jPulse Docs / Cache Infrastructure v1.6.3

## Overview

The jPulse Framework provides a dual-cache system designed for optimal performance across different use cases:

- **File Cache**: Framework-managed caching of templates, i18n translations, and markdown documentation
- **Redis Cache**: Developer-controlled memory-based caching for application data, sessions, and rate limiting

Both cache systems work together to provide a high-performance foundation for your jPulse application.

### Key Features

- **Dual Cache Architecture**: Separate systems for framework assets vs application data
- **User-Scoped Caching**: Redis cache automatically isolates data per authenticated user
- **Rate Limiting**: Built-in rate limiting helper for API protection
- **Multi-Instance Support**: Redis cache synchronized across cluster instances
- **Graceful Degradation**: Application continues if Redis unavailable (cache operations return null)
- **Comprehensive Monitoring**: Real-time cache metrics in System Status page

---

## Quick Decision: Which Cache Should I Use?

```
┌──────────────────────────────────────────────────────────────┐
│              WHAT DO YOU NEED TO CACHE?                      │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
  FRAMEWORK ASSETS                     APPLICATION DATA
  (automatic, no code)                 (developer-controlled)
        │                                       │
        │                                       │
        ▼                                       ▼
┌──────────────────────┐              ┌──────────────────────┐
│  File Cache          │              │    Redis Cache       │
│  (Framework)         │              │  (Your Code)         │
│                      │              │                      │
│ • Templates (.shtml) │              │ • Session data       │
│ • i18n (.conf)       │              │ • User preferences   │
│ • Markdown docs      │              │ • Computed results   │
│ • Auto-refreshed     │              │ • Rate limit counts  │
│ • No code needed     │              │ • Temp data          │
│                      │              │                      │
│ Managed By:          │              │ Managed By:          │
│ Framework            │              │ Your application     │
└──────────────────────┘              └──────────────────────┘
```

**Both caches are independent!** File cache works without Redis. Redis cache requires Redis connection.

---

## File Cache

The file cache is a disk-based caching system managed automatically by the jPulse framework. It caches framework assets to improve page rendering performance.

### What's Cached

The framework automatically caches:

1. **View Templates** (`.shtml` files)
   - Handlebars templates compiled into functions
   - Cached after first render
   - Auto-refreshed on file changes (development mode)

2. **i18n Translations** (`.conf` files)
   - All language files from `webapp/translations/`
   - Parsed and cached at startup
   - Hierarchical merging (framework → site → plugin)

3. **Markdown Documentation** (`.md` files)
   - Documentation files from `docs/` and `webapp/static/assets/jpulse-docs/`
   - Converted to HTML and cached
   - Respects `.markdown` configuration

### Automatic Refresh (Development Mode)

In development mode (`app.conf` → `server.environment = 'development'`):

- File system watcher monitors cached files
- Automatic cache invalidation on file changes
- No manual refresh needed during development
- Hot reload of templates and i18n

### Manual Cache Refresh

For production environments or forced refresh, use the admin API:

#### Refresh All Caches
```javascript
// Client-side (requires admin role)
const result = await jPulse.api.post('/api/1/cache/refresh/all');
```

#### Refresh Specific Cache Types
```javascript
// Refresh only view templates
await jPulse.api.post('/api/1/cache/refresh/view');

// Refresh only i18n translations
await jPulse.api.post('/api/1/cache/refresh/i18n');

// Refresh only markdown documentation
await jPulse.api.post('/api/1/cache/refresh/markdown');
```

#### Get Cache Statistics
```javascript
const stats = await jPulse.api.get('/api/1/cache/stats');
// Returns: { cached files count, served count, etc. }
```

### File Cache API Reference

All file cache endpoints require authentication and admin role:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/1/cache/refresh/all` | POST | Refresh all cache types |
| `/api/1/cache/refresh/view` | POST | Refresh view templates only |
| `/api/1/cache/refresh/i18n` | POST | Refresh i18n translations only |
| `/api/1/cache/refresh/markdown` | POST | Refresh markdown docs only |
| `/api/1/cache/stats` | GET | Get cache statistics |

### File Cache Monitoring

View file cache statistics in the System Status page (Admin → System Status):

- **ViewController** section shows:
  - Cached files count
  - Served last 24h
  - View directories count

---

## Redis Cache

The Redis cache is a memory-based caching system for your application data. It provides user-scoped caching, rate limiting, and multi-instance synchronization.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client Browser                                             │
│                                                             │
│  jPulse.api.post('/api/1/app-cluster/cache/set', {...})     │
│         │                                                   │
│         │  HTTPS/JSON                                       │
│         ▼                                                   │
└─────────────────────────────────────────────────────────────┘
          │
          │
┌─────────▼───────────────────────────────────────────────────┐
│  jPulse Instance (your-app.js)                              │
│                                                             │
│  AppClusterController ──► RedisManager ──► Redis Server     │
│                                                             │
│  • User authentication check (req.session.user._id)         │
│  • Category:Key scoping                                     │
│  • TTL management                                           │
│  • JSON serialization                                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

1. **User-Scoped Isolation**: All cache operations automatically scoped to authenticated user
2. **Category:Key Pattern**: Organized cache keys with `category:key` structure
3. **TTL Support**: Automatic expiration with time-to-live
4. **JSON Serialization**: Automatic object/array serialization
5. **Rate Limiting**: Built-in helper for API throttling
6. **Pattern Deletion**: Bulk delete with wildcard patterns
7. **Multi-Instance Sync**: Shared cache across all server instances

---

## Redis Cache API - Client-Side

Use the client-side API for browser-based cache operations. All endpoints require user authentication and automatically scope to the current user.

### Set Cache Value

```javascript
// Set simple value with 1 hour TTL
const result = await jPulse.api.post('/api/1/app-cluster/cache/set', {
    category: 'user-preferences',
    key: 'theme',
    value: 'dark',
    ttl: 3600  // Optional, in seconds
});

// Set complex object
const result = await jPulse.api.post('/api/1/app-cluster/cache/set', {
    category: 'dashboard',
    key: 'widgets',
    value: JSON.stringify({
        layout: 'grid',
        widgets: ['weather', 'news', 'stocks']
    }),
    ttl: 300  // 5 minutes
});
```

**Response:**
```json
{
    "success": true,
    "message": "Cache value set successfully"
}
```

### Get Cache Value

```javascript
const result = await jPulse.api.post('/api/1/app-cluster/cache/get', {
    category: 'user-preferences',
    key: 'theme'
});

if (result.success && result.data.value) {
    const theme = result.data.value;
    console.log('Current theme:', theme);
} else {
    console.log('Cache miss - value not found or expired');
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "value": "dark"
    }
}
```

### Delete Cache Value

```javascript
const result = await jPulse.api.post('/api/1/app-cluster/cache/delete', {
    category: 'user-preferences',
    key: 'theme'
});
```

**Response:**
```json
{
    "success": true,
    "message": "Cache value deleted successfully"
}
```

---

## Redis Cache API - Server-Side

Use `RedisManager` methods in controllers and models for server-side cache operations.

### Basic Cache Operations

```javascript
// In your controller or model
import RedisManager from '../utils/redis-manager.js';

class MyController {
    static async myMethod(req, res) {
        // ALWAYS check Redis availability first
        if (!RedisManager.isAvailable) {
            // Handle gracefully - cache operations will fail
            return res.json({ 
                success: true, 
                message: 'Operation completed (cache unavailable)' 
            });
        }

        try {
            // Set simple value
            await RedisManager.cacheSet(
                'controller:mycontroller',  // category
                'last_run',                 // key
                Date.now().toString(),      // value (must be string)
                3600                        // ttl in seconds (optional)
            );

            // Get value
            const lastRun = await RedisManager.cacheGet(
                'controller:mycontroller',
                'last_run'
            );
            // Returns null if not found or expired

            // Delete value
            await RedisManager.cacheDel(
                'controller:mycontroller',
                'last_run'
            );

        } catch (error) {
            console.error('Cache operation failed:', error);
            // Continue without cache - graceful degradation
        }
    }
}
```

### Object Cache Operations

For complex data structures, use object-specific methods that handle JSON serialization:

```javascript
// Set object (automatic JSON.stringify)
await RedisManager.cacheSetObject(
    'controller:mycontroller',
    'user_settings',
    {
        notifications: true,
        theme: 'dark',
        language: 'en'
    },
    3600  // TTL optional
);

// Get object (automatic JSON.parse)
const settings = await RedisManager.cacheGetObject(
    'controller:mycontroller',
    'user_settings'
);
// Returns null if not found, or the parsed object

if (settings) {
    console.log('User theme:', settings.theme);
}
```

### Increment Counter

```javascript
// Increment counter (creates if doesn't exist)
const newValue = await RedisManager.cacheIncr(
    'controller:analytics',
    'page_views',
    86400  // TTL: 24 hours
);
// Returns the new incremented value
```

### Pattern-Based Deletion

Delete multiple keys matching a pattern:

```javascript
// Delete all keys in a category matching pattern
await RedisManager.cacheDelPattern(
    'controller:mycontroller',
    'session:*'  // Deletes all keys starting with "session:"
);

// Examples:
// 'temp:*'        - All temporary data
// 'user:123:*'    - All keys for user 123
// '*:cache'       - All keys ending with ":cache"
```

### Rate Limiting

Built-in rate limiting helper for API protection:

```javascript
static async apiMyEndpoint(req, res) {
    if (!RedisManager.isAvailable) {
        return CommonUtils.sendError(res, 'Rate limiting unavailable', 503);
    }

    try {
        // Check rate limit: max 10 requests per 60 seconds per user
        const result = await RedisManager.cacheCheckRateLimit(
            'controller:mycontroller',  // category
            `user:${req.session.user._id}`,  // identifier (scoped to user)
            10,   // maxRequests
            60    // windowSeconds
        );

        if (!result.allowed) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                retryAfter: result.retryAfter  // Seconds until next allowed request
            });
        }

        // Process request...
        return res.json({ success: true });

    } catch (error) {
        LogController.logError(req, 'controller.myendpoint', 'Rate limit check failed: ' + error.message);
        // Continue without rate limiting if check fails
        return res.json({ success: true });
    }
}
```

**Rate Limit Response:**
```javascript
{
    allowed: true|false,     // Whether request is allowed
    current: 5,              // Current request count in window
    limit: 10,               // Maximum requests allowed
    remaining: 5,            // Requests remaining
    retryAfter: 0            // Seconds until next request allowed (0 if allowed)
}
```

---

## Cache Key Naming Conventions

### Category:Key Pattern

All Redis cache operations use a `category:key` pattern for organization:

```
category:key
```

**Category** - Logical grouping (controller name, model name, feature name):
- `controller:health` - Health controller data
- `controller:mycontroller` - Your controller data
- `model:user` - User model cache
- `feature:analytics` - Analytics feature

**Key** - Specific data identifier:
- `last_run` - Last execution timestamp
- `report_time` - Scheduled report time
- `user:123:preferences` - User 123's preferences

### Full Key Examples

```javascript
// Health controller compliance data
'controller:health:compliance:report_time'
'controller:health:compliance:last_scheduled_timestamp'

// User preferences cache
'model:user:preferences:123'  // User ID 123's preferences

// Rate limiting
'controller:api:ratelimit:user:456'  // Rate limit for user 456

// Temporary data
'controller:export:temp:export-uuid-12345'  // Temporary export data
```

### Best Practices

1. **Use Controller/Model Name**: Start category with controller or model name
2. **Be Specific**: Use descriptive keys that explain the data
3. **Include Context**: Add identifiers (user ID, session ID) when needed
4. **Use Colons**: Separate logical parts with colons for pattern matching
5. **Document Keys**: Comment your cache keys in code for maintainability

---

## Common Usage Patterns

### Pattern 1: User Preferences Cache

```javascript
// Controller: Save user preferences
static async apiUpdatePreferences(req, res) {
    if (!AuthController.isAuthenticated(req)) {
        return CommonUtils.sendError(res, 'Authentication required', 401);
    }

    const userId = req.session.user._id;
    const preferences = req.body.preferences;

    try {
        // Save to database
        await UserModel.updatePreferences(userId, preferences);

        // Cache for fast access (1 hour)
        if (RedisManager.isAvailable) {
            await RedisManager.cacheSetObject(
                'model:user',
                `preferences:${userId}`,
                preferences,
                3600
            );
        }

        return res.json({ success: true });
    } catch (error) {
        return CommonUtils.sendError(res, error.message);
    }
}

// Controller: Get user preferences (cache-first)
static async apiGetPreferences(req, res) {
    if (!AuthController.isAuthenticated(req)) {
        return CommonUtils.sendError(res, 'Authentication required', 401);
    }

    const userId = req.session.user._id;

    try {
        // Try cache first
        if (RedisManager.isAvailable) {
            const cached = await RedisManager.cacheGetObject(
                'model:user',
                `preferences:${userId}`
            );
            if (cached) {
                return res.json({ success: true, data: cached, source: 'cache' });
            }
        }

        // Cache miss - get from database
        const preferences = await UserModel.getPreferences(userId);

        // Cache for next time
        if (RedisManager.isAvailable) {
            await RedisManager.cacheSetObject(
                'model:user',
                `preferences:${userId}`,
                preferences,
                3600
            );
        }

        return res.json({ success: true, data: preferences, source: 'database' });
    } catch (error) {
        return CommonUtils.sendError(res, error.message);
    }
}
```

### Pattern 2: Expensive Computation Cache

```javascript
static async apiGetAnalytics(req, res) {
    const cacheKey = `analytics:${req.query.period}`;

    try {
        // Check cache first
        if (RedisManager.isAvailable) {
            const cached = await RedisManager.cacheGetObject(
                'controller:analytics',
                cacheKey
            );
            if (cached) {
                return res.json({ 
                    success: true, 
                    data: cached, 
                    cached: true 
                });
            }
        }

        // Cache miss - compute expensive analytics
        const analytics = await AnalyticsModel.computeAnalytics(req.query.period);

        // Cache for 5 minutes
        if (RedisManager.isAvailable) {
            await RedisManager.cacheSetObject(
                'controller:analytics',
                cacheKey,
                analytics,
                300
            );
        }

        return res.json({ success: true, data: analytics, cached: false });
    } catch (error) {
        return CommonUtils.sendError(res, error.message);
    }
}
```

### Pattern 3: API Rate Limiting

```javascript
static async apiCreateResource(req, res) {
    if (!AuthController.isAuthenticated(req)) {
        return CommonUtils.sendError(res, 'Authentication required', 401);
    }

    // Rate limit: 100 requests per hour per user
    if (RedisManager.isAvailable) {
        const rateLimit = await RedisManager.cacheCheckRateLimit(
            'controller:resource',
            `user:${req.session.user._id}`,
            100,   // max requests
            3600   // per hour
        );

        if (!rateLimit.allowed) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                retryAfter: rateLimit.retryAfter,
                limit: rateLimit.limit,
                remaining: 0
            });
        }
    }

    // Process request...
    try {
        const resource = await ResourceModel.create(req.body);
        return res.json({ success: true, data: resource });
    } catch (error) {
        return CommonUtils.sendError(res, error.message);
    }
}
```

### Pattern 4: Temporary Data Storage

```javascript
static async apiStartExport(req, res) {
    const exportId = jPulse.utils.generateUUID();

    try {
        // Start background export process
        const exportData = await ExportService.startExport(req.body.options);

        // Store temporary export data (30 minutes)
        if (RedisManager.isAvailable) {
            await RedisManager.cacheSetObject(
                'controller:export',
                `temp:${exportId}`,
                {
                    userId: req.session.user._id,
                    status: 'processing',
                    started: Date.now(),
                    options: req.body.options
                },
                1800  // 30 minutes
            );
        }

        return res.json({ 
            success: true, 
            exportId: exportId,
            message: 'Export started, check status with /api/1/export/status'
        });
    } catch (error) {
        return CommonUtils.sendError(res, error.message);
    }
}

static async apiGetExportStatus(req, res) {
    const exportId = req.query.exportId;

    try {
        if (RedisManager.isAvailable) {
            const exportData = await RedisManager.cacheGetObject(
                'controller:export',
                `temp:${exportId}`
            );

            if (exportData) {
                return res.json({ success: true, data: exportData });
            }
        }

        return res.json({ 
            success: false, 
            error: 'Export not found or expired' 
        });
    } catch (error) {
        return CommonUtils.sendError(res, error.message);
    }
}
```

---

## Cache Monitoring

Monitor both cache systems through the System Status page (Admin → System Status).

### File Cache Metrics

Located in the **ViewController** card:

- **Configured**: Whether view controller is active
- **View Directories**: Number of view directories configured
- **Cached Files**: Total templates cached
- **Served Last 24h**: Template renders in last 24 hours

### Redis Cache Metrics

Located in two places:

1. **Component Health Grid** - Cluster-wide view:
   - **RedisManager** card: Connection and pub/sub stats
   - **Redis Cache** card: Cache performance metrics

2. **Server Details** - Per-instance view:
   - Each instance shows its own Redis cache statistics

**Cache Metrics:**

- **Cache Hit Rate**: Percentage of cache hits (higher is better)
  - 90%+ = Excellent
  - 70-90% = Good
  - 50-70% = Fair
  - <50% = Review cache strategy

- **Cache Gets**: Total get operations
- **Cache Sets**: Total set operations
- **Cache Deletes**: Total delete operations
- **Cache Hits**: Successful cache retrievals
- **Cache Misses**: Cache misses (data not found or expired)

### Interpreting Metrics

**High Hit Rate (>80%)**
- Cache strategy is effective
- TTL values are appropriate
- Good performance benefit

**Low Hit Rate (<50%)**
- TTL too short (data expires too quickly)
- Cache keys not reused effectively
- Consider adjusting cache strategy

**High Gets, Low Sets**
- Good read-heavy caching
- Effective cache reuse

**High Deletes**
- Frequent cache invalidation
- May indicate session cleanup or pattern deletes
- Normal for rate limiting

---

## Performance Considerations

### File Cache

1. **Development vs Production**:
   - Development: Auto-refresh enabled (slight overhead)
   - Production: Manual refresh only (optimal performance)

2. **Template Compilation**:
   - First render: Template compiled and cached
   - Subsequent renders: Cached function execution (10-100x faster)

3. **Memory Usage**:
   - Cached templates stored in Node.js memory
   - Minimal impact (templates are small)

### Redis Cache

1. **TTL Strategy**:
   - Short TTL (5-15 min): Frequently changing data
   - Medium TTL (1-6 hours): User preferences, session data
   - Long TTL (24+ hours): Rarely changing data
   - No TTL: Permanent data (use with caution)

2. **Cache Key Naming**:
   - Use consistent naming for better organization
   - Leverage pattern deletion for bulk operations

3. **Network Overhead**:
   - Redis is network-based (vs in-memory)
   - Still faster than database queries
   - Consider batching operations when possible

4. **Multi-Instance Benefits**:
   - Single cache shared across all instances
   - No cache duplication
   - Consistent data across cluster

5. **Graceful Degradation**:
   - Always check `RedisManager.isAvailable`
   - Application continues if Redis fails
   - Cache operations return null on failure

---

## Error Handling

### File Cache

File cache operations are managed internally by the framework. Errors are logged but don't affect application functionality.

### Redis Cache

Always implement graceful error handling:

```javascript
// Pattern: Check availability first
if (!RedisManager.isAvailable) {
    // Handle gracefully - continue without cache
    return processWithoutCache();
}

try {
    // Cache operation
    const cached = await RedisManager.cacheGet(category, key);
    
    if (cached) {
        return useCachedData(cached);
    }
    
    // Cache miss - get from source
    const data = await getDataFromSource();
    
    // Cache for next time (best effort)
    await RedisManager.cacheSet(category, key, data, ttl);
    
    return data;
    
} catch (error) {
    // Log error but continue without cache
    LogController.logError(req, 'controller.method', 'Cache error: ' + error.message);
    
    // Fallback to source
    return await getDataFromSource();
}
```

### Best Practices

1. **Always Check Availability**: Use `RedisManager.isAvailable` before cache operations
2. **Try-Catch Blocks**: Wrap cache operations in try-catch
3. **Graceful Fallback**: Application should work without cache
4. **Log Errors**: Log cache failures for monitoring
5. **Don't Block**: Never let cache failures block user operations

---

## Multi-Instance Considerations

### Redis Cache in Clusters

When running multiple jPulse instances (cluster mode):

1. **Shared Cache**: All instances share the same Redis cache
2. **Cache Invalidation**: Deleting from one instance affects all
3. **Rate Limiting**: Counts are shared across all instances
4. **No Duplication**: Cache data stored once, accessed by all

### Cache Synchronization

The Redis cache automatically synchronizes across instances:

```
Instance A: Sets cache key "user:123:prefs"
Instance B: Gets same key → receives A's cached data
Instance C: Deletes key → removed for A and B too
```

### Cluster-Aware Patterns

```javascript
// Cluster-safe cache invalidation
static async apiUpdateGlobalConfig(req, res) {
    // Update database
    await ConfigModel.update(req.body);

    // Invalidate cache across ALL instances
    if (RedisManager.isAvailable) {
        await RedisManager.cacheDelPattern(
            'model:config',
            '*'  // Deletes all config cache on all instances
        );
    }

    return res.json({ success: true });
}
```

---

## Multi-Site Isolation

### Redis Namespace Isolation (v1.6.2+)

When running multiple jPulse installations on the same server (or sharing the same Redis instance), Redis keys are automatically isolated using a namespace prefix:

```
${siteId}:${mode}:${prefix}${key}
```

**Namespace Components:**

1. **`siteId`**: Unique identifier for the jPulse installation
   - Set via `app.siteId` in `site/webapp/app.conf`
   - Production: Populated from `JPULSE_SITE_ID` environment variable
   - Fallback: Slugified `app.site.shortName`

2. **`mode`**: Deployment mode (`dev`, `prod`, `test`)
   - From `deployment.mode` in app configuration
   - Default: `dev`

3. **`prefix`**: Service-specific prefix (e.g., `sess:`, `bc:`, `cache:`)
   - Defined in Redis connection configuration

4. **`key`**: The actual key name

### Namespace Examples

```
# Site: jpulse-framework, Mode: dev
jpulse-framework:dev:sess:abc123              # Session key
jpulse-framework:dev:bc:controller:config     # Broadcast channel
jpulse-framework:dev:cache:user:prefs         # Cache key

# Site: bubblemap-net, Mode: prod
bubblemap-net:prod:sess:xyz789                # Different site's session
bubblemap-net:prod:cache:map:tiles            # Different site's cache

# Same site, different modes
jpulse-framework:dev:cache:config             # Development cache
jpulse-framework:prod:cache:config            # Production cache (isolated!)
```

### Benefits of Namespace Isolation

1. **Multi-Site Deployments**: Run multiple jPulse applications on same server
   - `jpulse.net` and `bubblemap.net` can share Redis instance
   - No data mixing or cross-contamination

2. **Environment Isolation**: Dev and prod environments stay separate
   - Same site, different modes use different namespaces
   - Testing doesn't affect production data

3. **Health Metrics Accuracy**: Each site sees only its own instances
   - `/api/1/health/metrics` filters by namespace
   - Proper instance counts per site

4. **Session Isolation**: User sessions stay separate per site
   - Logging into one site doesn't affect another
   - Proper session cleanup per site

5. **Broadcast Isolation**: Configuration changes don't cross sites
   - Config update on Site A doesn't broadcast to Site B
   - Each site maintains independent configuration

### Configuration

**Framework Development (default):**

```javascript
// site/webapp/app.conf
{
    app: {
        siteId: 'jpulse-framework'  // Default for framework dev
    },
    deployment: {
        mode: 'dev'  // From app.conf or DEPLOYMENT_MODE env var
    }
}
```

**Production Sites:**

```bash
# .env file
JPULSE_SITE_ID=bubblemap-net
DEPLOYMENT_MODE=prod
```

```javascript
// site/webapp/app.conf (populated from template)
{
    app: {
        siteId: '%JPULSE_SITE_ID%'  // Resolved by jPulse configure
    },
    deployment: {
        mode: 'prod'                // Set by jPulse configure
    }
}
```

### Testing Multi-Site Isolation

Use the provided test script to verify namespace isolation:

```bash
# Run the multi-site isolation test
webapp/tests/manual/redis/namespace-isolation.sh
```

The test verifies:
- Different siteIds create separate namespaces
- Health metrics show only matching instances
- Sessions are isolated between sites
- Broadcasts don't cross site boundaries
- Dev vs prod modes are isolated

### Breaking Change Note

**Important:** Upgrading to v1.6.2+ invalidates all existing Redis keys.

When you upgrade, the namespace prefix will be added to all keys, making old keys inaccessible:

- **Sessions**: All users will be logged out (need to re-login)
- **Cache**: All cached data will be rebuilt on next access
- **Metrics**: Health metrics will reset (start counting from zero)
- **Broadcasts**: No impact (transient messages)

**This is expected behavior** and is acceptable for proper multi-site support. Plan accordingly:
- Inform users they'll need to re-login after upgrade
- Cache will rebuild automatically (may cause brief slowdown)
- Metrics will restart from zero (historical data still in logs)

### Troubleshooting

**Problem**: Health metrics show instances from multiple sites

**Solution**: Verify each site has a unique `siteId` in `site/webapp/app.conf`

```bash
# Check current siteId
grep -A2 "app:" site/webapp/app.conf | grep siteId

# Check Redis keys
redis-cli KEYS "*" | sort

# Should see namespaced keys like:
# site1:dev:sess:...
# site2:prod:sess:...
```

**Problem**: Sessions shared between dev and prod on same machine

**Solution**: Ensure `deployment.mode` is set correctly in each environment

```bash
# Development
DEPLOYMENT_MODE=dev npm start

# Production
DEPLOYMENT_MODE=prod pm2 start ecosystem.prod.config.cjs
```

---

## Related Documentation

- **[Application Cluster Communication](application-cluster.md)** - Multi-instance architecture using Redis
- **[REST API Reference](api-reference.md)** - Complete API documentation including cache endpoints
- **[Site Administration](site-administration.md)** - Monitoring cache performance
- **[Deployment Guide](deployment.md)** - Redis setup and requirements
- **[Gen-AI Development](genai-development.md)** - AI-assisted cache implementation

---

## FAQ

**Q: Do I need Redis for jPulse to work?**
A: No. File cache works without Redis. Redis is only needed for Redis cache features and multi-instance cluster communication.

**Q: What happens if Redis goes down?**
A: Applications continues normally. Redis cache operations return null/false. Your code should handle this gracefully with `RedisManager.isAvailable` checks.

**Q: Can I use Redis cache for session storage?**
A: Yes, but jPulse already handles sessions. Redis cache is better for application data, computed results, and temporary storage.

**Q: How do I clear all cache?**
A: File cache: Use `/api/1/cache/refresh/all`. Redis cache: Use `cacheDelPattern()` with appropriate category and `*` pattern.

**Q: What's the difference between cacheSet and cacheSetObject?**
A: `cacheSet()` requires string values. `cacheSetObject()` automatically serializes objects/arrays to JSON.

**Q: Should I cache everything?**
A: No. Cache data that is:
- Expensive to compute
- Frequently accessed
- Doesn't change often
- Safe to be slightly stale

**Q: How do I debug cache issues?**
A: Check System Status page for cache metrics. Enable debug logging in `RedisManager`. Use cache source indicators in your responses (`source: 'cache'` vs `source: 'database'`).

---

## Version History

- **v1.6.0** - Added Redis Cache infrastructure (W-143)
- **v1.5.0** - File cache system with auto-refresh
- **v1.0.0** - Initial release

---

*For the latest updates and examples, visit [jpulse.net](https://jpulse.net)*
