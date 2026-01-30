# jPulse Framework / WebApp / Tests / Test Framework v1.6.1

## Overview

The jPulse Framework test suite includes automated and manual tests to ensure code quality, reliability, and production-readiness.

## Test Categories

### Automated Tests

Run via `npm test` for CI/CD pipelines and regression testing.

#### Unit Tests (`unit/`)
- Component-level logic testing
- Pure function validation
- No external dependencies
- Fast execution (<100ms per test)

**Examples**:
- `unit/utils/common-utils.test.js` - Utility functions
- `unit/utils/jpulse-common.test.js` - Client-side utilities
- `unit/controllers/` - Controller logic

#### Integration Tests (`integration/`)
- Multi-component interaction testing
- Database operations
- API endpoint validation
- End-to-end workflows

**Examples**:
- API request/response cycles
- Database CRUD operations
- Session management
- Authentication flows

### Manual Tests (`manual/`)

Interactive tests for scenarios requiring human verification or multi-terminal coordination.

**See**: [Manual Testing Guide](manual/README.md)

**Categories**:
- **redis/** - Cache, broadcasts, multi-site isolation
- **deployment/** - Environment validation, smoke tests
- **cluster/** - Multi-instance behavior, load balancing

## Running Tests

### Run All Automated Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- webapp/tests/unit/utils/common-utils.test.js
```

### Run Manual Test
```bash
# Navigate to manual test directory
cd webapp/tests/manual/redis

# Run specific test
./namespace-isolation.sh
```

## Test Coverage

### What's Covered (Automated)
- ✅ Utility functions (CommonUtils, date, string)
- ✅ Schema-based queries
- ✅ Form validation
- ✅ Boolean search parsing
- ✅ Pagination logic
- ✅ Sanitization functions

### What Requires Manual Testing
- Browser UI verification
- Multi-instance coordination
- System-level integration (Redis down, MongoDB failover)
- Deployment validation
- Performance under load

## Writing Tests

### Automated Test Guidelines

**DO**:
- Write tests for all new functions
- Test edge cases and error conditions
- Mock external dependencies
- Keep tests fast (<100ms)
- Use descriptive test names

**DON'T**:
- Test implementation details
- Create brittle tests tied to internal structure
- Skip error cases
- Duplicate tests unnecessarily

### Manual Test Guidelines

**See**: [Manual Testing Standards](manual/README.md)

**Requirements**:
- Clear step-by-step instructions
- Prerequisites checking
- Expected outcomes at each step
- Cleanup procedures
- Troubleshooting guidance

## Test Framework

**Automated Tests**: Jest (or configured test runner)
- Parallel execution
- Code coverage reports
- Snapshot testing
- Mocking utilities

**Manual Tests**: Bash scripts with interactive prompts
- Cross-platform compatible (macOS, Linux)
- Prerequisites validation
- Visual checkpoint verification

## CI/CD Integration

Automated tests run on:
- Pull request validation
- Pre-merge checks
- Release validation
- Nightly builds

Manual tests run:
- Before major releases
- After infrastructure changes
- During deployment validation
- For exploratory testing

## Test Organization Philosophy

### Why Separate Automated and Manual?

**Automated tests** optimize for:
- Speed (seconds to run)
- Repeatability (same result every time)
- CI/CD integration
- Regression prevention

**Manual tests** optimize for:
- Real-world scenarios
- UI/UX validation
- System integration
- Human judgment

### Why Feature Buckets for Manual Tests?

Tests are organized by **feature** (redis/, deployment/) rather than tool type (shell/, browser/) because:
- Most tests are hybrid (shell + browser verification)
- Feature cohesion helps debugging
- Architecture context is feature-specific
- Easier to find related tests

## Related Documentation

- **[Manual Testing Guide](manual/README.md)** - Detailed manual testing standards
- **[Redis Tests](manual/redis/README.md)** - Cache, broadcasts, isolation testing
- **[Deployment Tests](manual/deployment/README.md)** - Environment validation
- **[Gen-AI Development](../../docs/genai-development.md)** - AI-assisted testing patterns

---

**Questions?** See individual test category READMEs or framework documentation.
