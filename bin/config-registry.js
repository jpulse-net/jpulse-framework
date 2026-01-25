#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Config Registry
 * @tagline         Unified configuration registry for all jPulse tools
 * @description     Single source of truth for variable definitions, defaults, and template expansion
 * @file            bin/config-registry.js
 * @version         1.5.0
 * @release         2026-01-25
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get script file name for warning messages
const SCRIPT_FILE = 'bin/config-registry.js';

/**
 * UNIFIED CONFIG_REGISTRY - Single Source of Truth for ALL Variable Information
 * Used by configure.js, jpulse-update.js, and any other tools that need variable definitions
 * Consolidates template expansion, user prompting, and metadata in one place
 */
export const CONFIG_REGISTRY = {
    // === BASIC SITE VARIABLES ===
    SITE_NAME: {
        // Template expansion
        default: 'My jPulse Site',
        type: 'config',
        description: 'Full site name',

        // User prompting (used by configure.js)
        section: 'Basic Settings',
        prompt: async (config, deploymentType, question) => {
            config.SITE_NAME = await question('? Site name: (My jPulse Site) ') || 'My jPulse Site';
        }
    },

    SITE_SHORT_NAME: {
        // Template expansion
        default: 'My Site',
        type: 'config',
        description: 'Short site name for headers',

        // User prompting
        section: 'Basic Settings',
        prompt: async (config, deploymentType, question) => {
            config.SITE_SHORT_NAME = await question('? Site short name: (My Site) ') || 'My Site';
        }
    },

    JPULSE_SITE_ID: {
        // Template expansion
        default: 'my-jpulse-site',
        type: 'config',
        description: 'Site identifier (lowercase, no spaces)',

        // User prompting
        section: 'Basic Settings',
        prompt: async (config, deploymentType, question) => {
            const defaultId = config.SITE_NAME ? config.SITE_NAME.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : 'my-site';
            config.JPULSE_SITE_ID = await question(`? Site ID (${defaultId}): `) || defaultId;
        }
    },

    JPULSE_SITE_UUID: {
        // Template expansion
        default: () => {
            // Generate UUID v4 (W-137)
            return crypto.randomUUID();
        },
        type: 'computed',
        auto: true,
        description: 'Site UUID for license compliance reporting (auto-generated)',

        // No prompting - automatically generated once during setup
        section: 'Basic Settings',
        prompt: async (config, deploymentType, question) => {
            // Generate if not exists, otherwise keep existing value
            if (!config.JPULSE_SITE_UUID) {
                config.JPULSE_SITE_UUID = crypto.randomUUID();
            }
        }
    },

    JPULSE_LICENSE_ACCEPTANCE: {
        // Template expansion
        default: false,
        type: 'config',
        description: 'License terms acceptance',

        // User prompting
        section: 'License & Compliance',
        prompt: async (config, deploymentType, question) => {
            console.log('');
            console.log('📜 jPulse Framework License Terms:');
            console.log('');
            console.log('   Licensed under Business Source License 1.1 with Additional Terms');
            console.log('');
            console.log('   Key terms:');
            console.log('   • Free for non-production use (development, testing, staging)');
            console.log('   • Commercial license required for production deployments');
            console.log('   • Anonymous usage reporting to jpulse.net (compliance monitoring)');
            console.log('');
            console.log('   Full license: https://jpulse.net/legal/license.shtml');
            console.log('   Commercial inquiries: team@jpulse.net');
            console.log('');
            const accept = await question('? Accept license terms? (y/N): ');
            if ((accept || '').toLowerCase() !== 'y') {
                console.log('');
                console.log('❌ License terms not accepted. Setup cannot continue.');
                console.log('   For questions: team@jpulse.net');
                process.exit(1);
            }
            config.JPULSE_LICENSE_ACCEPTANCE = true;
        }
    },

    JPULSE_ADMIN_EMAIL_OPT_IN: {
        // Template expansion
        default: false,
        type: 'config',
        description: 'Opt-in to share admin email for dashboard access',

        // User prompting
        section: 'License & Compliance',
        prompt: async (config, deploymentType, question) => {
            console.log('');
            console.log('📊 Optional: Deployment Dashboard Access');
            console.log('');
            console.log('   Share admin email to access your dashboard at:');
            console.log('   https://jpulse.net/monitor/[your-uuid]');
            console.log('');
            console.log('   Provides: Compliance status, health insights, usage history');
            console.log('   Change later: site/webapp/app.conf (manifest.compliance.adminEmailOptIn)');
            console.log('');
            const optIn = await question('? Share admin email for dashboard access? (y/N): ');
            config.JPULSE_ADMIN_EMAIL_OPT_IN = (optIn || '').toLowerCase() === 'y';
        }
    },

    PORT: {
        // Template expansion
        default: (deploymentType) => deploymentType === 'dev' ? 8080 : 8081,
        type: 'computed',
        description: 'Application port',

        // User prompting
        section: 'Basic Settings',
        prompt: async (config, deploymentType, question) => {
            const defaultPort = deploymentType === 'dev' ? 8080 : 8081;
            const portInput = await question(`? Application port: (${defaultPort}) `);
            config.PORT = portInput ? parseInt(portInput) : defaultPort;
        }
    },

    // === DATABASE VARIABLES ===
    DB_ADMIN_USER: {
        // Template expansion
        default: 'admin',
        type: 'config',
        description: 'MongoDB admin username',

        // User prompting
        section: 'Database Configuration',
        prompt: async (config, deploymentType, question) => {
            config.DB_ADMIN_USER = await question('? MongoDB admin username: (admin) ') || 'admin';
        }
    },

    DB_ADMIN_PASS: {
        // Template expansion
        default: '',
        type: 'config',
        required: true,
        description: 'MongoDB admin password',

        // User prompting
        section: 'Database Configuration',
        prompt: async (config, deploymentType, question) => {
            config.DB_ADMIN_PASS = await question('? MongoDB admin password: (required) ');
            while (!config.DB_ADMIN_PASS) {
                console.log('❌ Admin password is required');
                config.DB_ADMIN_PASS = await question('? MongoDB admin password: ');
            }
        }
    },

    DB_USER: {
        // Template expansion
        default: 'jpapp',
        type: 'config',
        description: 'MongoDB application username',

        // User prompting
        section: 'Database Configuration',
        prompt: async (config, deploymentType, question) => {
            config.DB_USER = await question('? MongoDB app username: (jpapp) ') || 'jpapp';
        }
    },

    DB_PASS: {
        // Template expansion
        default: '',
        type: 'config',
        required: true,
        description: 'MongoDB application password',

        // User prompting
        section: 'Database Configuration',
        prompt: async (config, deploymentType, question) => {
            config.DB_PASS = await question('? MongoDB app password: (required) ');
            while (!config.DB_PASS) {
                console.log('❌ App password is required');
                config.DB_PASS = await question('? MongoDB app password: ');
            }
        }
    },

    DB_NAME: {
        // Template expansion
        default: (deploymentType) => deploymentType === 'dev' ? 'jp-dev' : 'jp-prod',
        type: 'computed',
        description: 'MongoDB database name',

        // User prompting
        section: 'Database Configuration',
        prompt: async (config, deploymentType, question) => {
            const defaultName = deploymentType === 'dev' ? 'jp-dev' : 'jp-prod';
            config.DB_NAME = await question(`? Database name: (${defaultName}) `) || defaultName;
        }
    },

    DB_HOST: {
        // Template expansion
        default: '',
        type: 'config',
        conditional: true,
        description: 'MongoDB host (empty for localhost)',

        // User prompting
        section: 'Database Configuration',
        condition: (config, deploymentType) => deploymentType === 'prod',
        prompt: async (config, deploymentType, question) => {
            config.DB_HOST = await question('? MongoDB host (leave empty for localhost): ') || '';
        }
    },

    DB_PORT: {
        // Template expansion
        default: '',
        type: 'config',
        conditional: true,
        description: 'MongoDB port (empty for default 27017)',

        // User prompting
        section: 'Database Configuration',
        condition: (config, deploymentType) => deploymentType === 'prod',
        prompt: async (config, deploymentType, question) => {
            config.DB_PORT = await question('? MongoDB port (leave empty for default): ') || '';
        }
    },

    DB_REPLICA_SET: {
        // Template expansion
        default: '',
        type: 'config',
        conditional: true,
        description: 'MongoDB replica set name',

        // User prompting
        section: 'Database Configuration',
        condition: (config, deploymentType) => deploymentType === 'prod',
        prompt: async (config, deploymentType, question) => {
            config.DB_REPLICA_SET = await question('? MongoDB replica set (leave empty if none): ') || '';
        }
    },

    // === SECURITY VARIABLES ===
    SESSION_SECRET: {
        // Template expansion
        default: () => {
            try {
                return crypto.randomBytes(32).toString('hex');
            } catch (error) {
                // Fallback for environments without crypto
                return 'default-session-secret-change-in-production';
            }
        },
        type: 'computed',
        description: 'Session encryption secret',

        // User prompting (RESTORED)
        section: 'Security Configuration',
        prompt: async (config, deploymentType, question) => {
            console.log('\n🔐 Security Configuration:\n');
            console.log('📋 Session secret (for encrypting user sessions)...');
            console.log('💡 Generate secure passphrase: https://www.keepersecurity.com/features/passphrase-generator/');
            const userInput = await question('? Session secret (leave empty for auto-generation): ');
            if (userInput.trim()) {
                if (userInput.length < 16) {
                    console.log(`⚠️  WARNING: Session secret should be at least 16 characters [${SCRIPT_FILE}]`);
                }
                config.SESSION_SECRET = userInput.trim();
            }
            // If empty, will use auto-generated default
        }
    },

    // === REDIS VARIABLES ===
    REDIS_MODE: {
        default: 'single',
        type: 'config',
        description: 'Redis mode: single or cluster',

        section: 'Redis Configuration',
        prompt: async (config, deploymentType, question) => {
            console.log('\n📦 Redis Configuration (Required for multi-instance/multi-server deployments):\n');
            console.log('  single:  One Redis server (development, single-server production)');
            console.log('  cluster: Redis Cluster (high-availability production)');
            config.REDIS_MODE = await question('? Redis mode: (single) ') || 'single';
        }
    },

    REDIS_HOST: {
        default: 'localhost',
        type: 'config',
        description: 'Redis host (single mode)',

        section: 'Redis Configuration',
        prompt: async (config, deploymentType, question) => {
            if (config.REDIS_MODE === 'single') {
                config.REDIS_HOST = await question('? Redis host: (localhost) ') || 'localhost';
            } else {
                config.REDIS_HOST = 'localhost';  // Not used in cluster mode
            }
        }
    },

    REDIS_PORT: {
        default: 6379,
        type: 'config',
        description: 'Redis port (single mode)',

        section: 'Redis Configuration',
        prompt: async (config, deploymentType, question) => {
            if (config.REDIS_MODE === 'single') {
                const port = await question('? Redis port: (6379) ');
                config.REDIS_PORT = port ? parseInt(port) : 6379;
            } else {
                config.REDIS_PORT = 6379;  // Not used in cluster mode
            }
        }
    },

    REDIS_PASSWORD: {
        default: '',
        type: 'config',
        description: 'Redis password (empty for no auth)',

        section: 'Redis Configuration',
        prompt: async (config, deploymentType, question) => {
            config.REDIS_PASSWORD = await question('? Redis password (empty for none): ') || '';
        }
    },

    REDIS_CLUSTER_NODES: {
        default: '[{host:"localhost",port:7000},{host:"localhost",port:7001},{host:"localhost",port:7002}]',
        type: 'config',
        description: 'Redis cluster nodes JSON array',

        section: 'Redis Configuration',
        prompt: async (config, deploymentType, question) => {
            if (config.REDIS_MODE === 'cluster') {
                console.log('  Example: [{host:"redis1.example.com",port:7000},{host:"redis2.example.com",port:7001}]');
                const input = await question('? Redis cluster nodes (JSON array): ');
                config.REDIS_CLUSTER_NODES = input || '[{host:"localhost",port:7000},{host:"localhost",port:7001},{host:"localhost",port:7002}]';
            } else {
                config.REDIS_CLUSTER_NODES = '[]';  // Empty array for single mode
            }
        }
    },

    // === DEPLOYMENT VARIABLES ===
    JPULSE_PM2_INSTANCES: {
        // Template expansion
        default: (deploymentType) => deploymentType === 'dev' ? 1 : 'max',
        type: 'computed',
        description: 'Number of PM2 instances',

        // User prompting
        section: 'Deployment Configuration',
        condition: (config, deploymentType) => deploymentType === 'prod',
        prompt: async (config, deploymentType, question) => {
            const defaultInstances = deploymentType === 'dev' ? 1 : 'max';
            const instanceInput = await question(`? PM2 instances (${defaultInstances}): `) || defaultInstances;
            config.JPULSE_PM2_INSTANCES = instanceInput === 'max' ? 'max' : parseInt(instanceInput) || defaultInstances;
        }
    },

    JPULSE_DOMAIN_NAME: {
        // Template expansion
        default: 'localhost',
        type: 'config',
        conditional: true,
        description: 'Domain name for production',

        // User prompting
        section: 'Deployment Configuration',
        condition: (config, deploymentType) => deploymentType === 'prod',
        prompt: async (config, deploymentType, question) => {
            config.JPULSE_DOMAIN_NAME = await question('? Domain name: (localhost) ') || 'localhost';
        }
    },

    JPULSE_SSL_TYPE: {
        // Template expansion
        default: 'none',
        type: 'config',
        conditional: true,
        description: 'SSL certificate type',

        // User prompting
        section: 'Deployment Configuration',
        condition: (config, deploymentType) => deploymentType === 'prod',
        prompt: async (config, deploymentType, question) => {
            console.log('? SSL certificate type:');
            console.log('  1) None (HTTP only)');
            console.log('  2) Let\'s Encrypt');
            console.log('  3) Custom certificate');
            const sslChoice = await question('? Choose (1-3): (1) ') || '1';

            const sslTypes = { '1': 'none', '2': 'letsencrypt', '3': 'custom' };
            config.JPULSE_SSL_TYPE = sslTypes[sslChoice] || 'none';

            if (config.JPULSE_SSL_TYPE === 'letsencrypt') {
                console.log('💡 Let\'s Encrypt selected. After configuration, run:');
                console.log(`   sudo certbot certonly --webroot -w /var/www/html -d ${config.JPULSE_DOMAIN_NAME || 'your-domain.com'}`);
                console.log('💡 Certificate paths will be auto-configured in nginx config.');
            }
        }
    },

    SSL_CERT_PATH: {
        // Template expansion
        default: (deploymentType, config) => {
            if (config.JPULSE_SSL_TYPE === 'letsencrypt' && config.JPULSE_DOMAIN_NAME) {
                return `/etc/letsencrypt/live/${config.JPULSE_DOMAIN_NAME}/fullchain.pem`;
            }
            return '';
        },
        type: 'computed',
        conditional: true,
        description: 'SSL certificate file path',

        // User prompting
        section: 'Deployment Configuration',
        condition: (config, deploymentType) => deploymentType === 'prod' && config.JPULSE_SSL_TYPE === 'custom',
        prompt: async (config, deploymentType, question) => {
            config.SSL_CERT_PATH = await question('? SSL certificate path: ') || '';
        }
    },

    SSL_KEY_PATH: {
        // Template expansion
        default: (deploymentType, config) => {
            if (config.JPULSE_SSL_TYPE === 'letsencrypt' && config.JPULSE_DOMAIN_NAME) {
                return `/etc/letsencrypt/live/${config.JPULSE_DOMAIN_NAME}/privkey.pem`;
            }
            return '';
        },
        type: 'computed',
        conditional: true,
        description: 'SSL private key file path',

        // User prompting
        section: 'Deployment Configuration',
        condition: (config, deploymentType) => deploymentType === 'prod' && config.JPULSE_SSL_TYPE === 'custom',
        prompt: async (config, deploymentType, question) => {
            config.SSL_KEY_PATH = await question('? SSL private key path: ') || '';
        }
    },

    JPULSE_DEPLOYMENT_TYPE: {
        // Template expansion
        default: (deploymentType) => deploymentType,
        type: 'computed',
        description: 'Deployment type (dev/prod)'
        // No user prompting - determined by setup flow
    },

    NODE_ENV: {
        // Template expansion
        default: (deploymentType) => deploymentType === 'prod' ? 'production' : 'development',
        type: 'computed',
        description: 'Node.js environment'
        // No user prompting - computed from deployment type
    },

    // === LOGGING VARIABLES ===
    LOG_DIR: {
        // Template expansion
        default: '',
        type: 'config',
        conditional: true,
        description: 'Log directory (empty for STDOUT)',

        // User prompting
        section: 'Logging Configuration',
        condition: (config, deploymentType) => deploymentType === 'prod',
        prompt: async (config, deploymentType, question) => {
            console.log('? Log output:');
            console.log('  1) STDOUT (console output)');
            console.log('  2) File logging (select this when using pm2)');
            const logChoice = await question('? Choose (1-2): (1) ') || '1';

            if (logChoice === '2') {
                // Use site ID for default log directory
                const defaultLogDir = `/var/log/${config.JPULSE_SITE_ID || 'jpulse'}`;
                let logDirInput = await question(`? Log directory: (${defaultLogDir}) `) || defaultLogDir;

                // Validate log directory path
                if (!logDirInput.startsWith('/') && logDirInput !== '') {
                    console.log(`⚠️  WARNING: '${logDirInput}' is not an absolute path. Using default: ${defaultLogDir} [${SCRIPT_FILE}]`);
                    logDirInput = defaultLogDir;
                }

                config.LOG_DIR = logDirInput;
            } else {
                config.LOG_DIR = '';
            }
        }
    },

    LOG_FILE_NAME: {
        // Template expansion
        default: 'access.log',
        type: 'config',
        description: 'Access log filename'
        // No user prompting - uses default
    },

    ERROR_FILE_NAME: {
        // Template expansion
        default: 'pm2-errors.log',
        type: 'config',
        description: 'Error log filename'
        // No user prompting - uses default
    },

    PM2_LOG_FILE: {
        // Template expansion
        default: (deploymentType, config) => config.LOG_DIR ? `${config.LOG_DIR}/${config.LOG_FILE_NAME || 'access.log'}` : '/dev/null',
        type: 'computed',
        description: 'PM2 log file path'
        // No user prompting - computed from LOG_DIR
    },

    PM2_ERROR_FILE: {
        // Template expansion
        default: (deploymentType, config) => config.LOG_DIR ? `${config.LOG_DIR}/${config.ERROR_FILE_NAME || 'pm2-errors.log'}` : '/dev/null',
        type: 'computed',
        description: 'PM2 error file path'
        // No user prompting - computed from LOG_DIR
    },

    // === FRAMEWORK METADATA ===
    JPULSE_FRAMEWORK_VERSION: {
        // Template expansion
        default: () => {
            try {
                const packagePath = path.join(__dirname, '..', 'package.json');
                return JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
            } catch (error) {
                return '0.0.0';
            }
        },
        type: 'computed',
        description: 'jPulse Framework version'
        // No user prompting - computed from package.json
    },

    GENERATION_DATE: {
        // Template expansion
        default: () => new Date().toISOString().split('T')[0],
        type: 'computed',
        description: 'Configuration generation date'
        // No user prompting - computed from current date
    },


    // === LEGACY MAPPINGS (for backward compatibility) ===
    DOMAIN_NAME: {
        maps_to: 'JPULSE_DOMAIN_NAME',
        description: 'Legacy mapping to JPULSE_DOMAIN_NAME'
    },
    DEPLOYMENT_TYPE: {
        maps_to: 'JPULSE_DEPLOYMENT_TYPE',
        description: 'Legacy mapping to JPULSE_DEPLOYMENT_TYPE'
    },
    FRAMEWORK_VERSION: {
        maps_to: 'JPULSE_FRAMEWORK_VERSION',
        description: 'Legacy mapping to JPULSE_FRAMEWORK_VERSION'
    }
};

