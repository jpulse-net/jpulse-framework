# jPulse Docs / MPA vs. SPA: Architecture Comparison v1.3.14

Understanding the key differences between Multi-Page Applications (MPA) and Single Page Applications (SPA) helps you choose the right architecture for your web application.

## Overview

Web applications follow two main architectural patterns:

- **Multi-Page Application (MPA)**: Each page is a separate HTML document served by the server
- **Single Page Application (SPA)**: One HTML page dynamically updates content without full page reloads

## Another Way to Look at MPA vs. SPA

From an **MVC** (Model-View-Controller) architecture perspective, the key difference is **where the View logic resides**:

| Architecture | Model | View | Controller |
|--------------|-------|------|------------|
| **Traditional MPA** | Server | Server | Server |
| **jPulse MPA (Hybrid)** | Server | Browser | Server |
| **SPA** | Server | Browser | Server + Browser |

**Explanation:**
- **Traditional MPA**: All three components (Model, View, Controller) run on the server. The server generates complete HTML pages and sends them to the browser.
- **jPulse MPA (Hybrid)**, also called **RESTful MVC**: Model and Controller remain on the server, but View logic (rendering, user interactions) moves to the browser. Server provides APIs for data.
- **SPA**: Model stays on the server, but both View and Controller logic move to the browser. The browser manages routing, state, and rendering.

## Architecture Diagrams

### Traditional MPA Architecture

```
    ┌─────────────┐                           ┌─────────────┐
    │   Browser   │                           │   Server    │
    │             │                           │             │
    │  Click Link │─────1. HTTP Request──────▶│   Model     │
    │             │      /products.html       │   View      │
    │             │                           │   Controller│
    │             │◀────2. Full HTML Page─────│             │
    │  Full Page  │      products.html        │             │
    │  Reload     │                           │             │
    │             │─────3. HTTP Request──────▶│  Database   │
    │  Click Link │      /cart.html           │   Query     │
    │             │◀────4. Full HTML Page─────│             │
    │  Full Page  │      cart.html            │   Render    │
    │  Reload     │                           │   Response  │
    └─────────────┘                           └─────────────┘
```

### jPulse MPA Architecture (Hybrid)

```
    ┌─────────────┐                           ┌─────────────┐
    │   Browser   │                           │   Server    │
    │             │                           │             │
    │  Initial    │─────1. HTTP Request──────▶│   Model     │
    │  Page Load  │      /products.shtml      │  Controller │
    │             │◀────2. HTML + JS──────────│  Handlebars │
    │  Rendered   │                           │   Template  │
    │  HTML + JS  │                           │             │
    │             │─────3. API Call──────────▶│             │
    │  User       │      /api/1/products      │  Controller │
    │  Interaction│◀────4. JSON Data──────────│   (REST     │
    │             │                           │    API)     │
    │  Update DOM │                           │             │
    │  Dynamically│─────5. API Call──────────▶│   Model     │
    │             │      /api/1/cart          │  Database   │
    │  No Reload  │◀────6. JSON Data──────────│             │
    └─────────────┘                           └─────────────┘
```

### SPA Architecture

```
    ┌─────────────┐                           ┌─────────────┐
    │   Browser   │                           │   Server    │
    │             │                           │             │
    │  Initial    │─────1. HTTP Request──────▶│   Minimal   │
    │  Load       │      /                    │   HTML +    │
    │             │◀────2. HTML + JS + CSS────│   JS Bundle │
    │  Full JS    │      (Large bundle)       │             │
    │  App Loads  │                           │             │
    │             │                           │             │
    │  URL Change │─────3. API Call──────────▶│             │
    │  No Reload  │      /api/1/products      │  Controller │
    │             │◀────4. JSON Data──────────│   (REST     │
    │  Client     │                           │    API)     │
    │  Router     │─────5. API Call──────────▶│             │
    │  Updates    │      /api/1/cart          │   Model     │
    │  View       │◀────6. JSON Data──────────│  Database   │
    │             │                           │             │
    │  History    │   Browser Back/Forward    │             │
    │  API        │   handled by JavaScript   │             │
    └─────────────┘                           └─────────────┘
```

## Detailed Comparison

