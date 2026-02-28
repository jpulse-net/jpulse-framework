# jPulse Framework / WebApp / Tests / Manual / Cluster Tests v1.6.23

## Overview

Cluster manual tests verify multi-instance behavior:
- Load balancing across instances
- Session persistence
- Health check aggregation
- Instance coordination

## Future Test Scenarios

### Multi-Instance Coordination
- Launch 3+ instances with PM2
- Verify load balancing works
- Test session stickiness
- Check health metrics aggregate correctly

### Failover Behavior
- Kill one instance during active session
- Verify session continues on another instance
- Check graceful degradation

### Rolling Updates
- Update one instance at a time
- Verify zero-downtime deployment
- Test backward compatibility

## Related Documentation

- **[Application Cluster](../../../../docs/application-cluster.md)** - Multi-instance architecture
- **[Deployment Guide](../../../../docs/deployment.md)** - PM2 cluster setup
