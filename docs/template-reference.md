# jPulse Docs / Template Reference v1.6.16

> **Need comprehensive template details?** This reference covers all template features, security, performance, and development patterns. For a quick introduction to Handlebars syntax, see [Handlebars Quick Start](handlebars-quick-start.md).

Complete reference for server-side template development with the jPulse Handlebars system, covering template variables, file operations, security features, and best practices for building dynamic web pages.

**🎯 Live Examples:** See the [Handlebars Examples](/jpulse-examples/handlebars.shtml) page for interactive demonstrations of all template features with working code examples.

## 🎯 Overview

The jPulse Framework uses a custom Handlebars implementation for server-side template processing. This system provides minimal initial page rendering with basic context, while the majority of dynamic functionality is handled by client-side JavaScript and API calls.

### Template Architecture
- **Server-Side Role**: Initial page structure, authentication state, configuration, and SEO elements (~20% of view logic)
- **Client-Side Role**: Dynamic content, user interactions, API calls, and real-time updates (~80% of view logic)
- **Security First**: Path traversal protection, include depth limiting, and input sanitization
- **Performance Optimized**: Template and include file caching with configurable TTL

### Template Processing Flow
1. **File Resolution**: Check for site overrides first, then framework defaults
2. **SSI Processing**: Process `{{file.include}}` directives
3. **Handlebars Compilation**: Compile template with context data
4. **Variable Substitution**: Replace `{{variables}}` with actual values
5. **Output Generation**: Generate final HTML for client
6. **Client Enhancement**: JavaScript takes over for dynamic functionality

## 📄 Template File Structure

### File Extensions and Locations
Templates use the `.shtml` extension and follow the MVC directory structure:

```
site/webapp/view/           # Site override templates (checked first)
├── jpulse-navigation.js    # Site navigation overrides (W-098)
├── components/
│   └── custom-icons.tmpl   # Site-specific component library
├── home/
│   └── index.shtml         # Site-specific home page override
└── custom/
    └── dashboard.shtml     # Site-specific custom page

webapp/view/                # Framework templates (checked second)
├── jpulse-header.tmpl      # Include for common head section
├── jpulse-footer.tmpl      # Include for common footer (page decoration, JavaScript)
├── jpulse-navigation.js    # Framework navigation structure (site nav, breadcrumbs, tabs)
├── components/
│   └── svg-icons.tmpl      # Framework component library
├── home/
│   └── index.shtml         # Home page template
├── auth/
│   ├── login.shtml         # Login page
│   └── logout.shtml        # Logout page
├── admin/
│   ├── index.shtml         # Admin dashboard
│   ├── logs.shtml          # System logs analysis (v0.9.5+)
│   ├── users.shtml         # User management
│   └── config.shtml        # Site configuration
└── error/
    └── index.shtml         # Error page template
```

> **Navigation Customization:** See [Site Navigation Guide](site-navigation.md) for complete documentation on customizing site navigation.

> **Sidebar System:** See [Sidebars Guide](sidebars.md) for left/right sidebars with component-based architecture and responsive design.

### URL Routing
Templates are accessed via clean URLs:

```bash
# Template file: webapp/view/home/index.shtml
GET /home/                  # Loads home/index.shtml
GET /home/index.shtml       # Direct template access

# Template file: webapp/view/admin/users.shtml
GET /admin/users.shtml      # Loads admin/users.shtml

# Site override: site/webapp/view/custom/dashboard.shtml
GET /custom/dashboard.shtml # Loads site override
```

## 🔧 Template Variables

Templates have access to a rich context object with application data, user information, and configuration settings.

### Application Information

```html
{{!-- Application metadata --}}
<title>{{app.jPulse.name}} v{{app.jPulse.version}}</title>
<meta name="generator" content="{{app.jPulse.name}} {{app.jPulse.version}}">
<span class="version">Version {{app.jPulse.version}} ({{app.jPulse.release}})</span>

{{!-- Example output: --}}
<title>jPulse Framework v1.0.0</title>
<span class="version">Version 1.0.0 (2025-10-01)</span>
```

### User Context

```html
{{!-- Authentication state --}}
{{#if user.isAuthenticated}}
    <div class="user-panel">
        <span>Welcome, {{user.firstName}}!</span>
        <a href="/auth/logout.shtml">Logout</a>
    </div>
{{else}}
    <div class="guest-panel">
        <a href="/auth/login.shtml">Sign In</a>
    </div>
{{/if}}

{{!-- User profile information --}}
<div class="profile">
    <h2>{{user.firstName}} {{user.lastName}}</h2>
    <p>Email: {{user.email}}</p>
    <p>Username: {{user.username}}</p>
    <p>Role: {{user.roles}}</p>
    <p>Last Login: {{user.lastLogin}}</p>
</div>

{{!-- User preferences --}}
<body class="theme-{{user.preferences.theme}} lang-{{user.preferences.language}}">
```

