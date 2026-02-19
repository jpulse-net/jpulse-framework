# jPulse Framework / WebApp / Tests / Manual / Deployment Tests v1.6.19

## Overview

Deployment manual tests verify production-readiness scenarios:
- Environment configuration validation
- Template variable expansion
- Service health checks
- Quick smoke tests for new deployments

## Test Scenarios

### 1. Deployment Validation (`validation.sh`)

**Purpose**: Quick smoke test to verify deployment is healthy

**What it tests**:
- All required services are running (MongoDB, Redis)
- Environment variables are properly set
- Configuration files are valid
- Application starts without errors
- Health endpoints respond correctly

**Requirements**:
- Fresh deployment or updated code
- MongoDB and Redis available

**Duration**: ~3 minutes

**Key Checkpoints**:
- Application starts on configured port
- `/api/1/health/status` returns 200
- Admin login works
- Logs show no errors

## Common Deployment Issues

### Issue: "Environment variables not expanded"

**Symptoms**: Config shows `%DB_PASS%` instead of actual value

**Solution**:
- Check `.env` file exists and is loaded
- Verify `npx jpulse configure` was run
- Ensure PM2 is using ecosystem file correctly

### Issue: "MongoDB authentication failed"

**Symptoms**: App crashes on startup with auth error

**Solution**:
```bash
# Verify .env has correct credentials
cat .env | grep DB_

# Test MongoDB connection manually
mongosh -u "$DB_USER" -p "$DB_PASS" --authenticationDatabase "$DB_NAME" "$DB_NAME"
```

### Issue: "Session secret not set"

**Symptoms**: Warning about default session secret

**Solution**:
- Add `SESSION_SECRET` to `.env`
- Generate secure secret: `openssl rand -base64 32`
- Restart application

## Related Documentation

- **[Deployment Guide](../../../../docs/deployment.md)** - Full deployment process
- **[Installation](../../../../docs/installation.md)** - Environment setup
- **[Getting Started](../../../../docs/getting-started.md)** - Quick start guide
