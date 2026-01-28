# W-145: Handlebar Component Loader

**Status:** Design
**Priority:** Medium
**Project:** jpulse-framework
**Related:** T-015 (site monitor dashboard), contact form emails
**Version:** 1.0
**Date:** 2026-01-27

## Overview

Add `HandlebarController.loadComponents()` method to load and extract registered components from a template file without rendering the template itself. This enables templates to define reusable, structured content (e.g., email subject/body, multi-language strings, configuration sections) that can be programmatically accessed.

## Motivation

Current pattern for server-side email templates:
- **Problem 1:** Separate files for text/HTML versions → hard to keep in sync
- **Problem 2:** Email subject hardcoded in controller or config → disconnected from content
- **Problem 3:** No reuse of existing component system for structured data loading

**Desired pattern:**
```javascript
// Single template defines all email parts
const email = await HandlebarController.loadComponents(
    req,
    'assets/site-monitor/access-request.email.tmpl',
    { accessUrl, uuid, tokenValidHours }
);

// Access via dot notation
await EmailController.send({
    to: emailAddress,
    subject: email.subject,      // Expanded component
    text: email.text,            // Expanded component
    html: email.html             // Expanded component
});
```

## API Design

### Method Signature

```javascript
/**
 * Load template and return registered components as structured object
 * Generic - works for any component-based template (not email-specific)
 *
 * @param {object} req - Express request object (for context/logging)
 * @param {string} assetPath - Path to template relative to assets/ (e.g., 'email/welcome.tmpl')
 * @param {object} context - Variables for component expansion (default: {})
 * @returns {Promise<object>} Component registry as nested object
 *
 * @example
 * const email = await HandlebarController.loadComponents(
 *     req,
 *     'assets/contact/email.tmpl',
 *     { name, email, message }
 * );
 * // Returns: { subject: "...", text: "...", html: "..." }
 */
static async loadComponents(req, assetPath, context = {})
```

### Return Structure

Components with dot notation are converted to nested objects:

```javascript
// Component names in template:
// - email.subject
// - email.text
// - email.html

// Returns:
{
    email: {
        subject: "Your jPulse Dashboard Access Link",
        text: "Hello,\n\nYou requested access...",
        html: "<!DOCTYPE html><html>..."
    }
}

// Flat components (no dots):
// - header
// - footer

// Returns:
{
    header: "...",
    footer: "..."
}
```

## Template Format

Uses **existing component syntax** (no new syntax needed):

```handlebars
{{!-- assets/site-monitor/access-request.email.tmpl --}}

{{#component "email.subject"}}
Your jPulse Dashboard Access Link
{{/component}}

{{#component "email.text"}}
Hello,

You requested access to your jPulse Framework deployment dashboard.

Click the link below to access your dashboard (valid for {{tokenValidHours}} hours):
{{accessUrl}}

If you did not request this link, you can safely ignore this email.

Best regards,
The jPulse Team
{{baseUrl}}
{{/component}}

{{#component "email.html"}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Access</title>
</head>
<body>
    <p>Hello,</p>
    <p>You requested access to your jPulse Framework deployment dashboard.</p>
    <p><a href="{{accessUrl}}" style="...">Access Your Dashboard</a></p>
    <p><small>Link valid for {{tokenValidHours}} hours</small></p>
    <p>Best regards,<br>The jPulse Team</p>
</body>
</html>
{{/component}}
```

## Implementation Details

### Algorithm

1. **Load Template**
   - Use `PathResolver.resolveAsset()` to find template file
   - Support site override system (site/webapp/static/assets/... overrides webapp/static/assets/...)
   - Read file content with `fs.readFile()`

2. **Expand Template**
   - Call `expandHandlebars(req, template, context)`
   - This registers components in `req.componentRegistry`
   - Template output is discarded (only need components)

3. **Structure Components**
   - Iterate through `req.componentRegistry` (Map)
   - Split component names by "." (e.g., "email.subject" → ["email", "subject"])
   - Build nested object structure
   - **Important:** Expand each component template with context before returning

4. **Return Object**
   - Return structured object with all components expanded

### Code Sketch

