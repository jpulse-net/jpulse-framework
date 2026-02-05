/**
 * @name            jPulse Framework / WebApp / Tests / Setup / Environment Setup
 * @tagline         Jest Environment Setup
 * @description     Sets up environment variables for Jest tests
 * @file            webapp/tests/setup/env-setup.js
 * @version         1.6.8
 * @release         2026-02-05
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

// Set NODE_ENV to test to disable CacheManager periodic refresh timers
process.env.NODE_ENV = 'test';

// Also set a global flag for extra clarity
global.isTestEnvironment = true;

// EOF webapp/tests/setup/env-setup.js