| Feature | Traditional MPA | jPulse MPA (Hybrid) | SPA |
|---------|----------------|---------------------|-----|
| **Architecture** | All MVC on server | Model + Controller on server<br/>View logic in browser | Model + Controller on server<br/>View logic in browser |
| **Page Loading** | Full page reload on navigation<br/>❌ Slower navigation | Full page reload on navigation<br/>✅ Dynamic content updates | Initial load downloads app<br/>✅ No reload after that |
| **URL Handling** | Each URL = server file<br/>✅ Simple routing | Each URL = server file<br/>✅ SEO friendly | Client-side routing<br/>⚠️ Requires history API |
| **JavaScript** | ✅ Optional for basic functionality | ⚠️ Required for dynamic features | ❌ Required for everything |
| **SEO** | ✅ Excellent out of box | ✅ Good with proper setup | ⚠️ Requires SSR or pre-rendering |
| **Initial Load** | ✅ Fast (just HTML+CSS) | ✅ Fast (HTML+CSS+minimal JS) | ❌ Slower (downloads full app) |
| **Navigation Speed** | ❌ Slow (full page reload) | ⚠️ Medium (page reload + caching) | ✅ Fast (dynamic updates) |
| **User Experience** | Traditional web navigation | Enhanced web with interactivity | App-like, fluid experience |
| **Development** | ✅ Simple, well understood | ⚠️ Moderate complexity | ❌ More complex, steeper learning |
| **Deployment Risk** | ✅ Low, decoupled components | ✅ Low, decoupled components | ⚠️ Higher, single JavaScript bug can crash the whole app |
| **State Management** | ✅ Server sessions | ✅ Server + client state | ⚠️ Complex client state |
| **Browser Back Button** | ✅ Works naturally | ✅ Works naturally | ⚠️ Must be implemented |
| **Offline Support** | ❌ Requires server | ⚠️ Partial with caching | ✅ Full with service workers |
| **Browser Memory Usage** | ✅ Low (page reload clears) | ✅ Low (page reload clears) | ⚠️ Grows over time |
| **Debugging** | ✅ Easy (view source works) | ⚠️ Moderate (mix of server/client) | ❌ Complex (requires dev tools) |
| **Team Skills** | HTML, CSS, Server-side language | HTML, CSS, JavaScript, Backend | JavaScript frameworks, Backend |
| **Examples in jPulse** | `/home/`<br/> <nobr>`/jpulse-examples/`</nobr> | `/hello-todo/`<br/> Most framework pages | `/hello-vue/`<br/> `/jpulse-docs/` |

## When to Choose Which?

### ✅ Choose Traditional MPA when:
- Building content-focused websites (blogs, marketing sites)
- SEO is the top priority
- Team prefers traditional server-side development
- JavaScript is optional or should be progressive enhancement
- Fast initial page loads are critical
- Simple deployment and hosting requirements

**Example Use Cases:**
- Corporate websites
- Blogs and news sites
- Documentation sites (without real-time search)
- Marketing landing pages
- Content management systems

### ✅ Choose jPulse MPA (Hybrid) when:
- Need both SEO and interactivity
- Want traditional navigation with dynamic features
- Team has mixed front-end/back-end skills
- Gradual enhancement of existing MPA
- API-first architecture desired

**Example Use Cases:**
- E-commerce sites with dynamic carts
- Admin dashboards with some interactivity
- Form-heavy applications
- Data entry systems
- Most business web applications

### ✅ Choose SPA when:
- Building interactive, app-like experiences
- Rich user interactions and animations needed
- Real-time updates and collaboration features
- Mobile-first responsive design
- Complex UI state management
- Offline functionality required

**Example Use Cases:**
- Gmail-like email clients
- Project management tools (Trello, Asana)
- Real-time collaboration (Google Docs)
- Interactive dashboards and analytics
- Social media applications
- Gaming and entertainment platforms

## jPulse Framework Support

jPulse supports **all three patterns** in the same application:

### MPA Pages
```html
<!-- site/webapp/view/hello/index.shtml -->
<!DOCTYPE html>
<html>
<head>
    <title>Hello MPA</title>
</head>
<body>
    <h1>{{title}}</h1>
    <p>Server-rendered content</p>
</body>
</html>
```

