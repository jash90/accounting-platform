// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  authProvider: 'local' | 'google' | 'github';
  isEmailVerified: boolean;
  isActive?: boolean;
  isSuperAdmin?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConfirmResetPasswordRequest {
  token: string;
  password: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

// ============================================================================
// RBAC TYPES
// ============================================================================

export type RoleName = 'super_admin' | 'company_owner' | 'employee';

export interface Role {
  id: string;
  name: string;
  description?: string;
  level: number;
  isSystemRole: boolean;
  isAssignable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
  organizationId?: string;
  validFrom?: string;
  validUntil?: string;
  assignedBy?: string;
  assignedAt: string;
}

// ============================================================================
// COMPANY TYPES
// ============================================================================

export interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  planType: 'basic' | 'professional' | 'enterprise';
  role?: string; // User's role in this company
  createdAt: string;
  updatedAt: string;
}

export interface CompanyUser {
  id: string;
  userId: string;
  companyId: string;
  role: 'owner' | 'employee';
  isActive: boolean;
  joinedAt: string;
  createdAt: string;
}

export interface CreateCompanyRequest {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  planType?: 'basic' | 'professional' | 'enterprise';
  ownerId: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  slug?: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  planType?: 'basic' | 'professional' | 'enterprise';
  isActive?: boolean;
}

// ============================================================================
// MODULE TYPES
// ============================================================================

export interface Module {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  isCore: boolean;
  requiresPlan?: string;
  createdAt: string;
}

export interface CompanyModule {
  id: string;
  moduleId: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  isCore: boolean;
  isEnabled: boolean;
  configuration?: Record<string, any>;
  enabledAt: string;
}

export interface EmployeeModuleAccess {
  id: string;
  moduleId: string;
  name: string;
  displayName: string;
  icon?: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  grantedAt: string;
  expiresAt?: string;
}

export interface GrantModuleAccessRequest {
  canRead?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
  expiresAt?: string;
}

// ============================================================================
// INVITATION TYPES
// ============================================================================

export interface Invitation {
  id: string;
  email: string;
  companyId: string;
  companyName?: string;
  role: 'owner' | 'employee';
  token: string;
  isUsed: boolean;
  usedAt?: string;
  usedBy?: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

export interface SendInvitationRequest {
  email: string;
  role?: 'owner' | 'employee';
}

export interface VerifyInvitationResponse {
  valid: boolean;
  invitation?: {
    email: string;
    companyName: string;
    role: string;
    expiresAt: string;
  };
  error?: string;
}

export interface AcceptInvitationRequest {
  token: string;
}

export interface AcceptInvitationResponse {
  message: string;
  companyId: string;
}

// ============================================================================
// PERMISSION & ACCESS TYPES
// ============================================================================

export interface EffectivePermissions {
  role: string;
  permissions: string[];
  modules: EmployeeModuleAccess[];
}

export interface ModuleAccessCheck {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface RoleInfo {
  role: string;
  level: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserDetailsResponse {
  user: User;
  companies: Company[];
  roles: Role[];
  permissions: string[];
}

export interface CompanyListResponse {
  companies: Company[];
}

export interface ModuleListResponse {
  modules: Module[] | CompanyModule[];
}

export interface InvitationListResponse {
  invitations: Invitation[];
}

export interface EmployeeListResponse {
  employees: CompanyUser[];
}

export interface StatsResponse {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalCompanies: number;
    activeCompanies: number;
  };
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface AssignUserToCompanyRequest {
  userId: string;
  role?: 'owner' | 'employee';
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  isLocked?: boolean;
}
