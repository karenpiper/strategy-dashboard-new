-- Add metadata fields to playlists table
-- These fields store Spotify API data: duration, track count, and artists list

ALTER TABLE public.playlists
ADD COLUMN IF NOT EXISTS total_duration TEXT,
ADD COLUMN IF NOT EXISTS track_count INTEGER,
ADD COLUMN IF NOT EXISTS artists_list TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.playlists.total_duration IS 'Total duration of the playlist (e.g., "45:30")';
COMMENT ON COLUMN public.playlists.track_count IS 'Number of tracks in the playlist';
COMMENT ON COLUMN public.playlists.artists_list IS 'Comma-separated list of unique artists in the playlist';

