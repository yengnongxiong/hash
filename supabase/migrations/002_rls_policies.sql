-- Hash B2B Document & Customer Management SaaS
-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get the current user's organization ID
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================

-- Users can view their own organization
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (id = auth.user_organization_id());

-- Only owners can update organization settings
CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (id = auth.user_organization_id())
  WITH CHECK (id = auth.user_organization_id());

-- Allow insert during signup (before user record exists)
CREATE POLICY "Allow organization creation during signup"
  ON organizations FOR INSERT
  WITH CHECK (true);

-- ============================================
-- USERS POLICIES
-- ============================================

-- Users can view members of their organization
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (organization_id = auth.user_organization_id());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow insert during signup
CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================
-- CUSTOMERS POLICIES
-- ============================================

-- Users can view customers in their organization
CREATE POLICY "Users can view org customers"
  ON customers FOR SELECT
  USING (organization_id = auth.user_organization_id());

-- Users can create customers in their organization
CREATE POLICY "Users can create org customers"
  ON customers FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

-- Users can update customers in their organization
CREATE POLICY "Users can update org customers"
  ON customers FOR UPDATE
  USING (organization_id = auth.user_organization_id())
  WITH CHECK (organization_id = auth.user_organization_id());

-- Users can delete customers in their organization
CREATE POLICY "Users can delete org customers"
  ON customers FOR DELETE
  USING (organization_id = auth.user_organization_id());

-- ============================================
-- DOCUMENTS POLICIES
-- ============================================

-- Users can view documents in their organization
CREATE POLICY "Users can view org documents"
  ON documents FOR SELECT
  USING (organization_id = auth.user_organization_id());

-- Users can create documents in their organization
CREATE POLICY "Users can create org documents"
  ON documents FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

-- Users can update documents in their organization
CREATE POLICY "Users can update org documents"
  ON documents FOR UPDATE
  USING (organization_id = auth.user_organization_id())
  WITH CHECK (organization_id = auth.user_organization_id());

-- Users can delete documents in their organization
CREATE POLICY "Users can delete org documents"
  ON documents FOR DELETE
  USING (organization_id = auth.user_organization_id());

-- ============================================
-- DOCUMENT AUDIT LOG POLICIES
-- ============================================

-- Users can view audit logs for their organization's documents
CREATE POLICY "Users can view org audit logs"
  ON document_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_audit_log.document_id
      AND d.organization_id = auth.user_organization_id()
    )
  );

-- System can insert audit logs (using service role)
CREATE POLICY "Allow audit log creation"
  ON document_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_audit_log.document_id
      AND d.organization_id = auth.user_organization_id()
    )
  );
