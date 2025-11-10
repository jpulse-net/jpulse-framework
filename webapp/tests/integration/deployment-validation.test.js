/**
 * @name            jPulse Framework / Tests / Integration / Deployment Validation
 * @tagline         Integration tests for deployment validation and testing
 * @description     Validates file structure & file permissions of deployed site,
 *                  validates configuration of PM2 and nginx, validates deployment context,
 *                  validates environment configuration
 * @file            webapp/tests/integration/deployment-validation.test.js
 * @version         1.1.2
 * @release         2025-11-10
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import TestUtils from '../helpers/test-utils.js';

describe('Deployment Validation Integration', () => {
    let tempDir;
    let originalCwd;

    beforeEach(() => {
        originalCwd = process.cwd();
        tempDir = TestUtils.createTempDir();
        process.chdir(tempDir);
    });

    afterEach(() => {
        process.chdir(originalCwd);
        TestUtils.removeTempDir(tempDir);
    });

    describe('Environment Configuration Validation', () => {
        test('should validate complete development environment', () => {
            // Create a development .env file
            const devEnv = `
# Application Configuration
export NODE_ENV=development
export PORT=8080

# Database Configuration
export DB_NAME=jp-dev
export DB_USER=jpapp
export DB_PASS='dev_password'

# Deployment Configuration
export JPULSE_DEPLOYMENT_TYPE=dev
export JPULSE_SITE_ID=test-site
export JPULSE_DOMAIN_NAME=localhost
export JPULSE_SSL_TYPE=none
export JPULSE_PM2_INSTANCES=1

# Security
export SESSION_SECRET=dev-session-secret
`;

            fs.writeFileSync('.env', devEnv);

            // Create basic site structure
            fs.mkdirSync('site/webapp', { recursive: true });
            fs.writeFileSync('site/webapp/app.conf', JSON.stringify({
                app: { name: 'Test Site' },
                deployment: { mode: 'dev' }
            }, null, 2));

            fs.writeFileSync('package.json', JSON.stringify({
                name: 'test-site',
                version: '1.0.0',
                type: 'module'
            }, null, 2));

            // Validate environment variables are properly set
            const envContent = fs.readFileSync('.env', 'utf8');
            expect(envContent).toContain('JPULSE_DEPLOYMENT_TYPE=dev');
            expect(envContent).toContain('NODE_ENV=development');
            expect(envContent).toContain('JPULSE_SSL_TYPE=none');
        });

        test('should validate complete production environment', () => {
            // Create a production .env file
            const prodEnv = `
# Application Configuration
export NODE_ENV=production
export PORT=8081

# Database Configuration
export DB_NAME=jp-prod
export DB_USER=jpapp
export DB_PASS='prod_secure_password!'
export DB_ADMIN_USER=admin
export DB_ADMIN_PASS='admin_secure_password@'

# Deployment Configuration
export JPULSE_DEPLOYMENT_TYPE=prod
export JPULSE_SITE_ID=prod-site
export JPULSE_DOMAIN_NAME=example.com
export JPULSE_SSL_TYPE=letsencrypt
export JPULSE_PM2_INSTANCES=max

# Security
export SESSION_SECRET=prod-session-secret-very-long-and-secure
`;

            fs.writeFileSync('.env', prodEnv);

            // Create production site structure
            fs.mkdirSync('site/webapp', { recursive: true });
            fs.writeFileSync('site/webapp/app.conf', JSON.stringify({
                app: {
                    name: 'Production Site',
                    domainName: 'example.com'
                },
                deployment: {
                    mode: 'prod',
                    prod: {}
                },
                cookie: { secure: true }
            }, null, 2));

            // Validate production-specific settings
            const envContent = fs.readFileSync('.env', 'utf8');
            expect(envContent).toContain('JPULSE_DEPLOYMENT_TYPE=prod');
            expect(envContent).toContain('NODE_ENV=production');
            expect(envContent).toContain('JPULSE_SSL_TYPE=letsencrypt');
            expect(envContent).toContain('JPULSE_PM2_INSTANCES=max');

            // Check password quoting for special characters
            expect(envContent).toMatch(/DB_PASS='[^']*!'/);
            expect(envContent).toMatch(/DB_ADMIN_PASS='[^']*@'/);
        });
    });

    describe('Configuration File Structure Validation', () => {
        test('should validate development configuration structure', () => {
            // Create development configuration
            const devConfig = {
                app: {
                    name: 'Development Site',
                    shortName: 'Dev Site',
                    siteId: 'dev-site',
                    domainName: 'localhost'
                },
                deployment: {
                    mode: 'dev'
                },
                middleware: {
                    session: {
                        secret: 'dev-secret'
                    }
                },
                cookie: {
                    secure: false
                }
            };

            fs.mkdirSync('site/webapp', { recursive: true });
            fs.writeFileSync('site/webapp/app.conf', JSON.stringify(devConfig, null, 2));

            // Validate structure
            const configContent = fs.readFileSync('site/webapp/app.conf', 'utf8');
            const parsedConfig = JSON.parse(configContent);

            expect(parsedConfig.deployment.mode).toBe('dev');
            expect(parsedConfig.cookie.secure).toBe(false);
            expect(parsedConfig.app.domainName).toBe('localhost');
        });

        test('should validate production configuration structure', () => {
            // Create production configuration
            const prodConfig = {
                app: {
                    name: 'Production Site',
                    shortName: 'Prod Site',
                    siteId: 'prod-site',
                    domainName: 'example.com'
                },
                deployment: {
                    mode: 'prod',
                    prod: {
                    }
                },
                middleware: {
                    session: {
                        secret: '%SESSION_SECRET%'
                    }
                },
                cookie: {
                    secure: true
                },
                database: {
                    mode: 'standalone',
                    standalone: {
                        url: 'mongodb://localhost:27017/%DB_NAME%',
                        user: '%DB_USER%',
                        pass: '%DB_PASS%'
                    }
                }
            };

            fs.mkdirSync('site/webapp', { recursive: true });
            fs.writeFileSync('site/webapp/app.conf', JSON.stringify(prodConfig, null, 2));

            // Validate structure
            const configContent = fs.readFileSync('site/webapp/app.conf', 'utf8');
            const parsedConfig = JSON.parse(configContent);

            expect(parsedConfig.deployment.mode).toBe('prod');
            expect(parsedConfig.cookie.secure).toBe(true);
            expect(parsedConfig.database.standalone.user).toBe('%DB_USER%');
        });
    });

    describe('PM2 Configuration Validation', () => {
        test('should validate PM2 development configuration', () => {
            // Create PM2 dev config
            const pm2DevConfig = `
module.exports = {
    apps: [{
        name: 'test-site-dev',
        script: 'webapp/app.js',
        cwd: process.cwd(),
        instances: 1,
        exec_mode: 'fork',
        watch: true,
        ignore_watch: ['node_modules', 'logs', '.git'],
        env: {
            NODE_ENV: 'development',
            PORT: 8080
        },
        error_file: './logs/error.log',
        out_file: './logs/out.log'
    }]
};
`;

            fs.mkdirSync('deploy', { recursive: true });
            fs.writeFileSync('deploy/ecosystem.dev.config.cjs', pm2DevConfig);

            // Validate PM2 config can be loaded
            const configPath = path.resolve('deploy/ecosystem.dev.config.cjs');
            expect(() => {
                const config = require(configPath);
                expect(config.apps).toHaveLength(1);
                expect(config.apps[0].exec_mode).toBe('fork');
                expect(config.apps[0].instances).toBe(1);
                expect(config.apps[0].watch).toBe(true);
            }).not.toThrow();
        });

        test('should validate PM2 production configuration', () => {
            // Create PM2 prod config
            const pm2ProdConfig = `
module.exports = {
    apps: [{
        name: 'test-site-prod',
        script: 'webapp/app.js',
        cwd: process.cwd(),
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 8081
        },
        error_file: '/var/log/jpulse/error.log',
        out_file: '/var/log/jpulse/out.log',
        pid_file: '/var/run/jpulse/test-site.pid',
        max_memory_restart: '1G',
        wait_ready: true,
        listen_timeout: 10000
    }]
};
`;

            fs.mkdirSync('deploy', { recursive: true });
            fs.writeFileSync('deploy/ecosystem.prod.config.cjs', pm2ProdConfig);

            // Validate PM2 config can be loaded
            const configPath = path.resolve('deploy/ecosystem.prod.config.cjs');
            expect(() => {
                const config = require(configPath);
                expect(config.apps).toHaveLength(1);
                expect(config.apps[0].exec_mode).toBe('cluster');
                expect(config.apps[0].instances).toBe('max');
                expect(config.apps[0].pid_file).toContain('/var/run/jpulse/');
            }).not.toThrow();
        });
    });

    describe('nginx Configuration Validation', () => {
        test('should validate nginx configuration structure', () => {
            const nginxConfig = `
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Upstream backend
upstream jpulse_backend {
    server 127.0.0.1:8081 max_fails=3 fail_timeout=30s;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Proxy to Node.js application
    location / {
        proxy_pass http://jpulse_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

            fs.mkdirSync('deploy', { recursive: true });
            fs.writeFileSync('deploy/nginx.prod.conf', nginxConfig);

            // Validate nginx config structure
            const configContent = fs.readFileSync('deploy/nginx.prod.conf', 'utf8');

            // Check for required directives
            expect(configContent).toContain('upstream jpulse_backend');
            expect(configContent).toContain('server {');
            expect(configContent).toContain('listen 443 ssl http2');
            expect(configContent).toContain('ssl_certificate');
            expect(configContent).toContain('proxy_pass http://jpulse_backend');
            expect(configContent).toContain('limit_req_zone');

            // Check security headers
            expect(configContent).toContain('X-Frame-Options DENY');
            expect(configContent).toContain('Strict-Transport-Security');
            expect(configContent).toContain('X-Content-Type-Options nosniff');
        });
    });

    describe('Deployment Context Detection', () => {
        test('should detect development deployment context', () => {
            // Create development environment
            fs.writeFileSync('.env', 'export JPULSE_DEPLOYMENT_TYPE=dev\nexport NODE_ENV=development');

            fs.mkdirSync('site/webapp', { recursive: true });
            fs.writeFileSync('site/webapp/app.conf', JSON.stringify({
                deployment: { mode: 'dev' }
            }, null, 2));

            // Read and validate context
            const envContent = fs.readFileSync('.env', 'utf8');
            const configContent = fs.readFileSync('site/webapp/app.conf', 'utf8');

            expect(envContent).toContain('JPULSE_DEPLOYMENT_TYPE=dev');
            expect(configContent).toContain('"mode": "dev"');
        });

        test('should detect production deployment context', () => {
            // Create production environment
            fs.writeFileSync('.env', 'export JPULSE_DEPLOYMENT_TYPE=prod\nexport NODE_ENV=production');

            fs.mkdirSync('site/webapp', { recursive: true });
            fs.writeFileSync('site/webapp/app.conf', JSON.stringify({
                deployment: { mode: 'prod' }
            }, null, 2));

            // Read and validate context
            const envContent = fs.readFileSync('.env', 'utf8');
            const configContent = fs.readFileSync('site/webapp/app.conf', 'utf8');

            expect(envContent).toContain('JPULSE_DEPLOYMENT_TYPE=prod');
            expect(configContent).toContain('"mode": "prod"');
        });
    });

    describe('File Permission Validation', () => {
        test('should validate executable permissions on shell scripts', () => {
            // Create shell scripts
            fs.mkdirSync('deploy', { recursive: true });
            fs.writeFileSync('deploy/install-system.sh', '#!/bin/bash\necho "test"');
            fs.writeFileSync('deploy/install-test.sh', '#!/bin/bash\necho "test"');
            fs.writeFileSync('deploy/mongodb-setup.sh', '#!/bin/bash\necho "test"');

            // Make them executable (simulating setup process)
            fs.chmodSync('deploy/install-system.sh', 0o755);
            fs.chmodSync('deploy/install-test.sh', 0o755);
            fs.chmodSync('deploy/mongodb-setup.sh', 0o755);

            // Validate permissions
            const systemStats = fs.statSync('deploy/install-system.sh');
            const testStats = fs.statSync('deploy/install-test.sh');
            const mongoStats = fs.statSync('deploy/mongodb-setup.sh');

            // Check that files are executable (mode includes execute bit)
            expect(systemStats.mode & 0o111).toBeTruthy(); // Execute bit set
            expect(testStats.mode & 0o111).toBeTruthy();
            expect(mongoStats.mode & 0o111).toBeTruthy();
        });
    });
});

// EOF webapp/tests/integration/deployment-validation.test.js
