/*
 * @name            jPulse Framework / WebApp / View / jPulse Common JavaScript
 * @tagline         Common JavaScript utilities for the jPulse Framework
 * @description     This is the common JavaScript utilities for the jPulse Framework
 * @file            webapp/view/jpulse-common.js
 * @version         1.3.17
 * @release         2025-12-17
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

window.jPulse = {

    // ============================================================
    // jPulse.api: API helper methods for common HTTP verbs
    // ============================================================

    api: {
        /**
         * Standardized API call with consistent error handling
         * @param {string} endpoint - API endpoint URL
         * @param {Object} options - Fetch options (method, body, headers, etc.)
         * @returns {Object} { success: boolean, data: any, error: string, response: Response }
         */
        call: async (endpoint, options = {}) => {
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
         * GET request
         * @param {string} endpoint - API endpoint
         * @param {Object} options - Additional fetch options
         */
        get: (endpoint, options = {}) => {
            return jPulse.api.call(endpoint, { ...options, method: 'GET' });
        },

        /**
         * POST request
         * @param {string} endpoint - API endpoint
         * @param {Object|FormData} data - Request body data
         * @param {Object} options - Additional fetch options
         */
        post: (endpoint, data = null, options = {}) => {
            return jPulse.api.call(endpoint, { ...options, method: 'POST', body: data });
        },

        /**
         * PUT request
         * @param {string} endpoint - API endpoint
         * @param {Object|FormData} data - Request body data
         * @param {Object} options - Additional fetch options
         */
        put: (endpoint, data = null, options = {}) => {
            return jPulse.api.call(endpoint, { ...options, method: 'PUT', body: data });
        },

        /**
         * DELETE request
         * @param {string} endpoint - API endpoint
         * @param {Object} options - Additional fetch options
         */
        delete: (endpoint, options = {}) => {
            return jPulse.api.call(endpoint, { ...options, method: 'DELETE' });
        },

        /**
         * Handle API errors with user-friendly messages
         * @param {Error} error - The error object from API call
         * @param {string} action - User-friendly description of the action (e.g., 'save to-do', 'load data')
         * @param {Object} options - Optional configuration
         * @param {boolean} options.showMessage - Whether to show slide-down message (default: true)
         * @param {boolean} options.logError - Whether to log to console (default: true)
         * @returns {void}
         */
        handleError: (error, action, options = {}) => {
            const { showMessage = true, logError = true } = options;

            // Log error to console
            if (logError) {
                console.error(`- API error during ${action}:`, error);
            }

            // Show user-friendly message
            if (showMessage) {
                const message = `Could not ${action}. Please try again or check your connection.`;
                jPulse.UI.toast.show(message, 'error');
            }
        }
    },

    // ============================================================
    // jPulse.form: Form Handling & Validation
    // ============================================================

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
                    jPulse.UI.toast.error('Please fill in all required fields.');
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
                const result = await jPulse.api.call(endpoint, {
                    method: config.method,
                    body: formData
                });

                if (result.success) {
                    // Success handling
                    if (config.successMessage) {
                        jPulse.UI.toast.success(config.successMessage);
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
                        jPulse.UI.toast.error(errorMessage);
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
                jPulse.UI.toast.error(errorMessage);
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
            jPulse.UI.toast.clearAll();
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

    // ============================================================
    // jPulse.dom: DOM Utilities & Helpers
    // ============================================================

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

    // ============================================================
    // jPulse.date: Date formatting utilities
    // ============================================================

    date: {
        /**
         * Format date to local YYYY-MM-DD format
         * @param {Date|string|number} date - Date to format (Date object, ISO string, or timestamp)
         * @returns {string} Formatted date string (YYYY-MM-DD)
         *
         * @example
         * jPulse.date.formatLocalDate(new Date());           // Returns: "2025-12-11"
         * jPulse.date.formatLocalDate('2025-12-11T10:30:00Z'); // Returns: "2025-12-11"
         */
        formatLocalDate: (date) => {
            const d = date instanceof Date ? date : new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        /**
         * Format date and time to local YYYY-MM-DD HH:MM format
         * @param {Date|string|number} date - Date to format (Date object, ISO string, or timestamp)
         * @returns {string} Formatted date and time string (YYYY-MM-DD HH:MM)
         *
         * @example
         * jPulse.date.formatLocalDateAndTime(new Date());           // Returns: "2025-12-11 10:30"
         * jPulse.date.formatLocalDateAndTime('2025-12-11T10:30:00Z'); // Returns: "2025-12-11 10:30"
         */
        formatLocalDateAndTime: (date) => {
            const d = date instanceof Date ? date : new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        },

        /**
         * Format time to local HH:MM:SS format
         * @param {Date|string|number} date - Date to format (Date object, ISO string, or timestamp)
         * @returns {string} Formatted time string (HH:MM:SS)
         *
         * @example
         * jPulse.date.formatLocalTime(new Date());           // Returns: "10:30:45"
         * jPulse.date.formatLocalTime('2025-12-11T10:30:45Z'); // Returns: "10:30:45"
         */
        formatLocalTime: (date) => {
            const d = date instanceof Date ? date : new Date(date);
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }
    },

    // ============================================================
    // jPulse.string: String manipulation utilities
    // ============================================================

    string: {
        escapeHtml: (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        capitalize: (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : str,

        slugify: (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    },

    // ============================================================
    // jPulse.url: URL utilities
    // ============================================================

    url: {
        getParams: () => {
            const params = {};
            new URLSearchParams(window.location.search).forEach((value, key) => {
                params[key] = value;
            });
            return params;
        },

        getParam: (name) => new URLSearchParams(window.location.search).get(name),

        /**
         * Redirect to URL with optional toast messages and delay
         * @param {string} url - Target URL
         * @param {object} options - Optional settings
         *   - delay: ms to wait before redirect (default: 0)
         *   - toasts: array of toast objects to show after redirect
         *     Format: [{ toastType, message, link?, linkText?, duration? }]
         * @example
         * jPulse.url.redirect('/dashboard', {
         *     delay: 500,
         *     toasts: [{ toastType: 'success', message: 'Changes saved!' }]
         * });
         */
        redirect: (url, options = {}) => {
            const { delay = 0, toasts } = options;

            // Check if URL is internal (same origin) or external
            const isInternal = jPulse.url.isInternal(url);

            if (isInternal) {
                // Queue toasts for display after redirect
                if (toasts && toasts.length > 0) {
                    sessionStorage.setItem('jpulse_toast_queue', JSON.stringify(toasts));
                }
            } else {
                // External redirect - clear any existing toast queue
                sessionStorage.removeItem('jpulse_toast_queue');
            }

            // Redirect with optional delay
            if (delay > 0) {
                setTimeout(() => {
                    window.location.href = url;
                }, delay);
            } else {
                window.location.href = url;
            }
        },

        /**
         * Check if URL is internal (same origin)
         * @param {string} url - URL to check
         * @returns {boolean} True if internal, false if external
         */
        isInternal: (url) => {
            // Relative URLs are internal
            if (!url || url.startsWith('/') || url.startsWith('#') || url.startsWith('?')) {
                return true;
            }
            // Check if same origin
            try {
                const targetUrl = new URL(url, window.location.origin);
                return targetUrl.origin === window.location.origin;
            } catch {
                // Invalid URL - treat as internal (relative path)
                return true;
            }
        }
    },

    // ============================================================
    // jPulse.device: Device and browser detection utilities
    // ============================================================

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

    // ============================================================
    // jPulse.cookies: Cookie management utilities
    // ============================================================

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

    // ============================================================
    // jPulse.plugins: Plugin namespace (W-045: Plugin Infrastructure)
    // ============================================================
    // Plugins add their code here, e.g., window.jPulse.plugins.helloWorld = { ... }
    plugins: {},

    // ============================================================
    // jPulse.UI: UI Widgets
    // ============================================================

    UI: {
        // Dialog management
        _dialogStack: [],
        _baseZIndex: 1000,
        _alertZIndex: 2000,
        _previousFocus: null, // Store previous focus to restore on dialog close

        // Toast notification queue management
        _toastQueue: [],

        /**
         * Toast notification methods (formerly slide-down messages)
         */
        toast: {
            /**
             * Show non-blocking toast notification with consistent styling
             * @param {string} message - The message to display
             * @param {string} type - Message type: 'info', 'error', 'success', 'warning'
             * @param {object|number} options - Options object or duration in ms
             *   - duration: Auto-hide duration in ms (0 = no auto-hide, uses config if not specified)
             *   - link: Optional URL for a link
             *   - linkText: Optional text for the link (defaults to 'Learn more')
             * @returns {Element} The created toast message element
             */
            show: (message, type = 'info', options = null) => {
                // Support legacy signature: show(message, type, duration)
                let duration = null;
                let link = null;
                let linkText = null;
                if (typeof options === 'number') {
                    duration = options;
                } else if (options) {
                    duration = options.duration ?? null;  // Convert undefined to null
                    link = options.link;
                    linkText = options.linkText || 'Learn more';
                }

                // Get duration from config if not specified
                if (duration === null) {
                    const config = window.appConfig?.view?.toastMessage?.duration;
                    // Default: error 8 sec, others 5 sec
                    const defaultDuration = type === 'error' ? 8000 : 5000;
                    duration = config?.[type] || defaultDuration;
                }

                const messageDiv = document.createElement('div');
                messageDiv.className = `jp-toast jp-toast-${type}`;
                messageDiv.dataset.type = type;
                messageDiv.dataset.duration = duration;

                // Build content with optional link
                if (link) {
                    const textSpan = document.createElement('span');
                    textSpan.textContent = message + ' ';
                    const linkEl = document.createElement('a');
                    linkEl.href = link;
                    linkEl.textContent = linkText;
                    linkEl.style.color = 'inherit';
                    linkEl.style.textDecoration = 'underline';
                    linkEl.style.fontWeight = 'bold';
                    messageDiv.appendChild(textSpan);
                    messageDiv.appendChild(linkEl);
                } else {
                    messageDiv.textContent = message;
                }

                // Add to queue
                jPulse.UI._toastQueue.push(messageDiv);

                // Process only the new message
                jPulse.UI.toast._processToast(messageDiv);

                return messageDiv;
            },

            /**
             * Show error toast notification (red styling)
             * @param {string} message - The message to display
             * @param {object} options - Optional: { duration, link, linkText }
             */
            error: (message, options) => {
                return jPulse.UI.toast.show(message, 'error', options);
            },

            /**
             * Show success toast notification (green styling)
             * @param {string} message - The message to display
             * @param {object} options - Optional: { duration, link, linkText }
             */
            success: (message, options) => {
                return jPulse.UI.toast.show(message, 'success', options);
            },

            /**
             * Show info toast notification (blue styling)
             * @param {string} message - The message to display
             * @param {object} options - Optional: { duration, link, linkText }
             */
            info: (message, options) => {
                return jPulse.UI.toast.show(message, 'info', options);
            },

            /**
             * Show warning toast notification (yellow styling)
             * @param {string} message - The message to display
             * @param {object} options - Optional: { duration, link, linkText }
             */
            warning: (message, options) => {
                return jPulse.UI.toast.show(message, 'warning', options);
            },

            /**
             * Clear all toast notifications
             */
            clearAll: () => {
                // Clear all messages in queue
                jPulse.UI._toastQueue.forEach(messageDiv => {
                    jPulse.UI.toast._hideToast(messageDiv);
                });
                jPulse.UI._toastQueue = [];
            },

            /**
             * Process a single new toast notification (internal)
             * @param {Element} messageDiv - The message element to process
             */
            _processToast: (messageDiv) => {
                const index = jPulse.UI._toastQueue.indexOf(messageDiv);

                // Add to DOM first so we can measure height
                document.body.appendChild(messageDiv);

                // Force reflow to ensure styles are applied
                messageDiv.offsetHeight;

                // Calculate dynamic stacking based on actual heights of previous messages
                let stackOffset = 0;
                if (index > 0) {
                    for (let i = 0; i < index; i++) {
                        const prevMessage = jPulse.UI._toastQueue[i];
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
                    messageDiv.classList.add('jp-toast-show');
                }, 100);

                // Auto-hide after duration
                const duration = parseInt(messageDiv.dataset.duration);
                if (duration > 0) {
                    setTimeout(() => {
                        jPulse.UI.toast._hideToast(messageDiv);
                    }, duration);
                }
            },

            /**
             * Hide toast notification with slide-up animation (internal)
             * @param {Element} messageDiv - Message element to hide
             */
            _hideToast: (messageDiv) => {
                if (!messageDiv || !messageDiv.parentNode) return;

                // Trigger slide-up animation (back behind header)
                messageDiv.classList.remove('jp-toast-show');
                messageDiv.classList.add('jp-toast-hide');

                // Remove from DOM after animation
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.remove();
                    }
                    // Remove from queue
                    const index = jPulse.UI._toastQueue.indexOf(messageDiv);
                    if (index > -1) {
                        jPulse.UI._toastQueue.splice(index, 1);
                    }
                }, 600); // Match the longer animation time
            }
        },

        /**
         * Show alert dialog with red header styling
         * @param {string} message - The message to display (supports simple HTML)
         * @param {string|Object} titleOrOptions - Title string or options object (if object, title is in options.title)
         * @returns {Promise<void>} Promise that resolves when dialog is closed
         */
        alertDialog: (message, titleOrOptions = {}) => {
            return jPulse.UI._showSimpleDialog(message, 'alert', titleOrOptions);
        },

        /**
         * Show info dialog with blue header styling
         * @param {string} message - The message to display (supports simple HTML)
         * @param {string|Object} titleOrOptions - Title string or options object (if object, title is in options.title)
         * @returns {Promise<void>} Promise that resolves when dialog is closed
         */
        infoDialog: (message, titleOrOptions = {}) => {
            return jPulse.UI._showSimpleDialog(message, 'info', titleOrOptions);
        },

        /**
         * Show success dialog with green header styling
         * @param {string} message - The message to display (supports simple HTML)
         * @param {string|Object} titleOrOptions - Title string or options object (if object, title is in options.title)
         * @returns {Promise<void>} Promise that resolves when dialog is closed
         */
        successDialog: (message, titleOrOptions = {}) => {
            return jPulse.UI._showSimpleDialog(message, 'success', titleOrOptions);
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
                type: 'confirm', // Dialog type for styling: 'alert', 'info', 'success', or 'confirm'
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
                const dialog = jPulse.UI._createDialogElement(title, config.message, config.type, config);

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

                // Set z-index (alert/info/success dialogs always on top, confirm uses base z-index)
                const isSimpleDialog = ['alert', 'info', 'success'].includes(config.type);
                const zIndex = config.zIndex || (isSimpleDialog
                    ? (jPulse.UI._alertZIndex + jPulse.UI._dialogStack.length)
                    : (jPulse.UI._baseZIndex + jPulse.UI._dialogStack.length * 10));
                overlay.style.zIndex = zIndex;
                jPulse.UI._dialogStack.push({ overlay, dialog, type: config.type });

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
                jPulse.UI._trapFocus(dialog, overlay);
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
                // Find header (h3 or h4 element)
                const header = section.querySelector('h3, h4');
                if (!header) {
                    console.warn('Accordion section missing required h3 or h4 element');
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

        /**
         * Breadcrumb navigation system
         * Auto-generates breadcrumb trail based on navigation hierarchy and current URL
         */
        breadcrumbs: {
            _initialized: false,
            _breadcrumbElement: null,
            _homeLabel: 'Home',
            _navConfig: null,

            /**
             * Initialize breadcrumb navigation
             * @param {Object} options - Configuration options
             * @param {string} options.currentUrl - Current page URL
             * @param {Object} options.navigation - Navigation structure
             * @param {string} options.homeLabel - Label for home breadcrumb
             * @returns {Object} Handle object with breadcrumb control methods
             */
            init: (options = {}) => {
                // Prevent double initialization
                if (jPulse.UI.breadcrumbs._initialized) {
                    return;
                }

                // Store config in internal variables
                jPulse.UI.breadcrumbs._homeLabel = options.homeLabel || 'Home';
                jPulse.UI.breadcrumbs._navConfig = jPulse.UI.navigation._sanitizeNavStructure(options.navigation);

                if (!jPulse.UI.breadcrumbs._navConfig) {
                    console.warn('jPulse.UI.breadcrumbs: No navigation structure provided');
                    return null;
                }

                // Find or create breadcrumb container
                let breadcrumbDiv = document.querySelector('.jp-breadcrumb');
                if (!breadcrumbDiv) {
                    breadcrumbDiv = document.createElement('div');
                    breadcrumbDiv.className = 'jp-breadcrumb';
                    document.body.insertBefore(breadcrumbDiv, document.body.firstChild);
                }

                jPulse.UI.breadcrumbs._breadcrumbElement = breadcrumbDiv;

                // Add class to body to enable breadcrumb-specific styling
                document.body.classList.add('jp-breadcrumbs-enabled');

                // Listen for URL changes (for SPA navigation)
                jPulse.UI.breadcrumbs._setupUrlChangeListener();

                // Generate breadcrumb content
                jPulse.UI.breadcrumbs._generateBreadcrumb();

                jPulse.UI.breadcrumbs._initialized = true;

                return {
                    refresh: () => jPulse.UI.breadcrumbs.refresh(),
                    destroy: () => jPulse.UI.breadcrumbs.destroy()
                };
            },

            /**
             * Setup URL change listener for SPA navigation
             */
            _setupUrlChangeListener: () => {
                let currentUrl = window.location.pathname;

                // Listen for popstate events (back/forward button)
                window.addEventListener('popstate', () => {
                    jPulse.UI.breadcrumbs._generateBreadcrumb();
                });

                // Override pushState and replaceState to catch programmatic navigation
                const originalPushState = history.pushState;
                const originalReplaceState = history.replaceState;

                history.pushState = function(...args) {
                    originalPushState.apply(history, args);
                    setTimeout(() => {
                        jPulse.UI.breadcrumbs._generateBreadcrumb();
                    }, 100); // Small delay to ensure DOM is updated
                };

                history.replaceState = function(...args) {
                    originalReplaceState.apply(history, args);
                    setTimeout(() => {
                        jPulse.UI.breadcrumbs._generateBreadcrumb();
                    }, 100);
                };
            },

            /**
             * Generate breadcrumb trail based on current URL and navigation structure
             */
            _generateBreadcrumb: () => {
                const breadcrumbDiv = jPulse.UI.breadcrumbs._breadcrumbElement;
                if (!breadcrumbDiv) {
                    return;
                }

                const currentUrl = window.location.pathname;
                // W-098: Use merged navigation structure with fallback for backward compatibility
                const navConfig = jPulse.UI.breadcrumbs._navConfig
                    || (window.jPulseNavigation && window.jPulseNavigation.site)
                    || window.jPulseSiteNavigation;

                if (!navConfig) {
                    console.warn('jPulse.UI.breadcrumbs: No navigation structure found');
                    return;
                }

                // Find breadcrumb trail
                const trail = jPulse.UI.breadcrumbs._findBreadcrumbTrail(currentUrl, navConfig);

                if (trail.length === 0) {
                    breadcrumbDiv.style.display = 'none';
                    return;
                }

                // Clear existing content
                breadcrumbDiv.innerHTML = '';
                breadcrumbDiv.style.display = '';

                // Build breadcrumb HTML
                trail.forEach((item, index) => {
                    const isLast = index === trail.length - 1;

                    if (isLast) {
                        // Current page - no link
                        const span = document.createElement('span');
                        span.className = 'jp-breadcrumb-current';
                        if (item.icon) {
                            const iconHTML = jPulse.UI.navigation._renderIcon(item.icon, 'jp-breadcrumb-icon');
                            span.innerHTML = `${iconHTML} ${item.label}`;
                        } else {
                            span.textContent = item.label;
                        }
                        breadcrumbDiv.appendChild(span);
                    } else {
                        // Parent pages - with links
                        const link = document.createElement('a');
                        link.href = item.url;
                        link.className = 'jp-breadcrumb-link';
                        if (item.icon) {
                            const iconHTML = jPulse.UI.navigation._renderIcon(item.icon, 'jp-breadcrumb-icon');
                            link.innerHTML = `${iconHTML} ${item.label}`;
                        } else {
                            link.textContent = item.label;
                        }
                        breadcrumbDiv.appendChild(link);

                        // Add separator
                        const separator = document.createElement('span');
                        separator.className = 'jp-breadcrumb-separator';
                        separator.textContent = '❯';
                        breadcrumbDiv.appendChild(separator);
                    }
                });

                // Apply ellipsis if content overflows
                jPulse.UI.breadcrumbs._applyEllipsis();
            },

            /**
             * Find breadcrumb trail for current URL
             * Uses bottom-up search like site navigation
             * @param {string} currentUrl - Current page URL
             * @param {Object} navConfig - Navigation structure
             * @returns {Array} Breadcrumb trail items
             */
            _findBreadcrumbTrail: (currentUrl, navConfig) => {
                const trail = [];

                // Always start with Home (implicitly prepended)
                trail.push({
                    label: jPulse.UI.breadcrumbs._homeLabel,
                    url: '/',
                    icon: '🏠'
                });

                // BOTTOM-UP DIRECTORY-LEVEL SEARCH ALGORITHM
                // Start from the deepest URL path and work backwards through directory levels

                // Generate directory levels from deepest to shallowest
                const urlParts = currentUrl.split('/').filter(part => part.length > 0);
                const directoryLevels = [];

                // Add full URL
                directoryLevels.push(currentUrl);

                // Add progressively shorter paths
                for (let i = urlParts.length - 1; i > 0; i--) {
                    const pathParts = urlParts.slice(0, i);
                    directoryLevels.push('/' + pathParts.join('/') + '/');
                }

                // Add root
                directoryLevels.push('/');

                let bestMatch = null;
                let bestMatchSection = null;

                // Check each directory level from deepest to shallowest
                for (const dirLevel of directoryLevels) {
                    // Search all sections for matches at this directory level
                    for (const [sectionKey, section] of Object.entries(navConfig)) {
                        // Check for registered dynamic pages (like jPulseDocs)
                        const pages = jPulse.UI.navigation._registeredPages[sectionKey] || section.pages;

                        if (pages) {
                            // For directory-level search, only check for EXACT matches
                            const exactPageMatch = jPulse.UI.breadcrumbs._findExactMatch(dirLevel, pages, section);
                            if (exactPageMatch) {
                                bestMatch = exactPageMatch;
                                bestMatchSection = sectionKey;
                                break; // Found exact match at this directory level, stop searching sections
                            }
                        }

                        // Check section itself for match at this directory level
                        if (dirLevel === section.url) {
                            bestMatch = { item: section, isSection: true };
                            bestMatchSection = sectionKey;
                            break;
                        }
                    }

                    // If we found a match at this directory level, stop going up
                    if (bestMatch) {
                        break;
                    }
                }

                // Build trail from the best match
                if (bestMatch) {
                    if (bestMatch.isSection) {
                        // Just the section - add section and try to extract page name from URL
                        trail.push({
                            label: bestMatch.item.label,
                            url: bestMatch.item.url,
                            icon: bestMatch.item.icon
                        });

                        // If current URL is deeper than section URL, extract page name
                        if (currentUrl !== bestMatch.item.url && currentUrl.startsWith(bestMatch.item.url)) {
                            const pagePath = currentUrl.replace(bestMatch.item.url, '').replace(/^\/+|\/+$/g, '');
                            if (pagePath) {
                                // Extract filename and convert to readable label
                                const filename = pagePath.split('/').pop().replace(/\.(shtml|html)$/, '');
                                const pageLabel = filename
                                    .split(/[-_]/)
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');

                                trail.push({
                                    label: pageLabel,
                                    url: currentUrl,
                                    icon: null
                                });
                            }
                        }
                    } else {
                        // Section + pages trail - but check if we need to extract unknown page
                        const section = navConfig[bestMatchSection];
                        trail.push({
                            label: section.label,
                            url: section.url,
                            icon: section.icon
                        });

                        // Check if the matched page URL is the same as section URL (like dashboard)
                        // but current URL is different - this means we have an unknown page in this section
                        if (bestMatch.trail.length === 1 &&
                            bestMatch.trail[0].url === section.url &&
                            currentUrl !== section.url &&
                            currentUrl.startsWith(section.url)) {

                            // Extract page name from current URL instead of using the matched page
                            const pagePath = currentUrl.replace(section.url, '').replace(/^\/+|\/+$/g, '');
                            if (pagePath) {
                                const filename = pagePath.split('/').pop().replace(/\.(shtml|html)$/, '');
                                const pageLabel = filename
                                    .split(/[-_]/)
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');

                                trail.push({
                                    label: pageLabel,
                                    url: currentUrl,
                                    icon: null
                                });
                            } else {
                                // Add the matched trail as fallback
                                trail.push(...bestMatch.trail);
                            }
                        } else {
                            // Add the matched trail normally
                            trail.push(...bestMatch.trail);
                        }
                    }
                }

                return trail;
            },

            /**
             * Find exact URL match in pages (no prefix matching)
             * @param {string} currentUrl - Current page URL
             * @param {Object} pages - Pages object to search
             * @param {Object} parentSection - Parent section for context
             * @returns {Object|null} Exact match with trail or null
             */
            _findExactMatch: (currentUrl, pages, parentSection) => {
                for (const [pageKey, page] of Object.entries(pages)) {
                    // Handle both absolute and relative URLs
                    let pageUrl = page.url;

                    // If page URL is relative and we're in a section, make it absolute
                    if (parentSection && !pageUrl.startsWith('/')) {
                        pageUrl = parentSection.url + pageUrl;
                    }

                    // Only exact matches
                    if (currentUrl === pageUrl) {
                        return {
                            url: pageUrl,
                            trail: [{
                                label: page.label,
                                url: pageUrl,
                                icon: page.icon
                            }]
                        };
                    }

                    // Check nested pages recursively for exact matches only
                    if (page.pages) {
                        const nestedMatch = jPulse.UI.breadcrumbs._findExactMatch(currentUrl, page.pages, parentSection);
                        if (nestedMatch) {
                            // Prepend current page to the trail
                            return {
                                url: nestedMatch.url,
                                trail: [{
                                    label: page.label,
                                    url: pageUrl,
                                    icon: page.icon
                                }, ...nestedMatch.trail]
                            };
                        }
                    }
                }

                return null; // No exact match found
            },

            /**
             * Find deepest matching page in a pages structure (recursive)
             * @param {string} currentUrl - Current page URL
             * @param {Object} pages - Pages object to search
             * @param {Object} parentSection - Parent section for context
             * @returns {Object|null} Best match with trail
             */
            _findDeepestMatch: (currentUrl, pages, parentSection) => {
                let bestMatch = null;
                let bestMatchLength = 0;
                let exactMatch = null;  // Prioritize exact matches

                for (const [pageKey, page] of Object.entries(pages)) {
                    // Handle both absolute and relative URLs
                    let pageUrl = page.url;

                    // If page URL is relative and we're in a section, make it absolute
                    if (parentSection && !pageUrl.startsWith('/')) {
                        pageUrl = parentSection.url + pageUrl;
                    }

                    // Prioritize exact matches
                    if (currentUrl === pageUrl) {
                        exactMatch = {
                            url: pageUrl,
                            trail: [{
                                label: page.label,
                                url: pageUrl,
                                icon: page.icon
                            }]
                        };
                        bestMatchLength = pageUrl.length;
                        break; // Exact match found, stop searching
                    }

                    // Check prefix match only if no exact match found
                    if (!exactMatch && currentUrl.startsWith(pageUrl) && pageUrl !== '/') {
                        if (pageUrl.length > bestMatchLength) {
                            bestMatch = {
                                url: pageUrl,
                                trail: [{
                                    label: page.label,
                                    url: pageUrl,
                                    icon: page.icon
                                }]
                            };
                            bestMatchLength = pageUrl.length;
                        }
                    }

                    // Check nested pages recursively
                    if (page.pages) {
                        const nestedMatch = jPulse.UI.breadcrumbs._findDeepestMatch(currentUrl, page.pages, parentSection);
                        if (nestedMatch && nestedMatch.url.length > bestMatchLength) {
                            // Prepend current page to the trail
                            bestMatch = {
                                url: nestedMatch.url,
                                trail: [{
                                    label: page.label,
                                    url: pageUrl,
                                    icon: page.icon
                                }, ...nestedMatch.trail]
                            };
                            bestMatchLength = nestedMatch.url.length;
                        }
                    }
                }

                // Return exact match if found, otherwise best prefix match
                if (exactMatch) {
                    return exactMatch;
                }

                // Fallback: try filename matching if no URL match found
                if (!bestMatch) {
                    const fileName = currentUrl.split('/').pop().replace('.shtml', '');
                    for (const [pageKey, page] of Object.entries(pages)) {
                        if (pageKey === fileName || page.url.includes(fileName)) {
                            let pageUrl = page.url;
                            if (parentSection && !pageUrl.startsWith('/')) {
                                pageUrl = parentSection.url + pageUrl;
                            }
                            bestMatch = {
                                url: pageUrl,
                                trail: [{
                                    label: page.label,
                                    url: pageUrl,
                                    icon: page.icon
                                }]
                            };
                            break;
                        }
                    }
                }

                return bestMatch;
            },

            /**
             * Apply ellipsis if breadcrumb content overflows window width
             */
            _applyEllipsis: () => {
                const breadcrumbDiv = jPulse.UI.breadcrumbs._breadcrumbElement;
                if (!breadcrumbDiv) return;

                // Check if content overflows
                if (breadcrumbDiv.scrollWidth > breadcrumbDiv.clientWidth) {
                    breadcrumbDiv.classList.add('jp-breadcrumb-ellipsis');
                } else {
                    breadcrumbDiv.classList.remove('jp-breadcrumb-ellipsis');
                }
            },

            /**
             * Refresh breadcrumb (useful when navigation changes or dynamic pages are registered)
             */
            refresh: () => {
                if (jPulse.UI.breadcrumbs._initialized) {
                    jPulse.UI.breadcrumbs._generateBreadcrumb();
                }
            },

            /**
             * Destroy breadcrumb
             */
            destroy: () => {
                if (jPulse.UI.breadcrumbs._breadcrumbElement) {
                    jPulse.UI.breadcrumbs._breadcrumbElement.remove();
                    jPulse.UI.breadcrumbs._breadcrumbElement = null;
                }
                jPulse.UI.breadcrumbs._initialized = false;
            }
        },

        /**
         * Tab interface widget for navigation and panel switching
         */
        tabs: {
            /**
             * Register a tab interface with automatic type detection
             * @param {string} elementId - The ID of the .jp-tabs element
             * @param {Object} options - Configuration options
             * @param {string} activeTabId - Active tab ID (optional)
             *                 - auto-detects active tab from URL if not specified
             *                 - overrides options.activeTab
             * @returns {Object} Handle object with methods for controlling the tabs
             */
            register: (elementId, options = {}, activeTabId = null) => {
                const element = document.getElementById(elementId);
                if (!element) {
                    console.warn(`Tab element with ID '${elementId}' not found`);
                    return null;
                }

                // Auto-detect active tab from URL if not specified
                if (!activeTabId && options.tabs) {
                    const currentPath = window.location.pathname;
                    const matchingTab = options.tabs
                        .slice().reverse() // reverse to prioritize longer URLs
                        .find(tab => tab.url && currentPath.startsWith(tab.url));
                    if (matchingTab) {
                        activeTabId = matchingTab.id;
                    }
                }

                const defaultOptions = {
                    tabs: [],
                    activeTab: null,
                    linkActiveTab: false,
                    responsive: 'scroll',
                    onTabChange: null,
                    panelWidth: null,
                    panelHeight: null,
                    slideAnimation: true
                };

                const config = { ...defaultOptions, ...options };

                // activeTabId parameter takes precedence over options.activeTab
                const finalActiveTab = activeTabId || config.activeTab;

                // Detect tab type based on URL presence
                const hasNavTabs = config.tabs.some(tab => tab.url);
                const hasPanelTabs = config.tabs.some(tab => tab.panelId);

                if (hasNavTabs && hasPanelTabs) {
                    console.warn('Mixed navigation and panel tabs in same group not supported');
                    return null;
                }

                const tabType = hasNavTabs ? 'navigation' : 'panel';

                // Setup the tabs
                jPulse.UI.tabs._setup(element, config, finalActiveTab, tabType);

                // Return handle object for method chaining and cleaner API
                return {
                    elementId: elementId,
                    tabType: tabType,
                    activateTab: (tabId) => jPulse.UI.tabs._activateTab(elementId, tabId),
                    getActiveTab: () => jPulse.UI.tabs._getActiveTab(elementId),
                    refresh: () => jPulse.UI.tabs._refresh(elementId),
                    destroy: () => jPulse.UI.tabs._destroy(elementId)
                };
            },

            // ========================================
            // INTERNAL TAB FUNCTIONS
            // ========================================

            /**
             * Setup tab interface with automatic type detection
             * @param {Element} tabsElement - The .jp-tabs element
             * @param {Object} config - Configuration options
             * @param {string} activeTabId - Active tab ID
             * @param {string} tabType - 'navigation' or 'panel'
             */
            _setup: (tabsElement, config, activeTabId, tabType) => {
                // Store config on element
                tabsElement._jpTabsConfig = config;
                tabsElement._jpTabsType = tabType;
                tabsElement._jpTabsActiveTab = activeTabId;

                // Add CSS classes
                tabsElement.classList.add('jp-tabs', `jp-tabs-${tabType}`);

                // Create tab structure
                jPulse.UI.tabs._createTabStructure(tabsElement, config, tabType);

                // Setup event handlers
                jPulse.UI.tabs._setupEventHandlers(tabsElement, config, tabType);

                // For panel tabs, move all panels into the container first
                if (tabType === 'panel') {
                    const panelContainer = tabsElement.querySelector('.jp-tabs-panels');
                    config.tabs.forEach(tab => {
                        if (tab.panelId) {
                            let panel = document.getElementById(tab.panelId);

                            // If not found by ID, try to find it in the panel container
                            if (!panel && panelContainer) {
                                panel = panelContainer.querySelector(`#${tab.panelId}`);
                            }

                            if (panel && panel.parentNode !== panelContainer) {
                                panelContainer.appendChild(panel);
                            }
                        }
                    });

                }

                // Set initial active tab FIRST
                const finalActiveTabId = activeTabId || config.activeTab;
                if (finalActiveTabId) {
                    jPulse.UI.tabs._setActiveTab(tabsElement, finalActiveTabId, false);
                } else if (config.tabs.length > 0) {
                    // Default to first visible tab
                    const firstVisibleTab = config.tabs.find(tab => !jPulse.UI.tabs._isTabHidden(tab));
                    if (firstVisibleTab) {
                        jPulse.UI.tabs._setActiveTab(tabsElement, firstVisibleTab.id, false);
                    }
                }

                // Handle panel height management AFTER setting active tab
                if (tabType === 'panel') {
                    jPulse.UI.tabs._setupPanelHeights(tabsElement, config);
                }
            },

            /**
             * Create the HTML structure for tabs
             * @param {Element} tabsElement - The .jp-tabs element
             * @param {Object} config - Configuration options
             * @param {string} tabType - 'navigation' or 'panel'
             */
            _createTabStructure: (tabsElement, config, tabType) => {
                // Create tab list container
                const tabList = document.createElement('div');
                tabList.className = 'jp-tabs-list';

                // Add responsive class
                if (config.responsive === 'scroll') {
                    tabList.classList.add('jp-tabs-scroll');
                }

                // Create individual tabs
                config.tabs.forEach((tab, index) => {
                    // Check if tab should be visible based on tabClass
                    if (jPulse.UI.tabs._isTabHidden(tab)) {
                        return; // Skip hidden tabs
                    }

                    // Add spacers before tab if specified
                    if (tab.spacers && tab.spacers > 0) {
                        for (let i = 0; i < tab.spacers; i++) {
                            const spacer = document.createElement('div');
                            spacer.className = 'jp-tabs-spacer';
                            if (tab.spacerClass) {
                                spacer.classList.add(tab.spacerClass);
                            }
                            tabList.appendChild(spacer);
                        }
                    }

                    // Create tab element
                    const tabElement = document.createElement('div');
                    tabElement.className = 'jp-tab';
                    tabElement.dataset.tabId = tab.id;

                    if (tab.tabClass) {
                        tabElement.classList.add(tab.tabClass);
                    }

                    if (tab.disabled) {
                        tabElement.classList.add('jp-tab-disabled');
                    }

                    // Create tab content
                    let tabContent = '';

                    if (tab.icon) {
                        tabContent += `<span class="jp-tab-icon">${jPulse.string.escapeHtml(tab.icon)}</span>`;
                    }

                    tabContent += `<span class="jp-tab-label">${jPulse.string.escapeHtml(tab.label)}</span>`;

                    tabElement.innerHTML = tabContent;

                    // Add tooltip if specified
                    if (tab.tooltip) {
                        tabElement.title = tab.tooltip;
                    }

                    // Store tab data
                    tabElement._jpTabData = tab;

                    tabList.appendChild(tabElement);
                });

                // Clear existing content and add tab list
                tabsElement.innerHTML = '';
                tabsElement.appendChild(tabList);

                // For panel tabs, create panel container
                if (tabType === 'panel') {
                    const panelContainer = document.createElement('div');
                    panelContainer.className = 'jp-tabs-panels';

                    // Apply panel dimensions if specified
                    if (config.panelWidth) {
                        panelContainer.style.width = typeof config.panelWidth === 'number'
                            ? `${config.panelWidth}px` : config.panelWidth;
                    }
                    if (config.panelHeight) {
                        panelContainer.style.height = typeof config.panelHeight === 'number'
                            ? `${config.panelHeight}px` : config.panelHeight;
                    }

                    tabsElement.appendChild(panelContainer);
                }
            },

            /**
             * Setup event handlers for tab interactions
             * @param {Element} tabsElement - The .jp-tabs element
             * @param {Object} config - Configuration options
             * @param {string} tabType - 'navigation' or 'panel'
             */
            _setupEventHandlers: (tabsElement, config, tabType) => {
                const tabList = tabsElement.querySelector('.jp-tabs-list');

                tabList.addEventListener('click', (event) => {
                    const tabElement = event.target.closest('.jp-tab');
                    if (!tabElement || tabElement.classList.contains('jp-tab-disabled')) {
                        return;
                    }

                    const tabId = tabElement.dataset.tabId;
                    const tabData = tabElement._jpTabData;

                    if (tabType === 'navigation' && tabData.url) {
                        // Navigation tab - navigate to URL
                        window.location.href = tabData.url;
                    } else if (tabType === 'panel') {
                        // Panel tab - switch panels
                        jPulse.UI.tabs._setActiveTab(tabsElement, tabId, true);
                    }
                });
            },

            /**
             * Set the active tab
             * @param {Element} tabsElement - The .jp-tabs element
             * @param {string} tabId - Tab ID to activate
             * @param {boolean} animate - Whether to animate the transition
             */
            _setActiveTab: (tabsElement, tabId, animate = true) => {
                const config = tabsElement._jpTabsConfig;
                const tabType = tabsElement._jpTabsType;
                const previousActiveTab = tabsElement._jpTabsActiveTab;

                // Update active tab tracking
                tabsElement._jpTabsActiveTab = tabId;

                // Update tab visual states
                const tabs = tabsElement.querySelectorAll('.jp-tab');
                tabs.forEach(tab => {
                    if (tab.dataset.tabId === tabId) {
                        tab.classList.add('jp-tab-active');
                    } else {
                        tab.classList.remove('jp-tab-active');
                    }
                });

                // Handle panel switching for panel tabs
                if (tabType === 'panel') {
                    jPulse.UI.tabs._switchPanels(tabsElement, tabId, animate);
                }

                // Call onTabChange callback
                if (config.onTabChange && typeof config.onTabChange === 'function') {
                    const tabData = Array.from(tabs).find(tab => tab.dataset.tabId === tabId)?._jpTabData;
                    config.onTabChange(tabId, previousActiveTab, tabData);
                }

                // Dispatch custom event
                tabsElement.dispatchEvent(new CustomEvent('jp-tab-changed', {
                    detail: {
                        tabId: tabId,
                        previousTabId: previousActiveTab,
                        tabType: tabType
                    }
                }));
            },

            /**
             * Switch panels for panel tabs with optional animation
             * @param {Element} tabsElement - The .jp-tabs element
             * @param {string} tabId - Tab ID to show panel for
             * @param {boolean} animate - Whether to animate the transition
             */
            _switchPanels: (tabsElement, tabId, animate) => {
                const config = tabsElement._jpTabsConfig;
                const tabData = config.tabs.find(tab => tab.id === tabId);

                if (!tabData || !tabData.panelId) {
                    return;
                }

                const panelContainer = tabsElement.querySelector('.jp-tabs-panels');
                let targetPanel = document.getElementById(tabData.panelId);

                // If not found by ID, try to find it in the panel container
                if (!targetPanel && panelContainer) {
                    targetPanel = panelContainer.querySelector(`#${tabData.panelId}`);
                }

                if (!targetPanel) {
                    console.warn(`Panel with ID '${tabData.panelId}' not found`);
                    return;
                }

                // Move panel into container if not already there
                if (targetPanel.parentNode !== panelContainer) {
                    panelContainer.appendChild(targetPanel);
                }

                // Hide all panels first and ensure they're in the container
                config.tabs.forEach(tab => {
                    if (tab.panelId) {
                        let panel = document.getElementById(tab.panelId);

                        // If not found by ID, try to find it in the panel container
                        if (!panel && panelContainer) {
                            panel = panelContainer.querySelector(`#${tab.panelId}`);
                        }

                        if (panel) {
                            // Move panel into container if not already there
                            if (panel.parentNode !== panelContainer) {
                                panelContainer.appendChild(panel);
                            }

                            panel.classList.remove('jp-panel-active');
                            if (animate && config.slideAnimation) {
                                panel.classList.add('jp-panel-sliding');
                            }
                        }
                    }
                });

                // Show target panel
                if (animate && config.slideAnimation) {
                    // Animate the transition
                    setTimeout(() => {
                        targetPanel.classList.add('jp-panel-active');
                        targetPanel.classList.remove('jp-panel-sliding');
                    }, 150);
                } else {
                    // Instant switch
                    targetPanel.classList.add('jp-panel-active');
                }
            },

            /**
             * Setup panel height management with enhanced panelHeight options
             * @param {Element} tabsElement - The .jp-tabs element
             * @param {Object} config - Tab configuration
             * @param {undefined|'auto'|string|number} config.panelHeight - Height behavior:
             *   - undefined (default): Natural heights, content below jumps when switching tabs
             *   - 'auto': Auto-adjust to tallest panel height (prevents content jumping)
             *   - string/number: Fixed height with scrolling (e.g., '400px', 400, '30rem')
             */
            _setupPanelHeights: (tabsElement, config) => {
                const panelContainer = tabsElement.querySelector('.jp-tabs-panels');
                if (!panelContainer) return;

                // Clear any existing height constraints first
                panelContainer.style.height = '';
                panelContainer.style.overflowY = '';
                panelContainer.style.overflowX = '';

                if (!config.panelHeight) {
                    // DEFAULT: Natural heights - no adjustment, content can jump
                    // This is the most performant option as it requires no measurement or adjustment
                    return;
                }

                if (config.panelHeight === 'auto') {
                    // AUTO: Dynamic height - equalize to tallest panel
                    let maxHeight = 0;
                    const panels = [];

                    // Collect all panels and measure their natural heights
                    config.tabs.forEach(tab => {
                        if (tab.panelId) {
                            let panel = document.getElementById(tab.panelId);
                            if (!panel && panelContainer) {
                                panel = panelContainer.querySelector(`#${tab.panelId}`);
                            }
                            if (panel) {
                                panels.push(panel);

                                // Temporarily show panel to measure its height
                                const wasActive = panel.classList.contains('jp-panel-active');
                                panel.classList.add('jp-panel-active');
                                panel.style.visibility = 'hidden';
                                panel.style.position = 'absolute';

                                const height = panel.offsetHeight;
                                maxHeight = Math.max(maxHeight, height);

                                // Restore original state
                                panel.style.visibility = '';
                                panel.style.position = '';
                                if (!wasActive) {
                                    panel.classList.remove('jp-panel-active');
                                }
                            }
                        }
                    });

                    // Apply the max height to the container
                    if (maxHeight > 0) {
                        panelContainer.style.height = maxHeight + 'px';
                        panelContainer.style.overflowY = 'hidden';
                        panelContainer.style.overflowX = 'auto';

                        // Also apply height to panels and their child divs to prevent content jumping
                        panels.forEach(panel => {
                            panel.style.minHeight = maxHeight + 'px';

                            // Only extend height to child divs if there's exactly one child div
                            // Multiple child divs should maintain their natural heights
                            const childDivs = panel.querySelectorAll(':scope > div');
                            if (childDivs.length === 1) {
                                childDivs[0].style.minHeight = (maxHeight - 30 - 15) + 'px'; // Panel padding + bottom space
                            }
                        });
                    }
                } else {
                    // FIXED HEIGHT: Use specified height with scrolling
                    const heightValue = typeof config.panelHeight === 'number'
                        ? config.panelHeight + 'px'
                        : config.panelHeight;

                    panelContainer.style.height = heightValue;
                    panelContainer.style.overflowY = 'auto';
                    panelContainer.style.overflowX = 'auto';

                    // For numeric heights, also apply minHeight to panels and child divs
                    if (typeof config.panelHeight === 'number' || /^\d+px$/.test(config.panelHeight)) {
                        const fixedHeightValue = parseInt(config.panelHeight);
                        const panels = [];

                        config.tabs.forEach(tab => {
                            if (tab.panelId) {
                                let panel = document.getElementById(tab.panelId);
                                if (!panel && panelContainer) {
                                    panel = panelContainer.querySelector(`#${tab.panelId}`);
                                }
                                if (panel) {
                                    panels.push(panel);
                                }
                            }
                        });

                        // Apply height to panels and their child divs for fixed height mode
                        panels.forEach(panel => {
                            panel.style.minHeight = fixedHeightValue + 'px';

                            // Only extend height to child divs if there's exactly one child div
                            // Multiple child divs should maintain their natural heights
                            const childDivs = panel.querySelectorAll(':scope > div');
                            if (childDivs.length === 1) {
                                childDivs[0].style.minHeight = (fixedHeightValue - 30 - 15) + 'px'; // Panel padding + bottom space
                            }
                        });
                    }
                }
            },

            /**
             * Check if a tab should be hidden based on tabClass
             * @param {Object} tab - Tab configuration object
             * @returns {boolean} True if tab should be hidden
             */
            _isTabHidden: (tab) => {
                if (!tab.tabClass) {
                    return false;
                }

                // Check if the tab class exists in the document
                // This is a simple implementation - could be enhanced with role checking
                const testElement = document.createElement('div');
                testElement.className = tab.tabClass;
                document.body.appendChild(testElement);

                const isVisible = window.getComputedStyle(testElement).display !== 'none';
                document.body.removeChild(testElement);

                return !isVisible;
            },


            /**
             * Public method to activate a tab
             * @param {string} elementId - The tabs element ID
             * @param {string} tabId - Tab ID to activate
             */
            _activateTab: (elementId, tabId) => {
                const element = document.getElementById(elementId);
                if (element) {
                    jPulse.UI.tabs._setActiveTab(element, tabId, true);
                }
            },

            /**
             * Get the currently active tab ID
             * @param {string} elementId - The tabs element ID
             * @returns {string|null} Active tab ID or null
             */
            _getActiveTab: (elementId) => {
                const element = document.getElementById(elementId);
                return element ? element._jpTabsActiveTab : null;
            },

            /**
             * Refresh the tabs (re-render)
             * @param {string} elementId - The tabs element ID
             */
            _refresh: (elementId) => {
                const element = document.getElementById(elementId);
                if (element) {
                    const config = element._jpTabsConfig;
                    const tabType = element._jpTabsType;
                    const activeTab = element._jpTabsActiveTab;
                    jPulse.UI.tabs._setup(element, config, activeTab, tabType);
                }
            },

            /**
             * Destroy the tabs instance
             * @param {string} elementId - The tabs element ID
             */
            _destroy: (elementId) => {
                const element = document.getElementById(elementId);
                if (element) {
                    // Clean up stored data
                    delete element._jpTabsConfig;
                    delete element._jpTabsType;
                    delete element._jpTabsActiveTab;

                    // Remove CSS classes
                    element.classList.remove('jp-tabs', 'jp-tabs-navigation', 'jp-tabs-panel');

                    // Clear content
                    element.innerHTML = '';
                }
            }
        },

        // ========================================
        // SITE NAVIGATION (W-069)
        // ========================================

        /**
         * Site navigation pulldown and mobile hamburger menu
         * Reads navigation structure from appConfig.view.navigation
         */
        navigation: {
            _initialized: false,
            _currentUrl: '',
            _userRoles: [],
            _registeredPages: {},  // Dynamic pages registered by SPAs
            _navConfig: null,  // Navigation structure from server
            _hideTimeouts: new Map(),  // Map of submenu -> timeout for tracking individual hide operations
            _openDelay: 300,  // ms delay before opening menu (default)
            _closeDelay: 500,  // ms delay before closing menu (default)
            _submenuCloseDelay: 600,  // ms delay before closing submenus (default)
            _openTimeout: null,  // Timeout for open delay (can be cancelled)

            /**
             * Remove null properties from navigation structure (deletion markers)
             * Recursively sanitizes navigation to prevent null access errors
             * @param {Object} obj - Object to sanitize
             * @returns {Object} Sanitized object without null/undefined properties
             */
            _sanitizeNavStructure: (obj) => {
                if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
                    return obj;
                }

                const sanitized = {};
                for (const [key, value] of Object.entries(obj)) {
                    // Skip null/undefined values (deletion markers from site override)
                    if (value === null || value === undefined) {
                        continue;
                    }

                    // Recursively sanitize nested objects (pages, submenus, etc.)
                    if (typeof value === 'object' && !Array.isArray(value)) {
                        sanitized[key] = jPulse.UI.navigation._sanitizeNavStructure(value);
                    } else {
                        sanitized[key] = value;
                    }
                }
                return sanitized;
            },

            /**
             * Initialize site navigation from appConfig
             * @param {Object} options - Configuration
             * @param {string} options.currentUrl - Current page URL for active state
             * @param {Array} options.userRoles - User roles for visibility control
             * @param {number} options.openDelay - Delay before opening menu (ms)
             * @param {number} options.closeDelay - Delay before closing menu (ms)
             * @param {number} options.submenuCloseDelay - Delay before closing submenus (ms)
             * @returns {Object} Handle object with navigation control methods
             */
            init: (options = {}) => {
                // Allow re-initialization if user roles have changed
                const newRoles = JSON.stringify(options.userRoles || []);
                const oldRoles = JSON.stringify(jPulse.UI.navigation._userRoles);

                if (jPulse.UI.navigation._initialized && newRoles === oldRoles) {
                    console.warn('jPulse.UI.navigation already initialized with same roles');
                    return null;
                }

                // If re-initializing, destroy old navigation first
                if (jPulse.UI.navigation._initialized) {
                    jPulse.UI.navigation._destroy();
                }

                // Store config
                jPulse.UI.navigation._currentUrl = options.currentUrl || window.location.pathname;
                jPulse.UI.navigation._userRoles = options.userRoles || [];

                // Store delay configs (convert to numbers if strings, with defaults)
                jPulse.UI.navigation._openDelay = typeof options.openDelay === 'number'
                    ? options.openDelay
                    : (typeof options.openDelay === 'string' ? parseInt(options.openDelay, 10) : 300);
                jPulse.UI.navigation._closeDelay = typeof options.closeDelay === 'number'
                    ? options.closeDelay
                    : (typeof options.closeDelay === 'string' ? parseInt(options.closeDelay, 10) : 500);
                jPulse.UI.navigation._submenuCloseDelay = typeof options.submenuCloseDelay === 'number'
                    ? options.submenuCloseDelay
                    : (typeof options.submenuCloseDelay === 'string' ? parseInt(options.submenuCloseDelay, 10) : 600);

                // Get navigation structure from options parameter (passed from server)
                const navConfig = options.navigation;
                if (!navConfig || Object.keys(navConfig).length === 0) {
                    console.warn('No navigation structure provided');
                    return null;
                }
                // Sanitize navigation to remove null deletion markers (W-098)
                jPulse.UI.navigation._navConfig = jPulse.UI.navigation._sanitizeNavStructure(navConfig);

                // Create navigation dropdown element
                jPulse.UI.navigation._createDropdown();

                // Setup event handlers
                jPulse.UI.navigation._setupEventHandlers();

                // Initialize mobile menu (W-069-B)
                jPulse.UI.navigation._initMobileMenu();

                jPulse.UI.navigation._initialized = true;

                return {
                    refresh: () => jPulse.UI.navigation._refresh(),
                    destroy: () => jPulse.UI.navigation._destroy()
                };
            },

            /**
             * Register dynamic pages for a navigation section (for SPAs)
             * @param {string} sectionKey - Key in navigation structure (e.g., 'jPulseDocs')
             * @param {Function} callback - Async function returning pages structure
             */
            registerPages: async (sectionKey, callback) => {
                if (typeof callback !== 'function') {
                    console.error('registerPages: callback must be a function');
                    return;
                }

                // Only register if current URL starts with this section's URL
                const navConfig = jPulse.UI.navigation._navConfig;
                const section = navConfig?.[sectionKey];

                if (!section) {
                    console.warn(`Navigation section '${sectionKey}' not found in navigation config`);
                    return;
                }

                // Check if current URL starts with section URL
                if (!jPulse.UI.navigation._currentUrl.startsWith(section.url)) {
                    // Not on this section's URL, don't load dynamic pages
                    return;
                }

                try {
                    const pages = await callback();
                    jPulse.UI.navigation._registeredPages[sectionKey] = pages;

                    // Refresh navigation to show new pages
                    if (jPulse.UI.navigation._initialized) {
                        jPulse.UI.navigation._refresh();
                    }

                    // Refresh breadcrumb to show new pages
                    if (jPulse.UI.breadcrumbs && jPulse.UI.breadcrumbs._initialized) {
                        jPulse.UI.breadcrumbs.refresh();
                    }
                } catch (error) {
                    console.error(`Failed to load dynamic pages for ${sectionKey}:`, error);
                }
            },

            /**
             * Helper functions for common page conversions
             * Note: convertMarkdownFilesToPages moved to jPulse.UI.docs.convertFilesToPages (W-104)
             */
            helpers: {},

            // ========================================
            // INTERNAL NAVIGATION FUNCTIONS
            // ========================================

            /**
             * Create navigation dropdown element
             */
            _createDropdown: () => {
                // Create dropdown container
                const dropdown = document.createElement('div');
                dropdown.id = 'jp-site-nav-dropdown';
                dropdown.className = 'jp-site-nav-dropdown jp-site-nav-hidden';

                // Render navigation structure (use stored config)
                const navHTML = jPulse.UI.navigation._renderNavLevel(jPulse.UI.navigation._navConfig, 0);
                dropdown.innerHTML = navHTML;

                // Insert into page (after header)
                const header = document.querySelector('.jp-header');
                if (header) {
                    header.parentNode.insertBefore(dropdown, header.nextSibling);
                } else {
                    // Fallback: insert at top of body
                    document.body.insertBefore(dropdown, document.body.firstChild);
                }

                // Position dropdown to align logo icon with menu icon/bullet
                const logoImg = document.querySelector('.jp-logo img');
                if (logoImg) {
                    const logoImgRect = logoImg.getBoundingClientRect();
                    const menuPaddingLeft = 16;  // .jp-nav-link padding-left
                    dropdown.style.left = (logoImgRect.left - menuPaddingLeft) + 'px';
                }
            },

            /**
             * Check if a pages object has any visible items (not hidden by role or hideInDropdown)
             * @param {Object} pages - Pages object to check
             * @returns {boolean} True if there are visible pages
             */
            _hasVisiblePages: (pages) => {
                if (!pages || typeof pages !== 'object') {
                    return false;
                }
                return Object.values(pages).some(page => {
                    // Skip if role restriction not met
                    if (page.role && !jPulse.UI.navigation._userRoles.includes(page.role)) {
                        return false;
                    }
                    // Skip if hidden in dropdown
                    if (page.hideInDropdown) {
                        return false;
                    }
                    return true;
                });
            },

            /**
             * Render a level of navigation hierarchy
             * @param {Object} navStructure - Navigation structure object
             * @param {number} depth - Current depth level
             * @returns {string} HTML for this level
             */
            _renderNavLevel: (navStructure, depth) => {
                if (!navStructure || typeof navStructure !== 'object') {
                    return '';
                }

                let html = '<ul class="jp-nav-level jp-nav-level-' + depth + '">';

                Object.entries(navStructure).forEach(([key, item]) => {
                    // Check role-based visibility
                    if (item.role && !jPulse.UI.navigation._userRoles.includes(item.role)) {
                        return;  // Skip this item
                    }

                    // Check hideInDropdown flag (breadcrumb-only items)
                    if (item.hideInDropdown) {
                        return;  // Skip this item in dropdown menu
                    }

                    // Check for registered dynamic pages
                    const pages = jPulse.UI.navigation._registeredPages[key] || item.pages;
                    // Only show submenu arrow if there are visible pages (not all hidden)
                    const hasPages = jPulse.UI.navigation._hasVisiblePages(pages);

                    // Build CSS classes
                    const classes = ['jp-nav-item'];
                    if (hasPages) {
                        classes.push('jp-nav-has-submenu');
                    }
                    if (item.role) {
                        classes.push('jp-nav-role-' + item.role);
                    }

                    html += '<li class="' + classes.join(' ') + '">';

                    // Render icon if present
                    let iconHTML = '';
                    if (item.icon) {
                        iconHTML = jPulse.UI.navigation._renderIcon(item.icon);
                    }

                    // Render item link
                    html += '<a href="' + (item.url || '#') + '" class="jp-nav-link">';
                    if (iconHTML) {
                        html += iconHTML;
                    }
                    html += '<span class="jp-nav-label">' + item.label + '</span>';
                    if (hasPages) {
                        html += '<span class="jp-nav-arrow">›</span>';
                    }
                    html += '</a>';

                    // Recursively render sub-pages (nested ul directly, no div wrapper)
                    if (hasPages) {
                        html += jPulse.UI.navigation._renderNavLevel(pages, depth + 1);
                    }

                    html += '</li>';
                });

                html += '</ul>';
                return html;
            },

            /**
             * Render icon (emoji or image file)
             * @param {string} icon - Icon string (emoji or filename)
             * @returns {string} HTML for icon
             */
            _renderIcon: (icon, wrapperClass = 'jp-nav-icon') => {
                if (!icon) return '';

                // Check if it's inline SVG markup (from component)
                if (icon.trim().startsWith('<svg')) {
                    // Wrap SVG for consistent styling (sizing, positioning, margins)
                    return '<span class="' + wrapperClass + ' ' + wrapperClass + '-svg">' + icon + '</span>';
                }

                // Check if it's an image file (has known extension)
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.svg', '.gif'];
                const isImageFile = imageExtensions.some(ext => icon.toLowerCase().endsWith(ext));

                if (isImageFile) {
                    // Image file - path relative to /static/ root (CDN'able in prod)
                    // Example: 'assets/admin/icons/config.svg' becomes '/assets/admin/icons/config.svg'
                    const iconPath = icon.startsWith('/') ? icon : '/' + icon;
                    return '<img src="' + iconPath + '" alt="" class="' + wrapperClass + ' ' + wrapperClass + '-image">';
                } else {
                    // Assume emoji or single character
                    return '<span class="' + wrapperClass + ' ' + wrapperClass + '-emoji">' + icon + '</span>';
                }
            },

            /**
             * Check if a URL is active (exact match or parent match)
             * @param {string} url - URL to check
             * @returns {boolean} True if active
             */
            _isActive: (url) => {
                if (!url) return false;

                const currentUrl = jPulse.UI.navigation._currentUrl;

                // Exact match
                if (currentUrl === url) {
                    return true;
                }

                // Parent match (current URL starts with this URL)
                if (currentUrl.startsWith(url) && url !== '/') {
                    return true;
                }

                return false;
            },

            /**
             * Setup event handlers for navigation
             */
            _setupEventHandlers: () => {
                const header = document.querySelector('.jp-header');
                const logo = header?.querySelector('.jp-logo');
                const dropdown = document.getElementById('jp-site-nav-dropdown');

                if (!header || !logo || !dropdown) {
                    return;
                }

                // Helper function to show dropdown (with openDelay if configured)
                const showDropdown = () => {
                    // Clear any pending hide timeout
                    if (jPulse.UI.navigation._hideTimeouts.has('main')) {
                        clearTimeout(jPulse.UI.navigation._hideTimeouts.get('main'));
                        jPulse.UI.navigation._hideTimeouts.delete('main');
                    }
                    // Clear any pending open timeout
                    if (jPulse.UI.navigation._openTimeout) {
                        clearTimeout(jPulse.UI.navigation._openTimeout);
                        jPulse.UI.navigation._openTimeout = null;
                    }
                    dropdown.classList.remove('jp-site-nav-hidden');
                };

                // Helper function to schedule dropdown opening (with openDelay)
                const scheduleShowDropdown = () => {
                    // Clear any pending hide timeout
                    if (jPulse.UI.navigation._hideTimeouts.has('main')) {
                        clearTimeout(jPulse.UI.navigation._hideTimeouts.get('main'));
                        jPulse.UI.navigation._hideTimeouts.delete('main');
                    }
                    // Clear any existing open timeout
                    if (jPulse.UI.navigation._openTimeout) {
                        clearTimeout(jPulse.UI.navigation._openTimeout);
                    }
                    // Schedule opening with delay
                    if (jPulse.UI.navigation._openDelay > 0) {
                        jPulse.UI.navigation._openTimeout = setTimeout(() => {
                            showDropdown();
                            jPulse.UI.navigation._openTimeout = null;
                        }, jPulse.UI.navigation._openDelay);
                    } else {
                        // No delay, show immediately
                        showDropdown();
                    }
                };

                // Helper function to cancel opening and hide dropdown
                const cancelAndHideDropdown = () => {
                    // Cancel any pending open timeout
                    if (jPulse.UI.navigation._openTimeout) {
                        clearTimeout(jPulse.UI.navigation._openTimeout);
                        jPulse.UI.navigation._openTimeout = null;
                    }
                    // Schedule hiding with closeDelay
                    if (jPulse.UI.navigation._hideTimeouts.has('main')) {
                        clearTimeout(jPulse.UI.navigation._hideTimeouts.get('main'));
                    }
                    const timeout = setTimeout(() => {
                        dropdown.classList.add('jp-site-nav-hidden');
                        jPulse.UI.navigation._hideTimeouts.delete('main');
                    }, jPulse.UI.navigation._closeDelay);
                    jPulse.UI.navigation._hideTimeouts.set('main', timeout);
                };

                // Show dropdown on hover over logo/app name (with openDelay)
                logo.addEventListener('mouseenter', () => {
                    scheduleShowDropdown();
                });

                // Hide dropdown when mouse leaves logo (with delay)
                // Allows user to move from logo to dropdown without closing
                logo.addEventListener('mouseleave', (e) => {
                    if (dropdown.contains(e.relatedTarget)) {
                        // Mouse is moving to dropdown, don't hide
                        return;
                    }
                    cancelAndHideDropdown();
                });

                // Hide dropdown when mouse leaves dropdown area (with delay to prevent accidental closure)
                dropdown.addEventListener('mouseleave', () => {
                    cancelAndHideDropdown();
                });

                // Show dropdown on hover over dropdown (with openDelay, cancels hide timeout)
                dropdown.addEventListener('mouseenter', () => {
                    scheduleShowDropdown();
                });

                // Hide dropdown when mouse leaves header area entirely (with delay)
                header.addEventListener('mouseleave', (e) => {
                    // Check if mouse moved outside header and dropdown
                    const rect = header.getBoundingClientRect();
                    const dropdownRect = dropdown.getBoundingClientRect();

                    if (e.clientY > Math.max(rect.bottom, dropdownRect.bottom)) {
                        cancelAndHideDropdown();
                    }
                });

                // Setup hover handlers for nested submenus (L2, L3, etc.)
                // Each submenu gets independent timeout tracking via _hideTimeouts Map
                const allItems = dropdown.querySelectorAll('.jp-nav-item.jp-nav-has-submenu');
                allItems.forEach((item) => {
                    const submenu = item.querySelector(':scope > .jp-nav-level');

                    item.addEventListener('mouseenter', () => {
                        if (submenu && jPulse.UI.navigation._hideTimeouts.has(submenu)) {
                            clearTimeout(jPulse.UI.navigation._hideTimeouts.get(submenu));
                            jPulse.UI.navigation._hideTimeouts.delete(submenu);
                        }
                        jPulse.UI.navigation._positionSubmenu(item);
                    });

                    if (submenu) {
                        submenu.addEventListener('mouseenter', () => {
                            if (jPulse.UI.navigation._hideTimeouts.has(submenu)) {
                                clearTimeout(jPulse.UI.navigation._hideTimeouts.get(submenu));
                                jPulse.UI.navigation._hideTimeouts.delete(submenu);
                            }
                        });

                        submenu.addEventListener('mouseleave', (e) => {
                            if (submenu.contains(e.relatedTarget)) {
                                return;
                            }
                            if (jPulse.UI.navigation._hideTimeouts.has(submenu)) {
                                clearTimeout(jPulse.UI.navigation._hideTimeouts.get(submenu));
                            }
                            const timeout = setTimeout(() => {
                                submenu.style.setProperty('opacity', '0', 'important');
                                submenu.style.setProperty('pointer-events', 'none', 'important');
                                submenu.style.setProperty('transform', 'translateX(-10px)', 'important');
                                submenu.querySelectorAll('.jp-nav-level').forEach(s => {
                                    s.style.setProperty('opacity', '0', 'important');
                                    s.style.setProperty('pointer-events', 'none', 'important');
                                    s.style.setProperty('transform', 'translateX(-10px)', 'important');
                                    if (jPulse.UI.navigation._hideTimeouts.has(s)) {
                                        clearTimeout(jPulse.UI.navigation._hideTimeouts.get(s));
                                        jPulse.UI.navigation._hideTimeouts.delete(s);
                                    }
                                });
                                jPulse.UI.navigation._hideTimeouts.delete(submenu);
                            }, jPulse.UI.navigation._submenuCloseDelay);
                            jPulse.UI.navigation._hideTimeouts.set(submenu, timeout);
                        });
                    }

                    item.addEventListener('mouseleave', (e) => {
                        if (submenu && !submenu.contains(e.relatedTarget)) {
                            if (jPulse.UI.navigation._hideTimeouts.has(submenu)) {
                                clearTimeout(jPulse.UI.navigation._hideTimeouts.get(submenu));
                            }
                            const timeout = setTimeout(() => {
                                submenu.style.setProperty('opacity', '0', 'important');
                                submenu.style.setProperty('pointer-events', 'none', 'important');
                                submenu.style.setProperty('transform', 'translateX(-10px)', 'important');
                                submenu.querySelectorAll('.jp-nav-level').forEach(s => {
                                    s.style.setProperty('opacity', '0', 'important');
                                    s.style.setProperty('pointer-events', 'none', 'important');
                                    s.style.setProperty('transform', 'translateX(-10px)', 'important');
                                    if (jPulse.UI.navigation._hideTimeouts.has(s)) {
                                        clearTimeout(jPulse.UI.navigation._hideTimeouts.get(s));
                                        jPulse.UI.navigation._hideTimeouts.delete(s);
                                    }
                                });
                                jPulse.UI.navigation._hideTimeouts.delete(submenu);
                            }, jPulse.UI.navigation._submenuCloseDelay);
                            jPulse.UI.navigation._hideTimeouts.set(submenu, timeout);
                        }
                    });
                });
            },

            /**
             * Position submenu to prevent overflow (shift up if needed)
             * @param {HTMLElement} item - The nav item with submenu
             */
            _positionSubmenu: (item) => {
                const submenu = item.querySelector('.jp-nav-level');  // Direct child ul (no div wrapper!)
                if (!submenu) {
                    return;
                }

                // Start with top: 0 (align with parent)
                submenu.style.top = '0';

                // DISABLE TRANSITIONS FIRST
                submenu.style.setProperty('transition', 'none', 'important');

                // Force visibility immediately
                submenu.style.setProperty('opacity', '1', 'important');
                submenu.style.setProperty('pointer-events', 'all', 'important');
                submenu.style.setProperty('transform', 'translateX(0)', 'important');

                // Force reflow to apply styles immediately
                void submenu.offsetHeight;

                // Wait for next frame to get accurate measurements
                requestAnimationFrame(() => {
                    const submenuRect = submenu.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--jp-header-height') || '50');

                    // Calculate how much the submenu overflows the viewport
                    const bottomOverflow = submenuRect.bottom - viewportHeight + 10; // 10px padding from bottom
                    const topLimit = headerHeight + 10; // Don't go above header

                    if (bottomOverflow > 0) {
                        // Submenu goes below viewport - need to shift it up
                        const currentTop = submenuRect.top;
                        const newTop = currentTop - bottomOverflow;

                        // Make sure we don't shift above the header
                        if (newTop < topLimit) {
                            // Too tall to fit - align with header and let it scroll
                            const shiftAmount = currentTop - topLimit;
                            submenu.style.setProperty('top', `-${shiftAmount}px`, 'important');
                        } else {
                            // Shift up by overflow amount
                            submenu.style.setProperty('top', `-${bottomOverflow}px`, 'important');
                        }
                    }
                });
            },

            /**
             * Refresh navigation (re-render)
             */
            _refresh: () => {
                const dropdown = document.getElementById('jp-site-nav-dropdown');
                if (!dropdown) return;

                // Re-render navigation (use stored config)
                const navHTML = jPulse.UI.navigation._renderNavLevel(jPulse.UI.navigation._navConfig, 0);
                dropdown.innerHTML = navHTML;

                // Re-setup event handlers after refresh (same as init)
                const allItems = dropdown.querySelectorAll('.jp-nav-item.jp-nav-has-submenu');
                allItems.forEach((item) => {
                    const submenu = item.querySelector(':scope > .jp-nav-level');

                    item.addEventListener('mouseenter', () => {
                        if (submenu && jPulse.UI.navigation._hideTimeouts.has(submenu)) {
                            clearTimeout(jPulse.UI.navigation._hideTimeouts.get(submenu));
                            jPulse.UI.navigation._hideTimeouts.delete(submenu);
                        }
                        jPulse.UI.navigation._positionSubmenu(item);
                    });

                    if (submenu) {
                        submenu.addEventListener('mouseenter', () => {
                            if (jPulse.UI.navigation._hideTimeouts.has(submenu)) {
                                clearTimeout(jPulse.UI.navigation._hideTimeouts.get(submenu));
                                jPulse.UI.navigation._hideTimeouts.delete(submenu);
                            }
                        });

                        submenu.addEventListener('mouseleave', (e) => {
                            if (submenu.contains(e.relatedTarget)) {
                                return;
                            }
                            if (jPulse.UI.navigation._hideTimeouts.has(submenu)) {
                                clearTimeout(jPulse.UI.navigation._hideTimeouts.get(submenu));
                            }
                            const timeout = setTimeout(() => {
                                submenu.style.setProperty('opacity', '0', 'important');
                                submenu.style.setProperty('pointer-events', 'none', 'important');
                                submenu.style.setProperty('transform', 'translateX(-10px)', 'important');
                                submenu.querySelectorAll('.jp-nav-level').forEach(s => {
                                    s.style.setProperty('opacity', '0', 'important');
                                    s.style.setProperty('pointer-events', 'none', 'important');
                                    s.style.setProperty('transform', 'translateX(-10px)', 'important');
                                    if (jPulse.UI.navigation._hideTimeouts.has(s)) {
                                        clearTimeout(jPulse.UI.navigation._hideTimeouts.get(s));
                                        jPulse.UI.navigation._hideTimeouts.delete(s);
                                    }
                                });
                                jPulse.UI.navigation._hideTimeouts.delete(submenu);
                            }, jPulse.UI.navigation._submenuCloseDelay);
                            jPulse.UI.navigation._hideTimeouts.set(submenu, timeout);
                        });
                    }

                    item.addEventListener('mouseleave', (e) => {
                        if (submenu && !submenu.contains(e.relatedTarget)) {
                            if (jPulse.UI.navigation._hideTimeouts.has(submenu)) {
                                clearTimeout(jPulse.UI.navigation._hideTimeouts.get(submenu));
                            }
                            const timeout = setTimeout(() => {
                                submenu.style.setProperty('opacity', '0', 'important');
                                submenu.style.setProperty('pointer-events', 'none', 'important');
                                submenu.style.setProperty('transform', 'translateX(-10px)', 'important');
                                submenu.querySelectorAll('.jp-nav-level').forEach(s => {
                                    s.style.setProperty('opacity', '0', 'important');
                                    s.style.setProperty('pointer-events', 'none', 'important');
                                    s.style.setProperty('transform', 'translateX(-10px)', 'important');
                                    if (jPulse.UI.navigation._hideTimeouts.has(s)) {
                                        clearTimeout(jPulse.UI.navigation._hideTimeouts.get(s));
                                        jPulse.UI.navigation._hideTimeouts.delete(s);
                                    }
                                });
                                jPulse.UI.navigation._hideTimeouts.delete(submenu);
                            }, jPulse.UI.navigation._submenuCloseDelay);
                            jPulse.UI.navigation._hideTimeouts.set(submenu, timeout);
                        }
                    });
                });
            },

            /**
             * Destroy navigation instance
             */
            _destroy: () => {
                const dropdown = document.getElementById('jp-site-nav-dropdown');
                if (dropdown) {
                    dropdown.remove();
                }

                // Clean up timeouts
                if (jPulse.UI.navigation._openTimeout) {
                    clearTimeout(jPulse.UI.navigation._openTimeout);
                    jPulse.UI.navigation._openTimeout = null;
                }
                jPulse.UI.navigation._hideTimeouts.forEach((timeout) => {
                    clearTimeout(timeout);
                });
                jPulse.UI.navigation._hideTimeouts.clear();

                // Clean up mobile menu
                jPulse.UI.navigation._destroyMobileMenu();

                jPulse.UI.navigation._initialized = false;
                jPulse.UI.navigation._registeredPages = {};
            },

            // ========================================
            // MOBILE MENU FUNCTIONS (W-069-B)
            // ========================================

            /**
             * Initialize mobile menu (called from init)
             */
            _initMobileMenu: () => {
                const hamburger = document.getElementById('jp-hamburger');
                const overlay = document.getElementById('jp-mobile-menu-overlay');
                const mobileMenu = document.getElementById('jp-mobile-menu');

                if (!hamburger || !overlay || !mobileMenu) {
                    return;
                }

                // Render mobile menu content
                jPulse.UI.navigation._renderMobileMenu();

                // Hamburger click handler
                hamburger.addEventListener('click', () => {
                    jPulse.UI.navigation._toggleMobileMenu();
                });

                // Overlay click handler (close menu)
                overlay.addEventListener('click', () => {
                    jPulse.UI.navigation._closeMobileMenu();
                });

                // Handle escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        jPulse.UI.navigation._closeMobileMenu();
                    }
                });
            },

            /**
             * Render mobile menu HTML
             */
            _renderMobileMenu: () => {
                const mobileMenu = document.getElementById('jp-mobile-menu');
                if (!mobileMenu) {
                    return;
                }

                const navConfig = jPulse.UI.navigation._navConfig;
                const mergedConfig = { ...navConfig };

                // Merge registered pages into config
                Object.keys(jPulse.UI.navigation._registeredPages).forEach(key => {
                    if (mergedConfig[key]) {
                        mergedConfig[key].pages = {
                            ...mergedConfig[key].pages,
                            ...jPulse.UI.navigation._registeredPages[key]
                        };
                    }
                });

                // Render navigation items
                const html = jPulse.UI.navigation._renderMobileNavLevel(mergedConfig, 0);
                mobileMenu.innerHTML = `<ul class="jp-mobile-nav-list">${html}</ul>`;

                // Setup expand/collapse handlers
                jPulse.UI.navigation._setupMobileEventHandlers();
            },

            /**
             * Render mobile navigation level (recursive)
             */
            _renderMobileNavLevel: (navItems, depth) => {
                if (depth > 15 || !navItems || typeof navItems !== 'object') {
                    return '';
                }

                let html = '';
                Object.entries(navItems).forEach(([key, item]) => {
                    // Check role visibility
                    if (item.role && !jPulse.UI.navigation._userRoles.includes(item.role)) {
                        return;
                    }

                    // Check hideInDropdown flag (breadcrumb-only items)
                    if (item.hideInDropdown) {
                        return;  // Skip this item in mobile menu
                    }

                    // Only show submenu if there are visible pages (not all hidden)
                    const hasSubmenu = jPulse.UI.navigation._hasVisiblePages(item.pages);

                    html += `<li class="jp-mobile-nav-item${hasSubmenu ? ' jp-has-submenu' : ''}">`;

                    if (hasSubmenu) {
                        // Expandable item (button for accessibility)
                        html += `<button class="jp-mobile-nav-link" data-url="${item.url || ''}">`;
                    } else {
                        // Regular link
                        html += `<a href="${item.url || '#'}" class="jp-mobile-nav-link">`;
                    }

                    // Icon
                    if (item.icon) {
                        html += jPulse.UI.navigation._renderIcon(item.icon, 'jp-mobile-nav-icon');
                    }

                    // Label
                    html += `<span class="jp-mobile-nav-label">${item.label || key}</span>`;

                    // Chevron for expandable items
                    if (hasSubmenu) {
                        html += `<span class="jp-mobile-nav-chevron"></span>`;
                    }

                    html += hasSubmenu ? '</button>' : '</a>';

                    // Submenu
                    if (hasSubmenu) {
                        html += `<ul class="jp-mobile-nav-submenu">`;
                        html += jPulse.UI.navigation._renderMobileNavLevel(item.pages, depth + 1);
                        html += `</ul>`;
                    }

                    html += '</li>';
                });

                return html;
            },

            /**
             * Setup mobile menu event handlers (tap to expand)
             */
            _setupMobileEventHandlers: () => {
                const mobileMenu = document.getElementById('jp-mobile-menu');
                if (!mobileMenu) {
                    return;
                }

                // Handle expand/collapse for items with submenus
                const expandableItems = mobileMenu.querySelectorAll('.jp-mobile-nav-item.jp-has-submenu > .jp-mobile-nav-link');
                expandableItems.forEach(button => {
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        const item = button.parentElement;

                        // Toggle expanded state
                        const isExpanded = item.classList.contains('jp-expanded');

                        // Close all siblings
                        const siblings = Array.from(item.parentElement.children);
                        siblings.forEach(sibling => {
                            if (sibling !== item) {
                                sibling.classList.remove('jp-expanded');
                            }
                        });

                        // Toggle this item
                        item.classList.toggle('jp-expanded', !isExpanded);
                    });
                });

                // Handle navigation link clicks (close menu)
                const navLinks = mobileMenu.querySelectorAll('.jp-mobile-nav-link:not(.jp-has-submenu .jp-mobile-nav-link)');
                navLinks.forEach(link => {
                    link.addEventListener('click', () => {
                        jPulse.UI.navigation._closeMobileMenu();
                    });
                });
            },

            /**
             * Toggle mobile menu open/closed
             */
            _toggleMobileMenu: () => {
                const hamburger = document.getElementById('jp-hamburger');
                const overlay = document.getElementById('jp-mobile-menu-overlay');
                const mobileMenu = document.getElementById('jp-mobile-menu');

                if (!hamburger || !overlay || !mobileMenu) {
                    return;
                }

                const isOpen = mobileMenu.classList.contains('jp-active');

                if (isOpen) {
                    jPulse.UI.navigation._closeMobileMenu();
                } else {
                    jPulse.UI.navigation._openMobileMenu();
                }
            },

            /**
             * Open mobile menu
             */
            _openMobileMenu: () => {
                const hamburger = document.getElementById('jp-hamburger');
                const overlay = document.getElementById('jp-mobile-menu-overlay');
                const mobileMenu = document.getElementById('jp-mobile-menu');

                if (!hamburger || !overlay || !mobileMenu) {
                    return;
                }

                // Re-render to get latest registered pages
                jPulse.UI.navigation._renderMobileMenu();

                hamburger.classList.add('jp-menu-open');
                hamburger.setAttribute('aria-expanded', 'true');
                overlay.classList.add('jp-active');
                mobileMenu.classList.add('jp-active');
                document.body.classList.add('jp-mobile-menu-open');
            },

            /**
             * Close mobile menu
             */
            _closeMobileMenu: () => {
                const hamburger = document.getElementById('jp-hamburger');
                const overlay = document.getElementById('jp-mobile-menu-overlay');
                const mobileMenu = document.getElementById('jp-mobile-menu');

                if (!hamburger || !overlay || !mobileMenu) {
                    return;
                }

                hamburger.classList.remove('jp-menu-open');
                hamburger.setAttribute('aria-expanded', 'false');
                overlay.classList.remove('jp-active');
                mobileMenu.classList.remove('jp-active');
                document.body.classList.remove('jp-mobile-menu-open');
            },

            /**
             * Destroy mobile menu (cleanup)
             */
            _destroyMobileMenu: () => {
                jPulse.UI.navigation._closeMobileMenu();
            }
        },

        // ========================================
        // DOCUMENTATION VIEWER (W-104)
        // ========================================

        /**
         * Documentation viewer for markdown-based docs
         * Provides SPA navigation, markdown rendering, and site nav integration
         */
        docs: {
            // Internal state
            _viewer: null,

            /**
             * Initialize a documentation viewer
             * @param {Object} options - Configuration options
             * @param {string} options.navElement - Selector for navigation container (required)
             * @param {string} options.contentElement - Selector for content container (required)
             * @param {string} options.namespace - Documentation namespace (auto-detected from URL if omitted)
             * @param {string} options.defaultPath - Initial page to load (default: 'README.md')
             * @param {Function} options.onNavigate - Callback after navigation (path, content)
             * @param {Function} options.onError - Callback on errors (error)
             * @param {boolean} options.registerWithSiteNav - Register pages with site nav dropdown
             * @param {string} options.siteNavKey - Key for site nav registration
             * @param {boolean} options.flattenTopLevel - Remove root folder wrapper in site nav
             * @returns {Promise<Object>} Viewer instance for programmatic control
             */
            init: async (options = {}) => {
                const config = {
                    navElement: options.navElement,
                    contentElement: options.contentElement,
                    namespace: options.namespace || jPulse.UI.docs._getNamespaceFromUrl(),
                    defaultPath: options.defaultPath || 'README.md',
                    onNavigate: options.onNavigate || null,
                    onError: options.onError || null,
                    registerWithSiteNav: options.registerWithSiteNav || false,
                    siteNavKey: options.siteNavKey || null,
                    flattenTopLevel: options.flattenTopLevel !== false // Default true
                };

                // Validate required options
                if (!config.navElement) {
                    throw new Error('jPulse.UI.docs.init: navElement is required');
                }
                if (!config.contentElement) {
                    throw new Error('jPulse.UI.docs.init: contentElement is required');
                }

                // Create viewer instance
                const viewer = {
                    namespace: config.namespace,
                    currentPath: jPulse.UI.docs._getPathFromUrl(config.namespace) || config.defaultPath,
                    files: null,
                    _config: config,
                    _navEl: document.querySelector(config.navElement),
                    _contentEl: document.querySelector(config.contentElement),

                    /**
                     * Navigate to a document
                     * @param {string} path - Document path (e.g., 'guides/installation.md')
                     */
                    navigateTo: async function(path) {
                        const normalizedPath = path.endsWith('.md') ? path : `${path}.md`;
                        const url = `/${this.namespace}/${path.replace('.md', '')}`;
                        history.pushState({ path: normalizedPath }, '', url);
                        this.currentPath = normalizedPath;
                        await jPulse.UI.docs._loadDocument(this);
                        jPulse.UI.docs._updateActiveNav(this);
                    },

                    /**
                     * Get current document path
                     * @returns {string} Current path
                     */
                    getCurrentPath: function() {
                        return this.currentPath;
                    },

                    /**
                     * Refresh current document
                     */
                    refresh: async function() {
                        await jPulse.UI.docs._loadDocument(this);
                    },

                    /**
                     * Get cached file structure
                     * @returns {Array} File structure from API
                     */
                    getFiles: function() {
                        return this.files;
                    }
                };

                // Validate DOM elements
                if (!viewer._navEl) {
                    throw new Error(`jPulse.UI.docs.init: navElement '${config.navElement}' not found`);
                }
                if (!viewer._contentEl) {
                    throw new Error(`jPulse.UI.docs.init: contentElement '${config.contentElement}' not found`);
                }

                // Load navigation and initial document
                await jPulse.UI.docs._loadNavigation(viewer);
                await jPulse.UI.docs._loadDocument(viewer);
                jPulse.UI.docs._setupNavigation(viewer);

                // Register with site nav if requested
                if (config.registerWithSiteNav && config.siteNavKey) {
                    jPulse.UI.navigation.registerPages(config.siteNavKey, async () => {
                        if (viewer.files) {
                            const pages = jPulse.UI.docs.convertFilesToPages(viewer.files);

                            // Flatten top level if requested
                            if (config.flattenTopLevel) {
                                const firstKey = Object.keys(pages)[0];
                                if (firstKey && pages[firstKey].pages && Object.keys(pages[firstKey].pages).length > 0) {
                                    return pages[firstKey].pages;
                                }
                            }

                            return pages;
                        }
                        return {};
                    });
                }

                // Store viewer instance
                jPulse.UI.docs._viewer = viewer;

                return viewer;
            },

            /**
             * Get the current viewer instance
             * @returns {Object|null} Viewer instance or null if not initialized
             */
            getViewer: () => {
                return jPulse.UI.docs._viewer;
            },

            /**
             * Convert markdown file list to navigation pages structure
             * @param {Array} files - Array of file objects from markdown API
             * @param {number} depth - Current recursion depth (internal)
             * @returns {Object} Pages structure matching navigation format
             */
            convertFilesToPages: (files, depth = 0) => {
                const MAX_DEPTH = 16;
                if (depth > MAX_DEPTH || !Array.isArray(files)) {
                    return {};
                }

                const pages = {};
                files.forEach(file => {
                    const key = file.name || file.path.replace('.md', '').replace(/[^a-zA-Z0-9]/g, '_');
                    pages[key] = {
                        label: file.title || file.name,
                        url: file.url || file.path.replace('.md', '')
                    };

                    // Recursively convert subdirectories
                    if (file.isDirectory && file.files && file.files.length > 0) {
                        pages[key].pages = jPulse.UI.docs.convertFilesToPages(file.files, depth + 1);
                    }
                });

                return pages;
            },

            // ========================================
            // INTERNAL DOCS FUNCTIONS
            // ========================================

            /**
             * Get namespace from URL path
             * @returns {string} Namespace (first path segment)
             */
            _getNamespaceFromUrl: () => {
                const pathParts = window.location.pathname.split('/').filter(p => p);
                return pathParts[0] || 'jpulse-docs';
            },

            /**
             * Get document path from URL
             * @param {string} namespace - Current namespace
             * @returns {string} Document path with .md extension
             */
            _getPathFromUrl: (namespace) => {
                const path = window.location.pathname.replace(`/${namespace}/`, '') || 'README.md';
                return path.endsWith('.md') ? path : `${path}.md`;
            },

            /**
             * Load navigation structure from API
             * @param {Object} viewer - Viewer instance
             */
            _loadNavigation: async (viewer) => {
                try {
                    const response = await fetch(`/api/1/markdown/${viewer.namespace}/`);
                    const data = await response.json();
                    viewer.files = data.files;
                    jPulse.UI.docs._renderNavigation(viewer, data.files);
                } catch (error) {
                    console.error('Failed to load navigation:', error);
                    if (viewer._config.onError) {
                        viewer._config.onError(error);
                    }
                }
            },

            /**
             * Render navigation sidebar
             * @param {Object} viewer - Viewer instance
             * @param {Array} files - File structure
             */
            _renderNavigation: (viewer, files) => {
                viewer._navEl.innerHTML = `<ul class="jp-docs-nav">${jPulse.UI.docs._renderFileList(viewer, files)}</ul>`;
            },

            /**
             * Render file list recursively
             * @param {Object} viewer - Viewer instance
             * @param {Array} files - Files to render
             * @returns {string} HTML string
             */
            _renderFileList: (viewer, files) => {
                let html = '';
                files.forEach(file => {
                    html += jPulse.UI.docs._renderFileItem(viewer, file);
                });
                return html;
            },

            /**
             * Render single file item
             * @param {Object} viewer - Viewer instance
             * @param {Object} item - File object
             * @returns {string} HTML string
             */
            _renderFileItem: (viewer, item) => {
                const isActive = item.path === viewer.currentPath;
                let cssClass = isActive ? 'jp-docs-nav-active' : '';
                let html = '<li>';

                if (item.isDirectory) {
                    cssClass += ' jp-docs-nav-directory';
                    if (item.name) {
                        // Directory with README - clickable
                        html += `<a href="/${viewer.namespace}/${item.path.replace('.md', '')}" class="${cssClass}" data-path="${item.path}"><strong>${item.title}</strong></a>`;
                    } else {
                        // Directory without README - just label
                        html += `<strong class="${cssClass}">${item.title}</strong>`;
                    }

                    // Render nested files
                    if (item.files && item.files.length > 0) {
                        html += `<ul>${jPulse.UI.docs._renderFileList(viewer, item.files)}</ul>`;
                    }
                } else {
                    // Regular file
                    html += `<a href="/${viewer.namespace}/${item.path.replace('.md', '')}" class="${cssClass}" data-path="${item.path}">${item.title}</a>`;
                }

                html += '</li>';
                return html;
            },

            /**
             * Load document content from API
             * @param {Object} viewer - Viewer instance
             */
            _loadDocument: async (viewer) => {
                try {
                    const response = await fetch(`/api/1/markdown/${viewer.namespace}/${viewer.currentPath}`);
                    const data = await response.json();
                    if (!data.success) {
                        throw new Error(data.error || 'Failed to load document');
                    }
                    jPulse.UI.docs._renderMarkdown(viewer, data.content);

                    // Call onNavigate callback
                    if (viewer._config.onNavigate) {
                        viewer._config.onNavigate(viewer.currentPath, data.content);
                    }
                } catch (error) {
                    const message = error.message || 'Failed to load documentation';
                    viewer._contentEl.innerHTML = `<div class="jp-error">${message}</div>`;

                    if (viewer._config.onError) {
                        viewer._config.onError(error);
                    }
                }
            },

            /**
             * Render markdown content
             * @param {Object} viewer - Viewer instance
             * @param {string} content - Markdown content (already transformed by server)
             */
            _renderMarkdown: (viewer, content) => {
                // Check if marked.js is available
                if (typeof marked !== 'undefined') {
                    const html = marked.parse(content);
                    viewer._contentEl.innerHTML = html;
                } else {
                    console.error('marked.js not loaded. Include: <script src="/common/marked/marked.min.js"></script>');
                    viewer._contentEl.innerHTML = `<pre>${content}</pre>`;
                }
            },

            /**
             * Setup navigation event handlers
             * @param {Object} viewer - Viewer instance
             */
            _setupNavigation: (viewer) => {
                // Handle navigation clicks
                document.addEventListener('click', async (e) => {
                    if (e.target.matches('.jp-docs-nav a')) {
                        e.preventDefault();
                        const path = e.target.getAttribute('data-path');
                        const url = `/${viewer.namespace}/${path.replace('.md', '')}`;
                        history.pushState({ path }, '', url);
                        viewer.currentPath = path;
                        await jPulse.UI.docs._loadDocument(viewer);
                        jPulse.UI.docs._updateActiveNav(viewer);
                    }
                });

                // Handle browser back/forward
                window.addEventListener('popstate', async () => {
                    viewer.currentPath = jPulse.UI.docs._getPathFromUrl(viewer.namespace);
                    await jPulse.UI.docs._loadDocument(viewer);
                    jPulse.UI.docs._updateActiveNav(viewer);
                });
            },

            /**
             * Update active navigation item
             * @param {Object} viewer - Viewer instance
             */
            _updateActiveNav: (viewer) => {
                document.querySelectorAll('.jp-docs-nav a').forEach(link => {
                    link.classList.toggle('jp-docs-nav-active',
                        link.getAttribute('data-path') === viewer.currentPath);
                });
            }
        },

        // ========================================
        // INTERNAL DIALOG FUNCTIONS
        // ========================================

        /**
         * Show a simple dialog (alert/info/success) using confirmDialog internally
         * @param {string} message - The message to display
         * @param {string} type - Dialog type: 'alert', 'info', or 'success'
         * @param {string|Object} titleOrOptions - Title string or options object
         * @returns {Promise<void>} Promise that resolves when dialog is closed
         */
        _showSimpleDialog: (message, type, titleOrOptions = {}) => {
            // Detect if 2nd param is string (title) or object (options)
            let options = {};
            if (typeof titleOrOptions === 'string') {
                options.title = titleOrOptions;
            } else if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
                options = { ...titleOrOptions };
            }

            // Set default options
            const defaultOptions = {
                title: null,
                width: null,
                minWidth: 300,
                height: null,
                minHeight: 150,
                buttons: ['OK']
            };

            const config = { ...defaultOptions, ...options };

            // Get default title from i18n if not provided
            if (!config.title) {
                const i18nKeys = {
                    alert: 'alertDialog',
                    info: 'infoDialog',
                    success: 'successDialog'
                };
                const i18nKey = i18nKeys[type] || 'infoDialog';
                config.title = window.i18n?.view?.ui?.[i18nKey]?.title ||
                    (type === 'alert' ? 'Alert' :
                     type === 'success' ? 'Success' : 'Information');
            }

            // Use confirmDialog with single OK button and type-specific styling
            return jPulse.UI.confirmDialog({
                ...config,
                message: message,
                type: type, // Pass type for styling ('alert', 'info', 'success')
                buttons: config.buttons,
                minWidth: config.minWidth || 300,
                minHeight: config.minHeight || 150
            }).then(() => {
                // confirmDialog returns result object, but simple dialogs just resolve
                return Promise.resolve();
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
            // Remove keydown event listener if it exists
            if (overlay._keydownHandler) {
                document.removeEventListener('keydown', overlay._keydownHandler, true);
                overlay._keydownHandler = null;
            }

            // Remove from stack
            const index = jPulse.UI._dialogStack.findIndex(item => item.overlay === overlay);
            if (index > -1) {
                jPulse.UI._dialogStack.splice(index, 1);
            }

            // Restore focus to previously focused element if no more dialogs
            if (jPulse.UI._dialogStack.length === 0 && jPulse.UI._previousFocus) {
                // Restore focus after a small delay to ensure dialog is gone
                setTimeout(() => {
                    if (jPulse.UI._previousFocus && typeof jPulse.UI._previousFocus.focus === 'function') {
                        jPulse.UI._previousFocus.focus();
                    }
                    jPulse.UI._previousFocus = null;
                }, 50);
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
         * @param {Element} overlay - Dialog overlay element
         */
        _trapFocus: (dialog, overlay) => {
            // Store currently focused element to restore later
            if (!jPulse.UI._previousFocus && document.activeElement) {
                jPulse.UI._previousFocus = document.activeElement;
            }

            // Get all focusable elements in the dialog
            const focusableElements = dialog.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements.length > 0) {
                // Focus the first element
                focusableElements[0].focus();

                // Prevent keyboard events from reaching background elements
                const handleKeydown = (e) => {
                    // Prevent Enter/Space from triggering background buttons
                    if (e.key === 'Enter' || e.key === ' ') {
                        // Only allow these keys if focus is on a dialog element
                        if (!dialog.contains(e.target)) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                        }
                    }

                    // Trap Tab key within dialog
                    if (e.key === 'Tab') {
                        const firstElement = focusableElements[0];
                        const lastElement = focusableElements[focusableElements.length - 1];

                        if (e.shiftKey) {
                            // Shift+Tab - if on first element, go to last
                            if (document.activeElement === firstElement) {
                                e.preventDefault();
                                lastElement.focus();
                            }
                        } else {
                            // Tab - if on last element, go to first
                            if (document.activeElement === lastElement) {
                                e.preventDefault();
                                firstElement.focus();
                            }
                        }
                    }
                };

                // Add event listener to document (will be removed when dialog closes)
                overlay._keydownHandler = handleKeydown;
                document.addEventListener('keydown', handleKeydown, true); // Use capture phase
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
        },

        /**
         * Source Code UI Component with syntax highlighting and copy functionality
         */
        sourceCode: {
            /**
             * Initialize all source code components on the page
             */
            initAll: function() {
                const elements = document.querySelectorAll('.jp-source-code');
                elements.forEach(element => {
                    if (!element.dataset.jpSourceCodeInitialized) {
                        this.init(element);
                    }
                });
            },

            /**
             * Initialize a single source code component
             * @param {HTMLElement} element - The .jp-source-code element
             */
            init: function(element) {
                if (element.dataset.jpSourceCodeInitialized) {
                    return;
                }

                const lang = element.dataset.lang || 'text';
                const showCopy = element.dataset.showCopy !== 'false';
                const showLang = element.dataset.showLang === 'true';

                // Get or create the code content
                let codeElement = element.querySelector('code');
                let preElement = element.querySelector('pre');

                if (!preElement) {
                    preElement = document.createElement('pre');
                    if (codeElement) {
                        preElement.appendChild(codeElement);
                    } else {
                        codeElement = document.createElement('code');
                        codeElement.textContent = element.textContent.trim();
                        preElement.appendChild(codeElement);
                    }
                    element.innerHTML = '';
                    element.appendChild(preElement);
                }

                if (!codeElement) {
                    codeElement = document.createElement('code');
                    codeElement.textContent = preElement.textContent;
                    preElement.innerHTML = '';
                    preElement.appendChild(codeElement);
                }

                // Add language classes for Prism.js
                if (lang && lang !== 'text') {
                    preElement.className = `language-${lang}`;
                    codeElement.className = `language-${lang}`;
                }

                // Add language label if requested
                if (showLang && lang && lang !== 'text') {
                    const langLabel = document.createElement('div');
                    langLabel.className = 'jp-lang-label';
                    langLabel.textContent = lang.toUpperCase();
                    element.appendChild(langLabel);
                }

                // Add copy button if requested
                if (showCopy) {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'jp-copy-btn';
                    copyBtn.textContent = '📋 Copy';
                    copyBtn.onclick = () => this._copyCode(copyBtn, codeElement);
                    element.appendChild(copyBtn);
                }

                // Apply syntax highlighting if Prism is available
                if (typeof Prism !== 'undefined' && lang && lang !== 'text') {
                    Prism.highlightElement(codeElement);
                }

                element.dataset.jpSourceCodeInitialized = 'true';
            },

            /**
             * Copy code content to clipboard
             * @param {HTMLElement} button - The copy button
             * @param {HTMLElement} codeElement - The code element
             */
            _copyCode: function(button, codeElement) {
                jPulse.clipboard.copyFromElement(codeElement).then((success) => {
                    if (success) {
                        this._showCopySuccess(button);
                    } else {
                        this._showCopyError(button);
                    }
                });
            },

            /**
             * Show copy error feedback
             * @param {HTMLElement} button - The copy button
             */
            _showCopyError: function(button) {
                button.textContent = '❌ Failed';
                setTimeout(() => {
                    button.textContent = '📋 Copy';
                }, 2000);
            },

            /**
             * Show copy success feedback
             * @param {HTMLElement} button - The copy button
             */
            _showCopySuccess: function(button) {
                button.textContent = '✅ Copied!';
                button.classList.add('jp-copy-success');

                setTimeout(() => {
                    button.textContent = '📋 Copy';
                    button.classList.remove('jp-copy-success');
                }, 2000);
            }
        },

        // ========================================
        // Cursor-based Pagination Helper (W-080)
        // ========================================

        /**
         * Cursor-based pagination state management and UI helpers
         * Provides centralized pagination logic for consistent behavior across views
         */
        pagination: {
            /**
             * Create a new pagination state object
             * @returns {Object} Fresh pagination state
             */
            createState: function() {
                return {
                    nextCursor: null,
                    prevCursor: null,
                    total: 0,
                    hasMore: false,
                    currentStart: 1
                };
            },

            /**
             * Reset pagination state to initial values
             * @param {Object} state - Pagination state to reset
             * @returns {Object} Reset state (same object, modified in place)
             */
            resetState: function(state) {
                state.nextCursor = null;
                state.prevCursor = null;
                state.total = 0;
                state.hasMore = false;
                state.currentStart = 1;
                return state;
            },

            /**
             * Update pagination state from API response
             * @param {Object} state - Current pagination state
             * @param {Object} pagination - Pagination data from API response
             * @returns {Object} Updated state (same object, modified in place)
             */
            updateState: function(state, pagination) {
                if (!pagination) return state;
                state.nextCursor = pagination.nextCursor || null;
                state.prevCursor = pagination.prevCursor || null;
                state.total = pagination.total || 0;
                state.hasMore = pagination.hasMore || false;
                // currentStart is preserved (managed by goNext/goPrev)
                return state;
            },

            /**
             * Format range text using i18n template
             * @param {Object} state - Pagination state with currentStart and total
             * @param {number} count - Number of items currently displayed
             * @param {string} template - Template string with %START%, %END%, %TOTAL% placeholders
             * @returns {string} Formatted range string
             */
            formatRange: function(state, count, template) {
                const start = state.currentStart || 1;
                const end = start + count - 1;
                return template
                    .replace('%START%', start)
                    .replace('%END%', end)
                    .replace('%TOTAL%', state.total);
            },

            /**
             * Update prev/next button disabled states
             * @param {Object} state - Pagination state
             * @param {string|Element} prevBtn - Previous button element or ID
             * @param {string|Element} nextBtn - Next button element or ID
             */
            updateButtons: function(state, prevBtn, nextBtn) {
                const prev = typeof prevBtn === 'string' ? document.getElementById(prevBtn) : prevBtn;
                const next = typeof nextBtn === 'string' ? document.getElementById(nextBtn) : nextBtn;
                if (prev) prev.disabled = !state.prevCursor;
                if (next) next.disabled = !state.nextCursor;
            },

            /**
             * Navigate to next page
             * @param {Object} state - Pagination state
             * @param {number} currentCount - Current page item count
             * @param {Function} loadFn - Function to call with (filters, cursor)
             * @param {Object} filters - Current filter parameters
             */
            goNext: function(state, currentCount, loadFn, filters) {
                if (state.nextCursor) {
                    state.currentStart += currentCount;
                    loadFn(filters, state.nextCursor);
                }
            },

            /**
             * Navigate to previous page
             * @param {Object} state - Pagination state
             * @param {number} pageSize - Page size for calculating new start
             * @param {Function} loadFn - Function to call with (filters, cursor)
             * @param {Object} filters - Current filter parameters
             */
            goPrev: function(state, pageSize, loadFn, filters) {
                if (state.prevCursor) {
                    state.currentStart = Math.max(1, state.currentStart - pageSize);
                    loadFn(filters, state.prevCursor);
                }
            },

            /**
             * Setup pagination button event listeners
             * @param {Object} config - Configuration object
             * @param {Object} config.state - Pagination state object
             * @param {string|Element} config.prevBtn - Previous button element or ID
             * @param {string|Element} config.nextBtn - Next button element or ID
             * @param {Function} config.loadFn - Function to call with (filters, cursor)
             * @param {Function} config.getFilters - Function that returns current filters
             * @param {Function} config.getCount - Function that returns current item count
             * @param {number} config.pageSize - Page size for prev navigation
             */
            setupButtons: function(config) {
                const prev = typeof config.prevBtn === 'string' ? document.getElementById(config.prevBtn) : config.prevBtn;
                const next = typeof config.nextBtn === 'string' ? document.getElementById(config.nextBtn) : config.nextBtn;

                if (prev) {
                    prev.addEventListener('click', () => {
                        this.goPrev(config.state, config.pageSize, config.loadFn, config.getFilters());
                    });
                }

                if (next) {
                    next.addEventListener('click', () => {
                        this.goNext(config.state, config.getCount(), config.loadFn, config.getFilters());
                    });
                }
            }
        },

        // ========================================
        // Window Focus Detection
        // ========================================

        /**
         * Window focus detection and callback management
         * Provides a centralized way to track window focus state and register callbacks
         */
        windowFocus: {
            // Private properties
            _callbacks: [],
            _hasFocus: true,
            _initialized: false,

            /**
             * Register a callback to be called when window focus changes
             * @param {Function} callback - Function to call with (hasFocus) parameter
             * @returns {Function} Unregister function
             */
            register: function(callback) {
                if (typeof callback !== 'function') {
                    console.error('jPulse.UI.windowFocus.register: callback must be a function');
                    return () => {};
                }

                // Initialize if not already done
                if (!jPulse.UI.windowFocus._initialized) {
                    jPulse.UI.windowFocus._init();
                }

                // Add callback to list
                jPulse.UI.windowFocus._callbacks.push(callback);

                // Call immediately with current state
                try {
                    callback(jPulse.UI.windowFocus._hasFocus);
                } catch (error) {
                    console.error('jPulse.UI.windowFocus: callback error:', error);
                }

                // Return unregister function
                return function() {
                    const index = jPulse.UI.windowFocus._callbacks.indexOf(callback);
                    if (index > -1) {
                        jPulse.UI.windowFocus._callbacks.splice(index, 1);
                    }
                };
            },

            /**
             * Get current focus state
             * @returns {boolean} True if window has focus
             */
            get hasFocus() {
                return jPulse.UI.windowFocus._hasFocus;
            },

            /**
             * Initialize focus detection (called automatically)
             * @private
             */
            _init: function() {
                if (jPulse.UI.windowFocus._initialized) {
                    return;
                }

                // Set initial state
                jPulse.UI.windowFocus._hasFocus = !document.hidden;

                // Listen for visibility changes (covers most cases including tab switching)
                document.addEventListener('visibilitychange', jPulse.UI.windowFocus._handleVisibilityChange);

                // Listen for focus/blur events (covers window switching)
                window.addEventListener('focus', jPulse.UI.windowFocus._handleFocus);
                window.addEventListener('blur', jPulse.UI.windowFocus._handleBlur);

                jPulse.UI.windowFocus._initialized = true;
            },

            /**
             * Handle visibility change events
             * @private
             */
            _handleVisibilityChange: function() {
                jPulse.UI.windowFocus._updateFocus(!document.hidden);
            },

            /**
             * Handle window focus events
             * @private
             */
            _handleFocus: function() {
                jPulse.UI.windowFocus._updateFocus(true);
            },

            /**
             * Handle window blur events
             * @private
             */
            _handleBlur: function() {
                jPulse.UI.windowFocus._updateFocus(false);
            },

            /**
             * Update focus state and notify callbacks
             * @param {boolean} newFocus - New focus state
             * @private
             */
            _updateFocus: function(newFocus) {
                if (jPulse.UI.windowFocus._hasFocus === newFocus) {
                    return; // No change, prevent double firing
                }

                jPulse.UI.windowFocus._hasFocus = newFocus;

                // Notify all callbacks
                jPulse.UI.windowFocus._callbacks.forEach(callback => {
                    try {
                        callback(newFocus);
                    } catch (error) {
                        console.error('jPulse.UI.windowFocus: callback error:', error);
                    }
                });
            }
        }
    },

    // ========================================
    // jPulse.clipboard - Clipboard Utility
    // ========================================

    clipboard: {
        /**
         * Copy text to clipboard with automatic fallback
         * @param {string} text - Text to copy
         * @returns {Promise<boolean>} Promise that resolves to true if successful
         */
        copy: function(text) {
            return new Promise((resolve) => {
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text).then(() => {
                        resolve(true);
                    }).catch(() => {
                        // Fallback to legacy method
                        resolve(this._fallbackCopy(text));
                    });
                } else {
                    // Fallback for older browsers or non-HTTPS
                    resolve(this._fallbackCopy(text));
                }
            });
        },

        /**
         * Copy text from an element to clipboard
         * @param {HTMLElement} element - Element containing text to copy
         * @returns {Promise<boolean>} Promise that resolves to true if successful
         */
        copyFromElement: function(element) {
            const text = element.textContent || element.innerText || '';
            return this.copy(text);
        },

        /**
         * Fallback copy method for older browsers
         * @param {string} text - Text to copy
         * @returns {boolean} True if successful
         */
        _fallbackCopy: function(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            } catch (err) {
                console.error('Copy failed:', err);
                document.body.removeChild(textArea);
                return false;
            }
        }
    },

    // ============================================================
    // jPulse.ws: WebSocket utilities for real-time communication
    // ============================================================

    /**
     * Provides clean API for connecting to WebSocket namespaces with:
     * - Automatic reconnection with progressive backoff
     * - Bidirectional ping/pong
     * - Connection status tracking
     * - Standard message format
     * - Configurable client UUID storage (session/local/memory)
     *
     * Usage:
     *   // Configure UUID storage (optional, defaults to 'session')
     *   jPulse.ws.configure({ uuidStorage: 'session' }); // per-tab (default)
     *   jPulse.ws.configure({ uuidStorage: 'local' });   // persistent across sessions
     *   jPulse.ws.configure({ uuidStorage: 'memory' });  // per-page load only
     *
     *   // Connect to WebSocket namespace
     *   const ws = jPulse.ws.connect('/api/1/ws/my-app')
     *     .onMessage(data => console.log(data))
     *     .onStatusChange(status => console.log(status));
     *   ws.send({ type: 'action', payload: {...} });
     */
    ws: {
        // Active connections registry
        _connections: new Map(),

        // Configuration
        _config: {
            reconnectBaseInterval: 5000,  // 5 seconds
            reconnectMaxInterval: 30000,  // 30 seconds max
            maxReconnectAttempts: 10,
            reconnectInterval: 5000,
            pingInterval: 30000,          // 30 seconds
            uuidStorage: 'session'        // 'session' | 'local' | 'memory'
        },

        // Memory storage for 'memory' mode
        _memoryUUID: null,

        /**
         * Configure WebSocket behavior
         * @param {Object} config - Configuration options
         * @param {string} config.uuidStorage - UUID storage type: 'session', 'local', or 'memory'
         */
        configure: function(config = {}) {
            this._config = { ...this._config, ...config };
        },

        /**
         * Generate UUID v4
         * @private
         */
        _generateUUID: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        /**
         * Get or create client UUID based on configured storage type
         * @private
         */
        _getClientUUID: function() {
            const storageKey = 'jPulse.ws.clientUUID';
            let uuid;

            switch (this._config.uuidStorage) {
                case 'local':
                    // Persistent across browser sessions (original behavior)
                    uuid = localStorage.getItem(storageKey);
                    if (!uuid) {
                        uuid = this._generateUUID();
                        localStorage.setItem(storageKey, uuid);
                    }
                    break;

                case 'session':
                    // Per-tab, survives page reloads (recommended for multi-tab apps)
                    uuid = sessionStorage.getItem(storageKey);
                    if (!uuid) {
                        uuid = this._generateUUID();
                        sessionStorage.setItem(storageKey, uuid);
                    }
                    break;

                case 'memory':
                    // Per-page load, no persistence (useful for testing)
                    if (!this._memoryUUID) {
                        this._memoryUUID = this._generateUUID();
                    }
                    uuid = this._memoryUUID;
                    break;

                default:
                    console.warn(`jPulse.ws: Unknown uuidStorage '${this._config.uuidStorage}', using 'session'`);
                    uuid = sessionStorage.getItem(storageKey);
                    if (!uuid) {
                        uuid = this._generateUUID();
                        sessionStorage.setItem(storageKey, uuid);
                    }
            }

            return uuid;
        },

        /**
         * Connect to WebSocket namespace
         * @param {string} path - Namespace path (e.g., '/api/1/ws/hello-emoji')
         * @param {Object} options - Connection options (optional)
         * @returns {Object} Connection handle with methods
         */
        connect: function(path, options = {}) {
            // Check if already connected
            if (this._connections.has(path)) {
                return this._connections.get(path).handle;
            }

            // Merge options with defaults
            const config = {
                ...this._config,
                ...options
            };

            // Get or create persistent client UUID
            const clientUUID = this._getClientUUID();

            // Create WebSocket connection with UUID query parameter
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const url = `${protocol}//${window.location.host}${path}?uuid=${encodeURIComponent(clientUUID)}`;

            const connection = {
                path,
                url,
                clientUUID,
                ws: null,
                config,
                status: 'connecting',
                reconnectAttempts: 0,
                messageCallbacks: [],
                statusCallbacks: [],
                reconnectTimer: null,
                pingTimer: null,
                shouldReconnect: true,
                uuid: clientUUID // Store UUID directly on connection object
            };

            // Add getConnection method to the connection object
            connection.getConnection = function() {
                return { uuid: this.uuid };
            };

            // Create connection handle (public API)
            connection.handle = {
                /**
                 * Send message to server
                 * @param {Object} data - Data to send
                 * @returns {boolean} True if sent successfully
                 */
                send: (data) => {
                    if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
                        connection.ws.send(JSON.stringify(data));
                        return true;
                    }
                    console.warn('jPulse.ws: Cannot send, connection not open');
                    return false;
                },

                /**
                 * Register message handler
                 * @param {Function} callback - Handler function(data)
                 * @returns {Object} Connection handle for chaining
                 */
                onMessage: (callback) => {
                    connection.messageCallbacks.push(callback);
                    return connection.handle;
                },

                /**
                 * Register status change handler
                 * @param {Function} callback - Handler function(status)
                 * @returns {Object} Connection handle for chaining
                 */
                onStatusChange: (callback) => {
                    connection.statusCallbacks.push(callback);
                    return connection.handle;
                },

                /**
                 * Get current connection status
                 * @returns {string} 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
                 */
                getStatus: () => {
                    return connection.status;
                },

                /**
                 * Disconnect and prevent auto-reconnect
                 */
                disconnect: () => {
                    connection.shouldReconnect = false;
                    if (connection.reconnectTimer) {
                        clearTimeout(connection.reconnectTimer);
                    }
                    if (connection.pingTimer) {
                        clearInterval(connection.pingTimer);
                    }
                    if (connection.ws) {
                        connection.ws.close();
                    }
                    jPulse.ws._connections.delete(path);
                },

                /**
                 * Check if currently connected
                 * @returns {boolean} True if connected
                 */
                isConnected: () => {
                    return connection.status === 'connected';
                }
            };

            // Store connection
            this._connections.set(path, connection);

            // Initiate connection
            this._createWebSocket(connection);

            return connection.handle;
        },

        /**
         * Create WebSocket and setup handlers
         * @private
         */
        _createWebSocket: function(connection) {
            try {
                connection.ws = new WebSocket(connection.url);

                // Connection opened
                connection.ws.onopen = () => {
                    console.log(`jPulse.ws: Connected to ${connection.path}`);
                    connection.reconnectAttempts = 0;
                    this._updateStatus(connection, 'connected');

                    // Remove manual ping timer - browsers handle ping/pong automatically
                    // The server sends ping frames and browser responds with pong frames automatically
                };

                // Remove onpong handler - browsers handle pong automatically
                // connection.ws.onpong = () => {
                //     connection.lastPong = Date.now();
                // };

                // Message received (JSON messages)
                connection.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);

                        // Handle pong message responses (if server sends them)
                        if (message.type === 'pong') {
                            connection.lastPong = Date.now(); // Update for message-based pong
                            return; // Silent acknowledgment
                        }

                        // Call message handlers
                        connection.messageCallbacks.forEach(callback => {
                            try {
                                // Pass data if success, or error object if failure
                                if (message.success) {
                                    callback(message.data, message);
                                } else {
                                    callback(null, message); // null data, full message for error handling
                                }
                            } catch (error) {
                                console.error('jPulse.ws: Message handler error:', error);
                            }
                        });
                    } catch (error) {
                        console.error('jPulse.ws: Failed to parse message:', error);
                    }
                };

                // Connection closed
                connection.ws.onclose = () => {
                    console.log(`jPulse.ws: Disconnected from ${connection.path}`);

                    // Clear ping timer (even though we don't use it, just in case)
                    if (connection.pingTimer) {
                        clearInterval(connection.pingTimer);
                        connection.pingTimer = null;
                    }

                    // Attempt reconnection if appropriate
                    if (connection.shouldReconnect &&
                        connection.reconnectAttempts < connection.config.maxReconnectAttempts) {
                        this._scheduleReconnect(connection);
                    } else {
                        this._updateStatus(connection, 'disconnected');
                    }
                };

                // Connection error
                connection.ws.onerror = (error) => {
                    console.error(`jPulse.ws: Connection error on ${connection.path}:`, error);
                };

            } catch (error) {
                console.error('jPulse.ws: Failed to create WebSocket:', error);
                this._scheduleReconnect(connection);
            }
        },

        /**
         * Schedule reconnection with progressive backoff
         * @private
         */
        _scheduleReconnect: function(connection) {
            if (!connection.shouldReconnect) return;

            connection.reconnectAttempts++;
            this._updateStatus(connection, 'reconnecting');

            // Calculate backoff delay: 5s, 10s, 15s, 20s, 25s, 30s (max)
            const delay = Math.min(
                connection.config.reconnectBaseInterval * connection.reconnectAttempts,
                connection.config.reconnectMaxInterval
            );

            console.log(`jPulse.ws: Reconnecting to ${connection.path} in ${delay/1000}s (attempt ${connection.reconnectAttempts})`);

            connection.reconnectTimer = setTimeout(() => {
                this._createWebSocket(connection);
            }, delay);
        },

        /**
         * Update connection status and notify callbacks
         * @private
         */
        _updateStatus: function(connection, newStatus) {
            const oldStatus = connection.status;
            connection.status = newStatus;

            if (oldStatus !== newStatus) {
                console.log(`jPulse.ws: Status changed: ${oldStatus} -> ${newStatus}`);
                connection.statusCallbacks.forEach(callback => {
                    try {
                        callback(newStatus, oldStatus);
                    } catch (error) {
                        console.error('jPulse.ws: Status handler error:', error);
                    }
                });
            }
        },

        /**
         * Get all active connections (for debugging)
         * @returns {Array} Array of connection paths
         */
        getConnections: function() {
            return Array.from(this._connections.keys());
        }
    },

    // ====================================================================
    // jPulse.appCluster: App Cluster API for multi-instance communication
    // ====================================================================

    /**
     * Provides broadcasting capabilities for PM2 clusters and multi-server deployments.
     * Automatically handles graceful fallback when Redis is unavailable.
     *
     * Usage:
     *   jPulse.appCluster.broadcast.subscribe('controller:user:login:success', (data) => { ... });
     *   jPulse.appCluster.broadcast.publish('view:chat:message:sent', { message: 'hello' });
     *
     * MVC Convention:
     *   - controller:{component}:{domain}:{action} - Business logic events
     *   - view:{component}:{domain}:{action} - UI events needing cross-instance sync
     *   - model:{component}:{domain}:{action} - Data change events
     */
    appCluster: {
        _isClusterMode: false,

        /**
         * Check if the application is running in cluster mode (Redis available)
         * @returns {boolean} - True if in cluster mode
         */
        isClusterMode: function() {
            return this._isClusterMode;
        },

        /**
         * Get client UUID for WebSocket communication
         * @returns {string|null} - The client's unique ID
             */
            getUuid: function() {
            // Prefer UUID from WebSocket connection if available
            if (jPulse.appCluster.broadcast._websocket && jPulse.appCluster.broadcast._websocket.uuid) {
                return jPulse.appCluster.broadcast._websocket.uuid;
            }
            // Fallback to localStorage (for backwards compatibility)
            try {
                const uuid = localStorage.getItem('jPulse.appCluster.uuid');
                    if (uuid) {
                        return uuid;
                    }
            } catch (e) { /* ignore */ }
            // No UUID available
                return null;
            },

        /**
         * Fetch wrapper that automatically includes the session-based UUID
         * Use this for any API calls that participate in app cluster broadcasting
         *
         * @param {string} url - The API endpoint URL
         * @param {Object} options - Standard fetch options (method, headers, body, etc.)
         * @returns {Promise<Response>} - The fetch response
         *
         * @example
         * // Instead of manually including the UUID:
         * //   fetch('/api/1/myController', {
         * //     method: 'POST',
         * //     headers: { 'Content-Type': 'application/json' },
         * //     body: JSON.stringify({ data: x, uuid: jPulse.appCluster.getUuid() })
         * //   })
         * //
         * // Use jPulse.appCluster.fetch() for cleaner code:
         * //   jPulse.appCluster.fetch('/api/1/myController', {
         * //     method: 'POST',
         * //     body: { data: x }
         * //   })
         */
        fetch: function(url, options = {}) {
            // Set defaults
            options.method = options.method || 'GET';
            options.headers = options.headers || {};

            // Ensure Content-Type is set for JSON requests
            if (!options.headers['Content-Type'] && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
                options.headers['Content-Type'] = 'application/json';
            }

            // Auto-inject UUID into request body for POST/PUT/DELETE
            if (options.body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
                let bodyData;

                // If body is already a string, parse it
                if (typeof options.body === 'string') {
                    try {
                        bodyData = JSON.parse(options.body);
                    } catch (e) {
                        bodyData = {};
                    }
                } else {
                    bodyData = options.body;
                }

                // Inject the UUID (won't override if already set)
                if (!bodyData.uuid) {
                    bodyData.uuid = jPulse.appCluster.getUuid();
                }

                // Stringify the body
                options.body = JSON.stringify(bodyData);
            }

            // Make the actual fetch call
            return window.fetch(url, options);
        },

        // Broadcast system (Pub/Sub)
        broadcast: (function() {
            const self = {
                _websocket: null,
                _subscribers: new Map(), // channel -> [callbacks]
                _pendingSubscriptions: new Set(), // { channel, options }

            /**
             * Subscribe to broadcast messages (view channels only)
                 * @param {string} channel - The channel to subscribe to (must start with 'view:')
             * @param {Function} callback - Callback function to handle messages
                 * @param {Object} options - Optional configuration ({ omitSelf: true/false })
             */
            subscribe: function(channel, callback, options = {}) {
                const { omitSelf = false } = options;

                // Validate that this is a view channel
                if (!channel.startsWith('view:')) {
                    throw new Error(`View channels must start with 'view:'. Got: ${channel}`);
                }

                // Validate channel schema
                    if (!self._validateChannelSchema(channel)) {
                    throw new Error(`Invalid channel schema: ${channel}. Expected: view:scope:type:action[:word]*`);
                }

                // Store local subscription
                    if (!self._subscribers.has(channel)) {
                        self._subscribers.set(channel, []);
                }
                    self._subscribers.get(channel).push({ callback, options });

                // Ensure WebSocket connection for real-time updates
                    self._ensureWebSocketConnection();

                // Register interest in this channel with server (include omitSelf flag)
                    self._registerChannelInterest(channel, { omitSelf });

                console.log(`jPulse.appCluster: Subscribed to ${channel} (with auto-WebSocket)`);
            },

            /**
             * Publish broadcast message (view channels only)
             * @param {string} channel - Channel name (must start with 'view:')
                 * @param {object} data - The message payload to send
                 * @param {object} options - Optional configuration
                 * @returns {Promise|undefined} - Promise that resolves on successful publish, or undefined if not connected
             */
            publish: function(channel, data, options = {}) {
                    // Ensure WebSocket is ready before publishing
                    if (!self._websocket || !self._websocket.isConnected()) {
                        jPulse.UI.toast.show(
                            'Cannot publish: Not connected to real-time server.',
                            'warning'
                        );
                        return;
                    }

                    // Post message to server for broadcasting
                    return self._postToServer(channel, data);
            },

            /**
                 * Ensure WebSocket connection is active
             * @private
             */
            _ensureWebSocketConnection: function() {
                    if (self._websocket && jPulse.appCluster.getUuid()) {
                    return; // Already connected or connecting
                }
                    self._connectWebSocket();
                },

                /**
                 * Connect to the WebSocket server
                 * @private
                 */
                _connectWebSocket: function() {
                    if (self._websocket) return; // Already connecting or connected

                    self._websocket = jPulse.ws.connect('/api/1/ws/app-cluster')
                        .onMessage((data) => {
                            self._handleWebSocketMessage(data);
                        })
                        .onStatusChange((status) => {
                            if (status === 'connected') {
                                console.log('jPulse.appCluster: WebSocket connected for broadcast system');
                                self._processPendingSubscriptions();
                            }
                        });
            },

            /**
                 * Handle WebSocket messages
             * @private
             */
                _handleWebSocketMessage: function(message) {
                    if (message.type === 'connected') {
                        // Store the server-confirmed UUID on the WebSocket object (not localStorage)
                        // Each tab needs its own unique UUID for omitSelf to work correctly
                        if (message.clientId) {
                            self._websocket.uuid = message.clientId;
                        }
                    } else if (message.type === 'welcome') {
                        // Process any pending subscriptions now that we are connected
                        self._processPendingSubscriptions();
                    } else if (message.type === 'broadcast') {
                        const { channel, data } = message;
                        self._publishLocal(channel, data);
                    } else if (message.type === 'subscribed') {
                        console.log(`jPulse.appCluster: Server confirmed subscription to ${message.channel}`);
                    } else if (message.type === 'unsubscribed') {
                        console.log(`jPulse.appCluster: Server confirmed unsubscription from ${message.channel}`);
                    }
                },

                /**
                 * Process pending subscriptions
                 * @private
                 */
                _processPendingSubscriptions: function() {
                    if (!self._websocket || !self._websocket.isConnected()) return;

                    const uuid = jPulse.appCluster.getUuid();
                    if (!uuid) {
                        console.warn('jPulse.appCluster: Cannot process pending subscriptions, no UUID available');
                        return;
                    }

                    self._pendingSubscriptions.forEach(subscription => {
                        self._registerChannelInterest(subscription.channel, subscription.options);
                    });
                    self._pendingSubscriptions.clear();
                },

                /**
                 * Post a message to the server via API
                 * @private
                 */
                _postToServer: function(channel, data) {
                    return new Promise((resolve, reject) => {
                        jPulse.appCluster.fetch(`/api/1/broadcast/${channel}`, {
                            method: 'POST',
                            body: { data: data }
                        })
                        .then(response => response.ok ? resolve(response.json()) : reject(new Error('Failed to post message')))
                        .catch(reject);
                    });
            },

            /**
             * Register interest in a channel with the server
             * @private
             */
            _registerChannelInterest: function(channel, options = {}) {
                    if (self._websocket && self._websocket.isConnected()) {
                        self._websocket.send({
                        type: 'subscribe',
                        channel: channel,
                        omitSelf: options.omitSelf || false
                    });
                } else {
                    // WebSocket not ready, add to pending
                        self._pendingSubscriptions.add({ channel, options });
                }
            },

            /**
             * Local-only publish (fallback when Redis unavailable)
             * @private
             */
            _publishLocal: function(channel, data) {
                    const subscribers = self._subscribers.get(channel) || [];
                    const currentUuid = jPulse.appCluster.getUuid();
                    subscribers.forEach(subscriber => {
                        // Check for self-omission on a per-subscriber basis
                        if (subscriber.options.omitSelf && data.uuid === currentUuid) {
                            return; // Skip this specific subscriber
                        }
                        try {
                            subscriber.callback(data);
                    } catch (error) {
                        console.error(`jPulse.appCluster: Error in subscriber for ${channel}:`, error);
                    }
                });
            },

            /**
                 * Validate channel schema
             * @private
             */
            _validateChannelSchema: function(channel) {
                    const parts = channel.split(':');
                    return parts.length >= 4 &&
                        parts[0] === 'view' &&
                        parts[1].length > 0 &&
                        parts[2].length > 0 &&
                        parts[3].length > 0;
                }
            };
            return self;
        })(),

        /**
         * Cluster information and health
         */
        info: {
            /**
             * Get active instances via API
             * @returns {Promise<Array>} Array of active instance IDs
             */
            async getActiveInstances() {
                try {
                    const response = await jPulse.api.get('/api/1/broadcast/status');
                    if (response.success) {
                        // For now, just return current instance (Phase 4 will aggregate all instances)
                        return [response.data.instanceId];
                    }
                } catch (error) {
                    console.error('jPulse.appCluster: Error getting active instances:', error);
                }
                return [jPulse.appCluster.getInstanceId()];
            },

            /**
             * Get cluster health status via API
             * @returns {Promise<Object>} Cluster health information
             */
            async getClusterHealth() {
                try {
                    const response = await jPulse.api.get('/api/1/broadcast/status');
                    if (response.success) {
                        return {
                            instanceId: response.data.instanceId,
                            clusterMode: response.data.broadcastEnabled,
                            redisAvailable: response.data.redisAvailable,
                            totalInstances: 1, // Phase 4 will aggregate
                            status: response.data.redisAvailable ? 'healthy' : 'degraded'
                        };
                    }
                } catch (error) {
                    console.error('jPulse.appCluster: Error getting cluster health:', error);
                }

                // Fallback
                return {
                    instanceId: jPulse.appCluster.getInstanceId(),
                    clusterMode: false,
                    totalInstances: 1,
                    status: 'unknown'
                };
            }
        }
    },

    // ========================================
    // jPulse.utils: Utility Functions
    // ========================================

    utils: {
        /**
         * Format uptime in human-readable format
         * @param {number} seconds - Uptime in seconds
         * @param {number} maxLevels - Maximum number of time units to show (default: 2)
         * @returns {string} Formatted uptime string (e.g., "2mo 4d", "1h 30m", "45s")
         *
         * @example
         * jPulse.utils.formatUptime(473346);     // Returns: "5d 11h"
         * jPulse.utils.formatUptime(473346, 3);  // Returns: "5d 11h 29m"
         * jPulse.utils.formatUptime(3600);       // Returns: "1h 0m"
         * jPulse.utils.formatUptime(45);         // Returns: "45s"
         */
        formatUptime: (seconds, maxLevels = 2) => {
            if(typeof seconds !== 'number') {
                seconds = Number(seconds) || 0;
            }
            const years = Math.floor(seconds / 31536000);
            const months = Math.floor((seconds % 31536000) / 2592000);
            const days = Math.floor((seconds % 2592000) / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;

            const parts = [];
            let levels = 0;

            if (years > 0 && levels < maxLevels) {
                parts.push(`${years}y`);
                levels++;
                if (months > 0 && levels < maxLevels) {
                    parts.push(`${months}mo`);
                    levels++;
                }
            } else if (months > 0 && levels < maxLevels) {
                parts.push(`${months}mo`);
                levels++;
                if (days > 0 && levels < maxLevels) {
                    parts.push(`${days}d`);
                    levels++;
                }
            } else if (days > 0 && levels < maxLevels) {
                parts.push(`${days}d`);
                levels++;
                if (hours > 0 && levels < maxLevels) {
                    parts.push(`${hours}h`);
                    levels++;
                }
            } else if (hours > 0 && levels < maxLevels) {
                parts.push(`${hours}h`);
                levels++;
                if (minutes > 0 && levels < maxLevels) {
                    parts.push(`${minutes}m`);
                    levels++;
                }
            } else if (minutes > 0 && levels < maxLevels) {
                parts.push(`${minutes}m`);
                levels++;
                if (secs > 0 && levels < maxLevels) {
                    parts.push(`${secs}s`);
                    levels++;
                }
            } else if (secs > 0 || parts.length === 0) {
                parts.push(`${secs}s`);
            }

            return parts.join(' ');
        },

        /**
         * Deep equality comparison for objects, arrays, and primitives.
         * Compares objects regardless of property order.
         *
         * @param {*} a - First value to compare
         * @param {*} b - Second value to compare
         * @returns {boolean} True if values are deeply equal
         *
         * @example
         * jPulse.utils.deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }); // true
         * jPulse.utils.deepEqual([1, 2, 3], [1, 2, 3]); // true
         * jPulse.utils.deepEqual({ a: { b: 1 } }, { a: { b: 2 } }); // false
         */
        deepEqual: (a, b) => {
            if (a === b) return true;
            if (a == null || b == null) return a === b;
            if (typeof a !== typeof b) return false;
            if (typeof a !== 'object') return a === b;
            if (Array.isArray(a) !== Array.isArray(b)) return false;

            if (Array.isArray(a)) {
                if (a.length !== b.length) return false;
                return a.every((item, i) => jPulse.utils.deepEqual(item, b[i]));
            }

            // Handle Date objects
            if (a instanceof Date && b instanceof Date) {
                return a.getTime() === b.getTime();
            }
            if (a instanceof Date || b instanceof Date) return false;

            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            if (keysA.length !== keysB.length) return false;
            return keysA.every(key => jPulse.utils.deepEqual(a[key], b[key]));
        },

        /**
         * Deep merge objects (client-side implementation)
         * Recursively merges objects, with null acting as deletion marker
         * Arrays are replaced, not merged
         *
         * @param {...object} objects - Objects to merge
         * @returns {object} Merged object
         *
         * @example
         * const base = { a: 1, b: { x: 1, y: 2 } };
         * const override = { b: { y: 3, z: 4 }, c: 5 };
         * const result = jPulse.utils.deepMerge(base, override);
         * // Returns: { a: 1, b: { x: 1, y: 3, z: 4 }, c: 5 }
         *
         * @example
         * // Deletion with null marker
         * const base = { a: 1, b: 2, c: 3 };
         * const override = { b: null };
         * const result = jPulse.utils.deepMerge(base, override);
         * // Returns: { a: 1, c: 3 }  (b was deleted)
         */
        deepMerge: (...objects) => {
            if (objects.length === 0) return {};
            if (objects.length === 1) return objects[0];

            const _deepMergeRecursive = (target, objects, seen) => {
                for (const obj of objects) {
                    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                        if (seen.has(obj)) continue;
                        seen.add(obj);

                        for (const [key, value] of Object.entries(obj)) {
                            // null acts as deletion marker
                            if (value === null) {
                                delete target[key];
                                continue;
                            }

                            if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                                // Recursively merge nested objects
                                target[key] = _deepMergeRecursive(target[key] || {}, [value], seen);
                            } else {
                                // Replace primitive values, arrays, and Date objects
                                target[key] = value;
                            }
                        }

                        seen.delete(obj);
                    }
                }
                return target;
            };

            return _deepMergeRecursive({}, objects, new WeakSet());
        }
    }
};

