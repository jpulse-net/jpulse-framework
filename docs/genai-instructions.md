# jPulse Framework / Docs / Generative-AI Instructions for AI Assistants v1.0.0-rc.2

Instructions for AI assistants working with jPulse Framework site development. This document contains critical framework conventions, patterns, and guidance for generating correct code suggestions.

**Note**: This document is optimized for AI consumption. Site developers should see [Gen-AI Development Guide](genai-development.md).

## 🎯 Core Directives

### Critical Framework Patterns

#### Always Follow These Rules

1. **Site Override System**: All site code goes in `site/webapp/`, never modify `webapp/`
   - Details: [Site Customization Guide](site-customization.md)
   - Framework files in `webapp/` are managed by jpulse-update and should never be modified

2. **API-First Development**: All data operations use `/api/1/*` REST endpoints
   - Client-side JavaScript calls APIs for data
   - Server-side only renders initial page structure
   - See [API Reference](api-reference.md) for complete endpoint documentation

3. **Client-Side Heavy**: 80% of view logic in JavaScript, minimal server-side rendering
   - Load data client-side via jPulse.api methods
   - Use server-side only for authentication state and initial configuration
   - See [Front-End Development Guide](front-end-development.md)

4. **Auto-Discovery**: Controllers auto-register via `static async api*()` methods
   - Never manually register routes in routes.js
   - Method naming convention determines HTTP method and endpoint
   - Framework logs all auto-discovered endpoints on startup

5. **CSS Conventions** (CRITICAL):
   - `local-*` prefix for styles in `<style>` tags within view files (`.shtml` and `.tmpl`)
   - `site-*` prefix for shared site styles in `site/webapp/view/site-common.css`
   - **NEVER** use `jp-*` prefix (reserved for framework only in `webapp/view/jpulse-common.css`)
   - **NEVER** add custom styles to `webapp/view/jpulse-common.css` (framework-managed)
   - Use existing `jp-*` classes from framework, see [Style Reference](style-reference.md)

6. **JavaScript Conventions**:
   - Use framework utilities from `webapp/view/jpulse-common.js` (read-only, use jPulse.* methods)
   - Create site utilities in `site/webapp/view/site-common.js` if needed
   - Never modify `webapp/view/jpulse-common.js` (framework-managed)

7. **ISO Dates**: Always use YYYY-MM-DD format via `jPulse.date.formatLocalDate()`
   - Never use browser's toLocaleDateString() or localized formats
   - For date+time: `jPulse.date.formatLocalDateAndTime()`

8. **Application Logging**:
   - Every user-facing action in controllers requires logging
   - Log API requests to log file:
     - Initial request with `LogController.logRequest(req, 'myController.apiCreate', 'description')`
     - Log success with `LogController.logInfo(req, 'myController.apiCreate', 'success: description')`
     - Log error with `LogController.logError(req, 'myController.apiCreate', 'error: ' + error.message')`
     - Log format: `[controller].[method]` for all log messages
   - Log database CRUD actions: `create`, `update`, `delete`
     - Update example: `await LogController.logChange(req, 'myController', 'update', id, oldObj, newObj);`
   - See reference implementations for patterns

9. **Code Quality**:
   - No tabs - always 4 spaces for indentation
   - No spaces on blank lines (violations caught by /^ +$/ search)
   - Proper error handling in all API endpoints

10. ***Chain of Thought**:
    - Use chain of thought process (thinking mode lite)
    - Create 10 paragraphs before replying

11. **No Guessing or Hallucination**:
    - Ask for details if you don't have enough information
    - Do not make stuff up
    - Instead respond with:
    - "I don't know"
    - "I am not sure, but I can look it up if you'd like"
    - "I forgot, but you can remind me, or provide more details"

12. **Cursor History Log**:
    - Maintain a `cursor_log.txt` file in the project root for the user's and your own reference
    - Log format:
        - Start with timestamp in YYYY-MM-DD HH:MM format
        - Add the user prompt
        - Write a summary of your output, append to it on follup-up requests on the same topic
        - After completing the requested changes, write if the changes were accepted or rejected
    - Separate log entries with 60 "=" equal signs


#### Never Do These Things

1. ❌ Never modify files in `webapp/` directory (framework-managed)
2. ❌ Never use spaces on blank lines (technical debt trigger)
3. ❌ Never use tabs - always 4 spaces for indentation
4. ❌ Never manually register routes in routes.js
5. ❌ Never use browser date formatting (toLocaleDateString)
6. ❌ Never skip logging for user-facing operations
7. ❌ Never create `jp-*` CSS classes (framework-only prefix)
8. ❌ Never add custom styles to `webapp/view/jpulse-common.css`
9. ❌ Never modify `webapp/view/jpulse-common.js`

