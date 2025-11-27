/**
 * @name            jPulse Framework / WebApp / Utils / Plugin Manager
 * @tagline         Plugin Discovery and Lifecycle Management
 * @description     Manages plugin discovery, validation, dependencies, and lifecycle
 * @file            webapp/utils/plugin-manager.js
 * @version         1.2.7
 * @release         2025-11-26
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
            return this.getStatistics();
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
                console.error('Failed to load plugin registry, creating new one:', error.message);
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

        return this.getStatistics();
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
                    if (!field.id || !field.label || !field.type) {
                        errors.push(`Invalid config.schema field: missing id, label, or type`);
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
     * Enable a plugin
     * @param {string} name - Plugin name
     * @returns {object} Result { success: boolean, message: string }
     */
    static async enablePlugin(name) {
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

        return { success: true, message: 'Plugin enabled. Restart required to take effect.' };
    }

    /**
     * Disable a plugin
     * @param {string} name - Plugin name
     * @returns {object} Result { success: boolean, message: string }
     */
    static async disablePlugin(name) {
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

        return { success: true, message: 'Plugin disabled. Restart required to take effect.' };
    }

    /**
     * Save registry to .jpulse/plugins.json
     */
    static saveRegistry() {
        const projectRoot = global.appConfig.system.projectRoot;
        const jpulseDir = path.join(projectRoot, '.jpulse');
        const registryPath = path.join(jpulseDir, 'plugins.json');

        fs.writeFileSync(registryPath, JSON.stringify(this.registry, null, 2));
    }

    /**
     * Get plugin statistics
     * @returns {object} Statistics
     */
    static getStatistics() {
        const total = this.registry.plugins.length;
        const enabled = this.registry.plugins.filter(p => p.enabled).length;
        const disabled = this.registry.plugins.filter(p => !p.enabled).length;
        const errors = this.registry.plugins.filter(p => p.status === 'error').length;
        const missing = this.registry.plugins.filter(p => p.status === 'missing').length;

        return {
            total,
            enabled,
            disabled,
            errors,
            missing,
            discovered: this.discovered.size,
            loadOrder: this.registry.loadOrder
        };
    }

    /**
     * Get health status (standardized format for HealthController)
     * @returns {object} Health status
     */
    static getHealthStatus() {
        const stats = this.getStatistics();

        let status = 'ok';
        if (stats.errors > 0 || stats.missing > 0) {
            status = 'warning';
        }

        const message = stats.errors > 0 || stats.missing > 0
            ? `${stats.errors} plugins with errors, ${stats.missing} missing`
            : '';

        return {
            status: status,
            pluginCount: stats.total,
            enabled: stats.enabled,
            disabled: stats.disabled,
            errors: stats.errors,
            missing: stats.missing,
            message: message
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
     * Get all plugins
     * @returns {array} Array of all plugin data
     */
    static getAllPlugins() {
        return Array.from(this.discovered.values());
    }

    /**
     * Rescan plugins directory for new plugins
     * @returns {object} Scan statistics
     */
    static async rescan() {
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
}

export default PluginManager;

// EOF webapp/utils/plugin-manager.js
