/**
 * @name            jPulse Framework / WebApp / Utils / Context Extensions
 * @tagline         Handlebars Context Extension System
 * @description     Allows site controllers to extend handlebars context (W-014)
 * @file            webapp/utils/context-extensions.js
 * @version         0.1.4
 * @release         2025-11-05
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

/**
 * Context Extensions System (W-014)
 *
 * Allows site controllers and plugins to extend the handlebars context
 * with custom variables and functions. Follows "don't make me think" principle.
 */
class ContextExtensions {

    static extensions = {
        providers: new Map(),
        cache: new Map(),
        lastUpdate: null
    };

    /**
     * Register a context provider
     * @param {string} name - Provider name (e.g., 'site', 'plugin-name')
     * @param {Function} provider - Function that returns context object
     * @param {Object} options - Provider options
     */
    static registerProvider(name, provider, options = {}) {
        this.extensions.providers.set(name, {
            name,
            provider,
            priority: options.priority || 100,
            cache: options.cache !== false,
            registeredAt: new Date().toISOString()
        });

        // Clear cache when new provider is registered
        this.extensions.cache.clear();
        this.extensions.lastUpdate = new Date().toISOString();

        global.LogController.logInfo(null, 'context-extensions', `Registered provider '${name}' with priority ${options.priority || 100}`);
    }

    /**
     * Get extended context for handlebars processing
     * @param {Object} baseContext - Base context from view controller
     * @param {Object} req - Express request object
     * @returns {Object} Extended context
     */
    static async getExtendedContext(baseContext, req) {
        try {
            const cacheKey = this.getCacheKey(req);

            // Check cache first (if enabled)
            if (this.extensions.cache.has(cacheKey)) {
                const cached = this.extensions.cache.get(cacheKey);
                return { ...baseContext, ...cached };
            }

            // Get all providers sorted by priority
            const providers = Array.from(this.extensions.providers.values())
                .sort((a, b) => a.priority - b.priority);

            let extendedContext = {};

            // Execute providers in priority order
            for (const providerInfo of providers) {
                try {
                    const result = await providerInfo.provider(baseContext, req);
                    if (result && typeof result === 'object') {
                        extendedContext = { ...extendedContext, ...result };
                    }
                } catch (error) {
                    LogController.logError(null, 'context-extensions.getExtendedContext', `Provider '${providerInfo.name}' failed: ${error.message}`);
                }
            }

            // Cache the result
            this.extensions.cache.set(cacheKey, extendedContext);

            return { ...baseContext, ...extendedContext };

        } catch (error) {
            LogController.logError(null, 'context-extensions.getExtendedContext', `Failed to extend context: ${error.message}`);
            return baseContext; // Fallback to base context
        }
    }

    /**
     * Generate cache key for request
     * @param {Object} req - Express request object
     * @returns {string} Cache key
     */
    static getCacheKey(req) {
        const user = req.session?.user?.username || 'guest';
        const path = req.path || '/';
        return `${user}:${path}`;
    }

    /**
     * Clear context cache
     * @param {string} pattern - Optional pattern to match cache keys
     */
    static clearCache(pattern = null) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const [key] of this.extensions.cache) {
                if (regex.test(key)) {
                    this.extensions.cache.delete(key);
                }
            }
        } else {
            this.extensions.cache.clear();
        }
    }

    /**
     * Get extension statistics
     * @returns {Object} Extension stats
     */
    static getStats() {
        return {
            providers: this.extensions.providers.size,
            cacheSize: this.extensions.cache.size,
            lastUpdate: this.extensions.lastUpdate,
            providerList: Array.from(this.extensions.providers.values()).map(p => ({
                name: p.name,
                priority: p.priority,
                cache: p.cache,
                registeredAt: p.registeredAt
            }))
        };
    }

    /**
     * Initialize with default site provider
     */
    static async initialize() {
        // Register default site provider (looks for site context extensions)
        this.registerProvider('site', async (baseContext, req) => {
            try {
                const SiteControllerRegistry = (await import('./site-controller-registry.js')).default;

                // Check if site has a context provider
                if (SiteControllerRegistry.hasController('context')) {
                    const ContextController = await SiteControllerRegistry.loadController('context');
                    if (ContextController.getContext) {
                        return await ContextController.getContext(baseContext, req);
                    }
                }

                return {}; // No site context extensions

            } catch (error) {
                // Site context provider is optional
                return {};
            }
        }, { priority: 50, cache: true });

        global.LogController.logInfo(null, 'context-extensions', 'Initialized with default providers');
    }
}

export default ContextExtensions;

// EOF webapp/utils/context-extensions.js
