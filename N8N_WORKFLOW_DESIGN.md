# n8n Workflow Design for Deck Processing

This document describes the n8n workflow structure for processing presentation decks. All LLM and embedding work happens in n8n, not in the Next.js application.

## Workflow Overview

1. **Webhook Trigger** - Receives upload notification from Next.js
2. **HTTP Node** - Calls backend to extract PDF slides
3. **OpenAI Node** - LLM analysis of extracted slides
4. **Transform Nodes** - Prepare topics and slides for embedding
5. **OpenAI Embeddings** - Generate embeddings for topics and slides
6. **HTTP Node** - Submit fully processed data to backend
7. **Error Handling** - Notify on failures

## Node-by-Node Configuration

### 1. Webhook Trigger

**Node Type**: Webhook

**Settings**:
- HTTP Method: POST
- Path: `/webhook/work-sample-uploaded`
- Response Mode: Respond to Webhook

**Expected Input**:
```json
{
  "googleFileId": "1a2b3c4d5e6f7g8h9i0j",
  "originalFilename": "My Presentation.pdf",
  "uploaderUserId": "user-uuid",
  "uploaderEmail": "user@example.com"
}
```

**Output**: Passes through to next node

---

### 2. HTTP Request: Extract Slides

**Node Type**: HTTP Request

**Settings**:
- Method: POST
- URL: `https://your-backend-url/api/internal/decks/extract-slides`
- Headers:
  - `Content-Type: application/json`
  - `X-INTERNAL-TOKEN: {{$env.INTERNAL_API_TOKEN}}`
- Body (JSON):
```json
{
  "googleFileId": "{{$json['googleFileId']}}"
}
```

**Expected Response**:
```json
{
  "googleFileId": "1a2b3c4d5e6f7g8h9i0j",
  "slides": [
    {
      "slide_number": 1,
      "text": "Slide 1 text content..."
    },
    {
      "slide_number": 2,
      "text": "Slide 2 text content..."
    }
  ]
}
```

**Error Handling**: If this fails, go to error notification node

---

### 3. OpenAI: LLM Analysis

**Node Type**: OpenAI (Chat Model)

**Settings**:
- Model: `gpt-4o-mini` (or your preferred model)
- Temperature: 0.3
- Response Format: JSON Object

**System Prompt**:
```
You are analyzing a presentation deck. Extract structured information about the deck, its topics, and individual slides.

Return a JSON object with this exact structure:
{
  "deck": {
    "deck_title": "cleaned up title",
    "deck_summary": "2-4 sentence overview",
    "main_themes": ["theme1", "theme2"],
    "primary_audiences": ["audience1", "audience2"],
    "use_cases": ["use case 1", "use case 2"]
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

**User Prompt**:
```
Analyze this presentation deck:

