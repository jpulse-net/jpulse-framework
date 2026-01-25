# jPulse Docs / REST API Reference v1.5.1

Complete REST API documentation for the jPulse Framework `/api/1/*` endpoints with routing, authentication, and access control information.

**🎯 Live Examples:** See the [API Integration Examples](/jpulse-examples/api.shtml) page for interactive demonstrations of all API patterns with working code examples.

**💡 Using AI assistance?** The [Gen-AI Development Guide](genai-development.md) shows how to use AI coding assistants to quickly implement API endpoints following these patterns.

## 🔌 API Overview

jPulse provides a comprehensive RESTful API under the `/api/1/` prefix with the following features:

- **RESTful Design**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON Responses**: Consistent response format with success/error handling
- **Query Parameters**: Flexible filtering and pagination support
- **Session-Based Authentication**: User context and role-based access control
- **Error Handling**: Structured error responses with detailed messages
- **Automatic Logging**: All API calls logged with user context and performance metrics

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

## 🔐 Authentication & Authorization

> **📖 Complete Security Guide**: See [Security & Authentication](security-and-auth.md) for comprehensive documentation on authentication, authorization, session management, and security best practices.

### Middleware Stack
All API endpoints use a standardized middleware stack for security and access control:

```javascript
// Authentication middleware
AuthController.requireAuthentication(req, res, next)

// Role-based authorization middleware
AuthController.requireRole(['admin', 'root'])(req, res, next)

// Utility functions for controller logic
AuthController.isAuthenticated(req)           // Returns boolean
AuthController.isAuthorized(req, roles)       // Returns boolean
```

### Access Control Levels

#### Public Endpoints (No Authentication Required)
- `POST /api/1/auth/login` - User login
- `GET /api/1/health/status` - System health check

#### Authenticated Endpoints (Login Required)
- `GET /api/1/user/profile` - User profile access
- `PUT /api/1/user/profile` - Profile updates
- `PUT /api/1/user/password` - Password changes
- `POST /api/1/auth/logout` - User logout

#### Admin Endpoints (Admin/Root Roles Required)
- `GET /api/1/user/search` - User management and search
- `GET /api/1/config/*` - Configuration access
- `POST /api/1/config` - Configuration creation
- `PUT /api/1/config/:id` - Configuration updates
- `DELETE /api/1/config/:id` - Configuration deletion
- `GET /api/1/log/search` - System log access

#### Plugin-Added Endpoints
Plugins can register additional API endpoints. See [Plugin API Reference](plugins/plugin-api-reference.md) for details.

**Examples** (when auth-mfa plugin is enabled):
- `GET /api/1/auth-mfa/status` - Get MFA status for current user
- `POST /api/1/auth-mfa/setup` - Start MFA setup
- `POST /api/1/auth-mfa/backup-codes` - Regenerate backup codes

**Discovering Plugin Endpoints:**
```bash
# Check server startup logs for registered endpoints:
# Registered: GET /api/1/auth-mfa/status → plugin:auth-mfa:mfaAuth.apiStatus
```

### Session Management
```javascript
// Session configuration
session: {
    secret: appConfig.app.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: appConfig.app.environment === 'production',
        httpOnly: true,
        maxAge: appConfig.app.sessionTimeout * 1000
    },
    store: new MongoStore({ client: Database.client })
}
```

### User Context
Authenticated requests include user context in `req.session.user`:

```javascript
{
    id: "user123",
    username: "jsmith",
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
    roles: ["user", "admin"],
    isAuthenticated: true,
    preferences: {
        language: "en",
        theme: "light"
    }
}
```

## 🚀 Automatic API Registration

jPulse Framework automatically discovers and registers site-specific API endpoints with **zero configuration required**. Simply create a controller file and follow naming conventions!

### How It Works

1. **Auto-Discovery**: The `SiteControllerRegistry` scans `site/webapp/controller/` on startup
2. **Pattern Matching**: Detects all `static async api*()` methods using regex
3. **Method Inference**: Automatically determines HTTP method (GET/POST/PUT/DELETE) from method name
4. **Route Registration**: Creates Express routes at `/api/1/{controllerName}`
5. **Initialization**: Calls `static async initialize()` if present

### Naming Conventions

#### API Method Patterns

```javascript
// Base API endpoint (GET)
static async api(req, res) { }              // → GET /api/1/myController

// Create operation (POST)
static async apiCreate(req, res) { }        // → POST /api/1/myController

// Read with ID (GET with :id parameter)
static async apiGet(req, res) { }           // → GET /api/1/myController
static async apiGetById(req, res) { }       // → GET /api/1/myController/:id

// Update operation (PUT with :id parameter)
static async apiUpdate(req, res) { }        // → PUT /api/1/myController/:id
static async apiToggle(req, res) { }        // → PUT /api/1/myController/:id/toggle

// Delete operation (DELETE with :id parameter)
static async apiDelete(req, res) { }        // → DELETE /api/1/myController/:id

// Custom endpoints (GET by default)
static async apiStats(req, res) { }         // → GET /api/1/myController/stats
static async apiSearch(req, res) { }        // → GET /api/1/myController/search
```

#### HTTP Method Inference Rules

| Pattern | HTTP Method | URL Path | Example |
|---------|-------------|----------|---------|
| `api` | GET | `/api/1/{name}` | `static async api()` |
| `apiCreate` | POST | `/api/1/{name}` | `static async apiCreate()` |
| `apiUpdate` | PUT | `/api/1/{name}/:id` | `static async apiUpdate()` |
| `apiDelete` | DELETE | `/api/1/{name}/:id` | `static async apiDelete()` |
| `apiToggle` | PUT | `/api/1/{name}/:id/toggle` | `static async apiToggle()` |
| `apiGet*` | GET | `/api/1/{name}` or `/:id` | `static async apiGetById()` |
| Other | GET | `/api/1/{name}/...` | `static async apiStats()` |

### Complete Example

Create `site/webapp/controller/product.js`:

```javascript
/**
 * Product Controller - Auto-discovered by SiteControllerRegistry
 */
import ProductModel from '../model/product.js';

export default class ProductController {
    // Optional: Called once at startup for setup
    static async initialize() {
        console.log('ProductController initialized');
    }

    // GET /api/1/product - List all products
    static async api(req, res) {
        const startTime = Date.now();
        global.LogController.logRequest(req, 'product.api', '');
        try {
            const products = await ProductModel.findAll();
            res.json({
                success: true,
                data: products
            });
            const duration = Date.now() - startTime;
            global.LogController.logInfo(req, 'product.api', `success: data retrieved in ${duration}ms`);
        } catch (error) {
            global.LogController.logError(req, 'product.api', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'Failed to fetch products', 'PRODUCT_FETCH_ERROR');
        }
    }

    // POST /api/1/product - Create new product
    static async apiCreate(req, res) {
        const startTime = Date.now();
        global.LogController.logRequest(req, 'product.apiCreate', JSON.stringify(req.body));
        try {
            const product = await ProductModel.create(req.body);
            res.json({
                success: true,
                message: 'Product created',
                data: product
            });
            const duration = Date.now() - startTime;
            global.LogController.logInfo(req, 'product.apiCreate', `success: item created in ${duration}ms`);
        } catch (error) {
            global.LogController.logError(req, 'product.apiCreate', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 400, 'Failed to create product', 'PRODUCT_CREATE_ERROR');
        }
    }

    // GET /api/1/product/:id - Get product by ID
    static async apiGetById(req, res) {
        const startTime = Date.now();
        const { id } = req.params;
        global.LogController.logRequest(req, 'product.apiGetById', id);
        try {
            const product = await ProductModel.findById(id);
            if (!product) {
                global.LogController.logError(req, 'product.apiGetById', `error: ${error.message}`);
                return global.CommonUtils.sendError(req, res, 404, 'Product not found', 'PRODUCT_FETCH_ERROR');
            }
            res.json({
                success: true,
                data: product
            });
            const duration = Date.now() - startTime;
            global.LogController.logInfo(req, 'product.apiGetById', `success: ${id} retrieved in ${duration}ms`);
        } catch (error) {
            global.LogController.logError(req, 'product.apiGetById', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'Failed to fetch product', 'PRODUCT_FETCH_ERROR');
        }
    }

    // PUT /api/1/product/:id - Update product
    static async apiUpdate(req, res) {
        const startTime = Date.now();
        const { id } = req.params;
        global.LogController.logRequest(req, 'product.apiUpdate', id);
        try {
            const product = await ProductModel.update(id, req.body);
            res.json({
                success: true,
                message: 'Product updated',
                data: product
            });
            const duration = Date.now() - startTime;
            global.LogController.logInfo(req, 'product.apiUpdate', `success: ${id} updated in ${duration}ms`);
        } catch (error) {
            global.LogController.logError(req, 'product.apiUpdate', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'Failed to update product', 'PRODUCT_UPDATE_ERROR');
        }
    }

    // DELETE /api/1/product/:id - Delete product
    static async apiDelete(req, res) {
        const startTime = Date.now();
        const { id } = req.params;
        global.LogController.logRequest(req, 'product.apiDelete', id);
        try {
            await ProductModel.delete(id);
            res.json({
                success: true,
                message: 'Product deleted'
            });
            const duration = Date.now() - startTime;
            global.LogController.logInfo(req, 'product.apiDelete', `success: ${id} deleted in ${duration}ms`);
        } catch (error) {
            global.LogController.logError(req, 'product.apiDelete', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'Failed to delete product', 'PRODUCT_DELETE_ERROR');
        }
    }

    // GET /api/1/product/stats - Custom endpoint
    static async apiStats(req, res) {
        const startTime = Date.now();
        global.LogController.logRequest(req, 'product.apiStats', '');
        try {
            const stats = await ProductModel.getStatistics();
            res.json({
                success: true,
                data: stats
            });
            const duration = Date.now() - startTime;
            global.LogController.logInfo(req, 'product.apiStats', `success: stats retrieved in ${duration}ms`);
        } catch (error) {
            global.LogController.logError(req, 'product.apiStats', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'Failed to fetch statistics', 'PRODUCT_STATS_ERROR');
        }
    }
}
```

**That's it!** No route registration, no imports in `routes.js`, no manual configuration. The framework automatically:
- ✅ Discovers the controller
- ✅ Detects all 6 API methods
- ✅ Infers HTTP methods (GET, POST, PUT, DELETE)
- ✅ Registers Express routes
- ✅ Calls `initialize()` on startup
- ✅ Logs all registrations for debugging

### Verification

On startup, you'll see logs like:

```
- 2025-10-26 23:12:23  info  site-controller-registry  Initialized controller: product
- 2025-10-26 23:12:23  info  site-controller-registry  Discovered 1 controller(s), 1 initialized, 6 API method(s)
- 2025-10-26 23:12:23  info  site-controller-registry  Registered: GET /api/1/product → product.api
- 2025-10-26 23:12:23  info  site-controller-registry  Registered: POST /api/1/product → product.apiCreate
- 2025-10-26 23:12:23  info  site-controller-registry  Registered: GET /api/1/product/:id → product.apiGetById
- 2025-10-26 23:12:23  info  site-controller-registry  Registered: PUT /api/1/product/:id → product.apiUpdate
- 2025-10-26 23:12:23  info  site-controller-registry  Registered: DELETE /api/1/product/:id → product.apiDelete
- 2025-10-26 23:12:23  info  site-controller-registry  Registered: GET /api/1/product/stats → product.apiStats
- 2025-10-26 23:12:23  info  routes  Auto-registered 6 site API endpoints
```

### Best Practices

1. **Consistent Naming**: Follow the naming conventions for automatic HTTP method inference
2. **Error Handling**: Always wrap API logic in try-catch blocks
3. **Standard Responses**: Use the standard `{ success, data/error }` format
4. **Initialization**: Use `static async initialize()` for setup (WebSocket namespaces, cron jobs, etc.)
5. **Type Safety**: Add JSDoc comments for better IDE support
6. **Internal Methods**: Prefix helper methods with `_` to prevent route registration

### Advanced: Internal Methods

Methods prefixed with `_` are considered internal and **not registered** as routes:

```javascript
export default class ProductController {
    // Public API - registered as GET /api/1/product
    static async api(req, res) {
        const products = await this._fetchProducts();
        res.json({ success: true, data: products });
    }

    // Internal helper - NOT registered as a route
    static async _fetchProducts() {
        return await ProductModel.findAll();
    }
}
```

## 👤 User Management API

### Authentication Endpoints

#### User Login
Authenticate user and create session.

**Route:** `POST /api/1/auth/login`
**Middleware:** None (public endpoint)
**Authentication:** Not required

**Request Body:**
```json
{
    "identifier": "jsmith",        // username or email
    "password": "securepassword123"
}
```

**Success Response (200):**
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

**Error Responses:**
- **400**: Missing identifier or password
- **401**: Invalid credentials
- **500**: Internal server error

#### User Logout
End user session and clear authentication.

**Route:** `POST /api/1/auth/logout`
**Middleware:** `AuthController.requireAuthentication`
**Authentication:** Required

**Response (200):**
```json
{
    "success": true,
    "message": "Logout successful"
}
```

