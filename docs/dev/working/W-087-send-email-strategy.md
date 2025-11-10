# W-087: Send Email Strategy

**Status:** Proposed  
**Date:** 2025-11-08 
**Updated:** 2025-11-09  
**Priority:** High (Core framework feature)  
**Estimated Effort:** 2-3 hours (after W-088 completion)  
**Category:** Framework Enhancement  
**Depends on:** W-088 (HandlebarsController extraction)

---

## Overview

**Purpose:** Provide standardized email sending capability for jPulse Framework applications.

**Key Requirements:**
1. SMTP configuration through MongoDB config document (not app.conf)
2. Utility class for server-side email sending (minimal API, no template processing)
3. API endpoint for client-side email sending (authenticated users only)
4. Support for multiple email scenarios (transactional, notifications, admin alerts)
5. Graceful fallback when email not configured
6. Template processing handled by callers using HandlebarsController (from W-0)

---

## Use Cases

### Server-Side Email Sending (Utility)

**Scenarios:**
- User signup confirmation emails
- Password reset emails
- System alert notifications to admins
- Contact form submissions
- Automated reports and digests

**Characteristics:**
- Triggered by server-side logic
- No user authentication required (system sends)
- Called directly from controllers/models
- Synchronous or asynchronous

**Example:**
```javascript
// In a controller or model
import EmailManager from './utils/email-manager.js';

await EmailManager.sendEmail({
    to: user.email,
    subject: 'Welcome to jPulse',
    text: 'Thank you for signing up!',
    html: '<h1>Welcome!</h1><p>Thank you for signing up!</p>'
});
```

### Client-Side Email Sending (API)

**Scenarios:**
- User-initiated emails from web interface
- "Share this page" functionality
- "Invite a colleague" features
- Custom user-to-user messages (if enabled)
- Admin tools that send emails to users

**Characteristics:**
- Initiated by authenticated user action
- Requires API endpoint
- Must validate sender is authenticated
- Rate limiting to prevent spam
- Audit logging of who sent what

**Example:**
```javascript
// In client-side code
const result = await jPulse.api.post('/api/1/email/send', {
    to: 'colleague@company.com',
    subject: 'Check out jPulse',
    message: 'I think you\'ll love this framework!'
});
```

---

## Architecture Decision

### Recommended Approach: **Minimal Utility + API**

**Components:**

