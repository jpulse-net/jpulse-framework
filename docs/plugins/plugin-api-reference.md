# jPulse Docs / Plugins / Plugins API Reference v1.6.11

Complete API reference for jPulse plugin developers.

## Framework REST API Endpoints

### Plugin Management

```javascript
// List all plugins
GET /api/1/plugin/list
Response: { success: true, data: [...] }

// Get plugin details
GET /api/1/plugin/:name
Response: { success: true, data: {...} }

// Get plugin configuration
GET /api/1/plugin/:name/config
Response: { success: true, data: { schema: [...], values: {...} } }

// Update plugin configuration
PUT /api/1/plugin/:name/config
Body: { field1: value1, field2: value2, ... }
Response: { success: true, message: '...', restartRequired: false }

// Enable plugin
POST /api/1/plugin/:name/enable
Response: { success: true, message: 'Plugin enabled successfully' }

// Disable plugin
POST /api/1/plugin/:name/disable
Response: { success: true, message: 'Plugin disabled successfully' }

// Get plugin dependencies
GET /api/1/plugin/:name/dependencies
Response: { success: true, data: {...} }
```

## plugin.json Schema

### Required Fields

```json
{
    "name": "plugin-name",
    "version": "1.0.0",
    "jpulseVersion": ">=1.3.0"
}
```

### Complete Schema

```json
{
    "name": "plugin-name",              // Required: Lowercase with hyphens
    "npmPackage": "@org/plugin-name",   // Optional: npm package name
    "version": "1.0.0",                 // Required: Semantic version
    "icon": "🔌",                       // Optional: Unicode emoji or SVG
    "summary": "One-line description",  // Optional: For lists
    "description": "<p>HTML...</p>",    // Optional: Rich description
    "author": "Name <email>",           // Optional: Author info
    "jpulseVersion": ">=1.3.0",         // Required: Min framework version
    "autoEnable": true,                 // Optional: Auto-enable on discovery (default: true)
    "dependencies": {
        "npm": {                        // Optional: npm packages
            "package-name": "^1.0.0"
        },
        "plugins": {                    // Optional: Other plugins
            "other-plugin": "^1.0.0"
        }
    },
    "config": {
        "schema": [...]                 // Optional: Configuration schema
    }
}
```

### Configuration Schema Field Types

```json
{
    "id": "fieldName",
    "label": "Field Label",
    "type": "text|textarea|number|boolean|select|help",
    "default": "default value",
    "required": true,
    "placeholder": "placeholder text",
    "help": "Help text displayed below field",
    "tab": "Tab Name",

    // For number fields:
    "min": 0,
    "max": 100,
    "step": 1,

    // For textarea:
    "rows": 5,

    // For select:
    "options": [
        { "value": "opt1", "label": "Option 1" },
        { "value": "opt2", "label": "Option 2" }
    ]
}
```

