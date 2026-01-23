#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Enhanced CLI Testing
 * @tagline         Comprehensive CLI validation tests to catch deployment issues early
 * @description     Advanced testing for configuration, template expansion, and deployment validation
 * @file            bin/test-cli-enhanced.js
 * @version         1.4.17
 * @release         2026-01-23
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
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
     * Test 6: Generated files have no unexpanded template variables
     * This test would have caught 50% of W-054 bugs
     */
    async testGeneratedFilesNoUnexpandedVars() {
        // Create a temporary site to test template expansion
        const tempSiteDir = path.join(process.cwd(), 'temp-template-test');

        try {
            // Clean up any existing temp directory
            if (fs.existsSync(tempSiteDir)) {
                fs.rmSync(tempSiteDir, { recursive: true, force: true });
            }

            fs.mkdirSync(tempSiteDir);
            const originalCwd = process.cwd();
            process.chdir(tempSiteDir);

            // Set test environment variables
            process.env.JPULSE_TEST_MODE = 'true';
            process.env.JPULSE_TEST_DEPLOYMENT = 'prod';
            process.env.JPULSE_TEST_GENERATE_DEPLOY = 'true';

            // Run npx jpulse configure with minimal config to generate files
            const configInput = [
                'My Test Site',           // Site name
                'Test',                   // Site short name
                'test-site',              // Site ID
                '8081',                   // Port
                'admin',                  // DB admin user
                'test-pass',              // DB admin pass
                'jpapp',                  // DB app user
                'test-app-pass',          // DB app pass
                'jp-test',                // DB name
                '',                       // DB host (default)
                '',                       // DB port (default)
                '',                       // DB replica set (default)
                '2',                      // PM2 instances
                'test.local',             // Domain
                '1',                      // SSL type (none)
                '2',                      // Log output (file)
                '/var/log/jpulse-test',   // Log directory
                '1'                       // Generate deployment files
            ].join('\n');

            // Run configure with input
            execSync(`echo "${configInput}" | node ${path.join(originalCwd, 'bin/configure.js')}`, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: tempSiteDir
            });

            // Check critical generated files for unexpanded variables
            const filesToCheck = [
                'package.json',
                '.env',
                'deploy/ecosystem.prod.config.cjs',
                'deploy/ecosystem.dev.config.cjs'
            ];

            // Add webapp/ATTENTION_README.txt if it exists
            if (fs.existsSync('webapp/ATTENTION_README.txt')) {
                filesToCheck.push('webapp/ATTENTION_README.txt');
            }

            const unexpandedVariables = [];

            filesToCheck.forEach(file => {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    // Look for %VARIABLE% patterns (but exclude bash date formats like %Y%m%d)
                    const matches = content.match(/%[A-Z_][A-Z0-9_]*%/g);
                    if (matches) {
                        // Filter out bash date format patterns
                        const actualUnexpanded = matches.filter(match =>
                            !match.match(/%[YmdHMS]%/) && // Common bash date formats
                            !match.match(/%[0-9]/) // Numbered patterns
                        );
                        if (actualUnexpanded.length > 0) {
                            unexpandedVariables.push({
                                file: file,
                                variables: actualUnexpanded
                            });
                        }
                    }
                }
            });

            if (unexpandedVariables.length > 0) {
                const errorMsg = unexpandedVariables.map(item =>
                    `${item.file}: ${item.variables.join(', ')}`
                ).join('\n  ');
                throw new Error(`Found unexpanded template variables:\n  ${errorMsg}`);
            }

        } finally {
            // Clean up
            process.chdir(process.cwd().replace('/temp-template-test', ''));
            if (fs.existsSync(tempSiteDir)) {
                fs.rmSync(tempSiteDir, { recursive: true, force: true });
            }
            delete process.env.JPULSE_TEST_MODE;
            delete process.env.JPULSE_TEST_DEPLOYMENT;
            delete process.env.JPULSE_TEST_GENERATE_DEPLOY;
        }
    }

    /**
     * Test 7: All referenced npm commands exist in package.json
     * This would have caught documentation/command reference bugs in W-054
     */
    async testNpmCommandReferences() {
        // Create a temporary site to test command references
        const tempSiteDir = path.join(process.cwd(), 'temp-command-test');

        try {
            // Clean up any existing temp directory
            if (fs.existsSync(tempSiteDir)) {
                fs.rmSync(tempSiteDir, { recursive: true, force: true });
            }

            fs.mkdirSync(tempSiteDir);
            const originalCwd = process.cwd();
            process.chdir(tempSiteDir);

            // Set test environment variables
            process.env.JPULSE_TEST_MODE = 'true';
            process.env.JPULSE_TEST_DEPLOYMENT = 'prod';
            process.env.JPULSE_TEST_GENERATE_DEPLOY = 'true';

            // Run npx jpulse configure to generate package.json
            const configInput = [
                'Test Site',              // Site name
                'Test',                   // Site short name
                'test-site',              // Site ID
                '8081',                   // Port
                'admin',                  // DB admin user
                'test-pass',              // DB admin pass
                'jpapp',                  // DB app user
                'test-app-pass',          // DB app pass
                'jp-test',                // DB name
                '',                       // DB host (default)
                '',                       // DB port (default)
                '',                       // DB replica set (default)
                '2',                      // PM2 instances
                'test.local',             // Domain
                '1',                      // SSL type (none)
                '2',                      // Log output (file)
                '/var/log/jpulse-test',   // Log directory
                '1'                       // Generate deployment files
            ].join('\n');

            // Run configure with input
            execSync(`echo "${configInput}" | node ${path.join(originalCwd, 'bin/configure.js')}`, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: tempSiteDir
            });

            // Check that generated package.json exists
            if (!fs.existsSync('package.json')) {
                throw new Error('package.json was not generated');
            }

            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

            // Files that might reference npm commands
            const filesToCheck = [
                path.join(originalCwd, 'bin/jpulse-setup.sh'),
                path.join(originalCwd, 'bin/jpulse-validate.sh'),
                path.join(originalCwd, 'bin/mongodb-setup.sh'),
                'README.md'
            ];

            const missingCommands = [];

            filesToCheck.forEach(file => {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    // Look for old npm run jpulse-* commands - these should NOT exist anymore
                    // We now use npx jpulse <command> instead
                    const commands = content.match(/npm run (jpulse-[a-z-]+)/g) || [];
                    commands.forEach(cmd => {
                        const scriptName = cmd.replace('npm run ', '');
                        // Any reference to old jpulse-* scripts is an error
                        missingCommands.push({
                            file: path.basename(file),
                            command: scriptName
                        });
                    });
                }
            });

            if (missingCommands.length > 0) {
                const errorMsg = missingCommands.map(item =>
                    `${item.file} references "npm run ${item.command}" - should use "npx jpulse" instead`
                ).join('\n  ');
                throw new Error(`Outdated npm script references found:\n  ${errorMsg}`);
            }

        } finally {
            // Clean up
            process.chdir(process.cwd().replace('/temp-command-test', ''));
            if (fs.existsSync(tempSiteDir)) {
                fs.rmSync(tempSiteDir, { recursive: true, force: true });
            }
            delete process.env.JPULSE_TEST_MODE;
            delete process.env.JPULSE_TEST_DEPLOYMENT;
            delete process.env.JPULSE_TEST_GENERATE_DEPLOY;
        }
    }

    /**
     * Test 8: CONFIG_REGISTRY variables have valid defaults
     * This would have caught configuration logic regressions in W-054
     */
    async testConfigRegistryValidation() {
        // Test that all CONFIG_REGISTRY entries are properly structured
        Object.entries(CONFIG_REGISTRY).forEach(([key, config]) => {
            // Skip legacy mappings (they only have maps_to property)
            if (config.maps_to) {
                return;
            }

            // Check that each config has required properties
            if (!config.hasOwnProperty('default')) {
                throw new Error(`CONFIG_REGISTRY[${key}] missing 'default' property`);
            }

            // If default is a function, test that it executes without error
            if (typeof config.default === 'function') {
                try {
                    // Create a mock config object for functions that need it
                    const mockConfig = {
                        LOG_DIR: '/var/log/jpulse',
                        SITE_NAME: 'Test Site',
                        JPULSE_SITE_ID: 'test-site'
                    };

                    // Some functions need deploymentType parameter, some need config
                    let result;
                    try {
                        result = config.default('prod', mockConfig);
                    } catch (e) {
                        // Try with just deploymentType
                        result = config.default('prod');
                    }

                    if (result === undefined || result === null) {
                        throw new Error(`Default function for ${key} returned null/undefined`);
                    }
                    // For SESSION_SECRET, verify it's a proper hex string
                    if (key === 'SESSION_SECRET') {
                        if (typeof result !== 'string' || !/^[a-f0-9]{64}$/.test(result)) {
                            throw new Error(`SESSION_SECRET default should return 64-character hex string, got: ${result}`);
                        }
                    }
                } catch (error) {
                    throw new Error(`Default function for ${key} failed: ${error.message}`);
                }
            }

            // If there's a prompt, verify it's a function
            if (config.prompt && typeof config.prompt !== 'function') {
                throw new Error(`CONFIG_REGISTRY[${key}].prompt should be a function`);
            }

            // If there's a condition, verify it's a function
            if (config.condition && typeof config.condition !== 'function') {
                throw new Error(`CONFIG_REGISTRY[${key}].condition should be a function`);
            }
        });

        // Test that critical variables are present
        const criticalVars = ['SESSION_SECRET', 'SITE_NAME', 'JPULSE_SITE_ID', 'PORT', 'DB_NAME'];
        criticalVars.forEach(varName => {
            if (!CONFIG_REGISTRY[varName]) {
                throw new Error(`Critical variable ${varName} missing from CONFIG_REGISTRY`);
            }
        });
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
        await this.runTest('Generated files have no unexpanded variables', () => this.testGeneratedFilesNoUnexpandedVars());
        await this.runTest('All referenced npm commands exist', () => this.testNpmCommandReferences());
        await this.runTest('CONFIG_REGISTRY variables have valid defaults', () => this.testConfigRegistryValidation());

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
            // Run npx jpulse configure to generate .env
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
