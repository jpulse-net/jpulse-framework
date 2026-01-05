# jPulse Docs / Sending Email v1.4.5

Complete guide to configuring and sending emails from jPulse Framework applications using the standardized email sending strategy.

## Overview

The jPulse Framework provides enterprise-grade email sending capabilities through `EmailController`, supporting both server-side utility methods and client-side API endpoints. Email configuration is stored in MongoDB (not `app.conf`), enabling per-instance configuration and dynamic updates.

### Key Features

- **SMTP Configuration**: MongoDB-based configuration with support for all major SMTP providers
- **Server-Side Utilities**: Direct email sending from controllers and models
- **Client-Side API**: Authenticated API endpoint for user-initiated emails
- **Template Support**: Handlebars template processing for dynamic email content
- **Health Monitoring**: Email status integrated into health endpoint
- **Test Email**: Built-in test email functionality in admin UI
- **Graceful Degradation**: Application continues if email not configured

---

## Configuration

### MongoDB Config Document

Email settings are stored in the MongoDB config document (ID from `ConfigController.getDefaultDocName()`, typically `'site'`). Configure via the admin UI at `/admin/config` or via the API.

**Schema:**
```javascript
{
    data: {
        email: {
            adminEmail: 'admin@example.com',    // Default sender email
            adminName: 'Site Administrator',   // Default sender name
            smtpServer: 'smtp.gmail.com',       // SMTP server hostname
            smtpPort: 587,                      // SMTP port (587 for STARTTLS, 465 for SSL)
            smtpUser: 'your-email@gmail.com',   // SMTP username (optional)
            smtpPass: 'app-password',          // SMTP password (optional)
            useTls: true                        // Enable TLS/SSL
        }
    }
}
```

### SMTP Provider Examples

#### Gmail

**Setup:**
1. Enable 2-Factor Authentication on your Google Account
2. Visit https://myaccount.google.com/apppasswords
3. Generate app password for "Mail"
4. Use app password in `smtpPass` (not your regular password)

**Configuration:**
```javascript
{
    email: {
        smtpServer: 'smtp.gmail.com',
        smtpPort: 587,                    // STARTTLS
        smtpUser: 'your-email@gmail.com',
        smtpPass: 'your-app-password',    // App-specific password
        useTls: true,
        adminEmail: 'your-email@gmail.com',
        adminName: 'Your Name'
    }
}
```

**Alternative (Port 465 - Direct SSL):**
```javascript
{
    email: {
        smtpServer: 'smtp.gmail.com',
        smtpPort: 465,                    // Direct SSL
        smtpUser: 'your-email@gmail.com',
        smtpPass: 'your-app-password',
        useTls: true,
        adminEmail: 'your-email@gmail.com',
        adminName: 'Your Name'
    }
}
```

#### SendGrid

```javascript
{
    email: {
        smtpServer: 'smtp.sendgrid.net',
        smtpPort: 587,
        smtpUser: 'apikey',                // Literal string "apikey"
        smtpPass: 'SG.xxxxx',             // Your SendGrid API key
        useTls: true,
        adminEmail: 'noreply@yourdomain.com',
        adminName: 'Your Site'
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
        useTls: true,
        adminEmail: 'noreply@yourdomain.com',
        adminName: 'Your Site'
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
        useTls: true,
        adminEmail: 'your-email@company.com',
        adminName: 'Your Name'
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
        useTls: true,
        adminEmail: 'noreply@yourdomain.com',
        adminName: 'Your Site'
    }
}
```

#### Development / Testing (MailHog)

For local development, use MailHog to capture emails:

```javascript
{
    email: {
        smtpServer: 'localhost',
        smtpPort: 1025,                    // MailHog default port
        smtpUser: '',                      // No auth for localhost
        smtpPass: '',
        useTls: false,
        adminEmail: 'admin@test.local',
        adminName: 'Test Admin'
    }
}
```

**Install MailHog:**
```bash
# macOS
brew install mailhog

# Run MailHog
mailhog

# Access web UI: http://localhost:8025
# SMTP server: localhost:1025
```

---

## Server-Side Usage

### Basic Email Sending

Use `EmailController.sendEmail()` for simple emails:

```javascript
import EmailController from '../controller/email.js';

// Send simple email
const result = await EmailController.sendEmail({
    to: 'user@example.com',
    subject: 'Welcome to jPulse',
    text: 'Thank you for signing up!',
    html: '<h1>Welcome!</h1><p>Thank you for signing up!</p>'
});

if (result.success) {
    console.log('Email sent:', result.messageId);
} else {
    console.error('Email failed:', result.errorCode, result.error);
}
```

### Email with Custom Sender

```javascript
const result = await EmailController.sendEmail({
    to: 'user@example.com',
    from: {
        email: 'support@example.com',
        name: 'Support Team'
    },
    subject: 'Support Request Received',
    text: 'We have received your support request...',
    html: '<p>We have received your support request...</p>',
    replyTo: 'support@example.com'
});
```

### Email from Template

