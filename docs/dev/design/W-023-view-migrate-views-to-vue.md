# W-023: View: Vue.js Framework Integration Summary for jPulse

**Context**: Building a custom web framework (jPulse) with Node/Express backend, MongoDB, MVC architecture, and clean framework/site separation. Converting from .shtml/Handlebars to complete Vue.js solution while preserving MVC mental model and framework/site separation.

**Recommendation**: Complete Vue.js switch with file structure that mirrors backend MVC pattern and maintains framework/site separation.

## Current File Structure (Before Vue Integration)

```
jpulse-framework/
├── webapp/
│   ├── app.conf                    # App configuration
│   ├── app.js                      # Main application entry
│   ├── controller/                 # Backend controllers
│   │   ├── auth.js                 # Authentication controller
│   │   ├── config.js               # Configuration controller
│   │   ├── log.js                  # Logging controller
│   │   ├── user.js                 # User controller
│   │   └── view.js                 # View controller (serves .shtml)
│   ├── database.js                 # Database connection
│   ├── model/                      # Backend models
│   │   ├── config.js               # Configuration model
│   │   ├── log.js                  # Log model
│   │   └── user.js                 # User model
│   ├── routes.js                   # Express routing
│   ├── static/                     # Static assets (served by nginx/express)
│   │   ├── apple-touch-icon.png
│   │   ├── common/
│   │   │   └── readme.txt
│   │   ├── favicon-16x16.png
│   │   ├── favicon-32x32.png
│   │   ├── favicon.ico
│   │   ├── images/
│   │   │   ├── favicon/
│   │   │   │   └── readme.txt
│   │   │   └── readme.txt
│   │   ├── robots.txt
│   │   └── site.webmanifest
│   ├── tests/                      # Test files (omitted)
│   ├── translations/               # Internationalization
│   │   ├── i18n.js
│   │   ├── lang-de.conf
│   │   └── lang-en.conf
│   ├── utils/                      # Utility functions
│   │   └── common.js
│   └── view/                       # Current .shtml templates
│       ├── auth/
│       │   ├── login.shtml
│       │   ├── logout.shtml
│       │   └── signup.shtml
│       ├── error/
│       │   └── index.shtml
│       ├── home/
│       │   └── index.shtml
│       ├── user/
│       │   ├── index.shtml
│       │   └── profile.shtml
│       ├── jpulse-common.js        # Current utilities
│       ├── jpulse-footer.tmpl      # Footer template
│       └── jpulse-header.tmpl      # Header template
└── site/                           # Site-specific customizations
    └── webapp/
        └── (site overrides go here)
```

## Enhanced File Structure (After Vue Integration)