```javascript
// In webapp/controller/handlebar.js

static async loadComponents(req, assetPath, context = {}) {
    const fs = require('fs').promises;
    const PathResolver = global.PathResolver;
    const LogController = global.LogController;

    try {
        // Load template file
        const fullPath = PathResolver.resolveAsset(assetPath);
        const template = await fs.readFile(fullPath, 'utf8');

        // Ensure component registry exists
        if (!req.componentRegistry) {
            req.componentRegistry = new Map();
        }

        // Expand template to register components (output discarded)
        await this.expandHandlebars(req, template, context);

        // Convert flat registry to nested object structure
        const components = await this._structureComponents(req, req.componentRegistry, context);

        LogController.logInfo(req, 'handlebar.loadComponents',
            `Loaded ${req.componentRegistry.size} components from ${assetPath}`);

        return components;

    } catch (error) {
        LogController.logError(req, 'handlebar.loadComponents',
            `Failed to load components from ${assetPath}: ${error.message}`);
        throw error;
    }
}

/**
 * Convert flat component registry to nested object structure
 * Example: "email.subject" -> { email: { subject: "..." } }
 * @private
 */
static async _structureComponents(req, componentRegistry, context) {
    const result = {};

    for (const [name, component] of componentRegistry) {
        // Split "email.subject" -> ["email", "subject"]
        const parts = name.split('.');

        // Navigate/create nested structure
        let current = result;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }

        // Expand component template with context
        const finalKey = parts[parts.length - 1];
        current[finalKey] = await this.expandHandlebars(req, component.template, context);
    }

    return result;
}
```

## Use Cases

### 1. Email Templates (Primary Use Case)

**Before:** 3 separate files + config
```
assets/contact/email.tmpl           (text body)
assets/contact/email-html.tmpl      (html body)
app.conf                            (subject)
```

**After:** Single file
```handlebars
{{#component "email.subject"}}Contact Form: {{inquiryType}}{{/component}}
{{#component "email.text"}}...{{/component}}
{{#component "email.html"}}...{{/component}}
```

**Controller:**
```javascript
const email = await HandlebarController.loadComponents(
    req, 'assets/contact/email.tmpl', { name, email, message, inquiryType }
);
await EmailController.send({
    to: adminEmail,
    subject: email.subject,
    text: email.text,
    html: email.html
});
```

### 2. Multi-Language Email Templates

**Best practice:** Separate file per language (not all languages in one file)

```javascript
// Get user's language from session/preferences
const lang = req.session?.user?.language || 'en';  // Default: English

// Load language-specific template
const email = await HandlebarController.loadComponents(
    req,
    `assets/site-monitor/access-request.${lang}.email.tmpl`,
    context
);

// Use as normal - subject/text/html in user's language
await EmailController.send({
    to: emailAddress,
    subject: email.subject,
    text: email.text,
    html: email.html
});
```

**File structure:**
```
assets/site-monitor/
  access-request.en.email.tmpl  (English)
  access-request.fr.email.tmpl  (French)
  access-request.de.email.tmpl  (German)
  access-request.es.email.tmpl  (Spanish)
```

**Benefits:**
- Standard i18n pattern (one file per language)
- Easier for translators (complete file per language)
- Cleaner than mixing all languages in one file
- Site override per language (e.g., site can override French only)

### 3. Multi-Part UI Content (When NOT Using Separate Files)

For dynamic content that should be in one file (not i18n):

```handlebars
{{#component "dashboard.header"}}...{{/component}}
{{#component "dashboard.summary"}}...{{/component}}
{{#component "dashboard.details"}}...{{/component}}
```

```javascript
const sections = await HandlebarController.loadComponents(
    req, 'assets/dashboard/widgets.tmpl', userData
);
// sections.header, sections.summary, sections.details
```

### 4. Report Sections

```handlebars
{{#component "report.summary"}}...{{/component}}
{{#component "report.details"}}...{{/component}}
{{#component "report.footer"}}...{{/component}}
```

```javascript
const report = await HandlebarController.loadComponents(
    req, 'assets/reports/monthly.tmpl', reportData
);
// Generate PDF with report.summary, report.details, report.footer
```

### 5. Configuration Templates

