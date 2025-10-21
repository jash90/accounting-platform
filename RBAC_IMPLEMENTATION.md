# RBAC System Implementation Guide

## Overview

A comprehensive Role-Based Access Control (RBAC) system has been implemented with three-tier hierarchy:

1. **SuperAdmin** - Full system access (email-based: bartekziimny90@gmail.com)
2. **Company Owner** - Full company management access
3. **Employee** - Limited access based on granted permissions

## Features Implemented

### 1. Database Schema
- ✅ Enhanced user table with additional security fields
- ✅ Complete RBAC tables (roles, permissions, user_roles, role_permissions, user_permissions)
- ✅ Company management system (companies, company_users, modules, company_modules)
- ✅ Employee module access control (employee_module_access)
- ✅ Invitation system with 30-minute token expiry
- ✅ Audit logging infrastructure
- ✅ Session management system

### 2. Backend Services

#### Company Service (`apps/backend/src/services/company.service.ts`)
- Company CRUD operations
- User-company assignments
- Module activation/deactivation
- Employee module access management
- Role verification (owner/member checks)

#### Invitation Service (`apps/backend/src/services/invitation.service.ts`)
- 30-minute token expiry
- Secure token generation and hashing
- Email notifications
- Single-use tokens
- Automatic company assignment on acceptance

#### Enhanced RBAC Service (`apps/backend/src/services/rbac-enhanced.service.ts`)
- SuperAdmin detection via environment variable
- Company-level role checking
- Module access verification
- Permission hierarchy enforcement
- Auto-role initialization

#### Email Service (Updated)
- Added invitation email template
- Company branding support
- Expiry time notifications

### 3. API Endpoints

#### SuperAdmin Routes (`/api/superadmin/*`)
**Authentication:** Requires JWT + SuperAdmin email

- `GET /users` - List all users with pagination/search
- `GET /users/:userId` - Get user details
- `PUT /users/:userId` - Update user
- `DELETE /users/:userId` - Soft delete user
- `GET /companies` - List all companies
- `POST /companies` - Create company
- `PUT /companies/:companyId` - Update company
- `DELETE /companies/:companyId` - Delete company
- `POST /companies/:companyId/users` - Assign user to company
- `DELETE /companies/:companyId/users/:userId` - Remove user from company
- `GET /modules` - List all modules
- `GET /companies/:companyId/modules` - Get company modules
- `POST /companies/:companyId/modules/:moduleId/activate` - Activate module
- `POST /companies/:companyId/modules/:moduleId/deactivate` - Deactivate module
- `GET /stats` - System statistics

#### Company Owner Routes (`/api/companies/:companyId/*`)
**Authentication:** Requires JWT + Company Owner role

- `POST /invitations` - Send employee invitation
- `GET /invitations` - List pending invitations
- `DELETE /invitations/:invitationId` - Revoke invitation
- `POST /invitations/:invitationId/resend` - Resend invitation
- `GET /employees` - List company employees
- `DELETE /employees/:userId` - Remove employee
- `GET /modules` - Get company modules
- `POST /modules/:moduleId/activate` - Activate module
- `POST /modules/:moduleId/deactivate` - Deactivate module
- `GET /employees/:userId/modules` - Get employee module access
- `POST /employees/:userId/modules/:moduleId/grant` - Grant module access
- `DELETE /employees/:userId/modules/:moduleId` - Revoke module access
- `GET /settings` - Get company settings
- `PUT /settings` - Update company settings

#### User/Employee Routes (`/api/user/*`)
**Authentication:** Requires JWT

- `GET /profile` - Get current user profile
- `PUT /profile` - Update profile
- `GET /companies` - Get accessible companies
- `GET /companies/:companyId` - Get company details
- `GET /companies/:companyId/role` - Get role in company
- `GET /companies/:companyId/modules` - Get accessible modules
- `GET /companies/:companyId/modules/:moduleName/access` - Check module access
- `GET /companies/:companyId/permissions` - Get effective permissions
- `GET /invitations/verify?token=...` - Verify invitation token
- `POST /invitations/accept` - Accept invitation

### 4. Middleware

#### Authentication Middleware (`apps/backend/src/middleware/auth.middleware.ts`)
- `requireAuth` - Verify JWT token
- `requireSuperAdmin` - Require SuperAdmin role
- `requireCompanyOwner(companyIdParam)` - Require company owner
- `requireCompanyMember(companyIdParam)` - Require company member
- `requirePermission(resource, action)` - Require specific permission
- `requireModuleAccess(moduleName, permission)` - Require module access
- `optionalAuth` - Optional authentication

### 5. Migration

**File:** `drizzle/0005_rbac_and_company_system.sql`

**Includes:**
- User table enhancements
- RBAC tables (roles, permissions, mappings)
- Company management tables
- Module system
- Invitation tokens
- Audit logs
- Session management
- Triggers for automated fields
- Default roles and permissions seeding

## Setup Instructions

### 1. Environment Configuration

Add to `.env` and `apps/backend/.env`:

```env
# RBAC Configuration
SUPERADMIN=bartekziimny90@gmail.com

# Existing variables
DATABASE_URL=postgresql://user:password@localhost:5432/accounting_platform
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:4200
BACKEND_URL=http://localhost:3001

# Email Configuration (for invitations)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Accounting Platform <noreply@yourdomain.com>
```

### 2. Database Migration

**Option 1: Using migration script**
```bash
npm run db:migrate-verify
```

**Option 2: Manual migration**
```bash
# Load environment
source .env

# Run migration
psql $DATABASE_URL -f drizzle/0005_rbac_and_company_system.sql
```

