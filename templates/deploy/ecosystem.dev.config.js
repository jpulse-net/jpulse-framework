// Development PM2 Configuration for jPulse Framework
// Site: %SITE_NAME%
// Generated: %GENERATION_DATE%
//
// Usage: pm2 start deploy/ecosystem.dev.config.js

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
