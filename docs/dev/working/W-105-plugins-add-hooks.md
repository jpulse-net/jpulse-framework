# W-105: plugins: add plugin hooks for authentication and user management

## Status
🚧 IN_PROGRESS

## Objective

Create the base infrastructure for authentication plugins by implementing a formal hook system that enables plugins to:
- Integrate external authentication providers (OAuth2, LDAP)
- Add multi-factor authentication (MFA)
- Customize user registration flow (email confirmation)
- Sync external profile data into user documents

## Related Work Items

- **W-045**: Plugin infrastructure (completed)
- **W-045-TD-10**: Hook System Enhancement (tech debt)
- **W-0**: auth with OAuth2 (pending)
- **W-0**: auth with LDAP (pending)
- **W-0**: MFA multi-factor authentication (pending)
- **W-0**: signup with email confirmation (pending)

## Current Flow Analysis

### AuthController.login() Flow:
```
1. Check if login is disabled
2. Validate credentials exist (identifier, password)
3. Call UserModel.authenticate(identifier, password)
4. Update login statistics (lastLogin, loginCount)
5. Create session with user data
6. Return success/failure response
```

### UserModel.authenticate() Flow:
```
1. Find user by username or email
2. Check if user is active (status === 'active')
3. Verify password with bcrypt
4. Return user (without passwordHash) or null
```

### UserController.signup() Flow:
```
1. Check if signup is disabled
2. Validate required fields
3. Validate password confirmation
4. Validate terms acceptance
5. Prepare user data
6. Call UserModel.create(userData)
7. Return success response
```

---

## Recommended Hook Categories

### 1. Authentication Hooks (AuthController)

| Hook Name | Location | Purpose | Use Case |
|-----------|----------|---------|----------|
| `authBeforeLoginHook` | Before `UserModel.authenticate()` | Intercept/modify credentials, enable external auth | LDAP: Try LDAP auth first; OAuth2: Redirect to provider |
| `authGetProviderHook` | During credential validation | Return auth provider name | LDAP/OAuth2: Return 'ldap', 'oauth2', or 'internal' based on user lookup |
| `authAfterPasswordValidationHook` | After password check, before session | MFA challenge point | MFA: Require 2FA code before session creation |
| `authBeforeSessionCreateHook` | Before `req.session.user = {...}` | Modify session data | OAuth2/LDAP: Add external profile data to session |
| `authAfterLoginSuccessHook` | After successful login | Post-login actions | All: Sync external attributes, log provider |
| `authOnLoginFailureHook` | On failed login | Failed login handling | All: Rate limiting, audit logging |
| `authBeforeLogoutHook` | Before `session.destroy()` | Pre-logout cleanup | OAuth2: Revoke tokens at provider |
| `authAfterLogoutHook` | After successful logout | Post-logout actions | All: Audit logging |

### 2. User Registration Hooks (UserController)

| Hook Name | Location | Purpose | Use Case |
|-----------|----------|---------|----------|
| `userBeforeSignupHook` | Before validation | Modify/validate signup data | Email confirm: Set status='pending' |
| `userAfterSignupValidationHook` | After validation, before create | Additional validation | LDAP: Check if user exists in LDAP |
| `userBeforeCreateHook` | Before `UserModel.create()` | Transform user data | OAuth2/LDAP: Splice external attributes |
| `userAfterCreateHook` | After successful creation | Post-create actions | Email confirm: Send confirmation email |
| `userOnSignupCompleteHook` | After signup response sent | Async post-signup | All: Welcome email, analytics |

### 3. User Profile Sync Hooks (for External Providers)

| Hook Name | Location | Purpose | Use Case |
|-----------|----------|---------|----------|
| `userSyncExternalProfileHook` | During login | Merge external attributes | LDAP: Sync LDAP attributes; OAuth2: Sync OAuth profile |
| `userMapExternalProfileHook` | Before sync | Map external fields to user schema | All: Map LDAP/OAuth fields to `user.profile.*` |

### 4. MFA-Specific Hooks

| Hook Name | Location | Purpose | Use Case |
|-----------|----------|---------|----------|
| `authRequireMfaHook` | After password validation | Check if MFA required | MFA: Return true if user has MFA enabled |
| `authOnMfaChallengeHook` | When MFA triggered | Issue MFA challenge | MFA: Send SMS code or show authenticator prompt |
| `authValidateMfaHook` | During MFA validation | Validate MFA code | MFA: Check TOTP or SMS code |
| `authOnMfaSuccessHook` | After successful MFA | MFA completion | MFA: Update last MFA timestamp |
| `authOnMfaFailureHook` | After failed MFA | Handle MFA failure | MFA: Lock account after X attempts |

### 5. Model Save Hooks (UserModel - Generic)

| Hook Name | Location | Purpose | Use Case |
|-----------|----------|---------|----------|
| `userBeforeSaveHook` | Before `create()` or `updateById()` | Transform/validate | All: Encrypt sensitive fields |
| `userAfterSaveHook` | After successful save | Post-save actions | LDAP: Sync back to LDAP if bidirectional |
| `userBeforeDeleteHook` | Before delete | Pre-delete validation | OAuth2: Revoke provider tokens |
| `userAfterDeleteHook` | After delete | Cleanup | All: Remove external provider links |

---

## Hook Execution Flow Examples

### OAuth2 Login Flow with Hooks:
```
1. authBeforeLoginHook()           → Detect OAuth2 callback, skip password auth
2. authGetProviderHook()           → Return 'oauth2' for OAuth users
3. userSyncExternalProfileHook()   → Merge OAuth profile into user
4. authBeforeSessionCreateHook()   → Add OAuth tokens to session
5. authAfterLoginSuccessHook()     → Log OAuth provider used
```

