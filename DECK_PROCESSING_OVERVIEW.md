# Deck Processing Overview

## Current Processing Flow

When you upload a deck, here's what happens step-by-step:

### Step 1: File Upload to Google Drive
- User selects a PDF file in the admin UI
- File is uploaded to Google Drive in chunks (bypassing Vercel's 4.5MB limit)
- File is stored in the folder specified by `GOOGLE_DRIVE_FOLDER_ID`
- Returns a Google Drive file ID

### Step 2: Ingestion Processing (`/api/upload-deck`)

#### 2.1 Elvex Processing
- System sends Google Drive file ID to Elvex assistant
- **Elvex extracts PDF text**: Reads PDF from Google Drive and extracts text from each slide
- **Elvex performs LLM analysis**: Analyzes the extracted text to generate:

**a) Deck-Level Metadata**
- Analyzes the entire deck
- Generates:
  - `deck_title`: Cleaned title
  - `deck_summary`: 2-4 sentence overview
  - `main_themes`: Array of key themes
  - `primary_audiences`: Target audiences
  - `use_cases`: When this deck could be reused

**b) Topic Segmentation**
- Analyzes the full deck to identify logical sections
- Creates 5-12 topic segments, each with:
  - `topic_title`: Short name
  - `topic_summary`: 3-5 sentence description
  - `story_context`: Category (credibility, market_problem, solution_vision, etc.)
  - `topics`: Keywords/tags
  - `reuse_suggestions`: How to reuse this topic
  - `slide_numbers`: Which slides belong to this topic

**c) Slide Labeling**
- Analyzes each slide individually
- For each slide, generates:
  - `slide_caption`: Brief description
  - `slide_type`: Type of slide (e.g., "intro", "data", "conclusion")
  - `topics`: Related topics
  - `reusable`: Whether this slide is reusable

#### 2.3 Embedding Generation
- Creates vector embeddings for:
  - Each topic's `topic_summary` (for semantic search)
  - Each slide's `slide_caption` (for semantic search)
- Uses OpenAI's `text-embedding-3-small` model
- Stores embeddings in PostgreSQL with pgvector

#### 2.4 Database Storage
- **`decks` table**: Deck metadata (title, summary, themes, audiences, use cases)
- **`topics` table**: Topic segments with embeddings
- **`slides` table**: Individual slides with embeddings

### Step 3: Search Capabilities

#### Keyword Search
- Searches across deck titles, summaries, topic titles, slide captions
- Uses PostgreSQL `ILIKE` for case-insensitive matching

#### Semantic Search
- Uses vector similarity (cosine distance) on embeddings
- Finds conceptually similar content even without exact keyword matches
- Combines with keyword search for hybrid results

#### Chat Recommendations
- Takes a user query
- Performs semantic search to find relevant decks/topics/slides
- Uses LLM to generate conversational recommendations with references

---

## Comparison: Pre-Processing vs. Elvex Assistant

### Option A: Current Approach (Pre-Processing + Database)

**How it works:**
- Process decks upfront when uploaded
- Extract structured metadata (topics, themes, summaries)
- Store embeddings in database
- Search queries hit the database directly

**Pros:**
- ✅ **Fast queries**: Database lookups are instant (milliseconds)
- ✅ **Cost-effective**: Embeddings generated once, queries are free
- ✅ **Structured data**: Rich metadata (themes, audiences, use cases) for filtering
- ✅ **Offline-capable**: No API calls needed for searches
- ✅ **Scalable**: Can handle thousands of queries per second
- ✅ **Customizable**: Full control over search logic and ranking

**Cons:**
- ❌ **Upfront processing time**: 30-60 seconds per deck (LLM calls)
- ❌ **Storage costs**: Embeddings stored in database (~1KB per topic/slide)
- ❌ **Less flexible**: Can't ask arbitrary questions about content not in summaries
- ❌ **Maintenance**: Need to re-process if you want different metadata

**Best for:**
- High-volume search use cases
- When you need fast, structured search
- When you want to filter by metadata (themes, audiences, etc.)
- When cost per query matters

---

### Option B: Elvex Assistant with Drive as Datasource

**How it works:**
- Upload files to Google Drive (no processing)
- Elvex indexes Drive folder automatically
- User queries go to Elvex, which searches Drive content in real-time
- Elvex uses RAG (Retrieval Augmented Generation) to answer

**Pros:**
- ✅ **No upfront processing**: Just upload files, Elvex handles indexing
- ✅ **Full content access**: Can answer questions about any part of any deck
- ✅ **Natural language**: Better at understanding complex queries
- ✅ **Always up-to-date**: Automatically reflects new files in Drive
- ✅ **Less code**: No ingestion pipeline to maintain

**Cons:**
- ❌ **Slower queries**: Each query requires API calls (1-3 seconds)
- ❌ **Higher cost**: Pay per query (LLM + embedding calls each time)
- ❌ **Less structured**: Harder to filter by metadata (themes, audiences)
- ❌ **Dependency**: Relies on Elvex service availability
- ❌ **Limited customization**: Can't easily customize search ranking or logic

**Best for:**
- Low-volume, conversational queries
- When you need deep content understanding
- When you want zero maintenance
- When cost per query is acceptable

---

## Hybrid Approach (Recommended)

You could combine both:

1. **Pre-process for fast search** (current approach)
   - Use for: Quick searches, filtering by themes/audiences, finding reusable slides
   - Fast, structured, cost-effective

2. **Elvex for deep Q&A** (add as additional feature)
   - Use for: "Explain this deck's strategy", "What are the key insights?", complex analysis
   - Natural language, full content access

**Implementation:**
- Keep current ingestion pipeline
- Add an Elvex integration for "deep dive" queries
- Route simple searches to database, complex questions to Elvex

---

## Recommendation

**For your use case (conversational search of agency decks):**

I'd recommend **sticking with the current pre-processing approach** because:

1. **You need structured metadata**: Themes, audiences, use cases are valuable for filtering
2. **Fast search is important**: Users want instant results when browsing decks
3. **Cost efficiency**: With many users, per-query costs add up quickly
4. **Reusability focus**: The system is designed to help find reusable content, which benefits from structured metadata

**However**, you could add Elvex as a **secondary option** for:
- "Explain this deck" deep dives
- Complex analytical questions
- When users want to understand full context

This gives you the best of both worlds: fast structured search + deep content understanding when needed.

