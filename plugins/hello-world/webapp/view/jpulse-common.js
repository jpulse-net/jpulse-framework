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

// Auto-initialize logging
console.log('[Hello World Plugin] JavaScript loaded via W-098 append mode');

// EOF plugins/hello-world/webapp/view/jpulse-common.js
