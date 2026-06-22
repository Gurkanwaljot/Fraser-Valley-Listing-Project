/*
  # Create headshots storage bucket

  1. Storage
    - Create `headshots` bucket for realtor profile photos
    - Public bucket so URLs can be accessed without auth
  2. Security
    - Authenticated users can upload to the headshots bucket
    - Authenticated users can update/delete their own uploads
    - Public read access for all headshots
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'headshots',
  'headshots',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload headshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'headshots');

CREATE POLICY "Authenticated users can update own headshots"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'headshots' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'headshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can delete own headshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'headshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can view headshots"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'headshots');
