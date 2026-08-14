/**
 * @name            jPulse Framework / WebApp / Utils / Plugin Manager
 * @tagline         Plugin Discovery and Lifecycle Management
 * @description     Manages plugin discovery, validation, dependencies, and lifecycle
 * @file            webapp/utils/plugin-manager.js
 * @version         1.7.14
 * @release         2026-08-14
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import SymlinkManager from './symlink-manager.js';
import CommonUtils from './common.js';

/**
 * Plugin Manager - handles plugin discovery, validation, and lifecycle
 * Implements W-045 Plugin Infrastructure Foundation
 */
class PluginManager {
    /**
     * Plugin registry (.jpulse/plugins.json)
     */
    static registry = {
        plugins: [],
        loadOrder: [],
        lastScan: null
    };

    /**
     * Discovered plugins (in-memory cache)
     */
    static discovered = new Map();

    /**
     * Initialized flag
     */
    static initialized = false;

    /**
     * Initialize Plugin Manager
     * Discovers and validates all plugins
     * @returns {object} Statistics about discovered plugins
     */
    static async initialize() {
        if (this.initialized) {
            return this.getMetrics();
        }

        const projectRoot = global.appConfig.system.projectRoot;
        const pluginsDir = path.join(projectRoot, 'plugins');
        const jpulseDir = path.join(projectRoot, '.jpulse');
        const registryPath = path.join(jpulseDir, 'plugins.json');

        // Ensure .jpulse directory exists
        if (!fs.existsSync(jpulseDir)) {
            fs.mkdirSync(jpulseDir, { recursive: true });
        }

        // Ensure plugins directory exists
        if (!fs.existsSync(pluginsDir)) {
            fs.mkdirSync(pluginsDir, { recursive: true });
        }

        // Load existing registry or create new one
        if (fs.existsSync(registryPath)) {
            try {
                this.registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            } catch (error) {
                // W-199: never silently persist a mass-reset - a corrupt/unreadable
                // registry file would otherwise cause discoverPlugins() to treat every
                // plugin as brand-new and re-default it to its own autoEnable value
                // (e.g. re-disabling auth-mfa/auth-oauth), then persist that reset
                // state on top of the previously-correct one. Log loudly so this is
                // never a silent, unattended state change.
                global.LogController?.logError(null, 'plugin-manager.initialize',
                    `error: Failed to load plugin registry (${registryPath}), resetting to empty and re-discovering all plugins with their default autoEnable values: ${error.message}`);
                this.registry = {
                    plugins: [],
                    loadOrder: [],
                    lastScan: null
                };
            }
        }

        // Discover plugins
        await this.discoverPlugins();

        // Resolve dependencies and determine load order
        this.resolveLoadOrder();

        // Save registry
        this.saveRegistry();

        this.initialized = true;

        // Register metrics provider
        const MetricsRegistry = (await import('./metrics-registry.js')).default;
        MetricsRegistry.register('plugins', () => this.getMetrics(), {
            async: false,
            category: 'util'
        });

        return this.getMetrics();
    }

    /**
     * Discover all plugins in plugins/ directory
     * @returns {number} Number of plugins discovered
     */
    static async discoverPlugins() {
        const projectRoot = global.appConfig.system.projectRoot;
        const pluginsDir = path.join(projectRoot, 'plugins');

        if (!fs.existsSync(pluginsDir)) {
            return 0;
        }

        const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
        const now = new Date().toISOString();
        let discoveredCount = 0;

        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }

            const pluginName = entry.name;
            const pluginPath = path.join(pluginsDir, pluginName);
            const pluginJsonPath = path.join(pluginPath, 'plugin.json');

            // Skip if no plugin.json
            if (!fs.existsSync(pluginJsonPath)) {
                continue;
            }

