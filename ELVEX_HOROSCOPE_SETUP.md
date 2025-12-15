# Elvex Horoscope Generation Setup

This guide explains how horoscope generation works with Elvex API and what needs to be configured.

## Overview

The system uses Elvex API for both horoscope text and image generation. It makes direct API calls to Elvex's OpenAI-compatible endpoints - **no assistant configuration is required**.

## How It Works

The system makes **2 API calls to Elvex** (the image prompt is built locally using the slot-based system):

### 1. Text Transformation (Chat Completions)
**Endpoint:** `POST /v1/chat/completions`

**What's sent:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a witty horoscope transformer. You take traditional horoscopes and make them irreverent and fun in the style of Co-Star. You always return valid JSON."
    },
    {
      "role": "user",
      "content": "Transform this horoscope from Cafe Astrology into the irreverent, silly style of Co-Star. Make it witty, slightly sarcastic, and fun. Keep the core meaning but make it more casual and entertaining.\n\nOriginal horoscope for [STAR_SIGN]:\n[CAFE_ASTROLOGY_TEXT]\n\nReturn a JSON object with this exact structure:\n{\n  \"horoscope\": \"An irreverent, expanded version of the horoscope in Co-Star's style. Make it approximately 150 words. Keep it witty, casual, and entertaining while expanding on the themes from the original. Break it into multiple paragraphs for readability.\",\n  \"dos\": [\"Do thing 1\", \"Do thing 2\", \"Do thing 3\"],\n  \"donts\": [\"Don't thing 1\", \"Don't thing 2\", \"Don't thing 3\"]\n}\n\nMake the do's and don'ts silly, specific, and related to the horoscope content. They should be funny and slightly absurd but still relevant."
    }
  ],
  "response_format": { "type": "json_object" },
  "temperature": 0.9,
  "max_tokens": 600
}
```

**What's returned:**
```json
{
  "horoscope": "The transformed horoscope text...",
  "dos": ["Do thing 1", "Do thing 2", "Do thing 3"],
  "donts": ["Don't thing 1", "Don't thing 2", "Don't thing 3"]
}
```

### 2. Image Prompt Building (Local - Slot-Based System)
**NOT an Elvex API call** - Built locally using `buildHoroscopePrompt()`

The image prompt is built using a sophisticated slot-based system that:
- **Maps user profile variables to styles:**
  - `likes_fantasy` → boosts fantasy styles (Studio Ghibli, Disney, Adventure Time)
  - `likes_scifi` → boosts sci-fi styles (Cyberpunk, Dreamworks, Pixar)
  - `likes_cute` → boosts cute styles (Chibi anime, children's book)
  - `likes_minimal` → boosts minimal styles (flat vector, isometric, charcoal)
  - `hates_clowns` → excludes clown-related content

- **Applies weighted selection by context:**
  - **Weekday themes:** Monday (sci-fi), Tuesday (fantasy), Wednesday (cozy), Thursday (energetic), etc.
  - **Seasonal adjustments:** Winter (cool colors), Spring (pastels), Summer (warm), Fall (sepia)
  - **Zodiac element themes:** Fire (energetic), Water (mysterious), Earth (cozy), Air (whimsical)

- **Selects from catalogs:**
  - Style reference (e.g., "Studio Ghibli style", "Cyberpunk concept art")
  - Subject role (e.g., "fantasy wizard", "sci-fi pilot", "your real face as yourself")
  - Setting place (e.g., "enchanted forest", "space station", "cozy library")
  - Mood/vibe (e.g., "whimsical and surreal", "energetic and chaotic")
  - Color palette (e.g., "pastel candy colors", "cool blues and greens")
  - And more: style medium, setting time, activity, camera frame, lighting style, constraints

- **Style rotation:** Avoids recently used styles to ensure variety

**Result:** A detailed, structured prompt matching the n8n format, for example:
```
Rubber Hose Cartoon. Marker Illustration. Top Down View of Karen Piper, a co-head, as hero in an rpg living neon sign flying through the air. They are in cozy library at stormy afternoon. sci fi high tech mood, warm oranges and reds palette, soft natural lighting. sharp focus on the face, avatar friendly portrait ratio, clean, simple background, no text in the image.
```

### 3. Image Generation (Images API)
**Endpoint:** `POST /v1/images/generations`

**What's sent:**
```json
{
  "model": "dall-e-3",
  "prompt": "[GENERATED_IMAGE_PROMPT]",
  "size": "1024x1024",
  "quality": "standard",
  "n": 1
}
```

**What's returned:**
```json
{
  "data": [
    {
      "url": "https://..."
    }
  ]
}
```

## Setup Required

### 1. Elvex API Key
You already have this set up for deck talk! The same `ELVEX_API_KEY` is used.

**Environment Variable:**
```bash
ELVEX_API_KEY=your-elvex-api-key
```

### 2. Elvex Image Generation Provider
Configure image generation in Elvex dashboard:

1. Go to **Settings > Apps** in Elvex
2. Under **Image generation provider**, select your preferred provider (e.g., DALL-E 3)
3. Click **Save**

**Note:** This is a global setting in your Elvex account, not per-assistant.

### 3. Optional: Custom Base URL
If you're using a custom Elvex instance:

```bash
ELVEX_BASE_URL=https://api.elvex.ai  # Optional, defaults to this
```

## No Assistant Configuration Needed

Unlike deck processing (which uses `/v1/assistants/{id}/process`), horoscope generation uses:
- `/v1/chat/completions` - Direct OpenAI-compatible chat API
- `/v1/images/generations` - Direct OpenAI-compatible images API

These are **direct API calls** that don't require creating or configuring an assistant in Elvex. The prompts are built dynamically in the code based on user profile data.

## What Gets Sent (Summary)

**Input Data:**
- Cafe Astrology horoscope text (fetched from Cafe Astrology website)
- User star sign
- User profile (name, role, hobbies, preferences)
- Weekday and season

**API Calls Made:**
1. **Text transformation** → Converts Cafe Astrology text to Co-Star style with dos/donts (Elvex API)
2. **Image prompt building** → Creates detailed image prompt using slot-based system (local, not Elvex)
3. **Image generation** → Generates image from the prompt (Elvex API)

**Output:**
- Transformed horoscope text
- Array of 3 "do's"
- Array of 3 "don'ts"
- Generated image URL

## Testing

1. Make sure `ELVEX_API_KEY` is set
2. Configure image generation provider in Elvex dashboard
3. Visit your dashboard app
4. Check server logs for:
   - `🚀 Generating horoscope text and image via Elvex API...`
   - `🔄 Transforming horoscope to Co-Star style using Elvex API...`
   - `🔄 Generating image prompt using Elvex API...`
   - `🖼️ Generating image using Elvex API...`
   - `✅ Elvex API generation completed in Xms`

## Troubleshooting

### Error: "ELVEX_API_KEY is not set"
- Make sure `ELVEX_API_KEY` is set in environment variables
- Restart your Vercel deployment after adding env vars

### Error: "Elvex image generation failed"
- Verify image generation provider is configured in Elvex (Settings > Apps)
- Check that your Elvex account has image generation enabled
- Verify the API key has proper permissions

### Error: "Invalid response format from Elvex"
- Check server logs for the actual response
- Verify Elvex is returning JSON format for text transformation
- The response should have `horoscope`, `dos`, and `donts` fields

## Differences from Deck Talk

| Feature | Deck Talk | Horoscope Generation |
|---------|-----------|---------------------|
| API Endpoint | `/v0/apps/{id}/versions/{version}/text/generate` | `/v1/chat/completions` |
| Requires Assistant | ✅ Yes | ❌ No |
| Requires Assistant ID | ✅ Yes | ❌ No |
| Requires Version | ✅ Yes | ❌ No |
| Uses Same API Key | ✅ Yes | ✅ Yes |

**Key Point:** Horoscope generation uses the **OpenAI-compatible API** directly, while deck talk uses the **Elvex Assistant API**. They're different endpoints but use the same API key.
