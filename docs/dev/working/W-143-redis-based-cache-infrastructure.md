# W-143: Redis-Based Cache Infrastructure

**Framework Work Item**: W-143
**Framework Version**: v1.6.0 (future)
**Date**: 2026-01-27
**Status**: 📋 SPEC & DESIGN
**Type**: Infrastructure Enhancement

**Related Documents**:
- **Application Cluster**: `webapp/static/assets/jpulse-docs/application-cluster.md`
- **Redis Manager**: `webapp/utils/redis-manager.js`
- **File Cache Manager**: `webapp/utils/cache-manager.js`
- **Usage Example**: `docs/dev/design/T-015-site-monitor-dashboard.md` (in joulse.net project)

**Document Purpose**: Design specification for adding a Redis cache wrapper to the existing `RedisManager` to provide consistent, convention-enforced cache operations across the framework and site applications.

---

## Executive Summary

The jPulse Framework currently has:
1. **File caching** via `CacheManager` (`webapp/utils/cache-manager.js`) - for templates, includes
2. **Redis pub/sub** via `RedisManager` (`webapp/utils/redis-manager.js`) - for broadcasting
3. **No Redis cache wrapper** - direct Redis API usage with inconsistent conventions

This work item adds a Redis cache wrapper to `RedisManager` to provide:
- Enforced key naming conventions (similar to broadcast channel conventions)
- Common cache patterns (tokens, rate limiting, sessions, TTL management)
- Type-safe operations (JSON serialization/deserialization)
- Graceful fallback handling
- Consistent API across framework and sites

### Quick Reference

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Location** | Add to existing `RedisManager` | Keep Redis operations centralized |
| **Key Naming** | `cache:{namespace}:{category}:{identifier}` | Consistent with broadcast pattern |
| **Common Patterns** | Token storage, rate limiting, sessions | Cover 80% of use cases |
| **API Surface** | Static methods on `RedisManager` | Consistent with existing API |
| **Fallback** | Graceful degradation | Support single-instance deployments |

---

## Objectives

### Primary
1. Provide consistent, convention-enforced cache API
2. Reduce code duplication across controllers/models
3. Simplify common cache patterns (tokens, rate limits, sessions)

### Secondary
1. Maintain backwards compatibility (existing direct Redis usage still works)
2. Enable gradual migration path
3. Document patterns for site developers

---

## Current State Analysis

### Existing Architecture

**RedisManager (redis-manager.js):**
```javascript
// Current focus: Pub/sub broadcasting
static publishBroadcast(channel, data)
static registerBroadcastCallback(channel, callback)
static getClient(service, type)  // Returns raw Redis client
static getKey(service, key)      // Simple prefix
```

**Current Cache Usage Pattern (Direct Redis API):**
```javascript
// Example from siteMonitor.js
const redis = global.redisManager?.getClient('cache');
if (redis) {
    await redis.setex(
        `siteMonitor:dashboardToken:${uuid}`,  // Manual key construction
        14400,
        hashedToken
    );
}

// Example from rate limiting
const ipKey = `siteMonitor:rateLimit:ip:${ipAddress}`;
const ipCount = await redis.incr(ipKey);
if (ipCount === 1) {
    await redis.pexpire(ipKey, hourMs);
}
```

**Problems:**
1. ❌ No enforced key naming convention
2. ❌ Duplicate rate limiting logic across controllers
3. ❌ No type safety (manual JSON stringify/parse)
4. ❌ Inconsistent error handling
5. ❌ No graceful fallback patterns

---

## Proposed Architecture

### Key Naming Convention

**Format:**
```
cache:{component}:{namespace}:{category}:{identifier}[:{subidentifier}]*
```

**Components:**
- `controller` - Controller-level caching (rate limits, tokens, API responses)
- `model` - Model-level caching (queries, aggregations, computed data)
- `view` - View-level caching (UI state, user preferences)
- `util` - Utility-level caching (health, metrics, configuration, framework internals)

**Examples:**
```
cache:controller:siteMonitor:token:dashboard:abc-123-def-456
cache:controller:siteMonitor:rateLimit:ip:192.168.1.100
cache:controller:siteMonitor:rateLimit:uuid:abc-123
cache:controller:auth:session:xyz-session-id
cache:model:user:profile:12345
cache:model:user:permissions:12345
cache:view:userPrefs:theme:12345
cache:util:health:metrics:instance-123
```

**Convention Mapping:**
- `component` = Layer type (controller, model, view, util)
- `namespace` = Component/feature (e.g., siteMonitor, auth, user)
- `category` = Data type (e.g., token, rateLimit, session, profile)
- `identifier` = Primary key (e.g., uuid, userId, sessionId)
- `subidentifier` = Optional additional keys (e.g., ip, email)

**Consistent with Broadcast Pattern:**
```
broadcast:controller:siteMonitor:report:received
cache:controller:siteMonitor:token:dashboard:abc-123
```

**Rationale:**
- **Consistency**: Same mental model as pub/sub broadcasting
- **Organization**: Easy to filter keys by component (`KEYS cache:controller:*`)
- **Ownership**: Clear responsibility per layer
- **Future-proof**: Supports different caching strategies per layer

### API Design

