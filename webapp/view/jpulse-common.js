/*
 * @name            jPulse Framework / WebApp / View / jPulse Common JavaScript
 * @tagline         Common JavaScript utilities for the jPulse Framework
 * @description     This is the common JavaScript utilities for the jPulse Framework
 * @file            webapp/view/jpulse-common.js
 * @version         0.4.5
 * @release         2025-09-04
 * @repository      https://github.com/peterthoeny/web-ide-bridge
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

window.jPulseCommon = {
    // Slide-down message queue management
    _slideDownQueue: [],

    // ========================================
    // PHASE 1: Core Slide-Down Messaging System
    // ========================================

    /**
     * Show non-blocking slide-down message with consistent styling
     * @param {string} message - The message to display
     * @param {string} type - Message type: 'info', 'error', 'success', 'warning'
     * @param {number} duration - Auto-hide duration in ms (0 = no auto-hide, uses config if not specified)
     * @returns {Element} The created slide-down message element
     */
    showSlideDownMessage: (message, type = 'info', duration = null) => {
        // Get duration from config if not specified
        if (duration === null) {
            const config = window.appConfig?.view?.slideDownMessage?.duration;
            duration = config?.[type] || 5000;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `jp-slide-down jp-slide-down-${type}`;
        messageDiv.textContent = message;
        messageDiv.dataset.type = type;
        messageDiv.dataset.duration = duration;

        // Add to queue
        jPulseCommon._slideDownQueue.push(messageDiv);

        // Process only the new message
        jPulseCommon._processSlideDownMessage(messageDiv);

        return messageDiv;
    },

    /**
     * Process a single new slide-down message
     * @param {Element} messageDiv - The message element to process
     */
    _processSlideDownMessage: (messageDiv) => {
        const index = jPulseCommon._slideDownQueue.indexOf(messageDiv);

        // Add to DOM first so we can measure height
        document.body.appendChild(messageDiv);

        // Force reflow to ensure styles are applied
        messageDiv.offsetHeight;

        // Calculate dynamic stacking based on actual heights of previous messages
        let stackOffset = 0;
        if (index > 0) {
            for (let i = 0; i < index; i++) {
                const prevMessage = jPulseCommon._slideDownQueue[i];
                if (prevMessage && prevMessage.parentNode) {
                    stackOffset += prevMessage.offsetHeight + 5; // 5px gap between messages
                }
            }
        }

        // Stack messages below header
        messageDiv.dataset.stackIndex = index;
        messageDiv.style.setProperty('--stack-offset', `${stackOffset}px`);

        // Trigger slide-down animation
        setTimeout(() => {
            messageDiv.classList.add('jp-slide-down-show');
        }, 100);

        // Auto-hide after duration
        const duration = parseInt(messageDiv.dataset.duration);
        if (duration > 0) {
            setTimeout(() => {
                jPulseCommon._hideSlideDownMessage(messageDiv);
            }, duration);
        }
    },

    /**
     * Hide slide-down message with slide-up animation
     * @param {Element} messageDiv - Message element to hide
     */
    _hideSlideDownMessage: (messageDiv) => {
        if (!messageDiv || !messageDiv.parentNode) return;

        // Trigger slide-up animation (back behind header)
        messageDiv.classList.remove('jp-slide-down-show');
        messageDiv.classList.add('jp-slide-down-hide');

        // Remove from DOM after animation
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
            // Remove from queue
            const index = jPulseCommon._slideDownQueue.indexOf(messageDiv);
            if (index > -1) {
                jPulseCommon._slideDownQueue.splice(index, 1);
            }
        }, 600); // Match the longer animation time
    },

    /**
     * Show error slide-down message (red styling)
     */
    showSlideDownError: (message) => {
        return jPulseCommon.showSlideDownMessage(message, 'error');
    },

    /**
     * Show success slide-down message (green styling)
     */
    showSlideDownSuccess: (message) => {
        return jPulseCommon.showSlideDownMessage(message, 'success');
    },

    /**
     * Show info slide-down message (blue styling)
     */
    showSlideDownInfo: (message) => {
        return jPulseCommon.showSlideDownMessage(message, 'info');
    },

    /**
     * Show warning slide-down message (yellow styling)
     */
    showSlideDownWarning: (message) => {
        return jPulseCommon.showSlideDownMessage(message, 'warning');
    },

    /**
     * Clear all slide-down messages
     */
    clearSlideDownMessages: () => {
        // Clear all messages in queue
        jPulseCommon._slideDownQueue.forEach(messageDiv => {
            jPulseCommon._hideSlideDownMessage(messageDiv);
        });
        jPulseCommon._slideDownQueue = [];
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
                // For non-OK responses, if the result already has error structure, return it
                // Otherwise, create a standardized error response
                if (result && typeof result === 'object' && 'success' in result) {
                    return result; // Controller already returned proper error format
                } else {
                    const errorMessage = result.error || result.message || `HTTP ${response.status}: ${response.statusText}`;
                    return {
                        success: false,
                        error: errorMessage,
                        code: 'HTTP_ERROR'
                    };
                }
            }

            // For successful responses, return the controller response directly
            // Controllers already return { success, data, message } format
            return result;

        } catch (networkError) {
            return {
                success: false,
                error: `Network error: ${networkError.message}`,
                code: 'NETWORK_ERROR'
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
            jPulseCommon.clearSlideDownMessages();
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
         * Comprehensive form submission handler with auto-binding support
         * @param {HTMLFormElement} formElement - The form to submit
         * @param {string} endpoint - API endpoint URL
         * @param {Object} options - Submission options
         * @returns {Promise<Object>} API result object (when called with event) or void (when auto-binding)
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
                validateBeforeSubmit: true,
                autoBind: true  // New option for auto-binding
            };

            const config = { ...defaultOptions, ...options };

            // If autoBind is true and we're not in an event context, bind the submit event
            if (config.autoBind && !options._isEventCall) {
                formElement.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    return await jPulseCommon.form.handleSubmission(formElement, endpoint, {
                        ...options,
                        autoBind: false,
                        _isEventCall: true
                    });
                });
                return; // Exit early for auto-binding
            }

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
                    jPulseCommon.showSlideDownError('Please fill in all required fields.');
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
                        jPulseCommon.showSlideDownSuccess(config.successMessage);
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
                    jPulseCommon.showSlideDownError(errorMessage);

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
                jPulseCommon.showSlideDownError(errorMessage);
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
    // PHASE 5: Browser & Device Detection
    // ========================================

    /**
     * Device and browser detection utilities
     */
    device: {
        isMobile: () => window.innerWidth <= 768,
        isTablet: () => window.innerWidth > 768 && window.innerWidth <= 1024,
        isDesktop: () => window.innerWidth > 1024,
        isTouchDevice: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,

        getViewportSize: () => ({
            width: window.innerWidth,
            height: window.innerHeight
        }),

        detectBrowser: () => {
            const ua = navigator.userAgent;
            if (ua.includes('Chrome') && !ua.includes('Edg')) return 'chrome';
            if (ua.includes('Firefox')) return 'firefox';
            if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
            if (ua.includes('Edg')) return 'edge';
            return 'unknown';
        },

        detectOs: () => {
            const ua = navigator.userAgent;
            if (ua.includes('Windows')) return 'windows';
            if (ua.includes('Mac')) return 'mac';
            if (ua.includes('Linux')) return 'linux';
            if (ua.includes('Android')) return 'android';
            if (ua.includes('iPhone') || ua.includes('iPad')) return 'ios';
            return 'unknown';
        }
    },

    /**
     * Cookie management utilities
     */
    cookies: {
        get: (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        },

        set: (name, value, days = 30) => {
            const expires = new Date(Date.now() + days * 864e5).toUTCString();
            document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
        },

        delete: (name) => {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
    }
};

// EOF webapp/view/jpulse-common.js
