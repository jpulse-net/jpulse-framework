# jPulse Framework / API Documentation v0.4.3

Comprehensive API reference for the jPulse Framework RESTful endpoints and template system.

________________________________________________
## 🔌 API Overview

jPulse provides a comprehensive RESTful API under the `/api/1/` prefix with the following features:

- **RESTful Design**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON Responses**: Consistent response format with success/error handling
- **Query Parameters**: Flexible filtering and pagination support
- **Authentication**: Session-based authentication with user context
- **Error Handling**: Structured error responses with detailed messages
- **Client-Side Error Handling**: Server-side rendering of error pages without redirects, preserving URLs.
- **Component-Based Styling**: Complete `jp-` CSS component library with responsive design and theme system foundation
- **Dynamic Schema-Aware Frontend**: API-driven dropdown population with backend schema synchronization
- **Logging**: All API calls automatically logged with user context

### Recent API Additions (v0.4.2)
- `GET /api/1/auth/roles` - Returns available user roles from schema
- `GET /api/1/auth/languages` - Returns available languages from i18n system
- `GET /api/1/auth/themes` - Returns available themes from schema
- **Simplified API Responses**: Eliminated double-wrapped response format for cleaner frontend integration

### Base URL Structure
```
https://your-domain.com/api/1/
```

### Standard Response Format
```json
{
    "success": true|false,
    "message": "Human-readable message",
    "data": { ... },           // On success
    "error": "Error message",  // On failure
    "code": "ERROR_CODE",      // Error code for programmatic handling
    "elapsed": 15              // Response time in milliseconds (search endpoints)
}
```

________________________________________________
## 🎨 Client-Side Utilities (jPulseCommon)

The jPulse Framework includes a comprehensive client-side utility library available globally as `jPulseCommon`. This eliminates code duplication and provides consistent patterns across all views.

### Slide-Down Message System

Display non-blocking slide-down messages with smooth animations and intelligent stacking.

```javascript
// Basic slide-down messages with configurable auto-hide durations
jPulseCommon.showSlideDownSuccess('Operation completed successfully!'); // 3s duration
jPulseCommon.showSlideDownError('Please check your input and try again.'); // 6s duration
jPulseCommon.showSlideDownInfo('Your session will expire in 5 minutes.'); // 3s duration
jPulseCommon.showSlideDownWarning('This action cannot be undone.'); // 5s duration

// Custom duration (overrides config defaults)
jPulseCommon.showSlideDownMessage('Custom message', 'info', 10000);

// Clear all slide-down messages
jPulseCommon.clearSlideDownMessages();
```

**Features:**
- **Non-blocking**: Messages overlay content without shifting page layout
- **Smooth animations**: 0.6s slide transitions from behind header
- **Dynamic stacking**: Multiple messages stack intelligently with 5px gaps
- **Responsive design**: Adapts to screen size using `appConfig.view.slideDownMessage` settings
- **Independent timing**: Each message respects its configured duration without interference

### API Call Standardization

Simplified API interactions with consistent error handling and response format.

```javascript
// GET request
const result = await jPulseCommon.api.get('/api/1/user/profile');
if (result.success) {
    console.log('User data:', result.data);
} else {
    jPulseCommon.showError(result.error);
}

// POST request with data
const loginResult = await jPulseCommon.api.post('/api/1/auth/login', {
    identifier: 'username',
    password: 'password'
});

// PUT and DELETE requests
await jPulseCommon.api.put('/api/1/user/profile', profileData);
await jPulseCommon.api.delete('/api/1/user/session');

// Advanced usage with custom options
const customResult = await jPulseCommon.apiCall('/api/1/custom', {
    method: 'PATCH',
    body: data,
    headers: { 'Custom-Header': 'value' }
});
```

### Form Handling & Validation

Streamlined form submission with validation, loading states, and error handling.

