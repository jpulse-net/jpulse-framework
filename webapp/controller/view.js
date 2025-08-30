/**
 * @name            jPulse Framework / WebApp / View Controller
 * @tagline         Server-side template rendering controller
 * @description     Handles .shtml files with handlebars template expansion
 * @file            webapp/controller/view.js
 * @version         0.3.0
 * @release         2025-08-28
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import configModel from '../model/config.js';
import AuthController from './auth.js';

const view = {
  // Load and render a view
  async load(req, res) {
    const startTime = Date.now();

    try {
      // Log the request
      LogController.consoleApi(req, `view.load( ${req.path} )`);

      // Determine section from path (maintains MVC mental model)
      const pathParts = req.path.split('/').filter(p => p);
      const section = pathParts[0] || 'home';  // user, auth, dashboard, home, etc.
      const page = pathParts[1] || 'index';

      // Get global config for context
      const globalConfig = await configModel.findById('global');

      // Build context for Vue app hydration (no circular references)
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
          initials: req.session?.user?.initials || '?',
          authenticated: !!req.session?.user
        },
        config: globalConfig?.data || {},
        appConfig: appConfig,
        url: {
          domain: `${req.protocol}://${req.get('host')}`,
          protocol: req.protocol,
          hostname: req.hostname,
          port: req.get('host')?.split(':')[1] || '',
          pathname: req.path,
          search: req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '',
          param: req.query || {}
        },
        i18n: {
          currentLanguage: AuthController.getUserLanguage(req),
          availableLanguages: Object.keys(i18n.langs),
          translations: i18n.getLang(AuthController.getUserLanguage(req))
        },
        // Add routing info for Vue
        route: {
          section,
          page,
          path: req.path,
          fullPath: req.url
        }
      };

      // Serve Vue app bootstrap HTML
      const html = generateVueAppHtml(context, section);

      // Log completion time
      const duration = Date.now() - startTime;
      LogController.console(req, `view.load completed in ${duration}ms`);

      res.set('Content-Type', 'text/html');
      res.send(html);

    } catch (error) {
      LogController.error(req, `view.load error: ${error.message}`);
      res.status(500).send('Internal server error');
    }
  }
};

/**
 * Generate Vue app HTML with framework/site component loading
 */
function generateVueAppHtml(context, section) {

  // Components will be auto-discovered by the Vue core

  const siteStylesPath = path.join(appConfig.app.dirName, '..', 'site', 'webapp', 'static', 'view', 'site-styles.css');
  const siteStyles = fs.existsSync(siteStylesPath)
    ? `  <link rel="stylesheet" href="/site/static/view/site-styles.css">`
    : '  <!-- Site styles not found, skipping -->';

  const maxWidth = appConfig.window?.maxWidth || 1200;
  const minMarginLeftRight = appConfig.window?.minMarginLeftRight || 20;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${context.app.version} - jPulse</title>

  <style>
    :root {
      --jp-max-width: ${maxWidth}px;
      --jp-min-margin-left-right: ${minMarginLeftRight}px;
    }
  </style>

  <!-- Framework styles -->
  <link rel="stylesheet" href="/static/view/jpulse-styles.css">

  <!-- Site-specific styles if they exist -->
${siteStyles}
</head>
<body>
  <div id="jpulse-app">
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading jPulse...</p>
    </div>
  </div>

  <!-- Context data for Vue hydration -->
  <script type="application/json" id="jpulse-context">
${JSON.stringify(context, null, 2)}
  </script>

  <!-- Framework dependencies -->
  <script src="/static/common/vue/vue${appConfig.deployment.mode === 'production' ? '.min' : ''}.js"></script>
  <script src="/static/view/jpulse-common.js"></script>
  <script src="/static/view/jpulse-vue-core.js"></script>

  <!-- Components will be auto-discovered and loaded by Vue core -->

  <script>
    // Set global context for Vue components
    window.jPulseContext = JSON.parse(document.getElementById('jpulse-context').textContent);

    // Initialize Vue app with framework/site component resolution
    document.addEventListener('DOMContentLoaded', function() {
      // Wait for components to be registered
      setTimeout(() => {
        if (window.jPulse && window.jPulse.initApp) {
          jPulse.initApp('${section}', ${JSON.stringify(context.route)});
        } else {
          console.error('jPulse.initApp not found. Vue core may not have loaded properly.');
        }
      }, 100);
    });
  </script>
</body>
</html>`;
}



export default view;
