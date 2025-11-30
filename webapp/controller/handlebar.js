/**
 * @name            jPulse Framework / WebApp / Controller / Handlebar
 * @tagline         Handlebars template processing controller
 * @description     Extracted handlebars processing logic from ViewController (W-088)
 * @file            webapp/controller/handlebar.js
 * @version         1.3.2
 * @release         2025-11-30
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.0, Claude Sonnet 4.5
 */

import path from 'path';
import { readdirSync, statSync } from 'fs';
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
                roles: req.session?.user?.roles || [],
                preferences: req.session?.user?.preferences || {},
                isAuthenticated: AuthController.isAuthenticated(req),
                isAdmin: AuthController.isAuthorized(req, adminRoles)
            },
            config: this.globalConfig?.data || {},
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
            i18n: global.i18n.getLang(AuthController.getUserLanguage(req))
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
     * Removes sensitive paths defined in app.conf
     * @param {object} context - Context to filter
     * @param {boolean} isAuthenticated - Whether user is authenticated
     * @returns {object} Filtered context
     */
    static _filterContext(context, isAuthenticated) {
        const filterList = isAuthenticated
            ? global.appConfig.controller.handlebar.contextFilter.withAuth
            : global.appConfig.controller.handlebar.contextFilter.withoutAuth;

        if (!filterList || filterList.length === 0) {
            return context;
        }

        // Deep clone context to avoid mutating original
        const filtered = JSON.parse(JSON.stringify(context));

        // Remove filtered paths
        for (const filterPath of filterList) {
            this._removePath(filtered, filterPath);
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

        // Build internal context
        const internalContext = await this._buildInternalContext(req);

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
         */
        async function _evaluateBlockHandlebar(blockType, params, blockContent, currentContext) {
            switch (blockType) {
                case 'if':
                    return _handleBlockIf(params, blockContent, currentContext);
                case 'unless':
                    return _handleBlockUnless(params, blockContent, currentContext);
                case 'each':
                    return await _handleBlockEach(params, blockContent, currentContext);
                case 'component':
                    return await _handleComponentDefinition(params, blockContent, currentContext);
                default:
                    throw new Error(`Unknown block type: #${blockType}`);
            }
        }

        /**
         * Evaluate a single handlebars expression
         */
        async function _evaluateHandlebar(expression, currentContext) {
            const parsedArgs = _parseArguments(expression);
            const helper = parsedArgs._helper;

            // W-097 Phase 1: Handle use.componentName pattern
            if (helper && helper.startsWith('use.')) {
                const componentName = helper.substring(4); // Remove 'use.' prefix
                // Reconstruct params string for parseHelperArgs
                const paramsString = Object.keys(parsedArgs)
                    .filter(k => k !== '_helper')
                    .map(k => k === '_target' ? `"${parsedArgs[k]}"` : `${k}="${parsedArgs[k]}"`)
                    .join(' ');
                return await _handleComponentUse(componentName, paramsString, currentContext);
            }

            // Handle helper functions first (before property access)
            switch (helper) {
                case 'file.include':
                    return await _handleFileInclude(parsedArgs, currentContext);
                case 'file.timestamp':
                    return _handleFileTimestamp(parsedArgs._target);
                case 'file.exists':
                    return _handleFileExists(parsedArgs._target);
                case 'file.list':
                    return _handleFileList(parsedArgs, currentContext);
                case 'file.extract':
                    return _handleFileExtract(parsedArgs, currentContext);
                default:
                    // Handle property access (no spaces)
                    if (!helper.includes(' ')) {
                        let value;
                        if (helper.includes('.')) {
                            // Nested property access (e.g., user.name)
                            value = getNestedProperty(currentContext, helper);
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
                    // Unknown helper, return empty
                    LogController.logInfo(req, 'handlebar.expandHandlebars', `DEBUG: Unknown helper: ${helper}`);
                    return '';
            }
        }

        /**
         * Parse handlebars arguments (space-separated, quoted strings preserved)
         */
        function _parseArguments(expression) {
            const args = {};
            // Updated regex to handle: helper "target" param1="value1" param2="value2"
            // or: helper "target" param1=value1 param2=value2
            const parts = expression.trim().match(/^([^ ]+)(?: *"?([^"]*)"?(?: (.*))?)?$/);
            args._helper = parts?.[1];
            args._target = parts?.[2];
            if(parts?.[3]) {
                parts[3].replace(/ *(\w+)=(?:(['"])(.*?)\2|([^ ]*))/g, (m, key, q1, sVal, val) => {
                    if(!q1) {
                        if(val === 'true') {
                            val = true;
                        } else if(val === 'false') {
                            val = false;
                        } else {
                            val = Number(val);
                        }
                    } else {
                        val = sVal;
                    }
                    args[key] = val;
                });
            }
            return args;
        }

        /**
         * Handle {{#if}} blocks
         */
        function _handleBlockIf(params, blockContent, currentContext) {
            const condition = _evaluateCondition(params, currentContext);
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
         */
        function _handleBlockUnless(params, blockContent, currentContext) {
            const condition = _evaluateCondition(params, currentContext);
            // no {{else}}
            return condition ? '' : blockContent;
        }

        /**
         * Handle {{#each}} blocks
         * W-094: Support file.list with sortBy and pattern parameters
         */
        async function _handleBlockEach(params, blockContent, currentContext) {
            let items = getNestedProperty(currentContext, params.trim());
            let extractPattern = null;
            let sortBy = null;

            // W-094: Check if params is file.list helper call
            if (params.trim().startsWith('file.list ')) {
                const parsedArgs = _parseArguments(params.trim());
                if (parsedArgs._helper === 'file.list') {
                    // Get the file list
                    const listResult = _handleFileList(parsedArgs, currentContext);
                    items = JSON.parse(listResult);

                    // Get sortBy parameter
                    sortBy = parsedArgs.sortBy || null;

                    // Get pattern parameter (for passing to file.extract)
                    extractPattern = parsedArgs.pattern || null;

                    // If sortBy is "extract-order", sort by extracting order from files
                    if (sortBy === 'extract-order' && Array.isArray(items)) {
                        const filesWithOrder = items.map(filePath => {
                            try {
                                const relativePath = `view/${filePath}`;
                                const fullPath = PathResolver.resolveModuleWithPlugins(relativePath);
                                const content = self.includeCache.getFileSync(fullPath);
                                if (content !== null) {
                                    let extracted = null;

                                    // If pattern is provided, try CSS selector first, then fall back to markers
                                    if (extractPattern) {
                                        if (extractPattern.startsWith('.') || extractPattern.startsWith('#')) {
                                            extracted = _extractFromCSSSelector(content, extractPattern);
                                        }
                                    }

                                    // Fall back to marker extraction if CSS selector didn't work
                                    if (!extracted) {
                                        extracted = _extractOrderFromMarkers(content);
                                    }

                                    const order = extracted ? extracted.order : 99999;
                                    return {
                                        path: filePath,
                                        order: order
                                    };
                                }
                            } catch (error) {
                                // File not found or error - use default order
                            }
                            return { path: filePath, order: 99999 };
                        });

                        // Sort by order, then by filename
                        filesWithOrder.sort((a, b) => {
                            if (a.order !== b.order) {
                                return a.order - b.order;
                            }
                            return a.path.localeCompare(b.path);
                        });

                        items = filesWithOrder.map(f => f.path);
                    } else if (sortBy === 'filename' && Array.isArray(items)) {
                        // Sort alphabetically by filename
                        items.sort();
                    }
                }
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

                // W-094: Pass extract pattern to context for file.extract to use
                if (extractPattern) {
                    iterationContext['@extractPattern'] = extractPattern;
                }

                if (Array.isArray(items)) {
                    // For arrays: item is the array element
                    iterationContext['this'] = item;
                } else {
                    // For objects: item is [key, value] pair
                    iterationContext['@key'] = item[0];
                    iterationContext['this'] = item[1];
                }

                // Process handlebars in block content with iteration context
                // Use _resolveHandlebars with local context for efficiency (no re-annotation)
                // Note: This is called from _evaluateBlockHandlebar which is called from async _resolveHandlebars
                // So we need to await here, but _handleBlockEach is not async, so we'll handle it differently
                // Actually, _handleBlockEach is called from _evaluateBlockHandlebar which is called from async _resolveHandlebars
                // So we can make _handleBlockEach async
                let processedContent = await _resolveHandlebars(blockContent, iterationContext);

                result += processedContent;
            }

            return result;
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
         */
        async function _handleComponentDefinition(params, blockContent, currentContext) {
            // Parse component name and parameters
            const parsedArgs = self._parseHelperArgs(params);

            // First parameter is the component name (required)
            const componentName = parsedArgs._target;
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
            for (const [key, value] of Object.entries(parsedArgs)) {
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

            LogController.logInfo(req, 'handlebar.component',
                `Component registered: ${componentName} (use as: {{use.${usageName}}})`
            );

            // Component definition produces no output
            return '';
        }

        /**
         * W-097 Phase 1: Handle component usage
         * Syntax: {{use.componentName param="value"}}
         * Renders component with provided parameters
         */
        async function _handleComponentUse(componentName, params, currentContext) {
            // Check if component exists in registry
            if (!req.componentRegistry.has(componentName)) {
                const error = `Component "${componentName}" not found. Did you forget to include the component library?`;
                LogController.logError(req, 'handlebar.use', error);

                // Return visible error except in production (safer default)
                if (global.appConfig.env !== 'production') {
                    return `<!-- Error: ${error} -->`;
                }
                return '';
            }

            // Check for circular reference
            if (req.componentCallStack.includes(componentName)) {
                const callChain = [...req.componentCallStack, componentName].join(' → ');
                const error = `Circular component reference detected: ${callChain}`;
                LogController.logError(req, 'handlebar.use', error);
                return `<!-- Error: ${error} -->`;
            }

            // Check nesting depth
            const MAX_DEPTH = global.appConfig.controller.handlebar.maxIncludeDepth || 16;
            if (req.componentCallStack.length >= MAX_DEPTH) {
                const error = `Component nesting too deep (max ${MAX_DEPTH}): ${req.componentCallStack.join(' → ')}`;
                LogController.logError(req, 'handlebar.use', error);
                return `<!-- Error: ${error} -->`;
            }

            // Get component definition
            const component = req.componentRegistry.get(componentName);

            // Parse parameters from usage
            const parsedArgs = self._parseHelperArgs(params);

            // W-097 Phase 1: Check for _inline directive (framework parameter)
            const shouldInline = parsedArgs._inline === 'true' || parsedArgs._inline === true;

            // W-097 Phase 1: Filter out framework parameters (those starting with _)
            // Framework params: _helper, _target, _inline, etc.
            const userParams = {};
            for (const [key, value] of Object.entries(parsedArgs)) {
                if (!key.startsWith('_')) {
                    userParams[key] = value;
                }
            }

            // Merge parameters: context + defaults + user params (framework params excluded)
            const componentContext = {
                ...currentContext,
                ...component.defaults,
                ...userParams
            };

            // Track call stack for circular reference detection
            req.componentCallStack.push(componentName);

            try {
                // Recursively expand component template
                let result = await _resolveHandlebars(component.template, componentContext);

                // W-097 Phase 1: Apply _inline transformation if requested
                // Removes newlines and extra whitespace for JavaScript string compatibility
                if (shouldInline) {
                    result = result
                        .replace(/\r?\n/g, ' ')      // Replace newlines with spaces
                        .replace(/\s+/g, ' ')        // Collapse multiple spaces
                        .trim();                      // Remove leading/trailing whitespace
                }

                return result;
            } finally {
                // Always pop from call stack
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
         * W-094: Extract order number from content using markers
         * Returns { order: number, content: string } or null if no markers found
         */
        function _extractOrderFromMarkers(content) {
            // Try HTML comments: <!-- extract:start order=N --> ... <!-- extract:end -->
            let match = content.match(/<!--\s*extract:start\s+(?:order\s*=\s*(\d+))?\s*-->(.*?)<!--\s*extract:end\s*-->/s);
            if (match) {
                return {
                    order: match[1] ? parseInt(match[1], 10) : 99999,
                    content: match[2].trim()
                };
            }

            // Try block comments: /* extract:start order=N */ ... /* extract:end */
            match = content.match(/\/\*\s*extract:start\s+(?:order\s*=\s*(\d+))?\s*\*\/\s*(.*?)\s*\/\*\s*extract:end\s*\*\//s);
            if (match) {
                return {
                    order: match[1] ? parseInt(match[1], 10) : 99999,
                    content: match[2].trim()
                };
            }

            // Try line comments (JS/Python): // extract:start order=N ... // extract:end
            match = content.match(/\/\/\s*extract:start\s+(?:order\s*=\s*(\d+))?\s*\n(.*?)\/\/\s*extract:end/s);
            if (match) {
                return {
                    order: match[1] ? parseInt(match[1], 10) : 99999,
                    content: match[2].trim()
                };
            }

            // Try Python-style line comments: # extract:start order=N ... # extract:end
            match = content.match(/#\s*extract:start\s+(?:order\s*=\s*(\d+))?\s*\n(.*?)#\s*extract:end/s);
            if (match) {
                return {
                    order: match[1] ? parseInt(match[1], 10) : 99999,
                    content: match[2].trim()
                };
            }

            return null; // No markers found
        }

        /**
         * W-094: Extract content using regex pattern
         */
        function _extractFromRegex(content, pattern) {
            // Parse /pattern/flags format
            const regexMatch = pattern.match(/^\/(.*)\/([gimsuvy]*)$/);
            if (!regexMatch) {
                throw new Error('Invalid regex pattern format. Use /pattern/flags');
            }

            const [, regexPattern, flags] = regexMatch;

            // Validate: must contain capture group
            if (!regexPattern.includes('(')) {
                throw new Error('Regex pattern must contain at least one capture group (...)');
            }

            try {
                const regex = new RegExp(regexPattern, flags);
                const match = content.match(regex);
                return match ? match[1] : ''; // Return first capture group
            } catch (error) {
                throw new Error(`Invalid regex pattern: ${error.message}`);
            }
        }

        /**
         * W-094: Extract content using CSS selector (.class or #id)
         * Returns { order: number, content: string } or null if not found
         */
        function _extractFromCSSSelector(content, selector) {
            try {
                // Phase 1: Pre-scan for start of class or id, and for order number
                const isClass = selector.startsWith('.');
                const selectorName = selector.substring(1);
                const attrName = isClass ? 'class' : 'id';
                const attrPattern = isClass
                    ? `${attrName}=["'][^"']*\\b${selectorName}\\b[^"']*`
                    : `${attrName}=["']${selectorName}["']`;
                let tagRegex = new RegExp(
                    `<([a-z][a-z0-9]*)\\s+` +       // Capture tag name
                    `(?=[^>]*\\b${attrPattern})` +  // Lookahead for attribute
                    `(?:[^>]*\\bdata-extract-order=["'](\\d+)["'])?` +  // Capture order
                    `[^>]*>`,                       // Match to end of tag
                    'is'
                );
                let match = content.match(tagRegex);
                if (!match) return null;
                const tag = match[1];
                const order = match[2] ? parseInt(match[2], 10) : 99999;

                // Phase 2: Annotate nesting levels of identified tags with simple level numbering
                let level = 0;
                tagRegex = new RegExp(`(</?)(${tag})(?=[\\s>])`, 'gis');
                const annotated = content.replace(tagRegex, (match, c1, c2) => {
                    let result;
                    if (c1 === '<') {   // start tag
                        result = `${c1}${c2}:~${level}~`;
                        level++;
                    } else {            // end tag
                        level--;
                        result = `${c1}${c2}:~${level}~`;
                    }
                    return result;
                });

                // Phase 3: Extract content between matching start and end tag by level
                tagRegex = new RegExp(
                    `<${tag}(:~\\d+~) [^>]*>` + // Match start tag with nesting level
                    `(.*?)` +                   // Non-greedy match for content to extract
                    `</${tag}\\1>`,             // Match end tag with same nesting level
                    'is'
                );
                match = annotated.match(tagRegex);
                if (!match) return null;

                // Phase 4: Clean up nesting level annotations
                const extracted = match[2].replace(/(<\/?[a-z][a-z0-9]*):~\d+~/g, '$1');

                return {
                    order: order,
                    content: extracted.trim()
                };
            } catch (error) {
                return null;
            }
        }

        /**
         * W-094: Handle file.extract helper - extract section from file
         */
        function _handleFileExtract(parsedArgs, currentContext) {
            // Handle "this" variable from #each loop context
            let filePath = parsedArgs._target;

            // If _target is the literal string "this", look it up in context
            if (filePath === 'this') {
                filePath = currentContext && currentContext['this'] ? currentContext['this'] : null;
                if (!filePath) {
                    LogController.logError(req, 'handlebar.file.extract', `file.extract: "this" not found in context. Available keys: ${currentContext ? Object.keys(currentContext).join(', ') : 'no context'}`);
                    return '';
                }
            }

            // If still no filePath, try to get from context directly
            if (!filePath && currentContext && currentContext['this'] && typeof currentContext['this'] === 'string') {
                filePath = currentContext['this'];
            }

            if (!filePath || typeof filePath !== 'string') {
                LogController.logError(req, 'handlebar.file.extract', `file.extract requires a file path, got: ${typeof filePath} ${filePath}`);
                return '';
            }

            // Get pattern from parsedArgs or from context (set by file.list in #each loop)
            const pattern = parsedArgs.pattern || currentContext['@extractPattern'] || null;

            // Security: Prohibit path traversal and absolute paths
            if (filePath.includes('../') || filePath.includes('..\\') || path.isAbsolute(filePath)) {
                LogController.logError(req, 'handlebar.file.extract', `Prohibited path in extract: ${filePath}. Use relative paths from view root only.`);
                return '';
            }

            // Use PathResolver to support site overrides and plugins (W-045)
            let fullPath;
            try {
                const relativePath = `view/${filePath}`;
                fullPath = PathResolver.resolveModuleWithPlugins(relativePath);
            } catch (error) {
                LogController.logError(req, 'handlebar.file.extract', `File not found: ${filePath} (${error.message})`);
                return '';
            }

            // Get file content using FileCache
            const content = self.includeCache.getFileSync(fullPath);
            if (content === null) {
                LogController.logError(req, 'handlebar.file.extract', `File not found or deleted: ${filePath}`);
                return '';
            }

            try {
                // If pattern provided, determine extraction method
                if (pattern) {
                    // Regex pattern: starts with /
                    if (pattern.startsWith('/')) {
                        return _extractFromRegex(content, pattern);
                    }

                    // CSS selector: starts with . or #
                    if (pattern.startsWith('.') || pattern.startsWith('#')) {
                        const extracted = _extractFromCSSSelector(content, pattern);
                        return extracted ? extracted.content : '';
                    }

                    // Unknown pattern format, fall back to markers
                }

                // Default: use marker extraction
                const extracted = _extractOrderFromMarkers(content);
                return extracted ? extracted.content : '';
            } catch (error) {
                LogController.logError(req, 'handlebar.file.extract', `Error extracting from ${filePath}: ${error.message}`);
                return '';
            }
        }

        /**
         * Get nested property from object using dot notation
         */
        function getNestedProperty(obj, path) {
            // Handle special @ properties for each loops
            if (path.startsWith('@')) {
                return obj[path];
            }

            return path.split('.').reduce((current, key) => {
                return current && current[key] !== undefined ? current[key] : undefined;
            }, obj);
        }

        /**
         * Evaluate condition for {{#if}} blocks
         */
        function _evaluateCondition(params, currentContext) {
            const trimmed = params.trim();

            // Handle negation
            if (trimmed.startsWith('!')) {
                return !_evaluateCondition(trimmed.substring(1), currentContext);
            }

            // Handle helper functions
            if (trimmed.startsWith('file.exists ')) {
                const filePath = trimmed.substring('file.exists '.length).trim();
                const result = _handleFileExists(filePath);
                return result === 'true';
            }

            // Handle property access
            const value = getNestedProperty(currentContext, trimmed);

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
                    return await _evaluateHandlebar(regularHandlebar, currentContext);
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
     * W-097 Phase 1: Parse helper arguments
     * Parses "name" param1="value1" param2="value2" format
     * @param {string} argsString - Arguments string
     * @returns {object} Parsed arguments with _target for name
     */
    static _parseHelperArgs(argsString) {
        const args = { _helper: true };

        // Match first quoted string as _target
        const targetMatch = argsString.match(/^["']([^"']+)["']/);
        if (targetMatch) {
            args._target = targetMatch[1];
            // Remove target from string for further parsing
            argsString = argsString.substring(targetMatch[0].length).trim();
        }

        // Match key="value" pairs
        const paramRegex = /(\w+)=["']([^"']*)["']/g;
        let match;
        while ((match = paramRegex.exec(argsString)) !== null) {
            args[match[1]] = match[2];
        }

        return args;
    }

    /**
     * Get health status (standardized format)
     * Returns hard-coded English message (like HealthController)
     * @returns {object} Health status object
     */
    static getHealthStatus() {
        const isConfigured = this.includeCache !== null && this.globalConfig !== null;

        const cacheStats = {
            include: this.includeCache ? this.includeCache.getStats() : {
                name: 'IncludeCache',
                fileCount: 0,
                directoryCount: 0,
                config: { enabled: false }
            }
        };
        const includeCacheStats = cacheStats.include || {};
        const defaultDocName = global.ConfigController?.getDefaultDocName() || '';

        return {
            status: isConfigured ? 'ok' : 'not_configured',
            configured: isConfigured,
            message: isConfigured ? '' : 'HandlebarController not initialized', // Hard-coded English
            details: isConfigured ? {
                configDocument: defaultDocName,
                configLoaded: this.globalConfig !== null,
                includeCache: {
                    enabled: includeCacheStats.config?.enabled || false,
                    fileCount: includeCacheStats.fileCount || 0,
                    directoryCount: includeCacheStats.directoryCount || 0
                }
            } : {} // Empty object instead of null for easier parsing
            // Note: timestamp is added by HealthController._addComponentHealthStatuses()
        };
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
            const expandedText = await this.expandHandlebars(req, text, context, 0);

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
