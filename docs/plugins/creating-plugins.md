# jPulse Docs / Plugins / Creating Plugins v1.3.2

A step-by-step guide to creating your first jPulse plugin.

## Quick Start

The fastest way to learn is to copy the [Hello World plugin](../installed-plugins/hello-world/README.md) and modify it for your needs.

## Plugin Directory Structure

```
plugins/your-plugin/
├── plugin.json                      # Required: Plugin metadata
├── README.md                        # Required: Developer documentation
├── docs/
│   ├── README.md                    # Required: User/admin documentation
│   └── more-stuff.md                # Optional: Additional documentation
└── webapp/
    ├── controller/
    │   └── yourPlugin.js            # Optional: REST API endpoints
    ├── model/
    │   └── yourPlugin.js            # Optional: Database models
    ├── view/
    │   ├── jpulse-plugins/
    │   │   └── your-plugin.shtml    # Optional: Plugin overview page (with dashboard card)
    │   ├── your-plugin/
    │   │   └── index.shtml          # Optional: Application page
    │   ├── jpulse-common.css        # Optional: Global CSS (auto-loaded)
    │   ├── jpulse-common.js         # Optional: Global JavaScript (auto-loaded)
    │   └── jpulse-navigation.js     # Optional: Navigation menu entries (auto-loaded)
    └── static/                      # Optional: Standalone assets (images, libraries)
        └── .gitkeep
```

**Static Assets Note**: A subdirectory structure under `static/` helps you organize assets, and avoids naming conflicts within your plugin, such as `css`, `js`, `images`, `fonts`, and `libs`. Assets are accessible at `/static/plugins/your-plugin/{subdirectory}/{file}`.

## Step 1: Create plugin.json

This is the only required file for a minimal plugin.

```json
{
    "name": "your-plugin",
    "npmPackage": "@your-org/plugin-your-plugin",
    "version": "1.0.0",
    "icon": "🔌",
    "summary": "Short one-line description",
    "description": "<p>Detailed HTML description...</p>",
    "author": "Your Name <you@example.com>",
    "jpulseVersion": ">=1.3.0",
    "autoEnable": true,
    "dependencies": {
        "npm": {},
        "plugins": {}
    },
    "config": {
        "schema": []
    }
}
```

### Required Fields:
- `name` - Lowercase with hyphens (e.g., `auth-ldap`)
- `version` - Semantic version (e.g., `1.0.0`)
- `jpulseVersion` - Minimum framework version (e.g., `>=1.3.0`)

### Optional Fields:
- `npmPackage` - npm package name (e.g., `@jpulse-net/plugin-auth-ldap`)
- `icon` - Unicode emoji or SVG markup
- `summary` - One-line description (displayed in lists)
- `description` - Rich HTML description (displayed on detail pages)
- `author` - Author name and email
- `autoEnable` - Enable plugin on first discovery (default: `true`)
- `dependencies.npm` - npm packages required (auto-installed)
- `dependencies.plugins` - Other plugins required
- `config.schema` - Configuration fields (see below)

## Step 2: Add Configuration (Optional)

Configuration fields are automatically turned into an admin UI:

```json
{
    "config": {
        "schema": [
            {
                "type": "help",
                "content": "<strong>Welcome!</strong> Configure your plugin below.",
                "tab": "General"
            },
            {
                "id": "apiKey",
                "label": "API Key",
                "type": "text",
                "required": true,
                "placeholder": "Enter your API key",
                "help": "Required for API authentication",
                "tab": "General"
            },
            {
                "id": "timeout",
                "label": "Timeout (seconds)",
                "type": "number",
                "default": 30,
                "min": 5,
                "max": 300,
                "step": 5,
                "tab": "Advanced"
            },
            {
                "id": "logLevel",
                "label": "Log Level",
                "type": "select",
                "default": "info",
                "options": [
                    { "value": "error", "label": "Error" },
                    { "value": "warn", "label": "Warning" },
                    { "value": "info", "label": "Info" },
                    { "value": "debug", "label": "Debug" }
                ],
                "tab": "Advanced"
            },
            {
                "id": "notes",
                "label": "Notes",
                "type": "textarea",
                "rows": 5,
                "placeholder": "Optional notes...",
                "tab": "Advanced"
            }
        ]
    }
}
```

### Supported Field Types:
- `help` - Informational text box (no input)
- `text` - Single-line text input
- `textarea` - Multi-line text input (use `rows` for height)
- `number` - Numeric input (supports `min`, `max`, `step`)
- `boolean` - Checkbox
- `select` - Dropdown menu (use `options` array)