// Auto-initialize source code components when DOM is ready
jPulse.dom.ready(() => {
    jPulse.appCluster._isClusterMode = ('{{appCluster.available}}' === 'true');
    jPulse.UI.sourceCode.initAll();

    // Process queued toast messages stored in sessionStorage
    // Use case: show messages after page redirect (login warnings, confirmations, etc.)
    // Format: [{ toastType, message, link?, linkText?, duration? }, ...]
    // To queue: use jPulse.url.redirect(url, { toasts: [...] })
    const toastQueue = sessionStorage.getItem('jpulse_toast_queue');
    if (toastQueue) {
        try {
            const messages = JSON.parse(toastQueue);
            messages.forEach(item => {
                const message = item.message || 'Unknown message';
                const toastType = item.toastType || 'info';
                const options = {
                    link: item.link,
                    linkText: item.linkText
                };
                // Only set duration if explicitly specified (otherwise use toast defaults)
                if (item.duration) {
                    options.duration = item.duration;
                }
                jPulse.UI.toast.show(message, toastType, options);
            });
        } catch (e) {
            console.error('Error parsing toast queue:', e);
        } finally {
            sessionStorage.removeItem('jpulse_toast_queue');
        }
    }
});

// ====================================================================

// EOF webapp/view/jpulse-common.js
