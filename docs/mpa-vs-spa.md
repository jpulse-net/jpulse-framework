# MPA vs. SPA: Architecture Comparison

Learn the key differences between Multi-Page Applications (MPA) and Single Page Applications (SPA) and when to choose each approach.

## Overview

Web applications can be built using two main architectural patterns:

- **Multi-Page Application (MPA)**: Traditional approach where each page is a separate HTML file
- **Single Page Application (SPA)**: Modern approach where one page dynamically updates content

## Comparison Table

| Compare | Traditional MPA | jPulse MPA | SPA |
|---------|----------------|------------|-----|
| **Architecture** | All MVC on server | Model+Controller on server, View in browser | Model+Controller on server, View in browser |
| **Page Loading** | Full page reload | Full page reload | Dynamic content updates |
| **URL Handling** | Each URL = physical file | Each URL = physical file | Client-side routing |
| **JavaScript** | Optional | Required for dynamic content | Required |
| **SEO** | Excellent out of box | Good with proper setup | Requires extra work |
| **Performance** | Fast initial load | Fast initial load | Slower initial load, faster navigation |
| **User Experience** | Traditional web | Traditional web with dynamic features | App-like experience |
| **Development** | Simple to understand | Moderate complexity | More complex |
| **State Management** | Server-side sessions | Server-side + client-side | Client-side state |
| **Examples in jPulse** | `/hello/`, `/auth/login.shtml` | `/hello-todo/` | `/hello-vue/`, `/jpulse-docs/` |

## Traditional MPA (All Server-Side)

**How it Works:**
- Server renders complete HTML pages
- Browser requests new page for each navigation
- Full page reload on every click
- Each URL corresponds to a physical file
- **Traditional MVC:** Model, View, Controller all on server

**✅ Advantages:**
- Simple to understand and debug
- Great SEO out of the box
- Fast initial page load
- Works without JavaScript
- Easy team separation by pages

**❌ Disadvantages:**
- Full page reloads are slower
- Harder to maintain application state
- Less app-like user experience
- More server requests

## jPulse MPA (Hybrid)

**How it Works:**
- Server renders HTML with handlebars expansion
- Browser JavaScript handles dynamic content
- API calls to server controllers for data
- View logic runs in browser, not server
- **jPulse Pattern:** Model + Controller on server, View in browser

**✅ Advantages:**
- Combines benefits of both approaches
- Server-side rendering for SEO
- Client-side interactivity
- API-driven architecture
- Flexible development patterns

**❌ Disadvantages:**
- More complex than traditional MPA
- Requires JavaScript for full functionality
- Learning curve for hybrid patterns

## Single Page Application (SPA)

**How it Works:**
- JavaScript manages all page content
- URL changes without page reloads
- Dynamic content loading via APIs
- Client-side routing with history API
- **jPulse Pattern:** Model + Controller on server, View in browser

**✅ Advantages:**
- Faster navigation (no page reloads)
- App-like user experience
- Rich interactions and animations
- Reduced server load
- Better for complex UIs

**❌ Disadvantages:**
- More complex to build and debug
- SEO requires extra work
- Slower initial load
- Requires JavaScript to work
- Can become memory-heavy

## When to Choose Which?

### Choose MPA when:
- Simple content-focused sites
- SEO is critical
- Team prefers traditional development
- Fast initial page loads are important
- JavaScript is optional

### Choose SPA when:
- Rich, interactive applications
- App-like user experience desired
- Complex state management needed
- Real-time updates required
- Mobile-first responsive design

## jPulse Framework Integration

jPulse supports both MPA and SPA patterns:

- **MPA Pages:** Use `.shtml` files with handlebars templates
- **SPA Pages:** Use Vue.js, React, or vanilla JavaScript with API calls
- **Hybrid Approach:** Mix both patterns in the same application
- **API Integration:** All patterns use the same `jPulse.apiCall()` utility

## Examples

### MPA Examples in jPulse:
- `/hello/` - hello/index.shtml
- `/hello-todo/` - hello-todo/index.shtml
- `/auth/login.shtml` - auth/login.shtml

### SPA Examples in jPulse:
- `/hello-vue/` - Vue.js SPA demo
- `/jpulse-docs/` - Documentation viewer
- `/hello-vue/features` - Same page, different content

## Conclusion

Both MPA and SPA have their place in modern web development. jPulse Framework's hybrid approach allows you to choose the right pattern for each part of your application, providing maximum flexibility while maintaining consistency through shared utilities and patterns.

The key is understanding your requirements and choosing the architecture that best fits your use case, user experience goals, and team capabilities.
