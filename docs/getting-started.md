# jPulse Framework / Docs / Getting Started with jPulse v0.7.17

This tutorial will guide you through creating your first jPulse site, from basic setup to implementing site-specific customizations using the W-014 override system.

## Prerequisites

Before starting, ensure you have:
- jPulse Framework installed ([Installation Guide](installation.md))
- Node.js 18+ and npm/yarn
- Basic knowledge of HTML, CSS, and JavaScript
- Text editor or IDE

## Step 1: Create Your First Site

### Setup New Site
```bash
# Create a new jPulse site directory
mkdir my-first-site && cd my-first-site

# Install framework locally in your site
npm install @peterthoeny/jpulse-framework

# Configure your site
npx jpulse-configure
```

### Install Dependencies, and Start Server
```bash
# Install dependencies
npm install
# Start the server app
npm start
```

Visit `http://localhost:8080` - you should see the jPulse welcome page.

## Step 2: Understanding the Architecture

jPulse uses a clean separation between framework code and site customizations:

```
my-first-site/
├── webapp/               # Framework files (managed by jpulse-update)
│   ├── controller/       # Base controllers
│   ├── model/            # Data models
│   ├── view/             # Base templates
│   └── static/           # Framework assets
├── site/webapp/          # Your customizations (update-safe)
│   ├── app.conf          # Site configuration
│   ├── controller/       # Custom controllers
│   ├── model/            # Custom models
│   ├── view/             # Custom templates
│   └── static/           # Site assets
└── package.json          # Dependencies (@peterthoeny/jpulse-framework)
```

## Step 3: Create Your First Custom Page

### Understanding Site Structure
```bash
# Site structure is already created by jpulse-configure
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
import { LogController } from '../../../webapp/controller/log.js';
import { ViewController } from '../../../webapp/controller/view.js';

class HelloController {
    constructor() {
        this.viewController = new ViewController();
    }

    // Web page handler
    async index(req, res) {
        LogController.logInfo(req, 'HelloController.index', 'Displaying hello page');

        const context = {
            pageTitle: 'Hello World',
            message: 'Hello from your custom controller!',
            timestamp: new Date().toISOString()
        };

        await this.viewController.renderView(req, res, 'hello/index', context);
    }

    // API endpoint
    api() {
        return {
            'GET /greeting': this.getGreeting.bind(this)
        };
    }

    async getGreeting(req, res) {
        LogController.logInfo(req, 'HelloController.getGreeting', 'API greeting requested');

        res.json({
            success: true,
            message: 'Hello from jPulse API!',
            timestamp: new Date().toISOString()
        });
    }
}

export { HelloController };
```

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
        const response = await fetch('/api/1/hello/greeting');
        const data = await response.json();
        document.getElementById('apiResult').innerHTML =
            `<div class="jp-alert jp-alert-success">API Response: ${data.message}</div>`;
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
- `http://localhost:8080/api/1/hello/greeting` - Your API endpoint

## Step 5: Customize Styling

Create `site/webapp/static/site-common.css`:

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

The W-014 override system automatically resolves files in this priority:

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
                site: appConfig.app.name,
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
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{app.name}} - Welcome</title>
    {{file.include "jpulse-header.tmpl"}}
</head>
<body>
    <div class="jp-main">
        <h1 class="jp-title">Welcome to {{app.name}}!</h1>

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
        jPulse.apiCall('/api/1/welcome', {}, function(data) {
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

## Framework Updates

Keep your framework up to date with the latest features and fixes:

```bash
# Update framework to latest version (recommended)
npm run jpulse-update

# Preview update without making changes (NEW in v0.7.3)
npm run jpulse-update --dry-run

# Or use the new update command directly:
npm run jpulse-update                    # Update framework files
npm run jpulse-update --dry-run          # Safe preview mode

# Or manually (2-step process):
npm update @peterthoeny/jpulse-framework  # Updates npm package
npm run jpulse-update                    # Updates framework files

# Review changes
git diff webapp/
git commit -am "Update framework to v0.7.14"
```

**Enhanced update features**: Update safety and reliability:

- **`--dry-run` support** - Preview changes before applying them
- **`jpulse-update` command** - Direct CLI tool for framework updates
- **Improved error handling** - Better feedback and troubleshooting
- **Smart version constraints** - Seamless updates within 0.x.x versions

**Important**: Understanding the update process:

- **`npm run jpulse-update`** - Recommended: Runs both steps automatically with enhanced safety
- **Manual process** requires two steps:
  1. `npm update @peterthoeny/jpulse-framework` - Downloads the latest framework package
  2. `npm run jpulse-update` - Copies the updated framework files to your site

**Why two steps?** jPulse uses a hybrid approach:
- **npm package** - Contains the framework source and CLI tools
- **Site files** - Generated templates copied to your site for customization
- Running `npm update` alone only updates the package, not your site's files!

## Next Steps

Now that you have a working jPulse site, explore these topics:

1. **[Site Customization Guide](site-customization.md)** - Deep dive into the W-014 override system
2. **[Examples](examples.md)** - Real-world implementation patterns
3. **[API Reference](api-reference.md)** - Complete framework API documentation
4. **[Deployment Guide](deployment.md)** - Production deployment strategies

## Key Concepts Learned

- ✅ **Site Structure**: Clean separation between framework and site code
- ✅ **Override System**: Automatic file resolution with site priority
- ✅ **Controllers**: Both web pages and API endpoints in one class
- ✅ **Templates**: Handlebars-based server-side rendering
- ✅ **Styling**: CSS prefix conventions (`jp-*` framework, `site-*` local)
- ✅ **Zero Configuration**: Automatic discovery and registration

---

*Congratulations! You've built your first jPulse site. Ready to explore advanced features?*
