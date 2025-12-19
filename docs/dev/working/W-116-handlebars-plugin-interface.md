# W-116: Handlebars: Plugin Interface for Helpers

## Status
✅ DONE

## Overview

Enable site developers and plugin developers to define custom Handlebars helpers using auto-discovery pattern consistent with existing plugin architecture (API endpoints, hooks).

## Design Decisions

### 1. Auto-Discovery Pattern
- **Location**: `webapp/controller/*.js` (same as API endpoints and hooks)
- **Naming Convention**: Methods starting with `handlebar*` are auto-discovered
- **Consistency**: Follows existing `on*` (hooks) and `api*` (endpoints) patterns

### 2. Unified Interface
- **Regular helpers**: `(args, context)` - 2 parameters
- **Block helpers**: `(args, blockContent, context)` - 3 parameters
- **Auto-detection**: Function signature determines helper type (`function.length`)

### 3. Consistent Argument Structure
- Both regular and block helpers receive `args` (parsed and evaluated)
- Subexpressions are already expanded (consistency)
- Same structure as regular helpers: `{ _helper, _target, _args[], key=value pairs }`

### 4. Internal Utilities Access
- Framework utilities available via `context._handlebar.*`
- Includes: `req`, `depth`, `expandHandlebars`, `parseAndEvaluateArguments`, `getNestedProperty`, `setNestedProperty`, `evaluateCondition`

### 5. Auto-Documentation with JSDoc
- Helpers are automatically documented when JSDoc comments include `@description` and `@example` tags
- Framework extracts these tags during helper registration
- Documentation is automatically included in helper lists via dynamic content generation
- Examples should show actual template syntax (e.g., `{{uppercase "text"}}`)

## Implementation Plan

### Phase 1: Refactor Existing Helpers

#### 1.1 Refactor Regular Helpers
**Goal**: Change signature from `(expression, context)` to `(args, context)`

**Files to modify**:
- `_handleLet()` - currently receives expression string
- All other regular helpers that receive raw expression

**Changes**:
```javascript
// Before:
async function _handleLet(expression, currentContext) {
    const parsedArgs = await _parseAndEvaluateArguments(expression, currentContext);
    // ...
}

// After:
async function _handleLet(args, currentContext) {
    // args already parsed
    // ...
}
```

#### 1.2 Refactor Block Helpers
**Goal**: Change signature from `(params, blockContent, context)` to `(args, blockContent, context)`

**Files to modify**:
- `_handleBlockIf()` - currently receives params string
- `_handleBlockUnless()` - currently receives params string
- `_handleBlockEach()` - currently receives params string, sometimes parses
- `_handleWithBlock()` - currently receives params string
- `_handleLetBlock()` - currently receives params string, parses it
- `_handleComponentDefinition()` - currently receives params string
- `_handleLogicalBlockHelper()` - currently receives params string

**Changes**:
```javascript
// Before:
async function _handleBlockEach(params, blockContent, currentContext) {
    let items = _getNestedProperty(currentContext, params.trim());
    if (params.trim().startsWith('file.list ')) {
        const parsedArgs = _parseAndEvaluateArguments(params.trim(), currentContext);
        // ...
    }
}

// After:
async function _handleBlockEach(args, blockContent, currentContext) {
    // Check if it's a file.list call (already parsed)
    if (args._helper === 'file.list') {
        const listResult = _handleFileList(args, currentContext);
        items = JSON.parse(listResult);
    } else {
        const propertyPath = args._target || args._args?.[0] || '';
        items = _getNestedProperty(currentContext, propertyPath);
    }
}
```

#### 1.3 Update Helper Invocation
**In `_evaluateRegularHandlebar()`**:
- Parse args first (already done)
- Pass `parsedArgs` to all helpers (instead of expression string)

**In `_evaluateBlockHandlebar()`**:
- Parse block params first
- Pass `parsedArgs` to all block helpers (instead of params string)

#### 1.4 Test Refactored HandlebarController
- `npm test` should pass
- manual verification of website should pass

### Phase 2: Add Helper Registry

#### 2.1 Add Registry Property
```javascript
class HandlebarController {
    // Single registry: name → { handler, type, source, registeredAt }
    static helperRegistry = new Map();
}
```

