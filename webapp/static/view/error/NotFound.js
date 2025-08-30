// webapp/static/view/error/NotFound.js

export default {
  name: 'NotFound',
  inject: ['$context'],
  template: `
  <JPulseLayout>
    <div class="error-page">
      <h1>404 - Page Not Found</h1>
      <p>Sorry, the page you are looking for at <code>{{ $context.route.path }}</code> does not exist.</p>
      <a href="/">Go to Home Page</a>
    </div>
  </JPulseLayout>
  `
};