1. **EmailManager Utility** (`webapp/utils/email-manager.js`)
   - Minimal API: only email sending (no template processing)
   - Used by server-side code
   - No authentication checks (caller's responsibility)
   - Direct nodemailer wrapper
   - Initialized at bootstrap from MongoDB config

2. **EmailController** (`webapp/controller/email.js`)
   - API endpoint: `POST /api/1/email/send`
   - Authentication required (via AuthController.requireAuthentication middleware)
   - Input validation
   - Uses EmailManager internally
   - Audit logging
   - **No rate limiting in v1** (deferred to future enhancement)

3. **Configuration** (MongoDB config document)
   - SMTP settings stored in MongoDB config doc (ID: 'site')
   - Admin email defaults (adminEmail, adminName)
   - Future: support config hierarchy (global, americas, emea, asia)

4. **Template Processing** (handled by callers)
   - Controllers: Use `HandlebarsController.processHandlebars()` (from W-0) + manual %TOKEN% replacement
   - Views: Manual %TOKEN% replacement only (handlebars already expanded)
   - Template files: Load using `PathResolver.resolveAsset()` from `static/assets/{app-name}/`

**Benefits:**
- ✅ Simplicity: EmailManager focused only on sending emails
- ✅ Flexibility: Callers control template processing
- ✅ Reusability: HandlebarsController usable everywhere
- ✅ Security: API endpoint enforces authentication
- ✅ Testability: separate concerns, easy to mock
- ✅ Auditability: all client-initiated emails logged

---

## Configuration

### SMTP Settings in MongoDB Config Document

**Source:** MongoDB config document (ID: 'site' for now, future: hierarchy support)

**Schema:** (Already defined in `webapp/model/config.js`)
```javascript
    static schema = {
        data: {
            email: {
                adminEmail: { type: 'string', default: '', validate: 'email' },
                adminName: { type: 'string', default: '' },
                smtpServer: { type: 'string', default: 'localhost' },
                smtpPort: { type: 'number', default: 25 },
                smtpUser: { type: 'string', default: '' },
                smtpPass: { type: 'string', default: '' },
                useTls: { type: 'boolean', default: false }
            },
            // more settings
        },
        // more settings
    };
```

**Note:** Rate limiting configuration deferred to future enhancement (not in v1)

### SMTP Provider Examples

#### Gmail
```javascript
{
    email: {
        smtpServer: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'your-email@gmail.com',
        smtpPass: 'app-specific-password',     // Generate at: https://myaccount.google.com/apppasswords
        useTls: true
    }
}
```

**Setup Gmail:**
1. Enable 2-Factor Authentication on Google Account
2. Visit https://myaccount.google.com/apppasswords
3. Generate app password for "Mail"
4. Use app password in `smtpPass` (not your regular password)

#### SendGrid
```javascript
{
    email: {
        smtpServer: 'smtp.sendgrid.net',
        smtpPort: 587,
        smtpUser: 'apikey',                    // Literal string "apikey"
        smtpPass: 'SG.xxxxx',                  // Your SendGrid API key
        useTls: true
    }
}
```

#### AWS SES
```javascript
{
    email: {
        smtpServer: 'email-smtp.us-east-1.amazonaws.com',
        smtpPort: 587,
        smtpUser: 'AKIAIOSFODNN7EXAMPLE',      // SMTP credentials from AWS
        smtpPass: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        useTls: true
    }
}
```

#### Office 365 / Outlook
```javascript
{
    email: {
        smtpServer: 'smtp.office365.com',
        smtpPort: 587,
        smtpUser: 'your-email@company.com',
        smtpPass: 'your-password',
        useTls: true
    }
}
```

#### Mailgun
```javascript
{
    email: {
        smtpServer: 'smtp.mailgun.org',
        smtpPort: 587,
        smtpUser: 'postmaster@yourdomain.mailgun.org',
        smtpPass: 'your-smtp-password',
        useTls: true
    }
}
```

#### Development / Testing (localhost)
```javascript
{
    email: {
        smtpServer: 'localhost',
        smtpPort: 1025,                        // Use MailHog or similar
        smtpUser: '',                          // No auth for localhost
        smtpPass: '',
        useTls: false
    }
}
```

**Recommended Development Tools:**
- **MailHog:** https://github.com/mailhog/MailHog (captures emails for testing)
- **Ethereal:** https://ethereal.email/ (temporary test accounts)

---

## Implementation

### 1. EmailManager Utility

**File:** `webapp/utils/email-manager.js`

**Purpose:** Minimal email sending utility - only handles sending, no template processing

**Key Methods:**
```javascript
class EmailManager {
    /**
     * Initialize email manager (called during app bootstrap)
     * Loads config from MongoDB config document (ID: 'site')
     * @returns {Promise<boolean>} Success status
     */
    static async initialize()
    
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
     * @returns {Promise<object>} { success, messageId, error }
     */
    static async sendEmail(options)
    
    /**
     * Send email to admin (convenience method)
     * @param {string} subject - Email subject
     * @param {string} text - Email body (plain text)
     * @param {string} html - HTML body (optional)
     * @returns {Promise<object>} { success, messageId, error }
     */
    static async sendAdminNotification(subject, text, html = null)
    
    /**
     * Check if email is configured
     * @returns {boolean} True if email is configured and ready
     */
    static isConfigured()
}
```

**Note:** No template processing methods - templates handled by callers using HandlebarsController

**Usage Example (Simple Email):**
```javascript
import EmailManager from '../utils/email-manager.js';

// Send simple email
const result = await EmailManager.sendEmail({
    to: 'user@example.com',
    subject: 'Password Reset',
    text: 'Click here to reset your password: https://...',
    html: '<p>Click <a href="https://...">here</a> to reset your password.</p>'
});

if (result.success) {
    console.log('Email sent:', result.messageId);
} else {
    console.error('Email failed:', result.error);
}

// Send notification to admin
await EmailManager.sendAdminNotification(
    'Contact Form Submission',
    'New message from John Doe...'
);
```

**Usage Example (With Template - Controller):**
```javascript
import EmailManager from '../utils/email-manager.js';
import HandlebarsController from '../controller/handlebars.js';
import PathResolver from '../utils/path-resolver.js';
import fs from 'fs/promises';

// Load template from static/assets/contact-us/welcome.tmpl
const templatePath = PathResolver.resolveAsset('assets/contact-us/welcome.tmpl');
const template = await fs.readFile(templatePath, 'utf8');

// Expand handlebars (context augments internal context)
const context = { user: { name: 'John' } };
let processed = HandlebarsController.processHandlebars(template, context, req);

// Expand %TOKENS%
processed = processed.replace(/%([A-Z0-9_]+)%/g, (match, token) => {
    const tokens = {
        RESET_LINK: 'https://example.com/reset?token=abc123',
        USER_NAME: context.user.name
    };
    return tokens[token] !== undefined ? String(tokens[token]) : match;
});

// Send email
await EmailManager.sendEmail({
    to: user.email,
    subject: 'Welcome',
    text: processed,
    html: processed.replace(/\n/g, '<br>')
});
```

**Error Handling:**
```javascript
const result = await EmailManager.sendEmail({...});

if (!result.success) {
    if (result.error === 'Email not configured') {
        // Email not set up, handle gracefully
        global.LogController.logWarning(req, 'my-controller', 
            'Email not configured, notification not sent');
    } else {
        // SMTP error, log for investigation
        global.LogController.logError(req, 'my-controller', 
            `Email send failed: ${result.error}`);
    }
}
```

### 2. EmailController API

**File:** `webapp/controller/email.js`

**Purpose:** Secure API endpoint for client-side email sending

**Endpoint:** `POST /api/1/email/send`

**Authentication:** Required (checked via middleware)

**Request Body:**
```json
{
    "to": "recipient@example.com",
    "subject": "Email subject",
    "message": "Plain text message body",
    "html": "<p>Optional HTML body</p>"
}
```

**Response (Success):**
```json
{
    "success": true,
    "messageId": "message-id-from-smtp-server"
}
```

**Response (Error):**
```json
{
    "success": false,
    "error": "Rate limit exceeded"
}
```

**Key Features:**
1. **Authentication Check:** Only logged-in users can send (via AuthController.requireAuthentication middleware)
2. **Input Validation:** Sanitize and validate all inputs
3. **Audit Logging:** Log all email sends with username and IP
4. **Email Validation:** Verify recipient email format
5. **Rate Limiting:** Deferred to future enhancement (not in v1)
6. **Content Filtering:** Deferred to future enhancement (not in v1)

**Implementation Example:**
```javascript
class EmailController {
    /**
     * Send email (API endpoint)
     * POST /api/1/email/send
     * Requires authentication
     */
    static async apiSend(req, res) {
        // 1. Check authentication
        if (!req.session.user) {
            return CommonUtils.sendError(req, res, 401, 
                'Authentication required', 'UNAUTHORIZED');
        }
        
        // 2. Extract and validate input
        const { to, subject, message, html } = req.body;
        
        if (!to || !subject || !message) {
            return CommonUtils.sendError(req, res, 400, 
                'Missing required fields', 'MISSING_FIELDS');
        }
        
        if (!CommonUtils.isValidEmail(to)) {
            return CommonUtils.sendError(req, res, 400, 
                'Invalid recipient email', 'INVALID_EMAIL');
        }
        
        // 3. Send email (rate limiting deferred to future enhancement)
        const result = await EmailManager.sendEmail({
            to: to,
            from: `"${req.session.user.username}" <${global.appConfig.email.fromEmail}>`,
            subject: subject,
            text: message,
            html: html || message.replace(/\n/g, '<br>')
        });
        
        // 4. Log audit trail
        global.LogController.logInfo(req, 'email', 
            `Email sent to ${to} by ${req.session.user.username}: ${subject}`);
        
        // 5. Return response
        if (result.success) {
            return res.json({ 
                success: true, 
                messageId: result.messageId 
            });
        } else {
            return CommonUtils.sendError(req, res, 500, 
                'Failed to send email', 'EMAIL_SEND_FAILED', 
                result.error);
        }
    }
    
}
```

**Client-Side Usage:**
```javascript
// In view/page JavaScript
try {
    const result = await jPulse.api.post('/api/1/email/send', {
        to: 'colleague@company.com',
        subject: 'Check out this page',
        message: 'I found something interesting...'
    });
    
    if (result.success) {
        jPulse.UI.toast.success('Email sent successfully!');
    } else {
        jPulse.UI.toast.error('Failed to send email');
    }
} catch (error) {
    if (error.status === 401) {
        jPulse.UI.toast.warning('Please log in to send email');
    } else if (error.status === 429) {
        jPulse.UI.toast.warning('Too many emails sent. Please try later.');
    } else {
        jPulse.UI.toast.error('Error sending email');
    }
}
```

### 3. Routes Configuration

**File:** `webapp/routes.js`

**Add Email API Route:**
```javascript
import EmailController from './controller/email.js';
import AuthController from './controller/auth.js';

// Email API (authenticated users only)
router.post('/api/1/email/send', AuthController.requireAuthentication, async (req, res) => {
    await EmailController.apiSend(req, res);
});
```

### 4. Bootstrap Integration

**File:** `webapp/utils/bootstrap.js`

**Initialize EmailManager:**
```javascript
import EmailManager from './email-manager.js';
import ConfigModel from '../model/config.js';

async function bootstrap(options = {}) {
    // ... existing bootstrap code (after database initialization) ...
    
    // Initialize email manager (loads config from MongoDB)
    const emailReady = await EmailManager.initialize();
    if (emailReady) {
        bootstrapLog('Email manager initialized', 'info');
    } else {
        bootstrapLog('Email manager failed to initialize or not configured', 'warning');
    }
    
    // ... rest of bootstrap ...
}
```

**Note:** EmailManager.initialize() loads config from MongoDB config document (ID: 'site') using ConfigModel.getEffectiveConfig()

---

## Template Processing

### Template Files

**Location:** `static/assets/{app-name}/template.tmpl`
- Site override: `site/webapp/static/assets/{app-name}/template.tmpl`
- Framework default: `webapp/static/assets/{app-name}/template.tmpl`
- File extension: `.tmpl` (by convention)

**Loading Templates:**
```javascript
import PathResolver from '../utils/path-resolver.js';
import fs from 'fs/promises';

// Load template using PathResolver
const templatePath = PathResolver.resolveAsset('assets/contact-us/welcome.tmpl');
const template = await fs.readFile(templatePath, 'utf8');
```

### Template Syntax

**Two token formats supported:**

1. **Handlebars:** `${variable}` or `{{variable}}` (for controllers only, requires W-0)
   - Processed by `HandlebarsController.processHandlebars()`
   - Context augments internal context (e.g., `{ user: { name: 'John' } }`)
   - Note: `app.name` not needed - internal context already includes app info

2. **Custom Tokens:** `%TOKEN%` (for both controllers and views)
   - Replaced manually in code using simple string replacement
   - Example: `%RESET_LINK%`, `%USER_NAME%`

### Processing in Controllers

```javascript
import EmailManager from '../utils/email-manager.js';
import HandlebarsController from '../controller/handlebars.js';
import PathResolver from '../utils/path-resolver.js';
import fs from 'fs/promises';

// Load template
const templatePath = PathResolver.resolveAsset('assets/contact-us/welcome.tmpl');
const template = await fs.readFile(templatePath, 'utf8');

// Step 1: Expand handlebars (context augments internal context)
const context = { user: { name: 'John' } };
let processed = HandlebarsController.processHandlebars(template, context, req);

// Step 2: Expand %TOKENS%
processed = processed.replace(/%([A-Z0-9_]+)%/g, (match, token) => {
    const tokens = {
        RESET_LINK: 'https://example.com/reset?token=abc123',
        USER_NAME: context.user.name
    };
    return tokens[token] !== undefined ? String(tokens[token]) : match;
});

// Step 3: Send email
await EmailManager.sendEmail({
    to: user.email,
    subject: 'Welcome',
    text: processed,
    html: processed.replace(/\n/g, '<br>')
});
```

### Processing in Views

**Option 1: Include template in view (recommended)**
```handlebars
{{file.include "assets/contact-us/welcome.tmpl"}}
```
- Handlebars already expanded by ViewController
- Only need to replace %TOKENS% in JavaScript

**Option 2: Load template in JavaScript**
```javascript
// Template already loaded via {{file.include}}, just replace %TOKENS%
const template = document.getElementById('email-template').textContent;
const processed = template.replace(/%([A-Z0-9_]+)%/g, (match, token) => {
    const tokens = { RESET_LINK: resetLink };
    return tokens[token] !== undefined ? String(tokens[token]) : match;
});
```

---

## Security Considerations

### 1. API Endpoint Security

**Authentication Required:**
```javascript
// Always check user is logged in
if (!req.session.user) {
    return CommonUtils.sendError(req, res, 401, 
        'Authentication required', 'UNAUTHORIZED');
}
```

**Rate Limiting:**
```javascript
// Deferred to future enhancement (not in v1)
// Future implementation: track sends per user in Redis or database
// Block if limits exceeded
```

**Input Validation:**
```javascript
// Validate recipient email
if (!CommonUtils.isValidEmail(to)) {
    return CommonUtils.sendError(req, res, 400, 
        'Invalid email address', 'INVALID_EMAIL');
}

// Sanitize subject and message
const sanitizedSubject = CommonUtils.sanitizeString(subject);
const sanitizedMessage = CommonUtils.sanitizeString(message);
```

**Content Filtering:**
```javascript
// Optional: detect spam keywords
const spamKeywords = ['viagra', 'casino', 'lottery'];
const hasSpam = spamKeywords.some(kw => 
    message.toLowerCase().includes(kw)
);

if (hasSpam) {
    return CommonUtils.sendError(req, res, 400, 
        'Message contains prohibited content', 'SPAM_DETECTED');
}
```

### 2. Configuration Security

**Protect SMTP Credentials:**
- Never commit passwords to Git
- Use environment variables for sensitive values
- Use app passwords, not account passwords
- Rotate credentials regularly

**Example with Environment Variables:**
```javascript
// app.conf
{
    email: {
        smtpUser: process.env.SMTP_USER || 'default@example.com',
        smtpPass: process.env.SMTP_PASS || '',
    }
}
```

### 3. Logging and Audit

**Log All Email Activity:**
```javascript
// Success
global.LogController.logInfo(req, 'email', 
    `Email sent to ${to} by ${username}: ${subject}`);

// Failure
global.LogController.logError(req, 'email', 
    `Email send failed to ${to}: ${error.message}`);

// Rate limit hit
global.LogController.logWarning(req, 'email', 
    `Rate limit exceeded for user ${username}`);
```

**What to Log:**
- ✅ Sender username
- ✅ Recipient email
- ✅ Subject line
- ✅ Timestamp
- ✅ Success/failure status
- ✅ IP address (for spam tracking)
- ❌ Message content (privacy)
- ❌ SMTP passwords (security)

### 4. Privacy Considerations

**Data Retention:**
- Email logs should respect privacy policies
- Don't log message content (only metadata)
- Consider GDPR/privacy regulations
- Allow users to see their sent email history

**Recipient Privacy:**
- Validate recipient wants to receive email
- Provide unsubscribe mechanism for bulk emails
- Don't expose recipient lists
- Honor do-not-email lists

---

## Testing

### Unit Tests

**Test EmailManager:**
```javascript
// tests/unit/utils/email-manager.test.js

describe('EmailManager', () => {
    it('should initialize with valid config', async () => {
        const result = await EmailManager.initialize({
            smtpServer: 'localhost',
            smtpPort: 1025,
            adminEmail: 'admin@test.com'
        });
        expect(result).toBe(true);
    });
    
    it('should send email successfully', async () => {
        const result = await EmailManager.sendEmail({
            to: 'test@example.com',
            subject: 'Test',
            text: 'Test message'
        });
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
    });
    
    it('should handle send failure gracefully', async () => {
        // Mock SMTP error
        const result = await EmailManager.sendEmail({
            to: 'invalid',
            subject: 'Test',
            text: 'Test'
        });
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});
```

**Test EmailController:**
```javascript
// tests/unit/controller/email.test.js

describe('EmailController', () => {
    it('should reject unauthenticated requests', async () => {
        const req = { session: {}, body: {} };
        const res = mockResponse();
        
        await EmailController.apiSend(req, res);
        
        expect(res.status).toHaveBeenCalledWith(401);
    });
    
    it('should validate email format', async () => {
        const req = {
            session: { user: { username: 'test' } },
            body: { to: 'invalid-email', subject: 'Test', message: 'Test' }
        };
        const res = mockResponse();
        
        await EmailController.apiSend(req, res);
        
        expect(res.status).toHaveBeenCalledWith(400);
    });
    
    it('should enforce rate limiting', async () => {
        // Send emails until rate limit hit
        // Expect 429 status code
    });
});
```

### Integration Tests

**Test Full Email Flow:**
```javascript
// tests/integration/email-api.test.js

describe('Email API', () => {
    it('should send email via API when authenticated', async () => {
        // Login first
        const session = await loginTestUser();
        
        // Send email
        const response = await request(app)
            .post('/api/1/email/send')
            .set('Cookie', session.cookie)
            .send({
                to: 'recipient@example.com',
                subject: 'Test Email',
                message: 'This is a test'
            });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});
```

### Manual Testing

**Use MailHog for Development:**
```bash
# Install MailHog
brew install mailhog  # macOS
# or download from: https://github.com/mailhog/MailHog

# Run MailHog
mailhog

# Access web UI: http://localhost:8025
# SMTP server: localhost:1025
```

**Configure app.conf for MailHog:**
```javascript
{
    email: {
        smtpServer: 'localhost',
        smtpPort: 1025,
        adminEmail: 'admin@test.local',
        useTls: false
    }
}
```

---

## Migration Path

### For Existing Applications

**Step 1: Add EmailManager**
- Create `webapp/utils/email-manager.js`
- Add to bootstrap

**Step 2: Configure SMTP**
- Add email config to `app.conf`
- Test with development SMTP server

**Step 3: Create EmailController (Optional)**
- Only if API endpoint needed
- Add route to `routes.js`
- Implement rate limiting

**Step 4: Update Existing Code**
- Replace inline nodemailer usage with EmailManager
- Update any custom email sending code
- Test thoroughly

**Step 5: Deploy**
- Configure production SMTP credentials
- Monitor logs for email send success/failures
- Set up alerts for email failures

### Backward Compatibility

**Graceful Degradation:**
- EmailManager returns `{ success: false }` if not configured
- Calling code should handle email unavailability
- Log warnings but don't crash application

**Example:**
```javascript
const result = await EmailManager.sendEmail({...});

if (!result.success) {
    // Email not sent, handle gracefully
    if (result.error === 'Email not configured') {
        // Expected in development, just log
        global.LogController.logInfo(req, 'controller', 
            'Email not configured, skipping notification');
    } else {
        // Unexpected error, investigate
        global.LogController.logError(req, 'controller', 
            `Email error: ${result.error}`);
    }
    
    // Continue with application logic
    return res.json({ 
        success: true, 
        message: 'Action completed (email notification pending)' 
    });
}
```

---

## Best Practices

### 1. Always Provide Plain Text

Even if sending HTML emails, always include plain text version:
```javascript
await EmailManager.sendEmail({
    to: user.email,
    subject: 'Welcome',
    text: 'Welcome to jPulse! Visit: https://...',
    html: '<h1>Welcome!</h1><p>Visit: <a href="https://...">jPulse</a></p>'
});
```

### 2. Use Templates

For complex emails, use template functions:
```javascript
function passwordResetEmail(user, resetLink) {
    return {
        subject: 'Password Reset Request',
        text: `Click here to reset your password: ${resetLink}`,
        html: `
            <h2>Password Reset</h2>
            <p>Hi ${user.name},</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetLink}">Reset Password</a></p>
            <p>This link expires in 1 hour.</p>
        `
    };
}

// Usage
const template = passwordResetEmail(user, resetLink);
await EmailManager.sendEmail({
    to: user.email,
    ...template
});
```