```
jpulse-framework/
├── webapp/
│   ├── app.conf                    # App configuration
│   ├── app.js                      # Main application entry
│   ├── controller/                 # Backend controllers
│   │   ├── auth.js                 # Authentication controller
│   │   ├── config.js               # Configuration controller
│   │   ├── log.js                  # Logging controller
│   │   ├── user.js                 # User controller
│   │   └── view.js                 # Enhanced view controller (serves Vue apps)
│   ├── database.js                 # Database connection
│   ├── model/                      # Backend models
│   │   ├── config.js               # Configuration model
│   │   ├── log.js                  # Log model
│   │   └── user.js                 # User model
│   ├── routes.js                   # Express routing
│   ├── static/                     # Static assets (served by nginx/express)
│   │   ├── apple-touch-icon.png
│   │   ├── common/
│   │   │   └── readme.txt
│   │   ├── favicon-16x16.png
│   │   ├── favicon-32x32.png
│   │   ├── favicon.ico
│   │   ├── images/
│   │   │   ├── favicon/
│   │   │   │   └── readme.txt
│   │   │   └── readme.txt
│   │   ├── robots.txt
│   │   ├── site.webmanifest
│   │   ├── vue.js                  # Vue.js library
│   │   ├── jpulse-styles.css       # Framework CSS
│   │   └── view/                   # Vue components & assets (served as static)
│   │       ├── jpulse-vue-core.js  # Framework Vue core
│   │       ├── jpulse-common.js    # Enhanced utilities
│   │       ├── shared/
│   │       │   ├── JPulseLayout.vue
│   │       │   ├── JPulseHeader.vue
│   │       │   ├── JPulseFooter.vue
│   │       │   ├── JPulseLiveTable.vue
│   │       │   ├── JPulseModal.vue
│   │       │   └── components.js
│   │       ├── auth/
│   │       │   ├── Login.vue
│   │       │   ├── Signup.vue
│   │       │   ├── Logout.vue
│   │       │   ├── components/
│   │       │   │   ├── LoginForm.vue
│   │       │   │   └── PasswordReset.vue
│   │       │   └── components.js
│   │       ├── home/
│   │       │   ├── Home.vue
│   │       │   └── components.js
│   │       ├── user/
│   │       │   ├── Profile.vue
│   │       │   ├── UserList.vue
│   │       │   ├── components/
│   │       │   │   ├── UserEditor.vue
│   │       │   │   └── UserCard.vue
│   │       │   └── components.js
│   │       └── error/
│   │           ├── NotFound.vue
│   │           ├── ServerError.vue
│   │           └── components.js
│   ├── tests/                      # Test files + Vue component tests
│   ├── translations/               # Internationalization
│   │   ├── i18n.js
│   │   ├── lang-de.conf
│   │   └── lang-en.conf
│   ├── utils/                      # Utility functions
│   │   └── common.js
│   └── view/                       # DEPRECATED - old .shtml templates
│       └── (keep temporarily for reference during migration)
└── site/
    └── webapp/
        ├── static/                 # Site-specific static assets
        │   ├── site-styles.css     # Site CSS overrides
        │   └── view/               # Site Vue components (served as static)
        │       ├── site-app.js     # Site Vue app configuration
        │       ├── user/           # Site user component overrides
        │       │   ├── CustomProfile.vue
        │       │   ├── components/
        │       │   │   └── SiteUserCard.vue
        │       │   └── components.js
        │       ├── dashboard/      # Site-specific section
        │       │   ├── SalesDashboard.vue
        │       │   ├── AdminDashboard.vue
        │       │   ├── components/
        │       │   │   ├── SalesChart.vue
        │       │   │   └── MetricsPanel.vue
        │       │   └── components.js
        │       └── reports/        # Another site-specific section
        │           ├── SalesReport.vue
        │           ├── UserReport.vue
        │           └── components.js
        └── (other site-specific files)
```

## Updated Static File Serving Strategy

Since `webapp/static` is served by nginx in production and express in development, the Vue components and assets need to be accessible as static files:

### Framework Static Assets (served from webapp/static/)
```
webapp/static/
├── vue.js                          # Vue.js library
├── jpulse-styles.css               # Framework CSS
└── view/                           # Vue components as static assets
    ├── jpulse-vue-core.js          # Framework Vue integration
    ├── jpulse-common.js            # Enhanced utilities
    ├── shared/
    │   ├── JPulseLayout.vue
    │   ├── JPulseHeader.vue
    │   ├── JPulseFooter.vue
    │   ├── JPulseLiveTable.vue
    │   └── components.js           # Registers shared components
    ├── auth/
    │   ├── Login.vue
    │   ├── Signup.vue
    │   └── components.js
    ├── home/
    │   ├── Home.vue
    │   └── components.js
    ├── user/
    │   ├── Profile.vue
    │   ├── UserList.vue
    │   └── components.js
    └── error/
        ├── NotFound.vue
        ├── ServerError.vue
        └── components.js
```

### Site Static Assets (served from site/webapp/static/)
```
site/webapp/static/
├── site-styles.css                 # Site CSS overrides
└── view/                          # Site Vue components as static
    ├── site-app.js                # Site configuration
    ├── user/
    │   ├── CustomProfile.vue      # Override framework Profile
    │   └── components.js
    ├── dashboard/
    │   ├── SalesDashboard.vue
    │   └── components.js
    └── reports/
        ├── SalesReport.vue
        └── components.js
```

## Framework Component Registration (Framework Layer)

