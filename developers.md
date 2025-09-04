# jPulse Framework / Developer Documentation v0.4.4

Technical documentation for developers working on the jPulse Framework. This document covers architecture decisions, implementation details, and development workflows.

**Latest Updates (v0.4.2):**
- 🎨 **View Migration & API Simplification (W-036)**: Complete migration of all 5 view files to jpulse-common utilities with API response simplification and dynamic schema-aware frontend. Eliminated confusing double-wrapped responses, implemented dynamic dropdown population from backend APIs, and enhanced search functionality with proper pagination.
- 🎨 **Component-Based Styling (W-025)**: Complete CSS architecture with `jp-` component library, framework/site separation preparation, and theme system foundation. Moved 290+ lines from templates to external CSS with responsive design and performance optimization.
- ✅ **Enhanced JavaScript Utilities (W-035)**: Complete `jpulse-common.js` framework with 5-phase utility system - alert management, API standardization, form handling, DOM utilities, and device detection. Eliminates 300+ lines of duplicate code across views with 40-50% faster development.
- 🚫 **Error Reporting Without Redirect (W-034)**: Modified `viewController.load` to directly render 404 error pages for UI requests, preserving the URL and enhancing user experience by removing unnecessary redirects.
- 🧪 **ESM Testing Infrastructure (W-033)**: Fixed ECMAScript Modules loading issues, implemented runtime configuration consolidation, and created shared bootstrap architecture for consistent dependency management
- 📊 **Production-Ready Logging**: Standardized logging format across all modules with consistent timestamp and context formatting
- 🎯 **Test Suite Optimization**: Achieved 100% test pass rate with improved test isolation and parallel execution support
- ⚙️ **Configuration Consolidation**: Runtime .conf to .json conversion with timestamp-based caching for optimal performance
- 👤 **User ID Consolidation and UUID (W-032)**: Unified user identification to 'username', deprecated 'loginId'/'userId', and introduced a unique 'uuid' field for immutable user references.
- 🌐 **I18n Module Restructuring (W-031)**: `i18n.js` moved to `webapp/utils/` and translation files renamed (e.g., `lang-en.conf` to `en.conf`), improving project organization and simplifying file management.
- 🌐 **I18n and Logging Consistency (W-029)**: User-facing messages internationalized and controller logs standardized for clarity and consistency.
- 🌐 **I18n Structure Alignment (W-027)**: Language files restructured to match controller and view architecture
- 📁 **Improved Translation Organization**: Translation keys now organized by controller/view structure for better maintainability
- 🔧 **Enhanced Template Integration**: Streamlined handlebars variable processing with restructured language files
- 🏗️ **MVC-Aligned Configuration (W-026)**: Restructured app.conf to match model/controller/view architecture
- 📁 **Enhanced Configuration Organization**: Settings organized by component type for better maintainability
- 🔗 **API-Driven Profile Management**: User profiles now load fresh data from REST API instead of session data

**Latest Updates (v0.4.3):**
- 🎨 **Slide-Down Message System (W-019)**: Complete implementation of non-blocking slide-down messages with smooth animations, dynamic stacking, and comprehensive API renaming for clarity. All `showAlert/showError/showSuccess/showInfo/showWarning` functions renamed to `showSlideDown*` equivalents with enhanced UX.
- 🎨 **View Migration & API Simplification (W-036)**: Complete migration of all 5 view files to jpulse-common utilities with API response simplification and dynamic schema-aware frontend. Eliminated confusing double-wrapped responses, implemented dynamic dropdown population from backend APIs, and enhanced search functionality with proper pagination.
- 🎨 **Component-Based Styling (W-025)**: Complete CSS architecture with `jp-` component library, framework/site separation preparation, and theme system foundation. Moved 290+ lines from templates to external CSS with responsive design and performance optimization.
- ✅ **Enhanced JavaScript Utilities (W-035)**: Complete `jpulse-common.js` framework with 5-phase utility system - alert management, API standardization, form handling, DOM utilities, and device detection. Eliminates 300+ lines of duplicate code across views with 40-50% faster development.
- 🚫 **Error Reporting Without Redirect (W-034)**: Modified `viewController.load` to directly render 404 error pages for UI requests, preserving the URL and enhancing user experience by removing unnecessary redirects.
- 🧪 **ESM Testing Infrastructure (W-033)**: Fixed ECMAScript Modules loading issues, implemented runtime configuration consolidation, and created shared bootstrap architecture for consistent dependency management
- 📊 **Production-Ready Logging**: Standardized logging format across all modules with consistent timestamp and context formatting
- 🎯 **Test Suite Optimization**: Achieved 100% test pass rate with improved test isolation and parallel execution support
- ⚙️ **Configuration Consolidation**: Runtime .conf to .json conversion with timestamp-based caching for optimal performance
- 👤 **User ID Consolidation and UUID (W-032)**: Unified user identification to 'username', deprecated 'loginId'/'userId', and introduced a unique 'uuid' field for immutable user references.
- 🌐 **I18n Module Restructuring (W-031)**: `i18n.js` moved to `webapp/utils/` and translation files renamed (e.g., `lang-en.conf` to `en.conf`), improving project organization and simplifying file management.
- 🌐 **I18n and Logging Consistency (W-029)**: User-facing messages internationalized and controller logs standardized for clarity and consistency.
- 🌐 **I18n Structure Alignment (W-027)**: Language files restructured to match controller and view architecture
- 📁 **Improved Translation Organization**: Translation keys now organized by controller/view structure for better maintainability
- 🔧 **Enhanced Template Integration**: Streamlined handlebars variable processing with restructured language files
- 🏗️ **MVC-Aligned Configuration (W-026)**: Restructured app.conf to match model/controller/view architecture
- 📁 **Enhanced Configuration Organization**: Settings organized by component type for better maintainability
- 🔗 **API-Driven Profile Management**: User profiles now load fresh data from REST API instead of session data

**Latest Releases Highlights:**
- ✅ **View Consolidation & Common Components (W-038)**: Complete separation of common/page-specific code and style with 300+ lines of duplicate CSS eliminated, 15+ reusable components added (.jp-user-*, .jp-btn-group, .jp-action-section), and mature component library established for scalable development.
- ✅ **Complete slide-down message system implementation (W-019)**: Implemented a non-blocking slide-down message system with comprehensive API renaming for clarity and enhanced user experience.
- ✅ **View Migration & API Simplification (W-036)**: Complete migration of all 5 view files to jpulse-common utilities with API response simplification and dynamic schema-aware frontend. Eliminated confusing double-wrapped responses and implemented dynamic dropdown population from backend APIs.
- ✅ **Component-Based Styling (W-025)**: Complete CSS architecture with `jp-` component library, framework/site separation preparation, and theme system foundation. Moved 290+ lines from templates to external CSS with responsive design and performance optimization.
- ✅ **Enhanced JavaScript Utilities (W-035)**: Complete `jpulse-common.js` framework with 5-phase utility system - alert management, API standardization, form handling, DOM utilities, and device detection. Eliminates 300+ lines of duplicate code across views with 40-50% faster development.

________________________________________________
## 🚨 Breaking Changes & Migration Guide

### v0.4.3 - Slide-Down Message System API Renaming

**Breaking Changes:**
All alert/message functions have been renamed for clarity and consistency:

```javascript
// OLD API (deprecated)
jPulseCommon.showAlert(message, type, container, duration)
jPulseCommon.showError(message, container)
jPulseCommon.showSuccess(message, container)
jPulseCommon.showInfo(message, container)
jPulseCommon.showWarning(message, container)
jPulseCommon.clearAlerts(container)

// NEW API (v0.4.3+)
jPulseCommon.showSlideDownMessage(message, type, duration)
jPulseCommon.showSlideDownError(message)
jPulseCommon.showSlideDownSuccess(message)
jPulseCommon.showSlideDownInfo(message)
jPulseCommon.showSlideDownWarning(message)
jPulseCommon.clearSlideDownMessages()
```

**CSS Classes:**
```css
/* OLD classes (deprecated) */
.jp-alert, .jp-alert-show, .jp-alert-hide
.jp-alert-info, .jp-alert-error, .jp-alert-success, .jp-alert-warning

/* NEW classes (v0.4.3+) */
.jp-slide-down, .jp-slide-down-show, .jp-slide-down-hide
.jp-slide-down-info, .jp-slide-down-error, .jp-slide-down-success, .jp-slide-down-warning
```

**Migration Steps:**
1. Replace all `jPulseCommon.show*` function calls with `jPulseCommon.showSlideDown*` equivalents
2. Remove `container` parameters (no longer supported for better UX consistency)
3. Update any custom CSS that references `.jp-alert` classes to use `.jp-slide-down`
4. Test message functionality to ensure proper slide-down animations

**Benefits:**
- Self-documenting API names clearly indicate slide-down behavior
- Consistent UX with all messages appearing in the same location
- Enhanced animations and dynamic stacking
- Simplified API without unused container parameter

