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
// Single template defines all email parts (API-style return, no throw)
const result = await HandlebarController.loadComponents(
    req,
    'assets/site-monitor/access-request.email.tmpl',
    { accessUrl, uuid, tokenValidHours }
);

if (!result.success) {
    LogController.logError(req, 'email.send', result.error);
    return;
}
const { components } = result;

await EmailController.send({
    to: emailAddress,
    subject: components.email.subject,
    text: components.email.text,
    html: components.email.html
});
```

## API Design

### Method Signature

```javascript
/**
 * Load template and return registered components as structured object.
 * Generic - works for any component-based template (not email-specific).
 * API-style return: never throws; callers check result.success.
 *
 * @param {object} req - Express request object (for context/logging)
 * @param {string} assetPath - Path to template relative to webapp/static/ (e.g., 'assets/email/welcome.tmpl')
 * @param {object} context - Variables for component expansion (default: {})
 * @returns {Promise<object>} { success, error?, components } - success false on error, components {} on error
 *
 * @example
 * const result = await HandlebarController.loadComponents(
 *     req,
 *     'assets/contact/email.tmpl',
 *     { name, email, message }
 * );
 * if (!result.success) { /* handle result.error *\/ return; }
 * const { components } = result;
 * // components.email.subject, components.email.text, components.email.html
 */
