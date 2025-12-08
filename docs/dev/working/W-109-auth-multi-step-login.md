# W-109: plugins: multi-step authentication flow

## Status
✅ COMPLETE - Core implementation done, tested manually

**Completed:** 2025-12-08

## Overview

Refactor the authentication system to support a flexible, hook-based, multi-step login flow. This enables plugins to inject additional authentication steps (MFA, email verification, terms acceptance, etc.) without modifying core code.

## Problem Statement

Current authentication design has limitations:

1. **Plugin-specific code in core:** `auth.js` contains MFA-specific logic (`if (mfaContext.requireMfa)`)
2. **Single-step assumption:** Original login flow expects one request/response cycle
3. **Hard to extend:** Adding new auth plugins (OAuth2, LDAP, email verification) requires modifying core
4. **No warning mechanism:** Can't show non-blocking messages (e.g., "please verify email")

## Solution

A single login endpoint that orchestrates a chain of authentication steps:

1. **Single endpoint:** `POST /api/1/auth/login`
2. **Step-based flow:** Client submits `{ step: "X", ...data }` for each step
3. **Server controls chain:** Plugins register required steps via hooks
4. **Secure state:** `completedSteps` stored server-side in `session.pendingAuth`
5. **Dynamic steps:** Plugins can add steps based on user context

---

## Security Model

| Concern | Mitigation |
|---------|------------|
| Step spoofing | `completedSteps` stored **server-side** only |
| Step skipping | Server validates `remainingSteps[0] === step` |
| Session hijacking | Standard session security (httpOnly, secure, sameSite) |
| Timeout attacks | `pendingAuth.createdAt` expires after 5 minutes |
| Replay attacks | Each step validated fresh; session invalidated on failure |

**Key principle:** Client can only request `{ step: "X", ...data }`. It cannot claim steps are complete.

---

## Hook Architecture

### Existing Hooks (Unchanged)

| Hook | When | Purpose |
|------|------|---------|
| `authBeforeLoginHook` | Before credential validation | Captcha, LDAP bind, OAuth init |
| `authBeforeSessionCreateHook` | Before session creation | Modify session data |
| `authAfterLoginSuccessHook` | After login complete | Audit logging, notifications |
| `authOnLoginFailureHook` | On login failure | Rate limiting, lockout |

### New Hooks

| Hook | When | Purpose |
|------|------|---------|
| `authGetRequiredSteps` | After credentials valid | Return blocking steps required |
| `authExecuteStep` | When step submitted | Validate step-specific data |
| `authGetLoginWarnings` | Before session create | Return non-blocking warnings |

---

## Flow Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  authBeforeLoginHook                                │   │
│  │  - Captcha validation                               │   │
│  │  - LDAP/OAuth identity resolution                   │   │
│  │  - Can set skipPasswordCheck, provide user          │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Credential Validation (internal or skipped)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  authGetRequiredSteps  ←──────────────────────┐     │   │
│  │  Returns: [{ step, priority, data }]          │     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                 │
│            ┌─────── More steps? ───────┐                   │
│            │ YES                   NO  │                   │
│            ↓                       ↓   │                   │
│  ┌──────────────────┐    ┌─────────────────────────────┐   │
│  │ Return nextStep  │    │ authGetLoginWarnings        │   │
│  │ to client        │    │ Returns: [{ type, message }]│   │
│  └──────────────────┘    └─────────────────────────────┘   │
│            ↓                           ↓                   │
│  Client submits step         ┌─────────────────────────┐   │
│            ↓                 │ authBeforeSessionCreate │   │
│  ┌──────────────────┐        │ Modify session data     │   │
│  │ authExecuteStep  │        └─────────────────────────┘   │
│  │ Validate step    │                     ↓                │
│  └──────────────────┘        ┌─────────────────────────┐   │
│            ↓                 │ Create Session          │   │
│     Loop back to ────────────└─────────────────────────┘   │
│     authGetRequiredSteps              ↓                    │
│                              ┌─────────────────────────┐   │
│                              │ authAfterLoginSuccess   │   │
│                              │ Audit, notifications    │   │
│                              └─────────────────────────┘   │
│                                       ↓                    │
│                              ┌─────────────────────────┐   │
│                              │ Return success + user   │   │
│                              └─────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## API Specification

### Single Login Endpoint

```
POST /api/1/auth/login
Content-Type: application/json
```

### Request Format

```javascript
// First call (credentials)
{ "step": "credentials", "username": "jane", "password": "secret123" }

// Subsequent calls (plugin steps)
{ "step": "mfa", "code": "123456" }
{ "step": "email-verify", "code": "ABC123" }
{ "step": "terms-accept", "accepted": true, "version": "2.0" }
{ "step": "password-change", "currentPassword": "old", "newPassword": "new" }
```

### Response Format

