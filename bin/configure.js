#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Site Configure
 * @tagline         Interactive site configuration and deployment setup CLI tool
 * @description     Creates and configures jPulse sites with smart detection (W-054)
 * @file            bin/configure.js
 * @version         0.7.6
 * @release         2025-09-16
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.dirname(__dirname);

// Interactive prompt interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Promisified readline question
 */
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

/**
 * Detect current directory state
 */
function detectDirectoryState() {
    const files = fs.readdirSync('.').filter(f => !f.startsWith('.'));

    // Empty directory
    if (files.length === 0) {
        return 'empty';
    }

    // Existing jPulse site
    if (fs.existsSync('webapp') && fs.existsSync('package.json')) {
        return 'jpulse-site';
    }

    // Has jPulse in node_modules
    if (fs.existsSync('node_modules/@peterthoeny/jpulse-framework')) {
        return 'jpulse-dependency';
    }

    // Has package.json and site directory (partial setup)
    if (fs.existsSync('package.json') && fs.existsSync('site')) {
        return 'jpulse-partial';
    }

    // Unknown state
    return 'unknown';
}

/**
 * Parse existing .env file to get current variables
 */
function parseEnvFile(filePath) {
    const vars = {};
    if (!fs.existsSync(filePath)) return vars;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('export ') && trimmed.includes('=')) {
            const exportLine = trimmed.substring(7); // Remove 'export '
            const [key, ...valueParts] = exportLine.split('=');
            const value = valueParts.join('='); // Handle values with = in them
            vars[key] = value.replace(/^['"]|['"]$/g, ''); // Remove quotes
        }
    }

    return vars;
}

/**
 * Parse template sections based on empty line delimiters
 */
function parseTemplateSections(templatePath) {
    const sections = {};
    if (!fs.existsSync(templatePath)) return sections;

    const content = fs.readFileSync(templatePath, 'utf8');
    const lines = content.split('\n');
    let currentSection = [];
    let inHeaderSection = true;

    for (const line of lines) {
        // Skip header section (until first empty line after ##)
        if (inHeaderSection) {
            if (line.trim() === '' && currentSection.some(l => l.includes('##'))) {
                inHeaderSection = false;
                currentSection = [];
            } else {
                currentSection.push(line);
            }
            continue;
        }

        if (line.trim() === '') {
            // Empty line = end of section
            if (currentSection.length > 0) {
                // Find the export variable(s) in this section
                const exportLines = currentSection.filter(l => l.trim().startsWith('export '));
                exportLines.forEach(exportLine => {
                    const varName = exportLine.trim().substring(7).split('=')[0];
                    sections[varName] = currentSection.join('\n');
                });
                currentSection = [];
            }
        } else {
            currentSection.push(line);
        }
    }

    // Handle last section (no trailing empty line)
    if (currentSection.length > 0) {
        const exportLines = currentSection.filter(l => l.trim().startsWith('export '));
        exportLines.forEach(exportLine => {
            const varName = exportLine.trim().substring(7).split('=')[0];
            sections[varName] = currentSection.join('\n');
        });
    }

    return sections;
}

/**
 * Get all possible configuration variables from template
 */
function getAllConfigVariables(templatePath) {
    const sections = parseTemplateSections(templatePath);
    return Object.keys(sections);
}

/**
 * Check if new framework features need configuration
 */
async function checkForNewFeatures() {
    try {
        // Parse existing .env
        const existingVars = parseEnvFile('.env');

        // Get all possible variables from framework template
        const templatePath = path.join(packageRoot, 'templates/deploy/env.tmpl');
        const allVars = getAllConfigVariables(templatePath);

        // Check if any variables are missing
        const missingVars = allVars.filter(varName => !existingVars.hasOwnProperty(varName));

        return missingVars.length > 0;

    } catch (error) {
        // If any error, assume needs configuration
        return true;
    }
}

/**
 * Configure only new features (incremental configuration)
 */