________________________________________________
## 🏗️ Architecture Overview

### Core Design Principles
1. **Separation of Concerns**: Clear boundaries between static and dynamic content
2. **Security First**: Path traversal protection, input validation, secure defaults
3. **Performance**: nginx-friendly routing, efficient template processing
4. **Developer Experience**: Natural syntax, comprehensive testing, clear error messages
5. **Maintainability**: Modular structure, comprehensive documentation, consistent patterns

### Technology Stack
- **Backend**: Node.js 18+, Express.js 4.x with ES modules
- **Database**: MongoDB with configurable standalone/replica set support
- **Configuration**: JavaScript-based `.conf` files with dynamic evaluation
- **Templating**: Custom Handlebars implementation with security features
- **Utilities**: CommonUtils framework for data processing and schema-based queries
- **Testing**: Jest with automated cleanup, global setup/teardown, and 337 tests
- **Build Tools**: npm scripts, native ES modules, version management
- **Production**: nginx reverse proxy + PM2 process management
- **User Management**: Complete authentication system with bcrypt and role-based access control
- **Internationalization**: Multi-language support with dot notation access
- **Logging**: Structured logging with MongoDB persistence, search API, and elapsed time tracking
- **Security**: Password hashing, session management, path traversal protection, input validation

________________________________________________
## 🏗️ Application Architecture Details

### Consistency in Messaging and Logging (W-029)

#### Problem Statement
Across various controllers, user-facing messages (both success and error) were often hardcoded and lacked consistent internationalization. Additionally, logging patterns varied, leading to redundant entries or unclear messages, hindering debugging and auditing efforts.

#### Solution Architecture
A standardized approach was implemented to ensure all user-facing messages are internationalized using `i18n.translate()` and that `LogController` entries follow a consistent format and placement.

#### Key Principles
1.  **Internationalization for All User Messages**: All messages returned in `res.json` or through `CommonUtils.sendError` are now translated using `i18n.translate(key, context)`. This ensures multi-language support and simplifies message management.
2.  **Consistent Logging Format**: All `LogController.logInfo()` and `LogController.logError()` messages now adhere to the `<controller>.<method>: <type>: <message>` format (e.g., `config.get: error: id is required`). This improves readability and searchability of logs.
3.  **Log-Message Pairing**: Every user-facing message is immediately preceded by a corresponding `LogController` entry. This provides a clear audit trail in the logs for every response sent to the client.
4.  **Single Log Entry in Catch Blocks**: To avoid redundant logging, `catch` blocks now contain only one initial `LogController.logError` entry at the beginning. Subsequent conditional error responses within the `catch` block (e.g., specific error handling for duplicate keys) are not preceded by additional `LogController` calls.
5.  **No Log Before Throw**: `LogController.logError` calls are *not* placed immediately before `throw new Error` statements in internal helper functions, as the error will be caught and logged by the outer `try...catch` block, preventing duplicate entries.

#### Benefits Achieved
1.  **Enhanced Maintainability**: Easier to manage and update user messages across multiple languages.
2.  **Improved Debugging**: Clear, consistent log entries provide a reliable timeline of events and responses.
3.  **Better User Experience**: Consistent and translated error/success messages for all users.
4.  **Reduced Log Noise**: Eliminates duplicate log entries for errors, making logs more concise.
5.  **Standardized Development**: Enforces a consistent pattern for handling messages and logs across the entire application, improving team collaboration and code quality.

#### Migration Impact
- **Controllers Updated**: `config.js`, `view.js`, `log.js`, `auth.js`, and `user.js` have been updated to reflect these new patterns.
- **Translation Keys**: New translation keys have been added to `lang-en.conf` (and other language files) following a `controller.<controllerName>.<method>.<key>` or `controller.<controllerName>.<key>` pattern.
- **Minimal API Changes**: These changes are primarily internal, affecting message and logging infrastructure without altering existing API endpoint behavior.

### Express Application Bootstrap (W-001)

#### Main Application Structure (`webapp/app.js`)
```javascript
// Configuration loading with dynamic evaluation
async function loadAppConfig() {
    const configPath = path.join(__dirname, 'app.conf');
    const content = fs.readFileSync(configPath, 'utf8');
    const fn = new Function(`return (${content})`);
    return fn(); // Execute JavaScript configuration
}

// Global module availability
global.appConfig = appConfig;
global.i18n = i18n;
global.LogController = LogController;

// Multi-environment startup
const mode = appConfig.deployment.mode; // 'dev' or 'prod'
const port = appConfig.deployment[mode].port;
app.listen(port, () => {
    LogController.logInfo(null, `jPulse Framework WebApp v${appConfig.app.version}`);
    LogController.logInfo(null, `Server running in ${mode} mode on port ${port}`);
});
```

#### Key Architecture Decisions
1. **ES Module First**: Native ES modules with `import/export` syntax
2. **Global Context**: Critical modules available globally for convenience
3. **Dynamic Configuration**: JavaScript evaluation allows complex config logic
4. **Structured Startup**: Ordered module loading with proper error handling
5. **Environment Awareness**: Configuration-driven deployment modes

### Configuration System (W-004)

#### JavaScript-Based Configuration (`webapp/app.conf`)
```javascript
{
    deployment: {
        mode: 'dev',
        dev: { name: 'development', db: 'dev', port: 8080 },
        prod: { name: 'production', db: 'prod', port: 8081 }
    },
    database: {
        mode: 'standalone',
        standalone: {
            url: 'mongodb://localhost:27017/%DB%', // %DB% replaced dynamically
            options: {
                serverSelectionTimeoutMS: 5000,
                maxPoolSize: 10,
                minPoolSize: 1
            }
        }
    },
    login: {
        mode: 'internal', // 'internal', 'ldap', 'oauth2'
        internal: { user: 'fixme', pass: 'fixme' }
    }
}
```

#### Configuration Features
- **Multi-Environment**: Separate dev/prod settings with mode switching
- **Authentication Modes**: Internal, LDAP, OAuth2 authentication support
- **Database Flexibility**: MongoDB standalone or replica set configurations
- **Template Variables**: Dynamic replacement (e.g., `%DB%`, `%SERVERS%`)
- **Security Settings**: Session management, CORS, and middleware configuration

### MVC-Aligned Configuration Structure (W-026)

#### Problem Statement
The original configuration structure was organized by functional areas (login, window, view, log) which didn't align with the framework's MVC architecture. This made it harder to understand which settings belonged to which components and reduced maintainability.

#### Solution Architecture
Restructured `webapp/app.conf` to match the file structure with model, controller, and view components:

**Before (v0.3.0):**
```javascript
{
    login: {
        mode: 'internal',
        passwordPolicy: { minLength: 8 }
    },
    window: {
        maxWidth: 1200,
        minMarginLeftRight: 20
    },
    view: {
        defaultTemplate: 'index.shtml',
        maxIncludeDepth: 10
    },
    log: {
        maxMsgLength: 256
    }
}
```

**After (v0.3.1):**
```javascript
{
    model: {
        user: {
            passwordPolicy: { minLength: 8 }
        }
    },
    controller: {
        auth: {
            mode: 'internal',
            internal: {},
            ldap: { url: 'ldap://localhost:389' },
            oauth2: { clientID: 'fixme' }
        },
        log: {
            maxMsgLength: 256
        },
        view: {
            defaultTemplate: 'index.shtml',
            maxIncludeDepth: 10
        }
    },
    view: {
        maxWidth: 1200,
        minMarginLeftRight: 20
    }
}
```

#### Key Benefits Achieved
1. **MVC Alignment**: Configuration structure now matches `model/`, `controller/`, `view/` directories
2. **Better Organization**: Settings grouped by component type rather than functional area
3. **Enhanced Maintainability**: Easier to find and modify component-specific settings
4. **Clearer Separation**: Authentication settings in `controller.auth`, user policies in `model.user`
5. **Consistent Mental Model**: Developers can predict where settings belong based on MVC structure

#### Migration Impact
- **Tests Updated**: Fixed responsive-layout.test.js and view.test.js to use new structure
- **Backward Compatibility**: No API changes, only internal configuration organization
- **Documentation Updated**: All examples and references updated to new structure
- **Zero Downtime**: Configuration changes are internal, no user-facing impact

#### Implementation Details
The restructure maintains all existing functionality while improving the developer experience:

- `appConfig.controller.auth.mode` replaces `appConfig.login.mode`
- `appConfig.model.user.passwordPolicy` replaces `appConfig.login.passwordPolicy`
- `appConfig.view.maxWidth` replaces `appConfig.window.maxWidth`
- `appConfig.controller.view.defaultTemplate` replaces `appConfig.view.defaultTemplate`
- `appConfig.controller.log.maxMsgLength` replaces `appConfig.log.maxMsgLength`

This change exemplifies the framework's commitment to clean architecture and developer-friendly design patterns.

### Internationalization System (W-002)

