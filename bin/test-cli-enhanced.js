#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Enhanced CLI Testing
 * @tagline         Comprehensive CLI validation tests to catch deployment issues early
 * @description     Advanced testing for configuration, template expansion, and deployment validation
 * @file            bin/test-cli-enhanced.js
 * @version         0.7.15
 * @release         2025-09-22
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { CONFIG_REGISTRY, expandAllVariables } from './config-registry.js';

const testDir = path.join(process.cwd(), 'test-enhanced-temp');

/**
 * Clean up test directory
 */
function cleanup() {
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
}

/**
 * Test suite for template variable expansion
 */
class TemplateExpansionTests {
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
     * Test 1: All CONFIG_REGISTRY variables get expanded
     */
    async testAllVariablesExpand() {
        const testConfig = {
            SITE_NAME: 'Test Site',
            JPULSE_SITE_ID: 'test-site',
            PORT: '8080',
            SESSION_SECRET: 'test-secret-123',
            DB_NAME: 'test-db',
            DB_USER: 'testuser',
            DB_PASS: 'testpass',
            JPULSE_DOMAIN_NAME: 'test.example.com',
            JPULSE_SSL_TYPE: 'none',
            LOG_DIR: '/var/log/test'
        };

        // Test template with all variables
        const template = Object.keys(CONFIG_REGISTRY).map(key => `${key}=%${key}%`).join('\n');
        const expanded = expandAllVariables(template, testConfig, 'prod');

        // Check that no unexpanded variables remain
        const unexpandedVars = expanded.match(/%[A-Z_]{2,}%/g);
        if (unexpandedVars) {
            throw new Error(`Unexpanded variables found: ${unexpandedVars.join(', ')}`);
        }

        // Verify specific critical variables are expanded
        const criticalVars = ['SESSION_SECRET', 'JPULSE_FRAMEWORK_VERSION', 'GENERATION_DATE'];
        for (const varName of criticalVars) {
            if (expanded.includes(`%${varName}%`)) {
                throw new Error(`Critical variable ${varName} was not expanded`);
            }
        }
    }

    /**
     * Test 2: Conditional variables get proper defaults
     */
    async testConditionalDefaults() {
        const minimalConfig = {
            SITE_NAME: 'Test Site',
            JPULSE_SITE_ID: 'test-site',
            PORT: '8080'
        };

        // Test conditional variables that should get defaults
        const template = `
SSL_CERT_PATH=%SSL_CERT_PATH%
SSL_KEY_PATH=%SSL_KEY_PATH%
DB_HOST=%DB_HOST%
DB_PORT=%DB_PORT%
DB_REPLICA_SET=%DB_REPLICA_SET%
        `.trim();

        const expanded = expandAllVariables(template, minimalConfig, 'prod');

        // These should be expanded to empty strings or defaults, not left as %VAR%
        const conditionalVars = ['SSL_CERT_PATH', 'SSL_KEY_PATH', 'DB_HOST', 'DB_PORT', 'DB_REPLICA_SET'];
        for (const varName of conditionalVars) {
            if (expanded.includes(`%${varName}%`)) {
                throw new Error(`Conditional variable ${varName} was not given a default value`);
            }
        }
    }

    /**
     * Test 3: Special placeholders work correctly
     */
    async testSpecialPlaceholders() {
        const testConfig = {
            SITE_NAME: 'Test Site',
            JPULSE_SITE_ID: 'test-site'
        };

        const template = `
GENERATION_DATE=%GENERATION_DATE%
JPULSE_FRAMEWORK_VERSION=%JPULSE_FRAMEWORK_VERSION%
DEPLOYMENT_TYPE=%DEPLOYMENT_TYPE%
        `.trim();

        const expanded = expandAllVariables(template, testConfig, 'prod');

        // Check that special placeholders are expanded
        if (expanded.includes('%GENERATION_DATE%')) {
            throw new Error('GENERATION_DATE placeholder was not expanded');
        }
        if (expanded.includes('%JPULSE_FRAMEWORK_VERSION%')) {
            throw new Error('JPULSE_FRAMEWORK_VERSION placeholder was not expanded');
        }
        if (expanded.includes('%DEPLOYMENT_TYPE%')) {
            throw new Error('DEPLOYMENT_TYPE placeholder was not expanded');
        }

        // Verify the values make sense
        if (!expanded.includes('DEPLOYMENT_TYPE=prod')) {
            throw new Error('DEPLOYMENT_TYPE should be "prod" for production deployment');
        }
    }

