/*
# Create property_features master table

Shared suggestion list for property features across all users.
Features are ordered by usage_count (most popular first).
New features are added organically as photographers use them.

1. New Tables
   - `property_features`
     - `id` (uuid, primary key)
     - `name` (text, case-insensitive unique via index)
     - `usage_count` (integer, tracks how often this feature is used)
     - `created_at` (timestamptz)

2. Security
   - RLS enabled on property_features
   - All authenticated users can SELECT (view suggestions)
   - All authenticated users can INSERT (add new features)
   - All authenticated users can UPDATE usage_count (increment on use)
   - Only admins can DELETE (curate the list)

3. Seed Data
   - 25 common real estate features pre-loaded
*/

CREATE TABLE IF NOT EXISTS public.property_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  usage_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_features_name_lower
  ON public.property_features (lower(name));

CREATE INDEX IF NOT EXISTS idx_property_features_usage
  ON public.property_features (usage_count DESC);

ALTER TABLE public.property_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_features" ON public.property_features;
CREATE POLICY "authenticated_select_features" ON public.property_features
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_features" ON public.property_features;
CREATE POLICY "authenticated_insert_features" ON public.property_features
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_features" ON public.property_features;
CREATE POLICY "authenticated_update_features" ON public.property_features
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_features" ON public.property_features;
CREATE POLICY "admin_delete_features" ON public.property_features
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Seed common real estate features
INSERT INTO public.property_features (name, usage_count) VALUES
  ('Hardwood Floors', 50),
  ('Central A/C', 45),
  ('Heated Garage', 40),
  ('Granite Countertops', 38),
  ('Open Concept', 35),
  ('Smart Home', 33),
  ('In-Floor Heating', 30),
  ('Walk-In Closet', 28),
  ('Crown Moulding', 26),
  ('Ensuite Bathroom', 25),
  ('Stainless Steel Appliances', 24),
  ('Quartz Countertops', 23),
  ('Double Car Garage', 22),
  ('Fenced Yard', 20),
  ('Finished Basement', 19),
  ('Main Floor Laundry', 18),
  ('Pot Lights', 17),
  ('9ft Ceilings', 16),
  ('Spa Bathroom', 15),
  ('Wine Cellar', 14),
  ('EV Charger', 13),
  ('Heated Driveway', 12),
  ('Custom Millwork', 11),
  ('Built-In Sound System', 10),
  ('Mudroom', 9)
ON CONFLICT (lower(name)) DO NOTHING;
