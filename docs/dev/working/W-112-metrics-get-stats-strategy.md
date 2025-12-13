# W-112: metrics: strategy to report vital statistics of components

## Status
🕑 PENDING

## Overview

Standardize `getMetrics()` method across utils, models, and controllers to provide vital component metrics for the metrics API. Components report per-instance metrics, with optional cluster-wide aggregation.

## Current State

### Existing `getMetrics()` Implementations

| Component | Type | Location | Current Stats |
|-----------|------|----------|---------------|
| **WebSocketController** | Controller | `webapp/controller/websocket.js` | `uptime`, `totalMessages`, `namespaces[]` |
| **SiteControllerRegistry** | Util | `webapp/utils/site-controller-registry.js` | `totalControllers`, `apiControllers`, `totalApiMethods` |
| **HookManager** | Util | `webapp/utils/hook-manager.js` | `available`, `registered`, `hooksWithHandlers` |
| **Cache** (instance) | Util | `webapp/utils/cache-manager.js` | `name`, `fileCount`, `directoryCount`, `config` |
| **CacheManager** (global) | Util | `webapp/utils/cache-manager.js` | `totalCaches`, `caches{}` |
| **ContextExtensions** | Util | `webapp/utils/context-extensions.js` | `providers`, `cacheSize`, `lastUpdate` |
| **UserModel** | Model | `webapp/model/user.js` | `total`, `byStatus{}`, `byRole{}`, `admins`, `recentLogins` |

### Components Needing `getMetrics()`

| Component | Type | Priority | Potential Stats |
|-----------|------|----------|-----------------|
| **PluginManager** | Util | High | ⚠️ Has `getMetrics()` - rename to `getMetrics()` |
| **RedisManager** | Util | High | `isAvailable`, `connectionCounts`, `subscribedChannels` |
| **LogModel** | Model | Medium | `totalEntries`, `byDocType{}`, `byAction{}`, `entriesLast24h` |
| **EmailController** | Controller | Medium | `emailsSent`, `emailsFailed`, `isConfigured`, `smtpStatus` |
| **AuthController** | Controller | Low | `activeSessions`, `loginAttempts`, `failedLogins` |
| **I18nManager** | Util | Low | `loadedLanguages[]`, `translationKeys`, `defaultLanguage` |
| **Database** | Module | Low | `connectionState`, `databaseName`, `collectionCount` |

## Specification

### Standard Return Structure

```javascript
static getMetrics() {
    return {
        // Identity
        component: 'ComponentName',           // String identifier
        status: 'ok' | 'warning' | 'error',   // Health status
        initialized: true,                   // Bootstrap state

        // Current stats (always present)
        stats: {
            // Component-specific data
            total: 5,
            enabled: 4,
            // ... other fields
        },

        // Historical windows (optional, Phase 2)
        // stats5m: { total: 5, enabled: 4 },   // 5-minute rolling window
        // stats1h: { total: 5, enabled: 4 },   // 1-hour rolling window

        // Consumer hints
        meta: {
            ttl: 60000,                         // Recommended cache TTL in ms (0 = no caching)
            category: 'util',                   // 'util' | 'model' | 'controller' | 'plugin'

            // Component-level defaults (optional, override system defaults)
            // visualize: true,                 // Override system default (default: true)
            // global: false,                   // Override system default (default: false)
            // sanitize: false,                 // Override system default (default: false)
            // aggregate: 'sum',                // Override system default (default: 'sum')

            // Field-specific overrides (only specify when different from defaults)
            fields: {
                'total': {
                    global: true,               // Override default (default: false)
                    aggregate: 'sum'            // Override default (default: 'sum')
                    // visualize, sanitize inherit from component/system defaults
                },
                'enabled': {
                    global: true,
                    aggregate: 'sum'
                },
                'errors': {
                    aggregate: 'sum'
                    // global inherits default (false)
                },
                'secretKey': {
                    sanitize: true,             // Override default
                    visualize: false            // Override default
                },
                'recentLogins': {
                    fields: {                   // Nested fields
                        'last24h': {
                            aggregate: 'sum',
                            global: true
                        },
                        'last7d': {
                            aggregate: 'sum',
                            global: true
                        }
                    }
                }
                // Fields not listed inherit all defaults
            }
        },

        // Timestamp
        timestamp: new Date().toISOString()
    };
}
```

### Status Field Convention

| Status | Meaning |
|--------|---------|
| `ok` | Component healthy, all systems normal |
| `warning` | Component operational but degraded |
| `error` | Component has critical issues |

### System Defaults

All components inherit these system-level defaults (defined in HealthController or MetricsRegistry):

```javascript
const SYSTEM_DEFAULTS = {
    visualize: true,    // Fields are visualized by default
    global: false,       // Fields are instance-specific by default
    sanitize: false,     // Fields are not sanitized by default
    aggregate: 'sum'     // Fields are aggregated with 'sum' by default
                         // (or 'concat' for string/array types)
};
```

**Inheritance Hierarchy**:
1. **System defaults** (hardcoded)
2. **Component-level overrides** (in `meta`, optional)
3. **Field-level overrides** (in `meta.fields`, optional)

**Field Inclusion Rules**:
- **If `meta.fields` is missing**: All fields in `stats` use system defaults
- **If a field is missing in `meta.fields`**: That field uses system defaults
- **If a field is listed in `meta.fields`**: Use specified overrides, fall back to defaults for unspecified properties

