# Elvex Setup Guide

This guide explains how to configure the deck processing system to use Elvex instead of OpenAI.

## Overview

The system now uses Elvex assistant to process decks uploaded to Google Drive. Elvex:
- Has direct access to your Google Drive folder
- Processes PDFs and extracts metadata, topics, and slide information
- Returns structured JSON that populates the database

## Prerequisites

1. **Elvex Account**: Sign up at https://elvex.ai
2. **Elvex Assistant**: Create an assistant in Elvex that:
   - Has Google Drive connected as a data source
   - Can process PDF files
   - Returns structured JSON matching our schema

## Configuration

### Step 1: Create Elvex Assistant

1. Log into Elvex
2. Create a new assistant
3. Connect Google Drive as a data source:
   - Grant Elvex access to your Google Drive folder
   - The folder should match `GOOGLE_DRIVE_FOLDER_ID`
4. Configure the assistant to:
   - **Extract text from PDF files** (PDF parsing/extraction)
   - **Perform LLM analysis** on the extracted text:
     - Generate deck-level metadata (title, summary, themes, audiences, use cases)
     - Segment into topics (5-12 logical sections)
     - Label each slide (type, caption, topics, reusable flag)
   - Return structured JSON (see schema below)

### Step 2: Get Elvex API Credentials

1. In Elvex dashboard, go to API settings
2. Copy your:
   - **API Key** (`ELVEX_API_KEY`)
   - **Assistant ID** (`ELVEX_ASSISTANT_ID`)
   - **Base URL** (optional, defaults to `https://api.elvex.ai`)

### Step 3: Set Environment Variables

Add these to your Vercel environment variables or `.env.local`:

```bash
# Elvex Configuration (required)
ELVEX_API_KEY=your-elvex-api-key
ELVEX_ASSISTANT_ID=your-assistant-id
ELVEX_VERSION=your-assistant-version

# Optional: Custom Elvex base URL
ELVEX_BASE_URL=https://api.elvex.ai

# Note: DeckTalk chatbot uses the same assistant ID and version as deck processing

# Remove or comment out OpenAI keys (no longer needed)
# OPENAI_API_KEY=...
```

### Step 4: Configure Elvex Assistant Output Format

Your Elvex assistant should return JSON in this format:

```json
{
  "deck_metadata": {
    "deck_title": "cleaned up title",
    "deck_summary": "2-4 sentence overview",
    "main_themes": ["theme1", "theme2"],
    "primary_audiences": ["audience1", "audience2"],
    "use_cases_for_other_presentations": ["use case 1", "use case 2"]
  },
  "topics": [
    {
      "topic_title": "short name",
      "topic_summary": "3-5 sentence description",
      "story_context": "one of: credibility, market_problem, solution_vision, implementation, results, other",
      "topics": ["keyword1", "keyword2"],
      "reuse_suggestions": ["suggestion1"],
      "slide_numbers": [1, 2, 3]
    }
  ],
  "slides": [
    {
      "slide_number": 1,
      "slide_type": "one of: case_study, vision, market_context, data_chart, model, process, roadmap, cover, credits, other",
      "slide_caption": "one sentence description",
      "topics": ["keyword1"],
      "reusable": "yes or no or needs_edit"
    }
  ]
}
```

## How It Works

1. **User uploads PDF** → File is uploaded to Google Drive
2. **System calls Elvex** → Sends Google Drive file ID to Elvex assistant
3. **Elvex extracts PDF** → Elvex reads PDF from Google Drive and extracts text from each slide
4. **Elvex performs LLM analysis** → Elvex analyzes the extracted text to generate:
   - Deck metadata (title, summary, themes, audiences, use cases)
   - Topic segmentation (5-12 logical sections)
   - Slide labels (type, caption, topics, reusable flag)
5. **Elvex returns results** → Structured JSON with all extracted and analyzed data
6. **System stores in database** → Results are saved to Supabase with embeddings

## Embeddings

The system still generates embeddings for semantic search, but now uses Elvex's embedding API (if configured) or falls back to OpenAI embeddings.

To use Elvex for embeddings, set:
```bash
ELVEX_EMBEDDINGS_ENABLED=true
```

Otherwise, embeddings will use OpenAI (requires `OPENAI_API_KEY` still set).

## Testing

1. Upload a deck through the admin UI
2. Check the server logs for Elvex API calls
3. Verify the deck appears in the database with correct metadata
4. Test search functionality

## Troubleshooting

### Error: "ELVEX_API_KEY is required"
- Make sure `ELVEX_API_KEY` is set in environment variables
- Restart your Vercel deployment after adding env vars

### Error: "ELVEX_ASSISTANT_ID is required"
- Make sure `ELVEX_ASSISTANT_ID` is set
- Verify the assistant ID is correct in Elvex dashboard

### Error: "Elvex returned non-JSON response"
- Check your Elvex assistant configuration
- Ensure it's set to return structured JSON
- Review the assistant's output format in Elvex dashboard

### Error: "File not found" or "Access denied"
- Verify Elvex has access to your Google Drive folder
- Check that the folder ID matches `GOOGLE_DRIVE_FOLDER_ID`
- Ensure the service account has shared the folder with Elvex (if needed)

## Migration from OpenAI

If you're migrating from OpenAI:

1. Set up Elvex assistant (steps above)
2. Add Elvex environment variables
3. Remove or comment out `OPENAI_API_KEY` (optional - still needed for embeddings unless using Elvex)
4. Deploy changes
5. Test with a new deck upload

Existing decks in the database will continue to work - only new uploads will use Elvex.

