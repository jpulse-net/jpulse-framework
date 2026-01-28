# W-137: Send Daily License Compliance Report to jpulse.net

**Work Item**: W-137
**Version**: v1.4.17
**Date**: 2026-01-22
**Status**: 🚧 IN_PROGRESS (tests/docs pending)
**Type**: Feature - License Compliance

**Related Documents**:
- **Overall design**: `tt-T-012-license-compliance-overall-design.md` (strategic planning)
- **jpulse.net backend**: Implemented (T-012)
- **Work item tracking**: `docs/dev/work-items.md` lines 4209-4241

---

## Executive Summary

Implement daily compliance reporting from jPulse Framework deployments to jpulse.net for BSL 1.1 license compliance monitoring. This is Phase 1 (compliance-only) with monitoring features deferred to Phase 2.

**Key Decisions**:
- ✅ jpulse.net backend complete (endpoint, MongoDB, admin dashboard)
- ✅ Client-side reporting mandatory for production deployments
- ✅ Server-side compliance classification (grace periods, thresholds)
- ✅ Simple architecture: client reports, server decides compliance
- ✅ License terminology: "Business Source License 1.1 with Additional Terms"
- ✅ Config namespace: `manifest` section for license/compliance declarations
- ✅ `manifest` stored in MongoDB `ConfigModel` for cluster-wide consistency (not in `app.conf`)
- ✅ Compliance data added to existing `GET /api/1/health/metrics` (admin-only) for client-side rendering
- ✅ Scheduling with random delay to prevent peak loads

---

## Objectives

1. **Primary**: Monitor BSL 1.1 compliance during 2026-2030 period
2. **Secondary**: Identify deployments requiring commercial licensing
3. **Tertiary**: Understand deployment landscape for product development

**Out of Scope** (Phase 2):
- Real-time monitoring and downtime alerts
- Status history dashboards (basic trends only)
- Enhanced monitoring features

---

## jpulse.net Backend (COMPLETED ✅)

### Endpoint: POST /api/1/site-monitor/report

Submit daily compliance report from remote jPulse site.

**Request Body**:
```javascript
{
  // Identity
  uuid: "abc-123-def-456",              // JPULSE_SITE_UUID

  // Version info
  jpulseVersion: "1.4.15",
  siteVersion: "0.1.0",

  // Scale indicators
  users: {
    total: 17,
    admins: 2,
    active24h: 1
  },

  // Infrastructure
  deployment: {
    servers: 1,
    instances: 1,
    environment: "dev"                  // or "prod"
  },

  // Activity metrics
  activity: {
    docsUpdated24h: 1,
    pagesServed24h: 25,
    wsConnections: 0
  },

  // Plugin usage
  plugins: {
    total: 2,
    enabled: 2,
    names: ["hello-world", "auth-mfa"]  // Optional
  },

  // Contact (from config model document, if opt-in enabled)
  adminEmail: "admin@example.com",      // Empty string if not configured or no opt-in

  // Metadata
  timestamp: "2026-01-17T02:55:35.286Z",
  reportType: "daily"
}
```

**Response**:
```javascript
{
  success: true,
  message: "Report received",
  complianceStatus: "compliant",        // or "warning", "violation", "exempt-dev"
  monitorUrl: "https://jpulse.net/site-monitor/abc-123-def-456"  // Optional
}
```

**Rate Limiting**:
- Max 6 reports per IP per hour
- Max 1 report per UUID per hour (~24/day with flexibility)
- Returns 429 if exceeded

**Validation**:
- Required: uuid, jpulseVersion
- UUID format check (standard UUID v4)
- Report size limit: 10KB max

**Server-Side Processing**:
- Stores report in MongoDB (embedded array, 180-day retention)
- Classifies compliance status based on:
  - Grace period (90 days from first report)
  - Environment (dev vs prod)
  - User counts and activity levels
  - Server/instance counts
- Returns status to client for UI display

---

## jPulse Framework Implementation (IMPLEMENTED ✅)

This section reflects the **current implementation**. For source-of-truth code, see:
- `webapp/controller/health.js` (scheduler, payload, Redis state, API integration)
- `webapp/model/config.js` (`ConfigModel` schema + `ensureManifestDefaults()`)
- `webapp/view/admin/system-status.shtml` (client-side compliance UI)
- `webapp/view/admin/config.shtml` (Admin UI for `manifest.*`)

### 1. UUID Generation

**Source of truth (cluster-safe)**: MongoDB `ConfigModel` document (typically `_id: "global"`)

- Stored at: `config.global.data.manifest.compliance.siteUuid`
- Generated on startup (if missing) by `HealthController.initialize()` using:
  - `ConfigModel.ensureManifestDefaults()` (atomic, race-safe)
  - `CommonUtils.generateUuid()` (UUID v4)

**Fallback** (legacy / dev convenience):
- `process.env.JPULSE_SITE_UUID` / `process.env.JPULSE_SITE_ID`
- Hostname fallback only as last resort

---

### 2. Report Timing

**Randomized Schedule**: Each site reports at consistent but randomized time daily

**Strategy**: Store in Redis (not .env to avoid pollution)

