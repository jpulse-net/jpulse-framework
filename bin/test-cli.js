#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Test CLI Tools
 * @tagline         Test script for CLI tools validation
 * @description     Tests setup and sync CLI tools in isolated environment
 * @file            bin/test-cli.js
 * @version         0.7.5
 * @release         2025-09-16
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

const testDir = path.join(process.cwd(), 'test-site-temp');

/**
 * Clean up test directory
 */
function cleanup() {
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
}

/**
 * Test CLI tools
 */
async function testCLI() {
    console.log('🧪 Testing jPulse CLI tools...');

    try {
        // Cleanup any existing test directory
        cleanup();

        // Create test directory
        fs.mkdirSync(testDir);
        process.chdir(testDir);

        console.log('📁 Created test directory:', testDir);

        // Test setup command with environment variables for non-interactive testing
        console.log('🚀 Testing jpulse-configure...');

        // Set environment variables for automated testing
        process.env.JPULSE_TEST_MODE = 'true';
        process.env.JPULSE_TEST_DEPLOYMENT = 'dev';
        process.env.JPULSE_TEST_SITE_NAME = 'Test Site';
        process.env.JPULSE_TEST_GENERATE_DEPLOY = 'true';

        try {
            execSync('node ../bin/configure.js', {
                stdio: 'inherit',
                env: { ...process.env }
            });
        } finally {
            // Clean up test environment variables
            delete process.env.JPULSE_TEST_MODE;
            delete process.env.JPULSE_TEST_DEPLOYMENT;
            delete process.env.JPULSE_TEST_SITE_NAME;
            delete process.env.JPULSE_TEST_GENERATE_DEPLOY;
        }

        // Verify setup results
        const expectedFiles = [
            'package.json',
            'README.md',
            'webapp/app.js',
            'webapp/controller',
            'site/webapp',
            'site/webapp/app.conf',
            'logs'
        ];

        for (const file of expectedFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Expected file/directory not found: ${file}`);
            }
        }

        // Verify deployment files were generated (since we chose option 1)
        const expectedDeployFiles = [
            'deploy/README.md',
            'deploy/ecosystem.dev.config.cjs',
            'deploy/ecosystem.prod.config.cjs',
            'deploy/nginx.prod.conf'
        ];

        // Verify .env file was generated directly
        if (!fs.existsSync('.env')) {
            throw new Error('Expected .env file not found');
        }

        for (const file of expectedDeployFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Expected deployment file not found: ${file}`);
            }
        }

        // Verify npm scripts were generated
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const expectedScripts = ['jpulse-install', 'jpulse-mongodb-setup', 'jpulse-validate', 'jpulse-update'];

        for (const script of expectedScripts) {
            if (!packageJson.scripts[script]) {
                throw new Error(`Expected npm script not found: ${script}`);
            }
        }

        console.log('✅ Setup test passed');

        // Test that setup detects existing site
        console.log('🔒 Testing setup detection...');
        try {
            execSync('node ../bin/configure.js', {
                stdio: ['pipe', 'pipe', 'pipe'],
                input: '2\n' // Choose "Update framework files" option
            });
            // This should exit with code 0 and suggest using jpulse-sync
        } catch (error) {
            const errorOutput = error.stderr?.toString() || error.stdout?.toString() || '';
            if (errorOutput.includes('Use "npx jpulse-sync"')) {
                console.log('✅ Setup detection test passed');
            } else {
                throw new Error(`Unexpected error: ${errorOutput}`);
            }
        }

        console.log('🎉 All CLI tests passed!');

    } catch (error) {
        console.error('❌ CLI test failed:', error.message);
        process.exit(1);
    } finally {
        // Cleanup
        process.chdir('..');
        cleanup();
        console.log('🧹 Cleaned up test directory');
    }
}

testCLI().catch(console.error);

// EOF bin/test-cli.js