```handlebars
{{#component "config.database.production"}}...{{/component}}
{{#component "config.database.development"}}...{{/component}}
```

## Benefits

1. **Single Source of Truth**
   - All related content in one file
   - Easier to maintain consistency
   - Better version control (changes tracked together)

2. **Reuses Existing System**
   - No new syntax to learn
   - Component features available (parameters, nesting, etc.)
   - Well-documented in existing docs

3. **Generic & Flexible**
   - Not email-specific
   - Works for any structured data loading
   - Supports arbitrary nesting with dot notation

4. **Developer Experience**
   - Intuitive: load template → get structured object
   - Type-safe access via dot notation
   - Clear separation: load vs render

5. **Backward Compatible**
   - Doesn't change existing component behavior
   - Old email patterns continue to work
   - Gradual migration path

## Testing Considerations

### Unit Tests

1. **Basic Loading**
   - Load template with components
   - Verify registry structure
   - Check component content

2. **Nested Components**
   - Test "a.b.c" → `{ a: { b: { c: "..." } } }`
   - Multiple nesting levels
   - Mixed flat and nested

3. **Context Expansion**
   - Components use variables from context
   - Nested handlebars in components
   - Default parameters

4. **Error Handling**
   - Missing template file
   - Invalid asset path
   - Malformed components

5. **Site Override**
   - Framework template
   - Site override
   - Plugin override

### Integration Tests

1. **Email Sending**
   - Load email template
   - Verify subject/text/html
   - Send via EmailController

2. **Multi-Language**
   - Load i18n template
   - Select language
   - Render correct version

## Migration Path

### Phase 1: Framework Implementation
- Add `loadComponents()` to HandlebarController
- Add `_structureComponents()` helper
- Unit tests
- Documentation update

### Phase 2: Email Template Conversion (Optional)
- Convert existing email templates (contact, site-monitor, etc.)
- Update controllers to use new pattern
- Keep old pattern working (backward compatible)

### Phase 3: Documentation & Examples
- Add to template-reference.md
- Add to genai-instructions.md
- Create example in jpulse-examples/
- Update plugin API docs

## Documentation Updates

Files to update:
1. `webapp/static/assets/jpulse-docs/template-reference.md` - Add section on component loading
2. `webapp/static/assets/jpulse-docs/genai-instructions.md` - Add pattern for email templates
3. `webapp/static/assets/jpulse-docs/api-reference.md` - Add HandlebarController.loadComponents()
4. `webapp/view/jpulse-examples/handlebars.shtml` - Add live example

## Future Enhancements

1. **Caching**
   - Cache loaded components for repeated calls
   - Invalidate on file change (development mode)

2. **Validation**
   - Require certain components (e.g., email.subject, email.text)
   - Warn on missing expected components

3. **Type Definitions**
   - TypeScript definitions for return structure
   - JSDoc with @typedef for common patterns

## Example: Converting Contact Email

### Before (Current Pattern)

```javascript
// contact.js
const templatePath = PathResolver.resolveAsset('assets/contact/email.tmpl');
const template = await fs.readFile(templatePath, 'utf8');
const emailBody = await HandlebarController.expandHandlebars(req, template, context);

await EmailController.sendEmail({
    to: adminEmail,
    subject: 'New Contact Form Submission',  // Hardcoded!
    text: emailBody,
    html: undefined  // No HTML version!
});
```

### After (With loadComponents)

```javascript
// contact.js
const email = await HandlebarController.loadComponents(
    req,
    'assets/contact/email.tmpl',
    context
);

await EmailController.send({
    to: adminEmail,
    subject: email.subject,     // From template
    text: email.text,           // From template
    html: email.html            // From template
});
```

## Conclusion

This enhancement provides a clean, reusable pattern for loading structured content from templates. It leverages the existing component system, requires minimal new code, and offers immediate value for email templates while being generic enough for many other use cases.

**Recommendation:** Implement in framework as a foundation for better email template management and future structured content loading needs.

---

**Next Steps:**
1. Review and approve design
2. Implement in framework (webapp/controller/handlebar.js)
3. Add tests
4. Update documentation
5. Convert existing email templates (optional)

<!-- EOF W-145-handlebar-load-components.md -->
