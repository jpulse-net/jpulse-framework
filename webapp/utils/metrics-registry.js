/**
 * @name            jPulse Framework / WebApp / Utils / Metrics Registry
 * @tagline         Centralized registration for component metrics providers
 * @description     Manages registration and discovery of component getMetrics() methods
 * @file            webapp/utils/metrics-registry.js
 * @version         1.6.12
 * @release         2026-02-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.1, Claude Sonnet 4.5
 */

/**
 * Metrics Registry - Centralized registration for component metrics providers
 * Components register their getMetrics() method during initialization
 * Implements W-112: metrics: strategy to report vital statistics of components
 */
class MetricsRegistry {
    /**
     * Registered metrics providers
     * Map of componentName -> { getMetrics: Function, async: boolean, category: string }
     */
    static providers = new Map();

    /**
     * Register a metrics provider
     * @param {string} name - Component name (e.g., 'cache', 'hooks', 'plugins')
     * @param {Function} getMetricsFn - Function that returns metrics (sync or async)
     * @param {Object} options - { async: false, category: 'util' }
     */
    static register(name, getMetricsFn, options = {}) {
        if (!name || typeof name !== 'string') {
            throw new Error('MetricsRegistry.register: name must be a non-empty string');
        }
        if (typeof getMetricsFn !== 'function') {
            throw new Error('MetricsRegistry.register: getMetricsFn must be a function');
        }

        this.providers.set(name, {
            getMetrics: getMetricsFn,
            async: options.async || false,
            category: options.category || 'other'
        });

        global.LogController?.logInfo(null, 'metrics-registry.register',
            `Registered metrics provider: ${name} (${options.async ? 'async' : 'sync'}, ${options.category || 'other'})`);
    }

    /**
     * Unregister a metrics provider
     * @param {string} name - Component name
     * @returns {boolean} True if provider was removed
     */
    static unregister(name) {
        if (this.providers.delete(name)) {
            global.LogController?.logInfo(null, 'metrics-registry.unregister',
                `Unregistered metrics provider: ${name}`);
            return true;
        }
        return false;
    }

    /**
     * Get all registered provider names
     * @returns {string[]} Array of component names
     */
    static getRegisteredNames() {
        return Array.from(this.providers.keys());
    }

    /**
     * Check if a provider is registered
     * @param {string} name - Component name
     * @returns {boolean} True if registered
     */
    static isRegistered(name) {
        return this.providers.has(name);
    }

    /**
     * Get provider info
     * @param {string} name - Component name
     * @returns {Object|null} Provider info or null if not found
     */
    static getProvider(name) {
        return this.providers.get(name) || null;
    }
}

export default MetricsRegistry;

// EOF webapp/utils/metrics-registry.js