**Example**:
```javascript
meta: {
    ttl: 60000,
    category: 'plugin',
    // Component-level: visualize defaults to true (system)
    // Field-level: only specify overrides or exclusions
    fields: {
        'usersWithMfa': {
            global: true,        // Override: true (system default is false)
            aggregate: 'sum'     // Explicit: 'sum' (same as default, but clear)
        },
        'secretKey': {
            sanitize: true,      // Override: true (system default is false)
            visualize: false     // Override: false (system default is true)
        },
        'loadOrder': {
            visualize: false,    // Exclude from visualization
            aggregate: false     // Exclude from aggregation
        }
        // 'normalField' not listed = uses all system defaults (visualized & aggregated)
    }
}
```

**Note**: This is an "opt-out" model - fields are included by default. Only list fields in `meta.fields` when you need to override defaults or exclude them.

### Aggregation Types

| Type | Description | Example Use |
|------|-------------|-------------|
| `sum` | Add values across instances | counts, totals, messages |
| `avg` | Average across instances | percentages, rates |
| `max` | Maximum value | peak memory, max connections |
| `min` | Minimum value | lowest availability |
| `concat` | Concatenate arrays (unique) | active namespaces, error list |
| `first` | Take first instance's value | version, config (same across) |
| `count` | Count instances with truthy value | instances with errors |

### Global Fields

For database-backed components (models), stats are **global** - the same across all instances since they query the same database. Mark these fields with `global: true` in the field metadata:

```javascript
meta: {
    fields: {
        'total': {
            global: true,        // Same value across all instances
            aggregate: 'sum'    // Will be overridden to 'first' during aggregation
        },
        'enabled': {
            global: true,
            aggregate: 'sum'
        }
    }
}
```

**Behavior**: When aggregating, fields with `global: true` will use `'first'` aggregation type instead of the specified type, since all instances return the same value.

**Example**: `UserModel.getMetrics()` returns user counts from the database. All instances query the same DB, so `total: 100` is identical across instances. Aggregation should use `'first'` not `'sum'` to avoid incorrect totals.

### Sync vs Async

- **Sync `getMetrics()`**: For in-memory metrics (caches, registries, hooks)
- **Async `getMetrics()`**: For database-backed metrics (UserModel, LogModel)

```javascript
// Sync example (util)
static getMetrics() { return { ... }; }

// Async example (model)
static async getMetrics() { return { ... }; }
```

## Examples

### PluginManager

```javascript
static getMetrics() {
    // Inline existing getMetrics() logic
    const total = this.registry.plugins.length;
    const enabled = this.registry.plugins.filter(p => p.enabled).length;
    const disabled = this.registry.plugins.filter(p => !p.enabled).length;
    const errors = this.registry.plugins.filter(p => p.status === 'error').length;
    const missing = this.registry.plugins.filter(p => p.status === 'missing').length;

    return {
        component: 'PluginManager',
        status: errors > 0 ? 'warning' : 'ok',
        initialized: this.initialized,
        stats: {
            total,
            enabled,
            disabled,
            errors,
            missing,
            loadOrder: this.registry.loadOrder  // Not listed in fields = not aggregated
        },
        meta: {
            ttl: 300000,  // 5 minutes
            category: 'util',
            fields: {
                // Only specify fields that need overrides or exclusions
                'loadOrder': {
                    visualize: false,  // Exclude from visualization
                    aggregate: false   // Exclude from aggregation
                }
                // All other fields (total, enabled, disabled, errors, missing)
                // use system defaults automatically
            }
        },
        timestamp: new Date().toISOString()
    };
}
```

### RedisManager

```javascript
static getMetrics() {
    return {
        component: 'RedisManager',
        status: this.isAvailable ? 'ok' : 'error',
        initialized: this.instance !== null,
        stats: {
            isAvailable: this.isAvailable,
            mode: this.config?.mode || 'single',
            activeConnections: Object.values(this.connections)
                .filter(c => c !== null).length,
            subscribedChannels: this.subscribedChannels.size,
            messagesProcessed: this.recentlyProcessedMessages.size,
            config: this.config  // Sensitive, will be sanitized
        },
        meta: {
            ttl: 30000,  // 30 seconds
            category: 'util',
            fields: {
                'isAvailable': {
                    aggregate: 'count'  // Count instances with Redis
                },
                'mode': {
                    aggregate: 'first'  // Same everywhere
                },
                'activeConnections': {
                    aggregate: 'sum'    // Total connections cluster-wide
                },
                'subscribedChannels': {
                    aggregate: 'first'  // Same channels
                },
                'messagesProcessed': {
                    aggregate: 'sum'    // Total messages
                },
                'config': {
                    sanitize: true,     // Override: sanitize config details
                    visualize: false    // Override: don't show in UI
                }
            }
        },
        timestamp: new Date().toISOString()
    };
}
```

### HookManager

```javascript
static getMetrics() {
    const available = Object.keys(this.getAvailableHooks()).length;
    let registered = 0;
    for (const handlers of this.hooks.values()) {
        registered += handlers.length;
    }

    return {
        component: 'HookManager',
        status: 'ok',
        initialized: true,
        stats: {
            available,
            registered,
            hooksWithHandlers: this.hooks.size
        },
        meta: {
            ttl: 0,  // Fast, no caching needed
            category: 'util',
            fields: {
                'available': {
                    aggregate: 'first'  // Same everywhere
                },
                'registered': {
                    aggregate: 'max'    // Max across instances
                },
                'hooksWithHandlers': {
                    aggregate: 'max'
                }
            }
        },
        timestamp: new Date().toISOString()
    };
}
```

## Storage & Distribution

Component stats are stored and distributed using the same mechanism as health data:

1. **Per-instance collection**: `_getCurrentInstanceHealthData()` includes `components` object
2. **Redis broadcast**: Included in health data broadcast on `controller:health:metrics:${instanceId}`
3. **Redis cache**: Stored with key `health:cache:${instanceId}` (same TTL as health data)
4. **In-memory cache**: `instanceHealthCache` Map stores all instances' data
5. **Aggregation**: `_aggregateComponentStats()` processes data from `_getAllInstancesHealth()`

