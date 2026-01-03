# jPulse Docs / Generative-AI Instructions for AI Assistants v1.4.3

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

3. **Client-Side Heavy (Application Pages)**: For CRUD interfaces and dashboards, the **V in MVC resides in the browser**
   - **Views**: Client-side JavaScript loads and renders data dynamically
   - **Controllers**: Server-side handles API endpoints, returns JSON data (not rendered HTML)
   - **Models**: Server-side handles database operations
   - Load data client-side via jPulse.api methods (GET, POST, PUT, DELETE)
   - Views use JavaScript to call API endpoints and render results in the DOM
   - Server-side renders initial page structure only (skeleton HTML)
   - Note: Simple content pages (marketing, documentation) may use minimal JavaScript and server-side template rendering
   - See [Front-End Development Guide](front-end-development.md)
   - See [Handlebars Templating](handlebars.md) for server-side template handling

4. **Auto-Discovery**: Controllers auto-register via `static async api*()` methods
   - Never manually register routes in routes.js
   - Method naming convention determines HTTP method and endpoint
   - Framework logs all auto-discovered endpoints on startup

5. **CSS Conventions** (CRITICAL):
   - `local-*` prefix for styles in `<style>` tags within view files (`.shtml` and `.tmpl`)
   - `site-*` prefix for shared site styles in `site/webapp/view/jpulse-common.css` (appended to framework CSS)
   - Never define `jp-*` prefix (reserved for framework only in `webapp/view/jpulse-common.css`)
   - Never add custom styles to `webapp/view/jpulse-common.css` (framework-managed)
   - Use existing `jp-*` classes from framework, see [Style Reference](style-reference.md)

6. **JavaScript Conventions**:
   - Use framework utilities from `webapp/view/jpulse-common.js` (read-only, use jPulse.* methods)
   - Create site utilities in `site/webapp/view/jpulse-common.js` if needed (appended to framework JS)
   - Never modify `webapp/view/jpulse-common.js` (framework-managed)
   - See [jPulse.UI Widget Reference](jpulse-ui-reference.md)

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
   - See site/webapp/controller/helloTodo.js reference implementations for patterns

9. **Code Quality**:
   - No tabs - always 4 spaces for indentation
   - No trailing spaces or spaces on blank lines (violations caught by /^ +$/ search)
   - Proper error handling in all API endpoints

10. **Chain of Thought**: Use reasoning process before responding
    - Think through problems step-by-step
    - Consider multiple approaches before suggesting solutions

11. **No Guessing or Hallucination**:
    - Ask for details if information is insufficient
    - Do not invent or assume details
    - Respond with: "I don't know", "I'm not sure, but I can look it up", or "I need more details"

12. **Gen-AI History Log** (if user requests):
    - Maintain `genai-log.txt` or `cursor-log.txt` in project root when requested
    - Format: Timestamp (YYYY-MM-DD HH:MM), user prompt, summary of output, acceptance status
    - Separate entries with 60 "=" characters

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

### Plugin Development Guidelines

When working with plugins:

1. **Plugin Structure**: All plugin code goes in `plugins/[plugin-name]/webapp/`
   - Follows same structure as site (controller/, model/, view/, static/)
   - Auto-discovered and loaded based on plugin.json

2. **Plugin Dependencies**: Defined in `plugin.json`
   - Use `dependencies.plugins` to declare plugin dependencies
   - Framework loads plugins in dependency order
   - Circular dependencies are detected and prevented

3. **Plugin Dashboard Cards**: Use component system
   - Create components in `plugins/[plugin-name]/webapp/view/jpulse-plugins/[plugin-name].shtml`
   - Use `{{#component "pluginCards.name" order=N}}` syntax
   - Auto-discovered and shown in `/jpulse-plugins/` dashboard

4. **Plugin CSS/JS**: Automatically appended to framework
   - `plugins/[plugin-name]/webapp/view/jpulse-common.css` appended after framework CSS
   - `plugins/[plugin-name]/webapp/view/jpulse-common.js` appended after framework JS
   - Use plugin-specific prefixes to avoid conflicts

