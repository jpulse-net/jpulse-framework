### W-071, W-072, W-073: Site Strategy for Hello World and Vue Examples

## Overview

Define strategy for site-specific hello world examples using model, view, controller, including Vue.js for SPA and WebSocket real-time communication.

**Work Items**:
- W-071: site: example /hello-todo/ MVC app with MongoDB collection
- W-072: site: example /hello-vue/ SPA using vue.js
- W-073: site: example /hello-websocket/ app

## Final Strategy

### Namespace Convention

**Complete Isolation with "hello*" prefix everywhere:**
- Collections: `helloTodos` (plural)
- Models: `helloTodo.js` (singular)
- Controllers: `helloTodo.js` (singular)
- API Endpoints: `/api/1/hello-todo`
- Views: `/hello-todo/` (singular with dash)
- Files: `site/webapp/controller/helloTodo.js`, `site/webapp/model/helloTodo.js`

### File Structure

```javascript
site/webapp/
├── controller/
│   ├── hello.js            # Basic override demo (existing)
│   ├── helloTodo.js        # Todo MVC demo
│   ├── helloVue.js         # Vue.js SPA demo
│   └── helloWebsocket.js   # WebSocket real-time demo
├── model/
│   ├── helloTodo.js        # Todo model with MongoDB
│   └── helloGuest.js       # Guest book model (alternative)
└── view/
    ├── hello/              # Basic demo (existing)
    │   └── index.shtml
    ├── hello-todo/         # Todo MVC views
    │   └── index.shtml
    ├── hello-vue/          # Vue.js SPA views
    │   └── index.shtml
    └── hello-websocket/    # WebSocket demo views
        └── index.shtml
```

### Example App Choice: Todo List

**Why Todo List is Perfect:**
- ✅ Universal concept everyone understands
- ✅ Demonstrates CRUD operations clearly
- ✅ Simple data structure: `{title, completed, createdAt}`
- ✅ Perfect for teaching MVC patterns
- ✅ Easy to extend with Vue.js reactivity
- ✅ Natural fit for WebSocket real-time updates
- ✅ "Don't make me think" simplicity

**Rejected Alternatives:**
- Blog: Too complex for onboarding
- Guest Book: Too simple, fewer learning opportunities
- Counter: Too minimal to teach MVC effectively

### Dashboard Integration

**Clean Conditional Display using file.exists:**

```html
<!-- site/webapp/view/home/index.shtml -->
<div class="jp-card">
    <h3>Learning Examples</h3>

    <!-- Always show basic hello -->
    <a href="/hello/" class="local-home-link-card">
        <div class="local-home-link-title">Basic Site Override</div>
        <div class="local-home-link-desc">Learn how site files override framework files</div>
    </a>

    <!-- Conditionally show advanced examples -->
    {{#if (file.exists "hello-todo/index.shtml")}}
    <a href="/hello-todo/" class="local-home-link-card">
        <div class="local-home-link-title">Hello To-Do MVC Example</div>
        <div class="local-home-link-desc">Complete Model-View-Controller with MongoDB database</div>
    </a>
    {{/if}}

    {{#if (file.exists "hello-vue/index.shtml")}}
    <a href="/hello-vue/" class="local-home-link-card">
        <div class="local-home-link-title">Vue.js SPA Demo</div>
        <div class="local-home-link-desc">Single Page Application with URL routing and reactive components</div>
    </a>
    {{/if}}

    {{#if (file.exists "hello-websocket/index.shtml")}}
    <a href="/hello-websocket/" class="local-home-link-card">
        <div class="local-home-link-title">WebSocket Real-time Demo</div>
        <div class="local-home-link-desc">Live collaboration with instant updates across browsers</div>
    </a>
    {{/if}}

    <p class="jp-help-text">
        These examples demonstrate jPulse Framework patterns.
        Delete the view files to remove examples from this dashboard.
    </p>
</div>
```

### Progressive Learning Path

1. **`/hello/`** - Basic site override (existing)
   - Demonstrates file resolution priority
   - Shows controller and view override
   - API endpoint example

2. **`/hello-todo/`** - Complete MVC with MongoDB (W-071)
   - Model with schema validation
   - CRUD operations
   - Database integration
   - Error handling patterns

3. **`/hello-vue/`** - Vue.js SPA (W-072)
   - Component-based architecture
   - URL routing without page reloads
   - Reactive data binding
   - API integration with jPulse.apiCall()

4. **`/hello-websocket/`** - Real-time collaboration (W-073)
   - WebSocket server integration
   - Client-side connection management
   - Vue.js reactive WebSocket state
   - Multi-user real-time updates