No additional storage mechanism needed - component stats are part of the health data payload.

## Integration with Metrics API

### Current Structure

Metrics API (`/api/1/health/metrics`) currently returns:
- `statistics`: Cluster-wide aggregates (WebSocket stats)
- `servers[]`: Per-server data
  - `instances[]`: Per-instance data
    - `websockets`: WebSocket stats per instance
    - `email`, `handlebars`, `view`: Component health (from `getHealthStatus()` via `_addComponentHealthStatuses()`)

**Note**:
- The `/api/1/health/status` endpoint (for load balancers) returns simple data (version, uptime, environment, database) and does NOT use `getHealthStatus()` methods.
- `getHealthStatus()` is currently used by `/api/1/health/metrics` via `_addComponentHealthStatuses()`, but this will be replaced by `getMetrics()` in W-112.
- **Decision**: Remove `getHealthStatus()` completely - all methods will be deleted once W-112 is complete. Metrics endpoint will use `getMetrics()` instead.

### New Structure

Add `components` section to each instance:

```json
{
  "servers": [{
    "instances": [{
      "pid": 82481,
      "port": 8086,
      // ... existing fields ...

      "components": {
        "cache": {
          "component": "CacheManager",
          "status": "ok",
          "initialized": true,
          "stats": { "totalCaches": 3, "totalFilesCached": 45 },
          "meta": { "ttl": 60000, "visualize": true, "category": "util" },
          "timestamp": "2025-12-09T04:54:41.342Z"
        },
        "hooks": { ... },
        "plugins": { ... },
        "redis": { ... }
      }
    }]
  }],
  "statistics": {
    // ... existing WebSocket aggregates ...

    "components": {
      "plugins": {
        "stats": { "total": 10, "enabled": 8, "disabled": 2, "errors": 0 }
      },
      "cache": {
        "stats": { "totalCaches": 3, "totalFilesCached": 90, "hitRate": 0.92 }
      }
    }
  }
}
```

### Aggregation Implementation

```javascript
// In HealthController._buildClusterStatistics()
static _aggregateComponentStats(allInstancesComponents) {
    const aggregated = {};

    const firstInstance = allInstancesComponents[0];
    if (!firstInstance) return aggregated;

    for (const [componentName, componentData] of Object.entries(firstInstance)) {
        const fieldsMeta = componentData.meta?.fields || {};
        aggregated[componentName] = {};

        // Find all stat windows present in at least one instance
        const statWindows = ['stats', 'stats5m', 'stats1h'].filter(window => {
            return allInstancesComponents.some(instance =>
                instance[componentName]?.[window]
            );
        });

        // For each stat window (stats, stats5m, stats1h)
        for (const window of statWindows) {
            aggregated[componentName][window] = {};

            // Get all fields from stats object (not just meta.fields)
            const statsObj = firstInstance[componentName]?.[window] || {};

            // Recursively aggregate all fields (including those not in meta.fields)
            this._aggregateFields(
                allInstancesComponents,
                componentName,
                window,
                statsObj,
                fieldsMeta,
                aggregated[componentName][window],
                ''
            );
        }
    }

    return aggregated;
}

static _aggregateFields(allInstances, componentName, window, statsObj, fieldsMeta, targetObj, pathPrefix) {
    // Iterate over all fields in stats object (not just meta.fields)
    for (const [fieldName, fieldValue] of Object.entries(statsObj)) {
        const fieldPath = pathPrefix ? `${pathPrefix}.${fieldName}` : fieldName;
        const fieldMeta = fieldsMeta[fieldName] || {};

        // Skip if explicitly excluded from aggregation
        if (fieldMeta.aggregate === false) {
            continue;
        }

        // Get aggregation type (check if global, then use field meta, then system default)
        let aggregateType = fieldMeta.aggregate;
        if (fieldMeta.global === true) {
            aggregateType = 'first';  // Override: global fields use 'first'
        } else if (!aggregateType || aggregateType === true) {
            aggregateType = 'sum';  // System default (true means "use default")
        }

        // Extract values from all instances
        const values = allInstances
            .map(instance => {
                const value = this._getValueByPath(
                    instance[componentName]?.[window],
                    fieldPath
                );
                return value;
            })
            .filter(v => v !== undefined && v !== null);

        if (values.length > 0) {
            // Handle nested fields
            if (fieldMeta.fields && typeof values[0] === 'object' && !Array.isArray(values[0])) {
                targetObj[fieldName] = {};
                this._aggregateFields(
                    allInstances,
                    componentName,
                    window,
                    values[0],  // Use first instance's structure
                    fieldMeta.fields,
                    targetObj[fieldName],
                    fieldPath
                );
            } else {
                // Aggregate primitive values
                targetObj[fieldName] = this._aggregate(values, aggregateType);
            }
        }
    }
}

static _getValueByPath(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
}

static _aggregate(values, type) {
    if (!values.length) return null;

    switch (type) {
        case 'sum':
            return values.reduce((a, b) => a + b, 0);
        case 'avg':
            return values.reduce((a, b) => a + b, 0) / values.length;
        case 'max':
            return Math.max(...values);
        case 'min':
            return Math.min(...values);
        case 'first':
            return values[0];
        case 'count':
            return values.filter(v => v).length;
        case 'concat':
            return [...new Set(values.flat())];
        default:
            return values[0];
    }
}
```

## Plugin Stats Registration

Plugins can register their stats via hook:

