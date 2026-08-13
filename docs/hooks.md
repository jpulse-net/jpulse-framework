# jPulse Docs / Hooks v1.7.13

Named extension points that the framework, a site, or a plugin can **define**, and that any plugin or site controller can **handle**. Use them to intercept, modify, react to, or veto operations without patching framework code.

## Overview

Three roles, kept apart on purpose:

- A **producer** owns a hook: its name, when it fires, what the context carries, and what a thrown error does. The framework, a site controller, and a plugin are equal producers.
- A **consumer** registers a handler with `static hooks = { … }` on a controller. That syntax is unchanged.
- At runtime the producer **fires** the hook with `HookManager.execute()`, `executeFirst()`, or `executeForPlugin()`.

The framework ships authentication, user-lifecycle, plugin-config, and system-stats hooks. A site or plugin adds its own the same way — the framework never needs to learn a domain vocabulary.

## Naming Convention

Hooks follow the simplified `onBucketAction` pattern:

| Pattern | Examples | Description |
|---------|----------|-------------|
| `onAuth*` | `onAuthBeforeLogin`, `onAuthAfterLogin` | Authentication lifecycle |
| `onUser*` | `onUserBeforeSave`, `onUserAfterSave` | User lifecycle |

## Quick Start

### 1. Handle Hooks in Your Controller

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
1. Discovers your `static hooks` declaration during bootstrap (plugins *and* site controllers)
2. Registers each hook with the HookManager
3. Calls your handlers at the appropriate points

No manual registration required.

## Define Your Own Hooks

A site or plugin that fires an extension point **defines** it, so others can find it, the admin view can list it, and a thrown error can abort the producer when you say so.

```javascript
class AiCoreController {

    // hooks this controller DEFINES - the contract, for others to handle
    static hookDefinitions = {
        onAiProviderRegister: {
            description: 'Contribute a provider descriptor',
            contextKeys: ['providers'],
            canModify: true
        },
        onAiComplete: {
            description: 'Run one completion; return usage',
            mode: 'executeForPlugin',
            contextKeys: ['threadId', 'model', 'messages', 'tools'],
            onError: 'abort',
            canModify: true
        }
    };
}
```

Only `description` is required. `mode` defaults to `execute`; `onError` defaults to `continue` for `execute` / `executeFirst` and `abort` for `executeForPlugin`. Owner is stamped from the plugin name, or `'site'` for a site controller.

Then fire it:

```javascript
await global.HookManager.execute('onAiProviderRegister', { providers: [] });
await global.HookManager.executeForPlugin('onAiComplete', selectedProvider, ctx);
```

A handler registered before the definition exists is still registered; unmatched names show up once in the boot audit (with a did-you-mean) rather than as a warning per registration.

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

Throw an `Error` whose message is safe to show the user. Whether that abort the producer is declared on the hook as `onError: 'abort'` (Before hooks may veto; After hooks may not).

```javascript
static async onUserBeforeSave(context) {
    if (context.userData.email?.endsWith('@blocked.com')) {
        throw new Error('That email domain is not allowed');
    }
    return context;
}
```

Returning `false` does **not** cancel. A non-object return is ignored so it cannot overwrite the context.

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

`onPluginConfigBeforeSave` uses `mode: 'executeForPlugin'`, so a thrown error aborts the save with a 400 and the handler's message. That is the same throw-to-abort rule as every other `onError: 'abort'` hook, not a special case.

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

Each hook declares `onError`: `'continue'` (log and run the next handler — the default for `execute` / `executeFirst`) or `'abort'` (propagate to the producer — the default for `executeForPlugin`). A definition may override the default; `onUserBeforeSave` is `'abort'` so a handler can veto a user save.

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

Any `onAuthGetWarnings` toasts (e.g. an MFA-not-enabled nag) are carried across the final `302`
via `CommonUtils.appendToastsToUrl()` and shown automatically once the destination page loads -
you don't need to do anything extra for this in your callback handler.

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
[Plugin API Reference](plugins/plugin-api-reference.md) "`type: "custom"`") whose value contains
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
            throw new Error('Failed to encrypt client secret');
        }
        delete provider.clientSecret;
    }
    // No need to return context - configData is mutated in place and the framework re-reads it.
}
```

**Throw to abort.** A thrown error propagates to `PluginController.updateConfig()`, which aborts the save with a 400 `CONFIG_SAVE_REJECTED` response (the admin sees your message verbatim, so throw a user-facing, non-sensitive message). That is the same `onError: 'abort'` contract as `onUserBeforeSave` and any other veto hook.

`oldConfig` (the plugin's current, already-persisted config document, or `null` if none exists
yet) is what makes the common "leave the field blank to keep the existing secret" pattern
possible - without it, a handler can't tell "admin left this blank, keep the old value" apart
from "admin wants to clear it".

## Debugging Hooks

### Check Registered Hooks

```javascript
const hook = global.HookManager.getHook('onAiComplete');
// { name, defined, active, definition, handlers, unverified }

const audit = global.HookManager.getAudit();
// { defined, handlers, findings: [{ level, code, hookName, message, suggestion? }] }

const metrics = global.HookManager.getMetrics();
console.log(metrics.stats);
// { available, registered, hooksWithHandlers }
```

Admin UI: **Admin → Plugins** has a Hooks panel. API: `GET /api/1/hook` and `GET /api/1/hook/:name` (admin-only).

### Dynamic Content for Documentation

Use these in your markdown documentation:

| Token | Description |
|-------|-------------|
| `%DYNAMIC{plugins-hooks-count}%` | Number of available hooks |
| `%DYNAMIC{plugins-hooks-list}%` | Bullet list of hooks |
| `%DYNAMIC{plugins-hooks-list-table}%` | Table with all hook details |
| `%DYNAMIC{plugins-hooks-list-table namespace="onAuth"}%` | Table filtered by namespace |
| `%DYNAMIC{plugins-hooks-list-table owner="framework"}%` | Table filtered by owner |

## Best Practices

1. **Return a context object** - or mutate in place; non-object returns are ignored
2. **Throw to veto** - on an `onError: 'abort'` hook; on `'continue'` hooks, catch your own errors so one plugin cannot take down the rest
3. **Log appropriately** - Use `LogController` with `context.req` for request context
4. **Choose priorities wisely** - Leave room for other plugins (use 50, 100, 150, not 1, 2, 3)
5. **Keep handlers fast** - Use `setImmediate()` for non-blocking async work
6. **Define hooks you fire** - a one-line `static hookDefinitions` is enough for the catalog, the admin view, and the audit

## See Also

- [Creating Plugins](plugins/creating-plugins.md) - Build your first plugin
- [Plugin Architecture](plugins/plugin-architecture.md) - How the plugin system works
- [Hello World Plugin](installed-plugins/hello-world/README.md) - Working example with hooks
- [Deployment Guide](deployment.md) - Break-Glass Account Runbook for `localAuthRestriction`