### 3. Handle Async Properly

Email sending can be slow, consider async patterns:
```javascript
// Option 1: Await (blocks request)
await EmailManager.sendEmail({...});
return res.json({ success: true });

// Option 2: Fire and forget (faster response)
EmailManager.sendEmail({...}).catch(err => {
    global.LogController.logError(null, 'email', 
        `Async email failed: ${err.message}`);
});
return res.json({ success: true });

// Option 3: Queue (production)
await EmailQueue.enqueue({...});  // Use message queue
return res.json({ success: true });
```

### 4. Monitor Email Health

**Set up monitoring for:**
- Email send success rate
- SMTP connection failures
- Rate limit hits per user
- Bounce rates (if tracking)
- Queue depth (if using queue)

**Alert on:**
- No emails sent in last hour (service down?)
- High failure rate (SMTP issues?)
- Excessive rate limit hits (spam attack?)

### 5. Development vs Production

**Development:**
- Use MailHog or Ethereal for testing
- Log all email content for debugging
- No rate limiting (test freely)

**Production:**
- Use reliable SMTP service (SendGrid, AWS SES)
- Enable TLS encryption
- Strict rate limiting
- Monitor and alert
- Don't log sensitive content

---

## Troubleshooting

### Email Not Sending

**Check 1: Is Email Configured?**
```javascript
if (!EmailManager.isConfigured()) {
    console.log('Email not configured - check app.conf');
}
```

