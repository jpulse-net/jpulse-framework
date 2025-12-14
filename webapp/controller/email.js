/**
 * @name            jPulse Framework / WebApp / Controller / Email
 * @tagline         Email Controller for jPulse Framework
 * @description     Provides email sending capability and API endpoint for jPulse Framework
 * @file            webapp/controller/email.js
 * @version         1.3.15
 * @release         2025-12-14
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import LogController from './log.js';
import CommonUtils from '../utils/common.js';
import ConfigModel from '../model/config.js';
import ConfigController from './config.js';
import HandlebarController from './handlebar.js';
import PathResolver from '../utils/path-resolver.js';
import CounterManager from '../utils/time-based-counters.js';

/**
 * Email Controller - handles email sending and API endpoints
 */
class EmailController {
    // Static transporter instance
    static transporter = null;
    static config = null;
    static initialized = false;

    // Time-based counters for metrics (W-112)
    static sentCounter = CounterManager.getCounter('email', 'sent');
    static failedCounter = CounterManager.getCounter('email', 'failed');

    /**
     * Initialize email controller (called during app bootstrap)
     * Loads config from MongoDB config document
     * @returns {Promise<boolean>} Success status
     */
    static async initialize() {
        if (this.initialized) {
            return this.isConfigured();
        }

        try {
            // Get default config document ID
            const defaultDocName = ConfigController.getDefaultDocName();
            const configDoc = await ConfigModel.getEffectiveConfig(defaultDocName);

            if (!configDoc || !configDoc.data || !configDoc.data.email) {
                LogController.logInfo(null, 'email.initialize',
                    'Email configuration not found in MongoDB config document');
                this.initialized = true;
                return false;
            }

            const emailConfig = configDoc.data.email;

            // Check if email is minimally configured
            if (!emailConfig.smtpServer || emailConfig.smtpServer === 'localhost') {
                // localhost is valid for development, but check if we have admin email
                if (!emailConfig.adminEmail) {
                    LogController.logInfo(null, 'email.initialize',
                        'Email not configured: missing adminEmail');
                    this.initialized = true;
                    return false;
                }
            }

            // Store config
            this.config = emailConfig;

            // Create transporter
            // Port 465 = SSL (secure: true)
            // Port 587 = STARTTLS (secure: false, but requiresTLS: true)
            // Other ports = plain or STARTTLS based on useTls flag
            const port = emailConfig.smtpPort || 25;
            const useTls = emailConfig.useTls === true;
            const isPort465 = port === 465;
            const isPort587 = port === 587;

            const transporterConfig = {
                host: emailConfig.smtpServer || 'localhost',
                port: port,
                secure: useTls && isPort465, // Only port 465 uses direct SSL
                auth: emailConfig.smtpUser && emailConfig.smtpPass ? {
                    user: emailConfig.smtpUser,
                    pass: emailConfig.smtpPass
                } : undefined
            };

            // Configure TLS/STARTTLS
            if (useTls) {
                if (isPort587) {
                    // Port 587: Use STARTTLS (secure: false, but require TLS upgrade)
                    transporterConfig.requireTLS = true;
                    transporterConfig.tls = {
                        rejectUnauthorized: false // Allow self-signed certificates
                    };
                } else if (!isPort465) {
                    // Other ports with TLS: Use STARTTLS
                    transporterConfig.requireTLS = true;
                    transporterConfig.tls = {
                        rejectUnauthorized: false
                    };
                } else {
                    // Port 465: Direct SSL (secure: true already set above)
                    transporterConfig.tls = {
                        rejectUnauthorized: false
                    };
                }
            }

            this.transporter = nodemailer.createTransport(transporterConfig);

            // Verify connection (async, don't wait)
            this.transporter.verify().then(() => {
                LogController.logInfo(null, 'email.initialize',
                    `Email transporter verified: ${emailConfig.smtpServer}:${emailConfig.smtpPort}`);
            }).catch((error) => {
                LogController.logWarning(null, 'email.initialize',
                    `Email transporter verification failed: ${error.message}`);
            });

            this.initialized = true;

            // Register metrics provider (W-112)
            try {
                const MetricsRegistry = (await import('../utils/metrics-registry.js')).default;
                MetricsRegistry.register('email', () => EmailController.getMetrics(), {
                    async: false,
                    category: 'controller'
                });
            } catch (error) {
                // MetricsRegistry might not be available yet
                LogController.logWarning(null, 'email.initialize', `Failed to register metrics provider: ${error.message}`);
            }

            return true;

        } catch (error) {
            LogController.logError(null, 'email.initialize',
                `error: Failed to initialize email controller: ${error.message}`);
            this.initialized = true;
            return false;
        }
    }