### LDAP Login Flow with Hooks:
```
1. authBeforeLoginHook()           → Try LDAP auth first
2. authGetProviderHook()           → Return 'ldap' if LDAP user
3. userSyncExternalProfileHook()   → Sync LDAP attributes to user
4. userBeforeCreateHook()          → Auto-create user if doesn't exist (JIT provisioning)
5. authBeforeSessionCreateHook()   → Add LDAP groups to session
```

### MFA Login Flow with Hooks:
```
1. authAfterPasswordValidationHook()→ Password correct, check MFA requirement
2. authRequireMfaHook()            → Return true if user has MFA enabled
3. authOnMfaChallengeHook()        → Send SMS or show authenticator prompt
4. authValidateMfaHook()           → Verify code entered by user
5. authOnMfaSuccessHook()          → Complete login, create session
   OR authOnMfaFailureHook()       → Handle failed MFA attempt
```

### Email Confirmation Signup Flow with Hooks:
```
1. userBeforeSignupHook()          → Set user.status = 'pending'
2. userAfterCreateHook()           → Generate confirmation token, send email
3. (later) userOnEmailConfirmedHook()→ Set user.status = 'active'
```

---

## Implementation Priority

### Phase 1 - Core Auth Hooks (Critical for OAuth2/LDAP/MFA):
- `authBeforeLoginHook`, `authAfterPasswordValidationHook`, `authBeforeSessionCreateHook`, `authAfterLoginSuccessHook`
- `authRequireMfaHook`, `authValidateMfaHook`, `authOnMfaSuccessHook`, `authOnMfaFailureHook`
- `userSyncExternalProfileHook`, `userMapExternalProfileHook`

### Phase 2 - User Lifecycle Hooks:
- `userBeforeSignupHook`, `userAfterCreateHook`, `userBeforeSaveHook`, `userAfterSaveHook`
- `authOnLoginFailureHook`, `authBeforeLogoutHook`, `authAfterLogoutHook`

### Phase 3 - Advanced Hooks:
- `authGetProviderHook`, `authOnMfaChallengeHook`
- `userBeforeDeleteHook`, `userAfterDeleteHook`

---

## Hook System Architecture

### Design Principles

1. **CamelCase everywhere** - No colon format, just camelCase hook names
2. **Auto-registration** - Plugins declare hooks in static `hooks` object, PluginManager auto-registers
3. **Method calls, not messages** - Hooks are direct function calls, not pub/sub messages
4. **Don't make me think** - Minimal boilerplate for plugin developers

### Plugin Hook Declaration (Simplified)

Plugins declare hooks in a static `hooks` object - no manual registration needed:

```javascript
// plugins/auth-ldap/webapp/controller/ldapAuth.js

class LdapAuthController {

    // Declare hooks - PluginManager auto-registers these
    // Format: hookName: { handler?, priority? } - all properties optional!
    static hooks = {
        authBeforeLoginHook: { priority: 50 },  // Priority 50, method = authBeforeLoginHook
        authBeforeSessionCreateHook: {},        // Default priority 100 & method name
        userSyncExternalProfileHook: {}         // Default priority 100 & method name
    };

    // Methods named same as hooks - the "Hook" suffix makes them obvious!
    static async authBeforeLoginHook(context) { ... }
    static async authBeforeSessionCreateHook(context) { ... }
    static async userSyncExternalProfileHook(context) { ... }
}
```

**Hook declaration format** - one format, all properties optional:
```javascript
static hooks = {
    someHook: {},                              // Defaults: priority 100, method = someHook
    someHook: { priority: 50 },                // Priority 50, method = someHook
    someHook: { handler: 'customMethod' },     // Priority 100, method = customMethod
    someHook: { handler: 'x', priority: 50 }   // Priority 50, method = x
};
```

**Defaults:**
- `priority`: 100 (lower = runs earlier)
- `handler`: hook name (e.g., `authBeforeLoginHook` → method `authBeforeLoginHook`)

**Naming convention:** All hooks end with `Hook` suffix for self-documentation.

### Hook Manager Utility

File: `webapp/utils/hook-manager.js`

