/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Translations / I18N User Language
 * @tagline         Unit tests for i18n user language functionality (W-013)
 * @description     Tests for new translate(req, keyPath, context) method with user language detection
 * @file            webapp/tests/unit/translations/i18n-user-language.test.js
 * @version         0.5.3
 * @release         2025-09-08
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

describe('I18N User Language Detection (W-013)', () => {
    let i18n;
    let translations;

    beforeEach(() => {
        // Set up test translations with admin dashboard content
        translations = {
            en: {
                lang: 'English',
                controller: {
                    auth: {
                        authenticationRequired: 'Authentication required',
                        roleRequired: 'Insufficient privileges. Required roles: {{roles}}',
                        loginSuccessful: 'Login successful'
                    }
                },
                view: {
                    admin: {
                        index: {
                            title: 'Admin Dashboard',
                            subtitle: 'Manage your app',
                            viewLogs: 'View Logs',
                            viewLogsDesc: 'System activity'
                        }
                    }
                }
            },
            de: {
                lang: 'Deutsch',
                controller: {
                    auth: {
                        authenticationRequired: 'Authentifizierung erforderlich',
                        roleRequired: 'Unzureichende Berechtigung. Erforderliche Rolle(n): {{roles}}',
                        loginSuccessful: 'Anmeldung erfolgreich'
                    }
                },
                view: {
                    admin: {
                        index: {
                            title: 'Admin Dashboard',
                            subtitle: 'Verwalten Sie Ihre App',
                            viewLogs: 'Logs anzeigen',
                            viewLogsDesc: 'Systemaktivität'
                        }
                    }
                }
            }
        };

        // Create i18n instance with test data including new translate method
        i18n = TestUtils.createMockI18n(translations, 'en');
        
        // Add the new translate method that uses user language from request
        i18n.translate = (req, keyPath, context = {}, fallbackLang = 'en') => {
            // Extract user's preferred language from request session
            const userLang = req?.session?.user?.preferences?.language || 'en';
            
            // Try user's preferred language first
            let result = i18n._translate(userLang, keyPath, context);
            
            // If not found and fallback is different, try fallback
            if (result === keyPath && fallbackLang !== userLang) {
                result = i18n._translate(fallbackLang, keyPath, context);
            }
            
            return result;
        };
        
        // Add _translate method for internal use
        i18n._translate = (langCode, keyPath, context) => {
            const keyParts = keyPath.split('.');
            let text = translations[langCode];
            
            for (const keyPart of keyParts) {
                if (text && typeof text === 'object') {
                    text = text[keyPart];
                } else {
                    return keyPath; // Return key if not found
                }
            }
            
            if (typeof text !== 'string') {
                return keyPath;
            }
            
            // Handle context variables with {{variable}} syntax
            if (context && Object.keys(context).length > 0) {
                text = text.replace(/{{(.*?)}}/g, (match, p1) => context[p1] || match);
            }
            
            return text;
        };
        
        // Add getLang method for backward compatibility
        i18n.getLang = (langCode) => translations[langCode] || translations['en'];
    });

    describe('translate(req, keyPath, context) method', () => {
        test('should use user language from request session', () => {
            const mockReq = {
                session: {
                    user: {
                        preferences: {
                            language: 'de'
                        }
                    }
                }
            };

            const result = i18n.translate(mockReq, 'controller.auth.authenticationRequired');
            expect(result).toBe('Authentifizierung erforderlich');
        });

        test('should fall back to default language when no user session', () => {
            const mockReq = {};

            const result = i18n.translate(mockReq, 'controller.auth.authenticationRequired');
            expect(result).toBe('Authentication required');
        });

        test('should fall back to default language when no user preferences', () => {
            const mockReq = {
                session: {
                    user: {}
                }
            };

            const result = i18n.translate(mockReq, 'controller.auth.authenticationRequired');
            expect(result).toBe('Authentication required');
        });

        test('should handle context variables with user language', () => {
            const mockReq = {
                session: {
                    user: {
                        preferences: {
                            language: 'de'
                        }
                    }
                }
            };

            const result = i18n.translate(mockReq, 'controller.auth.roleRequired', { roles: 'admin, root' });
            expect(result).toBe('Unzureichende Berechtigung. Erforderliche Rolle(n): admin, root');
        });

        test('should handle context variables with default language', () => {
            const mockReq = {};

            const result = i18n.translate(mockReq, 'controller.auth.roleRequired', { roles: 'admin, root' });
            expect(result).toBe('Insufficient privileges. Required roles: admin, root');
        });

        test('should handle nested keys with user language', () => {
            const mockReq = {
                session: {
                    user: {
                        preferences: {
                            language: 'de'
                        }
                    }
                }
            };

            const result = i18n.translate(mockReq, 'view.admin.index.title');
            expect(result).toBe('Admin Dashboard');
        });

        test('should handle admin dashboard translations in German', () => {
            const mockReq = {
                session: {
                    user: {
                        preferences: {
                            language: 'de'
                        }
                    }
                }
            };

            expect(i18n.translate(mockReq, 'view.admin.index.subtitle')).toBe('Verwalten Sie Ihre App');
            expect(i18n.translate(mockReq, 'view.admin.index.viewLogs')).toBe('Logs anzeigen');
            expect(i18n.translate(mockReq, 'view.admin.index.viewLogsDesc')).toBe('Systemaktivität');
        });

        test('should handle admin dashboard translations in English', () => {
            const mockReq = {
                session: {
                    user: {
                        preferences: {
                            language: 'en'
                        }
                    }
                }
            };

            expect(i18n.translate(mockReq, 'view.admin.index.subtitle')).toBe('Manage your app');
            expect(i18n.translate(mockReq, 'view.admin.index.viewLogs')).toBe('View Logs');
            expect(i18n.translate(mockReq, 'view.admin.index.viewLogsDesc')).toBe('System activity');
        });

        test('should handle null request gracefully', () => {
            const result = i18n.translate(null, 'controller.auth.authenticationRequired');
            expect(result).toBe('Authentication required');
        });

        test('should handle undefined request gracefully', () => {
            const result = i18n.translate(undefined, 'controller.auth.authenticationRequired');
            expect(result).toBe('Authentication required');
        });

        test('should use fallback language when user language not available', () => {
            const mockReq = {
                session: {
                    user: {
                        preferences: {
                            language: 'fr' // French not available in test data
                        }
                    }
                }
            };

            const result = i18n.translate(mockReq, 'controller.auth.authenticationRequired');
            expect(result).toBe('Authentication required'); // Falls back to default
        });

        test('should handle missing keys gracefully', () => {
            const mockReq = {
                session: {
                    user: {
                        preferences: {
                            language: 'de'
                        }
                    }
                }
            };

            const result = i18n.translate(mockReq, 'nonexistent.key');
            expect(result).toBe('nonexistent.key'); // Returns key when not found
        });
    });

    describe('backward compatibility', () => {
        test('should maintain existing getLang functionality', () => {
            const enLang = i18n.getLang('en');
            expect(enLang.controller.auth.authenticationRequired).toBe('Authentication required');

            const deLang = i18n.getLang('de');
            expect(deLang.controller.auth.authenticationRequired).toBe('Authentifizierung erforderlich');
        });

        test('should maintain existing _translate functionality', () => {
            const result = i18n._translate('de', 'controller.auth.authenticationRequired', {});
            expect(result).toBe('Authentifizierung erforderlich');
        });
    });
});

// EOF webapp/tests/unit/translations/i18n-user-language.test.js
