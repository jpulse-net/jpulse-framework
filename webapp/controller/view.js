/**
 * @name            jPulse Framework / WebApp / View Controller
 * @tagline         Server-side template rendering controller
 * @description     Handles .shtml files with handlebars template expansion
 * @file            webapp/controller/view.js
 * @version         0.3.3
 * @release         2025-08-31
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import url from 'url';
import logController from './log.js';
import configModel from '../model/config.js';
import i18n from '../translations/i18n.js';
import CommonUtils from '../utils/common.js';
import AuthController from './auth.js';
import fsPromises from 'fs/promises'; // New import

// Module-level cache
// FIXME: cache invalidation on demand
// FIXME: cache based on appConfig.controller.view.cacheTemplateFiles and appConfig.controller.view.cacheIncludeFiles flags
const cache = {
    templateFiles: {},
    includeFiles: {},
    fileTimestamp: {},
    knownFiles: [
        'jpulse-header.tmpl',
        'jpulse-footer.tmpl'
    ]
};

// Asynchronously pre-load known includes once when the module loads
(async () => {
    const viewDir = path.join(global.appConfig.app.dirName, 'view');
    for (const includePath of cache.knownFiles) {
        const fullPath = path.join(viewDir, includePath);
        try {
            // Pre-load only if include file caching is enabled
            if (global.appConfig.controller.view.cacheIncludeFiles) {
                const content = await fsPromises.readFile(fullPath, 'utf8');
                cache.includeFiles[includePath] = content;

                const stats = await fsPromises.stat(fullPath);
                const timestamp = stats.mtime.valueOf();
                cache.fileTimestamp[includePath] = timestamp;

                logController.console(null, `view: Pre-loaded ${includePath} and its timestamp ${timestamp}`);
            } else {
                logController.console(null, `view: Include file caching disabled, skipped pre-loading ${includePath}`);
            }
        } catch (err) {
            logController.error(null, `view: Failed to pre-load ${includePath}: ${err.message}`);
        }
    }
})();

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
        logController.consoleApi(req, `view.load( ${req.path} )`);

        // Determine the file path
        let filePath = req.path;
        const defaultTemplate = global.appConfig?.controller?.view?.defaultTemplate || 'index.shtml';
        if (filePath === '/') {
            filePath = `/home/${defaultTemplate}`;
        } else if (!filePath.endsWith('.shtml')) {
            filePath = filePath.replace(/\/$/, '') + `/${defaultTemplate}`;
        }

        const viewDir = path.join(global.appConfig.app.dirName, 'view');
        const fullPath = path.join(viewDir, filePath.substring(1));

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            logController.error(req, `File not found: ${fullPath}`);
            return CommonUtils.sendError(req, res, 404, `Page not found: ${req.path}`, 'NOT_FOUND');
        }

        // Read the file asynchronously, utilizing cache.templateFiles
        let content;
        if (global.appConfig.controller.view.cacheTemplateFiles && cache.templateFiles[filePath]) {
            content = cache.templateFiles[filePath];
            logController.console(req, `view.load: Template cache hit for ${filePath}`);
        } else {
            content = await fsPromises.readFile(fullPath, 'utf8');
            if (global.appConfig.controller.view.cacheTemplateFiles) {
                cache.templateFiles[filePath] = content;
                logController.console(req, `view.load: Loaded template ${filePath} and added to cache`);
            } else {
                logController.console(req, `view.load: Loaded template ${filePath} (caching disabled)`);
            }
        }

        // Get global config for handlebars context
        const globalConfig = await configModel.findById('global');

        // Create handlebars context
        const context = {
            app: appConfig.app,
            user: {
                id: req.session?.user?.id || '',
                firstName: req.session?.user?.firstName || '',
                nickName: req.session?.user?.nickName || '',
                lastName: req.session?.user?.lastName || '',
                email: req.session?.user?.email || '',
                initials: req.session?.user?.initials || '?',
                authenticated: !!req.session?.user
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
            i18n: i18n.getLang(AuthController.getUserLanguage(req)),
            req: req
        };

        // Process handlebars
        content = processHandlebars(content, context, viewDir, req, 0);

        // Second pass: Process any handlebars expressions that were returned from i18n translations
        content = processHandlebars(content, context, viewDir, req, 0);

        // Log completion time
        const duration = Date.now() - startTime;
        logController.console(req, `view.load: Completed in ${duration}ms`);

        // Send response
        res.set('Content-Type', 'text/html');
        res.send(content);

    } catch (error) {
        logController.error(req, `view.load error: ${error.message}`);
        res.status(500).send('Internal server error');
    }
}

/**
 * Process handlebars in content
 * @param {string} content - Template content
 * @param {Object} context - Handlebars context data
 * @param {string} viewDir - View base directory for file includes
 * @param {Object} req - Express request object for logging
 * @param {number} depth - Current include depth for recursion protection
 * @returns {string} Processed content
 */