```javascript
// Step required
{
    "success": true,
    "nextStep": "mfa",
    "mfaMethod": "totp"  // Step-specific data
}

// Login complete
{
    "success": true,
    "nextStep": null,
    "user": { "id": "...", "username": "jane", ... },
    "warnings": [{ "type": "email-unverified", "message": "Please verify your email" }]
}

// Error
{
    "success": false,
    "error": "Invalid MFA code",
    "code": "STEP_FAILED"
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `MISSING_CREDENTIALS` | Username/password not provided |
| `INVALID_CREDENTIALS` | Wrong username or password |
| `ACCOUNT_LOCKED` | Account temporarily locked |
| `ACCOUNT_DISABLED` | Account disabled by admin |
| `NO_PENDING_AUTH` | Step submitted without prior credentials |
| `AUTH_EXPIRED` | Pending auth timed out (5 min) |
| `INVALID_STEP` | Step doesn't match expected next step |
| `STEP_FAILED` | Step-specific validation failed |
| `INTERNAL_ERROR` | Server error |

---

## Server-Side Session State

```javascript
// Stored in req.session.pendingAuth during multi-step flow
{
    userId: "60d5ec49f1a2c8b1f8e4e1a2",
    username: "jane",
    authMethod: "internal",  // or "ldap", "oauth2"
    completedSteps: ["credentials", "email-verify"],
    requiredSteps: ["credentials", "email-verify", "mfa"],
    createdAt: 1701234567890
}

// After successful login, pendingAuth is deleted and session.user is set
```

---

## Scenario Walkthroughs

### Scenario 1: Simple Login (No Extra Steps)

```
Client: POST { step: "credentials", username: "bob", password: "pass" }

Server:
  1. authBeforeLoginHook → no changes
  2. Credentials validated ✓
  3. authGetRequiredSteps → [] (empty)
  4. authGetLoginWarnings → [] (empty)
  5. _completeLogin()

Response: { success: true, nextStep: null, user: {...} }
```

### Scenario 2: LDAP Login

```
Client: POST { step: "credentials", username: "john", password: "ldap-pass" }

Server:
  1. authBeforeLoginHook →
     - auth-ldap: validates against LDAP server
     - Sets: skipPasswordCheck: true, user: ldapUser, authMethod: 'ldap'
  2. Credentials step complete (password check skipped)
  3. authGetRequiredSteps → [] (LDAP users may not have MFA)
  4. _completeLogin()

Response: { success: true, nextStep: null, user: {...} }
```

### Scenario 3: OAuth2 Login

```
// Step 1: Initialize OAuth flow
Client: POST { step: "oauth2-init", provider: "google" }

Server:
  1. auth-oauth2 plugin generates state token
  2. Returns redirect URL

Response: { success: true, nextStep: "oauth2-redirect", redirectUrl: "https://accounts.google.com/..." }

// User completes OAuth on Google, redirected back with code

// Step 2: Complete OAuth
Client: POST { step: "oauth2-callback", code: "xyz", state: "abc" }

Server:
  1. authExecuteStep → auth-oauth2 exchanges code for token
  2. Looks up or creates user from OAuth profile
  3. authGetRequiredSteps → maybe [{ step: "mfa" }] if user has MFA
  4. Returns next step or completes login

Response: { success: true, nextStep: "mfa", ... } // or nextStep: null
```

### Scenario 4: MFA Required

```
// Step 1: Credentials
Client: POST { step: "credentials", username: "jane", password: "pass" }

Server:
  1. Credentials validated ✓
  2. authGetRequiredSteps →
     - auth-mfa: user.mfa.enabled === true
     - Returns: [{ step: "mfa", priority: 100, data: { mfaMethod: "totp" } }]

Response: { success: true, nextStep: "mfa", mfaMethod: "totp" }

// Step 2: MFA
Client: POST { step: "mfa", code: "123456" }

Server:
  1. Validate step is expected (mfa === remainingSteps[0]) ✓
  2. authExecuteStep → auth-mfa validates TOTP code ✓
  3. completedSteps: ["credentials", "mfa"]
  4. authGetRequiredSteps → [] (no more steps)
  5. _completeLogin()

Response: { success: true, nextStep: null, user: {...} }
```

### Scenario 5: Email Verification Required

```
Client: POST { step: "credentials", username: "jane", password: "pass" }

Server:
  1. Credentials validated ✓
  2. authGetRequiredSteps →
     - auth-verify-email: user.emailVerified === false
     - Sends verification email
     - Returns: [{ step: "email-verify", priority: 50, data: { email: "ja***@example.com" } }]

Response: { success: true, nextStep: "email-verify", email: "ja***@example.com" }

Client: POST { step: "email-verify", code: "ABC123" }

Server:
  1. authExecuteStep → validates code, sets user.emailVerified = true ✓
  2. authGetRequiredSteps → [] (no more steps)
  3. _completeLogin()

Response: { success: true, nextStep: null, user: {...} }
```

### Scenario 6: Email Verification Nag (Non-blocking)

```
Client: POST { step: "credentials", username: "jane", password: "pass" }

Server:
  1. Credentials validated ✓
  2. authGetRequiredSteps → [] (email verification not required in config)
  3. authGetLoginWarnings →
     - auth-verify-email: user.emailVerified === false
     - Returns: [{ type: "email-unverified", message: "Please verify your email" }]
  4. _completeLogin()

Response: {
    success: true,
    nextStep: null,
    user: {...},
    warnings: [{ type: "email-unverified", message: "Please verify your email" }]
}
```

### Scenario 7: Password Expired

```
Client: POST { step: "credentials", username: "bob", password: "oldpass" }

Server:
  1. Credentials validated ✓ (password correct, just expired)
  2. authGetRequiredSteps →
     - Core checks: user.passwordExpiresAt < now
     - Returns: [{ step: "password-change", priority: 10, data: { reason: "expired" } }]

Response: { success: true, nextStep: "password-change", reason: "expired" }

Client: POST { step: "password-change", currentPassword: "oldpass", newPassword: "newpass" }

Server:
  1. authExecuteStep → validates & updates password ✓
  2. authGetRequiredSteps → [] (no more steps)
  3. _completeLogin()

