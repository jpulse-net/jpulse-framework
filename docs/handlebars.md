# jPulse Docs / Handlebars Templating v1.3.3

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

### Comments
Use Handlebars comments for notes that should not appear in the rendered output:

```handlebars
{{!-- This is a Handlebars comment - stripped during processing --}}
{{!--
Multi-line comments are also supported
and will be completely removed from output
--}}

<!-- This is an HTML comment - visible in browser source -->
```

**Key Differences:**
- `{{!-- --}}` - Handlebars comments are **removed** during server-side processing
- `<!-- -->` - HTML comments are **preserved** in the rendered HTML (visible in browser source)

**Use Cases for Handlebars Comments:**
- Component library documentation (won't appear in rendered pages)
- Template notes for developers (never sent to browser)
- Comments in JavaScript files processed as Handlebars templates
- Temporary debugging notes during development

**Example:**
```handlebars
{{!-- SVG Icon Component Library
     These components are used throughout the application
     Updated: 2025-11-24
--}}
{{#component "jpIcons.configSvg" fillColor="currentColor" size="64"}}
    <svg width="{{size}}" height="{{size}}">...</svg>
{{/component}}
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
- `{{i18n.controller.*}}` - Controller messages
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

**With filename sorting:**
```handlebars
{{#each file.list "admin/*.shtml" sortBy="filename"}}
    <li>{{this}}</li>
{{/each}}
```

The `file.list` helper supports:
- Glob patterns: `"admin/*.shtml"`, `"docs/*.md"`, `"projects/*/*.shtml"` (supports multiple wildcards in path)
- **Note:** Recursive patterns (`**`) are not supported. Use single-level wildcards (`*`) only.
- **Multi-level patterns:** Patterns like `projects/*/*.shtml` work by recursively searching subdirectories
- Site overrides: Automatically searches `site/webapp/view/` first, then `webapp/view/`
- Sorting: `sortBy="filename"` (alphabetical)

### Include Components from Files

Use `file.includeComponents` to register components from multiple files and make them available in the `components` context. This is particularly useful for dashboard pages that aggregate cards from multiple source files:

```handlebars
<!-- Register all admin dashboard cards -->
{{file.includeComponents "admin/*.shtml" component="adminCards.*"}}

<!-- Render all registered cards -->
{{#each components.adminCards}}
    {{this}}
{{/each}}
```

**Define components in source files** (e.g., `admin/config.shtml`):
```handlebars
{{#component "adminCards.config" order=10}}
    <a href="/admin/config.shtml" class="jp-card-dashboard jp-icon-btn">
        <div class="jp-icon-container">{{components.jpIcons.configSvg size="64"}}</div>
        <h3 class="jp-card-title">Configuration</h3>
        <p class="jp-card-description">Manage site configuration</p>
    </a>
{{/component}}
```

**Parameters:**
- `glob-pattern` (required): File pattern to search (e.g., `"admin/*.shtml"`)
- `component="namespace.*"` (optional): Filter components by namespace pattern
- `sortBy="method"` (optional): Sort method - `"component-order"` (default), `"plugin-order"`, `"filename"`, `"filesystem"`

**Sort Methods:**
- `component-order` (default): Sort by the `order=N` parameter in component definitions
- `plugin-order`: Sort by plugin dependency resolution order (for plugin dashboards)
- `filename`: Alphabetical sorting by filename
- `filesystem`: Natural filesystem order (no sorting)

**Example - Plugin Dashboard:**
```handlebars
<!-- Register plugin cards sorted by dependency order -->
{{file.includeComponents "jpulse-plugins/*.shtml" component="pluginCards.*" sortBy="plugin-order"}}

<!-- Render plugin cards -->
{{#each components.pluginCards}}
    {{this}}
{{/each}}
```

**Features:**
- **Silent registration:** Components are registered without output, then rendered via `{{#each}}`
- **Pattern filtering:** Use `component="namespace.*"` to register only specific namespaced components
- **Flexible sorting:** Choose sort method based on dashboard requirements
- **Component expansion:** Components are fully expanded (including nested components and i18n) before registration
- **Site overrides:** Automatically uses site overrides when available
- **Security:** Path traversal protection, errors logged server-side only

## Reusable Components

The jPulse Framework supports reusable Handlebars components for eliminating code duplication. Components are template fragments that can be defined once and reused multiple times with different parameters.

### Component Definition

Define components using the `{{#component}}` block helper:

```handlebars
{{#component "widgets.buttonPrimary" text="Click Me" size="medium"}}
    <button class="btn btn-primary btn-{{size}}">
        {{text}}
    </button>
{{/component}}
```

**Component naming rules:**
- Must start with a letter
- Can contain letters, numbers, underscores, hyphens, and dots (for namespaces)
- Must end with a letter or number
- Examples: `icon-box`, `userCard`, `Button_Large`, `svg-icon-2`, `jpIcons.configSvg`

### Component Usage

Use components with the `{{components.componentName}}` syntax:

```handlebars
<!-- Use with default parameters -->
{{components.widgets.buttonPrimary}}

<!-- Override specific parameters -->
{{components.widgets.buttonPrimary text="Submit" size="large"}}
```

**Naming convention:**
- Use namespaces for better separation of concerns, such as `jpIcons.logsSvg`
- Component names are converted from kebab-case to camelCase for usage
- `logs-svg` becomes `{{components.logsSvg}}`
- `user-card` becomes `{{components.userCard}}`
- `icon` remains `{{components.icon}}`
- Namespaced: `jpIcons.logs-svg` becomes `{{components.jpIcons.logsSvg}}`

### Component Parameters

Components support both user-defined parameters and special framework parameters:

**User Parameters:**
```handlebars
{{components.jpIcons.logsSvg size="48" fillColor="#007bff"}}
```

**Framework Parameters (prefixed with `_`):**

`_inline` - Removes newlines and collapses whitespace for inline use in JavaScript:
```handlebars
<!-- In JavaScript object literal -->
<script>
const navConfig = {
    icon: `{{components.jpIcons.configSvg size="24" _inline=true}}`
};
</script>
```

**Features:**
- Framework parameters (starting with `_`) are not passed to component context
- `_inline=true` strips newlines and collapses whitespace to single spaces
- Useful for embedding SVG in JavaScript strings without line breaks

### Namespaced Components

Components support optional dot-notation namespaces for organization:

```handlebars
<!-- Define namespaced components -->
{{#component "jpIcons.configSvg" size="64"}}
    <svg width="{{size}}">...</svg>
{{/component}}

{{#component "icons.userSvg" size="64"}}
    <svg width="{{size}}">...</svg>
{{/component}}

{{#component "buttons.primary" text="Click"}}
    <button>{{text}}</button>
{{/component}}

<!-- Use namespaced components -->
{{components.jpIcons.configSvg size="32"}}
{{components.siteIcons.userSvg size="48"}}
{{components.buttons.primary text="Submit"}}
```

**Benefits:**
- Organize components by category (icons, buttons, cards, etc.)
- Avoid naming collisions as component library grows
- Clear component purpose from namespace
- Optional - flat naming (`config-svg`) still works

### Component Libraries

Create reusable component libraries by defining multiple components in `.tmpl` files:

**File: `webapp/view/components/svg-icons.tmpl`**
```handlebars
<!-- SVG Icon Component Library -->

{{#component "jpIcons.logsSvg" fillColor="currentColor" size="64"}}
    <svg width="{{size}}" height="{{size}}" viewBox="0 0 128 128" fill="none">
        <rect x="20" y="85" width="10" height="22" fill="{{fillColor}}"/>
        <rect x="36" y="64" width="10" height="43" fill="{{fillColor}}"/>
        <rect x="52" y="75" width="10" height="32" fill="{{fillColor}}"/>
    </svg>
{{/component}}

{{#component "jpIcons.usersSvg" fillColor="currentColor" size="64"}}
    <svg width="{{size}}" height="{{size}}" viewBox="0 0 128 128" fill="none">
        <circle cx="64" cy="36" r="20" fill="{{fillColor}}"/>
        <path d="M 25 100 Q 25 68, 64 68 T 103 100" fill="{{fillColor}}"/>
    </svg>
{{/component}}
```

> **Note:** The `svg-icons.tmpl` component library is already included in all pages via `jpulse-header.tmpl`, so you can use these components without any `{{file.include}}` statement.

**Use in your pages:**
```handlebars
<div class="icon-container">
    {{components.jpIcons.logsSvg size="48" fillColor="#007bff"}}
</div>

<div class="icon-container">
    {{components.jpIcons.usersSvg size="32"}}
</div>
```

### Nested Components

Components can call other components:

```handlebars
<!-- Define a wrapper component that uses another component -->
{{#component "widgets.card-with-icon" title="Dashboard" iconSize="32"}}
    <div class="card">
        <div class="card-icon">
            {{components.jpIcons.configSvg size=iconSize}}
        </div>
        <h3>{{title}}</h3>
    </div>
{{/component}}

<!-- The jpIcons.configSvg component is already defined in svg-icons.tmpl -->

<!-- Usage -->
{{components.widgets.cardWithIcon title="System Status" iconSize="48"}}
```

**Limitations:**
- Maximum nesting depth: 16 levels (configurable in `appConfig.controller.handlebar.maxIncludeDepth`)
- Circular references are detected and prevented
- Components do not inherit variables from calling context (pass parameters explicitly)

### Component Error Handling

Component errors are handled gracefully:

**Development/Test Mode:**
```handlebars
{{components.nonexistentComponent}}
```
This generates output:<br/>
`<!-- Error: Component "nonexistentComponent" not found. Did you forget to include the component library? -->`

**Production Mode:**
- Errors are logged server-side only
- No visible output in rendered HTML

**Circular reference detection:**
```handlebars
{{#component "comp-a"}}
    {{components.compB}}
{{/component}}

{{#component "comp-b"}}
    {{components.compA}}
{{/component}}

{{components.compA}}
```
This generates output:<br/>
`<!-- Error: Circular component reference detected: compA → compB → compA -->`

### Best Practices

1. **Organize components in libraries:**
   - Create themed component files: `svg-icons.tmpl`, `buttons.tmpl`, `cards.tmpl`
   - Store in `site/webapp/view/components/`
     - Don't use `webapp/view/components/`, which is jPulse Framework specific

2. **Use descriptive names:**
   - Good: `icon-user`, `iconUser`, `button-primary`, `card-dashboard`
   - Avoid: `icon1`, `btn`, `c`

3. **Provide sensible defaults:**
   - Set default parameter values that work in most cases
   - Override only when needed

4. **Keep components focused:**
   - Each component should do one thing well
   - Combine simple components for complex UI elements

5. **Document your components:**
   - Add comments explaining parameters and usage
   - Provide examples in component library files

## Error Handling

The Handlebars system includes robust error handling for various scenarios:

### Safe Iteration
```handlebars
<!-- Safe handling of null/undefined -->
{{#each possiblyUndefined}}
    <p>{{this}}</p>
{{/each}}
<!-- If possiblyUndefined is null/undefined, no output is generated -->
```

### Type Checking
```handlebars
<!-- Invalid data types show error comments -->
{{#each stringValue}}
    <p>{{this}}</p>
{{/each}}
```
If stringValue is a string (not array/object), it generates output:<br/>
`<!-- Error: Cannot iterate over non-iterable value: string -->`

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
- [Site Navigation Guide](site-navigation.md) - Customizing site navigation with direct mutation
- [Front-End Development Guide](front-end-development.md) - Client-side Handlebars expansion
- [Site Customization](site-customization.md) - Customizing templates for your site
- [Getting Started](getting-started.md) - Basic jPulse development guide