**Core Cache Operations (Server-Side):**
```javascript
class RedisManager {
    // ... existing pub/sub methods ...

    /**
     * Cache Operations
     * All methods use colon-separated paths like pub/sub:
     * path format: 'component:namespace:category[:subcategory]*'
     */

    // Basic operations
    static async cacheSet(path, key, value, options = {})
    static async cacheGet(path, key)
    static async cacheDel(path, key)
    static async cacheExists(path, key)

    // TTL operations
    static async cacheSetWithTTL(path, key, value, ttlSeconds)
    static async cacheGetTTL(path, key)
    static async cacheExpire(path, key, ttlSeconds)

    // JSON operations (auto-serialize/deserialize)
    static async cacheSetObject(path, key, obj, options = {})
    static async cacheGetObject(path, key)

    // Counter operations
    static async cacheIncr(path, key)
    static async cacheDecr(path, key)
    static async cacheIncrBy(path, key, amount)

    // High-level patterns
    static async cacheSetToken(path, identifier, token, ttlSeconds = 3600)
    static async cacheGetToken(path, identifier)
    static async cacheDelToken(path, identifier)
    static async cacheValidateToken(path, identifier, token, compareFn = null)
    static async cacheCheckRateLimit(path, key, options = {})

    // Bulk operations
    static async cacheDelPattern(path, keyPattern)
}
```

**Client-Side Cache API (Views/Browser):**
```javascript
/**
 * Cluster-wide cache operations via jPulse.appCluster.cache
 * Consistent with jPulse.appCluster.broadcast namespace
 */
jPulse.appCluster.cache = {
    // Set cache value (calls POST /api/1/app-cluster/cache/:category/:key)
    async set(category, key, value, options = {})

    // Get cache value (calls GET /api/1/app-cluster/cache/:category/:key)
    async get(category, key)

    // Delete cache value (calls DELETE /api/1/app-cluster/cache/:category/:key)
    async del(category, key)
}
```

### Usage Examples

**1. Token Storage (Simplified):**
```javascript
// BEFORE (direct Redis API):
const redis = global.redisManager?.getClient('cache');
const token = crypto.randomBytes(32).toString('base64url');
const hashedToken = bcrypt.hashSync(token, 10);
await redis.setex(
    `siteMonitor:dashboardToken:${uuid}`,
    14400,
    hashedToken
);

// AFTER (wrapper with colon-separated path):
const token = crypto.randomBytes(32).toString('base64url');
const hashedToken = bcrypt.hashSync(token, 10);
await RedisManager.cacheSetToken('controller:siteMonitor:dashboard', uuid, hashedToken, 14400);
```

**2. Token Retrieval:**
```javascript
// BEFORE:
const redis = global.redisManager?.getClient('cache');
const storedHash = await redis.get(`siteMonitor:dashboardToken:${uuid}`);

// AFTER (pattern method - recommended):
const storedHash = await RedisManager.cacheGetToken('controller:siteMonitor:dashboard', uuid);

// OR with low-level API:
const storedHash = await RedisManager.cacheGet('controller:siteMonitor:token:dashboard', uuid);
```

**3. Token Validation:**
```javascript
// BEFORE:
const redis = global.redisManager?.getClient('cache');
const storedHash = await redis.get(`siteMonitor:dashboardToken:${uuid}`);
const isValid = storedHash && bcrypt.compareSync(token, storedHash);

// AFTER (with validation helper):
const isValid = await RedisManager.cacheValidateToken(
    'controller:siteMonitor:dashboard',
    uuid,
    token,
    (stored, provided) => bcrypt.compareSync(provided, stored)
);

// OR manual:
const storedHash = await RedisManager.cacheGetToken('controller:siteMonitor:dashboard', uuid);
const isValid = storedHash && bcrypt.compareSync(token, storedHash);
```

**4. Token Deletion (Logout):**
```javascript
// BEFORE:
const redis = global.redisManager?.getClient('cache');
await redis.del(`siteMonitor:dashboardToken:${uuid}`);

// AFTER:
await RedisManager.cacheDelToken('controller:siteMonitor:dashboard', uuid);
```

**5. Rate Limiting (Simplified):**
```javascript
// BEFORE (manual implementation):
const redis = global.redisManager?.getClient('cache');
const ipKey = `siteMonitor:rateLimit:ip:${ipAddress}`;
const ipCount = await redis.incr(ipKey);
if (ipCount === 1) {
    await redis.pexpire(ipKey, 3600000);
}
if (ipCount > 6) {
    const retryAfter = await redis.pttl(ipKey);
    return { allowed: false, reason: 'Rate limit exceeded', retryAfter };
}

// AFTER (pattern method with colon-separated path):
const result = await RedisManager.cacheCheckRateLimit(
    'controller:siteMonitor:report:ip',  // path
    ipAddress,                            // key
    { limit: 6, windowSeconds: 3600 }    // options
);
// Returns: { allowed: true/false, count: N, retryAfter: ms }
```

**6. JSON Storage:**
```javascript
// BEFORE:
await redis.setex(
    `user:profile:${userId}`,
    3600,
    JSON.stringify(userProfile)
);
const raw = await redis.get(`user:profile:${userId}`);
const profile = raw ? JSON.parse(raw) : null;

// AFTER:
await RedisManager.cacheSetObject('model:user:profile', userId, userProfile, { ttl: 3600 });
const profile = await RedisManager.cacheGetObject('model:user:profile', userId);
```

