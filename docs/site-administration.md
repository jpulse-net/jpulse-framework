# jPulse Docs / Site Administration v1.4.17

Complete guide to managing your jPulse site through the admin interface.

## Overview

The jPulse Framework provides a comprehensive admin interface at `/admin/` for managing site configuration, users, plugins, and system monitoring.

### Configuration Types

jPulse uses two distinct configuration systems:

1. **Site Configuration** (MongoDB-based):
   - Admin-managed settings stored in MongoDB
   - Accessible via `/admin/config.shtml` interface
   - Includes: email settings, broadcast messages, and site manifest (license/compliance settings)
   - **Dynamic Updates**: Changes take effect immediately without restarts
   - **Per-Deployment**: Different settings for dev/staging/production
   - **Admin UI**: Intuitive interface for non-technical administrators

2. **Application Configuration** (File-based):
   - Framework and application defaults in `webapp/app.conf`
   - Can be overridden in `site/webapp/app.conf`
   - Includes: framework settings, view configuration, middleware settings
   - **Static**: Requires application restart for changes
   - **Developer-Focused**: JavaScript configuration files
   - See [Site Customization Guide](site-customization.md) for details

### Key Features

- **Site Configuration**: Email settings, broadcast messages, and site-wide preferences
- **User Management**: User accounts, roles, and profile management
- **Plugin Management**: Install, configure, enable/disable plugins
- **System Monitoring**: Health metrics, logs, WebSocket status, and system status
- **Real-Time Updates**: Site configuration changes take effect immediately

---

## Site Configuration (MongoDB)

Access the site configuration page at `/admin/config.shtml` to manage site-wide settings.

### Email Configuration

Configure SMTP settings for sending emails from your jPulse application. See the [Sending Email Guide](sending-email.md) for complete documentation including:

- SMTP server configuration
- Provider-specific setup (Gmail, SendGrid, AWS SES, Office 365, Mailgun)
- Test email functionality
- Template support

### Broadcast Message Configuration

Configure site-wide messages that are shown to all users with a prominent yellow banner positioned below the header.

1. **Enable Broadcast Message**: Check the box to activate the broadcast system
2. **Broadcast Message**: Enter your message content (HTML supported)
3. **Nag Time (hours)**: How long before a minimized message auto-reopens
   - Options: 0 (disable), 1, 2, 4, 8 hours
   - Default: 4 hours
4. **Auto-Disable Time (hours)**: Automatically disable message after N hours
   - Options: 0 (no auto-disable), 1, 2, 4, 8, 12, 24, 48 hours
   - Default: 0 (disabled)

### Manifest (License, Compliance, Monitoring)

The **Manifest** section in `/admin/config.shtml` manages license and compliance-related settings stored in MongoDB. This is the single source of truth for these settings across app-cluster deployments.

**Fields:**
- **License Key**: Commercial license key (stored server-side; never exposed via APIs or templates)
- **License Tier**: License tier selection (e.g., BSL, commercial, enterprise)
- **Site UUID**: Deployment UUID used for compliance reporting and monitoring
- **Admin Email Opt-In**: Optional opt-in to share the admin email address with `jpulse.net` for site monitoring services
  - If you opt-in, you will gain access to your deployment dashboard where you can monitor compliance status, view historical reports, and receive alerts about potential license issues.

**Notes:**
- **Cluster-safe**: Values are stored in MongoDB and shared across all app instances in a cluster.
- **Security**: The license key is treated as sensitive and is filtered from server responses.
- **Monitoring**: Opting in to admin email sharing is optional and is only used for monitoring services.

### Site Configuration Storage: MongoDB

All admin-managed site configuration is stored in MongoDB, not in `app.conf` files. This enables:

- **Per-Instance Configuration**: Different settings for dev/staging/production
- **Dynamic Updates**: Changes take effect immediately without restarts
- **Admin UI**: Intuitive interface for non-technical administrators
- **Validation**: Schema-based validation prevents invalid configurations

