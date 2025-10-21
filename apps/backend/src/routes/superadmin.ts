/**
 * SuperAdmin API Routes
 *
 * Handles:
 * - User management (CRUD)
 * - Company assignment
 * - Module configuration
 * - System-wide settings
 */

import { Hono } from 'hono';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.middleware';
import { companyService } from '../services/company.service';
import { enhancedRBACService } from '../services/rbac-enhanced.service';
import { rbacService } from '../services/rbac.service';
import { db, users, companies, modules } from '../db';
import { eq, like, desc, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const superAdminRoutes = new Hono();

// Apply authentication and SuperAdmin requirement to all routes
superAdminRoutes.use('/*', requireAuth, requireSuperAdmin);

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * GET /api/superadmin/users
 * Get all users with pagination and search
 */
superAdminRoutes.get('/users', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';

    const offset = (page - 1) * limit;

    let query = db.select().from(users);

    if (search) {
      query = query.where(
        or(
          like(users.email, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`)
        )
      ) as any;
    }

    const allUsers = await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt));

    // Get total count
    const totalCount = await db.select().from(users);

    return c.json({
      users: allUsers.map((user) => ({
        ...user,
        password: undefined, // Don't expose password hash
      })),
      pagination: {
        page,
        limit,
        total: totalCount.length,
        pages: Math.ceil(totalCount.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

/**
 * GET /api/superadmin/users/:userId
 * Get user details with companies and roles
 */
superAdminRoutes.get('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get user companies
    const userCompanies = await companyService.getUserCompanies(userId);

    // Get user roles
    const userRoles = await rbacService.getUserRoles(userId);

    // Get user permissions
    const userPermissions = await rbacService.getUserPermissions(userId);

    return c.json({
      user: {
        ...user,
        password: undefined,
      },
      companies: userCompanies,
      roles: userRoles,
      permissions: userPermissions.map((p) => p.name),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

/**
 * PUT /api/superadmin/users/:userId
 * Update user information
 */
superAdminRoutes.put('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();

    const { email, firstName, lastName, isActive, isLocked } = body;

    const updates: any = {};

    if (email !== undefined) updates.email = email;
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (isActive !== undefined) updates.isActive = isActive;
    if (isLocked !== undefined) updates.isLocked = isLocked;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      user: {
        ...updated,
        password: undefined,
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

/**
 * DELETE /api/superadmin/users/:userId
 * Delete user (soft delete)
 */
superAdminRoutes.delete('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    // Soft delete by setting deletedAt
    const [deleted] = await db
      .update(users)
      .set({
        deletedAt: new Date(),
        isActive: false,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!deleted) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// ============================================================================
// COMPANY MANAGEMENT
// ============================================================================

/**
 * GET /api/superadmin/companies
 * Get all companies
 */
superAdminRoutes.get('/companies', async (c) => {
  try {
    const allCompanies = await companyService.getAllCompanies();

    return c.json({ companies: allCompanies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return c.json({ error: 'Failed to fetch companies' }, 500);
  }
});

/**
 * POST /api/superadmin/companies
 * Create new company
 */
superAdminRoutes.post('/companies', async (c) => {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json();

    const { name, slug, description, logo, website, email, phone, address, planType, ownerId } = body;

    if (!name || !slug || !ownerId) {
      return c.json(
        { error: 'Missing required fields: name, slug, ownerId' },
        400
      );
    }

    const company = await companyService.createCompany(
      {
        name,
        slug,
        description,
        logo,
        website,
        email,
        phone,
        address,
        planType: planType || 'basic',
      },
      ownerId
    );

    return c.json({ company }, 201);
  } catch (error) {
    console.error('Error creating company:', error);
    return c.json({ error: 'Failed to create company' }, 500);
  }
});

/**
 * PUT /api/superadmin/companies/:companyId
 * Update company
 */
superAdminRoutes.put('/companies/:companyId', async (c) => {
  try {
    const companyId = c.req.param('companyId');
    const body = await c.req.json();

    const updated = await companyService.updateCompany(companyId, body);

    return c.json({ company: updated });
  } catch (error) {
    console.error('Error updating company:', error);
    return c.json({ error: 'Failed to update company' }, 500);
  }
});

/**
 * DELETE /api/superadmin/companies/:companyId
 * Delete company
 */
superAdminRoutes.delete('/companies/:companyId', async (c) => {
  try {
    const companyId = c.req.param('companyId');

    await companyService.deleteCompany(companyId);

    return c.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    return c.json({ error: 'Failed to delete company' }, 500);
  }
});

/**
 * POST /api/superadmin/companies/:companyId/users
 * Assign user to company
 */
superAdminRoutes.post('/companies/:companyId/users', async (c) => {
  try {
    const companyId = c.req.param('companyId');
    const body = await c.req.json();

    const { userId, role = 'employee' } = body;

    if (!userId) {
      return c.json({ error: 'Missing required field: userId' }, 400);
    }

    const companyUser = await companyService.addUserToCompany(
      companyId,
      userId,
      role
    );

    return c.json({ companyUser }, 201);
  } catch (error) {
    console.error('Error assigning user to company:', error);
    return c.json({ error: 'Failed to assign user to company' }, 500);
  }
});

/**
 * DELETE /api/superadmin/companies/:companyId/users/:userId
 * Remove user from company
 */
superAdminRoutes.delete('/companies/:companyId/users/:userId', async (c) => {
  try {
    const companyId = c.req.param('companyId');
    const userId = c.req.param('userId');

    await companyService.removeUserFromCompany(companyId, userId);

    return c.json({ message: 'User removed from company successfully' });
  } catch (error) {
    console.error('Error removing user from company:', error);
    return c.json({ error: 'Failed to remove user from company' }, 500);
  }
});

// ============================================================================
// MODULE CONFIGURATION
// ============================================================================

/**
 * GET /api/superadmin/modules
 * Get all available modules
 */
superAdminRoutes.get('/modules', async (c) => {
  try {
    const allModules = await companyService.getAllModules();

    return c.json({ modules: allModules });
  } catch (error) {
    console.error('Error fetching modules:', error);
    return c.json({ error: 'Failed to fetch modules' }, 500);
  }
});

/**
 * GET /api/superadmin/companies/:companyId/modules
 * Get company module configuration
 */
superAdminRoutes.get('/companies/:companyId/modules', async (c) => {
  try {
    const companyId = c.req.param('companyId');

    const companyModulesList = await companyService.getCompanyModules(companyId);

    return c.json({ modules: companyModulesList });
  } catch (error) {
    console.error('Error fetching company modules:', error);
    return c.json({ error: 'Failed to fetch company modules' }, 500);
  }
});

/**
 * POST /api/superadmin/companies/:companyId/modules/:moduleId/activate
 * Activate module for company
 */
superAdminRoutes.post('/companies/:companyId/modules/:moduleId/activate', async (c) => {
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
});

/**
 * POST /api/superadmin/companies/:companyId/modules/:moduleId/deactivate
 * Deactivate module for company
 */
superAdminRoutes.post('/companies/:companyId/modules/:moduleId/deactivate', async (c) => {
  try {
    const companyId = c.req.param('companyId');
    const moduleId = c.req.param('moduleId');

    await companyService.deactivateModule(companyId, moduleId);

    return c.json({ message: 'Module deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating module:', error);
    return c.json({ error: 'Failed to deactivate module' }, 500);
  }
});

// ============================================================================
// STATISTICS & DASHBOARD
// ============================================================================

/**
 * GET /api/superadmin/stats
 * Get system-wide statistics
 */
superAdminRoutes.get('/stats', async (c) => {
  try {
    const totalUsers = await db.select().from(users);
    const totalCompanies = await db.select().from(companies);
    const activeUsers = await db.select().from(users).where(eq(users.isActive, true));
    const activeCompanies = await db.select().from(companies).where(eq(companies.isActive, true));

    return c.json({
      stats: {
        totalUsers: totalUsers.length,
        activeUsers: activeUsers.length,
        totalCompanies: totalCompanies.length,
        activeCompanies: activeCompanies.length,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch statistics' }, 500);
  }
});

export { superAdminRoutes };