### Field Attributes:
- `id` - Unique field identifier (required for input fields)
- `label` - Field label displayed in UI
- `type` - Field type (see above)
- `default` - Default value
- `required` - Mark field as required (boolean)
- `placeholder` - Placeholder text
- `help` - Help text displayed below field
- `tab` - Tab name for grouping (creates tabs automatically)
- `min`, `max`, `step` - For number fields
- `rows` - For textarea height
- `options` - For select dropdown (array of `{value, label}`)

## Step 3: Create Controller (Optional)

Controllers provide REST API endpoints using auto-discovery:

**File**: `plugins/your-plugin/webapp/controller/yourPlugin.js`

```javascript
import CommonUtils from '../../utils/common.js';

export default class YourPluginController {
    /**
     * GET /api/1/yourPlugin
     * Static methods starting with "api" are auto-discovered
     */
    static async apiGet(req, res) {
        try {
            return res.json({
                success: true,
                data: {
                    message: 'Hello from your plugin!',
                    version: '1.0.0'
                }
            });
        } catch (error) {
            return CommonUtils.sendError(req, res, 500,
                'Internal error', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * POST /api/1/yourPlugin
     */
    static async apiPost(req, res) {
        const data = req.body;
        // Handle POST request
        return res.json({ success: true, data });
    }
}
```

**Auto-Discovery Rules:**
- Method name: `static async api{HttpMethod}` (e.g., `apiGet`, `apiPost`, `apiPut`, `apiDelete`)
- URL: `/api/1/{controllerName}` (camelCase controller name becomes URL path)
- Example: `YourPluginController.apiGet` → `GET /api/1/yourPlugin`

## Step 4: Create Model (Optional)

Models provide database operations:

**File**: `plugins/your-plugin/webapp/model/yourPlugin.js`

```javascript
import database from '../../database.js';
import { ObjectId } from 'mongodb';

export default class YourPluginModel {
    /**
     * Schema definition (for documentation and validation)
     */
    static schema = {
        _id: { type: 'objectId', auto: true },
        name: { type: 'string', required: true },
        value: { type: 'string' },
        status: { type: 'string', default: 'active' },
        createdAt: { type: 'date', auto: true },
        updatedAt: { type: 'date', auto: true }
    };

    /**
     * Get MongoDB collection
     */
    static getCollection() {
        const db = database.getDb();
        if (!db) {
            throw new Error('Database connection not available');
        }
        return db.collection('yourPlugin_items');
    }

    /**
     * Get all items
     */
    static async getAll() {
        const collection = this.getCollection();
        return await collection.find({}).toArray();
    }

    /**
     * Get by ID
     */
    static async getById(id) {
        const collection = this.getCollection();
        return await collection.findOne({ _id: new ObjectId(id) });
    }

    /**
     * Create item
     */
    static async create(data) {
        const collection = this.getCollection();
        const now = new Date();
        const document = {
            ...data,
            createdAt: now,
            updatedAt: now
        };
        const result = await collection.insertOne(document);
        return { ...document, _id: result.insertedId };
    }

    /**
     * Update item
     */
    static async update(id, data) {
        const collection = this.getCollection();
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    ...data,
                    updatedAt: new Date()
                }
            }
        );
        return result.modifiedCount > 0;
    }

    /**
     * Delete item
     */
    static async delete(id) {
        const collection = this.getCollection();
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    }
}
```

## Step 5: Create Views (Optional)

### Application Page

**File**: `plugins/your-plugin/webapp/view/your-plugin/index.shtml`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Your Plugin - {{app.site.shortName}}</title>
{{file.include "jpulse-header.tmpl"}}
</head>
<body>
    <div class="jp-main">
        <div class="jp-container-1000">
            <div class="jp-page-header">
                <h1>🔌 Your Plugin</h1>
                <span class="jp-subtitle">Plugin application page</span>
            </div>

            <div class="jp-card">
                <h2>Welcome</h2>
                <p>Your plugin content here...</p>
            </div>
        </div>
    </div>
{{file.include "jpulse-footer.tmpl"}}
</body>
</html>
```

### Plugin Overview Page (with Dashboard Card)

**File**: `plugins/your-plugin/webapp/view/jpulse-plugins/your-plugin.shtml`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Your Plugin - {{app.site.shortName}}</title>
{{file.include "jpulse-header.tmpl"}}
</head>
<body>
    <!-- Dashboard card (auto-discovered) -->
    <div style="display: none;">
        <!-- extract:start order=10 -->
        <a href="/jpulse-plugins/your-plugin.shtml" class="jp-card-dashboard jp-icon-btn">
            <div class="jp-icon-container">🔌</div>
            <h3 class="jp-card-title">Your Plugin</h3>
            <p class="jp-card-description">Plugin description</p>
        </a>
        <!-- extract:end -->
    </div>

    <div class="jp-main">
        <div class="jp-container-1000">
            <!-- Plugin overview content -->
        </div>
    </div>
{{file.include "jpulse-footer.tmpl"}}
</body>
</html>
```

