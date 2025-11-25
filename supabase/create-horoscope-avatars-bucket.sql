-- Create horoscope-avatars storage bucket for horoscope-generated images
-- This bucket is separate from the 'avatars' bucket which stores user profile photos
-- Run this in your Supabase SQL Editor

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('horoscope-avatars', 'horoscope-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for horoscope-avatars bucket
-- Note: RLS on storage.objects is managed by Supabase
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage horoscope avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view horoscope avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can list their own horoscope avatars" ON storage.objects;

-- Allow service role (API) to upload/update/delete horoscope avatars
-- The API uses service role key, so it can manage these files
CREATE POLICY "Service role can manage horoscope avatars"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'horoscope-avatars')
WITH CHECK (bucket_id = 'horoscope-avatars');

-- Allow public read access to horoscope avatars (so they can be displayed)
CREATE POLICY "Public can view horoscope avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'horoscope-avatars');

-- Allow authenticated users to list their own horoscope avatars
CREATE POLICY "Users can list their own horoscope avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'horoscope-avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
