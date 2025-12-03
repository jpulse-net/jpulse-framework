/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Hello-Todo Structure
 * @tagline         Unit tests for refactored hello-todo MPA structure
 * @description     Tests for the 4-page hello-todo MPA structure (W-075 refactor)
 * @file            webapp/tests/unit/hello-todo-structure.test.js
 * @version         1.3.6
 * @release         2025-12-03
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

const fs = require('fs');
const path = require('path');

describe('Hello-Todo MPA Structure', () => {
    const helloTodoDir = path.join(process.cwd(), 'site/webapp/view/hello-todo');

    describe('File Structure', () => {
        test('should have all 4 hello-todo pages', () => {
            expect(fs.existsSync(path.join(helloTodoDir, 'index.shtml'))).toBe(true);
            expect(fs.existsSync(path.join(helloTodoDir, 'todo-app.shtml'))).toBe(true);
            expect(fs.existsSync(path.join(helloTodoDir, 'code-examples.shtml'))).toBe(true);
            expect(fs.existsSync(path.join(helloTodoDir, 'architecture.shtml'))).toBe(true);
        });

        test('index.shtml should be overview page', () => {
            const content = fs.readFileSync(path.join(helloTodoDir, 'index.shtml'), 'utf-8');
            expect(content).toContain('Model-View-Controller (MVC) Pattern');
            expect(content).toContain('jPulse\'s Hybrid MPA approach');
            expect(content).toContain('Multi-Page Application (MPA)');
        });

        test('todo-app.shtml should have actual todo app', () => {
            const content = fs.readFileSync(path.join(helloTodoDir, 'todo-app.shtml'), 'utf-8');
            expect(content).toContain('Add New To-Do');
            expect(content).toContain('class HelloTodoApp');
            expect(content).toContain('jPulse.api.call');
            expect(content).toContain('toggleTodo');
            expect(content).toContain('deleteTodo');
        });

        test('code-examples.shtml should have code blocks with syntax highlighting', () => {
            const content = fs.readFileSync(path.join(helloTodoDir, 'code-examples.shtml'), 'utf-8');
            expect(content).toContain('jp-source-code');
            expect(content).toContain('data-lang="javascript"');
            expect(content).toContain('data-lang="html"');
            expect(content).toContain('Model: helloTodo.js');
            expect(content).toContain('Controller: helloTodo.js');
            expect(content).toContain('View: todo-app.shtml');
            expect(content).toContain('data-show-lang="true"');
        });

        test('architecture.shtml should explain MVC flow', () => {
            const content = fs.readFileSync(path.join(helloTodoDir, 'architecture.shtml'), 'utf-8');
            expect(content).toContain('Initial Page Load Flow');
            expect(content).toContain('File Structure');
            expect(content).toContain('MPA vs SPA');
        });
    });

    describe('Navigation Consistency', () => {
        test('all pages should have breadcrumb with icon', () => {
            const pages = ['index.shtml', 'todo-app.shtml', 'code-examples.shtml', 'architecture.shtml'];

            pages.forEach(page => {
                const content = fs.readFileSync(path.join(helloTodoDir, page), 'utf-8');
                // Check for page title (now uses SVG icon instead of emoji)
                expect(content).toContain('To-Do MVC Demo');
            });
        });

        test('all pages should have sub-navigation with 4 sections', () => {
            const pages = ['index.shtml', 'todo-app.shtml', 'code-examples.shtml', 'architecture.shtml'];

            pages.forEach(page => {
                const content = fs.readFileSync(path.join(helloTodoDir, page), 'utf-8');
                expect(content).toContain('jp-btn-nav-group');
                expect(content).toContain('📖 Overview');
                expect(content).toContain('✅ To-Do App');
                expect(content).toContain('💻 Code Examples');
                expect(content).toContain('🏗️ Architecture');
            });
        });

        test('all pages should have bottom navigation', () => {
            const pages = ['index.shtml', 'todo-app.shtml', 'code-examples.shtml', 'architecture.shtml'];

            pages.forEach(page => {
                const content = fs.readFileSync(path.join(helloTodoDir, page), 'utf-8');
                expect(content).toContain('jp-btn-nav-group');
                expect(content).toContain('Hello World Site Demos');
            });
        });

        test('sub-pages should link back to overview', () => {
            const subPages = ['todo-app.shtml', 'code-examples.shtml', 'architecture.shtml'];

            subPages.forEach(page => {
                const content = fs.readFileSync(path.join(helloTodoDir, page), 'utf-8');
                expect(content).toContain('To-Do MVC Demo');
                expect(content).toContain('/hello-todo/');
            });
        });
    });

    describe('Educational Content', () => {
        test('index.shtml should distinguish traditional MPA from jPulse MPA', () => {
            const content = fs.readFileSync(path.join(helloTodoDir, 'index.shtml'), 'utf-8');
            expect(content).toContain('jPulse\'s Hybrid MPA approach');
            expect(content).toContain('Model</strong> lives on the <em>server</em>');
            expect(content).toContain('View</strong> logic lives in the <em>browser</em>');
            expect(content).toContain('Controller</strong> lives on the <em>server</em>');
            expect(content).toContain('/docs/mpa-vs-spa.html');
        });

        test('index.shtml should link to MPA vs SPA documentation', () => {
            const content = fs.readFileSync(path.join(helloTodoDir, 'index.shtml'), 'utf-8');
            expect(content).toContain('MPA vs SPA documentation');
            expect(content).toContain('/docs/mpa-vs-spa.html');
        });

        test('architecture.shtml should have comparison with Vue SPA', () => {
            const content = fs.readFileSync(path.join(helloTodoDir, 'architecture.shtml'), 'utf-8');
            expect(content).toContain('MPA vs SPA');
            expect(content).toContain('Vue.js SPA');
            expect(content).toContain('/hello-vue/');
        });
    });

    describe('Consistent Styling', () => {
        test('all pages should use jp-container-1000 for layout', () => {
            const pages = ['index.shtml', 'todo-app.shtml', 'code-examples.shtml', 'architecture.shtml'];

            pages.forEach(page => {
                const content = fs.readFileSync(path.join(helloTodoDir, page), 'utf-8');
                expect(content).toContain('jp-container-1000');
            });
        });

        test('all pages should have jp-btn-nav-group CSS', () => {
            const pages = ['index.shtml', 'todo-app.shtml', 'code-examples.shtml', 'architecture.shtml'];

            pages.forEach(page => {
                const content = fs.readFileSync(path.join(helloTodoDir, page), 'utf-8');
                expect(content).toContain('jp-btn-nav-group');
                expect(content).toContain('jp-btn-nav-arrow');
            });
        });
    });
});

// EOF webapp/tests/unit/hello-todo-structure.test.js