Plugin config blocks can use the same schema shape and flow as framework config (tabs/panels from schema, layout with `maxColumns` / `startNewRow` / `fullWidth`, virtual buttons). See [Schema-driven config forms](../front-end-development.md#-schema-driven-config-forms) in the Front-End Development Guide.

## Controller Auto-Discovery

### Method Naming Convention

```javascript
export default class YourPluginController {
    // GET /api/1/yourPlugin
    static async apiGet(req, res) { }

    // POST /api/1/yourPlugin
    static async apiPost(req, res) { }

    // PUT /api/1/yourPlugin
    static async apiPut(req, res) { }

    // DELETE /api/1/yourPlugin
    static async apiDelete(req, res) { }

    // GET /api/1/yourPlugin/custom
    static async apiGetCustom(req, res) { }

    // POST /api/1/yourPlugin/action
    static async apiPostAction(req, res) { }
}
```

**Pattern**: `static async api{HttpMethod}{OptionalPath}(req, res)`

**URL Mapping**:
- Controller: `YourPluginController`
- URL base: `/api/1/yourPlugin` (camelCase)
- Method: `apiGet` → `GET /api/1/yourPlugin`
- Method: `apiGetCustom` → `GET /api/1/yourPlugin/custom`

## Model API

### Creating Plugin Models

```javascript
import database from '../../database.js';
import { ObjectId } from 'mongodb';

export default class YourPluginModel {
    /**
     * Schema definition (for documentation and validation)
     */
    static schema = {
        _id: { type: 'objectId', auto: true },
        field1: { type: 'string', required: true },
        field2: { type: 'number', default: 0 },
        createdAt: { type: 'date', auto: true }
    };

    /**
     * Get MongoDB collection
     * Collection name: {pluginName}_{collection}
     */
    static getCollection() {
        const db = database.getDb();
        if (!db) {
            throw new Error('Database connection not available');
        }
        return db.collection('yourPlugin_items');
    }

    /**
     * Example CRUD methods using native MongoDB driver
     */
    static async find(query = {}) {
        const collection = this.getCollection();
        return await collection.find(query).toArray();
    }

    static async findOne(query) {
        const collection = this.getCollection();
        return await collection.findOne(query);
    }

    static async findById(id) {
        const collection = this.getCollection();
        return await collection.findOne({ _id: new ObjectId(id) });
    }

    static async insertOne(data) {
        const collection = this.getCollection();
        const result = await collection.insertOne({
            ...data,
            createdAt: new Date()
        });
        return result.insertedId;
    }

    static async updateOne(query, update) {
        const collection = this.getCollection();
        return await collection.updateOne(query, { $set: update });
    }

    static async deleteOne(query) {
        const collection = this.getCollection();
        return await collection.deleteOne(query);
    }
}
```

**MongoDB Driver Methods Available:**
- `find(query)` - Returns cursor (use `.toArray()`)
- `findOne(query)` - Returns single document
- `insertOne(doc)` - Insert single document
- `insertMany(docs)` - Insert multiple documents
- `updateOne(query, update)` - Update single document
- `updateMany(query, update)` - Update multiple documents
- `deleteOne(query)` - Delete single document
- `deleteMany(query)` - Delete multiple documents
- `countDocuments(query)` - Count matching documents
- `aggregate(pipeline)` - Run aggregation pipeline

### Extending Existing Framework Models

```javascript
// In your plugin's model file
import UserModel from '../../model/user.js';

// Basic schema extension (fields only)
UserModel.extendSchema({
    ldapDn: { type: 'string' },
    ldapGroups: { type: 'array' },
    customField: { type: 'string', default: '' }
});
```

**Note**: Schema extensions are applied during bootstrap before the database is accessed.

### Data-Driven User Profile Cards

Plugins can define how their data appears in admin and user profile pages using `_meta` with `adminCard`/`userCard` configuration:

```javascript
UserModel.extendSchema({
    mfa: {
        // Card-level metadata
        _meta: {
            plugin: 'auth-mfa',           // Plugin name (required)
            adminCard: {
                visible: true,
                label: 'MFA Settings',
                icon: '🔐',
                description: 'Two-factor authentication management',
                backgroundColor: '#fef9e7',
                order: 100,               // Lower = appears first
                actions: [
                    {
                        id: 'reset',
                        label: 'Reset MFA',
                        style: 'warning',  // primary, secondary, success, warning, danger
                        confirm: 'Reset MFA for this user?',
                        toast: "MFA has been reset. Don't forget to save.",
                        showIf: { field: 'mfa.enabled', equals: true },
                        setFields: {       // Modify form data locally
                            'mfa.enabled': false,
                            'mfa.secret': ''
                        }
                    }
                ]
            },
            userCard: {
                visible: true,
                label: 'Two-Factor Authentication',
                icon: '🔐',
                description: 'Secure your account',
                order: 10,
                actions: [
                    {
                        id: 'setup',
                        label: 'Enable 2FA',
                        style: 'primary',
                        showIf: { field: 'mfa.enabled', equals: false },
                        navigate: '/auth/mfa-setup'  // Redirect action
                    }
                ]
            }
        },
        // Field definitions with display attributes
        enabled: {
            type: 'boolean',
            default: false,
            label: 'Status',
            adminCard: { visible: true, readOnly: true },
            userCard: { visible: true, readOnly: true },
            displayAs: 'badge'            // badge, date, datetime, count
        },
        secret: {
            type: 'string',
            adminCard: { visible: false },  // Never show sensitive data
            userCard: { visible: false }
        },
        enrolledAt: {
            type: 'date',
            label: 'Enrolled',
            adminCard: { visible: true, readOnly: true },
            userCard: { visible: true, readOnly: true },
            displayAs: 'date',
            showIf: 'hasValue'             // Only show if field has value
        }
    }
});
```

**Action Types:**

| Type | Description |
|------|-------------|
| `setFields` | Modifies form data locally; user clicks "Save" to persist |
| `navigate` | Redirects to another page (with unsaved changes warning) |
| `handler` | Calls custom handler: `jPulse.schemaHandlers['plugin.method']` |

**ShowIf Conditions:**

```javascript
showIf: 'hasValue'                              // Field is truthy
showIf: { field: 'mfa.enabled', equals: true }  // Field equals value
showIf: { field: 'mfa.lockedUntil', condition: 'exists' }
showIf: { field: 'mfa.failedAttempts', condition: 'gt', value: 0 }
showIf: { all: [ /* multiple conditions */ ] }  // AND logic
```

**Custom Action Handlers:**

```javascript
// In plugin's webapp/view/jpulse-common.js (gets appended to framework style)
window.jPulse.schemaHandlers = window.jPulse.schemaHandlers || {};
window.jPulse.schemaHandlers['mfa.regenerateBackupCodes'] = async function(userData, formData) {
    const result = await jPulse.api.post('/api/1/auth-mfa/backup-codes');
    if (result.success) {
        // Show codes to user
        await jPulse.UI.infoDialog({ title: 'New Codes', message: result.data.codes.join('\n') });
        return { refresh: true };  // Tell UI to refresh the card
    }
    return { error: true };
};
```

## Client-Side JavaScript

### Plugin Namespace

```javascript
// Always use namespaced approach
window.jPulse.plugins.yourPlugin = {
    // Your plugin methods
    init: function() { },
    doSomething: function() { }
};

// Call from pages
jPulse.plugins.yourPlugin.doSomething();
```

### Available jPulse Utilities

```javascript
// API calls
await jPulse.api.get('/api/1/endpoint');
await jPulse.api.post('/api/1/endpoint', data);
await jPulse.api.put('/api/1/endpoint', data);
await jPulse.api.delete('/api/1/endpoint');

// DOM utilities
jPulse.dom.ready(() => { /* code */ });
jPulse.dom.select('#id');
jPulse.dom.selectAll('.class');

// UI widgets - Toast notifications
jPulse.UI.toast.success('Operation successful');
jPulse.UI.toast.error('An error occurred');
jPulse.UI.toast.info('Information message');
jPulse.UI.toast.warning('Warning message');
jPulse.UI.toast.show('Custom message', 'info');
jPulse.UI.toast.clearAll();

// UI widgets - Dialogs
await jPulse.UI.alertDialog('Alert message', { title: 'Alert' });
await jPulse.UI.infoDialog('Info message', { title: 'Information' });
await jPulse.UI.successDialog('Success message', { title: 'Success' });
const result = await jPulse.UI.confirmDialog({
    title: 'Confirm Action',
    message: 'Are you sure?',
    buttons: ['Cancel', 'OK']
});
// result.button === 'OK' or 'Cancel'

// UI widgets - Tabs and Collapsible
jPulse.UI.tabs.register('tab-id', config);
jPulse.UI.collapsible.register('collapsible-id', config);

// String utilities:
// 1. Escape HTML:
jPulse.string.escapeHtml(html);
// 2. Sanitize HTML from trusted sources: strip dangerous tags/attributes
jPulse.string.sanitizeHtml(html, strict);
// 3. Safe HTML from untrusted sources: whitelist a, strong, em, br tags only
jPulse.string.sanitizeHtml(html, strict);
// 4. Truncate string:
jPulse.string.truncate(text, length);
// 5. Slugify string: "Hello World" => "hello-world"
jPulse.string.slugify(text);

// Form utilities
jPulse.form.bindSubmission('form-id', endpoint, callback);
jPulse.form.getValues('form-id');
```

## Handlebars Helpers (View Templates)

```handlebars
{{!-- Include framework templates --}}
{{file.include "jpulse-header.tmpl"}}
{{file.include "jpulse-footer.tmpl"}}

{{!-- List files (auto-discovers from framework + site + plugins) --}}
{{#each file.list "jpulse-plugins/*.shtml" sortBy="extract-order"}}
    {{file.extract this}}
{{/each}}

{{!-- Access app configuration --}}
{{app.site.shortName}}
{{app.site.fullName}}

{{!-- User context --}}
{{#if user.isAdmin}}
    <a href="/admin/">Admin Panel</a>
{{/if}}

{{user.username}}
{{user.email}}
```

## File System Paths

### View Resolution

The framework resolves views in this priority:
1. `site/webapp/view/`
2. `plugins/*/webapp/view/` (in dependency order)
3. `webapp/view/`

This allows sites to override plugin views, and plugins to override framework views.

### Static Assets

Plugin static files are symlinked when enabled:
- Plugin: `plugins/your-plugin/webapp/static/`
- Symlink: `webapp/static/plugins/your-plugin/`
- URL: `/static/plugins/your-plugin/file.png`

### Documentation

Plugin docs are symlinked when enabled (context-aware):
- Plugin: `plugins/your-plugin/docs/`
- Symlink:
  * Framework repo: `docs/installed-plugins/your-plugin/`
  * Site install: `webapp/static/assets/jpulse-docs/installed-plugins/your-plugin/`
- URL: `/jpulse-docs/installed-plugins/your-plugin/README` (same for both)

## CSS and JavaScript Loading

### Auto-Loaded Files

These files are automatically concatenated with framework files:
- `webapp/view/jpulse-common.css` → Appended to framework CSS
- `webapp/view/jpulse-common.js` → Appended to framework JavaScript
- `webapp/view/jpulse-navigation.js` → Appended to navigation config

**Load Order**: Framework → Site → Plugins (in dependency order)

### CSS Naming Convention

Always prefix CSS classes with `plg-{plugin-name}-`:

```css
/* Good */
.plg-auth-ldap-login-form { }
.plg-auth-ldap-error-message { }

/* Bad */
.login-form { }  /* Could conflict with framework or other plugins */
```

### JavaScript Naming Convention

Always use plugin namespace:

```javascript
/* Good */
window.jPulse.plugins.authLdap = {
    login: function() { }
};

/* Bad */
function login() { }  /* Pollutes global namespace */
```

## Database Collections

Prefix plugin collections with plugin name (camelCase):

```javascript
// Good - in getCollection() method
return db.collection('authLdap_sessions');
return db.collection('authLdap_users');
return db.collection('yourPlugin_items');

// Bad - could conflict with framework or other plugins
return db.collection('sessions');
return db.collection('users');
```

**Convention**: `{pluginNameCamelCase}_{collectionName}`
- Plugin: `auth-ldap` → Collection: `authLdap_sessions`
- Plugin: `hello-world` → Collection: `helloWorld_items`

## Error Handling

### In Controllers

```javascript
import CommonUtils from '../../utils/common.js';

static async apiGet(req, res) {
    try {
        // Your code
        return res.json({ success: true, data });
    } catch (error) {
        return CommonUtils.sendError(req, res, 500,
            'Error message', 'ERROR_CODE', error.message);
    }
}
```

### In Client-Side Code

```javascript
try {
    const response = await jPulse.api.get('/api/1/yourPlugin');
    if (response.success) {
        // Handle success
    } else {
        jPulse.UI.toast.error(response.error);
    }
} catch (error) {
    jPulse.UI.toast.error('Network error: ' + error.message);
}
```

## See Also

- [Creating Plugins](creating-plugins.md) - Step-by-step guide
- [Plugin Hooks](plugin-hooks.md) - Extend framework behavior with hooks
- [Plugin Architecture](plugin-architecture.md) - How it works
- [Managing Plugins](managing-plugins.md) - Admin guide
- [Hello World Plugin](../installed-plugins/hello-world/README.md) - Complete example
