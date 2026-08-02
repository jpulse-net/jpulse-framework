# jPulse Docs / Plugins / Plugin Hooks v1.7.7

Extend jPulse Framework behavior by hooking into authentication, user management, and other framework events.

## Overview

Plugin hooks allow your plugin to:
- **Intercept** framework operations (login, signup, user save)
- **Modify** data before it's processed or saved
- **React** to events (after login success, after user creation)
- **Cancel** operations based on custom validation
- **Integrate** external systems (LDAP, OAuth2, MFA providers)

## Naming Convention

Hooks follow the simplified `onBucketAction` pattern:

| Pattern | Examples | Description |
|---------|----------|-------------|
| `onAuth*` | `onAuthBeforeLogin`, `onAuthAfterLogin` | Authentication lifecycle |
| `onUser*` | `onUserBeforeSave`, `onUserAfterSave` | User lifecycle |

## Quick Start

### 1. Declare Hooks in Your Controller

```javascript
class MyPluginController {
    // Declare which hooks your plugin implements
    static hooks = {
        onAuthBeforeLogin: { priority: 50 },  // Run early (lower = earlier)
        onUserAfterSave: {}                   // Default priority 100
    };

    // Implement the hook handler (method name = hook name)
    static async onAuthBeforeLogin(context) {
        // Modify context or perform actions
        context.authMethod = 'my-plugin';
        return context;
    }

    static async onUserAfterSave(context) {
        // React to user creation (e.g., send welcome email)
        if (context.wasCreate) {
            console.log(`New user created: ${context.user.username}`);
        }
        return context;
    }
}
```

### 2. Auto-Registration

That's it! The framework automatically:
1. Discovers your `static hooks` declaration during bootstrap
2. Registers each hook with the HookManager
3. Calls your handlers at the appropriate points

No manual registration required.

## Hook Declaration Format

