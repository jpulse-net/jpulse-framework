# jPulse Framework / Docs / Dev / Development Guide v0.7.7

**For Framework Contributors & Core Developers**

Technical documentation for developers working on the jPulse Framework itself. This covers architecture decisions, implementation details, and contribution workflows.

> **Site Development**: For building sites with jPulse, see the [main documentation](../README.md).

## 🏗️ Architecture Overview

### Core Design Principles
1. **Separation of Concerns**: Clear boundaries between static and dynamic content
2. **Security First**: Path traversal protection, input validation, secure defaults
3. **Performance**: nginx-friendly routing, efficient template processing
4. **Developer Experience**: Natural syntax, comprehensive testing, clear error messages
5. **Maintainability**: Modular structure, comprehensive documentation, consistent patterns

### Technology Stack
- **Backend**: Node.js 18+, Express.js 4.x with ES modules
- **Database**: MongoDB 4.4+ (required for enterprise features)
- **Configuration**: JavaScript-based `.conf` files with dynamic evaluation
- **Templating**: Custom Handlebars implementation with security features
- **Utilities**: CommonUtils framework for data processing and schema-based queries
- **Testing**: Jest with automated cleanup, global setup/teardown, and 337+ tests
- **Build Tools**: npm scripts, native ES modules, version management
- **Distribution**: npm package (@peterthoeny/jpulse-framework) with CLI tools (W-051)
- **Production**: nginx reverse proxy + PM2 process management

### Package Distribution (W-051)
- **Framework Package**: `@peterthoeny/jpulse-framework` published to GitHub Packages
- **CLI Tools**: `jpulse-setup` (site creation), `jpulse-sync` (framework updates), `jpulse-update` (safe updates with dry-run)
- **Site Structure**: Independent repositories with committed framework files
- **Update Workflow**: `npm run update` (recommended) or `jpulse-update` with dry-run support
- **Deployment Validation**: Comprehensive test suite with `install-test.sh` for production readiness
- **Publishing Guide**: See [Package Publishing Guide](publishing.md) for release process

## 🎨 View Architecture (Client-Side Focus)

### Primary View Logic: Client-Side JavaScript + API Calls

The jPulse Framework follows a **client-side heavy** architecture where:

1. **Server-Side Handlebars**: Minimal initial page rendering with basic context
   - Renders page structure and initial data
   - Provides authentication state and configuration
   - Includes framework utilities (jPulse.js)

2. **Client-Side JavaScript**: Primary application logic and user interactions
   - API calls to `/api/1/*` endpoints for all data operations
   - Dynamic DOM manipulation and form handling
   - Real-time updates without page reloads
   - Component interactions (collapsible, dialogs, etc.)

### Example Architecture Pattern

```html
<!-- Server-side: Initial page structure -->
{{file.include webapp/view/jpulse-header.tmpl}}

<div class="jp-container">
    <h1>{{pageTitle}}</h1>
    <div id="content-area">
        <!-- Placeholder for dynamic content -->
    </div>
</div>

<script>
// Client-side: Primary application logic
document.addEventListener('DOMContentLoaded', async () => {
    // Load fresh data via API
    const response = await jPulse.api.get('/api/1/user/profile');
    if (response.success) {
        updateUI(response.data);
    }

    // Handle form submissions
    const form = document.getElementById('profileForm');
    jPulse.form.bindSubmission(form, '/api/1/user/profile', {
        method: 'PUT',
        onSuccess: (data) => {
            jPulse.showSlideDownSuccess('Profile updated successfully!');
            updateUI(data);
        }
    });
});
</script>
```

### View Layer Responsibilities

**Server-Side (Minimal)**:
- Authentication state (`{{user.authenticated}}`)
- Initial configuration (`{{appConfig.*}}`)
- Page structure and navigation
- Security context and CSRF tokens

**Client-Side (Primary)**:
- Data fetching via REST APIs
- Form validation and submission
- Dynamic content updates
- User interactions and feedback
- Component state management

## 🔧 Development Workflow

### Code Organization Patterns

#### Controller Structure
```javascript
// webapp/controller/example.js
export default class ExampleController {
    // Web page handler (minimal - serves initial template)
    async index(req, res) {
        const context = {
            pageTitle: 'Example Page',
            user: req.session.user
        };
        await this.viewController.renderView(req, res, 'example/index', context);
    }

    // API endpoints (primary application logic)
    api() {
        return {
            'GET /data': this.getData.bind(this),
            'POST /create': this.createData.bind(this),
            'PUT /update': this.updateData.bind(this)
        };
    }
}
```

#### Client-Side Utilities
```javascript
// Using jPulse framework utilities
const data = await jPulse.api.get('/api/1/example/data');
jPulse.showSlideDownSuccess('Data loaded successfully!');

// Form handling
jPulse.form.bindSubmission(form, '/api/1/example/create', {
    onSuccess: (result) => {
        // Update UI dynamically
        updateDataTable(result.data);
    }
});
```

