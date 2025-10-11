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
        // ... existing fields ...
        appInstances: {
            // Aggregated cluster-wide stats
            cluster: {
                totalInstances: 3,
                totalProcesses: 12,
                runningProcesses: 10,
                stoppedProcesses: 1,
                erroredProcesses: 1,
                lastUpdated: "2025-10-10T10:30:00.000Z"
            },
            // Individual instance details
            instances: [
                {
                    serverId: "app-server-1",
                    hostname: "web01.example.com",
                    pm2Available: true,
                    totalProcesses: 4,
                    processes: [/* PM2 process details */]
                },
                // ... more instances
                {
                    serverId: "app-server-3",
                    pm2Available: false,
                    reason: "PM2 not installed",
                    processes: []
                }
            ]
        }
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
