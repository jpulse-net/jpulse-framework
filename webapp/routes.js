/**
 * @name            Bubble Framework / WebApp / Route
 * @tagline         WebApp for Bubble Framework
 * @description     This is the routing file for the Bubble Framework WebApp
 * @file            webapp/route.js
 * @version         0.1.2
 * @release         2025-08-24
 * @repository      https://github.com/peterthoeny/bubble-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import express from 'express';
const router = express.Router();

// Load controllers
import staticController from './controller/static.js';
import userController from './controller/user.js';
import configController from './controller/config.js';

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

// Hello World route (catch-all, must be last)
router.get('/*', (req, res) => {
    console.log('req.url', req.url);
    console.log('i18n:', JSON.stringify(i18n, null, 2));
    res.send(`
        <html>
        <head>
            <title>${i18n.t('app.title')}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
                .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .version { color: #666; font-size: 0.9em; }
                .status { color: #007acc; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🫧 Hello World from ${i18n.t('app.title')}</h1>
                <div class="info">
                    <p><strong>Framework:</strong> Bubble Framework</p>
                    <p><strong>Version:</strong> <span class="version">${appConfig.app.version} (${appConfig.app.release})</span></p>
                    <p><strong>Mode:</strong> <span class="status">${appConfig.deployment[appConfig.deployment.mode].name}</span></p>
                    <p><strong>Port:</strong> ${appConfig.deployment[appConfig.deployment.mode].port}</p>
                    <p><strong>Database:</strong> ${appConfig.deployment[appConfig.deployment.mode].db}</p>
                </div>
                <p>This is a generic web application framework using MongoDB, Node.js, and Express following the MVC paradigm.</p>
                <p><strong>Status:</strong> <span class="status">✅ W-001 Hello World App - IMPLEMENTED</span></p>
            </div>
        </body>
        </html>
    `);
});

// Static controller routes (will be implemented later)
// router.use('/static', staticController);

// User controller routes (will be implemented later)  
// router.use('/api/1/user', userController);

export default router;

// EOF routes.js