#### Problem Statement
The `i18n.js` module, while providing core internationalization functionality, was located directly within the `webapp/translations/` directory, making it less aligned with the `utils/` directory intended for common, non-MVC specific utilities. Additionally, the `lang-` prefix on translation files (e.g., `lang-en.conf`) was verbose and could be simplified.

#### Solution Architecture
The `i18n.js` module has been moved to `webapp/utils/` to centralize common utility logic. Correspondingly, the language files have been renamed to a simpler format (e.g., `en.conf`), and the module's loading logic updated to dynamically discover and parse these new filenames.

#### Key Benefits Achieved
1.  **Improved Project Structure**: `i18n.js` now resides in `webapp/utils/`, clearly identifying it as a shared utility. The `webapp/translations/` directory is now solely focused on holding the language-specific `.conf` data files.
2.  **Simplified File Naming**: Removing the `lang-` prefix from translation files (e.g., `en.conf`) reduces verbosity and improves file management readability.
3.  **Enhanced Maintainability**: A more logical file organization makes it easier for developers to locate and manage i18n-related code and data.
4.  **Dynamic Loading**: The `i18n.js` module automatically adapts to the new file naming convention for translation files, requiring no manual updates when adding new languages.

#### Migration Impact
- **File Move**: `webapp/translations/i18n.js` moved to `webapp/utils/i18n.js`.
- **File Renaming**: `webapp/translations/lang-en.conf` renamed to `webapp/translations/en.conf`, and similar for other language files.
- **Import Paths Updated**: All files importing `i18n.js` (`app.js`, `controller/auth.js`, `controller/config.js`, `controller/user.js`, `controller/view.js`, `tests/helpers/test-utils.js`) have had their import paths adjusted.
- **Loading Logic Updated**: The `loadTranslations` function in `webapp/utils/i18n.js` was updated to recognize the new translation file naming convention (`*.conf`).

#### Translation Engine (`webapp/translations/i18n.js`)
```javascript
// Dynamic translation file loading
const files = [
    path.join(__dirname, 'lang-en.conf'),
    path.join(__dirname, 'lang-de.conf')
];

// Translation lookup with dot notation support
i18n.t = (key, ...args) => {
    const keyParts = key.split('.');
    let text = i18n.langs[i18n.default];

    for(const keyPart of keyParts) {
        if (text && text[keyPart] !== undefined) {
            text = text[keyPart];
        } else {
            return key; // Graceful degradation
        }
    }

    // Note: Variable substitution now handled by two-pass handlebars processing
    return text || key;
};
```

#### Translation Features
- **Dot Notation Access**: Natural `i18n.app.name` syntax in templates
- **Variable Content**: Handlebars-style `{{variable}}` substitution with full context access
- **Two-Pass Processing**: First pass resolves i18n, second pass resolves variables
- **Full Context**: Access to user, config, url, app objects in translations
- **Fallback Handling**: Returns key when translation missing
- **Dynamic Loading**: Automatic `.conf` file discovery and parsing

#### i18n Variable Content System (W-017)

**Implementation Overview:**
The i18n system now supports handlebars-style variable substitution within translation strings, enabling dynamic content like personalized messages.

**Two-Pass Template Processing:**
```javascript
// ViewController.load() - Two handlebars passes
content = await processHandlebars(content, context, path.dirname(fullPath), req, 0);
content = await processHandlebars(content, context, path.dirname(fullPath), req, 0);
```

**Example Usage:**
```javascript
// Translation files (lang-en.conf):
{
  en: {
    login: {
      welcome: 'Welcome back, {{user.firstName}}!',
      greeting: 'Hello {{user.firstName}} {{user.lastName}} ({{user.email}})'
    }
  }
}

// Template usage:
{{i18n.login.welcome}}  // → "Welcome back, John!"

// Processing flow:
// 1st pass: {{i18n.login.welcome}} → 'Welcome back, {{user.firstName}}!'
// 2nd pass: {{user.firstName}} → 'John'
// Result: "Welcome back, John!"
```

**Available Context Variables:**
- `user.*`: firstName, lastName, email, id, authenticated, etc.
- `config.*`: Global configuration values
- `url.*`: domain, pathname, search, params
- `app.*`: version, release information

### Testing Framework (W-003)

#### Jest Configuration with Global Setup
```javascript
// package.json
{
  "jest": {
    "globalSetup": "./webapp/tests/setup/global-setup.js",
    "globalTeardown": "./webapp/tests/setup/global-teardown.js",
    "testEnvironment": "node",
    "transform": {},
    "extensionsToTreatAsEsm": [".js"],
    "globals": {
      "__DEV__": true
    }
  }
}

// Global setup implementation
export default async function globalSetup() {
    console.log('🚀 Jest Global Setup: Starting test environment preparation...');
    await cleanupTempFiles();
    await cleanupTestDatabases();
    console.log('✅ Jest Global Setup: Test environment ready!');
}
```

#### Testing Architecture
- **229+ Tests**: Comprehensive unit and integration test coverage
- **Automated Cleanup**: Global setup/teardown prevents test conflicts
- **Hierarchical Organization**: Tests organized by component type
- **Mock Utilities**: Comprehensive test helpers and fixtures
- **ES Module Support**: Native ES module testing with Jest

### User Authentication & Management (W-011)

#### User Model with Schema Validation (`webapp/model/user.js`)
```javascript
class UserModel {
    // Complete user schema with validation
    static schema = {
        _id: { type: 'objectId', auto: true },
        username: { type: 'string', required: true, unique: true },
        email: { type: 'string', required: true, unique: true, validate: 'email' },
        passwordHash: { type: 'string', required: true },
        profile: {
            firstName: { type: 'string', required: true },
            lastName: { type: 'string', required: true },
            nickName: { type: 'string', default: '' },
            avatar: { type: 'string', default: '' }
        },
        roles: { type: 'array', default: ['user'], enum: ['guest', 'user', 'admin', 'root'] },
        preferences: {
            language: { type: 'string', default: 'en' },
            theme: { type: 'string', default: 'light', enum: ['light', 'dark'] }
        },
        status: { type: 'string', default: 'active', enum: ['active', 'inactive', 'pending', 'suspended'] },
        lastLogin: { type: 'date', default: null },
        loginCount: { type: 'number', default: 0 },
        createdAt: { type: 'date', auto: true },
        updatedAt: { type: 'date', auto: true },
        updatedBy: { type: 'string', default: '' },
        docVersion: { type: 'number', default: 1 },
        saveCount: { type: 'number', default: 1, autoIncrement: true }
    };

    // Password security with bcrypt
    static async hashPassword(password) {
        return await bcrypt.hash(password, 12); // 12 salt rounds
    }

    static async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    // Authentication with security checks
    static async authenticate(identifier, password) {
        let user = await this.findByUsername(identifier) || await this.findByEmail(identifier);
        if (!user || user.status !== 'active') return null;

        const isValid = await this.verifyPassword(password, user.passwordHash);
        if (!isValid) return null;

        // Return user without password hash for security
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // Role-based access control
    static hasRole(user, role) {
        return user && user.roles && user.roles.includes(role);
    }

    static hasAnyRole(user, roles) {
        return user && user.roles && user.roles.some(role => roles.includes(role));
    }
}
```

#### Auth Controller with Middleware & Utilities (`webapp/controller/auth.js`)
```javascript
class AuthController {
    // === MIDDLEWARE FUNCTIONS ===

    // Require authentication middleware
    static requireAuthentication(req, res, next) {
        if (!AuthController.isAuthenticated(req)) {
            return CommonUtils.sendError(req, res, 401, 'Authentication required', 'UNAUTHORIZED');
        }
        next();
    }

    // Require role middleware factory
    static requireRole(roles) {
        return (req, res, next) => {
            if (!AuthController.isAuthenticated(req)) {
                return CommonUtils.sendError(req, res, 401, 'Authentication required', 'UNAUTHORIZED');
            }
            if (!AuthController.isAuthorized(req, roles)) {
                return CommonUtils.sendError(req, res, 403, `Required role: ${roles.join(', ')}`, 'INSUFFICIENT_PRIVILEGES');
            }
            next();
        };
    }

    // === UTILITY FUNCTIONS ===

    // Check authentication status (utility)
    static isAuthenticated(req) {
        return !!(req.session && req.session.user && req.session.user.authenticated);
    }

    // Check authorization with roles (utility)
    static isAuthorized(req, roles) {
        if (!AuthController.isAuthenticated(req)) return false;
        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        return req.session.user.roles.some(userRole => requiredRoles.includes(userRole));
    }

    // === AUTHENTICATION ENDPOINTS ===

    // Login with session creation
    static async login(req, res) {
        const { identifier, password } = req.body;
        const user = await UserModel.authenticate(identifier, password);

        if (user) {
            req.session.user = {
                id: user._id.toString(),
                username: user.username,
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                email: user.email,
                roles: user.roles,
                authenticated: true
            };
            // Update login tracking
            await UserModel.updateById(user._id, {
                lastLogin: new Date(),
                loginCount: (user.loginCount || 0) + 1
            });
        }
    }

    // Logout with session destruction
    static async logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ success: false, error: 'Failed to logout' });
            }
            res.json({ success: true, message: 'Logout successful' });
        });
    }
}
```

