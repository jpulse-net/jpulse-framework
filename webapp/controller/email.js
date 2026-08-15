/**
 * @name            jPulse Framework / WebApp / Controller / Email
 * @tagline         Email Controller for jPulse Framework
 * @description     Provides email sending capability and API endpoint for jPulse Framework
 * @file            webapp/controller/email.js
 * @version         1.7.15
 * @release         2026-08-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
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
    // W-206: config-change subscription is once-per-process; reinitialize() must not re-register
    static configChangeSubscribed = false;
    static metricsRegistered = false;

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
            // Get default config document ID (full doc needed for SMTP connection)
            const defaultDocName = ConfigController.getDefaultDocName();
            const configDoc = await ConfigModel.getEffectiveConfig(defaultDocName, true);

            if (!configDoc || !configDoc.data || !configDoc.data.email) {
                LogController.logInfo(null, 'email.initialize',
                    'Email configuration not found in MongoDB config document');
                this.initialized = true;
                this._subscribeConfigChanges();
                return false;
            }

            const emailConfig = configDoc.data.email;
            const smtpServer = (typeof emailConfig.smtpServer === 'string' ? emailConfig.smtpServer : '').trim();
            const adminEmail = (typeof emailConfig.adminEmail === 'string' ? emailConfig.adminEmail : '').trim();

            // Both are required. An empty smtpServer must NOT fall back to localhost - that made
            // "I cleared the SMTP server in Admin → Site Configuration" still look configured
            // (isConfigured() true, Forgot password? still offered) and then fail at send time
            // with ECONNREFUSED 127.0.0.1. Explicit `localhost` remains valid for a local MTA.
            if (!smtpServer || !adminEmail) {
                LogController.logInfo(null, 'email.initialize',
                    'Email not configured: missing smtpServer or adminEmail');
                this.initialized = true;
                this._subscribeConfigChanges();
                return false;
            }

            // Store config (normalized hosts/addresses so later readers see what we actually use)
            this.config = { ...emailConfig, smtpServer, adminEmail };

            // Create transporter
            // Port 465 = SSL (secure: true)
            // Port 587 = STARTTLS (secure: false, but requiresTLS: true)
            // Other ports = plain or STARTTLS based on useTls flag
            const port = emailConfig.smtpPort || 25;
            const useTls = emailConfig.useTls === true;
            const isPort465 = port === 465;
            const isPort587 = port === 587;

            const transporterConfig = {
                host: smtpServer,
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

            // Register metrics provider (W-112) - once; reinitialize() recreates the transporter
            // but must not re-register the same metrics key
            if (!this.metricsRegistered) {
                try {
                    const MetricsRegistry = (await import('../utils/metrics-registry.js')).default;
                    MetricsRegistry.register('email', () => EmailController.getMetrics(), {
                        async: false,
                        category: 'controller'
                    });
                    this.metricsRegistered = true;
                } catch (error) {
                    // MetricsRegistry might not be available yet
                    LogController.logWarning(null, 'email.initialize', `Failed to register metrics provider: ${error.message}`);
                }
            }

            this._subscribeConfigChanges();
            return true;

        } catch (error) {
            LogController.logError(null, 'email.initialize',
                `error: Failed to initialize email controller: ${error.message}`);
            this.initialized = true;
            this._subscribeConfigChanges();
            return false;
        }
    }

    /**
     * Tear down the in-memory transporter and rebuild from the current config document.
     * W-206: without this, clearing SMTP in Admin → Site Configuration left isConfigured()
     * true until a process restart - so "Forgot password?" stayed on the login page and
     * password-reset endpoints kept promising mail nobody would send. Same live contract
     * W-205's getEmailVerificationPolicy() already assumed.
     * @returns {Promise<boolean>} True if email is configured after reload
     */
    static async reinitialize() {
        this.initialized = false;
        this.config = null;
        this.transporter = null;
        const configured = await this.initialize();
        LogController.logInfo(null, 'email.reinitialize',
            configured ? 'Email transporter reloaded from config' : 'Email is not configured after reload');
        return configured;
    }

    /**
     * Subscribe once to the generic config-change broadcast so a save of the default
     * config document reloads SMTP without a restart. Same channel HandlebarController
     * and HealthController already listen on (W-088).
     * @private
     */
    static _subscribeConfigChanges() {
        if (this.configChangeSubscribed) {
            return;
        }
        try {
            global.RedisManager?.registerBroadcastCallback('controller:config:data:changed', async (channel, data) => {
                if (data && data.id === ConfigController.getDefaultDocName()) {
                    await EmailController.reinitialize();
                }
            }, { omitSelf: false });
            this.configChangeSubscribed = true;
        } catch (error) {
            LogController.logWarning(null, 'email._subscribeConfigChanges',
                `Failed to subscribe to config changes: ${error.message}`);
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
     * W-210: Test Email posts the form's email block. Once smtpPass is masked in reads,
     * the submitted value is empty or the mask — use the stored password instead.
     * A newly typed (non-empty, non-mask) value is used as-is so an unsaved password can be tested.
     * @param {string} submittedPass - smtpPass from the request body
     * @returns {Promise<string>} Password to use for the test transporter
     * @private
     */
    static async _resolveTestSmtpPass(submittedPass) {
        const mask = ConfigModel.SENSITIVE_MASK;
        if (typeof submittedPass === 'string' && submittedPass !== '' && submittedPass !== mask) {
            return submittedPass;
        }
        const inMemory = EmailController.config?.smtpPass;
        if (typeof inMemory === 'string' && inMemory !== '' && inMemory !== mask) {
            return inMemory;
        }
        try {
            const defaultDocName = ConfigController.getDefaultDocName();
            const configDoc = await ConfigModel.getEffectiveConfig(defaultDocName, true);
            const stored = configDoc?.data?.email?.smtpPass;
            if (typeof stored === 'string' && stored !== '' && stored !== mask) {
                return stored;
            }
        } catch (error) {
            LogController.logWarning(null, 'email._resolveTestSmtpPass',
                `Could not read stored smtpPass: ${error.message}`);
        }
        return '';
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
     * @param {string} options.cc - Cc address(es) (optional)
     * @param {string} options.bcc - Bcc address(es) (optional)
     * @param {string|object} options.from - Sender (optional, uses config default). Either a
     *   raw address string (e.g. `'"Support" <support@example.com>'`, passed through as-is) or
     *   `{ email, name }`
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
            // Build from address - a raw string (e.g. from an envelope's From: header) is passed
            // through as-is; an { email, name } object is built into "name" <email> as before
            let from, fromEmail;
            if (typeof options.from === 'string') {
                from = options.from;
                fromEmail = this.config.adminEmail;
            } else {
                fromEmail = options.from?.email || this.config.adminEmail;
                const fromName = options.from?.name || this.config.adminName || 'jPulse';
                from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
            }

            // W-045-TD-18: Sanitize HTML content to prevent XSS attacks in emails
            // W-205: an html part is only sent when the caller explicitly provides one - no
            // longer auto-derived from text, since a derived HTML part is low-value and it
            // prevented ever sending a genuinely text-only email
            const mailOptions = {
                from: from,
                to: options.to,
                cc: options.cc || undefined,
                bcc: options.bcc || undefined,
                subject: options.subject,
                text: options.text,
                html: options.html ? CommonUtils.sanitizeHtml(options.html) : undefined,
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

            // Send email as text-only; templates wanting an HTML part must render one
            // explicitly into options.context and reference it, sendEmail() no longer derives one
            return await this.sendEmail({
                to: options.to,
                subject: options.subject,
                text: processed,
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
     * Header names allowed in the unix-mail-style envelope parsed by _parseEmailMessage() -
     * the common headers a mail message needs, matched case-insensitively and normalized to
     * this casing. W-205 only ever sets Subject; the rest exist so a translation can define
     * default routing/sender headers for a future use case (e.g. a digest mailed Cc: to a
     * second address by default) without a parser change - every one of them is individually
     * overridable by sendEmailFromTranslation()'s own options (see its doc comment), so a
     * translation-supplied header is always a *default*, never something a caller is stuck with.
     */
    static ALLOWED_EMAIL_HEADERS = ['Subject', 'To', 'Cc', 'Bcc', 'Reply-To', 'From'];

    /**
     * Parse a unix-mail-style message: one or more "Name: value" header lines, a blank line,
     * then the body. W-205: this is the format email translation strings use (see
     * model.user.emailVerify in translations/en.conf) - a single translation key holds the
     * whole message so a site/plugin can eventually override the entire email (subject + body
     * + routing headers) in one place, once W-0 (i18n overlay) lands.
     * @param {string} message - Raw message: "Subject: ...\n\n<body>"
     * @returns {{ headers: object, body: string }} `headers` keys are the canonical names in
     *   ALLOWED_EMAIL_HEADERS that were actually present (e.g. `headers.Subject`,
     *   `headers['Reply-To']`); absent headers are simply not present as keys
     * @throws {Error} If the blank-line separator is missing, a header line is malformed, an
     *   unsupported header is present, or the required Subject header is missing
     * @private
     */
    static _parseEmailMessage(message) {
        const match = String(message).match(/^([\s\S]*?)\r?\n\r?\n([\s\S]*)$/);
        if (!match) {
            throw new Error('Email message is missing the blank line between headers and body');
        }

        const [, headerBlock, body] = match;
        const headers = {};
        for (const line of headerBlock.split(/\r?\n/)) {
            if (!line.trim()) {
                continue;
            }
            const headerMatch = line.match(/^([A-Za-z-]+):\s*(.*)$/);
            if (!headerMatch) {
                throw new Error(`Invalid email header line: "${line}"`);
            }
            const [, name, value] = headerMatch;
            const canonical = this.ALLOWED_EMAIL_HEADERS.find(
                (allowed) => allowed.toLowerCase() === name.toLowerCase()
            );
            if (!canonical) {
                throw new Error(`Unsupported email header: "${name}"`);
            }
            headers[canonical] = value.trim();
        }

        if (!headers.Subject) {
            throw new Error('Email message is missing the required Subject header');
        }

        return { headers, body };
    }

    /**
     * Substitute {{token}} context into a header value and strip any \r/\n it may contain, so
     * a token value can never inject an extra header line into the envelope (e.g. a firstName
     * containing "\n\nBcc: attacker@example.com").
     * @param {string} value - Raw (unsubstituted) header value
     * @param {object} context - Substitution context, as passed to sendEmailFromTranslation()
     * @returns {string} Substituted, single-line header value
     * @private
     */
    static _substituteHeaderValue(value, context) {
        return global.i18n.substitute(value, context).replace(/[\r\n]+/g, ' ').trim();
    }

    /**
     * Send email from a translation key (convenience method)
     * The translation resolves to a unix-mail-style message ("Subject: ...\n\n<body>", optionally
     * with To:/Cc:/Bcc:/Reply-To:/From: header lines too - see ALLOWED_EMAIL_HEADERS), which is
     * parsed and then has {{token}} substitution applied from context - separately for each
     * header (with CR/LF stripped, so a token value can't inject extra header lines) and the
     * body (substituted freely). W-205: this is the primary way framework/model code sends
     * templated emails - see model.user.js for callers (email verification, admin email-change
     * notices).
     *
     * Every envelope header the translation defines is only a *default*: the matching option
     * below, when given, always wins. `options.to` beats a `To:` header beats `options.user.email`
     * (so `options.user` alone is enough for the common case; a translation only needs a `To:`
     * header for a message with a fixed/different recipient than whoever's language it borrows).
     * @param {object} req - Express request object (currently unused, kept for parity with
     *   sendEmailFromTemplate() and to allow future per-request context)
     * @param {object} options - Options
     * @param {object} [options.user] - Recipient user document; supplies language and default
     *   `to` (options.user.email). Optional if options.to or the translation's own `To:` header
     *   resolves to a recipient.
     * @param {string} options.key - i18n key path resolving to the message (e.g.
     *   'model.user.emailVerify')
     * @param {object} [options.context] - Flat key/value substitution tokens (no dotted paths)
     * @param {string} [options.to] - Recipient email address; overrides the translation's `To:`
     *   header and options.user.email
     * @param {string} [options.cc] - Overrides the translation's `Cc:` header
     * @param {string} [options.bcc] - Overrides the translation's `Bcc:` header
     * @param {string} [options.replyTo] - Overrides the translation's `Reply-To:` header
     * @param {string|object} [options.from] - Overrides the translation's `From:` header and the
     *   config default (string or `{ email, name }`, see sendEmail())
     * @returns {Promise<object>} { success, messageId, errorCode, error }
     */
    static async sendEmailFromTranslation(req, options = {}) {
        const { user, key, context = {}, to, cc, bcc, replyTo, from } = options;

        if (!key) {
            return {
                success: false,
                messageId: null,
                errorCode: 'MISSING_FIELDS',
                error: 'Missing required field: key'
            };
        }

        try {
            // Resolve with an empty context so {{token}} placeholders stay literal - they're
            // substituted below, after parsing, so a token value can't inject a fake header
            // into the envelope
            const rawMessage = global.i18n.translateForUser(user, key, {});
            if (rawMessage === key) {
                throw new Error(`Translation not found: ${key}`);
            }

            const parsed = this._parseEmailMessage(rawMessage);
            const headers = {};
            for (const [name, value] of Object.entries(parsed.headers)) {
                headers[name] = this._substituteHeaderValue(value, context);
            }
            const text = global.i18n.substitute(parsed.body, context);

            const recipient = to || headers.To || user?.email;
            if (!recipient) {
                return {
                    success: false,
                    messageId: null,
                    errorCode: 'MISSING_FIELDS',
                    error: 'Missing required field: to (no options.to, translation To: header, or user with an email address)'
                };
            }

            return await this.sendEmail({
                to: recipient,
                cc: cc || headers.Cc,
                bcc: bcc || headers.Bcc,
                replyTo: replyTo || headers['Reply-To'],
                from: from || headers.From,
                subject: headers.Subject,
                text
            });

        } catch (error) {
            LogController.logError(null, 'email.sendEmailFromTranslation',
                `error: Failed to send email from translation key '${key}': ${error.message}`);

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
            html: html || undefined
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
                // Call on the class: Express invokes apiSend unbound, so `this` is undefined.
                const smtpPass = await EmailController._resolveTestSmtpPass(emailConfig.smtpPass);

                const testConfig = {
                    host: emailConfig.smtpServer,
                    port: port,
                    secure: useTls && isPort465, // Only port 465 uses direct SSL
                    auth: emailConfig.smtpUser && smtpPass ? {
                        user: emailConfig.smtpUser,
                        pass: smtpPass
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
                // W-205: html is only sent when the caller explicitly supplies one, matching
                // sendEmail() - this endpoint sends directly via transporterToUse (to support
                // the test-mode transporter swap above) rather than through sendEmail()
                const mailOptions = {
                    from: from,
                    to: to,
                    subject: subject,
                    text: message,
                    html: html ? CommonUtils.sanitizeHtml(html) : undefined,
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
