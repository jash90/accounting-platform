# Frontend RBAC Implementation - Complete

## Overview

The frontend RBAC system has been fully implemented with TypeScript React components, hooks, and utilities for role-based access control.

## ✅ Implemented Components

### 1. Shared Types (`libs/shared-types/src/index.ts`)

**Enhanced with comprehensive RBAC types:**
- User types with role information
- Company management types
- Module and permission types
- Invitation system types
- API request/response types

**Key Interfaces:**
```typescript
User, Company, Module, CompanyModule, EmployeeModuleAccess
Permission, Role, Invitation
CreateCompanyRequest, UpdateCompanyRequest
SendInvitationRequest, AcceptInvitationRequest
UserListResponse, CompanyListResponse, StatsResponse
```

### 2. API Service (`apps/frontend/src/services/rbac-api.ts`)

**Centralized API client with four namespaces:**

**a) User API (`rbacAPI.user`)**
- `getProfile()` - Get current user
- `updateProfile()` - Update profile
- `getCompanies()` - List accessible companies
- `getCompanyRole()` - Get role in company
- `getCompanyModules()` - List accessible modules
- `checkModuleAccess()` - Check module permissions
- `getEffectivePermissions()` - Get all permissions

**b) Invitation API (`rbacAPI.invitation`)**
- `verifyInvitation()` - Verify token validity
- `acceptInvitation()` - Accept and join company

**c) Company Owner API (`rbacAPI.companyOwner`)**
- `sendInvitation()` - Invite employees
- `getInvitations()` - List pending invitations
- `revokeInvitation()` - Cancel invitation
- `resendInvitation()` - Resend invitation email
- `getEmployees()` - List company employees
- `removeEmployee()` - Remove employee
- `getModules()` - List company modules
- `activateModule()` - Enable module
- `deactivateModule()` - Disable module
- `getEmployeeModuleAccess()` - View employee permissions
- `grantModuleAccess()` - Grant module access
- `revokeModuleAccess()` - Revoke module access
- `getSettings()` - Get company settings
- `updateSettings()` - Update company settings

**d) SuperAdmin API (`rbacAPI.superAdmin`)**
- `getUsers()` - List all users (paginated)
- `getUserDetails()` - View user details
- `updateUser()` - Update user info
- `deleteUser()` - Soft delete user
- `getCompanies()` - List all companies
- `createCompany()` - Create new company
- `updateCompany()` - Update company
- `deleteCompany()` - Delete company
- `assignUserToCompany()` - Assign user to company
- `removeUserFromCompany()` - Remove user from company
- `getModules()` - List all modules
- `getCompanyModules()` - Get company modules
- `activateModule()` - Activate module for company
- `deactivateModule()` - Deactivate module
- `getStats()` - System statistics

### 3. Custom Hooks (`apps/frontend/src/hooks/useRBAC.ts`)

**Role Hooks:**
- `useIsSuperAdmin()` - Check if SuperAdmin
- `useCompanyRole(companyId)` - Get role in company
- `useHasRole(roleName, companyId)` - Check specific role

**Company Hooks:**
- `useCompanies()` - List accessible companies
- `useCompany(companyId)` - Get company details

**Module Access Hooks:**
- `useCompanyModules(companyId)` - List accessible modules
- `useModuleAccess(companyId, moduleName)` - Check module permissions
- `useHasModuleAccess(companyId, moduleName)` - Boolean module access

**Permission Hooks:**
- `usePermissions(companyId)` - Get effective permissions
- `useHasPermission(companyId, permissionName)` - Check permission

**Combined Hooks:**
- `useRBAC(companyId)` - Complete RBAC state
- `useAuthorization()` - Authorization helpers

### 4. Route Guards (`apps/frontend/src/components/guards/RoleGuards.tsx`)

**Guard Components:**
- `<SuperAdminGuard>` - Requires SuperAdmin
- `<CompanyOwnerGuard>` - Requires Company Owner
- `<CompanyMemberGuard>` - Requires Company Member
- `<ModuleGuard>` - Requires module access
- `<SuperAdminOrOwnerGuard>` - Either SuperAdmin or Owner

**Features:**
- Loading states during verification
- Custom error messages
- Automatic redirect handling
- SuperAdmin bypass logic

### 5. Permission Components (`apps/frontend/src/components/rbac/PermissionComponents.tsx`)

