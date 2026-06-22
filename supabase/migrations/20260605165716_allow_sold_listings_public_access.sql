-- Allow public/anon/authenticated users to view sold listings (preserves SEO link equity)
DROP POLICY IF EXISTS "Public can view active listings" ON listings;
DROP POLICY IF EXISTS "Authenticated can view active listings" ON listings;
DROP POLICY IF EXISTS "Anon can view active listings" ON listings;

CREATE POLICY "Public can view active or sold listings" ON listings
  FOR SELECT TO public
  USING (status IN ('active', 'sold'));

CREATE POLICY "Anon can view active or sold listings" ON listings
  FOR SELECT TO anon
  USING (status IN ('active', 'sold'));
