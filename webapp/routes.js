/**
 * @name            jPulse Framework / WebApp / Route
 * @tagline         WebApp for jPulse Framework
 * @description     This is the routing file for the jPulse Framework WebApp
 * @file            webapp/route.js
 * @version         0.2.3
 * @release         2025-08-25
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import express from 'express';
const router = express.Router();

// Load controllers
import UserController from './controller/user.js';
import configController from './controller/config.js';
import logController from './controller/log.js';
import viewController from './controller/view.js';

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

// User API routes
router.post('/api/1/user/login', UserController.login);
router.post('/api/1/user/logout', UserController.logout);
router.get('/api/1/user/profile', UserController.getProfile);
router.put('/api/1/user/profile', UserController.updateProfile);
router.put('/api/1/user/password', UserController.changePassword);
router.get('/api/1/user/search', UserController.search);

// Log API routes
router.get('/api/1/log/search', logController.search);

// Dynamic content routes - handle .shtml, .tmpl, and jpulse-* files only
// Static files (.txt, .ico, .png, .json, etc.) will fall through to Express static middleware
router.get(/\.(shtml|tmpl)$/, viewController.load);
router.get(/\/jpulse-.*\.(js|css)$/, viewController.load);

// View routes - handle paths that look like view routes (no file extension or directory-like paths)
router.get(/^\/[^.]*$/, viewController.load);
router.get(/^\/[^.]*\/[^.]*$/, viewController.load);

export default router;

// EOF webapp/routes.js
