/*
 * @name            jPulse Framework / WebApp / View / jPulse Common JavaScript
 * @tagline         Common JavaScript utilities for the jPulse Framework
 * @description     This is the common JavaScript utilities for the jPulse Framework
 * @file            webapp/view/jpulse-common.js
 * @version         0.6.5
 * @release         2025-09-12
 * @repository      https://github.com/peterthoeny/web-ide-bridge
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

window.jPulse = {
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
        jPulse._slideDownQueue.push(messageDiv);

        // Process only the new message
        jPulse._processSlideDownMessage(messageDiv);

        return messageDiv;
    },

    /**
     * Process a single new slide-down message
     * @param {Element} messageDiv - The message element to process
     */
    _processSlideDownMessage: (messageDiv) => {
        const index = jPulse._slideDownQueue.indexOf(messageDiv);

        // Add to DOM first so we can measure height
        document.body.appendChild(messageDiv);

        // Force reflow to ensure styles are applied
        messageDiv.offsetHeight;

        // Calculate dynamic stacking based on actual heights of previous messages
        let stackOffset = 0;
        if (index > 0) {
            for (let i = 0; i < index; i++) {
                const prevMessage = jPulse._slideDownQueue[i];
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
                jPulse._hideSlideDownMessage(messageDiv);
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
            const index = jPulse._slideDownQueue.indexOf(messageDiv);
            if (index > -1) {
                jPulse._slideDownQueue.splice(index, 1);
            }
        }, 600); // Match the longer animation time
    },

    /**
     * Show error slide-down message (red styling)
     */
    showSlideDownError: (message) => {
        return jPulse.showSlideDownMessage(message, 'error');
    },

    /**
     * Show success slide-down message (green styling)
     */
    showSlideDownSuccess: (message) => {
        return jPulse.showSlideDownMessage(message, 'success');
    },

    /**
     * Show info slide-down message (blue styling)
     */
    showSlideDownInfo: (message) => {
        return jPulse.showSlideDownMessage(message, 'info');
    },

    /**
     * Show warning slide-down message (yellow styling)
     */
    showSlideDownWarning: (message) => {
        return jPulse.showSlideDownMessage(message, 'warning');
    },

    /**
     * Clear all slide-down messages
     */
    clearSlideDownMessages: () => {
        // Clear all messages in queue
        jPulse._slideDownQueue.forEach(messageDiv => {
            jPulse._hideSlideDownMessage(messageDiv);
        });
        jPulse._slideDownQueue = [];
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
            return jPulse.apiCall(endpoint, { ...options, method: 'GET' });
        },

        /**
         * POST request
         * @param {string} endpoint - API endpoint
         * @param {Object|FormData} data - Request body data
         * @param {Object} options - Additional fetch options
         */
        post: (endpoint, data = null, options = {}) => {
            return jPulse.apiCall(endpoint, { ...options, method: 'POST', body: data });
        },

        /**
         * PUT request
         * @param {string} endpoint - API endpoint
         * @param {Object|FormData} data - Request body data
         * @param {Object} options - Additional fetch options
         */
        put: (endpoint, data = null, options = {}) => {
            return jPulse.apiCall(endpoint, { ...options, method: 'PUT', body: data });
        },

        /**
         * DELETE request
         * @param {string} endpoint - API endpoint
         * @param {Object} options - Additional fetch options
         */
        delete: (endpoint, options = {}) => {
            return jPulse.apiCall(endpoint, { ...options, method: 'DELETE' });
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
         * Binds the comprehensive form submission handler to a form's submit event.
         * A convenience wrapper for simple forms that don't need custom pre-submission logic.
         * @param {HTMLFormElement} formElement - The form to bind
         * @param {string} endpoint - API endpoint URL
         * @param {Object} options - Submission options
         */
        bindSubmission: (formElement, endpoint, options = {}) => {
            formElement.addEventListener('submit', async (event) => {
                event.preventDefault();
                await jPulse.form.handleSubmission(formElement, endpoint, options);
            });
        },

        /**
         * Executes the comprehensive form submission logic immediately.
         * Intended to be called from within a custom `submit` event listener.
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
            jPulse.form.clearErrors(formElement);

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
                    jPulse.showSlideDownError('Please fill in all required fields.');
                    return { success: false, error: 'Required fields missing' };
                }
            }

            // Set loading state
            if (submitButton) {
                jPulse.form.setLoadingState(submitButton, true, config.loadingText);
            }

            try {
                // Serialize form data
                const formData = jPulse.form.serialize(formElement);

                // Make API call
                const result = await jPulse.apiCall(endpoint, {
                    method: config.method,
                    body: formData
                });

                if (result.success) {
                    // Success handling
                    if (config.successMessage) {
                        jPulse.showSlideDownSuccess(config.successMessage);
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
                    // If a custom onError handler is provided, let it handle the message display.
                    if (config.onError && typeof config.onError === 'function') {
                        await config.onError(result.error, formElement);
                    } else {
                        // Otherwise, show the default error message.
                        const errorMessage = config.errorMessage || result.error || 'Submission failed';
                        jPulse.showSlideDownError(errorMessage);
                    }

                    // Handle field-specific errors if provided by API
                    if (result.data && result.data.fieldErrors) {
                        jPulse.form.showFieldErrors(formElement, result.data.fieldErrors);
                    }
                }

                // Post-submission callback
                if (config.afterSubmit && typeof config.afterSubmit === 'function') {
                    await config.afterSubmit(result, formElement);
                }

                return result;

            } catch (error) {
                const errorMessage = `Submission error: ${error.message}`;
                jPulse.showSlideDownError(errorMessage);
                return { success: false, error: errorMessage };

            } finally {
                // Always restore button state
                if (submitButton) {
                    jPulse.form.setLoadingState(submitButton, false);
                }
            }
        },

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
            jPulse.clearSlideDownMessages();
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
    },


    // ========================================
    // PHASE 7: UI Widgets (W-048)
    // ========================================

    /**
     * UI Widgets namespace
     */
    UI: {
        // Dialog management
        _dialogStack: [],
        _baseZIndex: 1000,
        _alertZIndex: 2000,

        /**
         * Show alert dialog with red header styling
         * @param {string} message - The message to display (supports simple HTML)
         * @param {Object} options - Configuration options
         * @returns {Promise<void>} Promise that resolves when dialog is closed
         */
        alertDialog: (message, options = {}) => {
            return jPulse.UI._showDialog(message, 'alert', options);
        },

        /**
         * Show info dialog with blue header styling
         * @param {string} message - The message to display (supports simple HTML)
         * @param {Object} options - Configuration options
         * @returns {Promise<void>} Promise that resolves when dialog is closed
         */
        infoDialog: (message, options = {}) => {
            return jPulse.UI._showDialog(message, 'info', options);
        },

        /**
         * Show confirm dialog with custom buttons and callbacks
         * @param {Object} options - Configuration options
         * @returns {Promise<Object>} Promise that resolves with user choice
         */
        confirmDialog: (options = {}) => {
            const defaultOptions = {
                title: null,
                message: 'Are you sure?',
                buttons: ['Cancel', 'OK'],
                width: null,
                minWidth: 400,
                height: null,
                minHeight: 200,
                zIndex: null,
                onOpen: null,
                onClose: null
            };

            const config = { ...defaultOptions, ...options };

            return new Promise((resolve) => {
                // Get i18n title if not provided
                const title = config.title || (window.i18n?.view?.ui?.confirmDialog?.title || 'Confirm');

                // Create dialog elements
                const overlay = jPulse.UI._createDialogOverlay();
                const dialog = jPulse.UI._createDialogElement(title, config.message, 'confirm', config);

                // Handle different button configurations
                const buttonContainer = dialog.querySelector('.jp-dialog-buttons');

                if (Array.isArray(config.buttons)) {
                    // Simple array of button labels - return Promise with result
                    config.buttons.forEach((buttonText, index) => {
                        const button = jPulse.UI._createDialogButton(buttonText, () => {
                            const result = {
                                confirmed: index > 0, // First button (index 0) is typically Cancel
                                button: buttonText,
                                buttonIndex: index
                            };
                            jPulse.UI._closeDialog(overlay, dialog);
                            resolve(result);
                        });
                        buttonContainer.appendChild(button);
                    });
                } else if (typeof config.buttons === 'object') {
                    // Object with button text as keys and callbacks as values
                    Object.entries(config.buttons).forEach(([buttonText, callback]) => {
                        const button = jPulse.UI._createDialogButton(buttonText, async () => {
                            let shouldClose = true;

                            if (typeof callback === 'function') {
                                try {
                                    const result = await callback(dialog, buttonText);
                                    // Check if callback returned dontClose flag
                                    if (result === true || result?.dontClose === true) {
                                        shouldClose = false;
                                    }
                                } catch (error) {
                                    console.error('Dialog callback error:', error);
                                }
                            }

                            if (shouldClose) {
                                jPulse.UI._closeDialog(overlay, dialog);
                                resolve({
                                    confirmed: true,
                                    button: buttonText
                                });
                            }
                        });
                        buttonContainer.appendChild(button);
                    });
                }

                // Add to DOM and show
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // Set z-index (confirm dialogs use base z-index)
                const zIndex = config.zIndex || (jPulse.UI._baseZIndex + jPulse.UI._dialogStack.length * 10);
                overlay.style.zIndex = zIndex;
                jPulse.UI._dialogStack.push({ overlay, dialog, type: 'confirm' });

                // Show with animation
                setTimeout(() => {
                    overlay.classList.add('jp-dialog-show');
                    dialog.classList.add('jp-dialog-show');
                }, 10);

                // Handle ESC key (close with cancelled result)
                const handleEscape = (e) => {
                    if (e.key === 'Escape') {
                        document.removeEventListener('keydown', handleEscape);
                        jPulse.UI._closeDialog(overlay, dialog);
                        resolve({
                            confirmed: false,
                            button: 'ESC',
                            cancelled: true
                        });
                    }
                };
                document.addEventListener('keydown', handleEscape);

                // Call onOpen callback
                if (config.onOpen && typeof config.onOpen === 'function') {
                    config.onOpen(dialog);
                }

                // Focus management
                jPulse.UI._trapFocus(dialog);
            });
        },

        /**
         * Collapsible component (moved from root namespace)
         */
        collapsible: {
            /**
             * Register a collapsible section with configuration
             * @param {string} elementId - The ID of the .jp-collapsible element
             * @param {Object} config - Configuration object
             * @param {boolean} config.initOpen - Whether to start expanded (default: false)
             * @param {Function} config.onOpen - Callback when opened
             * @param {Function} config.onClose - Callback when closed
             * @returns {Object} Handle object with methods for controlling the collapsible
             */
            register: (elementId, config = {}) => {
                const element = document.getElementById(elementId);
                if (!element) {
                    console.warn(`Collapsible element with ID '${elementId}' not found`);
                    return null;
                }

                const defaultConfig = {
                    initOpen: false,
                    onOpen: null,
                    onClose: null
                };

                const finalConfig = { ...defaultConfig, ...config };

                // Setup the collapsible
                jPulse.UI.collapsible._setup(element, finalConfig);

                // Return handle object for method chaining and cleaner API
                return {
                    elementId: elementId,
                    toggle: () => jPulse.UI.collapsible._toggle(elementId),
                    expand: () => jPulse.UI.collapsible._expand(elementId),
                    collapse: () => jPulse.UI.collapsible._collapse(elementId),
                    isExpanded: () => jPulse.UI.collapsible._isExpanded(elementId)
                };
            },

            /**
             * Toggle a collapsible section (internal)
             * @param {string} elementId - The ID of the .jp-collapsible element
             */
            _toggle: (elementId) => {
                const element = document.getElementById(elementId);
                if (!element) {
                    console.warn(`Collapsible element with ID '${elementId}' not found`);
                    return;
                }

                const isExpanded = element.classList.contains('jp-expanded');
                if (isExpanded) {
                    jPulse.UI.collapsible._collapse(elementId);
                } else {
                    jPulse.UI.collapsible._expand(elementId);
                }
            },

            /**
             * Expand a collapsible section (internal)
             * @param {string} elementId - The ID of the .jp-collapsible element
             */
            _expand: (elementId) => {
                const element = document.getElementById(elementId);
                if (!element) {
                    console.warn(`Collapsible element with ID '${elementId}' not found`);
                    return;
                }
                jPulse.UI.collapsible._expandElement(element);
            },

            /**
             * Collapse a collapsible section (internal)
             * @param {string} elementId - The ID of the .jp-collapsible element
             */
            _collapse: (elementId) => {
                const element = document.getElementById(elementId);
                if (!element) {
                    console.warn(`Collapsible element with ID '${elementId}' not found`);
                    return;
                }
                jPulse.UI.collapsible._collapseElement(element);
            },

            /**
             * Check if a collapsible section is expanded (internal)
             * @param {string} elementId - The ID of the .jp-collapsible element
             * @returns {boolean} True if expanded, false if collapsed
             */
            _isExpanded: (elementId) => {
                const element = document.getElementById(elementId);
                if (!element) {
                    console.warn(`Collapsible element with ID '${elementId}' not found`);
                    return false;
                }
                return element.classList.contains('jp-expanded');
            },

            // ========================================
            // INTERNAL FUNCTIONS (prefixed with _)
            // ========================================

            /**
             * Setup a single collapsible section (INTERNAL)
             * @param {Element} collapsibleElement - The .jp-collapsible element
             * @param {Object} config - Configuration object
             */
            _setup: (collapsibleElement, config = {}) => {
                // Look for either .jp-collapsible-header or direct h3 element
                let header = collapsibleElement.querySelector('.jp-collapsible-header');
                let h3 = null;

                if (!header) {
                    // If no .jp-collapsible-header, use the h3 directly
                    h3 = collapsibleElement.querySelector('h3');
                    if (!h3) {
                        console.warn('Collapsible element missing required h3 or .jp-collapsible-header');
                        return;
                    }
                    header = h3; // Use h3 as the clickable header
                } else {
                    h3 = header.querySelector('h3') || header;
                }

                let arrow = collapsibleElement.querySelector('.jp-collapsible-arrow');

                // Create arrow if it doesn't exist and add it to the right of the header text
                if (!arrow) {
                    arrow = document.createElement('span');
                    arrow.className = 'jp-collapsible-arrow';

                    // Append arrow at the end of the h3 element
                    h3.appendChild(arrow);
                }

                // Set initial state
                if (config.initOpen) {
                    collapsibleElement.classList.add('jp-expanded');
                    arrow.textContent = '▼';
                } else {
                    collapsibleElement.classList.remove('jp-expanded');
                    arrow.textContent = '▶';
                }

                // Store config on element for later use
                collapsibleElement._jpCollapsibleConfig = config;

                // Add click handler to the header (h3 or wrapper)
                header.addEventListener('click', () => {
                    jPulse.UI.collapsible._toggleElement(collapsibleElement);
                });

                // Add cursor pointer style to indicate clickability
                header.style.cursor = 'pointer';
            },

            /**
             * Toggle a collapsible section (INTERNAL)
             * @param {Element} collapsibleElement - The .jp-collapsible element
             */
            _toggleElement: (collapsibleElement) => {
                const isExpanded = collapsibleElement.classList.contains('jp-expanded');

                if (isExpanded) {
                    jPulse.UI.collapsible._collapseElement(collapsibleElement);
                } else {
                    jPulse.UI.collapsible._expandElement(collapsibleElement);
                }
            },

            /**
             * Expand a collapsible section (INTERNAL)
             * @param {Element} collapsibleElement - The .jp-collapsible element
             */
            _expandElement: (collapsibleElement) => {
                const arrow = collapsibleElement.querySelector('.jp-collapsible-arrow');
                const config = collapsibleElement._jpCollapsibleConfig || {};

                collapsibleElement.classList.add('jp-expanded');
                if (arrow) arrow.textContent = '▼';

                // Call onOpen callback if provided
                if (config.onOpen && typeof config.onOpen === 'function') {
                    config.onOpen(collapsibleElement);
                }

                // Trigger custom event
                collapsibleElement.dispatchEvent(new CustomEvent('jp-collapsible-expanded', {
                    detail: { element: collapsibleElement }
                }));
            },

            /**
             * Collapse a collapsible section (INTERNAL)
             * @param {Element} collapsibleElement - The .jp-collapsible element
             */
            _collapseElement: (collapsibleElement) => {
                const arrow = collapsibleElement.querySelector('.jp-collapsible-arrow');
                const config = collapsibleElement._jpCollapsibleConfig || {};

                collapsibleElement.classList.remove('jp-expanded');
                if (arrow) arrow.textContent = '▶';

                // Call onClose callback if provided
                if (config.onClose && typeof config.onClose === 'function') {
                    config.onClose(collapsibleElement);
                }

                // Trigger custom event
                collapsibleElement.dispatchEvent(new CustomEvent('jp-collapsible-collapsed', {
                    detail: { element: collapsibleElement }
                }));
            }
        },

        /**
         * Accordion component for grouped sections with mutual exclusion
         */
        accordion: {
            /**
             * Register an accordion with automatic decoration detection
             * @param {string} elementId - The ID of the .jp-accordion element
             * @param {Object} options - Configuration options
             * @returns {Object} Handle object with methods for controlling the accordion
             */
            register: (elementId, options = {}) => {
                const element = document.getElementById(elementId);
                if (!element) {
                    console.warn(`Accordion element with ID '${elementId}' not found`);
                    return null;
                }

                const defaultOptions = {
                    exclusive: true,
                    initOpen: null,
                    onSectionChange: null
                };

                const config = { ...defaultOptions, ...options };

                // Setup the accordion
                jPulse.UI.accordion._setup(element, config);

                // Return handle object for method chaining and cleaner API
                return {
                    elementId: elementId,
                    openSection: (index) => jPulse.UI.accordion._openSection(elementId, index),
                    closeAll: () => jPulse.UI.accordion._closeAll(elementId),
                    getOpenSection: () => jPulse.UI.accordion._getOpenSection(elementId)
                };
            },

            // ========================================
            // INTERNAL ACCORDION FUNCTIONS
            // ========================================

            /**
             * Setup an accordion with automatic decoration detection
             * @param {Element} accordionElement - The .jp-accordion element
             * @param {Object} config - Configuration options
             */
            _setup: (accordionElement, config) => {
                // Detect decoration style based on parent context
                const hasParentSection = accordionElement.closest('.jp-section, .local-section, [class*="-section"]');

                if (hasParentSection) {
                    accordionElement.classList.add('jp-accordion-nested');
                } else {
                    accordionElement.classList.add('jp-accordion-standalone');
                }

                // Find all accordion sections
                const sections = accordionElement.querySelectorAll('.jp-accordion-section');

                sections.forEach((section, index) => {
                    // Setup each section
                    jPulse.UI.accordion._setupSection(section, index, config);
                });

                // Store config on element
                accordionElement._jpAccordionConfig = config;

                // Open initial section if specified
                if (config.initOpen !== null && config.initOpen >= 0 && config.initOpen < sections.length) {
                    jPulse.UI.accordion._openSection(accordionElement.id, config.initOpen);
                }
            },

            /**
             * Setup individual accordion section
             * @param {Element} section - The .jp-accordion-section element
             * @param {number} index - Section index
             * @param {Object} config - Configuration options
             */
            _setupSection: (section, index, config) => {
                // Find header (h3 element)
                const header = section.querySelector('h3');
                if (!header) {
                    console.warn('Accordion section missing required h3 element');
                    return;
                }

                // Add arrow if it doesn't exist
                let arrow = header.querySelector('.jp-accordion-arrow');
                if (!arrow) {
                    arrow = document.createElement('span');
                    arrow.className = 'jp-accordion-arrow';
                    arrow.textContent = '▶';
                    header.appendChild(arrow);
                }

                // Set initial state
                section.classList.remove('jp-accordion-expanded');
                arrow.textContent = '▶';

                // Store section index
                section.dataset.sectionIndex = index;

                // Add click handler
                header.addEventListener('click', () => {
                    const accordion = section.closest('.jp-accordion');
                    jPulse.UI.accordion._toggleSection(accordion.id, index);
                });

                // Add cursor pointer style
                header.style.cursor = 'pointer';
            },

            /**
             * Toggle a specific accordion section
             * @param {string} accordionId - The accordion element ID
             * @param {number} sectionIndex - Section index to toggle
             */
            _toggleSection: (accordionId, sectionIndex) => {
                const accordion = document.getElementById(accordionId);
                if (!accordion) return;

                const config = accordion._jpAccordionConfig || {};
                const sections = accordion.querySelectorAll('.jp-accordion-section');
                const targetSection = sections[sectionIndex];

                if (!targetSection) return;

                const isExpanded = targetSection.classList.contains('jp-accordion-expanded');

                if (isExpanded) {
                    // Close the section
                    jPulse.UI.accordion._collapseSection(targetSection);
                } else {
                    // If exclusive, close all other sections first
                    if (config.exclusive) {
                        sections.forEach(section => {
                            if (section !== targetSection) {
                                jPulse.UI.accordion._collapseSection(section);
                            }
                        });
                    }

                    // Open the target section
                    jPulse.UI.accordion._expandSection(targetSection);
                }

                // Call onSectionChange callback
                if (config.onSectionChange && typeof config.onSectionChange === 'function') {
                    const openIndex = jPulse.UI.accordion._getOpenSection(accordionId);
                    config.onSectionChange(openIndex, sectionIndex);
                }
            },

            /**
             * Open a specific section by index
             * @param {string} accordionId - The accordion element ID
             * @param {number} sectionIndex - Section index to open
             */
            _openSection: (accordionId, sectionIndex) => {
                const accordion = document.getElementById(accordionId);
                if (!accordion) return;

                const sections = accordion.querySelectorAll('.jp-accordion-section');
                const targetSection = sections[sectionIndex];

                if (!targetSection) return;

                const config = accordion._jpAccordionConfig || {};

                // If exclusive, close all other sections first
                if (config.exclusive) {
                    sections.forEach(section => {
                        if (section !== targetSection) {
                            jPulse.UI.accordion._collapseSection(section);
                        }
                    });
                }

                // Open the target section
                jPulse.UI.accordion._expandSection(targetSection);

                // Call onSectionChange callback
                if (config.onSectionChange && typeof config.onSectionChange === 'function') {
                    const openIndex = jPulse.UI.accordion._getOpenSection(accordionId);
                    config.onSectionChange(openIndex, sectionIndex);
                }
            },

            /**
             * Close all sections
             * @param {string} accordionId - The accordion element ID
             */
            _closeAll: (accordionId) => {
                const accordion = document.getElementById(accordionId);
                if (!accordion) return;

                const sections = accordion.querySelectorAll('.jp-accordion-section');
                sections.forEach(section => {
                    jPulse.UI.accordion._collapseSection(section);
                });
            },

            /**
             * Get the index of the currently open section
             * @param {string} accordionId - The accordion element ID
             * @returns {number|null} Index of open section or null if none open
             */
            _getOpenSection: (accordionId) => {
                const accordion = document.getElementById(accordionId);
                if (!accordion) return null;

                const sections = accordion.querySelectorAll('.jp-accordion-section');
                for (let i = 0; i < sections.length; i++) {
                    if (sections[i].classList.contains('jp-accordion-expanded')) {
                        return i;
                    }
                }
                return null;
            },

            /**
             * Expand an accordion section
             * @param {Element} section - The section element to expand
             */
            _expandSection: (section) => {
                const arrow = section.querySelector('.jp-accordion-arrow');

                section.classList.add('jp-accordion-expanded');
                if (arrow) arrow.textContent = '▼';

                // Trigger custom event
                section.dispatchEvent(new CustomEvent('jp-accordion-expanded', {
                    detail: { section: section, index: parseInt(section.dataset.sectionIndex) }
                }));
            },

            /**
             * Collapse an accordion section
             * @param {Element} section - The section element to collapse
             */
            _collapseSection: (section) => {
                const arrow = section.querySelector('.jp-accordion-arrow');

                section.classList.remove('jp-accordion-expanded');
                if (arrow) arrow.textContent = '▶';

                // Trigger custom event
                section.dispatchEvent(new CustomEvent('jp-accordion-collapsed', {
                    detail: { section: section, index: parseInt(section.dataset.sectionIndex) }
                }));
            }
        },

        // ========================================
        // INTERNAL DIALOG FUNCTIONS
        // ========================================

        /**
         * Show a dialog with specified type and styling
         * @param {string} message - The message to display
         * @param {string} type - Dialog type: 'alert' or 'info'
         * @param {Object} options - Configuration options
         * @returns {Promise<void>} Promise that resolves when dialog is closed
         */
        _showDialog: (message, type, options = {}) => {
            const defaultOptions = {
                title: null,
                width: null,
                minWidth: 300,
                height: null,
                minHeight: 150
            };

            const config = { ...defaultOptions, ...options };

            return new Promise((resolve) => {
                // Get i18n title if not provided
                const defaultTitle = type === 'alert'
                    ? (window.i18n?.view?.ui?.alertDialog?.title || 'Alert')
                    : (window.i18n?.view?.ui?.infoDialog?.title || 'Information');

                const title = config.title || defaultTitle;
                const buttonText = window.i18n?.view?.ui?.alertDialog?.oKButton || 'OK';

                // Create dialog elements
                const overlay = jPulse.UI._createDialogOverlay();
                const dialog = jPulse.UI._createDialogElement(title, message, type, config);
                const button = jPulse.UI._createDialogButton(buttonText, () => {
                    jPulse.UI._closeDialog(overlay, dialog);
                    resolve();
                });

                // Add button to dialog
                const buttonContainer = dialog.querySelector('.jp-dialog-buttons');
                buttonContainer.appendChild(button);

                // Add to DOM and show
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // Set z-index (alerts/info always on top)
                overlay.style.zIndex = jPulse.UI._alertZIndex + jPulse.UI._dialogStack.length;
                jPulse.UI._dialogStack.push({ overlay, dialog, type: 'alert-info' });

                // Show with animation
                setTimeout(() => {
                    overlay.classList.add('jp-dialog-show');
                    dialog.classList.add('jp-dialog-show');
                }, 10);

                // Handle ESC key
                const handleEscape = (e) => {
                    if (e.key === 'Escape') {
                        document.removeEventListener('keydown', handleEscape);
                        jPulse.UI._closeDialog(overlay, dialog);
                        resolve();
                    }
                };
                document.addEventListener('keydown', handleEscape);

                // Focus management
                jPulse.UI._trapFocus(dialog);
            });
        },

        /**
         * Create dialog overlay element
         * @returns {Element} Overlay element
         */
        _createDialogOverlay: () => {
            const overlay = document.createElement('div');
            overlay.className = 'jp-dialog-overlay';
            return overlay;
        },

        /**
         * Create dialog element with header, content, and button container
         * @param {string} title - Dialog title
         * @param {string} message - Dialog message (HTML)
         * @param {string} type - Dialog type for styling
         * @param {Object} config - Configuration options
         * @returns {Element} Dialog element
         */
        _createDialogElement: (title, message, type, config) => {
            const dialog = document.createElement('div');
            dialog.className = `jp-dialog jp-dialog-${type}`;

            // Apply size configuration
            if (config.width) dialog.style.width = typeof config.width === 'number' ? `${config.width}px` : config.width;
            if (config.minWidth) dialog.style.minWidth = typeof config.minWidth === 'number' ? `${config.minWidth}px` : config.minWidth;
            if (config.height) dialog.style.height = typeof config.height === 'number' ? `${config.height}px` : config.height;
            if (config.minHeight) dialog.style.minHeight = typeof config.minHeight === 'number' ? `${config.minHeight}px` : config.minHeight;

            dialog.innerHTML = `
                <div class="jp-dialog-header jp-dialog-header-${type}">
                    <h3 class="jp-dialog-title">${jPulse.string.escapeHtml(title)}</h3>
                </div>
                <div class="jp-dialog-content">
                    <div class="jp-dialog-message">${message}</div>
                </div>
                <div class="jp-dialog-buttons"></div>
            `;

            // Make dialog draggable by header
            jPulse.UI._makeDraggable(dialog);

            return dialog;
        },

        /**
         * Create dialog button element
         * @param {string} text - Button text
         * @param {Function} onClick - Click handler
         * @returns {Element} Button element
         */
        _createDialogButton: (text, onClick) => {
            const button = document.createElement('button');
            button.className = 'jp-btn jp-btn-primary jp-dialog-btn';
            button.textContent = text;
            button.addEventListener('click', onClick);
            return button;
        },

        /**
         * Close dialog with animation
         * @param {Element} overlay - Dialog overlay
         * @param {Element} dialog - Dialog element
         */
        _closeDialog: (overlay, dialog) => {
            // Remove from stack
            const index = jPulse.UI._dialogStack.findIndex(item => item.overlay === overlay);
            if (index > -1) {
                jPulse.UI._dialogStack.splice(index, 1);
            }

            // Animate out
            overlay.classList.remove('jp-dialog-show');
            dialog.classList.remove('jp-dialog-show');

            // Remove from DOM after animation
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
            }, 300);
        },


        /**
         * Trap focus within dialog for accessibility
         * @param {Element} dialog - Dialog element
         */
        _trapFocus: (dialog) => {
            const focusableElements = dialog.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        },

        /**
         * Make dialog draggable by its header
         * @param {Element} dialog - Dialog element
         */
        _makeDraggable: (dialog) => {
            const header = dialog.querySelector('.jp-dialog-header');
            if (!header) return;

            let isDragging = false;
            let startX = 0;
            let startY = 0;
            let initialX = 0;
            let initialY = 0;

            // Add cursor style to indicate draggable
            header.style.cursor = 'move';
            header.style.userSelect = 'none';

            // Mouse down event
            header.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;

                // Get current position
                const rect = dialog.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;

                // Change dialog position to absolute for dragging
                dialog.style.position = 'absolute';
                dialog.style.left = `${initialX}px`;
                dialog.style.top = `${initialY}px`;
                dialog.style.margin = '0';

                // Add dragging class for visual feedback
                dialog.classList.add('jp-dialog-dragging');

                // Prevent text selection
                e.preventDefault();
            });

            // Mouse move event
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                const newX = initialX + deltaX;
                const newY = initialY + deltaY;

                // Keep dialog within viewport bounds
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const dialogRect = dialog.getBoundingClientRect();

                const boundedX = Math.max(0, Math.min(newX, viewportWidth - dialogRect.width));
                const boundedY = Math.max(0, Math.min(newY, viewportHeight - dialogRect.height));

                dialog.style.left = `${boundedX}px`;
                dialog.style.top = `${boundedY}px`;
            });

            // Mouse up event
            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    dialog.classList.remove('jp-dialog-dragging');
                }
            });
        }
    }
};

// EOF webapp/view/jpulse-common.js
