# Backend RBAC Analysis & Frontend Implementation Plan

## Backend Architecture Analysis

### 1. Role Hierarchy (3 Levels)
```
Level 0: SuperAdmin (bartekziimny90@gmail.com)
  └─ Full system access
  └─ User management
  └─ Company management
  └─ Global module configuration

Level 1: Company Owner
  └─ Full company access
  └─ Employee invitations
  └─ Module activation/deactivation
  └─ Employee permission management

Level 2: Employee
  └─ Module-based access
  └─ Read/Write/Delete permissions per module
  └─ Company-scoped access only
```

### 2. Permission Model

#### Resource-Action Permissions
```typescript
Permission = {
  name: string,           // e.g., "users.create"
  resource: string,       // e.g., "users"
  action: string,         // e.g., "create"
  organizationId?: string // Optional company scope
}
```

#### Module Permissions
```typescript
ModuleAccess = {
  moduleId: string,
  canRead: boolean,
  canWrite: boolean,
  canDelete: boolean,
  expiresAt?: Date
}
```

### 3. API Endpoint Structure

#### Authentication Flow
```
1. User logs in via OAuth → JWT token generated
2. Token includes userId but NOT role
3. On every request:
   - Middleware verifies JWT
   - Fetches user from database
   - Checks if email matches SUPERADMIN env var
   - Auto-initializes roles if first login
   - Attaches user + isSuperAdmin to context
```

#### Key Endpoints by Role

**SuperAdmin (`/api/superadmin/*`)**
- User CRUD
- Company CRUD
- Company-User assignments
- Module configuration
- System statistics

**Company Owner (`/api/companies/:companyId/*`)**
- Employee invitations (send, revoke, resend)
- Employee management (list, remove)
- Module activation/deactivation
- Employee module access grants
- Company settings

**User/Employee (`/api/user/*`)**
- Profile management
- List accessible companies
- View company details
- Check module access
- Accept invitations

### 4. Data Models

#### User
```typescript
{
  id: string
  email: string
  firstName: string
  lastName: string
  profilePicture?: string
  authProvider: 'local' | 'google' | 'github'
  isActive: boolean
  isSuperAdmin?: boolean  // Computed on backend
  createdAt: Date
}
```

#### Company
```typescript
{
  id: string
  name: string
  slug: string
  description?: string
  logo?: string
  website?: string
  email?: string
  phone?: string
  address?: string
  isActive: boolean
  planType: 'basic' | 'professional' | 'enterprise'
  createdAt: Date
  updatedAt: Date
}
```

#### Module
```typescript
{
  id: string
  name: string              // e.g., "invoices"
  displayName: string       // e.g., "Invoices"
  description?: string
  icon?: string
  isCore: boolean
  requiresPlan?: string
  isEnabled?: boolean       // At company level
  canRead?: boolean         // At user level
  canWrite?: boolean        // At user level
  canDelete?: boolean       // At user level
}
```

#### Invitation
```typescript
{
  id: string
  email: string
  companyId: string
  role: 'owner' | 'employee'
  token: string
  isUsed: boolean
  expiresAt: Date
  createdAt: Date
}
```

---

## Frontend Implementation Plan

### Phase 1: Core Infrastructure

#### 1.1 Shared Types (`libs/shared-types/src/rbac.ts`)
- User types with role information
- Company types
- Module types
- Permission types
- Invitation types
- API response types

#### 1.2 API Client (`apps/frontend/src/services/api.ts`)
- Centralized API client
- Automatic JWT token injection
- Error handling
- Type-safe request/response

#### 1.3 RBAC Context (`apps/frontend/src/contexts/RBACContext.tsx`)
- Current user's role
- Current company
- Accessible companies
- Permissions cache
- Module access cache

#### 1.4 Custom Hooks
- `useAuth()` - User authentication state
- `useRole()` - Current user role
- `usePermissions()` - Permission checking
- `useModuleAccess()` - Module access checking
- `useCompanies()` - User companies

### Phase 2: Route Guards & Navigation

#### 2.1 Enhanced Route Guards
- `SuperAdminRoute` - Requires SuperAdmin
- `CompanyOwnerRoute` - Requires Company Owner
- `CompanyMemberRoute` - Requires Company Member
- `ModuleRoute` - Requires module access

#### 2.2 Navigation System
- Role-based menu rendering
- Company switcher
- Module navigation
- User menu with role badge

### Phase 3: SuperAdmin UI

#### 3.1 Dashboard (`/admin/dashboard`)
- System statistics
- Quick actions
- Recent activity

#### 3.2 User Management (`/admin/users`)
- User list with search/filter
- User details view
- Edit user form
- Activate/deactivate users

#### 3.3 Company Management (`/admin/companies`)
- Company list
- Create company form
- Edit company form
- Assign users to companies

#### 3.4 Module Configuration (`/admin/modules`)
- Global module list
- Company module configuration
- Module activation interface

### Phase 4: Company Owner UI

