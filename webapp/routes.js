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

// Serve common files first, so that {{handlebars}} are not processed by the view controller.
// This is handled by nginx if the app is running behind a reverse proxy
router.use('/common', express.static(path.join(appConfig.app.dirName, 'static', 'common')));

// Dynamic content routes - handle {{handlebars}} in .shtml, .tmpl, and jpulse-* files only
router.get(/\.(shtml|tmpl)$/, viewController.load);
router.get(/\/jpulse-.*\.(js|css)$/, viewController.load);
router.get(/^\/[\w-]+\/$/, viewController.load); // e.g. /home/ ==> /home/index.shtml
router.get('/', (req, res) => {
    res.redirect('/home/');
});

// Anything else will fall through to Express static middleware (.txt, .ico, .png, .json, etc.)
// This is handled by nginx if the app is running behind a reverse proxy
router.use('/', express.static(path.join(appConfig.app.dirName, 'static')));

// Catch-all 404 handler
router.use('*', (req, res) => {
    return CommonUtils.sendError(req, res, 404, `Page not found: ${req.originalUrl}`, 'NOT_FOUND');
});

export default router;

// EOF webapp/routes.js
