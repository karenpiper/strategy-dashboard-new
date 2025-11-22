-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Decks table
CREATE TABLE IF NOT EXISTS decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  title text NOT NULL,
  gdrive_file_id text NOT NULL,
  gdrive_file_url text,
  deck_summary text,
  main_themes text[] DEFAULT '{}',
  primary_audiences text[] DEFAULT '{}',
  use_cases text[] DEFAULT '{}'
);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  topic_title text NOT NULL,
  topic_summary text NOT NULL,
  story_context text NOT NULL,
  topics text[] DEFAULT '{}',
  reuse_suggestions text[] DEFAULT '{}',
  slide_numbers int[] DEFAULT '{}',
  embedding vector(1536)
);

-- Slides table
CREATE TABLE IF NOT EXISTS slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  slide_number int NOT NULL,
  slide_caption text,
  slide_type text,
  topics text[] DEFAULT '{}',
  reusable text,
  embedding vector(1536)
);

-- Indexes for topics
CREATE INDEX IF NOT EXISTS topics_embedding_idx ON topics USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS topics_deck_id_idx ON topics (deck_id);

-- Indexes for slides
CREATE INDEX IF NOT EXISTS slides_embedding_idx ON slides USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS slides_deck_id_idx ON slides (deck_id);
CREATE UNIQUE INDEX IF NOT EXISTS slides_deck_slide_unique ON slides (deck_id, slide_number);

-- Index for decks (optional but useful for search)
CREATE INDEX IF NOT EXISTS decks_title_idx ON decks USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS decks_summary_idx ON decks USING gin(to_tsvector('english', deck_summary));

-- Function for semantic search on topics
CREATE OR REPLACE FUNCTION match_topics(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  deck_id uuid,
  topic_title text,
  topic_summary text,
  story_context text,
  topics text[],
  reuse_suggestions text[],
  slide_numbers int[],
  similarity float,
  deck_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.deck_id,
    t.topic_title,
    t.topic_summary,
    t.story_context,
    t.topics,
    t.reuse_suggestions,
    t.slide_numbers,
    1 - (t.embedding <=> query_embedding) AS similarity,
    d.title AS deck_title
  FROM topics t
  INNER JOIN decks d ON t.deck_id = d.id
  WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function for semantic search on slides
CREATE OR REPLACE FUNCTION match_slides(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  deck_id uuid,
  slide_number int,
  slide_caption text,
  slide_type text,
  topics text[],
  reusable text,
  similarity float,
  deck_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.deck_id,
    s.slide_number,
    s.slide_caption,
    s.slide_type,
    s.topics,
    s.reusable,
    1 - (s.embedding <=> query_embedding) AS similarity,
    d.title AS deck_title
  FROM slides s
  INNER JOIN decks d ON s.deck_id = d.id
  WHERE s.embedding IS NOT NULL
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