### User Profile Management

#### Get User Profile
Retrieve user profile information. Supports flexible user identification: ObjectId, username query parameter, username as path parameter, or current session user.

**Routes:**
- `GET /api/1/user` - Get current user (session)
- `GET /api/1/user/:id` - Get user by ObjectId or username (falls back to username if not valid ObjectId)
- `GET /api/1/user?username=jsmith` - Get user by username query parameter

**Query Parameters:**
- `includeSchema` (optional): Set to `1` or `true` to include plugin schema extensions metadata for data-driven profile rendering

**Middleware:** `AuthController.requireAuthentication`
**Authentication:** Required

**Authorization:**
- Regular users can only access their own profile
- Admins can access any user's profile

**Examples:**
```bash
# Get user by ObjectId
GET /api/1/user/66cb1234567890abcdef1234

# Get user by username (fallback)
GET /api/1/user/jsmith

# Get user with schema metadata for profile cards
GET /api/1/user/jsmith?includeSchema=1
```

**Response (200):**
```json
{
    "success": true,
    "message": "User retrieved successfully",
    "data": {
        "_id": "66cb1234567890abcdef1234",
        "username": "jsmith",
        "email": "john@example.com",
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
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
    },
    "elapsed": 15
}
```

**Response with `?includeSchema=1`:**
```json
{
    "success": true,
    "data": { /* user data */ },
    "schema": {
        "mfa": {
            "_meta": {
                "plugin": "auth-mfa",
                "adminCard": { "visible": true, "label": "MFA Settings", "icon": "🔐", "order": 100 },
                "userCard": { "visible": true, "label": "Two-Factor Authentication", "icon": "🔐", "order": 10 }
            },
            "enabled": { "type": "boolean", "label": "Status", "adminCard": { "visible": true }, "displayAs": "badge" }
        }
    },
    "elapsed": 18
}
```

**Error Responses:**
- **403**: Unauthorized (regular user trying to access another user)
- **404**: User not found

#### Update User Profile
Update user profile information and preferences. Supports flexible user identification.

**Routes:**
- `PUT /api/1/user` - Update current user (session)
- `PUT /api/1/user/:id` - Update user by ObjectId
- `PUT /api/1/user?username=jsmith` - Update user by username

**Middleware:** `AuthController.requireAuthentication`
**Authentication:** Required

**Authorization:**
- Regular users can only update their own profile (profile and preferences fields)
- Admins can update any user and all fields (including email, roles, status)

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
    },
    "email": "newemail@example.com",
    "roles": ["user", "admin"],
    "status": "active"
}
```

**Response (200):**
```json
{
    "success": true,
    "message": "User updated successfully",
    "data": {
        "_id": "66cb1234567890abcdef1234",
        "profile": { ... },
        "preferences": { ... },
        "updatedAt": "2025-08-25T10:35:00.000Z"
    },
    "elapsed": 25
}
```

**Validation Rules (Admin Only):**
- Cannot remove last admin role
- Cannot remove own admin role
- Cannot suspend last admin

**Error Responses:**
- **400**: Validation error (last admin protection, self-removal prevention)
- **403**: Unauthorized (regular user trying to update another user)
- **404**: User not found
- **409**: Email already exists

#### Get User Enums
Retrieve enum values from user schema (roles, status, theme, etc.). Useful for populating dropdowns dynamically.

**Route:** `GET /api/1/user/enums`
**Query Parameters:**
- `fields` (optional): Comma-separated list of fields to retrieve (e.g., `fields=roles,status`)

**Middleware:** `AuthController.requireAuthentication`
**Authentication:** Required

Notes:
- `preferences.theme` is populated from discovered themes (framework, plugins, site).
- This endpoint returns **theme IDs only**. Theme metadata and previews are documented in [Themes](/themes.md).

**Response (200):**
```json
{
    "success": true,
    "message": "Enums retrieved successfully",
    "data": {
        "roles": ["user", "admin", "root"],
        "status": ["pending", "active", "inactive", "suspended", "terminated"],
        "preferences.theme": ["light", "dark", "my-theme"]
    },
    "elapsed": 5
}
```

**Example with field filter:**
```
GET /api/1/user/enums?fields=roles,status
```

**Response:**
```json
{
    "success": true,
    "message": "Enums retrieved successfully",
    "data": {
        "roles": ["user", "admin", "root"],
        "status": ["pending", "active", "inactive", "suspended", "terminated"]
    },
    "elapsed": 3
}
```

#### Change Password
Change user's password with current password verification.

**Route:** `PUT /api/1/user/password`
**Middleware:** `AuthController.requireAuthentication`
**Authentication:** Required

**Request Body:**
```json
{
    "currentPassword": "oldpassword123",
    "newPassword": "newsecurepassword456"
}
```

**Response (200):**
```json
{
    "success": true,
    "message": "Password changed successfully"
}
```

**Error Responses:**
- **400**: Missing passwords or validation failure
- **401**: Current password incorrect
- **422**: New password doesn't meet requirements

#### User Registration (Signup)
Create new user account with validation.

**Route:** `POST /api/1/user/signup`
**Middleware:** None (public endpoint)
**Authentication:** Not required

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
- **422**: Validation errors (weak password, invalid email format)

### Administrative User Management

#### Get Public User Profile
Get a public user profile by ObjectId or username with config-controlled access and field filtering.

**Route:** `GET /api/1/user/public/:id`
**Middleware:** None (access control in controller)
**Authentication:** Optional (access policy configured in `app.conf`)
**jPulse 1.4.14+:** Supports config-driven public profile visibility with field filtering

**Access Control:**
Access is controlled by `appConfig.controller.user.profile` configuration:

```javascript
controller: {
    user: {
        profile: {
            withoutAuth: {
                allowed: false,  // Deny unauthenticated access
                fields: []       // No additional fields beyond always-included
            },
            withAuth: {
                allowed: true,   // Allow authenticated users
                fields: [ 'email', 'preferences.theme' ]  // Additional fields
            }
        }
    }
}
```

**Always-Included Fields** (not configurable):
- `username` - User's login ID
- `profile.firstName` - First name
- `profile.lastName` - Last name
- `initials` - Computed from firstName/lastName (e.g., "JD")

**Configurable Additional Fields:**
Fields specified in the `fields` array use dot notation and can include any non-sensitive user field:
- `email` - Email address
- `preferences.theme` - Theme preference
- `preferences.language` - Language preference
- `status` - Account status
- Any other user model field (except `passwordHash`)

**Admin Access:**
Admins always have access regardless of policy and see all fields except `passwordHash`.

**URL Parameters:**
- `:id` (string, required): ObjectId (24 hex chars) or username

**Example Requests:**
```bash
# Get by ObjectId
GET /api/1/user/public/66cb1234567890abcdef1234

