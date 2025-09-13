// Production PM2 Configuration for jPulse Framework
// Site: %SITE_NAME%
// Generated: %GENERATION_DATE%
//
// Usage: pm2 start deploy/ecosystem.prod.config.js

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

        // Logging (Red Hat standard paths)
        error_file: '/var/log/jpulse/error.log',
        out_file: '/var/log/jpulse/out.log',
        log_file: '/var/log/jpulse/combined.log',

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
