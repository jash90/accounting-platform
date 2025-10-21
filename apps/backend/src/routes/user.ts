/**
 * User/Employee API Routes
 *
 * Handles:
 * - User profile
 * - User companies and roles
 * - Module access
 * - Invitation acceptance
 */

import { Hono } from 'hono';
import { requireAuth, requireCompanyMember } from '../middleware/auth.middleware';
import { companyService } from '../services/company.service';
import { invitationService } from '../services/invitation.service';
import { enhancedRBACService } from '../services/rbac-enhanced.service';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';

const userRoutes = new Hono();

// Apply authentication to all routes
userRoutes.use('/*', requireAuth);

// ============================================================================
// USER PROFILE
// ============================================================================

/**
 * GET /api/user/profile
 * Get current user profile
 */
userRoutes.get('/profile', async (c) => {
  try {
    const currentUser = c.get('user');

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePicture: users.profilePicture,
        authProvider: users.authProvider,
        isEmailVerified: users.isEmailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get user's role
    const isSuperAdmin = await enhancedRBACService.isSuperAdmin(currentUser.id);

    return c.json({
      user: {
        ...user,
        isSuperAdmin,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

/**
 * PUT /api/user/profile
 * Update current user profile
 */
userRoutes.put('/profile', async (c) => {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json();

    const { firstName, lastName, profilePicture } = body;

    const updates: any = {};

    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, currentUser.id))
      .returning();

    return c.json({
      user: {
        ...updated,
        password: undefined,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// ============================================================================
// USER COMPANIES
// ============================================================================

/**
 * GET /api/user/companies
 * Get user's companies with roles
 */
userRoutes.get('/companies', async (c) => {
  try {
    const currentUser = c.get('user');

    const companies = await enhancedRBACService.getUserAccessibleCompanies(currentUser.id);

    return c.json({ companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return c.json({ error: 'Failed to fetch companies' }, 500);
  }
});

/**
 * GET /api/user/companies/:companyId
 * Get company details for user
 */
userRoutes.get('/companies/:companyId', requireCompanyMember(), async (c) => {
  try {
    const companyId = c.req.param('companyId');

    const company = await companyService.getCompanyById(companyId);

    if (!company) {
      return c.json({ error: 'Company not found' }, 404);
    }

    return c.json({ company });
  } catch (error) {
    console.error('Error fetching company:', error);
    return c.json({ error: 'Failed to fetch company' }, 500);
  }
});

/**
 * GET /api/user/companies/:companyId/role
 * Get user's role in company
 */
userRoutes.get('/companies/:companyId/role', requireCompanyMember(), async (c) => {
  try {
    const currentUser = c.get('user');
    const companyId = c.req.param('companyId');

    const role = await enhancedRBACService.getUserHighestRole(currentUser.id, companyId);

    return c.json({ role });
  } catch (error) {
    console.error('Error fetching role:', error);
    return c.json({ error: 'Failed to fetch role' }, 500);
  }
});

// ============================================================================
// MODULE ACCESS
// ============================================================================

/**
 * GET /api/user/companies/:companyId/modules
 * Get accessible modules for user in company
 */
userRoutes.get('/companies/:companyId/modules', requireCompanyMember(), async (c) => {
  try {
    const currentUser = c.get('user');
    const companyId = c.req.param('companyId');

    // Check if user is owner (has access to all modules)
    const isOwner = await companyService.isCompanyOwner(companyId, currentUser.id);

    if (isOwner || currentUser.isSuperAdmin) {
      // Owners and SuperAdmins see all enabled modules
      const modules = await companyService.getCompanyModules(companyId);
      return c.json({
        modules: modules
          .filter((m) => m.isEnabled)
          .map((m) => ({
            ...m,
            canRead: true,
            canWrite: true,
            canDelete: true,
          })),
      });
    }

    // Employees see only modules they have access to
    const moduleAccess = await companyService.getEmployeeModuleAccess(companyId, currentUser.id);

    return c.json({ modules: moduleAccess });
  } catch (error) {
    console.error('Error fetching modules:', error);
    return c.json({ error: 'Failed to fetch modules' }, 500);
  }
});

/**
 * GET /api/user/companies/:companyId/modules/:moduleName/access
 * Check access to specific module
 */
userRoutes.get('/companies/:companyId/modules/:moduleName/access', requireCompanyMember(), async (c) => {
  try {
    const currentUser = c.get('user');
    const companyId = c.req.param('companyId');
    const moduleName = c.req.param('moduleName');

    const canRead = await enhancedRBACService.checkModuleAccess(
      currentUser.id,
      companyId,
      moduleName,
      'read'
    );

    const canWrite = await enhancedRBACService.checkModuleAccess(
      currentUser.id,
      companyId,
      moduleName,
      'write'
    );

    const canDelete = await enhancedRBACService.checkModuleAccess(
      currentUser.id,
      companyId,
      moduleName,
      'delete'
    );

    return c.json({
      access: {
        canRead,
        canWrite,
        canDelete,
      },
    });
  } catch (error) {
    console.error('Error checking module access:', error);
    return c.json({ error: 'Failed to check module access' }, 500);
  }
});

// ============================================================================
// PERMISSIONS
// ============================================================================

/**
 * GET /api/user/companies/:companyId/permissions
 * Get user's effective permissions in company
 */
userRoutes.get('/companies/:companyId/permissions', requireCompanyMember(), async (c) => {
  try {
    const currentUser = c.get('user');
    const companyId = c.req.param('companyId');

    const effectivePermissions = await enhancedRBACService.getUserEffectivePermissions(
      currentUser.id,
      companyId
    );

    return c.json({ permissions: effectivePermissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return c.json({ error: 'Failed to fetch permissions' }, 500);
  }
});

// ============================================================================
// INVITATION ACCEPTANCE
// ============================================================================

/**
 * GET /api/user/invitations/verify
 * Verify invitation token (before accepting)
 */
userRoutes.get('/invitations/verify', async (c) => {
  try {
    const token = c.req.query('token');

    if (!token) {
      return c.json({ error: 'Token is required' }, 400);
    }

    const result = await invitationService.getInvitationByToken(token);

    if (!result.valid || !result.invitation) {
      return c.json({ error: result.error || 'Invalid invitation' }, 400);
    }

    return c.json({
      valid: true,
      invitation: {
        email: result.invitation.email,
        companyName: result.invitation.companyName,
        role: result.invitation.role,
        expiresAt: result.invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error verifying invitation:', error);
    return c.json({ error: 'Failed to verify invitation' }, 500);
  }
});

/**
 * POST /api/user/invitations/accept
 * Accept invitation and join company
 */
userRoutes.post('/invitations/accept', async (c) => {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json();

    const { token } = body;

    if (!token) {
      return c.json({ error: 'Token is required' }, 400);
    }

    const result = await invitationService.acceptInvitation(token, currentUser.id);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({
      message: 'Invitation accepted successfully',
      companyId: result.companyId,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return c.json({ error: 'Failed to accept invitation' }, 500);
  }
});

export { userRoutes };
