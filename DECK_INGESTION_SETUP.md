# Deck Ingestion System Setup Guide

## 1. Install Dependencies

Run the following command to install the required PDF parsing library:

```bash
npm install pdf-parse @types/pdf-parse
```

Or if you prefer to add it manually to `package.json`, add:
```json
"pdf-parse": "^1.1.1",
"@types/pdf-parse": "^1.1.4"
```

Then run `npm install`.

## 2. Required Environment Variables

Add these to your `.env.local` file (or your environment configuration):

### Required Variables

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-...

# Supabase Configuration (required)
SUPABASE_URL=https://your-project.supabase.co
# OR use NEXT_PUBLIC_SUPABASE_URL if already set
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Drive Configuration (required)
GOOGLE_DRIVE_FOLDER_ID=your-folder-id

# Google Drive Authentication (choose one method)
# Option 1: Service Account JSON (recommended)
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'

# Option 2: Individual credentials (alternative)
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Optional Variables (with defaults)

```bash
# OpenAI Model Configuration (optional - defaults shown)
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Deck Size Limits (optional - defaults shown)
MAX_DECK_PAGES=100
MAX_DECK_SIZE_MB=25
```

## 3. Database Setup

The schema has already been applied. Verify the tables exist:

- `decks` - Main deck records
- `topics` - Topic segments with embeddings
- `slides` - Individual slides with embeddings

The SQL functions `match_topics()` and `match_slides()` should also be available for semantic search.

## 4. Testing the Endpoints

### Test 1: Upload a Deck (POST /api/upload-deck)

Using `curl`:

```bash
curl -X POST http://localhost:3000/api/upload-deck \
  -F "file=@/path/to/your/presentation.pdf" \
  -F "title=My Test Deck"
```

Using a tool like Postman or Insomnia:
- Method: POST
- URL: `http://localhost:3000/api/upload-deck`
- Body: form-data
  - Key: `file` (type: File), Value: select your PDF
  - Key: `title` (type: Text, optional), Value: "My Test Deck"

Expected response:
```json
{
  "deck_id": "uuid-here",
  "topics_count": 8,
  "slides_count": 25
}
```

### Test 2: Search (GET /api/search)

Using `curl`:

```bash
# Basic search
curl "http://localhost:3000/api/search?q=marketing%20strategy&limit=10"

# With limit
curl "http://localhost:3000/api/search?q=product%20launch&limit=5"
```

Using a browser or tool:
- Method: GET
- URL: `http://localhost:3000/api/search?q=your+search+query&limit=10`

Expected response:
```json
{
  "query": "marketing strategy",
  "results": [
    {
      "type": "topic",
      "deck_id": "uuid",
      "deck_title": "Q4 Marketing Plan",
      "topic_id": "uuid",
      "summary": "Marketing strategy overview...",
      "score": 0.92
    },
    {
      "type": "slide",
      "deck_id": "uuid",
      "deck_title": "Q4 Marketing Plan",
      "slide_id": "uuid",
      "slide_number": 5,
      "summary": "Marketing channels breakdown",
      "score": 0.87
    }
  ]
}
```

### Test 3: Chat Recommendations (POST /api/chat)

Using `curl`:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need slides about customer acquisition strategies",
    "limit": 5
  }'
```

Using a tool:
- Method: POST
- URL: `http://localhost:3000/api/chat`
- Headers: `Content-Type: application/json`
- Body (JSON):
```json
{
  "message": "I need slides about customer acquisition strategies",
  "limit": 5
}
```

Expected response:
```json
{
  "answer": "Based on the available decks, I recommend:\n\nDeck: Q4 Marketing Plan, Slides: 12-15\nThese slides cover customer acquisition through digital channels...",
  "references": [
    {
      "deck_id": "uuid",
      "deck_title": "Q4 Marketing Plan",
      "topic_id": "uuid",
      "topic_title": "Customer Acquisition"
    },
    {
      "deck_id": "uuid",
      "deck_title": "Q4 Marketing Plan",
      "slide_id": "uuid",
      "slide_number": 12
    }
  ]
}
```

## 5. Testing Checklist

- [ ] Dependencies installed (`pdf-parse` and `@types/pdf-parse`)
- [ ] All required environment variables set
- [ ] Database schema applied (tables and functions exist)
- [ ] Test upload endpoint with a small PDF (< 25MB, < 100 pages)
- [ ] Test search endpoint with various queries
- [ ] Test chat endpoint with different questions
- [ ] Verify embeddings are being created (check `topics.embedding` and `slides.embedding` in database)

## 6. Troubleshooting

### Error: "OPENAI_API_KEY is required"
- Make sure `OPENAI_API_KEY` is set in your environment

### Error: "SUPABASE_SERVICE_ROLE_KEY is required"
- Use the service role key (not the anon key) from your Supabase dashboard
- This is needed for server-side operations

### Error: "Google Drive authentication required"
- Either set `GOOGLE_SERVICE_ACCOUNT_JSON` (full JSON string)
- Or set both `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY`
- Make sure the service account has access to the Drive folder

### Error: "File size exceeds limit"
- Default limit is 25MB, adjust with `MAX_DECK_SIZE_MB` env var
- Or reduce the PDF file size

### Error: "PDF has X pages, which exceeds the limit"
- Default limit is 100 pages, adjust with `MAX_DECK_PAGES` env var
- Or use a smaller deck for testing

### Semantic search not working
- Verify the `match_topics()` and `match_slides()` functions exist in your database
- Check that embeddings are being generated (non-null in database)
- Ensure pgvector extension is enabled

### PDF extraction issues
- Make sure the PDF is not password-protected
- Try a simpler PDF first to verify the extraction works
- Check that `pdf-parse` is installed correctly

## 7. Next Steps

Once everything is working:
1. Upload several test decks to build up your knowledge base
2. Test semantic search with various queries
3. Use the chat endpoint to get recommendations
4. Adjust model names or limits via environment variables as needed

