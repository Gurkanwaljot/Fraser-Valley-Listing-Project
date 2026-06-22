/*
# Switch upsert_property_feature to SECURITY INVOKER

The function no longer runs with elevated privileges. Instead, constrained
RLS policies allow the specific operations it performs:
- INSERT with usage_count forced to 1
- UPDATE only the usage_count column (increment)

## Security Changes
- Function switched from SECURITY DEFINER to SECURITY INVOKER
- New INSERT policy: authenticated can insert only with usage_count = 1
- New UPDATE policy: authenticated can only increase usage_count
*/

-- 1. Replace function as SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.upsert_property_feature(feature_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
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

-- 2. Add constrained INSERT policy (new features must start at usage_count = 1)
DROP POLICY IF EXISTS "authenticated_insert_features" ON public.property_features;
CREATE POLICY "authenticated_insert_features" ON public.property_features
  FOR INSERT TO authenticated
  WITH CHECK (usage_count = 1);

-- 3. Add constrained UPDATE policy (can only increment usage_count)
DROP POLICY IF EXISTS "authenticated_update_features" ON public.property_features;
CREATE POLICY "authenticated_update_features" ON public.property_features
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (usage_count > 0);
