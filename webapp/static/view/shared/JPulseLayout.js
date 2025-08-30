// webapp/static/view/shared/JPulseLayout.js
// Main layout component (plain JavaScript object, no ES6 imports)

const JPulseLayout = {
  name: 'JPulseLayout',
  inject: ['$context'],
  template: `
    <div class="jpulse-app">
      <JPulseHeader />
      <main class="jpulse-main">
        <slot></slot>
      </main>
      <JPulseFooter />
    </div>
  `
};

// Auto-register with jPulse framework
if (window.jPulse && window.jPulse.registerComponent) {
  window.jPulse.registerComponent('shared', 'JPulseLayout', JPulseLayout);
}