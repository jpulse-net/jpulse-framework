// webapp/static/view/shared/JPulseHeader.js
// Header component (plain JavaScript object, no ES6 imports)

const JPulseHeader = {
  name: 'JPulseHeader',
  inject: ['$context'],
  template: `
    <header class="jpulse-header">
      <div class="jpulse-container">
        <div class="jpulse-header-content">
          <div class="jpulse-logo">
            <h1>{{ $context.app.version }}</h1>
          </div>
          <nav class="jpulse-nav" v-if="$context.user.authenticated">
            <a href="/home/">Home</a>
            <a href="/user/profile">Profile</a>
            <a href="/auth/logout">Logout</a>
          </nav>
          <nav class="jpulse-nav" v-else>
            <a href="/auth/login">Sign In</a>
            <a href="/auth/signup">Sign Up</a>
          </nav>
        </div>
      </div>
    </header>
  `
};

// Auto-register with jPulse framework
if (window.jPulse && window.jPulse.registerComponent) {
  window.jPulse.registerComponent('shared', 'JPulseHeader', JPulseHeader);
}