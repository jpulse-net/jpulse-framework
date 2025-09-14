#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Unified Test Runner
 * @tagline         Runs all tests (webapp + CLI) with unified output
 * @description     "Don't make me think" test runner for complete validation
 * @file            bin/test-all.js
 * @version         0.7.0
 * @release         2025-09-14
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
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

    // Test 2: Unit Tests
    console.log('\n📋 Test Suite 2: Unit Tests');
    const unitResult = runCommand('jest webapp/tests/unit --runInBand --silent', 'Unit Tests (models, controllers, utils)');
    results.push({ name: 'Unit Tests', passed: unitResult });
    if (unitResult) totalPassed++; else totalFailed++;

    // Test 3: Integration Tests
    console.log('\n📋 Test Suite 3: Integration Tests');
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
        console.log('   - For CLI issues: Check bin/setup.js and bin/sync.js');
        console.log('   - For unit test issues: Check webapp/tests/unit/');
        console.log('   - For integration issues: Check webapp/tests/integration/');
        console.log('');
        console.log('🔍 Run individual test suites:');
        console.log('   npm run test:cli        # CLI tools only');
        console.log('   npm run test:unit       # Unit tests only');
        console.log('   npm run test:integration # Integration tests only');
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
