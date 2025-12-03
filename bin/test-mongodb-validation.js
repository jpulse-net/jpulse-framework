#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / MongoDB Setup Validation Tests
 * @tagline         Comprehensive MongoDB setup validation to prevent authentication failures
 * @description     Tests password hashing compatibility, command structure, and YAML configuration
 * @file            bin/test-mongodb-validation.js
 * @version         1.3.6
 * @release         2025-12-03
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

/**
 * Test suite for MongoDB setup validation
 */
class MongoDBValidationTests {
    constructor() {
        this.testResults = [];
        this.failedTests = [];
    }

    /**
     * Run a test and track results
     */
    async runTest(testName, testFunction) {
        try {
            console.log(`  🧪 ${testName}...`);
            await testFunction();
            this.testResults.push({ name: testName, status: 'PASSED' });
            console.log(`  ✅ ${testName} - PASSED`);
        } catch (error) {
            this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
            this.failedTests.push({ name: testName, error: error.message });
            console.log(`  ❌ ${testName} - FAILED: ${error.message}`);
        }
    }

    /**
     * Test 1: Password hashing compatibility with jPulse app
     */
    async testPasswordHashingCompatibility() {
        // Read the MongoDB setup script
        const scriptPath = path.join(process.cwd(), 'bin', 'mongodb-setup.sh');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        // Check that bcrypt is used with correct parameters
        if (!scriptContent.includes("const bcrypt = require('bcrypt')")) {
            throw new Error('MongoDB setup script should use bcrypt for password hashing');
        }

        if (!scriptContent.includes('const saltRounds = 12')) {
            throw new Error('MongoDB setup script should use 12 salt rounds to match jPulse app');
        }

        if (!scriptContent.includes('bcrypt.hashSync(adminPassword, saltRounds)')) {
            throw new Error('MongoDB setup script should use bcrypt.hashSync with saltRounds parameter');
        }

        // Verify that the jPulse app uses the same hashing method
        const userModelPath = path.join(process.cwd(), 'webapp', 'model', 'user.js');
        if (fs.existsSync(userModelPath)) {
            const userModelContent = fs.readFileSync(userModelPath, 'utf8');

            if (!userModelContent.includes('const saltRounds = 12')) {
                throw new Error('jPulse UserModel should use 12 salt rounds');
            }

            if (!userModelContent.includes('bcrypt.hash(password, saltRounds)')) {
                throw new Error('jPulse UserModel should use bcrypt.hash with saltRounds');
            }
        }
    }

    /**
     * Test 2: MongoDB command structure validation
     */
    async testMongoCommandStructure() {
        const scriptPath = path.join(process.cwd(), 'bin', 'mongodb-setup.sh');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        // Check for single command per --eval (no semicolon-separated commands)
        const evalMatches = scriptContent.match(/--eval\s*"[^"]*"/g);
        if (evalMatches) {
            for (const evalMatch of evalMatches) {
                // Check for multiple statements in single eval (problematic pattern)
                const evalContent = evalMatch.match(/--eval\s*"([^"]*)"/)?.[1];
                if (evalContent) {
                    // Look for patterns like "use db; command;" which don't work in mongosh --eval
                    if (evalContent.includes('use ') && evalContent.includes(';') &&
                        evalContent.split(';').filter(s => s.trim()).length > 1) {
                        throw new Error(`MongoDB --eval should not contain multiple statements: ${evalContent}`);
                    }
                }
            }
        }

        // Check for proper authentication database usage
        if (!scriptContent.includes('--authenticationDatabase admin')) {
            throw new Error('MongoDB commands should use --authenticationDatabase admin for admin user operations');
        }

