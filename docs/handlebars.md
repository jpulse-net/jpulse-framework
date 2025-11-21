# jPulse Framework / Docs / Handlebars Templating v1.2.1

The jPulse Framework uses server-side Handlebars templating to create dynamic web pages. This document provides a comprehensive guide to using Handlebars in your jPulse applications.

**🎯 Live Examples:** See the [Handlebars Examples](/jpulse-examples/handlebars.shtml) page, which provides interactive examples with source code for all the concepts covered in this guide.

## Overview

Handlebars is a semantic templating language that allows you to build dynamic HTML pages by embedding expressions within your templates. The jPulse Framework processes these templates server-side, so the browser receives fully rendered HTML.

## Basic Syntax

### Variables
Use double curly braces to output variables:
```handlebars
{{app.jPulse.name}}
{{user.firstName}}
{{config.email.adminEmail}}
```

### Conditionals
Use `#if` blocks for conditional rendering:
```handlebars
{{#if user.isAuthenticated}}
    <p>Welcome back, {{user.firstName}}!</p>
{{else}}
    <p>Please log in to continue.</p>
{{/if}}
```

Use `#unless` blocks for inverse conditional rendering (when condition is false):
```handlebars
{{#unless user.isAuthenticated}}
    <p>Please log in to continue.</p>
{{/unless}}
```

**Note:** The `{{#unless}}` helper does not support `{{else}}` blocks. If you need else functionality, use `{{#if}}` with `{{else}}` instead:

```handlebars
<!-- Using unless (no else support) -->
{{#unless user.isAuthenticated}}
    <p>Please log in to continue.</p>
{{/unless}}

<!-- Equivalent using if/else -->
{{#if user.isAuthenticated}}
    <p>Welcome back, {{user.firstName}}!</p>
{{else}}
    <p>Please log in to continue.</p>
{{/if}}
```

### Loops
Use `#each` blocks to iterate over different data structures:

#### Array of Strings
```handlebars
{{#each user.roles}}
    <span class="jp-role-badge jp-role-{{this}}">{{this}}</span>
{{/each}}
```

#### Array of Objects
```handlebars
{{#each users}}
    <div class="jp-user-card">
        <h4>{{this.firstName}} {{this.lastName}}</h4>
        <p>Email: {{this.email}}</p>
        <p>Index: {{@index}} | First: {{@first}} | Last: {{@last}}</p>
    </div>
{{/each}}
```

#### Object Keys
```handlebars
{{#each config.features}}
    <div class="jp-feature">
        <strong>{{@key}}:</strong> {{this}}
    </div>
{{/each}}
```

#### Nested Object Properties
Access deep object properties using dot notation:
```handlebars
{{#each employees}}
    <div class="employee-card">
        <h4>{{this.profile.firstName}} {{this.profile.lastName}}</h4>
        <p>Department: {{this.department}}</p>
        <p>Email: {{this.contact.email}}</p>
        {{#if this.contact.phone}}
            <p>Phone: {{this.contact.phone}}</p>
        {{/if}}
    </div>
{{/each}}
```

#### Loop Variables (Special Context Variables)

The `{{#each}}` helper provides special variables within the iteration context:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `{{this}}` | Any | Current array element or object value | Current item |
| `{{@index}}` | Number | Zero-based index of current iteration | `0, 1, 2, ...` |
| `{{@first}}` | Boolean | `true` if this is the first iteration | `true` or `false` |
| `{{@last}}` | Boolean | `true` if this is the last iteration | `true` or `false` |
| `{{@key}}` | String | Property name (object iteration only) | `'theme', 'language'` |

### Nested Conditionals
You can nest conditionals for complex logic (v0.7.20+):
```handlebars
{{#if user.isAuthenticated}}
    {{#if user.isAdmin}}
        <div class="jp-info-box">
            <p>Admin Panel Access:</p>
            {{#if config.features.adminPanel}}
                <p>✅ Admin panel is enabled</p>
            {{else}}
                <p>❌ Admin panel is disabled</p>
            {{/if}}
        </div>
    {{else}}
        <p>Regular user - limited access</p>
    {{/if}}
{{/if}}
```

### Nested Blocks
Complex template scenarios with nested blocks are fully supported (v0.7.20+):

```handlebars
<!-- Nested {{#if}} within {{#each}} -->
{{#each users}}
    <div class="user-card">
        {{#if this.active}}
            <span class="badge">Active</span>
        {{/if}}
        <h3>{{this.name}}</h3>
    </div>
{{/each}}

<!-- Nested {{#each}} loops -->
{{#each books}}
    <div class="book">
        <h2>{{this.title}}</h2>
        {{#each this.chapters}}
            <div class="chapter">Chapter {{@index}}: {{this}}</div>
        {{/each}}
    </div>
{{/each}}
```

## Context Variables

