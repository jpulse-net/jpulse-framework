# jPulse Framework / Docs / REST API Reference v0.7.15

Complete REST API documentation for the jPulse Framework `/api/1/*` endpoints with routing, authentication, and access control information.

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
- `GET /api/1/health` - System health check

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
    authenticated: true,
    preferences: {
        language: "en",
        theme: "light"
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
Retrieve current user's profile information.

**Route:** `GET /api/1/user/profile`
**Middleware:** `AuthController.requireAuthentication`
**Authentication:** Required

**Response (200):**
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

#### Update User Profile
Update user's profile information and preferences.

**Route:** `PUT /api/1/user/profile`
**Middleware:** `AuthController.requireAuthentication`
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

**Response (200):**
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

#### Search Users
Search and filter users with advanced query capabilities.

**Route:** `GET /api/1/user/search`
**Middleware:** `AuthController.requireAuthentication`, `AuthController.requireRole(['admin', 'root'])`
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
- `sort` (string): Sort field with optional `-` prefix for descending

**Example Requests:**
```bash
# Find active admin users
GET /api/1/user/search?status=active&roles=admin

# Search users by name with wildcard
GET /api/1/user/search?profile.firstName=John*

# Paginated results sorted by last login
GET /api/1/user/search?limit=25&page=2&sort=-lastLogin
```

**Response (200):**
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
                "nickName": "Johnny"
            },
            "roles": ["user", "admin"],
            "status": "active",
            "lastLogin": "2025-08-25T10:30:00.000Z",
            "loginCount": 42,
            "createdAt": "2025-08-01T08:00:00.000Z"
        }
    ],
    "pagination": {
        "total": 15,
        "limit": 50,
        "skip": 0,
        "page": 1,
        "pages": 1
    },
    "elapsed": 12
}
```

## 🔧 Configuration Management API

### Configuration Endpoints

#### Get Configuration
Retrieve configuration by ID.

**Route:** `GET /api/1/config/:id`
**Middleware:** `AuthController.requireAuthentication`, `AuthController.requireRole(['admin', 'root'])`
**Authentication:** Required (Admin/Root roles only)

**Parameters:**
- `id` (path): Configuration ID (e.g., "global")

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
Update an existing configuration document.

**Route:** `PUT /api/1/config/:id`
**Middleware:** `AuthController.requireAuthentication`, `AuthController.requireRole(['admin', 'root'])`
**Authentication:** Required (Admin/Root roles only)

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
```

**Response (200):**
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
    }
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

## 🏥 System Health API

### Health Check Endpoint

#### Get System Health
Get application health status and basic information.

**Route:** `GET /api/1/health`
**Middleware:** None (public endpoint)
**Authentication:** Not required

**Response (200):**
```json
{
    "success": true,
    "status": "ok",
    "data": {
        "version": "0.5.2",
        "release": "2025-09-07",
        "uptime": 3600,
        "environment": "development",
        "database": "connected",
        "timestamp": "2025-09-07T21:30:00.000Z"
    }
}
```

**Health Status Values:**
- `ok` - All systems operational
- `degraded` - Some non-critical issues
- `error` - Critical system issues

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