```javascript
static hooks = {
    hookName: { handler?, priority? }
};
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `handler` | string | hook name | Method name to call (defaults to the hook name) |
| `priority` | number | 100 | Execution order (lower = earlier) |

### Examples

```javascript
static hooks = {
    // Minimal: method name = hook name, priority = 100
    onAuthAfterLogin: {},

    // Custom priority (runs before default handlers)
    onAuthBeforeLogin: { priority: 50 },

    // Custom handler method name
    onUserBeforeSave: { handler: 'validateUserData', priority: 75 }
};
```

## Hook Handler Patterns

### Modify Context

```javascript
static async onAuthBeforeSession(context) {
    // Add custom data to session
    context.sessionData.myPlugin = { enabled: true };
    return context;  // Always return context
}
```

### Cancel Operation

```javascript
static async onUserBeforeSave(context) {
    if (context.userData.email?.endsWith('@blocked.com')) {
        return false;  // Cancel user save
    }
    return context;
}
```

### React to Events (No Modification)

```javascript
static async onAuthAfterLogin(context) {
    // Log to external system
    await ExternalAuditService.logLogin(context.user.username);
    return context;  // Return unchanged
}
```

### External Authentication (Skip Password Check)

```javascript
static async onAuthBeforeLogin(context) {
    // Check if user should authenticate via LDAP
    if (await this.isLdapUser(context.identifier)) {
        const ldapUser = await this.authenticateWithLdap(
            context.identifier,
            context.password
        );
        if (ldapUser) {
            context.skipPasswordCheck = true;
            context.user = ldapUser;
            context.authMethod = 'ldap';
        }
    }
    return context;
}
```

Unlike `completeExternalAuth()` (see "External Login Providers (OAuth / LDAP / SAML -
Browser Redirect)" below, which does NOT gate on `user.status`), `context.user`'s account status
IS enforced automatically by the framework for this `skipPasswordCheck` path - `login()` runs the
same status check against `context.user` that it runs for internal password logins, right after
this hook returns. Your handler does not need to (and should not) duplicate that check itself.

## Available Hooks

### Authentication Hooks

%DYNAMIC{plugins-hooks-list-table namespace="onAuth"}%

Total: %DYNAMIC{plugins-hooks-count namespace="onAuth"}% hooks

<!-- Plugin hooks as of v1.3.10: (above dynamic list shows the current list)
| Hook | Context | Can Modify | Can Cancel | Description |
|------|---------|------------|------------|-------------|
| `onAuthBeforeLogin` | `{ req, identifier, password, captchaToken, skipPasswordCheck, user, authMethod }` | ✅ | ❌ | Before credential validation - external auth (LDAP/OAuth), captcha |
| `onAuthBeforeSession` | `{ req, user, sessionData }` | ✅ | ❌ | Before session is created - add data to session |
| `onAuthAfterLogin` | `{ req, user, session, authMethod }` | ❌ | ❌ | After successful login - audit logging, notifications |
| `onAuthFailure` | `{ req, identifier, reason }` | ❌ | ❌ | On login failure - rate limiting, lockout |
| `onAuthGetSteps` | `{ req, user, completedSteps, requiredSteps }` | ✅ | ❌ | Get required login steps (MFA, email verify, etc.) |
| `onAuthValidateStep` | `{ req, user, step, stepData, pending, valid, error }` | ✅ | ❌ | Execute and validate a specific login step |
| `onAuthGetWarnings` | `{ req, user, warnings }` | ✅ | ❌ | Get non-blocking login warnings (nag messages) |
-->

### User Lifecycle Hooks

%DYNAMIC{plugins-hooks-list-table namespace="onUser"}%

Total: %DYNAMIC{plugins-hooks-count namespace="onUser"}% hooks

<!-- Plugin hooks as of v1.3.10: (above dynamic list shows the current list)
| Hook | Context | Can Modify | Can Cancel | Description |
|------|---------|------------|------------|-------------|
| `onUserBeforeSave` | `{ req, userData, isCreate, isSignup }` | ✅ | ✅ | Before user create/update - validation, modification |
| `onUserAfterSave` | `{ req, user, wasCreate, wasSignup }` | ❌ | ❌ | After user create/update - notifications, sync |
| `onUserBeforeDelete` | `{ req, user }` | ❌ | ✅ | Before user deletion - can cancel |
| `onUserAfterDelete` | `{ req, user }` | ❌ | ❌ | After user deletion - cleanup, audit |
| `onUserSyncProfile` | `{ req, user, externalProfile, provider }` | ✅ | ❌ | Sync external profile data (LDAP/OAuth) |
-->

### Plugin Config Hooks

%DYNAMIC{plugins-hooks-list-table namespace="onPluginConfig"}%

Total: %DYNAMIC{plugins-hooks-count namespace="onPluginConfig"}% hooks

<!-- Plugin hooks as of v1.7.4: (above dynamic list shows the current list)
| Hook | Context | Can Modify | Can Cancel | Description |
|------|---------|------------|------------|-------------|
| `onPluginConfigBeforeSave` | `{ req, pluginName, configData, oldConfig }` | ✅ | ✅ | Before a plugin config save is persisted - transform/encrypt values |
-->

**Important - this hook's "Can Cancel" works differently than every other hook above:** for
every other `canCancel` hook, cancelling means the handler *returns* `false`. For
`onPluginConfigBeforeSave`, cancelling means the handler *throws* - the error propagates and
aborts the save (400 response), instead of being logged and the save proceeding anyway. See
"Encrypting a Plugin Config Secret" below.

## Hook Execution

### Priority Order

Hooks are executed in priority order (lower numbers run first):

```
Priority 50:  plugin-a.onAuthBeforeLogin()
Priority 100: plugin-b.onAuthBeforeLogin()  (default)
Priority 150: plugin-c.onAuthBeforeLogin()
```

### Context Flow

Each handler receives the context from the previous handler:

```
context = { identifier: 'john', password: '***' }
    ↓
plugin-a modifies: context.authMethod = 'ldap'
    ↓
plugin-b receives: { identifier: 'john', password: '***', authMethod: 'ldap' }
    ↓
Final context returned to framework
```

### Error Handling

If a hook handler throws an error:
- The error is logged
- Execution continues with the next handler
- The framework operation proceeds with the last successful context

```javascript
static async onAuthAfterLogin(context) {
    try {
        await riskyOperation();
    } catch (error) {
        // Log error but don't break the login flow
        LogController.logError(context.req, 'myPlugin.hook', error.message);
    }
    return context;
}
```

## Common Use Cases

### OAuth2 / Social Login

```javascript
static hooks = {
    onAuthBeforeLogin: { priority: 50 },
    onUserSyncProfile: {}
};

static async onAuthBeforeLogin(context) {
    // Check for OAuth2 token in request
    const oauthToken = context.req.body.oauthToken;
    if (oauthToken) {
        const profile = await OAuth2Provider.validateToken(oauthToken);
        if (profile) {
            context.skipPasswordCheck = true;
            context.user = await this.findOrCreateUser(profile);
            context.authMethod = 'oauth2';
        }
    }
    return context;
}
```

### External Login Providers (OAuth / LDAP / SAML - Browser Redirect)

W-195 adds two framework primitives specifically for external-auth plugins that use a
browser-redirect flow (the user's browser navigates to the provider and back, rather than an
AJAX call): the `onAuthGetLoginProviders` hook to inject a button on the login page, and
`AuthController.completeExternalAuth()` to finish the login once your plugin has resolved a
local user.

```javascript
static hooks = {
    onAuthGetLoginProviders: {}
};

