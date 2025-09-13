# jPulse Framework / Docs / Site Customization Guide v0.6.6

This guide covers the W-014 Site Override Architecture - jPulse's powerful system for creating custom sites while maintaining clean framework updates.

________________________________________________
## Overview

The W-014 override system enables:
- **Seamless framework updates** without losing customizations
- **Zero-configuration** site development
- **Automatic file resolution** with site priority
- **Clean separation** between framework and site code

________________________________________________
## Architecture Principles

### File Resolution Priority
jPulse automatically resolves files in this order:

1. **Site files first**: `site/webapp/[path]`
2. **Framework fallback**: `webapp/[path]`

This means you only override what you need to customize.

### Directory Structure
```
my-jpulse-site/
├── webapp/                   # Framework files (managed by jpulse-sync)
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

________________________________________________
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

________________________________________________
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

________________________________________________
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

________________________________________________
## Site Documentation System (W-049)

jPulse includes a powerful markdown-based documentation system that allows sites to create multiple documentation namespaces for different audiences.

### Quick Start: Adding Site Documentation

The namespace of the documentation can be anything, such as `docs`, `faq`, `manual`. The namespace can also be language specific, such as `manual-de`, `manual-fr`. The following uses the `docs` namespace.

#### 1. Create Documentation Directory

```bash
# Create your primary documentation namespace
mkdir -p site/webapp/static/assets/docs
```

#### 2. Add Your First Document

```bash
# Create a welcome document
cat > site/webapp/static/assets/docs/README.md << 'EOF'
# Welcome to Our Documentation

This is your site's documentation system. You can organize content using markdown files.

## Getting Started

- [User Guide](user-guide.md)
- [FAQ](../faq/README.md)
- [Help Center](../help/README.md)

## Features

- **Markdown Support**: Write documentation in markdown
- **Multiple Namespaces**: Organize docs by audience or topic
- **Auto-Discovery**: Files are automatically available via API
- **Clean URLs**: `/docs/user-guide` loads `user-guide.md`
EOF

# Add a user guide
cat > site/webapp/static/assets/docs/user-guide.md << 'EOF'
# User Guide

## Overview

This guide helps users understand how to use our system.

## Basic Operations

### Getting Started
1. Log in to your account
2. Navigate to the dashboard
3. Follow the on-screen instructions

### Advanced Features
- Feature A: Description and usage
- Feature B: Description and usage
EOF
```

#### 3. Create Documentation Viewer

Copy and customize the jPulse documentation template:

```bash
# Create the view directory
mkdir -p site/webapp/view/docs