/**
 * Build complete configuration with all variables resolved
 */
export function buildCompleteConfig(userConfig = {}, deploymentType = 'prod') {
    const completeConfig = { ...userConfig };

    // Process all variables in CONFIG_REGISTRY
    Object.entries(CONFIG_REGISTRY).forEach(([varName, definition]) => {
        // Skip legacy mappings - they're handled separately
        if (definition.maps_to) return;

        // For computed fields, handle differently - recompute if empty/undefined, but preserve user values
        if (definition.type === 'computed') {
            // If user already provided a non-empty value, don't recompute (preserve user input like PORT)
            if (completeConfig[varName] !== undefined && completeConfig[varName] !== '') {
                return; // Keep user's value
            }

            // Only recompute if value is empty/undefined and default is a function
            if (typeof definition.default === 'function') {
                try {
                    const computedValue = definition.default(deploymentType, completeConfig);
                    // Set computed value (even if empty, to ensure it's computed)
                    completeConfig[varName] = computedValue;
                } catch (error) {
                    console.log(`⚠️  WARNING: Could not compute ${varName}: ${error.message} [${SCRIPT_FILE}]`);
                    if (completeConfig[varName] === undefined) {
                        completeConfig[varName] = '';
                    }
                }
            }
            return;
        }

        // For non-computed fields, skip if user already provided this value
        if (completeConfig[varName] !== undefined) return;

        // Resolve default value for non-computed fields
        let defaultValue = definition.default;

        if (typeof defaultValue === 'function') {
            try {
                defaultValue = defaultValue(deploymentType, completeConfig);
            } catch (error) {
                console.log(`⚠️  WARNING: Could not resolve ${varName}: ${error.message} [${SCRIPT_FILE}]`);
                defaultValue = '';
            }
        }

        completeConfig[varName] = defaultValue;
    });

    return completeConfig;
}

/**
 * UNIFIED TEMPLATE EXPANSION - Single function for ALL variable expansion
 * Used by configure.js, jpulse-update.js, and any other tools
 */
export function expandAllVariables(content, userConfig = {}, deploymentType = 'prod') {
    // Build complete configuration with all defaults
    const completeConfig = buildCompleteConfig(userConfig, deploymentType);

    // Single expansion logic for ALL variables
    let result = content.replace(/%([A-Z0-9_]+)%/g, (match, varName) => {
        // Check if it's a legacy mapping
        const definition = CONFIG_REGISTRY[varName];
        if (definition && definition.maps_to) {
            const mappedValue = completeConfig[definition.maps_to];
            return mappedValue !== undefined ? mappedValue.toString() : match;
        }

        // Regular variable lookup
        const value = completeConfig[varName];
        return value !== undefined ? value.toString() : match;
    });

    return result;
}

// EOF bin/config-registry.js