```javascript
// In plugin's initialize() method
HookManager.register('onGetInstanceStats', 'auth-mfa', async (context) => {
    const mfaStats = await MfaAuthModel.getMetrics(); // Database-backed
    context.stats['auth-mfa'] = {
        component: 'auth-mfa',
        status: 'ok',
        initialized: true,
        stats: {
            usersWithMfa: mfaStats.usersWithMfa,
            totpEnabled: mfaStats.totpEnabled,
            recoveryCodesGenerated: mfaStats.recoveryCodesGenerated
        },
        meta: {
            ttl: 60000,
            category: 'plugin',
            fields: {
                'usersWithMfa': {
                    global: true,
                    aggregate: 'sum'
                },
                'totpEnabled': {
                    global: true,
                    aggregate: 'sum'
                },
                'recoveryCodesGenerated': {
                    global: true,
                    aggregate: 'sum',
                    visualize: false
                }
            }
        },
        timestamp: new Date().toISOString()
    };
    return context;
});
```

## Sanitization

Components specify sensitive fields with `sanitize: true` in field metadata. HealthController sanitizes for non-admin users:

```javascript
static _sanitizeComponentStats(components, isAdmin) {
    if (isAdmin) return components;

    const sanitized = JSON.parse(JSON.stringify(components)); // Deep clone

    for (const [componentName, component] of Object.entries(sanitized)) {
        const fields = component.meta?.fields || {};

        // Recursively check all fields (including nested)
        this._sanitizeFields(sanitized[componentName].stats, fields);
    }

    return sanitized;
}

static _sanitizeFields(statsObj, fieldsMeta, path = '') {
    // Iterate over all fields in stats object (not just meta.fields)
    for (const [fieldName, fieldValue] of Object.entries(statsObj)) {
        const fieldPath = path ? `${path}.${fieldName}` : fieldName;
        const fieldMeta = fieldsMeta[fieldName] || {};

        // Check if this field should be sanitized
        if (fieldMeta.sanitize === true) {
            this._obfuscateField(statsObj, fieldPath);
        }

        // Handle nested fields
        if (typeof fieldValue === 'object' && !Array.isArray(fieldValue) && fieldValue !== null) {
            const nestedFieldsMeta = fieldMeta.fields || {};
            this._sanitizeFields(fieldValue, nestedFieldsMeta, fieldPath);
        }
    }
}

static _obfuscateField(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) return;
        current = current[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    if (current[lastKey] !== undefined) {
        current[lastKey] = '********';
    }
}
```

## Caching Strategy

- **Component-level**: Each component specifies `meta.ttl` (0 = no caching)
- **Consumer-level**: HealthController may cache expensive stats based on `meta.ttl`
- **Case-by-case**: Only cache expensive operations (DB queries, file system scans)

## Historical Stats (Phase 2)

Future enhancement: rolling windows for trend analysis:

```javascript
{
    stats: { total: 5, enabled: 4 },           // Current
    stats5m: { total: 5, enabled: 4 },         // 5-minute average
    stats1h: { total: 4.8, enabled: 3.9 },     // 1-hour average
    meta: {
        fields: {
            'total': {
                aggregate: 'sum'    // Applies to stats, stats5m, stats1h
            },
            'enabled': {
                aggregate: 'sum'
            }
        }
    }
}
```

Aggregated output structure:

```json
{
  "components": {
    "plugins": {
      "stats": { "total": 10, "enabled": 8 },
      "stats5m": { "total": 10, "enabled": 8 },
      "stats1h": { "total": 9, "enabled": 7 }
    }
  }
}
```

## Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| 1 | Rename `PluginManager.getMetrics()` → `getMetrics()` with new structure | Low |
| 2 | Add `RedisManager.getMetrics()` | Medium |
| 3 | Create `onGetInstanceStats` hook definition | Low |
| 4 | Update `HealthController._getCurrentInstanceHealthData()` to collect components | Medium |
| 5 | Implement `_aggregateComponentStats()` in HealthController | Medium |
| 6 | Update `HealthController._sanitizeMetricsData()` to handle component sanitize arrays | Medium |
| 7 | Add auth-mfa plugin stats registration | Medium |
| 8 | (Optional) Add `LogModel.getMetrics()` | Medium |

## Visualization

Components with `meta.visualize: true` should appear in:
- Dashboard UI
- System status page
- Metrics API response

The nested structure (`stats`, `stats5m`, `stats1h`) makes it easy to toggle between time windows in the UI.

## Questions & Decisions

- ✅ **Aggregation paths**: Simplified to field names only (e.g., `'total'` not `'stats.total'`)
- ✅ **Aggregated structure**: Nested by window (`stats`, `stats5m`, `stats1h`) for easy visualization
- ✅ **Caching**: Component-level hints via `meta.ttl`, consumer decides
- ✅ **Sanitization**: Component declares sensitive fields, consumer applies
- ✅ **Plugin stats**: Via `onGetInstanceStats` hook
- ✅ **getHealthStatus() removal**: `getHealthStatus()` is currently used by `/api/1/health/metrics` via `_addComponentHealthStatuses()`, but will be completely removed and replaced by `getMetrics()`. The `/api/1/health/status` endpoint (load balancers) doesn't use `getHealthStatus()` - it returns simple hardcoded data. All `getHealthStatus()` methods will be removed once W-112 is complete.
- ⏳ **Historical data**: Phase 2, complexity TBD
- ⏳ **Cluster aggregates**: Some components may need cross-instance aggregation (e.g., WebSocket already does this)

## Implementation Plan

### Phase 1: Foundation & Core Components (Priority 1-3)

#### Step 1.1: Update Existing Components to New Structure
**Files**: `webapp/utils/hook-manager.js`, `webapp/utils/site-controller-registry.js`, `webapp/utils/context-extensions.js`, `webapp/utils/cache-manager.js`