```javascript
/**
 * HookManager - Central hook registration and execution system
 */
class HookManager {
    static hooks = new Map();

    /**
     * Register a hook handler
     * @param {string} hookName - Name of the hook
     * @param {string} pluginName - Plugin registering the handler
     * @param {Function} handler - Handler function
     * @param {number} priority - Execution priority (lower = earlier, default 100)
     */
    static register(hookName, pluginName, handler, priority = 100) {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push({ pluginName, handler, priority });
        // Sort by priority
        this.hooks.get(hookName).sort((a, b) => a.priority - b.priority);
    }

    /**
     * Execute hook handlers (sequential, can modify data)
     * @param {string} hookName - Name of the hook
     * @param {object} context - Context object passed to handlers
     * @returns {Promise<object>} Modified context
     */
    static async execute(hookName, context) {
        const handlers = this.hooks.get(hookName) || [];
        for (const { handler, pluginName } of handlers) {
            try {
                const result = await handler(context);
                if (result !== undefined) {
                    context = result;
                }
            } catch (error) {
                LogController.logError(null, `hook.${hookName}`,
                    `Plugin ${pluginName} error: ${error.message}`);
            }
        }
        return context;
    }

    /**
     * Execute hook handlers and check for cancellation
     * @param {string} hookName - Name of the hook
     * @param {object} context - Context object
     * @returns {Promise<{context, cancelled, cancelReason}>}
     */
    static async executeWithCancel(hookName, context) {
        const handlers = this.hooks.get(hookName) || [];
        for (const { handler, pluginName } of handlers) {
            try {
                const result = await handler(context);
                if (result === false) {
                    return { context, cancelled: true, cancelledBy: pluginName };
                }
                if (result !== undefined) {
                    context = result;
                }
            } catch (error) {
                LogController.logError(null, `hook.${hookName}`,
                    `Plugin ${pluginName} error: ${error.message}`);
            }
        }
        return { context, cancelled: false };
    }

    /**
     * Unregister all hooks for a plugin
     * @param {string} pluginName - Plugin name
     */
    static unregister(pluginName) {
        for (const [hookName, handlers] of this.hooks) {
            this.hooks.set(hookName,
                handlers.filter(h => h.pluginName !== pluginName));
        }
    }

    /**
     * Get registered hooks for debugging
     * @returns {object} Map of hook names to handler info
     */
    static getRegisteredHooks() {
        const result = {};
        for (const [hookName, handlers] of this.hooks) {
            result[hookName] = handlers.map(h => ({
                plugin: h.pluginName,
                priority: h.priority
            }));
        }
        return result;
    }

    /**
     * Get all available hooks that the framework supports
     * All hook names use camelCase format with Hook suffix
     * @returns {object} Map of hook names to descriptions
     */
    static getAvailableHooks() {
        return {
            // Authentication hooks (auth*Hook)
            authBeforeLoginHook: {
                description: 'Before password validation, can provide external auth',
                context: '{ req, identifier, password, skipPasswordCheck, user, authMethod }',
                canModify: true,
                canCancel: false
            },
            authGetProviderHook: {
                description: 'Return auth provider name',
                context: '{ req, identifier }',
                canModify: false,
                canCancel: false
            },
            authAfterPasswordValidationHook: {
                description: 'After password check, MFA challenge point',
                context: '{ req, user, isValid, requireMFA, mfaMethod }',
                canModify: true,
                canCancel: false
            },
            authBeforeSessionCreateHook: {
                description: 'Before session is created, can modify session data',
                context: '{ req, user, sessionData }',
                canModify: true,
                canCancel: false
            },
            authAfterLoginSuccessHook: {
                description: 'After successful login and session creation',
                context: '{ req, user, session }',
                canModify: false,
                canCancel: false
            },
            authOnLoginFailureHook: {
                description: 'When login fails',
                context: '{ req, identifier, reason }',
                canModify: false,
                canCancel: false
            },
            authBeforeLogoutHook: {
                description: 'Before session is destroyed',
                context: '{ req, session }',
                canModify: false,
                canCancel: false
            },
            authAfterLogoutHook: {
                description: 'After successful logout',
                context: '{ req, username }',
                canModify: false,
                canCancel: false
            },
            authRequireMfaHook: {
                description: 'Check if MFA is required for user',
                context: '{ req, user }',
                canModify: false,
                canCancel: false
            },
            authOnMfaChallengeHook: {
                description: 'Issue MFA challenge',
                context: '{ req, user, method }',
                canModify: false,
                canCancel: false
            },
            authValidateMfaHook: {
                description: 'Validate MFA code',
                context: '{ req, user, code, isValid }',
                canModify: true,
                canCancel: false
            },
            authOnMfaSuccessHook: {
                description: 'After successful MFA validation',
                context: '{ req, user }',
                canModify: false,
                canCancel: false
            },
            authOnMfaFailureHook: {
                description: 'After failed MFA validation',
                context: '{ req, user, attempts }',
                canModify: false,
                canCancel: false
            },

            // User lifecycle hooks (user*Hook)
            userBeforeSignupHook: {
                description: 'Before signup validation',
                context: '{ req, userData }',
                canModify: true,
                canCancel: false
            },
            userAfterSignupValidationHook: {
                description: 'After validation, before user creation',
                context: '{ req, userData }',
                canModify: true,
                canCancel: true
            },
            userBeforeCreateHook: {
                description: 'Before UserModel.create()',
                context: '{ req, userData }',
                canModify: true,
                canCancel: false
            },
            userAfterCreateHook: {
                description: 'After user is created',
                context: '{ req, user }',
                canModify: false,
                canCancel: false
            },
            userOnSignupCompleteHook: {
                description: 'After signup response sent (async)',
                context: '{ req, user }',
                canModify: false,
                canCancel: false
            },
            userBeforeSaveHook: {
                description: 'Before user create or update',
                context: '{ id, data, isUpdate }',
                canModify: true,
                canCancel: false
            },
            userAfterSaveHook: {
                description: 'After user saved',
                context: '{ user, isUpdate }',
                canModify: false,
                canCancel: false
            },
            userBeforeDeleteHook: {
                description: 'Before user deletion',
                context: '{ id }',
                canModify: false,
                canCancel: true
            },
            userAfterDeleteHook: {
                description: 'After user deleted',
                context: '{ id }',
                canModify: false,
                canCancel: false
            },
            userMapExternalProfileHook: {
                description: 'Map external provider profile fields to user schema',
                context: '{ externalProfile, provider }',
                canModify: true,
                canCancel: false
            },
            userSyncExternalProfileHook: {
                description: 'Sync external profile into user document',
                context: '{ user, externalData, provider }',
                canModify: true,
                canCancel: false
            }
        };
    }

    /**
     * Get hooks filtered by namespace prefix
     * @param {string} namespace - Namespace prefix (e.g., 'auth', 'user')
     * @returns {object} Filtered hooks
     */
    static getHooksByNamespace(namespace) {
        const all = this.getAvailableHooks();
        return Object.fromEntries(
            Object.entries(all).filter(([name]) => name.startsWith(namespace))
        );
    }

    /**
     * Check if a hook name is valid
     * @param {string} hookName - Hook name to validate
     * @returns {boolean} True if valid hook
     */
    static isValidHook(hookName) {
        return hookName in this.getAvailableHooks();
    }
}

export default HookManager;
```