    /**
     * Test 4: Edge cases (empty values, special characters)
     */
    async testEdgeCases() {
        const edgeCaseConfig = {
            SITE_NAME: 'Test & "Special" Site',
            JPULSE_SITE_ID: 'test-special-site',
            PORT: '8080',
            SESSION_SECRET: 'secret-with-!@#$%^&*()-chars',
            DB_PASS: 'password-with-"quotes"-and-$pecial'
        };

        const template = `
SITE_NAME=%SITE_NAME%
SESSION_SECRET=%SESSION_SECRET%
DB_PASS=%DB_PASS%
        `.trim();

        const expanded = expandAllVariables(template, edgeCaseConfig, 'prod');

        // Verify special characters are handled correctly
        if (!expanded.includes('Test & "Special" Site')) {
            throw new Error('Special characters in SITE_NAME not handled correctly');
        }
        if (!expanded.includes('secret-with-!@#$%^&*()-chars')) {
            throw new Error('Special characters in SESSION_SECRET not handled correctly');
        }
        if (!expanded.includes('password-with-"quotes"-and-$pecial')) {
            throw new Error('Special characters in DB_PASS not handled correctly');
        }
    }

    /**
     * Test 5: SESSION_SECRET function execution
     */
    async testSessionSecretGeneration() {
        const testConfig = {
            SITE_NAME: 'Test Site',
            JPULSE_SITE_ID: 'test-site'
        };

        const template = 'SESSION_SECRET=%SESSION_SECRET%';
        const expanded1 = expandAllVariables(template, testConfig, 'prod');
        const expanded2 = expandAllVariables(template, testConfig, 'prod');

        // Extract the generated secrets
        const secret1 = expanded1.match(/SESSION_SECRET=(.+)/)?.[1];
        const secret2 = expanded2.match(/SESSION_SECRET=(.+)/)?.[1];

        if (!secret1 || !secret2) {
            throw new Error('SESSION_SECRET was not generated');
        }

        // Should be different each time (random generation)
        if (secret1 === secret2) {
            throw new Error('SESSION_SECRET should be randomly generated each time');
        }

        // Should be proper hex string (64 characters)
        if (!/^[a-f0-9]{64}$/.test(secret1)) {
            throw new Error(`SESSION_SECRET should be 64-character hex string, got: ${secret1}`);
        }
    }