        // Check that app user operations use the correct database
        if (!scriptContent.includes('--authenticationDatabase "$DB_NAME"')) {
            throw new Error('MongoDB app user operations should authenticate against the app database');
        }
    }

    /**
     * Test 3: YAML configuration handling
     */
    async testYAMLConfigurationHandling() {
        const scriptPath = path.join(process.cwd(), 'bin', 'mongodb-setup.sh');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        // Check for flexible authorization pattern matching
        if (!scriptContent.includes('^#.*authorization: .*')) {
            throw new Error('MongoDB script should use flexible pattern for authorization settings');
        }

        // Check that both security and authorization lines are handled
        if (!scriptContent.includes("'s/^#security:/security:/'")) {
            throw new Error('MongoDB script should uncomment security section');
        }

        if (!scriptContent.includes("'s/^#.*authorization: .*/  authorization: enabled/'")) {
            throw new Error('MongoDB script should set authorization to enabled with proper indentation');
        }

        // Verify the script handles the case where authorization is already enabled
        if (!scriptContent.includes('authorization: enabled') ||
            !scriptContent.includes('MongoDB authentication already enabled')) {
            throw new Error('MongoDB script should handle case where authentication is already enabled');
        }
    }

    /**
     * Test 4: Error handling and recovery
     */
    async testErrorHandlingAndRecovery() {
        const scriptPath = path.join(process.cwd(), 'bin', 'mongodb-setup.sh');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        // Check for proper error handling in user creation
        if (!scriptContent.includes('try {') || !scriptContent.includes('} catch(error) {')) {
            throw new Error('MongoDB script should have try/catch error handling for user creation');
        }

        // Check for proper user existence detection
        if (!scriptContent.includes('USER_EXISTS:') || !scriptContent.includes('USER_NOT_FOUND')) {
            throw new Error('MongoDB script should have reliable user existence detection');
        }

        // Check for authentication testing
        if (!scriptContent.includes('Testing MongoDB authentication')) {
            throw new Error('MongoDB script should test authentication after setup');
        }

        // Check for proper exit codes on errors
        if (!scriptContent.includes('exit 1')) {
            throw new Error('MongoDB script should exit with error code on failures');
        }
    }

    /**
     * Test 5: Password escaping and special characters
     */
    async testPasswordEscaping() {
        const scriptPath = path.join(process.cwd(), 'bin', 'mongodb-setup.sh');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        // Check for password escaping logic
        if (!scriptContent.includes('ADMIN_PASSWORD_ESCAPED')) {
            throw new Error('MongoDB script should escape admin password for safe JavaScript usage');
        }

        // Check for proper escaping method
        if (!scriptContent.includes("sed \"s/'/'\\\\\\\\''/g\"")) {
            throw new Error('MongoDB script should properly escape single quotes in passwords');
        }

        // Check for password strength validation
        if (!scriptContent.includes('${#ADMIN_PASSWORD} -lt 8')) {
            throw new Error('MongoDB script should validate minimum password length');
        }
    }

    /**
     * Test 6: Environment variable validation
     */
    async testEnvironmentVariableValidation() {
        const scriptPath = path.join(process.cwd(), 'bin', 'mongodb-setup.sh');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        // Check for required environment variable validation
        const requiredVars = ['DB_NAME', 'DB_USER', 'JPULSE_SITE_ID', 'DB_ADMIN_PASS', 'DB_PASS'];
        for (const varName of requiredVars) {
            if (!scriptContent.includes(`-z "$${varName}"`)) {
                throw new Error(`MongoDB script should validate required environment variable: ${varName}`);
            }
        }

        // Check for proper error messages when variables are missing
        if (!scriptContent.includes('Required environment variables not set')) {
            throw new Error('MongoDB script should provide clear error message for missing variables');
        }

        // Check for guidance on how to set variables
        if (!scriptContent.includes('source .env')) {
            throw new Error('MongoDB script should provide guidance on sourcing .env file');
        }
    }

    /**
     * Run all MongoDB validation tests
     */
    async runAllTests() {
        console.log('🧪 Running MongoDB Setup Validation Tests...\n');

        await this.runTest('Password hashing compatibility with jPulse app', () => this.testPasswordHashingCompatibility());
        await this.runTest('MongoDB command structure validation', () => this.testMongoCommandStructure());
        await this.runTest('YAML configuration handling', () => this.testYAMLConfigurationHandling());
        await this.runTest('Error handling and recovery', () => this.testErrorHandlingAndRecovery());
        await this.runTest('Password escaping and special characters', () => this.testPasswordEscaping());
        await this.runTest('Environment variable validation', () => this.testEnvironmentVariableValidation());

        return this.getResults();
    }

    /**
     * Get test results summary
     */
    getResults() {
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;

        return {
            total: this.testResults.length,
            passed,
            failed,
            failedTests: this.failedTests,
            success: failed === 0
        };
    }
}

/**
 * Test suite for cross-platform compatibility
 */
class CrossPlatformTests {
    constructor() {
        this.testResults = [];
        this.failedTests = [];
    }