Response: { success: true, nextStep: null, user: {...} }
```

### Scenario 8: Captcha + MFA + Email Verify

```
// Step 1: Credentials with captcha
Client: POST { step: "credentials", username: "jane", password: "pass", captchaToken: "xyz" }

Server:
  1. authBeforeLoginHook →
     - auth-captcha validates token ✓
  2. Credentials validated ✓
  3. authGetRequiredSteps → [
       { step: "email-verify", priority: 50 },
       { step: "mfa", priority: 100 }
     ]

Response: { success: true, nextStep: "email-verify", email: "ja***@..." }

// Step 2: Email verification
Client: POST { step: "email-verify", code: "ABC123" }
Response: { success: true, nextStep: "mfa", mfaMethod: "totp" }

// Step 3: MFA
Client: POST { step: "mfa", code: "789012" }
Response: { success: true, nextStep: null, user: {...} }
```

### Scenario 9: Terms of Service Acceptance

```
Client: POST { step: "credentials", username: "jane", password: "pass" }

Server:
  1. Credentials validated ✓
  2. authGetRequiredSteps →
     - Core/plugin checks: user.termsAcceptedVersion < config.currentTermsVersion
     - Returns: [{ step: "terms-accept", priority: 200, data: { termsUrl: "/terms.html", version: "2.0" } }]

Response: { success: true, nextStep: "terms-accept", termsUrl: "/terms.html", version: "2.0" }

Client: POST { step: "terms-accept", accepted: true, version: "2.0" }

Server:
  1. authExecuteStep → updates user.termsAcceptedVersion = "2.0" ✓
  2. _completeLogin()

Response: { success: true, nextStep: null, user: {...} }
```

### Scenario 10: Multi-Tenant Selection

```
Client: POST { step: "credentials", username: "jane", password: "pass" }

Server:
  1. Credentials validated ✓
  2. authGetRequiredSteps →
     - auth-tenants: user.tenants.length > 1
     - Returns: [{ step: "tenant-select", priority: 5, data: { tenants: [...] } }]

Response: { success: true, nextStep: "tenant-select", tenants: [{id: "t1", name: "Acme"}, ...] }

Client: POST { step: "tenant-select", tenantId: "t1" }

Server:
  1. authExecuteStep → validates tenant, sets pending.selectedTenant ✓
  2. authGetRequiredSteps → maybe more steps for this tenant
  3. Eventually _completeLogin() with tenant in session

Response: { success: true, nextStep: null, user: {..., currentTenant: "t1"} }
```

---

## Implementation Plan

### Overview

The implementation refactors the existing login flow to support multi-step authentication. Key changes:
1. Replace MFA-specific `authAfterPasswordValidationHook` with generic `authGetRequiredSteps`
2. Add step execution via `authExecuteStep` hook
3. Store pending auth state in session
4. Update MFA plugin to use new hooks

---

### Phase 1: Hook Manager Updates (~30m)

**File:** `webapp/utils/hook-manager.js`

**Step 1.1:** Add new hooks to `getAvailableHooks()` (after existing auth hooks):

```javascript
// Add after authOnMfaFailureHook block (~line 282)

authGetRequiredStepsHook: {
    description: 'Return additional authentication steps required for this user',
    context: '{ req, user, completedSteps, requiredSteps }',
    canModify: true,
    canCancel: false
},
authExecuteStepHook: {
    description: 'Execute and validate a specific authentication step',
    context: '{ req, step, stepData, pending, valid, error }',
    canModify: true,
    canCancel: false
},
authGetLoginWarningsHook: {
    description: 'Return non-blocking login warnings (nag messages)',
    context: '{ req, user, warnings }',
    canModify: true,
    canCancel: false
},
```

---

### Phase 2: Core Login Refactor (~2h)

**File:** `webapp/controller/auth.js`

**Step 2.1:** Add helper method `_getRequiredSteps()` (add before `login()` method):

```javascript
/**
 * Get required authentication steps from plugins
 * @param {object} req - Express request
 * @param {object} user - User object
 * @param {array} completedSteps - Steps already completed
 * @returns {array} Array of { step, priority, data }
 */
static async _getRequiredSteps(req, user, completedSteps) {
    const context = {
        req,
        user,
        completedSteps,
        requiredSteps: []
    };
    const result = await global.HookManager.execute('authGetRequiredStepsHook', context);

    // Sort by priority (lower = first), filter already completed
    return result.requiredSteps
        .filter(s => !completedSteps.includes(s.step))
        .sort((a, b) => (a.priority || 100) - (b.priority || 100));
}
```

**Step 2.2:** Add helper method `_completeLogin()`:

```javascript
/**
 * Complete login - create session, return user
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {object} user - User object
 * @param {string} authMethod - Authentication method used
 * @param {number} startTime - Request start time for elapsed calculation
 */
