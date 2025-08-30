// webapp/static/view/auth/Signup.js
// Signup component definition (plain JavaScript object, no ES6 imports)

const Signup = {
  name: 'Signup',
  inject: ['$context'],
  data() {
    return {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      loading: false,
      error: ''
    };
  },
  methods: {
    async handleSignup() {
      if (this.password !== this.confirmPassword) {
        this.error = 'Passwords do not match';
        return;
      }
      
      this.loading = true;
      this.error = '';
      
      try {
        const response = await fetch('/api/1/user/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            password: this.password
          })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          // Redirect to login or dashboard
          window.location.href = result.redirectTo || '/auth/login';
        } else {
          this.error = result.message || 'Signup failed';
        }
      } catch (err) {
        this.error = 'Network error. Please try again.';
        console.error('Signup error:', err);
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
            <h1>Sign Up</h1>
            <form @submit.prevent="handleSignup" class="auth-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">First Name:</label>
                  <input 
                    type="text" 
                    id="firstName" 
                    v-model="firstName" 
                    required 
                    class="form-input"
                    placeholder="First name"
                  />
                </div>
                <div class="form-group">
                  <label for="lastName">Last Name:</label>
                  <input 
                    type="text" 
                    id="lastName" 
                    v-model="lastName" 
                    required 
                    class="form-input"
                    placeholder="Last name"
                  />
                </div>
              </div>
              
              <div class="form-group">
                <label for="email">Email:</label>
                <input 
                  type="email" 
                  id="email" 
                  v-model="email" 
                  required 
                  class="form-input"
                  placeholder="Enter your email"
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
              
              <div class="form-group">
                <label for="confirmPassword">Confirm Password:</label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  v-model="confirmPassword" 
                  required 
                  class="form-input"
                  placeholder="Confirm your password"
                />
              </div>
              
              <div v-if="error" class="error-message">
                {{ error }}
              </div>
              
              <button type="submit" :disabled="loading" class="btn btn-primary">
                <span v-if="loading">Creating account...</span>
                <span v-else>Sign Up</span>
              </button>
            </form>
            
            <div class="auth-links">
              <p>Already have an account? <a href="/auth/login">Sign in</a></p>
            </div>
          </div>
        </div>
      </div>
    </JPulseLayout>
  `
};

// Auto-register with jPulse framework
if (window.jPulse && window.jPulse.registerComponent) {
  window.jPulse.registerComponent('auth', 'Signup', Signup);
}