### 3. Default Data

The migration automatically creates:
- 3 system roles: `super_admin`, `company_owner`, `employee`
- Default permissions for user, company, module, and invitation management
- 6 core modules: invoices, expenses, clients, reports, dashboard, settings

### 4. Verify Installation

1. **Check tables exist:**
```bash
psql $DATABASE_URL -c "\dt" | grep -E "(roles|permissions|companies|modules|invitation)"
```

2. **Verify default data:**
```bash
psql $DATABASE_URL -c "SELECT name FROM roles;"
psql $DATABASE_URL -c "SELECT name, display_name FROM modules;"
```

3. **Test SuperAdmin detection:**
```bash
# Login with bartekziimny90@gmail.com via OAuth
# Check /api/user/profile response for isSuperAdmin: true
```

## Usage Examples

### 1. SuperAdmin Operations

```bash
# Get all users
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3001/api/superadmin/users

# Create company
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","slug":"acme","ownerId":"user-id-here"}' \
  http://localhost:3001/api/superadmin/companies

# Assign user to company
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-id","role":"owner"}' \
  http://localhost:3001/api/superadmin/companies/$COMPANY_ID/users
```

### 2. Company Owner Operations

```bash
# Send employee invitation
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@example.com","role":"employee"}' \
  http://localhost:3001/api/companies/$COMPANY_ID/invitations

# Activate module for company
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/companies/$COMPANY_ID/modules/$MODULE_ID/activate

# Grant employee module access
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"canRead":true,"canWrite":true,"canDelete":false}' \
  http://localhost:3001/api/companies/$COMPANY_ID/employees/$USER_ID/modules/$MODULE_ID/grant
```

### 3. Employee Operations

```bash
# Get accessible companies
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3001/api/user/companies

# Get accessible modules in company
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3001/api/user/companies/$COMPANY_ID/modules

# Verify invitation token
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3001/api/user/invitations/verify?token=$INVITATION_TOKEN

# Accept invitation
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"invitation-token-here"}' \
  http://localhost:3001/api/user/invitations/accept
```

## Permission Flow

### SuperAdmin Access
```
1. User logs in with bartekziimny90@gmail.com
2. Enhanced RBAC Service detects SuperAdmin email
3. Super_admin role auto-assigned if not present
4. All permission checks bypass (return true)
5. Can access all companies, modules, and settings
```

### Company Owner Flow
```
1. SuperAdmin creates company and assigns owner
2. Owner assigned to company_users table with role='owner'
3. Owner can:
   - Send invitations to employees
   - Activate/deactivate company modules
   - Grant/revoke employee module access
   - Manage company settings
4. Permission checks verify company ownership
```

### Employee Onboarding Flow
```
1. Company Owner sends invitation email
2. Employee receives email with 30-minute link
3. Employee clicks link → redirected to frontend
4. Frontend verifies token validity
5. Employee logs in/signs up
6. Employee accepts invitation
7. Auto-assigned to company as employee
8. Can access only granted modules
```

## Security Features

1. **Email-based SuperAdmin** - No hardcoded credentials
2. **30-minute invitation expiry** - Prevents stale invitations
3. **Single-use tokens** - Tokens marked as used after acceptance
4. **Company-scoped permissions** - Owners can't affect other companies
5. **Module-level access control** - Granular read/write/delete permissions
6. **Audit logging infrastructure** - Track all permission changes
7. **Token hashing** - Invitation tokens stored as bcrypt hashes
8. **Soft deletes** - User deletion preserves audit trail
9. **Session management** - Track device, location, IP for security

## Testing Checklist

- [ ] SuperAdmin can access /api/superadmin/* endpoints
- [ ] Non-SuperAdmin gets 403 on /api/superadmin/* endpoints
- [ ] Company Owner can send invitations
- [ ] Invitation emails are received
- [ ] Invitation links expire after 30 minutes
- [ ] Invitation tokens are single-use
- [ ] Company Owner can activate/deactivate modules
- [ ] Company Owner can grant/revoke employee module access
- [ ] Employees can only see granted modules
- [ ] Employees without access get 403 on protected modules
- [ ] Company members can't access other companies' data
- [ ] Soft-deleted users can't login

## Troubleshooting

### Issue: SuperAdmin not detected
**Solution:** Verify SUPERADMIN environment variable is set correctly and matches user email

### Issue: Invitations not sending
**Solution:** Check EMAIL_* environment variables are configured

### Issue: Migration fails
**Solution:** Check database connection, ensure PostgreSQL is running

### Issue: 403 Forbidden on authenticated requests
**Solution:** Verify JWT token is valid and user has required role/permissions

### Issue: Module access denied
**Solution:** Check company_modules (module enabled) and employee_module_access (user granted)

## Frontend Integration (Next Steps)

1. **Route Guards** - Create role-based guards in React Router
2. **SuperAdmin Dashboard** - User management, company assignment UI
3. **Company Owner Dashboard** - Invitation management, module configuration UI
4. **Employee Onboarding** - Invitation acceptance flow
5. **Module Access UI** - Conditional rendering based on permissions
6. **Permission Display** - Show user's effective permissions

## API Documentation

Full API documentation with request/response examples available at:
- `docs/API_RBAC.md` (to be created)

## Support

For issues or questions:
- Check migration logs: `drizzle/0005_rbac_and_company_system.sql`
- Review service implementations in `apps/backend/src/services/`
- Verify middleware configuration in `apps/backend/src/middleware/`

---

**Implementation Date:** October 2025
**Migration Version:** 0005
**Status:** ✅ Backend Complete, Frontend Pending