### jPulse MPA (Hybrid) Pages
```html
<!-- site/webapp/view/hello-todo/index.shtml -->
<!DOCTYPE html>
<html>
<head>
    <title>Hello To-Do</title>
</head>
<body>
    <h1>To-Do List</h1>
    <div id="todoList"></div>

    <script>
    // Dynamic content via API
    jPulse.dom.ready(async () => {
        const response = await jPulse.api.call('/api/1/helloTodo');
        renderTodos(response.data);
    });
    </script>
</body>
</html>
```

### SPA Pages
```html
<!-- site/webapp/view/hello-vue/index.shtml -->
<!DOCTYPE html>
<html>
<head>
    <title>Vue.js SPA</title>
    <script src="/common/vue/vue.min.js"></script>
</head>
<body>
    <div id="app"></div>

    <script>
    // Full SPA with client-side routing
    const app = Vue.createApp({...});
    const router = VueRouter.createRouter({...});
    app.use(router);
    app.mount('#app');
    </script>
</body>
</html>
```

### Shared API Backend
All patterns use the same backend:

```javascript
// site/webapp/controller/helloTodo.js
class HelloTodoController {
    static async api(req, res) {
        const todos = await HelloTodoModel.findAll();
        res.json({ success: true, data: todos });
    }
}
```

### Shared Utilities
All patterns use the same `jPulse.api.call()`:

```javascript
// Works in both MPA and SPA contexts
const response = await jPulse.api.call('/api/1/helloTodo', {
    method: 'POST',
    body: { title: 'New task' }
});
```

## Migration Path

jPulse makes it easy to migrate between patterns:

```
Traditional MPA  →  jPulse MPA (Hybrid)  →  SPA
      ↓                     ↓                ↓
    Static            API-driven          Full client
    pages             pages with          routing with
                      dynamic             no page
                      content             reloads
```

You can mix patterns in the same application:
- Use MPA for marketing pages (SEO critical)
- Use jPulse MPA for admin dashboards (balanced)
- Use SPA for real-time collaboration (UX critical)

---

## Real-Time Multi-User Communication

Both MPA and SPA applications can enable real-time communication between users. jPulse provides two complementary technologies:

### Application Cluster Broadcasting

**Best for:** Synchronizing state changes across multiple server instances

When a user makes a change (via REST API), broadcast notifications ensure all users see the update instantly - even if they're connected to different servers behind a load balancer.

```javascript
// User creates item via API
await jPulse.appCluster.fetch('/api/1/items', {
    method: 'POST',
    body: { title: 'New item' }
});
// Server broadcasts to all instances → all users see update
```

**Use cases:** Collaborative editing, shopping cart sync, global notifications, real-time dashboards

**Learn more:** [Application Cluster Communication](application-cluster.md)

### WebSocket Real-Time Communication

**Best for:** Persistent bi-directional communication and high-frequency interactions

Direct WebSocket connections enable real-time conversations between server and clients with request/response patterns and server-initiated pushes.

```javascript
// Persistent connection for chat
const ws = jPulse.ws.connect('/api/1/ws/chat');
ws.send({ type: 'message', text: 'Hello!' });
ws.onMessage((data) => displayMessage(data));
```

**Use cases:** Chat applications, live cursors, real-time gaming, interactive dashboards

**Learn more:** [WebSocket Real-Time Communication](websockets.md)

### Choosing the Right Technology

| Your Need | Technology | Why |
|-----------|-----------|-----|
| Sync data changes across servers | App Cluster | REST API + broadcast notifications |
| Chat/messaging | WebSocket | Bi-directional conversation |
| Collaborative editing | App Cluster | REST API validates, broadcasts sync |
| Live cursors/presence | WebSocket | High-frequency ephemeral data |
| Shopping cart sync | App Cluster | REST API updates, broadcasts notify |
| Real-time gaming | WebSocket | Persistent connection, low latency |

**Both work with MPA and SPA!** The choice depends on your communication pattern, not your architecture pattern.

---

## Best Practices

### For MPA:
- ✅ Keep pages simple and focused
- ✅ Use progressive enhancement
- ✅ Optimize server response time
- ✅ Leverage browser caching

### For jPulse MPA (Hybrid):
- ✅ Use APIs for dynamic content
- ✅ Keep JavaScript bundles small
- ✅ Implement proper error handling
- ✅ Use `jPulse.api.call()` for consistency