# Get by username
GET /api/1/user/public/jsmith
```

**Response (200):**
```json
{
    "success": true,
    "data": {
        "username": "jsmith",
        "profile": {
            "firstName": "John",
            "lastName": "Smith"
        },
        "initials": "JS",
        "email": "john@example.com"
    },
    "message": "User retrieved successfully",
    "elapsed": 5
}
```

**Response - Access Denied (403):**
```json
{
    "success": false,
    "error": "You do not have permission to view public profiles",
    "code": "PUBLIC_PROFILE_ACCESS_DENIED"
}
```

**Response - User Not Found (404):**
```json
{
    "success": false,
    "error": "User not found",
    "code": "USER_NOT_FOUND"
}
```

**Use Cases:**
- Public user profiles in collaboration features
- User directories with configurable visibility
- @ mention lookups in chat/comments
- Team member lists with controlled information exposure

**Configuration Examples:**

*Public access with minimal info:*
```javascript
withoutAuth: {
    allowed: true,
    fields: []  // Only username and name visible
}
```

*Authenticated users see email:*
```javascript
withAuth: {
    allowed: true,
    fields: [ 'email' ]
}
```

*Private profiles (auth required, no public):*
```javascript
withoutAuth: {
    allowed: false,
    fields: []
},
withAuth: {
    allowed: true,
    fields: [ 'email', 'preferences.theme' ]
}
```

---

#### Search Users
Search and filter users with advanced query capabilities.

**Route:** `GET /api/1/user/search`
**Middleware:** None (access control in controller)
**Authentication:** Optional (access policy configured in `app.conf`)
**jPulse 1.4.14+:** Updated to use profile access policy instead of admin-only middleware

**Query Parameters:**
- `username` (string): Login ID filter with [Advanced Search Syntax](#advanced-search-syntax)
- `email` (string): Email filter with [Advanced Search Syntax](#advanced-search-syntax)
- `profile.firstName` (string): First name filter with search syntax support
- `profile.lastName` (string): Last name filter with search syntax support
- `roles` (string): Role filter with search syntax (`guest`, `user`, `admin`, `root`)
- `status` (string): Status filter with search syntax (`active`, `inactive`, `pending`, `suspended`)
- `createdAt` (string): Date range filter (YYYY, YYYY-MM, YYYY-MM-DD) - supports wildcards
- `lastLogin` (string): Last login date filter - supports wildcards
- `limit` (number): Maximum results to return (default: 50, max: 1000)
- `sort` (string): Sort field with optional `-` prefix for descending (e.g., `-createdAt`)

**Pagination Parameters:**

The API supports two pagination modes:

| Mode | Trigger | Best For |
|------|---------|----------|
| **Cursor** (default) | No `offset` param | Large datasets, infinite scroll, consistent results |
| **Offset** (opt-in) | `offset` param present | Jump-to-page UI, small datasets |

*Cursor mode parameters:*
- `cursor` (string): Opaque pagination token from previous response

*Offset mode parameters:*
- `offset` (number): Number of results to skip

**Example Requests:**
```bash
# Find active admin users (cursor mode - default)
GET /api/1/user/search?status=active&roles=admin

# Search users by name with wildcard (fuzzy)
GET /api/1/user/search?profile.firstName=*john*

# Exact match by username
GET /api/1/user/search?username=jsmith

# Boolean OR: active or pending users
GET /api/1/user/search?status=active,pending

# Boolean AND: users with admin role who are NOT suspended
GET /api/1/user/search?roles=admin&status=!suspended

# Cursor-based pagination - next page (use nextCursor from response)
GET /api/1/user/search?cursor=eyJ2IjoxLCJxIjp7fSwic...

# Offset-based pagination (opt-in)
GET /api/1/user/search?limit=25&offset=50&sort=-lastLogin
```

**Response - Cursor Mode (200):**
```json
{
    "success": true,
    "data": [
        {
            "username": "jsmith",
            "profile": {
                "firstName": "John",
                "lastName": "Smith"
            },
            "initials": "JS",
            "email": "john@example.com"
        }
    ],
    "count": 25,
    "pagination": {
        "mode": "cursor",
        "total": 150,
        "limit": 25,
        "hasMore": true,
        "nextCursor": "eyJ2IjoxLCJxIjp7fSwicyI6eyJsYXN0TG9naW4iOi0xLCJfaWQiOi0xfX0=",
        "prevCursor": null
    }
}
```

**Note on Field Filtering (W-134):**

Search results respect the same field filtering as `/api/1/user/public/:id`:
- Always includes: `username`, `profile.firstName`, `profile.lastName`, `initials`
- Additional fields determined by auth state and config (`withoutAuth.fields` / `withAuth.fields`)
- Admins see all fields except `passwordHash`

---

### Advanced Search Syntax

**jPulse 1.5.0+** introduces powerful boolean search operators for string-type query parameters with exact match as the new default behavior.

> **📖 Breaking Change:** Search behavior changed from fuzzy-contains to exact-match in v1.5.0. Use wildcards (`*`) for fuzzy matching.

#### Boolean Operators

String search parameters support boolean logic **within the same field**:

| Operator | Syntax | Example | Meaning |
|----------|--------|---------|---------|
| **OR** | `,` comma | `status=active,pending` | Matches "active" OR "pending" |
| **AND** | `;` semicolon | `tags=python;async` | Matches "python" AND "async" |
| **NOT** | `!` prefix | `status=!terminated` | Does NOT match "terminated" |
| **Combine** | Mix operators | `lunch=sushi;soup,pizza` | (sushi AND soup) OR pizza |

**Precedence:** AND binds tighter than OR. Use parentheses-like grouping: `a;b,c;d` = `(a AND b) OR (c AND d)`

#### Exact Match (Default)

String searches are **exact match** by default (case-insensitive, anchored):

```bash
# Exact match
GET /api/1/user/search?status=active
# Returns only users with status exactly "active"
# Does NOT match "inactive", "reactivate", "activated"
```

#### Wildcard Search

Use `*` for fuzzy/contains matching:

| Pattern | Example | Matches |
|---------|---------|---------|
| `*term*` | `username=*smith*` | Contains "smith" anywhere |
| `term*` | `username=john*` | Starts with "john" |
| `*term` | `username=*son` | Ends with "son" |

**Examples:**
```bash
# Find users with "smith" in username (fuzzy)
GET /api/1/user/search?username=*smith*

# Find users whose first name starts with "john"
GET /api/1/user/search?profile.firstName=john*

