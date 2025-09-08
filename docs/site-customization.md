# jPulse Framework / Docs / Site Customization Guide

This guide covers the W-014 Site Override Architecture - jPulse's powerful system for creating custom sites while maintaining clean framework updates.

## Overview

The W-014 override system enables:
- **Seamless framework updates** without losing customizations
- **Zero-configuration** site development
- **Automatic file resolution** with site priority
- **Clean separation** between framework and site code

## Architecture Principles

### File Resolution Priority
jPulse automatically resolves files in this order:

1. **Site files first**: `site/webapp/[path]`
2. **Framework fallback**: `webapp/[path]`

This means you only override what you need to customize.

### Directory Structure
```
jpulse-framework/
├── webapp/                   # Framework core (updatable)
│   ├── controller/           # Base controllers
│   ├── model/                # Data models
│   ├── view/                 # Base templates
│   ├── static/               # Framework assets
│   └── utils/                # Framework utilities
└── site/                     # Site customizations (update-safe)
    └── webapp/               # Site-specific overrides
        ├── app.conf          # Site configuration
        ├── controller/       # Custom controllers
        ├── model/            # Custom models
        ├── view/             # Custom templates
        └── static/           # Site assets
```

## Configuration System

### Site Configuration
Create `site/webapp/app.conf` to override framework defaults:

```javascript
{
    app: {
        siteName: 'My Organization Portal',
        siteDescription: 'Internal web application',
        adminEmail: 'admin@myorg.com',

        // Override framework defaults
        sessionTimeout: 3600,  // 1 hour
        maxLoginAttempts: 5
    },

    // Email configuration
    email: {
        smtp: {
            host: 'smtp.myorg.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        },
        from: 'noreply@myorg.com'
    },

    // Database settings
    database: {
        enabled: true,
        name: 'myorg_portal'
    },

    // UI customization
    ui: {
        theme: 'corporate',
        showBranding: true,
        headerColor: '#2c3e50'
    }
}
```

### Configuration Merging
jPulse automatically merges configurations:
1. Framework defaults (`webapp/app.conf`)
2. Site overrides (`site/webapp/app.conf`)
3. Environment variables

## Controller Customization

### Creating Custom Controllers

Create `site/webapp/controller/dashboard.js`:

```javascript
import { LogController } from '../../../webapp/controller/log.js';
import { ViewController } from '../../../webapp/controller/view.js';
import { UserModel } from '../../../webapp/model/user.js';

class DashboardController {
    constructor() {
        this.viewController = new ViewController();
        this.userModel = new UserModel();
    }

    // Web page handler
    async index(req, res) {
        LogController.logInfo(req, 'DashboardController.index', 'Loading dashboard');

        const context = {
            pageTitle: 'Organization Dashboard',
            user: req.session.user,
            stats: await this.getDashboardStats()
        };

        await this.viewController.renderView(req, res, 'dashboard/index', context);
    }

    // API endpoints (automatically registered as /api/1/dashboard/*)
    api() {
        return {
            'GET /stats': this.getStats.bind(this),
            'POST /update': this.updateDashboard.bind(this)
        };
    }

    async getStats(req, res) {
        LogController.logInfo(req, 'DashboardController.getStats', 'API stats requested');

        const stats = await this.getDashboardStats();
        res.json({ success: true, data: stats });
    }

    async getDashboardStats() {
        // Custom business logic
        return {
            totalUsers: await this.userModel.getUserCount(),
            activeToday: await this.userModel.getActiveUserCount(1),
            systemHealth: 'good'
        };
    }
}

export { DashboardController };
```

### Controller Auto-Discovery
jPulse automatically:
- **Discovers controllers** in `site/webapp/controller/`
- **Registers routes** based on filename and methods
- **Creates API endpoints** from `api()` method
- **No manual configuration** required

## View Customization

### Template Override
Create `site/webapp/view/home/index.shtml` to override the framework home page:

```html
{{file.include webapp/view/jpulse-header.tmpl}}

<div class="jp-container">
    <!-- Custom welcome banner -->
    <div class="site-welcome-banner">
        <h1>Welcome to {{app.siteName}}</h1>
        <p>{{app.siteDescription}}</p>
    </div>

    <!-- Feature grid -->
    <div class="site-feature-grid">
        <div class="site-feature-card">
            <h3>User Management</h3>
            <p>Manage user accounts and permissions</p>
            <a href="/admin/users/" class="jp-btn jp-btn-primary">Manage Users</a>
        </div>

        <div class="site-feature-card">
            <h3>Dashboard</h3>
            <p>View system statistics and reports</p>
            <a href="/dashboard/" class="jp-btn jp-btn-primary">View Dashboard</a>
        </div>

        <div class="site-feature-card">
            <h3>Configuration</h3>
            <p>System settings and preferences</p>
            <a href="/admin/config/" class="jp-btn jp-btn-primary">Settings</a>
        </div>
    </div>
</div>

<!-- Site-specific styling -->
<style>
.site-welcome-banner {
    background: linear-gradient(135deg, {{ui.headerColor}} 0%, #34495e 100%);
    color: white;
    padding: 3rem 2rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    text-align: center;
}

.site-feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
}

.site-feature-card {
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    transition: transform 0.2s ease;
}

.site-feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}
</style>

{{file.include webapp/view/jpulse-footer.tmpl}}
```

## Best Practices

### 1. Minimal Overrides
- Only override what you need to customize
- Leverage framework components when possible
- Use configuration over code changes

### 2. Consistent Naming
- Use `site-*` prefix for site-specific CSS classes
- Use `local-*` prefix for page-specific styles
- Follow framework naming conventions

### 3. Testing
- Test site customizations thoroughly
- Include both unit and integration tests
- Verify framework updates don't break customizations

## Troubleshooting

### Common Issues

**Site files not loading:**
- Check file paths and naming conventions
- Verify site directory structure
- Restart server after adding new controllers

**Configuration not merging:**
- Validate JavaScript syntax in `app.conf`
- Check for conflicting property names
- Review console logs for configuration errors

---

*The W-014 Site Override Architecture provides powerful customization capabilities while maintaining clean framework updates.*
