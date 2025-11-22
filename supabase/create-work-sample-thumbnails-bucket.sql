-- Create work-sample-thumbnails storage bucket for work sample thumbnails
-- Run this in your Supabase SQL Editor

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-sample-thumbnails', 'work-sample-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for work-sample-thumbnails bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload work sample thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update work sample thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete work sample thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Public can view work sample thumbnails" ON storage.objects;

-- Allow authenticated users to upload work sample thumbnails
CREATE POLICY "Users can upload work sample thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'work-sample-thumbnails');

-- Allow authenticated users to update work sample thumbnails
CREATE POLICY "Users can update work sample thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'work-sample-thumbnails');

-- Allow authenticated users to delete work sample thumbnails
CREATE POLICY "Users can delete work sample thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'work-sample-thumbnails');

-- Allow public read access to work sample thumbnails
CREATE POLICY "Public can view work sample thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'work-sample-thumbnails');

