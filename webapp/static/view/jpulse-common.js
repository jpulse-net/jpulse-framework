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
  logClient: (data) => {
    try {
        jPulseCommon.apiCall('/api/1/log/client', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    } catch (e) {
        // Fail silently if logging fails
        console.error('Failed to log client event:', e);
    }
  },

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