**Check 2: SMTP Credentials**
- Verify username and password
- For Gmail: use app password, not account password
- Check SMTP server hostname and port

**Check 3: Firewall / Network**
- Ensure port 587 (or 465) is not blocked
- Check network allows outbound SMTP
- Try from command line: `telnet smtp.gmail.com 587`

**Check 4: Logs**
```bash
# Check application logs
tail -f logs/app.log | grep email

# Look for errors like:
# - "Email send failed: Invalid credentials"
# - "Email send failed: Connection timeout"
# - "Email not configured"
```

### Rate Limiting Issues

**User Hitting Limits:**
- Check user's recent send history
- Increase limits in config if legitimate use
- Investigate if spam/abuse

**False Positives:**
- Ensure rate limit logic uses correct time windows
- Clear rate limit cache for user if needed
- Consider per-role limits (admins get higher limits)

### Gmail Specific Issues

**"Less Secure App" Error:**
- Gmail removed "less secure apps" in 2022
- Must use 2FA + App Password
- Generate app password: https://myaccount.google.com/apppasswords

**Daily Send Limit:**
- Gmail limits: 500 emails/day for free accounts
- Use business SMTP service for high volume
- Consider SendGrid, AWS SES, Mailgun for production

---

## Performance Considerations

### Asynchronous Sending

