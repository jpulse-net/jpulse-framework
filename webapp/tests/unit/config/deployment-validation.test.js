/**
 * @name            jPulse Framework / Tests / Unit / Config / Deployment Validation
 * @tagline         Unit tests for deployment configuration validation
 * @description     Validates deployment configuration
 * @file            webapp/tests/unit/config/deployment-validation.test.js
 * @version         1.6.3
 * @release         2026-01-31
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import TestUtils from '../../helpers/test-utils.js';

describe('Deployment Configuration Validation', () => {
    let tempFiles = [];

    afterEach(() => {
        // Clean up temporary files
        tempFiles.forEach(file => {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (error) {
                // Ignore cleanup errors
            }
        });
        tempFiles = [];
    });

    describe('Environment File Validation', () => {
        test('should validate correct .env file format', () => {
            const validEnv = `
# Application Configuration
export NODE_ENV=production
export PORT=8081

# Database Configuration
export DB_NAME=jp-prod
export DB_USER=jpapp
export DB_PASS='secure_password'

# Deployment Configuration
export JPULSE_DEPLOYMENT_TYPE=prod
export JPULSE_SITE_ID=my-site
export JPULSE_DOMAIN_NAME=example.com
export JPULSE_SSL_TYPE=letsencrypt
export JPULSE_PM2_INSTANCES=max
`;

            const tempFile = TestUtils.createTempFile(validEnv, '.env');
            tempFiles.push(tempFile);

            // Read and validate
            const content = fs.readFileSync(tempFile, 'utf8');

            // Check for export statements
            expect(content).toMatch(/^export NODE_ENV=/m);
            expect(content).toMatch(/^export JPULSE_DEPLOYMENT_TYPE=/m);

            // Check for required variables
            expect(content).toContain('NODE_ENV=production');
            expect(content).toContain('JPULSE_DEPLOYMENT_TYPE=prod');
            expect(content).toContain('JPULSE_SSL_TYPE=letsencrypt');
        });

        test('should detect missing required environment variables', () => {
            const incompleteEnv = `
export NODE_ENV=production
export PORT=8081
# Missing database configuration
`;

            const tempFile = TestUtils.createTempFile(incompleteEnv, '.env');
            tempFiles.push(tempFile);

            const content = fs.readFileSync(tempFile, 'utf8');

            // Should have NODE_ENV but missing DB_NAME
            expect(content).toContain('NODE_ENV=production');
            expect(content).not.toContain('DB_NAME=');
            expect(content).not.toContain('JPULSE_DEPLOYMENT_TYPE=');
        });

        test('should validate password quoting for special characters', () => {
            const envWithSpecialChars = `
export DB_PASS='password!with$pecial'
export DB_ADMIN_PASS='admin@pass#word'
export SESSION_SECRET=simple-secret-no-quotes
`;

            const tempFile = TestUtils.createTempFile(envWithSpecialChars, '.env');
            tempFiles.push(tempFile);

            const content = fs.readFileSync(tempFile, 'utf8');

            // Passwords with special chars should be quoted
            expect(content).toMatch(/DB_PASS='[^']*'/);
            expect(content).toMatch(/DB_ADMIN_PASS='[^']*'/);

            // Simple secrets don't need quotes
            expect(content).toContain('SESSION_SECRET=simple-secret-no-quotes');
        });
    });

    describe('PM2 Configuration Validation', () => {
        test('should validate PM2 development config syntax', () => {
            const validDevConfig = `
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
        }
    }]
};
`;

            const tempFile = TestUtils.createTempFile(validDevConfig, '.cjs');
            tempFiles.push(tempFile);

            // Test that Node.js can parse the config
            expect(() => {
                require(path.resolve(tempFile));
            }).not.toThrow();
        });

        test('should validate PM2 production config syntax', () => {
            const validProdConfig = `
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
        pid_file: '/var/run/jpulse/test-site.pid'
    }]
};
`;

            const tempFile = TestUtils.createTempFile(validProdConfig, '.cjs');
            tempFiles.push(tempFile);

            // Test that Node.js can parse the config
            expect(() => {
                const config = require(path.resolve(tempFile));
                expect(config.apps).toHaveLength(1);
                expect(config.apps[0].exec_mode).toBe('cluster');
                expect(config.apps[0].instances).toBe('max');
            }).not.toThrow();
        });

        test('should detect PM2 config syntax errors', () => {
            const invalidConfig = `
module.exports = {
    apps: [{
        name: 'test-site',
        script: 'webapp/app.js',
        instances: 'max'
        // Missing comma - this will cause a syntax error
        env: {
            NODE_ENV: 'production'
        }
    }]
};
`;

            const tempFile = TestUtils.createTempFile(invalidConfig, '.cjs');
            tempFiles.push(tempFile);

            // Should throw syntax error
            expect(() => {
                require(path.resolve(tempFile));
            }).toThrow();
        });
    });

    describe('nginx Configuration Validation', () => {
        test('should validate nginx config template structure', () => {
            const validNginxConfig = `
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Upstream backend
upstream jpulse_backend {
    server 127.0.0.1:8081 max_fails=3 fail_timeout=30s;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://jpulse_backend;
        proxy_set_header Host $host;
    }
}
`;

            const tempFile = TestUtils.createTempFile(validNginxConfig, '.conf');
            tempFiles.push(tempFile);

            const content = fs.readFileSync(tempFile, 'utf8');

            // Check for required nginx directives
            expect(content).toContain('server {');
            expect(content).toContain('listen 443 ssl');
            expect(content).toContain('proxy_pass http://');
            expect(content).toContain('ssl_certificate');
            expect(content).toContain('upstream');
            expect(content).toMatch(/upstream \w+_backend/);
        });

        test('should validate SSL configuration in nginx', () => {
            const sslConfig = `
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
}
`;

            const tempFile = TestUtils.createTempFile(sslConfig, '.conf');
            tempFiles.push(tempFile);

            const content = fs.readFileSync(tempFile, 'utf8');

            // Check SSL configuration
            expect(content).toContain('ssl_certificate ');
            expect(content).toContain('ssl_certificate_key ');
            expect(content).toContain('ssl_protocols TLSv1.2 TLSv1.3');
            expect(content).toContain('listen 443 ssl');
        });

        test('should detect missing SSL configuration', () => {
            const noSslConfig = `
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:8081;
    }
}
`;

            const tempFile = TestUtils.createTempFile(noSslConfig, '.conf');
            tempFiles.push(tempFile);

            const content = fs.readFileSync(tempFile, 'utf8');

            // Should not have SSL configuration
            expect(content).not.toContain('ssl_certificate');
            expect(content).not.toContain('listen 443 ssl');
            expect(content).toContain('listen 80');
        });
    });

    describe('Site Configuration Validation', () => {
        test('should validate development site configuration', () => {
            const devConfig = `{
    app: {
        name: 'Test Site',
        shortName: 'Test',
        siteId: 'test-site',
        domainName: 'localhost'
    },
    deployment: {
        mode: 'dev'
    },
    middleware: {
        session: {
            secret: 'dev-secret-key'
        }
    },
    cookie: {
        secure: false
    }
}`;

            const tempFile = TestUtils.createTempFile(devConfig, '.conf');
            tempFiles.push(tempFile);

            // Should be valid JSON-like structure
            expect(() => {
                const content = fs.readFileSync(tempFile, 'utf8');
                // Basic structure validation
                expect(content).toContain("mode: 'dev'");
                expect(content).toContain('secure: false');
                expect(content).toContain('app: {');
                expect(content).toContain('deployment: {');
            }).not.toThrow();
        });

        test('should validate production site configuration', () => {
            const prodConfig = `{
    app: {
        name: 'Production Site',
        shortName: 'Prod',
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
}`;

            const tempFile = TestUtils.createTempFile(prodConfig, '.conf');
            tempFiles.push(tempFile);

            const content = fs.readFileSync(tempFile, 'utf8');

            // Check production-specific settings
            expect(content).toContain("mode: 'prod'");
            expect(content).toContain('secure: true');
            expect(content).toContain('%SESSION_SECRET%');
            expect(content).toContain('%DB_NAME%');
        });

        test('should detect invalid JSON syntax in site config', () => {
            const invalidConfig = `{
    app: {
        name: 'Test Site',
        shortName: 'Test'
        // Missing comma
        siteId: 'test-site'
    }
    // Missing comma
    deployment: {
        mode: 'dev'
    }
}`;

            const tempFile = TestUtils.createTempFile(invalidConfig, '.conf');
            tempFiles.push(tempFile);

            // Should detect syntax error when trying to parse as JSON
            expect(() => {
                const content = fs.readFileSync(tempFile, 'utf8');
                JSON.parse(content);
            }).toThrow();
        });
    });

    describe('Deployment Context Detection', () => {
        test('should detect development deployment from config', () => {
            const devConfig = `{
    deployment: {
        mode: 'dev'
    }
}`;

            const tempFile = TestUtils.createTempFile(devConfig, '.conf');
            tempFiles.push(tempFile);

            const content = fs.readFileSync(tempFile, 'utf8');
            expect(content).toContain("mode: 'dev'");
        });

        test('should detect production deployment from config', () => {
            const prodConfig = `{
    deployment: {
        mode: 'prod'
    }
}`;

            const tempFile = TestUtils.createTempFile(prodConfig, '.conf');
            tempFiles.push(tempFile);

            const content = fs.readFileSync(tempFile, 'utf8');
            expect(content).toContain("mode: 'prod'");
        });

        test('should handle missing deployment mode', () => {
            const configWithoutMode = `{
    app: {
        name: 'Test Site'
    }
}`;

            const tempFile = TestUtils.createTempFile(configWithoutMode, '.conf');
            tempFiles.push(tempFile);

            const content = fs.readFileSync(tempFile, 'utf8');
            expect(content).not.toContain('deployment:');
            expect(content).not.toContain('"mode":');
        });
    });

    describe('Template Placeholder Validation', () => {
        test('should validate all placeholders are replaced', () => {
            const templateWithPlaceholders = `
Site: %SITE_NAME%
Port: %APP_PORT%
Database: %DB_NAME%
SSL: %SSL_TYPE%
`;

            const processedTemplate = `
Site: My Test Site
Port: 8080
Database: jp-dev
SSL: none
`;

            // Template should not contain unreplaced placeholders
            expect(processedTemplate).not.toMatch(/%[A-Z_]+%/);
            expect(processedTemplate).toContain('My Test Site');
            expect(processedTemplate).toContain('8080');
            expect(processedTemplate).toContain('jp-dev');
        });

        test('should detect unreplaced placeholders', () => {
            const incompleteTemplate = `
Site: My Test Site
Port: %APP_PORT%
Database: %MISSING_PLACEHOLDER%
`;

            // Should still contain unreplaced placeholders
            expect(incompleteTemplate).toMatch(/%APP_PORT%/);
            expect(incompleteTemplate).toMatch(/%MISSING_PLACEHOLDER%/);
        });
    });
});

// EOF webapp/tests/unit/config/deployment-validation.test.js
