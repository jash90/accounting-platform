/**
 * Enhanced Database Schema for Authentication & Identity Management (AIM) Module
 *
 * This schema implements a production-ready authentication system with:
 * - Multi-factor authentication (MFA)
 * - Role-based access control (RBAC)
 * - Session management
 * - Audit logging
 * - Device tracking
 * - Comprehensive security features
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  varchar,
  index,
  jsonb,
  inet,
  bigint,
  decimal,
  uniqueIndex,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// CORE USER MANAGEMENT
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailNormalized: varchar('email_normalized', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }), // Nullable for OAuth-only users
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  profilePicture: text('profile_picture'),

  // Authentication metadata
  authProvider: varchar('auth_provider', { length: 50 }).notNull().default('local'),
  providerId: varchar('provider_id', { length: 255 }),

  // Status flags
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isLocked: boolean('is_locked').notNull().default(false),
  lockedUntil: timestamp('locked_until'),

  // Security
  passwordChangedAt: timestamp('password_changed_at'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lastFailedLoginAt: timestamp('last_failed_login_at'),

  // MFA
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  mfaMethods: jsonb('mfa_methods').default([]),

  // Metadata
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  locale: varchar('locale', { length: 10 }).default('en-US'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  emailNormalizedIdx: index('idx_users_email_normalized').on(table.emailNormalized),
  providerIdx: index('idx_users_provider').on(table.authProvider, table.providerId),
  activeIdx: index('idx_users_active').on(table.isActive),
  lockedIdx: index('idx_users_locked').on(table.isLocked, table.lockedUntil),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Token information
  refreshToken: varchar('refresh_token', { length: 512 }).notNull().unique(),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
  accessTokenFamily: uuid('access_token_family').notNull(),

  // Session metadata
  deviceFingerprint: varchar('device_fingerprint', { length: 255 }),
  deviceName: varchar('device_name', { length: 255 }),
  deviceType: varchar('device_type', { length: 50 }), // mobile, desktop, tablet, api

  // Location
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  countryCode: varchar('country_code', { length: 2 }),
  city: varchar('city', { length: 100 }),

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  revocationReason: varchar('revocation_reason', { length: 255 }),
}, (table) => ({
  userIdIdx: index('idx_sessions_user_id').on(table.userId),
  refreshTokenHashIdx: index('idx_sessions_refresh_token_hash').on(table.refreshTokenHash),
  activeIdx: index('idx_sessions_active').on(table.userId, table.isActive),
  expiresAtIdx: index('idx_sessions_expires_at').on(table.expiresAt),
  deviceIdx: index('idx_sessions_device').on(table.deviceFingerprint),
}));

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// ============================================================================
// MULTI-FACTOR AUTHENTICATION (MFA)
// ============================================================================

export const mfaSettings = pgTable('mfa_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // MFA method
  method: varchar('method', { length: 50 }).notNull(), // totp, sms, email, backup_codes, webauthn

  // TOTP specific
  totpSecret: varchar('totp_secret', { length: 255 }), // Encrypted
  totpAlgorithm: varchar('totp_algorithm', { length: 10 }).default('SHA1'),
  totpDigits: integer('totp_digits').default(6),
  totpPeriod: integer('totp_period').default(30),

  // SMS/Email specific
  phoneNumber: varchar('phone_number', { length: 20 }), // Encrypted
  email: varchar('email', { length: 255 }), // Alternative email for MFA

  // Status
  isVerified: boolean('is_verified').notNull().default(false),
  isPrimary: boolean('is_primary').notNull().default(false),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  verifiedAt: timestamp('verified_at'),
  lastUsedAt: timestamp('last_used_at'),
}, (table) => ({
  userIdIdx: index('idx_mfa_settings_user_id').on(table.userId),
  methodIdx: index('idx_mfa_settings_method').on(table.userId, table.method),
  uniqueUserMethod: uniqueIndex('unique_user_method').on(table.userId, table.method),
}));

export type MfaSetting = typeof mfaSettings.$inferSelect;
export type NewMfaSetting = typeof mfaSettings.$inferInsert;

export const mfaBackupCodes = pgTable('mfa_backup_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: varchar('code_hash', { length: 255 }).notNull(),

  isUsed: boolean('is_used').notNull().default(false),
  usedAt: timestamp('used_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  userIdIdx: index('idx_mfa_backup_codes_user_id').on(table.userId, table.isUsed),
}));

export type MfaBackupCode = typeof mfaBackupCodes.$inferSelect;
export type NewMfaBackupCode = typeof mfaBackupCodes.$inferInsert;

export const mfaChallenges = pgTable('mfa_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  method: varchar('method', { length: 50 }).notNull(), // sms, email
  codeHash: varchar('code_hash', { length: 255 }).notNull(),

  attemptsRemaining: integer('attempts_remaining').default(3),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
}, (table) => ({
  userIdIdx: index('idx_mfa_challenges_user_id').on(table.userId),
  expiresAtIdx: index('idx_mfa_challenges_expires_at').on(table.expiresAt),
}));

export type MfaChallenge = typeof mfaChallenges.$inferSelect;
export type NewMfaChallenge = typeof mfaChallenges.$inferInsert;

// ============================================================================
// WEBAUTHN / FIDO2
// ============================================================================

export const webauthnCredentials = pgTable('webauthn_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // WebAuthn data
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: bigint('counter', { mode: 'number' }).notNull().default(0),

  // Device metadata
  deviceName: varchar('device_name', { length: 255 }),
  deviceType: varchar('device_type', { length: 50 }), // security_key, platform, hybrid
  aaguid: uuid('aaguid'),

  // Attestation
  attestationFormat: varchar('attestation_format', { length: 50 }),
  attestationObject: text('attestation_object'),

  // Flags
  isBackupEligible: boolean('is_backup_eligible').default(false),
  isBackupState: boolean('is_backup_state').default(false),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
}, (table) => ({
  userIdIdx: index('idx_webauthn_user_id').on(table.userId),
  credentialIdIdx: index('idx_webauthn_credential_id').on(table.credentialId),
}));

export type WebAuthnCredential = typeof webauthnCredentials.$inferSelect;
export type NewWebAuthnCredential = typeof webauthnCredentials.$inferInsert;

// ============================================================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),

  // Hierarchy
  parentRoleId: uuid('parent_role_id').references((): any => roles.id, { onDelete: 'set null' }),
  level: integer('level').notNull().default(0),

  // Flags
  isSystemRole: boolean('is_system_role').notNull().default(false),
  isAssignable: boolean('is_assignable').notNull().default(true),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  parentIdx: index('idx_roles_parent').on(table.parentRoleId),
  levelIdx: index('idx_roles_level').on(table.level),
}));

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  resource: varchar('resource', { length: 100 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  description: text('description'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  resourceIdx: index('idx_permissions_resource').on(table.resource),
  resourceActionIdx: index('idx_permissions_resource_action').on(table.resource, table.action),
}));

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  roleIdIdx: index('idx_role_permissions_role_id').on(table.roleId),
  permissionIdIdx: index('idx_role_permissions_permission_id').on(table.permissionId),
}));

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),

  // Scope (for multi-tenant scenarios)
  organizationId: uuid('organization_id'),

  // Time-based access
  validFrom: timestamp('valid_from').defaultNow(),
  validUntil: timestamp('valid_until'),

  assignedBy: uuid('assigned_by').references(() => users.id),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
  userIdIdx: index('idx_user_roles_user_id').on(table.userId),
  roleIdIdx: index('idx_user_roles_role_id').on(table.roleId),
  orgIdx: index('idx_user_roles_org').on(table.organizationId),
  validIdx: index('idx_user_roles_valid').on(table.validFrom, table.validUntil),
}));

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

export const userPermissions = pgTable('user_permissions', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),

  // Grant or deny
  isGranted: boolean('is_granted').notNull().default(true),

  // Scope
  organizationId: uuid('organization_id'),
  resourceId: uuid('resource_id'),

  grantedBy: uuid('granted_by').references(() => users.id),
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.permissionId] }),
  userIdIdx: index('idx_user_permissions_user_id').on(table.userId),
  expiresIdx: index('idx_user_permissions_expires').on(table.expiresAt),
}));

export type UserPermission = typeof userPermissions.$inferSelect;
export type NewUserPermission = typeof userPermissions.$inferInsert;

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Actor
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),

  // Event
  eventType: varchar('event_type', { length: 100 }).notNull(),
  eventCategory: varchar('event_category', { length: 50 }).notNull(),
  eventSeverity: varchar('event_severity', { length: 20 }).notNull(),

  // Details
  resourceType: varchar('resource_type', { length: 100 }),
  resourceId: uuid('resource_id'),
  action: varchar('action', { length: 50 }),

  // Result
  result: varchar('result', { length: 20 }).notNull(),
  failureReason: text('failure_reason'),

  // Context
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  requestId: uuid('request_id'),

  // Data changes
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),

  // Metadata
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_audit_logs_user_id').on(table.userId),
  eventTypeIdx: index('idx_audit_logs_event_type').on(table.eventType),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
  resourceIdx: index('idx_audit_logs_resource').on(table.resourceType, table.resourceId),
  severityIdx: index('idx_audit_logs_severity').on(table.eventSeverity),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// RATE LIMITING & SECURITY
// ============================================================================

export const loginAttempts = pgTable('login_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),

  email: varchar('email', { length: 255 }),
  ipAddress: inet('ip_address').notNull(),

  successful: boolean('successful').notNull().default(false),
  failureReason: varchar('failure_reason', { length: 100 }),

  userAgent: text('user_agent'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('idx_login_attempts_email').on(table.email, table.createdAt),
  ipIdx: index('idx_login_attempts_ip').on(table.ipAddress, table.createdAt),
  createdAtIdx: index('idx_login_attempts_created_at').on(table.createdAt),
}));

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type NewLoginAttempt = typeof loginAttempts.$inferInsert;

export const deviceTrusts = pgTable('device_trusts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  deviceFingerprint: varchar('device_fingerprint', { length: 255 }).notNull(),
  deviceName: varchar('device_name', { length: 255 }),
  deviceType: varchar('device_type', { length: 50 }),

  trustLevel: varchar('trust_level', { length: 20 }).notNull().default('none'),

  // Location
  lastIpAddress: inet('last_ip_address'),
  lastLocation: varchar('last_location', { length: 255 }),

  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  userIdIdx: index('idx_device_trusts_user_id').on(table.userId),
  fingerprintIdx: index('idx_device_trusts_fingerprint').on(table.deviceFingerprint),
  expiresAtIdx: index('idx_device_trusts_expires_at').on(table.expiresAt),
  uniqueUserDevice: uniqueIndex('unique_user_device').on(table.userId, table.deviceFingerprint),
}));

export type DeviceTrust = typeof deviceTrusts.$inferSelect;
export type NewDeviceTrust = typeof deviceTrusts.$inferInsert;

export const loginRiskAssessments = pgTable('login_risk_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

  riskScore: decimal('risk_score', { precision: 5, scale: 2 }).notNull(),
  riskLevel: varchar('risk_level', { length: 20 }).notNull(),

  // Risk factors
  riskFactors: jsonb('risk_factors').notNull(),

  // Action taken
  actionTaken: varchar('action_taken', { length: 50 }),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index('idx_login_risk_assessments_session_id').on(table.sessionId),
  userIdIdx: index('idx_login_risk_assessments_user_id').on(table.userId),
  riskLevelIdx: index('idx_login_risk_assessments_risk_level').on(table.riskLevel),
}));

export type LoginRiskAssessment = typeof loginRiskAssessments.$inferSelect;
export type NewLoginRiskAssessment = typeof loginRiskAssessments.$inferInsert;

// ============================================================================
// EXISTING TABLES (Enhanced)
// ============================================================================

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  token: varchar('token', { length: 512 }).notNull().unique(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),

  // Security
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),

  // Status
  isUsed: boolean('is_used').notNull().default(false),
  usedAt: timestamp('used_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => ({
  userIdIdx: index('idx_password_reset_tokens_user_id').on(table.userId),
  tokenHashIdx: index('idx_password_reset_tokens_token_hash').on(table.tokenHash),
  expiresAtIdx: index('idx_password_reset_tokens_expires_at').on(table.expiresAt),
}));

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  token: varchar('token', { length: 512 }).notNull().unique(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),

  email: varchar('email', { length: 255 }).notNull(),

  isUsed: boolean('is_used').notNull().default(false),
  usedAt: timestamp('used_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => ({
  userIdIdx: index('idx_email_verification_tokens_user_id').on(table.userId),
  tokenHashIdx: index('idx_email_verification_tokens_token_hash').on(table.tokenHash),
}));

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

export const oauthSessions = pgTable('oauth_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  provider: varchar('provider', { length: 50 }).notNull(),

  // Tokens (should be encrypted at rest)
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),

  // Token metadata
  tokenType: varchar('token_type', { length: 50 }).default('Bearer'),
  scope: text('scope'),
  expiresAt: timestamp('expires_at'),

  // Provider-specific data
  providerUserId: varchar('provider_user_id', { length: 255 }),
  providerProfile: jsonb('provider_profile'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_oauth_sessions_user_id').on(table.userId),
  providerIdx: index('idx_oauth_sessions_provider').on(table.provider, table.providerUserId),
  expiresAtIdx: index('idx_oauth_sessions_expires_at').on(table.expiresAt),
  uniqueUserProvider: uniqueIndex('unique_user_provider').on(table.userId, table.provider),
}));

export type OAuthSession = typeof oauthSessions.$inferSelect;
export type NewOAuthSession = typeof oauthSessions.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  mfaSettings: many(mfaSettings),
  roles: many(userRoles),
  permissions: many(userPermissions),
  auditLogs: many(auditLogs),
}));

export const rolesRelations = relations(roles, ({ many, one }) => ({
  permissions: many(rolePermissions),
  users: many(userRoles),
  parentRole: one(roles, {
    fields: [roles.parentRoleId],
    references: [roles.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
  users: many(userPermissions),
}));
