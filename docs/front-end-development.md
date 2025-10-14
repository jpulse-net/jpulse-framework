# jPulse Framework / Docs / Front-End Development Guide v0.9.7

Complete guide to client-side development with the jPulse JavaScript framework, covering utilities, form handling, UI components, and best practices for building interactive web applications.

**🎯 Live Examples:** See the [UI Widgets Examples](/jpulse-examples/ui-widgets.shtml) and [Form Examples](/jpulse-examples/forms.shtml) pages for interactive demonstrations of all concepts with working code.

## 🎯 Overview

The jPulse Framework provides a comprehensive client-side utility library available globally as `jPulse`. This framework eliminates code duplication, provides consistent patterns across all views, and implements the "don't make me think" philosophy for front-end development.

### Architecture Philosophy
- **Client-Side Heavy**: 80% of view logic happens in the browser via JavaScript + API calls
- **API-First**: All data operations use REST endpoints (`/api/1/*`)
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Zero Configuration**: Utilities work out of the box with sensible defaults

### Key Features
- **API Call Standardization**: Simplified REST API interactions
- **Form Handling**: Enhanced form submission with validation and error handling
- **UI Components**: Slide-down messages, collapsible sections, and more
- **DOM Utilities**: Enhanced DOM manipulation with consistent patterns
- **Device Detection**: Responsive design and feature detection utilities

### Related Documentation
- **[REST API Reference](api-reference.md)** - Complete `/api/1/*` endpoint documentation
- **[Style Reference](style-reference.md)** - Complete `jp-*` styling framework
- **[Template Reference](template-reference.md)** - Server-side Handlebars integration
- **[Site Customization](site-customization.md)** - W-014 override system for site-specific code
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

The jPulse Framework provides two distinct approaches for form handling, each optimized for different use cases.

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
document.addEventListener('DOMContentLoaded', () => {
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

## 💬 Toast Message System

Display non-blocking slide-down messages with smooth animations and intelligent stacking.

### Basic Usage

```javascript
// Basic slide-down messages with configurable auto-hide durations
jPulse.UI.toast.success('Operation completed successfully!'); // 3s duration
jPulse.UI.toast.error('Please check your input and try again.'); // 6s duration
jPulse.UI.toast.info('Your session will expire in 5 minutes.'); // 3s duration
jPulse.UI.toast.warning('This action cannot be undone.'); // 5s duration

// Custom duration (overrides config defaults)
jPulse.UI.toast.show('Custom message', 'info', 10000);

// Clear all slide-down messages
jPulse.UI.toast.clearAll();
```

### Features
- **Non-blocking**: Messages overlay content without shifting page layout
- **Smooth animations**: 0.6s slide transitions from behind header
- **Dynamic stacking**: Multiple messages stack intelligently with 5px gaps
- **Responsive design**: Adapts to screen size using `appConfig.view.toastMessage` settings
- **Independent timing**: Each message respects its configured duration without interference

### Integration with Forms

```javascript
// Automatic success/error messages with form submission
jPulse.form.bindSubmission(form, '/api/1/user/profile', {
    successMessage: 'Profile updated successfully!',
    onSuccess: (data) => {
        // Additional success logic
        updateProfileDisplay(data);
    },
    onError: (error) => {
        // Custom error handling (prevents default error message)
        jPulse.UI.toast.error(`Update failed: ${error}`);
    }
});
```

## 🔽 Collapsible Component System

Production-ready collapsible sections with clean API design and comprehensive functionality.

### Basic Setup

```javascript
// Register a collapsible section and get handle
const securityCollapsible = jPulse.collapsible.register('securitySection', {
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
```

### URL Parameter Handling

```javascript
// URL parameter handling
const params = jPulse.url.getParams(); // {key: 'value', ...}
const value = jPulse.url.getParam('redirect'); // 'value' or null

// Example: Handle redirect parameter
const redirectUrl = jPulse.url.getParam('redirect') || '/dashboard/';
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
document.addEventListener('DOMContentLoaded', async () => {
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
        this.securitySection = jPulse.collapsible.register('securitySection', {
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
- **[Style Reference](style-reference.md)** - Complete `jp-*` styling framework
- **[Template Reference](template-reference.md)** - Server-side Handlebars integration

### Getting Started
- **[Installation Guide](installation.md)** - Setup for development and production
- **[Getting Started](getting-started.md)** - Quick start tutorial
- **[Site Customization](site-customization.md)** - W-014 override system guide
- **[Examples](examples.md)** - Real-world code examples

### Advanced Topics
- **[Architecture Overview](dev/architecture.md)** - System design and patterns
- **[Deployment Guide](deployment.md)** - Production deployment strategies
- **[Developer Documentation](dev/README.md)** - Framework development guide

---

**jPulse Front-End Framework** - Powerful, intuitive, and enterprise-ready client-side development. 🚀
