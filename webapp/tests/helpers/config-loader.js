/**
 * @name            jPulse Framework / WebApp / Tests / Helpers / Config Loader
 * @tagline         Jest-independent configuration loader for tests
 * @description     Loads consolidated configuration without Jest dependencies
 * @file            webapp/tests/helpers/config-loader.js
 * @version         0.4.4
 * @release         2025-09-04
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           95%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';

// Calculate project root using process.cwd() for Jest compatibility
const projectRoot = process.cwd();

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
    
    // Ensure dirName is set correctly for tests
    if (!config.app.dirName) {
        config.app.dirName = path.join(projectRoot, 'webapp');
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
        console.warn('Failed to setup consolidated config, using fallback:', error.message);
        // Fallback config with all necessary properties
        global.appConfig = {
            app: {
                version: '0.3.7',
                name: 'jPulse Framework Test',
                dirName: path.join(projectRoot, 'webapp')
            },
            i18n: {
                default: 'en'
            },
            database: {
                type: 'none'
            }
        };
        return false;
    }
}
