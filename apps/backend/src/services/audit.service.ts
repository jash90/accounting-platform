/**
 * Audit Logging Service
 *
 * Provides comprehensive audit logging for security, compliance, and troubleshooting.
 * Logs all authentication, authorization, and data access events.
 */

import { db } from '../db';
import { auditLogs, type NewAuditLog } from '../db/schema-enhanced';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export interface AuditEventOptions {
  userId?: string;
  sessionId?: string;
  eventType: string;
  eventCategory: 'authentication' | 'authorization' | 'data_access' | 'admin' | 'security' | 'system';
  eventSeverity: 'info' | 'warning' | 'error' | 'critical';
  resourceType?: string;
  resourceId?: string;
  action?: string;
  result: 'success' | 'failure' | 'denied';
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AuditQueryOptions {
  userId?: string;
  eventType?: string;
  eventCategory?: string;
  eventSeverity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditService {
  /**
   * Log an audit event
   */
  async logEvent(event: AuditEventOptions): Promise<string> {
    const auditLog: NewAuditLog = {
      userId: event.userId,
      sessionId: event.sessionId,
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      eventSeverity: event.eventSeverity,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      action: event.action,
      result: event.result,
      failureReason: event.failureReason,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      requestId: event.requestId,
      oldValues: event.oldValues,
      newValues: event.newValues,
      metadata: event.metadata,
    };

    const [inserted] = await db
      .insert(auditLogs)
      .values(auditLog)
      .returning({ id: auditLogs.id });

    // Also log to console for development/debugging
    this.logToConsole(event);

    return inserted.id;
  }

  /**
   * Log authentication event
   */
  async logAuthentication(
    eventType: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'password_changed',
    options: {
      userId?: string;
      sessionId?: string;
      result: 'success' | 'failure';
      failureReason?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    return this.logEvent({
      ...options,
      eventType,
      eventCategory: 'authentication',
      eventSeverity: options.result === 'failure' ? 'warning' : 'info',
    });
  }

  /**
   * Log authorization event
   */
  async logAuthorization(
    eventType: 'permission_check' | 'role_check' | 'access_granted' | 'access_denied',
    options: {
      userId: string;
      resourceType?: string;
      resourceId?: string;
      action?: string;
      result: 'success' | 'denied';
      failureReason?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    return this.logEvent({
      ...options,
      eventType,
      eventCategory: 'authorization',
      eventSeverity: options.result === 'denied' ? 'warning' : 'info',
    });
  }

  /**
   * Log data access event
   */
  async logDataAccess(
    action: 'create' | 'read' | 'update' | 'delete',
    options: {
      userId: string;
      sessionId?: string;
      resourceType: string;
      resourceId?: string;
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    return this.logEvent({
      ...options,
      eventType: `data_${action}`,
      eventCategory: 'data_access',
      eventSeverity: 'info',
      action,
      result: 'success',
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    eventType: 'suspicious_activity' | 'brute_force_attempt' | 'account_locked' | 'mfa_failed' | 'token_revoked',
    options: {
      userId?: string;
      sessionId?: string;
      severity: 'warning' | 'error' | 'critical';
      ipAddress?: string;
      userAgent?: string;
      failureReason?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    return this.logEvent({
      ...options,
      eventType,
      eventCategory: 'security',
      eventSeverity: options.severity,
      result: 'failure',
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(
    action: 'user_created' | 'user_deleted' | 'role_assigned' | 'role_removed' | 'permission_granted' | 'permission_revoked' | 'settings_changed',
    options: {
      userId: string;
      resourceType?: string;
      resourceId?: string;
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    return this.logEvent({
      ...options,
      eventType: action,
      eventCategory: 'admin',
      eventSeverity: 'info',
      action,
      result: 'success',
    });
  }

  /**
   * Query audit logs
   */
  async queryLogs(options: AuditQueryOptions = {}) {
    const { limit = 100, offset = 0 } = options;

    const conditions = [];

    if (options.userId) {
      conditions.push(eq(auditLogs.userId, options.userId));
    }

    if (options.eventType) {
      conditions.push(eq(auditLogs.eventType, options.eventType));
    }

    if (options.eventCategory) {
      conditions.push(eq(auditLogs.eventCategory, options.eventCategory));
    }

    if (options.eventSeverity) {
      conditions.push(eq(auditLogs.eventSeverity, options.eventSeverity));
    }

    if (options.startDate) {
      conditions.push(gte(auditLogs.createdAt, options.startDate));
    }

    if (options.endDate) {
      conditions.push(lte(auditLogs.createdAt, options.endDate));
    }

    const query = db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }

    return query;
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(userId: string, limit: number = 100, offset: number = 0) {
    return this.queryLogs({ userId, limit, offset });
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditLogs(
    resourceType: string,
    resourceId: string,
    limit: number = 100,
    offset: number = 0
  ) {
    return db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, resourceType),
          eq(auditLogs.resourceId, resourceId)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get security events
   */
  async getSecurityEvents(
    severity?: 'warning' | 'error' | 'critical',
    limit: number = 100,
    offset: number = 0
  ) {
    return this.queryLogs({
      eventCategory: 'security',
      eventSeverity: severity,
      limit,
      offset,
    });
  }

  /**
   * Get failed login attempts for a user
   */
  async getFailedLoginAttempts(
    userId: string,
    since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
  ) {
    return db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, userId),
          eq(auditLogs.eventType, 'login_failed'),
          gte(auditLogs.createdAt, since)
        )
      )
      .orderBy(desc(auditLogs.createdAt));
  }

  /**
   * Get failed login attempts by IP address
   */
  async getFailedLoginAttemptsByIP(
    ipAddress: string,
    since: Date = new Date(Date.now() - 60 * 60 * 1000) // Last hour
  ) {
    return db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.ipAddress, ipAddress),
          eq(auditLogs.eventType, 'login_failed'),
          gte(auditLogs.createdAt, since)
        )
      )
      .orderBy(desc(auditLogs.createdAt));
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date) {
    const logs = await this.queryLogs({
      startDate,
      endDate,
      limit: 10000, // Adjust as needed
    });

    // Aggregate statistics
    const stats = {
      totalEvents: logs.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byResult: {} as Record<string, number>,
      securityIncidents: 0,
      failedLogins: 0,
      dataAccess: 0,
      adminActions: 0,
    };

    for (const log of logs) {
      // By category
      stats.byCategory[log.eventCategory] =
        (stats.byCategory[log.eventCategory] || 0) + 1;

      // By severity
      stats.bySeverity[log.eventSeverity] =
        (stats.bySeverity[log.eventSeverity] || 0) + 1;

      // By result
      stats.byResult[log.result] = (stats.byResult[log.result] || 0) + 1;

      // Specific counts
      if (log.eventCategory === 'security') stats.securityIncidents++;
      if (log.eventType === 'login_failed') stats.failedLogins++;
      if (log.eventCategory === 'data_access') stats.dataAccess++;
      if (log.eventCategory === 'admin') stats.adminActions++;
    }

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      stats,
      logs: logs.slice(0, 1000), // Include first 1000 logs in report
    };
  }

  /**
   * Log to console (for development)
   */
  private logToConsole(event: AuditEventOptions): void {
    const prefix = this.getSeverityPrefix(event.eventSeverity);
    const message = `${prefix} [${event.eventCategory}] ${event.eventType}: ${event.result}`;

    if (event.eventSeverity === 'error' || event.eventSeverity === 'critical') {
      console.error(message, {
        userId: event.userId,
        resourceType: event.resourceType,
        failureReason: event.failureReason,
      });
    } else if (event.eventSeverity === 'warning') {
      console.warn(message, {
        userId: event.userId,
        resourceType: event.resourceType,
      });
    } else {
      console.log(message);
    }
  }

  /**
   * Get severity prefix for console logging
   */
  private getSeverityPrefix(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  }

  /**
   * Clean up old audit logs (for maintenance)
   * This should be called periodically via a cron job
   */
  async cleanupOldLogs(olderThan: Date): Promise<number> {
    // Note: For compliance (e.g., GDPR, SOC 2), you typically need to keep
    // audit logs for a minimum period (often 2 years or more).
    // This function should only be used after that period.

    const deleted = await db
      .delete(auditLogs)
      .where(lte(auditLogs.createdAt, olderThan))
      .returning({ id: auditLogs.id });

    console.log(`Deleted ${deleted.length} audit logs older than ${olderThan}`);
    return deleted.length;
  }
}

export const auditService = new AuditService();

/**
 * Example usage:
 *
 * // Log successful login
 * await auditService.logAuthentication('login', {
 *   userId: user.id,
 *   sessionId: session.id,
 *   result: 'success',
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent'],
 *   metadata: { method: 'password' }
 * });
 *
 * // Log failed authorization
 * await auditService.logAuthorization('access_denied', {
 *   userId: user.id,
 *   resourceType: 'invoices',
 *   resourceId: invoiceId,
 *   action: 'delete',
 *   result: 'denied',
 *   failureReason: 'Missing permission: invoices.delete',
 *   ipAddress: req.ip
 * });
 *
 * // Log data modification
 * await auditService.logDataAccess('update', {
 *   userId: user.id,
 *   resourceType: 'invoices',
 *   resourceId: invoice.id,
 *   oldValues: { status: 'draft' },
 *   newValues: { status: 'approved' },
 *   ipAddress: req.ip
 * });
 *
 * // Log security incident
 * await auditService.logSecurityEvent('brute_force_attempt', {
 *   userId: user.id,
 *   severity: 'warning',
 *   ipAddress: req.ip,
 *   metadata: { attemptCount: 5 }
 * });
 */