**Tasks**:
1. Update `HookManager.getMetrics()` to return new structure:
   - Wrap existing stats in `stats` object
   - Add `component`, `status`, `initialized`, `meta`, `timestamp`
   - Add `meta.fields` with field-level metadata

2. Update `SiteControllerRegistry.getMetrics()`:
   - Same structure transformation
   - Determine aggregation rules (likely `first` for most fields)

3. Update `ContextExtensions.getMetrics()`:
   - Same structure transformation
   - Consider if visualization needed

4. Update `CacheManager.getMetrics()`:
   - Transform `caches` object structure
   - Add aggregation rules for cache counts

**Testing**:
- Unit tests for each component's `getMetrics()` method
- Verify backward compatibility (if any code depends on old structure)
- Verify all required fields present

**Dependencies**: None

---

#### Step 1.2: Rename PluginManager.getMetrics() → getMetrics()
**File**: `webapp/utils/plugin-manager.js`

**Tasks**:
1. Rename method `getMetrics()` → `getMetrics()`
2. Transform return structure to new format:
   ```javascript
   static getMetrics() {
       const oldStats = this.getMetrics(); // Keep internal method or inline
       return {
           component: 'PluginManager',
           status: oldStats.errors > 0 ? 'warning' : 'ok',
           initialized: this.initialized,
           stats: {
               total: oldStats.total,
               enabled: oldStats.enabled,
               disabled: oldStats.disabled,
               errors: oldStats.errors,
               missing: oldStats.missing,
               loadOrder: oldStats.loadOrder
           },
           meta: {
               ttl: 300000,
               category: 'util',
               fields: {
                   'total': {
                       aggregate: 'sum'
                   },
                   'enabled': {
                       aggregate: 'sum'
                   },
                   'disabled': {
                       aggregate: 'sum'
                   },
                   'errors': {
                       aggregate: 'sum'
                   },
                   'missing': {
                       aggregate: 'sum'
                   }
               }
           },
           timestamp: new Date().toISOString()
       };
   }
   ```
3. Update all callers of `getMetrics()` to use `getMetrics()`

**Note:**
- Better refactor `getMetrics()` into `getMetrics()`, e.g. remove `getMetrics()`
- `getHealthStatus()` is separate and not part of W-112 scope (used by `/api/1/health/status` for load balancers)

**Testing**:
- Search codebase for `getMetrics()` calls
- Update tests to use new method name
- Verify plugin discovery still works

**Dependencies**: None

---

#### Step 1.3: Add RedisManager.getMetrics()
**File**: `webapp/utils/redis-manager.js`

**Tasks**:
1. Implement `getMetrics()` method:
   ```javascript
   static getMetrics() {
       const connectionCounts = {
           session: this.connections.session ? 1 : 0,
           websocket: (this.connections.websocket?.publisher ? 1 : 0) +
                      (this.connections.websocket?.subscriber ? 1 : 0),
           broadcast: (this.connections.broadcast?.publisher ? 1 : 0) +
                      (this.connections.broadcast?.subscriber ? 1 : 0),
           metrics: this.connections.metrics ? 1 : 0
       };

       return {
           component: 'RedisManager',
           status: this.isAvailable ? 'ok' : 'error',
           initialized: this.instance !== null,
           stats: {
               isAvailable: this.isAvailable,
               mode: this.config?.mode || 'single',
               activeConnections: Object.values(connectionCounts).reduce((a, b) => a + b, 0),
               subscribedChannels: this.subscribedChannels.size,
               messagesProcessed: this.recentlyProcessedMessages.size,
               connectionDetails: connectionCounts
           },
           meta: {
               ttl: 30000,
               category: 'util',
               fields: {
                   'isAvailable': {
                       aggregate: 'count'
                   },
                   'mode': {
                       aggregate: 'first'
                   },
                   'activeConnections': {
                       aggregate: 'sum'
                   },
                   'subscribedChannels': {
                       aggregate: 'first'
                   },
                   'messagesProcessed': {
                       aggregate: 'sum'
                   },
                   'config': {
                       sanitize: true,
                       visualize: false
                   }
               }
           },
           timestamp: new Date().toISOString()
       };
   }
   ```

**Testing**:
- Test with Redis enabled/disabled
- Test with different Redis modes (single, cluster)
- Verify connection counting logic

**Dependencies**: None

---

#### Step 1.4: Create onGetInstanceStats Hook
**Files**: `webapp/utils/hook-manager.js`, documentation

**Tasks**:
1. Add `onGetInstanceStats` to available hooks list in `HookManager`
2. Document hook signature:
   ```javascript
   // Hook context structure
   {
       stats: {},  // Object to add component stats to
       instanceId: string  // Current instance ID
   }
   ```
3. Update hook documentation if exists

**Testing**:
- Verify hook can be registered
- Test hook execution with sample plugin

**Dependencies**: None

---

### Phase 2: HealthController Integration (Priority 4-6)

#### Step 2.1: Create Component Stats Registry and Collection Method
**Files**: `webapp/utils/metrics-registry.js` (new), `webapp/controller/health.js`

