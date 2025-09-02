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
    // PHASE 2: API Call Standardization
    // ========================================

    /**
     * Standardized API call with consistent error handling
     * @param {string} endpoint - API endpoint URL
     * @param {Object} options - Fetch options (method, body, headers, etc.)
     * @returns {Object} { success: boolean, data: any, error: string, response: Response }
     */
    apiCall: async (endpoint, options = {}) => {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'  // Include cookies for session auth
        };

        const config = { ...defaultOptions, ...options };

        // Auto-stringify body if it's an object
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(endpoint, config);
            let result;

            // Try to parse JSON response
            try {
                result = await response.json();
            } catch (parseError) {
                // If not JSON, get text content
                result = { message: await response.text() };
            }

            if (!response.ok) {
                const errorMessage = result.error || result.message || `HTTP ${response.status}: ${response.statusText}`;
                return {
                    success: false,
                    data: null,
                    error: errorMessage,
                    response: response,
                    status: response.status
                };
            }

            return {
                success: true,
                data: result,
                error: null,
                response: response,
                status: response.status
            };

        } catch (networkError) {
            return {
                success: false,
                data: null,
                error: `Network error: ${networkError.message}`,
                response: null,
                status: 0
            };
        }
    },

    /**
     * API helper methods for common HTTP verbs
     */
    api: {
        /**
         * GET request
         * @param {string} endpoint - API endpoint
         * @param {Object} options - Additional fetch options
         */
        get: (endpoint, options = {}) => {
            return jPulseCommon.apiCall(endpoint, { ...options, method: 'GET' });
        },

        /**
         * POST request
         * @param {string} endpoint - API endpoint
         * @param {Object|FormData} data - Request body data
         * @param {Object} options - Additional fetch options
         */
        post: (endpoint, data = null, options = {}) => {
            return jPulseCommon.apiCall(endpoint, { ...options, method: 'POST', body: data });
        },

        /**
         * PUT request
         * @param {string} endpoint - API endpoint
         * @param {Object|FormData} data - Request body data
         * @param {Object} options - Additional fetch options
         */
        put: (endpoint, data = null, options = {}) => {
            return jPulseCommon.apiCall(endpoint, { ...options, method: 'PUT', body: data });
        },

        /**
         * DELETE request
         * @param {string} endpoint - API endpoint
         * @param {Object} options - Additional fetch options
         */
        delete: (endpoint, options = {}) => {
            return jPulseCommon.apiCall(endpoint, { ...options, method: 'DELETE' });
        }
    },

    // ========================================
    // PHASE 3: Form Handling & Validation
    // ========================================

    /**
     * Form handling utilities
     */
    form: {
        /**
         * Serialize form data to a plain object
         * @param {HTMLFormElement} formElement - The form to serialize
         * @returns {Object} Form data as key-value pairs
         */
        serialize: (formElement) => {
            const formData = new FormData(formElement);
            const data = {};

            for (let [key, value] of formData.entries()) {
                // Handle checkboxes and multiple values
                if (data[key]) {
                    // Convert to array if multiple values exist
                    if (Array.isArray(data[key])) {
                        data[key].push(value);
                    } else {
                        data[key] = [data[key], value];
                    }
                } else {
                    data[key] = value;
                }
            }

            return data;
        },

        /**
         * Set loading state for form submission buttons
         * @param {HTMLButtonElement} button - The submit button
         * @param {boolean} loading - Whether to show loading state
         * @param {string} loadingText - Text to show during loading
         */
        setLoadingState: (button, loading = true, loadingText = 'Loading...') => {
            if (loading) {
                // Store original state
                button.dataset.originalText = button.textContent;
                button.dataset.originalDisabled = button.disabled;

                // Set loading state
                button.textContent = loadingText;
                button.disabled = true;
                button.classList.add('jp-btn-loading');
            } else {
                // Restore original state
                button.textContent = button.dataset.originalText || 'Submit';
                button.disabled = button.dataset.originalDisabled === 'true';
                button.classList.remove('jp-btn-loading');

                // Clean up data attributes
                delete button.dataset.originalText;
                delete button.dataset.originalDisabled;
            }
        },

        /**
         * Clear form validation errors
         * @param {HTMLFormElement} formElement - The form to clear errors from
         */
        clearErrors: (formElement) => {
            // Remove error classes from form fields
            formElement.querySelectorAll('input, select, textarea').forEach(field => {
                field.classList.remove('jp-field-error', 'error');
            });

            // Clear any existing alerts in the form
            jPulseCommon.clearAlerts(formElement);
        },

        /**
         * Mark form fields with errors
         * @param {HTMLFormElement} formElement - The form element
         * @param {Object} errors - Object with field names as keys and error messages as values
         */
        showFieldErrors: (formElement, errors = {}) => {
            Object.keys(errors).forEach(fieldName => {
                const field = formElement.querySelector(`[name="${fieldName}"]`);
                if (field) {
                    field.classList.add('jp-field-error');
                }
            });
        },

        /**
         * Comprehensive form submission handler
         * @param {HTMLFormElement} formElement - The form to submit
         * @param {string} endpoint - API endpoint URL
         * @param {Object} options - Submission options
         * @returns {Promise<Object>} API result object
         */
        handleSubmission: async (formElement, endpoint, options = {}) => {
            const defaultOptions = {
                method: 'POST',
                successMessage: null,
                errorMessage: null,
                redirectUrl: null,
                redirectDelay: 1000,
                loadingText: 'Submitting...',
                clearOnSuccess: false,
                onSuccess: null,
                onError: null,
                beforeSubmit: null,
                afterSubmit: null,
                validateBeforeSubmit: true
            };

            const config = { ...defaultOptions, ...options };

            // Find submit button
            const submitButton = formElement.querySelector('button[type="submit"]') ||
                               formElement.querySelector('input[type="submit"]') ||
                               formElement.querySelector('.jp-btn-submit');

            // Clear previous errors
            jPulseCommon.form.clearErrors(formElement);

            // Pre-submission callback
            if (config.beforeSubmit && typeof config.beforeSubmit === 'function') {
                const shouldContinue = await config.beforeSubmit(formElement);
                if (shouldContinue === false) {
                    return { success: false, error: 'Submission cancelled by beforeSubmit callback' };
                }
            }

            // Basic validation
            if (config.validateBeforeSubmit) {
                const requiredFields = formElement.querySelectorAll('[required]');
                let hasErrors = false;

                requiredFields.forEach(field => {
                    if (!field.value.trim()) {
                        field.classList.add('jp-field-error');
                        hasErrors = true;
                    }
                });

                if (hasErrors) {
                    jPulseCommon.showError('Please fill in all required fields.');
                    return { success: false, error: 'Required fields missing' };
                }
            }

            // Set loading state
            if (submitButton) {
                jPulseCommon.form.setLoadingState(submitButton, true, config.loadingText);
            }

            try {
                // Serialize form data
                const formData = jPulseCommon.form.serialize(formElement);

                // Make API call
                const result = await jPulseCommon.apiCall(endpoint, {
                    method: config.method,
                    body: formData
                });

                if (result.success) {
                    // Success handling
                    if (config.successMessage) {
                        jPulseCommon.showSuccess(config.successMessage);
                    }

                    if (config.clearOnSuccess) {
                        formElement.reset();
                    }

                    if (config.onSuccess && typeof config.onSuccess === 'function') {
                        await config.onSuccess(result.data, formElement);
                    }

                    if (config.redirectUrl) {
                        setTimeout(() => {
                            window.location.href = config.redirectUrl;
                        }, config.redirectDelay);
                    }

                } else {
                    // Error handling
                    const errorMessage = config.errorMessage || result.error || 'Submission failed';
                    jPulseCommon.showError(errorMessage);

                    // Handle field-specific errors if provided by API
                    if (result.data && result.data.fieldErrors) {
                        jPulseCommon.form.showFieldErrors(formElement, result.data.fieldErrors);
                    }

                    if (config.onError && typeof config.onError === 'function') {
                        await config.onError(result.error, formElement);
                    }
                }

                // Post-submission callback
                if (config.afterSubmit && typeof config.afterSubmit === 'function') {
                    await config.afterSubmit(result, formElement);
                }

                return result;

            } catch (error) {
                const errorMessage = `Submission error: ${error.message}`;
                jPulseCommon.showError(errorMessage);
                return { success: false, error: errorMessage };

            } finally {
                // Always restore button state
                if (submitButton) {
                    jPulseCommon.form.setLoadingState(submitButton, false);
                }
            }
        },

        /**
         * Simple form validation helpers
         */
        validate: {
            email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            password: (password, minLength = 8) => password.length >= minLength,
            required: (value) => value && value.toString().trim().length > 0,
            match: (value1, value2) => value1 === value2
        }
    },

    // ========================================
    // PHASE 4: DOM Utilities & Helpers
    // ========================================

    /**
     * DOM manipulation utilities
     */
    dom: {
        ready: (callback) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', callback);
            } else {
                callback();
            }
        },

        createElement: (tag, className = '', textContent = '') => {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (textContent) element.textContent = textContent;
            return element;
        },

        hide: (element) => element.classList.add('jp-hidden'),
        show: (element) => element.classList.remove('jp-hidden'),
        toggle: (element) => element.classList.toggle('jp-hidden')
    },

    /**
     * String manipulation utilities
     */
    string: {
        escapeHtml: (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        capitalize: (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : str,

        slugify: (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    },

    /**
     * URL utilities
     */
    url: {
        getParams: () => {
            const params = {};
            new URLSearchParams(window.location.search).forEach((value, key) => {
                params[key] = value;
            });
            return params;
        },

        getParam: (name) => new URLSearchParams(window.location.search).get(name)
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
    entityDecode: (str) => { /* HTML entity decoding - Phase 4 */ }
};

// EOF webapp/view/jpulse-common.js