static async _completeLogin(req, res, user, authMethod, startTime) {
    // Update login statistics
    await UserModel.updateById(user._id, {
        lastLogin: new Date(),
        loginCount: (user.loginCount || 0) + 1
    });

    // Build session data
    let sessionData = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        nickName: user.profile?.nickName || user.profile?.firstName,
        initials: (user.profile?.firstName?.charAt(0) || '?') +
                  (user.profile?.lastName?.charAt(0) || ''),
        roles: user.roles,
        preferences: user.preferences,
        isAuthenticated: true
    };

    // Hook: modify session data
    let sessionContext = { req, user, sessionData };
    sessionContext = await global.HookManager.execute('authBeforeSessionCreateHook', sessionContext);

    // Hook: get non-blocking warnings
    const warningContext = { req, user, warnings: [] };
    const warningResult = await global.HookManager.execute('authGetLoginWarningsHook', warningContext);

    // Create session
    req.session.user = sessionContext.sessionData;
    delete req.session.pendingAuth;

    // Hook: post-login
    await global.HookManager.execute('authAfterLoginSuccessHook', {
        req, user, session: req.session.user, authMethod
    });

    const elapsed = Date.now() - startTime;
    global.LogController.logInfo(req, 'auth.login', `success: ${user.username} logged in via ${authMethod}, completed in ${elapsed}ms`);

    const message = global.i18n.translate(req, 'controller.auth.loginSuccess');
    return res.json({
        success: true,
        nextStep: null,
        data: { user: req.session.user },
        warnings: warningResult.warnings,
        message,
        elapsed
    });
}
```

**Step 2.3:** Refactor `login()` method to handle multi-step flow:

Replace the entire `login()` method body with the new multi-step implementation. Key changes:
- Parse `step` from request body (default: 'credentials')
- Handle 'credentials' step: validate user, check for required steps
- Handle subsequent steps: validate pending auth, execute step, check for more steps
- Call `_completeLogin()` when all steps done

**Step 2.4:** Remove `authAfterPasswordValidationHook` call (replaced by `authGetRequiredStepsHook`)

---

### Phase 3: MFA Plugin Update (~1.5h)

**File:** `plugins/auth-mfa/webapp/controller/mfaAuth.js`

**Step 3.1:** Update static hooks declaration:

```javascript
// Replace existing hooks with:
static hooks = {
    authGetRequiredStepsHook: { priority: 100 },
    authExecuteStepHook: { priority: 100 }
};
```

**Step 3.2:** Add `authGetRequiredStepsHook` handler:

```javascript
/**
 * Hook: Check if MFA is required for this user
 */
static async authGetRequiredStepsHook(context) {
    const { user, requiredSteps } = context;

    try {
        // Check if user has MFA enabled
        if (user.mfa?.enabled) {
            // Check if not locked
            if (user.mfa.lockedUntil && new Date() < new Date(user.mfa.lockedUntil)) {
                // User is locked - still require MFA step (will fail with lock message)
            }

            requiredSteps.push({
                step: 'mfa',
                priority: 100,
                data: {
                    mfaMethod: user.mfa.method || 'totp'
                }
            });
        }
    } catch (error) {
        global.LogController?.logError(context.req, 'mfaAuth.authGetRequiredStepsHook',
            `Error checking MFA requirement: ${error.message}`);
    }

    return context;
}
```

**Step 3.3:** Add `authExecuteStepHook` handler:

```javascript
/**
 * Hook: Validate MFA code
 */
static async authExecuteStepHook(context) {
    const { step, stepData, pending } = context;

    // Only handle 'mfa' step
    if (step !== 'mfa') {
        return context;
    }

    try {
        const { code } = stepData;

        if (!code) {
            context.valid = false;
            context.error = 'MFA code required';
            return context;
        }

        const user = await global.UserModel.findById(pending.userId);

        // Check if locked
        if (user.mfa?.lockedUntil && new Date() < new Date(user.mfa.lockedUntil)) {
            context.valid = false;
            context.error = 'Account is temporarily locked due to failed MFA attempts';
            return context;
        }

        // Verify TOTP code
        const secret = MfaAuthModel.getDecryptedSecret(user);
        const isValid = authenticator.verify({ token: code, secret });

        if (isValid) {
            await MfaAuthModel.recordSuccess(user._id);
            context.valid = true;
        } else {
            await MfaAuthModel.recordFailure(user._id);
            context.valid = false;
            context.error = 'Invalid MFA code';
        }

    } catch (error) {
        global.LogController?.logError(context.req, 'mfaAuth.authExecuteStepHook',
            `Error validating MFA: ${error.message}`);
        context.valid = false;
        context.error = 'MFA verification failed';
    }

    return context;
}
```

**Step 3.4:** Remove old MFA verification methods:
- Remove or deprecate `apiVerify` (standalone MFA endpoint)
- Remove `authAfterPasswordValidationHook` handler
- Remove old session creation code

---

### Phase 4: Client Updates (~1h)

**File:** `webapp/view/auth/login.shtml`

**Step 4.1:** Update login form submission to include `step`:

```javascript
// In handleLogin() function:
const response = await jPulse.api.post('/api/1/auth/login', {
    step: 'credentials',
    username: username,
    password: password
});
```

**Step 4.2:** Handle `nextStep` response:

```javascript
if (response.success) {
    if (response.nextStep) {
        // Redirect to step-specific page
        if (response.nextStep === 'mfa') {
            window.location.href = '/auth/mfa-verify';
        } else if (response.nextStep === 'email-verify') {
            window.location.href = '/auth/email-verify';
        }
        // Add more step handlers as needed
    } else {
        // Login complete - redirect to home or returnUrl
        window.location.href = returnUrl || '/';
    }
}
```

**Step 4.3:** Handle warnings:

```javascript
if (response.warnings && response.warnings.length > 0) {
    response.warnings.forEach(w => {
        jPulse.UI.toast.warning(w.message);
    });
}
```

---

### Phase 5: MFA Verify Page Update (~30m)

**File:** `plugins/auth-mfa/webapp/view/auth/mfa-verify.shtml`

**Step 5.1:** Update form submission to use new API format:

```javascript
const response = await jPulse.api.post('/api/1/auth/login', {
    step: 'mfa',
    code: mfaCode
});
```

**Step 5.2:** Handle response:

```javascript
if (response.success) {
    if (response.nextStep) {
        // More steps needed (unlikely after MFA, but handle it)
        window.location.href = `/auth/${response.nextStep}`;
    } else {
        // Login complete
        window.location.href = returnUrl || '/';
    }
} else {
    // Show error
    jPulse.UI.toast.error(response.error || 'MFA verification failed');
}
```

---

### Phase 6: Testing (~1h)

**Test Cases:**

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Simple login (no MFA) | Login succeeds, no nextStep |
| 2 | Login with MFA enabled | First response has `nextStep: 'mfa'` |
| 3 | MFA code submission | Login completes after valid code |
| 4 | Invalid MFA code | Error returned, can retry |
| 5 | Step timeout (>5 min) | `AUTH_EXPIRED` error |
| 6 | Submit wrong step | `INVALID_STEP` error |
| 7 | Submit step without credentials | `NO_PENDING_AUTH` error |
| 8 | Locked account MFA | `Account locked` error |
| 9 | Non-blocking warning | Login succeeds with warnings array |

**Manual Test Flow:**

```bash
# Test 1: Simple login
curl -X POST http://localhost:8080/api/1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"step":"credentials","username":"testuser","password":"testpass"}'

