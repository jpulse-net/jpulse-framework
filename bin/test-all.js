#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Unified Test Runner
 * @tagline         Runs all tests (webapp + CLI) with unified output
 * @description     "Don't make me think" test runner for complete validation
 * @file            bin/test-all.js
 * @version         0.7.19
 * @release         2025-09-24
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import { execSync } from 'child_process';
import process from 'process';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

/**
 * Run command with proper error handling and output parsing
 */
function runCommand(command, description, parseStats = false) {
    console.log(`\n🚀 ${description}`);
    console.log('='.repeat(60));

    try {
        if (parseStats) {
            // For Jest tests, capture both stdout and stderr since Jest outputs summary to stderr
            const output = execSync(command + ' 2>&1', {
                stdio: 'pipe',
                cwd: process.cwd(),
                encoding: 'utf8',
                shell: true
            });

            // Show the output to user
            console.log(output);
            // Parse output for test statistics
            const stats = parseTestOutput(output, description);
            console.log(`✅ ${colors.green}${description} - PASSED${colors.reset}`);
            return { success: true, stats };
        } else {
            execSync(command, {
                stdio: 'inherit',
                cwd: process.cwd()
            });
            console.log(`✅ ${colors.green}${description} - PASSED${colors.reset}`);
            return { success: true };
        }

    } catch (error) {
        console.error(`❌ ${colors.red}${description} - FAILED${colors.reset}`);
        console.error(`   Exit code: ${error.status}`);

        if (parseStats) {
            // For Jest tests, combine stdout and stderr for parsing
            let combinedOutput = '';
            if (error.stdout) {
                console.log(error.stdout);
                combinedOutput += error.stdout;
            }
            if (error.stderr) {
                console.error(error.stderr);
                combinedOutput += '\n' + error.stderr;
            }

            // Even on failure, try to parse stats
            const stats = parseTestOutput(combinedOutput, description);
            return { success: false, stats };
        }

        return { success: false };
    }
}

/**
 * Parse test output to extract statistics based on test type
 */