**7. Counter Operations:**
```javascript
// Track page views
await RedisManager.cacheIncrBy('view:analytics:pageviews', '/about', 1);
const views = await RedisManager.cacheGet('view:analytics:pageviews', '/about');

// Track failed login attempts with automatic expiry
await RedisManager.cacheIncr('controller:auth:failedLogins', userId);
await RedisManager.cacheExpire('controller:auth:failedLogins', userId, 3600);  // 1 hour
const attempts = await RedisManager.cacheGet('controller:auth:failedLogins', userId);
if (parseInt(attempts) > 5) {
    // Lock account
}
```

**8. Bulk Pattern Deletion:**
```javascript
// Clear all dashboard tokens for a user on logout
await RedisManager.cacheDelPattern('controller:siteMonitor:token:*', userId);

// Clear all cache entries for a specific product
await RedisManager.cacheDelPattern('model:product:*', productId);

// Clear all rate limit counters for debugging (use with caution!)
await RedisManager.cacheDelPattern('controller:api:rateLimit:*', '*');
```

**9. Client-Side Cache Operations (Browser/View):**
```javascript
// In a view's JavaScript - cache user preferences
await jPulse.appCluster.cache.set('theme', 'mode', 'dark', { ttl: 2592000 }); // 30 days

// Retrieve user's theme preference
const themeMode = await jPulse.appCluster.cache.get('theme', 'mode');

// Clear cache
await jPulse.appCluster.cache.del('theme', 'mode');

// Note: Client-side operations are user-scoped automatically by the backend
// Backend stores as: cache:view:{userId}:theme:mode
```

---

## Detailed Specification

### Core Cache Operations

#### cacheSet()
```javascript
/**
 * Set cache value with optional TTL
 * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
 *                       (e.g., 'controller:siteMonitor:token:dashboard')
 * @param {string} key - Primary identifier
 * @param {string|Buffer} value - Value to cache
 * @param {Object} options - Optional configuration
 * @param {number} options.ttl - TTL in seconds (default: 0 = no expiration)
 * @param {boolean} options.nx - Only set if not exists (default: false)
 * @param {boolean} options.xx - Only set if exists (default: false)
 * @returns {Promise<boolean>} True if set successfully
 */
static async cacheSet(path, key, value, options = {}) {
    const parsed = RedisManager._parseCachePath(path);
    if (!parsed || !RedisManager._validateCacheParams(parsed.component, parsed.namespace, parsed.category, key)) {
        return false;
    }

    const redis = RedisManager.getClient('cache');
    if (!redis) {
        global.LogController?.logWarning(null, 'redis-manager.cacheSet',
            'Cache unavailable (Redis not available)');
        return false;
    }

    const { ttl = 0, nx = false, xx = false } = options;

    try {
        const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);

        if (ttl > 0) {
            await redis.setex(cacheKey, ttl, value);
        } else {
            const args = [cacheKey, value];
            if (nx) args.push('NX');
            if (xx) args.push('XX');
            await redis.set(...args);
        }

        global.LogController?.logInfo(null, 'redis-manager.cacheSet',
            `Cache set: ${cacheKey} (ttl: ${ttl > 0 ? ttl + 's' : 'indefinite'})`);
        return true;
    } catch (error) {
        global.LogController?.logError(null, 'redis-manager.cacheSet',
            `Failed to set cache: ${error.message}`);
        return false;
    }
}
```

#### cacheGet()
```javascript
/**
 * Get cache value
 * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
 * @param {string} key - Primary identifier
 * @returns {Promise<string|null>} Cached value or null if not found
 */
static async cacheGet(path, key) {
    const parsed = RedisManager._parseCachePath(path);
    if (!parsed) {
        return null;
    }

    const redis = RedisManager.getClient('cache');
    if (!redis) {
        return null;
    }

    try {
        const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);
        const value = await redis.get(cacheKey);

        if (value) {
            global.LogController?.logInfo(null, 'redis-manager.cacheGet',
                `Cache hit: ${cacheKey}`);
        }

        return value;
    } catch (error) {
        global.LogController?.logError(null, 'redis-manager.cacheGet',
            `Failed to get cache: ${error.message}`);
        return null;
    }
}
```

#### cacheDel()
```javascript
/**
 * Delete cache value
 * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
 * @param {string} key - Primary identifier
 * @returns {Promise<boolean>} True if deleted
 */
static async cacheDel(path, key) {
    const parsed = RedisManager._parseCachePath(path);
    if (!parsed) {
        return false;
    }

    const redis = RedisManager.getClient('cache');
    if (!redis) {
        return false;
    }

    try {
        const cacheKey = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, key);
        const result = await redis.del(cacheKey);

        global.LogController?.logInfo(null, 'redis-manager.cacheDel',
            `Cache deleted: ${cacheKey}`);
        return result > 0;
    } catch (error) {
        global.LogController?.logError(null, 'redis-manager.cacheDel',
            `Failed to delete cache: ${error.message}`);
        return false;
    }
}
```

### JSON Operations

#### cacheSetObject()
```javascript
/**
 * Set cache value as JSON object
 * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
 * @param {string} key - Primary identifier
 * @param {Object} obj - Object to cache
 * @param {Object} options - Optional configuration (same as cacheSet)
 * @returns {Promise<boolean>} True if set successfully
 */
static async cacheSetObject(path, key, obj, options = {}) {
    try {
        const value = JSON.stringify(obj);
        return await RedisManager.cacheSet(path, key, value, options);
    } catch (error) {
        global.LogController?.logError(null, 'redis-manager.cacheSetObject',
            `Failed to serialize object: ${error.message}`);
        return false;
    }
}
```

