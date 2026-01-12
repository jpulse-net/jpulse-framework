# jPulse Docs / Getting Started with jPulse v1.4.13

This tutorial will guide you through creating your first jPulse site, from basic setup to implementing site-specific customizations using the site override system.

## Prerequisites

Before starting, ensure you have:
- jPulse Framework installed ([Installation Guide](installation.md))
- Node.js 18+ and npm/yarn
- Basic knowledge of HTML, CSS, and JavaScript
- Text editor or IDE

**💡 Pro Tip**: Using an AI coding assistant like Cursor, Cline, or GitHub Copilot? See the [Gen-AI Development Guide](genai-development.md) to accelerate your development with AI-assisted "vibe coding" while following framework best practices.

## Step 1: Create Your First Site

### Setup New Site
```bash
# Create a new jPulse site directory
mkdir my-first-site && cd my-first-site

# Install framework (creates .npmrc and installs from GitHub Packages)
npx jpulse-install

# Configure your site
npx jpulse configure
```

### Install Dependencies, Setup Database, and Start Server
```bash
# Install dependencies
npm install

# Setup MongoDB database (for production or if using authentication)
npx jpulse mongodb-setup

# Start the server app
npm start
```

Visit `http://localhost:8080` - you should see the jPulse welcome page.

> **Admin Access**: Once your site is running, access the admin interface at `/admin/` to configure email, broadcast messages, and manage users. See the [Site Administration Guide](site-administration.md) for complete documentation.

## Step 2: Understanding the Architecture

jPulse uses a clean separation between framework code and site customizations:

```
my-first-site/
├── site/webapp/          # Your custom code (update-safe)
│   ├── app.conf          # Site configuration
│   ├── controller/       # Custom controllers
│   ├── model/            # Custom models
│   ├── view/             # Custom templates
│   └── static/           # Site assets
├── plugins/              # Plugins - Installed third-party extensions
│   └── [plugin-name]/    # Each plugin in its own directory
├── webapp/               # Framework files (managed by jpulse-update)
│   ├── controller/       # Base controllers
│   ├── model/            # Data models
│   ├── view/             # Base templates
│   └── static/           # Framework assets
└── package.json          # Dependencies (@jpulse-net/jpulse-framework)
```

## Step 3: Create Your First Custom Page

### Understanding Site Structure
```bash
# Site structure is already created by npx jpulse configure
# Your site directory includes:
ls -la
# webapp/           - Framework files (managed by jpulse-update)
# site/webapp/      - Your customizations (update-safe)
# logs -> /var/log/ - Symbolic link to system logs (convenient access)
# package.json      - Dependencies and npm scripts
# .env              - Environment configuration
```

**Logs Access**: The `logs/` directory is a symbolic link to your system log directory (e.g., `/var/log/jpulse.net/`). This provides convenient access to application logs while maintaining proper system logging practices.

### Site Configuration
Create `site/webapp/app.conf` with your site settings:

```javascript
{
    app: {
        siteName: 'My First jPulse Site',
        siteDescription: 'Learning jPulse Framework',
        adminEmail: 'admin@mysite.com'
    },

    // Customize appearance
    ui: {
        theme: 'default',
        showWelcomeMessage: true
    }
}
```

### Custom Home Page
Create `site/webapp/view/home/index.shtml`:

```html
{{file.include webapp/view/jpulse-header.tmpl}}

<div class="jp-container">
    <div class="jp-card">
        <h1>Welcome to {{app.siteName}}</h1>
        <p>This is your custom home page!</p>

        <div class="jp-btn-group">
            <a href="/user/" class="jp-btn jp-btn-primary">User Dashboard</a>
            <a href="/admin/" class="jp-btn jp-btn-secondary">Admin Panel</a>
        </div>
    </div>
</div>

<style>
.local-welcome {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 8px;
    margin: 2rem 0;
}
</style>

{{file.include webapp/view/jpulse-footer.tmpl}}
```

### Restart and Test
```bash
# Restart the server to load site customizations
npm start
```

Visit `http://localhost:8080` - you should see your custom home page!

## Step 4: Add a Custom Controller

Create `site/webapp/controller/hello.js`:

```javascript
/**
 * Hello Controller - Automatically discovered by jPulse Framework
 *
 * API endpoints are auto-registered based on method names:
 * - static async api() → GET /api/1/hello
 * - static async apiCreate() → POST /api/1/hello
 * - static async apiStats() → GET /api/1/hello/stats
 */
import LogController from '../../../webapp/controller/log.js';

export default class HelloController {
    // Optional: Called once at startup for initialization
    static async initialize() {
        LogController.logInfo(null, 'HelloController.initialize', 'Custom controller initialized');
    }

    // Auto-registered as: GET /api/1/hello
    static async api(req, res) {
        LogController.logInfo(req, 'HelloController.api', 'API greeting requested');

        res.json({
            success: true,
            message: 'Hello from jPulse API!',
            timestamp: new Date().toISOString(),
            server: global.appConfig.system.instanceName
        });
    }

    // Auto-registered as: GET /api/1/hello/stats
    static async apiStats(req, res) {
        LogController.logInfo(req, 'HelloController.apiStats', 'API stats requested');

        res.json({
            success: true,
            data: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: global.appConfig.app.jPulse.version
            }
        });
    }
}
```

