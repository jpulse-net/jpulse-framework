#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Unified Test Runner
 * @tagline         Runs all tests (webapp + CLI) with unified output
 * @description     "Don't make me think" test runner for complete validation
 * @file            bin/test-all.js
 * @version         0.7.15
 * @release         2025-09-22
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import { execSync } from 'child_process';
import process from 'process';

/**
 * Run command with proper error handling and output
 */
function runCommand(command, description) {
    console.log(`\n🚀 ${description}`);
    console.log('='.repeat(60));

    try {
        execSync(command, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        console.log(`✅ ${description} - PASSED`);
        return true;
    } catch (error) {
        console.error(`❌ ${description} - FAILED`);
        console.error(`   Exit code: ${error.status}`);
        return false;
    }
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log('🧪 jPulse Framework - Unified Test Suite');
    console.log('========================================');

    const results = [];
    let totalPassed = 0;
    let totalFailed = 0;

    // Test 1: CLI Tools
    console.log('\n📋 Test Suite 1: CLI Tools');
    const cliResult = runCommand('node bin/test-cli.js', 'CLI Tools (setup, sync)');
    results.push({ name: 'CLI Tools', passed: cliResult });
    if (cliResult) totalPassed++; else totalFailed++;

    // Test 2: Enhanced CLI Validation
    console.log('\n📋 Test Suite 2: Enhanced CLI Validation');
    const cliEnhancedResult = runCommand('node bin/test-cli-enhanced.js', 'Enhanced CLI (template expansion, env consistency)');
    results.push({ name: 'Enhanced CLI Validation', passed: cliEnhancedResult });
    if (cliEnhancedResult) totalPassed++; else totalFailed++;

    // Test 3: MongoDB & Cross-Platform Validation
    console.log('\n📋 Test Suite 3: MongoDB & Cross-Platform Validation');
    const mongoValidationResult = runCommand('node bin/test-mongodb-validation.js', 'MongoDB Setup & Cross-Platform (password hashing, YAML, compatibility)');
    results.push({ name: 'MongoDB & Cross-Platform Validation', passed: mongoValidationResult });
    if (mongoValidationResult) totalPassed++; else totalFailed++;

    // Test 4: Unit Tests
    console.log('\n📋 Test Suite 4: Unit Tests');
    const unitResult = runCommand('jest webapp/tests/unit --runInBand --silent', 'Unit Tests (models, controllers, utils)');
    results.push({ name: 'Unit Tests', passed: unitResult });
    if (unitResult) totalPassed++; else totalFailed++;

    // Test 5: Integration Tests
    console.log('\n📋 Test Suite 5: Integration Tests');
    const integrationResult = runCommand('jest webapp/tests/integration --runInBand --silent', 'Integration Tests (routes, middleware, auth)');
    results.push({ name: 'Integration Tests', passed: integrationResult });
    if (integrationResult) totalPassed++; else totalFailed++;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    results.forEach(result => {
        const status = result.passed ? '✅ PASSED' : '❌ FAILED';
        console.log(`${status} ${result.name}`);
    });

    console.log('');
    console.log(`📈 Results: ${totalPassed} passed, ${totalFailed} failed`);

    if (totalFailed === 0) {
        console.log('🎉 All tests passed! Framework is ready for use.');
        process.exit(0);
    } else {
        console.log('💥 Some tests failed. Please review the output above.');
        console.log('');
        console.log('💡 Quick fixes:');
        console.log('   - For CLI issues: Check bin/configure.js and bin/jpulse-update.js');
        console.log('   - For template expansion issues: Check bin/config-registry.js');
        console.log('   - For MongoDB issues: Check bin/mongodb-setup.sh');
        console.log('   - For unit test issues: Check webapp/tests/unit/');
        console.log('   - For integration issues: Check webapp/tests/integration/');
        console.log('');
        console.log('🔍 Run individual test suites:');
        console.log('   npm run test:cli                # Basic CLI tools');
        console.log('   npm run test:cli-enhanced       # Enhanced CLI validation');
        console.log('   npm run test:mongodb-validation # MongoDB & cross-platform');
        console.log('   npm run test:unit               # Unit tests only');
        console.log('   npm run test:integration        # Integration tests only');
        process.exit(1);
    }
}

// Handle process interruption gracefully
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Test run interrupted by user');
    process.exit(130);
});

process.on('SIGTERM', () => {
    console.log('\n\n⚠️  Test run terminated');
    process.exit(143);
});

runAllTests().catch(error => {
    console.error('\n❌ Test runner failed:', error.message);
    process.exit(1);
});

// EOF bin/test-all.js