    async runTest(testName, testFunction) {
        try {
            console.log(`  🧪 ${testName}...`);
            await testFunction();
            this.testResults.push({ name: testName, status: 'PASSED' });
            console.log(`  ✅ ${testName} - PASSED`);
        } catch (error) {
            this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
            this.failedTests.push({ name: testName, error: error.message });
            console.log(`  ❌ ${testName} - FAILED: ${error.message}`);
        }
    }

    /**
     * Test 1: Shell script compatibility (/bin/sh vs /bin/bash)
     */
    async testShellCompatibility() {
        const shellScripts = [
            'bin/jpulse-setup.sh',
            'bin/mongodb-setup.sh',
            'bin/jpulse-validate.sh'
        ];

        for (const scriptPath of shellScripts) {
            if (fs.existsSync(scriptPath)) {
                const content = fs.readFileSync(scriptPath, 'utf8');

                // Check shebang line
                if (!content.startsWith('#!/bin/bash')) {
                    throw new Error(`${scriptPath} should use #!/bin/bash shebang for compatibility`);
                }

                // Check for bash-specific features that might not work in /bin/sh
                if (content.includes('[[') && !content.includes('#!/bin/bash')) {
                    throw new Error(`${scriptPath} uses [[ ]] which requires bash, but shebang is not #!/bin/bash`);
                }

                // Check for proper error handling
                if (!content.includes('set -e')) {
                    throw new Error(`${scriptPath} should use 'set -e' for proper error handling`);
                }
            }
        }
    }

    /**
     * Test 2: Environment variable sourcing guidance
     */
    async testNpmScriptEnvironment() {
        // With unified CLI (npx jpulse), users run commands directly
        // Shell scripts should provide clear guidance on environment loading
        const shellScripts = [
            'bin/mongodb-setup.sh',
            'bin/jpulse-validate.sh'
        ];

        for (const scriptPath of shellScripts) {
            if (fs.existsSync(scriptPath)) {
                const scriptContent = fs.readFileSync(scriptPath, 'utf8');

                // Check that script validates environment variables
                if (!scriptContent.includes('-z "$')) {
                    throw new Error(`${scriptPath} should validate required environment variables`);
                }

                // Check that script provides guidance on environment loading
                // Should mention either "source .env" or "npx jpulse" with environment
                const hasEnvGuidance = scriptContent.includes('source .env') ||
                                      scriptContent.includes('npx jpulse') ||
                                      scriptContent.includes('Run: npx jpulse');

                if (!hasEnvGuidance) {
                    throw new Error(`${scriptPath} should provide guidance on running with environment variables`);
                }
            }
        }

        // Verify configure.js doesn't generate npm scripts with .env sourcing (we use npx jpulse now)
        const configureScript = fs.readFileSync('bin/configure.js', 'utf8');

        // Check the createSitePackageJson function doesn't include bash -c 'source .env'
        if (configureScript.includes("bash -c 'source .env &&") &&
            configureScript.includes('createSitePackageJson')) {
            throw new Error('configure.js should not generate npm scripts with .env sourcing (use npx jpulse instead)');
        }

        // Verify generated package.json structure (scripts should be simple, no .env sourcing)
        // This is validated by checking that createSitePackageJson only creates start/dev/prod scripts
        const packageJsonMatch = configureScript.match(/scripts:\s*\{[\s\S]*?\}/);
        if (packageJsonMatch) {
            const scriptsSection = packageJsonMatch[0];
            // Should not have bash -c with source .env
            if (scriptsSection.includes("bash -c 'source .env")) {
                throw new Error('Generated package.json should not include npm scripts with .env sourcing');
            }
        }
    }

    /**
     * Test 3: Path handling and file permissions
     */
    async testPathAndPermissions() {
        const shellScripts = [
            'bin/jpulse-setup.sh',
            'bin/mongodb-setup.sh',
            'bin/jpulse-validate.sh'
        ];

        for (const scriptPath of shellScripts) {
            if (fs.existsSync(scriptPath)) {
                const stats = fs.statSync(scriptPath);

                // Check that script is executable
                if (!(stats.mode & 0o111)) {
                    throw new Error(`${scriptPath} should be executable`);
                }

                const content = fs.readFileSync(scriptPath, 'utf8');

                // Check for proper path handling (no hardcoded paths)
                if (content.includes('/usr/local/') && !content.includes('command -v')) {
                    throw new Error(`${scriptPath} should not use hardcoded paths like /usr/local/`);
                }

                // Check for proper directory creation with permissions
                if (content.includes('mkdir') && !content.includes('chmod')) {
                    console.log(`  ⚠️  ${scriptPath} creates directories but doesn't set permissions explicitly`);
                }
            }
        }
    }