## Step 6: Add CSS and JavaScript (Optional)

### Global CSS

**File**: `plugins/your-plugin/webapp/view/jpulse-common.css`

```css
/* Plugin: your-plugin */

.plg-your-plugin-container {
    padding: 20px;
    background: #f5f5f5;
}

/* EOF plugins/your-plugin/webapp/view/jpulse-common.css */
```

### Global JavaScript

**File**: `plugins/your-plugin/webapp/view/jpulse-common.js`

```javascript
/* Plugin: your-plugin */

if (!window.jPulse.plugins) {
    window.jPulse.plugins = {};
}

window.jPulse.plugins.yourPlugin = {
    init: function() {
        console.log('[Your Plugin] Initialized');
    }
};

// EOF plugins/your-plugin/webapp/view/jpulse-common.js
```

### Navigation Integration

**File**: `plugins/your-plugin/webapp/view/jpulse-navigation.js`

```javascript
/* Plugin: your-plugin */

// Add plugin page to existing navigation section
// The navigation structure is nested: window.jPulseNavigation.site.{sectionName}.pages.{pageKey}

// Option 1: Add to an existing section (e.g., "Hello Examples")
if (window.jPulseNavigation?.site?.siteHelloExamples) {
    window.jPulseNavigation.site.siteHelloExamples.pages.yourPlugin = {
        label: 'Your Plugin',
        url: '/your-plugin/',
        icon: '🔌'
    };
}

// Option 2: Add to jPulse Plugins section
if (window.jPulseNavigation?.site?.jPulsePlugins) {
    window.jPulseNavigation.site.jPulsePlugins.pages.yourPlugin = {
        label: 'Your Plugin Details',
        url: '/jpulse-plugins/your-plugin.shtml',
        icon: '🔌'
    };
}

// Option 3: Create a new top-level section (for complex plugins)
if (window.jPulseNavigation && window.jPulseNavigation.site) {
    if (!window.jPulseNavigation.site.yourPluginSection) {
        window.jPulseNavigation.site.yourPluginSection = {
            label: 'Your Plugin',
            url: '/your-plugin/',
            icon: '🔌',
            pages: {
                main: {
                    label: 'Main Page',
                    url: '/your-plugin/',
                    icon: '🏠'
                },
                settings: {
                    label: 'Settings',
                    url: '/your-plugin/settings.shtml',
                    icon: '⚙️'
                }
            }
        };
    }
}

// EOF plugins/your-plugin/webapp/view/jpulse-navigation.js
```

**Available Navigation Sections** (check `webapp/view/jpulse-navigation.js`):
- `admin` - Admin pages (role: admin)
- `siteHelloExamples` - Hello Examples section
- `jPulseDocs` - jPulse Documentation
- `jPulsePlugins` - Installed Plugins
- `siteAbout` - About pages

**Navigation Structure:**
```javascript
window.jPulseNavigation.site.{sectionKey} = {
    label: 'Section Label',
    url: '/section/',
    icon: '🔌',
    role: 'admin',  // Optional: restrict by role
    pages: {
        pageKey: {
            label: 'Page Label',
            url: '/page-url/',
            icon: '📄'
        }
    }
}
```

## Step 7: Add Documentation

### Developer Documentation

**File**: `README.md` (in plugin root)

```markdown
# Your Plugin

Developer-focused documentation for the plugin.

## Installation
## Configuration
## Development
## API Reference
```

### User Documentation

**File**: `docs/README.md`

```markdown
# Your Plugin

User and site admin documentation.

## Overview
## Features
## Configuration
## Usage
```

Note: Add additional pages as needed.

## Testing Your Plugin

1. **Place plugin in `plugins/` directory**
2. **Restart the server** - Plugin is auto-discovered
3. **Visit admin page**: `/admin/plugins.shtml`
4. **Enable plugin** (if not auto-enabled)
5. **Configure settings**: `/admin/plugin-config.shtml?plugin=your-plugin`
6. **Test API endpoints** in browser console
7. **View plugin pages** in browser

## Next Steps

- Review the [Hello World plugin](../installed-plugins/hello-world/README) for a complete working example
- Read the [Plugin Architecture](plugin-architecture) guide to understand how plugins integrate
- Check the [API Reference](plugin-api-reference) for all available methods
- Learn how to [publish your plugin](publishing-plugins) when ready

