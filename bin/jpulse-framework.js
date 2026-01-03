#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Framework CLI
 * @tagline         Command dispatcher for jPulse Framework tools
 * @description     Dispatches commands to appropriate shell scripts
 * @file            bin/jpulse-framework.js
 * @version         1.4.3
 * @release         2026-01-03
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const command = process.argv[2];

const commands = {
    'configure': './configure.js',
    'config': './configure.js',
    'update': './jpulse-update.js',
    'bump-version': './bump-version.js',
    'version-bump': './bump-version.js',
    'setup': './jpulse-setup.sh',
    'mongodb-setup': './mongodb-setup.sh',
    'db-setup': './mongodb-setup.sh',
    'validate': './jpulse-validate.sh',
    'plugin': './plugin-manager-cli.js'
};

/**
 * Detect execution context (framework repo vs site)
 */
function detectContext() {
    const cwd = process.cwd();

    // Site: has site/webapp/app.conf and framework in node_modules
    if (fs.existsSync('site/webapp/app.conf') &&
        fs.existsSync('node_modules/@jpulse-net/jpulse-framework')) {
        return 'site';
    }

    // Framework repo: has webapp/app.conf directly (not in node_modules)
    if (fs.existsSync('webapp/app.conf') && !cwd.includes('node_modules')) {
        return 'framework';
    }

    return 'unknown';
}

/**
 * Show context-aware help
 */
function showHelp(context) {
    console.log('jPulse Framework CLI');
    console.log('');

    if (context === 'framework') {
        console.log('Available commands (framework development):');
        console.log('  bump-version    - Bump version numbers across framework files');
        console.log('  plugin          - Manage plugins (install, enable, publish, etc.)');
        console.log('');
        console.log('Usage:');
        console.log('  npx jpulse bump-version <version> [date]');
        console.log('  npx jpulse plugin <action> [name] [options]');
        console.log('');
        console.log('Example:');
        console.log('  npx jpulse bump-version 1.0.5');
        console.log('  npx jpulse plugin list');
        console.log('  npx jpulse plugin publish auth-mfa');
    } else if (context === 'site') {
        console.log('Available commands:');
        console.log('  configure       - Configure jPulse site (setup/update configuration)');
        console.log('  update          - Update framework to latest and sync files');
        console.log('  plugin          - Manage plugins (install, enable, disable, etc.)');
        console.log('  bump-version    - Bump version numbers across site files');
        console.log('  setup           - Setup system dependencies (run as root)');
        console.log('  mongodb-setup   - Setup MongoDB database');
        console.log('  validate        - Validate deployment installation');
        console.log('');
        console.log('Usage:');
        console.log('  npx jpulse <command> [options]');
        console.log('');
        console.log('Examples:');
        console.log('  npx jpulse configure');
        console.log('  npx jpulse update');
        console.log('  npx jpulse plugin install auth-mfa');
        console.log('  npx jpulse plugin list');
        console.log('  npx jpulse validate');
    } else {
        // Unknown context - show all commands
        console.log('Available commands:');
        console.log('  configure       - Configure jPulse site (setup/update configuration)');
        console.log('  update          - Update framework to latest and sync files');
        console.log('  plugin          - Manage plugins (install, enable, disable, etc.)');
        console.log('  bump-version    - Bump version numbers across files');
        console.log('  setup           - Setup system dependencies (run as root)');
        console.log('  mongodb-setup   - Setup MongoDB database');
        console.log('  validate        - Validate deployment installation');
        console.log('');
        console.log('Usage:');
        console.log('  npx jpulse <command> [options]');
    }
}

if (!command || !commands[command]) {
    const context = detectContext();
    showHelp(context);
    process.exit(1);
}

const scriptPath = path.join(__dirname, commands[command]);
const args = process.argv.slice(3); // Skip command, pass remaining args

// Determine if it's a Node.js script or shell script
const isNodeScript = commands[command].endsWith('.js');

let child;
if (isNodeScript) {
    // Execute Node.js script with remaining arguments
    child = spawn('node', [scriptPath, ...args], {
        stdio: 'inherit',
        cwd: process.cwd()
    });
} else {
    // Execute shell script with remaining arguments
    child = spawn('bash', [scriptPath, ...args], {
        stdio: 'inherit',
        cwd: process.cwd()
    });
}

child.on('exit', (code) => {
    process.exit(code);
});

child.on('error', (err) => {
    console.error(`Error executing ${command}:`, err.message);
    process.exit(1);
});

// EOF bin/jpulse-framework.js