For high-volume applications:
```javascript
// Don't await email send if not critical
EmailManager.sendEmail({...}).catch(err => {
    // Log error but don't block response
    global.LogController.logError(null, 'email', err.message);
});

// Respond immediately
return res.json({ success: true });
```

### Email Queues

For very high volume (thousands of emails):
```javascript
// Use message queue (Redis, RabbitMQ, etc.)
import EmailQueue from './utils/email-queue.js';

// Enqueue email instead of sending immediately
await EmailQueue.enqueue({
    to: user.email,
    subject: 'Welcome',
    text: 'Welcome to jPulse!'
});

// Worker process sends queued emails
```

### Connection Pooling

For frequent sends, consider connection pooling:
```javascript
// EmailManager already maintains single transporter
// Nodemailer pools connections automatically
// No additional configuration needed
```

---

## Success Criteria

**W-087 Complete When:**
- [ ] W-0 (HandlebarsController) completed first
- [ ] EmailManager utility implemented (minimal API)
- [ ] EmailController API endpoint implemented
- [ ] Bootstrap integration completed
- [ ] Configuration loaded from MongoDB
- [ ] Documentation created (`docs/sending-email.md`)
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Example usage provided
- [ ] Security reviewed
- [ ] Deployed to staging
- [ ] Production SMTP configured