Use `sendEmailFromTemplate()` to load a template file, expand Handlebars, and send:

```javascript
const result = await EmailController.sendEmailFromTemplate(req, {
    to: user.email,
    templatePath: 'assets/contact-us/welcome.tmpl',
    context: {
        resetLink: 'https://example.com/reset?token=abc123',
        userName: 'John'
    },
    subject: 'Welcome'
});

if (result.success) {
    console.log('Email sent:', result.messageId);
}
```

**Template File** (`static/assets/contact-us/welcome.tmpl`):
```
Welcome {{userName}}!

Click here to reset your password: {{resetLink}}

This link expires in 1 hour.
```

### Manual Template Processing

For more control, process templates manually:

```javascript
import EmailController from '../controller/email.js';
import HandlebarController from '../controller/handlebar.js';
import PathResolver from '../utils/path-resolver.js';
import fs from 'fs/promises';

// Load template
const templatePath = PathResolver.resolveAsset('assets/contact-us/welcome.tmpl');
const template = await fs.readFile(templatePath, 'utf8');

// Expand Handlebars (context augments internal context)
const context = {
    resetLink: 'https://example.com/reset?token=abc123',
    userName: 'John'
};
const processed = await HandlebarController.expandHandlebars(req, template, context);

// Send email
await EmailController.sendEmail({
    to: user.email,
    subject: 'Welcome',
    text: processed,
    html: processed.replace(/\n/g, '<br>')
});
```

### Admin Notifications

Send notifications to the configured admin email:

```javascript
await EmailController.sendAdminNotification(
    'Contact Form Submission',
    'New message from John Doe: Hello...',
    '<p>New message from <strong>John Doe</strong>: Hello...</p>'
);
```

### Error Handling

Always handle email failures gracefully:

```javascript
const result = await EmailController.sendEmail({...});

if (!result.success) {
    if (result.errorCode === 'EMAIL_NOT_CONFIGURED') {
        // Email not set up, handle gracefully
        global.LogController.logWarning(req, 'my-controller',
            'Email not configured, notification not sent');
    } else {
        // SMTP error, log for investigation
        global.LogController.logError(req, 'my-controller',
            `Email send failed: ${result.errorCode} - ${result.error}`);
    }

    // Continue with application logic
    return res.json({
        success: true,
        message: 'Action completed (email notification pending)'
    });
}
```

### Asynchronous Sending

For non-critical emails, send asynchronously to avoid blocking:

```javascript
// Fire and forget (faster response)
EmailController.sendEmail({...}).catch(err => {
    global.LogController.logError(null, 'email',
        `Async email failed: ${err.message}`);
});

// Respond immediately
return res.json({ success: true });
```

---

## Client-Side API

### Send Email Endpoint

**POST** `/api/1/email/send`

Send email from client-side code (requires authentication).

**Authentication:** Required (logged-in users only)

**Request Body:**
```json
{
    "to": "recipient@example.com",
    "subject": "Email subject",
    "message": "Plain text message body",
    "html": "<p>Optional HTML body</p>",
    "emailConfig": {
        "smtpServer": "smtp.gmail.com",
        "smtpPort": 587,
        "smtpUser": "test@gmail.com",
        "smtpPass": "password",
        "useTls": true,
        "adminEmail": "test@gmail.com",
        "adminName": "Test"
    }
}
```

**Note:** `emailConfig` is optional and only used for testing. If provided, it overrides the saved configuration temporarily.

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
    "error": "Authentication required",
    "code": "UNAUTHORIZED"
}
```

**Error Codes:**
- `UNAUTHORIZED` - Authentication required
- `MISSING_FIELDS` - Missing required fields (to, subject, message)
- `INVALID_EMAIL` - Invalid recipient email format
- `EMAIL_NOT_CONFIGURED` - Email service not configured
- `EMAIL_SEND_FAILED` - SMTP send failure

### Client-Side Usage

```javascript
// In your view or Vue component
try {
    const result = await jPulse.api.post('/api/1/email/send', {
        to: 'colleague@company.com',
        subject: 'Check out this page',
        message: 'I found something interesting...'
    });

    if (result.success) {
        jPulse.UI.toast.success('Email sent successfully!');
    } else {
        jPulse.UI.toast.error(result.error || 'Failed to send email');
    }
} catch (error) {
    if (error.status === 401) {
        jPulse.UI.toast.warning('Please log in to send email');
    } else {
        jPulse.UI.toast.error('Error sending email');
    }
}
```

### Test Email (Admin UI)

The admin configuration page (`/admin/config`) includes a "Send Test Email" button that:
- Uses the current form values for testing
- Sends to the configured `adminEmail`
- Validates SMTP connection before sending
- Shows success/error feedback

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

const templatePath = PathResolver.resolveAsset('assets/contact-us/welcome.tmpl');
const template = await fs.readFile(templatePath, 'utf8');
```

### Template Syntax

**Handlebars only:** `{{variable}}` or `{{variable.property}}`