#### User Controller (Profile Management) (`webapp/controller/user.js`)
```javascript
class UserController {
    // User search with middleware protection
    static async search(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, `user.search( ${JSON.stringify(req.query)} )`);

        // Authentication and authorization handled by AuthController.requireRole(['admin', 'root']) middleware

        const results = await UserModel.search(req.query);
        const elapsed = Date.now() - startTime;

        LogController.logInfo(req, `user.search completed in ${elapsed}ms`);
        res.json({
            success: true,
            message: `Found ${results.data.length} users`,
            ...results,
            elapsed  // Performance tracking
        });
    }
}
```

#### Route Protection with Middleware (`webapp/routes.js`)
```javascript
import AuthController from './controller/auth.js';
import UserController from './controller/user.js';

// Auth API routes
router.post('/api/1/auth/login', AuthController.login);
router.post('/api/1/auth/logout', AuthController.logout);

// User API routes with middleware protection
router.post('/api/1/user/signup', UserController.signup);
router.get('/api/1/user/profile', AuthController.requireAuthentication, UserController.getProfile);
router.put('/api/1/user/profile', AuthController.requireAuthentication, UserController.updateProfile);
router.put('/api/1/user/password', AuthController.requireAuthentication, UserController.changePassword);
router.get('/api/1/user/search', AuthController.requireRole(['admin', 'root']), UserController.search);

// Log API routes
router.get('/api/1/log/search', AuthController.requireAuthentication, logController.search);
```

#### Session Management with MongoDB Storage (`webapp/app.js`)
```javascript
import MongoStore from 'connect-mongo';

// Persistent session storage
const sessionConfig = {
    ...appConfig.session,
    store: MongoStore.create({
        clientPromise: Promise.resolve(database.getClient()),
        dbName: appConfig.deployment[appConfig.deployment.mode].db,
        collectionName: 'sessions',
        ttl: Math.floor(appConfig.session.cookie.maxAge / 1000) // TTL in seconds
    })
};
app.use(session(sessionConfig));
```

#### User Authentication Features
- **Secure Password Hashing**: bcrypt with 12 salt rounds for maximum security
- **Session Persistence**: MongoDB-backed sessions with automatic TTL expiration
- **Role-Based Access Control**: Simple role system with method-level authorization
- **Password Policy**: Configurable minimum length validation
- **User Search**: Admin-only search with schema-based queries and pagination
- **Profile Management**: Complete profile and password change functionality
- **Login Tracking**: Automatic last login and login count tracking
- **Security**: Password hashes never returned in API responses

### User Views & Registration System (W-012)

#### User Signup Implementation (`webapp/controller/user.js`)
```javascript
// Complete user registration with validation
static async signup(req, res) {
    const { firstName, lastName, username, email, password, confirmPassword, acceptTerms } = req.body;

    LogController.logRequest(req, `user.signup( {"username":"${username}","email":"${email}"} )`);

    try {
        // Validation checks
        if (!firstName || !lastName || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required: firstName, lastName, username, email, password',
                code: 'MISSING_FIELDS'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Passwords do not match',
                code: 'PASSWORD_MISMATCH'
            });
        }

        if (!acceptTerms) {
            return res.status(400).json({
                success: false,
                error: 'You must accept the terms and conditions',
                code: 'TERMS_NOT_ACCEPTED'
            });
        }

        // Create user with structured data
        const userData = {
            username: username,
            email: email,
            password: password,
            profile: {
                firstName: firstName,
                lastName: lastName,
                nickName: '',
                avatar: ''
            },
            roles: ['user'],
            preferences: {
                language: 'en',
                theme: 'light'
            },
            status: 'active'
        };

        const newUser = await UserModel.create(userData);
        LogController.logInfo(req, `User ${username} created successfully`);

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: newUser._id,
                    username: newUser.username,
                    email: newUser.email,
                    firstName: newUser.profile.firstName,
                    lastName: newUser.profile.lastName
                }
            },
            message: 'User account created successfully'
        });

    } catch (error) {
        LogController.logError(req, `user.signup failed: ${error.message}`);

        // Handle specific error types
        if (error.message.includes('Username already exists')) {
            return res.status(409).json({
                success: false,
                error: 'Username already exists. Please choose another.',
                code: 'USERNAME_EXISTS'
            });
        }

        if (error.message.includes('Email address already registered')) {
            return res.status(409).json({
                success: false,
                error: 'Email address already registered. Please sign in instead.',
                code: 'EMAIL_EXISTS'
            });
        }

        if (error.message.includes('Validation failed')) {
            return res.status(400).json({
                success: false,
                error: error.message,
                code: 'VALIDATION_ERROR'
            });
        }

        // Generic server error
        res.status(500).json({
            success: false,
            error: 'Internal server error during signup',
            code: 'INTERNAL_ERROR',
            details: error.message
        });
    }
}
```

#### User Avatar Initials System
```javascript
// Enhanced login with initials calculation
static async login(req, res) {
    // ... existing login logic ...

    // Create session user object with initials
    req.session.user = {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        initials: (user.profile.firstName?.charAt(0) || '?') + (user.profile.lastName?.charAt(0) || ''), // New
        roles: user.roles,
        preferences: user.preferences,
        authenticated: true
    };

    // ... rest of login logic ...
}
```

#### Template Context with User Initials (`webapp/controller/view.js`)
```javascript
// Enhanced template context for all views
const context = {
    url: {
        path: req.path,
        param: req.query
    },
    user: {
        username: req.session?.user?.username || '',
        email: req.session?.user?.email || '',
        firstName: req.session?.user?.firstName || '',
        lastName: req.session?.user?.lastName || '',
        initials: req.session?.user?.initials || '?', // Available in all templates
        roles: req.session?.user?.roles || [],
        authenticated: !!req.session?.user
    },
    i18n: i18n,
    config: appConfig
};
```

#### User Views Architecture
```
webapp/view/
├── auth/                    # Authentication views
│   ├── login.shtml         # Login form with success messages
│   ├── logout.shtml        # Logout confirmation with redirect
│   └── signup.shtml        # Registration form with validation
└── user/                   # User management views
    ├── index.shtml         # User directory and search
    └── profile.shtml       # User profile view/edit
```

#### Comprehensive i18n Support (`webapp/translations/lang-en.conf`)
```javascript
{
    "auth": {
        "login": {
            "title": "Sign In",
            "subtitle": "Welcome back",
            "signupSuccessMessage": "Your {username} account has been created successfully! Please sign in below."
        },
        "signup": {
            "title": "Sign Up",
            "subtitle": "Create your account",
            "firstName": "First Name",
            "lastName": "Last Name",
            "signUp": "Sign Up",
            "signupSuccess": "Account created successfully! Please sign in.",
            "usernameExists": "Username already exists. Please choose another.",
            "emailExists": "Email address already registered. Please sign in instead.",
            "passwordMismatch": "Passwords do not match."
        },
        "logout": {
            "title": "Sign Out",
            "logoutSuccess": "Successfully signed out",
            "sessionEnded": "Your session has ended securely.",
            "redirectingIn": "Redirecting in",
            "seconds": "seconds",
            "home": "Home"
        }
    },
    "errorPage": {
        "title": "Error",
        "message": "Message",
        "goHome": "Go Home",
        "contactSupport": "Contact Support"
    }
}
```

#### Error Handling Strategy (`webapp/utils/common.js`)
```javascript
// Centralized error handling for API vs View requests
static sendError(req, res, statusCode, message, code = null) {
    if (req.path.startsWith('/api/')) {
        // API request - return JSON
        const errorResponse = {
            success: false,
            error: message,
            code: code || 'ERROR'
        };
        return res.status(statusCode).json(errorResponse);
    } else {
        // View request - redirect to error page
        const errorUrl = `/error/index.shtml?msg=${encodeURIComponent(message)}&code=${statusCode}`;
        return res.redirect(errorUrl);
    }
}
```

#### W-012 Features Summary
- **Complete Signup Flow**: Registration form with validation, error handling, and success redirect
- **Enhanced User Views**: Login, logout, signup, profile, and user directory interfaces
- **Avatar Initials System**: Clean user identification with first/last name initials (e.g., "JD" for John Doe)
- **Comprehensive i18n**: Multi-language support for all authentication flows and error messages
- **Proper Error Handling**: Distinguishes between API JSON responses and view redirects
- **User Experience**: Success messages, proper redirects, consistent UI patterns
- **Template Integration**: User context available in all templates with authentication state
- **Responsive Design**: Mobile-friendly authentication interfaces
- **Security**: Form validation, CSRF protection, secure redirects

### Logging Infrastructure (W-005)

