/**
 * @name            jPulse Framework / Deploy / Development PM2 Configuration
 * @tagline         Development PM2 Configuration for jPulse Framework
 * @description     Defines the development PM2 configuration for site-specific
 *                  jPulse Framework deployment
 * @usage           pm2 start deploy/ecosystem.dev.config.cjs
 * @site            %SITE_NAME%
 * @generated       %GENERATION_DATE%
 * @file            templates/deploy/ecosystem.dev.config.cjs
 * @version         1.4.9
 * @release         2026-01-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

module.exports = {
    apps: [{
        name: '%JPULSE_SITE_ID%-dev',
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
            PORT: %PORT%
        },

        // Logging (resolved at template time - no runtime dependencies)
        log_file: '%PM2_LOG_FILE%',
        error_file: '%PM2_ERROR_FILE%',
        out_file: '/dev/null',

        // Development optimizations
        max_memory_restart: '500M',
        min_uptime: '5s',
        max_restarts: 5,
        time: false,
        log_date_format: '',

        // Development debugging
        node_args: '--inspect=0.0.0.0:9229'
    }]
};

// EOF deploy/ecosystem.dev.config.cjs