#### cacheGetObject()
```javascript
/**
 * Get cache value as parsed JSON object
 * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
 * @param {string} key - Primary identifier
 * @returns {Promise<Object|null>} Parsed object or null if not found
 */
static async cacheGetObject(path, key) {
    try {
        const value = await RedisManager.cacheGet(path, key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        global.LogController?.logError(null, 'redis-manager.cacheGetObject',
            `Failed to parse object: ${error.message}`);
        return null;
    }
}
```

### Pattern Methods

#### cacheSetToken()
```javascript
/**
 * Set token with TTL (common pattern for OTP, access tokens, etc.)
 * @param {string} path - Colon-separated path: 'component:namespace:purpose'
 *                       (e.g., 'controller:siteMonitor:dashboard')
 * @param {string} identifier - Owner identifier (e.g., uuid, userId)
 * @param {string} token - Token value (typically hashed)
 * @param {number} ttlSeconds - TTL in seconds (default: 3600 = 1 hour)
 * @returns {Promise<boolean>} True if set successfully
 */
static async cacheSetToken(path, identifier, token, ttlSeconds = 3600) {
    // Automatically prefix with 'token:' in the path
    const tokenPath = path.includes(':token:') ? path : path.replace(/([^:]+:[^:]+):(.+)/, '$1:token:$2');

    return await RedisManager.cacheSet(
        tokenPath,
        identifier,
        token,
        { ttl: ttlSeconds }
    );
}
```

#### cacheGetToken()
```javascript
/**
 * Get token value
 * @param {string} path - Colon-separated path: 'component:namespace:purpose'
 * @param {string} identifier - Owner identifier (e.g., uuid, userId)
 * @returns {Promise<string|null>} Token value or null if not found/expired
 */
static async cacheGetToken(path, identifier) {
    const tokenPath = path.includes(':token:') ? path : path.replace(/([^:]+:[^:]+):(.+)/, '$1:token:$2');

    return await RedisManager.cacheGet(tokenPath, identifier);
}
```

#### cacheDelToken()
```javascript
/**
 * Delete token (e.g., on logout, invalidation)
 * @param {string} path - Colon-separated path: 'component:namespace:purpose'
 * @param {string} identifier - Owner identifier (e.g., uuid, userId)
 * @returns {Promise<boolean>} True if deleted
 */
static async cacheDelToken(path, identifier) {
    const tokenPath = path.includes(':token:') ? path : path.replace(/([^:]+:[^:]+):(.+)/, '$1:token:$2');

    return await RedisManager.cacheDel(tokenPath, identifier);
}
```

#### cacheValidateToken()
```javascript
/**
 * Validate token (fetch and compare)
 * @param {string} path - Colon-separated path: 'component:namespace:purpose'
 * @param {string} identifier - Owner identifier
 * @param {string} token - Token to validate
 * @param {Function} compareFn - Optional comparison function (stored, provided) => boolean
 * @returns {Promise<boolean>} True if valid
 */
static async cacheValidateToken(path, identifier, token, compareFn = null) {
    const stored = await RedisManager.cacheGetToken(path, identifier);

    if (!stored) {
        return false;
    }

    if (compareFn) {
        return compareFn(stored, token);
    }

    return stored === token;
}
```

#### cacheCheckRateLimit()
```javascript
/**
 * Check rate limit using sliding window counter
 * @param {string} path - Colon-separated path: 'component:namespace:action[:type]*'
 *                       (e.g., 'controller:siteMonitor:report:ip')
 * @param {string} key - Identifier to rate limit (e.g., IP address, userId, email)
 * @param {Object} options - Rate limit configuration
 * @param {number} options.limit - Maximum requests allowed (required)
 * @param {number} options.windowSeconds - Time window in seconds (default: 3600 = 1 hour)
 * @returns {Promise<Object>} { allowed: boolean, count: number, retryAfter: number }
 */
static async cacheCheckRateLimit(path, key, options = {}) {
    const { limit, windowSeconds = 3600 } = options;

    if (!limit) {
        global.LogController?.logError(null, 'redis-manager.cacheCheckRateLimit',
            'Rate limit requires limit option');
        return { allowed: true, count: 0, retryAfter: 0 };
    }

    const parsed = RedisManager._parseCachePath(path);
    if (!parsed) {
        return { allowed: true, count: 0, retryAfter: 0 };
    }

    const redis = RedisManager.getClient('cache');

    if (!redis) {
        // Fallback: no rate limiting if Redis unavailable (fail open)
        global.LogController?.logWarning(null, 'redis-manager.cacheCheckRateLimit',
            'Redis unavailable, skipping rate limit check');
        return { allowed: true, count: 0, retryAfter: 0 };
    }

    try {
        // Add 'rateLimit:' prefix if not present
        const rateLimitPath = parsed.category.startsWith('rateLimit:')
            ? path
            : `${parsed.component}:${parsed.namespace}:rateLimit:${parsed.category}`;

        const finalParsed = RedisManager._parseCachePath(rateLimitPath);
        const cacheKey = RedisManager._buildCacheKey(finalParsed.component, finalParsed.namespace, finalParsed.category, key);

        const count = await redis.incr(cacheKey);

        // Set expiration on first increment
        if (count === 1) {
            await redis.expire(cacheKey, windowSeconds);
        }

        if (count > limit) {
            const ttl = await redis.ttl(cacheKey);
            return {
                allowed: false,
                count: count,
                retryAfter: ttl > 0 ? ttl * 1000 : 0  // Convert to milliseconds
            };
        }

        return {
            allowed: true,
            count: count,
            retryAfter: 0
        };
    } catch (error) {
        global.LogController?.logError(null, 'redis-manager.cacheCheckRateLimit',
            `Failed to check rate limit: ${error.message}`);
        return { allowed: true, count: 0, retryAfter: 0 }; // Fail open
    }
}
```