5. **Plugin Documentation**:
   - Complete guides in [docs/plugins/](plugins/)
   - Reference: [Plugin Architecture](plugins/plugin-architecture.md)
   - Reference: [Creating Plugins](plugins/creating-plugins.md)
   - Reference: [Plugin API Reference](plugins/plugin-api-reference.md)

## 🗂️ Framework vs Site Files

### Common CSS Files

```
webapp/view/jpulse-common.css                   ← Framework styles (jp-* prefix) - READ ONLY
plugins/[name]/webapp/view/jpulse-common.css    ← Plugin styles (appended)
site/webapp/view/jpulse-common.css              ← Site styles (site-* prefix, appended) - USE THIS
[view-file].shtml                               ← Page-specific styles (local-* prefix)
```

**Framework CSS** (`webapp/view/jpulse-common.css`):
- Contains all `jp-*` classes (jp-btn, jp-card, jp-container, etc.)
- Complete component library for framework use
- Reference: [Style Reference](style-reference.md)
- **USE these classes**, never create new `jp-*` classes

**Plugin CSS** (`plugins/[name]/webapp/view/jpulse-common.css`):
- Automatically appended to framework CSS (W-098 append mode)
- Loaded in plugin dependency order
- Use plugin-specific prefixes to avoid conflicts
- Read-only unless you're developing the plugin

**Site CSS** (`site/webapp/view/jpulse-common.css`):
- Create from `site/webapp/view/jpulse-common.css.tmpl` if missing
- Automatically appended after framework and plugin CSS (W-098 append mode)
- Use for site-wide custom styles shared across multiple pages
- Use `site-*` prefix (e.g., .site-header, .site-feature-card)
- Loaded last, can override framework and plugin styles