### Configuration Access

```html
{{!-- Application configuration --}}
<div style="max-width: {{appConfig.view.maxWidth}}px;">
    <input maxlength="{{appConfig.controller.log.maxMsgLength}}">
    <span>Environment: {{appConfig.app.environment}}</span>
</div>

{{!-- Site configuration --}}
<footer>
    <p>Contact: <a href="mailto:{{siteConfig.email.adminEmail}}">{{siteConfig.email.adminName}}</a></p>
    {{#if siteConfig.messages.broadcast}}
        <div class="broadcast-message">{{siteConfig.messages.broadcast}}</div>
    {{/if}}
</footer>
```

### URL Information

```html
{{!-- URL components --}}
<base href="{{url.domain}}">
<span>Current page: {{url.pathname}}</span>
<span>Server: {{url.hostname}}:{{url.port}}</span>

{{!-- URL parameters --}}
{{#if url.param.redirect}}
    <input type="hidden" name="redirect" value="{{url.param.redirect}}">
{{/if}}

{{!-- Example: Login form with redirect --}}
<form action="/api/1/auth/login" method="post">
    <input type="text" name="identifier" placeholder="Username or Email">
    <input type="password" name="password" placeholder="Password">
    {{#if url.param.redirect}}
        <input type="hidden" name="redirect" value="{{url.param.redirect}}">
    {{/if}}
    <button type="submit">Sign In</button>
</form>
```

### Custom Variables

Define your own template variables safely using the `vars` namespace:

```html
{{!-- Inline variable assignment --}}
{{let pageTitle="User Dashboard" maxResults=20 showFilters=true}}
<title>{{vars.pageTitle}}</title>
<div class="results" data-max="{{vars.maxResults}}">
    {{#if vars.showFilters}}
        <div class="filters">...</div>
    {{/if}}
</div>

{{!-- Block-scoped variables (prevent pollution) --}}
{{#each items}}
    {{#let rowClass="active" rowIndex=@index}}
        <tr class="{{vars.rowClass}}" data-index="{{vars.rowIndex}}">
            <td>{{this.name}}</td>
        </tr>
    {{/let}}
    {{!-- vars.rowClass and vars.rowIndex don't exist here --}}
{{/each}}

{{!-- Context switching --}}
{{#with user}}
    <div class="profile">
        <h2>{{firstName}} {{lastName}}</h2>
        <p>{{email}}</p>
    </div>
{{/with}}

{{!-- Combined usage --}}
{{let greeting="Welcome"}}
{{#with user}}
    <p>{{vars.greeting}}, {{firstName}}!</p>
{{/with}}
```

**Available variable helpers:**
- `{{let key="value"}}` - Define template-scoped variables
- `{{#let key="value"}}...{{/let}}` - Block-scoped variables (isolated)
- `{{#with object}}...{{/with}}` - Context switching
- `{{vars.*}}` - Access custom variables

> **See Also:** [Handlebars Reference](handlebars.md) for complete custom variables documentation with examples and best practices.

## 🌐 Internationalization (i18n)

### Basic Translation Access

```html
{{!-- Simple translations --}}
<title>{{i18n.view.home.title}}</title>             <!-- 'Home' -->
<h1>{{i18n.view.auth.signup.title}}</h1>            <!-- 'Create Account' -->
<button>{{i18n.view.auth.signup.signin}}</button>   <!-- 'Sign In' -->
{{i18n.controller.*}}                               <!-- all controller messages -->
{{i18n.view.*}}                                     <!-- all view messages -->

{{!-- Navigation with i18n (W-098 pattern) --}}
// Framework navigation (webapp/view/jpulse-navigation.js)
window.jPulseNavigation = {
    site: {
        admin: {
            label:  `{{i18n.view.navigation.site.admin._index}}`,
            url:    '/admin/',
            role:   'admin'  // role-based visibility
        },
        about: {
            label:  `{{i18n.view.navigation.site.about}}`,
            url:    '/about/'
        }
    }
};

// Site navigation override (site/webapp/view/jpulse-navigation.js)
window.siteNavigation = {
    site: {
        // Remove framework sections
        jpulseExamples: null,

        // Add custom section with i18n
        dashboard: {
            label:  `{{i18n.view.navigation.site.dashboard}}`,
            url:    '/dashboard/',
            role:   'user'
        }
    }
}
```

### Variable Substitution in Translations

The i18n system supports handlebars-style variable substitution within translations:

