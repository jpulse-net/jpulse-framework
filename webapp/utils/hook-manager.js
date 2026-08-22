/**
 * @name            jPulse Framework / WebApp / Utils / HookManager
 * @tagline         Central hook registration and execution system for plugins
 * @description     Manages plugin hook registration, execution, and lifecycle.
 *                  Plugins declare hooks in static `hooks` object, PluginManager auto-registers.
 * @file            webapp/utils/hook-manager.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import frameworkHookDefinitions from './hook-definitions.js';

/**
 * HookManager - Central hook registration and execution system
 *
 * Two roles, deliberately kept apart:
 * - A PRODUCER defines a hook (its name, when it fires, what the context carries) and fires
 *   it with one of the execute methods. The framework, a plugin, and a site can all be one.
 * - A CONSUMER registers a handler against a hook name.
 *
 * Design principles:
 * - Phase 8 naming: onBucketAction (e.g., onAuthBeforeLogin, onUserAfterSave)
 * - Auto-registration via plugin static `hooks` object
 * - Method calls, not messages (synchronous within process)
 * - Minimal boilerplate for plugin developers
 *
 * Defining a hook (producer, in the controller that fires it):
 * ```javascript
 * static hookDefinitions = {
 *     onAiComplete: {
 *         description: 'Run one completion; emit normalized events; return usage',
 *         mode: 'executeForPlugin', contextKeys: ['threadId', 'model', 'messages']
 *     }
 * };
 * ```
 *
 * Handling a hook (consumer, in any plugin or site controller):
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
     * Hook definitions - the contracts, framework and third-party alike
     * Map of hookName -> normalized definition (see defineHook())
     */
    static definitions = new Map();

    /**
     * Constrained definition field values; anything else falls back to the default
     */
    static DEFINITION_MODES = ['execute', 'executeFirst', 'executeForPlugin'];
    static DEFINITION_ERROR_POLICIES = ['continue', 'abort'];
    static DEFINITION_STABILITIES = ['experimental', 'stable', 'deprecated', 'planned'];
    static DEFINITION_RETURNS = ['context', 'value', 'void'];

    /**
     * Define a hook - the producer side of the contract
     *
     * Defining is voluntary: registering a handler never fails on an undefined name, so a
     * thin definition is strictly better than none. Only `description` is required.
     *
     * Never throws and never aborts boot - a bad definition is logged and, where possible,
     * repaired with a default.
     *
     * @param {string} hookName - Hook name, onBucketAction camelCase (e.g., 'onAiComplete')
     * @param {object} definition - Contract:
     *   - {string}   description  - Required. One line, admin- and docs-facing
     *   - {string}   owner        - Plugin name, 'site', or 'framework'
     *   - {string}   mode         - 'execute' (default) | 'executeFirst' | 'executeForPlugin'
     *   - {Array}    contextKeys  - Keys the context carries; strings or { key, type, description }
     *   - {string}   contextNote  - Prose override when key names alone are not enough
     *   - {string}   onError      - 'continue' | 'abort'; defaults from `mode`
     *   - {boolean}  canModify    - May a handler change the context? Default false
     *   - {string}   returns      - 'context' | 'value' | 'void'; defaults from `mode`
     *   - {string}   stability    - 'experimental' | 'stable' (default) | 'deprecated' | 'planned'
     *   - {string}   since        - Version that introduced it - the OWNER's version
     *   - {string}   deprecatedBy - Successor hook name
     * @returns {object|null} The definition in force for this name, or null if unusable
     */
    static defineHook(hookName, definition = {}) {
        if (!hookName || typeof hookName !== 'string') {
            global.LogController?.logError(null, 'hook-manager',
                'Ignoring a hook definition with a missing or non-string name');
            return null;
        }

        const normalized = this._normalizeDefinition(hookName, definition);
        const existing = this.definitions.get(hookName);

        if (!existing) {
            this.definitions.set(hookName, normalized);
            return normalized;
        }

        // Two owners in a family may both define defensively - identical is a no-op
        if (this._isSameDefinition(existing, normalized)) {
            return existing;
        }

        // Conflict: first definition wins, but both are recorded so introspection shows it
        existing.conflicts.push(normalized);
        global.LogController?.logError(null, 'hook-manager',
            `Conflicting definition of hook '${hookName}' by '${normalized.owner}': ` +
            `keeping the existing definition by '${existing.owner}'`);

        return existing;
    }

    /**
     * Define a family of hooks at once, stamping one owner on each so it cannot drift
     * @param {object} definitions - Map of hookName -> definition (see defineHook())
     * @param {string} owner - Plugin name, 'site', or 'framework'
     * @returns {object} Map of hookName -> the definition in force
     */
    static defineHooks(definitions, owner) {
        const result = {};

        for (const [hookName, definition] of Object.entries(definitions || {})) {
            if (owner && definition?.owner && definition.owner !== owner) {
                global.LogController?.logWarning(null, 'hook-manager',
                    `Hook '${hookName}' names owner '${definition.owner}' but is defined by ` +
                    `'${owner}' - using '${owner}'`);
            }

            const defined = this.defineHook(hookName, owner ? { ...definition, owner } : definition);
            if (defined) {
                result[hookName] = defined;
            }
        }

        return result;
    }

    /**
     * Seed the framework's own hook definitions
     * Called at module load so the catalog exists without a bootstrap.
     */
    static seedFrameworkDefinitions() {
        return this.defineHooks(frameworkHookDefinitions, 'framework');
    }

    /**
     * Apply defaults and derivations to a raw definition
     * @param {string} hookName - Hook name
     * @param {object} definition - Raw definition as the producer wrote it
     * @returns {object} Normalized definition
     */
    static _normalizeDefinition(hookName, definition) {
        const source = definition || {};
        const owner = source.owner || 'unknown';

        if (!source.owner) {
            global.LogController?.logWarning(null, 'hook-manager',
                `Hook '${hookName}' is defined without an owner`);
        }
        if (!source.description) {
            global.LogController?.logWarning(null, 'hook-manager',
                `Hook '${hookName}' (owner '${owner}') is defined without a description`);
        }

        const mode = this._pickValue(hookName, 'mode', source.mode,
            this.DEFINITION_MODES, 'execute');
        const onError = this._pickValue(hookName, 'onError', source.onError,
            this.DEFINITION_ERROR_POLICIES, mode === 'executeForPlugin' ? 'abort' : 'continue');
        const returns = this._pickValue(hookName, 'returns', source.returns,
            this.DEFINITION_RETURNS, mode === 'executeFirst' ? 'value' : 'context');
        const stability = this._pickValue(hookName, 'stability', source.stability,
            this.DEFINITION_STABILITIES, 'stable');

        return {
            name: hookName,
            owner,
            description: source.description || '',
            mode,
            contextKeys: Array.isArray(source.contextKeys) ? source.contextKeys : [],
            contextNote: source.contextNote || '',
            onError,
            canModify: source.canModify === true,
            returns,
            stability,
            since: source.since || '',
            deprecatedBy: source.deprecatedBy || '',
            active: true,
            thin: this._isThinDefinition(source),
            conflicts: []
        };
    }

    /**
     * Take a constrained field value, falling back to the default with a warning
     * @param {string} hookName - Hook name, for the warning
     * @param {string} field - Field name, for the warning
     * @param {*} value - Value as written by the producer
     * @param {Array} allowed - Allowed values
     * @param {*} fallback - Default when unset or unknown
     * @returns {*} The value to use
     */
    static _pickValue(hookName, field, value, allowed, fallback) {
        if (value === undefined || value === null || value === '') {
            return fallback;
        }
        if (!allowed.includes(value)) {
            global.LogController?.logWarning(null, 'hook-manager',
                `Hook '${hookName}' has an unknown ${field} '${value}' - using '${fallback}'`);
            return fallback;
        }
        return value;
    }

    /**
     * Compare two definitions on their contract fields only, ignoring runtime state
     * @param {object} first - Normalized definition
     * @param {object} second - Normalized definition
     * @returns {boolean} True if the two state the same contract
     */
    static _isSameDefinition(first, second) {
        const contract = (definition) => JSON.stringify({
            owner: definition.owner,
            description: definition.description,
            mode: definition.mode,
            contextKeys: definition.contextKeys,
            contextNote: definition.contextNote,
            onError: definition.onError,
            canModify: definition.canModify,
            returns: definition.returns,
            stability: definition.stability,
            since: definition.since,
            deprecatedBy: definition.deprecatedBy
        });

        return contract(first) === contract(second);
    }

    /**
     * Build the human-readable context string shown in the docs and the admin view
     * @param {object} definition - Normalized definition
     * @returns {string} e.g. '{ req, user, sessionData }'
     */
    static _formatContext(definition) {
        if (definition.contextNote) {
            return definition.contextNote;
        }

        const keys = definition.contextKeys
            .map(key => (typeof key === 'string' ? key : key?.key))
            .filter(Boolean);

        return keys.length ? `{ ${keys.join(', ')} }` : '';
    }

    /**
     * True when the producer supplied only a description (and owner)
     * Info-level audit nudge - a thin definition is still better than none.
     * @param {object} source - Raw definition
     * @returns {boolean}
     */
    static _isThinDefinition(source) {
        const hasKeys = Array.isArray(source.contextKeys) && source.contextKeys.length > 0;
        return !source.mode && !source.onError && !source.contextNote && !hasKeys &&
            source.canModify !== true && !source.returns && !source.stability &&
            !source.since && !source.deprecatedBy;
    }

    /**
     * Docs/API view of a stored definition
     * @param {object} definition - Normalized definition
     * @returns {object}
     */
    static _publicDefinition(definition) {
        return {
            name: definition.name,
            owner: definition.owner,
            description: definition.description,
            mode: definition.mode,
            contextKeys: definition.contextKeys,
            contextNote: definition.contextNote,
            context: this._formatContext(definition),
            onError: definition.onError,
            canModify: definition.canModify,
            canCancel: definition.onError === 'abort',
            returns: definition.returns,
            stability: definition.stability,
            since: definition.since,
            deprecatedBy: definition.deprecatedBy,
            active: definition.active,
            conflicts: (definition.conflicts || []).map(conflict => ({
                owner: conflict.owner,
                description: conflict.description
            }))
        };
    }

    /**
     * Levenshtein distance between two strings
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {number}
     */
    static _editDistance(a, b) {
        const rows = a.length + 1;
        const cols = b.length + 1;
        const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
        for (let i = 0; i < rows; i++) grid[i][0] = i;
        for (let j = 0; j < cols; j++) grid[0][j] = j;
        for (let i = 1; i < rows; i++) {
            for (let j = 1; j < cols; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                grid[i][j] = Math.min(
                    grid[i - 1][j] + 1,
                    grid[i][j - 1] + 1,
                    grid[i - 1][j - 1] + cost
                );
            }
        }
        return grid[a.length][b.length];
    }

    /**
     * Closest catalog name for a typo, or null if nothing is close
     * @param {string} hookName - Name that has no definition
     * @returns {string|null}
     */
    static _didYouMean(hookName) {
        let best = null;
        let bestDistance = Infinity;
        const threshold = Math.max(2, Math.floor(hookName.length / 3));

        for (const name of this.definitions.keys()) {
            const distance = this._editDistance(hookName, name);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = name;
            }
        }

        return bestDistance <= threshold ? best : null;
    }

    /**
     * Advisory name prefixes derived from an owner
     * `ai-core` → `onAiCore`, `onAi`. Framework and site owners are skipped.
     * @param {string} owner - Plugin name, 'site', or 'framework'
     * @returns {string[]}
     */
    static _recommendedPrefixes(owner) {
        if (!owner || owner === 'framework' || owner === 'site' || owner === 'unknown') {
            return [];
        }
        const parts = owner.split(/[-_]/).filter(Boolean);
        if (parts.length === 0) {
            return [];
        }
        const camel = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
        const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const prefixes = [`on${camel}`];
        if (first !== camel) {
            prefixes.push(`on${first}`);
        }
        return prefixes;
    }

    /**
     * Define hookDefinitions and register static hooks from a controller class
     * Used by PluginManager and SiteControllerRegistry so both sides share one loop.
     * @param {string} owner - Plugin name, 'site', or 'framework'
     * @param {object} Controller - Controller class
     * @returns {{ defined: number, registered: number }}
     */
    static registerFromClass(owner, Controller) {
        let defined = 0;
        let registered = 0;

        if (Controller?.hookDefinitions && typeof Controller.hookDefinitions === 'object') {
            this.defineHooks(Controller.hookDefinitions, owner);
            defined = Object.keys(Controller.hookDefinitions).length;
        }

        if (!Controller?.hooks || typeof Controller.hooks !== 'object') {
            return { defined, registered };
        }

        for (const [hookName, config] of Object.entries(Controller.hooks)) {
            const handlerMethodName = config?.handler || hookName;
            const priority = config?.priority || 100;
            const method = Controller[handlerMethodName];

            if (typeof method === 'function') {
                this.register(hookName, owner, method.bind(Controller), priority);
                registered++;
            } else {
                global.LogController?.logError(null, 'hook-manager',
                    `Hook handler '${handlerMethodName}' not found on '${owner}' for hook '${hookName}'`);
            }
        }

        return { defined, registered };
    }

    /**
     * Mark every definition owned by `owner` active or inactive
     * Called when a plugin is enabled or disabled.
     * @param {string} owner - Plugin name
     * @param {boolean} active - True to reactivate
     */
    static setDefinitionsActive(owner, active) {
        for (const definition of this.definitions.values()) {
            if (definition.owner === owner) {
                definition.active = !!active;
            }
        }
    }

    /**
     * Definition and live registrations merged
     * Unknown names return a well-formed result rather than throwing.
     * @param {string} hookName - Hook name
     * @returns {object}
     */
    static getHook(hookName) {
        const definition = this.definitions.get(hookName);
        const handlers = (this.hooks.get(hookName) || []).map(handler => ({
            plugin: handler.pluginName,
            priority: handler.priority
        }));

        return {
            name: hookName,
            defined: !!definition,
            active: !!(definition && definition.active),
            definition: definition ? this._publicDefinition(definition) : null,
            handlers,
            unverified: !definition && handlers.length > 0
        };
    }

    /**
     * Query the catalog
     * @param {object} [filters]
     * @param {string} [filters.owner]
     * @param {RegExp|string} [filters.namePattern]
     * @param {string} [filters.stability]
     * @param {boolean} [filters.hasHandlers]
     * @param {boolean} [filters.active]
     * @returns {object[]} getHook() results
     */
    static findHooks(filters = {}) {
        const names = new Set([...this.definitions.keys(), ...this.hooks.keys()]);
        const pattern = filters.namePattern
            ? (filters.namePattern instanceof RegExp
                ? filters.namePattern
                : new RegExp(filters.namePattern))
            : null;

        const results = [];
        for (const name of names) {
            if (pattern && !pattern.test(name)) {
                continue;
            }
            const hook = this.getHook(name);
            if (filters.owner && hook.definition?.owner !== filters.owner) {
                continue;
            }
            if (filters.stability && hook.definition?.stability !== filters.stability) {
                continue;
            }
            if (filters.hasHandlers === true && hook.handlers.length === 0) {
                continue;
            }
            if (filters.hasHandlers === false && hook.handlers.length > 0) {
                continue;
            }
            if (filters.active === true && !hook.active) {
                continue;
            }
            if (filters.active === false && hook.active) {
                continue;
            }
            results.push(hook);
        }

        results.sort((a, b) => a.name.localeCompare(b.name));
        return results;
    }

    /**
     * Post-boot (and on-demand) audit of the catalog
     * @returns {{ defined: number, handlers: number, findings: object[] }}
     */
    static getAudit() {
        const findings = [];
        let handlers = 0;

        for (const handlerList of this.hooks.values()) {
            handlers += handlerList.length;
        }

        for (const [hookName, handlerList] of this.hooks) {
            if (!handlerList.length) {
                continue;
            }
            const owners = [...new Set(handlerList.map(handler => handler.pluginName))];
            const definition = this.definitions.get(hookName);

            if (!definition) {
                const suggestion = this._didYouMean(hookName);
                findings.push({
                    level: 'warning',
                    code: 'UNDEFINED_HOOK',
                    hookName,
                    owner: owners.join(', '),
                    message: `no definition for hook '${hookName}' ` +
                        `(registered by ${owners.join(', ')})`,
                    suggestion
                });
                continue;
            }

            if (!definition.active) {
                findings.push({
                    level: 'warning',
                    code: 'DISABLED_OWNER',
                    hookName,
                    owner: definition.owner,
                    message: `hook '${hookName}' is defined by '${definition.owner}', ` +
                        `which is currently disabled`
                });
            }

            if (definition.stability === 'deprecated') {
                const successor = definition.deprecatedBy
                    ? ` (use '${definition.deprecatedBy}')`
                    : '';
                findings.push({
                    level: 'warning',
                    code: 'DEPRECATED_HOOK',
                    hookName,
                    owner: definition.owner,
                    message: `handler on deprecated hook '${hookName}'${successor}`
                });
            }

            if (definition.stability === 'planned') {
                findings.push({
                    level: 'warning',
                    code: 'PLANNED_HOOK',
                    hookName,
                    owner: definition.owner,
                    message: `handler on planned hook '${hookName}' ` +
                        `(defined but not yet fired)`
                });
            }
        }

        for (const definition of this.definitions.values()) {
            if (definition.conflicts.length > 0) {
                const others = definition.conflicts.map(conflict => conflict.owner).join(', ');
                findings.push({
                    level: 'error',
                    code: 'CONFLICTING_DEFINITION',
                    hookName: definition.name,
                    owner: definition.owner,
                    message: `conflicting definition of '${definition.name}': ` +
                        `keeping '${definition.owner}', ignoring ${others}`
                });
            }

            if (definition.thin && definition.active) {
                findings.push({
                    level: 'info',
                    code: 'INCOMPLETE_DEFINITION',
                    hookName: definition.name,
                    owner: definition.owner,
                    message: `hook '${definition.name}' is defined with a description only`
                });
            }

            const prefixes = this._recommendedPrefixes(definition.owner);
            if (prefixes.length > 0 && !prefixes.some(prefix => definition.name.startsWith(prefix))) {
                findings.push({
                    level: 'info',
                    code: 'PREFIX_MISMATCH',
                    hookName: definition.name,
                    owner: definition.owner,
                    message: `hook '${definition.name}' (owner '${definition.owner}') ` +
                        `does not start with ${prefixes.map(prefix => `'${prefix}'`).join(' or ')}`
                });
            }
        }

        const levelOrder = { error: 0, warning: 1, info: 2 };
        findings.sort((a, b) =>
            (levelOrder[a.level] ?? 9) - (levelOrder[b.level] ?? 9) ||
            a.hookName.localeCompare(b.hookName));

        let defined = 0;
        for (const definition of this.definitions.values()) {
            if (definition.active) {
                defined++;
            }
        }

        return { defined, handlers, findings };
    }

    /**
     * Log getAudit() findings and optionally print a bootstrap banner line
     * @param {function} [bannerLog] - (message, level) => void
     * @returns {object} The audit result
     */
    static logAudit(bannerLog) {
        const audit = this.getAudit();
        const errors = audit.findings.filter(finding => finding.level === 'error');
        const warnings = audit.findings.filter(finding => finding.level === 'warning');

        if (typeof bannerLog === 'function') {
            if (errors.length || warnings.length) {
                bannerLog(
                    `⚠️  Hook audit: ${warnings.length} warning(s), ${errors.length} error(s)`,
                    errors.length ? 'error' : 'warn'
                );
            } else {
                bannerLog(`✅ Hook audit: ${audit.defined} defined, ${audit.handlers} handler(s)`);
            }
        }

        for (const finding of audit.findings) {
            const suffix = finding.suggestion ? `; did you mean '${finding.suggestion}'?` : '';
            const message = finding.message + suffix;
            if (finding.level === 'error') {
                global.LogController?.logError(null, 'hook-manager.audit', message);
            } else if (finding.level === 'warning') {
                global.LogController?.logWarning(null, 'hook-manager.audit', message);
            } else {
                global.LogController?.logInfo(null, 'hook-manager.audit', message);
            }
        }

        return audit;
    }

    /**
     * Register a hook handler
     * @param {string} hookName - Name of the hook (e.g., 'onAuthBeforeLogin')
     * @param {string} pluginName - Plugin registering the handler
     * @param {Function} handler - Handler function (async, receives context, returns modified context)
     * @param {number} priority - Execution priority (lower = earlier, default 100)
     */
    static register(hookName, pluginName, handler, priority = 100) {
        // An undefined name is still registered - the producer may not have loaded yet.
        // Unmatched names are reported once by getAudit(), not warned about per registration.

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
        const isStatsHook = hookName === 'onSystemGetStats';
        const onError = this._onErrorFor(hookName, 'execute');

        for (const { handler, pluginName } of handlers) {
            const startTime = isStatsHook ? Date.now() : null;

            try {
                const result = await handler(context);
                if (this._isContextObject(result)) {
                    context = result;
                }

                // For onSystemGetStats, track elapsed time per plugin component
                if (isStatsHook && startTime !== null && context.stats?.[pluginName]) {
                    context.stats[pluginName].elapsed = Date.now() - startTime;
                }
            } catch (error) {
                if (onError === 'abort') {
                    throw this._abortError(error, hookName, pluginName);
                }
                global.LogController?.logError(null, `hook.${hookName}`,
                    `Plugin '${pluginName}' error: ${error.message}`);
            }
        }

        return context;
    }

    /**
     * Execute only the hook handlers registered by one specific plugin - not a broadcast to
     * every plugin registered for the hook (unlike execute()/executeFirst()).
     * Default onError is 'abort': a thrown error propagates to the caller so a handler can
     * reject the caller's operation (e.g. a config save). A definition may override to
     * 'continue', in which case the error is logged and the next handler runs.
     * @param {string} hookName - Name of the hook
     * @param {string} pluginName - Only run handlers registered by this plugin
     * @param {object} context - Context object passed to handlers
     * @returns {Promise<object>} Modified context
     * @throws {Error} Propagates any error thrown by a handler when onError is 'abort'
     */
    static async executeForPlugin(hookName, pluginName, context) {
        const handlers = (this.hooks.get(hookName) || []).filter(h => h.pluginName === pluginName);
        const onError = this._onErrorFor(hookName, 'executeForPlugin');

        for (const { handler } of handlers) {
            try {
                const result = await handler(context);
                if (this._isContextObject(result)) {
                    context = result;
                }
            } catch (error) {
                if (onError === 'abort') {
                    throw this._abortError(error, hookName, pluginName);
                }
                global.LogController?.logError(null, `hook.${hookName}`,
                    `Plugin '${pluginName}' error: ${error.message}`);
            }
        }

        return context;
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
        const onError = this._onErrorFor(hookName, 'executeFirst');

        for (const { handler, pluginName } of handlers) {
            try {
                const result = await handler(context);
                if (result !== undefined && result !== null) {
                    return result;
                }
            } catch (error) {
                if (onError === 'abort') {
                    throw this._abortError(error, hookName, pluginName);
                }
                global.LogController?.logError(null, `hook.${hookName}`,
                    `Plugin '${pluginName}' error: ${error.message}`);
            }
        }

        return null;
    }

    /**
     * Resolve the onError policy for a hook
     * An undefined hook keeps the mode's historical default, so unmigrated callers still work.
     * @param {string} hookName - Hook name
     * @param {string} mode - Execute method being used
     * @returns {'continue'|'abort'}
     */
    static _onErrorFor(hookName, mode) {
        const definition = this.definitions.get(hookName);
        if (definition) {
            return definition.onError;
        }
        return mode === 'executeForPlugin' ? 'abort' : 'continue';
    }

    /**
     * True when a handler return value is a context object worth assigning
     * Non-object returns (false, strings, numbers) are ignored - they used to overwrite the
     * context and crash the caller.
     * @param {*} value - Handler return value
     * @returns {boolean}
     */
    static _isContextObject(value) {
        return value !== undefined && value !== null && typeof value === 'object';
    }

    /**
     * Stamp the throwing handler onto an error so the producer can name it
     * @param {*} error - Thrown value
     * @param {string} hookName - Hook being executed
     * @param {string} pluginName - Handler owner
     * @returns {Error}
     */
    static _abortError(error, hookName, pluginName) {
        const abortError = error instanceof Error ? error : new Error(String(error));
        abortError.hookName = hookName;
        abortError.pluginName = pluginName;
        return abortError;
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
     * Get all available hooks - every active definition, framework and third-party alike
     * A view over the catalog in the shape the doc generators and the admin UI consume.
     * `canCancel` is derived from the definition's `onError` policy rather than stored, which
     * is what kept it drifting out of sync with reality when it was a hand-set flag.
     * @returns {object} Map of hook name to { description, context, canModify, canCancel }
     */
    static getAvailableHooks() {
        const result = {};

        for (const [hookName, definition] of this.definitions) {
            if (!definition.active) {
                continue;
            }
            result[hookName] = {
                description: definition.description,
                context: this._formatContext(definition),
                canModify: definition.canModify,
                canCancel: definition.onError === 'abort'
            };
        }

        return result;
    }

    /**
     * Get hooks filtered by namespace prefix
     * @param {string} namespace - Namespace prefix (e.g., 'auth', 'user')
     * @returns {object} Filtered hooks
     */
    static getHooksByNamespace(namespace) {
        const pattern = new RegExp('^' + String(namespace).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const found = this.findHooks({ namePattern: pattern, active: true });
        const result = {};
        for (const hook of found) {
            if (!hook.defined) {
                continue;
            }
            result[hook.name] = {
                description: hook.definition.description,
                context: hook.definition.context,
                canModify: hook.definition.canModify,
                canCancel: hook.definition.canCancel
            };
        }
        return result;
    }

    /**
     * Check if a hook name is defined
     * @param {string} hookName - Hook name to validate
     * @returns {boolean} True if an active definition exists
     */
    static isValidHook(hookName) {
        const definition = this.definitions.get(hookName);
        return !!(definition && definition.active);
    }

    /**
     * Get hook metrics (standardized getMetrics() format)
     * @returns {object} Component metrics with standardized structure
     */
    static getMetrics() {
        let available = 0;
        for (const definition of this.definitions.values()) {
            if (definition.active) {
                available++;
            }
        }

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
     * Clear all registered hook handlers (for testing)
     * Definitions are left alone - use clearDefinitions() to empty the catalog.
     */
    static clear() {
        this.hooks.clear();
    }

    /**
     * Clear all hook definitions (for testing)
     * Call seedFrameworkDefinitions() to get the framework catalog back.
     */
    static clearDefinitions() {
        this.definitions.clear();
    }
}

// The framework's own definitions, through the same public API everyone else uses
HookManager.seedFrameworkDefinitions();

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
