/*
 * @name            jPulse Framework / Plugins / Hello-World / WebApp / View / jPulse Common JavaScript
 * @tagline         Common JavaScript of the Hello World Plugin
 * @description     Common JavaScript of the Hello World Plugin, appended to the framework common JavaScript
 * @file            plugins/hello-world/webapp/view/jpulse-common.js
 * @version         1.7.12
 * @release         2026-08-12
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
     * W-194 demo: custom field renderer for the "Quick Links" config field
     * (plugin.json: { type: "custom", renderer: "helloWorld.renderLinkList" }).
     *
     * Shows the full custom-renderer contract: the framework only hands us a mount
     * point and the current (opaque) value; we own all rendering, interaction, and
     * validation, and report changes back via onChange(newValue). Renders an array
     * of { label, url } objects as a mini list editor (add / remove rows) — the
     * kind of shape a flat schema field can't express on its own.
     * @param {Object} ctx - { container, value, onChange, schema, config, disabled }
     */
    renderLinkList: function(ctx) {
        const container = ctx.container;
        const onChange = ctx.onChange;
        const disabled = !!ctx.disabled;
        const escape = jPulse.string.escapeHtml;
        let links = Array.isArray(ctx.value) ? ctx.value.slice() : [];

        function render() {
            const rowsHtml = links.map(function(link, idx) {
                const label = escape(link && link.label || '');
                const url = escape(link && link.url || '');
                const removeBtn = disabled ? '' :
                    '<button type="button" class="jp-btn jp-btn-sm jp-btn-secondary plg-link-remove" data-idx="' + idx + '" title="Remove">✕</button>';
                return '<div class="plg-link-row">' +
                    '<span class="plg-link-label">' + label + '</span>' +
                    '<a class="plg-link-url" href="' + url + '" target="_blank" rel="noopener">' + url + '</a>' +
                    removeBtn +
                    '</div>';
            }).join('');

            const addRowHtml = disabled ? '' :
                '<div class="plg-link-add">' +
                '<input type="text" class="jp-form-input plg-link-add-label" placeholder="Label">' +
                '<input type="text" class="jp-form-input plg-link-add-url" placeholder="https://...">' +
                '<button type="button" class="jp-btn jp-btn-sm jp-btn-secondary plg-link-add-btn">+ Add</button>' +
                '</div>';

            container.innerHTML =
                '<div class="plg-link-list">' +
                (rowsHtml || '<div class="jp-text-small jp-text-muted">No links yet.</div>') +
                '</div>' + addRowHtml;

            if (disabled) return;

            container.querySelectorAll('.plg-link-remove').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    links.splice(parseInt(btn.dataset.idx, 10), 1);
                    onChange(links);
                    render();
                });
            });

            const addBtn = container.querySelector('.plg-link-add-btn');
            const labelInput = container.querySelector('.plg-link-add-label');
            const urlInput = container.querySelector('.plg-link-add-url');
            addBtn.addEventListener('click', function() {
                const label = labelInput.value.trim();
                const url = urlInput.value.trim();
                if (!label || !url) return;
                links.push({ label: label, url: url });
                onChange(links);
                render();
            });
        }

        render();
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