#### 2.2 Add Registration Method
```javascript
static registerHelper(name, handler, options = {}) {
    // Validate handler is a function
    if (typeof handler !== 'function') {
        throw new Error(`Helper "${name}" handler must be a function`);
    }
    
    const paramCount = handler.length;
    
    // Strict validation: exactly 2 params for regular, exactly 3 for block
    // Expected signatures:
    //   Regular: (args: object, context: object) => string
    //   Block: (args: object, blockContent: string, context: object) => string
    let type = null;
    if (paramCount === 2) {
        type = 'regular';
    } else if (paramCount === 3) {
        type = 'block';
    } else {
        throw new Error(
            `Helper "${name}" has invalid parameter count: ${paramCount}. ` +
            `Expected 2 for regular helper (args, context) or 3 for block helper (args, blockContent, context)`
        );
    }
    
    // Store handler and metadata together in single entry
    this.helperRegistry.set(name, {
        handler: handler,
        type: type,
        source: options.source || 'unknown',
        registeredAt: new Date().toISOString()
    });
    
    // Add to appropriate list (keep registration order, sort in getMetrics)
    if (type === 'block' && !this.BLOCK_HANDLEBARS.includes(name)) {
        this.BLOCK_HANDLEBARS.push(name);
    }
    if (!this.REGULAR_HANDLEBARS.includes(name)) {
        this.REGULAR_HANDLEBARS.push(name);
    }
}
```

### Phase 3: Auto-Discovery Implementation

#### 3.1 Discover Helpers from Controllers

**JSDoc Extraction**: During helper registration, the framework automatically extracts `@description` and `@example` tags from JSDoc comments:

```javascript
static async _registerHelpersFromFile(filePath, source, pathToFileURL) {
    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Discover handlebar* methods
    for (const methodName of handlebarMethods) {
        // Extract JSDoc
        const jsdoc = this._extractJSDoc(fileContent, methodName);
        
        // Register helper with metadata
        this.registerHelper(helperName, handler, {
            source: source,
            description: jsdoc.description,
            example: jsdoc.example
        });
    }
}

static _extractJSDoc(fileContent, methodName) {
    // Find JSDoc comment before method
    // Extract @description tag (multiline support)
    // Extract @example tag (stops at next @tag or end of comment)
    // Strip JSDoc line prefixes (*) from description
    // Return { description, example }
}
```

**JSDoc Format**:
```javascript
/**
 * Helper description (optional summary line)
 * @description Detailed description of what the helper does (multiline supported)
 * @example {{helperName arg1="value" arg2="value"}}
 * @param {object} args - Parsed arguments
 * @param {object} context - Template context
 * @returns {string} Result description
 */
static handlebarHelperName(args, context) {
    // Implementation
}
```

**Extraction Rules**:
- `@description`: Extracted until next `@tag`, `*/`, or end of comment
- `@example`: Extracted until next `@tag` (after newline and `*`), `*/`, or end of comment
- JSDoc line prefixes (`*`) are stripped from description lines
- Both are stored in `HANDLEBARS_DESCRIPTIONS` for dynamic documentation generation
**Location**: After `SiteControllerRegistry.initialize()` in bootstrap

```javascript
// In HandlebarController.initialize() or after controller registration
if (global.SiteControllerRegistry && global.SiteControllerRegistry.registry) {
    for (const [registryKey, controllerInfo] of global.SiteControllerRegistry.registry.controllers) {
        try {
            const Controller = await SiteControllerRegistry._loadController(controllerInfo.name);
            
            // Discover handlebar* methods
            const methodNames = Object.getOwnPropertyNames(Controller)
                .filter(name => {
                    return name.startsWith('handlebar') &&
                           typeof Controller[name] === 'function' &&
                           name !== 'handlebar'; // Exclude base name
                });

            // Register each method
            for (const methodName of methodNames) {
                const handler = Controller[methodName];
                const helperName = methodName.replace(/^handlebar/, '');
                const helperNameFinal = helperName.charAt(0).toLowerCase() + helperName.slice(1);
                
                HandlebarController.registerHelper(helperNameFinal, handler, {
                    source: controllerInfo.source
                });
            }
        } catch (error) {
            LogController.logError(null, 'handlebar.initialize', 
                `Failed to discover helpers from ${controllerInfo.name}: ${error.message}`);
        }
    }
}
```