    /**
     * Run all template expansion tests
     */
    async runAllTests() {
        console.log('🧪 Running Template Variable Expansion Tests...\n');

        await this.runTest('All CONFIG_REGISTRY variables expand', () => this.testAllVariablesExpand());
        await this.runTest('Conditional variables get defaults', () => this.testConditionalDefaults());
        await this.runTest('Special placeholders work correctly', () => this.testSpecialPlaceholders());
        await this.runTest('Edge cases handled correctly', () => this.testEdgeCases());
        await this.runTest('SESSION_SECRET generation works', () => this.testSessionSecretGeneration());

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
 * Test suite for environment variable consistency
 */
class EnvironmentConsistencyTests {
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
     * Test 1: .env structure matches env.tmpl
     */
    async testEnvTemplateConsistency() {
        // Create a test site to generate .env
        cleanup();
        fs.mkdirSync(testDir);
        process.chdir(testDir);

        // Set test environment
        process.env.JPULSE_TEST_MODE = 'true';
        process.env.JPULSE_TEST_DEPLOYMENT = 'prod';
        process.env.JPULSE_TEST_GENERATE_DEPLOY = 'true';

        try {
            // Run jpulse-configure to generate .env
            execSync('node ../bin/configure.js', { stdio: 'pipe' });

            // Read generated .env
            const envContent = fs.readFileSync('.env', 'utf8');

            // Read original template
            const templatePath = path.join('..', 'templates', 'deploy', 'env.tmpl');
            const templateContent = fs.readFileSync(templatePath, 'utf8');

            // Extract variable names from both
            const envVars = [...envContent.matchAll(/export ([A-Z_]+)=/g)].map(m => m[1]);
            const templateVars = [...templateContent.matchAll(/export ([A-Z_]+)=/g)].map(m => m[1]);

            // Check that all template variables are in .env
            const missingVars = templateVars.filter(v => !envVars.includes(v));
            if (missingVars.length > 0) {
                throw new Error(`Variables missing from .env: ${missingVars.join(', ')}`);
            }

            // Check for unexpected variables in .env
            const extraVars = envVars.filter(v => !templateVars.includes(v));
            if (extraVars.length > 0) {
                console.log(`  ℹ️  Extra variables in .env (may be computed): ${extraVars.join(', ')}`);
            }

        } finally {
            process.chdir('..');
            cleanup();
            delete process.env.JPULSE_TEST_MODE;
            delete process.env.JPULSE_TEST_DEPLOYMENT;
            delete process.env.JPULSE_TEST_GENERATE_DEPLOY;
        }
    }

    /**
     * Test 2: No duplicate variables in generated files
     */
    async testNoDuplicateVariables() {
        // Create a test site
        cleanup();
        fs.mkdirSync(testDir);
        process.chdir(testDir);

        process.env.JPULSE_TEST_MODE = 'true';
        process.env.JPULSE_TEST_DEPLOYMENT = 'prod';
        process.env.JPULSE_TEST_GENERATE_DEPLOY = 'true';

        try {
            execSync('node ../bin/configure.js', { stdio: 'pipe' });

            const envContent = fs.readFileSync('.env', 'utf8');
            const envVars = [...envContent.matchAll(/export ([A-Z_]+)=/g)].map(m => m[1]);

            // Check for duplicates
            const duplicates = envVars.filter((item, index) => envVars.indexOf(item) !== index);
            if (duplicates.length > 0) {
                throw new Error(`Duplicate variables found in .env: ${duplicates.join(', ')}`);
            }

        } finally {
            process.chdir('..');
            cleanup();
            delete process.env.JPULSE_TEST_MODE;
            delete process.env.JPULSE_TEST_DEPLOYMENT;
            delete process.env.JPULSE_TEST_GENERATE_DEPLOY;
        }
    }

    /**
     * Test 3: Section delimiters are properly maintained
     */
    async testSectionDelimiters() {
        // Read the template
        const templatePath = path.join(process.cwd(), 'templates', 'deploy', 'env.tmpl');
        const templateContent = fs.readFileSync(templatePath, 'utf8');

        // Check that sections are properly delimited by empty lines
        const lines = templateContent.split('\n');
        let inSection = false;
        let sectionCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('export ')) {
                if (!inSection) {
                    inSection = true;
                    sectionCount++;
                }
            } else if (line === '' && inSection) {
                inSection = false;
            }
        }

        if (sectionCount < 3) {
            throw new Error(`Expected at least 3 sections in env.tmpl, found ${sectionCount}`);
        }
    }

    async runAllTests() {
        console.log('🧪 Running Environment Variable Consistency Tests...\n');

        await this.runTest('Generated .env matches template structure', () => this.testEnvTemplateConsistency());
        await this.runTest('No duplicate variables in .env', () => this.testNoDuplicateVariables());
        await this.runTest('Section delimiters properly maintained', () => this.testSectionDelimiters());

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
async function runEnhancedTests() {
    console.log('🚀 jPulse Framework - Enhanced CLI Testing Suite');
    console.log('================================================\n');

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    const allFailedTests = [];

    // Run Template Expansion Tests
    const templateTests = new TemplateExpansionTests();
    const templateResults = await templateTests.runAllTests();

    totalTests += templateResults.total;
    totalPassed += templateResults.passed;
    totalFailed += templateResults.failed;
    allFailedTests.push(...templateResults.failedTests);

    console.log(`\n📊 Template Expansion Tests: ${templateResults.passed}/${templateResults.total} passed\n`);

    // Run Environment Consistency Tests
    const envTests = new EnvironmentConsistencyTests();
    const envResults = await envTests.runAllTests();

    totalTests += envResults.total;
    totalPassed += envResults.passed;
    totalFailed += envResults.failed;
    allFailedTests.push(...envResults.failedTests);

    console.log(`\n📊 Environment Consistency Tests: ${envResults.passed}/${envResults.total} passed\n`);

    // Final results
    console.log('================================================');
    console.log('📊 ENHANCED CLI TESTING RESULTS');
    console.log('================================================');
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
        console.log('\n✅ ALL ENHANCED CLI TESTS PASSED!');
        console.log('🎉 Configuration and template expansion validation successful!');
        process.exit(0);
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runEnhancedTests().catch(error => {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    });
}

export { TemplateExpansionTests, EnvironmentConsistencyTests };

// EOF bin/test-cli-enhanced.js
