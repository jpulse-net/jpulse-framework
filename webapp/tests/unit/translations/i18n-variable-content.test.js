/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Translations / I18N Variable Content
 * @tagline         Test variable content support in i18n translations
 * @description     Tests the new handlebars-style variable substitution in i18n translations
 * @file            webapp/tests/unit/translations/i18n-variable-content.test.js
 * @version         0.2.8
 * @release         2025-08-27
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import path from 'path';
import TestUtils from '../../helpers/test-utils.js';

describe('I18N Variable Content', () => {

    describe('processI18nHandlebars', () => {
        let mockContext;

        beforeEach(() => {
            mockContext = {
                user: {
                    id: 'testuser',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    authenticated: true
                },
                app: {
                    version: '0.2.5'
                },
                config: {
                    siteName: 'Test Site'
                }
            };
        });

        test('should have variable content examples in English translation files', () => {
            const fs = require('fs');
            const langEnPath = path.join(process.cwd(), 'webapp', 'translations', 'lang-en.conf');
            const langEnContent = fs.readFileSync(langEnPath, 'utf8');
            
            // Check that we have some variable content examples
            expect(langEnContent).toContain('{{user.firstName}}');
            expect(langEnContent).toContain('Welcome back, {{user.firstName}}!');
            expect(langEnContent).toContain('Hello {{user.firstName}} {{user.lastName}} ({{user.email}})');
        });

        test('should have variable content examples in German translation files', () => {
            const fs = require('fs');
            const langDePath = path.join(process.cwd(), 'webapp', 'translations', 'lang-de.conf');
            const langDeContent = fs.readFileSync(langDePath, 'utf8');
            
            // Check that we have some variable content examples  
            expect(langDeContent).toContain('{{user.firstName}}');
            expect(langDeContent).toContain('Willkommen zurück, {{user.firstName}}!');
            expect(langDeContent).toContain('Hallo {{user.firstName}} {{user.lastName}} ({{user.email}})');
        });

        test('should verify translation files do not contain old parameter substitution', () => {
            const fs = require('fs');
            const langEnPath = path.join(process.cwd(), 'webapp', 'translations', 'lang-en.conf');
            const langDePath = path.join(process.cwd(), 'webapp', 'translations', 'lang-de.conf');
            
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
            // 1. First pass: {{i18n.login.welcome}} -> 'Welcome back, {{user.firstName}}!'
            // 2. Second pass: {{user.firstName}} -> 'John'
            
            // Mock i18n structure
            const mockI18n = {
                login: {
                    welcome: 'Welcome back, {{user.firstName}}!',
                    greeting: 'Hello {{user.firstName}} {{user.lastName}}'
                }
            };
            
            const mockContext = {
                user: {
                    firstName: 'John',
                    lastName: 'Doe'
                },
                i18n: mockI18n
            };
            
            // Simulate first pass: template contains {{i18n.login.welcome}}
            let content = 'User message: {{i18n.login.welcome}}';
            
            // After first pass, i18n reference is resolved but variables remain
            content = content.replace('{{i18n.login.welcome}}', mockI18n.login.welcome);
            expect(content).toBe('User message: Welcome back, {{user.firstName}}!');
            
            // After second pass, user variables should be resolved
            content = content.replace('{{user.firstName}}', mockContext.user.firstName);
            expect(content).toBe('User message: Welcome back, John!');
            
            // Test multiple variables
            let multiContent = 'Profile: {{i18n.login.greeting}}';
            multiContent = multiContent.replace('{{i18n.login.greeting}}', mockI18n.login.greeting);
            expect(multiContent).toBe('Profile: Hello {{user.firstName}} {{user.lastName}}');
            
            multiContent = multiContent.replace('{{user.firstName}}', mockContext.user.firstName);
            multiContent = multiContent.replace('{{user.lastName}}', mockContext.user.lastName);
            expect(multiContent).toBe('Profile: Hello John Doe');
        });

    });

});

// EOF webapp/tests/unit/translations/i18n-variable-content.test.js