### Implementation Details

#### W-071: Hello Todo MVC Model

```javascript
// site/webapp/model/helloTodo.js
class HelloTodoModel {
    static schema = {
        _id: { type: 'objectId', auto: true },
        title: { type: 'string', required: true },
        completed: { type: 'boolean', default: false },
        createdAt: { type: 'date', auto: true },
        updatedAt: { type: 'date', auto: true }
    };

    static getCollection() {
        return database.getDb().collection('helloTodos'); // Plural collection
    }

    static async findAll() {
        const collection = this.getCollection();
        return await collection.find({}).sort({ createdAt: -1 }).toArray();
    }

    static async create(todoData) {
        const validation = CommonUtils.validateAgainstSchema(todoData, this.schema);
        if (!validation.success) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const collection = this.getCollection();
        const result = await collection.insertOne({
            ...todoData,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return await collection.findOne({ _id: result.insertedId });
    }

    static async toggleComplete(id) {
        const collection = this.getCollection();
        const todo = await collection.findOne({ _id: new ObjectId(id) });
        if (!todo) throw new Error('Todo not found');

        await collection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    completed: !todo.completed,
                    updatedAt: new Date()
                }
            }
        );

        return await collection.findOne({ _id: new ObjectId(id) });
    }
}
```

#### W-071: Hello Todo Controller

```javascript
// site/webapp/controller/helloTodo.js
class HelloTodoController {

    // API: GET /api/1/hello-todo
    static async api(req, res) {
        try {
            LogController.logRequest(req, 'helloTodo.api', '');
            const todos = await HelloTodoModel.findAll();

            res.json({
                success: true,
                data: todos,
                message: 'Hello todos retrieved successfully'
            });

            LogController.logInfo(req, 'helloTodo.api', `success: ${todos.length} todos`);

        } catch (error) {
            LogController.logError(req, 'helloTodo.api', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to retrieve todos', 'HELLO_TODO_ERROR');
        }
    }

    // API: POST /api/1/hello-todo
    static async apiCreate(req, res) {
        try {
            LogController.logRequest(req, 'helloTodo.apiCreate', '');
            const { title } = req.body;

            if (!title?.trim()) {
                return CommonUtils.sendError(req, res, 400, 'Title is required', 'VALIDATION_ERROR');
            }

            const todo = await HelloTodoModel.create({ title: title.trim() });

            res.json({
                success: true,
                data: todo,
                message: 'Todo created successfully'
            });

            LogController.logInfo(req, 'helloTodo.apiCreate', `success: created todo "${title}"`);

        } catch (error) {
            LogController.logError(req, 'helloTodo.apiCreate', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to create todo', 'HELLO_TODO_CREATE_ERROR');
        }
    }

    // API: PUT /api/1/hello-todo/:id/toggle
    static async apiToggle(req, res) {
        try {
            LogController.logRequest(req, 'helloTodo.apiToggle', '');
            const { id } = req.params;

            const todo = await HelloTodoModel.toggleComplete(id);

            res.json({
                success: true,
                data: todo,
                message: 'Todo updated successfully'
            });

            LogController.logInfo(req, 'helloTodo.apiToggle', `success: toggled todo ${id}`);

        } catch (error) {
            LogController.logError(req, 'helloTodo.apiToggle', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to update todo', 'HELLO_TODO_UPDATE_ERROR');
        }
    }
}
```

#### W-072: Vue.js SPA Strategy

**Key Features:**
- URL routing without page reloads using `history.pushState()`
- Component-based architecture with reactive data
- Integration with existing jPulse.apiCall() utilities
- Browser back/forward button support
- Clean separation of views within single component