The jPulse Framework provides several context objects that are available in all templates:

### App Context
- `{{app.jPulse.name}}` - jPulse Framework application name
- `{{app.jPulse.version}}` - Current jPulse Framework application version
- `{{app.jPulse.release}}` - Current jPulse Framework application release date
- `{{app.site.name}}` - Custom site name
- `{{app.site.version}}` - Current site version
- `{{app.site.release}}` - Current site release date
- `{{app.site.copyright}}` - Custom site copyright notice

### User Context
- `{{user.username}}` - User's username
- `{{user.loginId}}` - User's loginId
- `{{user.firstName}}` - User's first name
- `{{user.nickName}}` - User's nickname
- `{{user.lastName}}` - User's last name
- `{{user.initials}}` - User's initials
- `{{user.email}}` - User's email address
- `{{user.roles}}` - JSON array of user roles
- `{{user.isAuthenticated}}` - Login status (true/false)
- `{{user.isAdmin}}` - Admin status (true/false)

### URL Context
- `{{url.protocol}}` - HTTP or HTTPS
- `{{url.hostname}}` - Domain name
- `{{url.port}}` - Port number
- `{{url.pathname}}` - URL path
- `{{url.search}}` - Query string
- `{{url.domain}}` - Full domain with port
- `{{url.param.name}}` - Query parameters (replace 'name' with parameter name)

### Configuration
- `{{config.email.adminEmail}}` - Administrator email address
- `{{config.*}}` - Consult webapp/model/config.js for available fields

### Internationalization (i18n)
- `{{i18n.view.home.*}}` - Home page messages
- `{{i18n.view.home.introduction}}` - Introduction message
- `{{i18n.view.auth.*}}` - Authentication messages
- `{{i18n.common.*}}` - Common messages across the application
- `{{i18n.*}}` - Consult the translation files at webapp/translations/ for available fields

## File Operations

The jPulse Framework provides special helpers for file operations:

### Template Includes
Include other template files:
```handlebars
{{file.include "jpulse-header.tmpl"}}
{{file.include "jpulse-navigation.tmpl"}}
{{file.include "my-own-stuff.tmpl" someKey="some value" sleepy=true}}
```

You can define parameters, and use them in the included template, such as this in above example:
```handlebars
{{#if sleepy}}
    ...
{{else}}
    ...
{{/if}}
```

### File Timestamps
Get the last modified timestamp of a file:
```handlebars
{{file.timestamp "jpulse-footer.tmpl"}}
<!-- Use the file timestamp for browser cache busting: -->
<link rel="stylesheet" href="/jpulse-common.css?t={{file.timestamp "jpulse-common.css"}}">
```

### File Existence
Check if a file exists:
```handlebars
{{#if (file.exists "custom-template.tmpl")}}
    {{file.include "custom-template.tmpl"}}
{{else}}
    {{file.include "default-template.tmpl"}}
{{/if}}
```

### File Listing
List files matching a glob pattern:
```handlebars
{{#each file.list "admin/*.shtml"}}
    <p>{{this}}</p>
{{/each}}
```

**With sorting by extract order:**
```handlebars
{{#each file.list "admin/*.shtml" sortBy="extract-order"}}
    {{file.extract this}}
{{/each}}
```

**With pattern parameter (for file.extract):**
```handlebars
{{#each file.list "docs/*.md" pattern="/<!-- card -->(.*?)<!-- \/card -->/s"}}
    {{file.extract this}}
{{/each}}
```

**With pattern and sorting:**
```handlebars
{{#each file.list "admin/*.shtml" pattern=".local-extract" sortBy="extract-order"}}
    {{file.extract this}}
{{/each}}
```

> **Note:** When using `sortBy="extract-order"`, the `pattern` parameter must be specified in the `file.list` call (not in individual `file.extract` calls). This is because sorting happens before the loop iterates, so the pattern must be known at sorting time.

The `file.list` helper supports:
- Glob patterns: `"admin/*.shtml"`, `"docs/*.md"`, `"projects/*/*.shtml"` (supports multiple wildcards in path)
- **Note:** Recursive patterns (`**`) are not supported. Use single-level wildcards (`*`) only.
- **Multi-level patterns:** Patterns like `projects/*/*.shtml` work by recursively searching subdirectories
- Site overrides: Automatically searches `site/webapp/view/` first, then `webapp/view/`
- Sorting: `sortBy="extract-order"` or `sortBy="filename"`
- Pattern passing: `pattern="..."` parameter passed to `file.extract` in the loop

### File Extraction
Extract content from files using comment markers or regex patterns:

**Using comment markers (default):**
```handlebars
{{file.extract "admin/users.shtml"}}
```

In the source file (`admin/users.shtml`):
```html
<!-- extract:start order=10 -->
<a href="/admin/users.shtml" class="jp-card-dashboard">
    <h3>User Management</h3>
    <p>Manage users and permissions</p>
</a>
<!-- extract:end -->
```