```javascript
// Simple form submission
const form = document.getElementById('loginForm');
jPulseCommon.form.handleSubmission(form, '/api/1/auth/login', {
    successMessage: 'Login successful!',
    redirectUrl: '/dashboard/',
    loadingText: 'Signing in...'
});

// Advanced form handling with callbacks
jPulseCommon.form.handleSubmission(form, '/api/1/user/signup', {
    beforeSubmit: (formElement) => {
        // Custom validation
        const password = formElement.password.value;
        if (password.length < 8) {
            jPulseCommon.showError('Password must be at least 8 characters');
            return false; // Cancel submission
        }
        return true; // Continue
    },
    onSuccess: (data) => {
        jPulseCommon.showSuccess(`Welcome ${data.firstName}!`);
        window.location.href = '/auth/login.shtml?signup=success';
    },
    onError: (error) => {
        // Custom error handling
        console.log('Signup failed:', error);
    }
});

// Form utilities
const formData = jPulseCommon.form.serialize(formElement);
jPulseCommon.form.setLoadingState(submitButton, true, 'Processing...');
jPulseCommon.form.clearErrors(formElement);

// Validation helpers
jPulseCommon.form.validate.email('user@example.com'); // true/false
jPulseCommon.form.validate.password('mypassword', 8); // true/false
jPulseCommon.form.validate.required('value'); // true/false
```

### DOM Utilities

Enhanced DOM manipulation with consistent patterns.

```javascript
// DOM ready handling
jPulseCommon.dom.ready(() => {
    console.log('DOM is ready');
});

// Element creation and manipulation
const div = jPulseCommon.dom.createElement('div', 'my-class', 'Hello World');
document.body.appendChild(div);

// Show/hide elements
jPulseCommon.dom.hide(element);
jPulseCommon.dom.show(element);
jPulseCommon.dom.toggle(element);

// String utilities
const safe = jPulseCommon.string.escapeHtml('<script>alert("xss")</script>');
const pretty = jPulseCommon.string.capitalize('hello world'); // "Hello world"
const slug = jPulseCommon.string.slugify('Hello World!'); // "hello-world"

// URL parameter handling
const params = jPulseCommon.url.getParams(); // {key: 'value', ...}
const value = jPulseCommon.url.getParam('redirect'); // 'value' or null
```

### Device & Browser Detection

Responsive design and feature detection utilities.

```javascript
// Device detection
const isMobile = jPulseCommon.device.isMobile(); // true/false
const isTablet = jPulseCommon.device.isTablet(); // true/false
const isDesktop = jPulseCommon.device.isDesktop(); // true/false
const isTouch = jPulseCommon.device.isTouchDevice(); // true/false

// Browser and OS detection
const browser = jPulseCommon.device.detectBrowser(); // 'chrome', 'firefox', 'safari', 'edge'
const os = jPulseCommon.device.detectOs(); // 'windows', 'mac', 'linux', 'ios', 'android'

// Viewport information
const viewport = jPulseCommon.device.getViewportSize(); // {width: 1920, height: 1080}

// Cookie management
jPulseCommon.cookies.set('preference', 'dark-theme', 30); // 30 days
const theme = jPulseCommon.cookies.get('preference'); // 'dark-theme'
jPulseCommon.cookies.delete('preference');
```

### CSS Classes

The utility framework includes standardized CSS classes:

- `.jp-alert`, `.jp-alert-success`, `.jp-alert-error`, `.jp-alert-info`, `.jp-alert-warning`
- `.jp-field-error` - Applied to form fields with validation errors
- `.jp-btn-loading` - Loading state for buttons with spinner animation
- `.jp-hidden` - Hide/show utility class

### Integration Example