```javascript
// site/webapp/view/hello-vue/HelloVueApp.js
const HelloVueApp = {
    data() {
        return {
            currentRoute: 'list',
            todos: [],
            newTodoTitle: '',
            loading: false
        };
    },

    async mounted() {
        await this.loadTodos();
        this.setupRouting();
    },

    methods: {
        setupRouting() {
            window.addEventListener('popstate', () => {
                this.currentRoute = this.getRouteFromUrl();
            });
        },

        getRouteFromUrl() {
            const path = window.location.pathname.replace('/hello-vue/', '') || 'list';
            return path;
        },

        navigateTo(route) {
            this.currentRoute = route;
            const url = `/hello-vue/${route}`;
            history.pushState({ route }, '', url);
        },

        async loadTodos() {
            this.loading = true;
            try {
                const response = await jPulse.apiCall('/api/1/hello-todo', 'GET');
                this.todos = response.data;
            } catch (error) {
                jPulse.showSlideDownMessage('Failed to load todos', 'error');
            } finally {
                this.loading = false;
            }
        },

        async createTodo() {
            if (!this.newTodoTitle.trim()) return;

            try {
                const response = await jPulse.apiCall('/api/1/hello-todo', 'POST', {
                    title: this.newTodoTitle.trim()
                });

                this.todos.unshift(response.data);
                this.newTodoTitle = '';
                jPulse.showSlideDownMessage('Todo created!', 'success');

            } catch (error) {
                jPulse.showSlideDownMessage('Failed to create todo', 'error');
            }
        },

        async toggleTodo(todo) {
            try {
                const response = await jPulse.apiCall(`/api/1/hello-todo/${todo._id}/toggle`, 'PUT');
                const index = this.todos.findIndex(t => t._id === todo._id);
                this.todos[index] = response.data;

            } catch (error) {
                jPulse.showSlideDownMessage('Failed to update todo', 'error');
            }
        }
    },

    template: `
        <div class="hello-vue-app">
            <nav class="hello-vue-nav">
                <button @click="navigateTo('list')"
                        :class="{ active: currentRoute === 'list' }">
                    Todo List
                </button>
                <button @click="navigateTo('about')"
                        :class="{ active: currentRoute === 'about' }">
                    About This Demo
                </button>
            </nav>

            <main class="hello-vue-content">
                <div v-if="currentRoute === 'list'" class="todo-list-view">
                    <h2>Hello Vue.js Todo List</h2>

                    <div class="todo-form">
                        <input v-model="newTodoTitle"
                               @keyup.enter="createTodo"
                               placeholder="Add a new todo..."
                               class="jp-form-input">
                        <button @click="createTodo"
                                :disabled="!newTodoTitle.trim()"
                                class="jp-btn jp-btn-primary">
                            Add Todo
                        </button>
                    </div>

                    <div v-if="loading" class="jp-loading">Loading todos...</div>

                    <div v-else-if="todos.length === 0" class="jp-info-box">
                        No todos yet. Add one above!
                    </div>

                    <ul v-else class="todo-list">
                        <li v-for="todo in todos" :key="todo._id" class="todo-item">
                            <label class="todo-label">
                                <input type="checkbox"
                                       :checked="todo.completed"
                                       @change="toggleTodo(todo)">
                                <span :class="{ completed: todo.completed }">
                                    {{ todo.title }}
                                </span>
                            </label>
                            <small class="todo-date">
                                {{ new Date(todo.createdAt).toLocaleDateString() }}
                            </small>
                        </li>
                    </ul>
                </div>

                <div v-else-if="currentRoute === 'about'" class="about-view">
                    <h2>About This Vue.js Demo</h2>
                    <div class="jp-info-box">
                        <p>This demonstrates a Single Page Application (SPA) using Vue.js with:</p>
                        <ul>
                            <li>URL routing without page reloads</li>
                            <li>Reactive data binding</li>
                            <li>API integration with jPulse.apiCall()</li>
                            <li>Component-based architecture</li>
                            <li>Browser history support</li>
                        </ul>
                        <p><strong>Try it:</strong> Navigate between views and use browser back/forward buttons!</p>
                    </div>
                </div>
            </main>
        </div>
    `
};
```

#### W-073: WebSocket Strategy

**Framework Integration:**
- Extend `jpulse-common.js` with WebSocket utilities
- Vue.js reactive integration for real-time state
- Automatic reconnection with exponential backoff
- Room-based messaging for scalability

