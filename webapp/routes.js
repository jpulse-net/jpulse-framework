/**
 * @name            jPulse Framework / WebApp / Route
 * @tagline         WebApp for jPulse Framework
 * @description     This is the routing file for the jPulse Framework WebApp
 * @file            webapp/route.js
 * @version         0.3.0
 * @release         2025-08-28
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import path from 'path';
import express from 'express';
const router = express.Router();

// Load controllers
import AuthController from './controller/auth.js';
import UserController from './controller/user.js';
import configController from './controller/config.js';
import logController from './controller/log.js';
import viewController from './controller/view.js';
import CommonUtils from './utils/common.js';

// API routes (must come before catch-all route)
router.get('/api/1/status', (req, res) => {
    res.json({
        status: 'ok',
        version: appConfig.app.version,
        release: appConfig.app.release,
        mode: appConfig.deployment[appConfig.deployment.mode].name,
        database: appConfig.deployment[appConfig.deployment.mode].db
    });
});

// Config API routes
router.get('/api/1/config', configController.listConfigs);
router.get('/api/1/config/:id', configController.getConfig);
router.get('/api/1/config/:id/effective', configController.getEffectiveConfig);
router.post('/api/1/config', configController.createConfig);
router.put('/api/1/config/:id', configController.updateConfig);
router.put('/api/1/config/:id/upsert', configController.upsertConfig);
router.delete('/api/1/config/:id', configController.deleteConfig);

// Auth API routes
router.post('/api/1/auth/login', AuthController.login);
router.post('/api/1/auth/logout', AuthController.logout);

// User API routes (with authentication middleware where needed)
router.post('/api/1/user/signup', UserController.signup);
router.get('/api/1/user/profile', AuthController.requireAuthentication, UserController.getProfile);
router.put('/api/1/user/profile', AuthController.requireAuthentication, UserController.updateProfile);
router.put('/api/1/user/password', AuthController.requireAuthentication, UserController.changePassword);
router.get('/api/1/user/search', AuthController.requireRole(['admin', 'root']), UserController.search);

// Log API routes (require authentication)
router.get('/api/1/log/search', AuthController.requireAuthentication, logController.search);

// Handle favicon.ico requests explicitly to prevent 404s
router.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(appConfig.app.dirName, 'static', 'favicon.ico'));
});

// Serve static files first (handled by nginx in production)
router.use('/static', express.static(path.join(appConfig.app.dirName, 'static')));

// Serve site-specific static files if they exist
const siteStaticPath = path.join(appConfig.app.dirName, '..', 'site', 'webapp', 'static');
router.use('/site/static', express.static(siteStaticPath));

// Auto-discover Vue.js SPA routes from view directories
import fs from 'fs';
const viewDir = path.join(appConfig.app.dirName, 'static', 'view');
const sections = fs.readdirSync(viewDir).filter(item => {
    const itemPath = path.join(viewDir, item);
    return fs.statSync(itemPath).isDirectory() && item !== 'shared'; // Exclude shared directory
});

// Generate routes for discovered sections
sections.forEach(section => {
    router.get(`/${section}`, viewController.load);           // /section
    router.get(`/${section}/`, viewController.load);          // /section/
    router.get(`/${section}/:page`, viewController.load);     // /section/page
});

console.log(`Auto-discovered Vue.js SPA routes for sections: ${sections.join(', ')}`);

// Legacy manual routes (can be removed once auto-discovery is verified)
// router.get('/home', viewController.load);
// router.get('/home/', viewController.load);
// router.get('/user', viewController.load);
// router.get('/user/', viewController.load);
// router.get('/user/:page', viewController.load);
// router.get('/auth', viewController.load);
// router.get('/auth/', viewController.load);
// router.get('/auth/:page', viewController.load);
// router.get('/error', viewController.load);
// router.get('/error/', viewController.load);

// Legacy support for .shtml files during migration (can be removed later)
router.get(/\.(shtml|tmpl)$/, viewController.load);
router.get(/\/jpulse-.*\.(js|css)$/, viewController.load);

// Root redirect to home
router.get('/', (req, res) => {
    res.redirect('/home');
});

// Serve remaining static files from root static directory
router.use('/', express.static(path.join(appConfig.app.dirName, 'static')));

// Catch-all 404 handler
router.use('*', (req, res) => {
    return CommonUtils.sendError(req, res, 404, `Page not found: ${req.originalUrl}`, 'NOT_FOUND');
});

export default router;

// EOF webapp/routes.js
