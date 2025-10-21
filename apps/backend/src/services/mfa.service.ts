/**
 * Multi-Factor Authentication (MFA) Service
 *
 * Supports:
 * - TOTP (Time-based One-Time Password) - Google Authenticator, Authy
 * - SMS codes
 * - Email codes
 * - Backup codes
 * - WebAuthn (future)
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import {
  mfaSettings,
  mfaBackupCodes,
  mfaChallenges,
  users,
  type MfaSetting,
  type MfaBackupCode,
  type MfaChallenge
} from '../db/schema-enhanced';

export interface TOTPSetupResult {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface MFAVerificationResult {
  verified: boolean;
  method?: string;
  requiresSetup?: boolean;
}

export class MFAService {
  private readonly APP_NAME = 'Accounting Platform';
  private readonly BACKUP_CODE_LENGTH = 8;
  private readonly BACKUP_CODE_COUNT = 10;
  private readonly SMS_CODE_LENGTH = 6;
  private readonly SMS_CODE_EXPIRY_MINUTES = 5;

  /**
   * Enroll user in TOTP-based MFA
   */
  async enrollTOTP(userId: string, userEmail: string): Promise<TOTPSetupResult> {
    // Generate a secret
    const secret = authenticator.generateSecret();

    // Create OTP auth URL for QR code
    const otpauth = authenticator.keyuri(userEmail, this.APP_NAME, secret);

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store TOTP settings (not verified yet)
    await db.insert(mfaSettings).values({
      userId,
      method: 'totp',
      totpSecret: secret, // TODO: Encrypt this in production
      totpAlgorithm: 'SHA1',
      totpDigits: 6,
      totpPeriod: 30,
      isVerified: false,
      isPrimary: false,
    }).onConflictDoUpdate({
      target: [mfaSettings.userId, mfaSettings.method],
      set: {
        totpSecret: secret,
        isVerified: false,
      }
    });

    // Store backup codes
    await this.storeBackupCodes(userId, backupCodes);

    return {
      secret,
      qrCodeDataUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code and activate MFA
   */
  async verifyTOTP(userId: string, code: string): Promise<MFAVerificationResult> {
    // Get user's TOTP settings
    const [settings] = await db
      .select()
      .from(mfaSettings)
      .where(
        and(
          eq(mfaSettings.userId, userId),
          eq(mfaSettings.method, 'totp')
        )
      )
      .limit(1);

    if (!settings || !settings.totpSecret) {
      return { verified: false, requiresSetup: true };
    }

    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: settings.totpSecret,
    });

    if (isValid) {
      // Mark as verified and primary if it's the first MFA method
      const otherMethods = await db
        .select()
        .from(mfaSettings)
        .where(
          and(
            eq(mfaSettings.userId, userId),
            eq(mfaSettings.isVerified, true)
          )
        );

      await db
        .update(mfaSettings)
        .set({
          isVerified: true,
          isPrimary: otherMethods.length === 0,
          verifiedAt: new Date(),
          lastUsedAt: new Date(),
        })
        .where(eq(mfaSettings.id, settings.id));

      // Enable MFA on user account
      await db
        .update(users)
        .set({
          mfaEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    return { verified: isValid, method: 'totp' };
  }

  /**
   * Enroll user in SMS-based MFA
   */
  async enrollSMS(userId: string, phoneNumber: string): Promise<void> {
    // Store phone number (encrypted in production)
    await db.insert(mfaSettings).values({
      userId,
      method: 'sms',
      phoneNumber, // TODO: Encrypt this
      isVerified: false,
      isPrimary: false,
    }).onConflictDoUpdate({
      target: [mfaSettings.userId, mfaSettings.method],
      set: {
        phoneNumber,
        isVerified: false,
      }
    });

    // Send verification code
    await this.sendSMSCode(userId, phoneNumber);
  }

  /**
   * Send SMS verification code
   */
  async sendSMSCode(userId: string, phoneNumber: string): Promise<void> {
    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const codeHash = await bcrypt.hash(code, 10);

    // Store challenge
    await db.insert(mfaChallenges).values({
      userId,
      method: 'sms',
      codeHash,
      attemptsRemaining: 3,
      expiresAt: new Date(Date.now() + this.SMS_CODE_EXPIRY_MINUTES * 60 * 1000),
    });

    // TODO: Send SMS via Twilio or AWS SNS
    console.log(`SMS code for ${phoneNumber}: ${code}`);
    // In production:
    // await this.smsProvider.send(phoneNumber, `Your verification code is: ${code}`);
  }

  /**
   * Send email verification code
   */
  async sendEmailCode(userId: string, email: string): Promise<void> {
    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const codeHash = await bcrypt.hash(code, 10);

    // Store challenge
    await db.insert(mfaChallenges).values({
      userId,
      method: 'email',
      codeHash,
      attemptsRemaining: 3,
      expiresAt: new Date(Date.now() + this.SMS_CODE_EXPIRY_MINUTES * 60 * 1000),
    });

    // TODO: Send email
    console.log(`Email code for ${email}: ${code}`);
    // In production:
    // await emailService.sendMFACode(email, code);
  }

  /**
   * Verify SMS or Email code
   */
  async verifyCode(userId: string, method: 'sms' | 'email', code: string): Promise<MFAVerificationResult> {
    // Get most recent challenge
    const [challenge] = await db
      .select()
      .from(mfaChallenges)
      .where(
        and(
          eq(mfaChallenges.userId, userId),
          eq(mfaChallenges.method, method)
        )
      )
      .orderBy(mfaChallenges.createdAt)
      .limit(1);

    if (!challenge) {
      return { verified: false };
    }

    // Check expiration
    if (challenge.expiresAt < new Date()) {
      return { verified: false };
    }

    // Check attempts remaining
    if (challenge.attemptsRemaining <= 0) {
      return { verified: false };
    }

    // Verify code
    const isValid = await bcrypt.compare(code, challenge.codeHash);

    if (isValid) {
      // Mark challenge as verified
      await db
        .update(mfaChallenges)
        .set({ verifiedAt: new Date() })
        .where(eq(mfaChallenges.id, challenge.id));

      // Mark MFA method as verified
      const [settings] = await db
        .select()
        .from(mfaSettings)
        .where(
          and(
            eq(mfaSettings.userId, userId),
            eq(mfaSettings.method, method)
          )
        )
        .limit(1);

      if (settings) {
        // Check if this is the first verified MFA method
        const otherMethods = await db
          .select()
          .from(mfaSettings)
          .where(
            and(
              eq(mfaSettings.userId, userId),
              eq(mfaSettings.isVerified, true)
            )
          );

        await db
          .update(mfaSettings)
          .set({
            isVerified: true,
            isPrimary: otherMethods.length === 0,
            verifiedAt: new Date(),
            lastUsedAt: new Date(),
          })
          .where(eq(mfaSettings.id, settings.id));

        // Enable MFA on user account
        await db
          .update(users)
          .set({
            mfaEnabled: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }

      return { verified: true, method };
    } else {
      // Decrement attempts
      await db
        .update(mfaChallenges)
        .set({ attemptsRemaining: challenge.attemptsRemaining - 1 })
        .where(eq(mfaChallenges.id, challenge.id));

      return { verified: false };
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<MFAVerificationResult> {
    // Get all unused backup codes for user
    const codes = await db
      .select()
      .from(mfaBackupCodes)
      .where(
        and(
          eq(mfaBackupCodes.userId, userId),
          eq(mfaBackupCodes.isUsed, false)
        )
      );

    // Try to match the code
    for (const backupCode of codes) {
      const isValid = await bcrypt.compare(code, backupCode.codeHash);

      if (isValid) {
        // Mark as used
        await db
          .update(mfaBackupCodes)
          .set({
            isUsed: true,
            usedAt: new Date(),
          })
          .where(eq(mfaBackupCodes.id, backupCode.id));

        return { verified: true, method: 'backup_code' };
      }
    }

    return { verified: false };
  }

  /**
   * Get user's MFA settings
   */
  async getUserMFASettings(userId: string): Promise<MfaSetting[]> {
    return await db
      .select()
      .from(mfaSettings)
      .where(eq(mfaSettings.userId, userId));
  }

  /**
   * Check if user has MFA enabled and verified
   */
  async isUserMFAEnabled(userId: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user?.mfaEnabled || false;
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string): Promise<void> {
    // Delete all MFA settings
    await db
      .delete(mfaSettings)
      .where(eq(mfaSettings.userId, userId));

    // Delete backup codes
    await db
      .delete(mfaBackupCodes)
      .where(eq(mfaBackupCodes.userId, userId));

    // Update user
    await db
      .update(users)
      .set({
        mfaEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      // Generate random alphanumeric code
      const code = crypto
        .randomBytes(this.BACKUP_CODE_LENGTH)
        .toString('hex')
        .substring(0, this.BACKUP_CODE_LENGTH)
        .toUpperCase();

      codes.push(code);
    }

    return codes;
  }

  /**
   * Store backup codes in database
   */
  private async storeBackupCodes(userId: string, codes: string[]): Promise<void> {
    // Delete existing backup codes
    await db
      .delete(mfaBackupCodes)
      .where(eq(mfaBackupCodes.userId, userId));

    // Hash and store new codes
    const hashedCodes = await Promise.all(
      codes.map(async (code) => ({
        userId,
        codeHash: await bcrypt.hash(code, 10),
      }))
    );

    await db.insert(mfaBackupCodes).values(hashedCodes);
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const codes = this.generateBackupCodes();
    await this.storeBackupCodes(userId, codes);
    return codes;
  }

  /**
   * Get remaining backup codes count
   */
  async getRemainingBackupCodesCount(userId: string): Promise<number> {
    const codes = await db
      .select()
      .from(mfaBackupCodes)
      .where(
        and(
          eq(mfaBackupCodes.userId, userId),
          eq(mfaBackupCodes.isUsed, false)
        )
      );

    return codes.length;
  }
}

export const mfaService = new MFAService();