async function configureNewFeaturesOnly() {
    console.log('🔧 Configuring new framework features...\n');

    try {
        // Parse existing .env and template
        const existingVars = parseEnvFile('.env');
        const templatePath = path.join(packageRoot, 'templates/deploy/env.tmpl');
        const templateSections = parseTemplateSections(templatePath);
        const allVars = Object.keys(templateSections);

        // Find missing variables
        const missingVars = allVars.filter(varName => !existingVars.hasOwnProperty(varName));

        if (missingVars.length === 0) {
            console.log('✅ No new configuration needed - all variables are already set.');
            process.exit(0);
        }

        console.log(`📋 Found ${missingVars.length} new configuration variable(s): ${missingVars.join(', ')}\n`);

        // Load framework package info
        const frameworkPackage = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

        // Create config object with existing values
        const config = { ...existingVars };

        // Ask questions only for missing variables using unified approach
        for (const varName of missingVars) {
            await promptForVariable(varName, config, 'prod', true); // Assume prod for incremental
        }

        // Update framework version
        config.JPULSE_FRAMEWORK_VERSION = frameworkPackage.version;

        // Generate updated .env file
        await generateIncrementalEnv(existingVars, config, templateSections, missingVars);

        console.log('\n✅ Configuration updated successfully!');
        console.log('💡 Run "npm run jpulse-validate" to test your configuration.');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error during incremental configuration:', error.message);
        console.log('💡 Try "Reconfigure from scratch" instead.');
        process.exit(1);
    }
}

/**
 * Unified configuration definitions - single source of truth
 */
