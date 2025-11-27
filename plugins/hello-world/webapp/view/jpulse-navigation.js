/**
 * Hello World Plugin - Navigation Integration
 * This file is appended to framework navigation (W-098 append mode)
 */

// Add Hello World Plugin to Examples section
if (window.jPulseNavigation && window.jPulseNavigation.site && window.jPulseNavigation.site.examples) {
    // Add plugin page to examples menu
    if (!window.jPulseNavigation.site.examples.pages.helloPlugin) {
        window.jPulseNavigation.site.examples.pages.helloPlugin = {
            label: 'Hello World Plugin',
            url: '/hello-plugin/',
            icon: '🔌'
        };
    }
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