#### 3.2 Update Helper Invocation
**In `_evaluateRegularHandlebar()`**:
```javascript
async function _evaluateRegularHandlebar(expression, currentContext) {
    const parsedArgs = await _parseAndEvaluateArguments(expression, currentContext);
    const helper = parsedArgs._helper;

    // Check registered helpers first
    if (self.helperRegistry.has(helper)) {
        const registryEntry = self.helperRegistry.get(helper);
        
        if (registryEntry.type === 'regular') {
            const result = await registryEntry.handler(parsedArgs, currentContext);
            return result !== undefined ? String(result) : '';
        }
    }

    // Then check built-in helpers (existing switch)
    switch (helper) {
        // ... existing cases
    }
}
```

**In `_evaluateBlockHandlebar()`**:
```javascript
async function _evaluateBlockHandlebar(blockType, params, blockContent, currentContext) {
    // Parse params first
    const parsedArgs = await _parseAndEvaluateArguments(`${blockType} ${params}`, currentContext);
    
    // Check registered helpers first
    if (self.helperRegistry.has(blockType)) {
        const registryEntry = self.helperRegistry.get(blockType);
        
        if (registryEntry.type === 'block') {
            return await registryEntry.handler(parsedArgs, blockContent, currentContext);
        }
    }
    
    // Then check built-in helpers (existing switch)
    switch (blockType) {
        // ... existing cases, all refactored to use parsedArgs
    }
}
```

### Phase 4: Add Internal Utilities to Context

#### 4.1 Add `_handlebar` Namespace
**In `_buildInternalContext()` or `_expandHandlebars()`**:
```javascript
const baseContext = {
    // ... existing template data ...
    vars: {},
    // Internal handlebars framework utilities
    _handlebar: {
        req: req,
        depth: depth,
        expandHandlebars: (template, additionalContext = {}) => {
            return self._expandHandlebars(req, template, additionalContext, depth + 1);
        },
        parseAndEvaluateArguments: (expression, ctx) => {
            return _parseAndEvaluateArguments(expression, ctx);
        },
        getNestedProperty: (obj, path) => {
            return _getNestedProperty(obj, path);
        },
        setNestedProperty: (obj, path, value) => {
            return _setNestedProperty(obj, path, value);
        },
        evaluateCondition: (params, ctx) => {
            return _evaluateCondition(params, ctx);
        }
    }
};
```

#### 4.2 Filter Out Internal Data
**In `_filterContext()`**:
```javascript
static _filterContext(context, isAuthenticated) {
    const filtered = JSON.parse(JSON.stringify(context));
    // ... existing filtering ...
    
    // Remove internal handlebars framework data
    delete filtered._handlebar;
    
    return filtered;
}
```

#### 4.3 Update getMetrics() to Sort Arrays
**In `getMetrics()`**:
```javascript
static getMetrics() {
    // ... existing code ...
    
    return {
        // ... existing fields ...
        stats: {
            // ... existing stats ...
            regularHandlebars: HandlebarController.REGULAR_HANDLEBARS.length,
            regularHandlebarsList: [...HandlebarController.REGULAR_HANDLEBARS].sort(), // Sorted for consistent output
            blockHandlebars: HandlebarController.BLOCK_HANDLEBARS.length,
            blockHandlebarsList: [...HandlebarController.BLOCK_HANDLEBARS].sort(), // Sorted for consistent output
            // ... rest of stats ...
        }
    };
}
```

**Note**: Arrays are sorted on the usage side (in getMetrics), not in the source arrays, to maintain registration order while providing sorted output for metrics.

### Phase 5: Testing

#### 5.1 Unit Tests
- Test helper registration
- Test auto-discovery from controllers
- Test regular helper invocation
- Test block helper invocation
- Test internal utilities access

#### 5.2 Integration Tests
- Test plugin helper registration
- Test site helper registration
- Test helper priority (framework → site → plugins)
- Test helper with subexpressions

## API Reference

### Helper Method Signatures

#### Regular Helper
```javascript
static helperName(args, context) {
    // args: { _helper, _target, _args[], key=value pairs }
    // context: Template context with _handlebar utilities
    return 'result';
}
```

#### Block Helper
```javascript
static async handlebarRepeat(args, blockContent, context) {
    // args: { _helper, _target, _args[], key=value pairs }
    // blockContent: String content between {{#helper}}...{{/helper}}
    // context: Template context with _handlebar utilities
    return 'result';
}
```