#### Structured Logging System (`webapp/controller/log.js`)
```javascript
class LogController {
    // Unified console logging for initial API or page requests
    static logRequest(req, message) {
        const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
        const username = req?.session?.user?.username || '(guest)';
        const clientIp = req?.ip || req?.connection?.remoteAddress || 'unknown';
        const vmId = process.env.VM_ID || '0';
        const pmId = process.env.pm_id || '0';

        const logEntry = `==${timestamp}, ===, ${username}, ip:${clientIp}, vm:${vmId}, id:${pmId}, === ${message}`;
        console.log(logEntry);
    }

    // Unified console logging of informational messages
    static logInfo(req, message) {
        const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
        const username = req?.session?.user?.username || '(guest)';
        const clientIp = req?.ip || req?.connection?.remoteAddress || 'unknown';
        const vmId = process.env.VM_ID || '0';
        const pmId = process.env.pm_id || '0';

        const logEntry = `- ${timestamp}, msg, ${username}, ip:${clientIp}, vm:${vmId}, id:${pmId}, ${message}`;
        console.log(logEntry);
    }

    // Unified error logging of error messages
    static logError(req, message) {
        const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
        const username = req?.session?.user?.username || '(guest)';
        const clientIp = req?.ip || req?.connection?.remoteAddress || 'unknown';
        const vmId = process.env.VM_ID || '0';
        const pmId = process.env.pm_id || '0';

        const logEntry = `- ${timestamp}, ERR, ${username}, ip:${clientIp}, vm:${vmId}, id:${pmId}, ${message}`;
        console.error(logEntry);
    }
}
```

#### Log Search API with Schema-Based Queries and Performance Tracking
```javascript
// MongoDB log search with CommonUtils integration and elapsed time
static async search(req, res) {
    const startTime = Date.now();
    LogController.logRequest(req, `log.search( ${JSON.stringify(req.query)} )`);

    const results = await LogModel.search(req.query);
    const elapsed = Date.now() - startTime;

    LogController.logInfo(req, `log.search completed in ${elapsed}ms`);
    res.json({
        success: true,
        message: `Found ${results.data.length} log entries`,
        ...results,
        elapsed  // Performance monitoring
    });
    // Supports: level, message, createdAt, docType, action, limit, skip
    // Example: /api/1/log/search?level=error&message=database*&createdAt=2025-01
}
```

#### Logging Features
- **Unified Format**: Consistent `<type>.<function> failed:` logging across all controllers
- **Context Awareness**: User, IP, VM, and PM2 instance tracking
- **MongoDB Persistence**: Structured log storage with search capabilities
- **Change Tracking**: Automatic logging of document modifications
- **Performance Monitoring**: Request timing and elapsed time tracking for all search operations
- **Error Consistency**: Standardized error logging format for debugging and monitoring

### Server-Side Template System (W-006)

#### Custom Handlebars Implementation (`webapp/controller/view.js`)
```javascript
// Template processing with security and context
async function processHandlebars(content, context, baseDir, filePath, depth = 0) {
    if (depth > (appConfig?.view?.maxIncludeDepth || 10)) {
        throw new Error(`Maximum include depth exceeded: ${depth}`);
    }

    const regex = /\{\{([^}]+)\}\}/g;
    let result = content;
    let match;

    while ((match = regex.exec(content)) !== null) {
        const expression = match[1].trim();
        const replacement = await evaluateHandlebar(expression, context, baseDir, depth);
        result = result.replace(match[0], replacement);
    }

    return result;
}

// Security-first file inclusion
async function handleFileInclude(filePath, context, baseDir, depth) {
    const cleanPath = filePath.replace(/^["']|["']$/g, '');

    // Security: Prohibit path traversal and absolute paths
    if (cleanPath.includes('../') || cleanPath.includes('..\\') || path.isAbsolute(cleanPath)) {
        throw new Error(`Prohibited path in include: ${cleanPath}`);
    }

    const viewRoot = path.join(process.cwd(), 'webapp', 'view');
    const fullPath = path.join(viewRoot, cleanPath);

    // Double-check resolved path is still within view root
    if (!fullPath.startsWith(viewRoot)) {
        throw new Error(`Path traversal attempt blocked: ${cleanPath}`);
    }

    const includeContent = fs.readFileSync(fullPath, 'utf8');
    return await processHandlebars(includeContent, context, baseDir, fullPath, depth + 1);
}
```

#### Template Context Integration
```javascript
// Rich context object with all framework features
const context = {
    app: {
        version: appConfig.app.version,
        release: appConfig.app.release
    },
    user: {
        id: req.session?.user?.id || '',
        firstName: req.session?.user?.firstName || '',
        lastName: req.session?.user?.lastName || '',
        email: req.session?.user?.email || '',
        authenticated: !!req.session?.user
    },
    appConfig: appConfig,  // Full configuration access
    config: globalConfig?.data || {}, // Site admin configuration
    url: {
        domain: `${req.protocol}://${req.get('host')}`,
        protocol: req.protocol,
        hostname: req.hostname,
        port: req.get('host')?.split(':')[1] || '',
        pathname: req.path,
        search: req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '',
        param: req.query
    },
    i18n: i18n.langs[i18n.default] || {}, // Direct dot notation access
    req: req, // Full request object access
    file: {
        include: (filePath) => handleFileInclude(filePath, context, baseDir, depth),
        timestamp: (filePath) => handleFileTimestamp(filePath, baseDir)
    },
    if: (condition, trueValue, falseValue) => condition ? trueValue : falseValue
};
```

#### Template System Features
- **Security First**: Path traversal protection, include depth limits
- **Rich Context**: Access to app config, user data, translations, URL info
- **Helper Functions**: File operations, conditionals, timestamps
- **Performance**: Efficient regex processing with context reuse
- **Error Handling**: Graceful degradation with clear error messages

________________________________________________
## 🎨 Component-Based Styling Architecture (W-025)

### CSS Organization Strategy

The jPulse Framework uses a three-tier CSS architecture designed for framework/site separation:

#### Framework Core (never overridden)
- Base reset styles and box-sizing
- Core layout system (`.jp-container`, `.jp-main`)
- Responsive breakpoints using `{{appConfig.view.*}}`
- Utility classes (`.jp-hidden`, `.jp-flex-*`, `.jp-gap-*`)

#### Site Customizable (can be overridden)
- Color schemes and theming
- Component styling (buttons, cards, forms)
- Header/footer appearance
- Typography and spacing

#### Theme System (W-037 preparation)
- `.jp-theme-*-light/dark` naming convention
- Aligns with existing user preferences
- Ready for theme switching implementation

### Component Library

**Performance Optimized:**
- External CSS with cache-busting: `jpulse-common.css?t={{file.timestamp}}`
- 290+ lines moved from inline styles to external file
- Browser caching with smart invalidation

**Developer Experience:**
- Consistent `jp-` prefix for all framework components
- Separate classes for clarity (`.jp-btn-primary`, `.jp-btn-secondary`)
- Migration guide provided for view updates

**Framework/Site Separation Ready:**
```css
/* Framework Core - webapp/view/jpulse-common.css */
.jp-container { /* layout system */ }

/* Site Override - site/webapp/view/jpulse-common.css */
.jp-header { background: custom-gradient; }
```

### Migration Patterns

See `docs/dev/W025-MIGRATION-GUIDE.md` for complete migration patterns and component usage examples.

________________________________________________
## 🎯 Major Implementation Milestones

### Hybrid Content Strategy

### Problem Statement
The framework needed a clean way to separate static content (served efficiently by nginx) from dynamic content (processed by the Node.js application) while maintaining a unified URI structure.

### Solution Architecture

#### Routing Precedence (Critical Order)
```javascript
// Express routing order - MUST be maintained
1. API routes: /api/1/*
2. Static /common/ directory (protects 3rd party packages)
3. Dynamic content: *.shtml, *.tmpl, /jpulse-*.js, /jpulse-*.css
4. Root static fallback: / (serves remaining static files)
```

#### File Mapping Strategy
```
webapp/static/*  → URI /         (e.g., robots.txt → /robots.txt)
webapp/view/*    → URI /         (e.g., home/index.shtml → /home/index.shtml)
```

#### nginx Configuration Pattern
```nginx
# API routes → proxy to app
location /api/1/ { proxy_pass http://localhost:8080; }

# Protected static → direct serve
location /common/ { try_files $uri =404; }

# Dynamic templates → proxy to app
location ~* \.(shtml|tmpl)$ { proxy_pass http://localhost:8080; }
location ~ ^/jpulse-.*\.(js|css)$ { proxy_pass http://localhost:8080; }

# Static fallback → direct serve
location / { try_files $uri @app; }
location @app { proxy_pass http://localhost:8080; }
```

### Implementation Benefits Achieved
- ✅ **Performance**: Static files served directly by nginx
- ✅ **Security**: Path traversal protection, controlled file access
- ✅ **Flexibility**: Easy to add new content types
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **SEO Friendly**: Clean URLs without prefixes

### CommonUtils Framework

#### Problem Statement
The framework needed centralized utility functions to avoid code duplication across models and controllers. The `schemaBasedQuery` function in LogModel was identified as the first candidate for extraction, along with other common operations like validation, formatting, and data processing.

#### Solution Architecture

```javascript
// webapp/utils/common.js - Centralized utility functions
class CommonUtils {
    // Schema-based MongoDB query generation
    static schemaBasedQuery(schema, queryParams, ignoreFields = [])

    // Field schema introspection
    static getFieldSchema(schema, fieldPath)

    // Date query building for MongoDB
    static buildDateQuery(value)

    // Object manipulation
    static deepMerge(...objects)
    static formatValue(value)

    // ID generation and validation
    static generateId(prefix = '')
    static isValidEmail(email)
    static sanitizeString(input)
}
```

#### Key Features Implemented
1. **Schema-Based Queries**: Dynamic MongoDB query building from URI parameters
2. **Data Type Conversion**: Automatic string-to-type conversion based on schema
3. **Wildcard Support**: Pattern matching with `*` for partial string matches
4. **Date Range Queries**: Flexible date parsing (YYYY, YYYY-MM, YYYY-MM-DD)
5. **Security**: Input sanitization and validation functions
6. **Performance**: Efficient object merging with circular reference protection

#### Usage Examples
```javascript
// Schema-based query
const query = CommonUtils.schemaBasedQuery(LogModel.schema, {
    level: 'error',
    message: 'database*',
    timestamp: '2025-01'
});
// Returns: { level: 'error', message: /database.*/i, timestamp: { $gte: ... } }

