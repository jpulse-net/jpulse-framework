#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Framework CLI
 * @tagline         Command dispatcher for jPulse Framework tools
 * @description     Dispatches commands to appropriate shell scripts
 * @file            bin/jpulse-framework.js
 * @version         0.7.11
 * @release         2025-09-17
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           95%, Cursor 1.2, Claude Sonnet 4
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const command = process.argv[2];

const commands = {
    'jpulse-configure': './configure.js',
    'configure': './configure.js',
    'jpulse-update': './jpulse-update.js',
    'update': './jpulse-update.js',
    'jpulse-install': './jpulse-install.sh',
    'install': './jpulse-install.sh',
    'jpulse-mongodb-setup': './mongodb-setup.sh',
    'mongodb-setup': './mongodb-setup.sh',
    'jpulse-validate': './jpulse-validate.sh',
    'validate': './jpulse-validate.sh'
};

if (!command || !commands[command]) {
    console.log('jPulse Framework CLI');
    console.log('');
    console.log('Available commands:');
    console.log('  jpulse-configure - Configure jPulse site (setup/update configuration)');
    console.log('  jpulse-update    - Update framework files');
    console.log('  install          - Install system dependencies (run as root)');
    console.log('  mongodb-setup    - Setup MongoDB database');
    console.log('  validate         - Validate deployment installation');
    console.log('');
    console.log('Usage:');
    console.log('  npx jpulse-framework <command>');
    console.log('  npm run jpulse-<command>  (recommended)');
    process.exit(1);
}

const scriptPath = path.join(__dirname, commands[command]);

// Determine if it's a Node.js script or shell script
const isNodeScript = commands[command].endsWith('.js');

let child;
if (isNodeScript) {
    // Execute Node.js script
    child = spawn('node', [scriptPath], {
        stdio: 'inherit',
        cwd: process.cwd()
    });
} else {
    // Execute shell script
    child = spawn('bash', [scriptPath], {
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
