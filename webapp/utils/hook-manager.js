/**
 * @name            jPulse Framework / WebApp / Utils / HookManager
 * @tagline         Central hook registration and execution system for plugins
 * @description     Manages plugin hook registration, execution, and lifecycle.
 *                  Plugins declare hooks in static `hooks` object, PluginManager auto-registers.
 * @file            webapp/utils/hook-manager.js
 * @version         1.3.18
 * @release         2025-12-18
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
 * - Phase 8 naming: onBucketAction (e.g., onAuthBeforeLogin, onUserAfterSave)
 * - Auto-registration via plugin static `hooks` object
 * - Method calls, not messages (synchronous within process)
 * - Minimal boilerplate for plugin developers
 *
 * Hook declaration format (in plugin controller):
 * ```javascript
 * static hooks = {
 *     onAuthBeforeLogin: { priority: 50 },  // Priority 50, method = onAuthBeforeLogin
 *     onUserAfterSave: {},                   // Default priority 100, method = onUserAfterSave
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
     * @param {string} hookName - Name of the hook (e.g., 'onAuthBeforeLogin')
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
        const isStatsHook = hookName === 'onGetInstanceStats';

        for (const { handler, pluginName } of handlers) {
            const startTime = isStatsHook ? Date.now() : null;

            try {
                const result = await handler(context);
                if (result !== undefined) {
                    context = result;
                }

                // For onGetInstanceStats hook, track elapsed time per plugin component
                if (isStatsHook && startTime !== null && context.stats?.[pluginName]) {
                    context.stats[pluginName].elapsed = Date.now() - startTime;
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
     * Useful for hooks that return a value
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
     * Phase 8: Simplified naming convention - onBucketAction (12 hooks total)
     * @returns {object} Map of hook names to descriptions
     */
    static getAvailableHooks() {
        return {
            // ================================================================
            // Authentication hooks (7)
            // ================================================================
            onAuthBeforeLogin: {
                description: 'Before credential validation - external auth (LDAP/OAuth), captcha',
                context: '{ req, identifier, password, captchaToken, skipPasswordCheck, user, authMethod }',
                canModify: true,
                canCancel: false
            },
            onAuthBeforeSession: {
                description: 'Before session is created - add data to session',
                context: '{ req, user, sessionData }',
                canModify: true,
                canCancel: false
            },
            onAuthAfterLogin: {
                description: 'After successful login - audit logging, notifications',
                context: '{ req, user, session, authMethod }',
                canModify: false,
                canCancel: false
            },
            onAuthFailure: {
                description: 'On login failure - rate limiting, lockout',
                context: '{ req, identifier, reason }',
                canModify: false,
                canCancel: false
            },
            onAuthGetSteps: {
                description: 'Get required login steps (MFA, email verify, etc.)',
                context: '{ req, user, completedSteps, requiredSteps }',
                canModify: true,
                canCancel: false
            },
            onAuthValidateStep: {
                description: 'Execute and validate a specific login step',
                context: '{ req, user, step, stepData, pending, valid, error }',
                canModify: true,
                canCancel: false
            },
            onAuthGetWarnings: {
                description: 'Get non-blocking login warnings (nag messages)',
                context: '{ req, user, warnings }',
                canModify: true,
                canCancel: false
            },

            // ================================================================
            // User lifecycle hooks (5)
            // ================================================================
            onUserBeforeSave: {
                description: 'Before user create/update - validation, modification',
                context: '{ req, userData, isCreate, isSignup }',
                canModify: true,
                canCancel: true
            },
            onUserAfterSave: {
                description: 'After user create/update - notifications, sync',
                context: '{ req, user, wasCreate, wasSignup }',
                canModify: false,
                canCancel: false
            },
            onUserBeforeDelete: {
                description: 'Before user deletion - can cancel',
                context: '{ req, user }',
                canModify: false,
                canCancel: true
            },
            onUserAfterDelete: {
                description: 'After user deletion - cleanup, audit',
                context: '{ req, user }',
                canModify: false,
                canCancel: false
            },
            onUserSyncProfile: {
                description: 'Sync external profile data (LDAP/OAuth)',
                context: '{ req, user, externalProfile, provider }',
                canModify: true,
                canCancel: false
            },

            // ================================================================
            // System/Metrics hooks (1)
            // ================================================================
            onGetInstanceStats: {
                description: 'Collect component stats for metrics API - plugins can register their stats',
                context: '{ stats: {}, instanceId: string }',
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
     * Get hook metrics (standardized getMetrics() format)
     * @returns {object} Component metrics with standardized structure
     */
    static getMetrics() {
        const available = Object.keys(this.getAvailableHooks()).length;
        let registered = 0;
        for (const handlers of this.hooks.values()) {
            registered += handlers.length;
        }

        return {
            component: 'HookManager',
            status: 'ok',
            initialized: true,
            stats: {
                available,
                registered,
                hooksWithHandlers: this.hooks.size
            },
            meta: {
                ttl: 0,  // Fast, no caching needed
                category: 'util',
                fields: {
                    'available': {
                        aggregate: 'first'  // Same everywhere
                    },
                    'registered': {
                        aggregate: 'max'    // Max across instances
                    },
                    'hooksWithHandlers': {
                        aggregate: 'max'
                    }
                }
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Clear all registered hooks (for testing)
     */
    static clear() {
        this.hooks.clear();
    }
}

// Register metrics provider (W-112)
// Use dynamic import to avoid circular dependencies
(async () => {
    try {
        const MetricsRegistry = (await import('./metrics-registry.js')).default;
        MetricsRegistry.register('hooks', () => HookManager.getMetrics(), {
            async: false,
            category: 'util'
        });
    } catch (error) {
        // MetricsRegistry might not be available yet, will be registered later
        console.warn('HookManager: Failed to register metrics provider:', error.message);
    }
})();

export default HookManager;

// EOF webapp/utils/hook-manager.js
