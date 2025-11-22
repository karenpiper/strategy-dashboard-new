# Testing the Horoscope Image Endpoint

## Prerequisites

1. **Run Database Migrations** (in Supabase SQL Editor):
   - `supabase/create-prompt-slot-system.sql`
   - `supabase/seed-prompt-slot-catalogs.sql`
   - `supabase/add-profile-preference-fields.sql` (optional)

2. **Ensure Your Profile Has**:
   - Birthday set (MM/DD format, e.g., "03/15")
   - Full name (or email will be used)

## Testing Methods

### Method 1: Via Frontend (Easiest)

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Log in to your app

3. Navigate to dashboard - horoscope image should load automatically

4. Check browser console for logs

### Method 2: Direct API Call (cURL)

```bash
# Get your session cookie from browser DevTools > Application > Cookies
# Then run:

curl -X GET http://localhost:3000/api/horoscope/image \
  -H "Cookie: your-session-cookie-here" \
  -H "Content-Type: application/json"
```

### Method 3: Using Browser DevTools

1. Open your app in browser
2. Open DevTools (F12)
3. Go to Network tab
4. Navigate to dashboard
5. Find the request to `/api/horoscope/image`
6. Click on it to see:
   - Request headers
   - Response data
   - Response time

### Method 4: Using Next.js API Route Tester

Create a test page at `app/test-horoscope/page.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'

export default function TestHoroscope() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function test() {
      try {
        const response = await fetch('/api/horoscope/image')
        const json = await response.json()
        if (!response.ok) {
          setError(json.error || 'Failed to fetch')
        } else {
          setData(json)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    test()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h1>Horoscope Image Test</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      {data?.image_url && (
        <img src={data.image_url} alt="Horoscope" style={{ maxWidth: '500px' }} />
      )}
    </div>
  )
}
```

Then visit `http://localhost:3000/test-horoscope`

## Expected Response

```json
{
  "image_url": "https://oaidalleapiprodscus.blob.core.windows.net/...",
  "image_prompt": "eBoy style pixel art. Full body portrait of...",
  "prompt_slots": {
    "style_medium_id": "...",
    "style_reference_id": "...",
    "subject_role_id": "...",
    "subject_twist_id": "...",
    "setting_place_id": "...",
    "setting_time_id": "...",
    "activity_id": "...",
    "mood_vibe_id": "...",
    "color_palette_id": "...",
    "camera_frame_id": "...",
    "lighting_style_id": "...",
    "constraints_ids": ["...", "..."]
  },
  "cached": false
}
```

## Common Issues

1. **"User profile not found"**
   - Make sure you're logged in
   - Check that your profile exists in the `profiles` table

2. **"Birthday not set in profile"**
   - Update your profile with a birthday (MM/DD format)

3. **"No style groups available"**
   - Run the `seed-prompt-slot-catalogs.sql` migration

4. **"Failed to fetch or create user avatar state"**
   - Check that `user_avatar_state` table exists
   - Run `create-prompt-slot-system.sql` migration

5. **OpenAI API errors**
   - Check that `OPENAI_API_KEY` is set in your `.env.local`
   - Verify the API key is valid

## Debugging

Check server logs for:
- Catalog fetching status
- Style group selection
- Prompt building steps
- OpenAI API calls
- Database operations

Look for console.log statements in:
- `lib/horoscope-prompt-builder.ts`
- `lib/openai.ts`
- `app/api/horoscope/image/route.ts`

