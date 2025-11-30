/**
 * @name            Hello World Plugin / Model
 * @tagline         Hello Plugin Data Model
 * @description     Simple data model demonstrating plugin structure
 * @file            plugins/hello-world/webapp/model/helloPlugin.js
 * @version         1.3.0
 * @author          jPulse Team, https://jpulse.net
 * @license         BSL 1.1
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

/**
 * Hello Plugin Model - demonstrates plugin data model
 */
class HelloPluginModel {

    /**
     * Get sample data
     * @returns {Promise<object>} Sample data
     */
    static async getData() {
        try {
            return {
                title: 'Hello World Plugin',
                description: 'This is a demo plugin for jPulse Framework',
                features: [
                    'Auto-discovery',
                    'Configuration management',
                    'API endpoints',
                    'View templates',
                    'Static assets'
                ],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to get hello plugin data: ${error.message}`);
        }
    }

    /**
     * Get statistics
     * @returns {Promise<object>} Statistics
     */
    static async getStats() {
        try {
            return {
                pluginName: 'hello-world',
                version: '1.0.0',
                loadTime: new Date().toISOString(),
                active: true
            };
        } catch (error) {
            throw new Error(`Failed to get hello plugin stats: ${error.message}`);
        }
    }
}

export default HelloPluginModel;

// EOF plugins/hello-world/webapp/model/helloPlugin.js