# Copy the jPulse template as a starting point
cp -p webapp/view/jpulse/index.shtml site/webapp/view/docs/index.shtml
```

#### 4. Customize the Template

Edit `site/webapp/view/docs/index.shtml` to match your site's branding:

```html
<!-- Update the title and branding -->
<title>{{#if docTitle}}{{docTitle}} - {{/if}}{{app.siteName}} Documentation</title>

#### 5. Access Your Documentation

Your documentation is now available at:
- `/docs/` → loads `README.md`
- `/docs/user-guide` → loads `user-guide.md`

### Multiple Documentation Namespaces

Create different documentation sets for different audiences:

```bash
# Help system for end users
mkdir -p site/webapp/static/assets/help
mkdir -p site/webapp/view/help

# Technical manual for administrators
mkdir -p site/webapp/static/assets/manual
mkdir -p site/webapp/view/manual

# FAQ system
mkdir -p site/webapp/static/assets/faq
mkdir -p site/webapp/view/faq
```

Each namespace needs:
1. **Asset directory**: `site/webapp/static/assets/{namespace}/`
  - The namespace may have a hierarchy of directories
  - Each directory needs a README.md
2. **View template**: `site/webapp/view/{namespace}/index.shtml`
  - Only one view tempalte per namespace is needed, regardless of directory hierarchy
3. **README.md**: Default document for the namespace

### API Usage

The markdown system provides REST API endpoints:

```javascript
// List all documents in a namespace
GET /api/1/markdown/docs/
// Returns: { success: true, files: [{ path: "README.md", name: "README.md", title: "README" }, ...] }

// Get specific document content
GET /api/1/markdown/docs/user-guide.md
// Returns: { success: true, content: "# User Guide\n...", path: "user-guide.md" }

// Access subdirectories
GET /api/1/markdown/docs/admin/setup.md
// Returns content from site/webapp/static/assets/docs/admin/setup.md
```

### Advanced Features

#### Organizing Content with Subdirectories

```bash
# Create organized structure
mkdir -p site/webapp/static/assets/docs/{admin,user,developer}

# Admin documentation
echo "# Admin Guide" > site/webapp/static/assets/docs/admin/README.md
echo "# User Management" > site/webapp/static/assets/docs/admin/users.md

# User documentation
echo "# User Guide" > site/webapp/static/assets/docs/user/README.md
echo "# Getting Started" > site/webapp/static/assets/docs/user/getting-started.md

# Developer documentation
echo "# API Documentation" > site/webapp/static/assets/docs/developer/README.md
echo "# Integration Guide" > site/webapp/static/assets/docs/developer/integration.md
```

#### Custom Styling

Add site-specific styling to your documentation viewer:

```css
/* In site/webapp/view/docs/index.shtml */
<style>
    .jp-docs-container {
        /* Override framework styles */
        max-width: 1400px;
        grid-template-columns: 300px 1fr;
    }

    .local-docs-nav a.active {
        background: var(--site-accent-color);
    }
</style>
```

#### Performance and Caching

The markdown system includes built-in caching controlled by configuration:

```javascript
// In site/webapp/app.conf
{
    controller: {
        markdown: {
            cache: true  // Enable file caching for better performance
        }
    }
}
```

### Best Practices

#### Content Organization

1. **Use clear filenames**: `user-guide.md`, `admin-setup.md`, `api-reference.md`
2. **Create logical hierarchies**: Group related content in subdirectories
3. **Include navigation**: Link between related documents
4. **Maintain README files**: Each directory should have a README.md

#### Writing Guidelines

1. **Use descriptive headings**: Help users scan content quickly
2. **Include code examples**: Show practical usage where applicable
3. **Link between documents**: Create a connected documentation experience
4. **Keep it current**: Regular review and updates

#### Multiple Audiences

Consider creating separate namespaces for different user types:

- **`/docs/`**: General site documentation
- **`/help/`**: End-user help and support
- **`/manual/`**: Detailed operational procedures
- **`/faq/`**: Frequently asked questions
- **`/api/`**: Developer API documentation

Translations: Use one namespace per language

- **`/api-de/`**: Developer API documentation in German
- **`/api-fr/`**: Developer API documentation in French


### Troubleshooting

**Documentation not loading:**
- Verify directory structure: `site/webapp/static/assets/{namespace}/`
- Check file permissions and markdown file extensions (`.md`)
- Ensure view template exists: `site/webapp/view/{namespace}/index.shtml`

**API endpoints not working:**
- Restart server after adding new namespaces
- Check browser console for JavaScript errors
- Verify API calls use correct namespace

**Styling issues:**
- Check CSS conflicts between framework and site styles
- Use browser developer tools to debug styling
- Ensure proper CSS class prefixes (`jp-*` for framework, `site-*` for local)

### Integration with jPulse Framework Docs

Your site documentation works alongside the built-in jPulse framework documentation:

- **Framework docs**: `/jpulse/` (for developers and site administrators)
- **Site docs**: `/docs/`, `/help/`, etc. (for your site's users)

This separation ensures framework updates don't affect your site-specific documentation.

### Image Assets Organization

#### Recommended Strategy: Co-located Images

Organize images alongside your markdown files:

```bash
site/webapp/static/assets/docs/
├── README.md
├── user-guide.md
├── images/                    # Shared images
│   ├── logo.png
│   └── screenshot-login.png
├── admin/
│   ├── setup.md
│   └── images/               # Admin-specific images
│       └── admin-dashboard.png
└── developer/
    ├── api-guide.md
    └── images/               # Developer-specific images
        └── api-flow.svg
```

#### Markdown Image References

```markdown
![Login Screenshot](images/screenshot-login.png)
![Admin Dashboard](images/admin-dashboard.png)
![Company Logo](../images/logo.png)
```

#### Automatic Image Serving

Images are automatically served by the static file system:
- `/docs/images/logo.png` → `site/webapp/static/assets/docs/images/logo.png`
- `/help/images/screenshot.png` → `site/webapp/static/assets/help/images/screenshot.png`

**No code changes needed** - existing static file serving handles images!



________________________________________________
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

________________________________________________
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
