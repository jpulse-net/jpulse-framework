# jPulse Framework / Docs / Dev / Architecture v1.2.3

Comprehensive overview of the jPulse Framework's system architecture, design decisions, and extensibility patterns.

## Core Architecture Principles

### 1. MVC Pattern Implementation
jPulse follows a clean Model-View-Controller architecture:

```
webapp/
├── controller/        # Business logic and request handling
├── model/            # Data access and business rules
├── view/             # Presentation layer in browser (pages and templates)
└── utils/            # Shared utilities and services
```

**Controllers** handle HTTP requests, coordinate with models, and render views
**Models** manage data persistence, validation, and business logic
**Views** primarily client-side JavaScript with API calls, with minimal server-side Handlebars for initial page structure
**Utils** offer shared functionality across the application

### 2. Site Override Architecture
The framework implements a powerful override system enabling:

- **Clean separation** between framework and site code
- **Seamless updates** without losing customizations
- **Zero configuration** auto-discovery
- **Flexible customization** at any level

#### File Resolution Priority
```
1. site/webapp/[path]     # Site-specific files (highest priority)
2. webapp/[path]          # Framework defaults (fallback)
```

#### Override Examples
```
# Framework provides:
webapp/view/home/index.shtml

# Site can override:
site/webapp/view/home/index.shtml  # ← This takes precedence

# Framework provides:
webapp/controller/user.js

# Site can extend:
site/webapp/controller/dashboard.js  # ← New controller, auto-discovered
```

### 3. Configuration System
Hierarchical configuration merging:

```
Final Config = Framework Defaults + Site Overrides + Environment Variables
```

**Configuration Sources (in order):**
1. `webapp/app.conf` - Framework defaults
2. `site/webapp/app.conf` - Site-specific overrides
3. Environment variables - Runtime overrides

## Component Architecture

### Request Lifecycle
```
1. nginx → Static files OR Proxy to Node.js
2. Express middleware stack
3. Route resolution (framework + site)
4. Controller execution
5. Model data access
6. View rendering
7. Response delivery
```

### Controller Architecture
```javascript
class ExampleController {
    constructor() {
        this.viewController = new ViewController();
        this.model = new ExampleModel();
    }

    // Web page handler
    async index(req, res) {
        const data = await this.model.getData();
        await this.viewController.renderView(req, res, 'example/index', { data });
    }

    // API endpoints (auto-registered as /api/1/example/*)
    api() {
        return {
            'GET /data': this.getData.bind(this),
            'POST /create': this.createData.bind(this)
        };
    }
}
```

### Model Architecture
```javascript
class ExampleModel {
    constructor() {
        this.collectionName = 'examples';
    }

    async createDocument(data) {
        // Validation
        const validatedData = this.validateData(data);

        // Business logic
        const document = {
            ...validatedData,
            createdAt: new Date(),
            status: 'active'
        };

        // Persistence
        return await CommonUtils.createDocument(this.collectionName, document);
    }
}
```

### View Architecture
```html
<!-- Template: webapp/view/example/index.shtml -->
{{file.include webapp/view/jpulse-header.tmpl}}

<div class="jp-container">
    <h1>{{pageTitle}}</h1>

    {{#if data}}
        <div class="jp-card">
            <!-- Template content -->
        </div>
    {{else}}
        <p>{{i18n.messages.noData}}</p>
    {{/if}}
</div>

{{file.include webapp/view/jpulse-footer.tmpl}}
```

## Data Layer Architecture

### MongoDB Integration
```javascript
// Connection management
class Database {
    static async connect() {
        const config = appConfig.database;

        if (config.replicaSet) {
            // Replica set connection
            this.client = new MongoClient(`mongodb://${config.hosts.join(',')}/${config.name}?replicaSet=${config.replicaSet}`);
        } else {
            // Single instance
            this.client = new MongoClient(`mongodb://${config.host}:${config.port}/${config.name}`);
        }

        await this.client.connect();
        this.db = this.client.db(config.name);
    }
}
```

### CommonUtils Pattern
```javascript
// Standardized data operations
class CommonUtils {
    static async createDocument(collectionName, document) {
        // Validation
        const validatedDoc = this.validateDocument(document);

        // Audit logging
        LogController.logInfo(null, 'CommonUtils.createDocument',
            `Creating document in ${collectionName}`);

        // Insert with error handling
        try {
            const result = await Database.db.collection(collectionName).insertOne(validatedDoc);
            return { success: true, insertedId: result.insertedId };
        } catch (error) {
            LogController.logError(null, 'CommonUtils.createDocument', error.message);
            throw error;
        }
    }
}
```

## Security Architecture

### Authentication & Authorization
```javascript
// Middleware-based security
class AuthMiddleware {
    static requireAuthentication(req, res, next) {
        if (!req.session.user) {
            return res.redirect('/auth/login.shtml');
        }
        next();
    }