#### 4.1 Dashboard (`/company/:id/dashboard`)
- Company overview
- Employee count
- Active modules
- Pending invitations

#### 4.2 Employee Management (`/company/:id/employees`)
- Employee list
- Invite employee form
- Pending invitations list
- Remove employee action

#### 4.3 Module Management (`/company/:id/modules`)
- Available modules
- Enable/disable toggle
- Employee access matrix
- Grant/revoke access interface

#### 4.4 Settings (`/company/:id/settings`)
- Company details
- Contact information
- Branding

### Phase 5: Employee UI

#### 5.1 Onboarding (`/invitation/accept`)
- Verify invitation
- Display company info
- Accept invitation flow
- Error handling (expired, used, invalid)

#### 5.2 Company Selector
- List accessible companies
- Switch between companies
- Company role display

#### 5.3 Module Access
- View accessible modules
- Permission-aware UI
- "Contact admin" prompts for denied access

### Phase 6: Permission-Aware Components

#### 6.1 Conditional Rendering
```tsx
<IfRole role="super_admin">
  <AdminPanel />
</IfRole>

<IfCompanyOwner companyId={companyId}>
  <OwnerActions />
</IfCompanyOwner>

<IfModuleAccess module="invoices" permission="write">
  <CreateInvoiceButton />
</IfModuleAccess>
```

#### 6.2 Permission Hooks
```tsx
const { isSuperAdmin } = useRole();
const { isOwner, isEmployee } = useCompanyRole(companyId);
const { canRead, canWrite, canDelete } = useModuleAccess(companyId, 'invoices');
const hasPermission = usePermission('users', 'create');
```

---

## Customized Permission Structure

### Enhanced Permissions by Resource

#### Users Resource
```
users.create          - Create new users (SuperAdmin)
users.read            - View user information
users.update          - Update user details
users.delete          - Delete users (SuperAdmin)
users.activate        - Activate/deactivate users
users.impersonate     - Login as another user (SuperAdmin)
```

#### Companies Resource
```
companies.create      - Create companies (SuperAdmin)
companies.read        - View company details
companies.update      - Update company information
companies.delete      - Delete companies (SuperAdmin)
companies.assign_users - Assign users to companies
companies.transfer_ownership - Transfer company ownership
```

#### Modules Resource
```
modules.activate      - Activate modules for company
modules.deactivate    - Deactivate modules
modules.configure     - Configure module settings
modules.grant_access  - Grant employee access
modules.revoke_access - Revoke employee access
```

#### Invitations Resource
```
invitations.send      - Send employee invitations
invitations.revoke    - Revoke pending invitations
invitations.resend    - Resend invitations
invitations.view      - View invitation history
```

#### Module-Specific Permissions
```
invoices.read         - View invoices
invoices.create       - Create invoices
invoices.update       - Edit invoices
invoices.delete       - Delete invoices
invoices.approve      - Approve invoices
invoices.export       - Export invoice data

expenses.read
expenses.create
expenses.update
expenses.delete
expenses.approve

clients.read
clients.create
clients.update
clients.delete
clients.export

reports.read
reports.create
reports.export
reports.schedule      - Schedule automated reports

settings.read
settings.update
settings.billing      - Manage billing
```

### Permission Matrix

```
Permission              | SuperAdmin | Company Owner | Employee
------------------------|------------|---------------|----------
users.create            | ✓          | ✗             | ✗
users.read              | ✓          | ✓             | ✗
companies.create        | ✓          | ✗             | ✗
companies.update        | ✓          | ✓ (own only)  | ✗
modules.activate        | ✓          | ✓ (own only)  | ✗
modules.grant_access    | ✓          | ✓ (own only)  | ✗
invitations.send        | ✓          | ✓ (own only)  | ✗
invoices.create         | ✓          | ✓             | ✓ (if granted)
invoices.delete         | ✓          | ✓             | ✓ (if granted)
reports.export          | ✓          | ✓             | ✓ (if granted)
```

---

## Implementation Priorities

### Must Have (MVP)
1. ✅ Role detection and initialization
2. ✅ SuperAdmin user management
3. ✅ Company creation and assignment
4. ✅ Invitation system
5. ✅ Module activation
6. ⏳ Frontend route guards
7. ⏳ Role-based navigation
8. ⏳ SuperAdmin dashboard
9. ⏳ Company Owner dashboard
10. ⏳ Invitation acceptance UI

### Should Have
11. Permission-aware components
12. Module access UI
13. Employee management UI
14. Company settings
15. User profile with roles

### Nice to Have
16. Permission inheritance
17. Custom role creation
18. Temporary permissions
19. Permission audit log UI
20. Role-based themes

---

## Next Steps

1. **Create shared types** for frontend/backend
2. **Build API client** with authentication
3. **Implement RBAC context** and hooks
4. **Create route guards** for role-based access
5. **Build SuperAdmin UI** components
6. **Build Company Owner UI** components
7. **Implement invitation flow** UI
8. **Update navigation** with role-based rendering
9. **Test integration** end-to-end
10. **Create documentation** for frontend usage
