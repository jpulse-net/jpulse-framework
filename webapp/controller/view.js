/**
 * @name            jPulse Framework / WebApp / View Controller
 * @tagline         Server-side template rendering controller
 * @description     Handles .shtml files with handlebars template expansion
 * @file            webapp/controller/view.js
 * @version         0.3.2
 * @release         2025-08-30
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
        const defaultTemplate = appConfig?.controller?.view?.defaultTemplate || 'index.shtml';
        if (filePath === '/') {
            filePath = `/home/${defaultTemplate}`;
        } else if (!filePath.endsWith('.shtml')) {
            filePath += `/${defaultTemplate}`;
        }

        const fullPath = path.join(process.cwd(), 'webapp', 'view', filePath.substring(1));

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            logController.error(req, `File not found: ${fullPath}`);
            return CommonUtils.sendError(req, res, 404, `Page not found: ${req.path}`, 'NOT_FOUND');
        }

        // Read the file
        let content = fs.readFileSync(fullPath, 'utf8');

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
        content = await processHandlebars(content, context, path.dirname(fullPath), req, 0);

        // Second pass: Process any handlebars expressions that were returned from i18n translations
        content = await processHandlebars(content, context, path.dirname(fullPath), req, 0);

        // Log completion time
        const duration = Date.now() - startTime;
        logController.console(req, `view.load completed in ${duration}ms`);

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
 * @param {string} baseDir - Base directory for file includes
 * @param {Object} req - Express request object for logging
 * @param {number} depth - Current include depth for recursion protection
 * @returns {string} Processed content
 */
async function processHandlebars(content, context, baseDir, req, depth = 0) {
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
                replacement = await evaluateBlockHandlebar(blockType, params, blockContent, context, baseDir, req, depth);
            } else if (match[4]) {
                // Regular handlebars: group 4=full expression
                const expression = match[4].trim();
                replacement = await evaluateHandlebar(expression, context, baseDir, depth);
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
 * @param {string} baseDir - Base directory for file operations
 * @param {Object} req - Express request object for logging
 * @param {number} depth - Current include depth
 * @returns {string} Evaluated result
 */
async function evaluateBlockHandlebar(blockType, params, blockContent, context, baseDir, req, depth = 0) {
    switch (blockType) {
        case 'if':
            return await handleBlockIf(params, blockContent, context, baseDir, req, depth);
        default:
            throw new Error(`Unknown block type: ${blockType}`);
    }
}

/**
 * Evaluate a single handlebars expression
 * @param {string} expression - The handlebars expression (without {{}})
 * @param {Object} context - Context data
 * @param {string} baseDir - Base directory for file operations
 * @param {number} depth - Current include depth
 * @returns {string} Evaluated result
 */
async function evaluateHandlebar(expression, context, baseDir, depth = 0) {
    const parts = parseArguments(expression);
    const helper = parts[0];
    const args = parts.slice(1);

    // Handle helper functions first (before property access)
    switch (helper) {
        case 'file.include':
            return await handleFileInclude(args[0], context, baseDir, depth);
        case 'file.timestamp':
            return await handleFileTimestamp(args[0]);
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
 * @param {string} baseDir - Base directory (ignored for security)
 * @param {number} depth - Current include depth
 * @returns {string} Included content
 */
async function handleFileInclude(filePath, context, baseDir, depth = 0) {
    // Check include depth to prevent infinite recursion
    const maxDepth = appConfig?.controller?.view?.maxIncludeDepth || 10;
    if (depth >= maxDepth) {
        throw new Error(`Maximum include depth (${maxDepth}) exceeded`);
    }

    // Remove quotes
    const cleanPath = filePath.replace(/^["']|["']$/g, '');

    // Security: Prohibit path traversal and absolute paths
    if (cleanPath.includes('../') || cleanPath.includes('..\\') || path.isAbsolute(cleanPath)) {
        throw new Error(`Prohibited path in include: ${cleanPath}. Use relative paths from view root only.`);
    }

    // Always resolve relative to view root for security and consistency
    const viewRoot = path.join(process.cwd(), 'webapp', 'view');
    const fullPath = path.join(viewRoot, cleanPath);

    // Double-check that resolved path is still within view root
    if (!fullPath.startsWith(viewRoot)) {
        throw new Error(`Path traversal attempt blocked: ${cleanPath}`);
    }

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Include file not found: ${cleanPath} (resolved to: ${fullPath})`);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    // Recursively process handlebars in included content
    return await processHandlebars(content, context, viewRoot, null, depth + 1);
}

/**
 * Handle file.timestamp helper
 * @param {string} filePath - Path to file (with quotes)
 * @returns {string} File modification timestamp
 */
async function handleFileTimestamp(filePath) {
    const cleanPath = filePath.replace(/^["']|["']$/g, '');
    const fullPath = path.resolve(process.cwd(), 'webapp', 'view', cleanPath);
    if (!fs.existsSync(fullPath)) {
        return '';
    }
    const stats = fs.statSync(fullPath);
    return stats.mtime.toISOString();
}

/**
 * Handle block if conditional helper ({{#if}}...{{/if}})
 * @param {string} params - The condition parameter
 * @param {string} blockContent - Content within the if block
 * @param {Object} context - Context for evaluation
 * @param {string} baseDir - Base directory for file operations
 * @param {Object} req - Express request object for logging
 * @param {number} depth - Current include depth
 * @returns {string} Result based on condition
 */
async function handleBlockIf(params, blockContent, context, baseDir, req, depth = 0) {
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

    // Recursively process any handlebars within the selected content
    if (contentToProcess) {
        return await processHandlebars(contentToProcess, context, baseDir, req, depth + 1);
    }

    return '';
}

export default {
    load
};

// EOF webapp/controller/view.js