- Processed by `HandlebarController.expandHandlebars(req, template, context)`
- Context augments internal context (e.g., `{ resetLink: 'https://...', userName: 'John' }`)
- Internal context already includes: `app`, `user`, `config`, `url`, `i18n`
- Example template: `Welcome {{userName}}! Click here: {{resetLink}}`

### Template Example

**Template** (`assets/contact-us/password-reset.tmpl`):
```
Hi {{userName}},

You requested a password reset. Click the link below:

{{resetLink}}

This link expires in 1 hour.

If you didn't request this, please ignore this email.
```

**Usage:**
```javascript
await EmailController.sendEmailFromTemplate(req, {
    to: user.email,
    templatePath: 'assets/contact-us/password-reset.tmpl',
    context: {
        resetLink: `https://example.com/reset?token=${token}`,
        userName: user.name
    },
    subject: 'Password Reset Request'
});
```

---

## Health Monitoring

Email status is included in the health endpoint (`/api/1/health/metrics`) at the instance level:

```json
{
    "servers": [{
        "instances": [{
            "email": {
                "status": "ok",
                "configured": true,
                "message": "",
                "details": {
                    "smtpServer": "smtp.gmail.com",
                    "smtpPort": 587,
                    "adminEmail": "admin@example.com",
                    "adminName": "Site Administrator",
                    "useTls": true
                },
                "timestamp": "2025-11-11T08:39:10.943Z"
            }
        }]
    }]
}
```

**Status Values:**
- `ok` - Email configured and ready
- `not_configured` - Email not configured

**Note:** For non-admin users, `adminEmail` in details is sanitized to `"********@********"` for security.

---

## Troubleshooting

### Email Not Sending

**Check 1: Is Email Configured?**
```javascript
if (!EmailController.isConfigured()) {
    console.log('Email not configured - check MongoDB config document');
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

### Gmail Specific Issues

**"Less Secure App" Error:**
- Gmail removed "less secure apps" in 2022
- Must use 2FA + App Password
- Generate app password: https://myaccount.google.com/apppasswords

**Daily Send Limit:**
- Gmail limits: 500 emails/day for free accounts
- Use business SMTP service for high volume
- Consider SendGrid, AWS SES, Mailgun for production

### Port Configuration

**Port 587 (STARTTLS):**
- Uses `secure: false` and `requireTLS: true`
- Recommended for most providers
- Upgrades connection to TLS after initial connection

**Port 465 (Direct SSL):**
- Uses `secure: true`
- Direct SSL connection from start
- Alternative for providers that require it

---

## Security Considerations

### API Endpoint Security

- **Authentication Required:** Only logged-in users can send emails
- **Input Validation:** All inputs are validated and sanitized
- **Audit Logging:** All email sends are logged with username and IP
- **Rate Limiting:** Deferred to future enhancement (v2)

### Configuration Security

- **Protect SMTP Credentials:** Never commit passwords to Git
- **Use App Passwords:** For Gmail, use app-specific passwords
- **Environment Variables:** Consider using environment variables for sensitive values
- **Rotate Credentials:** Regularly rotate SMTP credentials

### Privacy Considerations

- **Data Retention:** Email logs should respect privacy policies
- **Don't Log Content:** Only log metadata (recipient, subject, timestamp)
- **GDPR Compliance:** Consider privacy regulations when logging

---

## Best Practices

### 1. Always Provide Plain Text

Even if sending HTML emails, always include plain text version:

```javascript
await EmailController.sendEmail({
    to: user.email,
    subject: 'Welcome',
    text: 'Welcome to jPulse! Visit: https://...',
    html: '<h1>Welcome!</h1><p>Visit: <a href="https://...">jPulse</a></p>'
});
```

### 2. Use Templates

For complex emails, use template files:

```javascript
await EmailController.sendEmailFromTemplate(req, {
    to: user.email,
    templatePath: 'assets/contact-us/welcome.tmpl',
    context: { userName: user.name, resetLink: '...' },
    subject: 'Welcome'
});
```

### 3. Handle Errors Gracefully

Always handle email failures without breaking application flow:

```javascript
const result = await EmailController.sendEmail({...});

if (!result.success) {
    // Log but don't crash
    global.LogController.logWarning(req, 'controller',
        `Email not sent: ${result.errorCode}`);
    // Continue with application logic
}
```

### 4. Monitor Email Health

Check email status in health endpoint and set up alerts for failures.

### 5. Development vs Production

**Development:**
- Use MailHog or Ethereal for testing
- Log all email content for debugging
- No rate limiting (test freely)

**Production:**
- Use reliable SMTP service (SendGrid, AWS SES)
- Enable TLS encryption
- Monitor and alert on failures
- Don't log sensitive content

---

## Related Documentation

- **[API Reference](api-reference.md)** - Complete email API documentation
- **[Handlebars Templates](handlebars.md)** - Template processing guide
- **[Security & Authentication](security-and-auth.md)** - Security best practices
- **[Health Monitoring](api-reference.md#health-check-endpoint)** - System health checks