**✨ Auto-Discovery Magic:** The framework automatically:
- Discovers your controller on startup
- Detects all `static async api*()` methods
- Registers routes at `/api/1/{controllerName}`
- Calls `static async initialize()` if present
- Logs all registrations for debugging

No route registration, no imports in `routes.js`, no manual configuration needed!

### Create the View Template
Create `site/webapp/view/hello/index.shtml`:

```html
{{file.include webapp/view/jpulse-header.tmpl}}

<div class="jp-container">
    <div class="jp-card">
        <h1>{{pageTitle}}</h1>
        <p>{{message}}</p>
        <p><small>Generated at: {{timestamp}}</small></p>

        <button id="apiTest" class="jp-btn jp-btn-primary">Test API</button>
        <div id="apiResult" class="local-api-result"></div>
    </div>
</div>

<script>
document.getElementById('apiTest').addEventListener('click', async () => {
    try {
        // Call auto-registered API endpoint
        const response = await fetch('/api/1/hello');
        const data = await response.json();
        document.getElementById('apiResult').innerHTML =
            `<div class="jp-alert jp-alert-success">
                API Response: ${data.message}<br>
                Server: ${data.server}<br>
                Time: ${data.timestamp}
            </div>`;
    } catch (error) {
        document.getElementById('apiResult').innerHTML =
            `<div class="jp-alert jp-alert-error">Error: ${error.message}</div>`;
    }
});
</script>

<style>
.local-api-result {
    margin-top: 1rem;
}
</style>

{{file.include webapp/view/jpulse-footer.tmpl}}
```

### Test Your Controller
Restart the server and visit:
- `http://localhost:8080/hello/` - Your custom page
- `http://localhost:8080/api/1/hello` - Your API endpoint (auto-registered!)
- `http://localhost:8080/api/1/hello/stats` - Stats endpoint (auto-registered!)

Check your server logs to see the auto-registration messages:
```
- info  site-controller-registry  Initialized controller: hello
- info  site-controller-registry  Discovered 1 controller(s), 1 initialized, 2 API method(s)
- info  site-controller-registry  Registered: GET /api/1/hello → hello.api
- info  site-controller-registry  Registered: GET /api/1/hello/stats → hello.apiStats
- info  routes  Auto-registered 2 site API endpoints
```

## Step 5: Customize Styling

Create `site/webapp/static/jpulse-common.css` from scratch, or copy template from `site/webapp/static/jpulse-common.css.tmpl`:

```css
/* Site-specific styles using site-* prefix */
.site-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 0;
}

.site-welcome-banner {
    background: #f8f9fa;
    border-left: 4px solid #667eea;
    padding: 1rem;
    margin: 1rem 0;
}

.site-feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    margin: 2rem 0;
}

.site-feature-card {
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 1.5rem;
    transition: transform 0.2s ease;
}

.site-feature-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
```

## Step 6: Understanding the Override System

The site override system automatically resolves files in this priority:

1. **Site files first**: `site/webapp/view/home/index.shtml`
2. **Framework fallback**: `webapp/view/home/index.shtml`

This means:
- ✅ **Safe updates**: Framework updates won't overwrite your customizations
- ✅ **Zero configuration**: No manual route registration needed
- ✅ **Flexible**: Override only what you need

## Step 7: Working with Data

Create a simple data model in `site/webapp/model/hello.js`:

```javascript
import { CommonUtils } from '../../../webapp/utils/common.js';

class HelloModel {
    constructor() {
        this.collectionName = 'hello_messages';
    }

    async saveMessage(message) {
        const document = {
            message: message,
            timestamp: new Date(),
            ip: 'unknown'
        };

        return await CommonUtils.createDocument(this.collectionName, document);
    }

    async getRecentMessages(limit = 10) {
        const query = {};
        const options = {
            sort: { timestamp: -1 },
            limit: limit
        };

        return await CommonUtils.findDocuments(this.collectionName, query, options);
    }
}

export { HelloModel };
```

## Step 4: Set Up Your Site Repository

### Initialize Git Repository
```bash
# Initialize git repository for your site
git init
git add .
git commit -m "Initial site setup with jPulse Framework v0.7.14"
```

### Add Remote Repository (Optional)
```bash
# If you have a remote repository
git remote add origin https://github.com/your-org/your-site.git
git branch -M main
git push -u origin main
```

## Step 5: Add Custom Content

