-- Import Playlists from CSV
-- This script imports historical playlists from the CSV file
-- 
-- CSV Format: Date,Title,Curator,Description,URL,Apple Playlist
--
-- Note: This script inserts data directly. For large imports, consider using a staging table first.

-- Helper function to parse date from M/D/YYYY format
CREATE OR REPLACE FUNCTION parse_playlist_date(date_str TEXT)
RETURNS DATE AS $$
DECLARE
  parsed_date DATE;
  month_part TEXT;
  day_part TEXT;
  year_part TEXT;
  parts TEXT[];
BEGIN
  IF date_str IS NULL OR TRIM(date_str) = '' THEN
    RETURN CURRENT_DATE;
  END IF;
  
  -- Try to parse M/D/YYYY or M/DD/YYYY format
  parts := string_to_array(TRIM(date_str), '/');
  
  IF array_length(parts, 1) = 3 THEN
    month_part := parts[1];
    day_part := parts[2];
    year_part := parts[3];
    
    -- Validate and construct date
    IF LENGTH(month_part) <= 2 AND LENGTH(day_part) <= 2 AND LENGTH(year_part) = 4 THEN
      BEGIN
        parsed_date := TO_DATE(year_part || '-' || LPAD(month_part, 2, '0') || '-' || LPAD(day_part, 2, '0'), 'YYYY-MM-DD');
        RETURN parsed_date;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN CURRENT_DATE;
      END;
    END IF;
  END IF;
  
  -- Fallback: try PostgreSQL's date parsing
  BEGIN
    parsed_date := date_str::DATE;
    RETURN parsed_date;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN CURRENT_DATE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Insert historical playlists
-- Note: cover_url and curator_photo_url will be NULL initially
-- These can be populated later by fetching from Spotify API or looking up curator profiles

INSERT INTO public.playlists (date, title, curator, description, spotify_url, apple_playlist_url, cover_url, curator_photo_url)
VALUES
  (
    parse_playlist_date('7/27/2025'),
    'late night beats',
    'Unknown', -- Curator not specified in CSV
    'A spotify generted one for testing. and typos',
    'https://open.spotify.com/playlist/37vVbInEzfnXJQjVuU7bAZ',
    NULL,
    NULL, -- Will be fetched from Spotify API later
    NULL  -- Will be looked up from profiles later
  ),
  (
    parse_playlist_date('8/18/2025'),
    'Talking Turtle Transmissions',
    'Karen Piper',
    NULL,
    'https://open.spotify.com/playlist/3SC8XfC7qquwmfxbM01nI3?si=e405a0ab3daa4201',
    NULL,
    NULL,
    NULL
  ),
  (
    parse_playlist_date('8/19/2025'),
    'Butt Rock for the Masses',
    'Pat McQueen',
    'Nothin'' butt rawk!',
    'https://open.spotify.com/playlist/4K3WSUVwAhoDN7uN8lGOjv?si=A8otlY7bR9u9wRuJ9jD7CA',
    NULL,
    NULL,
    NULL
  ),
  (
    parse_playlist_date('8/29/2025'),
    'What Arjun Works To',
    'Arjun Kalyanpur',
    'A peek into my ears when you see me headphones in, hunched over my desk with terrible posture, staring at Keynote.',
    'https://open.spotify.com/playlist/7MG9kkd3iNWwPs30Tdlp1s?si=ac9dd533ed4a4d8d',
    NULL,
    NULL,
    NULL
  ),
  (
    parse_playlist_date('9/4/2025'),
    NULL, -- Title not specified in CSV
    'Julian Alexander',
    'grimey shit from the frontier of experimental ',
    'https://open.spotify.com/playlist/6TXT1CaiNOm4omz90u5coa?si=4387e8695a5040a3',
    NULL,
    NULL,
    NULL
  ),
  (
    parse_playlist_date('9/9/2025'),
    NULL, -- Title not specified in CSV
    'Millie Tunnell',
    'Somewhere in Between',
    'https://open.spotify.com/playlist/3gCWWPuwxcAeh4MfkivqUh?si=a41a8b9075fb47cb',
    NULL,
    NULL,
    NULL
  ),
  (
    parse_playlist_date('9/26/2025'),
    NULL, -- Title not specified in CSV
    'Erin Henry',
    'in honor of Oct 1 next week, sending some Halloween vibes!',
    'https://open.spotify.com/playlist/1A301sDP7MVv0kLwEBwS8Y',
    NULL,
    NULL,
    NULL
  ),
  (
    parse_playlist_date('10/14/2025'),
    NULL, -- Title not specified in CSV
    'Marcos Alonso',
    'I''ve been taking salsa lessons lately, and this playlist has become my go-to for practice. It''s full of classics that are easy to dance to so if you ever catch me shimmying on Zoom, I''m probably working on my footwork under the desk.',
    'https://open.spotify.com/playlist/37i9dQZF1DWZtHtrp0izBF?si=PzgONOjMQ3GlhnsA9xu_TA&pi=vWyDm9y5Qtyzl',
    NULL,
    NULL,
    NULL
  ),
  (
    parse_playlist_date('10/24/2025'),
    NULL, -- Title not specified in CSV
    'Rebecca Smith',
    'macabre mingling, bone-chilling bops, spooky slow dances, and spiked punch - vampy vibes included',
    'https://open.spotify.com/playlist/5lR2biQtNX0HwGLOkwwcZu?si=u4w8u2EySAeqc6Vbn7LLng&nd=1&dlsi=9261a1466a7743ce',
    NULL,
    NULL,
    NULL
  )
ON CONFLICT DO NOTHING; -- Prevents duplicates if run multiple times

-- Optional: Update curator_photo_url by looking up from profiles table
-- This will match curators by full_name
UPDATE public.playlists p
SET curator_photo_url = pr.avatar_url
FROM public.profiles pr
WHERE p.curator = pr.full_name
  AND pr.avatar_url IS NOT NULL
  AND p.curator_photo_url IS NULL;

-- Clean up helper function (optional - you can keep it if you plan to import more data)
-- DROP FUNCTION IF EXISTS parse_playlist_date(TEXT);

-- Verify the import
SELECT 
  id,
  date,
  title,
  curator,
  spotify_url,
  created_at
FROM public.playlists
ORDER BY date DESC;

