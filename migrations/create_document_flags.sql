-- Migration: Create document_flags table for LLM-detected anomalies
-- Run this in the Supabase SQL Editor

-- Create document_flags table
CREATE TABLE IF NOT EXISTS document_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('past_due', 'duplicate_invoice', 'suspicious_amount', 'missing_data', 'other')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE document_flags ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view flags for documents in their organization
CREATE POLICY "Users can view document flags in their organization"
  ON document_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_flags.document_id
      AND d.organization_id = user_organization_id()
    )
  );

-- RLS policy: Users can insert flags for documents in their organization
CREATE POLICY "Users can insert document flags in their organization"
  ON document_flags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_flags.document_id
      AND d.organization_id = user_organization_id()
    )
  );

-- RLS policy: Users can update flags for documents in their organization
CREATE POLICY "Users can update document flags in their organization"
  ON document_flags
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_flags.document_id
      AND d.organization_id = user_organization_id()
    )
  );

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_flags_document_id ON document_flags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_flags_resolved ON document_flags(resolved) WHERE resolved = false;
