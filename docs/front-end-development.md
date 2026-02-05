# jPulse Docs / Front-End Development Guide v1.6.8

Complete guide to client-side development with the jPulse JavaScript framework, covering utilities, form handling, UI components, and best practices for building interactive web applications.

**🎯 Live Examples:** See the [UI Widgets Examples](/jpulse-examples/ui-widgets.shtml) and [Form Examples](/jpulse-examples/forms.shtml) pages for interactive demonstrations of all concepts with working code.

**💡 Using AI assistance?** The [Gen-AI Development Guide](genai-development.md) shows how to leverage AI coding assistants to implement these patterns quickly while maintaining framework best practices.

## 🎯 Overview

The jPulse Framework provides a comprehensive client-side utility library available globally as `jPulse`. This framework eliminates code duplication, provides consistent patterns across all views, and implements the "don't make me think" philosophy for front-end development.

### Architecture Philosophy
- **Client-Side Heavy**: 80% of view logic happens in the browser via JavaScript + API calls
- **API-First**: All data operations use REST endpoints (`/api/1/*`)
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Zero Configuration**: Utilities work out of the box with sensible defaults

### Key Features
- **API Call Standardization**: Simplified REST API interactions
- **Handlebars Template Expansion**: Client-side template rendering with server context
- **Custom Variables**: Define template variables with `{{let}}` for flexible templates
- **Form Handling**: Enhanced form submission with validation and error handling
- **UI Components**: Slide-down messages, collapsible sections, heading anchor links, and more
- **DOM Utilities**: Enhanced DOM manipulation with consistent patterns
- **Device Detection**: Responsive design and feature detection utilities

### Related Documentation
- **[jPulse.UI Widget Reference](jpulse-ui-reference.md)** - Complete `jPulse.UI.*` widget documentation
- **[REST API Reference](api-reference.md)** - Complete `/api/1/*` endpoint documentation
- **[Style Reference](style-reference.md)** - Complete `jp-*` styling framework
- **[Template Reference](template-reference.md)** - Server-side Handlebars integration
- **[Site Customization](site-customization.md)** - Site override system for site-specific code
- **[Getting Started](getting-started.md)** - Quick start tutorial for new developers

## 🔌 API Call Utilities

### Basic API Calls

The `jPulse.api` namespace provides simplified methods for REST API interactions:

```javascript
// GET request
const result = await jPulse.api.get('/api/1/user/profile');
if (result.success) {
    console.log('User data:', result.data);
} else {
    jPulse.UI.toast.error(result.error);
}

// POST request with data
const loginResult = await jPulse.api.post('/api/1/auth/login', {
    identifier: 'username',
    password: 'password'
});

// PUT and DELETE requests
await jPulse.api.put('/api/1/user/profile', profileData);
await jPulse.api.delete('/api/1/user/session');
```

### Advanced API Usage

For custom requirements, use the lower-level `jPulse.api.call` method:

```javascript
// Advanced usage with custom options
const customResult = await jPulse.api.call('/api/1/custom', {
    method: 'PATCH',
    body: data,
    headers: { 'Custom-Header': 'value' }
});

// With custom error handling
const result = await jPulse.api.call('/api/1/data', {
    method: 'GET',
    onError: (error) => {
        // Custom error handling - prevents default error display
        console.log('Custom error handling:', error);
    }
});
```

### Response Format
All API calls return a standardized response format:

```javascript
{
    success: true|false,
    message: "Human-readable message",
    data: { ... },           // On success
    error: "Error message",  // On failure
    code: "ERROR_CODE",      // Error code for programmatic handling
    elapsed: 15              // Response time in milliseconds
}
```

> **See Also:** [REST API Reference](api-reference.md) for complete endpoint documentation and authentication requirements.

## 🔄 Handlebars Template Expansion

The jPulse Framework processes Handlebars templates server-side by default, so templates in `.shtml` files are fully expanded before reaching the browser. However, for dynamic client-side content generation, you can expand Handlebars templates on demand using the API endpoint.

### Server-Side vs Client-Side Expansion

**Server-Side (Default):**
- Templates in `.shtml` files are automatically expanded during page rendering
- Full access to server context (user, app, config, i18n, etc.)
- No JavaScript required - works with progressive enhancement
- See [Handlebars Reference](handlebars.md) for complete template syntax

**Client-Side (On Demand):**
- Use `/api/1/handlebar/expand` endpoint for dynamic content
- Same server context available as server-side templates
- Can augment with custom context data
- Perfect for user interactions and real-time updates

### When to Use Client-Side Expansion

Use the API endpoint when you need to:
- **Generate dynamic content** based on user interactions (clicks, form submissions, etc.)
- **Update templates in real-time** without page reload
- **Combine server context with client data** (e.g., user info + API response data)
- **Preview templates** in admin interfaces (email templates, notifications, etc.)
- **Handle user-generated content** that needs server context (e.g., user mentions in comments)