# Find emails ending with @example.com
GET /api/1/user/search?email=*@example.com
```

#### Regular Expressions

Power users can use regex with `/pattern/flags` syntax:

```bash
# Case-sensitive code pattern
GET /api/1/user/search?username=/^[A-Z]{2}\d{4}/

# Case-insensitive email pattern
GET /api/1/user/search?email=/^support@.*\.com$/i
```

**Regex Flags:**
- `i` - Case-insensitive
- `m` - Multiline
- `s` - Dot matches newline

**Security:** Regex patterns are validated and length-limited (~200 chars) to prevent ReDoS attacks.

#### Complex Query Examples

**OR Search:**
```bash
# Users with active OR pending status
GET /api/1/user/search?status=active,pending

# Users in multiple roles
GET /api/1/user/search?roles=admin,editor,moderator

# Find users with Gmail or Outlook email
GET /api/1/user/search?email=*@gmail.com,*@outlook.com
```

**AND Search:**
```bash
# Users with both admin AND root roles (if field supports multiple values)
GET /api/1/user/search?roles=admin;root

# Logs with both "database" AND "error" in message
GET /api/1/log/search?message=database;error

# Find users with "John" AND "Smith" in name
GET /api/1/user/search?username=*john*;*smith*
```

**NOT Search:**
```bash
# All users except terminated
GET /api/1/user/search?status=!terminated

# Active users who are NOT guests
GET /api/1/user/search?status=active&roles=!guest

# Logs without specific message pattern
GET /api/1/log/search?message=!*debug*

# Find all non-admin users
GET /api/1/user/search?roles=!admin
```

**Combined Boolean Logic:**
```bash
# Complex food preferences: (sushi AND miso soup) OR (pizza AND salad NOT vinegar)
GET /api/1/search?food=sushi;miso soup,pizza;salad;!vinegar

# Users: (active admins) OR (pending moderators) NOT suspended
GET /api/1/user/search?status=active;!suspended&roles=admin,moderator

# Find logs: (database AND timeout) OR (connection AND failed) NOT test
GET /api/1/log/search?message=database;timeout,connection;failed;!test
```

**Multi-Field Search:**
```bash
# AND between different fields (standard query string)
GET /api/1/user/search?status=active&roles=admin

# AND within same field, OR across fields
GET /api/1/user/search?status=active;!suspended&roles=admin,editor

# Complex: Active/pending admins/editors with specific email domains
GET /api/1/user/search?status=active,pending&roles=admin,editor&email=*@company.com,*@partner.com
```

**Real-World Scenarios:**

```bash
# Find active users who registered this month (exact status + date wildcard)
GET /api/1/user/search?status=active&createdAt=2026-01*

# Search logs for errors excluding automated test runs
GET /api/1/log/search?level=error&message=!*test*;!*automated*

# Find users by partial name match across multiple fields
GET /api/1/user/search?username=*john*,*jane*&status=active

# Complex role-based search: Find users with admin or editor role, excluding suspended
GET /api/1/user/search?roles=admin,editor&status=!suspended

# Date range + status filter for recent active/pending users
GET /api/1/user/search?createdAt=2026-01&status=active,pending

# Logs: Find authentication failures but exclude rate-limit events
GET /api/1/log/search?message=auth*;*fail*;!*rate*;!*limit*

# Power user regex: Find users with specific ID pattern (2-letter code + 4 digits)
GET /api/1/user/search?username=/^[A-Z]{2}\d{4}$/
```

#### Performance Optimization

**Collation (v1.5.0+):** Exact matches automatically use MongoDB collation for 10-100x faster queries on large collections:

- ✅ **Collation-optimized** (fast): `status=active`, `roles=admin,editor`
- ⚠️ **Regex fallback** (slower): `username=*smith*`, `email=/pattern/`, `status=!terminated`

**Best Practices:**
- Use exact match when possible (leverages collation and indexes)
- Minimize use of wildcards in high-traffic queries
- Avoid leading wildcards (`*term`) on large datasets if possible
- Use specific patterns instead of `*term*` when you know the structure

#### Migration from v1.4.x

**Breaking Change:** Default search behavior changed from fuzzy to exact:

| v1.4.x (Fuzzy) | v1.5.0 (Exact) | Migration |
|----------------|----------------|-----------|
| `status=act` matched "active", "activated" | `status=act` matches only "act" | Add wildcards: `status=*act*` |
| `username=john` matched "johndoe", "john123" | `username=john` matches only "john" | Use `username=john*` |

**Quick Fix:** Add `*` wildcards to restore fuzzy behavior:
- Before: `field=value`
- After: `field=*value*`

**Response - Offset Mode (200):**
```json
{
    "success": true,
    "data": [...],
    "count": 25,
    "pagination": {
        "mode": "offset",
        "total": 150,
        "limit": 25,
        "offset": 50,
        "hasMore": true
    }
}
```

## 🔧 Configuration Management API

### Configuration Endpoints

#### Get Configuration
Retrieve configuration by ID or default configuration.

**Route:** `GET /api/1/config/_default` or `GET /api/1/config/:id`
**Middleware:** `AuthController.requireAuthentication`, `AuthController.requireRole(['admin', 'root'])`
**Authentication:** Required (Admin/Root roles only)

**Parameters:**
- `_default` (path): Reserved identifier that resolves to the configured default config document (e.g., "global")
- `id` (path): Configuration ID (e.g., "global", "americas", "emea")

**Query Parameters:**
- `includeSchema` (optional): Set to `1` or `true` to include schema and contextFilter metadata

**Special Endpoint:**
- `GET /api/1/config/_default` - Returns the default configuration document as defined in `appConfig.controller.config.defaultDocName`

**Examples:**
```bash
# Get default configuration
GET /api/1/config/_default

# Get configuration by ID
GET /api/1/config/global