## 🧪 Testing Architecture

### Test Structure
```
webapp/tests/
├── setup/              # Test environment management
├── fixtures/           # Test data and configuration files
├── helpers/            # Test utilities and mock objects
├── integration/        # End-to-end application tests
└── unit/               # Isolated component tests
    ├── controller/     # API endpoint tests
    ├── model/          # Data model tests
    └── utils/          # Utility function tests
```

### Testing Best Practices
- **API-First Testing**: Focus on testing REST endpoints
- **Client-Side Mocking**: Mock jPulse utilities for frontend tests
- **Integration Tests**: Test complete user workflows
- **Automated Cleanup**: Global setup/teardown prevents conflicts

## 🎨 CSS Architecture

### Prefix Convention (W-044)
- **`jp-*`** = Common framework styles (always in `jpulse-common.css`)
- **`local-*`** = Page-specific styles (always in current page's `<style>` section)

### Component Library
- `.jp-btn`, `.jp-card`, `.jp-form-input` - Framework components
- `.jp-user-*`, `.jp-dashboard-*` - Specialized components
- `.local-*` - Page-specific overrides and customizations

## 🔐 Security Implementation

### Input Validation
- Path sanitization for file operations
- Schema-based validation in models
- CSRF protection for forms
- SQL injection prevention (MongoDB)

### Template Security
- Path traversal protection
- Include depth limiting (max 10 levels)
- View root jail (all includes within `webapp/view/`)
- Input sanitization and escaping

## 📚 Additional Documentation

For detailed implementation guides, see:

- **[Architecture Details](architecture.md)** - Comprehensive system architecture
- **[Roadmap](roadmap.md)** - Development roadmap and milestones
- **[Requirements](requirements.md)** - Feature requirements and specifications
- **[Work Items](work-items.md)** - Detailed work item tracking

## 🔧 Development Commands

```bash
# Development
npm start                # Start development server
npm test                 # Run test suite
npm run test:watch       # Watch mode for tests

# Production
npm run build           # Build for production
npm run start:prod      # Start production server
```

## 📝 Contributing Guidelines

1. **API-First Development**: Design REST endpoints before views
2. **Client-Side Focus**: Implement primary logic in JavaScript
3. **Test Coverage**: Write tests for all API endpoints
4. **Security**: Follow path traversal and input validation patterns
5. **Documentation**: Update relevant docs with changes

---

**jPulse Framework** - Architecture built for scale, security, and developer happiness. 🚀

## 📋 Content Reorganization Proposal

The original dev/README.md (2180 lines) should be broken into focused documents:

### Proposed Document Structure

1. **docs/dev/README.md** (this file) - Overview and getting started
2. **docs/dev/architecture.md** (existing) - Detailed system architecture
3. **docs/dev/implementation-guides/** (new directory)
   - `form-submission.md` - W-042 Enhanced Form Submission details
   - `css-conventions.md` - W-044 CSS Prefix Convention guide
   - `template-system.md` - Handlebars and template processing
   - `internationalization.md` - I18n system implementation
   - `testing-patterns.md` - Testing best practices and patterns
4. **docs/dev/migration-guides/** (new directory)
   - `breaking-changes.md` - All breaking changes and migration steps
   - `api-changes.md` - API evolution and compatibility
5. **docs/dev/performance.md** (new) - Performance considerations and optimization
6. **docs/dev/troubleshooting.md** (new) - Common issues and solutions

### Benefits of Reorganization
- **Focused Content**: Each document has a single, clear purpose
- **Better Navigation**: Easier to find specific information
- **Maintainability**: Smaller files are easier to update
- **"Don't Make Me Think"**: Clear document hierarchy and purpose
- **Reduced Cognitive Load**: No overwhelming 2000+ line documents

### Migration Strategy
1. Extract breaking changes content → `migration-guides/breaking-changes.md`
2. Extract detailed implementation guides → `implementation-guides/`
3. Move performance and troubleshooting content to dedicated files
4. Keep only essential architecture overview in main README

---

## Framework Development Setup

> **Detailed Setup**: See [Framework Development Installation](installation.md) for complete setup instructions.

### Quick Start
```bash
# Clone the framework repository
git clone https://github.com/peterthoeny/jpulse-framework.git
cd jpulse-framework
npm install && npm test && npm start
```

### Contributing
1. **Issues**: Report bugs and feature requests on GitHub
2. **Pull Requests**: Follow existing code style and include tests
3. **Documentation**: Update relevant docs with changes
4. **Testing**: Ensure all tests pass before submitting

---

> **Building Sites with jPulse?** See the [Site Development Documentation](../README.md)
