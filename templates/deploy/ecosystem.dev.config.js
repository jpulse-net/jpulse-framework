/**
 * @name            jPulse Framework / Deploy / Development PM2 Configuration
 * @tagline         Development PM2 Configuration for jPulse Framework
 * @description     Defines the development PM2 configuration for site-specific
 *                  jPulse Framework deployment
 * @usage           pm2 start deploy/ecosystem.dev.config.js
 * @site            %SITE_NAME%
 * @generated       %GENERATION_DATE%
 * @file            templates/deploy/ecosystem.dev.config.js
 * @version         0.6.9
 * @release         2025-09-14
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           95%, Cursor 1.2, Claude Sonnet 4
 */

module.exports = {
    apps: [{
        name: '%SITE_ID%-dev',
        script: 'webapp/app.js',
        cwd: process.cwd(),

        // Development settings
        instances: 1,
        exec_mode: 'fork',
        watch: true,
        ignore_watch: [
            'node_modules',
            'logs',
            '.git',
            'deploy',
            '.jpulse'
        ],

        // Environment
        env: {
            NODE_ENV: 'development',
            PORT: %APP_PORT%
        },

        // Logging
        error_file: './logs/dev-error.log',
        out_file: './logs/dev-out.log',
        log_file: './logs/dev-combined.log',

        // Development optimizations
        max_memory_restart: '500M',
        min_uptime: '5s',
        max_restarts: 5,

        // Development debugging
        node_args: '--inspect=0.0.0.0:9229'
    }]
};

// EOF deploy/ecosystem.dev.config.js
