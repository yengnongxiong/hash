-- Migration: Update appointments table and add custom appointment types
-- Run this in Supabase SQL Editor

-- 1. Make end_time optional in appointments table
ALTER TABLE appointments ALTER COLUMN end_time DROP NOT NULL;

-- 2. Create appointment_types table for custom types per organization
CREATE TABLE IF NOT EXISTS appointment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(organization_id, name)
);

-- 3. Add type column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type_id UUID REFERENCES appointment_types(id) ON DELETE SET NULL;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_appointment_types_org ON appointment_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(appointment_type_id);

-- 5. Enable RLS on appointment_types
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for appointment_types
CREATE POLICY "Users can view appointment types in their organization"
  ON appointment_types FOR SELECT
  USING (organization_id = user_organization_id());

CREATE POLICY "Users can create appointment types in their organization"
  ON appointment_types FOR INSERT
  WITH CHECK (organization_id = user_organization_id());

CREATE POLICY "Users can update appointment types in their organization"
  ON appointment_types FOR UPDATE
  USING (organization_id = user_organization_id());

CREATE POLICY "Users can delete appointment types in their organization"
  ON appointment_types FOR DELETE
  USING (organization_id = user_organization_id());

-- 7. Trigger for updated_at
CREATE TRIGGER update_appointment_types_updated_at
  BEFORE UPDATE ON appointment_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Insert some default types for existing organizations
INSERT INTO appointment_types (organization_id, name, color)
SELECT id, 'Meeting', 'bg-blue-500' FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO appointment_types (organization_id, name, color)
SELECT id, 'Call', 'bg-green-500' FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO appointment_types (organization_id, name, color)
SELECT id, 'Follow-up', 'bg-purple-500' FROM organizations
ON CONFLICT DO NOTHING;
