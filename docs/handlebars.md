# jPulse Framework / Docs / Handlebars Templating v0.9.3

The jPulse Framework uses server-side Handlebars templating to create dynamic web pages. This document provides a comprehensive guide to using Handlebars in your jPulse applications.

**🎯 Live Examples:** See the [Handlebars Examples](/jpulse-examples/handlebars.shtml) page, which provides interactive examples with source code for all the concepts covered in this guide.

## Overview

Handlebars is a semantic templating language that allows you to build dynamic HTML pages by embedding expressions within your templates. The jPulse Framework processes these templates server-side, so the browser receives fully rendered HTML.

## Basic Syntax

### Variables
Use double curly braces to output variables:
```handlebars
{{app.name}}
{{user.firstName}}
{{config.email.adminEmail}}
```

### Conditionals
Use `#if` blocks for conditional rendering:
```handlebars
{{#if user.authenticated}}
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

#### Loop Variables
- `{{this}}` - Current item value
- `{{@index}}` - Zero-based index (0, 1, 2...)
- `{{@first}}` - True for first item
- `{{@last}}` - True for last item
- `{{@key}}` - Property name when iterating over objects

### Nested Conditionals
You can nest conditionals for complex logic:
```handlebars
{{#if user.authenticated}}
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

## Context Variables

The jPulse Framework provides several context objects that are available in all templates:

### App Context
- `{{app.name}}` - Application name
- `{{app.version}}` - Current application version
- `{{app.release}}` - Current application release date

### User Context
- `{{user.username}}` - User's username
- `{{user.loginId}}` - User's loginId
- `{{user.firstName}}` - User's first name
- `{{user.nickName}}` - User's nickname
- `{{user.lastName}}` - User's last name
- `{{user.initials}}` - User's initials
- `{{user.email}}` - User's email address
- `{{user.roles}}` - Comma-separated user roles
- `{{user.authenticated}}` - Login status (true/false)
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
{{#if user.authenticated}}
    Welcome, {{user.firstName}}!
{{else}}
    Welcome, Guest!
{{/if}}
```

### 3. Keep Templates Clean
Avoid complex logic in templates. Use the controller to prepare data:
```handlebars
<!-- Good -->
{{#if user.hasAdminAccess}}
    <div class="admin-panel">...</div>
{{/if}}

<!-- Avoid complex conditions in templates, currenty not supported -->
{{#if (and user.authenticated user.isAdmin config.features.adminPanel)}}
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
