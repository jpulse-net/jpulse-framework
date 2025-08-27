/**
 * @name            jPulse Framework / WebApp / Translations / I18N
 * @tagline         Internationalization for the jPulse Framework WebApp
 * @description     This is the i18n file for the jPulse Framework WebApp
 * @file            webapp/translations/i18n.js
 * @version         0.2.7
 * @release         2025-08-27
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           50%, Cursor 1.2, Claude Sonnet 4
 */

// Load required modules for path resolution
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to load translations from .conf file
async function loadTranslations() {
    const i18n = {
        langs: {},
        default: 'en'
    };
    const files = [
        path.join(__dirname, 'lang-en.conf'),
        path.join(__dirname, 'lang-de.conf')
    ];
    try {
        const fs = await import('fs');
        for(const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const fn = new Function(`return (
                ${content}
            )`); // extra newlines in case content ends in a // comment
            const obj = fn();
            const lang = Object.keys(obj)[0];
            i18n.langs[lang] = obj[lang];
        }
        return i18n;
    } catch (error) {
        console.error(`Error: Failed to load translations:`, error);
        process.exit(1);
    }
}

// Load translations and export
const i18n = await loadTranslations();
const lang = appConfig.i18n.default;
if(i18n.langs[lang]) {
    i18n.default = lang; // set the default language
} else {
    console.error(`Error: Language ${lang} not found in translations`);
    process.exit(1);
}

export default i18n;

// EOF webapp/translations/i18n.js
