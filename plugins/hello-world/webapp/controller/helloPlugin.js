/**
 * @name            jPulse Framework / Plugins / Hello World / WebApp / Controller / Hello Plugin
 * @tagline         Hello Plugin Controller
 * @description     Simple API controller demonstrating plugin structure
 * @file            plugins/hello-world/webapp/controller/helloPlugin.js
 * @version         1.7.14
 * @author          jPulse Team, https://jpulse.net
 * @license         BSL 1.1
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import HelloPluginModel from '../model/helloPlugin.js';
import PluginModel from '../../../../webapp/model/plugin.js';
import LogController from '../../../../webapp/controller/log.js';
import AuthController from '../../../../webapp/controller/auth.js';

/**
 * Hello Plugin Controller - demonstrates plugin API endpoints
 * Auto-discovered by jPulse Framework
 */
class HelloPluginController {

    // ========================================================================
    // Plugin Hooks - this plugin DEFINES onHelloWorldGreet and HANDLES two auth hooks
    // ========================================================================
    static hookDefinitions = {
        onHelloWorldGreet: {
            description: 'Fired when hello-world serves its API; handlers may append a greeting',
            contextKeys: ['req', 'messages'],
            canModify: true
        }
    };

    static hooks = {
        // Example: Log after successful login (priority 100 = default)
        onAuthAfterLogin: {},
        // Example: Add custom data to session (priority 50 = runs earlier)
        onAuthBeforeSession: { priority: 50 }
    };

    /**
     * Hook handler - called after successful login
     * Demonstrates how plugins can react to framework events
     */
    static async onAuthAfterLogin(context) {
        LogController.logInfo(context.req, 'helloPlugin.hook',
            `User ${context.user.username} logged in via ${context.authMethod}`);
        return context;
    }

    /**
     * Hook handler - add plugin data to session
     * Demonstrates how plugins can modify context data
     */
    static async onAuthBeforeSession(context) {
        // Add hello-world plugin marker to session data
        context.sessionData.helloPlugin = {
            welcomed: true,
            timestamp: new Date().toISOString()
        };
        return context;
    }

    // ========================================================================
    // W-147: Config schema extension (Site Configuration → Hello tab)
    // Called by SiteControllerRegistry during bootstrap (before ConfigModel.initializeSchema)
    // ========================================================================
    static async initialize() {
        if (global.ConfigModel && typeof global.ConfigModel.extendSchema === 'function') {
            global.ConfigModel.extendSchema({
                helloWorldConfig: {
                    _meta: {
                        tabLabel: 'Hello',
                        order: 50,
                        description: 'Site-wide Hello settings. For plugin-only settings (Welcome Message, Show Statistics) see <a href="/admin/plugin-config.shtml?plugin=hello-world" target="_blank">Configure hello-world</a>.'
                    },
                    message: { type: 'string', default: 'Hello from the hello-world plugin!', label: 'Site Hello Message' },
                    showBadge: { type: 'boolean', default: true, label: 'Show badge' }
                }
            });
        }
    }

    // ========================================================================
    // API endpoints (W-014)
    // Auto-discovered by SiteControllerRegistry during bootstrap
    // Method names starting with "api" are automatically registered
    // ========================================================================

