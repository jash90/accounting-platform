-- ============================================================================
-- Authentication & Identity Management (AIM) Module - Enhanced Database Schema
-- ============================================================================
-- Version: 1.0
-- Database: PostgreSQL 13+
-- Purpose: Production-ready authentication and authorization system
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE USER MANAGEMENT
-- ============================================================================

-- Enhanced users table (extends existing schema)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    email_normalized VARCHAR(255) NOT NULL UNIQUE, -- lowercase for case-insensitive lookups
    password VARCHAR(255), -- Nullable for OAuth-only users
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    profile_picture TEXT,

    -- Authentication metadata
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'local', -- local, google, github, microsoft, saml
    provider_id VARCHAR(255), -- OAuth provider's user ID

    -- Status flags
    is_email_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_until TIMESTAMP,

    -- Security
    password_changed_at TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login_at TIMESTAMP,

    -- MFA
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_methods JSONB DEFAULT '[]'::jsonb, -- Array of enabled methods

    -- Metadata
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en-US',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP, -- Soft delete for GDPR compliance

    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email_normalized ON users(email_normalized);
CREATE INDEX idx_users_provider ON users(auth_provider, provider_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_locked ON users(is_locked, locked_until);

-- Function to update email_normalized
CREATE OR REPLACE FUNCTION update_email_normalized()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_normalized = LOWER(NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_normalized
BEFORE INSERT OR UPDATE OF email ON users
FOR EACH ROW
EXECUTE FUNCTION update_email_normalized();

-- ============================================================================
-- SESSION MANAGEMENT
-- ============================================================================

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Token information
    refresh_token VARCHAR(512) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255) NOT NULL, -- Hashed version for lookup
    access_token_family UUID NOT NULL, -- For token rotation tracking

    -- Session metadata
    device_fingerprint VARCHAR(255),
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- mobile, desktop, tablet, api

    -- Location
    ip_address INET,
    user_agent TEXT,
    country_code VARCHAR(2),
    city VARCHAR(100),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    revocation_reason VARCHAR(255)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_active ON sessions(user_id, is_active) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_device ON sessions(device_fingerprint);

-- ============================================================================
-- MULTI-FACTOR AUTHENTICATION (MFA)
-- ============================================================================

-- MFA Settings (TOTP, SMS, Email)
CREATE TABLE mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- MFA method
    method VARCHAR(50) NOT NULL, -- totp, sms, email, backup_codes, webauthn

    -- TOTP specific
    totp_secret VARCHAR(255), -- Encrypted
    totp_algorithm VARCHAR(10) DEFAULT 'SHA1',
    totp_digits INTEGER DEFAULT 6,
    totp_period INTEGER DEFAULT 30,

    -- SMS/Email specific
    phone_number VARCHAR(20), -- Encrypted
    email VARCHAR(255), -- Alternative email for MFA

    -- Status
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_primary BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMP,
    last_used_at TIMESTAMP,

    UNIQUE(user_id, method)
);

CREATE INDEX idx_mfa_settings_user_id ON mfa_settings(user_id);
CREATE INDEX idx_mfa_settings_method ON mfa_settings(user_id, method);

-- MFA Backup Codes
CREATE TABLE mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL, -- bcrypt hash of the code

    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id, is_used);

-- MFA Challenges (temporary codes for SMS/Email)
CREATE TABLE mfa_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    method VARCHAR(50) NOT NULL, -- sms, email
    code_hash VARCHAR(255) NOT NULL,

    attempts_remaining INTEGER DEFAULT 3,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP
);

CREATE INDEX idx_mfa_challenges_user_id ON mfa_challenges(user_id);
CREATE INDEX idx_mfa_challenges_expires_at ON mfa_challenges(expires_at);

-- ============================================================================
-- WEBAUTHN / FIDO2 (Passwordless)
-- ============================================================================

CREATE TABLE webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- WebAuthn data
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,

    -- Device metadata
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- security_key, platform (biometric), hybrid
    aaguid UUID,

    -- Attestation
    attestation_format VARCHAR(50),
    attestation_object TEXT,

    -- Flags
    is_backup_eligible BOOLEAN DEFAULT false,
    is_backup_state BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_webauthn_user_id ON webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credential_id ON webauthn_credentials(credential_id);

-- ============================================================================
-- ROLE-BASED ACCESS CONTROL (RBAC)
-- ============================================================================

-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    -- Hierarchy
    parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 0, -- 0 = highest privilege

    -- Flags
    is_system_role BOOLEAN NOT NULL DEFAULT false, -- Cannot be deleted
    is_assignable BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roles_parent ON roles(parent_role_id);