{{#each $json['slides']}}
Slide {{slide_number}}:
{{text}}

{{/each}}

Extract deck metadata, segment into topics, and label each slide. Return only valid JSON.
```

**Expected Response**:
```json
{
  "deck": { ... },
  "topics": [ ... ],
  "slides": [ ... ]
}
```

**Error Handling**: If this fails, go to error notification node

---

### 4. Transform: Prepare Topics for Embedding

**Node Type**: Code or Set

**Purpose**: Extract topic text for embedding generation

**Code** (if using Code node):
```javascript
const topics = $input.item.json.topics || [];
const topicTexts = topics.map(topic => ({
  topic: topic,
  text: `${topic.topic_title}. ${topic.topic_summary}`
}));

return topicTexts.map(item => ({ json: item }));
```

**Output**: Array of objects with `topic` and `text` fields

---

### 5. OpenAI: Generate Topic Embeddings

**Node Type**: OpenAI (Embeddings)

**Settings**:
- Model: `text-embedding-3-small`
- Input: `{{$json['text']}}`

**Loop**: Process each topic item

**Output**: Add `embedding` array to each topic object

**Code to merge embedding back**:
```javascript
// After embeddings node, merge embedding back into topic
const topic = $json['topic'];
const embedding = $json['embedding']; // From OpenAI node

return {
  json: {
    ...topic,
    embedding: embedding
  }
};
```

---

### 6. Transform: Prepare Slides for Embedding

**Node Type**: Code or Set

**Purpose**: Extract slide text for embedding generation

**Code** (if using Code node):
```javascript
const slides = $input.item.json.slides || [];
const slideTexts = slides.map(slide => ({
  slide: slide,
  text: slide.slide_caption || `Slide ${slide.slide_number}`
}));

return slideTexts.map(item => ({ json: item }));
```

**Output**: Array of objects with `slide` and `text` fields

---

### 7. OpenAI: Generate Slide Embeddings

**Node Type**: OpenAI (Embeddings)

**Settings**:
- Model: `text-embedding-3-small`
- Input: `{{$json['text']}}`

**Loop**: Process each slide item

**Output**: Add `embedding` array to each slide object

**Code to merge embedding back**:
```javascript
// After embeddings node, merge embedding back into slide
const slide = $json['slide'];
const embedding = $json['embedding']; // From OpenAI node

return {
  json: {
    ...slide,
    embedding: embedding
  }
};
```

---

### 8. Transform: Assemble Final Payload

**Node Type**: Code

**Purpose**: Combine all data into final payload format

**Code**:
```javascript
// Get original webhook data
const googleFileId = $('Webhook').item.json.googleFileId;

// Get LLM analysis result
const llmResult = $('OpenAI LLM Analysis').item.json;

// Get topics with embeddings (from loop)
const topicsWithEmbeddings = $('Topics Loop').all();

// Get slides with embeddings (from loop)
const slidesWithEmbeddings = $('Slides Loop').all();

// Assemble final payload
return {
  json: {
    googleFileId: googleFileId,
    deck: llmResult.deck,
    topics: topicsWithEmbeddings.map(item => item.json),
    slides: slidesWithEmbeddings.map(item => item.json)
  }
};
```

---

### 9. HTTP Request: Submit to Backend

**Node Type**: HTTP Request

**Settings**:
- Method: POST
- URL: `https://your-backend-url/api/internal/decks/ingest-ready`
- Headers:
  - `Content-Type: application/json`
  - `X-INTERNAL-TOKEN: {{$env.INTERNAL_API_TOKEN}}`
- Body (JSON):
```json
{
  "googleFileId": "{{$json['googleFileId']}}",
  "deck": {{$json['deck']}},
  "topics": {{$json['topics']}},
  "slides": {{$json['slides']}}
}
```

**Expected Response**:
```json
{
  "status": "ok",
  "deckId": "uuid",
  "googleFileId": "1a2b3c4d5e6f7g8h9i0j"
}
```

**Error Handling**: If this fails, go to error notification node

---

### 10. Error Notification (Slack/Email)

**Node Type**: Slack or Email (configure as needed)

**Trigger**: On any error in the workflow

**Message Template**:
```
Deck processing failed for Google File ID: {{$json['googleFileId']}}

Error: {{$json['error']}}
Step: {{$json['nodeName']}}
```

---

## Environment Variables in n8n

Set these in your n8n environment:

- `INTERNAL_API_TOKEN`: Same value as in your Next.js app
- `OPENAI_API_KEY`: Your OpenAI API key (enterprise key)
- `BACKEND_URL`: Your Next.js backend URL (e.g., `https://your-app.vercel.app`)

## Workflow Execution Flow

```
Webhook Trigger
    ↓
Extract Slides (HTTP)
    ↓ (on error → Error Notification)
LLM Analysis (OpenAI)
    ↓ (on error → Error Notification)
Split Topics & Slides
    ↓
Generate Topic Embeddings (OpenAI, loop)
    ↓
Generate Slide Embeddings (OpenAI, loop)
    ↓
Assemble Payload
    ↓
Submit to Backend (HTTP)
    ↓ (on error → Error Notification)
Success
```

## Testing the Workflow

1. **Test Webhook**: Use Postman or curl to send test data to webhook URL
2. **Test Extract Slides**: Manually call the extract-slides endpoint
3. **Test LLM**: Verify OpenAI API key works and model is accessible
4. **Test Embeddings**: Verify embedding generation works
5. **Test Ingestion**: Verify backend endpoint accepts payload

## Error Scenarios

- **File not found**: Extract slides returns 404 → Notify and stop
- **LLM failure**: OpenAI API error → Notify and stop
- **Embedding failure**: OpenAI API error → Notify and stop
- **Backend failure**: Ingestion endpoint error → Notify (data may be partially processed)

## Performance Considerations

- **Parallel Processing**: Generate topic and slide embeddings in parallel if possible
- **Batch Embeddings**: OpenAI supports batch embedding requests (up to 2048 inputs)
- **Rate Limiting**: n8n can handle rate limiting and retries automatically
- **Timeout**: Set appropriate timeouts for each HTTP request (5 minutes for extraction, 2 minutes for LLM)



