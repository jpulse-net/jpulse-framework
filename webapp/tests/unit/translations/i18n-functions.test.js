/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Translations / I18N Functions
 * @tagline         Unit tests for i18n functionality using mock objects
 * @description     Tests for i18n translation functions and logic
 * @file            webapp/tests/unit/translations/i18n-functions.test.js
 * @version         1.3.13
 * @release         2025-12-13
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

describe('I18N Functions and Logic', () => {
    let i18n;
    let translations;

    beforeEach(() => {
        // Set up comprehensive test translations
        translations = {
            en: {
                lang: 'English',
                simple: 'Simple message',
                withParam: 'Hello {0}!',
                withMultipleParams: 'Hello {0}, welcome to {1}!',
                nested: {
                    deep: 'Deep nested message',
                    deeper: {
                        value: 'Very deep nested value'
                    }
                },
                view: {
                    auth: {
                        notAuthenticated: 'Error: You are not authenticated, please login'
                    }
                }
            },
            de: {
                lang: 'Deutsch',
                simple: 'Einfache Nachricht',
                withParam: 'Hallo {0}!',
                withMultipleParams: 'Hallo {0}, willkommen bei {1}!',
                nested: {
                    deep: 'Tief verschachtelte Nachricht',
                    deeper: {
                        value: 'Sehr tief verschachtelter Wert'
                    }
                },
                view: {
                    auth: {
                        notAuthenticated: 'Fehler: Sie sind nicht authentifiziert, bitte melden Sie sich an'
                    }
                }
            }
        };

        // Create mock i18n object
        i18n = TestUtils.createMockI18n(translations, 'en');
    });

    describe('Translation Function (i18n.t)', () => {
        test('should translate simple keys', () => {
            expect(i18n.t('simple')).toBe('Simple message');
            expect(i18n.t('lang')).toBe('English');
        });

        test('should translate nested keys', () => {
            expect(i18n.t('nested.deep')).toBe('Deep nested message');
            expect(i18n.t('nested.deeper.value')).toBe('Very deep nested value');
            expect(i18n.t('view.auth.notAuthenticated')).toBe('Error: You are not authenticated, please login');
        });

        test('should handle parameter substitution with single parameter', () => {
            expect(i18n.t('withParam', 'World')).toBe('Hello World!');
            expect(i18n.t('withParam', 'John')).toBe('Hello John!');
        });

        test('should handle parameter substitution with multiple parameters', () => {
            expect(i18n.t('withMultipleParams', 'John', 'our app')).toBe('Hello John, welcome to our app!');
            expect(i18n.t('withMultipleParams', 'Alice', 'the system')).toBe('Hello Alice, welcome to the system!');
        });

        test('should handle missing parameters gracefully', () => {
            // When parameters are missing, placeholders should remain
            expect(i18n.t('withParam')).toBe('Hello {0}!');
            expect(i18n.t('withMultipleParams', 'John')).toBe('Hello John, welcome to {1}!');
        });

        test('should handle extra parameters gracefully', () => {
            // Extra parameters should be ignored
            expect(i18n.t('withParam', 'John', 'extra', 'params')).toBe('Hello John!');
        });

        test('should handle missing keys gracefully', () => {
            // When key is missing, should return missing indicator
            expect(i18n.t('nonexistent')).toBe('[MISSING: nonexistent]');
            expect(i18n.t('nested.nonexistent')).toBe('[MISSING: nested.nonexistent]');
            expect(i18n.t('nonexistent.nested')).toBe('[MISSING: nonexistent.nested]');
        });

        test('should handle empty and null parameters', () => {
            expect(i18n.t('withParam', '')).toBe('Hello !');
            expect(i18n.t('withParam', null)).toBe('Hello null!');
            expect(i18n.t('withParam', undefined)).toBe('Hello {0}!'); // undefined should not replace
        });

        test('should handle numeric parameters', () => {
            expect(i18n.t('withParam', 42)).toBe('Hello 42!');
            expect(i18n.t('withMultipleParams', 1, 2)).toBe('Hello 1, welcome to 2!');
        });
    });

    describe('Language Switching', () => {
        test('should work with different default languages', () => {
            const germanI18n = TestUtils.createMockI18n(translations, 'de');

            expect(germanI18n.default).toBe('de');
            expect(germanI18n.t('simple')).toBe('Einfache Nachricht');
            expect(germanI18n.t('withParam', 'Welt')).toBe('Hallo Welt!');
        });

        test('should handle language switching', () => {
            // Start with English
            expect(i18n.default).toBe('en');
            expect(i18n.t('simple')).toBe('Simple message');

            // Switch to German
            i18n.default = 'de';
            expect(i18n.t('simple')).toBe('Einfache Nachricht');

            // Switch back to English
            i18n.default = 'en';
            expect(i18n.t('simple')).toBe('Simple message');
        });

        test('should handle invalid language gracefully', () => {
            const invalidI18n = TestUtils.createMockI18n(translations, 'fr');

            expect(invalidI18n.default).toBe('fr');
            expect(invalidI18n.t('simple')).toBe('[MISSING: simple]');
        });
    });

    describe('Module Structure', () => {
        test('should have proper i18n object structure', () => {
            expect(i18n).toHaveProperty('langs');
            expect(i18n).toHaveProperty('default');
            expect(i18n).toHaveProperty('t');
            expect(typeof i18n.t).toBe('function');
            expect(typeof i18n.langs).toBe('object');
            expect(typeof i18n.default).toBe('string');
        });

        test('should contain expected languages', () => {
            expect(i18n.langs).toHaveProperty('en');
            expect(i18n.langs).toHaveProperty('de');
            expect(i18n.langs.en.lang).toBe('English');
            expect(i18n.langs.de.lang).toBe('Deutsch');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle empty translation objects', () => {
            const emptyI18n = TestUtils.createMockI18n({
                en: {},
                de: {}
            });

            expect(emptyI18n.t('anything')).toBe('[MISSING: anything]');
        });

        test('should handle deeply nested key access', () => {
            const deepTranslations = {
                en: {
                    level1: {
                        level2: {
                            level3: {
                                level4: {
                                    level5: 'Deep value'
                                }
                            }
                        }
                    }
                }
            };

            const deepI18n = TestUtils.createMockI18n(deepTranslations);
            expect(deepI18n.t('level1.level2.level3.level4.level5')).toBe('Deep value');
        });

        test('should handle special characters in translations', () => {
            const specialTranslations = {
                en: {
                    special: 'Special chars: äöü ñ € $#@!%^&*()[]{}|\\:";\'<>?,./',
                    unicode: '🌟 Unicode emoji and symbols ∞ ≈ ≠ ±',
                    html: '<div>HTML &amp; entities &lt;script&gt;</div>'
                }
            };

            const specialI18n = TestUtils.createMockI18n(specialTranslations);

            expect(specialI18n.t('special')).toBe('Special chars: äöü ñ € $#@!%^&*()[]{}|\\:";\'<>?,./')
            expect(specialI18n.t('unicode')).toBe('🌟 Unicode emoji and symbols ∞ ≈ ≠ ±');
            expect(specialI18n.t('html')).toBe('<div>HTML &amp; entities &lt;script&gt;</div>');
        });

        test('should handle parameter substitution with special characters', () => {
            const paramI18n = TestUtils.createMockI18n({
                en: {
                    message: 'User {0} has {1} special chars: {2}'
                }
            });

            expect(paramI18n.t('message', 'John<script>', '5', '€$#')).toBe('User John<script> has 5 special chars: €$#');
        });
    });

    describe('Performance and Reliability', () => {
        test('should handle multiple rapid translation calls', () => {
            // Simulate rapid calls
            const results = [];
            for (let i = 0; i < 100; i++) {
                results.push(i18n.t('withParam', i));
            }

            expect(results).toHaveLength(100);
            expect(results[0]).toBe('Hello 0!');
            expect(results[99]).toBe('Hello 99!');
        });

        test('should be consistent across multiple calls', () => {
            const result1 = i18n.t('simple');
            const result2 = i18n.t('simple');
            const result3 = i18n.t('simple');

            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
            expect(result1).toBe('Simple message');
        });

        test('should handle concurrent access safely', () => {
            // Test that multiple simultaneous calls work correctly
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(Promise.resolve(i18n.t('withParam', `user${i}`)));
            }

            return Promise.all(promises).then(results => {
                expect(results).toHaveLength(10);
                expect(results[0]).toBe('Hello user0!');
                expect(results[9]).toBe('Hello user9!');
            });
        });
    });

    describe('Dot Notation Context Access', () => {
        test('should support direct property access via context object', () => {
            // Test the dot notation feature: {{i18n.view.pageDecoration.about}}
            const contextI18n = i18n.langs[i18n.default];

            expect(contextI18n.simple).toBe('Simple message');
            expect(contextI18n.nested.deep).toBe('Deep nested message');
            expect(contextI18n.nested.deeper.value).toBe('Very deep nested value');
            expect(contextI18n.view.auth.notAuthenticated).toBe('Error: You are not authenticated, please login');
        });

        test('should work with app-specific translations', () => {
            const appTranslations = {
                en: {
                    view: {
                        pageDecoration: {
                            about: 'About',
                            github: 'GitHub',
                            poweredBy: 'Powered by'
                        },
                        auth: {
                            profile: 'Profile',
                            signout: 'Sign Out',
                            signin: 'Sign In',
                            signup: 'Sign Up'
                        }
                    }
                }
            };

            const appI18n = TestUtils.createMockI18n(appTranslations);
            const context = appI18n.langs[appI18n.default];

            // Test dot notation access as used in templates
            expect(context.view.pageDecoration.about).toBe('About');
            expect(context.view.pageDecoration.github).toBe('GitHub');
            expect(context.view.pageDecoration.poweredBy).toBe('Powered by');
            expect(context.view.auth.profile).toBe('Profile');
            expect(context.view.auth.signout).toBe('Sign Out');
            expect(context.view.auth.signin).toBe('Sign In');
            expect(context.view.auth.signup).toBe('Sign Up');
        });

        test('should handle missing properties gracefully in dot notation', () => {
            const context = i18n.langs[i18n.default];

            // Missing properties should return undefined (not throw errors)
            expect(context.nonexistent).toBeUndefined();
            expect(context.nested.nonexistent).toBeUndefined();

            // But existing nested properties should work
            expect(context.nested.deep).toBe('Deep nested message');
        });

        test('should support both function and dot notation simultaneously', () => {
            // Both approaches should work for the same data
            const context = i18n.langs[i18n.default];

            expect(i18n.t('simple')).toBe('Simple message');
            expect(context.simple).toBe('Simple message');

            expect(i18n.t('nested.deep')).toBe('Deep nested message');
            expect(context.nested.deep).toBe('Deep nested message');

            expect(i18n.t('nested.deeper.value')).toBe('Very deep nested value');
            expect(context.nested.deeper.value).toBe('Very deep nested value');
        });

        test('should work with language switching in dot notation', () => {
            const enContext = i18n.langs.en;
            const deContext = i18n.langs.de;

            expect(enContext.simple).toBe('Simple message');
            expect(deContext.simple).toBe('Einfache Nachricht');

            expect(enContext.nested.deep).toBe('Deep nested message');
            expect(deContext.nested.deep).toBe('Tief verschachtelte Nachricht');
        });
    });

    describe('Configuration Integration', () => {
        test('should work with fixture translations', async () => {
            // Load real fixture translations
            const fixtureTranslations = await TestUtils.loadTestTranslations([
                TestUtils.getFixturePath('lang-test-en.conf'),
                TestUtils.getFixturePath('lang-test-de.conf')
            ]);

            const fixtureI18n = TestUtils.createMockI18n(fixtureTranslations.langs, 'en');

            expect(fixtureI18n.t('test.simple')).toBe('Simple test message');
            expect(fixtureI18n.t('test.withParam', 'World')).toBe('Hello World!');
            expect(fixtureI18n.t('test.nested.deep')).toBe('Deep nested message');

            // Switch to German
            fixtureI18n.default = 'de';
            expect(fixtureI18n.t('test.simple')).toBe('Einfache Testnachricht');
            expect(fixtureI18n.t('test.withParam', 'Welt')).toBe('Hallo Welt!');
        });

        test('should validate translation structure', () => {
            // Verify our translations have the expected structure
            expect(translations.en).toHaveProperty('lang');
            expect(translations.en).toHaveProperty('simple');
            expect(translations.en).toHaveProperty('nested');
            expect(translations.en.nested).toHaveProperty('deep');
            expect(translations.en.nested.deeper).toHaveProperty('value');

            expect(translations.de).toHaveProperty('lang');
            expect(translations.de).toHaveProperty('simple');
            expect(translations.de).toHaveProperty('nested');
        });
    });
});

// EOF webapp/tests/unit/translations/i18n-functions.test.js
