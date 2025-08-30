// webapp/static/view/home/Home.js
// Home component definition (plain JavaScript object, no ES6 imports)

const Home = {
  name: 'Home',
  inject: ['$context'],
  mounted() {
    console.log('Home component context:', this.$context);
  },
  template: `
    <JPulseLayout>
      <div class="home-page">
        <h1>Welcome to jPulse Framework</h1>
        <p>This is the home page, rendered by Vue.js!</p>
        
        <div v-if="$context.user.authenticated" class="welcome-user">
          <h2>Hello, {{ $context.user.firstName || $context.user.id }}!</h2>
          <p>You are successfully logged in.</p>
          <div class="user-info">
            <p><strong>Email:</strong> {{ $context.user.email }}</p>
            <p><strong>User ID:</strong> {{ $context.user.id }}</p>
          </div>
        </div>
        
        <div v-else class="welcome-guest">
          <h2>Welcome, Guest!</h2>
          <p>You are not logged in. <a href="/auth/login">Login here</a> or <a href="/auth/signup">create an account</a>.</p>
        </div>
        
        <div class="framework-info">
          <h3>Framework Information</h3>
          <ul>
            <li><strong>Version:</strong> {{ $context.app?.version || 'Unknown' }}</li>
            <li><strong>Release:</strong> {{ $context.app?.release || 'Unknown' }}</li>
            <li><strong>Language:</strong> {{ $context.i18n?.currentLanguage || 'Unknown' }}</li>
            <li><strong>Available Languages:</strong> {{ $context.i18n?.availableLanguages?.join(', ') || 'Unknown' }}</li>
          </ul>
        </div>
      </div>
    </JPulseLayout>
  `
};

// Auto-register with jPulse framework
if (window.jPulse && window.jPulse.registerComponent) {
  window.jPulse.registerComponent('home', 'Home', Home);
}