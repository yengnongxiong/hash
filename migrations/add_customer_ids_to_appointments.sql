-- Add customer_ids array column to appointments table
-- This allows multiple people to be associated with a single appointment

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS customer_ids uuid[] DEFAULT NULL;

-- Migrate existing single customer_id to customer_ids array
UPDATE appointments
SET customer_ids = ARRAY[customer_id]
WHERE customer_id IS NOT NULL AND customer_ids IS NULL;

-- Create index for better query performance on the array column
CREATE INDEX IF NOT EXISTS idx_appointments_customer_ids
ON appointments USING GIN (customer_ids);