```javascript
// Enhanced jpulse-common.js WebSocket utilities
window.jPulse.websocket = {
    connections: new Map(),

    connect(endpoint, options = {}) {
        if (this.connections.has(endpoint)) {
            return this.connections.get(endpoint);
        }

        const ws = new WebSocket(`ws://${location.host}${endpoint}`);
        const connection = {
            ws,
            reconnectAttempts: 0,
            maxReconnectAttempts: options.maxReconnectAttempts || 5,
            reconnectInterval: options.reconnectInterval || 1000,

            send(data) {
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify(data));
                }
            },

            disconnect() {
                this.ws.close();
                jPulse.websocket.connections.delete(endpoint);
            }
        };

        this.setupWebSocketHandlers(connection, endpoint);
        this.connections.set(endpoint, connection);
        return connection;
    },

    setupWebSocketHandlers(connection, endpoint) {
        connection.ws.onopen = () => {
            console.log(`WebSocket connected: ${endpoint}`);
            connection.reconnectAttempts = 0;
        };

        connection.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            // Emit to document for Vue.js components to listen
            document.dispatchEvent(new CustomEvent('websocket-message', {
                detail: { endpoint, data }
            }));
        };

        connection.ws.onclose = () => {
            this.attemptReconnect(connection, endpoint);
        };

        connection.ws.onerror = (error) => {
            console.error(`WebSocket error on ${endpoint}:`, error);
        };
    },

    attemptReconnect(connection, endpoint) {
        if (connection.reconnectAttempts < connection.maxReconnectAttempts) {
            const delay = Math.pow(2, connection.reconnectAttempts) * connection.reconnectInterval;
            setTimeout(() => {
                connection.reconnectAttempts++;
                connection.ws = new WebSocket(`ws://${location.host}${endpoint}`);
                this.setupWebSocketHandlers(connection, endpoint);
            }, delay);
        }
    }
};
```

## Benefits

### For Developers
- **Progressive Learning**: Start simple, add complexity gradually
- **Real-world Patterns**: Learn production-ready techniques
- **Self-contained Examples**: Easy to understand and modify
- **Namespace Safety**: No conflicts with real site implementations

### For Framework
- **Clean Architecture**: Maintains MVC separation
- **Site Override System**: Demonstrates framework/site separation
- **Extensible Patterns**: Easy to add new example types
- **Maintenance Friendly**: Simple to update or remove examples

### For Sites
- **Optional Examples**: file.exists conditional display
- **Easy Removal**: Delete files to remove from dashboard
- **Learning Resource**: Onboarding for new developers
- **Pattern Library**: Reference implementations for common tasks

## SPA Integration Strategy Discussion

### Integration Options Analysis

During W-072 implementation, we discussed three approaches for integrating Vue.js SPAs with existing jPulse patterns:

#### Option A: Shared Routing Utilities
- **Purpose**: Common navigation and routing utilities in `jpulse-common.js`
- **Implementation**: `jPulse.spa.navigate()`, `jPulse.spa.setupPopstateHandler()`, `jPulse.spa.validateRoute()`
- **Benefits**: Consistent navigation behavior, minimal coupling, immediate value
- **Status**: Recommended for Phase 1

#### Option B: Shared Component Framework
- **Purpose**: Reusable Vue components vs extending existing `jPulse.UI.*` widgets
- **Key Insight**: Better to extend existing `jPulse.UI.*` widgets rather than create Vue-specific components
- **Benefits**: Consistent behavior between MPA and SPA, single source of truth
- **Implementation**: Add SPA support methods to existing widgets (e.g., `jPulse.UI.Card.renderSPA()`)

#### Option C: Cross-SPA Communication
- **Purpose**: Inter-SPA communication via events
- **Key Insight**: Overkill with W-073 WebSocket implementation coming
- **Decision**: Skip in favor of WebSocket-based communication in W-073
- **Benefits**: Real-time, cross-tab, server-coordinated communication

### Revised Integration Plan

**Phase 1**: Shared Routing Utilities (Option A)
- Add common SPA navigation patterns to `jpulse-common.js`
- Both `hello-vue` and `jpulse-docs` SPAs use shared utilities
- Minimal coupling, immediate value

**Phase 2**: Extend `jPulse.UI.*` for SPA Support (Option B)
- Add SPA rendering methods to existing widgets
- Maintain consistency between MPA and SPA patterns
- Avoid duplicating functionality

**Phase 3**: WebSocket Integration (W-073)
- Superior to event-based communication
- Real-time, bidirectional, cross-tab support
- Server coordination and scalability

### Implementation Status

- **W-071**: Hello Todo MVC ✅ Complete (v0.8.6)
- **W-072**: Vue.js SPA with routing ✅ Complete (v0.8.6)
- **W-073**: WebSocket Infrastructure ✅ Complete (v0.8.7)
  - `webapp/controller/websocket.js` - Server-side namespace management
  - `jPulse.ws.*` client utilities in `jpulse-common.js`
  - `/admin/websocket-stats` - Real-time monitoring page
  - Complete documentation in `docs/websockets.md`
- **W-075**: Hello WebSocket Examples 🕑 Pending
  - Emoji reactions + collaborative todo list
  - Two tabs per app: app view and code example

## Next Steps

1. **W-075 Implementation**: Create `/hello-websocket/` example app
   - Emoji reactions (ephemeral, fun demo)
   - Collaborative todo list (persistent, builds on W-071)
   - Code examples for both patterns
2. **Testing**: Create test suites for WebSocketController
3. **Dashboard Integration**: Add `/hello-websocket/` to home dashboard (conditional)
