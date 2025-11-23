import { NextRequest, NextResponse } from 'next/server'
import { N8nIngestPayloadSchema } from '@/lib/decks/types/n8nPayloads'
import { ingestDeckFromN8n } from '@/lib/decks/services/ingestionService'

export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute should be enough for DB operations

/**
 * Internal endpoint for n8n to submit fully processed deck data
 * POST /api/internal/decks/ingest-ready
 */
export async function POST(request: NextRequest) {
  try {
    // Validate internal token
    const internalToken = request.headers.get('X-INTERNAL-TOKEN')
    const expectedToken = process.env.INTERNAL_API_TOKEN

    if (!expectedToken) {
      console.error('INTERNAL_API_TOKEN environment variable is not set')
      return NextResponse.json(
        { error: 'Internal API token not configured' },
        { status: 500 }
      )
    }

    if (!internalToken || internalToken !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing X-INTERNAL-TOKEN header' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = N8nIngestPayloadSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const payload = validationResult.data

    // Validate embedding dimensions
    for (const topic of payload.topics) {
      if (topic.embedding.length !== 1536) {
        return NextResponse.json(
          {
            error: `Invalid embedding dimension for topic "${topic.topic_title}": expected 1536, got ${topic.embedding.length}`,
          },
          { status: 400 }
        )
      }
    }

    for (const slide of payload.slides) {
      if (slide.embedding.length !== 1536) {
        return NextResponse.json(
          {
            error: `Invalid embedding dimension for slide ${slide.slide_number}: expected 1536, got ${slide.embedding.length}`,
          },
          { status: 400 }
        )
      }
    }

    // Ingest deck (handles transaction internally)
    const result = await ingestDeckFromN8n(payload)

    return NextResponse.json({
      status: 'ok',
      deckId: result.deckId,
      googleFileId: result.googleFileId,
    })
  } catch (error: any) {
    console.error('Error ingesting deck from n8n:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to ingest deck',
      },
      { status: 500 }
    )
  }
}



