# jPulse Docs / Plugins / Creating Plugins v1.6.12

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
     * Declare which hooks your plugin implements
     */
    static hooks = {
        onAuthBeforeLogin: { priority: 50 },  // Run early (lower = earlier)
        onUserAfterSave: {}                   // Default priority 100
    };

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

**Auto-Discovery Rules for API Endpoints:**
- Method name: `static async api{HttpMethod}` (e.g., `apiGet`, `apiPost`, `apiPut`, `apiDelete`)
- URL: `/api/1/{controllerName}` (camelCase controller name becomes URL path)
- Example: `YourPluginController.apiGet` → `GET /api/1/yourPlugin`

**Auto-Discovery of Plugin Hooks:**
- Declare your hooks in the `static hooks` method
- jPulse discovers your `static hooks` declaration during bootstrap
- Registers each hook with the HookManager
- Calls your handlers at the appropriate points
- See details in [Plugin Hooks](plugin-hooks.md)

## Step 3.5: Add Handlebars Helpers (Optional) (W-116)

Handlebars helpers allow your plugin to add custom template functions that can be used in views. Helpers are automatically discovered during bootstrap using the `handlebar*` naming convention.

**File**: `plugins/your-plugin/webapp/controller/yourPlugin.js`

```javascript
export default class YourPluginController {
    /**
     * W-116: Regular helper - converts text to uppercase
     * Usage: {{uppercase "hello"}} → "HELLO"
     * Note: The description and example below are extracted by the handlebars doc system.
     * @description Convert text to UPPERCASE (hello-world plugin example)
     * @example {{uppercase "hello world"}}
     * @param {object} args - Parsed arguments (already evaluated)
     * @param {object} context - Template context
     * @returns {string} Uppercased text
     */
    static handlebarUppercase(args, context) {
        // Support multiple argument formats:
        // {{uppercase "text"}} -> args._target = "text"
        // {{uppercase text="text"}} -> args.text = "text"
        // {{uppercase user.username}} -> args._target = user.username value
        const text = args._target || args.text || '';
        return String(text).toUpperCase();
    }

    /**
     * W-116: Block helper - repeats content N times
     * Usage: {{#repeat count=3}}Hello{{/repeat}} → "HelloHelloHello"
     * Supports {{@index}} and {{@first}} / {{@last}} iteration variables
     * Note: The description and example below are extracted by the handlebars doc system.
     * @description Repeat text N times (hello-world plugin example)
     * @example {{#repeat count=3}} Hello {{@index}} {{/repeat}}
     * @param {object} args - Parsed arguments (already evaluated)
     * @param {string} blockContent - Content between opening and closing tags
     * @param {object} context - Template context
     * @returns {string} Repeated content
     */
    static async handlebarRepeat(args, blockContent, context) {
        const count = parseInt(args.count || args._target || 1, 10);
        if (count <= 0 || count > 100) {
            return ''; // Safety limit
        }

        // Build result by iterating and expanding with iteration context
        let result = '';
        for (let i = 0; i < count; i++) {
            // Create iteration context with special variables (like {{#each}})
            const iterationContext = {
                ...context,
                '@index': i,
                '@first': i === 0,
                '@last': i === count - 1,
                '@count': count
            };

            // Expand block content with iteration context
            const expanded = await context._handlebar.expandHandlebars(blockContent, iterationContext);
            result += expanded;
        }

        return result;
    }
}
```

### Auto-Discovery Rules

**Naming Convention**: Methods starting with `handlebar` are automatically discovered
- `handlebarUppercase` → `{{uppercase}}`
- `handlebarRepeat` → `{{#repeat}}`
- The method name determines the handlebar helper name:
  - to build the method name, capitalize the first character of your helper name, and prefix it with `handlebar`
  - example: helper name `myStuff` → method name method `handlebarMyStuff`

