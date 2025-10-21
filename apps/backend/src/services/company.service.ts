/**
 * Company Management Service
 *
 * Handles company CRUD operations, user assignments, and module management.
 */

import { db } from '../db';
import { eq, and, or, desc } from 'drizzle-orm';
import {
  companies,
  companyUsers,
  modules,
  companyModules,
  employeeModuleAccess,
  type Company,
  type NewCompany,
  type CompanyUser,
  type NewCompanyUser,
  type Module,
  type CompanyModule,
  type NewCompanyModule,
  type EmployeeModuleAccess,
  type NewEmployeeModuleAccess,
} from '../db';

export class CompanyService {
  /**
   * Create a new company
   */
  async createCompany(
    companyData: NewCompany,
    ownerId: string
  ): Promise<Company> {
    // Create company
    const [company] = await db
      .insert(companies)
      .values(companyData)
      .returning();

    // Assign creator as owner
    await db.insert(companyUsers).values({
      companyId: company.id,
      userId: ownerId,
      role: 'owner',
      isActive: true,
    });

    // Activate all core modules by default
    const coreModules = await db
      .select()
      .from(modules)
      .where(eq(modules.isCore, true));

    if (coreModules.length > 0) {
      await db.insert(companyModules).values(
        coreModules.map((module) => ({
          companyId: company.id,
          moduleId: module.id,
          isEnabled: true,
          enabledBy: ownerId,
        }))
      );
    }

    return company;
  }

