/**
 * @name            jPulse Framework / Deploy / Production PM2 Configuration
 * @tagline         Production PM2 Configuration for jPulse Framework
 * @description     Defines the production PM2 configuration for site-specific
 *                  jPulse Framework deployment
 * @usage           pm2 start deploy/ecosystem.prod.config.cjs
 * @site            %SITE_NAME%
 * @generated       %GENERATION_DATE%
 * @file            templates/deploy/ecosystem.prod.config.cjs
 * @version         1.4.2
 * @release         2026-01-01
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

module.exports = {
    apps: [{
        name: '%JPULSE_SITE_ID%-prod',
        script: 'webapp/app.js',
        cwd: process.cwd(),

        // Production cluster configuration
        instances: %JPULSE_PM2_INSTANCES%,
        exec_mode: 'cluster',

        // Environment
        env: {
            NODE_ENV: 'production',
            PORT: %PORT%
        },

        // Logging (resolved at template time - no runtime dependencies)
        log_file: '%PM2_LOG_FILE%',
        error_file: '%PM2_ERROR_FILE%',
        out_file: '/dev/null',

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
        time: false,
        log_date_format: '',

        // Graceful shutdown
        kill_retry_time: 100,

        // Process management
        wait_ready: true,
        autorestart: true,

        // Red Hat systemd integration
        pid_file: '/var/run/jpulse/%JPULSE_SITE_ID%.pid'
    }]
};

// EOF deploy/ecosystem.prod.config.cjs
