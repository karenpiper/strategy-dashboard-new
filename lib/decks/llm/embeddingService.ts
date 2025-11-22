import { getOpenAIClient } from '../config/openaiClient'
import { getEnv } from '../config/env'

const MAX_EMBEDDING_TEXT_LENGTH = 8000 // Conservative limit for text-embedding-3-small

export async function embedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty for embedding')
  }

  const config = getEnv()
  const openai = getOpenAIClient()

  // Truncate text if needed
  let truncatedText = text
  if (text.length > MAX_EMBEDDING_TEXT_LENGTH) {
    truncatedText = text.substring(0, MAX_EMBEDDING_TEXT_LENGTH)
  }

  try {
    const response = await openai.embeddings.create({
      model: config.openaiEmbeddingModel,
      input: truncatedText,
    })

    const embedding = response.data[0]?.embedding
    if (!embedding || embedding.length !== 1536) {
      throw new Error(`Invalid embedding response: expected 1536 dimensions, got ${embedding?.length || 0}`)
    }

    return embedding
  } catch (error: any) {
    console.error('Error generating embedding:', error)
    throw new Error(`Failed to generate embedding: ${error.message || 'Unknown error'}`)
  }
}