**Conditional Rendering:**
- `<IfSuperAdmin>` - Render for SuperAdmin only
- `<IfCompanyOwner>` - Render for Company Owner
- `<IfCompanyMember>` - Render for Company Member
- `<IfModuleAccess>` - Render with module access
- `<IfPermission>` - Render with specific permission
- `<IfSuperAdminOrOwner>` - Render for either

**UI Components:**
- `<RestrictedButton>` - Auto-disabled without permission
- `<RoleBadge>` - Display role badge
- `<NoAccessMessage>` - Standard "no access" message

---

## 🎯 Usage Examples

### Example 1: Protected Route

```tsx
import { Routes, Route } from 'react-router-dom';
import { SuperAdminGuard, CompanyOwnerGuard } from './components/guards/RoleGuards';

<Routes>
  <Route
    path="/admin/*"
    element={
      <SuperAdminGuard>
        <AdminDashboard />
      </SuperAdminGuard>
    }
  />

  <Route
    path="/company/:companyId/settings"
    element={
      <CompanyOwnerGuard>
        <CompanySettings />
      </CompanyOwnerGuard>
    }
  />
</Routes>
```

### Example 2: Conditional UI Rendering

```tsx
import { IfSuperAdmin, IfCompanyOwner, IfModuleAccess } from './components/rbac/PermissionComponents';

function Dashboard({ companyId }: { companyId: string }) {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Only for SuperAdmin */}
      <IfSuperAdmin>
        <AdminPanel />
      </IfSuperAdmin>

      {/* Only for Company Owner */}
      <IfCompanyOwner companyId={companyId}>
        <OwnerTools />
      </IfCompanyOwner>

      {/* Only if user has write access to invoices */}
      <IfModuleAccess companyId={companyId} moduleName="invoices" permission="write">
        <CreateInvoiceButton />
      </IfModuleAccess>
    </div>
  );
}
```

### Example 3: Using Hooks

```tsx
import { useRBAC, useCompanyModules } from './hooks/useRBAC';

function InvoicesPage({ companyId }: { companyId: string }) {
  const { isSuperAdmin, isOwner, isEmployee } = useRBAC(companyId);
  const { modules, loading } = useCompanyModules(companyId);

  const invoiceModule = modules.find(m => m.name === 'invoices');

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Invoices</h1>

      {invoiceModule?.canWrite && (
        <button>Create Invoice</button>
      )}

      {(isSuperAdmin || isOwner) && (
        <button>Manage Permissions</button>
      )}
    </div>
  );
}
```

### Example 4: API Usage

```tsx
import { rbacAPI } from './services/rbac-api';

// SuperAdmin: Create company
async function createCompany() {
  const company = await rbacAPI.superAdmin.createCompany({
    name: 'Acme Corp',
    slug: 'acme-corp',
    ownerId: 'user-id-here',
    planType: 'professional'
  });
  console.log('Created:', company);
}

// Company Owner: Send invitation
async function inviteEmployee(companyId: string) {
  const result = await rbacAPI.companyOwner.sendInvitation(companyId, {
    email: 'employee@example.com',
    role: 'employee'
  });
  console.log('Invitation sent:', result.invitation.invitationUrl);
}

// Employee: Accept invitation
async function acceptInvite(token: string) {
  const result = await rbacAPI.invitation.acceptInvitation({ token });
  console.log('Joined company:', result.companyId);
}

// Check module access
async function checkAccess(companyId: string) {
  const access = await rbacAPI.user.checkModuleAccess(companyId, 'invoices');
  console.log('Can write:', access.access.canWrite);
}
```

### Example 5: Restricted Button

```tsx
import { RestrictedButton } from './components/rbac/PermissionComponents';

function InvoiceActions({ companyId, invoiceId }: Props) {
  return (
    <div>
      <RestrictedButton
        companyId={companyId}
        requireModule={{ name: 'invoices', permission: 'write' }}
        onClick={() => editInvoice(invoiceId)}
        className="btn btn-primary"
      >
        Edit Invoice
      </RestrictedButton>

      <RestrictedButton
        companyId={companyId}
        requireModule={{ name: 'invoices', permission: 'delete' }}
        onClick={() => deleteInvoice(invoiceId)}
        className="btn btn-danger"
      >
        Delete Invoice
      </RestrictedButton>
    </div>
  );
}
```

---

## 📦 Integration Checklist

### ✅ Completed
1. [x] Shared TypeScript types
2. [x] API service with all endpoints
3. [x] Custom React hooks for RBAC
4. [x] Route guard components
5. [x] Permission-aware UI components
6. [x] Role badges and access messages