# Get configuration with schema metadata
GET /api/1/config/global?includeSchema=1
```

**Response (200):**
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

**Response with `?includeSchema=1`:**
```json
{
    "success": true,
    "message": "Config retrieved successfully",
    "data": {
        "_id": "global",
        "data": { /* config data */ }
    },
    "schema": {
        "schema": {
            "_id": { "type": "string", "required": true },
            "data": {
                "email": {
                    "adminEmail": { "type": "string", "default": "", "validate": "email" },
                    "smtpServer": { "type": "string", "default": "localhost" },
                    "smtpPass": { "type": "string", "default": "" }
                }
            },
            "_meta": {
                "contextFilter": {
                    "withoutAuth": ["data.email.smtp*", "data.email.*pass"],
                    "withAuth": ["data.email.smtpPass"]
                }
            }
        },
        "contextFilter": {
            "withoutAuth": ["data.email.smtp*", "data.email.*pass"],
            "withAuth": ["data.email.smtpPass"]
        }
    },
    "elapsed": 12
}
```

#### Create Configuration
Create a new configuration document.

**Route:** `POST /api/1/config`
**Middleware:** `AuthController.requireAuthentication`, `AuthController.requireRole(['admin', 'root'])`
**Authentication:** Required (Admin/Root roles only)

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

**Response (201):**
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

#### Update Configuration
Update an existing configuration document or default configuration.

**Route:** `PUT /api/1/config/_default` or `PUT /api/1/config/:id`
**Middleware:** `AuthController.requireAuthentication`, `AuthController.requireRole(['admin', 'root'])`
**Authentication:** Required (Admin/Root roles only)

**Special Endpoint:**
- `PUT /api/1/config/_default` - Updates the default configuration document (resolves to configured default)

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

**Response (200):**
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

#### Delete Configuration
Delete a configuration document.

**Route:** `DELETE /api/1/config/:id`
**Middleware:** `AuthController.requireAuthentication`, `AuthController.requireRole(['admin', 'root'])`
**Authentication:** Required (Admin/Root roles only)

**Response (200):**
```json
{
    "success": true,
    "message": "Config deleted successfully"
}
```

## 📊 Logging API

### Log Search Endpoint

#### Search Logs
Search and filter log entries with advanced query capabilities.

**Route:** `GET /api/1/log/search`
**Middleware:** `AuthController.requireAuthentication`, `AuthController.requireRole(['admin', 'root'])`
**Authentication:** Required (Admin/Root roles only)

**Query Parameters:**
- `level` (string): Log level filter (`error`, `warn`, `info`, `debug`)
- `message` (string): Text search with [Advanced Search Syntax](#advanced-search-syntax) support
- `createdAt` (string): Date range filter (YYYY, YYYY-MM, YYYY-MM-DD)
- `docType` (string): Document type filter (`config`, `user`, `log`)
- `action` (string): Action filter (`create`, `update`, `delete`)
- `createdBy` (string): User ID filter
- `limit` (number): Maximum results to return (default: 50, max: 1000)
- `sort` (string): Sort field with optional `-` prefix for descending (default: `-createdAt`)

**Search Syntax:** Log search supports the same [Advanced Search Syntax](#advanced-search-syntax) as User Search, including boolean operators (AND/OR/NOT), wildcards, and regex patterns.

**Pagination:** Same as User Search - supports cursor (default) and offset modes.
See [User Search](#search-users) for pagination parameter details.

**Example Requests:**
```bash
# Get error logs from the last month (cursor mode)
GET /api/1/log/search?level=error&createdAt=2025-01&limit=50

# Search for database-related messages (fuzzy)
GET /api/1/log/search?message=*database*

# Complex boolean search: (database AND error) OR timeout
GET /api/1/log/search?message=database;error,timeout

# Get configuration update logs, exclude automated updates
GET /api/1/log/search?docType=config&action=update&createdBy=!system

# Next page using cursor
GET /api/1/log/search?cursor=eyJ2IjoxLC4uLn0

# Offset-based pagination (opt-in)
GET /api/1/log/search?level=error&limit=50&offset=100
```

**Response (200):**
```json
{
    "success": true,
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
    "count": 50,
    "pagination": {
        "mode": "cursor",
        "total": 150,
        "limit": 50,
        "hasMore": true,
        "nextCursor": "eyJ2IjoxLCJxIjp7fSwic....",
        "prevCursor": null
    }
}
```

## 📄 Markdown Documentation API

### Markdown Endpoints

#### List Markdown Files
List all markdown files in a namespace with hierarchical structure.

**Route:** `GET /api/1/markdown/:namespace/`
**Middleware:** None (public endpoint)
**Authentication:** Not required

**Parameters:**
- `namespace` (path): Documentation namespace (e.g., "jpulse", "docs", "help")

**Response (200):**
```json
{
    "success": true,
    "files": [
        {
            "path": "README.md",
            "name": "README.md",
            "title": "jPulse",
            "isDirectory": true,
            "files": [
                {
                    "path": "getting-started.md",
                    "name": "getting-started.md",
                    "title": "Getting Started",
                    "isDirectory": false
                },
                {
                    "path": "dev/README.md",
                    "name": "README.md",
                    "title": "Dev",
                    "isDirectory": true,
                    "files": [
                        {
                            "path": "dev/architecture.md",
                            "name": "architecture.md",
                            "title": "Architecture",
                            "isDirectory": false
                        }
                    ]
                }
            ]
        }
    ]
}
```

#### Get Markdown File Content
Retrieve the content of a specific markdown file.

**Route:** `GET /api/1/markdown/:namespace/:path`
**Middleware:** None (public endpoint)
**Authentication:** Not required

**Parameters:**
- `namespace` (path): Documentation namespace
- `path` (path): File path within namespace (e.g., "dev/architecture.md")

**Response (200):**
```json
{
    "success": true,
    "content": "# Architecture\n\nThis document describes...",
    "path": "dev/architecture.md"
}
```

**Error Responses:**
- **400**: Namespace required
- **404**: Namespace not found or file not found
- **500**: Internal server error

### Namespace Resolution
The markdown API follows the site override pattern for namespace resolution:

1. **Site Override**: `site/webapp/static/assets/:namespace/`
2. **Framework Default**: `webapp/static/assets/:namespace/`

### File Filtering (.markdown)
The API respects `.markdown` configuration files in namespace roots to control publishing, ordering, and titles:

**Configuration File Location:** `:namespace/.markdown`

**Sections:**
- **`[publish-list]`**: Define custom order and titles for important docs
- **`[ignore]`**: Exclude files/directories from publication (gitignore-like patterns)
- **`[title-case-fix]`**: Fix auto-generated titles (e.g., "Api" → "API")

**Ignore Patterns** (in `[ignore]` section):
- **Exact files**: `temp.md`
- **Wildcard patterns**: `*.backup.md`, `draft-*.md`
- **Directory patterns**: `dev/working/` (excludes entire directory)
- **Whitelist mode**: Use `*` to only publish files in `[publish-list]`
- **Comments**: Lines starting with `#`

**Example .markdown:**
```ini
[publish-list]
README.md           Welcome
getting-started.md  Getting Started
faq.md

[ignore]
# Ignore temporary development files
dev/tmp.md

# Ignore working directory with all contents
dev/working/

# Ignore backup markdown files
*.backup.md

[title-case-fix]
Api             API
CHANGELOG       Version History
```

**Precedence**: `[ignore]` takes precedence over `[publish-list]` - ignored files are excluded even if listed in `[publish-list]`.