```html
{{!-- Translation file content: --}}
{{!-- welcome: 'Welcome back, {{user.firstName}}!' --}}
{{!-- lastLogin: 'Last login: {{user.lastLogin}}' --}}
{{!-- emailNotification: 'Email sent to {{user.email}}' --}}

{{!-- Template usage: --}}
<div class="welcome-message">
    <h2>{{i18n.view.home.welcomeBack}}</h2>     <!-- Welcome back, John! -->
    <p>{{i18n.view.user.index.lastLogin}}</p>   <!-- Last login: 2025-09-07 -->
    <small>{{i18n.view.contact.emailNotification}}</small> <!-- Email sent to john@example.com -->
</div>
```

**Two-Pass Processing:**
1. **First pass**: `{{i18n.login.welcome}}` → `'Welcome back, {{user.firstName}}!'`
2. **Second pass**: `{{user.firstName}}` → `'John'`
3. **Result**: `"Welcome back, John!"`

### Available Context in Translations

```html
{{!-- User context --}}
{{user.firstName}}, {{user.lastName}}, {{user.email}}

{{!-- Configuration context --}}
{{siteConfig.siteName}}, {{siteConfig.adminEmail}}

{{!-- URL context --}}
{{url.domain}}, {{url.pathname}}

{{!-- Application context --}}
{{app.jPulse.version}}, {{app.jPulse.release}}
```

### Using i18n in JavaScript Context

When embedding `{{i18n.*}}` strings inside `<script>` tags, **always use template literals (backticks)** to avoid syntax errors from apostrophes and quotes:

```html
<script>
// ❌ WRONG - Breaks with apostrophes (Don't, can't, won't):
jPulse.UI.toast.error('{{i18n.view.error.message}}');
jPulse.UI.confirmDialog({
    title: '{{i18n.view.dialog.confirmTitle}}',  // Breaks if title has apostrophe
    message: '{{i18n.view.dialog.confirmMessage}}'
});

// ✅ CORRECT - Use backticks (template literals):
jPulse.UI.toast.error(`{{i18n.view.error.message}}`);
jPulse.UI.confirmDialog({
    title: `{{i18n.view.dialog.confirmTitle}}`,
    message: `{{i18n.view.dialog.confirmMessage}}`
});
</script>
```