**Deferred to Future:**
- [ ] Rate limiting (v2)
- [ ] Content filtering (v2)

---

## Time Estimate

**Prerequisite:** W-0 (HandlebarsController extraction) - 2-3 hours

| Task | Estimated Time |
|------|---------------|
| EmailManager utility implementation | 45 min |
| EmailController API implementation | 30 min |
| Bootstrap integration | 15 min |
| Unit tests | 30 min |
| Integration tests | 20 min |
| Documentation (`docs/sending-email.md`) | 45 min |
| **Total (W-087 only)** | **2 hours 5 min** |

**Total with W-0:** ~4-5 hours

---

## Dependencies

**Required:**
- **W-0: HandlebarsController extraction** (must be completed first)
- `nodemailer` ^6.9.8 (npm package)
- SMTP server credentials
- MongoDB config system (existing)
- Authentication middleware (existing)
- CommonUtils (existing)
- PathResolver (existing)

**Optional:**
- Redis (for future rate limiting)
- Message queue (for high-volume scenarios)

---

## Related Work Items

**Enables:**
- T-003: Contact form database and email (jpulse.net site)
- User password reset emails
- User signup confirmation emails
- Admin alert notifications
- System health alerts

**Future Enhancements:**
- W-000: Email templates system
- W-000: Email queue for high volume
- W-000: Email bounce tracking
- W-000: Unsubscribe management