**Configuration Document**:
- Collection: `configs`
- Document ID: `'global'` by default (configurable via `ConfigController.getDefaultDocName()`)
- Schema: Defined in `ConfigModel` with validation
- Access: `/admin/config.shtml` admin interface

---

## Broadcast Messages (1.4.11+)

Display site-wide messages to all users with a prominent yellow banner positioned below the header.

### Features

- **Fixed Position**: Appears below the site header, doesn't affect page layout
- **HTML Content**: Supports full HTML formatting (admin-controlled, no sanitization)
- **Minimize/Restore**: Users can minimize messages with a toggle button
- **Nag Time**: Auto-reopens minimized messages after a configurable time period
- **Auto-Disable**: Automatically disables messages after a set duration
- **Smooth Animation**: Opens/closes with left-to-right animation

### Enable a Broadcast Message

See **Broadcast Message Configuration** section above.

### User Experience

**Button Behavior**:
- Always visible toggle button with `＋` (open) / `－` (closed) Unicode characters
- Button positioned at top-left with minimal styling that blends into the interface
- Click to minimize/restore the message

**Message Display**:
- Yellow warning-style banner with rounded corners
- Positioned below the header, centered relative to the toggle button
- Message text uses standard font size (16px) matching regular page content
- Content width adapts to text, up to full viewport width minus margins

**Nag Time Behavior**:
- Per-user setting stored in browser `localStorage`
- When a user minimizes a message, a timestamp is saved
- After the nag time expires, the message automatically reopens
- Useful for important announcements that users might dismiss too quickly

**Auto-Disable Behavior**:
- Server-side global setting
- Timer starts when admin enables the broadcast
- Once the duration expires, the message is automatically disabled for all users
- Useful for time-sensitive announcements (maintenance windows, temporary alerts)

### Technical Details

**Storage**:
- Configuration: MongoDB `config` collection (document ID: `'site'`)
- User preferences: Browser `localStorage` (key: `jpulse-broadcast-minimized`)

### Example Configuration

```javascript
// MongoDB config document (data.broadcast)
{
    enable: true,
    message: '<strong>Important:</strong> System maintenance scheduled for Saturday, 2:00 AM - 4:00 AM.',
    nagTime: 4,        // Reopen after 4 hours if minimized
    disableTime: 24,   // Auto-disable after 24 hours
    enabledAt: Date    // Automatically set when enabled
}
```

### Best Practices

1. **Keep Messages Concise**: Long messages may be dismissed quickly
2. **Use HTML Sparingly**: While HTML is supported, keep formatting simple
3. **Set Appropriate Nag Time**: Balance between being helpful and annoying
4. **Use Auto-Disable**: For time-sensitive messages, set `disableTime` to avoid stale announcements
5. **Test Before Enabling**: Use the preview in the admin interface before enabling

---

## User Management

Manage user accounts, roles, and permissions through the admin interface.

**Access**: `/admin/user.shtml` (requires `admin` or `root` role)

### Features

- View all users with search and filtering
- Create new user accounts
- Edit user profiles and roles
- Disable/delete user accounts
- Last admin protection (prevents removing the last admin)

See [Security & Authentication Guide](security-and-auth.md) for detailed information about roles, permissions, and authentication.

---

## Plugin Management

Install, configure, and manage plugins through the admin interface.

**Access**: `/admin/plugins.shtml` (requires `admin` or `root` role)

### Features

- View installed plugins with status indicators
- Enable/disable plugins
- Configure plugin settings
- View plugin documentation
- Install/update/remove plugins via CLI or UI

See [Managing Plugins Guide](plugins/managing-plugins.md) for complete documentation.

---

## System Monitoring

Monitor system health, view logs, and track metrics.

### System Status

**Access**: `/admin/system-status.shtml` (requires `admin` or `root` role)

View real-time system metrics including:
- Instance health and uptime
- Request/error rates
- WebSocket connections
- Component metrics
- Multi-instance aggregation (when using Redis)

**License Compliance and Site Monitoring (BSL Period Only):**

