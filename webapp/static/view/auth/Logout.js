// webapp/static/view/auth/Logout.js
// Logout component definition (plain JavaScript object, no ES6 imports)

const Logout = {
  name: 'Logout',
  inject: ['$context'],
  data() {
    return {
      loading: true
    };
  },
  async mounted() {
    // Automatically perform logout when component mounts
    try {
      const response = await fetch('/api/1/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        // Redirect to home page after successful logout
        window.location.href = '/home/';
      } else {
        console.error('Logout failed');
        // Redirect anyway for security
        window.location.href = '/home/';
      }
    } catch (err) {
      console.error('Logout error:', err);
      // Redirect anyway for security
      window.location.href = '/home/';
    }
  },
  template: `
    <JPulseLayout>
      <div class="auth-page">
        <div class="auth-container">
          <div class="auth-card">
            <h1>Signing Out</h1>
            <div class="loading-message">
              <p>Please wait while we sign you out...</p>
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    </JPulseLayout>
  `
};

// Auto-register with jPulse framework
if (window.jPulse && window.jPulse.registerComponent) {
  window.jPulse.registerComponent('auth', 'Logout', Logout);
}