---

**Document Version:** 2.0.0  
**Last Updated:** 2025-01-XX  
**Author:** AI Assistant (Cursor, Claude Sonnet 4.5)  
**Status:** Ready for implementation (after W-0 completion)

**Changes in v2.0.0:**
- Simplified EmailManager (no template processing)
- Template processing handled by callers using HandlebarsController
- Configuration moved to MongoDB only (not app.conf)
- Rate limiting deferred to future enhancement
- Added template processing section with examples
- Updated to depend on W-0 (HandlebarsController extraction)  

---

## Quick Start

### 1. Install Dependency
```bash
npm install nodemailer
```

### 2. Configure SMTP (MongoDB Config Document)

Configure via admin UI or API:
```javascript
// MongoDB config document (ID: 'site')
{
    data: {
        email: {
            adminEmail: 'admin@example.com',
            adminName: 'Admin',
            smtpServer: 'smtp.gmail.com',
            smtpPort: 587,
            smtpUser: 'your-email@gmail.com',
            smtpPass: 'your-app-password',
            useTls: true
        }
    }
}
```

### 3. Use EmailManager
```javascript
import EmailManager from './utils/email-manager.js';

// Send email
const result = await EmailManager.sendEmail({
    to: 'user@example.com',
    subject: 'Hello',
    text: 'This is a test email'
});

console.log(result.success ? 'Sent!' : 'Failed!');
```

### 4. Enable API (Optional)
```javascript
// routes.js
app.post('/api/1/email/send', requireAuth, EmailController.apiSend);
```

```javascript
// Client-side
await jPulse.api.post('/api/1/email/send', {
    to: 'recipient@example.com',
    subject: 'Hello',
    message: 'This is a test'
});
```