// Add a button to /auth/login.shtml - only called for that page, so this is cheap
// even on sites where your plugin's OAuth flow isn't currently in use
static async onAuthGetLoginProviders(context) {
    context.providers.push({
        label: 'Sign in with Acme SSO',
        icon: '🔑',
        initUrl: '/jpulse-plugins/auth-oauth/authorize?provider=acme',
        buttonColor: '#4285F4',
        order: 50  // lower = higher on the page; omit for default (100)
    });
    return context;
}
```

Your plugin's own controller (not a framework hook) handles the provider's callback -
exchange the code/assertion, find-or-create the local `User` document (setting
`hasLocalPassword: false` if you write a synthetic `passwordHash` - see below), then hand off
to the framework to finish the login:

```javascript
// e.g. GET /jpulse-plugins/auth-oauth/callback
static async apiCallback(req, res) {
    const user = await this.resolveOrCreateUser(req);  // your own logic
    const redirectUrl = req.query.redirect || '/';

    // Framework takes over from here: runs onAuthGetSteps (MFA, etc. - redirecting to each
    // step's `page` if any are pending), creates the session, and does the final 302.
    // Note: this is the res.redirect() counterpart to the AJAX login() flow's _completeLogin() -
    // never call req.session.* or _completeLoginSession() directly from a plugin.
    return AuthController.completeExternalAuth(req, res, user, 'acme-sso', redirectUrl);
}
```

`completeExternalAuth()` does not re-check `user.status` or `localAuthRestriction` (the latter
only governs the local username/password path) - your callback handler is responsible for
rejecting e.g. `status: 'pending'` users before calling it.

### Local Auth Restriction & `hasLocalPassword`

Two more W-195 primitives that matter once an external-auth plugin is installed:

- **`controller.auth.localAuthRestriction`** (`app.conf`) - site-wide policy for the local
  username/password login path (`'none'` | `'admins-only'` | `'disabled'`). It never affects
  external auth. Site admins set this once they trust their SSO provider is the primary sign-in
  method; end users can still reach the local form via `/auth/login.shtml?localFallback=1` for
  recovery (server-enforced, not just hidden UI). If no plugin registers
  `onAuthGetLoginProviders`, the bootstrap sequence downgrades `'disabled'` to `'admins-only'`
  to prevent locking everyone out - see `docs/deployment.md` (Break-Glass Account Runbook).
- **`hasLocalPassword`** (`User` schema, default `true`) - set to `false` by your plugin at
  JIT-user-creation time if you write a synthetic/unknown `passwordHash` for a user who only
  ever signs in externally. `UserController.changePassword()` and the settings page's Security
  panel read this flag to skip the (unsatisfiable) current-password check and show "Set
  Password" instead of "Change Password". It's reset to `true` automatically the first time the
  user successfully sets a local password.

### Multi-Factor Authentication (MFA)

Uses the multi-step authentication flow:

```javascript
static hooks = {
    onAuthGetSteps: { priority: 100 },
    onAuthValidateStep: { priority: 100 },
    onAuthGetWarnings: { priority: 100 }
};

// Check if MFA step is required for this user
static async onAuthGetSteps(context) {
    const { user, requiredSteps } = context;

    if (user.mfa?.enabled) {
        requiredSteps.push({
            step: 'mfa',
            priority: 100,
            data: { mfaMethod: user.mfa.method || 'totp' },
            // W-195: required for browser-redirect flows (see completeExternalAuth()) - the AJAX
            // login() flow doesn't need it, since the SPA already knows how to render each step
            page: '/auth/mfa-verify.shtml'
        });
    }
    return context;
}

// Validate MFA code when step is submitted
static async onAuthValidateStep(context) {
    const { step, stepData, user } = context;

    if (step !== 'mfa' && step !== 'mfa-backup') {
        return context;  // Not our step
    }

    const { code } = stepData;
    const isValid = await this.verifyTotpCode(user, code);

    context.valid = isValid;
    if (!isValid) {
        context.error = 'Invalid MFA code';
    }
    return context;
}

// Non-blocking warning if MFA policy requires but user hasn't enabled
static async onAuthGetWarnings(context) {
    const { user, warnings } = context;

    if (!user.mfa?.enabled && await this.isMfaRequired(user)) {
        warnings.push({
            type: 'mfa-not-enabled',
            message: 'Two-factor authentication is required. Please set up 2FA.',
            link: '/jpulse-plugins/auth-mfa.shtml'
        });
    }
    return context;
}
```

### Email Confirmation on Signup

```javascript
static hooks = {
    onUserBeforeSave: {},
    onUserAfterSave: {}
};

static async onUserBeforeSave(context) {
    if (context.isSignup) {
        // Set user status to pending until email confirmed
        context.userData.status = 'pending';
        context.userData.confirmationToken = generateToken();
    }
    return context;
}