# Test 2: MFA required (user with MFA enabled)
curl -X POST http://localhost:8080/api/1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"step":"credentials","username":"mfauser","password":"testpass"}'
# Should return: {"success":true,"nextStep":"mfa","mfaMethod":"totp"}

# Test 3: MFA code submission
curl -X POST http://localhost:8080/api/1/auth/login \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"step":"mfa","code":"123456"}'
```

---

### Phase 7: Documentation (~30m)

**Files to update:**
- `docs/api-reference.md` - Document new login flow with steps
- `docs/plugins/plugin-hooks.md` - Add new hooks
- `docs/CHANGELOG.md` - Release notes

---

### Implementation Checklist

```
[x] Phase 1: Hook Manager
    [x] 1.1 Add authGetRequiredStepsHook
    [x] 1.2 Add authExecuteStepHook
    [x] 1.3 Add authGetLoginWarningsHook

[x] Phase 2: Auth Controller
    [x] 2.1 Add _getRequiredSteps() helper
    [x] 2.2 Add _completeLogin() helper
    [x] 2.3 Refactor login() for multi-step
    [x] 2.4 Remove authAfterPasswordValidationHook usage

[x] Phase 3: MFA Plugin
    [x] 3.1 Update hooks declaration
    [x] 3.2 Add authGetRequiredStepsHook handler
    [x] 3.3 Add authExecuteStepHook handler
    [x] 3.4 Remove old apiVerify flow
    [x] 3.5 Add authGetLoginWarningsHook for MFA policy nag

[x] Phase 4: Login Page
    [x] 4.1 Add step to login request
    [x] 4.2 Handle nextStep response
    [x] 4.3 Handle warnings (via sessionStorage for post-redirect display)

[x] Phase 5: MFA Verify Page
    [x] 5.1 Update to use new API
    [x] 5.2 Handle response flow
    [x] 5.3 Support backup codes as alternative step (mfa-backup)

[x] Phase 6: Testing
    [x] Manual test cases pass
    [x] Unit tests for hook registration

[x] Phase 7: Documentation
    [x] API docs updated (docs/api-reference.md)
    [x] Hooks documented (docs/plugins/plugin-hooks.md)
```

---

### Tech Debt

| Item | Description | Priority |
|------|-------------|----------|
| MFA setup redirect | Option 3 (redirect to /auth/mfa-setup.shtml for policy-required MFA) is scaffolded in login.shtml but plugin uses warnings hook instead | Low |
| Integration tests | Manual testing only; no automated integration tests for multi-step flow | Medium |
| sessionStorage warnings | Warnings stored in sessionStorage need to be displayed by target page after redirect | Low |

---

## Phase 8: Hook Simplification (Pending)

### Overview

Simplify the plugin hooks API from 24 hooks to 12, improving developer experience ("don't make me think" principle).

### Naming Convention

**Pattern:** `onBucketAction`

```javascript
class MyPluginController {
    // Self-documenting as event handlers
    static hooks = {
        onAuthBeforeLogin: { priority: 50 },
        onAuthAfterLogin: {},
        onUserBeforeSave: {}
    };

    // Handler name = hook name
    static async onAuthBeforeLogin(ctx) {
        ctx.authMethod = 'ldap';
        return ctx;
    }

    static async onAuthAfterLogin(ctx) {
        console.log(`${ctx.user.username} logged in`);
        return ctx;
    }