### How Hooks Work: Framework vs Plugin

**Important**: The **framework** calls hooks at specific points. **Plugins** register handlers that get invoked.

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Framework     │      │   HookManager   │      │     Plugin      │
│ (AuthController)│      │                 │      │  (auth-ldap)    │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         │  1. User attempts login                         │
         │────────────────────────>                        │
         │                        │                        │
         │  2. execute('auth:beforeLogin', context)        │
         │───────────────────────>│                        │
         │                        │  3. Call registered    │
         │                        │     handlers           │
         │                        │───────────────────────>│
         │                        │                        │
         │                        │  4. Handler modifies   │
         │                        │     context            │
         │                        │<───────────────────────│
         │                        │                        │
         │  5. Return modified context                     │
         │<───────────────────────│                        │
         │                        │                        │
         │  6. Continue with (possibly modified) context   │
         │                        │                        │
```

### Complete auth-ldap Plugin Example

```javascript
// plugins/auth-ldap/webapp/controller/ldapAuth.js
//
// This plugin adds LDAP authentication to jPulse.
// Hooks are auto-registered by PluginManager based on static hooks object.
// The framework calls the hooks, the plugin just provides handler functions.

import ldap from 'ldapjs';  // npm dependency

class LdapAuthController {

    // Plugin configuration (loaded from database via PluginModel)
    static config = null;

    // ========== HOOK DECLARATION ==========
    // PluginManager auto-registers these - no manual registration needed!
    // Format: hookName: { handler?, priority? } - all properties optional

    static hooks = {
        authBeforeLoginHook: { priority: 50 },   // Priority 50 = run first
        userMapExternalProfileHook: {},    // Defaults: priority 100
        userSyncExternalProfileHook: {},         // Defaults: priority 100
        authBeforeSessionCreateHook: {}          // Defaults: priority 100
    };

    // ========== OPTIONAL INITIALIZE ==========
    // Called by PluginManager after hooks are registered (if method exists)

    static async initialize(pluginConfig) {
        this.config = pluginConfig;
        LogController.logInfo(null, 'auth-ldap', 'Plugin initialized');
    }

    // ========== HOOK HANDLERS ==========
    // Method names match hook names - simple and obvious!

    /**
     * Handler for authBeforeLoginHook
     *
     * Called by framework BEFORE password validation.
     * If LDAP auth succeeds, we set skipPasswordCheck=true and provide the user.
     *
     * @param {object} context - { req, identifier, password, skipPasswordCheck, user, authMethod }
     * @returns {object} Modified context
     */
    static async authBeforeLoginHook(context) {
        const { req, identifier, password } = context;

        // Skip if LDAP is not configured or disabled
        if (!this.config?.enabled || !this.config?.server) {
            return context;  // Return unchanged, let internal auth handle it
        }

        try {
            // Attempt LDAP bind (authentication)
            const ldapUser = await this._ldapBind(identifier, password);

            if (ldapUser) {
                // LDAP auth successful!
                LogController.logInfo(req, 'auth-ldap', `LDAP auth success for: ${identifier}`);

                // Find or create user in local database
                let user = await UserModel.findByEmail(ldapUser.mail);
                if (!user) {
                    // JIT (Just-In-Time) provisioning - create user on first LDAP login
                    user = await this._createUserFromLdap(ldapUser);
                }

                // Tell framework to skip password check - we already authenticated
                context.skipPasswordCheck = true;
                context.user = user;
                context.authMethod = 'ldap';
                context.externalProfile = ldapUser;  // For profile sync hooks
            }
        } catch (error) {
            // LDAP failed, log but don't block - fall through to internal auth
            LogController.logWarning(req, 'auth-ldap', `LDAP auth failed: ${error.message}`);
            // Don't modify context - let internal auth try
        }

        return context;
    }

    /**
     * Handler for userMapExternalProfileHook
     *
     * Called to map external provider fields to standard user schema.
     * LDAP attributes have different names than our user model.
     *
     * @param {object} context - { externalProfile, provider }
     * @returns {object} Modified context with normalized profile
     */
    static async userMapExternalProfileHook(context) {
        const { externalProfile, provider } = context;

        // Only process LDAP profiles
        if (provider !== 'ldap') {
            return context;
        }

        // Map LDAP attributes to our user profile structure
        context.externalProfile = {
            firstName: externalProfile.givenName || externalProfile.cn?.split(' ')[0] || '',
            lastName: externalProfile.sn || externalProfile.cn?.split(' ').slice(1).join(' ') || '',
            email: externalProfile.mail || externalProfile.userPrincipalName || '',
            department: externalProfile.department || '',
            title: externalProfile.title || '',
            groups: externalProfile.memberOf || [],
            // Preserve original for debugging
            _raw: externalProfile
        };

        return context;
    }

    /**
     * Handler for userSyncExternalProfileHook
     *
     * Called to merge external profile data into user document.
     * This updates the user with fresh LDAP data on each login.
     *
     * @param {object} context - { user, externalData, provider }
     * @returns {object} Modified context with updated user
     */
    static async userSyncExternalProfileHook(context) {
        const { user, externalData, provider } = context;

        // Only process LDAP profiles
        if (provider !== 'ldap') {
            return context;
        }

        // Sync LDAP attributes to user profile (if configured to sync)
        if (this.config?.syncProfile !== false) {
            user.profile.firstName = externalData.firstName || user.profile.firstName;
            user.profile.lastName = externalData.lastName || user.profile.lastName;
            user.email = externalData.email || user.email;

            // Store LDAP metadata
            user.ldap = {
                dn: externalData._raw?.dn,
                lastSync: new Date(),
                groups: externalData.groups
            };
        }

        context.user = user;
        return context;
    }