// Email validation
if (CommonUtils.isValidEmail(userEmail)) { /* ... */ }

// String sanitization
const safe = CommonUtils.sanitizeString(userInput);
```

#### Migration Strategy
1. **Phase 1**: Extract functions from LogModel to CommonUtils
2. **Phase 2**: Update LogModel/LogController to use CommonUtils
3. **Phase 3**: Mark original functions as @deprecated
4. **Phase 4**: Remove deprecated functions after verification
5. **Phase 5**: Extend to other models (UserModel, ConfigModel)

#### Testing Implementation
- **51 Unit Tests**: Comprehensive coverage of all utility functions
- **Edge Case Testing**: Invalid inputs, circular references, type conversion
- **Real-World Scenarios**: Integration with actual schema definitions
- **Performance Testing**: Large object merging, complex queries

________________________________________________
## 🎨 Template System Architecture

### {{#if}} Block Handlebars Implementation (W-018)

#### Core Architecture Change
The template system was enhanced to support block-level conditionals with a new single-pass processing approach that handles both block and inline handlebars simultaneously.

#### Combined Regex Processing
```javascript
// webapp/controller/view.js - Single-pass processing
async function processHandlebars(content, context, baseDir, req, depth = 0) {
    // Combined regex matches both {{#if}}...{{/if}} blocks and {{expression}} inline
    const handlebarsRegex = /\{\{#(\w+)\s+([^}]+)\}\}(.*?)\{\{\/\1\}\}|\{\{([^#][^}]*|)\}\}/gs;
    let result = content;
    let match;

    while ((match = handlebarsRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        try {
            let replacement;

            // Check if this is a block handlebar ({{#expression}}...{{/expression}})
            if (match[1] && match[2] && match[3] !== undefined) {
                // Block handlebars: group 1=blockType, group 2=params, group 3=content
                const blockType = match[1];
                const params = match[2].trim();
                const blockContent = match[3];
                replacement = await evaluateBlockHandlebar(blockType, params, blockContent, context, baseDir, req, depth);
            } else if (match[4]) {
                // Regular handlebars: group 4=full expression
                const expression = match[4].trim();
                replacement = await evaluateHandlebar(expression, context, baseDir, depth);
            } else {
                replacement = '';
            }

            result = result.replace(fullMatch, replacement);
        } catch (error) {
            const errorExpression = match[1] ? `#${match[1]} ${match[2]}` : match[4] || 'unknown';
            result = result.replace(fullMatch, `<!-- Error: ${error.message} -->`);
        }
    }

    return result;
}
```

#### Block Handlebar Processing
```javascript
// Block-level conditional processing with recursive content handling
async function handleBlockIf(params, blockContent, context, baseDir, req, depth = 0) {
    const condition = params.trim();
    const conditionValue = getNestedProperty(context, condition);

    // Check if there's an {{else}} block
    const elseMatch = blockContent.match(/^(.*?)\{\{else\}\}(.*?)$/s);

    let contentToProcess;
    if (elseMatch) {
        // Has {{else}} - choose content based on condition
        contentToProcess = conditionValue ? elseMatch[1] : elseMatch[2];
    } else {
        // No {{else}} - only show content if condition is true
        contentToProcess = conditionValue ? blockContent : '';
    }

    // Recursively process any handlebars within the selected content
    if (contentToProcess) {
        return await processHandlebars(contentToProcess, context, baseDir, req, depth + 1);
    }

    return '';
}
```

#### Key Implementation Features
1. **Single-Pass Processing**: Combined regex processes both block and inline handlebars in document order
2. **Recursive Content Processing**: Handlebars within {{#if}} blocks are fully processed
3. **{{else}} Support**: Complete if/else conditional logic with proper content selection
4. **Error Handling**: Comprehensive error reporting for malformed blocks
5. **Extensible Design**: Ready for future block types like {{#each}}
6. **Security**: All existing security features maintained (depth limits, path validation)

#### Syntax Examples
```html
<!-- Simple conditional block -->
{{#if user.authenticated}}
    <p>Welcome back, {{user.firstName}}!</p>
    <div class="user-panel">{{user.email}}</div>
{{/if}}

<!-- If/else conditional block -->
{{#if user.authenticated}}
    <div class="logged-in-content">
        <h2>Dashboard</h2>
        <p>Last login: {{user.lastLogin}}</p>
    </div>
{{else}}
    <div class="guest-content">
        <h2>Welcome, Guest!</h2>
        <p>Please <a href="/auth/login.shtml">sign in</a> to continue.</p>
    </div>
{{/if}}

<!-- Complex nested content -->
{{#if config.messages.broadcast}}
    <div class="alert alert-info">
        <strong>{{i18n.messages.announcement}}</strong>
        <p>{{config.messages.broadcast}}</p>
        {{#if user.authenticated}}
            <small>Shown to: {{user.firstName}} {{user.lastName}}</small>
        {{/if}}
    </div>
{{/if}}
```

### Custom Handlebars Implementation (Legacy)

#### Previous Processing Flow (Pre-W-018)
```javascript
// Old single-expression processing (replaced)
async function processHandlebars(content, context, baseDir, filePath, depth = 0) {
    const regex = /\{\{([^}]+)\}\}/g;
    let result = content;
    let match;

    while ((match = regex.exec(content)) !== null) {
        const expression = match[1].trim();
        const replacement = await evaluateHandlebar(expression, context, baseDir, depth);
        result = result.replace(match[0], replacement);
    }

    return result;
}
```

#### Helper Function Priority (Updated for W-018)
```javascript
// evaluateHandlebar() - Order matters! ({{if}} helper removed in v0.2.7)
switch (helper) {
    case 'file.include':    // FIRST - Security-critical
        return await handleFileInclude(args[0], context, baseDir, depth);
    case 'file.timestamp':  // File operations
        return handleFileTimestamp(args[0], baseDir);
    // NOTE: 'if' case removed - now handled by block handlebars {{#if}}
    case 'i18n':           // Translation function (legacy)
        return handleI18nFunction(args[0], args.slice(1));
    default:
        // Property access LAST (after helper functions)
        if (!helper.includes(' ') && helper.includes('.')) {
            return getNestedProperty(context, helper) || '';
        }
        return '';
}
```

#### Security Implementation
```javascript
// Path traversal protection in handleFileInclude()
const cleanPath = filePath.replace(/^["']|["']$/g, '');

// Security: Prohibit path traversal and absolute paths
if (cleanPath.includes('../') || cleanPath.includes('..\\') || path.isAbsolute(cleanPath)) {
    throw new Error(`Prohibited path in include: ${cleanPath}`);
}

// Always resolve relative to view root
const viewRoot = path.join(process.cwd(), 'webapp', 'view');
const fullPath = path.join(viewRoot, cleanPath);

// Double-check resolved path is still within view root
if (!fullPath.startsWith(viewRoot)) {
    throw new Error(`Path traversal attempt blocked: ${cleanPath}`);
}
```

________________________________________________
## 🌐 Internationalization System

### Architecture Evolution

#### Dot Notation Syntax
```html
{{i18n.app.name}}
{{i18n.header.signin}}
```

### Implementation Details

#### Context Integration
```javascript
// webapp/controller/view.js - Context creation
const context = {
    app: { version: appConfig.app.version, release: appConfig.app.release },
    user: { /* user data */ },
    appConfig: appConfig,  // NEW: Full app.conf access
    config: globalConfig?.data || {},
    url: { /* URL data */ },
    i18n: i18n.langs[i18n.default] || {}, // NEW: Direct object access
    req: req
};
```

#### Translation Lookup Function
```javascript
// webapp/utils/i18n.js
i18n.t = (key, ...args) => {
    const keyParts = key.split('.');
    let text = i18n.langs[i18n.default];

    for(const keyPart of keyParts) {
        if (text && text[keyPart] !== undefined) {
            text = text[keyPart];
        } else {
            return key; // Return key if not found (graceful degradation)
        }
    }

    // Note: Variable substitution now handled by two-pass handlebars processing
    return text || key;
}
```

________________________________________________
## 📱 Responsive Layout System

### Configuration-Driven Approach

#### App Configuration (`webapp/app.conf`)
```conf
window: {
    maxWidth:           1200,    # Content area maximum width
    minMarginLeftRight: 20       # Minimum side margins
}
```

#### CSS Generation Pattern
```css
/* Generated in jpulse-header.tmpl */
.jpulse-container {
    max-width: {{appConfig.window.maxWidth}}px;
    margin: 0 auto;
    padding: 0 {{appConfig.window.minMarginLeftRight}}px;
}

.jpulse-main {
    max-width: {{appConfig.window.maxWidth}}px;
    margin: 20px {{appConfig.window.minMarginLeftRight}}px;
    padding: 30px;
}

.jpulse-header-content {
    max-width: calc({{appConfig.window.maxWidth}}px - {{appConfig.window.minMarginLeftRight}}px * 2);
    padding: 0 30px; /* Match .jpulse-main content padding */
}
```

### Alignment Strategy (Pixel-Perfect)
The header/footer elements must align exactly with the main content's text area:

1. **Content Area Width**: `maxWidth - (minMarginLeftRight * 2)`
2. **Header/Footer Width**: Same as content area width
3. **Padding Matching**: Header/footer padding = main content padding
4. **Responsive Adaptation**: All breakpoints maintain alignment

________________________________________________
## 🧪 Testing Architecture

### Test Structure
```
webapp/tests/
├── setup/              # Test environment management (NEW)
│   ├── global-setup.js    # Pre-test cleanup
│   └── global-teardown.js # Post-test cleanup
├── fixtures/           # Test data and configuration files
├── helpers/            # Test utilities and mock objects
├── integration/        # End-to-end application tests
└── unit/               # Isolated component tests
    ├── config/         # Configuration system tests
    ├── controller/     # Business logic tests
    ├── log/            # Logging functionality tests
    ├── model/          # Data model tests
    ├── utils/          # CommonUtils tests (NEW)
    │   └── i18n/       # i18n system tests (moved from webapp/translations/tests)
    └── translations/   # ONLY .conf file-specific tests
```

### Automated Test Cleanup System (NEW)

#### Global Setup/Teardown Implementation
```javascript
// webapp/tests/setup/global-setup.js
export default async function globalSetup() {
    // Clean up temporary files before tests
    await cleanupTempFiles();
    await cleanupTestDatabases();
}

// webapp/tests/setup/global-teardown.js
export default async function globalTeardown() {
    // Clean up temporary files after tests
    await cleanupTempFiles();
    generateCleanupReport();
}
```

#### Jest Configuration Integration
```json
// package.json
{
  "jest": {
    "globalSetup": "./webapp/tests/setup/global-setup.js",
    "globalTeardown": "./webapp/tests/setup/global-teardown.js"
  }
}
```

#### Benefits Achieved
- ✅ **Prevents Test Conflicts**: Automatic cleanup of temporary files
- ✅ **Consistent Environment**: Clean state for every test run
- ✅ **Debugging Support**: Detailed logging of cleanup operations
- ✅ **Error Resilience**: Cleanup continues even if individual operations fail
- ✅ **Cross-Platform**: Works on all operating systems

### W-018 Testing Implementation

#### {{#if}} Block Handlebars Tests
```javascript
// webapp/tests/unit/controller/view.test.js
describe('Block If Helper Processing', () => {
    test('should process {{#if}} block with true condition', async () => {
        const content = '{{#if user.authenticated}}Welcome back, {{user.firstName}}!{{/if}}';
        const result = await processHandlebarsForTest(content, mockContext);
        expect(result).toBe('Welcome back, John!');
    });

    test('should process {{#if}} with {{else}} - true condition', async () => {
        const content = '{{#if user.authenticated}}Welcome, {{user.firstName}}{{else}}Please sign in{{/if}}';
        const result = await processHandlebarsForTest(content, mockContext);
        expect(result).toBe('Welcome, John');
    });

    test('should handle nested handlebars within {{#if}} blocks', async () => {
        const content = '{{#if url.port}}Server running on port {{url.port}}{{else}}Default port{{/if}}';
        const result = await processHandlebarsForTest(content, mockContext);
        expect(result).toBe('Server running on port 8080');
    });

    test('should handle complex content in {{#if}} blocks', async () => {
        const content = '{{#if user.authenticated}}<div class="user-info">{{user.firstName}} {{user.lastName}} ({{user.email}})</div>{{else}}<div class="guest-info">Guest user</div>{{/if}}';
        const result = await processHandlebarsForTest(content, mockContext);
        expect(result).toBe('<div class="user-info">John Doe (john@test.com)</div>');
    });
});
```

#### Migration Testing Strategy
- **Legacy {{if}} Tests Removed**: All old conditional syntax tests replaced
- **Block Processing Tests**: Comprehensive coverage of {{#if}}...{{/if}} patterns
- **Recursive Processing Tests**: Validation of handlebars within conditional blocks
- **Error Handling Tests**: Malformed block syntax error reporting
- **Integration Tests**: Real-world template scenarios with complex conditions

### Enhanced Test Coverage

#### CommonUtils Tests
```javascript
// webapp/tests/unit/utils/common-utils.test.js (35 tests)
describe('CommonUtils - Schema-Based Query', () => {
    test('should create MongoDB query from schema and params', () => {
        const query = CommonUtils.schemaBasedQuery(schema, {
            name: 'john*',
            age: '25',
            active: 'true'
        });
        expect(query.name).toEqual({ $regex: /john.*/i });
        expect(query.age).toBe(25);
        expect(query.active).toBe(true);
    });
});

// webapp/tests/unit/utils/common-utils-advanced.test.js (16 tests)
describe('CommonUtils - Real-World Integration', () => {
    test('should work with actual Log model schema', () => {
        const query = CommonUtils.schemaBasedQuery(LogModel.schema, {
            level: 'error',
            message: 'database*'
        });
        expect(query.level).toBe('error');
        expect(query.message.$regex.test('database connection failed')).toBe(true);
    });
});
```

#### i18n Dot Notation Tests (`i18n-functions.test.js`)
```javascript
describe('Dot Notation Context Access (New Feature)', () => {
    test('should support direct property access via context object', () => {
        const contextI18n = i18n.langs[i18n.default];
        expect(contextI18n.app.name).toBe('jPulse Framework');
        expect(contextI18n.header.signin).toBe('Sign In');
    });
});
```

#### Responsive Layout Tests (`responsive-layout.test.js`)
```javascript
describe('Responsive Layout Calculations', () => {
    test('should calculate correct CSS values for wide screens', () => {
        const { maxWidth, minMarginLeftRight } = mockAppConfig.window;
        const headerContentMaxWidth = maxWidth - (minMarginLeftRight * 2);
        expect(headerContentMaxWidth).toBe(1160); // 1200 - (20 * 2)
    });
});
```

#### Template Includes Tests (`template-includes.test.js`)
```javascript
describe('Security and Error Handling', () => {
    test('should prevent path traversal attacks', () => {
        const dangerousPaths = ['../../../etc/passwd', 'C:\\Windows\\System32'];
        dangerousPaths.forEach(dangerousPath => {
            const isUnsafe = dangerousPath.includes('../') ||
                           path.isAbsolute(dangerousPath);
            expect(isUnsafe).toBe(true);
        });
    });
});
```

### Test Execution Strategy
```bash
# Run all tests (230+ tests with automated cleanup)
npm test

# Run specific test categories
npm test -- --testPathPattern="utils"         # CommonUtils tests (NEW)
npm test -- --testPathPattern="i18n"          # Translation tests
npm test -- --testPathPattern="responsive"    # Layout tests
npm test -- --testPathPattern="template"      # Template tests
npm test -- --testPathPattern="integration"   # End-to-end tests

# Run with coverage
npm test -- --coverage

# Test execution shows automated cleanup:
# 🚀 Jest Global Setup: Starting test environment preparation...
# 🧹 Cleaning up 15 temporary test files...
# ✅ Jest Global Setup: Test environment ready!
# [tests run...]
# 🧽 Jest Global Teardown: Starting post-test cleanup...
# ✨ Post-test cleanup: No temporary files to clean
# ✅ Jest Global Teardown: Cleanup completed successfully!
```

________________________________________________
## 🔧 Development Workflow

### Code Organization Patterns

#### Controller Structure
```javascript
// webapp/controller/view.js
export default {
    async load(req, res) {
        // 1. Determine file path and validate
        // 2. Read template content
        // 3. Build handlebars context
        // 4. Process handlebars expressions
        // 5. Return processed content
    }
};
```

#### Path Resolution Best Practices
```javascript
// Always use path.join() for cross-platform compatibility
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct path resolution
const configPath = path.join(__dirname, 'app.conf');
const staticPath = path.join(__dirname, 'static');
```

### Security Implementation

#### Input Validation
```javascript
// Path sanitization
function sanitizePath(inputPath) {
    const cleaned = inputPath.replace(/^["']|["']$/g, '');
    if (cleaned.includes('../') || cleaned.includes('..\\')) {
        throw new Error('Path traversal attempt detected');
    }
    if (path.isAbsolute(cleaned)) {
        throw new Error('Absolute paths not allowed');
    }
    return cleaned;
}
```

#### Template Security
- **Include Depth**: Maximum 10 levels prevents DoS
- **File Extension**: Whitelist approach for includes
- **View Root Jail**: All includes resolved within `webapp/view/`
- **Error Sanitization**: Stack traces filtered in production

### API-Driven Profile Management (W-021, W-022)

#### Core Architecture Changes

**Problem Statement:**
The user profile view was loading data from session storage instead of fresh database data, and profile updates weren't properly incrementing the saveCount field for version tracking. Additionally, user language preferences were scattered across different controllers.

#### Implementation Overview

**1. Enhanced UserModel.updateById() Method**
```javascript
// webapp/model/user.js - Fixed saveCount increment
static async updateById(id, data) {
    try {
        // Validate data for update
        this.validate(data, true);

        // Get current document to increment saveCount
        const current = await this.findById(id);
        if (!current) {
            return null;
        }

        // Prepare data for save
        const updateData = await this.prepareSaveData(data, true);
        updateData.saveCount = (current.saveCount || 0) + 1; // KEY FIX

        // Update in database
        const collection = this.getCollection();
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        return await this.findById(id);
    } catch (error) {
        throw new Error(`Failed to update user: ${error.message}`);
    }
}
```

**2. AuthController Language Helper Functions**
```javascript
// webapp/controller/auth.js - Centralized language handling
static getUserLanguage(req, defaultLang = null) {
    let fallback = defaultLang || 'en';
    try {
        if (typeof global !== 'undefined' && global.i18n) {
            fallback = defaultLang || global.i18n.default;
        }
    } catch (error) {
        // Fallback to 'en' if i18n is not available
    }

    // Return user's preferred language or fallback
    return req.session?.user?.preferences?.language || fallback;
}

static updateUserSession(req, userData) {
    if (req.session?.user && userData) {
        // Update session with fresh data
        if (userData.profile) {
            if (userData.profile.firstName) req.session.user.firstName = userData.profile.firstName;
            if (userData.profile.lastName) req.session.user.lastName = userData.profile.lastName;
            if (userData.profile.nickName !== undefined) req.session.user.nickName = userData.profile.nickName;
            req.session.user.initials = (userData.profile.firstName?.charAt(0) || '?') + (userData.profile.lastName?.charAt(0) || '');
        }
        if (userData.preferences) {
            req.session.user.preferences = { ...req.session.user.preferences, ...userData.preferences };
        }
    }
}
```

**3. API-Driven Profile View**
```javascript
// webapp/view/user/profile.shtml - Dynamic data loading
async function loadProfileData() {
    try {
        const response = await fetch('/api/1/user/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const result = await response.json();
            const user = result.data;

            // Update profile header
            const initials = (user.profile?.firstName?.charAt(0) || '?') + (user.profile?.lastName?.charAt(0) || '');
            document.querySelector('.profile-avatar').textContent = initials;
            document.querySelector('.profile-info h1').textContent = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`;

            // Update form fields with fresh API data
            document.getElementById('firstName').value = user.profile?.firstName || '';
            document.getElementById('lastName').value = user.profile?.lastName || '';
            document.getElementById('nickName').value = user.profile?.nickName || '';
            document.getElementById('email').value = user.email || '';

            // Update preferences
            document.getElementById('language').value = user.preferences?.language || 'en';
            document.getElementById('theme').value = user.preferences?.theme || 'light';
        }
    } catch (error) {
        showAlert('Network error while loading profile: ' + error.message, 'error');
    }
}

// Load fresh data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadProfileData();
});
```

**4. Enhanced Profile Update Flow**
```javascript
// Proper data structure for API updates
async function saveProfile() {
    const formData = {
        profile: {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            nickName: document.getElementById('nickName').value
        },
        preferences: {
            language: document.getElementById('language').value,
            theme: document.getElementById('theme').value
        }
    };

    try {
        const response = await fetch('/api/1/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showAlert('Profile updated successfully!', 'success');
            editMode = false;
            cancelEdit();
            // Reload fresh data from API instead of page reload
            await loadProfileData();
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    }
}
```

#### Key Benefits Achieved

1. **Data Consistency**: Profile views now display fresh database data instead of potentially stale session data
2. **Version Tracking**: saveCount properly increments with each update (1 → 2 → 3 → 4)
3. **Better Architecture**: Centralized language preference handling in AuthController
4. **Enhanced UX**: Real-time profile updates without page reloads
5. **API-First**: Profile management now uses REST API endpoints consistently
6. **Session Synchronization**: Session data updated when profile changes occur

#### Testing Results

- **API Endpoint Testing**: Confirmed GET/PUT `/api/1/user/profile` work correctly
- **SaveCount Verification**: Tested incremental updates (1→2→3→4)
- **Profile View Testing**: Verified dynamic data loading and form population
- **Regression Testing**: All 337 tests pass, no existing functionality broken
- **Integration Testing**: Complete signup → login → profile update → logout flow

________________________________________________
## 🚀 Performance Considerations

### Template Processing Optimization
- **Regex Compilation**: Handlebars regex compiled once, reused
- **Context Reuse**: User context cached per request
- **Include Caching**: Consider implementing file content caching
- **Depth Limiting**: Prevents infinite recursion performance issues

### Static Content Strategy
- **nginx Direct Serving**: Static files bypass Node.js entirely
- **Gzip Compression**: Enable in nginx for text assets
- **Cache Headers**: Set appropriate cache policies
- **CDN Integration**: Static assets can be CDN-served

________________________________________________
## 📚 Key Implementation Insights

### CommonUtils Lessons Learned

#### What Worked Well
1. **Incremental Extraction**: Moving functions one at a time with comprehensive testing
2. **Deprecation Strategy**: Marking old functions as @deprecated before removal
3. **Named Exports**: Providing both default and named export patterns
4. **Comprehensive Testing**: 51 tests caught edge cases early
5. **Real-World Integration**: Testing with actual model schemas

#### Challenges Overcome
1. **Circular Reference Handling**: Implemented WeakSet-based protection in deepMerge
2. **Date Parsing Edge Cases**: Robust handling of invalid date formats
3. **Type Conversion Logic**: Proper string-to-type conversion based on schema
4. **Test Isolation**: Ensuring CommonUtils tests don't interfere with existing tests
5. **Migration Coordination**: Updating multiple files while maintaining functionality

#### Best Practices Established
1. **Utility-First Architecture**: Centralized functions prevent code duplication
2. **Schema-Driven Development**: Using data schemas to drive query generation
3. **Comprehensive Edge Case Testing**: Invalid inputs, boundary conditions, error states
4. **Clean Migration Paths**: Deprecation → Testing → Removal workflow
5. **Documentation Excellence**: JSDoc comments with examples for all functions

### Hybrid Content Strategy Lessons Learned

### What Worked Well
1. **Incremental Development**: Building features step-by-step with testing
2. **Security First**: Path traversal protection from day one
3. **User Feedback**: Iterative UI refinement based on screenshots
4. **Comprehensive Testing**: 178+ tests caught issues early
5. **Documentation**: Clear requirements tracking in `requirements.md`

### Challenges Overcome
1. **Path Resolution**: Cross-platform compatibility with `__dirname`
2. **Template Logic**: Proper helper function vs property access precedence
3. **Responsive Alignment**: Pixel-perfect header/footer alignment
4. **i18n Evolution**: Smooth transition from function to dot notation
5. **nginx Integration**: Complex routing rules for hybrid content

### Best Practices Established
1. **Security by Design**: All file operations validated and constrained
2. **Configuration Driven**: Layout and behavior controlled by `app.conf`
3. **Test Coverage**: Every new feature gets comprehensive tests (230+ total)
4. **Error Handling**: Graceful degradation for missing translations/files
5. **Performance Awareness**: Static/dynamic separation for optimal serving
6. **Automated Test Management**: Global setup/teardown prevents conflicts
7. **Utility-First Development**: CommonUtils pattern for reusable functions
8. **Template Evolution**: {{#if}} blocks provide more powerful conditional rendering than legacy {{if}} syntax

---

**jPulse Framework** - Architecture built for scale, security, and developer happiness. 🚀