    static async onUserBeforeSave(ctx) {
        ctx.userData.updatedBy = 'my-plugin';
        return ctx;
    }
}
```

**Benefits:**
- `on` prefix is universally understood (DOM, React, Node events)
- Self-documenting as event handlers
- Consistent: declaration name = handler name
- Cleaner: `onAuthBeforeLogin` vs old `authBeforeLoginHook`

---

### Migration Table: Old → New (24 → 12)

#### Auth Hooks (10 → 7)

| Old Hook | New Hook | Notes |
|----------|----------|-------|
| `authBeforeLoginHook` | `onAuthBeforeLogin` | Combines with authGetProviderHook |
| `authGetProviderHook` | `onAuthBeforeLogin` | Merged (set `ctx.authMethod`) |
| `authBeforeSessionCreateHook` | `onAuthBeforeSession` | Renamed |
| `authAfterLoginSuccessHook` | `onAuthAfterLogin` | Renamed |
| `authOnLoginFailureHook` | `onAuthFailure` | Renamed |
| `authBeforeLogoutHook` | *(removed)* | Rarely used |
| `authAfterLogoutHook` | *(removed)* | Rarely used |
| `authGetRequiredStepsHook` | `onAuthGetSteps` | Renamed (W-109) |
| `authExecuteStepHook` | `onAuthValidateStep` | Renamed (W-109) |
| `authGetLoginWarningsHook` | `onAuthGetWarnings` | Renamed (W-109) |

#### User Hooks (11 → 5)

| Old Hook | New Hook | Notes |
|----------|----------|-------|
| `userBeforeSignupHook` | `onUserBeforeSave` | Merged (check `ctx.isSignup`) |
| `userAfterSignupValidationHook` | `onUserAfterSave` | Merged (check `ctx.wasSignup`) |
| `userBeforeCreateHook` | `onUserBeforeSave` | Merged (check `ctx.isCreate`) |
| `userAfterCreateHook` | `onUserAfterSave` | Merged (check `ctx.wasCreate`) |
| `userOnSignupCompleteHook` | `onUserAfterSave` | Merged |
| `userBeforeSaveHook` | `onUserBeforeSave` | Renamed |
| `userAfterSaveHook` | `onUserAfterSave` | Renamed |
| `userBeforeDeleteHook` | `onUserBeforeDelete` | Renamed |
| `userAfterDeleteHook` | `onUserAfterDelete` | Renamed |
| `userMapExternalProfileHook` | `onUserSyncProfile` | Merged |
| `userSyncExternalProfileHook` | `onUserSyncProfile` | Merged |

---

### Context Objects

**Naming convention:**
- `user` = Full User document from database (read)
- `userData` = Data being saved (may be partial, write)

#### Auth Hooks

```javascript
// onAuthBeforeLogin - Before credential validation
{
    req,                    // Express request
    identifier,             // Username or email
    password,               // Password (for internal auth)
    captchaToken,           // Optional captcha token
    skipPasswordCheck,      // Set true for external auth (LDAP/OAuth)
    user,                   // Set if external auth provides user
    authMethod              // 'internal', 'ldap', 'oauth2', etc.
}

// onAuthBeforeSession - Before session creation
{
    req,
    user,                   // Authenticated user (full document)
    sessionData             // Session data to be stored
}

// onAuthAfterLogin - After successful login
{
    req,
    user,                   // Authenticated user (full document)
    session,                // Created session object
    authMethod              // How user authenticated
}

// onAuthFailure - On login failure
{
    req,
    identifier,             // What was submitted
    reason                  // 'INVALID_CREDENTIALS', 'ACCOUNT_LOCKED', etc.
}

// onAuthGetSteps - Get required login steps (W-109)
{
    req,
    user,                   // Authenticated user
    completedSteps,         // Steps already completed
    requiredSteps           // Array to push required steps into
}

// onAuthValidateStep - Validate a login step (W-109)
{
    req,
    user,                   // Authenticated user
    step,                   // Step name ('mfa', 'email-verify', etc.)
    stepData,               // Data submitted for this step
    pending,                // Pending auth state
    valid,                  // Set true if step passes
    error                   // Set error message if step fails
}

// onAuthGetWarnings - Get non-blocking warnings (W-109)
{
    req,
    user,                   // Authenticated user
    warnings                // Array to push warnings into
}
```

#### User Hooks

```javascript
// onUserBeforeSave - Before user create/update
{
    req,
    userData,               // Data being saved (may be partial)
    isCreate,               // true if new user
    isSignup                // true if via signup flow
}

// onUserAfterSave - After user create/update
{
    req,
    user,                   // Saved user (full document)
    wasCreate,              // true if was new user
    wasSignup               // true if was via signup flow
}

// onUserBeforeDelete - Before user deletion (can cancel)
{
    req,
    user                    // User being deleted (full document)
}
// Return false to cancel deletion

// onUserAfterDelete - After user deletion
{
    req,
    user                    // Deleted user (copy of document)
}

// onUserSyncProfile - Sync external profile data
{
    req,
    user,                   // Local user (full document)
    externalProfile,        // Profile from external provider
    provider                // 'ldap', 'oauth2', 'google', etc.
}
```

---

### Implementation Checklist

```
[ ] Phase 8.1: Framework Changes
    [ ] Update hook-manager.js with new hook definitions
    [ ] Add backward compatibility aliases (old → new)
    [ ] Update auth.js to use new hook names
    [ ] Update user.js to use new hook names
    [ ] Update model/user.js to use new hook names

[ ] Phase 8.2: Plugin Updates
    [ ] Update auth-mfa plugin hooks
    [ ] Update hello-world plugin hooks

[ ] Phase 8.3: Tests
    [ ] Update hook-manager.test.js
    [ ] Update auth-controller.test.js
    [ ] Update site-controller-registry.test.js
    [ ] Update user tests

[ ] Phase 8.4: Documentation
    [ ] Update docs/plugins/plugin-hooks.md
    [ ] Update docs/CHANGELOG.md
    [ ] Add migration guide