const CONFIG_DEFINITIONS = {
    // Basic site configuration - one question per variable
    SITE_NAME: {
        section: 'Basic Settings',
        prompt: async (config, deploymentType) => {
            config.SITE_NAME = await question('? Site name: (My jPulse Site) ') || 'My jPulse Site';
        }
    },

    SITE_SHORT_NAME: {
        section: 'Basic Settings',
        prompt: async (config, deploymentType) => {
            config.SITE_SHORT_NAME = await question('? Site short name: (My Site) ') || 'My Site';
        }
    },

    JPULSE_SITE_ID: {
        section: 'Basic Settings',
        prompt: async (config, deploymentType) => {
            // Auto-generate from site name
            const defaultId = config.SITE_NAME ? config.SITE_NAME.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : 'my-site';
            config.JPULSE_SITE_ID = await question(`? Site ID (${defaultId}): `) || defaultId;
        }
    },

    PORT: {
        section: 'Basic Settings',
        prompt: async (config, deploymentType) => {
            const defaultPort = deploymentType === 'dev' ? 8080 : 8081;
            const portInput = await question(`? Application port: (${defaultPort}) `);
            config.PORT = portInput ? parseInt(portInput) : defaultPort;
        }
    },

    // Database configuration
    DB_ADMIN_USER: {
        section: 'Database Configuration',
        prompt: async (config) => {
            config.DB_ADMIN_USER = await question('? MongoDB admin username: (admin) ') || 'admin';
        }
    },

    DB_ADMIN_PASS: {
        section: 'Database Configuration',
        prompt: async (config) => {
            config.DB_ADMIN_PASS = await question('? MongoDB admin password: (required) ');
            while (!config.DB_ADMIN_PASS) {
                console.log('❌ Admin password is required');
                config.DB_ADMIN_PASS = await question('? MongoDB admin password: ');
            }
        }
    },

    DB_USER: {
        section: 'Database Configuration',
        prompt: async (config) => {
            config.DB_USER = await question('? MongoDB app username: (jpapp) ') || 'jpapp';
        }
    },

    DB_PASS: {
        section: 'Database Configuration',
        prompt: async (config) => {
            config.DB_PASS = await question('? MongoDB app password: (required) ');
            while (!config.DB_PASS) {
                console.log('❌ App password is required');
                config.DB_PASS = await question('? MongoDB app password: ');
            }
        }
    },

    DB_NAME: {
        section: 'Database Configuration',
        prompt: async (config, deploymentType) => {
            const dbPrefix = deploymentType === 'dev' ? 'jp-dev' : 'jp-prod';
            config.DB_NAME = await question(`? Database name: (${dbPrefix}) `) || dbPrefix;
        }
    },

    // Security
    SESSION_SECRET: {
        section: 'Security Settings',
        prompt: async (config) => {
            const defaultSecret = generateSessionSecret();
            const secretInput = await question(`? Session secret: (${defaultSecret}) `);
            config.SESSION_SECRET = secretInput || defaultSecret;
        }
    },

    // Production settings
    JPULSE_DOMAIN_NAME: {
        section: 'Production Settings',
        condition: (config, deploymentType) => deploymentType === 'prod',
        prompt: async (config) => {
            config.JPULSE_DOMAIN_NAME = await question('? Domain name: (localhost) ') || 'localhost';
        }
    },

    JPULSE_SSL_TYPE: {
        section: 'Production Settings',
        condition: (config, deploymentType) => deploymentType === 'prod',
        prompt: async (config) => {
            console.log('? SSL certificate type:');
            console.log('  1) Let\'s Encrypt (recommended)');
            console.log('  2) Custom certificate paths');
            console.log('  3) No SSL (development only)');
            const sslChoice = await question('? Choose (1-3): (1) ') || '1';

            if (sslChoice === '1') {
                config.JPULSE_SSL_TYPE = 'letsencrypt';
            } else if (sslChoice === '2') {
                config.JPULSE_SSL_TYPE = 'custom';
            } else {
                config.JPULSE_SSL_TYPE = 'none';
            }
        }
    },

    SSL_CERT_PATH: {
        section: 'Production Settings',
        condition: (config, deploymentType) => deploymentType === 'prod',
        prompt: async (config) => {
            if (config.JPULSE_SSL_TYPE === 'custom') {
                config.SSL_CERT_PATH = await question('? SSL certificate path: ') || '';
            } else {
                config.SSL_CERT_PATH = '';
            }
        }
    },

    SSL_KEY_PATH: {
        section: 'Production Settings',
        condition: (config, deploymentType) => deploymentType === 'prod',
        prompt: async (config) => {
            if (config.JPULSE_SSL_TYPE === 'custom') {
                config.SSL_KEY_PATH = await question('? SSL private key path: ') || '';
            } else {
                config.SSL_KEY_PATH = '';
            }
        }
    },

    JPULSE_PM2_INSTANCES: {
        section: 'PM2 Configuration',
        prompt: async (config, deploymentType) => {
            if (deploymentType === 'prod') {
                console.log('? PM2 instances for production:');
                console.log('  1) Auto-detect (max CPU cores)');
                console.log('  2) Custom number');
                const pm2Choice = await question('? Choose (1-2): (1) ') || '1';

                if (pm2Choice === '2') {
                    const instancesInput = await question('? Number of instances (1-16): ');
                    config.JPULSE_PM2_INSTANCES = parseInt(instancesInput) || 'max';
                } else {
                    config.JPULSE_PM2_INSTANCES = 'max';
                }
            } else {
                config.JPULSE_PM2_INSTANCES = 1;
            }
        }
    },

    LOG_DIR: {
        section: 'Logging Configuration',
        prompt: async (config, deploymentType) => {
            if (deploymentType === 'prod') {
                console.log('? Log configuration:');
                console.log('  1) Log to STDOUT (app logs to console, PM2 logs to /dev/null)');
                console.log('  2) Log to custom directory (app and PM2 use specified directory)');
                const logChoice = await question('? Choose (1-2): (1) ') || '1';

                if (logChoice === '2') {
                    const defaultLogDir = '/var/log/jpulse';
                    let logDirInput = await question(`? Log directory: (${defaultLogDir}) `);
                    logDirInput = logDirInput || defaultLogDir;

                    // Validate log directory path
                    if (!logDirInput.startsWith('/') && logDirInput !== '') {
                        console.log(`⚠️  Warning: '${logDirInput}' is not an absolute path. Using default: ${defaultLogDir}`);
                        logDirInput = defaultLogDir;
                    }

                    config.LOG_DIR = logDirInput;
                } else {
                    config.LOG_DIR = ''; // Empty means STDOUT for app, PM2 uses defaults
                }
            } else {
                config.LOG_DIR = ''; // Development always uses STDOUT
            }
        }
    },

    LOG_FILE_NAME: {
        section: 'Logging Configuration',
        prompt: async (config, deploymentType) => {
            config.LOG_FILE_NAME = await question('? Application log file name: (access.log) ') || 'access.log';
        }
    },

    ERROR_FILE_NAME: {
        section: 'Logging Configuration',
        prompt: async (config, deploymentType) => {
            config.ERROR_FILE_NAME = await question('? PM2 error log file name: (pm2-errors.log) ') || 'pm2-errors.log';
        }
    },

    // Calculated PM2 log paths (resolved at template time)
    PM2_LOG_FILE: {
        auto: true,
        prompt: async (config, deploymentType) => {
            // Calculate PM2 log file path based on LOG_DIR
            if (config.LOG_DIR && config.LOG_DIR.trim() !== '') {
                config.PM2_LOG_FILE = `${config.LOG_DIR}/${config.LOG_FILE_NAME}`;
            } else {
                config.PM2_LOG_FILE = '/dev/null';
            }
        }
    },

    PM2_ERROR_FILE: {
        auto: true,
        prompt: async (config, deploymentType) => {
            // Calculate PM2 error file path based on LOG_DIR
            if (config.LOG_DIR && config.LOG_DIR.trim() !== '') {
                config.PM2_ERROR_FILE = `${config.LOG_DIR}/${config.ERROR_FILE_NAME}`;
            } else {
                config.PM2_ERROR_FILE = '/dev/null';
            }
        }
    },

    // Auto-set variables
    JPULSE_DEPLOYMENT_TYPE: {
        auto: true,
        prompt: async (config, deploymentType) => {
            config.JPULSE_DEPLOYMENT_TYPE = deploymentType;
        }
    },

    NODE_ENV: {
        auto: true,
        prompt: async (config, deploymentType) => {
            config.NODE_ENV = deploymentType === 'dev' ? 'development' : 'production';
        }
    },

    // Framework version tracking
    JPULSE_FRAMEWORK_VERSION: {
        auto: true,
        prompt: async (config, deploymentType) => {
            // This gets set later with actual framework version
        }
    },

    // Optional remote MongoDB
    DB_HOST: {
        section: 'Remote MongoDB Configuration (optional)',
        prompt: async (config) => {
            console.log('? MongoDB configuration:');
            console.log('  1) Local MongoDB (recommended)');
            console.log('  2) Remote MongoDB');
            const dbChoice = await question('? Choose (1-2): (1) ') || '1';
            config.DB_HOST = dbChoice === '2' ? (await question('? MongoDB host: ') || 'localhost') : '';
        }
    },

    DB_PORT: {
        section: 'Remote MongoDB Configuration (optional)',
        condition: (config) => config.DB_HOST,
        prompt: async (config) => {
            config.DB_PORT = await question('? MongoDB port (27017): ') || '27017';
        }
    },

    DB_REPLICA_SET: {
        section: 'Remote MongoDB Configuration (optional)',
        condition: (config) => config.DB_HOST,
        prompt: async (config) => {
            config.DB_REPLICA_SET = await question('? MongoDB replica set (optional): ') || '';
        }
    }
};

