/*
# Add upsert_property_feature RPC function

Creates a database function that inserts a new feature or increments
the usage_count if the feature already exists (case-insensitive match).
Called from the frontend when saving listings to keep the suggestions
list up to date.

1. New Functions
   - `public.upsert_property_feature(feature_name text)` - upserts a feature
*/

CREATE OR REPLACE FUNCTION public.upsert_property_feature(feature_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.property_features (name, usage_count)
  VALUES (feature_name, 1)
  ON CONFLICT (lower(name))
  DO UPDATE SET usage_count = property_features.usage_count + 1;
END;
$$;
