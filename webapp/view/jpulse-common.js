/*
 * @name            jPulse Framework / WebApp / View / jPulse Common JavaScript
 * @tagline         Common JavaScript utilities for the jPulse Framework
 * @description     This is the common JavaScript utilities for the jPulse Framework
 * @file            webapp/view/jpulse-common.js
 * @version         0.3.9
 * @release         2025-09-02
 * @repository      https://github.com/peterthoeny/web-ide-bridge
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

window.jPulseCommon = {
    // ========================================
    // PHASE 1: Core Alert & Messaging System
    // ========================================
    
    /**
     * Show alert message with consistent styling
     * @param {string} message - The message to display
     * @param {string} type - Alert type: 'info', 'error', 'success', 'warning'
     * @param {Element} container - Container element (defaults to .jpulse-main)
     * @param {number} duration - Auto-hide duration in ms (0 = no auto-hide)
     * @returns {Element} The created alert element
     */
    showAlert: (message, type = 'info', container = null, duration = 5000) => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `jp-alert jp-alert-${type}`;
        alertDiv.textContent = message;
        
        // Find target container
        const target = container || 
                      document.querySelector('.jpulse-main') || 
                      document.querySelector('.jp-container') ||
                      document.body;
        
        // Insert at the top of the container
        target.insertBefore(alertDiv, target.firstChild);
        
        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, duration);
        }
        
        return alertDiv;
    },

    /**
     * Show error alert (red styling)
     */
    showError: (message, container = null) => {
        return jPulseCommon.showAlert(message, 'error', container);
    },

    /**
     * Show success alert (green styling)
     */
    showSuccess: (message, container = null) => {
        return jPulseCommon.showAlert(message, 'success', container);
    },

    /**
     * Show info alert (blue styling)
     */
    showInfo: (message, container = null) => {
        return jPulseCommon.showAlert(message, 'info', container);
    },

    /**
     * Show warning alert (yellow styling)
     */
    showWarning: (message, container = null) => {
        return jPulseCommon.showAlert(message, 'warning', container);
    },

    /**
     * Clear all alert messages
     * @param {Element} container - Container to clear alerts from (defaults to document)
     */
    clearAlerts: (container = null) => {
        const target = container || document;
        target.querySelectorAll('.jp-alert').forEach(alert => alert.remove());
    },

    // ========================================
    // PLACEHOLDERS (Future Phases)
    // ========================================

    // Browser/Device Detection (Phase 5)
    isMobile: () => window.innerWidth <= 768,
    isTouchDevice: () => 'ontouchstart' in window,
    windowHasFocus: () => document.hasFocus(),

    // Placeholder functions for future phases
    detectOs: () => { /* OS detection - Phase 5 */ },
    detectBrowser: () => { /* browser detection - Phase 5 */ },
    getCookie: (name) => { /* cookie getter - Phase 5 */ },
    setCookie: (name, value, days = 30) => { /* cookie setter - Phase 5 */ },
    entityEncode: (str) => { /* HTML entity encoding - Phase 4 */ },
    entityDecode: (str) => { /* HTML entity decoding - Phase 4 */ },
    apiCall: async (endpoint, options = {}) => { /* standardized API calls - Phase 2 */ }
};

// EOF webapp/view/jpulse-common.js
