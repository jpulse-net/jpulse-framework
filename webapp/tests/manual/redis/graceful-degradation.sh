#!/bin/bash
##
 # @name            jPulse Framework / WebApp / Tests / Manual / Redis / Graceful Degradation Tests
 # @tagline         Test Redis graceful degradation (dev environment only)
 # @description     Tests that the application continues working WITHOUT Redis (single-instance mode)
 # @file            webapp/tests/manual/redis/graceful-degradation.sh
 # @version         1.6.7
 # @release         2026-02-04
 # @repository      https://github.com/jpulse-net/jpulse-framework
 # @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 # @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 # @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 # @genai           80%, Cursor 2.5, Claude Sonnet 4.5
##

echo "=== Redis Graceful Degradation Test (Dev Environment Only) ==="
echo ""

echo "1. Check current Redis status..."
redis-cli ping 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✓ Redis is currently running"
    REDIS_WAS_RUNNING=1
else
    echo "   ✗ Redis is NOT running"
    REDIS_WAS_RUNNING=0
fi
echo ""

echo "2. Stop Redis..."
brew services stop redis
sleep 2
redis-cli ping 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✗ Redis still running - try: redis-cli shutdown"
    exit 1
else
    echo "   ✓ Redis stopped successfully"
fi
echo ""

echo "3. Start your local jPulse app (in another terminal)..."
echo "   cd ~/Dev/jpulse-framework"
echo "   npm start"
echo ""
read -p "Press Enter after app is started and you see 'Server running'..."

echo ""
echo "4. Test config change WITHOUT Redis..."
echo "   - Go to http://localhost:8080/admin/config.shtml"
echo "   - Login if needed"
echo "   - Change admin email to: test+fallback@example.com"
echo "   - Click Save"
echo "   - Check terminal logs for:"
echo "     ✓ 'Broadcast handled locally (Redis unavailable)'"
echo "     ✓ 'health.compliance Config refreshed for compliance reporting'"
echo "     ✓ 'handlebar.refreshGlobalConfig Default config refreshed'"
echo ""
read -p "Press Enter after testing config change..."

echo ""
echo "5. Verify compliance report uses new data..."
echo "   - Go to http://localhost:8080/admin/system-status.shtml"
echo "   - Click 'Send Compliance Report Now' (it won't actually send)"
echo "   - Check response has NEW email (test+fallback@example.com)"
echo ""
read -p "Press Enter after testing compliance report..."

echo ""
echo "6. Test WebSocket without Redis..."
echo "   - Go to http://localhost:8080/hello-websocket/"
echo "   - Try sending an emoji"
echo "   - Should work (local only, no multi-instance)"
echo ""
read -p "Press Enter after testing WebSocket..."

echo ""
echo "7. Restart Redis..."
if [ $REDIS_WAS_RUNNING -eq 1 ]; then
    brew services start redis
    sleep 2
    redis-cli ping 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "   ✓ Redis restarted successfully"
    else
        echo "   ✗ Redis failed to restart - check: brew services list"
    fi
else
    echo "   (Redis was not running before test - leaving stopped)"
fi

echo ""
echo "=== Test Complete ==="
echo ""
echo "What you should have seen:"
echo "  ✓ App starts with 'Redis connections created' + 'Available: false'"
echo "  ✓ Config changes trigger 'Broadcast handled locally'"
echo "  ✓ Both HealthController and HandlebarController callbacks fired"
echo "  ✓ Compliance report has correct data"
echo "  ✓ No Redis errors (graceful fallback)"
echo ""
echo "If all passed, the fallback system works correctly!"


# EOF webapp/tests/manual/redis/graceful-degradation.sh