    /**
     * Check if email is configured
     * @returns {boolean} True if email is configured and ready
     */
    static isConfigured() {
        return !!(this.initialized && this.config && this.transporter && this.config.adminEmail);
    }

    /**
     * Get email controller metrics (W-112)
     * @returns {Object} Component metrics with standardized structure
     */
    static getMetrics() {
        const isConfigured = this.isConfigured();
        const emailStats = CounterManager.getGroupStats('email');

        return {
            component: 'EmailController',
            status: isConfigured ? 'ok' : 'error',
            initialized: this.initialized,
            stats: {
                configured: isConfigured,
                smtpServer: this.config?.smtpServer || null,
                smtpPort: this.config?.smtpPort || null,
                adminEmail: this.config?.adminEmail || null,
                adminName: this.config?.adminName || null,
                useTls: this.config?.useTls || false,
                sentLastHour: emailStats.sent?.lastHour || 0,
                sentLast24h: emailStats.sent?.last24h || 0,
                sentTotal: emailStats.sent?.total || 0,
                failedLastHour: emailStats.failed?.lastHour || 0,
                failedLast24h: emailStats.failed?.last24h || 0,
                failedTotal: emailStats.failed?.total || 0
            },
            meta: {
                ttl: 60000,  // 1 minute - config doesn't change often
                category: 'controller',
                fields: {
                    'configured': {
                        aggregate: 'first'  // Same across instances
                    },
                    'smtpServer': {
                        sanitize: true,     // Sensitive - hide from non-admins
                        aggregate: 'first'
                    },
                    'smtpPort': {
                        sanitize: true,     // Sensitive - hide from non-admins
                        aggregate: 'first'
                    },
                    'adminEmail': {
                        sanitize: true,     // Sensitive - hide from non-admins
                        visualize: false,   // Hide from UI
                        aggregate: 'first'
                    },
                    'adminName': {
                        sanitize: true,     // Sensitive - hide from non-admins
                        visualize: false,   // Hide from UI
                        aggregate: 'first'
                    },
                    'useTls': {
                        aggregate: 'first'
                    },
                    'sentLastHour': {
                        aggregate: 'sum',  // Sum across instances
                        visualize: false
                    },
                    'sentLast24h': {
                        aggregate: 'sum'
                    },
                    'sentTotal': {
                        aggregate: 'sum',
                        visualize: false
                    },
                    'failedLastHour': {
                        aggregate: 'sum',
                        visualize: false
                    },
                    'failedLast24h': {
                        aggregate: 'sum'
                    },
                    'failedTotal': {
                        aggregate: 'sum',
                        visualize: false
                    }
                }
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Map error code to i18n translation key
     * @param {string} errorCode - Error code (e.g., 'EMAIL_NOT_CONFIGURED')
     * @returns {string} i18n key path (e.g., 'controller.email.notConfigured')
     */
    static _getI18nKey(errorCode) {
        const map = {
            'EMAIL_NOT_CONFIGURED': 'controller.email.notConfigured',
            'EMAIL_SEND_FAILED': 'controller.email.sendFailed',
            'MISSING_FIELDS': 'controller.email.missingFields',
            'INVALID_RECIPIENT': 'controller.email.invalidRecipient',
            'TEMPLATE_ERROR': 'controller.email.internalError',
            'REQUEST_REQUIRED': 'controller.email.internalError'
        };
        return map[errorCode] || 'controller.email.internalError';
    }

    /**
     * Send email
     * @param {object} options - Email options
     * @param {string} options.to - Recipient email address
     * @param {object} options.from - Sender (optional, uses config default)
     * @param {string} options.from.email - From email address
     * @param {string} options.from.name - From name
     * @param {string} options.subject - Email subject
     * @param {string} options.text - Plain text body (required)
     * @param {string} options.html - HTML body (optional)
     * @param {string} options.replyTo - Reply-to address (optional)
     * @returns {Promise<object>} { success, messageId, errorCode, error }
     */
    static async sendEmail(options) {
        if (!this.isConfigured()) {
            return {
                success: false,
                messageId: null,
                errorCode: 'EMAIL_NOT_CONFIGURED',
                error: 'Email not configured'
            };
        }

        if (!options.to || !options.subject || !options.text) {
            return {
                success: false,
                messageId: null,
                errorCode: 'MISSING_FIELDS',
                error: 'Missing required fields: to, subject, or text'
            };
        }

        try {
            // Build from address
            const fromEmail = options.from?.email || this.config.adminEmail;
            const fromName = options.from?.name || this.config.adminName || 'jPulse';
            const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

            // W-045-TD-18: Sanitize HTML content to prevent XSS attacks in emails
            const sanitizedHtml = options.html
                ? CommonUtils.sanitizeHtml(options.html)
                : options.text.replace(/\n/g, '<br/>');

            // Build mail options
            const mailOptions = {
                from: from,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: sanitizedHtml,
                replyTo: options.replyTo || fromEmail
            };

            // Send email
            const info = await this.transporter.sendMail(mailOptions);

            LogController.logInfo(null, 'email.sendEmail',
                `Email sent to ${options.to}: ${info.messageId}`);

            // Increment sent counter (W-112)
            this.sentCounter.increment();

            return {
                success: true,
                messageId: info.messageId,
                errorCode: null,
                error: null
            };

        } catch (error) {
            LogController.logError(null, 'email.sendEmail',
                `error: Failed to send email to ${options.to}: ${error.message}`);

            // Increment failed counter (W-112)
            this.failedCounter.increment();

            return {
                success: false,
                messageId: null,
                errorCode: 'EMAIL_SEND_FAILED',
                error: error.message
            };
        }
    }

    /**
     * Send email from template (convenience method)
     * Loads template, expands Handlebars, and sends email
     * @param {object} req - Express request object (for HandlebarController context)
     * @param {object} options - Email options
     * @param {string} options.to - Recipient email address
     * @param {string} options.templatePath - Path to template file (relative to assets/)
     * @param {object} options.context - Context for Handlebars expansion (optional)
     * @param {string} options.subject - Email subject
     * @param {object} options.from - Sender (optional, uses config default)
     * @returns {Promise<object>} { success, messageId, errorCode, error }
     */
    static async sendEmailFromTemplate(req, options) {
        if (!req) {
            return {
                success: false,
                messageId: null,
                errorCode: 'REQUEST_REQUIRED',
                error: 'Request object required for template processing'
            };
        }

        if (!options.to || !options.templatePath || !options.subject) {
            return {
                success: false,
                messageId: null,
                errorCode: 'MISSING_FIELDS',
                error: 'Missing required fields: to, templatePath, or subject'
            };
        }

        try {
            // Load template
            const templatePath = PathResolver.resolveAsset(options.templatePath);
            const template = await fs.readFile(templatePath, 'utf8');

            // Expand Handlebars (context augments internal context)
            const context = options.context || {};
            const processed = await HandlebarController.expandHandlebars(req, template, context);

            // Send email
            return await this.sendEmail({
                to: options.to,
                subject: options.subject,
                text: processed,
                html: processed.replace(/\n/g, '<br>'),
                from: options.from
            });

        } catch (error) {
            LogController.logError(null, 'email.sendEmailFromTemplate',
                `error: Failed to send email from template: ${error.message}`);

            return {
                success: false,
                messageId: null,
                errorCode: 'TEMPLATE_ERROR',
                error: error.message
            };
        }
    }

    /**
     * Send email to admin (convenience method)
     * @param {string} subject - Email subject
     * @param {string} text - Email body (plain text)
     * @param {string} html - HTML body (optional)
     * @returns {Promise<object>} { success, messageId, errorCode, error }
     */
    static async sendAdminNotification(subject, text, html = null) {
        if (!this.isConfigured()) {
            return {
                success: false,
                messageId: null,
                errorCode: 'EMAIL_NOT_CONFIGURED',
                error: 'Email not configured'
            };
        }

        return await this.sendEmail({
            to: this.config.adminEmail,
            subject: subject,
            text: text,
            html: html || text.replace(/\n/g, '<br>')
        });
    }

    /**
     * Send email (API endpoint)
     * POST /api/1/email/send
     * Requires authentication
     *
     * Request body:
     * {
     *   to: string (required),
     *   subject: string (required),
     *   message: string (required),
     *   html: string (optional),
     *   emailConfig: object (optional) - Override saved config for testing
     * }
     *
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async apiSend(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'email.apiSend', '');

        try {
            // 1. Check authentication (should be handled by middleware, but double-check)
            if (!req.session.user) {
                const message = global.i18n.translate(req, 'controller.auth.authenticationRequired');
                LogController.logError(req, 'email.apiSend', 'error: Authentication required');
                return CommonUtils.sendError(req, res, 401, message, 'UNAUTHORIZED');
            }

            // 2. Extract and validate input
            const { to, subject, message, html, emailConfig } = req.body;

            if (!to || !subject || !message) {
                const message = global.i18n.translate(req, 'controller.email.missingFields');
                LogController.logError(req, 'email.apiSend', 'error: Missing required fields');
                return CommonUtils.sendError(req, res, 400, message, 'MISSING_FIELDS');
            }

            // 3. Validate email format
            if (!CommonUtils.isValidEmail(to)) {
                const message = global.i18n.translate(req, 'controller.email.invalidRecipient');
                LogController.logError(req, 'email.apiSend', `error: Invalid recipient email: ${to}`);
                return CommonUtils.sendError(req, res, 400, message, 'INVALID_EMAIL');
            }

            // 4. Determine which config to use (provided emailConfig for testing, or saved config)
            let transporterToUse = null;
            let configToUse = null;
            let isTestMode = false;

            if (emailConfig) {
                // Test mode: validate and create temporary transporter
                if (!emailConfig.smtpServer || !emailConfig.adminEmail) {
                    const message = global.i18n.translate(req, 'controller.email.missingFields');
                    LogController.logError(req, 'email.apiSend', 'error: Missing required email configuration fields');
                    return CommonUtils.sendError(req, res, 400, message, 'MISSING_FIELDS');
                }

                // Create test transporter with same logic as initialize()
                const port = parseInt(emailConfig.smtpPort) || 25;
                const useTls = emailConfig.useTls === true;
                const isPort465 = port === 465;
                const isPort587 = port === 587;

                const testConfig = {
                    host: emailConfig.smtpServer,
                    port: port,
                    secure: useTls && isPort465, // Only port 465 uses direct SSL
                    auth: emailConfig.smtpUser && emailConfig.smtpPass ? {
                        user: emailConfig.smtpUser,
                        pass: emailConfig.smtpPass
                    } : undefined
                };

                // Configure TLS/STARTTLS
                if (useTls) {
                    if (isPort587) {
                        // Port 587: Use STARTTLS (secure: false, but require TLS upgrade)
                        testConfig.requireTLS = true;
                        testConfig.tls = {
                            rejectUnauthorized: false
                        };
                    } else if (!isPort465) {
                        // Other ports with TLS: Use STARTTLS
                        testConfig.requireTLS = true;
                        testConfig.tls = {
                            rejectUnauthorized: false
                        };
                    } else {
                        // Port 465: Direct SSL (secure: true already set above)
                        testConfig.tls = {
                            rejectUnauthorized: false
                        };
                    }
                }

                try {
                    transporterToUse = nodemailer.createTransport(testConfig);
                    configToUse = {
                        adminEmail: emailConfig.adminEmail,
                        adminName: emailConfig.adminName || 'jPulse Framework'
                    };
                    isTestMode = true;
                } catch (error) {
                    LogController.logError(req, 'email.apiSend', `error: Failed to create test transporter: ${error.message}`);
                    const message = global.i18n.translate(req, 'controller.email.sendFailed', { error: error.message });
                    return CommonUtils.sendError(req, res, 500, message, 'EMAIL_SEND_FAILED', error.message);
                }
            } else {
                // Normal mode: use saved config
                if (!this.isConfigured() || !this.transporter) {
                    const message = global.i18n.translate(req, 'controller.email.notConfigured');
                    LogController.logError(req, 'email.apiSend', 'error: Email not configured or transporter not initialized');
                    return CommonUtils.sendError(req, res, 503, message, 'EMAIL_NOT_CONFIGURED');
                }
                // Ensure transporterToUse is set (it was set at the beginning, but double-check)
                transporterToUse = this.transporter;
                configToUse = this.config;
            }

            // 5. Send email using appropriate transporter
            // Safety check: ensure transporter is available
            if (!transporterToUse) {
                const message = global.i18n.translate(req, 'controller.email.notConfigured');
                LogController.logError(req, 'email.apiSend', 'error: Email transporter not available');
                return CommonUtils.sendError(req, res, 503, message, 'EMAIL_NOT_CONFIGURED');
            }

            try {
                const fromEmail = configToUse.adminEmail;
                const fromName = configToUse.adminName || 'jPulse';
                const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

                // W-045-TD-18: Sanitize HTML content to prevent XSS attacks in emails
                const sanitizedHtml = html
                    ? CommonUtils.sanitizeHtml(html)
                    : message.replace(/\n/g, '<br>');

                const mailOptions = {
                    from: from,
                    to: to,
                    subject: subject,
                    text: message,
                    html: sanitizedHtml,
                    replyTo: fromEmail
                };

                const info = await transporterToUse.sendMail(mailOptions);

                const duration = Date.now() - startTime;
                const logPrefix = isTestMode ? 'Test email' : 'Email';
                LogController.logInfo(req, 'email.apiSend',
                    `${logPrefix} sent to ${to} by ${req.session.user.username}: ${subject} (${info.messageId})`);

                const successMessage = isTestMode
                    ? global.i18n.translate(req, 'controller.email.testSuccess', { email: to })
                    : global.i18n.translate(req, 'controller.email.sendSuccess');

                return res.json({
                    success: true,
                    messageId: info.messageId,
                    message: successMessage,
                    elapsed: duration
                });

            } catch (error) {
                LogController.logError(req, 'email.apiSend',
                    `error: Failed to send email to ${to}: ${error.message}`);
                const message = global.i18n.translate(req, 'controller.email.sendFailed', { error: error.message });
                return CommonUtils.sendError(req, res, 500, message, 'EMAIL_SEND_FAILED', error.message);
            }

        } catch (error) {
            LogController.logError(req, 'email.apiSend', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.email.internalError', { details: error.message });
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

}

export default EmailController;

// EOF webapp/controller/email.js
