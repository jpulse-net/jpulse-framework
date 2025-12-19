/**
 * @name            jPulse Framework / WebApp / Controller / Handlebar
 * @tagline         Handlebars template processing controller
 * @description     Extracted handlebars processing logic from ViewController (W-088)
 * @file            webapp/controller/handlebar.js
 * @version         1.3.19
 * @release         2025-12-19
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.2, Claude Sonnet 4.5
 */

import path from 'path';
import { readdirSync, statSync, readFileSync } from 'fs';
import LogController from './log.js';
import configModel from '../model/config.js';
import PathResolver from '../utils/path-resolver.js';
import AuthController from './auth.js';
import cacheManager from '../utils/cache-manager.js';

// W-014: Import ContextExtensions at module level for performance
let ContextExtensions = null;       // initialized by initialize()

class HandlebarController {
    // Static properties for state
    static includeCache = null;     // initialized by initialize()
    static globalConfig = null;     // initialized by initialize()

    // W-116: Helper registry for plugin/site helpers
    // name → { handler: Function, type: 'regular'|'block', source: string, registeredAt: string }
    static helperRegistry = new Map();

    // Handlebars helper descriptions - single source of truth for all helpers
    // Used for documentation generation and helper lookup
    // ATTENTION: Keep this in sync with case in _buildInternalContext() and _evaluateBlockHandlebar()
    // source: 'jpulse' for core framework, 'site' for site-specific, plugin name for plugins
    static HANDLEBARS_DESCRIPTIONS = [
        // Regular helpers
        {name: 'and', type: 'regular', source: 'jpulse', description: 'Logical AND, returns "true" or "false" (1+ arguments)', example: '{{and user.isAuthenticated user.isAdmin}}'},
        {name: 'app', type: 'regular', source: 'jpulse', description: 'Application context (app.jPulse.* and app.site.*)', example: '{{app.site.name}} v{{app.site.version}}'},
        {name: 'appCluster', type: 'regular', source: 'jpulse', description: 'Redis cluster availability information', example: '{{appCluster.*}}'},
        {name: 'appConfig', type: 'regular', source: 'jpulse', description: 'Full application configuration (filtered based on auth)', example: '{{appConfig.*}}'},
        {name: 'components', type: 'regular', source: 'jpulse', description: 'Reusable component call with parameters', example: '{{components.jpIcons.configSvg size="64"}}'},
        {name: 'eq', type: 'regular', source: 'jpulse', description: 'Equality comparison, returns "true" or "false" (2 arguments)', example: '{{eq user.role "admin"}}'},
        {name: 'file', type: 'regular', source: 'jpulse', description: 'File operations (include, exists, list, timestamp)', example: '{{file.include "template.tmpl"}}'},
        {name: 'gt', type: 'regular', source: 'jpulse', description: 'Greater than comparison, returns "true" or "false" (2 arguments)', example: '{{gt user.score 100}}'},
        {name: 'gte', type: 'regular', source: 'jpulse', description: 'Greater than or equal comparison, returns "true" or "false" (2 arguments)', example: '{{gte user.count 10}}'},
        {name: 'i18n', type: 'regular', source: 'jpulse', description: 'Internationalization messages from translation files', example: '{{i18n.view.home.introduction}}'},
        {name: 'let', type: 'regular', source: 'jpulse', description: 'Define custom variables (accessed via {{vars.*}})', example: '{{let pageTitle="Dashboard" maxItems=10}}'},
        {name: 'lt', type: 'regular', source: 'jpulse', description: 'Less than comparison, returns "true" or "false" (2 arguments)', example: '{{lt user.age 18}}'},
        {name: 'lte', type: 'regular', source: 'jpulse', description: 'Less than or equal comparison, returns "true" or "false" (2 arguments)', example: '{{lte user.items 5}}'},
        {name: 'ne', type: 'regular', source: 'jpulse', description: 'Not equal comparison, returns "true" or "false" (2 arguments)', example: '{{ne user.role "guest"}}'},
        {name: 'not', type: 'regular', source: 'jpulse', description: 'Logical NOT, returns "true" or "false" (1 argument)', example: '{{not user.isGuest}}'},
        {name: 'or', type: 'regular', source: 'jpulse', description: 'Logical OR, returns "true" or "false" (1+ arguments)', example: '{{or user.isPremium user.isTrial}}'},
        {name: 'siteConfig', type: 'regular', source: 'jpulse', description: 'Site configuration values from ConfigModel (database)', example: '{{siteConfig.email.adminEmail}}'},
        {name: 'url', type: 'regular', source: 'jpulse', description: 'URL context (protocol, hostname, port, pathname, search, domain, param.*)', example: '{{url.protocol}}://{{url.hostname}}{{url.pathname}}'},
        {name: 'user', type: 'regular', source: 'jpulse', description: 'User context (username, loginId, firstName, lastName, email, roles, isAuthenticated, isAdmin)', example: '{{user.firstName}} {{user.email}}'},
        {name: 'vars', type: 'regular', source: 'jpulse', description: 'Custom variables defined with {{let}} or {{#let}}', example: '{{vars.pageTitle}}'},
        // Block helpers
        {name: 'and', type: 'block', source: 'jpulse', description: 'Logical AND block, renders true or else part (1+ arguments)', example: '{{#and user.isAuthenticated user.isAdmin}} admin {{else}} not admin {{/and}}'},
        {name: 'component', type: 'block', source: 'jpulse', description: 'Define reusable component with parameters', example: '{{#component "widgets.button" text="Click"}}...{{/component}}'},
        {name: 'each', type: 'block', source: 'jpulse', description: 'Iterate over array or object properties', example: '{{#each users}}...{{/each}}'},
        {name: 'eq', type: 'block', source: 'jpulse', description: 'Equality block, renders true or else part (2 arguments)', example: '{{#eq user.status "active"}} active {{else}} inactive {{/eq}}'},
        {name: 'gt', type: 'block', source: 'jpulse', description: 'Greater than block, renders true or else part (2 arguments)', example: '{{#gt user.score 100}} high score {{else}} low score {{/gt}}'},
        {name: 'gte', type: 'block', source: 'jpulse', description: 'Greater than or equal block, renders true or else part (2 arguments)', example: '{{#gte user.count 10}} enough {{else}} not enough {{/gte}}'},
        {name: 'if', type: 'block', source: 'jpulse', description: 'Conditional rendering based on truthy value', example: '{{#if user.isAuthenticated}} welcome {{else}} login {{/if}}'},
        {name: 'let', type: 'block', source: 'jpulse', description: 'Block-scoped custom variables (accessed via {{vars.*}})', example: '{{#let inner="inner"}}...{{/let}}'},
        {name: 'lt', type: 'block', source: 'jpulse', description: 'Less than block, renders true or else part (2 arguments)', example: '{{#lt user.age 18}} minor {{else}} adult {{/lt}}'},
        {name: 'lte', type: 'block', source: 'jpulse', description: 'Less than or equal block, renders true or else part (2 arguments)', example: '{{#lte user.items 5}} few items {{else}} many items {{/lte}}'},
        {name: 'ne', type: 'block', source: 'jpulse', description: 'Not equal block, renders true or else part (2 arguments)', example: '{{#ne user.role "guest"}} registered {{else}} guest {{/ne}}'},
        {name: 'not', type: 'block', source: 'jpulse', description: 'Logical NOT block, renders true or else part (1 argument)', example: '{{#not user.isGuest}} registered {{else}} guest {{/not}}'},
        {name: 'or', type: 'block', source: 'jpulse', description: 'Logical OR block, renders true or else part (1+ arguments)', example: '{{#or user.isPremium user.isTrial}} limited {{else}} full {{/or}}'},
        {name: 'unless', type: 'block', source: 'jpulse', description: 'Inverse conditional rendering (when condition is false)', example: '{{#unless user.isAuthenticated}} login {{else}} welcome {{/unless}}'},
        {name: 'with', type: 'block', source: 'jpulse', description: 'Switch context to object properties', example: '{{#with user}} {{firstName}} {{lastName}} {{/with}}'},
    ];

    /**
     * Initialize handlebar controller
     */
    static async initialize() {
        // Initialize include cache
        const includeCacheConfig = global.appConfig.controller.handlebar.cacheIncludes || { enabled: true };

        // In test mode, disable caching to prevent hanging
        if (process.env.NODE_ENV === 'test' || global.isTestEnvironment) {
            includeCacheConfig.enabled = false;
        }

        this.includeCache = cacheManager.register(includeCacheConfig, 'IncludeCache');
        LogController.logInfo(null, 'handlebar.initialize', 'IncludeCache initialized');

        // Load default config once
        try {
            const defaultDocName = global.ConfigController.getDefaultDocName();
            this.globalConfig = await configModel.findById(defaultDocName);
            LogController.logInfo(null, 'handlebar.initialize', `Default config loaded: ${defaultDocName}`);
        } catch (error) {
            LogController.logError(null, 'handlebar.initialize', `Failed to load default config: ${error.message}`);
        }

        // W-088: Register broadcast callback for generic config change events
        // RedisManager handles both Redis and local-only scenarios
        // omitSelf: false ensures local callback fires when Redis is unavailable
        // Subscribes to generic controller:config:data:changed event for clean separation of concerns
        try {
            global.RedisManager.registerBroadcastCallback('controller:config:data:changed', (channel, data, sourceInstanceId) => {
                // Only refresh if default config was changed
                if (data && data.id === global.ConfigController.getDefaultDocName()) {
                    this.refreshGlobalConfig();
                }
            }, { omitSelf: false });
            LogController.logInfo(null, 'handlebar.initialize', 'Registered broadcast callback for config change events');
        } catch (error) {
            // Don't fail initialization if broadcast registration fails
            LogController.logError(null, 'handlebar.initialize', `Failed to register broadcast callback: ${error.message}`);
        }

        // Get ContextExtensions if available
        if (global.ContextExtensions) {
            ContextExtensions = global.ContextExtensions;
        }

        // Register metrics provider (W-112)
        await this._registerMetricsProvider();
    }

    /**
     * W-116: Initialize and auto-discover custom Handlebars helpers from controllers
     * Scans site and plugin controllers for handlebar* methods and registers them
     * Must be called after PluginManager and SiteControllerRegistry are initialized
     * @returns {number} Number of helpers registered
     */
    static async initializeHandlebarHandlers() {
        // Skip in test environment or if dependencies not ready
        if (process.env.NODE_ENV === 'test' || global.isTestEnvironment) {
            return 0;
        }

        if (!global.PluginManager || !global.PluginManager.initialized) {
            LogController.logWarning(null, 'handlebar.initializeHandlebarHandlers',
                'PluginManager not initialized, skipping helper discovery');
            return 0;
        }

        const PathResolver = (await import('../utils/path-resolver.js')).default;
        const controllerFiles = PathResolver.collectControllerFiles();

        // W-116: Reverse order for correct override priority
        // collectControllerFiles() returns: [Site, Plugin 1, Plugin 2] (in dependency/load order)
        // Since Map.set() overwrites (last registered wins), we reverse to register:
        //   1. Plugin 2 (first, lowest priority - can be overridden)
        //   2. Plugin 1 (overwrites Plugin 2)
        //   3. Site (last, highest priority - overrides everything)
        // Final priority: Site > Plugin 1 > Plugin 2 > Core (built-in helpers)
        const reversedFiles = [...controllerFiles].reverse();

        let helperCount = 0;
        const { pathToFileURL } = await import('url');

        for (const { filePath, source } of reversedFiles) {
            helperCount += await this._registerHelpersFromFile(filePath, source, pathToFileURL);
        }

        if (helperCount > 0) {
            LogController.logInfo(null, 'handlebar.initializeHandlebarHandlers',
                `Registered ${helperCount} custom helper(s) from controllers`);
        }

        return helperCount;
    }

