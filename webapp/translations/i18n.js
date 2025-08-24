/**
 * @name            Bubble Framework / WebApp / Translations / I18N
 * @tagline         Internationalization for the Bubble Framework WebApp
 * @description     This is the i18n file for the Bubble Framework WebApp
 * @file            webapp/translations/i18n.js
 * @version         0.1.2
 * @release         2025-08-24
 * @repository      https://github.com/peterthoeny/bubble-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           50%, Cursor 1.2, Claude Sonnet 4
 */

// Load the English translation file, it defines the i18n.en object
// FIXME: Hack to get the i18n object into the global scope
// FIXME: Read all *.conf files in the translations directory
// FIXME: Merge the i18n objects into the i18n object
// FIXME: Return the i18n object

// Function to load translations from .conf file
async function loadTranslations() {
    const i18n = {
        langs: {},
        default: 'en'
    };
    const files = [
        './webapp/translations/lang-en.conf',
        './webapp/translations/lang-de.conf'
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
        console.error(`Error: Failed to load translations from ${file}:`, error);
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
//console.log('i18n B:', JSON.stringify(i18n, null, 2));
i18n.t = (key, ...args) => {
    const keyParts = key.split('.');
    let text = i18n.langs[i18n.default];
    for(const keyPart of keyParts) {
        text = text[keyPart];
    }
    if(args.length > 0) {
        text = text.replace(/{(\d+)}/g, (match, p1) => args[p1]);
    }
    return text;
}
console.log(i18n.t('login.notAuthenticated'));
export default i18n;

// EOF i18n.js
