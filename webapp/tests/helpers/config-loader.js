/**
 * @name            jPulse Framework / WebApp / Tests / Helpers / Config Loader
 * @tagline         Jest-independent configuration loader for tests
 * @description     Loads consolidated configuration without Jest dependencies
 * @file            webapp/tests/helpers/config-loader.js
 * @version         1.4.18
 * @release         2026-01-24
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';

// Calculate project root using process.cwd() for Jest compatibility
const projectRoot = process.cwd();

// Get test file name for warning messages
const TEST_FILE = 'webapp/tests/helpers/config-loader.js';

/**
 * Load consolidated configuration from .jpulse/app.json
 */
export function getConsolidatedConfig() {
    const consolidatedConfigPath = path.join(projectRoot, '.jpulse', 'app.json');

    if (!fs.existsSync(consolidatedConfigPath)) {
        throw new Error(`Consolidated config not found: ${consolidatedConfigPath}`);
    }

    const configContent = fs.readFileSync(consolidatedConfigPath, 'utf8');
    const config = JSON.parse(configContent);

    // Ensure appDir is set correctly for tests
    if (!config.system.appDir) {
        config.system.appDir = path.join(projectRoot, 'webapp');
    }

    return config;
}

/**
 * Setup global appConfig without Jest dependencies
 */
export function setupGlobalAppConfig() {
    try {
        const config = getConsolidatedConfig();
        global.appConfig = config;
        return true;
    } catch (error) {
        console.log(`⚠️  WARNING: Failed to setup consolidated config, using fallback: ${error.message} [${TEST_FILE}]`);
        // Fallback config with all necessary properties
        global.appConfig = {
            app: {
                jPulse: {
                    name:       'jPulse Framework',
                    shortName:  'jPulse',
                    version:    '1.0.0-rc.1',
                    release:    '2025-10-22'
                },
                site: {
                    name:       'My jPulse Framework Site',
                    shortName:  'My jPulse Site',
                    copyright:  '© 1970 My Company',
                    version:    '0.1.0',
                    release:    '1970-01-01'
                }
            },
            system: {
                appDir: path.join(projectRoot, 'webapp'),
                siteDir: path.join(projectRoot, 'site', 'webapp'),
                projectRoot: projectRoot
            },
            i18n: {
                default: 'en'
            },
            database: {
                type: 'none'
            },
            controller: {
                config: {
                    defaultDocName: 'global'
                },
                handlebar: {
                    contextFilter: {
                        withoutAuth: [],
                        withAuth: []
                    },
                    maxIncludeDepth: 10,
                    cacheIncludes: {
                        enabled: false  // Disabled for tests
                    }
                },
                view: {
                    cacheTemplates: { enabled: false },
                    cacheIncludes: { enabled: false }
                }
            },
            utils: {
                i18n: {
                    cache: { enabled: false }
                }
            }
        };
        return false;
    }
}

// EOF webapp/tests/helpers/config-loader.js