## 🗂️ Framework vs Site Files

### Common CSS Files

```
webapp/view/jpulse-common.css          ← Framework styles (jp-* prefix) - READ ONLY, NEVER MODIFY
site/webapp/view/site-common.css       ← Site-wide custom styles (site-* prefix) - USE THIS
[view-file].shtml                      ← Page-specific styles (local-* prefix in <style> tag)
```

**Framework CSS** (`webapp/view/jpulse-common.css`):
- Contains all `jp-*` classes (jp-btn, jp-card, jp-container, etc.)
- Complete component library for framework use
- Reference: [Style Reference](style-reference.md)
- **USE these classes**, never create new `jp-*` classes

**Site CSS** (`site/webapp/view/site-common.css`):
- Create from `site/webapp/view/site-common.css.tmpl` if missing
- Use for site-wide custom styles shared across multiple pages
- Use `site-*` prefix (e.g., .site-header, .site-feature-card)
- Loaded after framework CSS

**Page CSS** (in view file's `<style>` tag):
- Use for page-specific styles used only on one page
- Use `local-*` prefix (e.g., .local-welcome-banner, .local-stats-grid)
- Keeps page-specific styles contained

### Common JavaScript Files

```
webapp/view/jpulse-common.js           ← Framework utilities (jPulse.*) - READ ONLY, NEVER MODIFY
site/webapp/view/site-common.js        ← Site-wide custom utilities - USE THIS IF NEEDED
[view-file].shtml                      ← Page-specific JavaScript in <script> tag
```

**Framework JavaScript** (`webapp/view/jpulse-common.js`):
- Contains all jPulse.* utilities (jPulse.api, jPulse.UI, jPulse.form, etc.)
- Complete utility library documented in [Front-End Development Guide](front-end-development.md)
- **USE these utilities**, never modify this file

**Site JavaScript** (`site/webapp/view/site-common.js`):
- Create from `site/webapp/view/site-common.js.tmpl` if missing
- Optional - only create if you have site-wide custom utilities
- Use different namespace (e.g., site.utils.*) to avoid conflicts
- Loaded after framework JavaScript

## 🏗️ Project Structure Understanding

### Directory Layout
```
site/
├── webapp/                    # SITE CODE - Safe to modify
│   ├── app.conf               # Site configuration (merges with framework)
│   ├── controller/            # Site controllers (auto-discovered)
│   ├── model/                 # Site data models
│   ├── view/                  # Site templates (override framework)
│   │   ├── site-common.css    # Site-wide styles (site-* prefix)
│   │   ├── site-common.js     # Site-wide utilities (optional)
│   │   └── [pages]/           # Page templates with local-* styles
│   └── static/                # Site assets
webapp/                        # FRAMEWORK CODE - Never modify
    ├── app.conf               # Framework defaults
    ├── controller/            # Base controllers
    ├── model/                 # Framework models
    ├── view/                  # Base templates
    │   ├── jpulse-common.css  # Framework styles (jp-* prefix)
    │   ├── jpulse-common.js   # Framework utilities (jPulse.*)
    │   └── [templates]/       # Framework templates
    ├── static/                # Framework assets
    └── utils/                 # Framework utilities
```

### File Resolution Priority

The framework automatically resolves files with site priority:
1. **First**: `site/webapp/[path]`
2. **Fallback**: `webapp/[path]`

This means:
- Site files override framework files automatically
- No configuration needed
- You can selectively override only what you need

Complete details: [Site Customization Guide](site-customization.md)

## 📚 Reference Implementations - Your Primary Learning Resources

### Complete MVC Example

**Model**: `site/webapp/model/helloTodo.js`
- MongoDB integration and schema validation
- CRUD operations with CommonUtils
- Error handling patterns
- What to learn: Schema structure, validation, database operations

**Controller**: `site/webapp/controller/helloTodo.js`
- REST API with auto-discovery (`static async api*()` methods)
- Proper logging with LogController
- Error handling and standardized responses
- What to learn: Controller structure, API patterns, logging conventions

**View**: `site/webapp/view/hello-todo/index.shtml`
- Client-side heavy pattern with jPulse.api calls
- DOM manipulation and event handling
- Using framework UI components (confirmDialog, toast)
- CSS with local-* prefix in <style> tag
- What to learn: View structure, client-side patterns, styling conventions

### Advanced Examples

**SPA with Vue.js**: `site/webapp/view/hello-vue/`
- Single Page Application architecture
- Vue Router integration
- Component-based development
- What to learn: SPA patterns, Vue integration, client-side routing

**WebSocket/Real-time**: `site/webapp/view/hello-websocket/templates/todo-demo.tmpl`
- Real-time bidirectional communication
- WebSocket connection management
- Collaborative features
- What to learn: Real-time patterns, WebSocket API, state synchronization

**Admin Interface**: `webapp/view/admin/logs.shtml`
- Complex UI with framework components
- Data tables and filtering
- Advanced jPulse.* utility usage
- What to learn: Complex UIs, data management, admin patterns

### Framework Controllers (Pattern Reference Only - Don't Modify)

**Authentication**: `webapp/controller/auth.js`
- Session management and security
- Login/logout patterns
- Password handling
- What to learn: Authentication patterns, security practices

**User Management**: `webapp/controller/user.js`
- User CRUD operations
- Role-based access control
- Profile management
- What to learn: User management patterns, authorization

**Health/Metrics**: `webapp/controller/health.js`
- API endpoint patterns
- System monitoring
- Status reporting
- What to learn: Health check patterns, metrics collection

## 📖 Documentation Reference Guide

### When User Asks "How Do I..."

**Always check these documentation sources first** before providing code:

**Getting Started**: [docs/getting-started.md](getting-started.md)
- Basic patterns and quick start
- Creating first controller, model, view
- Understanding MVC architecture
- When to use: "How do I create...", "How do I start..."

**API Reference**: [docs/api-reference.md](api-reference.md)
- REST endpoint standards and conventions
- Authentication requirements
- Request/response formats
- When to use: "What API endpoints...", "How do I call..."

**Front-End Development**: [docs/front-end-development.md](front-end-development.md)
- Complete jPulse.* utility reference
- Form handling, API calls, UI components
- Device detection, cookies, DOM utilities
- When to use: "How do I use jPulse...", "What utilities are available..."

**Site Customization**: [docs/site-customization.md](site-customization.md)
- Override system and site structure
- Configuration merging
- File resolution priority
- When to use: "Where do I put...", "How do I override..."

**Template Reference**: [docs/template-reference.md](template-reference.md)
- Handlebars syntax and patterns
- Server-side template processing
- Template security
- When to use: "How do I use templates...", "What template syntax..."

**Style Reference**: [docs/style-reference.md](style-reference.md)
- CSS framework and jp-* component library
- Available classes and patterns
- Responsive design
- When to use: "What CSS classes...", "How do I style..."

## 🔧 Implementation Guidance

**Important**: This document avoids full code examples to prevent staleness as the framework evolves. However, **YOU (the AI) should generate complete, working code for users** by studying the reference implementations and applying the patterns.

### Creating a New Controller

**Pattern to Follow**:
1. Study `site/webapp/controller/helloTodo.js` to understand the complete pattern
2. Create file in `site/webapp/controller/[name].js`
3. Export default class with static async methods
4. Use `api*()` naming for auto-discovery (api, apiCreate, apiUpdate, apiDelete, apiCustomName)
5. Include logging with LogController for all operations
6. Return standardized JSON responses: `{ success: true/false, data/error }`
7. Use try-catch with CommonUtils.sendError() for errors

**When user asks you to create a controller**:
- Generate the complete controller code based on helloTodo.js pattern
- Adapt it to their specific requirements
- Include all necessary imports, logging, error handling
- Explain key points as you provide the code

**Reference file**: `site/webapp/controller/helloTodo.js`

### Creating a View Template

**Pattern to Follow**:
1. Study `site/webapp/view/hello-todo/index.shtml` to understand complete structure
2. Create file in `site/webapp/view/[namespace]/[page].shtml`
3. Include framework header/footer templates: `{{file.include webapp/view/jpulse-header.tmpl}}`
4. Make use of `{{handlebars}}` that are expanded server-side, complete documentation at `docs/handlebars.md`
5. Use `<style>` tag with `local-*` prefix for page-specific styles
6. Use `<script>` tag for page JavaScript with `jPulse.dom.ready()` (avoid `DOMContentLoaded`)
7. Load data client-side with jPulse.api calls
8. Use existing `jp-*` classes from framework (jp-container, jp-card, jp-btn, etc.)

**When user asks you to create a view**:
- Generate the complete HTML/template code based on hello-todo pattern
- Include proper header/footer includes
- Add all necessary HTML structure with framework classes
- Include JavaScript for data loading and interactions
- Add page-specific styles with local-* prefix
- Explain the structure as you provide the code

**Reference file**: `site/webapp/view/hello-todo/index.shtml`

### Creating a MongoDB Model

**Pattern to Follow**:
1. Study `site/webapp/model/helloTodo.js` to understand complete pattern
2. Create file in `site/webapp/model/[name].js`
3. Define collectionName and schema with validation rules
4. Use CommonUtils for all database operations (createDocument, findDocuments, updateDocument, deleteDocument)
5. Export class with CRUD methods
6. Include proper error handling

**When user asks you to create a model**:
- Generate the complete model code based on helloTodo.js pattern
- Adapt schema to their data structure requirements
- Include all necessary CRUD methods
- Add validation and error handling
- Explain the schema structure as you provide the code

**Reference file**: `site/webapp/model/helloTodo.js`

## 🎨 Framework Utilities Quick Reference

For complete documentation, see [Front-End Development Guide](front-end-development.md).

**API Calls**:
```javascript
await jPulse.api.get('/api/1/endpoint')
await jPulse.api.post('/api/1/endpoint', data)
await jPulse.api.put('/api/1/endpoint', data)
await jPulse.api.delete('/api/1/endpoint')
```

**UI Components**:
```javascript
jPulse.UI.toast.success('Message')
jPulse.UI.toast.error('Error message')
jPulse.UI.confirmDialog({ title, message, onConfirm, onCancel })
```

**Form Handling**:
```javascript
jPulse.form.bindSubmission(form, '/api/1/endpoint', { /* options */ })
```

**Date Formatting**:
```javascript
jPulse.date.formatLocalDate(dateObj)        // YYYY-MM-DD
jPulse.date.formatLocalDateAndTime(dateObj) // YYYY-MM-DD HH:MM:SS
```

**When user asks about utilities**, point them to the [Front-End Development Guide](front-end-development.md) rather than listing all methods.

## 🔍 Finding Information

### Version and Configuration

**Framework version**:
- Check `package.json` → `dependencies["@peterthoeny/jpulse-framework"]`

**Node.js requirement**:
- Check `package.json` → `engines.node`

**MongoDB version**:
- Check documentation: [Installation Guide](installation.md)

**App configuration**:
- Framework defaults: `webapp/app.conf`
- Site overrides: `site/webapp/app.conf`
- Configuration merging explained in [Site Customization Guide](site-customization.md)

### When to Look Where

Organize your response guidance by user question type:

**"How do I style X?"**
→ Check [Style Reference](style-reference.md) for existing jp-* classes first
→ If no suitable class exists, create with local-* or site-* prefix
→ Reference: `webapp/view/jpulse-common.css` (read-only)

**"How do I call API Y?"**
→ Check [API Reference](api-reference.md) for endpoint documentation
→ Use jPulse.api.get/post/put/delete methods
→ Reference: [Front-End Development Guide](front-end-development.md)

**"How does feature Z work?"**
→ Check [Getting Started](getting-started.md) for basics
→ Check [Site Customization](site-customization.md) for override system
→ Look at hello-* examples for complete implementations

**"What utilities are available?"**
→ Complete reference: [Front-End Development Guide](front-end-development.md)

**"How do I use Handlebars?"**
→ [Template Reference](template-reference.md) for syntax
→ Examples in any .shtml file

## 📋 Code Quality Checklist

### Before Suggesting Code to User

Verify your suggestion meets these criteria:

- [ ] Uses `site/webapp/` directory structure (never `webapp/`)
- [ ] Points to reference implementation file instead of large code snippet
- [ ] Describes pattern at high level with key points
- [ ] References relevant documentation
- [ ] Mentions logging requirements (LogController)
- [ ] Mentions CSS prefix rules (local-* or site-*, never jp-*)
- [ ] Uses ISO date format (jPulse.date methods)
- [ ] No tabs, 4 spaces only
- [ ] No spaces on blank lines

### Security Considerations

Always mention these in your guidance:

- [ ] Input validation on API endpoints
- [ ] Authentication checks (req.session.user)
- [ ] Authorization checks (user roles)
- [ ] Use CommonUtils for database operations (prevents injection)
- [ ] Proper error messages (don't leak sensitive info)
- [ ] CSRF protection (framework handles automatically)

## 🚨 Common Mistakes to Avoid

### Mistake 1: Not Generating Complete Code

**Wrong Approach**:
```
❌ "Here's a rough outline... you can fill in the details by looking at helloTodo.js"
❌ "See the reference file for the complete implementation" (without providing code)
```

**Right Approach**:
```
✅ Generate the complete implementation based on the pattern in site/webapp/controller/helloTodo.js, or any other suitable reference implementation:
   [Provide full working code here]

   Key points about this implementation:
   1. Uses static async api*() methods for auto-discovery
   2. Includes LogController.logInfo(req, 'Controller.method', 'action')
   3. Returns standardized { success, data/error } JSON format
   4. Has try-catch with CommonUtils.sendError()
```

**Remember**: YOU should provide complete code. Users don't want to piece together implementations themselves - that's why they're using an AI assistant!

### Mistake 2: Modifying Framework Files

**Wrong**:
```
❌ "Modify webapp/view/jpulse-common.css to add .jp-custom-button"
❌ "Update webapp/controller/auth.js to add your feature"
```

**Right**:
```
✅ "Create site/webapp/view/site-common.css for .site-custom-button"
✅ "Create site/webapp/controller/customAuth.js for your feature"
```

### Mistake 3: Wrong CSS Prefix

**Wrong**:
```
❌ .my-custom-style { }      // Unprefixed
❌ .jp-custom-button { }     // NEVER create jp-* styles
```

**Right**:
```
✅ .local-custom { }          // In view file <style> tag
✅ .site-custom { }           // In site-common.css
```

### Mistake 4: Server-Side Heavy Views

**Wrong Pattern**:
```
❌ Controller loads all data, passes to template
❌ Template renders everything server-side
```

**Right Pattern**:
```
✅ Controller passes minimal context (auth state, config)
✅ View loads data client-side with jPulse.api.get()
✅ JavaScript updates DOM dynamically
```

### Mistake 5: Documenting Stale Information

**Wrong**:
```
❌ "jPulse requires Node.js 18+" (version might change)
❌ "Here's the complete API for jPulse.form: [list all methods]" (API evolves)
```

**Right**:
```
✅ "Check package.json for Node.js requirements"
✅ "See front-end-development.md for complete jPulse.form API"
```

## 🎯 Response Guidelines

### When User Asks to Create Feature

**Your response structure**:
1. **Acknowledge Request**: Confirm you understand what they want
2. **Provide Complete Code**: Generate full implementation based on reference patterns
3. **Explain Key Points**: Highlight important aspects of the code
4. **Reference Docs**: Link to relevant documentation for deeper understanding
5. **Next Steps**: Suggest testing or additional features

**Example response**:
> "I'll create a blog post management feature following the jPulse MVC pattern.
>
> **1. Model** (`site/webapp/model/blogPost.js`):
> ```javascript
> [Complete model code here based on helloTodo.js pattern]
> ```
>
> **2. Controller** (`site/webapp/controller/blogPost.js`):
> ```javascript
> [Complete controller code here based on helloTodo.js pattern]
> ```
>
> **3. View** (`site/webapp/view/blog-posts/index.shtml`):
> ```html
> [Complete view HTML here based on hello-todo/index.shtml pattern]
> ```
>
> **Key points**:
> - The controller uses static async api*() methods for auto-discovery
> - All operations include LogController logging
> - The view loads data client-side with jPulse.api.get()
> - Page styles use local-* prefix in the <style> tag
>
> **Next steps**:
> - Restart server to register the new controller
> - Visit http://localhost:8080/blog-posts/
> - Test CRUD operations
>
> See [Getting Started Guide](getting-started.md) for more about the MVC pattern."

### When User Reports Error

**Your response structure**:
1. **Identify Issue**: Based on error message and code
2. **Reference Working Implementation**: Compare with reference file
3. **Point to Documentation**: Link to relevant troubleshooting
4. **Explain Fix**: Why error occurred and solution
5. **Prevention**: How to avoid similar issues

**Example response**:
> "The 500 error suggests missing error handling. Compare your controller with `site/webapp/controller/helloTodo.js`:
>
> 1. Wrap your async code in try-catch
> 2. Add LogController.logError(req, 'Controller.method: error message')
> 3. Use CommonUtils.sendError(res, statusCode, message)
>
> See line 75-82 in helloTodo.js for the complete error handling pattern."

### When User Asks "How Do I..."

**Your response structure**:
1. **Provide the Solution**: Show them the complete code to do it
2. **Explain the Code**: Break down what each part does
3. **Reference Documentation**: Link to relevant docs for more details
4. **Show Example**: Point to where this pattern is used in reference files

**Example response**:
> "To add a confirmation dialog before deleting, here's the code:
>
> ```javascript
> function deleteItem(id) {
>     jPulse.UI.confirmDialog({
>         title: 'Confirm Deletion',
>         message: 'Are you sure you want to delete this item? This action cannot be undone.',
>         onConfirm: async () => {
>             const result = await jPulse.api.delete(`/api/1/items/${id}`);
>             if (result.success) {
>                 jPulse.UI.toast.success('Item deleted successfully');
>                 loadItems(); // Refresh the list
>             }
>         },
>         onCancel: () => {
>             // Optional: handle cancel if needed
>         }
>     });
> }
> ```
>
> **How it works**:
> - `jPulse.UI.confirmDialog()` shows a modal with Confirm/Cancel buttons
> - Delete API call happens only if user confirms
> - Success message shown with jPulse.UI.toast.success()
>
> **See it in action**: `site/webapp/view/hello-todo/index.shtml` around line 156 shows this exact pattern.
>
> **Reference**: [Front-End Development Guide](front-end-development.md#confirmation-dialogs) for complete confirmDialog API options."

## 🧠 Avoiding Stale Information

### Philosophy: This Doc Stays Fresh, Your Code Stays Current

**Important distinction**:
- **This document** avoids full code examples (they get stale)
- **You (the AI)** should generate complete code for users (that's your job!)
- **How**: Study the living reference files, then generate fresh code

**This document doesn't hardcode versions** - you look them up:
- ❌ This doc says: "jPulse requires Node.js 18+, MongoDB 4.4+"
- ✅ This doc says: "Check package.json for requirements"
- ✅ You tell user: "Based on package.json, this project requires Node.js 18+"

**This document doesn't copy full APIs** - you reference them:
- ❌ This doc lists: "jPulse.api has these methods: get(url), post(url, data)..."
- ✅ This doc says: "See front-end-development.md for jPulse.api reference"
- ✅ You tell user: "Here's how to use jPulse.api.get(): [provide example code]"

**This document doesn't include code snippets** - you generate them:
- ❌ This doc contains: "Controller template: [full controller code]"
- ✅ This doc says: "Study site/webapp/controller/helloTodo.js for pattern"
- ✅ You tell user: "Here's your controller: [generate complete code based on pattern]"

### What You (the AI) Should Do

**Always provide to users**:
- Complete, working code implementations
- Full examples with all necessary imports
- Detailed explanations of the code
- Next steps and testing instructions

**How you stay current**:
- Read the reference files to understand patterns
- Check package.json for current versions
- Reference documentation for current APIs
- Generate fresh code based on living examples

**What this document avoids** (to prevent staleness):
- Full code templates (generate from references instead)
- Hardcoded version numbers (check package.json instead)
- Complete API listings (read docs instead)
- Detailed syntax (reference living code instead)

### Your Role as AI Assistant

**You are the code generator**:
- Users ask you to create code → You provide complete implementations
- Users ask how to do X → You show them the complete code to do X
- Users hit errors → You provide the fixed code

**This document is your guide**:
- Points you to reference implementations to study
- Tells you what patterns to follow
- Explains framework conventions
- But YOU write the code for users, not them!

## 📚 Additional Context

### Framework Philosophy

Understanding these principles helps you provide better guidance:

**"Don't make me think"**:
- Intuitive APIs with clear function names
- Safe defaults that prevent common mistakes
- Explicit opt-ins for potentially dangerous operations
- Minimal cognitive load for developers

**Security by default**:
- Input validation required
- Authentication checks built-in
- Path traversal protection automatic
- SQL injection prevention via CommonUtils

**Zero configuration**:
- Auto-discovery of controllers
- Convention over configuration
- No manual route registration
- Automatic file resolution

**Client-side heavy**:
- Server provides structure and auth state
- JavaScript handles data loading
- APIs for all data operations
- Dynamic UI updates

### Code Organization Principles

**Separation of concerns**:
- Each module has single, well-defined responsibility
- Framework handles infrastructure (auth, routing, DB)
- Site handles business logic
- Clear boundaries between layers

**Maintainability**:
- Small, focused files
- Clear naming conventions
- Comprehensive logging
- Test coverage

---

**Remember**: Your role is to guide developers to the living documentation and reference implementations, not to provide potentially outdated code snippets. The framework files and documentation are the source of truth. Point users there with clear, actionable guidance.
