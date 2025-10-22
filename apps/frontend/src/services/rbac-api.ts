/**
 * RBAC API Service
 *
 * Centralized API client for all RBAC-related operations
 */

import type {
  User,
  Company,
  Module,
  CompanyModule,
  EmployeeModuleAccess,
  Invitation,
  CompanyUser,
  UserListResponse,
  UserDetailsResponse,
  CompanyListResponse,
  ModuleListResponse,
  InvitationListResponse,
  EmployeeListResponse,
  StatsResponse,
  EffectivePermissions,
  ModuleAccessCheck,
  RoleInfo,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  SendInvitationRequest,
  AssignUserToCompanyRequest,
  UpdateUserRequest,
  GrantModuleAccessRequest,
  VerifyInvitationResponse,
  AcceptInvitationRequest,
  AcceptInvitationResponse,
} from '@accounting-platform/shared-types';

const API_BASE_URL = 'http://localhost:3001/api';

// Helper to get authorization header
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth-storage');
  if (!token) {
    throw new Error('No authentication token found');
  }

  // Parse the Zustand store
  const authData = JSON.parse(token);
  const bearerToken = authData?.state?.token;

  if (!bearerToken) {
    throw new Error('No authentication token found in storage');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${bearerToken}`,
  };
}

// Generic API request handler
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = options.headers || getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.error || error.message || 'API request failed');
  }

  return response.json();
}

// ============================================================================
// USER PROFILE
// ============================================================================

export const userAPI = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<{ user: User }> {
    return apiRequest('/user/profile');
  },

  /**
   * Update current user profile
   */
  async updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  }): Promise<{ user: User }> {
    return apiRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Get user's companies
   */
  async getCompanies(): Promise<CompanyListResponse> {
    return apiRequest('/user/companies');
  },

  /**
   * Get user's role in company
   */
  async getCompanyRole(companyId: string): Promise<{ role: RoleInfo | null }> {
    return apiRequest(`/user/companies/${companyId}/role`);
  },

  /**
   * Get user's accessible modules in company
   */
  async getCompanyModules(companyId: string): Promise<ModuleListResponse> {
    return apiRequest(`/user/companies/${companyId}/modules`);
  },

  /**
   * Check module access
   */
  async checkModuleAccess(
    companyId: string,
    moduleName: string
  ): Promise<{ access: ModuleAccessCheck }> {
    return apiRequest(`/user/companies/${companyId}/modules/${moduleName}/access`);
  },

  /**
   * Get effective permissions in company
   */
  async getEffectivePermissions(
    companyId: string
  ): Promise<{ permissions: EffectivePermissions }> {
    return apiRequest(`/user/companies/${companyId}/permissions`);
  },
};

// ============================================================================
// INVITATION
// ============================================================================

export const invitationAPI = {
  /**
   * Verify invitation token
   */
  async verifyInvitation(token: string): Promise<VerifyInvitationResponse> {
    return apiRequest(`/user/invitations/verify?token=${encodeURIComponent(token)}`);
  },

  /**
   * Accept invitation
   */
  async acceptInvitation(
    request: AcceptInvitationRequest
  ): Promise<AcceptInvitationResponse> {
    return apiRequest('/user/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};

// ============================================================================
// COMPANY OWNER
// ============================================================================

export const companyOwnerAPI = {
  /**
   * Send employee invitation
   */
  async sendInvitation(
    companyId: string,
    request: SendInvitationRequest
  ): Promise<{ message: string; invitation: { email: string; invitationUrl: string } }> {
    return apiRequest(`/companies/${companyId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Get pending invitations
   */
  async getInvitations(companyId: string): Promise<InvitationListResponse> {
    return apiRequest(`/companies/${companyId}/invitations`);
  },

  /**
   * Revoke invitation
   */
  async revokeInvitation(
    companyId: string,
    invitationId: string
  ): Promise<{ message: string }> {
    return apiRequest(`/companies/${companyId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Resend invitation
   */
  async resendInvitation(
    companyId: string,
    invitationId: string
  ): Promise<{ message: string }> {
    return apiRequest(`/companies/${companyId}/invitations/${invitationId}/resend`, {
      method: 'POST',
    });
  },

  /**
   * Get company employees
   */
  async getEmployees(companyId: string): Promise<EmployeeListResponse> {
    return apiRequest(`/companies/${companyId}/employees`);
  },

  /**
   * Remove employee
   */
  async removeEmployee(
    companyId: string,
    userId: string
  ): Promise<{ message: string }> {
    return apiRequest(`/companies/${companyId}/employees/${userId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get company modules
   */
  async getModules(companyId: string): Promise<ModuleListResponse> {
    return apiRequest(`/companies/${companyId}/modules`);
  },

  /**
   * Activate module
   */
  async activateModule(
    companyId: string,
    moduleId: string,
    configuration?: Record<string, any>
  ): Promise<{ module: CompanyModule }> {
    return apiRequest(`/companies/${companyId}/modules/${moduleId}/activate`, {
      method: 'POST',
      body: JSON.stringify({ configuration }),
    });
  },

  /**
   * Deactivate module
   */
  async deactivateModule(
    companyId: string,
    moduleId: string
  ): Promise<{ message: string }> {
    return apiRequest(`/companies/${companyId}/modules/${moduleId}/deactivate`, {
      method: 'POST',
    });
  },

  /**
   * Get employee module access
   */
  async getEmployeeModuleAccess(
    companyId: string,
    userId: string
  ): Promise<ModuleListResponse> {
    return apiRequest(`/companies/${companyId}/employees/${userId}/modules`);
  },

  /**
   * Grant employee module access
   */
  async grantModuleAccess(
    companyId: string,
    userId: string,
    moduleId: string,
    request: GrantModuleAccessRequest
  ): Promise<{ access: EmployeeModuleAccess }> {
    return apiRequest(
      `/companies/${companyId}/employees/${userId}/modules/${moduleId}/grant`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  },

  /**
   * Revoke employee module access
   */
  async revokeModuleAccess(
    companyId: string,
    userId: string,
    moduleId: string
  ): Promise<{ message: string }> {
    return apiRequest(`/companies/${companyId}/employees/${userId}/modules/${moduleId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get company settings
   */
  async getSettings(companyId: string): Promise<{ company: Company }> {
    return apiRequest(`/companies/${companyId}/settings`);
  },

  /**
   * Update company settings
   */
  async updateSettings(
    companyId: string,
    updates: UpdateCompanyRequest
  ): Promise<{ company: Company }> {
    return apiRequest(`/companies/${companyId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// ============================================================================
// SUPER ADMIN
// ============================================================================

export const superAdminAPI = {
  /**
   * Get all users with pagination
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    return apiRequest(`/superadmin/users${query ? `?${query}` : ''}`);
  },

  /**
   * Get user details
   */
  async getUserDetails(userId: string): Promise<UserDetailsResponse> {
    return apiRequest(`/superadmin/users/${userId}`);
  },

  /**
   * Update user
   */
  async updateUser(userId: string, updates: UpdateUserRequest): Promise<{ user: User }> {
    return apiRequest(`/superadmin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<{ message: string }> {
    return apiRequest(`/superadmin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get all companies
   */
  async getCompanies(): Promise<CompanyListResponse> {
    return apiRequest('/superadmin/companies');
  },

  /**
   * Create company
   */
  async createCompany(request: CreateCompanyRequest): Promise<{ company: Company }> {
    return apiRequest('/superadmin/companies', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Update company
   */
  async updateCompany(
    companyId: string,
    updates: UpdateCompanyRequest
  ): Promise<{ company: Company }> {
    return apiRequest(`/superadmin/companies/${companyId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete company
   */
  async deleteCompany(companyId: string): Promise<{ message: string }> {
    return apiRequest(`/superadmin/companies/${companyId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Assign user to company
   */
  async assignUserToCompany(
    companyId: string,
    request: AssignUserToCompanyRequest
  ): Promise<{ companyUser: CompanyUser }> {
    return apiRequest(`/superadmin/companies/${companyId}/users`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Remove user from company
   */
  async removeUserFromCompany(
    companyId: string,
    userId: string
  ): Promise<{ message: string }> {
    return apiRequest(`/superadmin/companies/${companyId}/users/${userId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get all modules
   */
  async getModules(): Promise<ModuleListResponse> {
    return apiRequest('/superadmin/modules');
  },

  /**
   * Get company modules
   */
  async getCompanyModules(companyId: string): Promise<ModuleListResponse> {
    return apiRequest(`/superadmin/companies/${companyId}/modules`);
  },

  /**
   * Activate module for company
   */
  async activateModule(
    companyId: string,
    moduleId: string,
    configuration?: Record<string, any>
  ): Promise<{ module: CompanyModule }> {
    return apiRequest(`/superadmin/companies/${companyId}/modules/${moduleId}/activate`, {
      method: 'POST',
      body: JSON.stringify({ configuration }),
    });
  },

  /**
   * Deactivate module for company
   */
  async deactivateModule(
    companyId: string,
    moduleId: string
  ): Promise<{ message: string }> {
    return apiRequest(
      `/superadmin/companies/${companyId}/modules/${moduleId}/deactivate`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Get system statistics
   */
  async getStats(): Promise<StatsResponse> {
    return apiRequest('/superadmin/stats');
  },
};

// Export all APIs
export const rbacAPI = {
  user: userAPI,
  invitation: invitationAPI,
  companyOwner: companyOwnerAPI,
  superAdmin: superAdminAPI,
};

export default rbacAPI;
