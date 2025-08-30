// jpulse-vue-core.js - Core Vue integration with auto-discovery and MVC structure
const { createApp, reactive } = Vue;

window.jPulse = window.jPulse || {};
Object.assign(window.jPulse, {
  // Component registry with framework/site separation
  components: {
    framework: {},
    site: {}
  },
  activeApp: null,
  
  // Register individual components (called by each component file)
  registerComponent(section, componentName, componentDefinition, isSite = false) {
    const registry = isSite ? this.components.site : this.components.framework;
    
    if (!registry[section]) {
      registry[section] = {};
    }
    
    registry[section][componentName] = componentDefinition;
    console.log(`Registered ${isSite ? 'site' : 'framework'} component: ${section}/${componentName}`);
  },
  
  // Get component with site override capability
  getComponent(section, componentName) {
    // Check site components first (override capability)
    if (this.components.site[section] && this.components.site[section][componentName]) {
      return this.components.site[section][componentName];
    }
    
    // Fallback to framework components
    if (this.components.framework[section] && this.components.framework[section][componentName]) {
      return this.components.framework[section][componentName];
    }
    
    console.warn(`Component not found: ${section}/${componentName}`);
    return null;
  },
  
  // Auto-discover and load components for a section
  async loadSectionComponents(section) {
    const componentPromises = [];
    
    // Define component mapping based on section
    const sectionComponents = {
      'shared': ['JPulseLayout', 'JPulseHeader', 'JPulseFooter'],
      'home': ['Home'],
      'auth': ['Login', 'Signup', 'Logout'],
      'user': ['Profile', 'UserList'],
      'error': ['NotFound']
    };
    
    const components = sectionComponents[section] || [];
    
    // Load each component file
    for (const componentName of components) {
      componentPromises.push(this.loadComponent(section, componentName));
    }
    
    // Also load shared components if not already loaded
    if (section !== 'shared') {
      for (const sharedComponent of sectionComponents.shared) {
        componentPromises.push(this.loadComponent('shared', sharedComponent));
      }
    }
    
    await Promise.all(componentPromises);
  },
  
  // Load individual component file
  loadComponent(section, componentName) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (this.getComponent(section, componentName)) {
        console.log(`Component already loaded: ${section}/${componentName}`);
        resolve();
        return;
      }
      
      console.log(`Loading component: ${section}/${componentName}`);
      
      // Try to load framework component first
      const frameworkScript = document.createElement('script');
      frameworkScript.src = `/static/view/${section}/${componentName}.js`;
      frameworkScript.onload = () => {
        console.log(`Framework component loaded: ${section}/${componentName}`);
        // Wait a bit for the component to register
        setTimeout(() => {
          if (this.getComponent(section, componentName)) {
            resolve();
          } else {
            console.warn(`Component loaded but not registered: ${section}/${componentName}`);
            resolve(); // Don't fail the process
          }
        }, 50);
      };
      frameworkScript.onerror = () => {
        console.log(`Framework component not found, trying site: ${section}/${componentName}`);
        // If framework component fails, try site component
        const siteScript = document.createElement('script');
        siteScript.src = `/site/static/view/${section}/${componentName}.js`;
        siteScript.onload = () => {
          console.log(`Site component loaded: ${section}/${componentName}`);
          setTimeout(() => {
            if (this.getComponent(section, componentName)) {
              resolve();
            } else {
              console.warn(`Site component loaded but not registered: ${section}/${componentName}`);
              resolve();
            }
          }, 50);
        };
        siteScript.onerror = () => {
          console.warn(`Component not found: ${section}/${componentName}`);
          resolve(); // Don't fail the whole loading process
        };
        document.head.appendChild(siteScript);
      };
      document.head.appendChild(frameworkScript);
    });
  },
  
  // Initialize Vue app for a section
  async initApp(section, route) {
    console.log(`Initializing Vue app for section: ${section}`, route);
    
    try {
      // Load components for this section
      console.log('Loading section components...');
      await this.loadSectionComponents(section);
      console.log('Components loaded, determining main component...');
      
      // Verify essential shared components are loaded
      const requiredSharedComponents = ['JPulseLayout', 'JPulseHeader', 'JPulseFooter'];
      for (const componentName of requiredSharedComponents) {
        if (!this.getComponent('shared', componentName)) {
          console.error(`Required shared component missing: ${componentName}`);
        }
      }
      
      // Determine the main component based on route
      let mainComponent;
      
      if (section === 'home') {
        mainComponent = this.getComponent('home', 'Home');
      } else if (section === 'auth') {
        if (route.path.includes('login')) {
          mainComponent = this.getComponent('auth', 'Login');
        } else if (route.path.includes('signup')) {
          mainComponent = this.getComponent('auth', 'Signup');
        } else if (route.path.includes('logout')) {
          mainComponent = this.getComponent('auth', 'Logout');
        }
      } else if (section === 'user') {
        if (route.path.includes('profile')) {
          mainComponent = this.getComponent('user', 'Profile');
        } else {
          mainComponent = this.getComponent('user', 'UserList');
        }
      } else if (section === 'error') {
        mainComponent = this.getComponent('error', 'NotFound');
      }
      
      if (!mainComponent) {
        console.error(`No component found for section: ${section}, route: ${route.path}`);
        // Create a simple fallback component that doesn't depend on other components
        mainComponent = {
          name: 'Fallback',
          template: `
            <div class="error-page">
              <h1>Page Not Found</h1>
              <p>The requested page could not be found.</p>
              <p>Section: {{ section }}, Path: {{ path }}</p>
            </div>
          `,
          data() {
            return {
              section: section,
              path: route.path
            };
          }
        };
      }
      
      console.log('Creating Vue app with main component:', mainComponent.name || 'Anonymous');
      console.log('Available components:', Object.keys(this.getAllComponents()));
      
      // Create Vue app
      const allComponents = this.getAllComponents();
      console.log('Registering components with Vue app:', Object.keys(allComponents));
      
      this.activeApp = createApp({
        provide() {
          return {
            $context: window.jPulseContext || {}
          };
        },
        template: `<component :is="mainComponent" />`,
        data() {
          return {
            mainComponent: Vue.markRaw(mainComponent) // Prevent reactivity warning
          };
        }
      });
      
      // Register all components globally with the app
      for (const [componentName, componentDefinition] of Object.entries(allComponents)) {
        console.log(`Registering global component: ${componentName}`);
        this.activeApp.component(componentName, Vue.markRaw(componentDefinition));
      }
      
      // Mount the app
      const mountTarget = document.getElementById('jpulse-app');
      if (!mountTarget) {
        console.error('Mount target #jpulse-app not found in DOM');
        return;
      }
      
      this.activeApp.mount('#jpulse-app');
      console.log('Vue app mounted successfully');
      
    } catch (error) {
      console.error('Failed to initialize Vue app:', error);
    }
  },
  
  // Get all registered components for Vue app
  getAllComponents() {
    const allComponents = {};
    
    // Add framework components
    for (const section in this.components.framework) {
      Object.assign(allComponents, this.components.framework[section]);
    }
    
    // Add site components (override framework if same name)
    for (const section in this.components.site) {
      Object.assign(allComponents, this.components.site[section]);
    }
    
    return allComponents;
  }
});