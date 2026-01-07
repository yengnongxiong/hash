-- Document Dates Table
-- Stores normalized dates extracted from documents for calendar view and filtering
-- Created: 2025-01-07

-- Create document_dates table
CREATE TABLE IF NOT EXISTS document_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  date_type TEXT NOT NULL CHECK (date_type IN ('due_date', 'invoice_date', 'expiration', 'effective', 'transaction', 'custom', 'other')),
  date_value DATE NOT NULL,
  label TEXT, -- User-friendly label (e.g., "Payment Due", "Contract Expires")
  description TEXT, -- Additional context about this date
  is_manual BOOLEAN DEFAULT false, -- Whether this was manually added by user
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX idx_document_dates_document_id ON document_dates(document_id);
CREATE INDEX idx_document_dates_date_value ON document_dates(date_value);
CREATE INDEX idx_document_dates_date_type ON document_dates(date_type);

-- Enable RLS
ALTER TABLE document_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see dates for documents in their organization
CREATE POLICY "Users can view dates for documents in their organization"
  ON document_dates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_dates.document_id
      AND d.organization_id = user_organization_id()
    )
  );

-- RLS Policy: Users can insert dates for documents in their organization
CREATE POLICY "Users can insert dates for documents in their organization"
  ON document_dates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_dates.document_id
      AND d.organization_id = user_organization_id()
    )
  );

-- RLS Policy: Users can update dates for documents in their organization
CREATE POLICY "Users can update dates for documents in their organization"
  ON document_dates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_dates.document_id
      AND d.organization_id = user_organization_id()
    )
  );

-- RLS Policy: Users can delete dates for documents in their organization
CREATE POLICY "Users can delete dates for documents in their organization"
  ON document_dates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_dates.document_id
      AND d.organization_id = user_organization_id()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_document_dates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_dates_updated_at
  BEFORE UPDATE ON document_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_document_dates_updated_at();

-- Optional: Migration to populate existing documents' dates
-- Run this after creating the table to backfill dates from extracted_data
-- DO $$
-- DECLARE
--   doc RECORD;
--   extracted JSONB;
-- BEGIN
--   FOR doc IN SELECT id, extracted_data FROM documents WHERE status = 'completed' LOOP
--     extracted := doc.extracted_data::JSONB;
--
--     -- Insert due date
--     IF extracted->>'dueDate' IS NOT NULL THEN
--       INSERT INTO document_dates (document_id, date_type, date_value, label)
--       VALUES (doc.id, 'due_date', (extracted->>'dueDate')::DATE, 'Due Date')
--       ON CONFLICT DO NOTHING;
--     END IF;
--
--     -- Insert invoice date
--     IF extracted->>'invoiceDate' IS NOT NULL THEN
--       INSERT INTO document_dates (document_id, date_type, date_value, label)
--       VALUES (doc.id, 'invoice_date', (extracted->>'invoiceDate')::DATE, 'Invoice Date')
--       ON CONFLICT DO NOTHING;
--     END IF;
--
--     -- Insert expiration date
--     IF extracted->>'expirationDate' IS NOT NULL THEN
--       INSERT INTO document_dates (document_id, date_type, date_value, label)
--       VALUES (doc.id, 'expiration', (extracted->>'expirationDate')::DATE, 'Expiration Date')
--       ON CONFLICT DO NOTHING;
--     END IF;
--
--     -- Insert effective date
--     IF extracted->>'effectiveDate' IS NOT NULL THEN
--       INSERT INTO document_dates (document_id, date_type, date_value, label)
--       VALUES (doc.id, 'effective', (extracted->>'effectiveDate')::DATE, 'Effective Date')
--       ON CONFLICT DO NOTHING;
--     END IF;
--
--     -- Insert transaction date
--     IF extracted->>'transactionDate' IS NOT NULL THEN
--       INSERT INTO document_dates (document_id, date_type, date_value, label)
--       VALUES (doc.id, 'transaction', (extracted->>'transactionDate')::DATE, 'Transaction Date')
--       ON CONFLICT DO NOTHING;
--     END IF;
--   END LOOP;
-- END $$;