**Initialization** (in health.js initialize method):
```javascript
static async initialize() {
  // ... existing initialization ...

  // Load admin email from config
  try {
    const defaultDocName = global.ConfigController.getDefaultDocName();
    this.globalConfig = await ConfigModel.findById(defaultDocName);
    LogController.logInfo(null, 'health.initialize', `Config loaded for compliance reporting`);
  } catch (error) {
    LogController.logError(null, 'health.initialize', `Failed to load config: ${error.message}`);
  }

  // Initialize report timing
  await this._initializeReportTiming();

  // Register for config changes (to reload admin email)
  try {
    global.RedisManager.registerBroadcastCallback('controller:config:data:changed', (channel, data, sourceInstanceId) => {
      if (data && data.id === global.ConfigController.getDefaultDocName()) {
        this.refreshGlobalConfig();
      }
    }, { omitSelf: false });
  } catch (error) {
    LogController.logError(null, 'health.initialize', `Failed to register config callback: ${error.message}`);
  }
}

/**
 * Refresh global config when it changes
 */
static async refreshGlobalConfig() {
  try {
    const defaultDocName = global.ConfigController.getDefaultDocName();
    this.globalConfig = await ConfigModel.findById(defaultDocName);
    LogController.logInfo(null, 'health.compliance', 'Config refreshed for compliance reporting');
  } catch (error) {
    LogController.logError(null, 'health.compliance', `Failed to refresh config: ${error.message}`);
  }
}

static async _initializeReportTiming() {
  const redis = global.RedisManager?.getClient('metrics');
  if (!redis) return;

  // Check if report time already set
  const existingTime = await redis.get('metrics:compliance:report_time');
  if (existingTime) {
    LogController.logInfo(null, 'health.compliance',
      `Report time already set: ${existingTime}`);
    return;
  }

  // Set randomized report time: current hour + random minute
  const now = new Date();
  const reportHour = now.getUTCHours();
  const reportMinute = Math.floor(Math.random() * 60);
  const reportTime = `${reportHour}:${String(reportMinute).padStart(2, '0')}`;

  await redis.set('metrics:compliance:report_time', reportTime);
  LogController.logInfo(null, 'health.compliance',
    `Initialized report time: ${reportTime} UTC (current hour, random minute)`);
}
```

**Checking Logic** (in health.js):
```javascript
static async _isReportTime() {
  const redis = global.RedisManager?.getClient('metrics');
  if (!redis) return false;

  const reportTime = await redis.get('metrics:compliance:report_time');
  if (!reportTime) {
    // Not initialized yet, will be set on next initialize call
    return false;
  }

  const [targetHour, targetMinute] = reportTime.split(':').map(Number);

  const now = new Date();
  const hourMatches = now.getUTCHours() === targetHour;
  const minuteWindow = Math.abs(now.getUTCMinutes() - targetMinute) < 30;

  return hourMatches && minuteWindow;
}
```

**Benefits**:
- No .env pollution (stored in Redis)
- Distributes load across 60 minutes within each hour
- Current hour makes timing predictable (no waiting 0-23 hours for first report)
- If Redis resets, gets new random time (acceptable trade-off)
- 30-minute window provides flexibility

---

### 3. Health Controller Implementation

**Location**: `webapp/controller/health.js`

**Design**:
- Client is a “dumb reporter” (sends the metrics payload).
- jpulse.net is the “smart classifier” (returns `complianceStatus` and `message`).

**Key behaviors (as implemented)**:
- **Payload**:
  - UUID from MongoDB (`config.global.data.manifest.compliance.siteUuid`) with env fallback.
  - `adminEmail` included only if `manifest.compliance.adminEmailOptIn === true`.
  - Environment uses `global.appConfig.deployment.mode` (dev/prod).
- **Scheduler**:
  - Uses Redis `metrics:compliance:report_time` (HH:MM UTC) and a ±30 min window.
  - Scheduled sends are gated by `metrics:compliance:last_scheduled_timestamp` (prevents duplicates in the same window).
  - Manual sends (`force=true`) do not block the next scheduled send.
- **State & transparency**:
  - Stores `last_report` and `last_response` JSON for Admin transparency.
  - Builds a normalized `compliance` object for `/api/1/health/metrics` (admin-only).

---

### 4. Startup Integration

**Location**: `webapp/app.js`

**Scheduling with Random Delay** (prevents peak loads):
```javascript
// Schedule compliance reporting checks (W-137)
// Check every 15 minutes, with random delay to spread load
setInterval(async () => {
  // Check if it's time to report
  if (await HealthController._isReportTime()) {
    // Add random delay 0-14 minutes to spread load across jpulse.net
    const randomDelayMs = Math.floor(Math.random() * 14 * 60 * 1000);

    setTimeout(() => {
      HealthController._sendComplianceReport();
    }, randomDelayMs);
  }
}, 15 * 60 * 1000);  // Check every 15 minutes

// Initial check after 5 minutes (avoid startup rush)
setTimeout(async () => {
  if (await HealthController._isReportTime()) {
    const randomDelayMs = Math.floor(Math.random() * 14 * 60 * 1000);
    setTimeout(() => {
      HealthController._sendComplianceReport();
    }, randomDelayMs);
  }
}, 5 * 60 * 1000);
```

**How it works together**:

