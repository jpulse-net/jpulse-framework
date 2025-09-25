/**
 * @name            jPulse Framework / Babel Configuration
 * @tagline         Babel configuration for jPulse Framework
 * @description     Babel configuration for jPulse Framework
 * @file            babel.config.cjs
 * @version         0.7.21
 * @release         2025-09-25
 * @repository      https://github.com/peterthoeny/web-ide-bridge
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 'current'
                }
            }
        ]
    ]
};

// EOF babel.config.js