Complete form with error handling and user feedback:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const result = await jPulseCommon.form.handleSubmission(
            loginForm,
            '/api/1/auth/login',
            {
                successMessage: 'Welcome back!',
                loadingText: 'Signing in...',
                redirectUrl: new URLSearchParams(window.location.search).get('redirect') || '/',
                redirectDelay: 1000,
                beforeSubmit: (form) => {
                    // Clear any previous alerts
                    jPulseCommon.clearAlerts();
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

________________________________________________
## 🎨 Component Library (jp-* CSS Classes)

The jPulse Framework provides a comprehensive component library with consistent `jp-` prefixed classes for rapid development.

### Layout Components
- `.jp-container` - Responsive container with configurable max-width
- `.jp-main` - Main content area with white background and shadow
- `.jp-card` - Reusable card component with header/body/footer structure

### UI Components
- `.jp-btn` + variants (primary, secondary, success, danger, outline, loading)
- `.jp-alert` + variants (info, error, success, warning) with animations
- `.jp-info-box/warning-box/error-box` - Message containers with colored borders

### Form Components
- `.jp-form-group/label/input/select/textarea` - Complete form styling
- `.jp-form-grid` - Responsive form layouts
- `.jp-search-section` + `.jp-search-form` - Search interface components
- `.jp-field-error` - Error state styling with focus indicators

### Utilities
- `.jp-flex/flex-between/flex-center/flex-wrap` - Flexbox utilities
- `.jp-gap-10/15/20` - Gap spacing utilities
- `.jp-mb-10/15/20/30` - Margin bottom utilities
- `.jp-hidden` - Element visibility control

### Theme System (Future W-037)
- `.jp-theme-*-light/dark` classes prepared for theme switching
- Aligns with existing user preferences: `light` and `dark` themes

________________________________________________
## 👤 User Management API

Complete user authentication, profile management, and administrative user search.

### User Authentication

#### User Registration (Signup)
Create a new user account with validation and error handling.

**Endpoint:** `POST /api/1/user/signup`

**Request Body:**
```json
{
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword123",
    "confirmPassword": "securepassword123",
    "acceptTerms": true
}
```

**Success Response (201):**
```json
{
    "success": true,
    "data": {
        "user": {
            "id": "60f7b3b3b3b3b3b3b3b3b3b3",
            "username": "johndoe",
            "email": "john@example.com",
            "firstName": "John",
            "lastName": "Doe"
        }
    },
    "message": "User account created successfully"
}
```

**Error Responses:**
- **400**: Missing required fields, password mismatch, or terms not accepted
- **409**: Username or email already exists
- **500**: Internal server error

**Validation Rules:**
- All fields (firstName, lastName, username, email, password) are required
- Password must match confirmPassword
- Terms must be accepted (acceptTerms: true)
- Username must be unique
- Email must be unique and valid format

#### Login
Authenticate user with username/email and password, creating a persistent session.

**Endpoint:** `POST /api/1/auth/login`

**Request Body:**
```json
{
    "identifier": "jsmith",        // username or email
    "password": "securepassword123"
}
```

**Example Response (Success):**
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "id": "66cb1234567890abcdef1234",
        "username": "jsmith",
        "firstName": "John",
        "lastName": "Smith",
        "email": "john@example.com",
        "roles": ["user"],
        "authenticated": true
    }
}
```

**Example Response (Failure):**
```json
{
    "success": false,
    "error": "Invalid credentials"
}
```

#### Logout
End user session and clear authentication.

**Endpoint:** `POST /api/1/auth/logout`

**Example Response:**
```json
{
    "success": true,
    "message": "Logout successful"
}
```

### User Profile Management

#### Get Profile
Retrieve current user's profile information.

**Endpoint:** `GET /api/1/user/profile`
**Authentication:** Required

**Example Response:**
```json
{
    "success": true,
    "message": "Profile retrieved successfully",
    "data": {
        "id": "66cb1234567890abcdef1234",
        "username": "jsmith",
        "email": "john@example.com",
        "profile": {
            "firstName": "John",
            "lastName": "Smith",
            "nickName": "Johnny",
            "avatar": ""
        },
        "roles": ["user"],
        "preferences": {
            "language": "en",
            "theme": "light"
        },
        "status": "active",
        "lastLogin": "2025-08-25T10:30:00.000Z",
        "loginCount": 42,
        "createdAt": "2025-08-01T08:00:00.000Z"
    }
}
```

#### Update Profile
Update user's profile information and preferences.

**Endpoint:** `PUT /api/1/user/profile`
**Authentication:** Required

**Request Body:**
```json
{
    "profile": {
        "firstName": "John",
        "lastName": "Smith",
        "nickName": "Johnny"
    },
    "preferences": {
        "language": "de",
        "theme": "dark"
    }
}
```

**Example Response:**
```json
{
    "success": true,
    "message": "Profile updated successfully",
    "data": {
        "id": "66cb1234567890abcdef1234",
        "profile": { ... },
        "preferences": { ... },
        "updatedAt": "2025-08-25T10:35:00.000Z"
    }
}
```

#### Change Password
Change user's password with current password verification.

**Endpoint:** `PUT /api/1/user/password`
**Authentication:** Required

**Request Body:**
```json
{
    "currentPassword": "oldpassword123",
    "newPassword": "newsecurepassword456"
}
```

**Example Response:**
```json
{
    "success": true,
    "message": "Password changed successfully"
}
```

### Administrative User Search

#### Search Users
Search and filter users with advanced query capabilities. Requires admin or root role.

**Endpoint:** `GET /api/1/user/search`
**Authentication:** Required (Admin/Root roles only)

**Query Parameters:**
- `username` (string): Login ID filter with wildcard support (`*`)
- `email` (string): Email filter with wildcard support (`*`)
- `profile.firstName` (string): First name filter with wildcard support
- `profile.lastName` (string): Last name filter with wildcard support
- `roles` (string): Role filter (`guest`, `user`, `admin`, `root`)
- `status` (string): Status filter (`active`, `inactive`, `pending`, `suspended`)
- `createdAt` (string): Date range filter (YYYY, YYYY-MM, YYYY-MM-DD)
- `lastLogin` (string): Last login date filter
- `limit` (number): Maximum results to return (default: 50, max: 1000)
- `skip` (number): Number of results to skip for pagination
- `page` (number): Page number (alternative to skip)
- `sort` (string): Sort field with optional `-` prefix for descending (e.g., `-updatedAt`)

**Example Requests:**
```bash
# Find active admin users
GET /api/1/user/search?status=active&roles=admin

# Search users by name with wildcard
GET /api/1/user/search?profile.firstName=John*

# Find users created in August 2025
GET /api/1/user/search?createdAt=2025-08

# Paginated results sorted by last login
GET /api/1/user/search?limit=25&page=2&sort=-lastLogin

# Complex query: active users with recent login
GET /api/1/user/search?status=active&lastLogin=2025-08-25&limit=10
```

**Example Response:**
```json
{
    "success": true,
    "message": "Found 15 users",
    "data": [
        {
            "id": "66cb1234567890abcdef1234",
            "username": "jsmith",
            "email": "john@example.com",
            "profile": {
                "firstName": "John",
                "lastName": "Smith",
                "nickName": "Johnny",
                "avatar": ""
            },
            "roles": ["user", "admin"],
            "preferences": {
                "language": "en",
                "theme": "light"
            },
            "status": "active",
            "lastLogin": "2025-08-25T10:30:00.000Z",
            "loginCount": 42,
            "createdAt": "2025-08-01T08:00:00.000Z",
            "updatedAt": "2025-08-25T09:15:00.000Z"
        }
    ],
    "pagination": {
        "total": 15,
        "limit": 50,
        "skip": 0,
        "page": 1,
        "pages": 1
    },
    "query": {
        "status": "active",
        "roles": "admin"
    },
    "elapsed": 12
}
```

### User Schema
User documents follow this comprehensive schema:

```javascript
{
    _id: ObjectId,              // MongoDB ObjectId
    username: String,           // Unique login identifier
    email: String,              // Unique email address (validated)
    passwordHash: String,       // bcrypt hashed password (never returned in API)
    profile: {
        firstName: String,      // Required
        lastName: String,       // Required
        nickName: String,       // Optional display name
        avatar: String          // Avatar URL or path
    },
    roles: [String],           // ['guest', 'user', 'admin', 'root']
    preferences: {
        language: String,       // Default: 'en'
        theme: String          // 'light' or 'dark', default: 'light'
    },
    status: String,            // 'active', 'inactive', 'pending', 'suspended'
    lastLogin: Date,           // Last successful login timestamp
    loginCount: Number,        // Total number of successful logins
    createdAt: Date,           // Auto-generated creation timestamp
    updatedAt: Date,           // Auto-updated modification timestamp
    updatedBy: String,         // User ID who made the last change
    docVersion: Number,        // Document version for schema migrations
    saveCount: Number          // Auto-incrementing save counter
}
```

### Security Features
- **Password Security**: bcrypt hashing with 12 salt rounds
- **Session Management**: Persistent MongoDB sessions with TTL expiration
- **Role-Based Access**: Method-level authorization for admin functions
- **Data Protection**: Password hashes never included in API responses
- **Input Validation**: Comprehensive validation for all user data
- **Login Tracking**: Automatic tracking of login attempts and success

________________________________________________
## 🔧 Configuration Management API

Complete CRUD operations for site configuration management.

### Get Configuration
Retrieve configuration by ID.

**Endpoint:** `GET /api/1/config/:id`

**Parameters:**
- `id` (path): Configuration ID (e.g., "global")

**Example Request:**
```bash
GET /api/1/config/global
```

**Example Response:**
```json
{
    "success": true,
    "message": "Config retrieved successfully",
    "data": {
        "_id": "global",
        "data": {
            "email": {
                "adminEmail": "admin@example.com",
                "adminName": "Site Administrator",
                "smtpServer": "localhost",
                "smtpUser": "",
                "smtpPass": "",
                "useTls": false
            },
            "messages": {
                "broadcast": "Welcome to jPulse Framework!"
            }
        },
        "createdAt": "2025-08-25T08:00:00.000Z",
        "updatedAt": "2025-08-25T08:15:00.000Z",
        "updatedBy": "admin",
        "docVersion": 1
    }
}
```

### Create Configuration
Create a new configuration document.

**Endpoint:** `POST /api/1/config`

**Request Body:**
```json
{
    "_id": "custom-config",
    "data": {
        "feature": {
            "enabled": true,
            "settings": {
                "maxItems": 100,
                "timeout": 30000
            }
        }
    }
}
```

**Example Response:**
```json
{
    "success": true,
    "message": "Config created successfully",
    "data": {
        "_id": "custom-config",
        "data": { ... },
        "createdAt": "2025-08-25T08:17:00.000Z",
        "updatedAt": "2025-08-25T08:17:00.000Z",
        "updatedBy": "admin",
        "docVersion": 1
    }
}
```

### Update Configuration
Update an existing configuration document.

**Endpoint:** `PUT /api/1/config/:id`

**Parameters:**
- `id` (path): Configuration ID to update

**Request Body:**
```json
{
    "data": {
        "email": {
            "adminEmail": "newadmin@example.com",
            "smtpServer": "smtp.example.com",
            "useTls": true
        }
    }
}
```

**Example Response:**
```json
{
    "success": true,
    "message": "Config updated successfully",
    "data": {
        "_id": "global",
        "data": { ... },
        "updatedAt": "2025-08-25T08:17:00.000Z",
        "updatedBy": "admin",
        "docVersion": 2
    }
}
```

### Delete Configuration
Delete a configuration document.

**Endpoint:** `DELETE /api/1/config/:id`

**Parameters:**
- `id` (path): Configuration ID to delete

**Example Response:**
```json
{
    "success": true,
    "message": "Config deleted successfully"
}
```

### Configuration Schema
Configuration documents follow this schema:

```javascript
{
    _id: String,        // Unique identifier
    data: {             // Configuration data object
        email: {
            adminEmail: String,
            adminName: String,
            smtpServer: String,
            smtpUser: String,
            smtpPass: String,
            useTls: Boolean
        },
        messages: {
            broadcast: String
        }
        // ... additional configuration groups
    },
    createdAt: Date,    // Auto-generated
    updatedAt: Date,    // Auto-updated
    updatedBy: String,  // User ID who made the change
    docVersion: Number  // Version counter
}
```

________________________________________________
## 📊 Logging API

Advanced log search and retrieval with flexible query parameters.

### Search Logs
Search and filter log entries with powerful query capabilities.

**Endpoint:** `GET /api/1/log/search`

**Query Parameters:**
- `level` (string): Log level filter (`error`, `warn`, `info`, `debug`)
- `message` (string): Text search with wildcard support (`*`)
- `createdAt` (string): Date range filter (YYYY, YYYY-MM, YYYY-MM-DD)
- `docType` (string): Document type filter (`config`, `user`, `log`)
- `action` (string): Action filter (`create`, `update`, `delete`)
- `createdBy` (string): User ID filter
- `limit` (number): Maximum results to return (default: 100, max: 1000)
- `skip` (number): Number of results to skip for pagination
- `sort` (string): Sort field (default: `createdAt`)
- `order` (string): Sort order (`asc`, `desc`, default: `desc`)

**Example Requests:**
```bash
# Get error logs from the last month
GET /api/1/log/search?level=error&createdAt=2025-01&limit=50

# Search for database-related messages
GET /api/1/log/search?message=database*

# Get configuration update logs
GET /api/1/log/search?docType=config&action=update

# Paginated results
GET /api/1/log/search?limit=25&skip=50

# Complex query
GET /api/1/log/search?level=error&docType=config&createdAt=2025-08-25&message=failed*
```

**Example Response:**
```json
{
    "success": true,
    "message": "Found 15 log entries",
    "elapsed": 8,
    "data": [
        {
            "_id": "66cb1234567890abcdef1234",
            "level": "error",
            "message": "Database connection failed",
            "data": {
                "docId": "global",
                "docType": "config",
                "action": "update",
                "changes": "email.adminEmail: admin@example.com → newadmin@example.com"
            },
            "createdAt": "2025-08-25T08:15:30.123Z",
            "createdBy": "admin",
            "docVersion": 1
        }
    ],
    "pagination": {
        "total": 15,
        "limit": 100,
        "skip": 0,
        "page": 1,
        "pages": 1
    },
    "query": {
        "level": "error",
        "createdAt": {
            "$gte": "2025-08-25T00:00:00.000Z",
            "$lt": "2025-08-26T00:00:00.000Z"
        }
    }
}
```

### Log Entry Schema
Log entries follow this schema:

```javascript
{
    _id: ObjectId,      // MongoDB ObjectId
    level: String,      // 'error', 'warn', 'info', 'debug'
    message: String,    // Log message
    data: {             // Additional log data
        docId: String|ObjectId,  // Related document ID
        docType: String,         // 'config', 'user', 'log'
        action: String,          // 'create', 'update', 'delete'
        changes: String          // Description of changes made
    },
    createdAt: Date,    // Auto-generated timestamp
    createdBy: String,  // User ID who triggered the log
    docVersion: Number  // Version number
}
```

### Wildcard Search
The `message` parameter supports wildcard searching:

- `database*` - Messages starting with "database"
- `*connection*` - Messages containing "connection"
- `*failed` - Messages ending with "failed"
- Case-insensitive matching

### Date Range Filtering
The `createdAt` parameter supports flexible date formats:

- `2025` - All logs from 2025
- `2025-08` - All logs from August 2025
- `2025-08-25` - All logs from August 25, 2025

________________________________________________
## 🎨 Template Rendering API

Server-side template processing with handlebars variables, secure file inclusion, and performance-optimized caching for frequently accessed templates and includes.

### Render Templates
Load and render `.shtml` templates with handlebars processing.

**Endpoint:** `GET /{path}/index.shtml` or `GET /{path}.shtml`

**Examples:**
```bash
# Home page template
GET /home/index.shtml

# About page template
GET /about/index.shtml

# Admin configuration page
GET /admin/config.shtml

# Custom template
GET /dashboard/analytics.shtml
```

### Template Variables
Templates have access to a rich context object with these variables:

#### Application Information
```html
<span>{{app.version}}</span>        <!-- 0.2.1 -->
<span>{{app.release}}</span>        <!-- 2025-08-25 -->
```

#### Internationalization
```html
<h1>{{i18n.app.name}}</h1>          <!-- jPulse Framework -->
<p>{{i18n.header.signin}}</p>       <!-- Sign In -->
<p>{{i18n.welcome.message}}</p>     <!-- Welcome to jPulse -->
```

#### i18n Variable Content (v0.2.6)
Translations now support handlebars-style variable substitution:
```html
<!-- Translation file: -->
<!-- welcome: 'Welcome back, {{user.firstName}}!' -->
<p>{{i18n.login.welcome}}</p>       <!-- Welcome back, John! -->

<!-- Two-pass processing: -->
<!-- 1st pass: {{i18n.login.welcome}} → 'Welcome back, {{user.firstName}}!' -->
<!-- 2nd pass: {{user.firstName}} → 'John' -->
<!-- Result: "Welcome back, John!" -->
```

Available context in translations:
- `{{user.firstName}}`, `{{user.lastName}}`, `{{user.email}}`
- `{{config.siteName}}`, `{{config.adminEmail}}`
- `{{url.domain}}`, `{{url.pathname}}`
- `{{app.version}}`, `{{app.release}}`

#### Configuration Access
```html
<div style="max-width: {{appConfig.view.maxWidth}}px;">
<input maxlength="{{appConfig.controller.log.maxMsgLength}}">
<span>{{appConfig.app.version}}</span>
```

#### User Context
```html
<span>{{user.id}}</span>            <!-- user123 -->
<span>{{user.firstName}}</span>     <!-- John -->
<span>{{user.lastName}}</span>      <!-- Doe -->
<span>{{user.email}}</span>         <!-- john@example.com -->
<div class="{{if user.authenticated 'logged-in' 'guest'}}">
```

#### Site Configuration
```html
<a href="mailto:{{config.email.adminEmail}}">Contact Admin</a>
<div class="broadcast">{{config.messages.broadcast}}</div>
```

#### URL Information
```html
<span>{{url.domain}}</span>         <!-- https://example.com:8080 -->
<span>{{url.hostname}}</span>       <!-- example.com -->
<span>{{url.port}}</span>           <!-- 8080 -->
<span>{{url.pathname}}</span>       <!-- /home/index.shtml -->
<span>{{url.param.foo}}</span>      <!-- bar (from ?foo=bar) -->
```

### Template Helpers

#### Block Conditionals (v0.2.7)
The template system supports powerful block-level conditionals with {{#if}} syntax:

**Basic Syntax:**
```html
{{#if condition}}
  Content shown when condition is true
{{/if}}
```

**If/Else Syntax:**
```html
{{#if condition}}
  Content for true condition
{{else}}
  Content for false condition
{{/if}}
```

**Features:**
- **Recursive Processing**: Handlebars within {{#if}} blocks are fully processed
- **Nested Content**: Complex HTML and multiple handlebars supported within blocks
- **No Nesting Limit**: {{#if}} blocks can contain other {{#if}} blocks (unlike legacy {{if}})
- **Context Access**: Full template context available within conditional blocks
- **Error Handling**: Malformed blocks show clear error messages

**Supported Conditions:**
- `user.authenticated` - Boolean authentication status
- `config.messages.broadcast` - String/object existence checks
- `url.port` - Numeric value checks
- Any context property with truthiness evaluation

**Migration from Legacy {{if}}:**
```html
<!-- Old syntax (deprecated) -->
{{if user.authenticated "Welcome!" "Please login"}}

<!-- New syntax (v0.2.7+) -->
{{#if user.authenticated}}
  Welcome!
{{else}}
  Please login
{{/if}}
```

#### File Operations

**Overview**: Securely includes other template files and retrieves file modification timestamps. For performance, these operations leverage a caching mechanism, especially for frequently accessed or pre-loaded files.

```html
<!-- Secure file includes -->
{{file.include "jpulse-header.tmpl"}}
{{file.include "components/navigation.tmpl"}}
{{file.include "jpulse-footer.tmpl"}}

<!-- File timestamps -->
<span>Last modified: {{file.timestamp "jpulse-header.tmpl"}}</span>
```

**Caching Details**:

- Template includes (`{{file.include}}`) and file timestamps (`{{file.timestamp}}`) are cached for performance
- Common include files (e.g., `jpulse-header.tmpl`, `jpulse-footer.tmpl`) and their timestamps are asynchronously pre-loaded at module initialization
- Caching behavior is configurable via application settings (`appConfig.controller.view.cacheIncludeFiles` and `appConfig.controller.view.cacheTemplateFiles`)

#### Block Conditional Rendering (v0.2.7)
```html
<!-- Simple conditional blocks -->
{{#if user.authenticated}}
  <p>Welcome back, {{user.firstName}}!</p>
  <div class="user-panel">{{user.email}}</div>
{{/if}}

<!-- If/else conditional blocks -->
{{#if user.authenticated}}
  <div class="user-panel">
    <h2>{{user.firstName}}</h2>
    <p>Last login: {{user.lastLogin}}</p>
  </div>
{{else}}
  <div class="guest-panel">
    <h2>Guest</h2>
    <p>Please <a href="/auth/login.shtml">sign in</a> to continue.</p>
  </div>
{{/if}}

<!-- Complex nested conditionals -->
{{#if config.messages.broadcast}}
  <div class="alert alert-info">
    <strong>{{i18n.messages.announcement}}</strong>
    <p>{{config.messages.broadcast}}</p>
    {{#if user.authenticated}}
      <small>Shown to: {{user.firstName}} {{user.lastName}}</small>
    {{/if}}
  </div>
{{/if}}
```

### Template Security Features

- **Path Traversal Protection**: Prevents `../../../etc/passwd` attacks
- **Include Depth Limiting**: Maximum 10 levels prevents infinite recursion
- **View Root Jail**: All includes resolved within `webapp/view/` directory
- **Input Sanitization**: All template variables properly escaped
- **File Extension Validation**: Only approved file types can be included
- **Block Processing Security**: {{#if}} blocks maintain all existing security constraints

### Template Response Format
Templates return rendered HTML with appropriate headers:

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 2048

<!DOCTYPE html>
<html>
<head>
    <title>jPulse Framework</title>
</head>
<body>
    <!-- Rendered template content -->
</body>
</html>
```

________________________________________________
## 🏥 Health Check API

System health and status monitoring.

### Health Check
Get application health status and basic information.

**Endpoint:** `GET /api/1/health`

**Example Response:**
```json
{
    "success": true,
    "status": "ok",
    "data": {
        "version": "0.2.1",
        "release": "2025-08-25",
        "uptime": 3600,
        "environment": "development",
        "database": "connected",
        "timestamp": "2025-08-25T08:17:00.000Z"
    }
}
```

**Health Status Values:**
- `ok` - All systems operational
- `degraded` - Some non-critical issues
- `error` - Critical system issues

________________________________________________
## 🔐 Authentication & Authorization

### Auth Controller System
jPulse uses a centralized Auth Controller with middleware and utility functions:

#### Middleware Functions
- **`AuthController.requireAuthentication`**: Middleware that requires user authentication
- **`AuthController.requireRole(roles)`**: Middleware factory that requires specific roles

#### Utility Functions
- **`AuthController.isAuthenticated(req)`**: Returns boolean for authentication status
- **`AuthController.isAuthorized(req, roles)`**: Returns boolean for role authorization

#### Route Protection Examples
```javascript
// Require authentication only
router.get('/api/1/user/profile', AuthController.requireAuthentication, UserController.getProfile);

// Require specific roles
router.get('/api/1/user/search', AuthController.requireRole(['admin', 'root']), UserController.search);

// Use utilities in controller logic
if (!AuthController.isAuthenticated(req)) {
    return CommonUtils.sendError(req, res, 401, 'Authentication required');
}
```

### Smart Error Handling
The Auth Controller uses `CommonUtils.sendError()` for intelligent error responses:

```javascript
// API requests (/api/*) get JSON responses:
{
    "success": false,
    "error": "Authentication required",
    "code": "UNAUTHORIZED",
    "path": "/api/1/user/profile"
}

// Web requests now render error page directly without redirecting:
// Original URL is preserved, error details available via {{url.param.code}} and {{url.param.msg}}
```

### Session-Based Authentication
jPulse uses Express sessions for authentication:

```javascript
// Session configuration
session: {
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,      // Set to true for HTTPS
        maxAge: 3600000     // 1 hour
    }
}
```

### User Context
Authenticated users have access to:

```javascript
req.session.user = {
    id: "user123",
    username: "jsmith",
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
    roles: ["user", "admin"],
    authenticated: true
}
```

### Protected Endpoints
Some endpoints require authentication:

- `POST /api/1/config` - Requires admin role
- `PUT /api/1/config/:id` - Requires admin role
- `DELETE /api/1/config/:id` - Requires admin role
- `GET /api/1/log/search` - Requires authenticated user

________________________________________________
## 📝 Error Handling

### Standard Error Response
```json
{
    "success": false,
    "error": "Detailed error message",
    "code": "ERROR_CODE",
    "details": {
        "field": "validation error details"
    }
}
```

### Common Error Codes
- `MISSING_ID` - Required ID parameter not provided
- `NOT_FOUND` - Requested resource not found
- `VALIDATION_ERROR` - Request data validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `INTERNAL_ERROR` - Server-side error occurred

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

________________________________________________
## 🚀 Usage Examples

### Configuration Management Workflow
```bash
# 1. Get current configuration
curl -X GET http://localhost:8080/api/1/config/global

# 2. Update email settings
curl -X PUT http://localhost:8080/api/1/config/global \
  -H "Content-Type: application/json" \
  -d '{"data": {"email": {"adminEmail": "admin@newdomain.com"}}}'

# 3. Verify the update
curl -X GET http://localhost:8080/api/1/config/global
```

### Log Analysis Workflow
```bash
# 1. Check for recent errors
curl "http://localhost:8080/api/1/log/search?level=error&limit=10"

# 2. Search for specific issues
curl "http://localhost:8080/api/1/log/search?message=database*&createdAt=2025-08"

# 3. Get configuration change history
curl "http://localhost:8080/api/1/log/search?docType=config&action=update"
```

### Template Development Workflow
```bash
# 1. Create template file
echo '<h1>{{i18n.app.name}}</h1><p>Version: {{app.version}}</p>' > webapp/view/test/index.shtml

# 2. Test template rendering
curl http://localhost:8080/test/index.shtml

# 3. Check template with user context (requires authentication)
curl -b cookies.txt http://localhost:8080/admin/dashboard.shtml
```

________________________________________________
## 📚 Additional Resources

- **[README.md](README.md)** - Framework overview and quick start
- **[developers.md](developers.md)** - Technical implementation details
- **[changes.md](changes.md)** - Version history and changelog
- **[requirements.md](requirements.md)** - Development requirements and work items

---

**jPulse Framework API** - Comprehensive, secure, and developer-friendly. 🚀
