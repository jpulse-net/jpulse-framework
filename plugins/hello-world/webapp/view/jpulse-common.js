/*
 * @name            jPulse Framework / Plugins / Hello-World / WebApp / View / jPulse Common JavaScript
 * @tagline         Common JavaScript of the Hello World Plugin
 * @description     Common JavaScript of the Hello World Plugin, appended to the framework common JavaScript
 * @file            plugins/hello-world/webapp/view/jpulse-common.js
 * @version         1.3.14
 * @release         2025-12-13
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.1, Claude Sonnet 4.5
 */

/**
 * Hello World Plugin JavaScript (W-098 Append Mode)
 * This file is automatically appended to the framework's jpulse-common.js
 * Namespace: window.jPulse.plugins.helloWorld
 */

// Ensure plugin namespace exists (framework defines jPulse.plugins = {})
if (!window.jPulse) {
    window.jPulse = {};
}
if (!window.jPulse.plugins) {
    window.jPulse.plugins = {};
}

/**
 * Hello World plugin namespace
 */
window.jPulse.plugins.helloWorld = {
    /**
     * Greet a user
     * @param {string} name - Name to greet
     * @returns {string} Greeting message
     */
    greet: function(name) {
        return `Hello, ${name}! 🔌`;
    },

    /**
     * Get current timestamp
     * @returns {string} ISO timestamp
     */
    getTimestamp: function() {
        return new Date().toISOString();
    },

    /**
     * Calculate sum of two numbers
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {number} Sum
     */
    calculateSum: function(a, b) {
        return a + b;
    },

    /**
     * Plugin utility functions
     */
    utils: {
        /**
         * Get plugin configuration
         * @returns {Promise<object>} Plugin configuration
         */
        getConfig: async function() {
            try {
                const response = await jPulse.api.get('/api/1/helloPlugin');
                if (response.success && response.data.config) {
                    return response.data.config;
                }
                return null;
            } catch (error) {
                console.error('Error getting plugin config:', error);
                return null;
            }
        },

        /**
         * Log plugin message
         * @param {string} message - Message to log
         */
        log: function(message) {
            console.log(`[Hello World Plugin] ${message}`);
        }
    }
};

// EOF plugins/hello-world/webapp/view/jpulse-common.js