1. **Initialization** (on health controller startup):
   - Health controller `initialize()` is called
   - Checks Redis for `metrics:compliance:report_time`
   - If not set: generates random time using current hour + random minute (0-59)
   - Stores in Redis: `metrics:compliance:report_time` = "14:23" (example)
   - Registers for config changes to reload admin email

2. **Periodic Check** (every 15 minutes via setInterval):
   - Checks `_isReportTime()` - is current time within 30-min window of scheduled time?
   - If YES: schedules send with random delay (0-14 min)
   - If NO: silently returns, waits for next check

3. **Actual Send** (after random delay):
   - `_sendComplianceReport()` is called
   - Calls `_shouldSendReport()` which verifies:
     - Not already reported in last 24h
     - Not in backoff period (for previous failures)
   - If checks pass: builds payload and sends to jpulse.net
   - Records response and timestamp

4. **Timing Example**:
   - Report time set to: 14:23 UTC
   - Check at 14:15: Not in window (14:23 ±30min), skip
   - Check at 14:30: IN window! Generate random delay: 7 minutes
   - Send at 14:37: Actual report sent
   - Check at 14:45: Already sent today, skip

**Why random delay prevents peaks**:
- Without delay: All sites checking at :00, :15, :30, :45 could send simultaneously
- With 0-14 min delay: Sends spread across full 15-minute period
- jpulse.net receives steady stream instead of bursts
- Load distributed across 60 minutes within each hour

**Why 15-minute checks**:
- With 30-minute window, checking every 15 minutes ensures we hit the window
- Not too frequent (4 checks per hour vs 60 checks per hour)
- Simple, reliable scheduling without cron complexity

---

### 5. State Storage

**Technology**: Redis (primary, no file fallback needed)

**Redis Key Convention**: Following app.conf `connections.metrics.keyPrefix: 'metrics:'`

**Redis Keys**:
- `metrics:compliance:report_time` - Scheduled report time (HH:MM format, set once at init)
- `metrics:compliance:last_report` - Full JSON of last report sent to jpulse.net
- `metrics:compliance:last_timestamp` - Timestamp of last successful report (manual or scheduled; ms since epoch)
- `metrics:compliance:last_scheduled_timestamp` - Timestamp of last scheduled report (used to prevent duplicates in a scheduled window)
- `metrics:compliance:last_response` - Full response object from jpulse.net (complianceStatus, message, etc.)
- `metrics:compliance:retry_count` - Number of consecutive failures
- `metrics:compliance:next_attempt` - Timestamp of next retry attempt (for exponential backoff)

**Key Design Decisions**:
- Follows existing convention: `metrics:` prefix for health/metrics-related data
- Not using broadcast channels (these are stored values, not pub/sub messages)
- Stores full report for transparency (admins can view what was sent)
- Stores full response object (simpler than separate `last_status`, `last_message` fields)
- Response fields accessed as: `lastResponse.complianceStatus`, `lastResponse.message`

**No TTL**: State persists across restarts (intentional)

