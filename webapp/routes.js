/**
 * @name            jPulse Framework / WebApp / Routes
 * @tagline         Routes of the jPulse Framework
 * @description     This is the routing file for the jPulse Framework
 * @file            webapp/route.js
 * @version         1.6.7
 * @release         2026-02-04
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.4, Claude Sonnet 4.5
 */

import path from 'path';
import fs from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
const router = express.Router();

// Load controllers
import AuthController from './controller/auth.js';
import CacheController from './controller/cache.js';
import AppClusterController from './controller/appCluster.js';
import HealthController from './controller/health.js';
import MarkdownController from './controller/markdown.js';
import UserController from './controller/user.js';
import ConfigController from './controller/config.js';
import PluginController from './controller/plugin.js';  // W-045
import WebSocketController from './controller/websocket.js';
import logController from './controller/log.js';
import ViewController from './controller/view.js';
import HandlebarController from './controller/handlebar.js';
import EmailController from './controller/email.js';
import CommonUtils from './utils/common.js';
import PathResolver from './utils/path-resolver.js';

// W-147: Admin routes use AuthController.requireAdminRole() (reads from ConfigModel cache per request)

// API routes (must come before catch-all route)

// Health and metrics endpoints
router.get('/api/1/health/status', HealthController.status);
router.get('/api/1/health/metrics', HealthController.metrics);
router.post('/api/1/health/compliance/send-report', HealthController.sendComplianceReport); // W-137

// W-143: App Cluster endpoints (broadcast + cache)
router.post('/api/1/app-cluster/broadcast/:channel', AppClusterController.broadcastPublish);
router.get('/api/1/app-cluster/broadcast/status', AppClusterController.broadcastStatus);
router.post('/api/1/app-cluster/cache/:category/:key', AppClusterController.cacheSet);
router.get('/api/1/app-cluster/cache/:category/:key', AppClusterController.cacheGet);
router.delete('/api/1/app-cluster/cache/:category/:key', AppClusterController.cacheDelete);

// Config API routes
router.get('/api/1/config', ConfigController.list);
router.get('/api/1/config/_default', ConfigController.get);  // Default config (reserved ID)
router.get('/api/1/config/:id', ConfigController.get);
router.get('/api/1/config/:id/effective', ConfigController.getEffective);
router.post('/api/1/config', ConfigController.create);
router.put('/api/1/config/_default', ConfigController.upsert);  // Default config upsert (reserved ID)
router.put('/api/1/config/:id', ConfigController.update);
router.put('/api/1/config/:id/upsert', ConfigController.upsert);
router.delete('/api/1/config/:id', ConfigController.delete);

// Plugin API routes (W-045)
// Public endpoint (no auth required) - must come before authenticated :name route
router.get('/api/1/plugin/:name/info', PluginController.getInfo);
// All other plugin routes require admin role
router.get('/api/1/plugin', AuthController.requireAdminRole(), PluginController.list);
router.get('/api/1/plugin/:name', AuthController.requireAdminRole(), PluginController.get);
router.get('/api/1/plugin/:name/status', AuthController.requireAdminRole(), PluginController.getStatus);
router.post('/api/1/plugin/:name/enable', AuthController.requireAdminRole(), PluginController.enable);
router.post('/api/1/plugin/:name/disable', AuthController.requireAdminRole(), PluginController.disable);
router.get('/api/1/plugin/:name/config', AuthController.requireAdminRole(), PluginController.getConfig);
router.put('/api/1/plugin/:name/config', AuthController.requireAdminRole(), PluginController.updateConfig);
router.get('/api/1/plugin/dependencies', AuthController.requireAdminRole(), PluginController.getDependencies);
router.get('/api/1/plugin/:name/dependencies', AuthController.requireAdminRole(), PluginController.getPluginDependencies);
router.post('/api/1/plugin/scan', AuthController.requireAdminRole(), PluginController.scan);
router.post('/api/1/plugin/:name/install-dependencies', AuthController.requireAdminRole(), PluginController.installDependencies);

// Auth API routes
router.post('/api/1/auth/login', AuthController.login);
router.post('/api/1/auth/logout', AuthController.logout);
router.get('/api/1/auth/languages', AuthController.getLanguages);

// Markdown API routes
router.get('/api/1/markdown/*', MarkdownController.api);

// Handlebar API routes (W-088)
router.post('/api/1/handlebar/expand', HandlebarController.apiExpand);

