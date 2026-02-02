/*
 * @name            jPulse Framework / Plugins / Hello-World / WebApp / View / jPulse Navigation
 * @tagline         Navigation of the Hello World Plugin
 * @description     Navigation for the Hello World Plugin, appended to the framework navigation
 * @file            plugins/hello-world/webapp/view/jpulse-navigation.js
 * @version         1.6.5
 * @release         2026-02-02
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.1, Claude Sonnet 4.5
 */

/**
 * Hello World Plugin - Navigation Integration
 * This file is appended to framework navigation (W-098 append mode)
 */

// Add Hello World Plugin to Examples section
if (window.jPulseNavigation?.site?.siteHelloExamples) {
    // Add plugin page to examples menu
    window.jPulseNavigation.site.siteHelloExamples.pages.helloPlugin = {
        label: 'Hello World Plugin',
        url: '/hello-plugin/',
        icon: '🔌'
    };
}

// Add Hello World Plugin to jPulse Plugins section
if (window.jPulseNavigation?.site?.jPulsePlugins) {
    // Add plugin page to jPulse Plugins menu
    window.jPulseNavigation.site.jPulsePlugins.pages.helloPlugin = {
        label: 'Hello World Plugin',
        url: '/jpulse-plugins/hello-world.shtml',
        icon: '🔌'
    };
}

// Alternative: Create a new top-level section for plugins (commented out)
// if (window.jPulseNavigation && window.jPulseNavigation.site) {
//     if (!window.jPulseNavigation.site.plugins) {
//         window.jPulseNavigation.site.plugins = {
//             label: 'Plugins',
//             url: '/plugins/',
//             icon: '🔌',
//             pages: {
//                 helloWorld: {
//                     label: 'Hello World',
//                     url: '/hello-plugin/',
//                     icon: '👋'
//                 }
//             }
//         };
//     }
// }

// EOF plugins/hello-world/webapp/view/jpulse-navigation.js
