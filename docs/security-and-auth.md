# jPulse Docs / Security & Authentication v1.4.17

Complete guide to security features, authentication, authorization, and security best practices in the jPulse Framework.

## 🔐 Overview

The jPulse Framework implements enterprise-grade security features including session-based authentication, role-based access control, secure session management, and comprehensive security headers.

### Security Features

- **Session-Based Authentication**: MongoDB-backed persistent sessions with configurable TTL
- **Role-Based Access Control**: Four-tier role system (`guest`, `user`, `admin`, `root`)
- **Password Security**: bcrypt hashing with 12 salt rounds
- **Security Headers**: Comprehensive HTTP security headers via nginx and Express
- **Content Security Policy**: Configurable CSP with violation reporting
- **Rate Limiting**: nginx-based rate limiting for API and authentication endpoints
- **SSL/TLS**: Production-ready SSL configuration
- **Input Validation**: Schema-based validation for all user inputs

---

## 🔑 Authentication

### Session Management

jPulse Framework uses Express sessions with MongoDB persistence for authentication.

#### Session Configuration

```javascript
// Session configuration in app.conf
session: {
    secret: 'FIXME',                    // MUST be changed in production
    resave: false,
    saveUninitialized: false,
    touchAfter: 24 * 3600,              // 24 hours in seconds
    cookie: {
        secure: false,                  // true in production (HTTPS only)
        httpOnly: true,                  // Prevents JavaScript access
        maxAge: 3600000                  // 1 hour in milliseconds
    }
}
```

#### Session Store

- **Development**: MongoDB session store (connect-mongo)
- **Production**: MongoDB or Redis session store (configurable)
- **Persistence**: Sessions survive server restarts
- **Clustering**: Supports horizontal scaling with shared session store

#### User Session Data

Authenticated requests include user context in `req.session.user`:

```javascript
{
    id: "user123",
    username: "jsmith",
    email: "john@example.com",
    firstName: "John",
    lastName: "Smith",
    nickName: "John",
    initials: "JS",
    roles: ["user", "admin"],
    preferences: {
        language: "en",
        theme: "light"
    },
    isAuthenticated: true
}
```

### Password Security

#### Password Hashing

- **Algorithm**: bcrypt
- **Salt Rounds**: 12 (configurable via `appConfig.model.user.passwordPolicy`)
- **One-way Hashing**: Passwords are never stored in plain text

```javascript
// Password hashing (automatic in UserModel)
const passwordHash = await UserModel.hashPassword('userPassword');

// Password verification
const isValid = await UserModel.verifyPassword('userPassword', passwordHash);
```

#### Password Policy

- **Minimum Length**: Configurable (default: 8 characters)
- **Validation**: Enforced during password creation and updates
- **Policy Location**: `appConfig.model.user.passwordPolicy.minLength`

### Authentication Endpoints

#### Login

```http
POST /api/1/auth/login
Content-Type: application/json

{
    "identifier": "username_or_email",
    "password": "userPassword"
}
```

**Response (200):**
```json
{
    "success": true,
    "data": {
        "user": {
            "id": "user123",
            "username": "jsmith",
            "email": "john@example.com",
            "roles": ["user"]
        }
    },
    "message": "Login successful"
}
```

**Error Responses:**
- **400**: Missing credentials
- **401**: Invalid credentials
- **403**: Login disabled (`appConfig.controller.auth.disableLogin`)

#### Logout

```http
POST /api/1/auth/logout
```

Destroys the session and clears authentication state.

---

## 🛡️ Authorization

### Role-Based Access Control

jPulse Framework implements a four-tier role system:

- **`guest`**: Unauthenticated users (public access)
- **`user`**: Authenticated users (default role)
- **`admin`**: Administrative users
- **`root`**: Super-administrative users (highest privilege)

### Authorization Middleware

#### Require Authentication

```javascript
// Middleware to require authentication
router.get('/api/1/user/profile',
    AuthController.requireAuthentication,
    UserController.profile
);
```

**Behavior:**
- Returns `401 Unauthorized` if user is not authenticated
- Automatically includes user context in `req.session.user` if authenticated

#### Require Role(s)

```javascript
// Middleware factory to require specific roles
router.get('/api/1/config',
    AuthController.requireRole(['admin', 'root']),
    ConfigController.list
);
```

**Behavior:**
- Returns `401 Unauthorized` if user is not authenticated
- Returns `403 Forbidden` if user doesn't have required role
- User must have at least one of the specified roles

### Utility Functions

#### Check Authentication Status

```javascript
// In controller logic
if (AuthController.isAuthenticated(req)) {
    // User is logged in
    const userId = req.session.user.id;
}
```

#### Check Authorization

```javascript
// Check if user has required role(s)
if (AuthController.isAuthorized(req, ['admin', 'root'])) {
    // User has admin or root role
}

// Public endpoints (allow unauthenticated access)
if (AuthController.isAuthorized(req, '_public')) {
    // Access allowed for everyone
}
```

**Authorization Logic:**
- If not authenticated and roles include `'_public'`: authorized
- If authenticated and user has any of the required roles: authorized
- Otherwise: not authorized

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

---

## 🔒 Security Features

### Security Headers

jPulse Framework sets comprehensive security headers via nginx (production) and Express middleware (development).

#### nginx Security Headers (Production)