/**
 * Unified configuration prompting - works for both full and incremental setup
 */
async function promptForVariable(varName, config, deploymentType, isIncremental = false) {
    const definition = CONFIG_DEFINITIONS[varName];
    if (!definition) {
        console.log(`⚠️  Unknown variable: ${varName}`);
        config[varName] = await question(`? ${varName}: `) || '';
        return;
    }

    // Check condition if specified
    if (definition.condition && !definition.condition(config, deploymentType)) {
        return;
    }

    // Show section header for full setup (not incremental)
    if (!isIncremental && definition.section && !definition.auto) {
        console.log(`\n${definition.section === 'Basic Settings' ? '📋' :
                     definition.section === 'Database Configuration' ? '🗄️' :
                     definition.section === 'Security Settings' ? '🔐' :
                     definition.section === 'Production Settings' ? '🌐' :
                     definition.section === 'PM2 Configuration' ? '⚡' :
                     definition.section === 'Logging Configuration' ? '📋' :
                     '🔧'} ${definition.section}:\n`);
    }

    // Execute the prompt
    await definition.prompt(config, deploymentType);
}

/**
 * Generate incremental .env file by appending new sections
 */
async function generateIncrementalEnv(existingVars, config, templateSections, missingVars) {
    // Backup existing .env
    if (fs.existsSync('.env')) {
        fs.copyFileSync('.env', '.env.backup');
        console.log('📦 Backed up existing .env to .env.backup');
    }

    // Read existing .env content
    let envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';

    // Ensure content ends with newline
    if (envContent && !envContent.endsWith('\n')) {
        envContent += '\n';
    }

    // Add new sections for missing variables (avoid duplicates)
    const addedSections = new Set();
    for (const varName of missingVars) {
        const section = templateSections[varName];
        if (section && !addedSections.has(section)) {
            // Expand placeholders in the section
            const expandedSection = expandTemplatePlaceholders(section, config);
            envContent += '\n' + expandedSection + '\n';
            addedSections.add(section);
        }
    }

    // Update framework version in existing content if it exists
    if (existingVars.hasOwnProperty('JPULSE_FRAMEWORK_VERSION')) {
        envContent = envContent.replace(
            /export JPULSE_FRAMEWORK_VERSION=.*/,
            `export JPULSE_FRAMEWORK_VERSION=${config.JPULSE_FRAMEWORK_VERSION}`
        );
    }

    // Write updated .env
    fs.writeFileSync('.env', envContent);
}

