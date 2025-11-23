import { NextRequest, NextResponse } from 'next/server'
import { getEnv } from '@/lib/decks/config/env'
import { getDriveFileMetadata } from '@/lib/decks/services/googleDriveDownloadService'
import { processDeckWithElvex, processDeckWithElvexChat } from '@/lib/decks/services/elvexService'
import {
  createDeckRecord,
  createTopicsForDeck,
  createSlidesForDeck,
} from '@/lib/decks/services/ingestionService'
import { embedText } from '@/lib/decks/llm/embeddingService'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for processing large PDFs

export async function POST(request: NextRequest) {
  try {
    const config = getEnv()

    // Parse JSON body (expecting Google Drive file ID)
    const body = await request.json()
    const gdriveFileId = body.gdrive_file_id as string | null
    const titleOverride = body.title as string | null

    if (!gdriveFileId) {
      return NextResponse.json(
        { error: 'Google Drive file ID is required. Upload the file to Drive first using /api/decks/upload-to-drive, or provide gdrive_file_id in the request body.' },
        { status: 400 }
      )
    }

    // Get file metadata from Google Drive
    const fileMetadata = await getDriveFileMetadata(gdriveFileId)

    // Validate file type (PDF only)
    if (fileMetadata.mimeType !== 'application/pdf' && !fileMetadata.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Process deck with Elvex assistant
    // Elvex has access to Google Drive and will process the file directly
    let elvexResult
    try {
      // Try assistant API first, fallback to chat API
      elvexResult = await processDeckWithElvex(gdriveFileId, fileMetadata.name)
    } catch (error: any) {
      console.log('Elvex assistant API failed, trying chat API:', error.message)
      elvexResult = await processDeckWithElvexChat(gdriveFileId, fileMetadata.name)
    }

    // Map Elvex results to our format
    const deckMetadata = elvexResult.deck_metadata
    const topics = elvexResult.topics
    const slides = elvexResult.slides.map((slide) => ({
      slideNumber: slide.slide_number,
      slideText: '', // Elvex doesn't return raw text, just metadata
      label: {
        slide_type: slide.slide_type,
        slide_caption: slide.slide_caption,
        topics: slide.topics || [],
        reusable: slide.reusable,
      },
    }))

    // Create deck record
    const deckRecord = await createDeckRecord({
      title: titleOverride || fileMetadata.name,
      gdriveFileId: gdriveFileId,
      gdriveFileUrl: fileMetadata.webViewLink,
      deckMetadata,
    })

    // Create topics
    const topicRecords = await createTopicsForDeck({
      deckId: deckRecord.id,
      topics,
    })

    // Create slides
    const slideRecords = await createSlidesForDeck({
      deckId: deckRecord.id,
      slides: slides,
    })

    return NextResponse.json({
      deck_id: deckRecord.id,
      topics_count: topicRecords.length,
      slides_count: slideRecords.length,
    })
  } catch (error: any) {
    console.error('Error uploading deck:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload and process deck' },
      { status: 500 }
    )
  }
}

