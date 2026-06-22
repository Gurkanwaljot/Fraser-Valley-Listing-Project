/*
  # Create brokerage-logos storage bucket

  1. Storage
    - Creates a `brokerage-logos` bucket for brokerage logo uploads
    - Public bucket so URLs can be embedded in social posts and rasterized client-side
  2. Security
    - Authenticated users can upload to the bucket
    - Authenticated users can update/delete their own uploads (folder = uid)
    - Public read access for all logos
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brokerage-logos',
  'brokerage-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload brokerage logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'brokerage-logos');

CREATE POLICY "Authenticated users can update own brokerage logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'brokerage-logos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'brokerage-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can delete own brokerage logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'brokerage-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can view brokerage logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'brokerage-logos');