**Helper Type Detection**:
- **Regular helper**: 2 parameters `(args, context)` → `{{helperName ...}}`
- **Block helper**: 3 parameters `(args, blockContent, context)` → `{{#helperName ...}}...{{/helperName}}`
- Type is automatically detected from function signature (`function.length`)

**Registration**: Auto-discovered during bootstrap (no manual registration needed)

**Priority**: Plugin helpers can override built-in helpers, but site helpers override plugin helpers

### Helper Arguments (`args`)

All helpers receive a parsed `args` object with pre-evaluated subexpressions:

- `args._helper` - Helper name (e.g., "uppercase")
- `args._target` - First positional argument or property path value
- `args._args[]` - Array of all positional arguments
- `args.{key}` - Named arguments (e.g., `args.count` from `count=3`)

**Example**: `{{uppercase (user.lastName)}}` passes the evaluated `user.lastName` value in `args._target` (no need to parse manually).

### Context Utilities (`context._handlebar`)

Block helpers have access to framework utilities via `context._handlebar`:

- `context._handlebar.req` - Express request object
- `context._handlebar.depth` - Current recursion depth
- `context._handlebar.expandHandlebars(template, additionalContext)` - Expand nested Handlebars
- `context._handlebar.parseAndEvaluateArguments(expression, ctx)` - Parse helper arguments
- `context._handlebar.getNestedProperty(obj, path)` - Get nested property
- `context._handlebar.setNestedProperty(obj, path, value)` - Set nested property

**Note**: `context._handlebar` is filtered out before templates see the context, so it's only available to helper functions.

### Auto-Documentation with JSDoc

Helpers are automatically documented when you include JSDoc comments with `@description` and `@example` tags:

```javascript
/**
 * Regular helper description
 * @description Detailed description of what the helper does
 * @example {{helperName arg1="value"}}
 * @param {object} args - Parsed arguments
 * @param {object} context - Template context
 * @returns {string} Result description
 */
static handlebarHelperName(args, context) {
    // Implementation
}
```