**Fallback**: If Redis unavailable, returns defaults (will retry sooner than ideal, but won't break)

---

### 6. Manifest Configuration (MongoDB `ConfigModel`)

**Source of truth**: MongoDB config document (typically `_id: "global"`) at:
- `config.global.data.manifest.license` (key, tier)
- `config.global.data.manifest.compliance` (siteUuid, adminEmailOptIn)

**Why MongoDB (cluster-safe)**:
- App clusters must have a single, consistent `siteUuid` and opt-in state.
- `ConfigModel.ensureManifestDefaults()` initializes missing fields from schema defaults atomically.

**Admin UI**:
- Edit via **Admin Dashboard → Site Configuration → Manifest** (`webapp/view/admin/config.shtml`).

**Security**:
- `data.manifest.license.key` is filtered in `ConfigModel._meta.contextFilter` and never exposed to clients (even admins).

---

### 7. Handlebars Context Integration (REMOVED)

Compliance is **not** provided via Handlebars context.

Instead:
- `GET /api/1/health/metrics` includes `data.compliance` for **admins only**
- `/admin/system-status.shtml` renders the compliance section client-side from the metrics response
- `_getComplianceState()` just reads from Redis (fast)
- Not expensive enough to require separate API
- Cached by Redis, no database queries
- Only computed for authenticated admins

---

### 8. Admin UI Display

**Location**: `webapp/view/admin/system-status.shtml`

**Design**: Always show compliance section for transparency and trust

**Compliance Section** (always visible):
```handlebars
<!-- License Compliance Reporting (W-137) -->
<div class="system-section">
  <h2>License Compliance Reporting</h2>

  {{#if (eq compliance.status.value "warning")}}
  <div class="alert alert-warning">
    <h3>⚠️ License Compliance Notice</h3>
    <p>{{compliance.status.message}}</p>
    <p>
      <a href="mailto:team@jpulse.net" class="btn btn-secondary">
        Contact Licensing Team
      </a>
    </p>
  </div>
  {{/if}}

  {{#if compliance.reportingFailed}}
  <div class="alert alert-info">
    <h3>ℹ️ Compliance Reporting Unavailable</h3>
    <p>
      Unable to send compliance reports to jpulse.net for
      {{compliance.reportingFailed.hours}} hours.
    </p>
    <p>
      <strong>Air-gapped deployment?</strong> Contact
      <a href="mailto:team@jpulse.net">team@jpulse.net</a>
      for alternative licensing arrangements.
    </p>
    <p>
      <small>
        Retrying with exponential backoff. Next attempt in
        {{compliance.reportingFailed.nextRetryHours}} hours.
      </small>
    </p>
  </div>
  {{/if}}

  <div class="compliance-status {{compliance.status.alertClass}}">
    <h3>
      {{#if (eq compliance.status.value "compliant")}}✓{{/if}}
      {{#if (eq compliance.status.value "warning")}}⚠️{{/if}}
      {{#if (eq compliance.status.value "exempt-dev")}}ℹ️{{/if}}
      Compliance Status: <strong>{{compliance.status.display}}</strong>
    </h3>

    <div class="compliance-info">
      {{#if compliance.timing.reportTime}}
        <p><strong>Scheduled report time:</strong> {{compliance.timing.reportTime}} UTC daily</p>
      {{/if}}

      {{#if compliance.timing.lastTimestamp}}
        <p><strong>Last report sent:</strong> {{compliance.timing.lastReportDisplay}}</p>
        <p><strong>Next report:</strong> {{compliance.timing.nextReportDisplay}}</p>
      {{else}}
        <p><em>No reports sent yet (will send at next scheduled time)</em></p>
      {{/if}}

      {{#if compliance.monitorUrl}}
        <p>
          <a href="{{compliance.monitorUrl}}" target="_blank" class="btn btn-primary">
            View Deployment Dashboard →
          </a>
        </p>
      {{/if}}
    </div>

    {{#if compliance.lastReport}}
    <details class="compliance-report-details">
      <summary>View Latest Compliance Report Sent</summary>
      <pre class="compliance-report-json">{{compliance.lastReportFormatted}}</pre>
      <p class="text-muted">
        <small>
          This is the anonymous usage data sent to jpulse.net for license compliance verification.
          For details, see <a href="https://jpulse.net/legal/privacy.shtml" target="_blank">Privacy Policy</a>.
        </small>
      </p>
    </details>
    {{/if}}
  </div>
</div>
```

**CSS Additions** (for collapsible widget):
```css
.compliance-report-details {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
}

.compliance-report-details summary {
  cursor: pointer;
  font-weight: bold;
  user-select: none;
}

.compliance-report-details summary:hover {
  color: #0066cc;
}

.compliance-report-json {
  margin-top: 1rem;
  padding: 1rem;
  background: #2d2d2d;
  color: #f8f8f8;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

.compliance-status.alert-success {
  border-left: 4px solid #28a745;
}

.compliance-status.alert-warning {
  border-left: 4px solid #ffc107;
}

.compliance-status.alert-info {
  border-left: 4px solid #17a2b8;
}
```

**Data Structure**:

Compliance data is provided via `/api/1/health/metrics` API response as `data.compliance`:

```javascript
{
  success: true,
  data: {
    timestamp: "...",
    statistics: { ... },
    servers: [ ... ],
    compliance: {                    // W-137: Only included for admins
      status: 'compliant',           // Status code from server response
      message: '',                   // Optional message from server
      reportTime: '14:23',           // Scheduled time (HH:MM UTC)
      lastReportTimestamp: 1737461015286,  // ms since epoch
      nextReportTimestamp: 1737547415286,  // ms since epoch
      retryCount: 0,                 // Consecutive failure count
      hoursSinceReport: 24,          // Hours since last report (or null)
      hoursUntilRetry: 6,            // Hours until next retry (only if failed)
      reportingFailed: true|false,   // true if hoursSinceReport > 48
      lastReport: { /* full report object */ },
      lastResponse: { /* full response object */ },
      monitorUrl: 'https://jpulse.net/site-monitor/uuid' // or '' if not available
    }
  }
}
```

**Implementation Location**:
- Method: `webapp/controller/health.js` → `_getComplianceData()` (private)
- Called from: `webapp/controller/health.js` → `metrics()` endpoint (line ~381)
- Auth check: Only included for admins (checked in metrics endpoint)
- Rendering: Client-side JavaScript in `system-status.shtml` → `renderCompliance()`

**JavaScript Rendering** (`webapp/view/admin/system-status.shtml`):

The compliance section is rendered client-side (consistent with all other system-status content):

```javascript
renderCompliance() {
    const compliance = this.data?.compliance;
    if (!compliance || !compliance.status) {
        this.elements.complianceSection.classList.add('jp-hidden');
        return;
    }

    // Build HTML with:
    // - Status icons and text (✓, ⚠️, ℹ️, ❌)
    // - Warning banner (if status === 'warning')
    // - Reporting failed notice (if reportingFailed === true)
    // - Scheduled time, last/next report timestamps
    // - Monitor URL link (if monitorUrl not empty)
    // - Collapsible details with Request/Response side-by-side

    this.elements.complianceSection.innerHTML = html;
}
```

**Transparency Widget**:

Shows Request and Response side-by-side in collapsible `<details>` element:
- Desktop: 2-column grid layout
- Mobile: Stacked (1 column) via `@media (max-width: 768px)`
- JSON formatted with syntax highlighting
- Privacy policy link included
            <span class="jp-metric-value">{{compliance.reportTime}} UTC daily</span>
        </div>
        {{/if}}

        {{#if compliance.lastReportTimestamp}}
        <div class="jp-metric-row">
            <span class="jp-metric-label">Last Report Sent</span>
            <span class="jp-metric-value">
                {{date.format compliance.lastReportTimestamp format="%DATETIME%" timezone="browser"}}
            </span>
        </div>
        <div class="jp-metric-row">
            <span class="jp-metric-label">Next Report</span>
            <span class="jp-metric-value">
                {{date.format compliance.nextReportTimestamp format="%DATETIME%" timezone="browser"}}
            </span>
        </div>
        {{else}}
        <div class="jp-metric-row">
            <span class="jp-metric-label">Status</span>
            <span class="jp-metric-value"><em>No reports sent yet</em></span>
        </div>
        {{/if}}

        {{#if compliance.monitorUrl}}
        <div class="jp-metric-row">
            <span class="jp-metric-label">Deployment Dashboard</span>
            <span class="jp-metric-value">
                <a href="{{compliance.monitorUrl}}" target="_blank" class="jp-btn jp-btn-primary">
                    View Dashboard →
                </a>
            </span>
        </div>
        {{/if}}
    </div>

    <!-- Transparency: Show Last Report -->
    {{#if compliance.lastReport}}
    <details style="margin-top: 1.5rem; padding: 1rem; border: 1px solid var(--jp-theme-border-color); border-radius: 6px;">
        <summary style="cursor: pointer; font-weight: bold;">
            View Latest Compliance Report Sent
        </summary>
        <pre style="margin-top: 1rem; padding: 1rem; background: #2d2d2d; color: #f8f8f8; border-radius: 4px; overflow-x: auto; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.875rem; line-height: 1.5;">{{compliance.lastReport}}</pre>
        <p style="margin-top: 0.5rem; color: var(--jp-theme-text-muted); font-size: 0.875rem;">
            <small>
                Anonymous usage data sent to jpulse.net for license compliance.
                <a href="https://jpulse.net/legal/privacy.shtml" target="_blank">Privacy Policy</a>
            </small>
        </p>
    </details>
    {{/if}}

</div>
{{/if}}
```

**Notes**:
- No custom CSS needed - uses existing `jp-*` classes
- Dates formatted using Handlebars date helpers (converts to browser timezone)
- Dashboard link only shown if admin opted-in AND UUID exists
- Full report JSON displayed for transparency

---

### 7. Configure Script Message

**Location**: `bin/configure.js`

**Message** (at end of configuration):
```bash
echo ""
echo "==================================================================="
echo "jPulse Framework - License Compliance"
echo "==================================================================="
echo ""
echo "jPulse Framework is licensed under Business Source License 1.1"
echo "with Additional Terms (Section 11: Usage Reporting)."
echo ""
echo "Production deployments send daily anonymous usage reports to"
echo "jpulse.net for license compliance verification."
echo ""
echo "Reports include: deployment metrics, version info, user counts"
echo "Reports do NOT include: user data, content, or sensitive information"
echo ""
echo "Site UUID: ${JPULSE_SITE_UUID}"
echo "Reporting time: ${JPULSE_COMPLIANCE_REPORT_TIME} UTC daily"
echo ""
if [ -n "${ADMIN_EMAIL}" ]; then
  echo "Admin email: ${ADMIN_EMAIL}"
  echo "View deployment trends at:"
  echo "  https://jpulse.net/site-monitor/${JPULSE_SITE_UUID}"
  echo ""
fi
echo "For details: https://jpulse.net/legal/privacy.shtml"
echo "Questions: team@jpulse.net"
echo ""
```

---

## License Amendment

### Terminology Decision

**Use**: "Business Source License 1.1 with Additional Terms"

**NOT**:
- ❌ "Additional Use Grant" (BSL parameter for granting permissions, not restrictions)
- ❌ "amended BSL" (implies modification of standard text)
- ❌ "extended BSL" (informal, unclear)

### LICENSE File Structure

```
Business Source License 1.1

[... standard BSL 1.1 text sections 1-10 ...]

---

Additional Terms

Section 11: USAGE REPORTING

[... compliance reporting requirements from T-012 doc ...]
```

**Status**: Pending legal review before addition to LICENSE

---

## Configuration Options

### No Disable Setting

**Decision**: Compliance reporting is MANDATORY per license, no config option to disable

**Rationale**:
- License Section 11 makes it mandatory for production deployments
- Allowing disable defeats compliance monitoring purpose
- Can't verify BSL 1.1 compliance if users can opt-out
- Shows we're serious about license terms

### Natural Exemptions

**Built into design** (no config needed):

1. **Development environments**: Reports sent but classified as "exempt-dev" on server
2. **Post-2030 AGPL**: Automatic (license conversion removes requirement)
3. **Air-gapped**: Fails gracefully, manual arrangement process

### Configuration Reference

**Environment Variables** (.env):
- `JPULSE_SITE_UUID` - Site UUID generated during setup
- `JPULSE_SITE_ID` - Fallback identifier
- `NODE_ENV` - Used to determine environment (dev/production)

**app.conf** (manifest section):
- `manifest.license.key` - Commercial license key (empty for BSL)
- `manifest.license.tier` - License tier (bsl|commercial|enterprise)
- `manifest.compliance.adminEmailOptIn` - Opt-in flag for sharing admin email

**Redis Keys** (metrics: prefix):
- `metrics:compliance:report_time` - Randomized schedule (HH:MM UTC)
- `metrics:compliance:last_report` - Full report JSON sent
- `metrics:compliance:last_timestamp` - Timestamp of last report (ms)
- `metrics:compliance:last_response` - Full response object from jpulse.net
- `metrics:compliance:retry_count` - Consecutive failure count
- `metrics:compliance:next_attempt` - Next retry timestamp (ms)

**Config Model**:
- `ConfigModel.findById('global')` → `adminEmail` field

---

## Manual Compliance Report Send

### API Endpoint

**Route**: `POST /api/1/health/compliance/send-report`

**Purpose**: Manually trigger a compliance report send (bypasses 24-hour timing)

**Authorization**: Admin-only

**Use Cases**:
1. **Initial setup testing** - Verify jpulse.net connectivity after configure
2. **Troubleshooting** - Debug failed automated reports
3. **Immediate updates** - Send fresh data after configuration changes
4. **Air-gapped deployments** - Manual trigger before exporting logs

**Usage**:
```javascript
// Browser console:
fetch('/api/1/health/compliance/send-report', { method: 'POST' })
  .then(r => r.json())
  .then(data => console.log('Response:', data))

// cURL:
curl -X POST http://localhost:8080/api/1/health/compliance/send-report \
  -H "Cookie: connect.sid=..."
```

**Success Response**:
```json
{
  "success": true,
  "message": "Compliance report sent successfully",
  "data": {
    "complianceStatus": "warning",
    "message": "Development deployment - monitoring only"
  }
}
```

**Error Responses**:
- `403 FORBIDDEN` - Not authorized (admin required)
- `500 SEND_FAILED` - Report returned null (network/payload issue)
- `500 SEND_ERROR` - Exception during send (details included)

**Implementation**:
- Method: `health.js` → `sendComplianceReport(req, res)`
- Calls: `_sendComplianceReport(req, true)` with force flag
- Logging: Uses `CommonUtils.sendError()` for consistent error handling

---

## Deployment Dashboard Access

**URL Format**: `https://jpulse.net/site-monitor/[uuid]`

### Authentication (OTP)

**Flow**:
1. Visit monitor URL (public)
2. See: "Enter admin email to view dashboard"
3. Enter email → Click "Login with Email"
4. jpulse.net validates email matches report for this UUID
5. If match: Send email with OTP link
6. OTP link: `https://jpulse.net/site-monitor/[uuid]?token=12345678`
7. Click link → Validate OTP (1hr expiry) → Show dashboard
8. Invalid/expired: "Session expired or invalid"

**Note**: This is jpulse.net work item, not W-137

### Dashboard Features

**Phase 1** (basic):
- Deployment info (version, environment, servers)
- User count trends (7-day, 30-day)
- Activity metrics (pages served, docs updated)
- Plugin list
- Report history (last 30 days)

**Phase 2** (future):
- Comparative analytics (vs community averages)
- Health trends
- Version upgrade recommendations

---

## Air-Gapped Deployments

### Handling Strategy

**Multi-layered approach**:

1. **Exponential Backoff** (automatic):
   - Failures: 1min → 5min → 30min → 1hr → 6hr → 24hr (max)
   - Keeps trying but reduces frequency
   - Doesn't spam logs

2. **Admin Notification** (after 48h):
   - Warning in /admin/system-status.shtml
   - Shows hours since last report
   - Links to contact email

3. **Manual Arrangement** (on request):
   - Admin contacts team@jpulse.net
   - Provide deployment details manually
   - Receive documented exemption
   - No special .env variable needed (license exception, not technical toggle)

4. **License Coverage**:
   - Section 11.5 already addresses air-gapped deployments
   - "Contact team@jpulse.net for alternative arrangements"
   - Good faith failures not violations

---

### Manual Testing Results ✅

**Date**: 2026-01-21

**Test Case**: Manual report send via API

**Command**:
```javascript
fetch('/api/1/health/compliance/send-report', { method: 'POST' })
```

**Results**:
- ✅ Report sent successfully to jpulse.net
- ✅ Response: `{ complianceStatus: "warning", message: "Report received" }`
- ✅ Report stored in Redis (last_report, last_response, last_timestamp)
- ✅ UI displays correctly on /admin/system-status.shtml:
  - Status: "Warning - May Require Commercial License"
  - Scheduled time: shown as local HH:MM (converted from scheduled HH:MM UTC)
  - Last report timestamp formatted to browser timezone
  - Next report shows next scheduled occurrence (not "last + 24h")
  - Collapsible details showing Request/Response side-by-side
  - Responsive layout working (desktop 2-col, mobile 1-col)

**Payload Validation**:
```json
{
  "uuid": "fallback-MacBook-Pro-4.local",
  "jpulseVersion": "1.4.16",
  "siteVersion": "0.1.0",
  "users": { "total": 17, "admins": 2, "active24h": 1 },
  "deployment": { "servers": 1, "instances": 1, "environment": "dev" },
  "activity": { "docsUpdated24h": 0, "pagesServed24h": 24, "wsConnections": 0 },
  "plugins": { "total": 2, "enabled": 2, "names": ["hello-world", "auth-mfa"] },
  "adminEmail": "",
  "timestamp": "2026-01-21T09:24:20.264Z",
  "reportType": "daily"
}
```

**jpulse.net Backend Log**:
```
siteMonitor.apiPostReport: success: report stored for fallback-MacBook-Pro-4.local (warning) in 35ms
```

---

## Testing Strategy

### Local Development

1. **Test endpoint**: Point to staging before production
   ```javascript
   const endpoint = process.env.JPULSE_COMPLIANCE_ENDPOINT ||
                    'https://jpulse.net/api/1/site-monitor/report';
   ```

2. **Mock responses**: Test success, warning, violation status handling

3. **Failure scenarios**:
   - Network timeout
   - 429 rate limit
   - Invalid UUID
   - Server 500 error

### Integration Testing

1. Configure with test UUID
2. Trigger report manually (bypass timing)
3. Verify payload structure
4. Check Redis state updates
5. Verify UI displays warnings correctly

### Production Rollout

1. **Phase 1**: Soft launch (v1.4.17)
   - Enable reporting
   - Monitor jpulse.net for issues
   - Observe failure patterns

2. **Phase 2**: Communication (90 days later)
   - Announce in release notes
   - Update documentation
   - Email known deployments

3. **Phase 3**: Enforcement (after grace period)
   - Reach out to non-compliant deployments
   - Offer commercial licensing
   - Handle special cases

---

## Implementation Checklist

### Step 1: Manifest Storage (MongoDB `ConfigModel`) ✅ COMPLETE
- [x] Add `data.manifest` schema to `webapp/model/config.js` (license + compliance)
- [x] Implement `ConfigModel.ensureManifestDefaults()` (schema-driven, atomic, race-safe)
- [x] Ensure `manifest.compliance.siteUuid` is generated/persisted on startup (cluster-consistent)
- [x] Filter `data.manifest.license.key` via `_meta.contextFilter` (never exposed)

### Step 2: Configure Script ✅ COMPLETE
- [x] Add JPULSE_SITE_UUID to config-registry.js (auto-generated via crypto.randomUUID())
- [x] Add JPULSE_LICENSE_ACCEPTANCE prompt (mandatory, exits if not accepted)
- [x] Add JPULSE_ADMIN_EMAIL_OPT_IN prompt (optional, for dashboard access)
- [x] Update env.tmpl with JPULSE_SITE_UUID placeholder
- [x] Update compliance notice in configure.js (symmetric opt-in/opt-out display)
- [x] Show monitor URL only if opted-in
- [x] Display where to change opt-in setting (Admin Dashboard → Site Configuration → manifest.compliance.adminEmailOptIn)

### Step 3: Health Controller Implementation ✅ COMPLETE
- [x] Add `import ConfigModel` and `static globalConfig`
- [x] Update `initialize()` to load ConfigModel into globalConfig
- [x] Implement `_initializeReportTiming()` with Redis storage (randomized HH:MM UTC)
- [x] Register broadcast callback for `controller:config:data:changed`
- [x] Add `refreshGlobalConfig()` method to reload on config changes
- [x] Implement `_isReportTime()` with 30min window, reads from Redis
- [x] Implement `_shouldSendReport()` with state checks (24h interval, backoff)
- [x] Implement `_buildCompliancePayload()` checking `manifest.compliance.adminEmailOptIn`
- [x] Use `global.appConfig.deployment.mode` for environment (not NODE_ENV)
- [x] Use `global.appConfig.app.jPulse.version` and `app.site.version` for versions
- [x] Implement `_sendComplianceReport(req, force)` with fetch and User-Agent header
- [x] Add `force` parameter to bypass time checks (for manual API)
- [x] Implement `_recordReportSent()` storing full response object + report + timestamp
- [x] Implement `_handleReportFailure()` with exponential backoff and logging
- [x] Implement `_getComplianceState()` reading all Redis keys and parsing JSON
- [x] Implement `_getComplianceData()` building final data structure for API
- [x] Use correct endpoint: `https://jpulse.net/api/1/site-monitor/report`
- [x] Use `metrics:compliance:*` prefix for all Redis keys
- [x] Add public `initializeComplianceScheduler()` method (encapsulates scheduling)
- [x] Use `LogController.logInfo()` and `logWarning()` (not log/logWarn)

### Step 4: Bootstrap Integration ✅ COMPLETE
- [x] Call `HealthController.initializeComplianceScheduler()` from bootstrap.js
- [x] Place after HealthController.initialize() at Step 11.1
- [x] Skip in test environments
- [x] Use 15-minute check interval with `_isReportTime()` check
- [x] Add random delay (0-14 min) after positive check to spread load
- [x] Add 5-minute delayed initial check with random delay

### Step 5: Handlebars Integration ✅ COMPLETE (SIMPLIFIED)
- [x] Remove compliance from Handlebars baseContext (not needed)
- [x] Compliance now delivered via /api/1/health/metrics API
- [x] Client-side rendering in system-status.shtml (consistent with other content)

### Step 6: Admin UI Template ✅ COMPLETE
- [x] Add compliance section to system-status.shtml (client-side rendering)
- [x] Add `<div id="complianceSection">` placeholder
- [x] Add `complianceSection` to cacheDOMElements()
- [x] Implement `renderCompliance()` JavaScript method (~135 lines)
- [x] Add to render() method call chain
- [x] Build status icons map (✓, ⚠️, ℹ️, ❌)
- [x] Add warning banner (only if status === "warning")
- [x] Add reporting failed notice (only if reportingFailed === true)
- [x] Display compliance status with icons and human-readable text
- [x] Display scheduled report time as local HH:MM (derived from scheduled HH:MM UTC)
- [x] Display last/next report timestamps using jPulse.date helpers
- [x] Display dashboard link only if monitorUrl is not empty
- [x] Add collapsible `<details>` widget with Request/Response side-by-side
- [x] Add responsive grid layout (2-col desktop, 1-col mobile)
- [x] Add transparency text and privacy policy link
- [x] Use local page CSS for the collapsible details widget (no global CSS pollution)

### Step 6.1: Manual Send API ✅ COMPLETE
- [x] Add `sendComplianceReport(req, res)` public API method
- [x] Add admin authorization check
- [x] Add `force` parameter to `_sendComplianceReport(req, force)`
- [x] Register route: `POST /api/1/health/compliance/send-report`
- [x] Use `CommonUtils.sendError()` for all error responses
- [x] Return success with response data

### Step 7: Documentation
- [ ] Update README with license wording
- [ ] Add LICENSE Section 11 (after legal review)
- [ ] Update setup guide with compliance notice
- [ ] Document monitor dashboard access

### Step 8: Testing
- [x] Manual testing: Verify compliance section display in system-status
- [x] Manual testing: Trigger report and verify payload
- [x] Manual testing: Verify Redis state persistence
- [x] Manual testing: Verify UI rendering with Request/Response details
- [ ] Manual testing: Configure flow with opt-in/opt-out
- [ ] Manual testing: Verify UUID generation during configure
- [ ] Unit tests: HealthController compliance methods
- [ ] Unit tests: _getComplianceData() with auth checks
- [ ] Unit tests: Timing randomization
- [ ] Unit tests: Payload building
- [ ] Unit tests: Failure handling and backoff
- [ ] Integration tests: Full report flow
- [ ] Integration tests: Redis state persistence
- [ ] Integration tests: UI rendering with different states

---

## Pending Gaps / Follow-ups (as of 2026-01-22)

### Must-do
- Unit tests for W-137 compliance scheduling + state:
  - `_isReportTime()`, `_shouldSendReport()` (window gating and `last_scheduled_timestamp`)
  - `_getComplianceData()` (next scheduled timestamp behavior, admin-only data exposure)
  - Manual send path (`force=true`) and scheduled vs manual behavior
- Documentation (Step 7):
  - README updates
  - LICENSE Section 11 (legal review)
  - Setup guide + monitor dashboard access

### Should-do
- Manual testing updates:
  - Document that “Next Report” is the next scheduled occurrence (not “last + 24h”)
  - Validate manual send does not delay the next scheduled send
- Backward-compat / cleanup review:
  - Confirm whether `JPULSE_SITE_UUID` in `templates/deploy/env.tmpl` remains required or is now purely fallback (MongoDB manifest is the primary source)

### Bugs Fixed During Implementation

1. **Missing method**: `_getComplianceState()` - added full Redis read implementation
2. **Wrong static context**: `this._getComplianceState()` → `HealthController._getComplianceState()` (2 places)
3. **Wrong log methods**: `logWarn()` → `logWarning()` (2 places)
4. **Wrong log method**: `log()` → `logInfo()` (1 place)
5. **Wrong version paths**: `global.appPackage.version` → `global.appConfig.app.jPulse.version` (2 places)
6. **Wrong site version**: `global.sitePackage?.version` → `global.appConfig.app.site?.version`
7. **Wrong endpoint**: `/api/1/compliance/report` → `/api/1/site-monitor/report`
8. **Wrong environment**: `process.env.NODE_ENV` → `global.appConfig.deployment.mode`
9. **Wrong response field**: `response.complianceMessage` → `response.message` (user fix)
10. **Empty object check**: Added fallback `lastReport: {} || {}` (user fix)

---

## Open Questions

None - all major decisions made during design discussion.

**Ready for implementation** pending:
1. Legal review of LICENSE Section 11 language
2. Privacy policy creation at jpulse.net/legal/privacy.shtml
3. Terms of service at jpulse.net/legal/terms-of-service.shtml

---

## References

- **Overall design**: `tt-T-012-license-compliance-overall-design.md`
- **Work item**: `docs/dev/work-items.md` lines 4209-4241
- **Health controller**: `webapp/controller/health.js`
- **Metrics system**: `webapp/utils/metrics-registry.js`
- **Cursor log**: 2026-01-16 to 2026-01-21 sessions

---

**Document Status**: Steps 1-6.1 implementation complete, manual testing successful ✅
**Last Updated**: 2026-01-21
**Next Actions**:
1. Unit tests for HealthController compliance methods
2. Configure flow testing (UUID generation, opt-in prompts)
3. Documentation updates (README, LICENSE Section 11)