**Don't use it for:**
- Initial page rendering (use server-side templates instead)
- Static content (use regular server-side Handlebars)
- Content that doesn't need server context (use plain JavaScript string interpolation)

### Basic Usage

```javascript
// Expand a simple template
const result = await jPulse.api.post('/api/1/handlebar/expand', {
    text: 'Hello {{user.firstName}}! Welcome to {{app.site.name}}.'
});

if (result.success) {
    document.getElementById('greeting').innerHTML = result.text;
    // Output: "Hello John! Welcome to My Site."
}
```

### Using Custom Context

You can augment the server context with custom data:

```javascript
// Expand template with custom context
const result = await jPulse.api.post('/api/1/handlebar/expand', {
    text: 'Hello {{user.firstName}}! You have {{notificationCount}} new messages.',
    context: {
        notificationCount: 5
    }
});

if (result.success) {
    document.getElementById('notification-badge').textContent = result.text;
    // Output: "Hello John! You have 5 new messages."
}
```

### Using Components in API Calls

**Important:** Components must be explicitly included in your API call template. Unlike server-side rendering where components are pre-loaded via `{{file.include "components/svg-icons.tmpl"}}` in the page header for example, API calls create a fresh component registry for each request.

**Example: Using SVG Icons**

```javascript
// Include component library first, then use components
const result = await jPulse.api.post('/api/1/handlebar/expand', {
    text: `
        {{file.include "components/svg-icons.tmpl"}}
        <div class="icon-container">
            {{components.jpIcons.userSvg size="24" fillColor="#007bff"}}
        </div>
    `
});

if (result.success) {
    document.getElementById('icon-wrapper').innerHTML = result.text;
}
```

**Why This Is Required:**

- **Stateless nature**: Each API call is independent - components from page rendering aren't available
- **Performance**: Pre-loading components would add overhead to every API call
- **Flexibility**: Different pages have different components (admin cards, plugin cards, custom components)
- **Explicit is better**: Clear what components are available in each API call

**Best Practice:**

Include only the component libraries you need for that specific API call:

```javascript
// For SVG icons
{{file.include "components/svg-icons.tmpl"}}

// For admin dashboard cards (if needed)
{{file.includeComponents "admin/*.shtml" component="adminCards.*"}}

// Then use the components
{{components.jpIcons.configSvg size="32"}}
{{#each components.adminCards}}
    {{this}}
{{/each}}
```

> **Note:** On server-side rendered pages, components are automatically available because they're loaded via `{{file.include}}` in the page template (e.g., `jpulse-header.tmpl`). API calls require explicit inclusion.

### Real-World Example: Dynamic User Card