**Using regex pattern:**
```handlebars
{{file.extract "admin/users.shtml" pattern="/<div class=\"card\">(.*?)<\/div>/s"}}
```

**Supported marker formats:**
- HTML comments: `<!-- extract:start order=N -->...<!-- extract:end -->`
- Block comments: `/* extract:start order=N */.../* extract:end */`
- Line comments (JS): `// extract:start order=N ... // extract:end`
- Line comments (Python): `# extract:start order=N ... # extract:end`

**Features:**
- Order extraction: `order=N` attribute for sorting (default: 99999)
- Multiple formats: Supports HTML, CSS/JS block, and line comments
- Regex support: Use `/pattern/flags` format with mandatory capture group `(...)`
- Site overrides: Automatically uses site overrides when available
- Security: Path traversal protection, errors logged server-side only

### Error Handling

The Handlebars system includes robust error handling:

**Safe Iteration:**
```handlebars
<!-- Safe handling of null/undefined -->
{{#each possiblyUndefined}}
    <p>{{this}}</p>
{{/each}}
<!-- If possiblyUndefined is null/undefined, no output is generated -->
```

**Type Checking:**
```handlebars
<!-- Invalid data types show error comments -->
{{#each stringValue}}
    <p>{{this}}</p>
{{/each}}
<!-- If stringValue is a string (not array/object), generates:
     <!-- Error: Cannot iterate over non-iterable value: string --> -->
```

## Best Practices

### 1. Use Semantic Variable Names
Choose descriptive variable names that clearly indicate their purpose:
```handlebars
<!-- Good -->
{{user.firstName}} {{user.lastName}}

<!-- Avoid -->
{{u.fn}} {{u.ln}}
```

### 2. Handle Missing Data Gracefully
Always consider what happens when data might be missing:
```handlebars
{{#if user.isAuthenticated}}
    Welcome, {{user.firstName}}!
{{else}}
    Welcome, Guest!
{{/if}}
```

### 3. Keep Templates Clean
Avoid complex logic in templates. Use the controller to prepare data:
```handlebars
<!-- Good -->
{{#if user.isAdmin}}
    <div class="admin-panel">...</div>
{{/if}}

<!-- Avoid complex conditions in templates, currenty not supported -->
{{#if and: user.isAuthenticated user.isAdmin}}
    <div class="admin-panel">...</div>
{{/if}}
```

### 4. Use Consistent Naming
Follow consistent naming conventions for CSS classes and IDs:
```handlebars
<div class="jp-user-info">
    <span class="jp-user-name">{{user.firstName}} {{user.lastName}}</span>
    <span class="jp-user-email">{{user.email}}</span>
</div>
```

## Template Organization

### Site Structure
- **Framework templates**: Located in `webapp/view/`
- **Site-specific templates**: Located in `site/webapp/view/`
- **Common includes**: `jpulse-header.tmpl`, `jpulse-footer.tmpl`, `jpulse-navigation.tmpl`

### Template Types
- **`.shtml` files**: Complete HTML pages
- **`.tmpl` files**: Template fragments for inclusion
- **`.css.tmpl` files**: Dynamic CSS with Handlebars variables

## Advanced Features

### Custom Helpers
The jPulse Framework can be extended with custom Handlebars helpers for specific functionality. Contact jPulse.net.

### Template Caching
Templates are cached for performance. Restart the development server to see changes during development.

### Site Overrides
Site-specific templates can override framework templates by placing them in the same relative path within the site directory.

## Examples

For live examples of Handlebars usage, see the [Handlebars Examples](/jpulse-examples/handlebars.shtml) page, which provides interactive examples with source code for all the concepts covered in this guide.

## Client-Side Handlebars Expansion

For client-side dynamic content generation, you can expand Handlebars templates on demand using the API endpoint:

**API Endpoint:** `POST /api/1/handlebar/expand`

This endpoint allows you to expand Handlebars expressions in JavaScript with full access to server-side context (user, app, config, etc.) plus any custom context you provide.

**Example:**
```javascript
const result = await jPulse.api.post('/api/1/handlebar/expand', {
    text: 'Hello {{user.firstName}}! You have {{count}} notifications.',
    context: { count: 5 }
});
// Result: "Hello John! You have 5 notifications."
```

> **See Also:** [Front-End Development Guide](front-end-development.md) for complete client-side Handlebars expansion documentation and use cases.

## Related Documentation

- [Template Reference](template-reference.md) - Complete template syntax reference
- [Front-End Development Guide](front-end-development.md) - Client-side Handlebars expansion
- [Site Customization](site-customization.md) - Customizing templates for your site
- [Getting Started](getting-started.md) - Basic jPulse development guide