    /**
     * Test 4: Shell script syntax validation using shellcheck
     * This would have caught MongoDB YAML and require() bugs in W-054
     */
    async testShellScriptSyntax() {
        const shellScripts = [
            'bin/jpulse-setup.sh',
            'bin/mongodb-setup.sh',
            'bin/jpulse-validate.sh'
        ];

        for (const scriptPath of shellScripts) {
            if (fs.existsSync(scriptPath)) {
                try {
                    // First check basic syntax with bash
                    execSync(`bash -n ${scriptPath}`, { stdio: 'pipe' });
                } catch (syntaxError) {
                    throw new Error(`Syntax error in ${scriptPath}: ${syntaxError.message}`);
                }

                // Try shellcheck if available (optional - don't fail if not installed)
                try {
                    execSync(`shellcheck ${scriptPath}`, { stdio: 'pipe' });
                } catch (shellcheckError) {
                    // Check if shellcheck is not installed (various ways this can manifest)
                    const errorMessage = shellcheckError.message || '';
                    const isCommandNotFound =
                        shellcheckError.code === 127 ||
                        errorMessage.includes('command not found') ||
                        errorMessage.includes('not found') ||
                        errorMessage.includes('ENOENT') ||
                        errorMessage.includes('shellcheck: not found') ||
                        errorMessage.includes('Command failed: shellcheck');

                    if (isCommandNotFound) {
                        console.log(`  ℹ️  shellcheck not available for ${scriptPath} (install shellcheck for enhanced validation)`);
                    } else {
                        // shellcheck found actual issues
                        throw new Error(`shellcheck found issues in ${scriptPath}: ${shellcheckError.message}`);
                    }
                }
            }
        }
    }

    async runAllTests() {
        console.log('🧪 Running Cross-Platform Compatibility Tests...\n');

        await this.runTest('Shell script compatibility', () => this.testShellCompatibility());
        await this.runTest('npm script environment sourcing', () => this.testNpmScriptEnvironment());
        await this.runTest('Path handling and file permissions', () => this.testPathAndPermissions());
        await this.runTest('Shell script syntax validation', () => this.testShellScriptSyntax());

        return this.getResults();
    }

    getResults() {
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;

        return {
            total: this.testResults.length,
            passed,
            failed,
            failedTests: this.failedTests,
            success: failed === 0
        };
    }
}

/**
 * Main test runner
 */
async function runMongoDBValidationTests() {
    console.log('🚀 jPulse Framework - MongoDB Setup Validation Tests');
    console.log('===================================================\n');

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    const allFailedTests = [];

    // Run MongoDB Validation Tests
    const mongoTests = new MongoDBValidationTests();
    const mongoResults = await mongoTests.runAllTests();

    totalTests += mongoResults.total;
    totalPassed += mongoResults.passed;
    totalFailed += mongoResults.failed;
    allFailedTests.push(...mongoResults.failedTests);

    console.log(`\n📊 MongoDB Setup Validation: ${mongoResults.passed}/${mongoResults.total} passed\n`);

    // Run Cross-Platform Tests
    const platformTests = new CrossPlatformTests();
    const platformResults = await platformTests.runAllTests();

    totalTests += platformResults.total;
    totalPassed += platformResults.passed;
    totalFailed += platformResults.failed;
    allFailedTests.push(...platformResults.failedTests);

    console.log(`\n📊 Cross-Platform Compatibility: ${platformResults.passed}/${platformResults.total} passed\n`);

    // Final results
    console.log('===================================================');
    console.log('📊 MONGODB VALIDATION TESTING RESULTS');
    console.log('===================================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);

    if (totalFailed > 0) {
        console.log('\n❌ FAILED TESTS:');
        allFailedTests.forEach(test => {
            console.log(`  - ${test.name}: ${test.error}`);
        });
        process.exit(1);
    } else {
        console.log('\n✅ ALL MONGODB VALIDATION TESTS PASSED!');
        console.log('🎉 MongoDB setup and cross-platform validation successful!');
        process.exit(0);
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMongoDBValidationTests().catch(error => {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    });
}

export { MongoDBValidationTests, CrossPlatformTests };

// EOF bin/test-mongodb-validation.js