CREATE INDEX idx_roles_level ON roles(level);

-- Insert default system roles
INSERT INTO roles (name, description, level, is_system_role) VALUES
    ('super_admin', 'Super Administrator - Full system access', 0, true),
    ('admin', 'Administrator - Organization-wide access', 1, true),
    ('manager', 'Manager - Department-level access', 2, true),
    ('accountant', 'Accountant - Financial data access', 3, true),
    ('staff', 'Staff - Limited access', 4, true),
    ('client', 'Client - Read-only portal access', 5, true),
    ('api_user', 'API User - Programmatic access', 6, true)
ON CONFLICT (name) DO NOTHING;

-- Permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g., "invoices.create", "reports.read"
    resource VARCHAR(100) NOT NULL, -- e.g., "invoices", "reports"
    action VARCHAR(50) NOT NULL, -- e.g., "create", "read", "update", "delete"
    description TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- Role-Permission mapping
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- User-Role mapping (many-to-many)
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    -- Scope (for multi-tenant scenarios)
    organization_id UUID, -- Can be NULL for global roles

    -- Time-based access
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP, -- NULL = permanent

    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, role_id, organization_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX idx_user_roles_valid ON user_roles(valid_from, valid_until);

-- Direct user permissions (for exceptional cases)
CREATE TABLE user_permissions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

    -- Grant or deny
    is_granted BOOLEAN NOT NULL DEFAULT true,

    -- Scope
    organization_id UUID,
    resource_id UUID, -- Specific resource instance

    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,

    PRIMARY KEY (user_id, permission_id, organization_id)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_expires ON user_permissions(expires_at);

-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Actor
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

    -- Event
    event_type VARCHAR(100) NOT NULL, -- login, logout, password_change, permission_change, etc.
    event_category VARCHAR(50) NOT NULL, -- authentication, authorization, data_access, admin
    event_severity VARCHAR(20) NOT NULL, -- info, warning, error, critical

    -- Details
    resource_type VARCHAR(100), -- users, invoices, reports
    resource_id UUID,
    action VARCHAR(50), -- create, read, update, delete, login, logout

    -- Result
    result VARCHAR(20) NOT NULL, -- success, failure, denied
    failure_reason TEXT,

    -- Context
    ip_address INET,
    user_agent TEXT,
    request_id UUID,

    -- Data changes (for data access auditing)
    old_values JSONB,
    new_values JSONB,

    -- Metadata
    metadata JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Partition by month for better performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_severity ON audit_logs(event_severity);

-- ============================================================================
-- RATE LIMITING & SECURITY
-- ============================================================================

-- Login attempts tracking
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifier (either user or IP)
    email VARCHAR(255),
    ip_address INET NOT NULL,

    -- Result
    successful BOOLEAN NOT NULL DEFAULT false,
    failure_reason VARCHAR(100),

    -- Context
    user_agent TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email, created_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, created_at);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);

-- Device trusts
CREATE TABLE device_trusts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50),

    trust_level VARCHAR(20) NOT NULL DEFAULT 'none', -- none, partial, full

    -- Location
    last_ip_address INET,
    last_location VARCHAR(255),

    last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,

    UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX idx_device_trusts_user_id ON device_trusts(user_id);
CREATE INDEX idx_device_trusts_fingerprint ON device_trusts(device_fingerprint);
CREATE INDEX idx_device_trusts_expires_at ON device_trusts(expires_at);

-- Risk assessments
CREATE TABLE login_risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    risk_score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
    risk_level VARCHAR(20) NOT NULL, -- low, medium, high, critical

    -- Risk factors
    risk_factors JSONB NOT NULL, -- { "unusual_location": 0.3, "new_device": 0.2, ... }

    -- Action taken
    action_taken VARCHAR(50), -- allow, mfa_required, deny, manual_review

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_risk_assessments_session_id ON login_risk_assessments(session_id);
CREATE INDEX idx_login_risk_assessments_user_id ON login_risk_assessments(user_id);
CREATE INDEX idx_login_risk_assessments_risk_level ON login_risk_assessments(risk_level);

-- ============================================================================
-- OAUTH / SSO
-- ============================================================================

-- Enhanced OAuth sessions
CREATE TABLE oauth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    provider VARCHAR(50) NOT NULL, -- google, github, microsoft, saml

    -- Tokens (encrypted at rest)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    id_token TEXT,

    -- Token metadata
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scope TEXT,
    expires_at TIMESTAMP,

    -- Provider-specific data
    provider_user_id VARCHAR(255),
    provider_profile JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, provider)
);