/**
 * Expand template placeholders with actual values - clean direct mapping
 */
function expandTemplatePlaceholders(content, config) {
    let expanded = content;

    // Direct replacement - variable names match placeholders exactly
    Object.entries(config).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            const regex = new RegExp(`%${key}%`, 'g');
            expanded = expanded.replace(regex, value.toString());
        }
    });

    return expanded;
}

/**
 * Generate secure session secret
 */
function generateSessionSecret() {
    const adjectives = ['Silly', 'Happy', 'Brave', 'Swift', 'Clever', 'Bright', 'Calm', 'Bold'];
    const directions = ['Upward', 'Forward', 'Onward', 'Skyward', 'Inward', 'Outward'];
    const animals = ['Nest', 'Fox', 'Bear', 'Eagle', 'Wolf', 'Hawk', 'Owl', 'Deer'];
    const creatures = ['Bat', 'Cat', 'Elk', 'Bee', 'Ant', 'Owl', 'Jay', 'Ram'];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const creature = creatures[Math.floor(Math.random() * creatures.length)];
    const num = Math.floor(Math.random() * 100);

    return `${adj}-${dir}-${animal}-${creature}-${num}`;
}

/**
 * Get test configuration when in test mode
 */
function getTestConfiguration(deploymentType) {
    const siteName = process.env.JPULSE_TEST_SITE_NAME || 'Test Site';
    return {
        SITE_NAME: siteName,
        SITE_SHORT_NAME: 'Test Site',
        JPULSE_SITE_ID: siteName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'test-site',
        PORT: deploymentType === 'dev' ? 8080 : 8081,
        DB_ADMIN_USER: 'admin',
        DB_ADMIN_PASS: 'test-admin-pass',
        DB_USER: 'jpapp',
        DB_PASS: 'test-app-pass',
        DB_NAME: deploymentType === 'dev' ? 'jp-dev' : 'jp-prod',
        SESSION_SECRET: 'test-session-secret-123',
        JPULSE_PM2_INSTANCES: deploymentType === 'dev' ? 1 : 'max',
        JPULSE_DOMAIN_NAME: 'localhost',
        JPULSE_SSL_TYPE: 'none',
        LOG_DIR: '', // Test mode uses STDOUT (empty LOG_DIR)
        LOG_FILE_NAME: 'access.log',
        ERROR_FILE_NAME: 'pm2-errors.log',
        PM2_LOG_FILE: '/dev/null', // Calculated: empty LOG_DIR means /dev/null
        PM2_ERROR_FILE: '/dev/null', // Calculated: empty LOG_DIR means /dev/null
        generateDeployment: process.env.JPULSE_TEST_GENERATE_DEPLOY === 'true'
    };
}

/**
 * Unified configuration prompting - eliminates duplication
 */
async function promptConfiguration(deploymentType, existingVars = {}) {
    // Check if we're in test mode
    if (process.env.JPULSE_TEST_MODE === 'true') {
        console.log('🧪 Running in test mode with default configuration');
        return getTestConfiguration(deploymentType);
    }

    console.log('📋 Configuration Settings:\n');

    // Start with existing variables (for incremental updates)
    const config = { ...existingVars };

    // Determine if this is first time setup
    const firstTime = Object.keys(existingVars).length === 0;

    // Get all possible variables from template to determine what's new
    const templatePath = path.join(packageRoot, 'templates/deploy/env.tmpl');
    const allVars = getAllConfigVariables(templatePath);
    const newVars = {};
    allVars.forEach(varName => {
        newVars[varName] = !existingVars.hasOwnProperty(varName);
    });

    // Process all variables using unified approach
    let currentSection = '';
    for (const varName of Object.keys(CONFIG_DEFINITIONS)) {
        const definition = CONFIG_DEFINITIONS[varName];

        // Skip if not needed (conditional check)
        if (definition.condition && !definition.condition(config, deploymentType)) {
            continue;
        }

        // Skip if already configured (unless first time or new variable)
        if (!firstTime && !newVars[varName] && !definition.auto) {
            continue;
        }

        // Show section header only once per section
        if (definition.section && definition.section !== currentSection && !definition.auto) {
            const sectionIcon = definition.section === 'Basic Settings' ? '📋' :
                               definition.section === 'Database Configuration' ? '🗄️' :
                               definition.section === 'Security Settings' ? '🔐' :
                               definition.section === 'Production Settings' ? '🌐' :
                               definition.section === 'PM2 Configuration' ? '⚡' :
                               definition.section === 'Logging Configuration' ? '📋' :
                               '🔧';
            console.log(`\n${sectionIcon} ${definition.section}:\n`);
            currentSection = definition.section;
        }

        // Execute the prompt
        await definition.prompt(config, deploymentType);
    }

    // Deployment package choice
    console.log('\n📦 Deployment Package:\n');
    console.log('? Generate additional deployment files?');
    console.log('  1) Yes - Full deployment package (nginx, PM2, MongoDB scripts)');
    console.log('  2) No - Just site configuration');
    const deployChoice = await question('? Choose (1-2): (1) ') || '1';
    config.generateDeployment = deployChoice === '1';

    return config;
}

