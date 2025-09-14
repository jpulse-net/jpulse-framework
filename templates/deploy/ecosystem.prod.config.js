/**
 * @name            jPulse Framework / Deploy / Production PM2 Configuration
 * @tagline         Production PM2 Configuration for jPulse Framework
 * @description     Defines the production PM2 configuration for site-specific
 *                  jPulse Framework deployment
 * @usage           pm2 start deploy/ecosystem.prod.config.js
 * @site            %SITE_NAME%
 * @generated       %GENERATION_DATE%
 * @file            templates/deploy/ecosystem.prod.config.js
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
        name: '%SITE_ID%-prod',
        script: 'webapp/app.js',
        cwd: process.cwd(),

        // Production cluster configuration
        instances: %PM2_INSTANCES%,
        exec_mode: 'cluster',

        // Environment
        env: {
            NODE_ENV: 'production',
            PORT: %APP_PORT%
        },

        // Logging (configurable paths)
        error_file: '%LOG_DIR%/error.log',
        out_file: '%LOG_DIR%/out.log',
        log_file: '%LOG_FILE%',

        // Performance and reliability
        max_memory_restart: '1G',
        node_args: '--max-old-space-size=1024',

        // Monitoring and restart policy
        min_uptime: '10s',
        max_restarts: 10,
        restart_delay: 4000,

        // Health monitoring
        health_check_grace_period: 3000,
        kill_timeout: 5000,
        listen_timeout: 3000,

        // Production optimizations
        merge_logs: true,
        combine_logs: true,
        time: true,

        // Graceful shutdown
        kill_retry_time: 100,

        // Process management
        wait_ready: true,
        autorestart: true,

        // Red Hat systemd integration
        pid_file: '/var/run/jpulse/%SITE_ID%.pid'
    }]
};

// EOF deploy/ecosystem.prod.config.js