#### cacheDelPattern()
```javascript
/**
 * Delete all keys matching pattern
 * WARNING: Uses SCAN command which is production-safe but may be slow on large datasets
 * @param {string} path - Colon-separated path with wildcards: 'component:namespace:category*'
 *                       (e.g., 'controller:siteMonitor:token:*')
 * @param {string} keyPattern - Key pattern (can include wildcards, e.g., '*', userId)
 * @returns {Promise<number>} Number of keys deleted
 *
 * @example
 * // Clear all dashboard tokens for a user
 * await RedisManager.cacheDelPattern('controller:auth:token:*', userId);
 *
 * // Clear all cache entries for a product
 * await RedisManager.cacheDelPattern('model:product:*', productId);
 *
 * // Clear all rate limits (use with caution!)
 * await RedisManager.cacheDelPattern('controller:api:rateLimit:*', '*');
 */
static async cacheDelPattern(path, keyPattern) {
    const parsed = RedisManager._parseCachePath(path);
    if (!parsed || !keyPattern) {
        return 0;
    }

    const redis = RedisManager.getClient('cache');
    if (!redis) return 0;

    try {
        const pattern = RedisManager._buildCacheKey(parsed.component, parsed.namespace, parsed.category, keyPattern);

        // Use SCAN instead of KEYS for production safety
        const keys = [];
        let cursor = '0';
        do {
            const [nextCursor, foundKeys] = await redis.scan(
                cursor,
                'MATCH',
                pattern,
                'COUNT',
                100
            );
            cursor = nextCursor;
            keys.push(...foundKeys);
        } while (cursor !== '0');

        if (keys.length === 0) return 0;

        const deleted = await redis.del(...keys);

        global.LogController?.logInfo(null, 'redis-manager.cacheDelPattern',
            `Deleted ${deleted} keys matching pattern: ${pattern}`);

        return deleted;
    } catch (error) {
        global.LogController?.logError(null, 'redis-manager.cacheDelPattern',
            `Failed to delete pattern: ${error.message}`);
        return 0;
    }
}
```

### Internal Helpers

#### _parseCachePath()
```javascript
/**
 * Parse colon-separated cache path
 * @param {string} path - Colon-separated path: 'component:namespace:category[:subcategory]*'
 * @returns {Object} { component, namespace, category } or null if invalid
 * @private
 */
static _parseCachePath(path) {
    if (!path || typeof path !== 'string') {
        global.LogController?.logError(null, 'redis-manager._parseCachePath',
            'Cache path must be a non-empty string');
        return null;
    }

    const parts = path.split(':');
    if (parts.length < 3) {
        global.LogController?.logError(null, 'redis-manager._parseCachePath',
            `Cache path must have at least 3 parts (component:namespace:category), got: ${path}`);
        return null;
    }

    return {
        component: parts[0],
        namespace: parts[1],
        category: parts.slice(2).join(':')  // Everything after namespace is category
    };
}
```

#### _buildCacheKey()
```javascript
/**
 * Build cache key following naming convention
 * @param {string} component - Layer type ('controller', 'model', 'view', 'util')
 * @param {string} namespace - Component/feature name
 * @param {string} category - Data type
 * @param {string} key - Primary identifier
 * @returns {string} Formatted cache key
 * @private
 */
static _buildCacheKey(component, namespace, category, key) {
    // Sanitize inputs (replace special chars, preserve wildcards for patterns)
    const sanitize = (str) => String(str).replace(/[^a-zA-Z0-9\-_\.\*]/g, '-');

    const sanitizedComponent = sanitize(component);
    const sanitizedNamespace = sanitize(namespace);
    const sanitizedCategory = sanitize(category);
    const sanitizedKey = sanitize(key);

    // Build key with prefix
    const baseKey = `cache:${sanitizedComponent}:${sanitizedNamespace}:${sanitizedCategory}:${sanitizedKey}`;

    // Use existing getKey() for proper prefixing (respects app.conf)
    return RedisManager.getKey('cache', baseKey.substring(6)); // Remove 'cache:' prefix since getKey adds it
}
```

