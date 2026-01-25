/**
 * @name            jPulse Framework / WebApp / Tests / Unit / jPulse Common Enhanced Utilities
 * @tagline         Unit tests for jPulse date and API error handling utilities
 * @description     Unit tests for jPulse enhanced utilities (W-072)
 * @file            webapp/tests/unit/utils/jpulse-common-enhanced.test.js
 * @version         1.5.1
 * @release         2026-01-25
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

describe('jPulse Enhanced Utilities (W-072)', () => {
    describe('Code Structure Verification', () => {
        test('should have jpulse-common.js file in correct location', () => {
            const fs = require('fs');
            const path = require('path');
            const jpulseCommonPath = path.resolve(__dirname, '../../../view/jpulse-common.js');
            expect(fs.existsSync(jpulseCommonPath)).toBe(true);
        });

        test('should contain jPulse.date namespace definition', () => {
            const fs = require('fs');
            const path = require('path');
            const jpulseCommonPath = path.resolve(__dirname, '../../../view/jpulse-common.js');
            const content = fs.readFileSync(jpulseCommonPath, 'utf-8');

            // Verify namespace exists
            expect(content).toContain('date: {');

            // Verify formatLocalDate function exists
            expect(content).toContain('formatLocalDate:');
            expect(content).toContain('formatLocalDate: (date) =>');

            // Verify formatLocalDateAndTime function exists
            expect(content).toContain('formatLocalDateAndTime:');
            expect(content).toContain('formatLocalDateAndTime: (date) =>');
        });

        test('should contain jPulse.api.handleError function definition', () => {
            const fs = require('fs');
            const path = require('path');
            const jpulseCommonPath = path.resolve(__dirname, '../../../view/jpulse-common.js');
            const content = fs.readFileSync(jpulseCommonPath, 'utf-8');

            // Verify handleError function exists in api namespace
            expect(content).toContain('handleError:');
            expect(content).toContain('handleError: (error, action, options = {}) =>');

            // Verify error handling logic exists
            expect(content).toContain('showMessage = true');
            expect(content).toContain('logError = true');
            expect(content).toContain('jPulse.UI.toast.show');
        });
    });

    describe('Date Formatting Function Signatures', () => {
        test('formatLocalDate should follow expected signature', () => {
            const fs = require('fs');
            const path = require('path');
            const jpulseCommonPath = path.resolve(__dirname, '../../../view/jpulse-common.js');
            const content = fs.readFileSync(jpulseCommonPath, 'utf-8');

            // Verify function accepts date parameter
            expect(content).toContain('formatLocalDate: (date) =>');

            // Verify YYYY-MM-DD format construction
            expect(content).toMatch(/\$\{year\}-\$\{month\}-\$\{day\}/);

            // Verify padding logic
            expect(content).toContain('.padStart(2, \'0\')');
        });

        test('formatLocalDateAndTime should follow expected signature', () => {
            const fs = require('fs');
            const path = require('path');
            const jpulseCommonPath = path.resolve(__dirname, '../../../view/jpulse-common.js');
            const content = fs.readFileSync(jpulseCommonPath, 'utf-8');

            // Verify function accepts date parameter
            expect(content).toContain('formatLocalDateAndTime: (date) =>');

            // Verify YYYY-MM-DD HH:MM format construction
            expect(content).toMatch(/\$\{year\}-\$\{month\}-\$\{day\} \$\{hours\}:\$\{minutes\}/);

            // Verify hours and minutes are extracted
            expect(content).toContain('getHours()');
            expect(content).toContain('getMinutes()');
        });
    });

    describe('API Error Handler Function Signature', () => {
        test('handleError should accept error, action, and options parameters', () => {
            const fs = require('fs');
            const path = require('path');
            const jpulseCommonPath = path.resolve(__dirname, '../../../view/jpulse-common.js');
            const content = fs.readFileSync(jpulseCommonPath, 'utf-8');

            // Verify parameter names
            expect(content).toContain('handleError: (error, action, options = {}) =>');

            // Verify option destructuring
            expect(content).toContain('showMessage = true');
            expect(content).toContain('logError = true');
        });

        test('handleError should have console.error logging', () => {
            const fs = require('fs');
            const path = require('path');
            const jpulseCommonPath = path.resolve(__dirname, '../../../view/jpulse-common.js');
            const content = fs.readFileSync(jpulseCommonPath, 'utf-8');

            // Verify error logging with action context
            expect(content).toContain('console.error');
            expect(content).toContain('API error during');
        });

        test('handleError should construct user-friendly message', () => {
            const fs = require('fs');
            const path = require('path');
            const jpulseCommonPath = path.resolve(__dirname, '../../../view/jpulse-common.js');
            const content = fs.readFileSync(jpulseCommonPath, 'utf-8');

            // Verify message construction
            expect(content).toContain('Could not');
            expect(content).toContain('Please try again');
        });
    });

    describe('Integration with Vue SPA', () => {
        test('todo-demo should use jPulse.date.formatLocalDate', () => {
            const fs = require('fs');
            const path = require('path');
            const todoPath = path.resolve(__dirname, '../../../../site/webapp/view/hello-vue/templates/todo-demo.tmpl');

            if (fs.existsSync(todoPath)) {
                const content = fs.readFileSync(todoPath, 'utf-8');
                expect(content).toContain('jPulse.date.formatLocalDate');
            }
        });

        test('todo-demo should use jPulse.api.handleError', () => {
            const fs = require('fs');
            const path = require('path');
            const todoPath = path.resolve(__dirname, '../../../../site/webapp/view/hello-vue/templates/todo-demo.tmpl');

            if (fs.existsSync(todoPath)) {
                const content = fs.readFileSync(todoPath, 'utf-8');
                expect(content).toContain('jPulse.api.handleError');
            }
        });
    });

    describe('Integration with Hello-Todo', () => {
        test('hello-todo should use jPulse.date.formatLocalDate', () => {
            const fs = require('fs');
            const path = require('path');
            const helloTodoPath = path.resolve(__dirname, '../../../../site/webapp/view/hello-todo/todo-app.shtml');

            if (fs.existsSync(helloTodoPath)) {
                const content = fs.readFileSync(helloTodoPath, 'utf-8');
                expect(content).toContain('jPulse.date.formatLocalDate');
                // Should NOT contain old formatting method
                expect(content).not.toContain('.toISOString().split(\'T\')[0]');
            }
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-common-enhanced.test.js