```javascript
// webapp/static/view/shared/components.js
// Register framework shared components
window.jPulse.registerFrameworkComponents('shared', {
  JPulseLayout: () => import('./JPulseLayout.vue'),
  JPulseHeader: () => import('./JPulseHeader.vue'),
  JPulseFooter: () => import('./JPulseFooter.vue'),
  JPulseLiveTable: () => import('./JPulseLiveTable.vue')
});

// webapp/static/view/user/components.js
// Register framework user components
window.jPulse.registerFrameworkComponents('user', {
  Profile: () => import('./Profile.vue'),
  UserList: () => import('./UserList.vue')
});

// webapp/static/view/auth/components.js
// Register framework auth components
window.jPulse.registerFrameworkComponents('auth', {
  Login: () => import('./Login.vue'),
  Signup: () => import('./Signup.vue'),
  Logout: () => import('./Logout.vue')
});

// webapp/static/view/home/components.js
// Register framework home components
window.jPulse.registerFrameworkComponents('home', {
  Home: () => import('./Home.vue')
});

// webapp/static/view/error/components.js
// Register framework error components
window.jPulse.registerFrameworkComponents('error', {
  NotFound: () => import('./NotFound.vue'),
  ServerError: () => import('./ServerError.vue')
});
```

## Site Override Pattern (Site Layer)

```javascript
// site/webapp/static/view/user/components.js - Site user overrides
// Override framework Profile component
window.jPulse.registerSiteComponents('user', {
  Profile: () => import('./CustomProfile.vue')  // This will override framework Profile
});

// site/webapp/static/view/dashboard/components.js - Site-specific section
// Register site-only dashboard components (not in framework)
window.jPulse.registerSiteComponents('dashboard', {
  SalesDashboard: () => import('./SalesDashboard.vue'),
  AdminDashboard: () => import('./AdminDashboard.vue')
});

// site/webapp/static/view/reports/components.js - Another site-only section
window.jPulse.registerSiteComponents('reports', {
  SalesReport: () => import('./SalesReport.vue'),
  UserReport: () => import('./UserReport.vue')
});

// site/webapp/static/view/site-app.js - Site configuration
window.jPulseSiteConfig = {
  // Site-specific Vue app configuration
  theme: 'corporate',
  features: {
    dashboard: true,
    reports: true,
    analytics: true
  },
  // Custom route mappings for site-only sections
  routes: {
    '/dashboard': 'dashboard',
    '/dashboard/sales': 'dashboard',
    '/dashboard/admin': 'dashboard',
    '/reports': 'reports',
    '/reports/sales': 'reports',
    '/reports/users': 'reports'
  }
};
```

```javascript
// Framework view controller enhanced for Vue + separation
const path = require('path');
const fs = require('fs');

/**
 * Load and serve Vue.js application with framework/site component resolution
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function load(req, res) {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const loginId = req.session?.user?.loginId || '(guest)';

  try {
    // Log the request
    logController.consoleApi(req, `view.load( ${req.path} )`);

    // Determine section from path (maintains MVC mental model)
    const pathParts = req.path.split('/').filter(p => p);
    const section = pathParts[0] || 'home';  // user, auth, dashboard, home, etc.
    const page = pathParts[1] || 'index';

    // Get global config for context
    const globalConfig = await configModel.findById('global');

    // Build context (same as before but enhanced for Vue routing)
    const context = {
      app: {
        version: appConfig.app.jPulse.version,
        release: appConfig.app.jPulse.release
      },
      user: {
        id: req.session?.user?.id || '',
        firstName: req.session?.user?.firstName || '',
        nickName: req.session?.user?.nickName || '',
        lastName: req.session?.user?.lastName || '',
        email: req.session?.user?.email || '',
        initials: req.session?.user?.initials || '?',
        isAuthenticated: !!req.session?.user
      },
      config: globalConfig?.data || {},
      appConfig: appConfig,
      url: {
        domain: `${req.protocol}://${req.get('host')}`,
        protocol: req.protocol,
        hostname: req.hostname,
        port: req.get('host')?.split(':')[1] || '',
        pathname: req.path,
        search: req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '',
        param: req.query || {}
      },
      i18n: i18n.getLang(AuthController.getUserLanguage(req)),
      // Add routing info for Vue
      route: {
        section,
        page,
        path: req.path,
        fullPath: req.url
      },
      req: req
    };

    // Serve Vue app bootstrap HTML
    const html = generateVueAppHtml(context, section);

    // Log completion time
    const duration = Date.now() - startTime;
    logController.console(req, `view.load completed in ${duration}ms`);

    res.set('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    logController.error(req, `view.load error: ${error.message}`);
    res.status(500).send('Internal server error');
  }
}