#### _validateCacheParams()
```javascript
/**
 * Validate cache operation parameters
 * Follows pub/sub validation pattern: log errors and return false instead of throwing
 * @param {string} component - Layer type
 * @param {string} namespace - Component/feature name
 * @param {string} category - Data type
 * @param {string} key - Primary identifier
 * @returns {boolean} True if valid, false otherwise
 * @private
 */
static _validateCacheParams(component, namespace, category, key) {
    const validComponents = ['controller', 'model', 'view', 'util'];
    if (!component || !validComponents.includes(component)) {
        global.LogController?.logError(null, 'redis-manager._validateCacheParams',
            `Cache component must be one of: ${validComponents.join(', ')}, got: ${component}`);
        return false;
    }
    if (!namespace || typeof namespace !== 'string') {
        global.LogController?.logError(null, 'redis-manager._validateCacheParams',
            'Cache namespace must be a non-empty string');
        return false;
    }
    if (!category || typeof category !== 'string') {
        global.LogController?.logError(null, 'redis-manager._validateCacheParams',
            'Cache category must be a non-empty string');
        return false;
    }
    if (!key || (typeof key !== 'string' && typeof key !== 'number')) {
        global.LogController?.logError(null, 'redis-manager._validateCacheParams',
            'Cache key must be a non-empty string or number');
        return false;
    }

    // Check for reserved characters that might break key structure (warn, don't fail)
    const hasInvalidChars = (str) => /[:\[\]\{\}\s]/.test(str);
    if (hasInvalidChars(namespace) || hasInvalidChars(category)) {
        global.LogController?.logWarning(null, 'redis-manager._validateCacheParams',
            'Cache namespace/category contains special characters, will be sanitized');
    }

    return true;
}
```

---

## Migration Strategy

### Phase 1: Add to Framework (No Breaking Changes)
- Add cache methods to `RedisManager`
- Existing direct Redis API usage continues to work
- Update documentation
- Provide migration examples

### Phase 2: Update Examples & Docs
- Update application-cluster.md with cache examples
- Create cache-infrastructure.md documentation
- Add usage examples to genai-instructions.md

### Phase 3: Gradual Migration (Site Code)
- Migrate high-value patterns first (rate limiting, token storage)
- Document side-by-side comparisons
- Provide migration helper scripts if needed

### Phase 4: Framework Internal Migration (Optional)
- Migrate framework controllers to use wrapper
- Update templates and examples

### Backwards Compatibility
```javascript
// Old pattern (still works):
const redis = global.redisManager?.getClient('cache');
await redis.setex('mykey', 3600, 'myvalue');

// New pattern (recommended):
await global.redisManager.cacheSet('myNamespace', 'myCategory', 'myKey', 'myvalue', { ttl: 3600 });

// Both work - no breaking changes
```

---

## Documentation Requirements

### 1. New Documentation File
**Location:** `webapp/static/assets/jpulse-docs/cache-infrastructure.md`

**Contents:**
- Overview of cache wrapper
- Key naming conventions
- Usage examples for common patterns
- Migration guide from direct Redis API
- Best practices

### 2. Update Existing Docs
**application-cluster.md:**
- Add "Cache vs. Broadcast" comparison section
- Reference cache-infrastructure.md
- Show examples of cache + broadcast patterns

**genai-instructions.md:**
- Add cache wrapper to framework capabilities
- Provide usage templates for AI assistants

### 3. API Reference
Add to framework API reference:
- RedisManager cache methods
- Parameter descriptions
- Return types
- Examples

---

## Testing Strategy

### Unit Tests
**Location:** `webapp/tests/unit/redis-manager.test.js` (new or extend existing)

**Test Coverage:**
```javascript
// Basic operations
test('cacheSet with TTL')
test('cacheGet returns value')
test('cacheGet returns null for non-existent key')
test('cacheDel removes value')

// JSON operations
test('cacheSetObject serializes correctly')
test('cacheGetObject deserializes correctly')
test('cacheGetObject handles parse errors')

// Pattern methods
test('cacheSetToken sets with proper key format')
test('cacheValidateToken validates correctly')
test('cacheCheckRateLimit enforces limit')
test('cacheCheckRateLimit resets after window')

// Key building
test('_buildCacheKey formats correctly')
test('_buildCacheKey sanitizes special characters')

// Error handling
test('graceful fallback when Redis unavailable')
test('error logging for failed operations')
```

### Integration Tests
```javascript
// End-to-end cache workflows
test('token storage and validation flow')
test('rate limiting across multiple requests')
test('TTL expiration behavior')
test('concurrent access patterns')
```

---

## Performance Considerations

### Key Design Decisions

**1. No Local Cache Layer**
- Direct Redis operations only
- Simplifies consistency (no cache invalidation logic)
- Acceptable latency for most use cases (<5ms for localhost Redis)

**2. Minimal Overhead**
- Key building: simple string concatenation
- Validation: regex checks only when needed
- No unnecessary serialization

**3. Graceful Degradation**
- Fast fail if Redis unavailable
- Optional local fallback for critical paths (future enhancement)

### Benchmarks (Expected)
```
Operation           | Time (avg) | Notes
--------------------|------------|---------------------------
cacheSet (simple)   | 1-2ms      | Network RTT to Redis
cacheGet (simple)   | 1-2ms      | Single GET operation
cacheSetObject      | 2-3ms      | JSON.stringify + SET
cacheGetObject      | 2-3ms      | GET + JSON.parse
cacheCheckRateLimit | 2-4ms      | INCR + EXPIRE (2 ops)
```

---

## Security Considerations

### Key Sanitization
- Remove/replace special characters in keys
- Prevent key injection attacks
- Validate lengths (Redis key max: 512MB, practical limit: 1KB)

### Data Storage
- No automatic encryption (use application-level if needed)
- Sensitive data should be hashed before caching (e.g., tokens with bcrypt)
- TTL enforcement for temporary data

