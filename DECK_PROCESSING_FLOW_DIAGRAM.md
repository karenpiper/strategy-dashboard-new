# Deck Processing Flow Diagram

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER UPLOADS PDF FILE                        │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Upload to Google Drive (Chunked Upload)                │
│  - Client splits file into 2MB chunks                           │
│  - Server proxies chunks to Google Drive                        │
│  - File stored in folder: GOOGLE_DRIVE_FOLDER_ID                │
│  - Returns: Google Drive File ID                                │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Ingestion (/api/upload-deck)                           │
│                                                                  │
│  2.1 Download & Extract                                         │
│  ┌────────────────────────────────────────────┐                │
│  │ - Download PDF from Google Drive            │                │
│  │ - Extract text from each slide (pdf-parse)  │                │
│  │ - Validate: max 100 pages, max 100MB       │                │
│  └────────────────────────────────────────────┘                │
│                              │                                   │
│                              ▼                                   │
│  2.2 LLM Analysis (3 parallel processes)                        │
│  ┌────────────────────────────────────────────┐                │
│  │ A) Deck Metadata                            │                │
│  │    - Title, summary, themes                 │                │
│  │    - Audiences, use cases                   │                │
│  │    Input: Full deck text                    │                │
│  │    Output: Structured JSON                 │                │
│  └────────────────────────────────────────────┘                │
│  ┌────────────────────────────────────────────┐                │
│  │ B) Topic Segmentation                       │                │
│  │    - Identify 5-12 logical sections         │                │
│  │    - Each topic: title, summary, context     │                │
│  │    - Map slides to topics                   │                │
│  │    Input: Full deck text                    │                │
│  │    Output: Array of topic objects           │                │
│  └────────────────────────────────────────────┘                │
│  ┌────────────────────────────────────────────┐                │
│  │ C) Slide Labeling (per slide)               │                │
│  │    - Caption, type, topics, reusable flag  │                │
│  │    Input: Individual slide text             │                │
│  │    Output: Label object per slide           │                │
│  └────────────────────────────────────────────┘                │
│                              │                                   │
│                              ▼                                   │
│  2.3 Embedding Generation                                        │
│  ┌────────────────────────────────────────────┐                │
│  │ - Generate embeddings for each topic       │                │
│  │ - Generate embeddings for each slide       │                │
│  │ - Model: text-embedding-3-small            │                │
│  │ - Vector size: 1536 dimensions              │                │
│  └────────────────────────────────────────────┘                │
│                              │                                   │
│                              ▼                                   │
│  2.4 Database Storage                                           │
│  ┌────────────────────────────────────────────┐                │
│  │ decks table:                                │                │
│  │   - title, summary, themes, audiences       │                │
│  │   - use_cases, gdrive_file_id, url         │                │
│  │                                             │                │
│  │ topics table:                               │                │
│  │   - topic_title, topic_summary             │                │
│  │   - story_context, topics, reuse_suggestions│                │
│  │   - slide_numbers, embedding (vector)      │                │
│  │                                             │                │
│  │ slides table:                               │                │
│  │   - slide_number, slide_caption             │                │
│  │   - slide_type, topics, reusable           │                │
│  │   - embedding (vector)                     │                │
│  └────────────────────────────────────────────┘                │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSING COMPLETE                          │
│              Deck ready for search                              │
└─────────────────────────────────────────────────────────────────┘
```

## Search Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ENTERS SEARCH QUERY                      │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Generate Query Embedding                               │
│  - Convert user query to vector                                 │
│  - Same model: text-embedding-3-small                           │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Hybrid Search (Keyword + Semantic)                      │
│                                                                  │
│  ┌────────────────────────────────────────────┐                │
│  │ Keyword Search (PostgreSQL ILIKE)          │                │
│  │ - Search: titles, summaries, captions      │                │
│  │ - Fast, exact matches                      │                │
│  └────────────────────────────────────────────┘                │
│                              │                                   │
│  ┌────────────────────────────────────────────┐                │
│  │ Semantic Search (pgvector cosine similarity)│                │
│  │ - Compare query embedding to stored vectors │                │
│  │ - Finds conceptually similar content        │                │
│  └────────────────────────────────────────────┘                │
│                              │                                   │
│                              ▼                                   │
│  Combine & Rank Results                                         │
│  - Merge keyword + semantic results                            │
│  - Deduplicate, sort by relevance                              │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Return Results                                         │
│  - Deck titles with Google Drive links                          │
│  - Topic summaries                                              │
│  - Slide captions                                               │
│  - Relevance scores                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Chat Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              USER ASKS: "Find decks about X"                     │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Semantic Search                                         │
│  - Find relevant decks/topics/slides                             │
│  - Get top 5-10 results                                          │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Build Context                                           │
│  - Combine search results into context                           │
│  - Include deck titles, summaries, topic info                   │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: LLM Generation                                          │
│  - System prompt: "You are a deck search assistant"              │
│  - User prompt: Query + search results context                  │
│  - Generate conversational recommendation                        │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Return Response                                         │
│  - Natural language answer                                       │
│  - References to specific decks (with Drive links)              │
│  - Suggestions for reuse                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Processing Time Breakdown

For a typical 30-slide deck:

- **File Upload**: 5-10 seconds (depends on file size)
- **PDF Extraction**: 1-2 seconds
- **LLM Analysis**:
  - Deck metadata: 3-5 seconds
  - Topic segmentation: 5-8 seconds
  - Slide labeling (30 slides): 15-30 seconds (parallelized)
- **Embedding Generation**: 5-10 seconds (parallelized)
- **Database Writes**: 1-2 seconds

**Total**: ~30-60 seconds per deck

## Cost Breakdown (per deck)

- **LLM Calls** (gpt-4o-mini):
  - Deck metadata: ~$0.01
  - Topics: ~$0.02
  - Slides (30): ~$0.10
  - Chat (if used): ~$0.01 per query
- **Embeddings** (text-embedding-3-small):
  - Topics + Slides: ~$0.01
- **Total per deck**: ~$0.14-0.15

**Search queries**: Free (database lookups only)
**Chat queries**: ~$0.01-0.02 per query