### Create a Custom Controller
```bash
# Create a custom API controller
cat > site/webapp/controller/welcome.js << 'EOF'
/**
 * Welcome Controller - Custom Site Example
 */
class WelcomeController {

    /**
     * API endpoint - accessible via /api/1/welcome
     */
    static async api(req, res) {
        try {
            LogController.logInfo(req, 'welcome.api: Custom API accessed');

            res.json({
                message: 'Welcome to your custom jPulse site!',
                site: appConfig.app.site.name,
                timestamp: new Date().toISOString(),
                customData: {
                    feature: 'Custom API endpoint',
                    location: 'site/webapp/controller/welcome.js'
                }
            });

        } catch (error) {
            LogController.logError(req, `welcome.api: error: ${error.message}`);
            CommonUtils.sendError(res, 500, 'API error');
        }
    }
}

export default WelcomeController;
EOF
```

### Create a Custom View
```bash
# Create a custom page
mkdir -p site/webapp/view/welcome
cat > site/webapp/view/welcome/index.shtml << 'EOF'
<!DOCTYPE html>
<html {{appConfig.system.htmlAttrs}}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome - {{app.site.name}}</title>
    {{file.include "jpulse-header.tmpl"}}
</head>
<body>
    <div class="jp-main">
        <h1 class="jp-title">Welcome to {{app.site.name}}!</h1>

        <div class="jp-card">
            <h2>Your Custom Site</h2>
            <p>This is your custom jPulse site with override capabilities.</p>

            <button class="jp-btn jp-btn-primary" onclick="testCustomAPI()">
                Test Custom API
            </button>

            <div id="api-result" class="jp-info-box" style="display: none; margin-top: 1rem;">
                <h3>API Response:</h3>
                <pre id="api-content"></pre>
            </div>
        </div>

        <div class="jp-card">
            <h3>Next Steps</h3>
            <ul>
                <li>Customize your site configuration in <code>site/webapp/app.conf</code></li>
                <li>Add more controllers in <code>site/webapp/controller/</code></li>
                <li>Create custom views in <code>site/webapp/view/</code></li>
                <li>Add site-specific assets in <code>site/webapp/static/</code></li>
            </ul>
        </div>
    </div>

    <script>
    function testCustomAPI() {
        jPulse.api.call('/api/1/welcome', {}, function(data) {
            document.getElementById('api-content').textContent = JSON.stringify(data, null, 2);
            document.getElementById('api-result').style.display = 'block';
        }, function(error) {
            document.getElementById('api-content').textContent = 'Error: ' + error.message;
            document.getElementById('api-result').style.display = 'block';
        });
    }
    </script>
</body>
</html>
EOF
```

### Test Your Custom Content
```bash
# Restart the server to load your custom controller
npm start

# Visit your custom page: http://localhost:8080/welcome/
# Test your custom API: Click "Test Custom API" button
```

## jPulse Framework Updates

Keep your framework up to date with the latest features and fixes:

```bash
# Update to latest production version:
npx jpulse update

# Update to a pre-release (beta, RC):
npx jpulse update @jpulse-net/jpulse-framework@1.0.0-rc.1

# Review changes
git diff webapp/
git commit -am "Update framework to v1.0.1"
```

**How it works**: `npx jpulse update` automatically updates the framework package to the latest version and syncs files. To test a specific version (beta/RC), provide the version argument: `npx jpulse update @jpulse-net/jpulse-framework@version`.

**Version Management**:

- **Bump site version** - Use `npx jpulse bump-version <version>` to update version numbers across site files
- **Configuration file** - `site/webapp/bump-version.conf` controls which files are updated (created automatically on initial setup)
- **See documentation** - Visit `/jpulse/getting-started#version-management` for complete version bumping guide

### Version Management

Keep your site version numbers synchronized across all files:

```bash
# Bump version to 0.2.0
npx jpulse bump-version 0.2.0

# Bump version with specific release date
npx jpulse bump-version 0.2.0 2025-01-27
```

**Configuration**: The `site/webapp/bump-version.conf` file (created automatically on initial setup) controls:
- Which files to process (file patterns)
- How to update version numbers (regex patterns)
- Header update patterns for source files

**Customization**: Edit `site/webapp/bump-version.conf` to add or modify file patterns and update rules for your specific needs.

## Next Steps

Now that you have a working jPulse site, explore these topics:

1. **[Gen-AI Development Guide](genai-development.md)** - Accelerate development with AI assistance ("vibe coding")
2. **[Site Customization Guide](site-customization.md)** - Deep dive into the site override system
3. **[Examples](app-examples.md)** - Real-world implementation patterns
4. **[API Reference](api-reference.md)** - Complete framework API documentation
5. **[Security & Authentication](security-and-auth.md)** - Authentication, authorization, and security best practices
6. **[Sending Email](sending-email.md)** - Configure and send emails from your application
7. **[Deployment Guide](deployment.md)** - Production deployment strategies

## Key Concepts Learned

- ✅ **Site Structure**: Clean separation between framework and site code
- ✅ **Override System**: Automatic file resolution with site priority
- ✅ **Controllers**: Both web pages and API endpoints in one class
- ✅ **Templates**: Handlebars-based server-side rendering
- ✅ **Styling**: CSS prefix conventions (`jp-*` framework, `site-*` local)
- ✅ **Zero Configuration**: Automatic discovery and registration

---

*Congratulations! You've built your first jPulse site. Ready to explore advanced features?*
