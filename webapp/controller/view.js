/**
 * @name            jPulse Framework / WebApp / View Controller
 * @tagline         Server-side template rendering controller
 * @description     Handles .shtml files with handlebars template expansion
 * @file            webapp/controller/view.js
 * @version         0.2.1
 * @release         2025-08-25
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
        const defaultTemplate = appConfig?.view?.defaultTemplate || 'index.shtml';
        if (filePath === '/') {
            filePath = `/home/${defaultTemplate}`;
        } else if (!filePath.endsWith('.shtml')) {
            filePath += `/${defaultTemplate}`;
        }

        const fullPath = path.join(process.cwd(), 'webapp', 'view', filePath.substring(1));

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            logController.error(req, `File not found: ${fullPath}`);
            return res.status(404).send('Page not found');
        }

        // Read the file
        let content = fs.readFileSync(fullPath, 'utf8');

        // Get global config for handlebars context
        const globalConfig = await configModel.findById('global');

        // Create handlebars context
        const context = {
            app: {
                version: appConfig.app.version,
                release: appConfig.app.release
            },
            user: {
                id: req.session?.user?.id || '',
                firstName: req.session?.user?.firstName || '',
                nickName: req.session?.user?.nickName || '',
                lastName: req.session?.user?.lastName || '',
                email: req.session?.user?.email || '',
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
            i18n: i18n.langs[i18n.default] || {},
            req: req
        };

        // Process handlebars
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
    // Regular expression to match handlebars: {{helper args}}
    const handlebarsRegex = /\{\{([^}]+)\}\}/g;
    let result = content;
    let match;
    while ((match = handlebarsRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const expression = match[1].trim();
        try {
            const replacement = await evaluateHandlebar(expression, context, baseDir, depth);
            result = result.replace(fullMatch, replacement);
        } catch (error) {
            logController.error(req, `view.load: Handlebars error in "${expression}": ${error.message}`);
            result = result.replace(fullMatch, `<!-- Error: ${error.message} -->`);
        }
    }
    return result;
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
        case 'if':
            return handleIf(args, context);
        case 'i18n':
            return handleI18n(args[0], context);
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
    const maxDepth = appConfig?.view?.maxIncludeDepth || 10;
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
 * Handle if conditional helper
 * @param {Array} args - [condition, trueValue, falseValue?]
 * @param {Object} context - Context for evaluation
 * @returns {string} Result based on condition
 */
function handleIf(args, context) {
    if (args.length < 2) {
        throw new Error('if helper requires at least 2 arguments: condition, trueValue, [falseValue]');
    }
    const condition = args[0];
    const trueValue = args[1].replace(/^["']|["']$/g, '');
    const falseValue = args[2] ? args[2].replace(/^["']|["']$/g, '') : '';
    const conditionValue = getNestedProperty(context, condition);
    return conditionValue ? trueValue : falseValue;
}

/**
 * Handle i18n translation helper
 * @param {string} key - Translation key (with quotes)
 * @param {Object} context - Context (for future user language preference)
 * @returns {string} Translated text
 */
function handleI18n(key, context) {
    const cleanKey = key.replace(/^["']|["']$/g, '');
    // FIXME: For now, use default language - later can use user preference
    return i18n.t(cleanKey) || cleanKey;
}

export default {
    load
};

// EOF webapp/controller/view.js