For complete documentation, see [Markdown Documentation](markdown-docs.md#configuration-file-markdown).

### File Structure
The API returns a hierarchical structure where:
- **Root README.md** becomes the container for all other files
- **Directory READMEs** are merged up to represent their directories
- **Files are sorted** with regular files first, then directories
- **Titles are generated** from filenames with proper capitalization

### Caching
- **Directory listings** are cached when `appConfig.controller.markdown.cache` is enabled
- **File contents** are cached with timestamp tracking for invalidation
- **Cache invalidation** requires application restart (manual as designed)

### Example Requests
```bash
# List all files in jpulse namespace
GET /api/1/markdown/jpulse-docs/

# Get specific documentation file
GET /api/1/markdown/jpulse-docs/dev/architecture.md

# List files in a site's custom documentation namespace
GET /api/1/markdown/docs/
```

## 🔧 Handlebars Template Processing API

### Handlebars Expansion Endpoint

#### Expand Handlebars Template
Expand Handlebars expressions in text with server-side context and optional custom context.

**Route:** `POST /api/1/handlebar/expand`
**Middleware:** None (public endpoint)
**Authentication:** Not required (but context filtering applies based on authentication status)

**Note:** POST is used instead of GET because:
- Templates can be long (exceeding URL length limits)
- Context data can be complex nested objects (better suited for JSON body)
- Common pattern for transformation/action endpoints that don't modify server state

**Request Body:**
```json
{
    "text": "Hello {{user.firstName}}! Welcome to {{app.site.name}}.",
    "context": {
        "custom": "value"
    }
}
```

**Request Parameters:**
- `text` (string, required): Template text containing Handlebars expressions (e.g., `{{user.firstName}}`)
- `context` (object, optional): Additional context data that augments the internal server context

**Success Response (200):**
```json
{
    "success": true,
    "text": "Hello John! Welcome to My Site."
}
```

**Error Responses:**
- **400**: Missing or invalid `text` parameter
- **500**: Internal server error during template processing

**Context Available:**
The endpoint automatically provides server-side context including:
- `user` - Current user information (filtered based on authentication)
- `app` - Application metadata (jPulse and site info)
- `config` - Site configuration from MongoDB
- `appConfig` - Application configuration (filtered based on authentication)
- `url` - Current request URL information
- `i18n` - Internationalization translations

**Custom Context:**
The optional `context` parameter augments the internal context. For example:
```json
{
    "text": "Hello {{user.firstName}}! Your order {{order.id}} is ready.",
    "context": {
        "order": {
            "id": "ORD-12345",
            "status": "shipped"
        }
    }
}
```

**Use Cases:**
- Client-side dynamic content generation with server context
- Email template preview in admin interfaces
- Real-time template expansion for user-generated content
- Testing Handlebars expressions without page reload

**Example Usage:**
```javascript
// Expand template with user context
const result = await jPulse.api.post('/api/1/handlebar/expand', {
    text: 'Welcome back, {{user.firstName}}! You have {{notificationCount}} new messages.',
    context: {
        notificationCount: 5
    }
});

if (result.success) {
    document.getElementById('welcome-message').innerHTML = result.text;
    // Output: "Welcome back, John! You have 5 new messages."
}
```

**Security Note:**
- Context is automatically filtered based on authentication status
- Sensitive configuration paths are removed for unauthenticated users
- See `appConfig.controller.handlebar.contextFilter` for filtering rules

## 📧 Email API

### Email Sending Endpoint

#### Send Email
Send email from client-side code. Requires authentication.

**Route:** `POST /api/1/email/send`
**Middleware:** `AuthController.requireAuthentication`
**Authentication:** Required (logged-in users only)

**Request Body:**
```json
{
    "to": "recipient@example.com",
    "subject": "Email subject",
    "message": "Plain text message body",
    "html": "<p>Optional HTML body</p>",
    "emailConfig": {
        "smtpServer": "smtp.gmail.com",
        "smtpPort": 587,
        "smtpUser": "test@gmail.com",
        "smtpPass": "password",
        "useTls": true,
        "adminEmail": "test@gmail.com",
        "adminName": "Test"
    }
}
```

**Note:** `emailConfig` is optional and only used for testing. If provided, it overrides the saved configuration temporarily.

**Response (Success - 200):**
```json
{
    "success": true,
    "messageId": "message-id-from-smtp-server"
}
```

**Response (Error - 400):**
```json
{
    "success": false,
    "error": "Missing required fields",
    "code": "MISSING_FIELDS"
}
```

**Response (Error - 401):**
```json
{
    "success": false,
    "error": "Authentication required",
    "code": "UNAUTHORIZED"
}
```

**Response (Error - 500):**
```json
{
    "success": false,
    "error": "Failed to send email",
    "code": "EMAIL_SEND_FAILED",
    "details": "SMTP connection error details"
}
```

**Error Codes:**
- `UNAUTHORIZED` - Authentication required
- `MISSING_FIELDS` - Missing required fields (to, subject, message)
- `INVALID_EMAIL` - Invalid recipient email format
- `EMAIL_NOT_CONFIGURED` - Email service not configured
- `EMAIL_SEND_FAILED` - SMTP send failure

**Example Request:**
```javascript
// Client-side usage
const result = await jPulse.api.post('/api/1/email/send', {
    to: 'colleague@company.com',
    subject: 'Check out this page',
    message: 'I found something interesting...'
});

if (result.success) {
    jPulse.UI.toast.success('Email sent successfully!');
} else {
    jPulse.UI.toast.error(result.error || 'Failed to send email');
}
```

**Security Notes:**
- All email sends are logged with username and IP address
- Input validation ensures valid email format
- Rate limiting deferred to future enhancement (v2)
- Test email functionality available in admin UI (`/admin/config`)

**Related Documentation:**
- **[Sending Email Guide](sending-email.md)** - Complete email configuration and usage guide
- **[Server-Side Email](sending-email.md#server-side-usage)** - EmailController utility methods

## 🏥 System Health and Metrics API

### Health Check Endpoint

#### Get System Health
Get application health status and basic information.

**Route:** `GET /api/1/health/status`
**Middleware:** None (public endpoint)
**Authentication:** Not required

**Response (200):**
```json
{
    "success": true,
    "status": "ok",
    "data": {
        "version": "0.9.6",
        "release": "2025-10-10",
        "uptime": 3600,
        "environment": "development",
        "database": "connected",
        "timestamp": "2025-10-10T21:30:00.000Z"
    }
}
```

**Health Status Values:**
- `ok` - All systems operational
- `degraded` - Some non-critical issues
- `error` - Critical system issues

### Metrics Endpoint

#### Get System Metrics
Get comprehensive system metrics with role-based access control.

**Route:** `GET /api/1/health/metrics`
**Middleware:** None (public endpoint with role-based response)
**Authentication:** Optional (affects response detail level)

**Guest/Regular User Response (200):**
```json
{
    "success": true,
    "data": {
        "status": "ok",
        "version": "0.9.6",
        "release": "2025-10-10",
        "uptime": 3600,
        "uptimeFormatted": "1h 0m 0s",
        "environment": "development",
        "database": {
            "status": "connected",
            "name": "jp-dev"
        },
        "memory": {
            "used": 45,
            "total": 128
        },
        "timestamp": "2025-10-10T21:30:00.000Z"
    }
}
```

**Admin User Response (200):**
```json
{
    "success": true,
    "data": {
        "status": "ok",
        "version": "0.9.6",
        "release": "2025-10-10",
        "uptime": 3600,
        "uptimeFormatted": "1h 0m 0s",
        "environment": "development",
        "database": {
            "status": "connected",
            "name": "jp-dev"
        },
        "memory": {
            "used": 45,
            "total": 128
        },
        "system": {
            "platform": "darwin",
            "arch": "x64",
            "nodeVersion": "v18.17.0",
            "cpus": 8,
            "hostname": "server-01",
            "loadAverage": [0.5, 0.4, 0.3],
            "freeMemory": 2048,
            "totalMemory": 8192
        },
        "websockets": {
            "uptime": 3600000,
            "totalMessages": 1500,
            "namespaces": 3,
            "activeConnections": 12
        },
        "process": {
            "pid": 12345,
            "ppid": 1,
            "memoryUsage": {
                "rss": 67108864,
                "heapTotal": 33554432,
                "heapUsed": 16777216,
                "external": 1048576,
                "arrayBuffers": 524288
            },
            "resourceUsage": {
                "userCPUTime": 123456,
                "systemCPUTime": 78910
            }
        },
        "deployment": {
            "mode": "development",
            "config": {
                "name": "Development Environment",
                "db": "jp-dev"
            }
        },
        "timestamp": "2025-10-10T21:30:00.000Z"
    }
}
```

**Component Metrics (Admin Only, v1.3.13+):**
The metrics endpoint includes a `components` object with standardized metrics from all framework components:

```json
{
    "success": true,
    "data": {
        "statistics": {
            "components": {
                "cache": {
                    "stats": {
                        "totalCaches": 3,
                        "totalFilesCached": 4,
                        "totalDirectoriesCached": 0
                    }
                },
                "email": {
                    "stats": {
                        "configured": true,
                        "sentLast24h": 42,
                        "failedLast24h": 2
                    }
                },
                "log": {
                    "stats": {
                        "entriesLast24h": 150,
                        "docsCreated24h": 25,
                        "docsUpdated24h": 30,
                        "docsDeleted24h": 5
                    }
                }
            }
        },
        "servers": [
            {
                "instances": [
                    {
                        "components": {
                            "cache": {
                                "component": "CacheManager",
                                "status": "ok",
                                "initialized": true,
                                "stats": { ... },
                                "elapsed": 5
                            }
                        }
                    }
                ]
            }
        ]
    }
}
```

**Component Metrics Structure:**
- `component` (string) - Component display name
- `status` (string) - Component status: `'ok'`, `'error'`, `'warning'`
- `initialized` (boolean) - Whether component is initialized
- `stats` (object) - Component-specific statistics
- `meta` (object) - Metadata for aggregation, visualization, sanitization
- `timestamp` (string) - ISO timestamp of metrics collection
- `elapsed` (number) - Execution time in milliseconds (per-instance only)

**Component Metrics Features:**
- **Aggregation**: Cluster-wide aggregation with field-level rules (`sum`, `avg`, `max`, `min`, `first`, `count`)
- **Global Fields**: Database-backed stats marked as `global: true` (same across instances)
- **Sanitization**: Sensitive fields automatically sanitized for non-admin users
- **Visualization Control**: Fields with `visualize: false` hidden from UI but available in API
- **Time-Based Counters**: Activity tracking with rolling windows (last hour, last 24h, total)

**Memory Values:**
- All memory values are in megabytes (MB)
- `memory.used` and `memory.total` refer to Node.js heap memory
- `system.freeMemory` and `system.totalMemory` refer to system RAM

**Admin Status Page:**
- Human-readable status dashboard available at `/admin/status.shtml`
- Requires admin authentication
- Provides visual indicators and real-time system information
- Includes WebSocket namespace details and performance metrics

## 📝 Error Handling

### Standard Error Response Format
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

### Smart Error Handling
The framework uses `CommonUtils.sendError()` for intelligent error responses:

**API requests (`/api/*`) get JSON responses:**
```json
{
    "success": false,
    "error": "Authentication required",
    "code": "UNAUTHORIZED",
    "path": "/api/1/user/profile"
}
```

**Web requests render error pages directly without redirecting:**
- Original URL is preserved
- Error details available via template variables

## 🚀 Usage Examples

### Configuration Management Workflow
```bash
# 1. Get current configuration
curl -X GET http://localhost:8080/api/1/config/global \
  -H "Cookie: connect.sid=your-session-cookie"

# 2. Update email settings
curl -X PUT http://localhost:8080/api/1/config/global \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{"data": {"email": {"adminEmail": "admin@newdomain.com"}}}'

# 3. Verify the update
curl -X GET http://localhost:8080/api/1/config/global \
  -H "Cookie: connect.sid=your-session-cookie"
```

### User Management Workflow
```bash
# 1. Login to get session
curl -X POST http://localhost:8080/api/1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin", "password": "password"}' \
  -c cookies.txt

# 2. Search for users
curl -X GET "http://localhost:8080/api/1/user/search?status=active&limit=10" \
  -b cookies.txt

# 3. Update user profile
curl -X PUT http://localhost:8080/api/1/user/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"preferences": {"language": "de", "theme": "dark"}}'
```

### Log Analysis Workflow
```bash
# 1. Check for recent errors
curl "http://localhost:8080/api/1/log/search?level=error&limit=10" \
  -b cookies.txt

# 2. Search for specific issues
curl "http://localhost:8080/api/1/log/search?message=database*&createdAt=2025-09" \
  -b cookies.txt

# 3. Get configuration change history
curl "http://localhost:8080/api/1/log/search?docType=config&action=update" \
  -b cookies.txt
```

## 📚 Data Schemas

### User Schema
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

### Configuration Schema
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

### Log Entry Schema
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

---

**jPulse Framework REST API** - Secure, scalable, and enterprise-ready. 🚀