    /**
     * W-116: Extract JSDoc metadata from method source code
     * @param {string} fileContent - Full file content
     * @param {string} methodName - Method name to extract JSDoc for
     * @returns {Object} Extracted metadata {description, example}
     * @private
     */
    static _extractJSDoc(fileContent, methodName) {
        const result = { description: '', example: '' };

        // Find the method definition (handle both static and instance methods)
        const methodRegex = new RegExp(`(?:static\\s+)?${methodName}\\s*\\([^)]*\\)`, 'm');
        const methodMatch = fileContent.match(methodRegex);
        if (!methodMatch) {
            return result;
        }

        const methodIndex = methodMatch.index;
        const beforeMethod = fileContent.substring(0, methodIndex);

        // Find the JSDoc comment immediately before the method (non-greedy, closest match)
        // Match /** ... */ comments, handling multiline
        const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
        let jsdocMatch;
        let lastMatch = null;

        // Find the last JSDoc comment before the method
        while ((jsdocMatch = jsdocRegex.exec(beforeMethod)) !== null) {
            lastMatch = jsdocMatch;
        }

        if (!lastMatch) {
            return result;
        }

        const jsdocContent = lastMatch[1];

        // Extract @description (multiline support)
        // Match until next @tag, */, or end, but handle JSDoc line prefixes (*)
        const descMatch = jsdocContent.match(/@description\s+([\s\S]+?)(?=\n\s*\*\s*@|\*\/|$)/);
        if (descMatch) {
            // Remove JSDoc line prefixes (*) and normalize whitespace
            result.description = descMatch[1]
                .replace(/^\s*\*\s*/gm, '') // Remove leading * from each line
                .trim()
                .replace(/\s+/g, ' '); // Normalize whitespace
        }

        // Extract @example (multiline support)
        // Match until next @tag, */, or end, but don't stop at @ inside handlebars expressions
        const exampleMatch = jsdocContent.match(/@example\s+([\s\S]+?)(?=\n\s*\*\s*@|\*\/|$)/);
        if (exampleMatch) {
            // Remove JSDoc line prefixes (*) and normalize whitespace
            result.example = exampleMatch[1]
                .replace(/^\s*\*\s*/gm, '') // Remove leading * from each line
                .trim()
                .replace(/\s+/g, ' '); // Normalize whitespace
        }

        return result;
    }

    /**
     * W-116: Register Handlebars helpers from a controller file
     * @param {string} filePath - Full path to controller file
     * @param {string} source - Source identifier ('site' or 'plugin:name')
     * @param {Function} pathToFileURL - pathToFileURL function from 'url' module
     * @returns {number} Number of helpers registered
     */
    static async _registerHelpersFromFile(filePath, source, pathToFileURL) {
        let count = 0;
        try {
            const fileUrl = pathToFileURL(filePath).href;
            const controllerModule = await import(fileUrl);
            const controllerClass = controllerModule.default || controllerModule;

            // Check if it's a class with static methods
            if (typeof controllerClass === 'function' && controllerClass.prototype) {
                // Read file content for JSDoc extraction
                let fileContent = '';
                try {
                    fileContent = readFileSync(filePath, 'utf8');
                } catch (error) {
                    // If file can't be read, continue without JSDoc extraction
                }

                // Get all static methods starting with 'handlebar'
                const methodNames = Object.getOwnPropertyNames(controllerClass)
                    .filter(name => name.startsWith('handlebar') && typeof controllerClass[name] === 'function');

                for (const methodName of methodNames) {
                    // Extract helper name: handlebarMyHelper -> myHelper (lowercase)
                    const helperName = methodName.substring(9).toLowerCase(); // Remove 'handlebar' prefix and lowercase
                    if (helperName) {
                        const handler = controllerClass[methodName];
                        // Extract plugin name from source: 'plugin:hello-world' -> 'hello-world', 'site' -> 'site'
                        let helperSource = source;
                        if (source.startsWith('plugin:')) {
                            helperSource = source.substring(7); // Remove 'plugin:' prefix
                        }

                        // Extract JSDoc metadata
                        const jsdoc = fileContent ? this._extractJSDoc(fileContent, methodName) : {};

                        this.registerHelper(helperName, handler, {
                            source: helperSource,
                            description: jsdoc.description,
                            example: jsdoc.example
                        });
                        count++;
                    }
                }
            }
        } catch (error) {
            // Skip files that can't be imported (e.g., test files, invalid modules)
            // This is expected for some controller files
        }
        return count;
    }

    /**
     * Register metrics provider (W-112)
     */
    static async _registerMetricsProvider() {
        try {
            const MetricsRegistry = (await import('../utils/metrics-registry.js')).default;
            MetricsRegistry.register('handlebars', () => HandlebarController.getMetrics(), {
                async: false,
                category: 'controller'
            });
        } catch (error) {
            // MetricsRegistry might not be available yet
            LogController.logWarning(null, 'handlebar.initialize', `Failed to register metrics provider: ${error.message}`);
        }
    }

