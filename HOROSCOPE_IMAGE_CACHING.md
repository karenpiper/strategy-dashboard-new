# Horoscope Caching System

This document explains how horoscope text and images are generated, cached, and stored in the database.

## Overview

Every time a horoscope (text and image) is generated, it is automatically stored in the database for that specific user and date. The system ensures:
- **One horoscope per user per day** - Each user gets a unique horoscope text and image for each day
- **Historical preservation** - All past horoscopes remain in the database
- **Today's horoscope only** - The hero section only displays today's horoscope
- **Automatic caching** - Horoscopes are only generated once per day, subsequent requests return the cached version

## How It Works

### 1. Horoscope Generation Flow

When a user visits the dashboard:

1. **Check for cached horoscope**: The API checks if a horoscope (text + image) exists for today's date (`YYYY-MM-DD`)
2. **Return cached if found**: If a cached horoscope exists, it's returned immediately (no AI generation)
3. **Generate if missing**: If no cached horoscope exists:
   - Horoscope text is fetched from Cafe Astrology and transformed using OpenAI
   - Hero image is generated using OpenAI DALL-E
4. **Store in database**: The generated horoscope text, image URL, and metadata are saved to the `horoscopes` table

### 2. Database Storage

The `horoscopes` table stores:
- `user_id` - The authenticated user's ID
- `date` - The date for this horoscope (YYYY-MM-DD format)
- `horoscope_text` - The generated horoscope text
- `horoscope_dos` - Array of "do" suggestions
- `horoscope_donts` - Array of "don't" suggestions
- `image_url` - The URL to the generated hero image
- `image_prompt` - The full prompt used to generate the image
- `style_key`, `style_label`, `character_type` - Style metadata
- `generated_at` - Timestamp when the horoscope was generated

**Unique Constraint**: `UNIQUE(user_id, date)` ensures:
- Only one image per user per day
- Historical images are preserved (each day gets its own row)
- No duplicate images for the same user/date

### 3. Frontend Display

The hero section:
- Fetches today's horoscope text via `/api/horoscope`
- Fetches today's image via `/api/horoscope/image`
- Displays the cached horoscope if available
- Shows a loading state while fetching/generating
- Historical horoscopes remain in the database but are not displayed

## API Endpoints

### `GET /api/horoscope`

**Authentication**: Required (uses Supabase auth)

**Response**:
```json
{
  "star_sign": "Pisces",
  "horoscope_text": "Today is a day of...",
  "horoscope_dos": ["Do this", "Do that"],
  "horoscope_donts": ["Don't do this"],
  "image_url": "https://...",
  "cached": true  // or false if newly generated
}
```

**Behavior**:
- Returns today's horoscope text for the authenticated user
- If cached: Returns immediately with `cached: true`
- If not cached: Generates new horoscope, stores it, returns with `cached: false`

### `GET /api/horoscope/image`

**Authentication**: Required (uses Supabase auth)

**Response**:
```json
{
  "image_url": "https://...",
  "image_prompt": "A mystical...",
  "cached": true,  // or false if newly generated
  "config": {
    "userProfile": { ... },
    "resolvedChoices": { ... }
  }
}
```

**Behavior**:
- Returns today's image for the authenticated user
- If cached: Returns immediately with `cached: true`
- If not cached: Generates new image, stores it, returns with `cached: false`

## Benefits

1. **Cost Savings**: Horoscopes and images are only generated once per user per day
2. **Performance**: Cached horoscopes load instantly
3. **Consistency**: Same horoscope shown throughout the day
4. **History**: All past horoscopes are preserved for potential future features
5. **Reliability**: No need to regenerate if the AI service is temporarily unavailable

## Future Enhancements

Potential uses for historical horoscopes:
- Horoscope gallery showing past horoscopes and images
- Trends and patterns over time
- User preferences based on past horoscopes
- Analytics on horoscope generation patterns
- Comparison view to see how horoscopes change over time

## Database Query Examples

### Get today's horoscope for a user
```sql
SELECT horoscope_text, horoscope_dos, horoscope_donts, image_url, image_prompt, generated_at
FROM horoscopes
WHERE user_id = '...' AND date = CURRENT_DATE;
```

### Get all historical horoscopes for a user
```sql
SELECT date, horoscope_text, image_url, generated_at
FROM horoscopes
WHERE user_id = '...'
ORDER BY date DESC;
```

### Get horoscopes for a specific date range
```sql
SELECT date, horoscope_text, image_url
FROM horoscopes
WHERE user_id = '...'
  AND date BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY date DESC;
```

