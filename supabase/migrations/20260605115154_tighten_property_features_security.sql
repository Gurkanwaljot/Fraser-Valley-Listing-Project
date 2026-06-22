/*
# Tighten property_features security

Fixes four security issues:

1. Remove always-true INSERT policy - direct inserts not needed since all writes go
   through the RPC function (which bypasses RLS as SECURITY DEFINER).
2. Remove always-true UPDATE policy - same reason as above.
3. Revoke EXECUTE on upsert_property_feature from anon - anonymous users should not
   be able to call this privileged function.
4. Add input validation to the SECURITY DEFINER function and document that
   authenticated access is intentional (it's the sole controlled write path).

## Security Changes
- DROP policy "authenticated_insert_features" (was always-true INSERT)
- DROP policy "authenticated_update_features" (was always-true UPDATE)
- REVOKE EXECUTE on upsert_property_feature FROM anon, public
- GRANT EXECUTE only to authenticated
- Add input validation (non-empty, max length) to the function
*/

-- 1. Remove overly-permissive INSERT and UPDATE policies
DROP POLICY IF EXISTS "authenticated_insert_features" ON public.property_features;
DROP POLICY IF EXISTS "authenticated_update_features" ON public.property_features;

-- 2. Revoke EXECUTE from anon and public, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.upsert_property_feature(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.upsert_property_feature(text) TO authenticated;

-- 3. Replace function with input-validated version
CREATE OR REPLACE FUNCTION public.upsert_property_feature(feature_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF feature_name IS NULL OR length(trim(feature_name)) = 0 THEN
    RAISE EXCEPTION 'feature_name must not be empty';
  END IF;
  IF length(trim(feature_name)) > 100 THEN
    RAISE EXCEPTION 'feature_name must be 100 characters or fewer';
  END IF;

  INSERT INTO public.property_features (name, usage_count)
  VALUES (trim(feature_name), 1)
  ON CONFLICT (lower(name))
  DO UPDATE SET usage_count = property_features.usage_count + 1;
END;
$$;