    /**
     * Handler for authBeforeSessionCreateHook
     *
     * Called before session is created. We add LDAP groups to session
     * so they can be used for authorization decisions.
     *
     * @param {object} context - { req, user, sessionData }
     * @returns {object} Modified context with updated sessionData
     */
    static async authBeforeSessionCreateHook(context) {
        const { user, sessionData } = context;

        // Add LDAP groups to session if available
        if (user.ldap?.groups) {
            sessionData.ldapGroups = user.ldap.groups;

            // Optionally map LDAP groups to jPulse roles
            if (this.config?.groupRoleMapping) {
                const mappedRoles = this._mapGroupsToRoles(user.ldap.groups);
                sessionData.roles = [...new Set([...sessionData.roles, ...mappedRoles])];
            }
        }

        context.sessionData = sessionData;
        return context;
    }

    // ========== Private Helper Methods ==========

    /**
     * Authenticate user against LDAP server
     * @private
     */
    static async _ldapBind(identifier, password) {
        return new Promise((resolve, reject) => {
            const client = ldap.createClient({
                url: this.config.server
            });

            const userDN = `uid=${identifier},${this.config.baseDN}`;

            client.bind(userDN, password, (err) => {
                if (err) {
                    client.destroy();
                    reject(err);
                    return;
                }

                // Search for user attributes
                client.search(userDN, { scope: 'base' }, (err, res) => {
                    if (err) {
                        client.destroy();
                        reject(err);
                        return;
                    }

                    let user = null;
                    res.on('searchEntry', (entry) => {
                        user = entry.object;
                    });
                    res.on('end', () => {
                        client.destroy();
                        resolve(user);
                    });
                    res.on('error', (err) => {
                        client.destroy();
                        reject(err);
                    });
                });
            });
        });
    }

    /**
     * Create new user from LDAP data (JIT provisioning)
     * @private
     */
    static async _createUserFromLdap(ldapUser) {
        const userData = {
            username: ldapUser.uid || ldapUser.sAMAccountName,
            email: ldapUser.mail,
            password: null,  // No local password for LDAP users
            profile: {
                firstName: ldapUser.givenName || '',
                lastName: ldapUser.sn || ''
            },
            status: this.config?.autoEnableUsers ? 'active' : 'pending',
            authProvider: 'ldap'
        };

        return await UserModel.create(userData);
    }

    /**
     * Map LDAP groups to jPulse roles
     * @private
     */
    static _mapGroupsToRoles(groups) {
        const mapping = this.config?.groupRoleMapping || {};
        const roles = [];

        for (const group of groups) {
            if (mapping[group]) {
                roles.push(mapping[group]);
            }
        }

        return roles;
    }
}