static async onUserAfterSave(context) {
    if (context.wasSignup) {
        // Send confirmation email (async, non-blocking)
        setImmediate(async () => {
            await EmailService.sendConfirmation(
                context.user.email,
                context.user.confirmationToken
            );
        });
    }
    return context;
}
```

### Audit Logging

```javascript
static hooks = {
    onAuthAfterLogin: {},
    onAuthFailure: {},
    onUserAfterSave: {}
};

static async onAuthAfterLogin(context) {
    await AuditLog.record({
        event: 'LOGIN_SUCCESS',
        user: context.user.username,
        ip: context.req.ip,
        method: context.authMethod
    });
    return context;
}

static async onAuthFailure(context) {
    await AuditLog.record({
        event: 'LOGIN_FAILURE',
        identifier: context.identifier,
        ip: context.req.ip,
        reason: context.reason
    });
    return context;
}
```

### Encrypting a Plugin Config Secret

Use `onPluginConfigBeforeSave` in plugins with a `type: "custom"` config field (see
[Plugin API Reference](plugin-api-reference.md) "`type: "custom"`") whose value contains
something that must never be persisted as-is - most commonly a secret. It runs once, right
before the framework's generic "Save Changes" button persists a plugin's config, so a custom
renderer no longer needs its own separate save path just to get a chance to transform its value
first.

```javascript
static hooks = {
    onPluginConfigBeforeSave: {}
};

// context: { req, pluginName, configData, oldConfig }
static async onPluginConfigBeforeSave(context) {
    const { configData, oldConfig } = context;

    for (const provider of configData.providers || []) {
        if (!provider.clientSecret) {
            // Left blank in the form -> keep whatever was already persisted for this provider.
            const existing = oldConfig?.config?.providers?.find(p => p.id === provider.id);
            provider.clientSecretRef = existing?.clientSecretRef;
            delete provider.clientSecret;
            continue;
        }

        try {
            // Encrypt and store the secret, keep only a reference in configData.
            provider.clientSecretRef = await SecretStore.encrypt(provider.clientSecret);
        } catch (error) {
            // Throwing (not returning false) is what aborts the save for THIS hook - see below.
            throw new Error('Failed to encrypt client secret');
        }
        delete provider.clientSecret;
    }
    // No need to return context - configData is mutated in place and the framework re-reads it.
}
```

**This hook's cancel contract is different from every other hook on this page.** Elsewhere,
`canCancel: true` means "return `false`". Here, it means "throw" - a thrown error propagates
straight to `PluginController.updateConfig()`, which aborts the whole save with a 400
`CONFIG_SAVE_REJECTED` response (the admin sees your thrown message verbatim, so throw a
user-facing, non-sensitive message, never a raw crypto/library error). Returning `false` from
this hook has no special meaning and does not cancel the save.

`oldConfig` (the plugin's current, already-persisted config document, or `null` if none exists
yet) is what makes the common "leave the field blank to keep the existing secret" pattern
possible - without it, a handler can't tell "admin left this blank, keep the old value" apart
from "admin wants to clear it".

## Debugging Hooks

### Check Registered Hooks

```javascript
// In your plugin or via API
const stats = global.HookManager.getStats();
console.log(stats);
// { available: 12, registered: 5, hooksWithHandlers: 3 }

const registered = global.HookManager.getRegisteredHooks();
console.log(registered);
// { onAuthBeforeLogin: [{ plugin: 'my-plugin', priority: 50 }], ... }
```

### Dynamic Content for Documentation

Use these in your markdown documentation:

| Token | Description |
|-------|-------------|
| `%DYNAMIC{plugins-hooks-count}%` | Number of available hooks |
| `%DYNAMIC{plugins-hooks-list}%` | Bullet list of hooks |
| `%DYNAMIC{plugins-hooks-list-table}%` | Table with all hook details |
| `%DYNAMIC{plugins-hooks-list-table namespace="onAuth"}%` | Table filtered by namespace |

## Best Practices

1. **Always return context** - Even if you don't modify it
2. **Use try/catch** - Don't break framework operations with uncaught errors
3. **Log appropriately** - Use `LogController` with `context.req` for request context
4. **Choose priorities wisely** - Leave room for other plugins (use 50, 100, 150, not 1, 2, 3)
5. **Keep handlers fast** - Use `setImmediate()` for non-blocking async work
6. **Document your hooks** - Tell users which hooks your plugin implements

## See Also

- [Creating Plugins](creating-plugins.md) - Build your first plugin
- [Plugin Architecture](plugin-architecture.md) - How the plugin system works
- [Hello World Plugin](../installed-plugins/hello-world/README.md) - Working example with hooks
- [Deployment Guide](../deployment.md) - Break-Glass Account Runbook for `localAuthRestriction`
