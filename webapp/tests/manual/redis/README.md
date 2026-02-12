# jPulse Framework / WebApp / Tests / Manual / Redis / Redis Tests v1.6.16

## Overview

Redis manual tests verify multi-instance behavior, cache isolation, and graceful degradation scenarios that require:
- Multiple terminal windows (2+ instances running)
- Browser UI verification (health metrics, config changes)
- System-level testing (Redis service control)

## Architecture Context

jPulse uses Redis for:
1. **Session Storage**: Shared sessions across cluster instances
2. **Cache Layer**: Application data, computed results, rate limiting
3. **Pub/Sub Broadcasts**: Config changes, cache invalidation signals
4. **Health Metrics**: Aggregated cluster-wide statistics

### Multi-Site Isolation (v1.6.2+)

Redis keys are namespaced with `${siteId}:${mode}:${prefix}${key}` format:
- **siteId**: Unique identifier per jPulse installation
- **mode**: Deployment mode (dev, prod, test)
- **prefix**: Service-specific (sess:, cache:, bc:)
- **key**: Actual key name

Example: `bubblemap-net:prod:sess:abc123`

## Test Scenarios

### 1. Namespace Isolation (`namespace-isolation.sh`)

**Purpose**: Verify multiple jPulse sites on same Redis instance don't mix data (1.6.2+)

**What it tests**:
- Different `siteId` values create separate namespaces
- Health metrics show only matching instances
- Sessions are isolated between sites
- Broadcasts don't cross site boundaries
- Dev vs prod modes are isolated (same site, different mode)

**Requirements**:
- Redis running on localhost:6379
- Ports 8080-8081 available

**Duration**: ~10 minutes

**Key Checkpoints**:
- Redis keys have proper namespace prefix (`${siteId}:${mode}:${prefix}${key}`)
- Health metrics filtered by namespace
- Config changes on Site A don't affect Site B

### 2. Graceful Degradation (`graceful-degradation.sh`)

**Purpose**: Verify application continues when Redis unavailable

**What it tests**:
- App starts without Redis
- Config changes work locally (no Redis pub/sub)
- Callbacks still fire (local mode)
- Compliance report works
- WebSocket works (local only)
- Redis restart works

**Requirements**:
- macOS or Linux (uses `brew services` or `systemctl`)
- Ability to stop/start Redis
- **Dev environment only** (never run on production!)

**Duration**: ~5 minutes

**Key Checkpoints**:
- App logs "Redis unavailable" (not crash)
- Web UI still accessible
- API endpoints still functional
- System status shows Redis unavailable
- Local broadcast fallback works

**⚠️ Warning**: This test stops and restarts Redis. Only run in development environments!

## Common Issues & Troubleshooting

### Issue: "Redis connection refused"

**Symptoms**: Scripts fail immediately, can't connect to Redis

**Solution**:
```bash
# Check if Redis is running
redis-cli ping

# Start Redis if not running
brew services start redis  # macOS
sudo systemctl start redis  # Linux
```

### Issue: "Port already in use"

**Symptoms**: Can't start second instance on port 8081

**Solution**:
```bash
# Find process using the port
lsof -i :8081

# Kill the process or use different port
PORT=8082 npm start
```

### Issue: "Keys not namespaced"

**Symptoms**: Redis keys missing siteId prefix

**Solution**:
- Check `site/webapp/app.conf` has `app.siteId` set
- Verify environment variable `JPULSE_SITE_ID` if using .env
- Restart instance after config change

### Issue: "Health metrics show wrong instances"

**Symptoms**: Metrics aggregating instances from different sites

**Solution**:
- Verify each site has unique `siteId`
- Check Redis keys match namespace pattern
- Clear Redis metrics: `redis-cli DEL *metrics*`

## Redis Key Patterns

Understanding key patterns helps debugging:

```bash
# View all keys
redis-cli KEYS "*"

# View keys by site
redis-cli KEYS "jpulse-framework:dev:*"
redis-cli KEYS "bubblemap-net:prod:*"

# View sessions only
redis-cli KEYS "*:sess:*"

# View broadcast channels
redis-cli KEYS "*:bc:*"

# View cache keys
redis-cli KEYS "*:cache:*"

# Count keys by namespace
redis-cli KEYS "jpulse-framework:dev:*" | wc -l
```

## Performance Considerations

When running manual tests:

1. **Flush Redis between tests** for clean state:
   ```bash
   redis-cli FLUSHDB
   ```

2. **Monitor Redis memory** if running many tests:
   ```bash
   redis-cli INFO memory
   ```

3. **Check connection count**:
   ```bash
   redis-cli INFO clients
   ```

4. **Watch for memory leaks** in long-running tests:
   ```bash
   redis-cli INFO stats | grep total_connections_received
   ```

## Related Documentation

- **[Cache Infrastructure](../../../../docs/cache-infrastructure.md)** - Redis architecture, multi-site isolation
- **[Application Cluster](../../../../docs/application-cluster.md)** - Multi-instance communication
- **[Deployment Guide](../../../../docs/deployment.md)** - Production Redis setup

## Future Test Ideas

- **Broadcast Synchronization**: Config changes across 3+ PM2 cluster instances (move to `cluster/` when implemented)
- **Performance**: Cache hit rate optimization
- **Failover**: Redis cluster failover behavior
- **Persistence**: RDB/AOF data recovery
- **Sentinel**: High availability testing
- **Cluster Mode**: Sharding behavior
