# jPulse Docs / Generative-AI Development Guide v1.3.2

Complete guide for site developers building jPulse applications with Gen-AI assistance, aka vibe coding, using IDEs like Cline, Cursor, GitHub Copilot, or Windsurf.

## 🎯 Overview

### What is Gen-AI Development?

**Gen-AI Development** (also called "vibe coding") is the practice of using AI assistants to help write code, implement features, and solve problems. Instead of writing every line manually, you describe what you want and the AI helps implement it following best practices.

**Benefits for jPulse Framework development**:
- Faster feature implementation following framework patterns
- Automatic adherence to coding conventions and style guides
- Quick reference to framework documentation and examples
- Reduced cognitive load for repetitive tasks

**When to use AI vs. manual coding**:
- ✅ AI excels at: Implementing CRUD operations, following established patterns, generating boilerplate
- 🤔 Use manual coding for: Novel algorithms, complex business logic, security-critical code

### AI Tools for jPulse Development

**Recommended Tools**:
- **[Cursor](https://cursor.sh/)** - AI-first IDE with custom instructions and docs integration (⭐ Recommended)
- **[Cline](https://github.com/cline/cline)** - Autonomous coding agent for VS Code
- **[GitHub Copilot](https://github.com/features/copilot)** - Code completion and chat in most IDEs
- **[Windsurf](https://windsurf.ai/)** - AI pair programming assistant

**Choosing the right tool**:
- **Cursor** - Best for full project development with custom instructions
- **Cline** - Best for autonomous task completion and file operations
- **Copilot** - Best for code completion and inline suggestions
- **Windsurf** - Best for collaborative, exploratory development

## 🚀 Getting Started with AI-Assisted Development

### Initial Project Setup

**Create your jPulse site**:
```bash
mkdir my-jpulse-site && cd my-jpulse-site
npx jpulse-install
npx jpulse configure
npm install
npm start
```

**Set up version control**: Version control is essential for AI-assisted development - it lets you experiment freely and revert changes if needed.

See [Getting Started Guide - Step 4: Set Up Your Site Repository](getting-started.md#step-4-set-up-your-site-repository) for complete git setup instructions.

### Configuring Your AI Assistant

**🚨 Critical First Step**: Point your AI to the framework instructions:

> "I'm developing a jPulse Framework site. Please read and follow the conventions in `docs/genai-instructions.md` for all code suggestions."

This single instruction ensures your AI assistant understands:
- Framework architecture and patterns
- File organization and site override system
- CSS and JavaScript conventions
- Security and logging requirements
- Where to find reference implementations

**For Cursor users**: Add this to your `.cursorrules` file:
```
When working on jPulse Framework sites, always reference and follow docs/genai-instructions.md
```

### Best Practices for Effective AI Assistance

**Chain of Thought Reasoning**:
Encourage your AI to think through problems before responding. This leads to better solutions and helps you understand the reasoning. Example prompt: "Think through this step-by-step before suggesting a solution."

**Avoid Hallucination**:
If your AI seems uncertain or makes assumptions, ask it to clarify or look up information rather than guessing. Good AI assistants will say "I don't know" when appropriate rather than inventing details.

**Maintain Development Logs**:
Consider asking your AI to maintain a log file (`genai-log.txt` or `cursor-log.txt`) tracking your development session. This helps with:
- Reviewing what was discussed
- Understanding what changes were made
- Tracking what worked and what didn't
- Resuming work after breaks

Example prompt: "Please maintain a genai-log.txt file in the project root to track our conversation and the changes we make."

### Essential Context for AI

**Key documentation to attach or reference**:
- [Getting Started](getting-started.md) - Framework basics and quick start
- [Site Customization](site-customization.md) - Site override system details
- [API Reference](api-reference.md) - Complete endpoint documentation
- [Front-End Development](front-end-development.md) - Client-side utilities
- [Style Reference](style-reference.md) - CSS framework and components

**Pro tip**: Open relevant docs in your editor before starting an AI session. Most AI tools can see open files and use them as context.

## 💬 Effective Prompting Strategies

### Starting a New Feature

**Good prompts are specific and reference framework patterns**:

```
✅ "Create a REST API endpoint for managing blog posts with full CRUD operations.
   Follow the pattern in site/webapp/controller/helloTodo.js with proper logging
   and error handling."

✅ "Create a MongoDB model for blog posts with title, content, author, and
   publishedAt fields. Use the same validation pattern as helloTodo.js model."

✅ "Create a view for displaying blog posts using the client-side heavy pattern
   from hello-todo example. Load posts via jPulse.api.get() on page load."

❌ "Create a blog system" (too vague)
❌ "Add a database" (framework already has MongoDB)
```

### Iterating on Existing Code

**Ask for improvements, not rewrites**:

```
✅ "Review this controller for proper error handling and logging.
   Compare with site/webapp/controller/helloTodo.js patterns."

✅ "Add input validation to this API endpoint following the patterns in
   the API Reference documentation."

✅ "Refactor this view to use jPulse.UI.toast instead of alert() for messages."

❌ "Make this better" (too vague)
❌ "Rewrite this code" (AI might change working patterns)
```

### Debugging with AI

**Provide context and reference working examples**:

```
✅ "This API endpoint returns 500 error. Here's the error log: [paste log].
   Compare with the working pattern in helloTodo.js controller."

✅ "This view doesn't load data on page load. I'm using jPulse.api.get()
   in jPulse.dom.ready(). What am I missing?"

✅ "Getting 'permission denied' when saving to MongoDB. Check if I'm using
   CommonUtils correctly compared to helloTodo model."
```

## 🏗️ Architecture-Aware Development

### Understanding Framework Patterns

When working with AI, it's crucial to understand these core concepts:

**1. Site Override System**: All your custom code goes in `site/webapp/`, never modify `webapp/`
- Details: [Site Customization Guide](site-customization.md)

**2. Client-Side Heavy**: 80% of view logic in JavaScript + API calls, minimal server-side rendering
- Details: [Front-End Development Guide](front-end-development.md)

**3. Auto-Discovery**: Controllers auto-register via `static async api*()` methods
- Details: [Getting Started Guide](getting-started.md)

**4. MVC Architecture**: Clean separation of Model, View, Controller
- Example: See `site/webapp/view/hello-todo/` for complete MVC implementation

### Telling AI What Matters

**Include these in your prompts** to guide AI toward correct patterns:

**File organization**:
- "Place new code in `site/webapp/` directory"
- "Don't modify any files in `webapp/` directory"

**API patterns**:
- "Use `jPulse.api.get/post/put/delete` for all data operations"
- "Follow the controller pattern with `static async api*()` methods"
- "Auto-discover the API endpoint - don't manually register routes"

**Styling**:
- "Use CSS classes from jpulse-common.css framework"
- "Add page-specific styles with `local-*` prefix in the view's `<style>` tag"
- "Don't create any `jp-*` CSS classes - those are framework-only"

**Logging**:
```
"When working with controllers, log API requests as follows:
- Log API requests with LogController.logRequest()
- Use LogController.logInfo() for additional logging
- Log errors with LogController.logError()"
```

## 🎨 Building Common Features

### User Authentication Features

**Example prompt**:
```
"Add password reset functionality to the user profile page.
Follow these requirements:
- Add 'Reset Password' collapsible section to user/profile view
- Create API endpoint in site controller (don't modify webapp/controller/user.js)
- Validate current password, check new password strength
- Use jPulse.UI.confirmDialog for confirmation
- Use jPulse.UI.toast for success/error messages
- Follow logging pattern from helloTodo.js"
```

**What AI should reference**:
- `webapp/controller/auth.js` - authentication patterns
- `webapp/view/user/profile.shtml` - profile page structure
- `docs/front-end-development.md` - jPulse utilities

### Data Management (CRUD Interface)

**Example prompt**:
```
"Create a complete CRUD interface for managing 'projects' with these fields:
- name (required, string)
- description (optional, text)
- status (required, enum: 'active', 'completed', 'archived')
- startDate, endDate (optional dates)

Follow the exact pattern from hello-todo example:
- Model: site/webapp/model/helloTodo.js
- Controller: site/webapp/controller/helloTodo.js
- View: site/webapp/view/hello-todo/index.shtml

Use jPulse.date.formatLocalDate() for date display."
```

### UI Components

**Example prompt**:
```
"Add a collapsible FAQ section to the home page.
- Use jPulse.UI.collapsible.register() for behavior
- Style with jp-collapsible framework classes
- Add local-* styles for custom appearance
- Reference the collapsible example in front-end-development.md"
```

## 🧪 Testing with AI

### Test-Driven Development

**Ask AI to write tests first**:
```
"Before implementing the projects CRUD API, write Jest tests for:
- Creating a project with valid data
- Validating required fields
- Querying projects by status
- Updating project fields
- Deleting projects

Follow the test structure in webapp/tests/unit/controller/"
```

### Debugging Failing Tests

**Provide complete context**:
```
"This test is failing: [paste test code and output]

The test expects 200 but gets 500. Review against the working pattern
in webapp/tests/unit/controller/user.test.js"
```

## 📚 Documentation and Code Quality

### Asking for Documentation

```
✅ "Add JSDoc comments to this controller following the style in helloTodo.js"

✅ "Create a README for site/webapp/view/projects/ explaining the feature"

✅ "Document this API endpoint in the same format as API Reference doc"
```

### Code Review and Refactoring

```
✅ "Review this code for security issues. Check:
   - Input validation
   - Authentication checks
   - MongoDB injection prevention
   - Error message information leakage"

✅ "Refactor this for better performance:
   - Reduce redundant API calls
   - Cache static data
   - Use efficient database queries"

✅ "Make this code more maintainable:
   - Extract repeated logic
   - Add clear comments
   - Follow framework conventions"
```

## ⚠️ Common Pitfalls and Solutions

### What AI Might Get Wrong

**1. Modifying framework files**:
```
❌ AI modifies: webapp/controller/auth.js
✅ Correction: "Create site/webapp/controller/customAuth.js instead"
```

**2. Wrong CSS prefix**:
```
❌ AI creates: .jp-custom-button { }
✅ Correction: "Use .local-custom-button in view's <style> tag - never create jp-* classes"
```

**3. Server-side heavy views**:
```
❌ AI renders data in controller, passes to template
✅ Correction: "Load data client-side with jPulse.api.get() in jPulse.dom.ready()"
```

**4. Manual route registration**:
```
❌ AI adds: app.get('/my-route', ...) to routes.js
✅ Correction: "Use static async api() method - routes auto-register"
```

### How to Guide AI Back on Track

**Be specific and reference docs**:
```
"That's not following the framework pattern. Please review docs/site-customization.md
and site/webapp/controller/helloTodo.js, then revise to match those patterns."
```

**Provide error messages**:
```
"That code produces this error: [paste error]
This suggests we're not following the pattern correctly. Check the reference
implementation in [specific file]."
```

## 🔧 Advanced Techniques

### Multi-File Changes

**Coordinate changes across MVC layers**:
```
"I need to add a 'priority' field to projects. Update:
1. Model (site/webapp/model/project.js) - add to schema
2. Controller (site/webapp/controller/project.js) - handle in API
3. View (site/webapp/view/projects/index.shtml) - add to form and display
Follow the pattern for existing fields."
```

### Custom Framework Extensions

**Creating site-specific utilities**:
```
"Create a site-wide utility in site/webapp/view/jpulse-common.js for
formatting currency values. Follow the structure of jpulse-common.js but
use site.utils namespace instead of jPulse."
```

## 📋 Checklists for AI Sessions

### Before Starting
- [ ] Point AI to `docs/genai-instructions.md`
- [ ] Open relevant documentation in editor
- [ ] Review existing code structure
- [ ] Commit current work (so you can revert if needed)

### During Development
- [ ] Verify AI follows jPulse patterns (site/webapp/, API-first, etc.)
- [ ] Test changes incrementally
- [ ] Review generated code for security issues
- [ ] Check that logging is included

### Before Committing
- [ ] Run full test suite: `npm test`
- [ ] Verify no framework file modifications: `git status webapp/`
- [ ] Check error handling is complete
- [ ] Review all logging calls
- [ ] Test in browser (not just API endpoints)

## 🎯 Example AI Development Sessions

### Session 1: New Feature End-to-End

**Goal**: Add a "team members" management feature

**Conversation flow**:
```
Developer: "I need to add team member management. Let's start with the model.
           Follow the pattern in site/webapp/model/helloTodo.js"

AI: Creates site/webapp/model/teamMember.js with schema validation

Developer: "Good. Now create the controller with full CRUD API endpoints.
           Follow site/webapp/controller/helloTodo.js pattern."

AI: Creates site/webapp/controller/teamMember.js with api*() methods

Developer: "Now create the view. Use client-side heavy pattern - load members
           via jPulse.api.get() on page load. Follow hello-todo/index.shtml."

AI: Creates site/webapp/view/team-members/index.shtml

Developer: "Add a confirmation dialog when deleting members using
           jPulse.UI.confirmDialog()"

AI: Updates view with confirmation pattern

Developer: "Write tests for the API endpoints following the test structure
           in webapp/tests/unit/controller/"

AI: Creates test file with comprehensive tests
```

### Session 2: Debugging Production Issue

**Goal**: Fix API endpoint returning 500 error

**Conversation flow**:
```
Developer: "The /api/1/team-member endpoint returns 500. Here's the error log:
           [paste log]. Compare with the working helloTodo.js controller."

AI: Identifies missing error handling in catch block

Developer: "Fix it and add proper logging with LogController.logError()"

AI: Updates controller with proper error handling

Developer: "Run the tests to verify: npm test"

[Tests pass]

Developer: "Good. Now test in browser at http://localhost:8080/team-members/"
```

### Session 3: Refactoring Legacy Code

**Goal**: Modernize old code to use framework patterns

**Conversation flow**:
```
Developer: "This old controller doesn't follow our patterns. Refactor it to:
           - Use static async api*() methods
           - Add proper LogController logging
           - Use CommonUtils for database operations
           - Follow the pattern in site/webapp/controller/helloTodo.js"

AI: Refactors controller to match modern patterns

Developer: "Now update the view to use client-side heavy pattern:
           - Load data with jPulse.api.get()
           - Use jPulse.UI.toast for messages
           - Follow hello-todo/index.shtml structure"

AI: Refactors view with client-side logic

Developer: "Add tests and verify everything still works"

AI: Creates tests, runs npm test, confirms passing
```

## 🎓 Best Practices Summary

### Do's ✅
- Always point AI to `docs/genai-instructions.md` first
- Reference specific example files (helloTodo.js, hello-vue, etc.)
- Test incrementally as you build
- Commit frequently with clear messages
- Use framework documentation as context
- Ask AI to explain unfamiliar patterns

### Don'ts ❌
- Don't let AI modify `webapp/` directory files
- Don't accept code without reviewing it first
- Don't skip testing "because it's generated"
- Don't commit without checking `git diff`
- Don't ignore framework conventions
- Don't assume AI knows jPulse patterns without guidance

## 📚 Additional Resources

### Framework Documentation
- [Getting Started Guide](getting-started.md) - Framework basics
- [Site Customization](site-customization.md) - Override system details
- [API Reference](api-reference.md) - REST endpoint documentation
- [Front-End Development](front-end-development.md) - jPulse.* utilities
- [Style Reference](style-reference.md) - CSS framework and components
- [Template Reference](template-reference.md) - Handlebars syntax

### Example Implementations
- `site/webapp/view/hello-todo/` - Complete MVC example
- `site/webapp/view/hello-vue/` - Single Page Application
- `site/webapp/view/hello-websocket/` - Real-time features

### For AI Assistants
- [Gen-AI Instructions](genai-instructions.md) - Machine-readable framework conventions

---

*Next: [Gen-AI Instructions for AI Assistants](genai-instructions.md) - Machine-readable instructions for AI coding agents*