### Rate Limiting Security
- Fail-open if Redis unavailable (prevents DoS of auth system)
- Configurable limits per action/namespace
- Log suspicious patterns (many rate limit violations)

---

## Design Decisions (Finalized)

1. **Local Fallback Cache?**
   - **Decision**: Not in v1.6.0, add in future if needed
   - **Rationale**: Keep initial implementation simple, add complexity only when needed

2. **Cache Connection Configuration**
   - **Decision**: Dedicated `cache` connection in redis.connections config
   - **Rationale**: Independent configuration and performance tuning
   - **Config**: `{ keyPrefix: 'cache:', ttl: 3600 }` (default 1 hour)

3. **Cache Connection Pool**
   - **Decision**: Separate Redis client connection for cache operations
   - **Rationale**: Independent connection management, no interference with session/websocket/broadcast

4. **Client-Side API Authentication**
   - **Decision**: Always require authentication for `/api/1/cache/*` endpoints
   - **Rationale**: Client-side cache is user-specific by design
   - **Implementation**: Auto-scope to `view:{userId}:category:key`
   - **Server-side**: No restrictions, developer controls scope via path component

5. **Cache Key Limits**
   - **Decision**: Enforce 200 character maximum for built cache keys
   - **Rationale**: Redis practical limit, prevents performance issues
   - **Component limits**: namespace ≤ 50 chars, category ≤ 100 chars
   - **Validation**: Log error and return false if exceeded

6. **Cache Metrics Storage**
   - **Decision**: In-memory per instance, aggregated by existing metrics system
   - **Rationale**: No Redis overhead, leverages existing `/api/1/health/metrics` aggregation
   - **Metrics tracked**: hits, misses, hitRate, operations (sets/gets/deletes)
   - **Aggregation**: Cluster-wide totals calculated automatically via `meta.fields`

7. **Test Coverage Strategy**
   - **Decision**: Use redis-mock for unit tests (no real Redis required)
   - **Rationale**: CI/CD environments don't have Redis, faster test execution

8. **Migration Strategy**
   - **Decision**: Update internal framework code (health.js compliance reporting)
   - **Rationale**: Minimal framework usage, good example for documentation

9. **Error Handling Philosophy**
   - **Decision**: Log warnings/errors and return false/null (graceful degradation)
   - **Rationale**: Consistent with existing RedisManager, allows app to continue

10. **TTL Edge Cases**
    - **Decision**: Negative TTL → treat as 0 (indefinite), warn if > 1 year
    - **Rationale**: Prevent common mistakes, explicit is better
    - **Defaults**: 0 = indefinite, pattern methods have sensible defaults
    - **Pattern defaults**:
      - `cacheSetToken()`: 3600s (1 hour)
      - `cacheCheckRateLimit()`: 3600s (1 hour window)

11. **Bulk Delete Pattern Support**
    - **Decision**: Yes, include in v1.6.0 using SCAN (not KEYS)
    - **Rationale**: Common use case (logout, cleanup), SCAN is production-safe

12. **Validation Strategy**
    - **Decision**: Log errors and return false (match pub/sub pattern)
    - **Rationale**: Consistency with existing RedisManager validation, graceful degradation

13. **API Parameter Structure**
    - **Decision**: Colon-separated paths (like pub/sub)
    - **Rationale**: Consistency with `jPulse.appCluster.broadcast`, cleaner API, matches Redis key patterns

14. **Rate Limit Configuration**
    - **Decision**: Use options object instead of positional parameters
    - **Rationale**: Future flexibility (burst allowance, penalty boxes, whitelists)

15. **Client-Side Cache API**
    - **Decision**: `jPulse.appCluster.cache.*` (not `jPulse.cache.*`)
    - **Rationale**: Clear indication of server-side, cluster-wide caching; matches existing `jPulse.appCluster.broadcast.*` pattern

16. **Controller Architecture & API Organization**
    - **Decision**: Single `AppClusterController` for all cluster operations (WebSocket listener, broadcast REST, cache REST)
    - **API Structure**: Protocol-based separation for clarity
      - **WebSocket**: `/api/1/ws/jp-broadcast` (framework-internal broadcast listener, `jp-` prefix indicates framework component)
      - **REST Broadcast**: `/api/1/app-cluster/broadcast/*` (HTTP POST for publishing)
      - **REST Cache**: `/api/1/app-cluster/cache/*` (HTTP GET/POST/DELETE for cache ops)
    - **Rationale**: "Don't make me think" - WebSockets are grouped by protocol (`/ws/*`), cluster REST operations by feature (`/app-cluster/*`), and `jp-` prefix clearly indicates framework-internal components
    - **Client API Consistency**:
      - `jPulse.ws.connect('/api/1/ws/jp-broadcast')` - Framework broadcast WebSocket (internal, automatic)
      - `jPulse.appCluster.broadcast.*` - Broadcast operations (uses REST API internally)
      - `jPulse.appCluster.cache.*` - Cache operations (uses REST API internally)
    - **Breaking changes**: Broadcast endpoints moved from `/api/1/broadcast/*` to `/api/1/app-cluster/broadcast/*` (no backward compat)
    - **WebSocket change**: From `/api/1/ws/app-cluster` to `/api/1/ws/jp-broadcast` for clarity (framework-internal)

---

## Success Metrics

### Adoption Metrics
- Number of controllers using cache wrapper (target: 50% within 6 months)
- Reduction in duplicate cache code
- Developer feedback (survey)

