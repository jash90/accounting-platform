/**
 * Company Owner API Routes
 *
 * Handles:
 * - Employee invitations
 * - Module activation/deactivation
 * - Employee module access management
 * - Company settings
 */

import { Hono } from 'hono';
import { requireAuth, requireCompanyOwner } from '../middleware/auth.middleware';
import { companyService } from '../services/company.service';
import { invitationService } from '../services/invitation.service';

const companyOwnerRoutes = new Hono();

// Apply authentication to all routes
companyOwnerRoutes.use('/*', requireAuth);

// ============================================================================
// EMPLOYEE INVITATIONS
// ============================================================================

/**
 * POST /api/companies/:companyId/invitations
 * Send invitation to new employee
 */
companyOwnerRoutes.post('/:companyId/invitations', requireCompanyOwner(), async (c) => {
  try {
    const currentUser = c.get('user');
    const companyId = c.req.param('companyId');
    const body = await c.req.json();

    const { email, role = 'employee' } = body;

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const result = await invitationService.createInvitation({
      email,
      companyId,
      role,
      invitedBy: currentUser.id,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json(
      {
        message: 'Invitation sent successfully',
        invitation: {
          email,
          invitationUrl: result.invitationUrl,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error sending invitation:', error);
    return c.json({ error: 'Failed to send invitation' }, 500);
  }
});

/**
 * GET /api/companies/:companyId/invitations
 * Get pending invitations for company
 */
companyOwnerRoutes.get('/:companyId/invitations', requireCompanyOwner(), async (c) => {
  try {
    const companyId = c.req.param('companyId');

    const invitations = await invitationService.getCompanyInvitations(companyId);

    return c.json({ invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return c.json({ error: 'Failed to fetch invitations' }, 500);
  }
});

/**
 * DELETE /api/companies/:companyId/invitations/:invitationId
 * Revoke invitation
 */
companyOwnerRoutes.delete(
  '/:companyId/invitations/:invitationId',
  requireCompanyOwner(),
  async (c) => {
    try {
      const invitationId = c.req.param('invitationId');

      const success = await invitationService.revokeInvitation(invitationId);

      if (!success) {
        return c.json({ error: 'Failed to revoke invitation' }, 400);
      }

      return c.json({ message: 'Invitation revoked successfully' });
    } catch (error) {
      console.error('Error revoking invitation:', error);
      return c.json({ error: 'Failed to revoke invitation' }, 500);
    }
  }
);

/**
 * POST /api/companies/:companyId/invitations/:invitationId/resend
 * Resend invitation email
 */
companyOwnerRoutes.post(
  '/:companyId/invitations/:invitationId/resend',
  requireCompanyOwner(),
  async (c) => {
    try {
      const invitationId = c.req.param('invitationId');

      const result = await invitationService.resendInvitation(invitationId);

      if (!result.success) {
        return c.json({ error: result.error }, 400);
      }

      return c.json({ message: 'Invitation resent successfully' });
    } catch (error) {
      console.error('Error resending invitation:', error);
      return c.json({ error: 'Failed to resend invitation' }, 500);
    }
  }
);

// ============================================================================
// EMPLOYEE MANAGEMENT
// ============================================================================

/**
 * GET /api/companies/:companyId/employees
 * Get company employees
 */
companyOwnerRoutes.get('/:companyId/employees', requireCompanyOwner(), async (c) => {
  try {
    const companyId = c.req.param('companyId');

    const employees = await companyService.getCompanyUsers(companyId);

    return c.json({ employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return c.json({ error: 'Failed to fetch employees' }, 500);
  }
});

/**
 * DELETE /api/companies/:companyId/employees/:userId
 * Remove employee from company
 */
companyOwnerRoutes.delete(
  '/:companyId/employees/:userId',
  requireCompanyOwner(),
  async (c) => {
    try {
      const companyId = c.req.param('companyId');
      const userId = c.req.param('userId');

      await companyService.removeUserFromCompany(companyId, userId);

      return c.json({ message: 'Employee removed successfully' });
    } catch (error) {
      console.error('Error removing employee:', error);
      return c.json({ error: 'Failed to remove employee' }, 500);
    }
  }
);

// ============================================================================
// MODULE MANAGEMENT
// ============================================================================

/**
 * GET /api/companies/:companyId/modules
 * Get company modules
 */
companyOwnerRoutes.get('/:companyId/modules', requireCompanyOwner(), async (c) => {
  try {
    const companyId = c.req.param('companyId');

    const companyModulesList = await companyService.getCompanyModules(companyId);

    return c.json({ modules: companyModulesList });
  } catch (error) {
    console.error('Error fetching modules:', error);
    return c.json({ error: 'Failed to fetch modules' }, 500);
  }
});

/**
 * POST /api/companies/:companyId/modules/:moduleId/activate
 * Activate module for company
 */
companyOwnerRoutes.post(
  '/:companyId/modules/:moduleId/activate',
  requireCompanyOwner(),
  async (c) => {
    try {
      const currentUser = c.get('user');
      const companyId = c.req.param('companyId');
      const moduleId = c.req.param('moduleId');
      const body = await c.req.json();

      const { configuration } = body;

      const activated = await companyService.activateModule(
        companyId,
        moduleId,
        currentUser.id,
        configuration
      );

      return c.json({ module: activated });
    } catch (error) {
      console.error('Error activating module:', error);
      return c.json({ error: 'Failed to activate module' }, 500);
    }
  }
);

/**
 * POST /api/companies/:companyId/modules/:moduleId/deactivate
 * Deactivate module for company
 */
companyOwnerRoutes.post(
  '/:companyId/modules/:moduleId/deactivate',
  requireCompanyOwner(),
  async (c) => {
    try {
      const companyId = c.req.param('companyId');
      const moduleId = c.req.param('moduleId');

      await companyService.deactivateModule(companyId, moduleId);

      return c.json({ message: 'Module deactivated successfully' });
    } catch (error) {
      console.error('Error deactivating module:', error);
      return c.json({ error: 'Failed to deactivate module' }, 500);
    }
  }
);

// ============================================================================
// EMPLOYEE MODULE ACCESS
// ============================================================================

/**
 * GET /api/companies/:companyId/employees/:userId/modules
 * Get employee module access
 */
companyOwnerRoutes.get(
  '/:companyId/employees/:userId/modules',
  requireCompanyOwner(),
  async (c) => {
    try {
      const companyId = c.req.param('companyId');
      const userId = c.req.param('userId');

      const moduleAccess = await companyService.getEmployeeModuleAccess(companyId, userId);

      return c.json({ modules: moduleAccess });
    } catch (error) {
      console.error('Error fetching employee module access:', error);
      return c.json({ error: 'Failed to fetch employee module access' }, 500);
    }
  }
);

/**
 * POST /api/companies/:companyId/employees/:userId/modules/:moduleId/grant
 * Grant employee access to module
 */
companyOwnerRoutes.post(
  '/:companyId/employees/:userId/modules/:moduleId/grant',
  requireCompanyOwner(),
  async (c) => {
    try {
      const currentUser = c.get('user');
      const companyId = c.req.param('companyId');
      const userId = c.req.param('userId');
      const moduleId = c.req.param('moduleId');
      const body = await c.req.json();

      const {
        canRead = true,
        canWrite = false,
        canDelete = false,
        expiresAt,
      } = body;

      const access = await companyService.grantEmployeeModuleAccess(
        companyId,
        userId,
        moduleId,
        { canRead, canWrite, canDelete },
        currentUser.id,
        expiresAt ? new Date(expiresAt) : undefined
      );

      return c.json({ access });
    } catch (error) {
      console.error('Error granting module access:', error);
      return c.json({ error: 'Failed to grant module access' }, 500);
    }
  }
);

/**
 * DELETE /api/companies/:companyId/employees/:userId/modules/:moduleId
 * Revoke employee module access
 */
companyOwnerRoutes.delete(
  '/:companyId/employees/:userId/modules/:moduleId',
  requireCompanyOwner(),
  async (c) => {
    try {
      const companyId = c.req.param('companyId');
      const userId = c.req.param('userId');
      const moduleId = c.req.param('moduleId');

      await companyService.revokeEmployeeModuleAccess(companyId, userId, moduleId);

      return c.json({ message: 'Module access revoked successfully' });
    } catch (error) {
      console.error('Error revoking module access:', error);
      return c.json({ error: 'Failed to revoke module access' }, 500);
    }
  }
);

// ============================================================================
// COMPANY SETTINGS
// ============================================================================

/**
 * GET /api/companies/:companyId/settings
 * Get company settings
 */
companyOwnerRoutes.get('/:companyId/settings', requireCompanyOwner(), async (c) => {
  try {
    const companyId = c.req.param('companyId');

    const company = await companyService.getCompanyById(companyId);

    if (!company) {
      return c.json({ error: 'Company not found' }, 404);
    }

    return c.json({ company });
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return c.json({ error: 'Failed to fetch company settings' }, 500);
  }
});

/**
 * PUT /api/companies/:companyId/settings
 * Update company settings
 */
companyOwnerRoutes.put('/:companyId/settings', requireCompanyOwner(), async (c) => {
  try {
    const companyId = c.req.param('companyId');
    const body = await c.req.json();

    const updated = await companyService.updateCompany(companyId, body);

    return c.json({ company: updated });
  } catch (error) {
    console.error('Error updating company settings:', error);
    return c.json({ error: 'Failed to update company settings' }, 500);
  }
});

export { companyOwnerRoutes };