/**
 * Generate Vue app HTML with framework/site component loading
 */
function generateVueAppHtml(context, section) {
  return `<!DOCTYPE html>
<html {{appConfig.system.htmlAttrs}}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${context.app.jPulse.version} - jPulse</title>

  <!-- Framework styles -->
  <link rel="stylesheet" href="/static/view/jpulse-styles.css">

  <!-- Site-specific styles if they exist -->
  <link rel="stylesheet" href="/static/site/webapp/view/site-styles.css">
</head>
<body>
  <div id="app">
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading jPulse...</p>
    </div>
  </div>

  <!-- Context data for Vue hydration -->
  <script type="application/json" id="jpulse-context">
${JSON.stringify(context, null, 2)}
  </script>

  <!-- Framework dependencies -->
  <script src="/static/vue.js"></script>
  <script src="/static/view/jpulse-common.js"></script>
  <script src="/static/view/jpulse-vue-core.js"></script>

  <!-- Load framework components for this section -->
  <script src="/static/view/shared/components.js"></script>
  <script src="/static/view/${section}/components.js"></script>

  <!-- Load site components (overrides + custom sections) -->
  <script src="/static/site/webapp/view/${section}/components.js"></script>
  <script src="/static/site/webapp/view/site-app.js"></script>

  <script>
    // Initialize Vue app with framework/site component resolution
    document.addEventListener('DOMContentLoaded', function() {
      jPulse.initApp('${section}', ${JSON.stringify(context.route)});
    });
  </script>
</body>
</html>`;
}

module.exports = {
  load
};
```

## Enhanced webapp/static/view/jpulse-common.js

```javascript
// webapp/static/view/jpulse-common.js - Enhanced utilities for Vue integration
// This file is served as a static asset and loaded before Vue components