/**
 * Copy directory recursively
 */
function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else if (entry.isSymbolicLink()) {
            const linkTarget = fs.readlinkSync(srcPath);
            fs.symlinkSync(linkTarget, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Replace template placeholders - clean direct mapping
 */
function replaceTemplatePlaceholders(content, config, frameworkVersion, deploymentType) {
    const now = new Date();

    // Use the same clean direct mapping as expandTemplatePlaceholders
    let result = expandTemplatePlaceholders(content, config);

    // Handle special template-only placeholders
    result = result.replace(/%FRAMEWORK_VERSION%/g, frameworkVersion);
    result = result.replace(/%GENERATION_DATE%/g, now.toISOString().split('T')[0]);

    return result;
}

/**
 * Create site configuration from template
 */
function createSiteConfiguration(deploymentType, config, frameworkVersion) {
    const templateName = deploymentType === 'dev' ? 'app.conf.dev.tmpl' : 'app.conf.prod.tmpl';
    const templatePath = path.join(packageRoot, 'templates/webapp', templateName);

    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const configContent = replaceTemplatePlaceholders(templateContent, config, frameworkVersion, deploymentType);

    // Ensure site/webapp directory exists
    if (!fs.existsSync('site/webapp')) {
        fs.mkdirSync('site/webapp', { recursive: true });
    }

    fs.writeFileSync('site/webapp/app.conf', configContent);
}

/**
 * Generate deployment files
 */
function generateDeploymentFiles(config, frameworkVersion, deploymentType) {
    console.log('📋 Generating deployment files...');

    // Create deploy directory
    if (!fs.existsSync('deploy')) {
        fs.mkdirSync('deploy', { recursive: true });
    }

    // Copy and process deployment templates (excluding env.tmpl)
    const deployTemplatesDir = path.join(packageRoot, 'templates/deploy');
    const deployFiles = fs.readdirSync(deployTemplatesDir);

    for (const file of deployFiles) {
        // Skip env.tmpl - we generate .env directly now
        if (file === 'env.tmpl') continue;

        const srcPath = path.join(deployTemplatesDir, file);
        const destPath = path.join('deploy', file);

        if (fs.statSync(srcPath).isFile()) {
            const content = fs.readFileSync(srcPath, 'utf8');
            const processedContent = replaceTemplatePlaceholders(content, config, frameworkVersion, deploymentType);
            fs.writeFileSync(destPath, processedContent);

            // Make shell scripts executable
            if (file.endsWith('.sh')) {
                fs.chmodSync(destPath, 0o755);
            }
        }
    }

    console.log('✅ Deployment files generated in deploy/ directory');
}

/**
 * Generate .env file directly from template
 */
function generateEnvFile(config, frameworkVersion) {
    console.log('📋 Generating .env configuration...');

    // Read template and expand all placeholders
    const templatePath = path.join(packageRoot, 'templates/deploy/env.tmpl');
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    // Update framework version in config
    config.JPULSE_FRAMEWORK_VERSION = frameworkVersion;

    // Expand template
    const expandedContent = expandTemplatePlaceholders(templateContent, config);

    // Remove header section (keep only the actual environment variables)
    const lines = expandedContent.split('\n');
    let envContent = '';
    let inHeaderSection = true;

    for (const line of lines) {
        // Skip header section (until first empty line after ##)
        if (inHeaderSection) {
            if (line.trim() === '' && envContent.includes('##')) {
                inHeaderSection = false;
            }
            envContent += line + '\n';
            continue;
        }

        envContent += line + '\n';
    }

    // Write .env file
    fs.writeFileSync('.env', envContent);
    console.log('✅ Environment configuration generated: .env');
}

/**
 * Create site package.json
 */
function createSitePackageJson(config) {
    const frameworkPackage = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

    const sitePackage = {
        name: config.siteId,
        version: "1.0.0",
        description: config.siteName,
        type: "module",
        main: "webapp/app.js",
        scripts: {
            start: "node webapp/app.js",
            dev: "node webapp/app.js",
            prod: "NODE_ENV=production node webapp/app.js",
            "jpulse-configure": "npx jpulse-framework jpulse-configure",
            "jpulse-install": "npx jpulse-framework jpulse-install",
            "jpulse-mongodb-setup": "bash -c 'source .env && npx jpulse-framework jpulse-mongodb-setup'",
            "jpulse-validate": "bash -c 'source .env && npx jpulse-framework jpulse-validate'",
            "jpulse-update": "npx jpulse-framework jpulse-update"
        },
        dependencies: {
            "@peterthoeny/jpulse-framework": frameworkPackage.version.startsWith('0.') ? `~0` : `^${frameworkPackage.version}`
        },
        engines: {
            node: ">=16.0.0"
        },
        private: true
    };

    fs.writeFileSync('package.json', JSON.stringify(sitePackage, null, 4));
}

/**
 * Create site directory structure
 */
function createSiteStructure() {
    const siteDirs = [
        'site',
        'site/webapp',
        'site/webapp/controller',
        'site/webapp/model',
        'site/webapp/view',
        'site/webapp/static',
        'site/webapp/static/assets',
        'logs'
    ];

    siteDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

/**
 * Copy site templates (README, etc.)
 */
function copySiteTemplates(config, frameworkVersion, deploymentType) {
    const readmePath = path.join(packageRoot, 'templates/README.md');
    if (fs.existsSync(readmePath)) {
        const templateContent = fs.readFileSync(readmePath, 'utf8');
        const processedContent = replaceTemplatePlaceholders(templateContent, config, frameworkVersion, deploymentType);
        fs.writeFileSync('README.md', processedContent);
    }
}

/**
 * Check if current directory has permission issues
 */
function checkPermissions() {
    try {
        // Check if we can write to current directory
        const testFile = '.jpulse-setup-test';
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Check if files are owned by root
 */
function checkRootOwnership() {
    const filesToCheck = ['site/webapp/app.conf', 'webapp/app.conf', 'package.json'];

    for (const file of filesToCheck) {
        if (fs.existsSync(file)) {
            try {
                const stats = fs.statSync(file);
                if (stats.uid === 0) { // root user ID is 0
                    return file;
                }
            } catch (error) {
                // Ignore errors, continue checking
            }
        }
    }
    return null;
}

/**
 * Main setup function
 */
async function setup() {
    try {
        console.log('🚀 jPulse Framework Site Configuration\n');

        // Check permissions first
        if (!checkPermissions()) {
            console.log('❌ PERMISSION ERROR: Cannot write to current directory');
            console.log('💡 Solution: Run setup from a directory you own, or fix permissions');
            process.exit(1);
        }

        // Check for root-owned files
        const rootOwnedFile = checkRootOwnership();
        if (rootOwnedFile) {
            console.log('❌ PERMISSION ERROR: Files are owned by root');
            console.log(`📁 Root-owned file detected: ${rootOwnedFile}`);
            console.log('');
            console.log('💡 Solution: Fix file ownership first:');
            console.log(`   sudo chown -R $(whoami):$(whoami) .`);
            console.log('   Then re-run: npx jpulse-setup');
            process.exit(1);
        }

        // Detect directory state
        console.log('🔍 Detecting current directory state...');
        const state = detectDirectoryState();

        let setupType = 'new-site';
        let deploymentType = 'dev';

        // Handle test mode
        if (process.env.JPULSE_TEST_MODE === 'true') {
            deploymentType = process.env.JPULSE_TEST_DEPLOYMENT || 'dev';
            console.log(`🧪 Test mode: Using ${deploymentType} deployment`);
        } else {
            switch (state) {
                case 'empty':
                    console.log('📁 Empty directory detected\n');
                    console.log('? What would you like to set up?');
                    console.log('  1) New jPulse site (development)');
                    console.log('  2) New jPulse site (production ready)');
                    const choice = await question('? Choose (1-2): (1) ');
                    deploymentType = choice === '2' ? 'prod' : 'dev';
                    break;

            case 'jpulse-site':
            case 'jpulse-partial':
                console.log('✅ Existing jPulse site detected\n');

                // Check if framework version changed or new features available
                const needsUpdate = await checkForNewFeatures();

                if (needsUpdate) {
                    console.log('🆕 New framework features detected that need configuration\n');
                    console.log('? What would you like to do?');
                    console.log('  1) Configure new features only (recommended)');
                    console.log('  2) Reconfigure from scratch');
                    console.log('  3) Exit (run jpulse-update first)');
                    const updateChoice = await question('? Choose (1-3): (1) ');

                    if (updateChoice === '3') {
                        console.log('💡 Run "npm run jpulse-update" first to sync framework files');
                        process.exit(0);
                    } else if (updateChoice === '2') {
                        // Continue with full setup
                        break;
                    } else {
                        // Configure new features only
                        return await configureNewFeaturesOnly();
                    }
                } else {
                    console.log('? What would you like to do?');
                    console.log('  1) Reconfigure from scratch');
                    console.log('  2) Exit (no configuration needed)');
                    const existingChoice = await question('? Choose (1-2): (2) ');

                    if (existingChoice === '2') {
                        console.log('✅ No configuration changes needed');
                        process.exit(0);
                    }
                }

                setupType = 'deploy-only';
                console.log('\n? Deployment type:');
                console.log('  1) Development (local testing)');
                console.log('  2) Production (server deployment)');
                const deployChoice = await question('? Choose (1-2): (1) ');
                deploymentType = deployChoice === '2' ? 'prod' : 'dev';
                break;

            case 'jpulse-dependency':
                console.log('✅ jPulse dependency detected\n');
                setupType = 'deploy-only';
                deploymentType = 'prod';
                break;

                default:
                    console.log('❌ Unknown directory state');
                    console.log('💡 This directory contains files that might conflict with jPulse setup');
                    console.log('🔍 Found files:', fs.readdirSync('.').filter(f => !f.startsWith('.')).join(', '));
                    console.log('\n💡 Please run jpulse-setup in an empty directory or existing jPulse site');
                    process.exit(1);
            }
        }

        // Get existing configuration (if any)
        const existingVars = fs.existsSync('.env') ? parseEnvFile('.env') : {};

        // Get configuration
        const config = await promptConfiguration(deploymentType, existingVars);
        const frameworkPackage = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

        console.log('\n🏗️  Setting up jPulse site...\n');

        if (setupType === 'new-site') {
            // Copy framework webapp directory
            console.log('📁 Copying framework files...');
            const webappSrc = path.join(packageRoot, 'webapp');
            copyDirectory(webappSrc, 'webapp');

            // Create site structure
            console.log('🏗️  Creating site structure...');
            createSiteStructure();

            // Copy site templates
            console.log('📋 Copying site templates...');
            copySiteTemplates(config, frameworkPackage.version, deploymentType);

            // Create package.json
            console.log('📦 Creating package.json...');
            createSitePackageJson(config);
        }

        // Create site configuration
        console.log('⚙️  Generating site configuration...');
        createSiteConfiguration(deploymentType, config, frameworkPackage.version);

        // Generate deployment files if requested
        if (config.generateDeployment) {
            generateDeploymentFiles(config, frameworkPackage.version, deploymentType);
        }

        // Always generate .env file
        generateEnvFile(config, frameworkPackage.version);

        console.log('\n✅ jPulse site setup complete!\n');

        // Show next steps
        console.log('📋 Next steps:');
        if (setupType === 'new-site') {
            console.log('1. Install dependencies: npm install');
        }
        console.log(`2. Start ${deploymentType === 'dev' ? 'development' : 'production'}: npm ${deploymentType === 'dev' ? 'run dev' : 'run prod'}`);
        if (config.generateDeployment) {
            console.log('3. Review deployment guide: cat deploy/README.md');
            if (deploymentType === 'prod') {
                console.log('4. Review environment: cat .env');
                console.log('5. Setup system: sudo npm run jpulse-install');
                console.log('6. Setup database: npm run jpulse-mongodb-setup');
            }
        }
        console.log('');
        console.log('💡 To update framework: npm run update');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

setup();

// EOF bin/configure.js
