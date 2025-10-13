/**
 * @name            jPulse Framework / WebApp / View Controller
 * @tagline         Server-side template rendering controller
 * @description     Handles .shtml files with handlebars template expansion
 * @file            webapp/controller/view.js
 * @version         0.9.7
 * @release         2025-10-12
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           50%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import LogController from './log.js';
import configModel from '../model/config.js';
// i18n will be available globally after bootstrap
import CommonUtils from '../utils/common.js';
import PathResolver from '../utils/path-resolver.js';
import AuthController from './auth.js';
import fsPromises from 'fs/promises'; // New import
import cacheManager from '../utils/cache-manager.js';

// W-014: Import ContextExtensions at module level for performance
let ContextExtensions = null;   // initilized by initialize()

// W-079: File-based caches with automatic refresh
let templateCache = null;       // initialized by initialize()
let includeCache = null;        // initialized by initialize()

// Global config from database (loaded once at startup)
let globalConfig = null;

/**
 * Initialize view controller - load global config once
 */
async function initialize() {
    // W-079: Initialize file caches using simplified CacheManager
    const templateCacheConfig = global.appConfig.controller.view.cacheTemplates || { enabled: true };
    const includeCacheConfig = global.appConfig.controller.view.cacheIncludes || { enabled: true };

    // In test mode, disable caching to prevent hanging
    const isTestMode = process.env.NODE_ENV === 'test' || global.isTestEnvironment;
    if (isTestMode) {
        templateCacheConfig.enabled = false; // Disable caching in tests
        includeCacheConfig.enabled = false;
    }

    templateCache = cacheManager.register(templateCacheConfig, 'TemplateCache');
    includeCache = cacheManager.register(includeCacheConfig, 'IncludeCache');

    // Load global config once (not file-based, keep as-is)
    try {
        globalConfig = await configModel.findById('global');
        LogController.logInfo(null, 'view.initialize', 'Global config loaded');
    } catch (error) {
        LogController.logError(null, 'view.initialize', `Failed to load global config: ${error.message}`);
    }

    // W-076: Register broadcast callback for config refresh
    try {
        const RedisManager = (await import('../utils/redis-manager.js')).default;
        RedisManager.registerBroadcastCallback('controller:view:config:refresh', (channel, data, sourceInstanceId) => {
            // Call refreshGlobalConfig with 'broadcast' source to avoid re-broadcasting
            refreshGlobalConfig('broadcast');
        });
        LogController.logInfo(null, 'view.initialize', 'Registered broadcast callback for config refresh');
    } catch (error) {
        // Don't fail initialization if broadcast registration fails
        LogController.logError(null, 'view.initialize', `Failed to register broadcast callback: ${error.message}`);
    }

    // Asynchronously pre-load ContextExtensions once when the module loads
    ContextExtensions = (await import('../utils/context-extensions.js')).default;
}

/**
 * W-076: Refresh global config from database
 * @param {string} source - Source of refresh request: 'local' or 'broadcast'
 * Used when config is updated locally or via broadcast from another instance
 */
async function refreshGlobalConfig(source = 'local') {
    try {
        const newGlobalConfig = await configModel.findById('global');
        globalConfig = newGlobalConfig;

        if (source === 'local') {
            // Local config update - broadcast to other instances
            LogController.logInfo(null, 'view.refreshGlobalConfig', 'Global config refreshed locally, broadcasting to cluster');

            // Import RedisManager dynamically to avoid circular dependencies
            try {
                const RedisManager = (await import('../utils/redis-manager.js')).default;
                await RedisManager.publishBroadcast('controller:view:config:refresh', {
                    source: 'local',
                    timestamp: Date.now()
                });
            } catch (error) {
                // Don't fail the refresh if broadcast fails
                LogController.logError(null, 'view.refreshGlobalConfig', `Broadcast failed: ${error.message}`);
            }
        } else if (source === 'broadcast') {
            // Received via broadcast - just refresh local cache
            LogController.logInfo(null, 'view.refreshGlobalConfig', 'Global config refreshed via broadcast');
        }

        return true;
    } catch (error) {
        LogController.logError(null, 'view.refreshGlobalConfig', `Failed to refresh global config: ${error.message}`);
        return false;
    }
}

