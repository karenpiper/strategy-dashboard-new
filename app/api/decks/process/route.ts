import { NextRequest, NextResponse } from 'next/server'
import { getEnv } from '@/lib/decks/config/env'
import { getDriveFileMetadata } from '@/lib/decks/services/googleDriveDownloadService'
import { extractSlidesFromPdf } from '@/lib/decks/services/pdfExtractionService'
import { getGoogleDriveClient } from '@/lib/decks/config/googleDriveClient'
import {
  createDeckRecord,
  createTopicsForDeck,
  createSlidesForDeck,
} from '@/lib/decks/services/ingestionService'
import {
  generateDeckMetadata,
  generateTopics,
  labelSlide,
  type DeckMetadataJson,
  type TopicJson,
  type SlideLabelJson,
} from '@/lib/decks/llm/llmService'
import { embedText } from '@/lib/decks/llm/embeddingService'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for processing large PDFs

/**
 * Process a deck from Google Drive: extract slides, analyze with LLM, generate embeddings, and store in DB
 * POST /api/decks/process
 * 
 * Body: { gdrive_file_id: string, title?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const gdriveFileId = body.gdrive_file_id as string | null
    const titleOverride = body.title as string | null

    if (!gdriveFileId) {
      return NextResponse.json(
        { error: 'Google Drive file ID is required' },
        { status: 400 }
      )
    }

    // Step 1: Get file metadata from Google Drive
    const fileMetadata = await getDriveFileMetadata(gdriveFileId)

    // Step 2: Download and extract slides from PDF
    const { drive } = getGoogleDriveClient()
    const mimeType = fileMetadata.mimeType || ''

    let buffer: Buffer

    if (mimeType === 'application/vnd.google-apps.presentation') {
      // Google Slides: export as PDF
      const exportResponse = await drive.files.export(
        {
          fileId: gdriveFileId,
          mimeType: 'application/pdf',
        } as any,
        { responseType: 'arraybuffer' }
      )

      if (!exportResponse.data) {
        throw new Error('Failed to export Google Slides as PDF')
      }

      buffer = Buffer.from(exportResponse.data as ArrayBuffer)
    } else if (mimeType === 'application/pdf' || fileMetadata.name.toLowerCase().endsWith('.pdf')) {
      // Regular PDF: download directly
      const downloadResponse = await drive.files.get(
        {
          fileId: gdriveFileId,
          alt: 'media',
          supportsAllDrives: true,
        } as any,
        { responseType: 'arraybuffer' }
      )

      if (!downloadResponse.data) {
        throw new Error('Failed to download PDF from Google Drive')
      }

      buffer = Buffer.from(downloadResponse.data as ArrayBuffer)
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}. Only PDF files and Google Slides are supported.` },
        { status: 400 }
      )
    }

    // Extract slides from PDF
    const extractedSlides = await extractSlidesFromPdf(buffer)

    if (extractedSlides.length === 0) {
      return NextResponse.json(
        { error: 'No slides found in PDF' },
        { status: 400 }
      )
    }

    // Step 3: Combine all slide text for deck-level analysis
    const deckText = extractedSlides
      .map((slide, index) => `Slide ${slide.slideNumber}:\n${slide.text}`)
      .join('\n\n')

    // Step 4: Generate deck metadata and topics using LLM
    console.log('Generating deck metadata and topics...')
    const [deckMetadata, topics] = await Promise.all([
      generateDeckMetadata(deckText),
      generateTopics(deckText),
    ])

    // Step 5: Label each slide using LLM
    console.log(`Labeling ${extractedSlides.length} slides...`)
    const slideLabels: SlideLabelJson[] = []
    
    // Process slides in batches to avoid rate limits
    const batchSize = 5
    for (let i = 0; i < extractedSlides.length; i += batchSize) {
      const batch = extractedSlides.slice(i, i + batchSize)
      const batchLabels = await Promise.all(
        batch.map((slide) => labelSlide(slide.text))
      )
      slideLabels.push(...batchLabels)
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < extractedSlides.length) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // Step 6: Create deck record
    const deckRecord = await createDeckRecord({
      title: titleOverride || deckMetadata.deck_title || fileMetadata.name,
      gdriveFileId: gdriveFileId,
      gdriveFileUrl: fileMetadata.webViewLink,
      deckMetadata,
    })

    // Step 7: Create topics with embeddings (handled by createTopicsForDeck)
    console.log(`Creating ${topics.length} topics with embeddings...`)
    const topicRecords = await createTopicsForDeck({
      deckId: deckRecord.id,
      topics,
    })

    // Step 8: Create slides with embeddings
    console.log(`Creating ${extractedSlides.length} slides with embeddings...`)
    const slides = extractedSlides.map((slide, index) => ({
      slideNumber: slide.slideNumber,
      slideText: slide.text,
      label: slideLabels[index],
    }))

    const slideRecords = await createSlidesForDeck({
      deckId: deckRecord.id,
      slides,
    })

    return NextResponse.json({
      deck_id: deckRecord.id,
      topics_count: topicRecords.length,
      slides_count: slideRecords.length,
      message: 'Deck processed successfully',
    })
  } catch (error: any) {
    console.error('Error processing deck:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process deck' },
      { status: 500 }
    )
  }
}