    static requireRole(roles) {
        return (req, res, next) => {
            if (!req.session.user || !roles.includes(req.session.user.role)) {
                return CommonUtils.sendError(res, 403, 'Insufficient permissions');
            }
            next();
        };
    }
}
```

### Session Management
```javascript
// Secure session configuration
app.use(session({
    secret: appConfig.app.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: appConfig.app.environment === 'production',
        httpOnly: true,
        maxAge: appConfig.app.sessionTimeout * 1000
    },
    store: new MongoStore({ client: Database.client })
}));
```

## Extensibility Architecture

### Site Registry System
```javascript
// Automatic controller discovery
class SiteRegistry {
    static async discoverControllers() {
        const siteControllerPath = path.join(appConfig.app.dirName, 'site/webapp/controller');

        if (fs.existsSync(siteControllerPath)) {
            const files = fs.readdirSync(siteControllerPath);

            for (const file of files) {
                if (file.endsWith('.js')) {
                    const controllerName = path.basename(file, '.js');
                    const Controller = await import(path.join(siteControllerPath, file));

                    // Auto-register routes
                    this.registerController(controllerName, Controller);
                }
            }
        }
    }
}
```

### Path Resolution System
```javascript
// Intelligent file resolution
class PathResolver {
    static resolveView(viewPath) {
        // Try site override first
        const sitePath = path.join(appConfig.app.dirName, 'site/webapp/view', viewPath);
        if (fs.existsSync(sitePath)) {
            return sitePath;
        }

        // Fallback to framework
        const frameworkPath = path.join(appConfig.app.dirName, 'webapp/view', viewPath);
        if (fs.existsSync(frameworkPath)) {
            return frameworkPath;
        }

        throw new Error(`View not found: ${viewPath}`);
    }
}
```

## Performance Architecture

### Caching Strategy
```javascript
// Multi-layer caching
class CacheManager {
    // Template caching
    static templateCache = new Map();

    // Configuration caching
    static configCache = null;

    // Database query caching (when Redis available)
    static async getCachedQuery(key, queryFn, ttl = 300) {
        if (this.redis) {
            const cached = await this.redis.get(key);
            if (cached) return JSON.parse(cached);
        }

        const result = await queryFn();

        if (this.redis) {
            await this.redis.setex(key, ttl, JSON.stringify(result));
        }

        return result;
    }
}
```

### Database Optimization
```javascript
// Connection pooling and optimization
const mongoOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    useUnifiedTopology: true
};
```

## Scalability Architecture

### Horizontal Scaling
```javascript
// Cluster-ready application
if (cluster.isMaster && appConfig.app.environment === 'production') {
    const numCPUs = require('os').cpus().length;

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
    });
} else {
    // Worker process
    startApplication();
}
```

### Load Balancing Considerations
- **Session affinity** not required (MongoDB session store)
- **Stateless design** enables horizontal scaling
- **Database connection pooling** handles concurrent requests
- **nginx upstream** configuration for multiple instances

## Testing Architecture

### Test Organization
```
webapp/tests/
├── setup/              # Global test setup/teardown
├── unit/               # Unit tests
│   ├── controller/     # Controller tests
│   ├── model/          # Model tests
│   └── utils/          # Utility tests
├── integration/        # Integration tests
└── fixtures/           # Test data and configurations
```

### Test Isolation
```javascript
// Global test setup
beforeAll(async () => {
    // Use test database
    process.env.NODE_ENV = 'test';
    await Database.connect();
    await TestUtils.cleanupDatabase();
});

afterEach(async () => {
    // Clean up after each test
    await TestUtils.cleanupTestData();
});
```

## Deployment Architecture

### Production Stack
```
[Internet] → [nginx] → [PM2 Cluster] → [MongoDB Replica Set]
                 │
                 └→ [Static Files]
```

### Environment Separation
- **Development**: Single MongoDB instance, file watching
- **Staging**: Replica set, PM2 single instance, SSL
- **Production**: Replica set, PM2 cluster, nginx, monitoring

## Future Architecture Considerations

### Plugin System (W-045)
```
jpulse-framework/
├── webapp/             # Framework core
├── site/               # Site customizations
└── plugins/            # Plugin system
    ├── auth-ldap/
    ├── dashboard-analytics/
    └── document-management/
```

### Microservices Evolution
- **Service decomposition** for large deployments
- **API gateway** integration
- **Event-driven architecture** for loose coupling
- **Container orchestration** support

---

*This architecture provides a solid foundation for enterprise applications while maintaining simplicity and extensibility.*
