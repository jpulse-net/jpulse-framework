# jPulse Framework / Developer Documentation v0.2.2

Technical documentation for developers working on the jPulse Framework. This document covers architecture decisions, implementation details, and development workflows.

**Latest Updates (v0.2.1):**
- 🛠️ **CommonUtils Framework**: Centralized utility functions with comprehensive testing
- 🧪 **Automated Test Cleanup**: Jest global setup/teardown system
- 📊 **Enhanced Test Coverage**: 229+ tests with 100% reliability

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
- **Testing**: Jest with automated cleanup, global setup/teardown, and 229+ tests
- **Build Tools**: npm scripts, native ES modules, version management
- **Production**: nginx reverse proxy + PM2 process management
- **Internationalization**: Multi-language support with dot notation access
- **Logging**: Structured logging with MongoDB persistence and search API
- **Security**: Path traversal protection, input validation, session management

## 🏗️ Application Architecture Details

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
    LogController.console(null, `jPulse Framework WebApp v${appConfig.app.version}`);
    LogController.console(null, `Server running in ${mode} mode on port ${port}`);
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

### Internationalization System (W-002)

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

    // Parameter substitution: {0}, {1}, etc.
    if(args.length > 0 && text) {
        text = text.replace(/{(\d+)}/g, (match, p1) => args[p1]);
    }

    return text || key;
};
```

#### Translation Features
- **Dot Notation Access**: Natural `i18n.app.name` syntax in templates
- **Parameter Substitution**: Support for `{0}`, `{1}` parameter replacement in translation files
- **Fallback Handling**: Returns key when translation missing
- **Dynamic Loading**: Automatic `.conf` file discovery and parsing

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

### Logging Infrastructure (W-005)

#### Structured Logging System (`webapp/controller/log.js`)
```javascript
class LogController {
    // Unified console logging format
    static console(req, message) {
        const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
        const loginId = req?.session?.user?.loginId || '(guest)';
        const clientIp = req?.ip || req?.connection?.remoteAddress || 'unknown';
        const vmId = process.env.VM_ID || '0';
        const pmId = process.env.pm_id || '0';

        const logEntry = `- ${timestamp}, msg, ${loginId}, ip:${clientIp}, vm:${vmId}, id:${pmId}, ${message}`;
        console.log(logEntry);
    }

    // API-specific logging with enhanced format
    static consoleApi(req, message) {
        const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
        const loginId = req?.session?.user?.loginId || '(guest)';
        const clientIp = req?.ip || req?.connection?.remoteAddress || 'unknown';
        const vmId = process.env.VM_ID || '0';
        const pmId = process.env.pm_id || '0';

        const logEntry = `==${timestamp}, ===, ${loginId}, ip:${clientIp}, vm:${vmId}, id:${pmId}, === ${message}`;
        console.log(logEntry);
    }

    // Error logging with stack traces
    static error(req, message) {
        const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
        const loginId = req?.session?.user?.loginId || '(guest)';
        const clientIp = req?.ip || req?.connection?.remoteAddress || 'unknown';
        const vmId = process.env.VM_ID || '0';
        const pmId = process.env.pm_id || '0';

        const logEntry = `- ${timestamp}, ERR, ${loginId}, ip:${clientIp}, vm:${vmId}, id:${pmId}, ${message}`;
        console.error(logEntry);
    }
}
```

#### Log Search API with Schema-Based Queries
```javascript
// MongoDB log search with CommonUtils integration
static async search(req, res) {
    const results = await LogModel.search(req.query);
    // Supports: level, message, createdAt, docType, action, limit, skip
    // Example: /api/1/log/search?level=error&message=database*&createdAt=2025-01
}
```

#### Logging Features
- **Unified Format**: Consistent logging across all controllers
- **Context Awareness**: User, IP, VM, and PM2 instance tracking
- **MongoDB Persistence**: Structured log storage with search capabilities
- **Change Tracking**: Automatic logging of document modifications
- **Performance Monitoring**: Request timing and error tracking

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

## 🎨 Template System Architecture

### Custom Handlebars Implementation

#### Core Processing Flow
```javascript
// webapp/controller/view.js
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

#### Helper Function Priority (Critical)
```javascript
// evaluateHandlebar() - Order matters!
switch (helper) {
    case 'file.include':    // FIRST - Security-critical
        return await handleFileInclude(args[0], context, baseDir, depth);
    case 'file.timestamp':  // File operations
        return handleFileTimestamp(args[0], baseDir);
    case 'if':             // Conditional logic
        return handleConditional(args, context);
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
// webapp/translations/i18n.js
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

    // Parameter substitution: {0}, {1}, etc.
    if(args.length > 0 && text) {
        text = text.replace(/{(\d+)}/g, (match, p1) => args[p1]);
    }

    return text || key;
}
```

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

## 🧪 Testing Architecture

### Test Structure
```
webapp/tests/
├── setup/             # Test environment management (NEW)
│   ├── global-setup.js    # Pre-test cleanup
│   └── global-teardown.js # Post-test cleanup
├── fixtures/          # Test data and configuration files
├── helpers/           # Test utilities and mock objects
├── integration/       # End-to-end application tests
└── unit/             # Isolated component tests
    ├── config/       # Configuration system tests
    ├── controller/   # Business logic tests
    ├── log/          # Logging functionality tests
    ├── model/        # Data model tests
    ├── utils/        # CommonUtils tests (NEW)
    └── translations/ # i18n system tests
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
# Run all tests (229+ tests with automated cleanup)
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
3. **Test Coverage**: Every new feature gets comprehensive tests (229+ total)
4. **Error Handling**: Graceful degradation for missing translations/files
5. **Performance Awareness**: Static/dynamic separation for optimal serving
6. **Automated Test Management**: Global setup/teardown prevents conflicts
7. **Utility-First Development**: CommonUtils pattern for reusable functions

---

**jPulse Framework** - Architecture built for scale, security, and developer happiness. 🚀
