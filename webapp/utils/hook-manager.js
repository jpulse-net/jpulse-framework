/**
 * @name            jPulse Framework / WebApp / Utils / HookManager
 * @tagline         Central hook registration and execution system for plugins
 * @description     Manages plugin hook registration, execution, and lifecycle.
 *                  Plugins declare hooks in static `hooks` object, PluginManager auto-registers.
 * @file            webapp/utils/hook-manager.js
 * @version         1.3.6
 * @release         2025-12-03
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

/**
 * HookManager - Central hook registration and execution system
 *
 * Design principles:
 * - CamelCase hook names with Hook suffix (e.g., authBeforeLoginHook)
 * - Auto-registration via plugin static `hooks` object
 * - Method calls, not messages (synchronous within process)
 * - Minimal boilerplate for plugin developers
 *
 * Hook declaration format (in plugin controller):
 * ```javascript
 * static hooks = {
 *     authBeforeLoginHook: { priority: 50 },  // Priority 50, method = authBeforeLoginHook
 *     userAfterCreateHook: {},                // Default priority 100, method = userAfterCreateHook
 * };
 * ```
 */
class HookManager {

    /**
     * Registered hook handlers
     * Map of hookName -> [{ pluginName, handler, priority }]
     */
    static hooks = new Map();

    /**
     * Register a hook handler
     * @param {string} hookName - Name of the hook (e.g., 'authBeforeLoginHook')
     * @param {string} pluginName - Plugin registering the handler
     * @param {Function} handler - Handler function (async, receives context, returns modified context)
     * @param {number} priority - Execution priority (lower = earlier, default 100)
     */
    static register(hookName, pluginName, handler, priority = 100) {
        // Validate hook name
        if (!this.isValidHook(hookName)) {
            global.LogController?.logWarning(null, 'hook-manager',
                `Unknown hook '${hookName}' registered by plugin '${pluginName}'`);
        }

        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }

        this.hooks.get(hookName).push({ pluginName, handler, priority });

        // Sort by priority (lower = earlier)
        this.hooks.get(hookName).sort((a, b) => a.priority - b.priority);

        global.LogController?.logInfo(null, 'hook-manager',
            `Registered hook '${hookName}' for plugin '${pluginName}' (priority: ${priority})`);
    }

    /**
     * Execute hook handlers sequentially
     * Each handler can modify the context and return it.
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
                global.LogController?.logError(null, `hook.${hookName}`,
                    `Plugin '${pluginName}' error: ${error.message}`);
                // Continue with next handler - don't break the flow
            }
        }

        return context;
    }

    /**
     * Execute hook handlers with cancellation support
     * Handlers can return `false` to cancel the operation.
     * @param {string} hookName - Name of the hook
     * @param {object} context - Context object
     * @returns {Promise<{context: object, cancelled: boolean, cancelledBy?: string}>}
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
                global.LogController?.logError(null, `hook.${hookName}`,
                    `Plugin '${pluginName}' error: ${error.message}`);
                // Continue with next handler
            }
        }

        return { context, cancelled: false };
    }

    /**
     * Execute hook handlers and return first non-null/undefined result
     * Useful for hooks that return a value (e.g., authGetProviderHook)
     * @param {string} hookName - Name of the hook
     * @param {object} context - Context object
     * @returns {Promise<any>} First non-null result, or null if no handler returns a value
     */
    static async executeFirst(hookName, context) {
        const handlers = this.hooks.get(hookName) || [];

        for (const { handler, pluginName } of handlers) {
            try {
                const result = await handler(context);
                if (result !== undefined && result !== null) {
                    return result;
                }
            } catch (error) {
                global.LogController?.logError(null, `hook.${hookName}`,
                    `Plugin '${pluginName}' error: ${error.message}`);
            }
        }

        return null;
    }

    /**
     * Unregister all hooks for a plugin
     * Called when a plugin is disabled.
     * @param {string} pluginName - Plugin name
     */
    static unregister(pluginName) {
        let count = 0;
        for (const [hookName, handlers] of this.hooks) {
            const before = handlers.length;
            const filtered = handlers.filter(h => h.pluginName !== pluginName);
            if (filtered.length < before) {
                this.hooks.set(hookName, filtered);
                count += before - filtered.length;
            }
        }

        if (count > 0) {
            global.LogController?.logInfo(null, 'hook-manager',
                `Unregistered ${count} hook(s) for plugin '${pluginName}'`);
        }
    }

    /**
     * Check if any handlers are registered for a hook
     * @param {string} hookName - Hook name
     * @returns {boolean} True if handlers exist
     */
    static hasHandlers(hookName) {
        const handlers = this.hooks.get(hookName);
        return !!(handlers && handlers.length > 0);
    }

    /**
     * Get registered hooks for debugging/admin
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
            // ================================================================
            // Authentication hooks (auth*Hook)
            // ================================================================
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
                context: '{ req, user, isValid, requireMfa, mfaMethod }',
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

            // ================================================================
            // User lifecycle hooks (user*Hook)
            // ================================================================
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

    /**
     * Get hook count by status
     * @returns {object} { total, registered, available }
     */
    static getStats() {
        const available = Object.keys(this.getAvailableHooks()).length;
        let registered = 0;
        for (const handlers of this.hooks.values()) {
            registered += handlers.length;
        }
        return {
            available,
            registered,
            hooksWithHandlers: this.hooks.size
        };
    }

    /**
     * Clear all registered hooks (for testing)
     */
    static clear() {
        this.hooks.clear();
    }
}

export default HookManager;

// EOF webapp/utils/hook-manager.js
