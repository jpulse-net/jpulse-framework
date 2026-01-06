# jPulse Docs / Plugins / Plugin Hooks v1.4.6

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
            data: { mfaMethod: user.mfa.method || 'totp' }
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
