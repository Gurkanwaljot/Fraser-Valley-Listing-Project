-- 1. Fix property_features UPDATE policy: restrict to users with an assigned role
DROP POLICY IF EXISTS "authenticated_update_features" ON public.property_features;
CREATE POLICY "authenticated_update_features" ON public.property_features
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid()))
  WITH CHECK (usage_count > 0);

-- 2. Drop the broad SELECT policy on brokerage-logos bucket
-- Public buckets serve files by direct URL; listing all objects is unnecessary
DROP POLICY IF EXISTS "Public can view brokerage logos" ON storage.objects;

-- 3. Revoke EXECUTE from anon and public on audit RPC functions
-- These functions already do internal admin-role checks but should not be callable by anon at all
REVOKE EXECUTE ON FUNCTION public.get_audit_actions() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_audit_logs(integer, integer, text, uuid, text, text, timestamptz, timestamptz) FROM anon, public;