- View the compliance reporting status, last report/response, and the next scheduled report time.
- Review the report payload and server response details (admin-only).
- Manual report sending may be available for administrators (intended for testing and troubleshooting).

> **See**: [License Guide](license.md#site-monitoring-bsl-period-only) for complete details about compliance reporting requirements, what data is collected, and privacy information.

### Logs

**Access**: `/admin/logs.shtml` (requires `admin` or `root` role)

Search and analyze system logs with:
- Date range filtering
- User/action/document type filters
- Sortable results table
- Expandable change details
- Export capabilities

### WebSocket Status

**Access**: `/admin/websocket-status.shtml` (requires `admin` or `root` role)

Real-time monitoring of WebSocket server status and activity:

**Overview Statistics**:
- **Uptime**: WebSocket server uptime
- **Total Messages**: Total messages sent/received
- **Active Namespaces**: Number of registered WebSocket namespaces
- **Total Clients**: Current connected clients across all namespaces

**Namespace Statistics**:
- Per-namespace client counts
- Message statistics per namespace
- Connection status for each namespace
- Real-time updates via WebSocket connection

**Activity Log**:
- Live activity feed showing WebSocket events
- Connection/disconnection events
- Message activity
- Error notifications
- Auto-scrolling with pause/resume controls

**Features**:
- Real-time updates via WebSocket connection to `/api/1/ws/jpulse-ws-status`
- Connection status indicator (connecting/connected/disconnected)
- Automatic reconnection on connection loss
- Activity log filtering and search
- Responsive design for mobile and desktop

See [WebSocket Guide](websockets.md) for complete WebSocket documentation.

---

## Application Configuration (app.conf)

Application configuration is stored in JavaScript files, not MongoDB. This is for framework defaults and developer settings.

### Configuration Files

1. **Framework Defaults**: `webapp/app.conf`
   - Base framework configuration
   - Managed by framework updates
   - **Do not edit directly** - changes will be overwritten

2. **Site Overrides**: `site/webapp/app.conf`
   - Site-specific configuration overrides
   - Merged with framework defaults (site takes priority)
   - **Update-safe**: Preserved during framework updates

### Configuration Structure

```javascript
// site/webapp/app.conf
{
    app: {
        siteName: 'My Organization Portal',
        siteDescription: 'Internal web application',
        adminEmail: 'admin@myorg.com'
    },

    // View configuration
    view: {
        pageDecoration: {
            headerHeight: 50,
            siteNavigation: {
                enabled: true,
                openDelay: 300,
                closeDelay: 500
            }
        }
    },

    // Middleware settings
    middleware: {
        session: {
            secret: process.env.SESSION_SECRET,
            maxAge: 3600000  // 1 hour
        }
    },

    // Controller settings
    controller: {
        auth: {
            mode: 'internal',
            disableLogin: false
        }
    }
}
```

### Key Configuration Areas

- **Application Info**: Site name, description, version
- **View Settings**: Header height, navigation delays, sidebar configuration
- **Middleware**: Session, CORS, security headers
- **Controller Settings**: Authentication mode, API limits
- **Database**: Connection settings (development/production)
- **Redis**: Connection settings for clustering
- **Utils**: i18n defaults, theme defaults

### Configuration Merging

jPulse automatically merges configurations in priority order:
1. Framework defaults (`webapp/app.conf`)
2. Plugin configurations (`plugins/[plugin-name]/webapp/app.conf`)
3. Site overrides (`site/webapp/app.conf`) - **highest priority**

See [Site Customization Guide](site-customization.md) for complete documentation on application configuration.

---

## See Also

- [Sending Email Guide](sending-email.md) - Complete email configuration documentation
- [Security & Authentication Guide](security-and-auth.md) - User roles, permissions, and authentication
- [Managing Plugins Guide](plugins/managing-plugins.md) - Plugin installation and configuration
- [Site Customization Guide](site-customization.md) - Developer customization options
- [Site Navigation Guide](site-navigation.md) - Configuring site navigation
