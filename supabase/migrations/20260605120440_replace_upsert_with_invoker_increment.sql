/*
# Drop public.upsert_property_feature, replace with safe increment function

The upsert_property_feature SECURITY DEFINER function is removed from public schema
to eliminate the REST API exposure concern.

A new increment_feature_usage function (SECURITY INVOKER) is created instead.
It only increments usage_count on an existing row, respecting RLS policies.
The frontend handles inserts directly via the INSERT RLS policy.
*/

-- Drop the old function
DROP FUNCTION IF EXISTS public.upsert_property_feature(text);

-- Create a SECURITY INVOKER function for incrementing usage count
CREATE FUNCTION public.increment_feature_usage(feature_name text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.property_features
  SET usage_count = usage_count + 1
  WHERE lower(name) = lower(trim(feature_name));
$$;

-- Only authenticated users can call it
REVOKE EXECUTE ON FUNCTION public.increment_feature_usage(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.increment_feature_usage(text) TO authenticated;