### For SPA:
- ✅ Implement loading states
- ✅ Handle errors gracefully
- ✅ Use client-side caching
- ✅ Implement proper routing
- ✅ Consider code splitting
- ✅ Add error boundaries

## Performance Considerations

### MPA Performance:
- Fast Time to First Byte (TTFB)
- Fast First Contentful Paint (FCP)
- Each navigation requires server round-trip
- Browser caching helps repeat visits

### jPulse MPA (Hybrid) Performance:
- Balanced approach - fast initial, enhanced navigation
- Smaller JavaScript bundles than SPA
- Server caching reduces page generation time
- API caching reduces data fetch time

### SPA Performance:
- Slower initial load (larger JavaScript)
- Fast navigation after load (no server round-trip)
- Memory can grow over time (requires cleanup)
- Excellent for returning users

## SPA Page Reload Support

jPulse Framework automatically handles client-side routing for SPAs with **zero configuration**! When a user bookmarks or refreshes a SPA sub-route like `/hello-vue/todo-demo`, the framework automatically serves the correct `index.shtml` file.

### How It Works

1. **Auto-Detection**: Framework scans view directories for SPA indicators:
   - `vue-router.min.js` or `vue-router.js` imports
   - `VueRouter.createRouter()` calls
   - `history.pushState()` + `popstate` event handlers

2. **Dynamic Routing**: Creates Express routes matching all sub-paths under detected SPAs

3. **Transparent Fallback**: SPA sub-routes automatically redirect to `index.shtml` on the server, then client-side router takes over

### Example

Create `/site/webapp/view/my-app/index.shtml`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My SPA</title>
    <script src="/common/vue/vue.min.js"></script>
    <script src="/common/vue/vue-router.min.js"></script>
</head>
<body>
    <div id="app"></div>
    <script>
        // Define routes
        const routes = [
            { path: '/my-app/', component: Home },
            { path: '/my-app/about', component: About },
            { path: '/my-app/contact', component: Contact }
        ];

        // Create router
        const router = VueRouter.createRouter({
            history: VueRouter.createWebHistory(),
            routes
        });

        // Create app
        const app = Vue.createApp({...});
        app.use(router);
        app.mount('#app');
    </script>
</body>
</html>
```

**That's it!** The framework automatically:
- ✅ Detects your SPA (scans for `vue-router.min.js` + `VueRouter.createRouter`)
- ✅ Creates route pattern `/my-app/*` that matches all sub-paths
- ✅ Serves `index.shtml` for all routes: `/my-app/`, `/my-app/about`, `/my-app/contact`
- ✅ Caches detection result for performance
- ✅ Supports site view overrides (checks `site/webapp/view/` first)

### Manual Detection

If your SPA uses custom routing without Vue Router, use `history.pushState()` + `popstate` for detection:

```javascript
// This pattern is auto-detected as SPA
window.addEventListener('popstate', (e) => {
    const path = window.location.pathname;
    history.pushState({ path }, '', path);
    // Your routing logic...
});
```

### Verification

Check your server logs on startup:

```
- info  view.initialize  View registry: [..., my-app, ...]
- info  view.initialize  regex: /^/(admin|auth|...|my-app|...)(\/.*)?$/
```

The regex `(/.*)?` pattern ensures all sub-routes are captured!

## Conclusion

Choose your architecture based on your specific needs:

- **SEO critical + Simple**: Traditional MPA
- **Balanced needs**: jPulse MPA (Hybrid) ⭐ **Recommended for most cases**
- **App-like UX + Interactive**: SPA

jPulse Framework's flexibility allows you to use the right pattern for each part of your application, providing maximum flexibility while maintaining consistency through shared utilities, APIs, and best practices.

The key is understanding your requirements and choosing the architecture that best fits your use case, user experience goals, and team capabilities.

## See Also

- [Framework Comparison](framework-comparison.md) - jPulse vs. alternatives and architecture decisions
- [Hello Examples](examples.md#hello-examples) - Live examples of all patterns
- [Application Cluster Communication](application-cluster.md) - Multi-server broadcasting
- [WebSocket Real-Time Communication](websockets.md) - Persistent bi-directional patterns
- [Front-End Development](front-end-development.md) - jPulse JavaScript utilities
- [REST API Reference](api-reference.md) - Backend API patterns
- [Template Reference](template-reference.md) - Server-side templates
