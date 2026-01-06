-- Hash B2B Document & Customer Management SaaS
-- Storage Bucket Configuration

-- Create the documents storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB max file size
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
);

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Users can upload files to their organization's folder
-- File path format: {organization_id}/{filename}
CREATE POLICY "Users can upload to their org folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.user_organization_id()::text
  );

-- Users can view files in their organization's folder
CREATE POLICY "Users can view their org documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.user_organization_id()::text
  );

-- Users can update files in their organization's folder
CREATE POLICY "Users can update their org documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.user_organization_id()::text
  );

-- Users can delete files in their organization's folder
CREATE POLICY "Users can delete their org documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.user_organization_id()::text
  );