**Tasks**:
1. **Create MetricsRegistry utility** (`webapp/utils/metrics-registry.js`):
   ```javascript
   /**
    * Stats Registry - Centralized registration for component stats providers
    * Components register their getMetrics() method during initialization
    */
   class MetricsRegistry {
       static providers = new Map(); // componentName -> { getStats, async, category }

       /**
        * Register a stats provider
        * @param {string} name - Component name (e.g., 'cache', 'hooks', 'plugins')
        * @param {Function} getStatsFn - Function that returns stats (sync or async)
        * @param {Object} options - { async: false, category: 'util' }
        */
       static register(name, getStatsFn, options = {}) {
           this.providers.set(name, {
               getStats: getStatsFn,
               async: options.async || false,
               category: options.category || 'other'
           });
           LogController.logInfo(null, 'metrics-registry.register',
               `Registered stats provider: ${name} (${options.async ? 'async' : 'sync'}, ${options.category})`);
       }

       /**
        * Unregister a stats provider
        * @param {string} name - Component name
        */
       static unregister(name) {
           if (this.providers.delete(name)) {
               LogController.logInfo(null, 'metrics-registry.unregister',
                   `Unregistered stats provider: ${name}`);
           }
       }

       /**
        * Get all registered provider names
        * @returns {string[]} Array of component names
        */
       static getRegisteredNames() {
           return Array.from(this.providers.keys());
       }
   }

   export default MetricsRegistry;
   ```

2. **Update component initialization** to register themselves:
   - `CacheManager`: Register in constructor or initialization
   - `HookManager`: Register during bootstrap
   - `PluginManager`: Register after initialization
   - `SiteControllerRegistry`: Register after scan
   - `ContextExtensions`: Register after initialization
   - `RedisManager`: Register after initialization
   - `UserModel`: Register during bootstrap (async)

3. **Create `_collectComponentStats()` method** in HealthController:
   ```javascript
   static async _collectComponentStats() {
       const components = {};

       // Collect from all registered providers
       for (const [name, provider] of MetricsRegistry.providers) {
           try {
               if (provider.async) {
                   components[name] = await provider.getMetrics();
               } else {
                   components[name] = provider.getMetrics();
               }
           } catch (error) {
               LogController.logError(null, 'health._collectComponentStats',
                   `${name}.getMetrics() failed: ${error.message}`);
               // Continue with other components even if one fails
           }
       }

       // Plugin stats via hook (plugins register their own stats)
       try {
           let pluginContext = { stats: {}, instanceId: global.appConfig.system.instanceId };
           pluginContext = await HookManager.execute('onGetInstanceStats', pluginContext);
           Object.assign(components, pluginContext.stats);
       } catch (error) {
           LogController.logError(null, 'health._collectComponentStats',
               `onGetInstanceStats hook failed: ${error.message}`);
       }

       return components;
   }
   ```

4. **Example registration in components**:
   ```javascript
   // In CacheManager constructor or initialization
   import MetricsRegistry from '../utils/metrics-registry.js';

   constructor() {
       // ... existing code ...
       MetricsRegistry.register('cache', () => this.getMetrics(), {
           async: false,
           category: 'util'
       });
   }

   // In UserModel (during bootstrap)
   import MetricsRegistry from '../utils/metrics-registry.js';

   static async initialize() {
       // ... existing initialization ...
       MetricsRegistry.register('users', () => UserModel.getMetrics(), {
           async: true,
           category: 'model'
       });
   }
   ```

**Testing**:
- Test component registration during bootstrap
- Test dynamic discovery of all registered components
- Test with components failing (should continue with others)
- Test with plugins registering stats via hook
- Verify error handling doesn't break metrics endpoint
- Test unregister functionality

**Dependencies**: Steps 1.1, 1.2, 1.3, 1.4

---

#### Step 2.2: Integrate Component Stats into Health Data
**File**: `webapp/controller/health.js`

**Tasks**:
1. Update `_getCurrentInstanceHealthData()` to include components:
   ```javascript
   static async _getCurrentInstanceHealthData(pm2Status, wsStats) {
       // ... existing code ...

       const instance = {
           // ... existing fields ...
           components: await this._collectComponentStats()
       };

       return instance;
   }
   ```

2. **Remove `_addComponentHealthStatuses()` completely** - replace with `getMetrics()` collection:
   - Remove all calls to `this._addComponentHealthStatuses(instance)` in `_getCurrentInstanceHealthData()` and related methods
   - Remove the `_addComponentHealthStatuses()` method entirely
   - Remove `componentProviders` config from HealthController (no longer needed)
   - Component stats are now collected via `_collectComponentStats()` and included in `instance.components`
   - The old `email`, `handlebars`, `view` fields (from `getHealthStatus()`) will be replaced by `components` object
   - Note: `/api/1/health/status` endpoint doesn't use `getHealthStatus()` - it returns simple hardcoded data

3. **Remove all `getHealthStatus()` methods** from components (after migration is complete):
   - Remove `EmailController.getHealthStatus()`
   - Remove `HandlebarController.getHealthStatus()`
   - Remove `ViewController.getHealthStatus()`
   - Remove `PluginController.getHealthStatus()` (which calls `PluginManager.getHealthStatus()`)
   - Remove `PluginManager.getHealthStatus()`

4. Verify components are included in health broadcast
5. Verify components are cached in Redis

**Testing**:
- Call `/api/1/health/metrics` and verify `components` in response
- Verify components appear in each instance
- Verify old `email`, `handlebars`, `view` fields are replaced by `components` object
- Check Redis cache contains components

**Dependencies**: Step 2.1

---

#### Step 2.3: Implement Component Stats Aggregation
**File**: `webapp/controller/health.js`

**Tasks**:
1. Add `_aggregateComponentStats()` method with field-based metadata support:
   ```javascript
   static _aggregateComponentStats(allInstancesComponents) {
       // See "Aggregation Implementation" section in specification
       // Uses meta.fields structure with recursive _aggregateFields() helper
   }
   ```

