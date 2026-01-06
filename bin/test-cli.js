#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Test CLI Tools
 * @tagline         Test script for CLI tools validation
 * @description     Tests setup and sync CLI tools in isolated environment
 * @file            bin/test-cli.js
 * @version         1.4.6
 * @release         2026-01-06
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

const testDir = path.join(process.cwd(), 'test-site-temp');

// Test tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Run a test and track results
 */
async function runTest(testName, testFunction) {
    totalTests++;
    try {
        console.log(`  🧪 ${testName}...`);
        await testFunction();
        console.log(`  ✅ ${testName} - PASSED`);
        passedTests++;
    } catch (error) {
        console.log(`  ❌ ${testName} - FAILED: ${error.message}`);
        failedTests++;
        throw error; // Re-throw to maintain existing error handling
    }
}

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
        console.log('🚀 Testing npx jpulse configure...');

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
            'site/webapp/app.conf'
        ];

        // Only check for logs symlink if file logging is configured (LOG_DIR is set)
        // In dev/test mode, STDOUT is used, so no symlink should exist
        let logDir = '';
        try {
            const envContent = fs.readFileSync('.env', 'utf8');
            const logDirMatch = envContent.match(/^export LOG_DIR=(.+)$/m);
            if (logDirMatch && logDirMatch[1] && logDirMatch[1].trim() !== '') {
                logDir = logDirMatch[1].trim();
                expectedFiles.push('logs');  // Only expect logs symlink if LOG_DIR is set
            }
        } catch (error) {
            // .env might not exist or be readable, that's OK - no logs symlink expected
        }

        for (const file of expectedFiles) {
            let exists = false;
            try {
                // Check if file exists or is a symbolic link (even if target doesn't exist)
                exists = fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink();
            } catch (error) {
                // File doesn't exist at all
                exists = false;
            }

            if (!exists) {
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

        // Verify npm scripts were generated (simplified - no jpulse-* scripts, use npx jpulse instead)
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const expectedScripts = ['start', 'dev', 'prod'];

        for (const script of expectedScripts) {
            if (!packageJson.scripts[script]) {
                throw new Error(`Expected npm script not found: ${script}`);
            }
        }

        // Comprehensive deployment validation tests
        console.log('🧪 Running deployment validation tests...');

        // Test 1: Verify package.json completeness
        await runTest('Package.json structure validation', () => {
            const requiredPackageFields = ['name', 'version', 'description', 'type', 'main', 'engines', 'private'];
            for (const field of requiredPackageFields) {
                if (!packageJson[field]) {
                    throw new Error(`Missing required package.json field: ${field}`);
                }
            }
        });

        // Test 2: Verify no unexpanded template variables in generated files
        await runTest('Template variable expansion check', () => {
            const filesToCheck = ['.env', 'deploy/ecosystem.dev.config.cjs', 'deploy/ecosystem.prod.config.cjs'];
            for (const file of filesToCheck) {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    // Exclude bash date format strings like %Y%m%d
                    const unexpandedVars = content.match(/%[A-Z_]{2,}%/g);
                    if (unexpandedVars) {
                        throw new Error(`Unexpanded template variables found in ${file}: ${unexpandedVars.join(', ')}`);
                    }
                }
            }
        });

        // Test 3: Verify framework files were copied
        await runTest('Framework file structure validation', () => {
            const criticalFrameworkFiles = [
                'webapp/app.js',
                'webapp/controller/auth.js',
                'webapp/controller/view.js',
                'webapp/model/user.js',
                'webapp/view/jpulse-common.css',
                'webapp/view/jpulse-common.js'
            ];
            for (const file of criticalFrameworkFiles) {
                if (!fs.existsSync(file)) {
                    throw new Error(`Critical framework file missing: ${file}`);
                }
            }
        });

        // Test 4: Verify configuration files are valid JSON/JS
        await runTest('Configuration file syntax validation', () => {
            try {
                JSON.parse(fs.readFileSync('package.json', 'utf8'));
            } catch (e) {
                throw new Error(`Invalid package.json syntax: ${e.message}`);
            }
        });

        // Test 4.5: Verify PM2 ecosystem files are valid JavaScript
        await runTest('PM2 ecosystem file syntax validation', async () => {
            const ecosystemFiles = ['deploy/ecosystem.dev.config.cjs', 'deploy/ecosystem.prod.config.cjs'];
            for (const ecosystemFile of ecosystemFiles) {
                if (fs.existsSync(ecosystemFile)) {
                    try {
                        // Use dynamic import to test ES module syntax
                        const fullPath = path.resolve(ecosystemFile);
                        await import(`file://${fullPath}`);
                    } catch (e) {
                        throw new Error(`Invalid ${ecosystemFile} syntax: ${e.message}`);
                    }
                }
            }
        });

        // Test 5: Verify .env file has required variables
        await runTest('Environment configuration validation', () => {
            const envContent = fs.readFileSync('.env', 'utf8');
            const requiredEnvVars = ['SITE_NAME', 'JPULSE_SITE_ID', 'PORT', 'DB_NAME', 'SESSION_SECRET'];
            for (const envVar of requiredEnvVars) {
                if (!envContent.includes(`export ${envVar}=`)) {
                    throw new Error(`Missing required environment variable: ${envVar}`);
                }
            }
        });

        // Test 6: Verify shell scripts don't have unexpanded template variables
        await runTest('Shell script integrity validation', () => {
            const shellScripts = ['bin/jpulse-setup.sh', 'bin/mongodb-setup.sh', 'bin/jpulse-validate.sh'];
            for (const script of shellScripts) {
                const scriptPath = path.join('..', script);
                if (fs.existsSync(scriptPath)) {
                    const content = fs.readFileSync(scriptPath, 'utf8');
                    // Exclude bash date format strings like %Y%m%d
                    const unexpandedVars = content.match(/%[A-Z_]{2,}%/g);
                    if (unexpandedVars) {
                        throw new Error(`Unexpanded template variables found in ${script}: ${unexpandedVars.join(', ')}`);
                    }
                }
            }
        });

        // Test that setup detects existing site
        await runTest('Setup detection validation', () => {
            try {
                execSync('node ../bin/configure.js', {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    input: '2\n' // Choose "Update framework files" option
                });
                // This should exit with code 0 and suggest using jpulse-sync
            } catch (error) {
                const errorOutput = error.stderr?.toString() || error.stdout?.toString() || '';
                if (errorOutput.includes('Use "npx jpulse update"')) {
                    // Expected behavior - setup detected existing site
                } else {
                    throw new Error(`Unexpected error: ${errorOutput}`);
                }
            }
        });

    } catch (error) {
        console.error('❌ CLI test failed:', error.message);
        failedTests++; // Count the overall failure if not already counted
        if (totalTests === 0) totalTests = 1; // Ensure we have at least one test counted
    } finally {
        // Cleanup
        process.chdir('..');
        cleanup();
        console.log('🧹 Cleaned up test directory');

        // Output standardized test statistics
        console.log('\n================================================');
        console.log('📊 CLI TESTING RESULTS');
        console.log('================================================');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);

        if (failedTests > 0) {
            console.log('\n❌ CLI TESTS FAILED!');
            process.exit(1);
        } else {
            console.log('\n✅ ALL CLI TESTS PASSED!');
            console.log('🎉 CLI tools validation successful!');
        }
    }
}

testCLI().catch(console.error);

// EOF bin/test-cli.js