    /**
     * Get handlebar controller metrics (W-112)
     * @returns {Object} Component metrics with standardized structure
     */
    static getMetrics() {
        const isConfigured = this.includeCache !== null && this.globalConfig !== null;
        const includeCacheStats = this.includeCache ? this.includeCache.getStats() : {
            name: 'IncludeCache',
            fileCount: 0,
            directoryCount: 0,
            config: { enabled: false }
        };
        const defaultDocName = global.ConfigController?.getDefaultDocName() || '';

        // Derive arrays from HANDLEBARS_DESCRIPTIONS
        const regularHandlebars = this.HANDLEBARS_DESCRIPTIONS
            .filter(h => h.type === 'regular')
            .map(h => h.name)
            .sort();
        const blockHandlebars = this.HANDLEBARS_DESCRIPTIONS
            .filter(h => h.type === 'block')
            .map(h => h.name)
            .sort();

        return {
            component: 'HandlebarController',
            status: (isConfigured && this.globalConfig !== null) ? 'ok' : 'error',
            initialized: isConfigured,
            stats: {
                configured: isConfigured,
                configDocument: defaultDocName,
                configLoaded: this.globalConfig !== null,
                regularHandlebars: regularHandlebars.length,
                regularHandlebarsList: [...regularHandlebars], // Hidden metric, sorted
                blockHandlebars: blockHandlebars.length,
                blockHandlebarsList: [...blockHandlebars], // Hidden metric, sorted
                registeredHelpers: this.helperRegistry.size, // W-116: Count of registered custom helpers
                includeCache: {
                    enabled: includeCacheStats.config?.enabled || false,
                    fileCount: includeCacheStats.fileCount || 0,
                    directoryCount: includeCacheStats.directoryCount || 0
                }
            },
            meta: {
                ttl: 60000,  // 1 minute - config doesn't change often
                category: 'controller',
                fields: {
                    'configured': {
                        aggregate: 'first'  // Same across instances (if same version)
                    },
                    'configDocument': {
                        aggregate: 'first',  // Same across instances
                        visualize: false     // Hide from UI
                    },
                    'configLoaded': {
                        aggregate: 'first'  // Same across instances
                    },
                    'regularHandlebars': {
                        aggregate: 'first'  // May differ across jPulse versions
                    },
                    'blockHandlebars': {
                        aggregate: 'first'  // May differ across jPulse versions
                    },
                    'regularHandlebarsList': {
                        aggregate: false,   // Complex array, don't aggregate
                        visualize: false    // Hide from UI
                    },
                    'blockHandlebarsList': {
                        aggregate: false,   // Complex array, don't aggregate
                        visualize: false    // Hide from UI
                    },
                    'includeCache': {
                        aggregate: false,   // Complex object, don't aggregate
                        fields: {
                            'enabled': {
                                aggregate: 'first'
                            },
                            'fileCount': {
                                aggregate: 'sum'  // Sum across instances
                            },
                            'directoryCount': {
                                aggregate: 'sum'  // Sum across instances
                            }
                        }
                    }
                }
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * W-116: Register a custom Handlebars helper from site and plugin controllers
     * @param {string} name - Helper name (e.g., 'uppercase')
     * @param {Function} handler - Handler function
     * @param {Object} options - Registration options { source: 'plugin'|'site' }
     */
    static registerHelper(name, handler, options = {}) {
        // Validate handler is a function
        if (typeof handler !== 'function') {
            throw new Error(`Helper "${name}" handler must be a function`);
        }

        const paramCount = handler.length;

        // Strict validation: exactly 2 params for regular, exactly 3 for block
        // Expected signatures:
        //   Regular: (args: object, context: object) => string
        //   Block: (args: object, blockContent: string, context: object) => string
        let type = null;
        if (paramCount === 2) {
            type = 'regular';
        } else if (paramCount === 3) {
            type = 'block';
        } else {
            throw new Error(
                `Helper "${name}" has invalid parameter count: ${paramCount}. ` +
                `Expected 2 for regular helper (args, context) or 3 for block helper (args, blockContent, context)`
            );
        }

        // Normalize source: ensure 'jpulse', 'site', or plugin name
        const helperSource = options.source || 'unknown';
        if (helperSource === 'plugin') {
            // Legacy: if source is just 'plugin', we can't determine plugin name
            // This shouldn't happen with new code, but handle gracefully
            LogController.logWarning(null, 'handlebar.registerHelper',
                `Helper "${name}" registered with generic 'plugin' source - plugin name should be extracted from 'plugin:name' format`);
        }

        // Store handler and metadata together in single entry
        this.helperRegistry.set(name, {
            handler: handler,
            type: type,
            source: helperSource,
            registeredAt: new Date().toISOString(),
            description: options.description || '',
            example: options.example || ''
        });

        // Add to HANDLEBARS_DESCRIPTIONS if not already present (for plugin/site helpers)
        const existing = this.HANDLEBARS_DESCRIPTIONS.find(h => h.name === name && h.type === type);
        if (!existing) {
            this.HANDLEBARS_DESCRIPTIONS.push({
                name: name,
                type: type,
                source: helperSource,
                description: options.description || `Custom ${type} helper`,
                example: options.example || `{{${type === 'block' ? '#' : ''}${name}}}`
            });
        } else if (options.description || options.example) {
            // Update existing entry with plugin/site provided metadata
            existing.description = options.description || existing.description;
            existing.example = options.example || existing.example;
            // Update source if it's more specific (e.g., plugin name vs generic)
            if (helperSource !== 'jpulse' && existing.source === 'jpulse') {
                existing.source = helperSource;
            }
        }

        LogController.logInfo(null, 'handlebar.registerHelper',
            `Registered ${type} helper: ${name} (source: ${options.source || 'unknown'})`);
    }

    /**
     * W-088: Refresh default config from database
     * Called when config change event is received (notification-only pattern)
     * ConfigController publishes the event, subscribers fetch fresh data from DB
     */
    static async refreshGlobalConfig() {
        try {
            const defaultDocName = global.ConfigController.getDefaultDocName();
            const newGlobalConfig = await configModel.findById(defaultDocName);
            this.globalConfig = newGlobalConfig;
            LogController.logInfo(null, 'handlebar.refreshGlobalConfig', `Default config refreshed from database: ${defaultDocName}`);
            return true;
        } catch (error) {
            LogController.logError(null, 'handlebar.refreshGlobalConfig', `Failed to refresh default config: ${error.message}`);
            return false;
        }
    }

    /**
     * Build internal context for handlebars processing
     * @param {object} req - Express request object
     * @returns {object} Internal context with app, user, config, etc.
     */
    static async _buildInternalContext(req) {
        const appConfig = global.appConfig;

        // Create base handlebars context
        const adminRoles = global.appConfig?.user?.adminRoles || ['admin', 'root'];
        const userRoles = req.session?.user?.roles || [];
        const baseContext = {
            app: appConfig.app,
            user: {
                id: req.session?.user?.id || '',
                username: req.session?.user?.username || '',
                firstName: req.session?.user?.firstName || '',
                nickName: req.session?.user?.nickName || '',
                lastName: req.session?.user?.lastName || '',
                email: req.session?.user?.email || '',
                initials: req.session?.user?.initials || '?',
                roles: userRoles,
                hasRole: userRoles.reduce((acc, role) => {
                    acc[role] = true;
                    return acc;
                }, {}),
                isAuthenticated: AuthController.isAuthenticated(req),
                isAdmin: AuthController.isAuthorized(req, adminRoles),
                preferences: req.session?.user?.preferences || {}
            },
            siteConfig: this.globalConfig?.data || {},
            appConfig: appConfig, // Full app config (will be filtered based on auth)
            // W-076: Add Redis cluster availability for client-side jPulse.appCluster
            appCluster: {
                available: global.RedisManager ? global.RedisManager.isRedisAvailable() : false
            },
            url: {
                domain: `${req.protocol}://${req.get('host')}`,
                protocol: req.protocol,
                hostname: req.hostname,
                port: req.get('host')?.split(':')[1] || '',
                pathname: req.path,
                search: req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '',
                param: req.query || {}
            },
            // Add i18n object to context for dot notation access
            i18n: global.i18n.getLang(AuthController.getUserLanguage(req)),
            // W-102: Components context (populated by file.includeComponents)
            components: {},
            // W-103: User-defined variables namespace (populated by {{let}})
            vars: {}
        };

        // W-014: Extend context with site/plugin extensions
        const context = ContextExtensions
            ? await ContextExtensions.getExtendedContext(baseContext, req)
            : baseContext; // Fallback if not loaded yet

        // Filter context based on authentication status
        return this._filterContext(context, AuthController.isAuthenticated(req));
    }

    /**
     * Filter context based on authentication status
     * Removes sensitive paths defined in app.conf and schema metadata
     * @param {object} context - Context to filter
     * @param {boolean} isAuthenticated - Whether user is authenticated
     * @returns {object} Filtered context
     */
    static _filterContext(context, isAuthenticated) {
        // W-116: Remove _handlebar namespace before exposing context to templates
        if (context._handlebar) {
            delete context._handlebar;
        }
        // Deep clone context to avoid mutating original
        const filtered = JSON.parse(JSON.stringify(context));

        // Filter appConfig (existing logic)
        const appFilterList = isAuthenticated
            ? global.appConfig.controller.handlebar.contextFilter.withAuth
            : global.appConfig.controller.handlebar.contextFilter.withoutAuth;

        if (appFilterList && appFilterList.length > 0) {
            for (const filterPath of appFilterList) {
                this._removePath(filtered, filterPath);
            }
        }

        // Filter siteConfig using schema metadata (W-115)
        if (filtered.siteConfig && configModel.schema?._meta?.contextFilter) {
            const siteConfigFilter = configModel.schema._meta.contextFilter;
            const siteFilterList = isAuthenticated
                ? siteConfigFilter.withAuth
                : siteConfigFilter.withoutAuth;

            if (siteFilterList && siteFilterList.length > 0) {
                // Schema paths are relative to config document (e.g., 'data.email.smtp*')
                // But siteConfig in context is just the data part, so remove 'data.' prefix
                for (const filterPath of siteFilterList) {
                    const adjustedPath = filterPath.startsWith('data.')
                        ? filterPath.substring(5)  // Remove 'data.' prefix
                        : filterPath;
                    this._removePath(filtered.siteConfig, adjustedPath);
                }
            }
        }

        return filtered;
    }

    /**
     * Remove a path from context object
     * Supports exact paths (appConfig.system) and wildcards (*.port, appConfig.*.port)
     * @param {object} obj - Object to modify
     * @param {string} path - Path to remove (dot notation, supports * wildcard)
     */
    static _removePath(obj, path) {
        // Handle wildcard patterns like *.port or appConfig.*.port
        if (path.includes('*')) {
            this._removeWildcardPath(obj, path);
        } else {
            // Exact path match
            const parts = path.split('.');
            this._removeExactPath(obj, parts, 0);
        }
    }

    /**
     * Remove exact path from object
     * @param {object} obj - Current object
     * @param {array} parts - Path parts
     * @param {number} index - Current index
     */
    static _removeExactPath(obj, parts, index) {
        if (!obj || typeof obj !== 'object' || index >= parts.length) {
            return;
        }

        const part = parts[index];
        const isLast = index === parts.length - 1;

        if (part in obj) {
            if (isLast) {
                delete obj[part];
            } else {
                this._removeExactPath(obj[part], parts, index + 1);
            }
        }
    }

    /**
     * Remove wildcard path from object
     * Supports patterns like *.port (matches any .port property) or appConfig.*.port or appConfig.**.port
     * - * matches single level
     * - ** matches any level of nesting
     * @param {object} obj - Object to modify
     * @param {string} pattern - Wildcard pattern
     */
    static _removeWildcardPath(obj, pattern) {
        const parts = pattern.split('.');
        const lastPart = parts[parts.length - 1];
        const prefixParts = parts.slice(0, -1);

        // Check if pattern uses ** (any level) or * (single level)
        const hasDoubleWildcard = pattern.includes('**');

        // If pattern starts with * or **, search from root
        if (parts[0] === '*' || parts[0] === '**') {
            this._removeWildcardRecursive(obj, lastPart);
        } else {
            // Navigate to prefix, then search for lastPart
            let current = obj;
            for (let i = 0; i < prefixParts.length; i++) {
                const part = prefixParts[i];
                if (part === '*' || part === '**') {
                    // Wildcard in middle: search all properties at this level
                    if (current && typeof current === 'object') {
                        for (const key in current) {
                            if (current.hasOwnProperty(key) && current[key] && typeof current[key] === 'object') {
                                // ** means search recursively, * means only one level
                                if (part === '**') {
                                    this._removeWildcardRecursive(current[key], lastPart);
                                } else {
                                    // Single level: only remove if it's a direct child
                                    if (lastPart in current[key]) {
                                        delete current[key][lastPart];
                                    }
                                }
                            }
                        }
                    }
                    return;
                } else if (current && typeof current === 'object' && part in current) {
                    current = current[part];
                } else {
                    return; // Path doesn't exist
                }
            }
            // Remove lastPart from current location
            if (current && typeof current === 'object') {
                if (hasDoubleWildcard) {
                    // ** means search recursively
                    this._removeWildcardRecursive(current, lastPart);
                } else if (lastPart.includes('*')) {
                    // Property name pattern matching
                    if (lastPart.startsWith('*')) {
                        // Suffix pattern like '*pass' - remove all properties ending with suffix
                        const suffix = lastPart.replace(/^\*/, '');
                        for (const key in current) {
                            if (current.hasOwnProperty(key) && key.endsWith(suffix)) {
                                delete current[key];
                            }
                        }
                    } else if (lastPart.endsWith('*')) {
                        // Prefix pattern like 'smtp*' - remove all properties starting with prefix
                        const prefix = lastPart.replace(/\*$/, '');
                        for (const key in current) {
                            if (current.hasOwnProperty(key) && key.startsWith(prefix)) {
                                delete current[key];
                            }
                        }
                    } else {
                        // Pattern with * in middle - not supported, skip
                    }
                } else {
                    // Single level: only remove direct property
                    if (lastPart in current) {
                        delete current[lastPart];
                    }
                }
            }
        }
    }

    /**
     * Recursively remove properties matching a name pattern
     * @param {object} obj - Object to search
     * @param {string} propertyName - Property name to remove (e.g., 'port')
     */
    static _removeWildcardRecursive(obj, propertyName) {
        if (!obj || typeof obj !== 'object') {
            return;
        }

        // Remove property if it exists at this level
        if (propertyName in obj) {
            delete obj[propertyName];
        }

        // Recursively search nested objects
        for (const key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] && typeof obj[key] === 'object') {
                this._removeWildcardRecursive(obj[key], propertyName);
            }
        }
    }

    /**
     * Expand handlebars in template content
     * @param {object} req - Express request object
     * @param {string} template - Template content
     * @param {object} additionalContext - Additional context to merge with internal context
     * @param {number} depth - Current include depth for recursion protection
     * @returns {string} Processed content
     */
    /**
     * Public API: Expand handlebars template with per-request component registry
     * W-097 Phase 1: Initializes component registry on first call (depth 0)
     * @param {object} req - Express request object
     * @param {string} template - Template to expand
     * @param {object} additionalContext - Additional context to merge
     * @param {number} depth - Recursion depth (for include tracking)
     * @returns {string} Expanded template
     */
    static async expandHandlebars(req, template, additionalContext = {}, depth = 0) {
        // W-097 Phase 1: Initialize per-request component registry ONCE
        // Registry is transient - created at start of page rendering, discarded when done
        if (depth === 0) {
            req.componentRegistry = new Map();
            req.componentCallStack = [];

            // Build internal context
            req.baseContext = await this._buildInternalContext(req);
        }

        // Delegate to internal recursive implementation
        return await this._expandHandlebars(req, template, additionalContext, depth);
    }

    /**
     * Internal: Recursive handlebars expansion implementation
     * @param {object} req - Express request object
     * @param {string} template - Template to expand
     * @param {object} additionalContext - Additional context to merge
     * @param {number} depth - Recursion depth
     * @returns {string} Expanded template
     */
    static async _expandHandlebars(req, template, additionalContext = {}, depth = 0) {
        // Prevent infinite recursion
        const MAX_DEPTH = global.appConfig.controller.handlebar.maxIncludeDepth || 16;
        if (depth > MAX_DEPTH) {
            LogController.logError(req, 'handlebar.expandHandlebars', `error: Maximum nesting depth (${MAX_DEPTH}) exceeded`);
            return template;
        }

        // Remove Handlebars comments first (before any other processing)
        // Supports both single-line and multi-line comments: {{!-- comment --}}
        template = template.replace(/\{\{!--[\s\S]*?--\}\}/g, '')
            // Remove trailing whitespace after {{/component}} because they do not produce output
            .replace(/(\{\{\/component\}\})\s+/g, '$1');

        // Use cached base context instead of rebuilding
        const baseContext = req.baseContext || await this._buildInternalContext(req);

        // W-116: Add _handlebar utilities to context (needs depth from _expandHandlebars)
        // Note: These utilities will be available to custom helpers via context._handlebar
        // They are filtered out before exposing context to templates
        const internalContext = {
            ...baseContext,
            _handlebar: {
                req: req,
                depth: depth,
                expandHandlebars: (template, additionalContext = {}) => {
                    return HandlebarController._expandHandlebars(req, template, additionalContext, depth + 1);
                },
                parseAndEvaluateArguments: (expression, ctx) => {
                    return _parseAndEvaluateArguments(expression, ctx);
                },
                getNestedProperty: (obj, path) => {
                    return _getNestedProperty(obj, path);
                },
                setNestedProperty: (obj, path, value) => {
                    return _setNestedProperty(obj, path, value);
                },
                evaluateCondition: (params, ctx) => {
                    return _evaluateCondition(params, ctx);
                }
            }
        };

        // Merge with additional context (additional context takes precedence)
        const context = { ...internalContext, ...additionalContext };

        // Phase 1: Annotate nesting levels with simple level numbering
        let level = 0;
        const annotated = template.replace(/(\{\{)([#\/])([a-z]+)(.*?\}\})/gs, (match, c1, c2, c3, c4) => {
            let result;
            if (c2 === '#') {
                result = `${c1}${c2}${c3}:~${level}~${c4}`;
                level++;
            } else {
                level--;
                result = `${c1}${c2}${c3}:~${level}~${c4}`;
            }
            return result;
        });

        // Local helper functions (encapsulated within expandHandlebars)
        const self = this;

        /**
         * Evaluate a block handlebars expression ({{#type}}...{{/type}})
         * ATTENTION: Keep this in sync with HANDLEBARS_DESCRIPTIONS (type='block')
         */
        async function _evaluateBlockHandlebar(blockType, params, blockContent, currentContext) {
            // Parse arguments once at the beginning (W-116: optimization)
            // For block helpers, prepend the helper name since _parseAndEvaluateArguments expects it
            // Include '#' prefix for semantic consistency with template syntax {{#helper}}
            const expression = `#${blockType} ${params}`.trim();
            const parsedArgs = await _parseAndEvaluateArguments(expression, currentContext);

            // W-116: Check registry first (plugin/site helpers override built-ins)
            const registryEntry = HandlebarController.helperRegistry.get(blockType);
            if (registryEntry && registryEntry.type === 'block') {
                return await registryEntry.handler(parsedArgs, blockContent, currentContext);
            }

            // Fall back to built-in helpers
            switch (blockType) {
                // W-114: Logical block helpers
                case 'and':
                case 'or':
                case 'not':
                    return await _handleLogicalBlockHelper(blockType, parsedArgs, blockContent, currentContext);

                // W-114: Comparison block helpers
                case 'eq':
                case 'ne':
                case 'gt':
                case 'gte':
                case 'lt':
                case 'lte':
                    return await _handleLogicalBlockHelper(blockType, parsedArgs, blockContent, currentContext);

                // Existing block helpers
                case 'if':
                    return await _handleBlockIf(parsedArgs, blockContent, currentContext);
                case 'unless':
                    return await _handleBlockUnless(parsedArgs, blockContent, currentContext);
                case 'each':
                    return await _handleBlockEach(parsedArgs, blockContent, currentContext);
                case 'component':
                    return await _handleComponentDefinition(parsedArgs, blockContent, currentContext);
                case 'with':
                    return await _handleWithBlock(parsedArgs, blockContent, currentContext);
                case 'let':
                    return await _handleLetBlock(parsedArgs, blockContent, currentContext);
                default:
                    throw new Error(`Unknown block type: #${blockType}`);
            }
        }

        /**
         * Evaluate a single handlebars expression
         * ATTENTION: Keep this in sync with HANDLEBARS_DESCRIPTIONS (type='regular')
         */
        async function _evaluateRegularHandlebar(expression, currentContext) {
            const parsedArgs = await _parseAndEvaluateArguments(expression, currentContext);
            const helper = parsedArgs._helper;

            // W-116: Check registry first (plugin/site helpers override built-ins)
            const registryEntry = HandlebarController.helperRegistry.get(helper);
            if (registryEntry && registryEntry.type === 'regular') {
                const result = await registryEntry.handler(parsedArgs, currentContext);
                return result !== undefined ? String(result) : '';
            }

            // W-102: Handle components.* pattern (with or without parameters)
            // Example: {{components.jpIcons.configSvg size="64"}} or {{components.jpIcons.configSvg}}
            if (helper.startsWith('components.')) {
                return await _handleComponentCall(parsedArgs, currentContext);
            }

            // Handle helper functions first (before property access)
            switch (helper) {
                // W-114: Logical helpers
                case 'and':
                    return _handleAnd(parsedArgs, currentContext);
                case 'or':
                    return _handleOr(parsedArgs, currentContext);
                case 'not':
                    return _handleNot(parsedArgs, currentContext);

                // W-114: Comparison helpers (all use unified function)
                case 'eq':
                case 'ne':
                case 'gt':
                case 'gte':
                case 'lt':
                case 'lte':
                    return _handleComparison(parsedArgs, currentContext, helper);

                // File helpers
                case 'file.include':
                    return await _handleFileInclude(parsedArgs, currentContext);
                case 'file.includeComponents':
                    return await _handleFileIncludeComponents(parsedArgs, currentContext);
                case 'file.timestamp':
                    return _handleFileTimestamp(parsedArgs._target);
                case 'file.exists':
                    return _handleFileExists(parsedArgs._target);
                case 'file.list':
                    return _handleFileList(parsedArgs, currentContext);

                // Variable helpers
                case 'let':
                    return await _handleLet(parsedArgs, currentContext);
                default:
                    // Handle property access
                    let value;
                    if (helper.includes('.')) {
                        // Nested property access (e.g., user.name)
                        value = _getNestedProperty(currentContext, helper);
                    } else {
                        // Simple property access (e.g., mainNavActiveTab)
                        value = currentContext[helper];
                    }

                    // If value exists and is not a string, stringify it (arrays, objects, etc.)
                    if (value !== undefined && value !== null) {
                        if (typeof value !== 'string' && typeof value !== 'number') {
                            return JSON.stringify(value);
                        }
                        return String(value);
                    }
                    return '';
            }
        }

        /**
         * Parse handlebars arguments (space-separated, quoted strings preserved),
         * resolve subexpressions, and return parsed arguments as an object.
         * @param {string} expression - Expression to parse and evaluate
         * @param {object} currentContext - Current context for evaluation
         * @returns {Promise<object>} Parsed arguments with _helper, _target, and key=value pairs
         * @examples
         * _parseAndEvaluateArguments('helper "target" arg1="value1" arg2="value2"')
         * // returns { _helper: 'helper', _target: 'target', arg1: 'value1', arg2: 'value2' }
         * _parseAndEvaluateArguments('helper (subexpression arg2 arg3)')
         * // returns { _helper: 'helper', _target: 'result of subexpression arg2 arg3' }
         * _parseAndEvaluateArguments('helper arg1=(subexpression arg2 arg3)')
         * // returns { _helper: 'helper', arg1: 'result of subexpression arg2 arg3' }
         * _parseAndEvaluateArguments('helper arg1=(subexpression arg2 arg3) arg4=value4')
         * // returns { _helper: 'helper', arg1: 'result of subexpression arg2 arg3', arg4: 'value4' }
         * _parseAndEvaluateArguments('helper (subexpression arg1.1 (subsubexpression arg2.1 arg2.2) arg1.2 ...) arg3=value3 arg4=value4')
         * // returns { _helper: 'helper', _target: 'result of complete subsubexpression evaluation', arg3: 'value3', arg4: 'value4' }
         */
        async function _parseAndEvaluateArguments(expression, currentContext) {
            const escChar = '\x00';

            /**
             * Encode spaces, quotes, parentheses, and backslashes.
             * This allows Phase 6 to simply split key="value" pairs on unencoded spaces
             */
            function _encodeChars(str) {
                return str.replace(/[ '"\(\)\\]/g, (match) => `${escChar}_ESC_:${match.charCodeAt(0)}${escChar}`);
            }

            /**
             * Restore encoded characters
             */
            function _restoreChars(str) {
                return str.replace(new RegExp(`${escChar}_ESC_:(\\d+)${escChar}`, 'g'), (match, code) => {
                    return String.fromCharCode(parseInt(code));
                });
            }

            function _cleanupExpressionText(str) {
                // Remove unbalanced parenthesis markers, but DON'T restore encoded chars yet
                const regex = new RegExp(`${escChar}_P_(OPEN|CLOSE)_:(\\d+)${escChar}`, 'gs');
                return str.replace(regex, '<!-- Error: Unbalanced subexpression removed -->');
            }

            async function _resolveSubexpression(subExpr, ctx) {
                // Create regex for this level to find nested subexpressions
                const nestedRegex = new RegExp(`${escChar}_P_OPEN_:(\\d+)${escChar}(.*?)${escChar}_P_CLOSE_:\\1${escChar}`, 'gs');
                const nestedMatches = [...subExpr.matchAll(nestedRegex)];

                // Process nested subexpressions sequentially
                for (const match of nestedMatches) {
                    const [fullMatch, level, content] = match;
                    const replacement = await _resolveSubexpression(content, ctx);
                    subExpr = subExpr.replace(fullMatch, replacement);
                }

                // Clean up and evaluate
                subExpr = _cleanupExpressionText(subExpr);
                return await _evaluateRegularHandlebar(subExpr, ctx);
            }

            // Phase 1: Extract helper name and check for arguments
            const args = {};
            let parts = expression.trim().match(/^([^ ]+)(?: (.*))?$/);
            if (!parts) {
                return args;
            }

            args._helper = parts[1];
            if (!parts[2]) {
                return args; // No arguments, just helper name
            }

            // Phase 2: Escape quotes and parentheses inside quoted strings, normalize to double quotes
            // Example: arg='Hello (\'world\')' → "Hello (world)" with chars encoded
            // When normalizing single quotes to double quotes, escape unescaped double quotes in content
            // Example: foo='bar "quoted" text' → foo="bar \"quoted\" text"
            let processedExpr = parts[2];
            processedExpr = processedExpr.replace(/(['"])((?:(?!\1)[^\\]|\\.)*)\1/g, (match, quote, content) => {
                if(quote === "'") {
                    // If normalizing from single quote to double quote, escape unescaped double quotes
                    content = content.replace(/(?<!\\)"/g, '\\"');
                } else {
                    // Unescape escaped single quotes (they don't need escaping in double quotes)
                    content = content.replace(/\\'/g, "'");
                }
                // Encode special chars (spaces, quotes, parentheses, backslashes)
                // Escaped quotes (\") are preserved as encoded backslash + encoded quote
                return _encodeChars('"' + content + '"');
            });

            // Phase 3: Annotate parentheses with nesting level
            let level = 0;
            processedExpr = processedExpr.replace(/([\(\)])/gs, (match, paren) => {
                if (paren === '(') {
                    const result = `${escChar}_P_OPEN_:${level}${escChar}`;
                    level++;
                    return result;
                } else {
                    level--;
                    return `${escChar}_P_CLOSE_:${level}${escChar}`;
                }
            });

            // Phase 4: Recursively evaluate subexpressions by nesting level
            const subRegex = new RegExp(`${escChar}_P_OPEN_:(\\d+)${escChar}(.*?)${escChar}_P_CLOSE_:\\1${escChar}`, 'gs');
            const matches = [...processedExpr.matchAll(subRegex)];

            for (const match of matches) {
                const [fullMatch, matchLevel, content] = match;
                const replacement = await _resolveSubexpression(content, currentContext);
                processedExpr = processedExpr.replace(fullMatch, replacement);
            }

            // Phase 5: Clean up any remaining unbalanced subexpressions
            processedExpr = _cleanupExpressionText(processedExpr);

            // Phase 6: Parse all arguments - positional and key=value pairs
            // Spaces between key=value pairs are NOT encoded, so we can split on space!
            if (!processedExpr || !processedExpr.trim()) {
                return args;  // No arguments
            }

            const positionalArgs = [];

            // Split by space to get array of tokens (key=value pairs or positional args)
            const tokens = processedExpr.trim().split(/\s+/);

            for (const token of tokens) {
                const restored = _restoreChars(token);
                const match = restored.trim().match(/^([^=]+)=(.+)$/);
                let [key, value] = match ? match.slice(1) : [null, restored];

                if (value.startsWith('"') && value.endsWith('"')) {
                    // Quoted: remove quotes and unescape escaped quotes
                    value = value.replace(/^"|"$/g, '').replace(/\\(['"])/g, '$1');
                } else if (value === 'true') {
                    value = true;
                } else if (value === 'false') {
                    value = false;
                } else if (!isNaN(value) && value !== '') {
                    value = Number(value);
                }

                if (key) {
                    args[key] = value;
                } else {
                    // Positional argument: try to resolve as property if it is a string
                    if(typeof value === 'string' && value.length > 0) {
                        // Don't treat file paths (containing slashes) as property paths
                        if (value.includes('/') || value.includes('\\')) {
                            // File path - keep as literal string
                            // (e.g., "components/svg-icons.tmpl" for file.include)
                        } else if (value.includes('.')) {
                            // Property path (e.g., "user.nonexistent") - check if root property exists
                            // If root doesn't exist, it's likely a literal (e.g., component name "jpIcons.star-svg")
                            const rootProp = value.split('.')[0];
                            if (rootProp in currentContext) {
                                // Root exists, so resolve the full path
                                // If property doesn't exist, keep as undefined (falsy)
                                const resolved = _getNestedProperty(currentContext, value);
                                value = resolved !== undefined ? resolved : undefined;
                            }
                            // If root doesn't exist, keep as literal string (e.g., component names with dots)
                            // value already contains the original string, no change needed
                        } else {
                            // Simple property name - keep fallback for literal strings (e.g., component names)
                            value = currentContext[value] ?? value;
                        }
                    } // else keep as is (Number, Boolean, etc.)
                    positionalArgs.push(value);
                }
            }

            // Store positional arguments
            if (positionalArgs.length > 0) {
                args._target = positionalArgs[0];  // First positional arg (backward compat)
                args._args = positionalArgs;       // All positional args as array
            }

            return args;
        }

        /**
         * Handle {{#if}} blocks
         * W-114: Made async to support subexpressions in conditions
         * W-116: Refactored to use args parameter (already parsed)
         */
        async function _handleBlockIf(args, blockContent, currentContext) {
            // For {{#if condition}}, args._target contains the already-evaluated condition value
            // (parsed and evaluated by _parseAndEvaluateArguments)
            const condition = Boolean(args._target);

            const parts = blockContent
                .replace(/\{\{#if:~(\d+)~.*?\{\{\/if:~\1~\}\}/gs, (m) => {  // match nested {{#if}} ... {{/if}}
                    return m.replace(/\{\{else\}\}/g, '{~{~else~}~}');      // escape {{else}} in nested {{#if}}
                })
                .split('{{else}}')                                          // split at {{else}} outside nested {{#if}}
                .map(part => part.replace(/\{~\{~else~\}~\}/g, '{{else}}')); // restore {{else}} in nested {{#if}}
            const ifContent = parts[0] || '';
            const elseContent = parts[1] || '';
            return condition ? ifContent : elseContent;
        }

        /**
         * Handle {{#unless}} blocks
         * W-114: Added {{else}} support, made async to support subexpressions
         * W-116: Refactored to use args parameter (already parsed)
         */
        async function _handleBlockUnless(args, blockContent, currentContext) {
            // For {{#unless condition}}, args._target contains the already-evaluated condition value
            // (parsed and evaluated by _parseAndEvaluateArguments)
            const condition = Boolean(args._target);

            const parts = blockContent
                .replace(/\{\{#unless:~(\d+)~.*?\{\{\/unless:~\1~\}\}/gs, (m) => {  // match nested {{#unless}} ... {{/unless}}
                    return m.replace(/\{\{else\}\}/g, '{~{~else~}~}');      // escape {{else}} in nested {{#unless}}
                })
                .split('{{else}}')                                          // split at {{else}} outside nested {{#unless}}
                .map(part => part.replace(/\{~\{~else~\}~\}/g, '{{else}}')); // restore {{else}} in nested {{#unless}}
            const unlessContent = parts[0] || '';
            const elseContent = parts[1] || '';
            return condition ? elseContent : unlessContent;
        }

        /**
         * W-114: Unified block helper for logical and comparison helpers
         * Handles {{#and}}, {{#or}}, {{#not}}, {{#eq}}, {{#ne}}, {{#gt}}, {{#gte}}, {{#lt}}, {{#lte}}
         * All support {{else}} blocks
         * W-116: Refactored to use args parameter (already parsed)
         * @param {string} helperType - Helper type: 'and', 'or', 'not', 'eq', 'ne', 'gt', 'gte', 'lt', 'lte'
         * @param {object} args - Parsed arguments (already evaluated)
         * @param {string} blockContent - Content between opening and closing tags
         * @param {object} currentContext - Current context
         * @returns {Promise<string>} Rendered content
         */
        async function _handleLogicalBlockHelper(helperType, args, blockContent, currentContext) {
            let result;
            if (helperType === 'and' || helperType === 'or' || helperType === 'not') {
                // Logical helpers
                if (helperType === 'and') {
                    result = _handleAnd(args, currentContext);
                } else if (helperType === 'or') {
                    result = _handleOr(args, currentContext);
                } else if (helperType === 'not') {
                    result = _handleNot(args, currentContext);
                }
            } else {
                // Comparison helpers
                result = _handleComparison(args, currentContext, helperType);
            }

            // Check if condition is truthy (result is 'true' string)
            const condition = result === 'true';

            // Handle {{else}} blocks (similar to {{#if}})
            const parts = blockContent
                .replace(/\{\{#\w+:~(\d+)~.*?\{\{\/\w+:~\1~\}\}/gs, (m) => {  // match nested block helpers
                    return m.replace(/\{\{else\}\}/g, '{~{~else~}~}');      // escape {{else}} in nested blocks
                })
                .split('{{else}}')                                          // split at {{else}} outside nested blocks
                .map(part => part.replace(/\{~\{~else~\}~\}/g, '{{else}}')); // restore {{else}} in nested blocks
            const ifContent = parts[0] || '';
            const elseContent = parts[1] || '';

            return condition ? ifContent : elseContent;
        }

        /**
         * Handle {{#each}} blocks
         * W-094: Support file.list with sortBy parameter
         * W-116: Refactored to use args parameter (already parsed)
         */
        async function _handleBlockEach(args, blockContent, currentContext) {
            let items = null;
            let sortBy = null;

            // W-094: Check if args contains file.list helper call
            if (args._helper === 'file.list') {
                // Get the file list
                const listResult = _handleFileList(args, currentContext);
                items = JSON.parse(listResult);

                // Get sortBy parameter
                sortBy = args.sortBy || null;

                // Sort by filename if requested
                if (sortBy === 'filename' && Array.isArray(items)) {
                    items.sort();
                }
            } else if (args._target) {
                // Regular property access: {{#each items}} - args._target is already evaluated
                items = args._target;
            }

            if (!items || (!Array.isArray(items) && typeof items !== 'object')) {
                return '';
            }

            let result = '';
            const itemsArray = Array.isArray(items) ? items : Object.entries(items);

            for (let i = 0; i < itemsArray.length; i++) {
                const item = itemsArray[i];

                // Create iteration context with special variables
                const iterationContext = { ...currentContext };
                iterationContext['@index'] = i;
                iterationContext['@first'] = i === 0;
                iterationContext['@last'] = i === itemsArray.length - 1;

                if (Array.isArray(items)) {
                    // For arrays: item is the array element
                    iterationContext['this'] = item;
                } else {
                    // For objects: item is [key, value] pair
                    iterationContext['@key'] = item[0];
                    iterationContext['this'] = item[1];
                }

                // Process handlebars in block content with iteration context
                let processedContent = await _resolveHandlebars(blockContent, iterationContext);

                result += processedContent;
            }

            return result;
        }

        /**
         * W-103: Handle {{let}} inline variable assignment
         * Sets variables in vars namespace (template-scoped)
         * Example: {{let key1="val1" key2=123 nested.key="value"}}
         * W-116: Refactored to use args parameter (already parsed)
         */
        async function _handleLet(args, currentContext) {
            // Ensure vars namespace exists
            if (!currentContext.vars) {
                currentContext.vars = {};
            }

            // Set all key=value pairs in vars namespace (args already parsed)
            const setVars = [];
            for (const [key, value] of Object.entries(args)) {
                if (!key.startsWith('_')) {
                    _setNestedProperty(currentContext.vars, key, value);
                    setVars.push(key);
                }
            }
            if (setVars.length > 0) {
                LogController.logInfo(req, 'handlebar.let', `Variables set: ${setVars.join(', ')}`);
            }

            return ''; // No output
        }

        /**
         * W-103: Handle {{#with}} block (context switching only - standard Handlebars)
         * Switches context root to specified object
         * Example: {{#with user}} {{firstName}} {{lastName}} {{/with}}
         * W-116: Refactored to use args parameter (already parsed)
         */
        async function _handleWithBlock(args, blockContent, currentContext) {
            // Get the context object from args._target (already evaluated by _parseAndEvaluateArguments)
            const contextValue = args._target || null;

            if (!contextValue || typeof contextValue !== 'object') {
                LogController.logInfo(req, 'handlebar.with',
                    `Context not found or invalid`);
                return ''; // Empty output if context not found
            }

            // Switch context root to this object
            const blockContext = {
                ...currentContext,
                ...contextValue
            };

            LogController.logInfo(req, 'handlebar.with',
                `Context switched to: ${args._target || 'unknown'}`);

            return await _resolveHandlebars(blockContent, blockContext);
        }

        /**
         * W-103: Handle {{#let}} block variable assignment
         * Sets variables in vars namespace (template-scoped)
         * Example: {{#let greeting="Hello" name="World"}} {{vars.greeting}}, {{vars.name}}! {{/let}}
         * W-116: Refactored to use args parameter (already parsed)
         */
        async function _handleLetBlock(args, blockContent, currentContext) {
            // Create isolated context with cloned vars
            const blockContext = {
                ...currentContext,
                vars: { ...(currentContext.vars || {}) } // Clone existing vars
            };

            // Add new vars to block scope (args already parsed)
            const setVars = [];
            for (const [key, value] of Object.entries(args)) {
                if (!key.startsWith('_')) {
                    _setNestedProperty(blockContext.vars, key, value);
                    setVars.push(key);
                }
            }

            if (setVars.length > 0) {
                LogController.logInfo(req, 'handlebar.let',
                    `Block-scoped variables set: ${setVars.join(', ')}`);
            }

            // Process block with isolated vars scope
            return await _resolveHandlebars(blockContent, blockContext);
        }

        /**
         * Handle file.include helper with optional context variables
         */
        async function _handleFileInclude(parsedArgs, currentContext) {
            // Check include depth to prevent infinite recursion
            const maxDepth = global.appConfig.controller.handlebar.maxIncludeDepth || 16;
            if (depth >= maxDepth) {
                throw new Error(`Maximum include depth (${maxDepth}) exceeded`);
            }

            // Get the target file path
            const includePath = parsedArgs._target;
            if (!includePath) {
                throw new Error('file.include requires a file path as second argument');
            }

            // Security: Prohibit path traversal and absolute paths
            if (includePath.includes('../') || includePath.includes('..\\') || path.isAbsolute(includePath)) {
                throw new Error(`Prohibited path in include: ${includePath}. Use relative paths from view root only.`);
            }

            // Use PathResolver to support site overrides
            let fullPath;
            try {
                const relativePath = `view/${includePath}`;
                fullPath = PathResolver.resolveModule(relativePath);
            } catch (error) {
                throw new Error(`Include file not found: ${includePath} (${error.message})`);
            }

            // Build include context by merging current context with parsed arguments
            const includeContext = { ...currentContext };

            // Add all parsed key=value pairs to the context (excluding _helper and _target)
            for (const [key, value] of Object.entries(parsedArgs)) {
                if (key !== '_helper' && key !== '_target') {
                    includeContext[key] = value;
                }
            }

            // Get template content using FileCache synchronously
            const hasContextVars = Object.keys(parsedArgs).some(key => key !== '_helper' && key !== '_target');
            const content = self.includeCache.getFileSync(fullPath);

            if (content === null) {
                throw new Error(`Include file not found or deleted: ${includePath}`);
            }

            // Remove header comments from included content
            const cleanContent = content.replace(/(<!--|\/\*\*|\{\{\!--)\s+\* +\@name .*?(\*\/|-->|--\}\})\r?\n?/gs, '');

            LogController.logInfo(req, 'handlebar.expandHandlebars', `Include processed: ${includePath}${hasContextVars ? ' (with context vars)' : ''}`);

            // Process handlebars with the include context (recursive call to internal implementation)
            const processed = await self._expandHandlebars(req, cleanContent, includeContext, depth + 1);
            return processed;
        }

        /**
         * W-097 Phase 1: Handle component definition
         * Syntax: {{#component "component-name" param="default"}}...{{/component}}
         * Registers component in per-request registry (no output)
         * W-116: Refactored to use args parameter (already parsed)
         */
        async function _handleComponentDefinition(args, blockContent, currentContext) {
            // First parameter is the component name (required)
            const componentName = args._target;
            if (!componentName) {
                throw new Error('component definition requires a name as first parameter');
            }

            // W-097 Phase 1: Validate component name format (supports optional dot-notation namespaces)
            // Examples: config-svg, icons.config-svg, ui.buttons.primary
            if (!/^[a-z][\w\-\.]*[a-z0-9]$/i.test(componentName)) {
                throw new Error(
                    `Invalid component name "${componentName}". ` +
                    `Must start with a letter, contain only letters/numbers/underscores/hyphens/dots, ` +
                    `and end with a letter or number.`
                );
            }

            // W-097 Phase 1: Convert component name for usage
            // Examples: logs-svg → logsSvg, icons.config-svg → icons.configSvg
            const usageName = self._convertComponentName(componentName);

            // Extract default parameters (excluding _helper and _target)
            const defaultParams = {};
            for (const [key, value] of Object.entries(args)) {
                if (key !== '_helper' && key !== '_target') {
                    defaultParams[key] = value;
                }
            }

            // Register component in per-request registry
            req.componentRegistry.set(usageName, {
                originalName: componentName,
                template: blockContent,
                defaults: defaultParams
            });

            // W-102: Also add to currentContext.components immediately
            // This ensures components registered via {{file.include}} are available
            // for subsequent component expansions (e.g., admin cards can use jpIcons)
            if (!currentContext.components) {
                currentContext.components = {};
            }
            _setNestedProperty(currentContext.components, usageName, blockContent);

            LogController.logInfo(req, 'handlebar.component',
                `Component registered: ${componentName} (use as: {{components.${usageName}}})`
            );

            // Component definition produces no output
            return '';
        }

        /**
         * W-102: Handle component call with parameters
         * Example: {{components.jpIcons.configSvg size="64" fillColor="red"}}
         */
        async function _handleComponentCall(parsedArgs, currentContext) {
            const fullName = parsedArgs._helper; // e.g., "components.jpIcons.configSvg"

            // Remove "components." prefix to get component name
            const componentName = fullName.replace(/^components\./, ''); // "jpIcons.configSvg"

            // Convert to usage name (already in correct format)
            const usageName = componentName;

            // Look up component in registry
            const component = req.componentRegistry.get(usageName);
            if (!component) {
                const errorMsg = `Component "${componentName}" not found. Did you forget to include the component library?`;
                LogController.logWarning(req, 'handlebar.componentCall', errorMsg);
                return `<!-- Error: ${errorMsg} -->`;
            }

            // Check for circular references
            if (req.componentCallStack.includes(usageName)) {
                const callChain = [...req.componentCallStack, usageName].join(' → ');
                const errorMsg = `Circular component reference detected: ${callChain}`;
                LogController.logError(req, 'handlebar.componentCall', errorMsg);
                return `<!-- Error: ${errorMsg} -->`;
            }

            // Add to call stack for circular reference detection
            req.componentCallStack.push(usageName);

            try {
                // Separate framework parameters (starting with _) from user parameters
                const params = { ...component.defaults };
                const frameworkParams = {};
                for (const [key, value] of Object.entries(parsedArgs)) {
                    if (key !== '_helper' && key !== '_target') {
                        if (key.startsWith('_')) {
                            frameworkParams[key] = value;
                        } else {
                            params[key] = value;
                        }
                    }
                }

                // Create context with parameters for template expansion
                const paramContext = { ...currentContext, ...params };

                // Expand component template with parameters
                let expanded = await self._expandHandlebars(req, component.template, paramContext, depth + 1);

                // Handle _inline framework parameter
                if (frameworkParams._inline === true || frameworkParams._inline === 'true') {
                    // Remove newlines and collapse multiple spaces to single space
                    expanded = expanded.replace(/\n/g, ' ').replace(/\s+/g, ' ');
                }

                return expanded;
            } finally {
                // Remove from call stack
                req.componentCallStack.pop();
            }
        }

        /**
         * Handle file.timestamp helper (synchronous with caching)
         */
        function _handleFileTimestamp(filePath) {
            const includePath = filePath.replace(/^["']|["']$/g, '');
            const relativePath = `view/${includePath}`;

            // Use PathResolver to resolve path with site override support, then use FileCache
            try {
                const resolvedPath = PathResolver.resolveModule(relativePath);

                // Use FileCache synchronously - instant if cached
                const content = self.includeCache.getFileSync(resolvedPath);
                if (content !== null) {
                    // File exists - get timestamp from cache
                    const fileEntry = self.includeCache.fileCache.get(resolvedPath);
                    return fileEntry?.timestamp || Date.now();
                } else {
                    // File doesn't exist - return current time for cache busting
                    return Date.now();
                }
            } catch (error) {
                // Try .tmpl fallback for CSS and JS files
                const fileExtension = path.extname(includePath).toLowerCase();
                if (fileExtension === '.css' || fileExtension === '.js') {
                    try {
                        const templatePath = `view/${includePath}.tmpl`;
                        const resolvedPath = PathResolver.resolveModule(templatePath);

                        const content = self.includeCache.getFileSync(resolvedPath);
                        if (content !== null) {
                            const fileEntry = self.includeCache.fileCache.get(resolvedPath);
                            return fileEntry?.timestamp || Date.now();
                        } else {
                            return Date.now();
                        }
                    } catch (templateError) {
                        return Date.now();
                    }
                } else {
                    return Date.now();
                }
            }
        }

        /**
         * W-114: Handle {{and}} logical helper
         * Returns 'true' if all arguments are truthy, 'false' otherwise
         * Accepts 1 or more arguments (variadic)
         * @param {object} parsedArgs - Parsed arguments with _args array
         * @param {object} currentContext - Current context for property evaluation
         * @returns {string} 'true' or 'false'
         * @examples
         * {{and user.isAdmin}} → 'true' if user.isAdmin is truthy
         * {{and user.isAdmin user.isActive}} → 'true' if both are truthy
         * {{and val1 val2 val3}} → 'true' if all three are truthy
         */
        function _handleAnd(parsedArgs, currentContext) {
            const args = parsedArgs._args || [];

            // Require at least 1 argument
            if (args.length === 0) {
                LogController.logWarning(req, 'handlebar.and', 'No arguments provided');
                return 'false';
            }

            // Convert string 'false' to boolean false (from subexpressions)
            const normalizedArgs = args.map(arg => {
                if (arg === 'false') return false;
                if (arg === 'true') return true;
                return arg;
            });

            // Return 'true' only if all arguments are truthy
            return normalizedArgs.every(arg => arg) ? 'true' : 'false';
        }

        /**
         * W-114: Handle {{or}} logical helper
         * Returns 'true' if any argument is truthy, 'false' otherwise
         * Accepts 1 or more arguments (variadic)
         * @param {object} parsedArgs - Parsed arguments with _args array
         * @param {object} currentContext - Current context for property evaluation
         * @returns {string} 'true' or 'false'
         * @examples
         * {{or user.isPremium}} → 'true' if user.isPremium is truthy
         * {{or user.isPremium user.isTrial}} → 'true' if either is truthy
         * {{or val1 val2 val3}} → 'true' if any is truthy
         */
        function _handleOr(parsedArgs, currentContext) {
            const args = parsedArgs._args || [];

            // Require at least 1 argument
            if (args.length === 0) {
                LogController.logWarning(req, 'handlebar.or', 'No arguments provided');
                return 'false';
            }

            // Convert string 'false' to boolean false (from subexpressions)
            const normalizedArgs = args.map(arg => {
                if (arg === 'false') return false;
                if (arg === 'true') return true;
                return arg;
            });

            // Return 'true' if any argument is truthy
            return normalizedArgs.some(arg => arg) ? 'true' : 'false';
        }

        /**
         * W-114: Handle {{not}} logical helper
         * Returns 'true' if argument is falsy, 'false' otherwise
         * Accepts exactly 1 argument
         * @param {object} parsedArgs - Parsed arguments with _args array
         * @param {object} currentContext - Current context for property evaluation
         * @returns {string} 'true' or 'false'
         * @examples
         * {{not user.isPremium}} → 'true' if user.isPremium is falsy
         * {{not (eq user.role "admin")}} → 'true' if user.role is not "admin"
         */
        function _handleNot(parsedArgs, currentContext) {
            const args = parsedArgs._args || [];

            // Require exactly 1 argument
            if (args.length !== 1) {
                LogController.logWarning(req, 'handlebar.not',
                    `Expected 1 argument, got ${args.length}`);
                return 'false';
            }

            // Convert string 'false'/'true' to boolean (from subexpressions)
            let value = args[0];
            if (value === 'false') value = false;
            else if (value === 'true') value = true;

            // Return negation
            return value ? 'false' : 'true';
        }

        /**
         * W-114: Unified comparison helper for all comparison operators
         * Returns 'true' if comparison is true (with type coercion), 'false' otherwise
         * Accepts exactly 2 arguments
         * @param {object} parsedArgs - Parsed arguments with _args array
         * @param {object} currentContext - Current context for property evaluation
         * @param {string} operator - Comparison operator: 'eq', 'ne', 'gt', 'gte', 'lt', 'lte'
         * @returns {string} 'true' or 'false'
         * @examples
         * _handleComparison(parsedArgs, context, 'eq') → 'true' if args[0] == args[1]
         * _handleComparison(parsedArgs, context, 'gt') → 'true' if args[0] > args[1]
         */
        function _handleComparison(parsedArgs, currentContext, operator) {
            const args = parsedArgs._args || [];

            // Require exactly 2 arguments
            if (args.length !== 2) {
                LogController.logWarning(req, `handlebar.${operator}`,
                    `Expected 2 arguments, got ${args.length}`);
                return 'false';
            }

            const [left, right] = args;

            // Function map for comparison operators (with type coercion)
            const operators = {
                eq: (a, b) => {
                    // eslint-disable-next-line eqeqeq
                    return a == b;
                },
                ne: (a, b) => {
                    // eslint-disable-next-line eqeqeq
                    return a != b;
                },
                gt: (a, b) => {
                    // eslint-disable-next-line eqeqeq
                    return a > b;
                },
                gte: (a, b) => {
                    // eslint-disable-next-line eqeqeq
                    return a >= b;
                },
                lt: (a, b) => {
                    // eslint-disable-next-line eqeqeq
                    return a < b;
                },
                lte: (a, b) => {
                    // eslint-disable-next-line eqeqeq
                    return a <= b;
                }
            };

            const compareFn = operators[operator];
            if (!compareFn) {
                LogController.logWarning(req, `handlebar.${operator}`,
                    `Unknown comparison operator: ${operator}`);
                return 'false';
            }

            const result = compareFn(left, right);
            return result ? 'true' : 'false';
        }

        /**
         * Handle file.exists helper (synchronous with caching)
         */
        function _handleFileExists(filePath) {
            const includePath = filePath.replace(/^["']|["']$/g, '');
            const relativePath = `view/${includePath}`;

            // Use PathResolver to resolve path with site override support, then use FileCache
            try {
                const resolvedPath = PathResolver.resolveModule(relativePath);

                // Use FileCache synchronously - instant if cached
                const content = self.includeCache.getFileSync(resolvedPath);
                return content !== null ? 'true' : 'false';
            } catch (error) {
                // Try .tmpl fallback for CSS and JS files
                const fileExtension = path.extname(includePath).toLowerCase();
                if (fileExtension === '.css' || fileExtension === '.js') {
                    try {
                        const templatePath = `view/${includePath}.tmpl`;
                        const resolvedPath = PathResolver.resolveModule(templatePath);

                        const content = self.includeCache.getFileSync(resolvedPath);
                        return content !== null ? 'true' : 'false';
                    } catch (templateError) {
                        return 'false';
                    }
                } else {
                    return 'false';
                }
            }
        }

        /**
         * W-094: Simple glob pattern matcher (replaces fast-glob dependency)
         * Supports: *.ext, dir/*.ext, dir/subdir/*.ext (single-level wildcards only)
         * Does NOT support: ** recursive patterns
         */
        function _matchGlobPattern(filePath, pattern) {
            // Convert pattern to regex
            const regexPattern = pattern
                .replace(/\./g, '\\.')  // Escape dots
                .replace(/\*/g, '[^/]*') // * matches any chars except /
                .replace(/\?/g, '.');   // ? matches single char

            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(filePath);
        }

        /**
         * W-094: Recursively read directory and match files against pattern
         */
        function _readDirRecursive(dirPath, basePath, pattern, fileList = []) {
            try {
                const entries = readdirSync(dirPath, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');

                    // Skip hidden files and common ignore patterns
                    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.git') {
                        continue;
                    }

                    if (entry.isDirectory()) {
                        // Recursively search subdirectories
                        _readDirRecursive(fullPath, basePath, pattern, fileList);
                    } else if (entry.isFile()) {
                        // Check if file matches pattern
                        if (_matchGlobPattern(relativePath, pattern)) {
                            fileList.push(relativePath);
                        }
                    }
                }
            } catch (error) {
                // Directory might not exist or be inaccessible, skip silently
            }

            return fileList;
        }

        /**
         * W-094: Handle file.list helper - list files matching glob pattern
         * Supports site overrides: searches site/webapp/view first, then webapp/view
         * Note: Only supports single-level wildcards (*), not recursive (**)
         */
        function _handleFileList(parsedArgs, currentContext) {
            const globPattern = parsedArgs._target;
            if (!globPattern) {
                LogController.logError(req, 'handlebar.file.list', 'file.list requires a glob pattern');
                return JSON.stringify([]);
            }

            // Security: Prohibit path traversal and absolute paths
            if (globPattern.includes('../') || globPattern.includes('..\\') || path.isAbsolute(globPattern)) {
                LogController.logError(req, 'handlebar.file.list', `Prohibited pattern in file.list: ${globPattern}. Use relative paths from view root only.`);
                return JSON.stringify([]);
            }

            // Warn if pattern uses ** (not supported without fast-glob)
            if (globPattern.includes('**')) {
                LogController.logError(req, 'handlebar.file.list', `Recursive patterns (**) not supported. Use single-level wildcards (*) only. Pattern: ${globPattern}`);
                return JSON.stringify([]);
            }

            try {
                // Use PathResolver.listFiles to handle site overrides
                const relativeFiles = PathResolver.listFiles(
                    `view/${globPattern}`,
                    _matchGlobPattern,
                    _readDirRecursive
                );

                return JSON.stringify(relativeFiles);
            } catch (error) {
                LogController.logError(req, 'handlebar.file.list', `Error listing files with pattern ${globPattern}: ${error.message}`);
                return JSON.stringify([]);
            }
        }

        /**
         * W-102: Handle file.includeComponents - register components from multiple files
         * Syntax: {{file.includeComponents "glob-pattern" component="namespace.*" sortBy="method"}}
         * Registers components and populates context.components
         */
        async function _handleFileIncludeComponents(parsedArgs, currentContext) {
            const globPattern = parsedArgs._target;
            const componentFilter = parsedArgs.component; // e.g., "adminCards.*"
            const sortBy = parsedArgs.sortBy || 'component-order';

            if (!globPattern) {
                LogController.logError(req, 'handlebar.file.includeComponents', 'file.includeComponents requires a glob pattern');
                return '';
            }

            // Security: Prohibit path traversal and absolute paths
            if (globPattern.includes('../') || globPattern.includes('..\\') || path.isAbsolute(globPattern)) {
                LogController.logError(req, 'handlebar.file.includeComponents', `Prohibited pattern: ${globPattern}. Use relative paths from view root only.`);
                return '';
            }

            // Warn if pattern uses ** (not supported)
            if (globPattern.includes('**')) {
                LogController.logError(req, 'handlebar.file.includeComponents', `Recursive patterns (**) not supported. Use single-level wildcards (*) only. Pattern: ${globPattern}`);
                return '';
            }

            try {
                // 1. Find matching files
                const relativeFiles = PathResolver.listFiles(
                    `view/${globPattern}`,
                    _matchGlobPattern,
                    _readDirRecursive
                );

                // 2. Parse each file for {{#component}} blocks
                const components = [];
                for (const relativeFile of relativeFiles) {
                    // Resolve file path with site overrides and plugins
                    let fullPath;
                    try {
                        const relativePath = `view/${relativeFile}`;
                        fullPath = PathResolver.resolveModuleWithPlugins(relativePath);
                    } catch (error) {
                        LogController.logWarning(req, 'handlebar.file.includeComponents',
                            `File not found: ${relativeFile}, skipping`);
                        continue;
                    }

                    // Read file content using cache
                    const content = self.includeCache.getFileSync(fullPath);
                    if (content === null) {
                        LogController.logWarning(req, 'handlebar.file.includeComponents',
                            `File not found or deleted: ${relativeFile}, skipping`);
                        continue;
                    }

                    // Parse component blocks from file
                    const matches = _parseComponentBlocks(content);

                    for (const match of matches) {
                        // Filter by component pattern if specified
                        if (componentFilter && !_matchesComponentPattern(match.name, componentFilter)) {
                            continue;
                        }

                        // Expand component content with handlebars
                        // Pass empty context so it gets fresh internalContext with i18n, user, etc.
                        const expandedContent = await self._expandHandlebars(req, match.content, {}, depth + 1);

                        components.push({
                            name: match.name,
                            content: expandedContent,
                            order: match.order || 99999,
                            file: relativeFile
                        });
                    }
                }

                // 3. Sort components
                _sortComponents(components, sortBy);

                // 4. Ensure context.components exists
                if (!currentContext.components) {
                    currentContext.components = {};
                }

                // 5. Register components in registry and update context
                for (const comp of components) {
                    // Convert component name (adminCards.config -> adminCards.config)
                    const usageName = self._convertComponentName(comp.name);

                    // Register in component registry
                    req.componentRegistry.set(usageName, {
                        originalName: comp.name,
                        template: comp.content, // Already expanded
                        defaults: {},
                        order: comp.order
                    });

                    // Add to context.components
                    _setNestedProperty(currentContext.components, usageName, comp.content);

                    LogController.logInfo(req, 'handlebar.file.includeComponents',
                        `Component registered: ${comp.name} (order: ${comp.order}, file: ${comp.file})`
                    );
                }

                LogController.logInfo(req, 'handlebar.file.includeComponents',
                    `Registered ${components.length} component(s) from ${relativeFiles.length} file(s) with pattern: ${globPattern}`
                );

                return ''; // No output, just registration
            } catch (error) {
                LogController.logError(req, 'handlebar.file.includeComponents', `Error including components with pattern ${globPattern}: ${error.message}`);
                return '';
            }
        }

        /**
         * W-102: Parse {{#component}} blocks from content
         * Returns array of { name, content, order }
         */
        function _parseComponentBlocks(content) {
            const components = [];
            // Regex to match {{#component "name" order=N}} ... {{/component}}
            const regex = /\{\{#component\s+"([^"]+)"(?:\s+order=(\d+))?\s*\}\}(.*?)\{\{\/component\}\}/gs;

            let match;
            while ((match = regex.exec(content)) !== null) {
                components.push({
                    name: match[1],
                    order: match[2] ? parseInt(match[2], 10) : 99999,
                    content: match[3].trim()
                });
            }

            return components;
        }

        /**
         * W-102: Check if component name matches pattern
         * Supports: "namespace.*" (wildcard), "namespace.name" (exact), comma-separated
         */
        function _matchesComponentPattern(componentName, pattern) {
            if (!pattern) return true;

            const patterns = pattern.split(',').map(p => p.trim());

            return patterns.some(pat => {
                if (pat.endsWith('.*')) {
                    // Namespace match: "adminCards.*"
                    const namespace = pat.slice(0, -2);
                    return componentName.startsWith(namespace + '.');
                } else {
                    // Exact match: "adminCards.config"
                    return componentName === pat;
                }
            });
        }

        /**
         * W-102: Sort components by specified method
         */
        function _sortComponents(components, sortBy) {
            switch (sortBy) {
                case 'component-order':
                    components.sort((a, b) => a.order - b.order);
                    break;

                case 'plugin-order':
                    components.sort((a, b) => {
                        const pluginA = _extractPluginName(a.file);
                        const pluginB = _extractPluginName(b.file);
                        const orderA = _getPluginLoadOrder(pluginA);
                        const orderB = _getPluginLoadOrder(pluginB);
                        return orderA - orderB;
                    });
                    break;

                case 'filename':
                    components.sort((a, b) => a.file.localeCompare(b.file));
                    break;

                case 'filesystem':
                    // No sorting - keep filesystem order
                    break;

                default:
                    LogController.logWarning(req, 'handlebar.file.includeComponents',
                        `Unknown sortBy method: ${sortBy}, using component-order`
                    );
                    components.sort((a, b) => a.order - b.order);
            }
        }

        /**
         * W-102: Extract plugin name from file path
         * Example: "jpulse-plugins/hello-world.shtml" -> "hello-world"
         */
        function _extractPluginName(filePath) {
            const match = filePath.match(/jpulse-plugins\/([^/.]+)/);
            return match ? match[1] : null;
        }

        /**
         * W-102: Get plugin load order from PluginManager
         * Returns index in load order, or 99999 if not found
         */
        function _getPluginLoadOrder(pluginName) {
            if (!pluginName) return 99999;

            // Access global PluginManager if available
            if (!global.PluginManager || !global.PluginManager.registry) {
                LogController.logWarning(req, 'handlebar.file.includeComponents',
                    `PluginManager not available, using fallback order for plugin: ${pluginName}`
                );
                return 99999;
            }

            const loadOrder = global.PluginManager.registry.loadOrder || [];
            const index = loadOrder.indexOf(pluginName);
            return index >= 0 ? index : 99999;
        }

        /**
         * W-102: Set nested property in object
         * Example: setNestedProperty(obj, "admin.cards.config", value)
         * Creates intermediate objects as needed
         */
        function _setNestedProperty(obj, path, value) {
            const parts = path.split('.');
            let current = obj;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part] || typeof current[part] !== 'object') {
                    current[part] = {};
                }
                current = current[part];
            }

            current[parts[parts.length - 1]] = value;
        }

        /**
         * Get nested property from object using dot notation
         */
        function _getNestedProperty(obj, path) {
            // Handle special @ properties for each loops
            if (path.startsWith('@')) {
                return obj[path];
            }

            return path.split('.').reduce((current, key) => {
                return current && current[key] !== undefined ? current[key] : undefined;
            }, obj);
        }

        /**
         * Evaluate condition for {{#if}} and {{#unless}} blocks
         * W-114: Enhanced to support subexpressions like (and ...), (gt ...), etc.
         * Uses same unified approach as block helpers for consistency.
         */
        async function _evaluateCondition(params, currentContext) {
            const trimmed = params.trim();

            // W-114: Handle subexpressions: (helper arg1 arg2 ...)
            // Use same evaluation approach as block helpers - just evaluate as regular handlebar
            if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
                const subExpr = trimmed.substring(1, trimmed.length - 1).trim();
                const result = await _evaluateRegularHandlebar(subExpr, currentContext);
                // Logical/comparison helpers return 'true'/'false' strings
                return result === 'true';
            }

            // Handle helper functions (file.exists, etc.)
            if (trimmed.startsWith('file.exists ')) {
                const filePath = trimmed.substring('file.exists '.length).trim();
                const result = _handleFileExists(filePath);
                return result === 'true';
            }

            // Handle property access
            const value = _getNestedProperty(currentContext, trimmed);

            // JavaScript truthy evaluation
            return !!value;
        }

        // Phase 2: Left-to-right resolution using single regex for both regular and block handlebars
        async function _resolveHandlebars(text, localContext = null, blockType, blockLevel, blockParams, blockContent, regularHandlebar) {
            const currentContext = localContext || context;

            if (blockType) {
                // Block handlebars: {{#type:~level~ params}}content{{/type:~level~}}
                try {
                    const evaluatedContent = await _evaluateBlockHandlebar(blockType, blockParams.trim(), blockContent, currentContext);
                    // Recursively process the evaluated content (without re-annotating)
                    return await _resolveHandlebars(evaluatedContent, localContext);
                } catch (error) {
                    LogController.logError(req, 'handlebar.expandHandlebars', `error: Handlebar "#${blockType} ${blockParams}": ${error.message}`);
                    return `<!-- Error: Handlebar "#${blockType} ${blockParams}": ${error.message} -->`;
                }
            } else if (regularHandlebar) {
                // Regular handlebars: {{name params}}
                try {
                    return await _evaluateRegularHandlebar(regularHandlebar, currentContext);
                } catch (error) {
                    LogController.logError(req, 'handlebar.expandHandlebars', `error: Handlebar "${regularHandlebar}": ${error.message}`);
                    return `<!-- Error: Handlebar "${regularHandlebar}": ${error.message} -->`;
                }
            } else {
                // Recursive text processing - this is the entry point
                const regex = /\{\{#([a-z]+):~(\d+)~ ?(.*?)\}\}(.*?)\{\{\/\1:~\2~\}\}|\{\{(\@?[a-z][a-z0-9.]*.*?)\}\}/gs;
                let result = text;

                // Find all matches first
                const matches = [...text.matchAll(regex)];

                // Process matches sequentially (await each one)
                for (const match of matches) {
                    const [fullMatch, bType, bLevel, bParams, bContent, rHandlebar] = match;
                    const replacement = await _resolveHandlebars(fullMatch, localContext, bType, bLevel, bParams, bContent, rHandlebar);
                    result = result.replace(fullMatch, replacement);
                }

                return result;
            }
        }

        let result = await _resolveHandlebars(annotated, context);

        // Phase 3: Clean up any remaining unbalanced annotations
        result = result.replace(/\{\{([#\/][a-z]+):~\d+~(.*?)\}\}/g, '<!-- Error: Unbalanced handlebar "$1$2" removed -->');

        return result;
    }

    /**
     * W-097 Phase 1: Convert component name to usage name
     * Converts kebab-case to camelCase, preserving dot-notation namespaces
     * Examples:
     *   - logs-svg → logsSvg
     *   - icons.config-svg → icons.configSvg
     *   - ui.buttons.primary → ui.buttons.primary
     * @param {string} componentName - Original component name
     * @returns {string} Usage name (camelCase with optional dot namespaces)
     */
    static _convertComponentName(componentName) {
        // Handle dot-notation namespaces by converting each segment separately
        const segments = componentName.split('.');
        const convertedSegments = segments.map(segment => {
            // If no hyphens in segment, use as-is
            if (!segment.includes('-')) {
                return segment;
            }
            // Convert kebab-case to camelCase for this segment
            return segment.replace(/-([a-z0-9])/gi, (match, letter) => letter.toUpperCase());
        });
        return convertedSegments.join('.');
    }

    /**
     * API endpoint: POST /api/1/handlebar/expand
     * Expand handlebars in text with provided context
     *
     * Request body:
     * {
     *   "text": "Hello {{user.firstName}}!",
     *   "context": { "custom": "value" }  // Optional, augments internal context
     * }
     *
     * Response:
     * {
     *   "success": true,
     *   "text": "Hello John!"
     * }
     * or
     * {
     *   "success": false,
     *   "error": "error message"
     * }
     */
    static async apiExpand(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'handlebar.apiExpand', '');

        try {
            const { text, context = {} } = req.body;

            if (typeof text !== 'string') {
                LogController.logError(req, 'handlebar.apiExpand', 'error: text string is required');
                const message = global.i18n?.translate(req, 'controller.handlebar.textRequired') || 'Text string is required';
                return res.json({
                    success: false,
                    error: message
                });
            }

            // Expand handlebars (context will be merged with internal context and filtered)
            const expandedText = await HandlebarController.expandHandlebars(req, text, context, 0);

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'handlebar.apiExpand', `success: expanded in ${duration}ms`);

            res.json({
                success: true,
                text: expandedText
            });

        } catch (error) {
            LogController.logError(req, 'handlebar.apiExpand', `error: ${error.message}`);
            const message = global.i18n?.translate(req, 'controller.handlebar.internalError', { details: error.message }) || error.message;
            return res.json({
                success: false,
                error: message
            });
        }
    }
}

export default HandlebarController;

// EOF webapp/controller/handlebar.js