            try {
                // Load and validate plugin.json
                const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
                const validation = this.validatePluginJson(pluginJson, pluginPath);

                if (!validation.valid) {
                    console.error(`Plugin ${pluginName} validation failed:`, validation.errors);
                    continue;
                }

                // W-045-TD-18: Sanitize HTML in plugin descriptions to prevent XSS attacks
                if (pluginJson.description) {
                    pluginJson.description = CommonUtils.sanitizeHtml(pluginJson.description);
                }
                if (pluginJson.summary) {
                    pluginJson.summary = CommonUtils.sanitizeHtml(pluginJson.summary);
                }

                // Check if plugin already in registry
                let registryEntry = this.registry.plugins.find(p => p.name === pluginName);

                if (!registryEntry) {
                    // New plugin - add to registry
                    const autoEnable = pluginJson.autoEnable !== undefined ? pluginJson.autoEnable : true;

                    registryEntry = {
                        name: pluginName,
                        version: pluginJson.version,
                        enabled: autoEnable,
                        autoEnable: autoEnable,
                        discoveredAt: now,
                        enabledAt: autoEnable ? now : null,
                        status: 'discovered',
                        errors: [],
                        path: pluginPath
                    };

                    this.registry.plugins.push(registryEntry);
                } else {
                    // Existing plugin - update discovery info
                    registryEntry.version = pluginJson.version;
                    registryEntry.path = pluginPath;
                    if (registryEntry.status === 'missing') {
                        registryEntry.status = 'discovered';
                    }
                }

                // Store in discovered cache
                this.discovered.set(pluginName, {
                    name: pluginName,
                    metadata: pluginJson,
                    path: pluginPath,
                    registryEntry: registryEntry
                });

                // W-045: Create symlinks for static assets and documentation
                if (registryEntry.enabled) {
                    // Static assets symlink
                    const staticResult = SymlinkManager.createPluginSymlink(pluginName, pluginPath);
                    if (!staticResult.success && !staticResult.message.includes('not found')) {
                        console.warn(`Plugin ${pluginName} static symlink:`, staticResult.message);
                    }

                    // Documentation symlink
                    const docsResult = SymlinkManager.createPluginDocsSymlink(pluginName, pluginPath);
                    if (!docsResult.success && !docsResult.message.includes('not found')) {
                        console.warn(`Plugin ${pluginName} docs symlink:`, docsResult.message);
                    }
                }

                discoveredCount++;

            } catch (error) {
                console.error(`Failed to load plugin ${pluginName}:`, error.message);
            }
        }

        // Mark missing plugins
        for (const registryEntry of this.registry.plugins) {
            if (!this.discovered.has(registryEntry.name)) {
                registryEntry.status = 'missing';
                registryEntry.errors = ['Plugin directory or plugin.json not found'];
            }
        }

        this.registry.lastScan = now;

        return discoveredCount;
    }

    /**
     * Validate plugin.json structure
     * @param {object} pluginJson - Plugin metadata
     * @param {string} pluginPath - Path to plugin directory
     * @returns {object} Validation result { valid: boolean, errors: array }
     */
    static validatePluginJson(pluginJson, pluginPath) {
        const errors = [];

        // Required fields
        if (!pluginJson.name || typeof pluginJson.name !== 'string') {
            errors.push('Missing or invalid "name" field');
        }
        if (!pluginJson.version || typeof pluginJson.version !== 'string') {
            errors.push('Missing or invalid "version" field');
        }
        if (!pluginJson.description || typeof pluginJson.description !== 'string') {
            errors.push('Missing or invalid "description" field');
        }
        if (!pluginJson.author || typeof pluginJson.author !== 'string') {
            errors.push('Missing or invalid "author" field');
        }

        // jpulseVersion compatibility check
        if (pluginJson.jpulseVersion) {
            const currentVersion = global.appConfig.app.jPulse.version;
            // Simple version check (can be enhanced with semver)
            // For now, just check if specified version is not greater than current
            // TODO: Implement proper semver comparison
        }

        // Validate config.schema if present
        if (pluginJson.config && pluginJson.config.schema) {
            if (!Array.isArray(pluginJson.config.schema)) {
                errors.push('config.schema must be an array');
            } else {
                for (const field of pluginJson.config.schema) {
                    // All fields must have a type
                    if (!field.type) {
                        errors.push(`Invalid config.schema field: missing type`);
                        continue;
                    }

                    // Non-input types (help, separator, etc.) don't need id or label
                    const nonInputTypes = ['help', 'separator', 'hidden'];
                    if (!nonInputTypes.includes(field.type)) {
                        // Input fields require id and label
                        if (!field.id) {
                            errors.push(`Invalid config.schema field of type "${field.type}": missing id`);
                        }
                        if (!field.label && field.type !== 'hidden') {
                            errors.push(`Invalid config.schema field of type "${field.type}": missing label`);
                        }
                    }

                    // W-194: custom fields must declare which renderer draws them
                    if (field.type === 'custom' && (!field.renderer || typeof field.renderer !== 'string')) {
                        errors.push(`Invalid config.schema field "${field.id}" of type "custom": missing renderer`);
                    }
                }
            }
        }

        // Validate dependencies
        if (pluginJson.dependencies) {
            if (pluginJson.dependencies.plugins && typeof pluginJson.dependencies.plugins !== 'object') {
                errors.push('dependencies.plugins must be an object');
            }
            if (pluginJson.dependencies.npm && typeof pluginJson.dependencies.npm !== 'object') {
                errors.push('dependencies.npm must be an object');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Resolve plugin dependencies and determine load order
     * Uses topological sort to handle plugin dependencies
     * @returns {array} Ordered array of plugin names
     */
    static resolveLoadOrder() {
        const enabled = this.registry.plugins.filter(p => p.enabled && p.status !== 'missing');
        const graph = new Map();
        const inDegree = new Map();

        // Build dependency graph
        for (const plugin of enabled) {
            const pluginData = this.discovered.get(plugin.name);
            if (!pluginData) continue;

            graph.set(plugin.name, []);
            inDegree.set(plugin.name, 0);
        }

        // Add edges for plugin dependencies
        for (const plugin of enabled) {
            const pluginData = this.discovered.get(plugin.name);
            if (!pluginData) continue;

            const dependencies = pluginData.metadata.dependencies?.plugins || {};

            for (const depName of Object.keys(dependencies)) {
                if (graph.has(depName)) {
                    graph.get(depName).push(plugin.name);
                    inDegree.set(plugin.name, inDegree.get(plugin.name) + 1);
                } else {
                    // Dependency not enabled or not found
                    plugin.errors.push(`Missing dependency: ${depName}`);
                    plugin.status = 'error';
                }
            }
        }

        // Topological sort (Kahn's algorithm)
        const queue = [];
        const result = [];

        // Add nodes with no dependencies
        for (const [name, degree] of inDegree.entries()) {
            if (degree === 0) {
                queue.push(name);
            }
        }

        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);

            const neighbors = graph.get(current) || [];
            for (const neighbor of neighbors) {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        // Check for circular dependencies
        if (result.length !== graph.size) {
            console.error('Circular dependency detected in plugins');
            // Mark plugins with circular dependencies as error
            for (const [name, degree] of inDegree.entries()) {
                if (degree > 0) {
                    const plugin = this.registry.plugins.find(p => p.name === name);
                    if (plugin) {
                        plugin.errors.push('Circular dependency detected');
                        plugin.status = 'error';
                    }
                }
            }
        }

        // Update load order
        this.registry.loadOrder = result;

        return result;
    }

    /**
     * Get active plugins in load order
     * @returns {array} Array of plugin objects with metadata
     */
    static getActivePlugins() {
        return this.registry.loadOrder
            .map(name => this.discovered.get(name))
            .filter(plugin => plugin && plugin.registryEntry.enabled && plugin.registryEntry.status !== 'error');
    }

    /**
     * Re-read the on-disk plugin registry immediately before a mutating action
     * (enablePlugin/disablePlugin/rescan), so this instance's in-memory copy - which
     * may be stale relative to a peer PM2 instance's more recent write - doesn't
     * blindly clobber that peer's change when this instance saves (W-199).
     * Re-points each `discovered` entry's cached `registryEntry` reference to the
     * freshly-loaded object so getActivePlugins()/hook registration stay in sync
     * with the reloaded registry.
     * On read/parse failure, logs a warning and keeps the current in-memory registry
     * rather than resetting it (never silently mass-reset).
     */
    static _reloadRegistryFromDisk() {
        const projectRoot = global.appConfig.system.projectRoot;
        const registryPath = path.join(projectRoot, '.jpulse', 'plugins.json');

        if (!fs.existsSync(registryPath)) {
            return;
        }

        let freshRegistry;
        try {
            freshRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        } catch (error) {
            global.LogController?.logError(null, 'plugin-manager._reloadRegistryFromDisk',
                `error: Failed to re-read plugin registry (${registryPath}) before write, keeping current in-memory state: ${error.message}`);
            return;
        }

        this.registry = freshRegistry;

        // Re-point discovered plugins' cached registryEntry to the freshly-loaded objects
        for (const [pluginName, pluginData] of this.discovered.entries()) {
            const freshEntry = this.registry.plugins.find(p => p.name === pluginName);
            if (freshEntry) {
                pluginData.registryEntry = freshEntry;
            }
        }
    }

    /**
     * Enable a plugin
     * @param {string} name - Plugin name
     * @returns {object} Result { success: boolean, message: string }
     */
    static async enablePlugin(name) {
        // W-199: re-read the on-disk registry fresh before merging, so a peer PM2
        // instance's more recent write isn't clobbered by this instance's stale copy
        this._reloadRegistryFromDisk();

        const plugin = this.registry.plugins.find(p => p.name === name);

        if (!plugin) {
            return { success: false, message: 'Plugin not found' };
        }

        if (plugin.enabled) {
            return { success: false, message: 'Plugin already enabled' };
        }

        // Check dependencies
        const pluginData = this.discovered.get(name);
        if (pluginData) {
            const dependencies = pluginData.metadata.dependencies?.plugins || {};
            for (const depName of Object.keys(dependencies)) {
                const dep = this.registry.plugins.find(p => p.name === depName);
                if (!dep || !dep.enabled) {
                    return { success: false, message: `Missing required dependency: ${depName}` };
                }
            }
        }

        plugin.enabled = true;
        plugin.enabledAt = new Date().toISOString();
        plugin.status = 'discovered';
        plugin.errors = [];

        // Resolve load order
        this.resolveLoadOrder();

        // Save registry
        this.saveRegistry();

        if (global.HookManager) {
            global.HookManager.setDefinitionsActive(name, true);
            await this._registerOnePluginHooks(name);
        }

        return { success: true, message: 'Plugin enabled. Restart required to take effect.' };
    }

    /**
     * Disable a plugin
     * @param {string} name - Plugin name
     * @returns {object} Result { success: boolean, message: string }
     */
    static async disablePlugin(name) {
        // W-199: re-read the on-disk registry fresh before merging, so a peer PM2
        // instance's more recent write isn't clobbered by this instance's stale copy
        this._reloadRegistryFromDisk();

        const plugin = this.registry.plugins.find(p => p.name === name);

        if (!plugin) {
            return { success: false, message: 'Plugin not found' };
        }

        if (!plugin.enabled) {
            return { success: false, message: 'Plugin already disabled' };
        }

        // Check if other plugins depend on this one
        const dependents = [];
        for (const other of this.registry.plugins) {
            if (!other.enabled || other.name === name) continue;

            const otherData = this.discovered.get(other.name);
            if (otherData) {
                const dependencies = otherData.metadata.dependencies?.plugins || {};
                if (dependencies[name]) {
                    dependents.push(other.name);
                }
            }
        }

        if (dependents.length > 0) {
            return { success: false, message: `Cannot disable: required by ${dependents.join(', ')}` };
        }

        plugin.enabled = false;
        plugin.status = 'disabled';

        // Resolve load order
        this.resolveLoadOrder();

        // Save registry
        this.saveRegistry();

        this.unregisterPluginHooks(name);

        return { success: true, message: 'Plugin disabled. Restart required to take effect.' };
    }

    /**
     * Save registry to .jpulse/plugins.json
     */
    static saveRegistry() {
        const projectRoot = global.appConfig.system.projectRoot;
        const jpulseDir = path.join(projectRoot, '.jpulse');
        const registryPath = path.join(jpulseDir, 'plugins.json');

        // W-199: atomic write (temp file + rename) eliminates torn reads by concurrent
        // PM2 cluster instances loading this same file at their own boot time
        CommonUtils.writeFileAtomic(registryPath, JSON.stringify(this.registry, null, 2));
    }

    /**
     * Get plugin metrics (standardized getMetrics() format)
     * @returns {object} Component metrics with standardized structure
     */
    static getMetrics() {
        // Inline existing getStatistics() logic
        const total = this.registry.plugins.length;
        const enabled = this.registry.plugins.filter(p => p.enabled).length;
        const disabled = this.registry.plugins.filter(p => !p.enabled).length;
        const errors = this.registry.plugins.filter(p => p.status === 'error').length;
        const missing = this.registry.plugins.filter(p => p.status === 'missing').length;

        return {
            component: 'PluginManager',
            status: errors > 0 ? 'warning' : 'ok',
            initialized: this.initialized,
            stats: {
                total,
                enabled,
                disabled,
                errors,
                missing,
                loadOrder: this.registry.loadOrder
            },
            meta: {
                ttl: 300000,  // 5 minutes
                category: 'util',
                fields: {
                    // Only specify fields that need overrides or exclusions
                    'loadOrder': {
                        visualize: false,  // Exclude from visualization
                        aggregate: false   // Exclude from aggregation
                    },
                    'missing': {
                        visualize: false   // Hide from UI
                    }
                    // All other fields (total, enabled, disabled, errors)
                    // use system defaults automatically
                }
            },
            timestamp: new Date().toISOString()
        };
    }


    /**
     * Get plugin by name
     * @param {string} name - Plugin name
     * @returns {object|null} Plugin data or null if not found
     */
    static getPlugin(name) {
        return this.discovered.get(name) || null;
    }

    /**
     * Get all plugins (discovered plugins with metadata merged with registry state)
     * @returns {array} Array of plugin objects with current enabled/disabled state
     */
    static getAllPlugins() {
        // Merge discovered plugins with registry state (enabled/disabled)
        return this.registry.plugins.map(registryEntry => {
            const discovered = this.discovered.get(registryEntry.name);
            if (discovered) {
                return {
                    ...discovered,
                    registryEntry: registryEntry  // Includes enabled, status, enabledAt, etc.
                };
            }
            return null;
        }).filter(p => p !== null);
    }

    /**
     * Rescan plugins directory for new plugins
     * @returns {object} Scan statistics
     */
    static async rescan() {
        // W-199: re-read the on-disk registry fresh before merging, so a peer PM2
        // instance's more recent write isn't clobbered by this instance's stale copy
        this._reloadRegistryFromDisk();

        const beforeCount = this.discovered.size;
        await this.discoverPlugins();
        this.resolveLoadOrder();
        this.saveRegistry();

        const afterCount = this.discovered.size;
        const newCount = afterCount - beforeCount;

        return {
            success: true,
            discovered: afterCount,
            new: newCount > 0 ? newCount : 0,
            message: newCount > 0 ? `Discovered ${newCount} new plugin(s)` : 'No new plugins found'
        };
    }

    // ========================================================================
    // W-105: Plugin Hook Registration
    // ========================================================================

    /**
     * Register hooks from all active plugins (W-105)
     * Scans plugin controllers for static `hooks` property and auto-registers
     * @returns {object} Registration statistics
     */
    static async registerPluginHooks() {
        if (!global.HookManager) {
            global.LogController?.logWarning(null, 'plugin-manager',
                'HookManager not available, skipping hook registration');
            return { registered: 0, plugins: [] };
        }

        const activePlugins = this.getActivePlugins();
        let totalRegistered = 0;
        const pluginsWithHooks = [];

        for (const plugin of activePlugins) {
            const pluginHookCount = await this._registerOnePluginHooks(plugin.name);

            if (pluginHookCount > 0) {
                totalRegistered += pluginHookCount;
                pluginsWithHooks.push({ name: plugin.name, hooks: pluginHookCount });
            }
        }

        global.LogController?.logInfo(null, 'plugin-manager',
            `Registered ${totalRegistered} hook(s) from ${pluginsWithHooks.length} plugin(s)`);

        return {
            registered: totalRegistered,
            plugins: pluginsWithHooks
        };
    }

    /**
     * Define and register hooks from one plugin's controllers
     * @param {string} pluginName - Plugin name
     * @returns {number} Handlers registered
     */
    static async _registerOnePluginHooks(pluginName) {
        const plugin = this.discovered.get(pluginName);
        if (!plugin || !global.HookManager) {
            return 0;
        }

        const pluginControllerDir = path.join(plugin.path, 'webapp', 'controller');
        if (!fs.existsSync(pluginControllerDir)) {
            return 0;
        }

        let count = 0;
        const files = fs.readdirSync(pluginControllerDir).filter(file => file.endsWith('.js'));
        for (const file of files) {
            const controllerPath = path.join(pluginControllerDir, file);
            try {
                const { default: Controller } = await import(`file://${controllerPath}`);
                if (Controller) {
                    count += this._registerControllerHooks(pluginName, Controller);
                }
            } catch (error) {
                global.LogController?.logError(null, `plugin.${pluginName}`,
                    `Failed to load controller ${file}: ${error.message}`);
            }
        }
        return count;
    }

    /**
     * Register hooks from a single controller (W-105)
     * Called by registerPluginHooks() for each controller with hooks
     * @param {string} pluginName - Plugin name
     * @param {object} Controller - Controller class with static `hooks` property
     * @returns {number} Number of hooks registered
     */
    static _registerControllerHooks(pluginName, Controller) {
        if (!global.HookManager) {
            return 0;
        }
        const result = global.HookManager.registerFromClass(pluginName, Controller);
        return result.registered;
    }

    /**
     * Unregister all hooks for a plugin and mark its definitions inactive
     * Called when disabling a plugin
     * @param {string} pluginName - Plugin name
     */
    static unregisterPluginHooks(pluginName) {
        if (global.HookManager) {
            global.HookManager.unregister(pluginName);
            global.HookManager.setDefinitionsActive(pluginName, false);
        }
    }
}

export default PluginManager;

// EOF webapp/utils/plugin-manager.js