export default LdapAuthController;
```

### Key Points About Plugin Hooks

1. **Auto-registration via static `hooks` object**
   - Plugin declares hooks in `static hooks = { ... }`
   - PluginManager auto-discovers and registers handlers
   - No manual `HookManager.register()` calls needed!

2. **CamelCase hook names everywhere**
   - All hook names use camelCase: `authBeforeLogin`, `userAfterSave`
   - Namespace is prefix: `auth*`, `user*`
   - No colons, no conversion, just simple strings

3. **Context object flows through all handlers**
   - Each handler can read and modify the context
   - Modified context is passed to next handler
   - Final context is returned to framework

4. **Priority controls execution order**
   - Lower number = runs earlier (priority 50 runs before 100)
   - Default priority is 100 if not specified
   - LDAP plugin uses priority 50 for `authBeforeLogin` to run first

5. **Return value matters**
   - Return modified context to pass changes along
   - Return `false` to cancel operation (for hooks that support cancellation)
   - Return `undefined` or nothing to keep context unchanged

6. **Errors are logged but don't break flow**
   - If handler throws, error is logged
   - Flow continues with next handler
   - This prevents one plugin from breaking the entire system

---

## Implementation Plan

### Phase 1: HookManager Foundation (Day 1, ~3 hours)

**Goal**: Create core hook infrastructure that plugins can use

**Task 1.1: Create HookManager utility** (~1.5 hours)
- File: `webapp/utils/hook-manager.js`
- Implement:
  - `register(hookName, pluginName, handler, priority)` - Register hook handler
  - `execute(hookName, context)` - Execute all handlers, return modified context
  - `executeWithCancel(hookName, context)` - Execute with cancellation support
  - `executeFirst(hookName, context)` - Return first non-null result (for `getAuthProvider`)
  - `unregister(pluginName)` - Remove all hooks for a plugin
  - `getRegisteredHooks()` - Debug/admin info
  - `hasHandlers(hookName)` - Check if any handlers registered
- Add JSDoc documentation
- Export as default

**Task 1.2: Integrate with Bootstrap** (~30 min)
- File: `webapp/utils/bootstrap.js`
- Import HookManager
- Make HookManager available globally: `global.HookManager = HookManager`
- Add after PluginManager initialization

**Task 1.3: Integrate with PluginManager** (~30 min)
- File: `webapp/utils/plugin-manager.js`
- Auto-discover and register hooks from plugin controllers:
  ```javascript
  static _registerControllerHooks(pluginName, Controller) {
      if (!Controller.hooks) return;

      for (const [hookName, config] of Object.entries(Controller.hooks)) {
          // Simple: config is always an object with optional properties
          const handler = config.handler || hookName;  // Default: method = hookName
          const priority = config.priority || 100;     // Default: priority = 100

          const method = Controller[handler];
          if (typeof method === 'function') {
              HookManager.register(hookName, pluginName, method.bind(Controller), priority);
          } else {
              LogController.logWarning(null, 'plugin-manager',
                  `Hook ${hookName}: method '${handler}' not found in ${pluginName}`);
          }
      }
  }
  ```
- Call `plugin.initialize(config)` if method exists (after hooks registered)
- Call `HookManager.unregister(pluginName)` when plugin is disabled

**Task 1.4: Unit tests for HookManager** (~30 min)
- File: `webapp/tests/unit/utils/hook-manager.test.js`
- Test: register/unregister handlers
- Test: execute with priority ordering
- Test: executeWithCancel returns cancelled state
- Test: executeFirst returns first result
- Test: error handling (logged, doesn't break flow)
- Test: hasHandlers check

---

### Phase 2: Authentication Hooks (Day 1-2, ~4 hours)

**Goal**: Add hook points to login/logout flow

**Task 2.1: Add hooks to AuthController.login()** (~2 hours)
- File: `webapp/controller/auth.js`
- Insert hook calls at strategic points:

```javascript
// Current flow with hooks inserted:
static async login(req, res) {
    // ... validation ...

    // HOOK: authBeforeLoginHook - can modify credentials or skip auth
    let context = { req, identifier, password, skipPasswordCheck: false, user: null };
    context = await HookManager.execute('authBeforeLoginHook', context);
    if (context.skipPasswordCheck && context.user) {
        user = context.user;  // External auth provided user
    } else {
        // Internal authentication
        user = await UserModel.authenticate(identifier, password);
    }

    if (!user) {
        // HOOK: authOnLoginFailureHook
        await HookManager.execute('authOnLoginFailureHook', { req, identifier, reason: 'INVALID_CREDENTIALS' });
        return res.status(401).json({ ... });
    }

    // HOOK: authAfterPasswordValidationHook - MFA check point
    const mfaContext = await HookManager.execute('authAfterPasswordValidationHook', { req, user, isValid: true });
    if (mfaContext.requireMFA) {
        // Return MFA challenge response instead of session
        return res.json({ success: true, requireMFA: true, mfaMethod: mfaContext.mfaMethod });
    }

    // Update login statistics
    await UserModel.updateById(user._id, { ... });

    // HOOK: authBeforeSessionCreateHook - can modify session data
    let sessionContext = { req, user, sessionData: { ... } };
    sessionContext = await HookManager.execute('authBeforeSessionCreateHook', sessionContext);
    req.session.user = sessionContext.sessionData;

    // HOOK: authAfterLoginSuccessHook
    await HookManager.execute('authAfterLoginSuccessHook', { req, user, session: req.session.user });

    return res.json({ success: true, data: { user: req.session.user } });
}
```

**Task 2.2: Add hooks to AuthController.logout()** (~30 min)
- File: `webapp/controller/auth.js`
- Add `authBeforeLogoutHook` before session destroy
- Add `authAfterLogoutHook` after successful destroy

**Task 2.3: Add MFA endpoint stub** (~1 hour)
- File: `webapp/controller/auth.js`
- Add `POST /api/1/auth/mfa/verify` endpoint
- Calls `authValidateMfaHook` hook
- Calls `authOnMfaSuccessHook` or `authOnMfaFailureHook`
- Creates session on MFA success

**Task 2.4: Integration tests for auth hooks** (~30 min)
- File: `webapp/tests/integration/auth-hooks.test.js`
- Test: beforeLogin can skip password check
- Test: afterPasswordValidation can require MFA
- Test: beforeSessionCreate can modify session
- Test: logout hooks called in order

---

### Phase 3: User Registration Hooks (Day 2, ~2 hours)

**Goal**: Add hook points to signup flow

**Task 3.1: Add hooks to UserController.signup()** (~1.5 hours)
- File: `webapp/controller/user.js`
- Insert hook calls:

```javascript
static async signup(req, res) {
    // HOOK: userBeforeSignupHook - can modify userData or set status
    let context = { req, userData: req.body };
    context = await HookManager.execute('userBeforeSignupHook', context);
    const userData = context.userData;

    // ... existing validation ...

    // HOOK: userAfterSignupValidationHook - additional validation
    const validationContext = await HookManager.executeWithCancel('userAfterSignupValidationHook', { req, userData });
    if (validationContext.cancelled) {
        return res.status(400).json({ error: validationContext.cancelReason });
    }

    // HOOK: userBeforeCreateHook - transform user data
    let createContext = { req, userData };
    createContext = await HookManager.execute('userBeforeCreateHook', createContext);

    // Create user
    const newUser = await UserModel.create(createContext.userData);

    // HOOK: userAfterCreateHook - post-create actions (email confirmation, etc.)
    await HookManager.execute('userAfterCreateHook', { req, user: newUser });

    return res.status(201).json({ success: true, data: { user: { ... } } });

    // HOOK: userOnSignupCompleteHook - async, after response (fire and forget)
    setImmediate(async () => {
        await HookManager.execute('userOnSignupCompleteHook', { req, user: newUser });
    });
}
```

**Task 3.2: Unit tests for signup hooks** (~30 min)
- File: `webapp/tests/unit/controller/user-hooks.test.js`
- Test: beforeSignup can modify user data
- Test: afterSignupValidation can cancel signup
- Test: afterUserCreate called after creation

---

### Phase 4: Model Save Hooks (Day 2-3, ~2 hours)

**Goal**: Add hook points to UserModel save/delete operations

**Task 4.1: Add hooks to UserModel** (~1.5 hours)
- File: `webapp/model/user.js`
- Add hooks to `create()`, `updateById()`, `deleteById()`:

```javascript
static async create(data) {
    // HOOK: userBeforeSaveHook
    let context = { data, isUpdate: false };
    context = await HookManager.execute('userBeforeSaveHook', context);
    data = context.data;

    // ... existing create logic ...

    // HOOK: userAfterSaveHook
    await HookManager.execute('userAfterSaveHook', { user: newUser, isUpdate: false });

    return newUser;
}