2. Add `_aggregate()` helper method (see specification section)
3. Integrate into `_buildClusterStatistics()`:
   ```javascript
   static async _buildClusterStatistics(pm2Status, wsStats, timestamp) {
       // ... existing code ...

       // NEW: Aggregate component stats
       const allInstancesComponents = Array.from(allInstances.values())
           .map(instance => instance.components || {});
       const aggregatedComponents = this._aggregateComponentStats(allInstancesComponents);

       return {
           // ... existing statistics ...
           components: aggregatedComponents
       };
   }
   ```

**Testing**:
- Test with single instance (no aggregation)
- Test with multiple instances
- Test different aggregation types (sum, avg, max, first, count)
- Test global field override (should use 'first' instead of 'sum' when global: true)
- Test with missing fields
- Test with components that have no fields metadata
- Test database-backed stats (UserModel, LogModel) with global: true
- Test nested fields aggregation

**Dependencies**: Step 2.2

---

#### Step 2.4: Implement Component Stats Sanitization
**File**: `webapp/controller/health.js`

**Tasks**:
1. Add `_sanitizeComponentStats()` method (see specification section)
2. Add `_obfuscateField()` helper method
3. Update `_sanitizeMetricsData()` to also sanitize components:
   ```javascript
   static _sanitizeMetricsData(metricsData) {
       // ... existing sanitization ...

       // NEW: Sanitize component stats
       if (metricsData.servers) {
           metricsData.servers.forEach(server => {
               server.instances.forEach(instance => {
                   if (instance.components) {
                       instance.components = this._sanitizeComponentStats(
                           instance.components,
                           false  // isAdmin = false for sanitization
                       );
                   }
               });
           });
       }

       // Also sanitize aggregated components in statistics
       if (metricsData.statistics?.components) {
           // Note: aggregated stats typically don't need sanitization
           // but check if any sensitive aggregated data exists
       }
   }
   ```

4. Update `metrics()` endpoint to pass `isAdmin` flag:
   ```javascript
   const isAdmin = AuthController.isAuthorized(req, ['admin', 'root']);
   if (!isAdmin) {
       HealthController._sanitizeMetricsData(baseMetrics.data);
   }
   ```

**Testing**:
- Test as admin (no sanitization)
- Test as non-admin (sanitization applied)
- Test with components that have `meta.sanitize` fields
- Test nested field paths (e.g., `config.password`)
- Verify obfuscated values show as `'********'`

**Dependencies**: Step 2.2

---

### Phase 3: Plugin Integration (Priority 7)

#### Step 3.1: Add auth-mfa Plugin Stats
**File**: `plugins/auth-mfa/webapp/controller/mfaAuth.js` (or initialization file)

**Tasks**:
1. Register `onGetInstanceStats` hook in plugin initialization:
   ```javascript
   // In plugin's initialize() or bootstrap
   HookManager.register('onGetInstanceStats', 'auth-mfa', async (context) => {
       try {
           const mfaStats = await MfaAuthModel.getMetrics(); // Create this method
           context.stats['auth-mfa'] = {
               component: 'auth-mfa',
               status: 'ok',
               initialized: true,
               stats: mfaStats,
               meta: {
                   ttl: 60000,
                   category: 'plugin',
                   fields: {
                       'usersWithMfa': {
                           global: true,
                           aggregate: 'sum'
                       },
                       'totpEnabled': {
                           global: true,
                           aggregate: 'sum'
                       },
                       'recoveryCodesGenerated': {
                           global: true,
                           aggregate: 'sum',
                           visualize: false
                       }
                   }
               },
               timestamp: new Date().toISOString()
           };
       } catch (error) {
           // Log error but don't break metrics
           LogController.logError(null, 'auth-mfa.onGetInstanceStats',
               `Failed to get stats: ${error.message}`);
       }
       return context;
   });
   ```

2. Create `MfaAuthModel.getMetrics()` if needed:
   ```javascript
   static async getMetrics() {
       const collection = this.getCollection();
       const total = await collection.countDocuments({});
       const withMfa = await collection.countDocuments({ mfaEnabled: true });
       const totpEnabled = await collection.countDocuments({ totpSecret: { $exists: true } });
       const recoveryCodes = await collection.aggregate([
           { $match: { recoveryCodes: { $exists: true } } },
           { $project: { count: { $size: '$recoveryCodes' } } },
           { $group: { _id: null, total: { $sum: '$count' } } }
       ]).toArray();

       return {
           usersWithMfa: withMfa,
           totpEnabled: totpEnabled,
           recoveryCodesGenerated: recoveryCodes[0]?.total || 0,
           total: total
       };
   }
   ```

**Testing**:
- Verify hook is registered on plugin load
- Test stats collection with MFA users
- Test with no MFA users
- Verify stats appear in metrics API

**Dependencies**: Step 1.4, Step 2.1

---

### Phase 4: Optional Enhancements (Priority 8+)

#### Step 4.1: Add LogModel.getMetrics() (Optional)
**File**: `webapp/model/log.js`

**Tasks**:
1. Implement async `getMetrics()` method:
   ```javascript
   static async getMetrics() {
       try {
           const collection = this.getCollection();
           const now = new Date();
           const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

           const result = await collection.aggregate([
               {
                   $facet: {
                       total: [{ $count: 'count' }],
                       byDocType: [
                           { $group: { _id: '$data.docType', count: { $sum: 1 } } }
                       ],
                       byAction: [
                           { $group: { _id: '$data.action', count: { $sum: 1 } } }
                       ],
                       last24h: [
                           { $match: { createdAt: { $gte: last24h } } },
                           { $count: 'count' }
                       ]
                   }
               }
           ]).toArray();

           const data = result[0];
           return {
               component: 'LogModel',
               status: 'ok',
               initialized: true,
               stats: {
                   total: data.total[0]?.count || 0,
                   byDocType: Object.fromEntries(
                       data.byDocType.map(item => [item._id, item.count])
                   ),
                   byAction: Object.fromEntries(
                       data.byAction.map(item => [item._id, item.count])
                   ),
                   entriesLast24h: data.last24h[0]?.count || 0
               },
               meta: {
                   ttl: 60000,  // 1 minute - DB query
                   category: 'model',
                   fields: {
                       'total': {
                           global: true,
                           aggregate: 'sum'
                       },
                       'entriesLast24h': {
                           global: true,
                           aggregate: 'sum'
                       }
                   }
               },
               timestamp: new Date().toISOString()
           };
       } catch (error) {
           return {
               component: 'LogModel',
               status: 'error',
               initialized: true,
               stats: {},
               meta: { ttl: 0, visualize: false, category: 'model' },
               timestamp: new Date().toISOString(),
               error: error.message
           };
       }
   }
   ```