function processHandlebars(content, context, viewDir, req, depth = 0) {
    // Combined regex to match both block handlebars ({{#if}}...{{/if}}) and regular handlebars ({{expression}})
    const handlebarsRegex = /\{\{#(\w+)\s+([^}]+)\}\}(.*?)\{\{\/\1\}\}|\{\{([^#][^}]*|)\}\}/gs;
    let result = content;
    let match;
    while ((match = handlebarsRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        try {
            let replacement;

            // Check if this is a block handlebar ({{#expression}}...{{/expression}})
            if (match[1] && match[2] && match[3] !== undefined) {
                // Block handlebars: group 1=blockType, group 2=params, group 3=content
                const blockType = match[1];
                const params = match[2].trim();
                const blockContent = match[3];
                replacement = evaluateBlockHandlebar(blockType, params, blockContent, context, viewDir, req, depth);
            } else if (match[4]) {
                // Regular handlebars: group 4=full expression
                const expression = match[4].trim();
                replacement = evaluateHandlebar(expression, context, viewDir, req, depth);
            } else {
                replacement = '';
            }

            result = result.replace(fullMatch, replacement);
        } catch (error) {
            const errorExpression = match[1] ? `#${match[1]} ${match[2]}` : match[4] || 'unknown';
            logController.error(req, `view.load: Handlebars error in "${errorExpression}": ${error.message}`);
            result = result.replace(fullMatch, `<!-- Error: ${error.message} -->`);
        }
    }
    return result;
}

/**
 * Evaluate a block handlebars expression ({{#type}}...{{/type}})
 * @param {string} blockType - The block type (e.g., 'if', 'each')
 * @param {string} params - The parameters for the block
 * @param {string} blockContent - The content within the block
 * @param {Object} context - Context data
 * @param {string} viewDir - View base directory for file operations
 * @param {Object} req - Express request object for logging
 * @param {number} depth - Current include depth
 * @returns {string} Evaluated result
 */
function evaluateBlockHandlebar(blockType, params, blockContent, context, viewDir, req, depth = 0) {
    switch (blockType) {
        case 'if':
            return handleBlockIf(params, blockContent, context, viewDir, req, depth);
        default:
            throw new Error(`Unknown block type: ${blockType}`);
    }
}

/**
 * Evaluate a single handlebars expression
 * @param {string} expression - The handlebars expression (without {{}})
 * @param {Object} context - Context data
 * @param {string} viewDir - View base directory for file operations
 * @param {number} depth - Current include depth
 * @returns {string} Evaluated result
 */
function evaluateHandlebar(expression, context, viewDir, req, depth = 0) {
    const parts = parseArguments(expression);
    const helper = parts[0];
    const args = parts.slice(1);

    // Handle helper functions first (before property access)
    switch (helper) {
        case 'file.include':
            // server side include, handle recursively
            return handleFileInclude(args[0], context, viewDir, req, depth);
        case 'file.timestamp':
            // server side timestamp, use to avoid browser caching
            return handleFileTimestamp(args[0], viewDir, req);
        default:
            // Handle property access (no spaces, contains dots)
            if (!helper.includes(' ') && helper.includes('.')) {
                return getNestedProperty(context, helper) || '';
            }
            // Unknown helper, return empty
            return '';
    }
}

/**
 * Parse handlebars arguments (space-separated, quoted strings preserved)
 * @param {string} expression - The full expression
 * @returns {Array} Array of arguments
 */
function parseArguments(expression) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        if (!inQuotes && (char === '"' || char === "'")) {
            inQuotes = true;
            quoteChar = char;
        } else if (inQuotes && char === quoteChar) {
            inQuotes = false;
            quoteChar = '';
        } else if (!inQuotes && char === ' ') {
            if (current.trim()) {
                args.push(current.trim());
                current = '';
            }
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        args.push(current.trim());
    }
    return args;
}

/**
 * Get nested property from object using dot notation
 * @param {Object} obj - Object to search in
 * @param {string} path - Dot-separated path
 * @returns {*} Property value or undefined
 */
function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
}

/**
 * Handle file.include helper - SECURE VERSION
 * Always resolves relative to view root, prohibits path traversal
 * @param {string} filePath - Path to include (with quotes)
 * @param {Object} context - Context for nested processing
 * @param {string} viewDir - View base directory
 * @param {number} depth - Current include depth
 * @returns {string} Included content
 */
function handleFileInclude(filePath, context, viewDir, req, depth = 0) {
    // Check include depth to prevent infinite recursion
    const maxDepth = global.appConfig?.controller?.view?.maxIncludeDepth || 10;
    if (depth >= maxDepth) {
        throw new Error(`Maximum include depth (${maxDepth}) exceeded`);
    }

    // Remove quotes
    const includePath = filePath.replace(/^["']|["']$/g, '');

    // Security: Prohibit path traversal and absolute paths
    if (includePath.includes('../') || includePath.includes('..\\') || path.isAbsolute(includePath)) {
        throw new Error(`Prohibited path in include: ${includePath}. Use relative paths from view root only.`);
    }

    // Always resolve relative to view root for security and consistency
    const fullPath = path.join(viewDir, includePath);

    // Double-check that resolved path is still within view root
    if (!fullPath.startsWith(viewDir)) {
        throw new Error(`Path traversal attempt blocked: ${includePath}`);
    }

    // Check cache first
    if (global.appConfig.controller.view.cacheIncludeFiles && cache.includeFiles[includePath]) {
        logController.console(req, `view.load: Include cache hit for ${includePath}`);
        return processHandlebars(cache.includeFiles[includePath], context, viewDir, null, depth + 1);
    }

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Include file not found: ${includePath} (resolved to: ${fullPath})`);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    logController.console(req, `view.load: Loaded ${includePath}`);
    // Add to cache before returning, if caching is enabled
    if (global.appConfig.controller.view.cacheIncludeFiles) {
        cache.includeFiles[includePath] = content;
        logController.console(req, `view.load: Added ${includePath} to include cache`);
    } else {
        logController.console(req, `view.load: Loaded ${includePath} (include caching disabled)`);
    }
    // Recursively process handlebars in included content (now synchronous)
    return processHandlebars(content, context, viewDir, null, depth + 1);
}

/**
 * Handle file.timestamp helper
 * @param {string} filePath - Path to file (with quotes)
 * @param {string} viewDir - View base directory for file operations
 * @param {Object} req - Express request object for logging
 * @returns {string} File modification timestamp
 */
function handleFileTimestamp(filePath, viewDir, req) {
    const includePath = filePath.replace(/^["']|["']$/g, '');
    const fullPath = path.resolve(viewDir, includePath);

    // Check cache first for file timestamp
    if (global.appConfig.controller.view.cacheIncludeFiles && cache.fileTimestamp[includePath]) {
        logController.console(req, `view.load: Timestamp cache hit for ${includePath}`);
        return cache.fileTimestamp[includePath];
    }

    if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${includePath} (resolved to: ${fullPath})`);
    }
    const stats = fs.statSync(fullPath);
    const timestamp = stats.mtime.valueOf();
    // Cache the timestamp, if caching is enabled
    if (global.appConfig.controller.view.cacheIncludeFiles) {
        logController.console(req, `view.load: Loaded timestamp ${timestamp} of ${includePath} and added to cache`);
        cache.fileTimestamp[includePath] = timestamp;
    } else {
        logController.console(req, `view.load: Loaded timestamp ${timestamp} of ${includePath} (include caching disabled)`);
    }
    return timestamp;
}

/**
 * Handle block if conditional helper ({{#if}}...{{/if}})
 * @param {string} params - The condition parameter
 * @param {string} blockContent - Content within the if block
 * @param {Object} context - Context for evaluation
 * @param {string} viewDir - View base directory for file operations
 * @param {Object} req - Express request object for logging
 * @param {number} depth - Current include depth
 * @returns {string} Result based on condition
 */
function handleBlockIf(params, blockContent, context, viewDir, req, depth = 0) {
    const condition = params.trim();
    const conditionValue = getNestedProperty(context, condition);

    // Check if there's an {{else}} block
    const elseMatch = blockContent.match(/^(.*?)\{\{else\}\}(.*?)$/s);

    let contentToProcess;
    if (elseMatch) {
        // Has {{else}} - choose content based on condition
        contentToProcess = conditionValue ? elseMatch[1] : elseMatch[2];
    } else {
        // No {{else}} - only show content if condition is true
        contentToProcess = conditionValue ? blockContent : '';
    }

    // Recursively process any handlebars within the selected content (now synchronous)
    if (contentToProcess) {
        return processHandlebars(contentToProcess, context, viewDir, req, depth + 1);
    }

    return '';
}

export default {
    load
};

// EOF webapp/controller/view.js
