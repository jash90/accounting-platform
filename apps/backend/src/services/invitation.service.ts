/**
 * Invitation Service
 *
 * Handles employee invitation tokens with 30-minute expiry.
 * Supports email-based invitations for company onboarding.
 */

import { db } from '../db';
import { eq, and, or } from 'drizzle-orm';
import {
  invitationTokens,
  users,
  companies,
  type InvitationToken,
  type NewInvitationToken,
} from '../db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { emailService } from './email.service';

const INVITATION_EXPIRY_MINUTES = 30;

export interface InvitationData {
  email: string;
  companyId: string;
  role?: 'owner' | 'employee';
  invitedBy: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface InvitationResult {
  success: boolean;
  token?: string;
  invitationUrl?: string;
  error?: string;
}

export class InvitationService {
  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a token for storage
   */
  private async hashToken(token: string): Promise<string> {
    return await bcrypt.hash(token, 10);
  }

  /**
   * Verify a token against its hash
   */
  private async verifyToken(token: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(token, hash);
  }

  /**
   * Create invitation token
   */
  async createInvitation(data: InvitationData): Promise<InvitationResult> {
    try {
      const { email, companyId, role = 'employee', invitedBy, ipAddress, userAgent } = data;

      // Check if user already exists and is a member of this company
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser) {
        // Check if already a member
        const companyService = await import('./company.service');
        const isMember = await companyService.companyService.isCompanyMember(companyId, existingUser.id);

        if (isMember) {
          return {
            success: false,
            error: 'User is already a member of this company',
          };
        }
      }

      // Check for existing pending invitation
      const now = new Date();
      const [existingInvitation] = await db
        .select()
        .from(invitationTokens)
        .where(
          and(
            eq(invitationTokens.email, email.toLowerCase()),
            eq(invitationTokens.companyId, companyId),
            eq(invitationTokens.isUsed, false),
            eq(invitationTokens.expiresAt, now)
          )
        )
        .limit(1);

      if (existingInvitation) {
        return {
          success: false,
          error: 'An active invitation already exists for this email',
        };
      }

      // Generate token
      const token = this.generateToken();
      const tokenHash = await this.hashToken(token);

      // Calculate expiry time (30 minutes from now)
      const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MINUTES * 60 * 1000);

      // Create invitation record
      const [invitation] = await db
        .insert(invitationTokens)
        .values({
          email: email.toLowerCase(),
          companyId,
          role,
          token,
          tokenHash,
          invitedBy,
          expiresAt,
          ipAddress,
          userAgent,
        })
        .returning();

      // Get company details for email
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company) {
        throw new Error('Company not found');
      }

      // Generate invitation URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      const invitationUrl = `${frontendUrl}/invitation/accept?token=${token}`;

      // Send invitation email
      try {
        await emailService.sendInvitationEmail(
          email,
          company.name,
          invitationUrl,
          INVITATION_EXPIRY_MINUTES
        );
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail the invitation creation if email sending fails
      }

      return {
        success: true,
        token,
        invitationUrl,
      };
    } catch (error) {
      console.error('Error creating invitation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invitation',
      };
    }
  }

  /**
   * Verify and retrieve invitation by token
   */
  async getInvitationByToken(token: string): Promise<{
    valid: boolean;
    invitation?: InvitationToken & { companyName: string };
    error?: string;
  }> {
    try {
      const now = new Date();

      // Find all non-used, non-expired invitations
      const invitations = await db
        .select({
          invitation: invitationTokens,
          companyName: companies.name,
        })
        .from(invitationTokens)
        .innerJoin(companies, eq(invitationTokens.companyId, companies.id))
        .where(
          and(
            eq(invitationTokens.isUsed, false),
            eq(invitationTokens.expiresAt, now)
          )
        );

      // Find matching token by comparing hashes
      for (const { invitation, companyName } of invitations) {
        const isValid = await this.verifyToken(token, invitation.tokenHash);
        if (isValid) {
          return {
            valid: true,
            invitation: { ...invitation, companyName },
          };
        }
      }

      return {
        valid: false,
        error: 'Invalid or expired invitation token',
      };
    } catch (error) {
      console.error('Error verifying invitation:', error);
      return {
        valid: false,
        error: 'Failed to verify invitation',
      };
    }
  }

  /**
   * Accept invitation (mark as used)
   */
  async acceptInvitation(token: string, userId: string): Promise<{
    success: boolean;
    companyId?: string;
    error?: string;
  }> {
    try {
      const { valid, invitation, error } = await this.getInvitationByToken(token);

      if (!valid || !invitation) {
        return {
          success: false,
          error: error || 'Invalid invitation',
        };
      }

      // Mark invitation as used
      await db
        .update(invitationTokens)
        .set({
          isUsed: true,
          usedAt: new Date(),
          usedBy: userId,
        })
        .where(eq(invitationTokens.id, invitation.id));

      // Add user to company
      const companyService = await import('./company.service');
      await companyService.companyService.addUserToCompany(
        invitation.companyId,
        userId,
        invitation.role as 'owner' | 'employee'
      );

      return {
        success: true,
        companyId: invitation.companyId,
      };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept invitation',
      };
    }
  }

  /**
   * Revoke invitation (mark as used to prevent acceptance)
   */
  async revokeInvitation(invitationId: string): Promise<boolean> {
    try {
      await db
        .update(invitationTokens)
        .set({
          isUsed: true,
          usedAt: new Date(),
        })
        .where(eq(invitationTokens.id, invitationId));

      return true;
    } catch (error) {
      console.error('Error revoking invitation:', error);
      return false;
    }
  }

  /**
   * Get pending invitations for a company
   */
  async getCompanyInvitations(companyId: string): Promise<InvitationToken[]> {
    const now = new Date();

    return await db
      .select()
      .from(invitationTokens)
      .where(
        and(
          eq(invitationTokens.companyId, companyId),
          eq(invitationTokens.isUsed, false),
          eq(invitationTokens.expiresAt, now)
        )
      );
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    const now = new Date();

    const result = await db
      .delete(invitationTokens)
      .where(
        and(
          eq(invitationTokens.isUsed, false),
          eq(invitationTokens.expiresAt, now)
        )
      );

    return result.rowCount || 0;
  }

  /**
   * Resend invitation email
   */
  async resendInvitation(invitationId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const [invitation] = await db
        .select({
          invitation: invitationTokens,
          companyName: companies.name,
        })
        .from(invitationTokens)
        .innerJoin(companies, eq(invitationTokens.companyId, companies.id))
        .where(eq(invitationTokens.id, invitationId))
        .limit(1);

      if (!invitation) {
        return {
          success: false,
          error: 'Invitation not found',
        };
      }

      if (invitation.invitation.isUsed) {
        return {
          success: false,
          error: 'Invitation already used',
        };
      }

      const now = new Date();
      if (invitation.invitation.expiresAt < now) {
        return {
          success: false,
          error: 'Invitation has expired',
        };
      }

      // Generate invitation URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      const invitationUrl = `${frontendUrl}/invitation/accept?token=${invitation.invitation.token}`;

      // Calculate remaining time
      const expiresIn = Math.ceil(
        (invitation.invitation.expiresAt.getTime() - now.getTime()) / (60 * 1000)
      );

      // Send invitation email
      await emailService.sendInvitationEmail(
        invitation.invitation.email,
        invitation.companyName,
        invitationUrl,
        expiresIn
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error resending invitation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend invitation',
      };
    }
  }
}

export const invitationService = new InvitationService();
