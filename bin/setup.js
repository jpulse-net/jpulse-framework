#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Site Setup
 * @tagline         Interactive site setup and deployment configuration CLI tool
 * @description     Creates jPulse sites with deployment automation (W-015)
 * @file            bin/setup.js
 * @version         0.7.1
 * @release         2025-09-14
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
        siteName,
        siteShortName: 'Test Site',
        siteId: siteName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'test-site',
        appPort: deploymentType === 'dev' ? 8080 : 8081,
        dbAdminUser: 'admin',
        dbAdminPass: 'test-admin-pass',
        dbUser: 'jpapp',
        dbPass: 'test-app-pass',
        dbName: deploymentType === 'dev' ? 'jp-dev' : 'jp-prod',
        sessionSecret: 'test-session-secret-123',
        pm2Instances: deploymentType === 'dev' ? 1 : 'max',
        domainName: 'localhost',
        sslType: 'none',
        generateDeployment: process.env.JPULSE_TEST_GENERATE_DEPLOY === 'true'
    };
}

/**
 * Interactive configuration prompting
 */
async function promptConfiguration(deploymentType) {
    // Check if we're in test mode
    if (process.env.JPULSE_TEST_MODE === 'true') {
        console.log('🧪 Running in test mode with default configuration');
        return getTestConfiguration(deploymentType);
    }

    console.log('📋 Configuration Settings:\n');

    const config = {};

    // Basic settings
    config.siteName = await question('? Site name: (My jPulse Site) ') || 'My jPulse Site';
    config.siteShortName = await question('? Site short name: (My Site) ') || 'My Site';
    config.siteId = config.siteName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'my-site';

    const defaultPort = deploymentType === 'dev' ? 8080 : 8081;
    const portInput = await question(`? Application port: (${defaultPort}) `);
    config.appPort = portInput ? parseInt(portInput) : defaultPort;

    console.log('\n🗄️  Database Configuration:\n');

    config.dbAdminUser = await question('? MongoDB admin username: (admin) ') || 'admin';
    config.dbAdminPass = await question('? MongoDB admin password: (required) ');
    while (!config.dbAdminPass) {
        console.log('❌ Admin password is required');
        config.dbAdminPass = await question('? MongoDB admin password: ');
    }

    config.dbUser = await question('? MongoDB app username: (jpapp) ') || 'jpapp';
    config.dbPass = await question('? MongoDB app password: (required) ');
    while (!config.dbPass) {
        console.log('❌ App password is required');
        config.dbPass = await question('? MongoDB app password: ');
    }

    const dbPrefix = deploymentType === 'dev' ? 'jp-dev' : 'jp-prod';
    config.dbName = await question(`? Database name: (${dbPrefix}) `) || dbPrefix;

    console.log('\n🔐 Security Settings:\n');

    const defaultSecret = generateSessionSecret();
    const secretInput = await question(`? Session secret: (${defaultSecret}) `);
    config.sessionSecret = secretInput || defaultSecret;

    if (deploymentType === 'prod') {
        console.log('\n🌐 Production Settings:\n');

        config.domainName = await question('? Domain name: (localhost) ') || 'localhost';

        console.log('? SSL certificate type:');
        console.log('  1) Let\'s Encrypt (recommended)');
        console.log('  2) Custom certificate paths');
        console.log('  3) No SSL (development only)');
        const sslChoice = await question('? Choose (1-3): (1) ') || '1';

        if (sslChoice === '1') {
            config.sslType = 'letsencrypt';
            config.sslCertPath = `/etc/letsencrypt/live/${config.domainName}/fullchain.pem`;
            config.sslKeyPath = `/etc/letsencrypt/live/${config.domainName}/privkey.pem`;
        } else if (sslChoice === '2') {
            config.sslType = 'custom';
            config.sslCertPath = await question('? SSL certificate path: ');
            config.sslKeyPath = await question('? SSL private key path: ');
        } else {
            config.sslType = 'none';
        }

        console.log('\n⚡ PM2 Configuration:\n');
        console.log('? PM2 instances for production:');
        console.log('  1) Auto-detect (max CPU cores)');
        console.log('  2) Custom number');
        const pm2Choice = await question('? Choose (1-2): (1) ') || '1';

        if (pm2Choice === '2') {
            const instancesInput = await question('? Number of instances (1-16): ');
            config.pm2Instances = parseInt(instancesInput) || 'max';
        } else {
            config.pm2Instances = 'max';
        }

        console.log('\n📋 Logging Configuration:\n');
        const defaultLogDir = '/var/log/jpulse';
        const logDirInput = await question(`? Log file directory: (${defaultLogDir}) `);
        config.logDir = logDirInput || defaultLogDir;
        config.logFile = `${config.logDir}/access.log`;
    } else {
        config.pm2Instances = 1;
        config.logDir = './logs';
        config.logFile = `${config.logDir}/access.log`;
    }

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
 * Replace template placeholders
 */
function replaceTemplatePlaceholders(content, config, frameworkVersion, deploymentType) {
    const now = new Date();
    const replacements = {
        '%SITE_NAME%': config.siteName,
        '%SITE_SHORT_NAME%': config.siteShortName,
        '%SITE_ID%': config.siteId,
        '%DOMAIN_NAME%': config.domainName,
        '%APP_PORT%': config.appPort.toString(),
        '%DB_NAME%': config.dbName,
        '%DB_USER%': config.dbUser,
        '%DB_PASS%': config.dbPass,
        '%DB_ADMIN_USER%': config.dbAdminUser,
        '%DB_ADMIN_PASS%': config.dbAdminPass,
        '%DB_USER_HINT%': `your-${config.dbUser}-password`,
        '%DB_ADMIN_USER_HINT%': `your-${config.dbAdminUser}-password`,
        '%SESSION_SECRET%': config.sessionSecret,
        '%NODE_ENV%': deploymentType === 'dev' ? 'development' : 'production',
        '%PM2_INSTANCES%': config.pm2Instances.toString(),
        '%DOMAIN_NAME%': config.domainName || 'localhost',
        '%LOG_DIR%': config.logDir || './logs',
        '%LOG_FILE%': config.logFile || './logs/access.log',
        '%SSL_CERT_PATH%': config.sslCertPath || '/etc/ssl/certs/server.crt',
        '%SSL_KEY_PATH%': config.sslKeyPath || '/etc/ssl/private/server.key',
        '%DEPLOYMENT_TYPE%': deploymentType,
        '%SSL_TYPE%': config.sslType || 'none',
        '%GENERATION_DATE%': now.toISOString().split('T')[0],
        '%FRAMEWORK_VERSION%': frameworkVersion
    };

    let result = content;
    for (const [placeholder, value] of Object.entries(replacements)) {
        result = result.replaceAll(placeholder, value);
    }

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

    // Copy and process deployment templates
    const deployTemplatesDir = path.join(packageRoot, 'templates/deploy');
    const deployFiles = fs.readdirSync(deployTemplatesDir);

    for (const file of deployFiles) {
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
            update: "npm update @peterthoeny/jpulse-framework && npx jpulse-sync"
        },
        dependencies: {
            "@peterthoeny/jpulse-framework": `^${frameworkPackage.version}`
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
        console.log('🚀 jPulse Framework Enhanced Setup\n');

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
                console.log('? What would you like to do?');
                console.log('  1) Generate deployment configuration');
                console.log('  2) Update framework files (same as jpulse-sync)');
                const existingChoice = await question('? Choose (1-2): (1) ');

                if (existingChoice === '2') {
                    console.log('💡 Use "npx jpulse-sync" to update framework files');
                    process.exit(0);
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

        // Get configuration
        const config = await promptConfiguration(deploymentType);
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
                console.log('4. Configure environment: cp deploy/env.tmpl .env');
                console.log('5. Setup database: source .env && ./deploy/mongodb-setup.sh');
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

// EOF bin/setup.js