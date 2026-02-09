#!/bin/bash
##
 # @name            jPulse Framework / WebApp / Tests / Manual / Redis / Namespace Isolation Tests
 # @tagline         Test Redis namespace isolation for multi-site deployments (W-146)
 # @description     Verifies that multiple jPulse installations properly isolate Redis data using siteId:mode namespaces
 # @file            webapp/tests/manual/redis/namespace-isolation.sh
 # @version         1.6.11
 # @release         2026-02-08
 # @repository      https://github.com/jpulse-net/jpulse-framework
 # @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 # @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 # @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 # @genai           80%, Cursor 2.5, Claude Sonnet 4.5
##

echo "=================================================="
echo "Redis Namespace Isolation Test (W-146)"
echo "=================================================="
echo ""
echo "This test verifies that Redis keys are properly namespaced with"
echo "siteId:mode prefix to prevent data mixing between installations."
echo ""
echo "Expected namespace format: \${siteId}:\${mode}:\${prefix}\${key}"
echo "Example: jpulse-framework:dev:sess:abc123"
echo ""

# Check if Redis is running
echo "Step 1: Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ ERROR: Redis is not running!"
    echo "Please start Redis first: brew services start redis"
    exit 1
fi
echo "✓ Redis is running"
echo ""

# Check current directory
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: Please run this script from the jpulse-framework root directory"
    exit 1
fi

echo "Step 2: Clearing Redis data for clean test..."
redis-cli FLUSHDB > /dev/null
echo "✓ Redis flushed (db 0)"
echo ""

echo "Step 3: Starting two instances with different siteIds..."
echo ""
echo "Instance 1: Port 8080 (siteId: 'jpulse-framework', mode: 'dev')"
echo "Instance 2: Port 8081 (siteId: 'test-site', mode: 'dev')"
echo ""
echo "Please open two terminal windows and run:"
echo ""
echo "Terminal 1:"
echo "  JPULSE_SITE_ID=jpulse-framework PORT=8080 npm start"
echo ""
echo "Terminal 2:"
echo "  JPULSE_SITE_ID=test-site PORT=8081 npm start"
echo ""
read -p "Press Enter when both instances are running..."
echo ""

echo "Step 4: Checking Redis keys..."
echo ""
echo "Keys should be namespaced by siteId and mode:"
redis-cli KEYS "*" | sort
echo ""

echo "Step 5: Expected namespaces:"
echo "- jpulse-framework:dev:* (Instance 1 on port 8080)"
echo "- test-site:dev:* (Instance 2 on port 8081)"
echo ""

echo "Step 6: Manual verification steps:"
echo ""
echo "1. Open http://localhost:8080/admin/system-status.shtml"
echo "   - Login if needed (admin/admin)"
echo "   - Click 'Check Health Metrics' button"
echo "   - Verify you see ONLY jpulse-framework instances"
echo ""
echo "2. Open http://localhost:8081/admin/system-status.shtml"
echo "   - Login if needed (admin/admin)"
echo "   - Click 'Check Health Metrics' button"
echo "   - Verify you see ONLY test-site instances"
echo ""
echo "3. Both should show their own instance counts separately"
echo ""
echo "4. Check Redis keys by namespace:"
echo "   redis-cli KEYS 'jpulse-framework:dev:*'"
echo "   redis-cli KEYS 'test-site:dev:*'"
echo ""
echo "5. Sessions should be isolated:"
echo "   - Login on port 8080 → creates jpulse-framework:dev:sess:* key"
echo "   - Login on port 8081 → creates test-site:dev:sess:* key"
echo "   - Logging out of one should NOT affect the other"
echo ""

read -p "Press Enter to check current Redis keys again..."
echo ""
echo "Current Redis keys:"
redis-cli KEYS "*" | sort
echo ""
echo "Count by namespace:"
echo "jpulse-framework:dev:* = $(redis-cli KEYS 'jpulse-framework:dev:*' | wc -l | xargs)"
echo "test-site:dev:* = $(redis-cli KEYS 'test-site:dev:*' | wc -l | xargs)"
echo ""

echo "Step 7: Testing broadcasts isolation..."
echo ""
echo "1. Open http://localhost:8080/admin/config.shtml"
echo "   - Change admin email to something unique (e.g., test1@example.com)"
echo "   - Save"
echo ""
echo "2. Check http://localhost:8080/admin/system-status.shtml"
echo "   - Verify admin email updated to test1@example.com"
echo ""
echo "3. Check http://localhost:8081/admin/system-status.shtml"
echo "   - Verify admin email DID NOT change (still default)"
echo ""
echo "This confirms broadcast messages are namespace-isolated"
echo ""

read -p "Press Enter when done testing..."
echo ""
echo "Step 8: Testing same siteId with different modes..."
echo ""
echo "Please stop instance 2 (port 8081) and restart with:"
echo "  JPULSE_SITE_ID=jpulse-framework DEPLOYMENT_MODE=prod PORT=8081 npm start"
echo ""
echo "This should create keys with namespace: jpulse-framework:prod:*"
echo "Confirming that dev and prod environments are isolated"
echo ""
read -p "Press Enter when instance 2 is restarted in prod mode..."
echo ""

echo "Current Redis keys:"
redis-cli KEYS "*" | sort
echo ""
echo "Count by namespace:"
echo "jpulse-framework:dev:* = $(redis-cli KEYS 'jpulse-framework:dev:*' | wc -l | xargs)"
echo "jpulse-framework:prod:* = $(redis-cli KEYS 'jpulse-framework:prod:*' | wc -l | xargs)"
echo ""

echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo ""
echo "✓ Phase 1: Implementation complete"
echo "  - CommonUtils.slugify() added"
echo "  - HandlebarController refactored to use slugify()"
echo "  - RedisManager.getKey() adds siteId:mode: namespace"
echo "  - site/webapp/app.conf has default siteId"
echo ""
echo "✓ Phase 2: Manual verification"
echo "  - Verify health metrics show only matching namespace instances"
echo "  - Verify sessions are isolated"
echo "  - Verify broadcasts are isolated"
echo "  - Verify dev vs prod mode isolation works"
echo ""
echo "Breaking Change Note:"
echo "All existing Redis keys will be invalidated on upgrade."
echo "Sessions cleared, cache rebuilt, metrics reset."
echo "This is acceptable for proper multi-site support."
echo ""
echo "Next Steps:"
echo "1. Run unit tests (when implemented)"
echo "2. Update documentation"
echo "3. Test on production server with multiple sites"
echo ""

# EOF webapp/tests/manual/redis/namespace-isolation.sh
