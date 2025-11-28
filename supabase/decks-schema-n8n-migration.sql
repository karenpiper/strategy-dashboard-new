-- Migration to add unique constraint on gdrive_file_id and verify schema for n8n integration

-- Add UNIQUE constraint on decks.gdrive_file_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'decks_gdrive_file_id_unique'
  ) THEN
    ALTER TABLE decks ADD CONSTRAINT decks_gdrive_file_id_unique UNIQUE (gdrive_file_id);
  END IF;
END $$;

-- Verify reusable is text type (should already be text, but ensure it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'slides' 
    AND column_name = 'reusable' 
    AND data_type != 'text'
  ) THEN
    ALTER TABLE slides ALTER COLUMN reusable TYPE text;
  END IF;
END $$;

-- Verify pgvector indexes exist
CREATE INDEX IF NOT EXISTS topics_embedding_idx ON topics USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS slides_embedding_idx ON slides USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);







