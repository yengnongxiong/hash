-- Create system_alerts table for maintenance notifications
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'info' CHECK (alert_type IN ('info', 'warning', 'maintenance', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  dismissed_by UUID[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read active alerts from their organization (or global alerts)
CREATE POLICY "Users can read organization alerts"
  ON system_alerts FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id = user_organization_id()
  );

-- Policy: Only admins/owners can create alerts
CREATE POLICY "Admins can create alerts"
  ON system_alerts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Policy: Only admins/owners can update alerts
CREATE POLICY "Admins can update alerts"
  ON system_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Policy: Only admins/owners can delete alerts
CREATE POLICY "Admins can delete alerts"
  ON system_alerts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Create indexes for faster queries
CREATE INDEX idx_system_alerts_org_active ON system_alerts(organization_id, active);
CREATE INDEX idx_system_alerts_dates ON system_alerts(starts_at, ends_at);
CREATE INDEX idx_system_alerts_type ON system_alerts(alert_type);

-- Update function for updated_at
CREATE OR REPLACE FUNCTION update_system_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_alerts_updated_at
  BEFORE UPDATE ON system_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_system_alerts_updated_at();