**Page CSS** (in view file's `<style>` tag):
- Use for page-specific styles used only on one page
- Use `local-*` prefix (e.g., .local-welcome-banner, .local-stats-grid)
- Keeps page-specific styles contained

### Common JavaScript Files

```
webapp/view/jpulse-common.js                    ← Framework utilities (jPulse.*) - READ ONLY
plugins/[name]/webapp/view/jpulse-common.js     ← Plugin utilities (appended)
site/webapp/view/jpulse-common.js               ← Site utilities (appended) - USE THIS IF NEEDED
[view-file].shtml                               ← Page-specific JavaScript in <script> tag
```

**Framework JavaScript** (`webapp/view/jpulse-common.js`):
- Contains all jPulse.* utilities (jPulse.api, jPulse.UI, jPulse.form, etc.)
- Complete utility library documented in [Front-End Development Guide](front-end-development.md)
- **USE these utilities**, never modify this file

**Plugin JavaScript** (`plugins/[name]/webapp/view/jpulse-common.js`):
- Automatically appended to framework JavaScript (W-098 append mode)
- Loaded in plugin dependency order
- Use plugin-specific namespaces to avoid conflicts
- Read-only unless you're developing the plugin

**Site JavaScript** (`site/webapp/view/jpulse-common.js`):
- Create from `site/webapp/view/jpulse-common.js.tmpl` if missing
- Automatically appended after framework and plugin JavaScript (W-098 append mode)
- Optional - only create if you have site-wide custom utilities
- Use different namespace (e.g., site.utils.*) to avoid conflicts
- Loaded last, can extend framework and plugin utilities

## 🏗️ Project Structure Understanding

### Directory Layout
```
my-jpulse-site/
├── site/                      # SITE CODE - Safe to modify
│   └── webapp/                # Site MVC components (overrides)
│       ├── app.conf           # Site configuration (merges with framework)
│       ├── controller/        # Site controllers (auto-discovered)
│       ├── model/             # Site data models
│       ├── view/              # Site templates (override framework)
│       │   ├── jpulse-common.css  # Site-wide styles (site-* prefix, appended)
│       │   ├── jpulse-common.js   # Site-wide utilities (appended, optional)
│       │   └── [pages]/           # Page templates with local-* styles
│       └── static/                # Site assets
├── plugins/                   # PLUGINS - Installed third-party extensions
│   └── [plugin-name]/         # Each plugin in its own directory
│       ├── plugin.json        # Plugin metadata and dependencies
│       ├── docs/              # Plugin documentation
│       └── webapp/            # Plugin MVC components (auto-loaded)
│           ├── controller/    # Plugin controllers (auto-discovered)
│           ├── model/         # Plugin models
│           ├── view/          # Plugin templates (mergeable)
│           │   ├── jpulse-common.css  # Plugin styles (appended)
│           │   ├── jpulse-common.js   # Plugin utilities (appended)
│           │   ├── jpulse-plugins/    # Plugin dashboard cards
│           │   └── [pages]/           # Plugin-specific pages
│           └── static/                # Plugin assets
└── webapp/                    # FRAMEWORK CODE - Never modify
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

The framework automatically resolves files with priority order:
1. `site/webapp/[path]` (site overrides, highest priority)
2. `plugins/[plugin-name]/webapp/[path]` (plugin files, in dependency order)
3. `webapp/[path]` (framework defaults)

This means:
- Site files override plugin and framework files automatically
- Plugins can override framework files (but not site files)
- Plugin load order determined by dependencies in plugin.json
- No configuration needed
- You can selectively override only what you need

Complete details:
- [Site Customization Guide](site-customization.md)
- [Plugin Architecture](plugins/plugin-architecture.md)

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
- CSS with local-* prefix in `<style>` tag
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

### Plugin Example

**Hello World Plugin**: `plugins/hello-world/`
- Complete plugin structure and organization
- Plugin metadata and dependencies (plugin.json)
- Plugin dashboard card with component system
- Plugin-specific pages and routes
- What to learn: Plugin architecture, plugin development patterns
- Reference: [Creating Plugins Guide](plugins/creating-plugins.md)

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

**Plugin Management**: `webapp/controller/plugin.js`
- Plugin lifecycle management
- Dependency resolution
- Plugin registry and load order
- What to learn: Plugin system internals

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

**Plugin Documentation**: [docs/plugins/](plugins/)
- Plugin architecture and system design
- Creating and publishing plugins
- Plugin API reference
- Managing installed plugins
- When to use: "How do I create a plugin...", "How do plugins work..."

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
3. Include framework header/footer templates: `{{file.include "jpulse-header.tmpl"}}`
4. Include reusable site templates: `{{file.include "site-marketing-header.tmpl"}}` (if needed)
5. Make use of `{{handlebars}}` that are expanded server-side, complete documentation at `docs/handlebars.md`
6. Use `<style>` tag with `local-*` prefix for page-specific styles
7. Use `<script>` tag for page JavaScript with `jPulse.dom.ready()` (avoid `DOMContentLoaded`)
8. Load data client-side with jPulse.api calls (for application pages)
9. Use existing `jp-*` classes from framework (jp-container, jp-card, jp-btn, etc.)

**When user asks you to create a view**:
- Generate the complete HTML/template code based on hello-todo pattern
- Include proper header/footer includes
- Add all necessary HTML structure with framework classes
- Include JavaScript for data loading and interactions (for application pages)
- Add page-specific styles with local-* prefix
- Explain the structure as you provide the code

**Reference file**: `site/webapp/view/hello-todo/index.shtml`

### Creating Reusable Templates

**Pattern to Follow**:
1. Create `.tmpl` files in `site/webapp/view/` for reusable components
2. Use descriptive names: `site-marketing-header.tmpl`, `site-pricing-card.tmpl`
3. Include in pages with `{{file.include "template-name.tmpl"}}`
4. Pass context variables: `{{file.include "template.tmpl" key="value"}}`
5. Use `site-*` CSS prefix for template-specific styles

**When to use .shtml vs .tmpl**:
- `.shtml` - Full page templates (routes to URLs)
- `.tmpl` - Reusable components included in pages (not directly routable)

**Reference**: See `site/webapp/view/hello-vue/templates/` for template organization patterns

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

### Creating a Plugin

**Pattern to Follow**:
1. Study `plugins/hello-world/` to understand complete plugin structure
2. Create directory in `plugins/[plugin-name]/`
3. Create `plugin.json` with metadata (name, version, dependencies)
4. Create `webapp/` subdirectory with same structure as site
5. Add plugin dashboard card in `webapp/view/jpulse-plugins/[plugin-name].shtml`
6. Use component system for dashboard card: `{{#component "pluginCards.name" order=N}}`
7. Plugin CSS/JS in `webapp/view/jpulse-common.css` and `jpulse-common.js`

**Plugin Structure**:
```
plugins/[plugin-name]/
├── plugin.json                          # Metadata and dependencies
├── webapp/
│   ├── controller/                      # Plugin controllers (auto-discovered)
│   ├── model/                           # Plugin models
│   ├── view/
│   │   ├── jpulse-common.css            # Plugin styles (appended)
│   │   ├── jpulse-common.js             # Plugin utilities (appended)
│   │   ├── jpulse-plugins/              # Dashboard card
│   │   │   └── [plugin-name].shtml
│   │   └── [plugin-pages]/              # Plugin pages
│   └── static/                          # Plugin assets
└── docs/                                # Plugin documentation
    └── README.md
```

**When user asks you to create a plugin**:
- Generate complete plugin structure based on hello-world pattern
- Include plugin.json with proper metadata
- Create dashboard card with component system
- Add necessary controllers, models, views
- Explain plugin system and load order
- Reference: [Creating Plugins Guide](plugins/creating-plugins.md)

**Reference files**:
- `plugins/hello-world/plugin.json`
- `plugins/hello-world/webapp/view/jpulse-plugins/hello-world.shtml`

### When You DON'T Need Controllers/Models

**Simple content pages** (marketing, documentation, landing pages) may not need:
- Controllers (unless form submission or dynamic data)
- Models (unless database operations)
- API endpoints (unless client-side data loading)

**Decision framework**:
- Use Controllers + Models when: CRUD operations, user data, dynamic data, database interactions
- Skip Controllers/Models when: Static content, simple pages, no database operations needed

**Template-only pages**:
- Create `site/webapp/view/[page]/index.shtml` with static HTML
- Include framework templates: `{{file.include "jpulse-header.tmpl"}}`
- Use `site-*` or `local-*` CSS classes
- No controller needed for pure content pages

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
- Check `package.json` → `dependencies["@jpulse-net/jpulse-framework"]`

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

**"How do I create/use plugins?"**
→ [Plugin Architecture](plugins/plugin-architecture.md) for system overview
→ [Creating Plugins](plugins/creating-plugins.md) for step-by-step guide
→ [Plugin API Reference](plugins/plugin-api-reference.md) for API details
→ Reference: `plugins/hello-world/` for complete example

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
- [ ] Proper error messages (don't leak sensitive info)
- [ ] CSRF protection (framework handles automatically)

## 🎯 Response Guidelines

### When User Asks to Create Feature

**Your response structure**:
1. **Acknowledge Request**: Confirm you understand what they want
2. **Provide Complete Code**: Generate full implementation based on reference patterns
3. **Explain Key Points**: Highlight important aspects of the code
4. **Reference Docs**: Link to relevant documentation for deeper understanding
5. **Next Steps**: Suggest testing or additional features

**Key principles**:
- Always generate complete, working code (users don't want outlines)
- Base implementations on reference files (helloTodo.js, hello-todo/index.shtml, etc.)
- Include all necessary imports, logging, error handling
- Explain key points as you provide the code

### When User Reports Error

**Your response structure**:
1. **Identify Issue**: Based on error message and code
2. **Reference Working Implementation**: Compare with reference file
3. **Point to Documentation**: Link to relevant troubleshooting
4. **Explain Fix**: Why error occurred and solution
5. **Prevention**: How to avoid similar issues

### When User Asks "How Do I..."

**Your response structure**:
1. **Provide the Solution**: Show them the complete code to do it
2. **Explain the Code**: Break down what each part does
3. **Reference Documentation**: Link to relevant docs for more details
4. **Show Example**: Point to where this pattern is used in reference files

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

**"Don't make me think"**: Intuitive APIs, safe defaults, minimal cognitive load
**Security by default**: Input validation, authentication checks, path traversal protection
**Zero configuration**: Auto-discovery, convention over configuration, automatic file resolution
**Client-side heavy**: Server provides structure/auth state, JavaScript handles data loading (for application pages)
**Separation of concerns**: Framework handles infrastructure, site handles business logic

---

**Remember**: Your role is to guide developers to the living documentation and reference implementations, not to provide potentially outdated code snippets. The framework files and documentation are the source of truth. Point users there with clear, actionable guidance.