  /**
   * Get company by ID
   */
  async getCompanyById(companyId: string): Promise<Company | null> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    return company || null;
  }

  /**
   * Get company by slug
   */
  async getCompanyBySlug(slug: string): Promise<Company | null> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    return company || null;
  }

  /**
   * Get all companies (SuperAdmin only)
   */
  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  /**
   * Get companies for a user
   */
  async getUserCompanies(userId: string): Promise<Array<Company & { role: string }>> {
    const result = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        description: companies.description,
        logo: companies.logo,
        website: companies.website,
        email: companies.email,
        phone: companies.phone,
        address: companies.address,
        isActive: companies.isActive,
        planType: companies.planType,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
        role: companyUsers.role,
      })
      .from(companyUsers)
      .innerJoin(companies, eq(companyUsers.companyId, companies.id))
      .where(
        and(
          eq(companyUsers.userId, userId),
          eq(companyUsers.isActive, true)
        )
      )
      .orderBy(desc(companyUsers.joinedAt));

    return result;
  }

  /**
   * Update company
   */
  async updateCompany(
    companyId: string,
    updates: Partial<NewCompany>
  ): Promise<Company> {
    const [updated] = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, companyId))
      .returning();

    return updated;
  }

  /**
   * Delete company
   */
  async deleteCompany(companyId: string): Promise<void> {
    await db.delete(companies).where(eq(companies.id, companyId));
  }

  /**
   * Add user to company
   */
  async addUserToCompany(
    companyId: string,
    userId: string,
    role: 'owner' | 'employee' = 'employee'
  ): Promise<CompanyUser> {
    const [companyUser] = await db
      .insert(companyUsers)
      .values({
        companyId,
        userId,
        role,
        isActive: true,
      })
      .returning();

    return companyUser;
  }

  /**
   * Remove user from company
   */
  async removeUserFromCompany(companyId: string, userId: string): Promise<void> {
    await db
      .delete(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.userId, userId)
        )
      );

    // Also remove all employee module access
    await db
      .delete(employeeModuleAccess)
      .where(
        and(
          eq(employeeModuleAccess.companyId, companyId),
          eq(employeeModuleAccess.userId, userId)
        )
      );
  }

  /**
   * Get company users
   */
  async getCompanyUsers(companyId: string): Promise<any[]> {
    const result = await db
      .select({
        id: companyUsers.id,
        userId: companyUsers.userId,
        role: companyUsers.role,
        isActive: companyUsers.isActive,
        joinedAt: companyUsers.joinedAt,
      })
      .from(companyUsers)
      .where(eq(companyUsers.companyId, companyId))
      .orderBy(desc(companyUsers.joinedAt));

    return result;
  }

  /**
   * Check if user is company owner
   */
  async isCompanyOwner(companyId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.userId, userId),
          eq(companyUsers.role, 'owner'),
          eq(companyUsers.isActive, true)
        )
      )
      .limit(1);

    return !!result;
  }

  /**
   * Check if user is company member
   */
  async isCompanyMember(companyId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.userId, userId),
          eq(companyUsers.isActive, true)
        )
      )
      .limit(1);

    return !!result;
  }

  /**
   * Get user role in company
   */
  async getUserRole(companyId: string, userId: string): Promise<string | null> {
    const [result] = await db
      .select({
        role: companyUsers.role,
      })
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.userId, userId),
          eq(companyUsers.isActive, true)
        )
      )
      .limit(1);

    return result?.role || null;
  }

  /**
   * Activate module for company
   */
  async activateModule(
    companyId: string,
    moduleId: string,
    activatedBy: string,
    configuration?: any
  ): Promise<CompanyModule> {
    // Check if already exists
    const [existing] = await db
      .select()
      .from(companyModules)
      .where(
        and(
          eq(companyModules.companyId, companyId),
          eq(companyModules.moduleId, moduleId)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(companyModules)
        .set({
          isEnabled: true,
          enabledBy: activatedBy,
          enabledAt: new Date(),
          configuration: configuration || existing.configuration,
        })
        .where(eq(companyModules.id, existing.id))
        .returning();

      return updated;
    }

    // Create new
    const [activated] = await db
      .insert(companyModules)
      .values({
        companyId,
        moduleId,
        isEnabled: true,
        enabledBy: activatedBy,
        configuration: configuration || {},
      })
      .returning();

    return activated;
  }

  /**
   * Deactivate module for company
   */
  async deactivateModule(companyId: string, moduleId: string): Promise<void> {
    await db
      .update(companyModules)
      .set({ isEnabled: false })
      .where(
        and(
          eq(companyModules.companyId, companyId),
          eq(companyModules.moduleId, moduleId)
        )
      );
  }

  /**
   * Get company enabled modules
   */
  async getCompanyModules(companyId: string): Promise<any[]> {
    const result = await db
      .select({
        id: companyModules.id,
        moduleId: modules.id,
        name: modules.name,
        displayName: modules.displayName,
        description: modules.description,
        icon: modules.icon,
        isCore: modules.isCore,
        isEnabled: companyModules.isEnabled,
        configuration: companyModules.configuration,
        enabledAt: companyModules.enabledAt,
      })
      .from(companyModules)
      .innerJoin(modules, eq(companyModules.moduleId, modules.id))
      .where(eq(companyModules.companyId, companyId));

    return result;
  }

  /**
   * Grant employee access to module
   */
  async grantEmployeeModuleAccess(
    companyId: string,
    userId: string,
    moduleId: string,
    permissions: {
      canRead?: boolean;
      canWrite?: boolean;
      canDelete?: boolean;
    },
    grantedBy: string,
    expiresAt?: Date
  ): Promise<EmployeeModuleAccess> {
    // Check if already exists
    const [existing] = await db
      .select()
      .from(employeeModuleAccess)
      .where(
        and(
          eq(employeeModuleAccess.companyId, companyId),
          eq(employeeModuleAccess.userId, userId),
          eq(employeeModuleAccess.moduleId, moduleId)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(employeeModuleAccess)
        .set({
          canRead: permissions.canRead ?? existing.canRead,
          canWrite: permissions.canWrite ?? existing.canWrite,
          canDelete: permissions.canDelete ?? existing.canDelete,
          grantedBy,
          grantedAt: new Date(),
          expiresAt,
        })
        .where(eq(employeeModuleAccess.id, existing.id))
        .returning();

      return updated;
    }

    // Create new
    const [granted] = await db
      .insert(employeeModuleAccess)
      .values({
        companyId,
        userId,
        moduleId,
        canRead: permissions.canRead ?? true,
        canWrite: permissions.canWrite ?? false,
        canDelete: permissions.canDelete ?? false,
        grantedBy,
        expiresAt,
      })
      .returning();

    return granted;
  }

  /**
   * Revoke employee module access
   */
  async revokeEmployeeModuleAccess(
    companyId: string,
    userId: string,
    moduleId: string
  ): Promise<void> {
    await db
      .delete(employeeModuleAccess)
      .where(
        and(
          eq(employeeModuleAccess.companyId, companyId),
          eq(employeeModuleAccess.userId, userId),
          eq(employeeModuleAccess.moduleId, moduleId)
        )
      );
  }

  /**
   * Get employee module access
   */
  async getEmployeeModuleAccess(companyId: string, userId: string): Promise<any[]> {
    const now = new Date();

    const result = await db
      .select({
        id: employeeModuleAccess.id,
        moduleId: modules.id,
        name: modules.name,
        displayName: modules.displayName,
        icon: modules.icon,
        canRead: employeeModuleAccess.canRead,
        canWrite: employeeModuleAccess.canWrite,
        canDelete: employeeModuleAccess.canDelete,
        grantedAt: employeeModuleAccess.grantedAt,
        expiresAt: employeeModuleAccess.expiresAt,
      })
      .from(employeeModuleAccess)
      .innerJoin(modules, eq(employeeModuleAccess.moduleId, modules.id))
      .where(
        and(
          eq(employeeModuleAccess.companyId, companyId),
          eq(employeeModuleAccess.userId, userId),
          or(
            eq(employeeModuleAccess.expiresAt, null as any),
            eq(employeeModuleAccess.expiresAt, now)
          )
        )
      );

    return result;
  }

  /**
   * Check if employee has module access
   */
  async hasModuleAccess(
    companyId: string,
    userId: string,
    moduleId: string,
    permission: 'read' | 'write' | 'delete' = 'read'
  ): Promise<boolean> {
    const now = new Date();

    // Check if user is company owner (owners have access to all modules)
    const isOwner = await this.isCompanyOwner(companyId, userId);
    if (isOwner) {
      return true;
    }

    // Check if module is enabled for company
    const [companyModule] = await db
      .select()
      .from(companyModules)
      .where(
        and(
          eq(companyModules.companyId, companyId),
          eq(companyModules.moduleId, moduleId),
          eq(companyModules.isEnabled, true)
        )
      )
      .limit(1);

    if (!companyModule) {
      return false; // Module not enabled for company
    }

    // Check employee-specific access
    const [access] = await db
      .select()
      .from(employeeModuleAccess)
      .where(
        and(
          eq(employeeModuleAccess.companyId, companyId),
          eq(employeeModuleAccess.userId, userId),
          eq(employeeModuleAccess.moduleId, moduleId),
          or(
            eq(employeeModuleAccess.expiresAt, null as any),
            eq(employeeModuleAccess.expiresAt, now)
          )
        )
      )
      .limit(1);

    if (!access) {
      return false; // No access granted
    }

    // Check specific permission
    switch (permission) {
      case 'read':
        return access.canRead;
      case 'write':
        return access.canWrite;
      case 'delete':
        return access.canDelete;
      default:
        return false;
    }
  }

  /**
   * Get all modules (for selection)
   */
  async getAllModules(): Promise<Module[]> {
    return await db.select().from(modules);
  }

  /**
   * Get module by name
   */
  async getModuleByName(name: string): Promise<Module | null> {
    const [module] = await db
      .select()
      .from(modules)
      .where(eq(modules.name, name))
      .limit(1);

    return module || null;
  }
}

export const companyService = new CompanyService();