// W-079: Cache API routes (require admin role)
router.post('/api/1/cache/refresh', CacheController.refreshAll);
router.post('/api/1/cache/refresh/view', CacheController.refreshView);
router.post('/api/1/cache/refresh/i18n', CacheController.refreshI18n);
router.post('/api/1/cache/refresh/markdown', CacheController.refreshMarkdown);
router.get('/api/1/cache/stats', CacheController.getStats);

// User API routes (with authentication middleware where needed)
// IMPORTANT: Specific routes must come before parameterized routes (:id)
router.post('/api/1/user/signup', UserController.signup);
router.put('/api/1/user/password', AuthController.requireAuthentication, UserController.changePassword);
// W-134: Changed from admin-only to profile access policy (access control in controller)
router.get('/api/1/user/search', UserController.search);
// W-134: Changed from admin-only to authenticated users (for /user/ dashboard stats)
router.get('/api/1/user/stats', AuthController.requireAuthentication, UserController.stats);
router.get('/api/1/user/enums', AuthController.requireAuthentication, UserController.getEnums);
router.get('/api/1/user', AuthController.requireAuthentication, UserController.get);
router.get('/api/1/user/:id', AuthController.requireAuthentication, UserController.get);
// W-134: Public profile endpoint (access control in controller)
router.get('/api/1/user/public/:id', UserController.getPublic);
router.put('/api/1/user', AuthController.requireAuthentication, UserController.update);
router.put('/api/1/user/:id', AuthController.requireAuthentication, UserController.update);

// Email API routes (W-087)
router.post('/api/1/email/send', AuthController.requireAuthentication, EmailController.apiSend);

// Log API routes (search requires authentication)
router.get('/api/1/log/search', AuthController.requireAuthentication, logController.search);
router.post('/api/1/log/report/csp',
    bodyParser.json({ type: ['application/json', 'application/csp-report', 'application/reports+json'] }),
    logController.reportCspViolation);

// Serve common files first, so that {{handlebars}} are not processed by the view controller.
// This is handled by nginx if the app is running behind a reverse proxy
router.use('/common', express.static(path.join(appConfig.system.appDir, 'static', 'common')));

// Admin routes (require admin role)
router.get(/^\/admin\/.*/, AuthController.requireAuthentication, AuthController.requireAdminRole());

// W-014: Auto-register site controller APIs (no manual registration needed!)
const SiteControllerRegistry = (await import('./utils/site-controller-registry.js')).default;
const registeredApis = SiteControllerRegistry.registerApiRoutes(router);
LogController.logInfo(null, 'routes', `Auto-registered ${registeredApis} site API endpoints`);

// Dynamic content routes - handle {{handlebars}} in .shtml, .tmpl, and jpulse-* files only
router.get(/\.(shtml|tmpl)$/, (req, res) => ViewController.load(req, res));
router.get(/\/jpulse-.*\.(js|css)$/, (req, res) => ViewController.load(req, res));
// W-049: Use view registry for optimized routing to view directories
router.get(global.ViewController.getViewRouteRE(), (req, res) => ViewController.load(req, res));

// Also handle non-existing view directories ending with / so view controller can render proper 404
router.get(/^\/[a-zA-Z][a-zA-Z0-9-]*\/$/, (req, res) => ViewController.load(req, res));
router.get('/', (req, res) => {
    res.redirect('/home/');
});

// Anything else will fall through to Express static middleware (.txt, .ico, .png, .json, etc.)
// This is handled by nginx if the app is running behind a reverse proxy
// In development, we need to check site overrides first (mimics nginx try_files behavior)
// W-045: Extended to support plugin static assets
router.use('/', (req, res, next) => {
    // Skip API routes and already processed routes
    if (req.path.startsWith('/api/') || req.path.match(/\.(shtml|tmpl)$/) || req.path.startsWith('/jpulse-')) {
        return next();
    }

    try {
        // W-045: Use PathResolver for consistent priority (site > plugins > framework)
        const modulePath = `static${req.path}`;
        const resolvedPath = PathResolver.resolveModuleWithPlugins(modulePath);
        if (fs.statSync(resolvedPath).isFile()) {
            return res.sendFile(resolvedPath);
        }
    } catch (error) {
        // File not found in any location, continue to 404
    }

    next();
});

// Catch-all 404 handler
router.use('*', (req, res) => {
    LogController.logRequest(req, 'router.use', req.originalUrl);
    LogController.logError(req, 'router.use', `error: 404 not found: ${req.originalUrl}`);
    return CommonUtils.sendError(req, res, 404, `Page not found: ${req.originalUrl}`, 'NOT_FOUND');
});

export default router;

// EOF webapp/routes.js