**JSDoc Extraction**:
- **`@description`**: Extracted and displayed in helper documentation tables
- **`@example`**: Extracted and displayed in helper documentation tables
- Both are automatically included in the [Handlebars Helpers documentation](../../handlebars.md#summary-of-block-and-regular-handlebars) via dynamic content generation
- Examples should show the actual template syntax (e.g., `{{uppercase "text"}}`)

**Best Practices**:
- Always include `@description` for clarity
- Always include `@example` showing actual usage
- Keep examples simple and clear
- Use multi-line JSDoc for complex helpers

### Example Usage in Templates

```handlebars
{{!-- Regular helper with positional argument --}}
{{uppercase user.username}}

{{!-- Regular helper with named argument --}}
{{uppercase text="Hello World"}}

{{!-- Regular helper with subexpression (pre-evaluated) --}}
{{uppercase (user.lastName)}}

{{!-- Block helper with iteration variables --}}
{{#repeat count=3}}
    <p>Item {{@index}} of {{@count}} (first: {{@first}}, last: {{@last}})</p>
{{/repeat}}

{{!-- Block helper with CSS classes based on index --}}
{{#repeat count=5}}
    <div class="item item-{{@index}}">
        Item {{@index}} (position {{@index}} of {{@count}})
    </div>
{{/repeat}}

{{!-- Block helper with nested Handlebars --}}
{{#repeat count=2}}
    <div>{{uppercase user.firstName}}</div>
{{/repeat}}
```

**See Also**: [Handlebars Documentation - Custom Helpers](../../handlebars.md#custom-handlebars-helpers-v1317) for complete reference.

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

## Step 5: Add Plugin Hooks (Optional)

Hooks let your plugin extend framework behavior (authentication, user lifecycle, etc.).

**File**: `plugins/your-plugin/webapp/controller/yourPlugin.js`

```javascript
export default class YourPluginController {
    // Declare hooks (auto-registered by PluginManager)
    static hooks = {
        onAuthAfterLogin: {},                    // React to successful login
        onAuthBeforeSession: { priority: 50 },   // Modify session data
        onUserAfterSave: {}                      // React to user changes
    };

    // Handler method name = hook name
    static async onAuthAfterLogin(context) {
        console.log(`User ${context.user.username} logged in`);
        return context;  // Always return context
    }

    static async onAuthBeforeSession(context) {
        // Add plugin data to session
        context.sessionData.yourPlugin = { enabled: true };
        return context;
    }
}
```

**Available Hooks:**
- **Auth (7):** `onAuthBeforeLogin`, `onAuthBeforeSession`, `onAuthAfterLogin`, `onAuthFailure`, `onAuthGetSteps`, `onAuthValidateStep`, `onAuthGetWarnings`
- **User (5):** `onUserBeforeSave`, `onUserAfterSave`, `onUserBeforeDelete`, `onUserAfterDelete`, `onUserSyncProfile`

📖 **Full Documentation:** [Plugin Hooks](plugin-hooks.md) for context specs, examples, and best practices.

## Step 6: Create Views (Optional)

### Application Page

**File**: `plugins/your-plugin/webapp/view/your-plugin/index.shtml`

```html
<!DOCTYPE html>
<html {{appConfig.system.htmlAttrs}}>
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
<html {{appConfig.system.htmlAttrs}}>
<head>
    <meta charset="UTF-8">
    <title>Your Plugin - {{app.site.shortName}}</title>
{{file.include "jpulse-header.tmpl"}}
</head>
<body>
    {{#component "pluginCards.yourPlugin" order=10}}
        {{!-- This card is automatically included in the plugins dashboard --}}
        <a href="/jpulse-plugins/your-plugin.shtml" class="jp-card-dashboard jp-icon-btn">
            <div class="jp-icon-container">🔌</div>
            <h3 class="jp-card-title">Your Plugin</h3>
            <p class="jp-card-description">Plugin description</p>
        </a>
    {{/component}}

    <div class="jp-main">
        <div class="jp-container-1000">
            <!-- Plugin overview content -->
        </div>
    </div>
{{file.include "jpulse-footer.tmpl"}}
</body>
</html>
```

## Step 7: Add CSS and JavaScript (Optional)

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

## Step 8: Add Documentation

> 📚 **Markdown System Guide**: See [Markdown Documentation](../markdown-docs.md) for advanced features like dynamic content (`%DYNAMIC{}%`), file exclusion, and styling.

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

## Version Management

Plugins can use the framework's bump-version script to update version numbers across all source files.

### Configuration File

Create `webapp/bump-version.conf` in your plugin directory with:

- **filePatterns**: Glob patterns for files to process (e.g., `README.md`, `plugin.json`, `webapp/**/*.js`)
- **fileUpdateRules**: Regex patterns for version strings in specific files (e.g., `"version": "x.x.x"`)
- **headerUpdatePatterns**: Patterns for `@version` and `@release` in file headers

See `plugins/auth-mfa/webapp/bump-version.conf` for a complete example.

### Bumping Version

From your plugin directory (must contain `plugin.json`):

```bash
cd plugins/your-plugin
node ../../bin/bump-version.js 1.0.0
node ../../bin/bump-version.js 1.0.1 2025-12-08  # with specific date
```

The script auto-detects plugin context and uses `webapp/bump-version.conf`.

**Note:** The `npx jpulse bump` command is for framework and site use only. Plugins should use the direct `node` command as shown above.

## Next Steps

- Review the [Hello World plugin](../installed-plugins/hello-world/README) for a complete working example
- Read the [Plugin Architecture](plugin-architecture) guide to understand how plugins integrate
- Use [Plugin Hooks](plugin-hooks) to extend authentication, user management, and more
- Check the [API Reference](plugin-api-reference) for all available methods
- Learn how to [publish your plugin](publishing-plugins) when ready

