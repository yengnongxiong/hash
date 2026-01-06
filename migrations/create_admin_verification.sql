-- Admin Verification System
-- This migration creates tables for admin email 2FA verification

-- Table for storing verification codes
CREATE TABLE IF NOT EXISTS admin_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing admin sessions (verified sessions)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Only allow server-side access (no client policies)
-- These tables should only be accessed via server actions

-- Create indexes
CREATE INDEX idx_admin_verification_codes_email ON admin_verification_codes(email);
CREATE INDEX idx_admin_verification_codes_expires ON admin_verification_codes(expires_at);
CREATE INDEX idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Update system_alerts to support multi-org targeting
-- Add target_organization_ids array for targeting specific orgs
-- When NULL or empty AND organization_id is NULL, alert is global
ALTER TABLE system_alerts
ADD COLUMN IF NOT EXISTS target_organization_ids UUID[] DEFAULT '{}';

-- Function to clean up expired verification codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_admin_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_verification_codes
  WHERE expires_at < NOW() OR used = true;

  DELETE FROM admin_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