function parseTestOutput(output, description) {
    const lines = output.split('\n');
    let stats = { passed: 0, failed: 0, skipped: 0, total: 0 };

    console.log(`🔍 Parsing ${description} output...`);

    // Parse Jest output (Unit Tests and Integration Tests)
    if (description.includes('Unit Tests') || description.includes('Integration Tests')) {
        for (const line of lines) {
            if (line.includes('Tests:') && line.includes('total')) {
                console.log(`🎯 Found Jest summary: "${line}"`);
                const skippedMatch = line.match(/(\d+)\s+skipped/);
                const passedMatch = line.match(/(\d+)\s+passed/);
                const failedMatch = line.match(/(\d+)\s+failed/);
                const totalMatch = line.match(/(\d+)\s+total/);

                if (totalMatch) {
                    stats.skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
                    stats.passed = passedMatch ? parseInt(passedMatch[1]) : 0;
                    stats.failed = failedMatch ? parseInt(failedMatch[1]) : 0;
                    stats.total = parseInt(totalMatch[1]);
                    break;
                }
            }
        }
    }

    // Parse Enhanced CLI and MongoDB test output
    else if (description.includes('Enhanced CLI') || description.includes('MongoDB')) {
        for (const line of lines) {
            // Look for "Total Tests: 11" pattern
            const totalMatch = line.match(/Total Tests:\s*(\d+)/);
            const passedMatch = line.match(/Passed:\s*(\d+)/);
            const failedMatch = line.match(/Failed:\s*(\d+)/);

            if (totalMatch) {
                stats.total = parseInt(totalMatch[1]);
            }
            if (passedMatch) {
                stats.passed = parseInt(passedMatch[1]);
            }
            if (failedMatch) {
                stats.failed = parseInt(failedMatch[1]);
            }
        }

        // If we found total but not passed/failed, assume all passed if no failures
        if (stats.total > 0 && stats.passed === 0 && stats.failed === 0) {
            stats.passed = stats.total;
        }
    }

    // CLI Tools - now uses same format as Enhanced CLI and MongoDB
    else if (description.includes('CLI Tools')) {
        for (const line of lines) {
            // Look for "Total Tests: 11" pattern (same as Enhanced CLI/MongoDB)
            const totalMatch = line.match(/Total Tests:\s*(\d+)/);
            const passedMatch = line.match(/Passed:\s*(\d+)/);
            const failedMatch = line.match(/Failed:\s*(\d+)/);

            if (totalMatch) {
                stats.total = parseInt(totalMatch[1]);
            }
            if (passedMatch) {
                stats.passed = parseInt(passedMatch[1]);
            }
            if (failedMatch) {
                stats.failed = parseInt(failedMatch[1]);
            }
        }

        // If we found total but not passed/failed, assume all passed if no failures
        if (stats.total > 0 && stats.passed === 0 && stats.failed === 0) {
            stats.passed = stats.total;
        }
    }

    console.log(`📊 Parsed stats: ${stats.passed} passed, ${stats.failed} failed, ${stats.skipped} skipped, ${stats.total} total`);
    return stats;
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
    const cliResult = runCommand('node bin/test-cli.js', 'CLI Tools (setup, sync)', true);
    results.push({ name: 'CLI Tools', result: cliResult, baseStats: null });
    if (cliResult.success) totalPassed++; else totalFailed++;

    // Test 2: Enhanced CLI Validation
    console.log('\n📋 Test Suite 2: Enhanced CLI Validation');
    const cliEnhancedResult = runCommand('node bin/test-cli-enhanced.js', 'Enhanced CLI (template expansion, env consistency)', true);
    results.push({ name: 'Enhanced CLI Validation', result: cliEnhancedResult, baseStats: null });
    if (cliEnhancedResult.success) totalPassed++; else totalFailed++;

    // Test 3: MongoDB & Cross-Platform Validation
    console.log('\n📋 Test Suite 3: MongoDB & Cross-Platform Validation');
    const mongoValidationResult = runCommand('node bin/test-mongodb-validation.js', 'MongoDB Setup & Cross-Platform (password hashing, YAML, compatibility)', true);
    results.push({ name: 'MongoDB & Cross-Platform Validation', result: mongoValidationResult, baseStats: null });
    if (mongoValidationResult.success) totalPassed++; else totalFailed++;

    // Test 4: Unit Tests
    console.log('\n📋 Test Suite 4: Unit Tests');
    const unitResult = runCommand('jest webapp/tests/unit --runInBand', 'Unit Tests (models, controllers, utils)', true);
    results.push({ name: 'Unit Tests', result: unitResult, baseStats: null });
    if (unitResult.success) totalPassed++; else totalFailed++;

    // Test 5: Integration Tests
    console.log('\n📋 Test Suite 5: Integration Tests');
    const integrationResult = runCommand('jest webapp/tests/integration --runInBand', 'Integration Tests (routes, middleware, auth)', true);
    results.push({ name: 'Integration Tests', result: integrationResult, baseStats: null });
    if (integrationResult.success) totalPassed++; else totalFailed++;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    // Calculate statistics using actual parsed results
    const finalStats = results.map(result => {
        if (result.result.stats) {
            // Use actual parsed statistics (regardless of success/failure)
            return {
                name: result.name,
                passed: result.result.stats.passed,
                failed: result.result.stats.failed,
                skipped: result.result.stats.skipped,
                total: result.result.stats.total
            };
        } else {
            // Fallback for tests without stats parsing
            return {
                name: result.name,
                passed: result.result.success ? 1 : 0,
                failed: result.result.success ? 0 : 1,
                skipped: 0,
                total: 1
            };
        }
    });

    finalStats.forEach(stats => {
        let msg = '';
        if(stats.passed > 0 && stats.failed === 0) {
            msg = `✅ ${stats.name} -- ${colors.green}PASSED${colors.reset}`;
        } else {
            msg = `❌ ${colors.red}${stats.name} -- FAILED${colors.reset}`;
        }
        console.log(msg);
        console.log(`  - ${stats.passed} passed, ${stats.failed} failed, ${stats.skipped} skipped, ${stats.total} total`);
    });

    // Grand total calculation using actual stats
    const grandTotal = {
        skipped: finalStats.reduce((sum, stat) => sum + stat.skipped, 0),
        passed: finalStats.reduce((sum, stat) => sum + stat.passed, 0),
        failed: finalStats.reduce((sum, stat) => sum + stat.failed, 0),
        total: finalStats.reduce((sum, stat) => sum + stat.total, 0)
    };

    console.log('');
    console.log(`⏩ Grand Total:`);
    console.log(`  - ${grandTotal.passed} passed, ${grandTotal.failed} failed, ${grandTotal.skipped} skipped, ${grandTotal.total} total`);
    console.log('');

    if (totalFailed === 0) {
        console.log(`🎉 ${colors.green}All tests passed! Framework is ready for use.${colors.reset}`);
        process.exit(0);
    } else {
        console.log(`💥 ${colors.red}Some tests failed. Please review the output above.${colors.reset}`);
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