static async updateById(id, data) {
    // HOOK: userBeforeSaveHook
    let context = { id, data, isUpdate: true };
    context = await HookManager.execute('userBeforeSaveHook', context);
    data = context.data;

    // ... existing update logic ...

    // HOOK: userAfterSaveHook
    await HookManager.execute('userAfterSaveHook', { user: updatedUser, isUpdate: true });

    return updatedUser;
}

static async deleteById(id) {
    // HOOK: userBeforeDeleteHook
    const { cancelled } = await HookManager.executeWithCancel('userBeforeDeleteHook', { id });
    if (cancelled) {
        throw new Error('Delete cancelled by plugin');
    }

    // ... existing delete logic ...

    // HOOK: userAfterDeleteHook
    await HookManager.execute('userAfterDeleteHook', { id });
}
```

**Task 4.2: Unit tests for model hooks** (~30 min)
- File: `webapp/tests/unit/model/user-hooks.test.js`
- Test: beforeSave can modify data
- Test: afterSave called after save
- Test: beforeDelete can cancel deletion

---

### Phase 5: Profile Sync Hooks (Day 3, ~1 hour)

**Goal**: Add hooks for external profile synchronization

**Task 5.1: Add profile sync hook calls** (~45 min)
- File: `webapp/controller/auth.js`
- In login flow, after external auth succeeds:

```javascript
// After LDAP/OAuth2 authentication succeeds
if (context.authMethod && context.externalProfile) {
    // HOOK: userMapExternalProfileHook - map external fields
    let transformContext = { externalProfile: context.externalProfile, provider: context.authMethod };
    transformContext = await HookManager.execute('userMapExternalProfileHook', transformContext);

    // HOOK: userSyncExternalProfileHook - merge into user
    let syncContext = { user, externalData: transformContext.externalProfile, provider: context.authMethod };
    syncContext = await HookManager.execute('userSyncExternalProfileHook', syncContext);
    user = syncContext.user;

    // Save synced user data
    await UserModel.updateById(user._id, user);
}
```

**Task 5.2: Test profile sync hooks** (~15 min)
- Add test cases to integration tests
- Test: transformExternalProfile modifies profile
- Test: syncExternalProfile merges data

---

### Phase 6: Documentation & Polish (Day 3, ~2 hours)

**Goal**: Complete documentation and final testing

**Task 6.1: Add dynamic content generators for hooks** (~30 min)
- File: `webapp/controller/markdown.js`
- Add `plugins-hooks-list` generator - bullet list of hooks
- Add `plugins-plugins-hooks-list-table` generator - table with hook details
- Both support `namespace` param to filter (auth, user)
- Gets data from `HookManager.getAvailableHooks()`

**Task 6.2: Create plugin hooks developer guide** (~1 hour)
- File: `docs/plugins/plugin-hooks.md`
- Sections:
  - Overview and concepts
  - Available hooks reference: `%DYNAMIC{plugins-plugins-hooks-list-table}%`
  - Hook naming convention (camelCase: `authBeforeLogin`, `userAfterSave`)
  - How to declare hooks in plugins (static `hooks` object)
  - Hook context objects
  - Priority and execution order
  - Cancellation patterns
  - Error handling
  - Examples for each hook category

**Task 6.3: Update plugin API reference** (~30 min)
- File: `docs/plugins/plugin-api-reference.md`
- Add HookManager API section
- Add hook lifecycle diagram

**Task 6.4: Update hello-world plugin** (~30 min)
- File: `plugins/hello-world/webapp/controller/helloPlugin.js`
- Add example hook declaration in static `hooks` object
- Demonstrate hook usage pattern

---

### Implementation Summary

| Phase | Tasks | Time | Dependencies |
|-------|-------|------|--------------|
| 1. HookManager Foundation | 1.1-1.4 | 3h | None |
| 2. Authentication Hooks | 2.1-2.4 | 4h | Phase 1 |
| 3. User Registration Hooks | 3.1-3.2 | 2h | Phase 1 |
| 4. Model Save Hooks | 4.1-4.2 | 2h | Phase 1 |
| 5. Profile Sync Hooks | 5.1-5.2 | 1h | Phase 2 |
| 6. Documentation | 6.1-6.4 | 2.5h | Phases 1-5 |

**Total Estimated Time**: ~14.5 hours (2-3 days)

---

### Hook Naming Convention

All hooks use **camelCase** with:
- Namespace prefix: `auth*` or `user*`
- `Hook` suffix for self-documentation

**Pattern:** `{namespace}{Action}Hook`

Full hook list (22 hooks):
```
authBeforeLoginHook
authGetProviderHook
authAfterPasswordValidationHook
authBeforeSessionCreateHook
authAfterLoginSuccessHook
authOnLoginFailureHook
authBeforeLogoutHook
authAfterLogoutHook
authRequireMfaHook
authOnMfaChallengeHook
authValidateMfaHook
authOnMfaSuccessHook
authOnMfaFailureHook

