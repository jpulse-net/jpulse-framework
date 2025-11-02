# jPulse Framework / Docs / Handlebars Templating v1.0.2

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

## Related Documentation

- [Template Reference](template-reference.md) - Complete template syntax reference
- [Site Customization](site-customization.md) - Customizing templates for your site
- [Getting Started](getting-started.md) - Basic jPulse development guide