/**
 * Load and render .shtml template files with handlebars expansion
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function load(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const loginId = req.session?.user?.loginId || '(guest)';
    const vmId = process.env.VM_ID || '0';
    const pmId = process.env.pm_id || '0';

    try {
        // Log the request
        LogController.logRequest(req, 'view.load', req.path);

        // Determine the file path
        let filePath = req.path;
        const defaultTemplate = global.appConfig?.controller?.view?.defaultTemplate || 'index.shtml';
        if (filePath === '/') {
            filePath = `/home/${defaultTemplate}`;
        } else if (filePath.endsWith('/')) {
            // Only append default template for directory requests (ending with /)
            filePath = filePath + defaultTemplate;
        }

        // W-014: Use PathResolver to support site overrides (now imported at module level)
        let fullPath;
        let isTemplateFile = false; // Track if we're serving a template file
        const originalFilePath = filePath; // Keep original for content type detection

        try {
            // Try to resolve with site override support
            const relativePath = `view${filePath}`;
            fullPath = PathResolver.resolveModule(relativePath);
        } catch (error) {
            // Try .tmpl fallback for CSS and JS files (W-047 site-common files)
            const fileExtension = path.extname(filePath).toLowerCase();
            if (fileExtension === '.css' || fileExtension === '.js') {
                try {
                    const templatePath = `view${filePath}.tmpl`;
                    fullPath = PathResolver.resolveModule(templatePath);
                    isTemplateFile = true; // Mark as template file for content type handling
                } catch (templateError) {
                    // Template fallback failed, continue with original error handling
                }
            }

            // W-049: Special handling for documentation pages without extensions
            // Check if this is a documentation namespace that should use index.shtml
            if (!fullPath) {
                const pathParts = filePath.split('/');
                const namespace = pathParts[1]; // e.g., 'jpulse' from '/jpulse/deployment'

                // Only allow fallback for truly extensionless paths (no dot in last segment)
                // This supports documentation systems in any namespace (docs, sales, jpulse-docs, etc.)
                const lastSegment = pathParts[pathParts.length - 1];
                const isExtensionless = lastSegment && !lastSegment.includes('.');

                if (global.viewRegistry && global.viewRegistry.viewList.includes(namespace) && pathParts.length > 2 && isExtensionless) {
                    // This is a doc page like /jpulse-docs/deployment (no extension), try /jpulse-docs/index.shtml
                    const docIndexPath = `/${namespace}/index.shtml`;
                    try {
                        const docRelativePath = `view${docIndexPath}`;
                        fullPath = PathResolver.resolveModule(docRelativePath);
                        // Don't throw error, continue with doc index template
                    } catch (docError) {
                        // Doc index doesn't exist, continue with original error handling
                    }
                }
            }

            if (!fullPath) {
                // File not found in either site or framework
                const originalPath = req.path;
                res.statusCode = 404; // Set 404 status code
                LogController.logError(req, 'view.load', `error: File not found: ${filePath}`);
                const message = global.i18n.translate(req, 'controller.view.pageNotFoundError', { path: originalPath });

                // Override filePath to error page and try to resolve it
                filePath = '/error/index.shtml';
                try {
                    fullPath = PathResolver.resolveModule(`view${filePath}`);
                } catch (errorPageError) {
                    // Fallback to framework error page if site override doesn't exist
                    const webappDir = global.appConfig.app.dirName;
                    fullPath = path.join(webappDir, 'view', filePath.substring(1));
                }
                req.query = { // Create a new query object for the context
                    code: '404',
                    msg: message
                };
                // No 'return' here, let the rest of the function execute to render the error page
            }
        }

        // W-079: Read template file using simplified cache
        let content = templateCache.getFileSync(fullPath);

        // Create base handlebars context
        const baseContext = {
            app: appConfig.app,
            user: {
                id: req.session?.user?.id || '',
                username: req.session?.user?.username || '',
                loginId: req.session?.user?.loginId || '',
                firstName: req.session?.user?.firstName || '',
                nickName: req.session?.user?.nickName || '',
                lastName: req.session?.user?.lastName || '',
                email: req.session?.user?.email || '',
                initials: req.session?.user?.initials || '?',
                roles: req.session?.user?.roles || [],
                preferences: req.session?.user?.preferences || {},
                authenticated: !!req.session?.user,
                isAdmin: AuthController.isAuthorized(req, ['admin', 'root'])
            },
            config: globalConfig?.data || {},
            appConfig: appConfig, // Add app.conf configuration
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
        //console.log('DEBUG: context:', JSON.stringify(context, null, 2));

        // Preprocess i18n handlebars first (only {{i18n.}} expressions),
        // because it may return content with new handlebars
        content = global.i18n.processI18nHandlebars(req, content);

        // W-079: Process all other handlebars (now synchronous with getFileSync)
        content = processHandlebars(content, context, req, 0);

        // Send response with appropriate content type
        // Use original file path for content type detection when serving template files
        const pathForContentType = isTemplateFile ? originalFilePath : filePath;
        const fileExtension = path.extname(pathForContentType).toLowerCase();
        let contentType = 'text/html';

        if (fileExtension === '.css') {
            contentType = 'text/css';
        } else if (fileExtension === '.js') {
            contentType = 'application/javascript';
        } else if (fileExtension === '.tmpl') {
            contentType = 'text/html';
        }

        res.set('Content-Type', contentType);
        res.send(content);

        // Log completion time only on success
        const duration = Date.now() - startTime;
        let err = '';
        if (filePath.match(/^\/error\/.*\.shtml$/)) {
            err = `, ${req.query?.msg || ''}`;
        }
        LogController.logInfo(req, 'view.load', `${req.path}${err}, completed in ${duration}ms`);

    } catch (error) {
        LogController.logError(req, 'view.load', `error: ${error.message}`);
        const message = global.i18n.translate(req, 'controller.view.internalServerError', { error: error.message });
        return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR');
    }
}

/**
 * Process handlebars in content using simple regex-based 3-phase approach
 * Phase 1: Annotate nesting levels with simple level numbering
 * Phase 2: Recursive resolution using regex replace
 * Phase 3: Clean up unbalanced nesting
 * @param {string} content - Template content
 * @param {Object} context - Handlebars context data
 * @param {Object} req - Express request object for logging
 * @param {number} depth - Current include depth for recursion protection
 * @returns {string} Processed content
 */