static async loadComponents(req, assetPath, context = {})
```

**Path resolution:** Asset path only, relative to `webapp/static/`. Uses `PathResolver.resolveAsset(assetPath)` (site override supported).

### Return Structure (API-Style)

Return value is always an object with `success` and `components`. On error, `error` is set and `components` is `{}`. **Never throws.**

**On success:**
```javascript
{
    success: true,
    components: {
        email: {
            subject: "Your jPulse Dashboard Access Link",
            text: "Hello,\n\nYou requested access...",
            html: "<!DOCTYPE html><html>..."
        }
    }
}
```

**On error (file not found, read error, expansion error):**
```javascript
{
    success: false,
    error: "Failed to load components from assets/...: ...",
    components: {}
}
```

**Component naming:** Per Handlebars docs, components should always use a path (dot notation), e.g. `{{#component "email.subject"}}`, `{{#component "email.text"}}`. The return object reflects that structure exactly (nested by dots). Single-token names like `{{#component "header"}}` are supported and appear as top-level `components.header`.

**Component name collisions:** Use existing registry behavior; no special validation or rules. Nested structure is built from the registry in iteration order.

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
   - Use **asset path only**: path relative to `webapp/static/`.
   - Use `PathResolver.resolveAsset(assetPath)` to resolve file (site override: site/webapp/static/... overrides webapp/static/...).
   - Read file content with `fs.readFile()`.
   - **On error** (file not found, resolve throws, read fails): log error, return `{ success: false, error: message, components: {} }`. Do not throw.

2. **Expand Template**
   - Call `expandHandlebars(req, template, context)`.
   - This registers components in `req.componentRegistry`.
   - Template output is discarded (only need components).

3. **Structure Components**
   - Iterate over a **snapshot** of `req.componentRegistry` (e.g. `Array.from(registry.entries())`).
   - For each component: **save** `req.componentRegistry`, expand the component template (merge `component.defaults` into context), **restore** `req.componentRegistry` (inner expandHandlebars resets the registry).
   - Split component names by "." (e.g. "email.subject" → ["email", "subject"]), build nested object, set leaf to expanded string.
   - **Component defaults:** When expanding each component template, merge that component's `defaults` into the context (same behavior as normal component rendering).

4. **Return Object**
   - **On success:** Return `{ success: true, components: { ... } }` with all components expanded.
   - **On any error:** Return `{ success: false, error: "...", components: {} }`, log the error. Never throw.

### Code Sketch

```javascript
// In webapp/controller/handlebar.js

static async loadComponents(req, assetPath, context = {}) {
    const fs = require('fs').promises;
    const PathResolver = global.PathResolver;
    const LogController = global.LogController;

    try {
        // Resolve path: asset path only, relative to webapp/static/
        const fullPath = PathResolver.resolveAsset(assetPath);
        const template = await fs.readFile(fullPath, 'utf8');
    } catch (error) {
        const message = `Failed to load components from ${assetPath}: ${error.message}`;
        LogController.logError(req, 'handlebar.loadComponents', message);
        return { success: false, error: message, components: {} };
    }

    try {
        // Ensure component registry exists (expandHandlebars initializes at depth 0)
        if (!req.componentRegistry) {
            req.componentRegistry = new Map();
        }

        // Expand template to register components (output discarded)
        await this.expandHandlebars(req, template, context);

        // Snapshot registry before _structureComponents (it will call expandHandlebars per component)
        const registrySnapshot = new Map(req.componentRegistry);

        // Convert flat registry to nested object; save/restore registry per component, merge defaults
        const components = await this._structureComponents(req, registrySnapshot, context);

        LogController.logInfo(req, 'handlebar.loadComponents',
            `Loaded ${registrySnapshot.size} components from ${assetPath}`);

        return { success: true, components };
    } catch (error) {
        const message = `Failed to load components from ${assetPath}: ${error.message}`;
        LogController.logError(req, 'handlebar.loadComponents', message);
        return { success: false, error: message, components: {} };
    }
}

/**
 * Convert flat component registry to nested object structure.
 * Example: "email.subject" -> { email: { subject: "..." } }
 * Saves/restores req.componentRegistry around each expand (inner expand resets registry).
 * Merges component.defaults into context when expanding.
 * @private
 */
static async _structureComponents(req, componentRegistrySnapshot, context) {
    const result = {};

    for (const [name, component] of componentRegistrySnapshot) {
        const parts = name.split('.');
        let current = result;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }

        // Merge component defaults into context
        const expandContext = { ...context, ...(component.defaults || {}) };

        // Save registry, expand component template, restore registry
        const savedRegistry = new Map(req.componentRegistry);
        try {
            current[parts[parts.length - 1]] = await this.expandHandlebars(req, component.template, expandContext);
        } finally {
            req.componentRegistry = savedRegistry;
        }
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
const result = await HandlebarController.loadComponents(
    req, 'assets/contact/email.tmpl', { name, email, message, inquiryType }
);
if (!result.success) {
    LogController.logError(req, 'contact.send', result.error);
    return;
}
const { components } = result;
await EmailController.send({
    to: adminEmail,
    subject: components.email.subject,
    text: components.email.text,
    html: components.email.html
});
```

### 2. Multi-Language Email Templates

**Best practice:** Separate file per language (not all languages in one file)

```javascript
// Get user's language from session/preferences
const lang = req.session?.user?.language || 'en';  // Default: English

// Load language-specific template (API-style, no throw)
const result = await HandlebarController.loadComponents(
    req,
    `assets/site-monitor/access-request.${lang}.email.tmpl`,
    context
);
if (!result.success) {
    LogController.logError(req, 'email.send', result.error);
    return;
}
const { components } = result;

// Use as normal - subject/text/html in user's language
await EmailController.send({
    to: emailAddress,
    subject: components.email.subject,
    text: components.email.text,
    html: components.email.html
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
const result = await HandlebarController.loadComponents(
    req, 'assets/dashboard/widgets.tmpl', userData
);
if (!result.success) return;
const sections = result.components;
// sections.dashboard.header, sections.dashboard.summary, sections.dashboard.details
```

### 4. Report Sections

```handlebars
{{#component "report.summary"}}...{{/component}}
{{#component "report.details"}}...{{/component}}
{{#component "report.footer"}}...{{/component}}
```

```javascript
const result = await HandlebarController.loadComponents(
    req, 'assets/reports/monthly.tmpl', reportData
);
if (!result.success) return;
const report = result.components;
// Generate PDF with report.report.summary, report.report.details, report.report.footer
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

4. **Error Handling (API-style, no throw)**
   - Missing template file → `{ success: false, error: "...", components: {} }`, log error
   - Invalid asset path → same, no throw
   - Malformed components / expansion error → same, no throw
   - Verify callers can check `result.success` and use `result.components` without try/catch

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
1. `docs/template-reference.md` - Add section on component loading
2. `docs/genai-instructions.md` - Add pattern for email templates
3. `docs/api-reference.md` - Add HandlebarController.loadComponents()
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
// contact.js (API-style return, no throw)
const result = await HandlebarController.loadComponents(
    req,
    'assets/contact/email.tmpl',
    context
);
if (!result.success) {
    LogController.logError(req, 'contact.send', result.error);
    return;
}
const { components } = result;

await EmailController.send({
    to: adminEmail,
    subject: components.email.subject,
    text: components.email.text,
    html: components.email.html
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
