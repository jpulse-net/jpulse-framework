# jPulse Framework / Docs / Examples & Use Cases v0.7.8

Real-world examples of building applications with the jPulse Framework, targeting enterprise and government scenarios.

## Enterprise Portal Example

A complete employee portal with authentication, user management, and document sharing.

### Project Structure
```
enterprise-portal/
├── site/webapp/
│   ├── app.conf              # Portal configuration
│   ├── controller/
│   │   ├── portal.js          # Main portal controller
│   │   ├── documents.js       # Document management
│   │   └── reports.js         # Reporting system
│   ├── model/
│   │   ├── document.js        # Document model
│   │   └── department.js      # Department model
│   ├── view/
│   │   ├── portal/            # Portal templates
│   │   ├── documents/         # Document views
│   │   └── reports/           # Report views
│   └── static/
│       ├── css/portal.css     # Portal styling
│       └── js/portal.js       # Portal JavaScript
└── webapp/                    # jPulse Framework
```

### Configuration (`site/webapp/app.conf`)
```javascript
{
    app: {
        siteName: 'Enterprise Employee Portal',
        siteDescription: 'Internal employee services and resources',
        adminEmail: 'it-admin@company.com',

        // Security settings
        sessionTimeout: 7200,  // 2 hours
        maxLoginAttempts: 3,
        requireStrongPasswords: true
    },

    // LDAP integration
    auth: {
        provider: 'ldap',
        ldap: {
            server: 'ldap://dc.company.com',
            baseDN: 'DC=company,DC=com',
            userDN: 'CN=Users,DC=company,DC=com'
        }
    },

    // Document storage
    storage: {
        documentsPath: '/var/portal/documents',
        maxFileSize: '50MB',
        allowedTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
    }
}
```

### Portal Controller (`site/webapp/controller/portal.js`)
```javascript
import { LogController } from '../../../webapp/controller/log.js';
import { ViewController } from '../../../webapp/controller/view.js';
import { UserModel } from '../../../webapp/model/user.js';
import { DocumentModel } from '../model/document.js';

class PortalController {
    constructor() {
        this.viewController = new ViewController();
        this.userModel = new UserModel();
        this.documentModel = new DocumentModel();
    }

    async index(req, res) {
        LogController.logInfo(req, 'PortalController.index', 'Loading portal dashboard');

        const user = req.session.user;
        const context = {
            pageTitle: 'Employee Portal',
            user: user,
            recentDocuments: await this.documentModel.getRecentDocuments(user.username, 5),
            pendingApprovals: await this.getPendingApprovals(user),
            announcements: await this.getAnnouncements()
        };

        await this.viewController.renderView(req, res, 'portal/index', context);
    }

    // API endpoints
    api() {
        return {
            'GET /dashboard-stats': this.getDashboardStats.bind(this),
            'POST /search-employees': this.searchEmployees.bind(this),
            'GET /announcements': this.getAnnouncementsAPI.bind(this)
        };
    }

    async getDashboardStats(req, res) {
        const user = req.session.user;
        const stats = {
            documentsCount: await this.documentModel.getUserDocumentCount(user.username),
            pendingApprovals: await this.getPendingApprovalsCount(user),
            unreadMessages: await this.getUnreadMessagesCount(user)
        };

        res.json({ success: true, data: stats });
    }
}

export { PortalController };
```

## Government Agency Example

A citizen services portal with form submissions, case tracking, and public records.

### Key Features
- **Public form submissions** with validation
- **Case tracking system** for citizens
- **Document management** with access controls
- **Multi-language support** for diverse populations
- **Accessibility compliance** (WCAG 2.1)

### Configuration Highlights
```javascript
{
    app: {
        siteName: 'City Services Portal',
        siteDescription: 'Online services for city residents',

        // Compliance settings
        accessibility: {
            wcagLevel: 'AA',
            screenReaderSupport: true,
            highContrastMode: true
        },

        // Security for government
        security: {
            requireHttps: true,
            sessionTimeout: 1800,  // 30 minutes
            auditLogging: true,
            dataRetention: '7years'
        }
    },

    // Multi-language support
    i18n: {
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'es', 'fr'],
        autoDetect: true
    }
}
```

## Healthcare System Example

Patient portal with appointment scheduling, medical records, and secure messaging.

### HIPAA Compliance Features
- **Encrypted data storage** and transmission
- **Audit logging** for all access
- **Role-based access control** (RBAC)
- **Session management** with automatic timeout
- **Secure messaging** between patients and providers

### Security Configuration
```javascript
{
    app: {
        siteName: 'Patient Health Portal',

        // HIPAA compliance
        hipaa: {
            enabled: true,
            auditAllAccess: true,
            encryptPHI: true,
            sessionTimeout: 900,  // 15 minutes
            requireMFA: true
        }
    },

    // Database security
    database: {
        ssl: true,
        authSource: 'admin',
        replicaSet: 'hipaa-rs',
        readPreference: 'primaryPreferred'
    }
}
```

## Common Patterns

### 1. Multi-Tenant Architecture
```javascript
// Tenant-aware data access
class TenantModel {
    constructor(tenantId) {
        this.tenantId = tenantId;
        this.collectionName = `tenant_${tenantId}_data`;
    }

    async findDocuments(query) {
        // Automatically scope to tenant
        query.tenantId = this.tenantId;
        return await CommonUtils.findDocuments(this.collectionName, query);
    }
}
```

### 2. Workflow Management
```javascript
// Approval workflow system
class WorkflowController {
    async submitForApproval(req, res) {
        const workflow = {
            documentId: req.body.documentId,
            submittedBy: req.session.user.username,
            currentStep: 1,
            status: 'pending',
            steps: [
                { step: 1, approver: 'supervisor', status: 'pending' },
                { step: 2, approver: 'manager', status: 'waiting' },
                { step: 3, approver: 'director', status: 'waiting' }
            ]
        };

        await this.workflowModel.createWorkflow(workflow);
        await this.notifyApprover(workflow.steps[0].approver);

        res.json({ success: true, workflowId: workflow._id });
    }
}
```

### 3. Performance Optimization
```javascript
// Redis caching for frequently accessed data
class CachedController {
    async getUserDashboard(req, res) {
        const cacheKey = `dashboard:${req.session.user.username}`;

        // Try cache first
        let dashboardData = await this.redis.get(cacheKey);

        if (!dashboardData) {
            // Generate dashboard data
            dashboardData = await this.generateDashboardData(req.session.user);

            // Cache for 5 minutes
            await this.redis.setex(cacheKey, 300, JSON.stringify(dashboardData));
        } else {
            dashboardData = JSON.parse(dashboardData);
        }

        const context = {
            pageTitle: 'Dashboard',
            ...dashboardData
        };

        await this.viewController.renderView(req, res, 'dashboard/index', context);
    }
}
```

---

*These examples demonstrate real-world applications of the jPulse Framework in enterprise and government environments.*