2. Register in MetricsRegistry during bootstrap (see Step 2.1)

**Testing**:
- Test with log entries in database
- Test with empty logs collection
- Test aggregation across instances (should use 'first' for fields with global: true)
- Verify all instances return same values (global data)
- Test nested fields with global flag

**Dependencies**: Step 2.1

---

### Phase 5: Testing & Validation

#### Step 5.1: Unit Tests
**Files**: `webapp/tests/unit/utils/*.test.js`, `webapp/tests/unit/model/*.test.js`

**Tasks**:
1. Add/update tests for each component's `getMetrics()`:
   - Test return structure
   - Test all required fields present
   - Test status calculation
   - Test aggregation rules

2. Test HealthController methods:
   - `_collectComponentStats()`
   - `_aggregateComponentStats()`
   - `_sanitizeComponentStats()`
   - `_aggregate()` helper

**Testing**: Run test suite

---

#### Step 5.2: Integration Tests
**Files**: `webapp/tests/integration/health.test.js` (create if needed)

**Tasks**:
1. Test `/api/1/health/metrics` endpoint:
   - Verify components in response
   - Test as admin vs non-admin
   - Test sanitization
   - Test aggregation with multiple instances

2. Test health broadcasting:
   - Verify components in broadcast payload
   - Verify components in Redis cache

**Testing**: Manual and automated integration tests

---

#### Step 5.3: Documentation Updates
**Files**: API docs, plugin docs

**Tasks**:
1. Document `getMetrics()` convention in API reference
2. Document `onGetInstanceStats` hook for plugins
3. Update metrics API documentation
4. Add examples to plugin development guide

---

### Phase 6: Performance & Optimization

#### Step 6.1: Caching Implementation (If Needed)
**File**: `webapp/controller/health.js`

**Tasks**:
1. Review `meta.ttl` values from components
2. Implement per-component caching if needed:
   ```javascript
   static componentStatsCache = new Map(); // componentName -> { data, timestamp }

   static async _collectComponentStats() {
       const components = {};
       const now = Date.now();

       // Example: Cache expensive components
       const cacheKey = 'users';
       const cached = this.componentStatsCache.get(cacheKey);
       if (cached && (now - cached.timestamp) < 60000) {
           components.users = cached.data;
       } else {
           components.users = await UserModel.getMetrics();
           this.componentStatsCache.set(cacheKey, { data: components.users, timestamp: now });
       }
       // ... repeat for other components
   }
   ```

2. Only implement if performance testing shows need

**Testing**: Load testing, measure metrics endpoint response time

---

### Implementation Checklist

- [ ] Phase 1.1: Update existing components (HookManager, SiteControllerRegistry, ContextExtensions, CacheManager)
- [ ] Phase 1.2: Rename PluginManager.getMetrics() → getMetrics()
- [ ] Phase 1.3: Add RedisManager.getMetrics()
- [ ] Phase 1.4: Create onGetInstanceStats hook
- [ ] Phase 2.1: Create _collectComponentStats() method
- [ ] Phase 2.2: Integrate components into health data
- [ ] Phase 2.3: Implement component stats aggregation
- [ ] Phase 2.4: Implement component stats sanitization
- [ ] Phase 3.1: Add auth-mfa plugin stats
- [ ] Phase 4.1: (Optional) Add LogModel.getMetrics()
- [ ] Phase 5.1: Unit tests
- [ ] Phase 5.2: Integration tests
- [ ] Phase 5.3: Documentation updates
- [ ] Phase 6.1: (If needed) Caching implementation

### Rollout Strategy

1. **Development**: Implement Phase 1-2 in feature branch
2. **Testing**: Complete Phase 5 testing
3. **Review**: Code review, verify backward compatibility
4. **Staging**: Deploy to staging, verify metrics endpoint
5. **Production**: Deploy with monitoring
6. **Post-deploy**: Monitor metrics endpoint performance, verify component stats appearing

### Risk Mitigation

- **Backward compatibility**: Old `getMetrics()` calls may break → Search and update all callers
- **Performance**: Too many DB queries → Implement caching based on `meta.ttl`
- **Error handling**: Component failure breaks metrics → Wrap each component in try/catch
- **Memory**: Large component stats → Monitor memory usage, consider pagination if needed
- **getHealthStatus() removal**: `getHealthStatus()` methods are currently used by `/api/1/health/metrics` via `_addComponentHealthStatuses()`, but will be completely removed and replaced by `getMetrics()`. The `/api/1/health/status` endpoint doesn't use `getHealthStatus()` - it returns simple hardcoded data. All `getHealthStatus()` methods and `_addComponentHealthStatuses()` will be removed once W-112 is complete.

## References

- Current metrics endpoint: `/api/1/health/metrics`
- HealthController: `webapp/controller/health.js`
- WebSocketController.getMetrics(): `webapp/controller/websocket.js`