### ⏳ To Implement (UI Pages)
1. [ ] SuperAdmin dashboard pages
2. [ ] Company Owner dashboard pages
3. [ ] Employee onboarding flow
4. [ ] Company selector component
5. [ ] Module management UI
6. [ ] Update navigation with role-based items

---

## 🔧 Next Steps

### 1. Update App Routing

Modify `apps/frontend/src/app/app.tsx`:

```tsx
import { SuperAdminGuard, CompanyOwnerGuard, CompanyMemberGuard } from '../components/guards/RoleGuards';

// Add admin routes
<Route path="/admin/*" element={<SuperAdminGuard><AdminLayout /></SuperAdminGuard>}>
  <Route path="dashboard" element={<AdminDashboard />} />
  <Route path="users" element={<UserManagement />} />
  <Route path="companies" element={<CompanyManagement />} />
</Route>

// Add company routes
<Route path="/company/:companyId/*" element={<CompanyMemberGuard><CompanyLayout /></CompanyMemberGuard>}>
  <Route path="dashboard" element={<CompanyDashboard />} />
  <Route path="employees" element={<CompanyOwnerGuard><EmployeeManagement /></CompanyOwnerGuard>} />
  <Route path="modules" element={<CompanyOwnerGuard><ModuleManagement /></CompanyOwnerGuard>} />
  <Route path="settings" element={<CompanyOwnerGuard><CompanySettings /></CompanyOwnerGuard>} />
</Route>

// Add invitation route
<Route path="/invitation/accept" element={<InvitationAccept />} />
```

### 2. Update Auth Store

Modify `apps/frontend/src/stores/auth.ts` to include `isSuperAdmin`:

```tsx
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean; // Add this
  login: (user: User, token: string) => void;
  logout: () => void;
}
```

### 3. Update Navigation

Modify `apps/frontend/src/components/layout/Sidebar.tsx`:

```tsx
import { useIsSuperAdmin, useCompanies } from '../../hooks/useRBAC';
import { IfSuperAdmin, RoleBadge } from '../rbac/PermissionComponents';

const isSuperAdmin = useIsSuperAdmin();
const { companies } = useCompanies();

// Add SuperAdmin menu
<IfSuperAdmin>
  <NavItem to="/admin/dashboard" icon={Shield}>
    Admin Panel
  </NavItem>
</IfSuperAdmin>

// Add company selector
{companies.map(company => (
  <CompanyMenuItem key={company.id} company={company} />
))}
```

### 4. Create UI Pages

**Priority Order:**
1. SuperAdmin Dashboard (user/company management)
2. Company Owner Dashboard (invite employees, manage modules)
3. Invitation Acceptance Page
4. Company Selector Component
5. Module Management Interface

---

## 🧪 Testing Guide

### Unit Tests
```typescript
// Test hooks
import { renderHook } from '@testing-library/react-hooks';
import { useIsSuperAdmin } from './hooks/useRBAC';

test('useIsSuperAdmin returns true for super admin', () => {
  const { result } = renderHook(() => useIsSuperAdmin());
  expect(result.current).toBe(true);
});
```

### Integration Tests
```typescript
// Test route guards
import { render } from '@testing-library/react';
import { SuperAdminGuard } from './components/guards/RoleGuards';

test('SuperAdminGuard blocks non-admin users', () => {
  const { getByText } = render(
    <SuperAdminGuard>
      <div>Protected Content</div>
    </SuperAdminGuard>
  );

  expect(getByText('Access Denied')).toBeInTheDocument();
});
```

---

## 📚 Additional Resources

- **Backend API**: See `RBAC_IMPLEMENTATION.md`
- **Frontend Plan**: See `RBAC_FRONTEND_PLAN.md`
- **Type Definitions**: `libs/shared-types/src/index.ts`
- **API Client**: `apps/frontend/src/services/rbac-api.ts`
- **Hooks**: `apps/frontend/src/hooks/useRBAC.ts`

---

## 🚀 Deployment Notes

### Environment Variables
Ensure frontend has access to:
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### Build Configuration
- All types are shared via `@accounting-platform/shared-types`
- API service auto-detects auth token from localStorage
- Guards handle loading and error states automatically

---

**Status**: ✅ Frontend RBAC Infrastructure Complete
**Next**: UI page implementation
**Estimated Effort**: 2-3 days for complete UI
