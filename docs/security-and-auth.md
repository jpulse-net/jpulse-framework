# jPulse Docs / Security & Authentication v1.7.15

Complete guide to security features, authentication, authorization, and security best practices in the jPulse Framework.

## 🔐 Overview

The jPulse Framework implements enterprise-grade security features including session-based authentication, role-based access control, secure session management, and comprehensive security headers.

### Security Features

- **Session-Based Authentication**: MongoDB-backed persistent sessions with configurable TTL
- **Role-Based Access Control**: Four-tier role system (`guest`, `user`, `admin`, `root`)
- **Password Security**: bcrypt hashing with 12 salt rounds
- **Security Headers**: Comprehensive HTTP security headers via nginx and Express
- **Content Security Policy**: Configurable CSP with violation reporting
- **Rate Limiting**: nginx-based rate limiting for all endpoints, plus app-level (Redis-backed) rate limiting on login and select other endpoints — see [Rate Limiting](#rate-limiting)
- **SSL/TLS**: Production-ready SSL configuration
- **Input Validation**: Schema-based validation for all user inputs
- **Configuration secrets**: Sensitive fields are masked in bulk reads, page context, and logs; an admin can reveal one field at a time, and that reveal is recorded — see [Secrets in Configuration](#secrets-in-configuration)

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
- **400**: Missing credentials (`MISSING_CREDENTIALS`)
- **401**: Invalid credentials (`INVALID_CREDENTIALS`)
- **403**: Login disabled (`LOGIN_DISABLED`, `appConfig.controller.auth.disableLogin`)
- **403**: Local auth restricted (`LOCAL_AUTH_RESTRICTED`, `appConfig.controller.auth.localAuthRestriction`, internal auth only — see below)
- **403**: Account status blocks login (`ACCOUNT_PENDING_APPROVAL` / `ACCOUNT_SUSPENDED` / `ACCOUNT_TERMINATED` / `ACCOUNT_INACTIVE`)
- **429**: Too many requests from this IP (`RATE_LIMITED`, `appConfig.controller.auth.loginRateLimit` — see [Rate Limiting](#rate-limiting)); response includes `retryAfter` (seconds)

#### Restricting Local (Username/Password) Login

`appConfig.controller.auth.localAuthRestriction` lets a site restrict or disable local username/password login once an external auth provider (OAuth, LDAP, SAML, etc.) is trusted:

- **`'none'`** (default): local login works for everyone
- **`'admins-only'`**: local login only works for users with the `admin` role; regular users must use an external provider
- **`'disabled'`**: no local login at all

A bootstrap safety check downgrades `'disabled'` to `'admins-only'` automatically if no plugin has registered the `onAuthGetLoginProviders` hook, preventing a config-only total lockout. `/auth/login.shtml?localFallback=1` reveals the local login form with a "Recovery mode" banner regardless of the restriction, as an ops convenience — the server-side restriction above is still enforced. If SSO is down and no local admin account is usable, see the **[Break-Glass Account Runbook](deployment.md#break-glass-account-runbook)**.

External auth plugins (OAuth, LDAP, SAML) finish a browser-redirect login via `AuthController.completeExternalAuth(req, res, user, authMethod, redirectUrl)`, and inject "Sign in with ..." buttons onto the login page via the `onAuthGetLoginProviders` hook — see [Hooks](hooks.md) for both.

#### Email Verification

`appConfig.controller.user.emailVerification` controls whether a new signup must prove they
actually control the email address they registered with, before treating that address as
trustworthy elsewhere in the framework (e.g. an SSO login later matching by email — see
`link-by-email` in the auth-oauth plugin's docs):

- **`'off'`**: no verification at all — `emailVerified` is still tracked on the user document, but
  never enforced or nagged
- **`'nag'`**: unverified users can sign in and use the app normally; they see a dismissible toast
  with a link to resend the verification email until they verify
- **`'required'`** (default): a fresh signup is auto-sent a verification email and must complete
  it as an additional login step (the login response's `nextStep: 'email-verify'`) before the
  session completes; an already-authenticated user whose email later becomes unverified (see
  below) is nagged rather than forced out, since the framework never terminates an active session
  mid-use

**SMTP safety valve:** if `emailVerification` is `'required'` but no SMTP server is configured
(`EmailController.isConfigured()` returns `false`), enforcement transparently degrades to
`'nag'` at runtime — checked live on every request via `UserModel.getEmailVerificationPolicy()`,
not decided once at startup — so a not-yet-configured mail server can never lock every new signup
out. A loud warning is still logged once at startup so the gap doesn't go unnoticed; once SMTP is
configured, full `'required'` enforcement resumes immediately, without a restart.

**Grandfathered accounts:** `emailVerified`/`emailVerifiedAt` are absent on accounts created
before this feature existed. A one-time, idempotent startup backfill normalizes any account with
an absent `emailVerified` to `true` with `emailVerifiedAt: null` — the `null` timestamp is what
distinguishes a grandfathered account from one that actually completed verification (which stamps
a real `emailVerifiedAt`).

**Admin changing a user's email:** `email` is admin-only (see [Input
Validation](#input-validation) below) — a regular user has no self-service way to change their
own address. When an admin retargets a user's `email` to a new value, `PUT /api/1/user*` resets
`emailVerified: false` (clearing `emailVerifiedAt`) by default, since the admin is only asserting
a belief about the new address, not proof of ownership — an informational email (with a verify
link) goes to the new address and a security alert goes to the old one, and the user is
nagged/blocked per the policy above until they re-verify. An admin who already knows the new
address is good (e.g. fixing a typo) can pass `emailVerified: true` explicitly in that same
request to skip the reset — a conscious, logged override rather than an invisible default.

**Endpoints:** see [REST API Reference — Email Verification](api-reference.md#email-verification).

#### Password Reset

A user who has forgotten their password requests a reset from the login page's "Forgot
password?" link, receives a one-hour, single-use link by email, chooses a new password, and — if
nothing else stands in the way — is signed in on the spot.

**Availability.** The feature is offered only when both of these hold, checked live on every
request (so configuring or clearing SMTP takes effect immediately, with no restart):

- `appConfig.controller.user.disablePasswordReset` is `false` (the default)
- email is configured (`EmailController.isConfigured()`) — both a non-empty `smtpServer` and
  `adminEmail` are required; an empty server does **not** fall back to `localhost` (set
  `localhost` explicitly for a local MTA)

A fresh install has no mail server, so without the second condition the default experience would
be a link that promises an email nobody will ever receive. When reset is unavailable the login
page hides the link, the admin Security-panel send button is disabled, and all four endpoints
refuse with `403 PASSWORD_RESET_UNAVAILABLE`.

**One flag, not two.** Unlike the older `disableLogin`/`hideLogin` and
`disableSignup`/`hideSignup` pairs, the single `disablePasswordReset` value is read by both the
endpoints and the login page (it is on `controller.handlebar.contextFilter.alwaysAllow`, so the
unauthenticated login page can see it), which removes any chance of the two layers drifting apart.
`view.auth.hideLogin` deliberately has no effect here: it hides navigation entries while leaving
the login page reachable by direct URL, and a site using it still wants the people who know that
URL to be able to recover their password.

**Who gets what.** The request endpoint's response is identical in every case below — an
anonymous stranger must not be able to learn whether an account exists. Only the email differs,
and only the person holding the inbox sees it:

| Account situation | Emailed |
|---|---|
| No matching username or email | nothing |
| No usable local password (provisioned by an external auth provider) | "you sign in with your provider" explainer, no link |
| `localAuthRestriction` makes local login unusable for this account | same explainer — a password they could never sign in with is not worth resetting |
| `status: 'suspended'` or `'terminated'` | nothing; the administrator owns that conversation |
| `status: 'pending'` or `'inactive'` | reset link — they may be waiting on approval and still deserve working credentials |
| `status: 'active'`, local password | reset link |

**The link.** `<userId>.<secret>` with 32 random bytes of entropy, stored as a bcrypt hash in
Redis and valid for **one hour** — much shorter than the 24-hour verification link above, because
this one grants account takeover to whoever holds it. It is single-use, consumed only by a
successful confirm, and additionally invalidated by any other password write for that account
(self-service change, or an administrator setting a password). The link points at a page rather
than an API route, so a mail scanner prefetching it cannot burn the token before the user sees
the form, and the page strips the token from the address bar as soon as it reads it.

**After the reset.** Setting the new password also marks the address verified — the user just
opened a secret mailed to it, which is exactly the proof that flag asserts. The reset endpoint
never creates a session itself; it hands off to the same machinery `login()` uses, so a required
MFA step (or any plugin-provided step) still stands between the new password and a session.
Account status and `localAuthRestriction` are re-checked before that hand-off, so a mailed link is
never a way around either: a `pending` or `inactive` account gets its password fixed and is told,
in the response, why it still cannot sign in.

**Administrator-initiated reset.** Admin → Users → *(user)* → Security offers "Email password
reset link" beside the existing Set Password override. For most support cases the mailed link is
the better of the two — an administrator-set password is a password the administrator knows, has
to communicate over some channel, and that stays valid until the user changes it, whereas a mailed
link is never seen by the administrator, expires in an hour, and works only for whoever holds the
mailbox. Set Password remains for the cases that need it: no SMTP, an unreachable mailbox, an
urgent lockout; it also stamps `hasLocalPassword: true`, so an SSO-provisioned account that was
given a real password is no longer treated as "no local password." Unlike the public endpoint, the
mailed-link path answers honestly (the masked recipient address, a specific eligibility refusal, or
a real SMTP failure), skips the per-account send budget so an administrator helping in real time is
not blocked by a budget the user already spent, and logs every send with the acting administrator's
username.

**Endpoints:** see [REST API Reference — Password Reset](api-reference.md#password-reset).

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
- `GET /api/1/auth/status` - Session authentication status (zero DB queries)
- `GET /api/1/auth/pending-status` - Poll a mid-login `pendingAuth` for cross-device email-verify completion
- `GET /api/1/health/status` - System health check
- `GET /api/1/user/email-verify/confirm` - Email verification link (token proves identity on its own)
- `POST /api/1/user/password-reset` - Request a password reset link
- `GET /api/1/user/password-reset/verify` - Check whether a reset link is still usable
- `POST /api/1/user/password-reset/confirm` - Set a new password (the mailed token is the credential)

#### Authenticated Endpoints (Login Required)

- `GET /api/1/user/profile` - User profile access
- `PUT /api/1/user/profile` - Profile updates
- `PUT /api/1/user/password` - Password changes
- `POST /api/1/user/email-verify` - Verify email with code
- `POST /api/1/user/email-verify/send` - Resend email verification
- `POST /api/1/auth/logout` - User logout

#### Admin Endpoints (Admin/Root Roles Required)

- `GET /api/1/user/search` - User management and search
- `GET /api/1/config/*` - Configuration access (secrets masked in bulk reads)
- `GET /api/1/config/:id/secret` - Reveal one stored secret (audited)
- `POST /api/1/config` - Configuration creation
- `PUT /api/1/config/:id` - Configuration updates
- `DELETE /api/1/config/:id` - Configuration deletion
- `GET /api/1/log/search` - System log access

---

## Secrets in Configuration

Site config and plugin config treat a field as a secret when it is marked `sensitive: true`, or when it is a password input (`inputType: 'password'` on the config schema, `type: 'password'` in `plugin.json`). `sensitive: false` is the escape hatch if a password widget should not be treated as a secret.

### What is guaranteed

- No secret appears in bulk API reads (`GET /api/1/config`, list, effective, create/update responses, `GET /api/1/plugin/:name/config`), including for admins. Unset is `""`; set is the mask `********`.
- No secret is rendered into Handlebars `siteConfig`, for guests or authenticated users. Paths come from the schema, so an `extendSchema()` secret is stripped even if it is missing from `contextFilter`.
- Request-body application logs and change-log diffs mask secrets for both `config` and `plugin` documents.
- Reveal is a single-field GET. The path or field id must be on the sensitive list; the change-log entry records who revealed which field (`action: "read"`), never the value.

### What is not guaranteed

An admin can read a secret through the reveal endpoint, and that read is recorded. Typical deployments also give operators shell and Mongo access. Masking stops bulk exfiltration through a hijacked admin session, screenshots of API responses, proxy logs, and bug reports — it does not make the value unreadable to an administrator.

### `contextFilter` vs `sensitive`

`contextFilter` is the **audience filter** for non-secret fields (for example hiding `smtpServer` from guests). Its secret globs remain as belt-and-braces. `sensitive` is the mechanism that hides secrets from every caller.

### Internal reads

Server code that must use a secret calls `ConfigModel.findById(id, true)` or `PluginModel.getSecret(name, fieldId)`. The raw document must never be returned to a client. Masking is a response-layer job.

### Escalation: `writeOnly`

If a deployment needs non-retrievability (hosted sites where support staff hold admin, or a shared platform key), a future `writeOnly: true` flag can add “no reveal for this path” plus an explicit Clear control. That is not implemented; the current contract is masked reads with audited reveal.

See [REST API Reference — Sensitive fields](api-reference.md#sensitive-fields) and [Site Administration — Manifest](site-administration.md#manifest-license-compliance-monitoring).

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

jPulse rate-limits requests at two independent layers - they don't know about each other, and
neither depends on the other being present:

- **nginx** (reverse proxy, per IP) - the framework's reference production config
  (`templates/deploy/nginx.prod.conf`), a baseline that covers *every* endpoint but only applies
  if a site actually deploys behind that config (or an equivalent). It never runs in local dev
  (`npm start`) and won't exist behind a different reverse proxy, a container/k8s ingress, or a
  customized nginx config that dropped these zones.
- **App-level** (Node/Express, per IP, Redis-backed) - opt-in per endpoint via
  `RedisManager.cacheCheckRateLimit()` (see [Cache Infrastructure](cache-infrastructure.md#rate-limiting)
  for the reusable pattern). Only a few endpoints use it today (below) - it's the layer that still
  protects those specific endpoints even without nginx in front, but it is **not** a blanket
  replacement for the nginx zones, since most endpoints don't opt in.

#### nginx Zones

Four zones, each scoped to a `location` block:

| Zone | Rate | Covers |
|---|---|---|
| `login` | 5 requests/minute (burst 5) | `/auth/*` view pages (`login.shtml`, `signup.shtml`, `logout.shtml`, etc.) **and** the credential-submission API calls (`/api/1/auth/login`, `/api/1/user/signup`) |
| `api` | 10 requests/second (burst 20) | every other `/api/*` endpoint (generic - not tuned per endpoint) |
| `assets` | 150 requests/second (burst 200) | `/assets/` static files (kept high to avoid 429s on legitimate heavy page loads) |
| `general` | 30 requests/second (burst 50) | every other page request |

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=assets:10m rate=150r/s;

# Authentication endpoints: 5 requests/minute (burst: 5)
# Matches the auth view pages AND their credential-submission API calls - framework pages are
# never served under a top-level /login/ or /signup/ path, only /auth/*.
location ~ ^(/auth/|/api/1/auth/login$|/api/1/user/signup$) {
    limit_req zone=login burst=5 nodelay;
}

# API endpoints: 10 requests/second (burst: 20)
location /api/ {
    limit_req zone=api burst=20 nodelay;
}

# Assets endpoints: 150 requests/second (burst: 200)
# (Separated to avoid 429s on legitimate heavy static loads)
location ^~ /assets/ {
    limit_req zone=assets burst=200 nodelay;
}

# General requests: 30 requests/second (burst: 50)
location / {
    limit_req zone=general burst=50 nodelay;
}
```

Canonical numbers and the exact `location` mapping can be found in
`templates/deploy/nginx.prod.conf`. Note that nginx always checks a regex `location` (like
`login` above) against every request, even one that also matches a plain prefix `location` (like
`/api/`) declared elsewhere in the file - so `/api/1/auth/login` correctly gets the stricter
`login` zone instead of the generic `api` zone, regardless of which block appears first.

#### App-Level (Node) Rate Limiting

| Endpoint | Config | Default | Notes |
|---|---|---|---|
| `POST /api/1/auth/login` (all steps, not just credentials) | `appConfig.controller.auth.loginRateLimit` (`enabled`/`maxAttempts`/`windowSeconds`) | `true` / 20 / 300s | Returns `429 RATE_LIMITED` with `retryAfter` (seconds); fires the `onAuthFailure` hook |
| `POST /api/1/user/email-verify` (code attempts, incl. the login-flow `email-verify` step) | hardcoded, not site-configurable | 5 attempts / 15 min per account | Returns `429 EMAIL_VERIFY_RATE_LIMITED` with `retryAfter` |
| `POST /api/1/user/email-verify/send` (resend, incl. auto-issue at signup/login) | hardcoded, not site-configurable | 3 sends / 10 min per account | Returns `429 EMAIL_VERIFY_RATE_LIMITED` with `retryAfter` |
| `POST /api/1/user/password-reset` (request a link) | `appConfig.controller.user.passwordResetRateLimit` (`enabled`/`maxAttempts`/`windowSeconds`) | `true` / 10 / 300s | Per IP — the only limiter that can bound enumeration of accounts that don't exist. Returns `429 RATE_LIMITED` with `retryAfter` (seconds) |
| `POST /api/1/user/password-reset` (per account) | hardcoded, not site-configurable | 3 sends / 10 min per account | Never surfaced to the caller — the response stays generic. Bypassed for an administrator-initiated send |
| `POST /api/1/user/password-reset/confirm` (token attempts) | hardcoded, not site-configurable | 5 attempts / 15 min per account | Returns `429 PASSWORD_RESET_RATE_LIMITED` with `retryAfter` (seconds) |
| `auth-oauth` plugin's `GET /api/1/auth-oauth/init/:provider` and `.../callback/:provider` | hardcoded in the plugin, not site-configurable | 60 requests / 60s | See the plugin's own docs |

All of these fail open: if `global.RedisManager` isn't initialized, or Redis itself is unreachable, the
request proceeds normally rather than being blocked — a broken/absent cache must never be able to
lock every user out. No other core endpoint (signup, password change, profile updates, search,
config saves, log queries, etc.) has app-level rate limiting today; they rely entirely on the
nginx `api` zone above when deployed behind it, and have no protection at all otherwise.

WebSocket connections have a related but separate control -
`appConfig.controller.websocket.messageLimits` (max message size + messages/interval **per
connection**, not per IP), with optional per-namespace overrides via
`createNamespace({ messageLimits })`. Oversized and rate-limited messages are rejected with
an error envelope (`MESSAGE_TOO_LARGE` / `RATE_LIMIT_EXCEEDED`), not dropped silently —
see [websockets.md — Message Limits](websockets.md#message-limits-dos-protection).

To add app-level rate limiting to your own site/plugin endpoints, reuse
`RedisManager.cacheCheckRateLimit()` directly - see
[Cache Infrastructure — Rate Limiting](cache-infrastructure.md#rate-limiting) for the pattern and
example code.

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
    hasLocalPassword: { type: 'boolean', default: true },
    roles: { type: 'array', default: ['user'], enum: ['guest', 'user', 'admin', 'root'] }
};
```

`hasLocalPassword` marks whether a user has a real, usable local password — external-auth plugins set it to `false` when they JIT-create a user with a synthetic/unknown `passwordHash`. `UserController.changePassword()` skips the `currentPassword` check when it's `false` (the session already proves identity) and resets it to `true` on success; absent reads as `true`, so no migration is needed for existing local-signup users.

`username`/`email` `unique: true` above is enforced at the database level: both fields are backed by real MongoDB unique indexes, created at startup with a pre-check that skips index creation (and logs a warning) rather than crashing if pre-existing duplicates are found, so an admin can resolve them first. `email` is additionally normalized to lowercase before every read/write/comparison (mirroring the pre-existing `username` normalization, including a one-time backfill of already-stored mixed-case values), so e.g. `peter@x.com` and `Peter@X.com` can't coexist as separate accounts.

**Validation Features:**
- Type checking (string, number, date, objectId, etc.)
- Required field validation
- Email format validation
- Enum validation for roles and status
- Unique constraint checking (app-level pre-check plus DB-level unique indexes on `email`/`username`)

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

For authenticated namespaces, **connection context (`ctx`) is established at upgrade**; it does not refresh automatically on each message. If the user **logs out in another tab** (or the session is destroyed server-side), the WebSocket may stay open until the next **health-check** cycle, which re-validates the session and can close with **4401**. For **write** operations that must fail **immediately** when the session is no longer valid, applications may call **`WebSocketController.revalidateClientSession(namespacePath, clientId)`** from `onMessage` (opt-in). See [WebSocket Real-Time Communication — Session security (server-side)](websockets.md#session-security-server-side).

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
4. **Rate limiting**: Configure appropriate rate limits for your traffic. Note that `/assets/` is proxied to Node and may need a separate, higher limit in nginx compared to general traffic to avoid 429s on bursty legitimate loads.
5. **Monitor logs**: Set up monitoring for authentication failures and security events
6. **Regular updates**: Keep dependencies updated for security patches
7. **Access control**: Use principle of least privilege for user roles

### Code Security

1. **Input validation**: Always validate and sanitize user inputs
2. **Path traversal**: Use path normalization and validation
3. **SQL injection**: Use parameterized queries (MongoDB driver handles this)
4. **XSS prevention**: Escape user-generated content in templates; when rendering trusted-but-untrusted-content HTML (e.g. from a WYSIWYG editor), use `CommonUtils.sanitizeHtml()` (server) or `jPulse.string.sanitizeHtml()` (client) rather than a custom filter — both strip dangerous tags/attributes and normalize element tag-name case so foreign-namespace content (SVG, MathML) can't smuggle a `<script>` past a case-sensitive check
5. **CSRF protection**: Consider implementing CSRF tokens for state-changing operations

---

## 🔍 Security Gaps & Future Enhancements

The following security features are planned or recommended for future implementation:

### Planned Features

- **CSRF Protection**: Token-based CSRF protection for form submissions
- **MFA (Multi-Factor Authentication)**: SMS or authenticator app support (planned as plugin)
- **OAuth2 Authentication**: OAuth2 provider integration (planned as plugin; the framework-level primitives it needs — `completeExternalAuth()`, `onAuthGetLoginProviders`, `localAuthRestriction`, `hasLocalPassword` — already ship in core, see above)
- **LDAP Authentication**: LDAP/Active Directory integration (planned as plugin; same framework primitives apply)
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

- **[REST API Reference](api-reference.md#sensitive-fields)** - Masked config reads, write rules, and the reveal endpoint
- **[REST API Reference](api-reference.md)** - Complete API endpoint documentation including authentication requirements
- **[Deployment Guide](deployment.md)** - Production deployment with security considerations
- **[Cache Infrastructure](cache-infrastructure.md#rate-limiting)** - `RedisManager.cacheCheckRateLimit()` pattern for adding app-level rate limiting to your own endpoints
- **[Getting Started](getting-started.md)** - Quick start guide including initial admin setup

---

*For security-related questions or to report security issues, contact the development team or create an issue with the "security" label.*

