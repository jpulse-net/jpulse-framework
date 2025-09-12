#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Site Setup
 * @tagline         Initial site setup CLI tool
 * @description     Creates a new jPulse site by copying framework files locally
 * @file            bin/setup.js
 * @version         0.5.5
 * @release         2025-09-12
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.dirname(__dirname);

/**
 * Copy directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
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
            // Handle symlinks by reading the target and creating a new symlink
            const linkTarget = fs.readlinkSync(srcPath);
            fs.symlinkSync(linkTarget, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Create site package.json
 */
function createSitePackageJson() {
    const frameworkPackage = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

    const sitePackage = {
        name: "my-jpulse-site",
        version: "1.0.0",
        description: "jPulse Framework Site",
        type: "module",
        main: "webapp/app.js",
        scripts: {
            start: "node webapp/app.js",
            dev: "node webapp/app.js",
            prod: "NODE_ENV=production node webapp/app.js",
            update: "npm update @jpulse/framework && npx jpulse-sync"
        },
        dependencies: {
            "@jpulse/framework": `^${frameworkPackage.version}`
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
        'site/webapp/static/assets'
    ];

    siteDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

/**
 * Copy site templates
 */
function copySiteTemplates() {
    const templateSrc = path.join(packageRoot, 'templates');
    if (fs.existsSync(templateSrc)) {
        copyDirectory(templateSrc, 'site');
    }
}

/**
 * Main setup function
 */
function setup() {
    console.log('🚀 Setting up jPulse Framework site...');

    // Check if already initialized
    if (fs.existsSync('webapp') || fs.existsSync('package.json')) {
        console.error('❌ Site already exists (webapp/ or package.json found)');
        console.log('💡 Use "npx jpulse-sync" to update framework files');
        process.exit(1);
    }

    try {
        // Copy framework webapp directory
        console.log('📁 Copying framework files...');
        const webappSrc = path.join(packageRoot, 'webapp');
        copyDirectory(webappSrc, 'webapp');

        // Create site structure
        console.log('🏗️  Creating site structure...');
        createSiteStructure();

        // Copy site templates
        console.log('📋 Copying site templates...');
        copySiteTemplates();

        // Create package.json
        console.log('📦 Creating package.json...');
        createSitePackageJson();

        console.log('✅ jPulse site setup complete!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Copy site configuration: cp site/webapp/app.conf.tmpl site/webapp/app.conf');
        console.log('2. Customize your configuration in site/webapp/app.conf');
        console.log('3. Start development: npm start');
        console.log('');
        console.log('To update framework: npm run update');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

setup();

// EOF bin/setup.js