userBeforeSignupHook
userAfterSignupValidationHook
userBeforeCreateHook
userAfterCreateHook
userOnSignupCompleteHook
userBeforeSaveHook
userAfterSaveHook
userBeforeDeleteHook
userAfterDeleteHook
userMapExternalProfileHook
userSyncExternalProfileHook
```

**Filter by namespace:**
```javascript
HookManager.getHooksByNamespace('auth');  // All auth*Hook hooks
HookManager.getHooksByNamespace('user');  // All user*Hook hooks
```

**Benefits of `Hook` suffix:**
- Self-documenting - immediately clear a method is a hook handler
- Searchable - `grep "Hook"` finds all hooks
- IDE friendly - type `Hook` to autocomplete all hook methods

---

## Deliverables

### Files to Create:
- `webapp/utils/hook-manager.js` - Central hook registration and execution

### Files to Modify:
- `webapp/utils/bootstrap.js` - Initialize HookManager, make global
- `webapp/utils/plugin-manager.js` - Auto-register hooks from plugin static `hooks` object
- `webapp/controller/auth.js` - Add hook calls to login/logout flow
- `webapp/controller/user.js` - Add hook calls to signup flow
- `webapp/model/user.js` - Add hook calls to save/delete operations
- `webapp/controller/markdown.js` - Add dynamic content generators for hooks

### Dynamic Content Generators:
Add to `DYNAMIC_CONTENT_REGISTRY` in `webapp/controller/markdown.js`:

```javascript
'plugins-hooks-list': {
    description: 'Bullet list of available plugin hooks',
    params: [
        { name: 'namespace', type: 'string', default: '', description: 'Filter by namespace (auth, user)' }
    ],
    generator: '_generateHooksList'
},
'plugins-plugins-hooks-list-table': {
    description: 'Table of available plugin hooks with details',
    params: [
        { name: 'namespace', type: 'string', default: '', description: 'Filter by namespace (auth, user)' }
    ],
    generator: '_generateHooksTable'
}
```

**Usage in markdown:**
```markdown
## All Available Hooks
%DYNAMIC{plugins-plugins-hooks-list-table}%

## Authentication Hooks Only
%DYNAMIC{plugins-plugins-hooks-list-table namespace="auth"}%

## User Lifecycle Hooks
%DYNAMIC{plugins-hooks-list namespace="user"}%
```

**Output example for `%DYNAMIC{plugins-plugins-hooks-list-table namespace="auth"}%`:**

| Hook | Description | Context | Modify | Cancel |
|------|-------------|---------|--------|--------|
| `authBeforeLogin` | Before password validation, can provide external auth | `{ req, identifier, password, ... }` | ✅ | ❌ |
| `authAfterPasswordValidation` | After password check, MFA challenge point | `{ req, user, isValid, ... }` | ✅ | ❌ |
| ... | ... | ... | ... | ... |

### Documentation:
- `docs/plugins/plugin-hooks.md` - Developer guide with `%DYNAMIC{plugins-plugins-hooks-list-table}%`
- Update `docs/plugins/plugin-api-reference.md` - Add hook API reference

---

## Testing Strategy

1. Unit tests for HookManager
2. Integration tests with mock plugin hooks
3. Test hook execution order (priority)
4. Test hook cancellation
5. Test error handling in hooks

---

## Notes

- Hooks use async/await for consistency
- Hooks can modify context and return it
- Returning `false` from a hook cancels the operation (where supported)
- Priority system allows plugins to control execution order
- All hook errors are logged but don't break the main flow

---

## Tech Debt: Future Hooks

The following hooks are candidates for future implementation:

### View Rendering Hooks

| Hook Name | Location | Purpose | Use Case |
|-----------|----------|---------|----------|
| `viewBeforeRenderHook` | Before template rendering | Modify context or template | Theme plugins, A/B testing |
| `viewAfterRenderHook` | After template rendered | Post-process HTML output | Analytics injection, minification |
| `viewOnErrorHook` | On render error | Custom error handling | Error tracking, fallback templates |

### Document/Model Hooks (Generic)

| Hook Name | Location | Purpose | Use Case |
|-----------|----------|---------|----------|
| `modelBeforeSaveHook` | Before any model save | Generic save interception | Audit logging, encryption |
| `modelAfterSaveHook` | After any model save | Post-save actions | Cache invalidation, sync |
| `modelBeforeDeleteHook` | Before any model delete | Delete validation | Soft delete, referential integrity |
| `modelAfterDeleteHook` | After any model delete | Cleanup actions | External system sync |
| `modelBeforeQueryHook` | Before database query | Query modification | Multi-tenancy, row-level security |

### Request Lifecycle Hooks

| Hook Name | Location | Purpose | Use Case |
|-----------|----------|---------|----------|
| `requestBeforeRouteHook` | Before route matching | Intercept/redirect requests | Maintenance mode, geo-blocking |
| `requestAfterRouteHook` | After route handler | Modify response | Response transformation |
| `requestOnErrorHook` | On unhandled error | Custom error handling | Error reporting services |

### WebSocket Hooks

| Hook Name | Location | Purpose | Use Case |
|-----------|----------|---------|----------|
| `wsOnConnectHook` | On WebSocket connect | Connection validation | Auth check, rate limiting |
| `wsOnDisconnectHook` | On WebSocket disconnect | Cleanup actions | Presence tracking |
| `wsBeforeMessageHook` | Before message broadcast | Message filtering | Content moderation |

### Email Hooks

| Hook Name | Location | Purpose | Use Case |
|-----------|----------|---------|----------|
| `emailBeforeSendHook` | Before email sent | Modify email content | Templates, tracking pixels |
| `emailAfterSendHook` | After email sent | Post-send actions | Logging, analytics |

### Implementation Notes

- These hooks follow the same pattern as auth/user hooks
- Should be implemented incrementally based on plugin needs
- Consider performance impact for high-frequency hooks (view render, model query)
- Some hooks may require configuration to enable/disable for performance

---

## Related Documents

- [`W-014-W-045-mvc-site-plugins-architecture.md`](./W-014-W-045-mvc-site-plugins-architecture.md)
- [`W-045-plugins-tech-debt.md`](./W-045-plugins-tech-debt.md) - TD-10: Hook System Enhancement