```javascript
// Generate user card HTML with server context + API data
async function renderUserCard(userId) {
    // Fetch user data from API
    const userData = await jPulse.api.get(`/api/1/user/${userId}`);

    if (!userData.success) {
        jPulse.UI.toast.error('Failed to load user');
        return;
    }

    // Expand template with server context + API data
    const result = await jPulse.api.post('/api/1/handlebar/expand', {
        text: `
            <div class="user-card">
                <h3>{{user.firstName}} {{user.lastName}}</h3>
                <p>Email: {{user.email}}</p>
                <p>Role: {{user.roles}}</p>
                {{#if profileData.bio}}
                    <p class="bio">{{profileData.bio}}</p>
                {{/if}}
                <p>Last login: {{profileData.lastLogin}}</p>
            </div>
        `,
        context: {
            profileData: userData.data
        }
    });

    if (result.success) {
        document.getElementById('user-container').innerHTML = result.text;
    }
}
```

### Real-World Example: Email Template Preview

```javascript
// Preview email template in admin interface
async function previewEmailTemplate(templateText, recipientData) {
    const result = await jPulse.api.post('/api/1/handlebar/expand', {
        text: templateText,
        context: {
            recipient: recipientData,
            customData: {
                resetLink: 'https://example.com/reset?token=abc123',
                expiryHours: 24
            }
        }
    });

    if (result.success) {
        // Display preview in modal or preview pane
        document.getElementById('email-preview').innerHTML = result.text;
    }
}
```

### Real-World Example: Notification Messages

```javascript
// Generate personalized notification messages
async function showNotification(notificationType, data) {
    const templates = {
        orderShipped: `Great news, {{user.firstName}}! Your order {{order.id}} has been shipped.`,
        newMessage: `You have a new message from {{sender.name}}.`,
        friendRequest: `{{sender.firstName}} wants to connect with you.`
    };

    const result = await jPulse.api.post('/api/1/handlebar/expand', {
        text: templates[notificationType],
        context: data
    });

    if (result.success) {
        jPulse.UI.toast.success(result.text);
    }
}

// Usage
showNotification('orderShipped', {
    order: { id: 'ORD-12345' }
});
```

### Real-World Example: Dynamic Dashboard with Custom Variables

```javascript
// Generate dashboard with custom variables and server context
async function renderDashboard(stats) {
    const result = await jPulse.api.post('/api/1/handlebar/expand', {
        text: `
            {{let pageTitle="Dashboard" showFilters=true maxItems=10}}
            <div class="dashboard">
                <h1>{{vars.pageTitle}} - Welcome {{user.firstName}}!</h1>

                {{#if vars.showFilters}}
                    <div class="filters">
                        <label>Show up to {{vars.maxItems}} items</label>
                    </div>
                {{/if}}

                <div class="stats-grid">
                    {{#each stats}}
                        {{#let cardClass="stat-card" cardColor=this.color}}
                            <div class="{{vars.cardClass}} {{vars.cardColor}}">
                                <h3>{{this.label}}</h3>
                                <span class="value">{{this.value}}</span>
                            </div>
                        {{/let}}
                    {{/each}}
                </div>
            </div>
        `,
        context: {
            stats: stats
        }
    });

    if (result.success) {
        document.getElementById('dashboard-container').innerHTML = result.text;
    }
}

// Usage
const dashboardStats = await jPulse.api.get('/api/1/dashboard/stats');
if (dashboardStats.success) {
    renderDashboard(dashboardStats.data);
}
```

### Available Server Context

The endpoint automatically provides the same context as server-side templates:

- **`user`** - Current user information (filtered based on authentication)
  - `user.firstName`, `user.lastName`, `user.email`, `user.roles`, `user.isAuthenticated`, etc.
- **`app`** - Application metadata
  - `app.jPulse.name`, `app.jPulse.version`, `app.site.name`, etc.
- **`config`** - Site configuration from MongoDB
  - `config.email.adminEmail`, `config.messages.broadcast`, etc.
- **`appConfig`** - Application configuration (filtered based on authentication)
- **`url`** - Current request URL information
- **`i18n`** - Internationalization translations
- **`vars`** - Custom template variables
  - User-defined variables set with `{{let}}` (see [Custom Variables](handlebars.md#custom-variables))
- **`components`** - Registered reusable components
  - Template components defined with `{{#component}}` (see [Reusable Components](handlebars.md#reusable-components))

### Security and Context Filtering

The endpoint automatically filters sensitive configuration data based on authentication status:
- **Unauthenticated users**: System, deployment, database, and controller configs are filtered
- **Authenticated users**: Additional filtering for passwords, ports, and sensitive paths
- **Custom context**: Your custom context data is always included (you control what's sent)

See `appConfig.controller.handlebar.contextFilter` for detailed filtering rules.

### Error Handling

```javascript
try {
    const result = await jPulse.api.post('/api/1/handlebar/expand', {
        text: 'Hello {{user.firstName}}!'
    });

    if (result.success) {
        // Use expanded text
        document.getElementById('content').innerHTML = result.text;
    } else {
        // Handle API error
        jPulse.UI.toast.error(result.error || 'Failed to expand template');
    }
} catch (error) {
    // Handle network or other errors
    console.error('Template expansion failed:', error);
    jPulse.UI.toast.error('Network error. Please try again.');
}
```

### Performance Considerations

- **Caching**: Consider caching expanded templates on the client side if the same template is used multiple times
- **Batch Operations**: For multiple templates, consider batching or using a single template with conditional logic
- **Template Size**: Very large templates may impact performance; consider breaking them into smaller pieces

### Related Documentation

- **[Handlebars Reference](handlebars.md)** - Complete Handlebars syntax and server-side template guide
- **[Template Reference](template-reference.md)** - Server-side template development patterns
- **[REST API Reference](api-reference.md)** - Complete API endpoint documentation

## ⚡ Real-Time Communication with WebSocket

The jPulse Framework provides enterprise-grade WebSocket infrastructure for real-time bidirectional communication between server and browser.

### When to Use WebSocket

Use WebSocket for:
- **Live Collaboration**: Multiple users editing simultaneously
- **Real-Time Dashboards**: Live data updates without polling
- **Instant Notifications**: Push notifications from server
- **Interactive Applications**: Chat, games, live tracking
- **Presence Systems**: Who's online, who's viewing

For simple request/response patterns, use REST API instead.

### Quick Start

**Connect to namespace:**

```javascript
const ws = jPulse.ws.connect('/api/1/ws/my-app')
    .onMessage((data, message) => {
        console.log('Received:', data);
        updateUI(data);
    })
    .onStatusChange((status) => {
        console.log('Status:', status);
        updateConnectionIndicator(status);
    });

// Send message
ws.send({
    type: 'user-action',
    action: 'click',
    data: { x: 100, y: 200 }
});

// Check status
if (ws.isConnected()) {
    console.log('Ready!');
}

// Clean up
ws.disconnect();
```

### Connection Status Handling

Always handle connection status changes:

```javascript
ws.onStatusChange((status, oldStatus) => {
    switch(status) {
        case 'connected':
            enableFeatures();
            break;
        case 'connecting':
        case 'reconnecting':
            showLoadingIndicator();
            break;
        case 'disconnected':
            disableFeatures();
            showReconnectButton();
            break;
    }
});
```

### Vue.js Integration

WebSocket integrates seamlessly with Vue.js reactive data:

```javascript
const MyApp = {
    data() {
        return {
            connectionStatus: 'disconnected',
            messages: [],
            ws: null
        };
    },
    mounted() {
        this.ws = jPulse.ws.connect('/api/1/ws/my-app')
            .onMessage((data) => {
                this.messages.push(data); // Reactive!
            })
            .onStatusChange((status) => {
                this.connectionStatus = status; // Reactive!
            });
    },
    beforeUnmount() {
        if (this.ws) {
            this.ws.disconnect();
        }
    }
};
```

> **See Complete Guide:** [WebSocket Documentation](websockets.md) for server-side setup, authentication, monitoring, and advanced patterns.

## 📝 Form Handling & Validation

The jPulse Framework provides two distinct approaches for form handling, each optimized for different use cases. For **config-style forms** (tabs/panels from schema, one-line set/get), see [Schema-driven config forms](#-schema-driven-config-forms).

### bindSubmission - For Simple Forms

Automatic event binding for straightforward form handling:

```javascript
// Simple form with automatic binding
const form = document.getElementById('loginForm');
jPulse.form.bindSubmission(form, '/api/1/auth/login', {
    successMessage: 'Login successful!',
    redirectUrl: '/dashboard/',
    loadingText: 'Signing in...',
    onSuccess: (data) => {
        console.log('Login successful:', data);
    }
});
// Form automatically handles submit events
```

### handleSubmission - For Custom Logic

Direct execution for forms with custom validation or event handling:

```javascript
// Custom form handling with manual event binding
const form = document.getElementById('signupForm');
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Custom client-side validation
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    if (password !== confirmPassword) {
        jPulse.UI.toast.error('Passwords do not match');
        return;
    }

    // Call handleSubmission directly
    await jPulse.form.handleSubmission(form, '/api/1/user/signup', {
        onSuccess: (data) => {
            const username = data.user.username;
            window.location.href = `/auth/login.shtml?signup=success&username=${encodeURIComponent(username)}`;
        },
        onError: (error) => {
            // Custom error handling - framework won't show default error
            console.log('Signup failed:', error);
        }
    });
});
```

### Form Configuration Options

Both functions support comprehensive configuration:

```javascript
{
    method: 'POST',                    // HTTP method
    successMessage: 'Success!',        // Auto-display success message
    errorMessage: 'Failed!',           // Fallback error message
    redirectUrl: '/dashboard/',        // Auto-redirect on success
    redirectDelay: 1000,               // Delay before redirect (ms)
    loadingText: 'Processing...',      // Button loading text
    clearOnSuccess: false,             // Clear form on success
    validateBeforeSubmit: true,        // Built-in validation
    beforeSubmit: (form) => true,      // Pre-submission callback
    onSuccess: (data, form) => {},     // Success callback
    onError: (error, form) => {},      // Error callback (prevents default error display)
    afterSubmit: (result, form) => {} // Post-submission callback
}
```

### Form Utilities

Helper functions for form management:

```javascript
// Form utilities
const formData = jPulse.form.serialize(formElement);
jPulse.form.setLoadingState(submitButton, true, 'Processing...');
jPulse.form.clearErrors(formElement);

// Validation helpers
jPulse.form.validate.email('user@example.com'); // true/false
jPulse.form.validate.password('mypassword', 8); // true/false
jPulse.form.validate.required('value'); // true/false
```

### Complete Form Example

```javascript
jPulse.dom.ready(() => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const result = await jPulse.form.handleSubmission(
            loginForm,
            '/api/1/auth/login',
            {
                successMessage: 'Welcome back!',
                loadingText: 'Signing in...',
                redirectUrl: new URLSearchParams(window.location.search).get('redirect') || '/',
                redirectDelay: 1000,
                beforeSubmit: (form) => {
                    // Clear any previous alerts
                    jPulse.UI.toast.clearAll();
                    return true;
                },
                onError: (error) => {
                    // Focus first input on error
                    loginForm.querySelector('input').focus();
                }
            }
        );
    });
});
```

## 📋 Schema-driven config forms

Config-style pages (e.g. Admin > Site configuration) use a **single schema** to drive tabs, panels, field layout, and one-line populate/get. One source of truth, minimal view code. Use this as a template for your own data driven forms.

### Build tabs and panels from schema

Call `jPulse.UI.tabs.renderTabsAndPanelsFromSchema` after fetching config and schema (e.g. from `/api/1/config` with `includeSchema: true`):

```javascript
// After fetch: result = { data: config, schema: configSchema }
jPulse.UI.tabs.renderTabsAndPanelsFromSchema(
    'config-tabs',           // tab container id
    'config-all-panels',     // panel container id
    configSchema,
    result.data,
    { panelHeight: '31rem' } // optional
);
```

- Creates one tab button per block in `schema.data` (ordered by `_meta.order`).
- Creates one panel per block with a flow layout div (`.jp-form-flow`, `.jp-form-flow-cols-N`).
- Renders fields from schema (text, password, number, checkbox, select, textarea, tagInput, button).
- Virtual buttons: `type: 'button'` with `action: 'actionName'` render as buttons; wire handlers via `button[data-action]` delegation.

### One-line populate and get

Use the same schema for setting and reading form values:

```javascript
// Populate form from config data (applies schema defaults and normalize)
jPulse.UI.input.setFormData(configForm, config.data, configSchema);

// Read form into payload for API (coerces types, applies normalize, returns { data })
const payload = jPulse.UI.input.getFormData(configForm, configSchema);
await jPulse.api.put('/api/1/config', payload);
```

Fields must have `data-path` (e.g. `data-path="email.adminEmail"`); the schema drives which fields are included and how they are coerced.

### Layout

Layout is controlled by **block-level** and **field-level** schema properties.

| Where | Property | Use |
|-------|----------|-----|
| Block `_meta` | `maxColumns: 1` | Whole block single-column (every field stacks). No need for field-level layout on fields. |
| Block `_meta` | `maxColumns: 2` (or more) | Fields can share rows. |
| Field | `startNewRow: true` | Break to a new row. Field still takes one column (e.g. 50% in 2-col); next field can sit beside it (e.g. checkbox + button). |
| Field | `fullWidth: true` | Span the full row width. Use with `startNewRow: true` when the field should be alone on its row at 100%. Textareas get full width automatically. |

- **startNewRow** = position (“new row, one column”).
- **fullWidth** = size (“span full row”). Use both when you want “new row and full width.”

### Virtual buttons (view-only)

Define buttons in the schema so they participate in the same flow as data fields:

```javascript
// In schema.data.email (or any block):
testEmail: {
    type: 'button',
    scope: ['view'],
    label: '{{i18n.view.admin.config.testEmail}}',
    title: '{{i18n.view.admin.config.testEmailDesc}}',
    action: 'testEmail'
}
```

- `scope: ['view']`: rendered in the form but not in getFormData/setFormData.
- In the view, use delegated click: `form.addEventListener('click', (e) => { if (e.target.matches('button[data-action]')) { const action = e.target.dataset.action; actionHandlers[action](e.target); } });`

### Reference

- **jPulse.UI.input API**: [Input utilities: input widgets, set/get form data](jpulse-ui-reference.md#input-utilities-input-widgets-setget-form-data) in the jPulse.UI Widget Reference — full docs for `.tagInput`, `.jpSelect`, `.setAllValues`, `.getAllValues`, `.setFormData`, `.getFormData`.
- **Config UI**: `webapp/view/admin/config.shtml` (minimal HTML; one panel container; one-line setFormData/getFormData).
- **Schema shape**: `webapp/model/config.js` (baseSchema with `_meta` per block, field definitions with type, label, inputType, startNewRow, fullWidth, help, etc.).

## 💬 UI Widgets Overview

The jPulse Framework provides a comprehensive set of UI widgets under the `jPulse.UI.*` namespace. For complete documentation, see the **[jPulse.UI Widget Reference](jpulse-ui-reference.md)**.

### Available Widgets

- **[Toast Notifications](jpulse-ui-reference.md#toast-notifications)** - Non-blocking slide-down messages (`jPulse.UI.toast`)
- **[Dialog Widgets](jpulse-ui-reference.md#dialog-widgets)** - Modal dialogs (`alertDialog`, `infoDialog`, `successDialog`, `confirmDialog`)
- **[Sidebars](jpulse-ui-reference.md#sidebars)** - Left/right sidebars with component-based architecture (`jPulse.UI.sidebars`)
- **[Collapsible Components](jpulse-ui-reference.md#collapsible-components)** - Expandable/collapsible sections (`jPulse.UI.collapsible`)
- **[Accordion Component](jpulse-ui-reference.md#accordion-component)** - Grouped sections with mutual exclusion (`jPulse.UI.accordion`)
- **[Tab Interface](jpulse-ui-reference.md#tab-interface)** - Navigation and panel tabs (`jPulse.UI.tabs`)
- **[Source Code Display](jpulse-ui-reference.md#source-code-display)** - Syntax-highlighted code blocks (`jPulse.UI.sourceCode`)

### Quick Examples

```javascript
// Toast notifications
jPulse.UI.toast.success('Operation completed!');
jPulse.UI.toast.error('An error occurred.');

// Dialog widgets
await jPulse.UI.alertDialog('Warning message', 'Alert');
await jPulse.UI.infoDialog('Information message', 'Info');
await jPulse.UI.successDialog('Success message', 'Success');

// Confirm dialog with options
const result = await jPulse.UI.confirmDialog({
    title: 'Confirm Action',
    message: 'Are you sure?',
    buttons: ['Cancel', 'OK']
});
```

> **📖 Complete Documentation:** See [jPulse.UI Widget Reference](jpulse-ui-reference.md) for full API documentation, examples, and advanced usage patterns.

## 🔽 Collapsible & Accordion Components

For complete documentation on collapsible sections and accordion components, see:
- **[Collapsible Components](jpulse-ui-reference.md#collapsible-components)** - Expandable/collapsible sections
- **[Accordion Component](jpulse-ui-reference.md#accordion-component)** - Grouped sections with mutual exclusion

### Quick Example

```javascript
// Collapsible section
const collapsible = jPulse.UI.collapsible.register('mySection', {
    initOpen: false,
    onOpen: () => console.log('Opened'),
    onClose: () => console.log('Closed')
});

// Accordion
const accordion = jPulse.UI.accordion.register('myAccordion', {
    exclusive: true,
    initOpen: 0
});
```

---

## 🔽 Collapsible Component System (Detailed)

Production-ready collapsible sections with clean API design and comprehensive functionality.

### Basic Setup

```javascript
// Register a collapsible section and get handle
const securityCollapsible = jPulse.UI.collapsible.register('securitySection', {
    initOpen: false,
    onOpen: () => {
        // Show password fields when opened
        const passwordFields = document.getElementById('passwordFields');
        jPulse.dom.show(passwordFields);
    },
    onClose: () => {
        // Hide and clear password fields when closed
        const passwordFields = document.getElementById('passwordFields');
        jPulse.dom.hide(passwordFields);
        ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
            document.getElementById(id).value = '';
        });
    }
});

// Use the handle for clean API calls
if (securityCollapsible.isExpanded()) {
    securityCollapsible.collapse();
}

securityCollapsible.expand();
securityCollapsible.toggle();
```

### HTML Structure

```html
<div id="securitySection" class="jp-collapsible">
    <h3>Security Settings</h3>
    <div class="jp-collapsible-content">
        <!-- Collapsible content here -->
        <div id="passwordFields" style="display: none;">
            <input type="password" id="currentPassword" placeholder="Current Password">
            <input type="password" id="newPassword" placeholder="New Password">
            <input type="password" id="confirmPassword" placeholder="Confirm Password">
        </div>
    </div>
</div>
```

### Features
- **Clean API**: Handle-based methods with no string IDs in function calls
- **Auto-setup**: Automatically creates arrows and click handlers
- **Callbacks**: `onOpen` and `onClose` callbacks for custom logic
- **CSS Integration**: Works with `.jp-collapsible` CSS classes
- **Multiple Instances**: Independent collapsible sections on same page
- **Accessibility**: Proper cursor styling and visual feedback

## 🎛️ DOM Utilities

Enhanced DOM manipulation with consistent patterns and utility functions.

### DOM Ready Handling

```javascript
// DOM ready handling
jPulse.dom.ready(() => {
    console.log('DOM is ready');
    // Initialize your application
});
```

### Element Creation and Manipulation

```javascript
// Element creation and manipulation
const div = jPulse.dom.createElement('div', 'my-class', 'Hello World');
document.body.appendChild(div);

// Show/hide elements
jPulse.dom.hide(element);
jPulse.dom.show(element);
jPulse.dom.toggle(element);
```

### String Utilities

```javascript
// String utilities
const safe = jPulse.string.escapeHtml('<script>alert("xss")</script>');
const pretty = jPulse.string.capitalize('hello world'); // "Hello world"
const slug = jPulse.string.slugify('Hello World!'); // "hello-world"

// Sanitize HTML from trusted sources (framework, plugin, site).
// Strip dangerous tags/attrs only (use escapeHtml for untrusted user input)
const trustedHtml = jPulse.string.sanitizeHtml(schemaDescription);

// Safe HTML: Whitelist with a, strong, em, br tags only
const minimalHtml = jPulse.string.sanitizeHtml(panelDescription, true);
```

### URL Parameter Handling

```javascript
// URL parameter handling
const params = jPulse.url.getParams(); // {key: 'value', ...}
const value = jPulse.url.getParam('redirect'); // 'value' or null

// Example: Handle redirect parameter
const redirectUrl = jPulse.url.getParam('redirect') || '/dashboard/';
```

### URL Redirect with Toast Queue

Redirect to a URL with optional toast messages that display after the page loads.

```javascript
// Simple redirect
jPulse.url.redirect('/dashboard/');

// Redirect with delay
jPulse.url.redirect('/dashboard/', { delay: 1000 });

// Redirect with toast messages (shown on target page)
jPulse.url.redirect('/dashboard/', {
    toasts: [
        { toastType: 'success', message: 'Changes saved!' }
    ]
});

// Redirect with delay and multiple toasts
jPulse.url.redirect('/profile/', {
    delay: 500,
    toasts: [
        { toastType: 'success', message: 'Profile updated!' },
        { toastType: 'warning', message: 'Please verify your email.', link: '/verify/', linkText: 'Verify now' }
    ]
});
```

**Toast Object Format:**
```javascript
{
    toastType: 'error',       // error, warning, info, success
    message: 'Message',       // Required
    link: '/path/page.shtml', // Optional - clickable link
    linkText: 'Click here',   // Optional (default: 'Learn more')
    duration: 10000           // Optional (default: error=8s, others=5s)
}
```

**Notes:**
- Toast messages stored in `sessionStorage` key `jpulse_toast_queue`
- External URLs (different origin) automatically clear the toast queue
- Use `jPulse.url.isInternal(url)` to check if URL is same origin

### URL Origin Detection

```javascript
// Check if URL is internal (same origin)
jPulse.url.isInternal('/dashboard/');             // true (relative)
jPulse.url.isInternal('page.html');               // true (relative)
jPulse.url.isInternal('#section');                // true (anchor)
jPulse.url.isInternal('https://same.com/page');   // true (if on same.com)
jPulse.url.isInternal('https://other.com/page');  // false (external)
```

## 📱 Device & Browser Detection

Responsive design and feature detection utilities for adaptive user experiences.

### Device Detection

```javascript
// Device detection
const isMobile = jPulse.device.isMobile(); // true/false
const isTablet = jPulse.device.isTablet(); // true/false
const isDesktop = jPulse.device.isDesktop(); // true/false
const isTouch = jPulse.device.isTouchDevice(); // true/false

// Responsive behavior based on device
if (jPulse.device.isMobile()) {
    // Mobile-specific behavior
    enableTouchGestures();
} else {
    // Desktop-specific behavior
    enableKeyboardShortcuts();
}
```

### Browser and OS Detection

```javascript
// Browser and OS detection
const browser = jPulse.device.detectBrowser(); // 'chrome', 'firefox', 'safari', 'edge'
const os = jPulse.device.detectOs(); // 'windows', 'mac', 'linux', 'ios', 'android'

// Browser-specific optimizations
if (browser === 'safari') {
    // Safari-specific workarounds
}
```

### Viewport Information

```javascript
// Viewport information
const viewport = jPulse.device.getViewportSize(); // {width: 1920, height: 1080}

// Responsive breakpoints
if (viewport.width < 768) {
    // Mobile layout
} else if (viewport.width < 1024) {
    // Tablet layout
} else {
    // Desktop layout
}
```

## 🍪 Cookie Management

Simple cookie management utilities for user preferences and session data.

```javascript
// Cookie management
jPulse.cookies.set('preference', 'dark-theme', 30); // 30 days
const theme = jPulse.cookies.get('preference'); // 'dark-theme'
jPulse.cookies.delete('preference');

// Example: Theme preference management
const savedTheme = jPulse.cookies.get('theme') || 'light';
document.body.classList.add(`theme-${savedTheme}`);

function setTheme(theme) {
    jPulse.cookies.set('theme', theme, 365); // Save for 1 year
    document.body.className = document.body.className.replace(/theme-\w+/, `theme-${theme}`);
}
```

## 🎨 CSS Integration

The jPulse JavaScript framework integrates seamlessly with the CSS component library.

> **See Also:** [Style Reference](style-reference.md) for complete styling documentation and component examples.

### CSS Classes Applied by JavaScript

```javascript
// Classes automatically applied by jPulse utilities
'.jp-field-error'     // Applied to form fields with validation errors
'.jp-btn-loading'     // Loading state for buttons with spinner animation
'.jp-hidden'          // Hide/show utility class
'.jp-collapsible'     // Collapsible section container
'.jp-collapsible-content' // Collapsible content area
```

### Form State Management

```javascript
// Form field error highlighting
jPulse.form.setFieldError(inputElement, 'Invalid email format');
jPulse.form.clearFieldError(inputElement);

// Button loading states
jPulse.form.setLoadingState(button, true, 'Processing...');
jPulse.form.setLoadingState(button, false); // Clear loading state
```

## 🚀 Best Practices

### Application Initialization

```javascript
// Recommended application initialization pattern
jPulse.dom.ready(async () => {
    try {
        // Initialize global components
        initializeNavigation();
        initializeTheme();

        // Load user data if authenticated
        const user = await loadUserData();
        if (user) {
            initializeUserInterface(user);
        }

        // Initialize page-specific functionality
        initializePageComponents();

    } catch (error) {
        console.error('Application initialization failed:', error);
        jPulse.UI.toast.error('Application failed to load properly');
    }
});

async function loadUserData() {
    const result = await jPulse.api.get('/api/1/user/profile');
    return result.success ? result.data : null;
}
```

### Error Handling Patterns

```javascript
// Consistent error handling across the application
async function handleApiCall(endpoint, options = {}) {
    try {
        const result = await jPulse.api.get(endpoint);

        if (result.success) {
            return result.data;
        } else {
            // Handle API errors gracefully
            jPulse.UI.toast.error(result.error || 'Operation failed');
            return null;
        }
    } catch (error) {
        // Handle network/system errors
        console.error('API call failed:', error);
        jPulse.UI.toast.error('Network error - please try again');
        return null;
    }
}
```

### Progressive Enhancement

```javascript
// Ensure core functionality works without JavaScript
function enhanceForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return; // Form doesn't exist, skip enhancement

    // Only enhance if JavaScript is available
    jPulse.form.bindSubmission(form, form.action, {
        // Enhanced functionality
        successMessage: 'Form submitted successfully!',
        onSuccess: (data) => {
            // Dynamic updates only if JavaScript works
            updatePageContent(data);
        }
    });
}
```

### Performance Optimization

```javascript
// Debounce search inputs
let searchTimeout;
const searchInput = document.getElementById('userSearch');

searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const query = e.target.value;
        if (query.length >= 2) {
            await performSearch(query);
        }
    }, 300); // 300ms debounce
});

async function performSearch(query) {
    const result = await jPulse.api.get(`/api/1/user/search?username=${encodeURIComponent(query)}*`);
    if (result.success) {
        updateSearchResults(result.data);
    }
}
```

## 📚 Integration Examples

### User Profile Management

```javascript
// Complete user profile management example
class ProfileManager {
    constructor() {
        this.form = document.getElementById('profileForm');
        this.securitySection = null;
        this.init();
    }

    init() {
        // Load current profile data
        this.loadProfile();

        // Setup form handling
        this.setupFormHandling();

        // Setup collapsible security section
        this.setupSecuritySection();
    }

    async loadProfile() {
        const result = await jPulse.api.get('/api/1/user/profile');
        if (result.success) {
            this.populateForm(result.data);
        }
    }

    setupFormHandling() {
        jPulse.form.bindSubmission(this.form, '/api/1/user/profile', {
            method: 'PUT',
            successMessage: 'Profile updated successfully!',
            onSuccess: (data) => {
                this.updateDisplayedProfile(data);
            }
        });
    }

    setupSecuritySection() {
        this.securitySection = jPulse.UI.collapsible.register('securitySection', {
            initOpen: false,
            onOpen: () => {
                // Focus first password field when opened
                document.getElementById('currentPassword').focus();
            },
            onClose: () => {
                // Clear password fields when closed
                ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
                    document.getElementById(id).value = '';
                });
            }
        });
    }

    populateForm(userData) {
        // Populate form fields with user data
        Object.keys(userData.profile).forEach(key => {
            const field = this.form.querySelector(`[name="${key}"]`);
            if (field) field.value = userData.profile[key];
        });
    }

    updateDisplayedProfile(userData) {
        // Update any displayed profile information on the page
        const displayName = document.getElementById('displayName');
        if (displayName) {
            displayName.textContent = `${userData.profile.firstName} ${userData.profile.lastName}`;
        }
    }
}

// Initialize when DOM is ready
jPulse.dom.ready(() => {
    new ProfileManager();
});
```

### Dynamic Data Tables

```javascript
// Dynamic data table with search and pagination
class UserTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentPage = 1;
        this.limit = 25;
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.setupSearch();
        this.loadUsers();
    }

    setupSearch() {
        const searchInput = this.container.querySelector('.search-input');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value;
                this.currentPage = 1;
                this.loadUsers();
            }, 300);
        });
    }

    async loadUsers() {
        const params = new URLSearchParams({
            page: this.currentPage,
            limit: this.limit,
            ...(this.searchQuery && { username: `${this.searchQuery}*` })
        });

        const result = await jPulse.api.get(`/api/1/user/search?${params}`);

        if (result.success) {
            this.renderTable(result.data);
            this.renderPagination(result.pagination);
        } else {
            jPulse.UI.toast.error('Failed to load users');
        }
    }

    renderTable(users) {
        const tbody = this.container.querySelector('tbody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${jPulse.string.escapeHtml(user.username)}</td>
                <td>${jPulse.string.escapeHtml(user.email)}</td>
                <td>${user.roles.join(', ')}</td>
                <td>${user.status}</td>
                <td>
                    <button onclick="editUser('${user.id}')">Edit</button>
                </td>
            </tr>
        `).join('');
    }

    renderPagination(pagination) {
        // Render pagination controls
        const paginationContainer = this.container.querySelector('.pagination');
        // Implementation details...
    }
}
```

## 📚 Additional Resources

### Framework Documentation
- **[REST API Reference](api-reference.md)** - Complete `/api/1/*` endpoint documentation
- **[Handlebars Reference](handlebars.md)** - Handlebars syntax, custom variables, and components
- **[Template Reference](template-reference.md)** - Server-side template development patterns
- **[Style Reference](style-reference.md)** - Complete `jp-*` styling framework

### Getting Started
- **[Installation Guide](installation.md)** - Setup for development and production
- **[Getting Started](getting-started.md)** - Quick start tutorial
- **[Site Customization](site-customization.md)** - Site override system guide
- **[Examples](app-examples.md)** - Real-world code examples

### Advanced Topics
- **[Architecture Overview](dev/architecture.md)** - System design and patterns
- **[Deployment Guide](deployment.md)** - Production deployment strategies
- **[Developer Documentation](dev/README.md)** - Framework development guide

---

**jPulse Front-End Framework** - Powerful, intuitive, and enterprise-ready client-side development. 🚀