### Args Structure
```javascript
{
    _helper: 'helperName',        // Helper name
    _target: 'firstArg',          // First positional argument
    _args: ['arg1', 'arg2'],      // All positional arguments as array
    key1: 'value1',               // Named parameters (key=value pairs)
    key2: 'value2'
}
```

### Context._handlebar Utilities
```javascript
context._handlebar = {
    req: ExpressRequest,          // Request object
    depth: number,                // Current recursion depth
    expandHandlebars: Function,   // Expand nested handlebars
    parseAndEvaluateArguments: Function,  // Parse expression
    getNestedProperty: Function,   // Get nested property
    setNestedProperty: Function,  // Set nested property
    evaluateCondition: Function   // Evaluate condition
}
```

## Examples

### Plugin Helper Example
```javascript
// plugins/my-plugin/webapp/controller/myPlugin.js
class MyPluginController {
    // Regular helper: {{uppercase text}}
    static handlebarUppercase(args, context) {
        const text = args._target || args._args?.[0] || '';
        return String(text).toUpperCase();
    }

    // Block helper: {{#repeat count}}...{{/repeat}}
    static async handlebarRepeat(args, blockContent, context) {
        const { expandHandlebars } = context._handlebar;
        const count = parseInt(args.count || args._target) || 0;
        
        let result = '';
        for (let i = 0; i < count; i++) {
            const iterationContext = { ...context };
            iterationContext['@index'] = i;
            result += await expandHandlebars(blockContent, iterationContext);
        }
        return result;
    }
}
```

### Site Helper Example
```javascript
// site/webapp/controller/custom.js
class CustomController {
    // Regular helper: {{formatDate date format}}
    static handlebarFormatDate(args, context) {
        const date = args._target || args.date;
        const format = args.format || 'YYYY-MM-DD';
        // Format date logic
        return formattedDate;
    }
}
```

### Dot Notation Helper Example
```javascript
// plugins/my-plugin/webapp/controller/myPlugin.js
class MyPluginController {
    /**
     * Handles {{myHelper.action1}}, {{myHelper.action2}}, etc.
     * Parse args._helper to determine which sub-action to perform
     */
    static async handlebarMyHelper(args, context) {
        const fullHelper = args._helper;  // e.g., "myHelper.action1"
        
        // Extract action from dot notation
        if (!fullHelper.includes('.')) {
            throw new Error(`myHelper requires dot notation: {{myHelper.action}}`);
        }
        
        const action = fullHelper.split('.')[1];  // "action1"
        
        // Route to sub-handler based on action
        switch (action) {
            case 'action1':
                return await this._handleMyHelperAction1(args, context);
            case 'action2':
                return await this._handleMyHelperAction2(args, context);
            default:
                throw new Error(`Unknown myHelper action: ${action}`);
        }
    }
    
    static async _handleMyHelperAction1(args, context) {
        // Handle {{myHelper.action1 param="value"}}
        const param = args.param || args._target;
        return `Action 1 result: ${param}`;
    }
    
    static async _handleMyHelperAction2(args, context) {
        // Handle {{myHelper.action2 param="value"}}
        const param = args.param || args._target;
        return `Action 2 result: ${param}`;
    }
}
```

**Template usage**:
```handlebars
{{myHelper.action1 param="value"}}
{{myHelper.action2 "target"}}
```

**Note**: The framework registers `handlebarMyHelper` as helper name `myHelper`. When used in templates as `{{myHelper.action1}}`, the full helper name `"myHelper.action1"` is available in `args._helper`, allowing the handler to parse and route to the appropriate sub-action.

## Deliverables

1. ✅ Refactored all existing helpers to use `args` parameter
2. ✅ Helper registry implementation (`helperRegistry` Map with unified metadata)
3. ✅ Auto-discovery from controllers (`initializeHandlebarHandlers()`)
4. ✅ JSDoc extraction (`_extractJSDoc()` for `@description` and `@example`)
5. ✅ Dynamic documentation (`HANDLEBARS_DESCRIPTIONS` array, `handlebars-list-table` generator)
6. ✅ Internal utilities in `context._handlebar` namespace
7. ✅ Helper priority system (site > plugin > built-in)
8. ✅ Documentation in `docs/handlebars.md` and `docs/plugins/creating-plugins.md`
9. ✅ Unit tests (`handlebar-plugin-interface.test.js`)
10. ✅ Integration tests (`plugin-handlebars-helpers.test.js`)
11. ✅ Example plugin with helpers (`hello-world` plugin)
