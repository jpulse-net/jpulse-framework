// webapp/static/view/shared/JPulseFooter.js
// Footer component (plain JavaScript object, no ES6 imports)

const JPulseFooter = {
  name: 'JPulseFooter',
  inject: ['$context'],
  template: `
    <footer class="jpulse-footer">
      <div class="jpulse-container">
        <div class="jpulse-footer-content">
          <p>&copy; {{ new Date().getFullYear() }} jPulse Framework v{{ $context.app.version }}</p>
          <div class="jpulse-footer-links">
            <a href="/about">About</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  `
};

// Auto-register with jPulse framework
if (window.jPulse && window.jPulse.registerComponent) {
  window.jPulse.registerComponent('shared', 'JPulseFooter', JPulseFooter);
}