window.jPulseCommon = {
  // Existing UI Utilities (enhanced for Vue compatibility)
  alert: (message, type = 'info') => {
    // Custom modal implementation that works with Vue
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = `jpulse-alert jpulse-alert-${type}`;
      modal.innerHTML = `
        <div class="jpulse-alert-backdrop">
          <div class="jpulse-alert-content">
            <p>${message}</p>
            <button class="jpulse-btn jpulse-btn-primary" onclick="this.closest('.jpulse-alert').remove(); arguments[0].resolve()">OK</button>
          </div>
        </div>
      `;
      modal.onclick = (e) => { if (e.target === modal) { modal.remove(); resolve(); } };
      document.body.appendChild(modal);
    });
  },

  confirm: (message) => {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'jpulse-confirm';
      modal.innerHTML = `
        <div class="jpulse-confirm-backdrop">
          <div class="jpulse-confirm-content">
            <p>${message}</p>
            <div class="jpulse-confirm-buttons">
              <button class="jpulse-btn jpulse-btn-secondary" onclick="this.closest('.jpulse-confirm').remove(); arguments[0].resolve(false)">Cancel</button>
              <button class="jpulse-btn jpulse-btn-primary" onclick="this.closest('.jpulse-confirm').remove(); arguments[0].resolve(true)">OK</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    });
  },

  showMessage: (message, type = 'info', duration = 5000) => {
    const toast = document.createElement('div');
    toast.className = `jpulse-toast jpulse-toast-${type}`;
    toast.innerHTML = `
      <div class="jpulse-toast-content">
        <span class="jpulse-toast-icon">${type === 'error' ? '⚠' : type === 'success' ? '✓' : 'ℹ'}</span>
        <span class="jpulse-toast-message">${message}</span>
        <button class="jpulse-toast-close" onclick="this.closest('.jpulse-toast').remove()">×</button>
      </div>
    `;

    // Add to toast container or create one
    let container = document.querySelector('.jpulse-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'jpulse-toast-container';
      document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, duration);
  },

  // Existing Browser/Device Detection
  detectOs: () => {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Windows') !== -1) return 'Windows';
    if (userAgent.indexOf('Mac') !== -1) return 'Mac';
    if (userAgent.indexOf('Linux') !== -1) return 'Linux';
    if (userAgent.indexOf('Android') !== -1) return 'Android';
    if (userAgent.indexOf('iOS') !== -1) return 'iOS';
    return 'Unknown';
  },

  detectBrowser: () => {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Chrome') !== -1) return 'Chrome';
    if (userAgent.indexOf('Firefox') !== -1) return 'Firefox';
    if (userAgent.indexOf('Safari') !== -1) return 'Safari';
    if (userAgent.indexOf('Edge') !== -1) return 'Edge';
    return 'Unknown';
  },

  isMobile: () => window.innerWidth <= 768,
  isTouchDevice: () => 'ontouchstart' in window,
  windowHasFocus: () => document.hasFocus(),

  // Existing Cookie Management
  getCookie: (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  },

  setCookie: (name, value, days = 30) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  },

  // Enhanced String Utilities
  entityEncode: (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  entityDecode: (str) => {
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent;
  },

  // Enhanced Form Utilities
  validateForm: (formElement) => {
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    const errors = [];

    inputs.forEach(input => {
      if (!input.value.trim()) {
        errors.push(`${input.name || input.id} is required`);
        input.classList.add('jpulse-input-error');
      } else {
        input.classList.remove('jpulse-input-error');
      }

      // Email validation
      if (input.type === 'email' && input.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value)) {
          errors.push('Please enter a valid email address');
          input.classList.add('jpulse-input-error');
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  serializeForm: (formElement) => {
    const formData = new FormData(formElement);
    const data = {};

    for (let [key, value] of formData.entries()) {
      // Handle multiple values (checkboxes, multi-selects)
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    }

    return data;
  },

  // Enhanced API Helpers with Vue reactivity support
  apiCall: async (endpoint, options = {}) => {
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };

    const config = { ...defaultOptions, ...options };

    // Add CSRF token if available
    const csrfToken = window.jPulseCommon.getCookie('csrf-token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    try {
      const response = await fetch(endpoint, config);

      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Trigger Vue reactivity if components are listening
      if (window.jPulse && window.jPulse.broadcast) {
        window.jPulse.broadcast('api-response', {
          endpoint,
          response: { ...response, data },
          success: response.ok
        });
      }

      // Enhanced response object
      const enhancedResponse = {
        ...response,
        data,
        success: response.ok,
        error: response.ok ? null : new Error(`HTTP ${response.status}: ${response.statusText}`)
      };

      return enhancedResponse;

    } catch (error) {
      // Broadcast error to Vue components
      if (window.jPulse && window.jPulse.broadcast) {
        window.jPulse.broadcast('api-error', { endpoint, error });
      }

      throw error;
    }
  },

  // New utilities for Vue integration
  formatDate: (date, format = 'YYYY-MM-DD') => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day);
  },

  formatTime: (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  },

  formatCurrency: (amount, currency = 'USD') => {
    if (amount == null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle: (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Utility to check if we're in development mode
  isDev: () => {
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.search.includes('debug=true');
  },

  // Simple event emitter for cross-component communication
  eventBus: {
    events: {},

    on(event, callback) {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(callback);
    },

    off(event, callback) {
      if (this.events[event]) {
        this.events[event] = this.events[event].filter(cb => cb !== callback);
      }
    },

    emit(event, data) {
      if (this.events[event]) {
        this.events[event].forEach(callback => callback(data));
      }
    }
  }
};

// Make utilities globally available for backward compatibility
window.jPulse = window.jPulse || {};
Object.assign(window.jPulse, window.jPulseCommon);

// Auto-setup CSS for jPulse components
document.addEventListener('DOMContentLoaded', () => {
  // Add base styles if not already present
  if (!document.querySelector('#jpulse-base-styles')) {
    const style = document.createElement('style');
    style.id = 'jpulse-base-styles';
    style.textContent = `
      .jpulse-toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
      }

      .jpulse-toast {
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin-bottom: 10px;
        animation: jpulse-slide-in 0.3s ease-out;
      }

      .jpulse-toast-success { border-left: 4px solid #4CAF50; }
      .jpulse-toast-error { border-left: 4px solid #f44336; }
      .jpulse-toast-info { border-left: 4px solid #2196F3; }

      .jpulse-input-error {
        border-color: #f44336 !important;
        background-color: #fff5f5 !important;
      }

      @keyframes jpulse-slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
});
```

```javascript
// jpulse-vue-core.js - Core Vue integration with framework/site separation
import { createApp, reactive } from 'vue';

window.jPulse = {
  // Component registry with framework/site separation
  frameworkComponents: {},
  siteComponents: {},
  activeApp: null,

  // WebSocket management with Vue reactivity
  websocket: {
    connections: new Map(),

    connect(endpoint) {
      if (this.connections.has(endpoint)) {
        return this.connections.get(endpoint);
      }

      const ws = new WebSocket(endpoint);
      const reactiveData = reactive({
        connected: false,
        data: {},
        error: null,
        reconnectAttempts: 0
      });

      ws.onopen = () => {
        reactiveData.connected = true;
        reactiveData.error = null;
        reactiveData.reconnectAttempts = 0;
        console.log(`WebSocket connected: ${endpoint}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          reactiveData.data = data;

          // Broadcast to Vue app
          if (this.activeApp) {
            this.activeApp.config.globalProperties.$emit('websocket-message', {
              endpoint,
              data
            });
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      ws.onerror = (error) => {
        reactiveData.error = error;
        reactiveData.connected = false;
        console.error(`WebSocket error on ${endpoint}:`, error);
      };

      ws.onclose = () => {
        reactiveData.connected = false;

        // Attempt reconnection with exponential backoff
        if (reactiveData.reconnectAttempts < 5) {
          const delay = Math.pow(2, reactiveData.reconnectAttempts) * 1000;
          setTimeout(() => {
            reactiveData.reconnectAttempts++;
            this.connect(endpoint);
          }, delay);
        }
      };

      const connection = { ws, reactive: reactiveData };
      this.connections.set(endpoint, connection);
      return connection;
    },

    disconnect(endpoint) {
      const connection = this.connections.get(endpoint);
      if (connection) {
        connection.ws.close();
        this.connections.delete(endpoint);
      }
    }
  },

  // Register framework components
  registerFrameworkComponents(section, componentMap) {
    if (!this.frameworkComponents[section]) {
      this.frameworkComponents[section] = {};
    }
    Object.assign(this.frameworkComponents[section], componentMap);
  },

  // Register site components (can override framework)
  registerSiteComponents(section, componentMap) {
    if (!this.siteComponents[section]) {
      this.siteComponents[section] = {};
    }
    Object.assign(this.siteComponents[section], componentMap);
  },

  // Get component with site override priority
  getComponent(section, componentName) {
    // Site components take priority over framework
    return this.siteComponents[section]?.[componentName] ||
           this.frameworkComponents[section]?.[componentName] ||
           null;
  },

  // Initialize Vue app for specific section
  initApp(section, route) {
    const context = this.getContextData();
    if (!context) {
      console.error('No context data found');
      return;
    }

    // Create main Vue app
    const app = createApp({
      data() {
        return {
          // Inject server context into Vue
          ...context,
          // Add reactive WebSocket connections
          wsConnections: {},
          // Current route info
          $route: route
        };
      },

      methods: {
        // Expose jPulse utilities to all components
        ...window.jPulseCommon,

        // WebSocket connection helper
        connectWebSocket(endpoint) {
          if (!this.wsConnections[endpoint]) {
            this.wsConnections[endpoint] = jPulse.websocket.connect(endpoint);
          }
          return this.wsConnections[endpoint];
        },

        // Navigate to different section (SPA-style)
        navigateTo(path) {
          // Update browser URL without page refresh
          window.history.pushState({}, '', path);

          // Parse new route
          const pathParts = path.split('/').filter(p => p);
          const newSection = pathParts[0] || 'home';
          const newPage = pathParts[1] || 'index';

          this.$route = {
            section: newSection,
            page: newPage,
            path: path,
            fullPath: path
          };

          // Load new section components if needed
          this.loadSectionComponents(newSection);
        }
      },

      // Provide data to all child components
      provide() {
        return {
          $jPulse: this,
          $jPulseCommon: window.jPulseCommon,
          $context: context,
          $route: route
        };
      }
    });

    // Register shared components (available to all sections)
    const sharedComponents = {
      ...this.frameworkComponents.shared,
      ...this.siteComponents.shared
    };

    Object.entries(sharedComponents).forEach(([name, component]) => {
      app.component(name, component);
    });

    // Register section-specific components with site override priority
    const sectionComponents = {
      ...this.frameworkComponents[section],
      ...this.siteComponents[section] // Site components override framework
    };

    Object.entries(sectionComponents).forEach(([name, component]) => {
      app.component(name, component);
    });

    // Mount the app
    this.activeApp = app;
    app.mount('#app');

    console.log(`jPulse Vue app initialized for section: ${section}`);
  },

  // Get hydration data injected by server
  getContextData() {
    const script = document.getElementById('jpulse-context');
    return script ? JSON.parse(script.textContent) : null;
  },

  // Load additional section components dynamically
  async loadSectionComponents(section) {
    try {
      // Dynamically import section components if not already loaded
      if (!this.frameworkComponents[section] && !this.siteComponents[section]) {
        await import(`/static/view/${section}/components.js`);
        await import(`/static/site/webapp/view/${section}/components.js`);
      }
    } catch (error) {
      console.warn(`Could not load components for section: ${section}`, error);
    }
  }
};

// Handle browser back/forward navigation
window.addEventListener('popstate', (event) => {
  if (window.jPulse.activeApp) {
    const path = window.location.pathname;
    window.jPulse.activeApp.navigateTo(path);
  }
});
```

## Example Vue Components

### Framework Layout Component

```vue
<!-- jpulse-framework/webapp/view/shared/JPulseLayout.vue -->
<template>
  <div class="jpulse-app">
    <JPulseHeader
      :user="$context.user"
      :app-version="$context.app.jPulse.version"
      @navigate="$parent.navigateTo" />

    <main class="jpulse-main">
      <slot />
    </main>

    <JPulseFooter
      :ws-status="wsStatus"
      :app-info="$context.app" />
  </div>
</template>

<script>
export default {
  name: 'JPulseLayout',
  inject: ['$context', '$jPulse'],

  data() {
    return {
      wsStatus: { connected: false, connections: 0 }
    };
  },

  created() {
    // Monitor WebSocket connections for footer status
    this.$watch(() => this.$jPulse.websocket.connections.size, (count) => {
      this.wsStatus.connections = count;
      this.wsStatus.connected = count > 0;
    });
  }
};
</script>
```

### Framework User Profile Page

```vue
<!-- jpulse-framework/webapp/view/user/Profile.vue -->
<template>
  <JPulseLayout>
    <div class="user-profile">
      <h1>{{ $context.i18n.user.profile.title }}</h1>

      <div v-if="$context.user.isAuthenticated" class="profile-content">
        <!-- Interactive profile editing -->
        <UserEditor
          :user="$context.user"
          @profile-updated="handleProfileUpdate" />

        <!-- Real-time user activity -->
        <div class="activity-panel">
          <h3>Live Activity</h3>
          <div v-if="activityWs.reactive.connected" class="ws-status connected">
            ● Connected to activity feed
          </div>
          <div v-else class="ws-status disconnected">
            ○ Connecting...
          </div>

          <div class="activity-list">
            <div v-for="activity in activities"
                 :key="activity.id"
                 class="activity-item">
              <span class="timestamp">{{ formatTime(activity.timestamp) }}</span>
              <span class="message">{{ activity.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="alert alert-error">
        {{ $context.i18n.login.notAuthenticated }}
      </div>
    </div>
  </JPulseLayout>
</template>

<script>
import UserEditor from './components/UserEditor.vue';

export default {
  name: 'Profile',
  components: { UserEditor },
  inject: ['$context', '$jPulse'],

  data() {
    return {
      activities: [],
      activityWs: null
    };
  },

  created() {
    if (this.$context.user.isAuthenticated) {
      // Connect to user activity WebSocket
      this.activityWs = this.$jPulse.connectWebSocket(
        `/ws/user/${this.$context.user.id}/activity`
      );

      // Watch for new activity data
      this.$watch(() => this.activityWs.reactive.data, (newData) => {
        if (newData && newData.type === 'activity') {
          this.activities.unshift(newData.payload);
          // Keep only last 20 activities
          if (this.activities.length > 20) {
            this.activities = this.activities.slice(0, 20);
          }
        }
      }, { deep: true });
    }
  },

  methods: {
    async handleProfileUpdate(updatedData) {
      try {
        const response = await this.apiCall('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });

        if (response.ok) {
          // Update context user data
          Object.assign(this.$context.user, updatedData);
          this.showMessage('Profile updated successfully', 'success');
        }
      } catch (error) {
        this.showMessage('Error updating profile', 'error');
      }
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString();
    }
  }
};
</script>
```

### Site Custom Profile Override

```vue
<!-- site/webapp/view/user/CustomProfile.vue -->
<template>
  <JPulseLayout>
    <div class="custom-user-profile">
      <h1>{{ $context.i18n.user.profile.title }} - Custom Site Version</h1>

      <div v-if="$context.user.isAuthenticated" class="profile-content">
        <!-- Use custom site components -->
        <SiteUserCard :user="$context.user" />

        <!-- Site-specific feature: Sales performance -->
        <div class="sales-performance" v-if="salesData">
          <h3>Your Sales Performance</h3>
          <SalesChart :data="salesData" />
        </div>

        <!-- Still use framework components where appropriate -->
        <UserEditor
          :user="$context.user"
          @profile-updated="handleProfileUpdate" />
      </div>
    </div>
  </JPulseLayout>
</template>

<script>
import UserEditor from '../../../jpulse-framework/webapp/view/user/components/UserEditor.vue';
import SiteUserCard from './components/SiteUserCard.vue';
import SalesChart from '../dashboard/components/SalesChart.vue';

export default {
  name: 'CustomProfile',
  components: { UserEditor, SiteUserCard, SalesChart },
  inject: ['$context', '$jPulse'],

  data() {
    return {
      salesData: null
    };
  },

  async created() {
    if (this.$context.user.isAuthenticated) {
      // Load site-specific sales data
      await this.loadSalesData();
    }
  },

  methods: {
    async loadSalesData() {
      try {
        const response = await this.apiCall(`/api/user/${this.$context.user.id}/sales`);
        if (response.ok) {
          this.salesData = await response.json();
        }
      } catch (error) {
        console.error('Error loading sales data:', error);
      }
    },

    async handleProfileUpdate(updatedData) {
      // Call parent logic but add site-specific handling
      // ... same as framework Profile.vue but with site-specific enhancements
    }
  }
};
</script>
```

## Migration Strategy

### Phase 1: Infrastructure Setup
1. Install Vue.js dependencies
2. Create `jpulse-vue-core.js` framework integration
3. Enhance `jpulse-common.js` utilities
4. Modify `view.controller.js` for Vue app serving
5. Create shared layout components (`JPulseLayout`, `JPulseHeader`, `JPulseFooter`)

### Phase 2: Section-by-Section Conversion
1. **Start with home section**: Convert `home/index.shtml` → `home/Home.vue`
2. **Convert user section**: `user/profile.shtml` → `user/Profile.vue`
3. **Convert auth section**: `auth/login.shtml` → `auth/Login.vue`
4. **Add WebSocket integration**: Real-time features for interactive components
5. **Test framework/site separation**: Ensure site overrides work properly

### Phase 3: Advanced Features & Optimization
1. **Site-specific sections**: Add dashboard, reports, etc. in site layer
2. **Performance optimization**: Component lazy loading, code splitting
3. **Testing integration**: Vue component tests + E2E tests
4. **Documentation**: Framework component library, site customization guide

## Key Benefits

### Preserved Architecture Benefits
- **MVC Mental Model**: `/user/profile` → user.controller.js → user.model.js → user/Profile.vue
- **Framework/Site Separation**: Framework provides base, sites override/extend cleanly
- **Consistent Navigation**: Section-based routing matches backend controller structure
- **Clean Updates**: Framework updates don't break site customizations

### Vue.js Benefits
- **Modern Development**: Component-based architecture, reactive data binding
- **Real-time Capabilities**: WebSocket integration with Vue reactivity
- **Large Talent Pool**: Easy to hire Vue.js developers
- **Rich Ecosystem**: Access to Vue.js plugins, tools, and community

### Integration Benefits
- **Server Context Available**: User session, i18n, config automatically in Vue components
- **Progressive Enhancement**: Can mix server-rendered fallbacks with Vue interactivity
- **Unified Utilities**: jPulse utilities work seamlessly with Vue components
- **Consistent Styling**: Framework CSS with site-specific overrides

This approach gives you a modern, maintainable Vue.js application while preserving the excellent architectural decisions of your existing jPulse framework.
