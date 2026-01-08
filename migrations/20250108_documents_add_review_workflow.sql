-- Migration: Add human-in-the-loop review workflow for documents
-- This adds a "pending_review" status and approval tracking columns

-- Step 1: Drop existing constraint if it exists
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;

-- Step 2: Add the new constraint with pending_review status
ALTER TABLE documents ADD CONSTRAINT documents_status_check
  CHECK (status IN ('pending', 'processing', 'pending_review', 'completed', 'failed'));

-- Step 3: Add approval tracking columns
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- Step 4: Create index for efficient Review Queue queries
CREATE INDEX IF NOT EXISTS idx_documents_status_pending_review
  ON documents(organization_id, status)
  WHERE status = 'pending_review';

-- Step 5: Add index on approved_by for looking up approver info
CREATE INDEX IF NOT EXISTS idx_documents_approved_by
  ON documents(approved_by)
  WHERE approved_by IS NOT NULL;
