# jPulse Framework / Docs / Template Reference v0.9.2

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
webapp/view/                 # Framework templates
├── jpulse-header.tmpl      # Common header include
├── jpulse-footer.tmpl      # Common footer include
├── home/
│   └── index.shtml         # Home page template
├── auth/
│   ├── login.shtml         # Login page
│   └── logout.shtml        # Logout page
├── admin/
│   ├── index.shtml         # Admin dashboard
│   ├── users.shtml         # User management
│   └── config.shtml        # Site configuration
└── error/
    └── index.shtml         # Error page template

site/webapp/view/           # Site override templates (optional)
├── home/
│   └── index.shtml         # Site-specific home page override
└── custom/
    └── dashboard.shtml     # Site-specific custom page
```

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
<!-- Application metadata -->
<title>{{app.name}} v{{app.version}}</title>
<meta name="generator" content="{{app.name}} {{app.version}}">
<span class="version">Version {{app.version}} ({{app.release}})</span>

<!-- Example output -->
<title>jPulse Framework v1.0.0</title>
<span class="version">Version 1.0.0 (2025-10-01)</span>
```

### User Context

```html
<!-- Authentication state -->
{{#if user.authenticated}}
    <div class="user-panel">
        <span>Welcome, {{user.firstName}}!</span>
        <a href="/auth/logout.shtml">Logout</a>
    </div>
{{else}}
    <div class="guest-panel">
        <a href="/auth/login.shtml">Sign In</a>
    </div>
{{/if}}

<!-- User profile information -->
<div class="profile">
    <h2>{{user.firstName}} {{user.lastName}}</h2>
    <p>Email: {{user.email}}</p>
    <p>Username: {{user.username}}</p>
    <p>Role: {{user.roles}}</p>
    <p>Last Login: {{user.lastLogin}}</p>
</div>

<!-- User preferences -->
<body class="theme-{{user.preferences.theme}} lang-{{user.preferences.language}}">
```

### Configuration Access

```html
<!-- Application configuration -->
<div style="max-width: {{appConfig.view.maxWidth}}px;">
    <input maxlength="{{appConfig.controller.log.maxMsgLength}}">
    <span>Environment: {{appConfig.app.environment}}</span>
</div>

<!-- Site configuration -->
<footer>
    <p>Contact: <a href="mailto:{{config.email.adminEmail}}">{{config.email.adminName}}</a></p>
    {{#if config.messages.broadcast}}
        <div class="broadcast-message">{{config.messages.broadcast}}</div>
    {{/if}}
</footer>
```

### URL Information

```html
<!-- URL components -->
<base href="{{url.domain}}">
<span>Current page: {{url.pathname}}</span>
<span>Server: {{url.hostname}}:{{url.port}}</span>

<!-- URL parameters -->
{{#if url.param.redirect}}
    <input type="hidden" name="redirect" value="{{url.param.redirect}}">
{{/if}}

<!-- Example: Login form with redirect -->
<form action="/api/1/auth/login" method="post">
    <input type="text" name="identifier" placeholder="Username or Email">
    <input type="password" name="password" placeholder="Password">
    {{#if url.param.redirect}}
        <input type="hidden" name="redirect" value="{{url.param.redirect}}">
    {{/if}}
    <button type="submit">Sign In</button>
</form>
```

## 🌐 Internationalization (i18n)

### Basic Translation Access

```html
<!-- Simple translations -->
<h1>{{i18n.app.name}}</h1>                    <!-- jPulse Framework -->
<button>{{i18n.header.signin}}</button>       <!-- Sign In -->
<p>{{i18n.welcome.message}}</p>               <!-- Welcome to jPulse -->

<!-- Navigation translations -->
<nav>
    <a href="/home/">{{i18n.nav.home}}</a>
    <a href="/about/">{{i18n.nav.about}}</a>
    {{#if user.authenticated}}
        <a href="/dashboard/">{{i18n.nav.dashboard}}</a>
        <a href="/auth/logout.shtml">{{i18n.nav.logout}}</a>
    {{else}}
        <a href="/auth/login.shtml">{{i18n.nav.login}}</a>
    {{/if}}
</nav>
```

### Variable Substitution in Translations

The i18n system supports handlebars-style variable substitution within translations:

```html
<!-- Translation file content: -->
<!-- welcome: 'Welcome back, {{user.firstName}}!' -->
<!-- lastLogin: 'Last login: {{user.lastLogin}}' -->
<!-- emailNotification: 'Email sent to {{user.email}}' -->

<!-- Template usage: -->
<div class="welcome-message">
    <h2>{{i18n.login.welcome}}</h2>           <!-- Welcome back, John! -->
    <p>{{i18n.user.lastLogin}}</p>            <!-- Last login: 2025-09-07 -->
    <small>{{i18n.notifications.emailNotification}}</small>  <!-- Email sent to john@example.com -->
</div>
```