```

---

### Effort Estimate

| Task | Files | Estimate |
|------|-------|----------|
| Define new hooks | hook-manager.js | 30m |
| Update auth.js | auth.js | 1h |
| Update user.js | user.js, model/user.js | 1h |
| Update MFA plugin | mfaAuth.js | 1h |
| Update hello-world plugin | helloPlugin.js | 30m |
| Update tests | 5+ test files | 2h |
| Update docs | plugin-hooks.md, CHANGELOG | 1h |
| Manual testing | Login flows, MFA | 1h |
| Buffer | | 1h |
| **TOTAL** | | **~9h** |

---

### Release Plan

```
v1.3.10-checkpoint  ← Framework with 24 hooks (current implementation)
v0.5.0-checkpoint   ← auth-mfa plugin with 24 hooks

    ↓ Phase 8 refactor (~9h)

v1.3.10             ← Framework with 12 simplified hooks
v1.0.0              ← auth-mfa plugin with simplified hooks
```

---

### Backward Compatibility

**Breaking Changes:**
- `authAfterPasswordValidationHook` is deprecated (replaced by `onAuthGetSteps`)
- Old MFA `apiVerify` endpoint behavior changes
- All 24 old hook names replaced with 12 new names

**Migration for existing MFA plugin users:**
- MFA will continue to work after plugin update
- No user-facing changes required

---

### Rollback Plan

If issues arise:
1. Revert auth.js to previous version
2. Revert hook-manager.js changes
3. Keep old MFA plugin version

The changes are isolated to the login flow and can be reverted independently

---

## Code Examples

### Auth Controller (Core)

```javascript
/**
 * Multi-step login handler
 * POST /api/1/auth/login
 */