function processHandlebars(content, context, req, depth = 0) {
    // Prevent infinite recursion
    const MAX_DEPTH = 16;
    if (depth > MAX_DEPTH) {
        LogController.logError(req, 'view.load', `error: Maximum nesting depth (${MAX_DEPTH}) exceeded`);
        return content;
    }

    // Phase 1: Annotate nesting levels with simple level numbering
    let level = 0;
    const annotated = content.replace(/(\{\{)([#\/])([a-z]+)(.*?\}\})/gs, (match, c1, c2, c3, c4) => {
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

    // Local helper functions (encapsulated within processHandlebars)

    /**
     * Evaluate a block handlebars expression ({{#type}}...{{/type}})
     */
     function _evaluateBlockHandlebar(blockType, params, blockContent, currentContext) {
        switch (blockType) {
            case 'if':
                return _handleBlockIf(params, blockContent, currentContext);
            case 'unless':
                return _handleBlockUnless(params, blockContent, currentContext);
            case 'each':
                return _handleBlockEach(params, blockContent, currentContext);
            default:
                throw new Error(`Unknown block type: #${blockType}`);
        }
    }

    /**
     * Evaluate a single handlebars expression
     */
    function _evaluateHandlebar(expression, currentContext) {
        const parsedArgs = _parseArguments(expression);
        const helper = parsedArgs._helper;

        // Handle helper functions first (before property access)
        switch (helper) {
            case 'file.include':
                return _handleFileInclude(parsedArgs, currentContext);
            case 'file.timestamp':
                return _handleFileTimestamp(parsedArgs._target);
            case 'file.exists':
                return _handleFileExists(parsedArgs._target);
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
                LogController.logInfo(req, 'view.load', `DEBUG: Unknown helper: ${helper}`);
                return '';
        }
    }

    /**
     * Parse handlebars arguments (space-separated, quoted strings preserved)
     */
    function _parseArguments(expression) {
        const args = {};
        const parts = expression.trim().match(/^([^ ]+)(?: *"?([^"]*)"?(?:" (.*))?)?$/);
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
     */
    function _handleBlockEach(params, blockContent, currentContext) {
        const items = getNestedProperty(currentContext, params.trim());

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
            // Use _resolveHandlebars with local context for efficiency (no re-annotation)
            let processedContent = _resolveHandlebars(blockContent, iterationContext);

            result += processedContent;
        }

        return result;
    }

    /**
     * Handle file.include helper with optional context variables
     */
    function _handleFileInclude(parsedArgs, currentContext) {
        // Check include depth to prevent infinite recursion
        const maxDepth = global.appConfig?.controller?.view?.maxIncludeDepth || 16;
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

        // W-079: Get template content using FileCache synchronously
        const hasContextVars = Object.keys(parsedArgs).some(key => key !== '_helper' && key !== '_target');
        const content = includeCache.getFileSync(fullPath);

        if (content === null) {
            throw new Error(`Include file not found or deleted: ${includePath}`);
        }

        // Remove header comments from included content
        const cleanContent = content.replace(/(<!--|\/\*\*)\s+\* +\@name .*?(\*\/|-->)\r?\n?/gs, '');

        LogController.logInfo(req, 'view.load', `Include processed: ${includePath}${hasContextVars ? ' (with context vars)' : ''}`);

        // Process handlebars with the include context
        return processHandlebars(cleanContent, includeContext, req, depth + 1);
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
            const content = includeCache.getFileSync(resolvedPath);
            if (content !== null) {
                // File exists - get timestamp from cache
                const fileEntry = includeCache.fileCache.get(resolvedPath);
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

                    const content = includeCache.getFileSync(resolvedPath);
                    if (content !== null) {
                        const fileEntry = includeCache.fileCache.get(resolvedPath);
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
            const content = includeCache.getFileSync(resolvedPath);
            return content !== null ? 'true' : 'false';
        } catch (error) {
            // Try .tmpl fallback for CSS and JS files
            const fileExtension = path.extname(includePath).toLowerCase();
            if (fileExtension === '.css' || fileExtension === '.js') {
                try {
                    const templatePath = `view/${includePath}.tmpl`;
                    const resolvedPath = PathResolver.resolveModule(templatePath);

                    const content = includeCache.getFileSync(resolvedPath);
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
    function _resolveHandlebars(text, localContext = null, blockType, blockLevel, blockParams, blockContent, regularHandlebar) {
        const currentContext = localContext || context;

        if (blockType) {
            // Block handlebars: {{#type:~level~ params}}content{{/type:~level~}}
            try {
                const evaluatedContent = _evaluateBlockHandlebar(blockType, blockParams.trim(), blockContent, currentContext);
                // Recursively process the evaluated content (without re-annotating)
                return _resolveHandlebars(evaluatedContent, localContext);
            } catch (error) {
                LogController.logError(req, 'view.load', `error: Handlebar "#${blockType} ${blockParams}": ${error.message}`);
                return `<!-- Error: Handlebar "#${blockType} ${blockParams}": ${error.message} -->`;
            }
        } else if (regularHandlebar) {
            // Regular handlebars: {{name params}}
            try {
                return _evaluateHandlebar(regularHandlebar, currentContext);
            } catch (error) {
                LogController.logError(req, 'view.load', `error: Handlebar "${regularHandlebar}": ${error.message}`);
                return `<!-- Error: Handlebar "${regularHandlebar}": ${error.message} -->`;
            }
        } else {
            // Recursive text processing - this is the entry point
            const regex = /\{\{#([a-z]+):~(\d+)~ ?(.*?)\}\}(.*?)\{\{\/\1:~\2~\}\}|\{\{(\@?[a-z][a-z0-9.]*.*?)\}\}/gs;
            let result = text;

            // Find all matches first
            const matches = [...text.matchAll(regex)];

            // Process matches sequentially
            for (const match of matches) {
                const [fullMatch, bType, bLevel, bParams, bContent, rHandlebar] = match;
                const replacement = _resolveHandlebars(fullMatch, localContext, bType, bLevel, bParams, bContent, rHandlebar);
                result = result.replace(fullMatch, replacement);
            }

            return result;
        }
    }

    let result = _resolveHandlebars(annotated, context);

    // Phase 3: Clean up any remaining unbalanced annotations
    result = result.replace(/\{\{([#\/][a-z]+):~\d+~(.*?)\}\}/g, '<!-- Error: Unbalanced handlebar "$1$2" removed -->');

    return result;
}

/**
 * W-079: Get cache statistics
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
    const stats = {
        template: templateCache ? templateCache.getStats() : { name: 'TemplateCache', fileCount: 0, directoryCount: 0, config: { enabled: false } },
        include: includeCache ? includeCache.getStats() : { name: 'IncludeCache', fileCount: 0, directoryCount: 0, config: { enabled: false } }
    };
    return stats;
}

export default {
    initialize,
    load,
    refreshGlobalConfig,        // W-076: For broadcast system
    processHandlebars,          // Export for unit testing
    getCacheStats               // W-079: Cache statistics API
};

// EOF webapp/controller/view.js