CREATE INDEX idx_oauth_sessions_user_id ON oauth_sessions(user_id);
CREATE INDEX idx_oauth_sessions_provider ON oauth_sessions(provider, provider_user_id);
CREATE INDEX idx_oauth_sessions_expires_at ON oauth_sessions(expires_at);

-- SAML configurations (for enterprise SSO)
CREATE TABLE saml_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID, -- Link to organization/tenant

    -- Identity Provider
    idp_entity_id VARCHAR(255) NOT NULL,
    idp_sso_url TEXT NOT NULL,
    idp_certificate TEXT NOT NULL,

    -- Service Provider (us)
    sp_entity_id VARCHAR(255) NOT NULL,
    sp_acs_url TEXT NOT NULL,

    -- Metadata
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saml_configurations_org_id ON saml_configurations(organization_id);

-- ============================================================================
-- PASSWORD & TOKEN MANAGEMENT
-- ============================================================================

-- Password reset tokens (existing, enhanced)
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    token VARCHAR(512) NOT NULL UNIQUE,
    token_hash VARCHAR(255) NOT NULL,

    -- Security
    ip_address INET,
    user_agent TEXT,

    -- Status
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Email verification tokens (existing, enhanced)
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    token VARCHAR(512) NOT NULL UNIQUE,
    token_hash VARCHAR(255) NOT NULL,

    email VARCHAR(255) NOT NULL, -- Email being verified (can be different from user.email)

    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token_hash ON email_verification_tokens(token_hash);

-- Magic link tokens (passwordless authentication)
CREATE TABLE magic_link_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,

    token VARCHAR(512) NOT NULL UNIQUE,
    token_hash VARCHAR(255) NOT NULL,

    -- Security
    ip_address INET,
    user_agent TEXT,

    -- Status
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_magic_link_tokens_email ON magic_link_tokens(email);
CREATE INDEX idx_magic_link_tokens_token_hash ON magic_link_tokens(token_hash);
CREATE INDEX idx_magic_link_tokens_expires_at ON magic_link_tokens(expires_at);

-- API Keys (for programmatic access)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Key info
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- e.g., "sk_live_" (visible to user)
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- Full key hash

    -- Permissions
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Rate limiting
    rate_limit_per_hour INTEGER DEFAULT 1000,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active, expires_at);

-- ============================================================================
-- GDPR COMPLIANCE
-- ============================================================================

-- Consent records
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    consent_type VARCHAR(100) NOT NULL, -- terms_of_service, privacy_policy, marketing, etc.
    version VARCHAR(20) NOT NULL, -- Version of the consent document

    -- Consent decision
    granted BOOLEAN NOT NULL,

    -- Context
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type, granted);

-- Data export requests
CREATE TABLE data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Request details
    format VARCHAR(20) DEFAULT 'json', -- json, csv, pdf
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed

    -- File info
    file_path TEXT,
    file_size_bytes BIGINT,
    expires_at TIMESTAMP,

    -- Processing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX idx_data_export_requests_status ON data_export_requests(status);

-- Data deletion requests
CREATE TABLE data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Request details
    reason VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, processing, completed, rejected

    -- Approval workflow
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,

    -- Processing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX idx_data_deletion_requests_status ON data_deletion_requests(status);

-- ============================================================================
-- PASSWORD HISTORY (Prevent reuse)
-- ============================================================================

