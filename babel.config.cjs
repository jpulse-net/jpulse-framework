/**
 * @name            jPulse Framework / Babel Configuration
 * @tagline         Babel configuration for jPulse Framework
 * @description     Babel configuration for jPulse Framework
 * @file            babel.config.cjs
 * @version         1.6.2
 * @release         2026-01-30
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           90%, Cursor 1.7, Claude Sonnet 4
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