**Why backticks are required:**
- ✅ Handles apostrophes naturally (Don't, can't, won't)
- ✅ Handles single and double quotes
- ✅ Handles newlines in messages
- ✅ Modern JavaScript standard (ES6+)

**For dynamic messages with runtime variables**, use the `%TOKEN%` pattern in translations:

```html
<!-- Translation file (en.conf): -->
networkError: 'Network error: %ERROR%'
validationFailed: 'Validation failed: %DETAILS%'

<!-- JavaScript usage: -->
<script>
try {
    // ... code that might fail ...
} catch (error) {
    // Use backticks + .replace() to inject runtime values
    jPulse.UI.toast.error(
        `{{i18n.view.error.networkError}}`.replace('%ERROR%', error.message)
    );
}

// Example with multiple tokens:
const details = 'Username already exists';
jPulse.UI.toast.error(
    `{{i18n.view.error.validationFailed}}`
        .replace('%DETAILS%', details)
);
</script>
```

**Token naming convention:**
- Use uppercase with underscores: `%ERROR%`, `%USER_NAME%`, `%COUNT%`
- Descriptive names for clarity: `%DETAILS%`, `%REASON%`, `%ITEM_NAME%`
- Consistent across all translations

**Common patterns:**

```html
<script>
// Error messages with context
catch (error) {
    jPulse.UI.toast.error(`{{i18n.controller.error.saveFailed}}`.replace('%ERROR%', error.message));
}

// Confirmation dialogs
const result = await jPulse.UI.confirmDialog({
    title: `{{i18n.view.dialog.deleteTitle}}`,
    message: `{{i18n.view.dialog.deleteMessage}}`.replace('%ITEM%', itemName),
    buttons: [`{{i18n.common.cancel}}`, `{{i18n.common.delete}}`]
});

// Toast notifications
jPulse.UI.toast.success(`{{i18n.view.success.itemSaved}}`.replace('%NAME%', name));
</script>
```

## 🔗 File Operations

### Secure File Includes

The `{{file.include}}` directive allows secure inclusion of other template files:

```html
{{!-- Common page structure --}}
{{file.include "jpulse-header.tmpl"}}

<main class="jp-main">
    <div class="jp-container">
        <h1>{{pageTitle}}</h1>

        {{!-- Page-specific content --}}
        <div class="content">
            {{#if user.isAuthenticated}}
                {{file.include "components/user-dashboard.tmpl"}}
            {{else}}
                {{file.include "components/guest-welcome.tmpl"}}
            {{/if}}
        </div>

        {{!-- Conditional includes --}}
        {{#if showNavigation}}
            {{file.include "components/navigation.tmpl"}}
        {{/if}}
    </div>
</main>

{{file.include "jpulse-footer.tmpl"}}
```

### File Timestamps

Get file modification timestamps for cache busting or display:

```html
<!-- Cache busting for assets -->
<link rel="stylesheet" href="/jpulse-common.css?v={{file.timestamp "jpulse-common.css"}}">
<script src="/jpulse-common.js?v={{file.timestamp "jpulse-common.js"}}"></script>

<!-- Display file information -->
<footer>
    <small>Template last modified: {{file.timestamp "jpulse-header.tmpl"}}</small>
</footer>
```

### File Listing and Component Inclusion

List files matching patterns and include components from multiple files:

**Dashboard with Component Cards:**
```html
<div class="jp-dashboard-grid">
    {{file.includeComponents "admin/*.shtml" component="adminCards.*"}}
    {{#each components.adminCards}}
        {{this}}
    {{/each}}
</div>
```

**Define component cards in source pages:**
In each admin page, such as `admin/users.shtml`:
```html
{{#component "adminCards.users" order=10}}
    <a href="/admin/users.shtml" class="jp-card-dashboard jp-icon-btn">
        <div class="jp-icon-container">
            {{components.jpIcons.usersSvg size="64"}}
        </div>
        <h3 class="jp-card-title">{{i18n.view.admin.users.title}}</h3>
        <p class="jp-card-description">{{i18n.view.admin.users.subtitle}}</p>
    </a>
{{/component}}
```

> **Note:** Components are fully expanded (including nested components and i18n) before registration, making them perfect for dashboard cards. See [Handlebars Reference](handlebars.md) for complete component documentation.

**Sorting Options:**
```html
{{!-- Sort by component order (default) --}}
{{file.includeComponents "admin/*.shtml" component="adminCards.*" sortBy="component-order"}}

{{!-- Sort by plugin dependency order (for plugin dashboards) --}}
{{file.includeComponents "jpulse-plugins/*.shtml" component="pluginCards.*" sortBy="plugin-order"}}

{{!-- Sort alphabetically by filename --}}
{{file.includeComponents "pages/*.shtml" component="pageCards.*" sortBy="filename"}}
```

### Performance Caching

File operations leverage caching for performance:

- **Template Includes**: `{{file.include}}` results are cached
- **File Timestamps**: `{{file.timestamp}}` results are cached
- **File Listing**: `{{file.list}}` results are cached
- **Component Inclusion**: `{{file.includeComponents}}` uses include cache for file content
- **Pre-loading**: Common includes are asynchronously pre-loaded at startup
- **Configurable**: Caching behavior controlled via `appConfig.controller.view.cacheIncludes.enabled`

### Load Components (Server-Side)

Server-side code can load a template file and extract registered components as a structured object without rendering the full template (e.g. email subject/text/html from one file, multi-language content). Use the existing `{{#component "name"}}...{{/component}}` syntax; dot notation (e.g. `email.subject`) becomes nested keys in the returned object. **Details:** [API Reference - Load Components](api-reference.md#load-components-server-side).

## 🔀 Handlebars Syntax

The jPulse Framework uses Handlebars templating for dynamic server-side rendering. Handlebars provides two types of expressions:

**Regular Handlebars** - For outputting values:
```handlebars
{{user.firstName}}              <!-- Outputs: John -->
{{app.jPulse.version}}          <!-- Outputs: 0.9.7 -->
{{i18n.view.home.title}}        <!-- Outputs: Home -->
```

**Block Helpers** - For control flow (conditionals and loops):
```handlebars
{{!-- Conditionals --}}
{{#if user.isAuthenticated}}
    <p>Welcome back, {{user.firstName}}!</p>
{{else}}
    <p>Please log in.</p>
{{/if}}

{{!-- Iteration --}}
{{#each users}}
    <div>{{this.name}} - Position: {{@index}}</div>
{{/each}}
```

Block helpers support:
- **Conditionals**: `{{#if}}`, `{{#unless}}` with optional `{{else}}`
- **Iteration**: `{{#each}}` with special variables (`@index`, `@first`, `@last`, `@key`, `{{this}}`)
- **Nesting**: Full support for nested blocks (conditionals within loops, etc.)
- **Context Access**: Complete access to template context within blocks

### Complete Handlebars Reference

For comprehensive documentation of all Handlebars syntax, features, and examples, see:

**→ [Handlebars Reference](handlebars.md)** - Complete guide to variables, conditionals, loops, context variables, file operations, and best practices

## 🛡️ Security Features

### Path Traversal Protection

All file operations are secured against path traversal attacks:

```html
{{!-- Safe includes (within webapp/view/) --}}
{{file.include "jpulse-header.tmpl"}}        ✅ Safe
{{file.include "components/nav.tmpl"}}        ✅ Safe
{{file.include "admin/sidebar.tmpl"}}         ✅ Safe

{{!-- Blocked includes (security violations) --}}
{{file.include "../../../etc/passwd"}}       ❌ Blocked
{{file.include "/etc/hosts"}}                 ❌ Blocked
{{file.include "../../config/secrets.conf"}} ❌ Blocked
```

### Include Depth Limiting

Prevents infinite recursion with maximum include depth:

```html
{{!-- Maximum 10 levels of includes allowed --}}
{{!-- Level 1 --}} {{file.include "header.tmpl"}}
{{!-- Level 2 --}}   {{file.include "nav.tmpl"}}
{{!-- Level 3 --}}     {{file.include "menu.tmpl"}}
{{!-- ... up to level 16 --}}
{{!-- Level 17+ --}} ❌ Blocked to prevent infinite recursion
```

### View Root Jail

All includes are resolved within the `webapp/view/` directory:

```
webapp/view/                 # Secure root directory
├── jpulse-header.tmpl      ✅ Accessible
├── components/
│   └── nav.tmpl            ✅ Accessible
└── admin/
    └── sidebar.tmpl        ✅ Accessible

webapp/config/              ❌ Not accessible from templates
webapp/controller/          ❌ Not accessible from templates
/etc/                       ❌ Not accessible from templates
```

### Input Sanitization

All template variables are properly escaped to prevent XSS:

```html
<!-- Automatic escaping -->
<p>User input: {{userInput}}</p>
<!-- If userInput = "<script>alert('xss')</script>" -->
<!-- Output: User input: &lt;script&gt;alert('xss')&lt;/script&gt; -->

<!-- Safe for HTML attributes -->
<input value="{{user.firstName}}" placeholder="{{i18n.form.firstName}}">

<!-- Safe for JavaScript context (additional escaping needed) -->
<script>
    const userName = {{json user.firstName}};  // Use JSON helper for JS context
</script>
```

## 🚀 Template Development Patterns

### Page Template Structure

Standard structure for page templates:

```html
<!-- webapp/view/dashboard/index.shtml -->
{{file.include "jpulse-header.tmpl"}}

<div class="jp-container">
    <!-- Page Header -->
    <div class="jp-flex-between jp-mb-30">
        <h1>{{i18n.dashboard.title}}</h1>
        {{#if user.isAdmin}}
            <a href="/admin/" class="jp-btn jp-btn-primary">{{i18n.nav.admin}}</a>
        {{/if}}
    </div>

    <!-- Main Content Area -->
    <div class="jp-main">
        <!-- Server-side: Initial page structure with quick stats -->
        <div id="dashboard-content">
            {{#if quickStats}}
                <div class="quick-stats">
                    {{#each quickStats}}
                        <div class="stat-card">
                            <h3>{{this.label}}</h3>
                            <span class="stat-value">{{this.value}}</span>
                        </div>
                    {{/each}}
                </div>
            {{else}}
                <div class="jp-flex-center" style="min-height: 200px;">
                    <div class="loading">{{i18n.common.loading}}</div>
                </div>
            {{/if}}
        </div>

        <!-- Placeholder for client-side content -->
        <div id="user-stats" class="jp-hidden"></div>
        <div id="recent-activity" class="jp-hidden"></div>
    </div>
</div>

<!-- Client-side enhancement -->
<script>
jPulse.dom.ready(async () => {
    // Load dynamic content via API
    const stats = await jPulse.api.get('/api/1/dashboard/stats');
    const activity = await jPulse.api.get('/api/1/dashboard/activity');

    if (stats.success && activity.success) {
        // Hide loading, show dynamic content
        document.querySelector('.loading').style.display = 'none';
        document.getElementById('user-stats').classList.remove('jp-hidden');
        document.getElementById('recent-activity').classList.remove('jp-hidden');

        // Populate with API data
        updateDashboardStats(stats.data);
        updateRecentActivity(activity.data);
    }
});
</script>

{{file.include "jpulse-footer.tmpl"}}
```

### Form Templates

Template pattern for forms with validation:

```html
<!-- webapp/view/profile/edit.shtml -->
{{file.include "jpulse-header.tmpl"}}

<div class="jp-container-600">
    <div class="jp-main">
        <h1>{{i18n.profile.editTitle}}</h1>

        <!-- Server-side: Form structure with initial data -->
        <form id="profileForm" class="jp-form">
            <div class="jp-form-grid jp-form-grid-2">
                <div class="jp-form-group">
                    <label class="jp-form-label">{{i18n.form.firstName}}</label>
                    <input type="text" class="jp-form-input" name="firstName"
                           value="{{user.profile.firstName}}" required>
                </div>
                <div class="jp-form-group">
                    <label class="jp-form-label">{{i18n.form.lastName}}</label>
                    <input type="text" class="jp-form-input" name="lastName"
                           value="{{user.profile.lastName}}" required>
                </div>
            </div>

            <div class="jp-form-group">
                <label class="jp-form-label">{{i18n.form.email}}</label>
                <input type="email" class="jp-form-input" name="email"
                       value="{{user.email}}" required>
            </div>

            <!-- Language preference -->
            <div class="jp-form-group">
                <label class="jp-form-label">{{i18n.form.language}}</label>
                <select class="jp-form-select" name="language">
                    <option value="en" {{#if (eq user.preferences.language "en")}}selected{{/if}}>English</option>
                    <option value="de" {{#if (eq user.preferences.language "de")}}selected{{/if}}>Deutsch</option>
                </select>
            </div>

            <div class="jp-btn-group jp-mt-30">
                <button type="submit" class="jp-btn jp-btn-primary">{{i18n.form.save}}</button>
                <a href="/profile/" class="jp-btn jp-btn-secondary">{{i18n.form.cancel}}</a>
            </div>
        </form>
    </div>
</div>

<!-- Client-side: Enhanced form handling -->
<script>
jPulse.dom.ready(() => {
    const form = document.getElementById('profileForm');

    // Enhanced form submission with API
    jPulse.form.bindSubmission(form, '/api/1/user/profile', {
        method: 'PUT',
        successMessage: `{{i18n.messages.profileUpdated}}`,
        redirectUrl: '/profile/',
        redirectDelay: 1500,
        onSuccess: (data) => {
            // Update any displayed profile information
            updateProfileDisplay(data);
        }
    });
});
</script>

{{file.include "jpulse-footer.tmpl"}}
```

### Admin Templates

Template pattern for administrative interfaces:

```html
<!-- webapp/view/admin/users.shtml -->
{{file.include "jpulse-header.tmpl"}}

<div class="jp-container">
    <!-- Admin Navigation -->
    {{file.include "admin/navigation.tmpl"}}

    <div class="jp-flex-between jp-mb-30">
        <h1>{{i18n.admin.userManagement}}</h1>
        <button id="addUserBtn" class="jp-btn jp-btn-primary">{{i18n.admin.addUser}}</button>
    </div>

    <!-- Search Interface -->
    <div class="jp-search-section">
        <h3>{{i18n.admin.searchUsers}}</h3>
        <form id="searchForm" class="jp-search-form">
            <div class="jp-search-fields">
                <div class="jp-form-group">
                    <label class="jp-form-label">{{i18n.form.username}}</label>
                    <input type="text" class="jp-form-input" name="username"
                           placeholder="{{i18n.form.searchByUsername}}">
                </div>
                <div class="jp-form-group">
                    <label class="jp-form-label">{{i18n.form.role}}</label>
                    <select class="jp-form-select" name="role">
                        <option value="">{{i18n.form.allRoles}}</option>
                        <option value="admin">{{i18n.roles.admin}}</option>
                        <option value="user">{{i18n.roles.user}}</option>
                        <option value="guest">{{i18n.roles.guest}}</option>
                    </select>
                </div>
            </div>
            <button type="submit" class="jp-btn jp-btn-primary">{{i18n.form.search}}</button>
        </form>
    </div>

    <!-- Results Container (server-side initial data + client-side enhancement) -->
    <div class="jp-main">
        <div id="userResults">
            {{#if initialUsers}}
                <!-- Server-side: Show initial user list -->
                <div class="user-table">
                    <table class="jp-table">
                        <thead>
                            <tr>
                                <th>{{i18n.admin.username}}</th>
                                <th>{{i18n.admin.email}}</th>
                                <th>{{i18n.admin.role}}</th>
                                <th>{{i18n.admin.status}}</th>
                                <th>{{i18n.admin.actions}}</th>
                            </tr>
                        </thead>
                        <tbody>
                        {{#each initialUsers}}
                            <tr class="user-row" data-user-id="{{this.id}}">
                                <td>{{this.username}}</td>
                                <td>{{this.email}}</td>
                                <td>
                                    <span class="role-badge role-{{this.role}}">
                                        {{this.role}}
                                    </span>
                                </td>
                                <td>
                                    <span class="status-badge status-{{this.status}}">
                                        {{this.statusLabel}}
                                    </span>
                                </td>
                                <td>
                                    <button class="jp-btn jp-btn-sm edit-user" data-id="{{this.id}}">
                                        {{i18n.admin.edit}}
                                    </button>
                                </td>
                            </tr>
                        {{/each}}
                        </tbody>
                    </table>
                </div>
            {{else}}
                <div class="jp-flex-center" style="min-height: 200px;">
                    <div class="loading">{{i18n.common.loadingUsers}}</div>
                </div>
            {{/if}}
        </div>

        <!-- Pagination (populated by JavaScript) -->
        <div id="pagination" class="jp-hidden"></div>
    </div>
</div>

<!-- Client-side: Dynamic user management -->
<script>
jPulse.dom.ready(() => {
    // Initialize user management interface
    const userManager = new UserManager();
    userManager.loadUsers();

    // Setup search form
    const searchForm = document.getElementById('searchForm');
    jPulse.form.bindSubmission(searchForm, null, {
        onSuccess: (data) => {
            // Handle search without form submission
            userManager.search(new FormData(searchForm));
        }
    });
});
</script>

{{file.include "jpulse-footer.tmpl"}}
```

## 📚 Include Templates

### Common Header Template

```html
<!-- webapp/view/jpulse-header.tmpl -->
<!DOCTYPE html>
<html {{appConfig.system.htmlAttrs}}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{pageTitle}} - {{app.shortName}}</title>

    <!-- Framework CSS -->
    <link rel="stylesheet" href="/jpulse-common.css?v={{file.timestamp "jpulse-common.css"}}">

    <!-- Theme support -->
    <script>
        // Apply saved theme before page render
        const savedTheme = localStorage.getItem('theme') || '{{user.preferences.theme}}' || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    </script>
</head>
<body class="theme-{{user.preferences.theme}}">
    <!-- Skip navigation for accessibility -->
    <a href="#main-content" class="jp-skip-nav">Skip to main content</a>

    <!-- Site header -->
    <header class="jp-header">
        <div class="jp-container">
            <div class="jp-flex-between">
                <div class="jp-logo">
                    <a href="/home/">{{app.site.name}}</a>
                </div>

                <nav class="jp-nav">
                    {{#if user.isAuthenticated}}
                        <!-- Dynamic navigation for authenticated users -->
                        {{#each userNavigation}}
                            <a href="{{this.url}}" class="nav-link {{#if this.active}}active{{/if}}">
                                {{this.label}}
                                {{#if this.badge}}
                                    <span class="nav-badge">{{this.badge}}</span>
                                {{/if}}
                            </a>
                        {{/each}}
                        <a href="/auth/logout.shtml" class="nav-link logout">{{i18n.nav.logout}}</a>
                    {{else}}
                        <!-- Static navigation for guests -->
                        {{#each guestNavigation}}
                            <a href="{{this.url}}" class="nav-link {{#if this.active}}active{{/if}}">
                                {{this.label}}
                            </a>
                        {{/each}}
                    {{/if}}
                </nav>
            </div>
        </div>
    </header>

    <!-- Slide-down message container -->
    <div id="jp-slide-down-container"></div>

    <!-- Main content marker -->
    <div id="main-content">
```

### Common Footer Template

```html
<!-- webapp/view/jpulse-footer.tmpl -->
    </div> <!-- End main-content -->

    <!-- Site footer -->
    <footer class="jp-footer">
        <div class="jp-container">
            <div class="jp-flex-between">
                <div class="jp-footer-info">
                    <p>{{app.site.copyright}} v{{app.site.version}}</p>
                    {{#if config.email.adminEmail}}
                        <p>Contact: <a href="mailto:{{siteConfig.email.adminEmail}}">{{siteConfig.email.adminName}}</a></p>
                    {{/if}}
                </div>

                <div class="jp-footer-links">
                    <a href="/about/">{{i18n.nav.about}}</a>
                    <a href="/privacy/">{{i18n.nav.privacy}}</a>
                    <button id="themeToggle" class="jp-btn jp-btn-outline">{{i18n.nav.toggleTheme}}</button>
                </div>
            </div>
        </div>
    </footer>

    <!-- Framework JavaScript -->
    <script src="/jpulse-common.js?v={{file.timestamp "jpulse-common.js"}}"></script>

    <!-- Global initialization -->
    <script>
        // Initialize theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            // Update user preference via API
            jPulse.api.put('/api/1/user/profile', {
                preferences: { theme: newTheme }
            });
        });
    </script>
</body>
</html>
```

## 🔄 Client-Side Handlebars Expansion

There are two types of client-side Handlebars templating available in jPulse:

### jPulse Handlebars (Server-Side Context)

For dynamic content that needs to be generated on the client side with full server-side context, use the Handlebars expansion API endpoint:

**API Endpoint:** `POST /api/1/handlebar/expand`

This allows you to expand Handlebars templates in JavaScript with full server-side context (user, app, config, etc.) plus custom context data.

**When to Use:**
- Dynamic content that changes based on user interactions
- Real-time template updates without page reload
- User-generated content that needs server context
- Email template previews in admin interfaces

**Example:**
```javascript
// Expand template with server context + custom data
const result = await jPulse.api.post('/api/1/handlebar/expand', {
    text: 'Welcome {{user.firstName}}! Your order {{order.id}} is {{order.status}}.',
    context: {
        order: { id: 'ORD-123', status: 'shipped' }
    }
});
```

> **See Also:** [Front-End Development Guide](front-end-development.md) for complete client-side Handlebars expansion documentation, use cases, and examples.

### Vue.js Templates (Client-Side Only)

When building Single Page Applications (SPAs) with Vue.js, you can use Vue's built-in template syntax which is similar to Handlebars. Vue templates use `{{ }}` (with spaces) for interpolation and support directives like `v-if`, `v-for`, and `v-bind` for dynamic rendering.

**Syntax Distinction:**
- **jPulse Handlebars**: `{{variable}}` (no spaces) - expanded server-side with full server context
- **Vue.js Templates**: `{{ variable }}` (with spaces) - expanded client-side with Vue component data

**Mixing jPulse and Vue.js:**
You can mix both in the same template! jPulse Handlebars are expanded server-side first, then Vue.js processes the result:

```html
<!-- site/webapp/view/hello-vue/index.shtml -->
<div id="app">
    <!-- jPulse Handlebars (no spaces) - expanded server-side -->
    <h1>Welcome {{user.firstName}}!</h1>

    <!-- Vue.js (with spaces) - expanded client-side -->
    <div v-if="isAuthenticated">
        <p>Your order {{ order.id }} is {{ order.status }}.</p>
    </div>
</div>

<script>
const app = Vue.createApp({
    data() {
        return {
            // jPulse Handlebars expanded server-side, Vue uses the result
            isAuthenticated: {{user.isAuthenticated}}, // Becomes: true or false
            order: { id: 'ORD-123', status: 'shipped' }
        }
    }
});
app.mount('#app');
</script>
```

**Processing Flow:**
1. **Server-side**: jPulse expands `{{user.firstName}}` → `"John"` and `{{user.isAuthenticated}}` → `true`
2. **Client-side**: Vue.js receives the expanded HTML and processes `{{ order.id }}` and `v-if="isAuthenticated"` with its component data

**When to Use:**
- Building full SPAs with Vue.js
- Rich interactive user interfaces
- Real-time client-side state management
- When you need server context (user, config) mixed with client-side reactive data

> **See Also:** [MPA vs. SPA Architecture Guide](mpa-vs-spa.md) for details on when to use Vue.js SPAs and how they differ from jPulse Handlebars.

## 🔧 Best Practices

### Template Organization

1. **Keep Templates Focused**: Each template should have a single, clear purpose
2. **Use Includes**: Break common elements into reusable include files
3. **Minimize Server Logic**: Use templates for structure, JavaScript for behavior
4. **Progressive Enhancement**: Ensure core functionality works without JavaScript

### Performance Optimization

1. **Cache Static Includes**: Common includes are automatically cached
2. **Minimize Context Data**: Only pass necessary data to templates
3. **Use Conditional Includes**: Only include files when needed
4. **Optimize Asset Loading**: Use file timestamps for cache busting

### Security Guidelines

1. **Never Trust User Input**: All variables are automatically escaped
2. **Use Safe Includes**: Only include files from trusted locations
3. **Validate Context Data**: Ensure all template variables are properly validated
4. **Follow Path Restrictions**: Stay within the view directory structure

### Accessibility Considerations

1. **Semantic HTML**: Use proper HTML5 semantic elements
2. **Skip Navigation**: Provide skip links for keyboard users
3. **Language Attributes**: Set proper `lang` attributes
4. **ARIA Labels**: Use ARIA labels for dynamic content

### Internationalization Best Practices

1. **Use i18n Keys**: Always use translation keys, never hardcoded text
2. **Context-Aware Translations**: Provide context for translators
3. **Variable Substitution**: Use handlebars variables in translations
4. **Fallback Languages**: Ensure graceful fallback for missing translations

---

## Related Documentation

- [Handlebars Reference](handlebars.md) - Handlebars syntax and features
- [Site Navigation Guide](site-navigation.md) - Customizing site navigation with direct mutation
- [Front-End Development Guide](front-end-development.md) - Client-side development patterns
- [Site Customization](site-customization.md) - Site override patterns
- [Style Reference](style-reference.md) - CSS styling guide

---

**jPulse Template Reference** - Secure, performant, and maintainable server-side rendering. 📄
