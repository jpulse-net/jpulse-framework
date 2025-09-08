# jPulse Framework / Docs / Getting Started with jPulse

This tutorial will guide you through creating your first jPulse site, from basic setup to implementing site-specific customizations using the W-014 override system.

## Prerequisites

Before starting, ensure you have:
- jPulse Framework installed ([Installation Guide](installation.md))
- Node.js 18+ and npm/yarn
- Basic knowledge of HTML, CSS, and JavaScript
- Text editor or IDE

## Step 1: Verify Framework Installation

First, let's make sure jPulse is working:

```bash
# Navigate to your jPulse installation
cd jpulse-framework

# Start the development server
npm start
```

Visit `http://localhost:8080` - you should see the jPulse welcome page.

## Step 2: Understanding the Architecture

jPulse uses a clean separation between framework code and site customizations:

```
jpulse-framework/
├── webapp/               # Framework core (don't modify)
│   ├── controller/       # Base controllers
│   ├── model/            # Data models
│   ├── view/             # Base templates
│   └── static/           # Framework assets
└── site/                 # Your customizations (safe from updates)
    └── webapp/           # Site-specific overrides
        ├── controller/   # Custom controllers
        ├── model/        # Custom models
        ├── view/         # Custom templates
        └── static/       # Site assets
```

## Step 3: Create Your First Site

### Create Site Structure
```bash
# Create the site directory structure
mkdir -p site/webapp/{controller,model,view,static}
```

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
