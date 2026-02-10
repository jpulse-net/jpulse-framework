# jPulse Framework / WebApp / Tests / Manual / Manual Testing Guide v1.6.12

## Overview

Manual tests complement automated unit and integration tests by covering scenarios that require:
- Multi-terminal coordination (multiple instances)
- Browser UI verification
- System-level integration (Redis, MongoDB, cluster behavior)
- Deployment validation
- Human judgment and exploratory testing

## When to Use Manual vs Automated Tests

### Use Automated Tests For:
- Unit logic validation
- API response verification
- Single-process behavior
- Regression testing
- CI/CD pipelines

### Use Manual Tests For:
- **Multi-instance scenarios**: Requires 2+ terminal windows, process coordination
- **Browser UI verification**: Visual confirmation of UI updates, theme changes, real-time updates
- **System integration**: Testing Redis down, MongoDB failover, network issues
- **Deployment validation**: Production-like environment smoke tests
- **Exploratory testing**: Finding edge cases, performance issues, UX problems

## Directory Structure

```
webapp/tests/manual/
├── README.md                    # This file
├── redis/                       # Redis cache, broadcasts, multi-site isolation
├── deployment/                  # Deployment validation, environment setup
├── cluster/                     # Multi-instance, PM2, load balancing
└── [feature]/                   # Future: authentication, plugins, performance, etc.
```

## Test Organization

Tests are organized by **feature/component** rather than tool type because:
- Most tests are hybrid (shell commands + browser verification)
- Feature cohesion helps debugging (all Redis tests in one place)
- Feature-specific README provides architectural context

## Manual Test Standards

### Script Requirements

Every manual test script must include:

1. **Header Block**:
   ```bash
   #!/bin/bash
   # Feature: Redis Namespace Isolation
   # Purpose: Verify multi-site Redis key isolation
   # Requirements: Redis running, ports 8080-8081 available
   # Duration: ~5 minutes
   ```

2. **Prerequisites Check**:
   - Verify required services (Redis, MongoDB)
   - Check port availability
   - Validate environment setup

3. **Clear Step-by-Step Instructions**:
   - Numbered steps with clear actions
   - Expected outcomes at each checkpoint
   - Browser URLs when UI verification needed

4. **Visual Checkpoints**:
   - "✓ Expected: You should see..."
   - "✗ Error: If you see X, then..."
   - Screenshots or examples where helpful

5. **Cleanup Instructions**:
   - Stop processes
   - Clear test data
   - Reset to clean state

### Naming Conventions

- **Directory**: Feature name (e.g., `redis/`, `deployment/`)
- **Script**: `{specific-test}.sh` (no redundant prefix)
  - ✓ Good: `redis/namespace-isolation.sh`
  - ✗ Bad: `redis/test-redis-namespace-isolation.sh`

### Script Template

```bash
#!/bin/bash
# Feature: [Component Name]
# Purpose: [What this test verifies]
# Requirements: [Prerequisites]
# Duration: [Estimated time]

echo "=================================================="
echo "[Feature] - [Test Name]"
echo "=================================================="
echo ""

# Prerequisites check
echo "Step 1: Checking prerequisites..."
if ! command -v redis-cli &> /dev/null; then
    echo "❌ ERROR: Redis not installed"
    exit 1
fi
echo "✓ Prerequisites OK"
echo ""

# Test steps with clear outcomes
echo "Step 2: [Action]..."
# ... test logic ...
echo "✓ Expected: [What user should see]"
echo ""

# Interactive checkpoints
read -p "Press Enter when you've verified..."

# Cleanup
echo ""
echo "Cleanup: [Steps to reset state]"
```

## Running Manual Tests

### Individual Test

```bash
# Navigate to test directory
cd webapp/tests/manual/redis

# Run specific test
./namespace-isolation.sh
```

### All Tests in Feature Area

```bash
# Run all Redis tests
cd webapp/tests/manual/redis
for test in *.sh; do
    echo "Running $test..."
    ./"$test"
done
```

## Writing Good Manual Tests

### DO:
- ✓ Make steps clear and unambiguous
- ✓ State expected outcomes explicitly
- ✓ Include troubleshooting for common failures
- ✓ Keep tests focused on one feature
- ✓ Make scripts idempotent (safe to run multiple times)
- ✓ Clean up after yourself

### DON'T:
- ✗ Assume user knowledge (explain context)
- ✗ Skip cleanup steps
- ✗ Leave test data or processes running
- ✗ Mix unrelated test scenarios
- ✗ Use vague language ("check if it works")

## Test Categories

### Redis Tests (`redis/`)
- Multi-site namespace isolation
- Broadcast synchronization across instances
- Graceful fallback when Redis unavailable
- Cache performance and hit rates

### Deployment Tests (`deployment/`)
- Quick smoke test for new deployments
- Environment variable expansion
- Configuration validation
- PM2 ecosystem file validation

### Cluster Tests (`cluster/`)
- Multi-instance coordination
- Load balancing behavior
- Session persistence across instances
- Health check aggregation

## Contributing New Manual Tests

When adding a new manual test:

1. **Choose the right feature bucket** (or create new one)
2. **Write clear documentation** in feature README
3. **Follow naming conventions** (no redundant prefixes)
4. **Test your test** (have someone else run it)
5. **Update this index** with new test description

## Test Index

### Redis Tests
- **namespace-isolation.sh** - Multi-site Redis key isolation (1.6.2+)
- **graceful-degradation.sh** - App continues without Redis (dev only)

### Deployment Tests
- (Placeholder)

### Cluster Tests
- (Placeholder)

## Related Documentation

- **[Automated Tests](../../README.md)** - Unit and integration test documentation
- **[Cache Infrastructure](../../../docs/cache-infrastructure.md)** - Redis architecture
- **[Deployment Guide](../../../docs/deployment.md)** - Production deployment
- **[Application Cluster](../../../docs/application-cluster.md)** - Multi-instance setup

---

**Remember**: Manual tests are for scenarios that can't be automated. If a test can be automated, it should be!
