// webapp/static/view/auth/Login.js
// Login component definition (plain JavaScript object, no ES6 imports)

const Login = {
  name: 'Login',
  inject: ['$context'],
  data() {
    return {
      email: '',
      password: '',
      loading: false,
      error: ''
    };
  },
  methods: {
    async handleLogin() {
      this.loading = true;
      this.error = '';
      
      console.log('Login attempt with:', { email: this.email, password: this.password ? '[HIDDEN]' : 'EMPTY' });
      
      try {
        const requestBody = {
          identifier: this.email,
          password: this.password
        };
        console.log('Sending login request:', { identifier: requestBody.identifier, password: requestBody.password ? '[HIDDEN]' : 'EMPTY' });
        
        const response = await fetch('/api/1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          // Redirect to dashboard or intended page
          window.location.href = result.redirectTo || '/home/';
        } else {
          this.error = result.message || 'Login failed';
        }
      } catch (err) {
        this.error = 'Network error. Please try again.';
        console.error('Login error:', err);
      } finally {
        this.loading = false;
      }
    }
  },
  template: `
    <JPulseLayout>
      <div class="auth-page">
        <div class="auth-container">
          <div class="auth-card">
            <h1>Sign In</h1>
            <form @submit.prevent="handleLogin" class="auth-form">
              <div class="form-group">
                <label for="email">Email or Username:</label>
                <input 
                  type="text" 
                  id="email" 
                  v-model="email" 
                  required 
                  class="form-input"
                  placeholder="Enter your email or username"
                />
              </div>
              
              <div class="form-group">
                <label for="password">Password:</label>
                <input 
                  type="password" 
                  id="password" 
                  v-model="password" 
                  required 
                  class="form-input"
                  placeholder="Enter your password"
                />
              </div>
              
              <div v-if="error" class="error-message">
                {{ error }}
              </div>
              
              <button type="submit" :disabled="loading" class="btn btn-primary">
                <span v-if="loading">Signing in...</span>
                <span v-else>Sign In</span>
              </button>
            </form>
            
            <div class="auth-links">
              <p>Don't have an account? <a href="/auth/signup">Sign up</a></p>
            </div>
          </div>
        </div>
      </div>
    </JPulseLayout>
  `
};

// Auto-register with jPulse framework
if (window.jPulse && window.jPulse.registerComponent) {
  window.jPulse.registerComponent('auth', 'Login', Login);
}