```nginx
# Security headers in nginx.prod.conf
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

**Headers Explained:**
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Enables XSS filter in older browsers
- **Strict-Transport-Security**: Forces HTTPS connections (HSTS)
- **Referrer-Policy**: Controls referrer information sharing

#### Content Security Policy (CSP)

CSP is configured via `appConfig.middleware.setHeaders`:

```javascript
// CSP configuration in app.conf
middleware: {
    setHeaders: {
        headers: ['Content-Security-Policy', 'Report-To'],
        availableHeaders: {
            'Content-Security-Policy':
                "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; report-to default",
            'Report-To':
                '{"group":"default","max_age":31536000,"endpoints":[{"url":"/api/1/log/report/csp"}]}'
        }
    }
}
```

**CSP Features:**
- Violation reporting to `/api/1/log/report/csp`
- Configurable directives per security requirements
- Report-Only mode available for testing

### Rate Limiting

nginx provides rate limiting for different endpoint types:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

# API endpoints: 10 requests/second (burst: 20)
location /api/ {
    limit_req zone=api burst=20 nodelay;
}

# Authentication endpoints: 5 requests/minute (burst: 5)
location ~ ^/(login|signup|auth)/ {
    limit_req zone=login burst=5 nodelay;
}

# General requests: 30 requests/second (burst: 50)
location / {
    limit_req zone=general burst=50 nodelay;
}
```

### SSL/TLS Configuration

Production nginx configuration includes strong SSL/TLS settings:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

**SSL Features:**
- TLS 1.2 and 1.3 only (no legacy protocols)
- Strong cipher suites
- Session caching for performance
- HTTP to HTTPS redirect

### Input Validation

All user inputs are validated using schema-based validation:

```javascript
// UserModel schema validation
static schema = {
    username: { type: 'string', required: true, unique: true },
    email: { type: 'string', required: true, unique: true, validate: 'email' },
    passwordHash: { type: 'string', required: true },
    roles: { type: 'array', default: ['user'], enum: ['guest', 'user', 'admin', 'root'] }
};
```

**Validation Features:**
- Type checking (string, number, date, objectId, etc.)
- Required field validation
- Email format validation
- Enum validation for roles and status
- Unique constraint checking

### Path Traversal Protection

All file operations are protected against path traversal attacks:

```javascript
// File path validation (example from markdown controller)
const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
```

---

## 🚀 Deployment Security

### Production Configuration

#### Session Secret

**CRITICAL**: Change the session secret in production:

```javascript
// In app.conf or app.conf.prod.tmpl
session: {
    secret: process.env.SESSION_SECRET || 'generate-strong-random-secret'
}
```

**Recommendation**: Use a strong random string (32+ characters) stored in environment variables.

#### Secure Cookies

Enable secure cookies in production:

```javascript
cookie: {
    secure: true,  // HTTPS only in production
    httpOnly: true,
    maxAge: 3600000
}
```

#### CORS Configuration

Configure CORS appropriately for production:

```javascript
middleware: {
    cors: {
        origin: 'https://yourdomain.com',  // Specific origin, not '*'
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true  // Include cookies in CORS requests
    }
}
```

### nginx Security Configuration

#### File Access Restrictions

```nginx
# Block access to sensitive files
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
}

location ~ \.(conf|log|sql|bak|backup)$ {
    deny all;
    access_log off;
    log_not_found off;
}
```

#### WebSocket Security

WebSocket connections inherit session authentication:

```javascript
// WebSocket namespace with authentication
WebSocketController.registerNamespace('/api/1/ws/admin-panel', {
    requireAuth: true,
    requireRoles: ['admin', 'root'],
    onConnect: (clientId, user) => {
        // User is guaranteed to be authenticated and authorized
    }
});
```

---

## 📋 Security Best Practices

### Development

1. **Never commit secrets**: Use environment variables or secure vaults
2. **Use strong passwords**: Enforce password policy in development
3. **Test authentication**: Verify all protected endpoints require authentication
4. **Review logs**: Check authentication and authorization logs regularly

### Production

1. **Change session secret**: Use strong, unique secret per deployment
2. **Enable HTTPS**: Always use HTTPS in production
3. **Secure cookies**: Enable `secure` flag for cookies
4. **Rate limiting**: Configure appropriate rate limits for your traffic
5. **Monitor logs**: Set up monitoring for authentication failures and security events
6. **Regular updates**: Keep dependencies updated for security patches
7. **Access control**: Use principle of least privilege for user roles

### Code Security

1. **Input validation**: Always validate and sanitize user inputs
2. **Path traversal**: Use path normalization and validation
3. **SQL injection**: Use parameterized queries (MongoDB driver handles this)
4. **XSS prevention**: Escape user-generated content in templates
5. **CSRF protection**: Consider implementing CSRF tokens for state-changing operations

---

## 🔍 Security Gaps & Future Enhancements

The following security features are planned or recommended for future implementation:

### Planned Features (W-084)

- **CSRF Protection**: Token-based CSRF protection for form submissions
- **MFA (Multi-Factor Authentication)**: SMS or authenticator app support (planned as plugin)
- **OAuth2 Authentication**: OAuth2 provider integration (planned as plugin)
- **LDAP Authentication**: LDAP/Active Directory integration (planned as plugin)
- **Security Audit Logging**: Enhanced logging for security events
- **Password Policy Enforcement**: Configurable password complexity requirements
- **Account Lockout**: Automatic account lockout after failed login attempts
- **Session Management UI**: User-facing session management (view active sessions, revoke sessions)

### Recommendations

- **Security Headers Audit**: Regular review and tightening of CSP policy
- **Dependency Scanning**: Automated vulnerability scanning for npm dependencies
- **Penetration Testing**: Regular security audits and penetration testing
- **Security Monitoring**: Set up alerts for suspicious authentication patterns

---

## 📚 Related Documentation

- **[REST API Reference](api-reference.md)** - Complete API endpoint documentation including authentication requirements
- **[Deployment Guide](deployment.md)** - Production deployment with security considerations
- **[Getting Started](getting-started.md)** - Quick start guide including initial admin setup

---

*For security-related questions or to report security issues, contact the development team or create an issue with the "security" label.*

