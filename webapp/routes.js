/**
 * @name            jPulse Framework / WebApp / Routes
 * @tagline         Routes of the jPulse Framework
 * @description     This is the routing file for the jPulse Framework
 * @file            webapp/route.js
 * @version         1.0.0-rc.2
 * @release         2025-10-27
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import path from 'path';
import fs from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
const router = express.Router();

// Load controllers
import AuthController from './controller/auth.js';
import CacheController from './controller/cache.js';
import BroadcastController from './controller/broadcast.js';
import HealthController from './controller/health.js';
import MarkdownController from './controller/markdown.js';
import UserController from './controller/user.js';
import ConfigController from './controller/config.js';
import WebSocketController from './controller/websocket.js';
import logController from './controller/log.js';
import ViewController from './controller/view.js';
import CommonUtils from './utils/common.js';

// API routes (must come before catch-all route)

// Health and metrics endpoints
router.get('/api/1/health/status', HealthController.status);
router.get('/api/1/health/metrics', HealthController.metrics);

// W-076: Broadcast endpoints for jPulse.appCluster
router.post('/api/1/broadcast/:channel', BroadcastController.publish);
router.get('/api/1/broadcast/status', BroadcastController.status);

// Config API routes
router.get('/api/1/config', ConfigController.list);
router.get('/api/1/config/:id', ConfigController.get);
router.get('/api/1/config/:id/effective', ConfigController.getEffective);
router.post('/api/1/config', ConfigController.create);
router.put('/api/1/config/:id', ConfigController.update);
router.put('/api/1/config/:id/upsert', ConfigController.upsert);
router.delete('/api/1/config/:id', ConfigController.delete);

// Auth API routes
router.post('/api/1/auth/login', AuthController.login);
router.post('/api/1/auth/logout', AuthController.logout);
router.get('/api/1/auth/roles', AuthController.getRoles);
router.get('/api/1/auth/languages', AuthController.getLanguages);
router.get('/api/1/auth/themes', AuthController.getThemes);

// Markdown API routes
router.get('/api/1/markdown/*', MarkdownController.api);

// W-079: Cache API routes (require admin role)
router.post('/api/1/cache/refresh', CacheController.refreshAll);
router.post('/api/1/cache/refresh/view', CacheController.refreshView);
router.post('/api/1/cache/refresh/i18n', CacheController.refreshI18n);
router.post('/api/1/cache/refresh/markdown', CacheController.refreshMarkdown);
router.get('/api/1/cache/stats', CacheController.getStats);

// User API routes (with authentication middleware where needed)
router.post('/api/1/user/signup', UserController.signup);
router.get('/api/1/user/profile', AuthController.requireAuthentication, UserController.get);
router.put('/api/1/user/profile', AuthController.requireAuthentication, UserController.update);
router.put('/api/1/user/password', AuthController.requireAuthentication, UserController.changePassword);
router.get('/api/1/user/search', AuthController.requireRole(['admin', 'root']), UserController.search);

// Log API routes (search requires authentication)
router.get('/api/1/log/search', AuthController.requireAuthentication, logController.search);
router.post('/api/1/log/report/csp',
    bodyParser.json({ type: ['application/json', 'application/csp-report', 'application/reports+json'] }),
    logController.reportCspViolation);

// Serve common files first, so that {{handlebars}} are not processed by the view controller.
// This is handled by nginx if the app is running behind a reverse proxy
router.use('/common', express.static(path.join(appConfig.system.appDir, 'static', 'common')));

// Admin routes (require admin role)
router.get(/^\/admin\/.*/, AuthController.requireAuthentication, AuthController.requireRole(['admin', 'root']));

// W-014: Auto-register site controller APIs (no manual registration needed!)
const SiteControllerRegistry = (await import('./utils/site-controller-registry.js')).default;
const registeredApis = SiteControllerRegistry.registerApiRoutes(router);
LogController.logInfo(null, 'routes', `Auto-registered ${registeredApis} site API endpoints`);

// Dynamic content routes - handle {{handlebars}} in .shtml, .tmpl, and jpulse-* files only
router.get(/\.(shtml|tmpl)$/, (req, res) => ViewController.load(req, res));
router.get(/\/jpulse-.*\.(js|css)$/, (req, res) => ViewController.load(req, res));
// W-047: Serve site-common files from view directory
router.get(/\/site-common\.(js|css)$/, (req, res) => ViewController.load(req, res));
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
router.use('/', (req, res, next) => {
    const siteStaticPath = path.join(appConfig.system.siteDir, 'static', req.path);
    const frameworkStaticPath = path.join(appConfig.system.appDir, 'static', req.path);

    // Try site override first
    if (fs.existsSync(siteStaticPath) && fs.statSync(siteStaticPath).isFile()) {
        return res.sendFile(siteStaticPath);
    }

    // Fall back to framework static
    if (fs.existsSync(frameworkStaticPath) && fs.statSync(frameworkStaticPath).isFile()) {
        return res.sendFile(frameworkStaticPath);
    }

    // Not a static file, continue to 404 handler
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