static async login(req, res) {
    const startTime = Date.now();
    const { step = 'credentials', ...stepData } = req.body;

    try {
        let pending = req.session.pendingAuth;

        // Step: credentials (always first)
        if (step === 'credentials') {
            const { username, password, captchaToken } = stepData;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Username and password required',
                    code: 'MISSING_CREDENTIALS'
                });
            }

            // Pre-login hook (captcha, LDAP, OAuth prep)
            let beforeContext = {
                req,
                identifier: username,
                password,
                captchaToken,
                skipPasswordCheck: false,
                user: null,
                authMethod: 'internal'
            };
            beforeContext = await global.HookManager.execute('authBeforeLoginHook', beforeContext);

            // Authenticate
            let user;
            if (beforeContext.skipPasswordCheck && beforeContext.user) {
                user = beforeContext.user;
            } else {
                user = await UserModel.authenticate(username, password);
            }

            if (!user) {
                await global.HookManager.execute('authOnLoginFailureHook', {
                    req, identifier: username, reason: 'INVALID_CREDENTIALS'
                });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Check account status
            if (user.status === 'locked') {
                return res.status(403).json({
                    success: false,
                    error: 'Account is locked',
                    code: 'ACCOUNT_LOCKED'
                });
            }

            if (user.status === 'disabled') {
                return res.status(403).json({
                    success: false,
                    error: 'Account is disabled',
                    code: 'ACCOUNT_DISABLED'
                });
            }

            // Initialize pending auth
            pending = {
                userId: user._id.toString(),
                username: user.username,
                authMethod: beforeContext.authMethod,
                completedSteps: ['credentials'],
                createdAt: Date.now()
            };

            // Get required steps from plugins
            const requiredSteps = await this._getRequiredSteps(req, user, pending.completedSteps);

            if (requiredSteps.length > 0) {
                const nextStep = requiredSteps[0];
                pending.requiredSteps = ['credentials', ...requiredSteps.map(s => s.step)];
                req.session.pendingAuth = pending;

                return res.json({
                    success: true,
                    nextStep: nextStep.step,
                    ...nextStep.data
                });
            }

            // No additional steps - complete login
            return await this._completeLogin(req, res, user, beforeContext.authMethod);
        }

        // Subsequent steps: validate pending auth
        if (!pending) {
            return res.status(400).json({
                success: false,
                error: 'No pending authentication',
                code: 'NO_PENDING_AUTH'
            });
        }

        // Check timeout (5 minutes)
        if (Date.now() - pending.createdAt > 5 * 60 * 1000) {
            delete req.session.pendingAuth;
            return res.status(400).json({
                success: false,
                error: 'Authentication expired',
                code: 'AUTH_EXPIRED'
            });
        }

        // Validate step is expected
        const remainingSteps = pending.requiredSteps.filter(
            s => !pending.completedSteps.includes(s)
        );
        if (remainingSteps[0] !== step) {
            return res.status(400).json({
                success: false,
                error: `Unexpected step: ${step}`,
                code: 'INVALID_STEP'
            });
        }

        // Execute step via hook
        const stepContext = {
            req,
            step,
            stepData,
            pending,
            valid: false,
            error: null
        };
        const result = await global.HookManager.execute('authExecuteStep', stepContext);

        if (!result.valid) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Step validation failed',
                code: 'STEP_FAILED'
            });
        }

        // Mark step complete
        pending.completedSteps.push(step);

        // Check if more steps needed
        const user = await UserModel.findById(pending.userId);
        const requiredSteps = await this._getRequiredSteps(req, user, pending.completedSteps);

        if (requiredSteps.length > 0) {
            const nextStep = requiredSteps[0];
            pending.requiredSteps = [...pending.completedSteps, ...requiredSteps.map(s => s.step)];
            req.session.pendingAuth = pending;

            return res.json({
                success: true,
                nextStep: nextStep.step,
                ...nextStep.data
            });
        }

        // All steps complete
        return await this._completeLogin(req, res, user, pending.authMethod);

    } catch (error) {
        LogController.logError(req, 'auth.login', `error: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: 'Login failed',
            code: 'INTERNAL_ERROR'
        });
    }
}

/**
 * Get required steps from all plugins
 */
static async _getRequiredSteps(req, user, completedSteps) {
    const context = {
        req,
        user,
        completedSteps,
        requiredSteps: []
    };
    const result = await global.HookManager.execute('authGetRequiredSteps', context);

    // Sort by priority, filter already completed
    return result.requiredSteps
        .filter(s => !completedSteps.includes(s.step))
        .sort((a, b) => (a.priority || 100) - (b.priority || 100));
}

/**
 * Complete login - create session
 */
static async _completeLogin(req, res, user, authMethod) {
    // Update login stats
    await UserModel.updateById(user._id, {
        lastLogin: new Date(),
        loginCount: (user.loginCount || 0) + 1
    });

    // Build session data
    let sessionData = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        nickName: user.profile?.nickName || user.profile?.firstName,
        initials: (user.profile?.firstName?.charAt(0) || '?') +
                  (user.profile?.lastName?.charAt(0) || ''),
        roles: user.roles,
        preferences: user.preferences,
        isAuthenticated: true
    };

    // Hook: modify session data
    let sessionContext = { req, user, sessionData };
    sessionContext = await global.HookManager.execute('authBeforeSessionCreateHook', sessionContext);

    // Get warnings (non-blocking)
    const warningContext = { req, user, warnings: [] };
    const warningResult = await global.HookManager.execute('authGetLoginWarnings', warningContext);

    // Create session
    req.session.user = sessionContext.sessionData;
    delete req.session.pendingAuth;

    // Post-login hook
    await global.HookManager.execute('authAfterLoginSuccessHook', {
        req, user, session: req.session.user, authMethod
    });

    LogController.logInfo(req, 'auth.login', `success: ${user.username} logged in via ${authMethod}`);

    return res.json({
        success: true,
        nextStep: null,
        user: sessionContext.sessionData,
        warnings: warningResult.warnings
    });
}
```

### MFA Plugin Hooks

```javascript
// In plugins/auth-mfa/webapp/controller/mfaAuth.js

static hooks = {
    authGetRequiredSteps: { priority: 100 },
    authExecuteStep: { priority: 100 }
};

/**
 * Check if MFA is required for this user
 */
static async authGetRequiredSteps(context) {
    const { user, requiredSteps } = context;

    // Check if MFA is enabled for this user
    if (user.mfa?.enabled) {
        requiredSteps.push({
            step: 'mfa',
            priority: 100,
            data: {
                mfaMethod: user.mfa.method || 'totp'
            }
        });
    }

    return context;
}

/**
 * Validate MFA code
 */
static async authExecuteStep(context) {
    const { step, stepData, pending } = context;

    // Only handle MFA step
    if (step !== 'mfa') {
        return context;
    }

    try {
        const { code } = stepData;

        if (!code) {
            context.valid = false;
            context.error = 'MFA code required';
            return context;
        }

        const user = await UserModel.findById(pending.userId);

        // Check if locked
        if (user.mfa?.lockedUntil && new Date() < new Date(user.mfa.lockedUntil)) {
            context.valid = false;
            context.error = 'Account is temporarily locked due to failed MFA attempts';
            return context;
        }

        // Verify TOTP code
        const secret = MfaAuthModel.getDecryptedSecret(user);
        const isValid = authenticator.verify({ token: code, secret });

        if (isValid) {
            // Record success
            await MfaAuthModel.recordSuccess(user._id);
            context.valid = true;
        } else {
            // Record failure
            await MfaAuthModel.recordFailure(user._id);
            context.valid = false;
            context.error = 'Invalid MFA code';
        }

    } catch (error) {
        context.valid = false;
        context.error = 'MFA verification failed';
    }

    return context;
}
```

---

## Files Affected

### Framework (jpulse-framework)

| File | Changes |
|------|---------|
| `webapp/controller/auth.js` | Refactor login(), add helpers |
| `webapp/utils/hook-manager.js` | Register new hooks |
| `webapp/view/auth/login.shtml` | Handle nextStep responses |

### MFA Plugin (auth-mfa)

| File | Changes |
|------|---------|
| `webapp/controller/mfaAuth.js` | Add new hooks, remove old flow |
| `webapp/view/auth/mfa-verify.shtml` | Update to use new API |

---

## Step Priority Guidelines

| Priority | Step Type | Examples |
|----------|-----------|----------|
| 5-10 | Selection | Tenant/role selection |
| 10-20 | Security (forced) | Password change (expired) |
| 50 | Verification | Email verification |
| 100 | 2FA | MFA, SMS verification |
| 200 | Legal | Terms acceptance |

Lower priority = runs first.

---

## Estimated Effort

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Core login refactor | ~3h |
| 2 | Hook manager updates | ~1h |
| 3 | MFA plugin update | ~2h |
| 4 | Client updates | ~1h |
| 5 | Step pages | ~1h |
| 6 | Testing | ~1h |
| **Total** | | **~9h** |

---

## Related Work Items

- **W-045:** Plugin Tech Debt (hooks, routes)
- **W-105:** Plugin Hooks System
- **W-108:** Auth MFA Plugin
- **W-0:** Auth with OAuth2 (future)
- **W-0:** Auth with LDAP (future)
- **W-0:** Auth email verification (future)

---

**Last Updated:** 2025-12-08