### Performance Metrics
- Cache operation latency (p50, p95, p99)
- Cache hit rate by namespace
- Error rate for cache operations

### Code Quality Metrics
- Lines of code reduced (deduplication)
- Consistency score (key naming adherence)

---

## Related Work Items

- **W-076**: Redis clustering infrastructure (foundation)
- **W-082**: Application cluster broadcasting (pub/sub pattern)
- **W-112**: Metrics registry (cache metrics integration)
- **T-015**: Site monitor dashboard (first consumer of cache wrapper)

---

## References

- **Redis Manager**: `webapp/utils/redis-manager.js`
- **File Cache Manager**: `webapp/utils/cache-manager.js`
- **Application Cluster Docs**: `webapp/static/assets/jpulse-docs/application-cluster.md`
- **Redis Documentation**: https://redis.io/commands

---

**Document Status**: ✅ Specification Finalized - Ready for Framework Implementation
**Target Framework Version**: v1.6.0
**Estimated Effort**: 1 week (design, implementation, testing, documentation)
**Risk Level**: Low (additive, no breaking changes)
**Last Updated**: 2026-01-26

---

## Implementation Checklist

Before starting implementation:

- [x] Specification reviewed and approved
- [x] No conflicts with existing Redis usage patterns
- [x] API consistency with pub/sub validated
- [x] TTL conventions defined (0 = indefinite, pattern defaults)
- [x] Validation strategy aligned with existing code
- [x] Documentation structure planned
- [x] Test strategy validated (redis-mock for CI)
- [x] Performance benchmarks defined
- [x] Migration guide drafted
- [x] Configuration added to app.conf (cache connection)
- [x] Authentication strategy defined (client: required, server: flexible)
- [x] Metrics storage strategy defined (in-memory, aggregated)
- [x] Key length limits defined (200 char max)

**Key API Decisions:**
- ✅ Colon-separated paths (consistent with pub/sub)
- ✅ Options object for rate limiting (future flexibility)
- ✅ Symmetric token methods (set/get/del)
- ✅ Bulk pattern deletion using SCAN
- ✅ Validation logs errors, returns false (matches pub/sub)
- ✅ Sensible TTL defaults for pattern methods
- ✅ Client API: `jPulse.appCluster.cache.*` (always authenticated)
- ✅ Server API: `RedisManager.cache*()` (flexible, developer-controlled)

**Implementation Phases:**
1. Core Infrastructure (redis-manager.js helpers, connection, metrics)
2. Cache Operations (basic, JSON, counters, TTL)
3. Pattern Methods (tokens, rate limiting, bulk delete)
4. Client-Side API (controller, frontend, auth)
5. Testing (redis-mock, unit tests)
6. Documentation (cache-infrastructure.md, updates to existing docs)
7. Framework Migration (health.js compliance code)

Ready for framework implementation in v1.6.0! 🚀

---

## Appendix: Example Refactoring

### Before (Current T-015 Implementation)
```javascript
// In siteMonitor.js - Token creation
const redis = global.redisManager?.getClient('cache');
if (!redis) {
    return CommonUtils.sendError(req, res, 503,
        'Service temporarily unavailable', 'REDIS_UNAVAILABLE');
}

const token = crypto.randomBytes(32).toString('base64url');
const bcrypt = require('bcrypt');
const hashedToken = bcrypt.hashSync(token, 10);

await redis.setex(
    `siteMonitor:dashboardToken:${uuid}`,
    14400,
    hashedToken
);

// Later, validation:
const storedHash = await redis.get(`siteMonitor:dashboardToken:${uuid}`);
const bcrypt = require('bcrypt');
const isValid = storedHash && bcrypt.compareSync(token, storedHash);

// On logout:
await redis.del(`siteMonitor:dashboardToken:${uuid}`);
```

### After (With Cache Wrapper - Colon-Separated)
```javascript
// In siteMonitor.js - Token creation (consistent with pub/sub pattern)
const token = crypto.randomBytes(32).toString('base64url');
const bcrypt = require('bcrypt');
const hashedToken = bcrypt.hashSync(token, 10);

const success = await global.redisManager.cacheSetToken(
    'controller:siteMonitor:dashboard',  // Colon-separated path (like pub/sub)
    uuid,
    hashedToken,
    14400
);

if (!success) {
    return CommonUtils.sendError(req, res, 503,
        'Service temporarily unavailable', 'REDIS_UNAVAILABLE');
}

// Later, validation:
const isValid = await global.redisManager.cacheValidateToken(
    'controller:siteMonitor:dashboard',
    uuid,
    token,
    (stored, provided) => bcrypt.compareSync(provided, stored)
);

// On logout:
await global.redisManager.cacheDelToken('controller:siteMonitor:dashboard', uuid);
```

**Benefits:**
- ✅ **Consistent with pub/sub** - Same colon-separated pattern as `jPulse.appCluster.broadcast`
- ✅ Enforced key naming convention
- ✅ Component-level organization (controller/model/view/util)
- ✅ Clearer intent (`cacheSetToken` vs. manual `setex`)
- ✅ Symmetrical API (`cacheSetToken` / `cacheGetToken` / `cacheDelToken`)
- ✅ Built-in null handling and validation
- ✅ Graceful fallback included
- ✅ Default TTL (1 hour) if not specified
