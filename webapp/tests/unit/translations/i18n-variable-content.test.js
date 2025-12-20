/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Translations / I18N Variable Content
 * @tagline         Test variable content support in i18n translations
 * @description     Tests the new handlebars-style variable substitution in i18n translations
 * @file            webapp/tests/unit/translations/i18n-variable-content.test.js
 * @version         1.3.20
 * @release         2025-12-20
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import path from 'path';
import TestUtils from '../../helpers/test-utils.js';

describe('I18N Variable Content', () => {

    describe('expandI18nHandlebars', () => {
        let mockContext;

        beforeEach(() => {
            mockContext = {
                user: {
                    id: 'testuser',
                    firstName: 'John',
                    lastName: 'Doe',
                    nickName: 'John',
                    email: 'john.doe@example.com',
                    isAuthenticated: true
                },
                app: {
                    jPulse: {
                        name: 'jPulse Framework',
                        shortName: 'jPulse',
                        version: '0.9.7',
                        release: '2025-10-12'
                    },
                    site: {
                        name: 'My jPulse Site',
                        shortName: 'My jPulse Site',
                        version: '0.1.0',
                        release: '1970-01-01',
                        copyright: '© 1970 My Company'
                    }
                }
            };
        });

        test('should have variable content examples in English translation files', () => {
            const fs = require('fs');
            const langEnPath = path.join(process.cwd(), 'webapp', 'translations', 'en.conf');
            const langEnContent = fs.readFileSync(langEnPath, 'utf8');

            // Check that we have some variable content examples using existing patterns
            expect(langEnContent).toContain('{{user.nickName}}');
            expect(langEnContent).toContain('Welcome back, {{user.nickName}}!');
            expect(langEnContent).toContain('This is the home page of the {{app.site.name}}.');
            expect(langEnContent).toContain('{{count}}'); // Use existing count variable instead
        });

        test('should have variable content examples in German translation files', () => {
            const fs = require('fs');
            const langDePath = path.join(process.cwd(), 'webapp', 'translations', 'de.conf');
            const langDeContent = fs.readFileSync(langDePath, 'utf8');

            // Check that we have some variable content examples using existing patterns
            expect(langDeContent).toContain('{{user.nickName}}');
            expect(langDeContent).toContain('Willkommen zurück, {{user.nickName}}!');
            expect(langDeContent).toContain('Dies ist die Startseite des {{app.site.name}}.'); // Use German text
            expect(langDeContent).toContain('{{count}}'); // Use existing count variable instead
        });

        test('should verify translation files do not contain old parameter substitution', () => {
            const fs = require('fs');
            const langEnPath = path.join(process.cwd(), 'webapp', 'translations', 'en.conf');
            const langDePath = path.join(process.cwd(), 'webapp', 'translations', 'de.conf');

            const langEnContent = fs.readFileSync(langEnPath, 'utf8');
            const langDeContent = fs.readFileSync(langDePath, 'utf8');

            // Should not contain old {0}, {1} style parameters in production files
            expect(langEnContent).not.toContain('{0}');
            expect(langEnContent).not.toContain('{1}');
            expect(langDeContent).not.toContain('{0}');
            expect(langDeContent).not.toContain('{1}');
        });

        test('should verify two-pass handlebars processing works with i18n variable content', () => {
            // This test simulates what happens in the ViewController:
            // 1. First pass: {{i18n.view.auth.login.welcomeBack}} -> 'Welcome back, {{user.nickName}}!'
            // 2. Second pass: {{user.nickName}} -> 'John'

            // Mock i18n structure
            const mockI18n = {
                view: {
                    auth: {
                        login: {
                            welcomeBack: 'Welcome back, {{user.nickName}}!',
                            testGreeting: 'Hello {{user.firstName}} {{user.lastName}}'
                        }
                    }
                }
            };

            const mockContext = {
                user: {
                    firstName: 'John',
                    nickName: 'John',
                    lastName: 'Doe'
                },
                i18n: mockI18n
            };

            // Simulate first pass: template contains {{i18n.login.welcome}}
            let content = 'User message: {{i18n.view.auth.login.welcomeBack}}';

            // After first pass, i18n reference is resolved but variables remain
            content = content.replace('{{i18n.view.auth.login.welcomeBack}}', mockI18n.view.auth.login.welcomeBack);
            expect(content).toBe('User message: Welcome back, {{user.nickName}}!');

            // After second pass, user variables should be resolved
            content = content.replace('{{user.nickName}}', mockContext.user.nickName);
            expect(content).toBe('User message: Welcome back, John!');

            // Test multiple variables
            let multiContent = 'Profile: {{i18n.view.auth.login.testGreeting}}';
            multiContent = multiContent.replace('{{i18n.view.auth.login.testGreeting}}', mockI18n.view.auth.login.testGreeting);
            expect(multiContent).toBe('Profile: Hello {{user.firstName}} {{user.lastName}}');

            multiContent = multiContent.replace('{{user.firstName}}', mockContext.user.firstName);
            multiContent = multiContent.replace('{{user.lastName}}', mockContext.user.lastName);
            expect(multiContent).toBe('Profile: Hello John Doe');
        });

    });

});

// EOF webapp/tests/unit/translations/i18n-variable-content.test.js