CREATE TABLE password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    password_hash VARCHAR(255) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_created_at ON password_history(created_at);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_tokens WHERE expires_at < NOW();
    DELETE FROM email_verification_tokens WHERE expires_at < NOW();
    DELETE FROM magic_link_tokens WHERE expires_at < NOW();
    DELETE FROM mfa_challenges WHERE expires_at < NOW();
    DELETE FROM sessions WHERE expires_at < NOW() AND revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
    permission_name VARCHAR(100),
    resource VARCHAR(100),
    action VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.name, p.resource, p.action
    FROM permissions p
    WHERE p.id IN (
        -- From roles
        SELECT rp.permission_id
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        WHERE ur.user_id = p_user_id
          AND (ur.valid_until IS NULL OR ur.valid_until > NOW())

        UNION

        -- Direct permissions
        SELECT up.permission_id
        FROM user_permissions up
        WHERE up.user_id = p_user_id
          AND up.is_granted = true
          AND (up.expires_at IS NULL OR up.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_session_id UUID,
    p_event_type VARCHAR,
    p_event_category VARCHAR,
    p_event_severity VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id UUID,
    p_action VARCHAR,
    p_result VARCHAR,
    p_ip_address INET,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, session_id, event_type, event_category, event_severity,
        resource_type, resource_id, action, result, ip_address, metadata
    )
    VALUES (
        p_user_id, p_session_id, p_event_type, p_event_category, p_event_severity,
        p_resource_type, p_resource_id, p_action, p_result, p_ip_address, p_metadata
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_sessions_updated_at
BEFORE UPDATE ON oauth_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to track password changes
CREATE OR REPLACE FUNCTION track_password_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password IS DISTINCT FROM OLD.password AND NEW.password IS NOT NULL THEN
        -- Update password_changed_at
        NEW.password_changed_at = NOW();

        -- Save to password history
        INSERT INTO password_history (user_id, password_hash)
        VALUES (NEW.id, NEW.password);

        -- Clean up old history (keep last 5 passwords)
        DELETE FROM password_history
        WHERE user_id = NEW.id
          AND id NOT IN (
              SELECT id
              FROM password_history
              WHERE user_id = NEW.id
              ORDER BY created_at DESC
              LIMIT 5
          );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_user_password_change
BEFORE UPDATE ON users
FOR EACH ROW
WHEN (NEW.password IS DISTINCT FROM OLD.password)
EXECUTE FUNCTION track_password_change();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active sessions view
CREATE OR REPLACE VIEW active_sessions AS
SELECT
    s.id,
    s.user_id,
    u.email,
    u.first_name,
    u.last_name,
    s.device_name,
    s.device_type,
    s.ip_address,
    s.country_code,
    s.city,
    s.created_at,
    s.last_activity_at,
    s.expires_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = true
  AND s.revoked_at IS NULL
  AND s.expires_at > NOW();

-- User permissions materialized view (refresh periodically for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_permission_cache AS
SELECT
    ur.user_id,
    p.id AS permission_id,
    p.name AS permission_name,
    p.resource,
    p.action
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.valid_until IS NULL OR ur.valid_until > NOW();

CREATE INDEX idx_user_permission_cache_user_id ON user_permission_cache(user_id);
CREATE INDEX idx_user_permission_cache_resource ON user_permission_cache(resource, action);

-- ============================================================================
-- CLEANUP JOBS (Run via cron or scheduled job)
-- ============================================================================

-- Schedule: Run daily
COMMENT ON FUNCTION cleanup_expired_tokens() IS
'Cleanup expired tokens. Should be run daily via pg_cron or external scheduler.';

-- Refresh permissions cache
-- Schedule: Run every hour
-- REFRESH MATERIALIZED VIEW CONCURRENTLY user_permission_cache;

-- ============================================================================
-- INITIAL DATA & PERMISSIONS SETUP
-- ============================================================================

-- Common permissions
INSERT INTO permissions (name, resource, action, description) VALUES
    -- User management
    ('users.create', 'users', 'create', 'Create new users'),
    ('users.read', 'users', 'read', 'View user information'),
    ('users.update', 'users', 'update', 'Update user information'),
    ('users.delete', 'users', 'delete', 'Delete users'),

    -- Role management
    ('roles.create', 'roles', 'create', 'Create new roles'),
    ('roles.read', 'roles', 'read', 'View roles'),
    ('roles.update', 'roles', 'update', 'Update roles'),
    ('roles.delete', 'roles', 'delete', 'Delete roles'),
    ('roles.assign', 'roles', 'assign', 'Assign roles to users'),

    -- Invoice management (example for accounting platform)
    ('invoices.create', 'invoices', 'create', 'Create invoices'),
    ('invoices.read', 'invoices', 'read', 'View invoices'),
    ('invoices.update', 'invoices', 'update', 'Update invoices'),
    ('invoices.delete', 'invoices', 'delete', 'Delete invoices'),
    ('invoices.approve', 'invoices', 'approve', 'Approve invoices'),

    -- Report management
    ('reports.create', 'reports', 'create', 'Create reports'),
    ('reports.read', 'reports', 'read', 'View reports'),
    ('reports.export', 'reports', 'export', 'Export reports'),

    -- Audit logs
    ('audit_logs.read', 'audit_logs', 'read', 'View audit logs'),

    -- Settings
    ('settings.read', 'settings', 'read', 'View settings'),
    ('settings.update', 'settings', 'update', 'Update settings')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Super Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- Admin gets most permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.name NOT IN ('roles.delete', 'settings.update')
ON CONFLICT DO NOTHING;

-- Accountant gets invoice and report permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'accountant'
  AND (p.resource IN ('invoices', 'reports') OR p.name = 'users.read')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Grant appropriate permissions to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;