    /**
     * Get plugin data
     * GET /api/1/helloPlugin
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async api(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'helloPlugin.api', '');

            // Get plugin configuration. Never send a raw secret to the client —
            // maskSensitive() is the same contract as GET /api/1/plugin/:name/config.
            const pluginConfig = await PluginModel.getByName('hello-world');
            const rawConfig = pluginConfig?.config || {
                message: 'Hello from the plugin system!',
                enabled: true
            };
            const schema = global.PluginManager?.getPlugin?.('hello-world')?.metadata?.config?.schema || [];
            const config = PluginModel.maskSensitive({ ...rawConfig }, schema);
            if (typeof config.demoApiKey === 'string' && config.demoApiKey !== ''
                && !PluginModel.isSensitiveMask(config.demoApiKey)) {
                config.demoApiKey = PluginModel.SENSITIVE_MASK;
            }

            // W-147: Get site config (Hello tab) for demo – use isAdmin so non-admins get sanitized config (educational pattern)
            let helloWorldConfig = { message: 'Hello from the plugin!', showBadge: true };
            if (global.ConfigModel && typeof global.ConfigModel.findById === 'function') {
                const defaultDocName = global.appConfig?.controller?.config?.defaultDocName || 'global';
                const isAdmin = AuthController.isAdmin(req);
                const siteConfig = await global.ConfigModel.findById(defaultDocName, isAdmin);
                if (siteConfig?.data?.helloWorldConfig) {
                    helloWorldConfig = { ...helloWorldConfig, ...siteConfig.data.helloWorldConfig };
                }
            }

            // Get sample data from model
            const data = await HelloPluginModel.getData();

            const greetContext = { req, messages: [] };
            if (global.HookManager) {
                await global.HookManager.execute('onHelloWorldGreet', greetContext);
            }

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'helloPlugin.api', `success: completed in ${elapsed}ms`);

            res.json({
                success: true,
                data: {
                    plugin: 'hello-world',
                    version: '1.0.0',
                    config: config,
                    helloWorldConfig: helloWorldConfig,
                    sampleData: data,
                    greetings: greetContext.messages
                },
                message: 'Hello plugin data retrieved successfully',
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'helloPlugin.api', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'Failed to retrieve hello plugin data', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get plugin statistics
     * GET /api/1/helloPlugin/stats
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async apiStats(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'helloPlugin.stats', '');

            const stats = await HelloPluginModel.getStats();

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'helloPlugin.stats', `success: completed in ${elapsed}ms`);

            res.json({
                success: true,
                data: stats,
                message: 'Hello plugin statistics retrieved successfully',
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'helloPlugin.stats', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'Failed to retrieve hello plugin statistics', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Verify the demo API key without returning it.
     * GET /api/1/helloPlugin/verify-demo-api-key
     * Companion to the plugin.json password field: the browser never holds the secret.
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async apiVerifyDemoApiKey(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'helloPlugin.verifyDemoApiKey', '');
            if (!AuthController.isAdmin(req)) {
                LogController.logError(req, 'helloPlugin.verifyDemoApiKey', 'error: admin role required');
                return global.CommonUtils.sendError(req, res, 403, 'Administrator access required', 'FORBIDDEN');
            }
            const value = await PluginModel.getSecret('hello-world', 'demoApiKey');
            const configured = typeof value === 'string' && value !== '';
            const valid = configured && value.length >= 8 && !PluginModel.isSensitiveMask(value);
            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'helloPlugin.verifyDemoApiKey',
                `success: configured=${configured} valid=${valid} completed in ${elapsed}ms`);
            let message = 'Demo API key is not configured.';
            if (configured && valid) {
                message = 'Demo API key is configured and meets the demo check (8+ characters).';
            } else if (configured) {
                message = 'Demo API key is set but shorter than 8 characters.';
            }
            res.json({
                success: true,
                data: { configured, valid },
                message,
                elapsed
            });
        } catch (error) {
            LogController.logError(req, 'helloPlugin.verifyDemoApiKey', `error: ${error.message}`);
            return global.CommonUtils.sendError(req, res, 500, 'Failed to verify demo API key', 'INTERNAL_ERROR', error.message);
        }
    }

    // ========================================================================
    // Handlebars Helpers (W-116)
    // Auto-discovered by HandlebarController during bootstrap
    // Method names starting with "handlebar" are automatically registered
    // ========================================================================

    /**
     * W-116: Example regular handlebar helper - converts text to uppercase
     * Usage in templates: {{uppercase "hello world"}} → "HELLO WORLD".
     * Note: The description and example below are extracted by the handlebars doc system.
     * @description Convert text to UPPERCASE (hello-world plugin example)
     * @example {{uppercase "hello world"}}
     * @param {object} args - Parsed arguments (already evaluated)
     * @param {object} context - Template context
     * @returns {string} Uppercased text
     */
    static handlebarUppercase(args, context) {
        // Support multiple argument formats:
        // {{uppercase "text"}} -> args._target = "text"
        // {{uppercase text="text"}} -> args.text = "text"
        // {{uppercase user.username}} -> args._target = user.username value
        const text = args._target || args.text || '';
        return String(text).toUpperCase();
    }

    /**
     * W-116: Example block handlebar helper - repeats content N times
     * Usage in templates: {{#repeat count=3}}Hello{{/repeat}} → "HelloHelloHello".
     * Supports {{@index}} and {{@first}} / {{@last}} iteration variables.
     * Note: The description and example below are extracted by the handlebars doc system.
     * @description Repeat text N times (hello-world plugin example)
     * @example {{#repeat count=3}} Hello {{@index}} {{/repeat}}
     * @param {object} args - Parsed arguments (already evaluated)
     * @param {string} blockContent - Content between opening and closing tags
     * @param {object} context - Template context
     * @returns {string} Repeated content
     */
    static async handlebarRepeat(args, blockContent, context) {
        const count = parseInt(args.count || args._target || 1, 10);
        if (count <= 0 || count > 100) {
            return ''; // Safety limit
        }

        // Build result by iterating and expanding with iteration context
        let result = '';
        for (let i = 0; i < count; i++) {
            // Create iteration context with special variables (like {{#each}})
            const iterationContext = {
                ...context,
                '@index': i,
                '@first': i === 0,
                '@last': i === count - 1,
                '@count': count
            };

            // Expand block content with iteration context
            const expanded = await context._handlebar.expandHandlebars(blockContent, iterationContext);
            result += expanded;
        }

        return result;
    }
}

export default HelloPluginController;

// EOF plugins/hello-world/webapp/controller/helloPlugin.js