**Two-Pass Processing:**
1. **First pass**: `{{i18n.login.welcome}}` → `'Welcome back, {{user.firstName}}!'`
2. **Second pass**: `{{user.firstName}}` → `'John'`
3. **Result**: `"Welcome back, John!"`

### Available Context in Translations

```html
<!-- User context -->
{{user.firstName}}, {{user.lastName}}, {{user.email}}

<!-- Configuration context -->
{{config.siteName}}, {{config.adminEmail}}

<!-- URL context -->
{{url.domain}}, {{url.pathname}}

<!-- Application context -->
{{app.version}}, {{app.release}}
```

## 🔗 File Operations

### Secure File Includes

The `{{file.include}}` directive allows secure inclusion of other template files:

```html
<!-- Common page structure -->
{{file.include "jpulse-header.tmpl"}}

<main class="jp-main">
    <div class="jp-container">
        <h1>{{pageTitle}}</h1>

        <!-- Page-specific content -->
        <div class="content">
            {{#if user.authenticated}}
                {{file.include "components/user-dashboard.tmpl"}}
            {{else}}
                {{file.include "components/guest-welcome.tmpl"}}
            {{/if}}
        </div>

        <!-- Conditional includes -->
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

### Performance Caching

File operations leverage caching for performance:

- **Template Includes**: `{{file.include}}` results are cached
- **File Timestamps**: `{{file.timestamp}}` results are cached
- **Pre-loading**: Common includes are asynchronously pre-loaded at startup
- **Configurable**: Caching behavior controlled via `appConfig.controller.view.cacheIncludeFiles`

## 🔀 Block Helpers

### Block Conditionals ({{#if}})

The `{{#if}}` syntax provides powerful block-level conditionals:

```html
<!-- Simple conditional blocks -->
{{#if user.authenticated}}
    <div class="user-panel">
        <h2>Welcome, {{user.firstName}}!</h2>
        <p>Last login: {{user.lastLogin}}</p>
        <div class="user-actions">
            <a href="/profile/" class="jp-btn jp-btn-primary">Edit Profile</a>
            <a href="/auth/logout.shtml" class="jp-btn jp-btn-outline">Logout</a>
        </div>
    </div>
{{/if}}

<!-- If/else conditional blocks -->
{{#if user.authenticated}}
    <nav class="main-nav">
        <a href="/dashboard/">Dashboard</a>
        <a href="/profile/">Profile</a>
        {{#if user.isAdmin}}
            <a href="/admin/">Admin</a>
        {{/if}}
    </nav>
{{else}}
    <nav class="guest-nav">
        <a href="/home/">Home</a>
        <a href="/about/">About</a>
        <a href="/auth/login.shtml">Sign In</a>
    </nav>
{{/if}}
```

### Complex Conditionals

```html
<!-- Complex conditionals with handlebars inside blocks -->
{{#if config.messages.broadcast}}
    <div class="jp-alert jp-alert-info">
        <strong>{{i18n.messages.announcement}}</strong>
        <p>{{config.messages.broadcast}}</p>
        {{#if user.authenticated}}
            <small>Shown to: {{user.firstName}} {{user.lastName}}</small>
        {{else}}
            <small>Please <a href="/auth/login.shtml">sign in</a> for personalized content.</small>
        {{/if}}
    </div>
{{/if}}

<!-- Nested {{#if}} blocks are fully supported (v0.7.20+) -->
{{#if user.authenticated}}
    {{#if user.isAdmin}}
        <div class="admin-panel">Admin controls available</div>
    {{/if}}
{{/if}}
```

### Supported Conditions

```html
<!-- Boolean conditions -->
{{#if user.authenticated}}...{{/if}}
{{#if config.features.enableNotifications}}...{{/if}}

<!-- String/object existence checks -->
{{#if config.messages.broadcast}}...{{/if}}
{{#if user.profile.avatar}}...{{/if}}

<!-- Numeric value checks -->
{{#if url.port}}...{{/if}}
{{#if user.loginCount}}...{{/if}}

<!-- Array checks -->
{{#if user.roles}}...{{/if}}
```

### Conditional Features
- **Recursive Processing**: Handlebars within `{{#if}}` blocks are fully processed
- **Nested Content**: Complex HTML and multiple handlebars supported within blocks
- **Context Access**: Full template context available within conditional blocks
- **Error Handling**: Malformed blocks show clear error messages
- **Nested Support (v0.7.20+)**: Full support for nested `{{#if}}` and `{{#each}}` blocks with multi-line processing

### Nested Handlebars (v0.7.20+)

Complex template scenarios with nested blocks are fully supported:

```html
<!-- Nested {{#if}} within {{#each}} -->
{{#each users}}
    <div class="user-card">
        {{#if this.active}}
            <div class="active-badge">Active User</div>
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

<!-- Multi-line nested blocks -->
{{#if showUsers}}
<div class="users-section">
    <h2>Users</h2>
    {{#each users}}
    <div class="user-card">
        {{#if this.active}}
        <div class="active-badge">
            Active User
        </div>
        {{/if}}
        <h3>{{this.name}}</h3>
    </div>
    {{/each}}
</div>
{{/if}}
```

### Block Iteration ({{#each}})

The `{{#each}}` syntax provides powerful iteration over arrays and objects with special context variables:

```html
<!-- Simple array iteration -->
<ul class="fruit-list">
{{#each fruits}}
    <li>{{@index}}: {{this}}</li>
{{/each}}
</ul>

<!-- Output with fruits = ['apple', 'banana', 'cherry'] -->
<ul class="fruit-list">
    <li>0: apple</li>
    <li>1: banana</li>
    <li>2: cherry</li>
</ul>
```

#### Array Iteration with Objects

```html
<!-- Object array iteration -->
<div class="user-cards">
{{#each users}}
    <div class="user-card {{#if @first}}first{{/if}} {{#if @last}}last{{/if}}">
        <h3>{{this.name}}</h3>
        <p>Age: {{this.age}}</p>
        <p>Position: #{{@index}}</p>
        {{#if @first}}
            <span class="badge">Featured User</span>
        {{/if}}
    </div>
{{/each}}
</div>

<!-- Output with users = [{name: 'Alice', age: 25}, {name: 'Bob', age: 30}] -->
<div class="user-cards">
    <div class="user-card first">
        <h3>Alice</h3>
        <p>Age: 25</p>
        <p>Position: #0</p>
        <span class="badge">Featured User</span>
    </div>
    <div class="user-card last">
        <h3>Bob</h3>
        <p>Age: 30</p>
        <p>Position: #1</p>
    </div>
</div>
```

#### Object Property Iteration

```html
<!-- Object iteration using @key -->
<div class="settings-panel">
    <h3>Application Settings</h3>
    <dl class="settings-list">
    {{#each appSettings}}
        <dt>{{@key}}</dt>
        <dd>{{this}}</dd>
    {{/each}}
    </dl>
</div>

<!-- Output with appSettings = {theme: 'dark', language: 'en', notifications: true} -->
<div class="settings-panel">
    <h3>Application Settings</h3>
    <dl class="settings-list">
        <dt>theme</dt>
        <dd>dark</dd>
        <dt>language</dt>
        <dd>en</dd>
        <dt>notifications</dt>
        <dd>true</dd>
    </dl>
</div>
```

#### Nested Object Properties

```html
<!-- Complex nested object iteration -->
<div class="employee-directory">
{{#each employees}}
    <div class="employee-card">
        <div class="employee-header">
            <h4>{{this.profile.firstName}} {{this.profile.lastName}}</h4>
            <span class="employee-id">#{{@index}}</span>
        </div>
        <div class="employee-details">
            <p>Department: {{this.department}}</p>
            <p>Email: {{this.contact.email}}</p>
            {{#if this.contact.phone}}
                <p>Phone: {{this.contact.phone}}</p>
            {{/if}}
        </div>
        {{#if @last}}
            <div class="directory-footer">
                <small>End of directory ({{@index}} employees total)</small>
            </div>
        {{/if}}
    </div>
{{/each}}
</div>
```

#### Special Context Variables

The `{{#each}}` helper provides several special variables within the iteration context:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `{{@index}}` | Number | Zero-based index of current iteration | `0, 1, 2, ...` |
| `{{@first}}` | Boolean | `true` if this is the first iteration | `true` or `false` |
| `{{@last}}` | Boolean | `true` if this is the last iteration | `true` or `false` |
| `{{@key}}` | String | Property name (object iteration only) | `'theme', 'language'` |
| `{{this}}` | Any | Current array element or object value | Current item |

#### Practical Examples

**Navigation Menu Generation:**
```html
<nav class="main-navigation">
    <ul class="nav-list">
    {{#each navigationItems}}
        <li class="nav-item {{#if @first}}first{{/if}} {{#if @last}}last{{/if}}">
            <a href="{{this.url}}" class="nav-link {{#if this.active}}active{{/if}}">
                {{this.label}}
            </a>
            {{#if this.badge}}
                <span class="nav-badge">{{this.badge}}</span>
            {{/if}}
        </li>
    {{/each}}
    </ul>
</nav>
```

**Data Table Generation:**
```html
<table class="data-table">
    <thead>
        <tr>
            <th>#</th>
            <th>Name</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody>
    {{#each tableData}}
        <tr class="table-row {{#if @first}}first-row{{/if}}">
            <td>{{@index}}</td>
            <td>{{this.name}}</td>
            <td>
                <span class="status status-{{this.status}}">
                    {{this.statusLabel}}
                </span>
            </td>
            <td>
                <button class="btn-edit" data-id="{{this.id}}">Edit</button>
                {{#if @last}}
                    <button class="btn-add-new">Add New</button>
                {{/if}}
            </td>
        </tr>
    {{/each}}
    </tbody>
</table>
```

**Configuration Display:**
```html
<div class="config-section">
    <h3>System Configuration</h3>
    {{#each systemConfig}}
        <div class="config-group">
            <h4>{{@key}} Settings</h4>
            <div class="config-items">
            {{#each this}}
                <div class="config-item">
                    <label>{{@key}}:</label>
                    <span class="config-value">{{this}}</span>
                </div>
            {{/each}}
            </div>
        </div>
    {{/each}}
</div>
```

#### Error Handling

The `{{#each}}` helper includes robust error handling:

```html
<!-- Safe handling of non-iterable values -->
{{#each possiblyUndefined}}
    <p>{{this}}</p>
{{/each}}
<!-- If possiblyUndefined is null/undefined, no output is generated -->

<!-- Error handling for invalid data types -->
{{#each stringValue}}
    <p>{{this}}</p>
{{/each}}
<!-- If stringValue is a string, an error comment is generated:
     <!-- Error: Cannot iterate over non-iterable value: string. Expected array or object. -->
```

### Iteration Features
- **Array Support**: Iterate over JavaScript arrays with index access
- **Object Support**: Iterate over object properties with key access
- **Nested Properties**: Access deep object properties with dot notation
- **Context Variables**: Rich set of iteration context variables (@index, @first, @last, @key)
- **Recursive Processing**: Full handlebars processing within iteration blocks
- **Error Resilience**: Graceful handling of null, undefined, and invalid data types
- **Performance Optimized**: Efficient iteration even with large datasets
- **Type Flexibility**: Automatic handling of mixed data types in objects

## 🛡️ Security Features

### Path Traversal Protection

All file operations are secured against path traversal attacks:

```html
<!-- Safe includes (within webapp/view/) -->
{{file.include "jpulse-header.tmpl"}}        ✅ Safe
{{file.include "components/nav.tmpl"}}        ✅ Safe
{{file.include "admin/sidebar.tmpl"}}         ✅ Safe

<!-- Blocked includes (security violations) -->
{{file.include "../../../etc/passwd"}}       ❌ Blocked
{{file.include "/etc/hosts"}}                 ❌ Blocked
{{file.include "../../config/secrets.conf"}} ❌ Blocked
```

### Include Depth Limiting

Prevents infinite recursion with maximum include depth:

```html
<!-- Maximum 10 levels of includes allowed -->
<!-- Level 1 --> {{file.include "header.tmpl"}}
<!-- Level 2 -->   {{file.include "nav.tmpl"}}
<!-- Level 3 -->     {{file.include "menu.tmpl"}}
<!-- ... up to level 10 -->
<!-- Level 11+ --> ❌ Blocked to prevent infinite recursion
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
document.addEventListener('DOMContentLoaded', async () => {
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
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('profileForm');

    // Enhanced form submission with API
    jPulse.form.bindSubmission(form, '/api/1/user/profile', {
        method: 'PUT',
        successMessage: '{{i18n.messages.profileUpdated}}',
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
document.addEventListener('DOMContentLoaded', () => {
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
<html lang="{{user.preferences.language}}">
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
                    <a href="/home/">{{app.name}}</a>
                </div>

                <nav class="jp-nav">
                    {{#if user.authenticated}}
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
                    <p>&copy; 2025 {{app.name}} v{{app.version}}</p>
                    {{#if config.email.adminEmail}}
                        <p>Contact: <a href="mailto:{{config.email.adminEmail}}">{{config.email.adminName}}</a></p>
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

**jPulse Template Reference** - Secure, performant, and maintainable server-side rendering. 📄
