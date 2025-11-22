import { NextRequest, NextResponse } from 'next/server'
import { getEnv } from '@/lib/decks/config/env'
import { uploadFileToDrive } from '@/lib/decks/services/googleDriveService'
import { extractSlidesFromPdf } from '@/lib/decks/services/pdfExtractionService'
import { generateDeckMetadata, generateTopics, labelSlide } from '@/lib/decks/llm/llmService'
import {
  createDeckRecord,
  createTopicsForDeck,
  createSlidesForDeck,
} from '@/lib/decks/services/ingestionService'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const config = getEnv()

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const titleOverride = formData.get('title') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type (PDF only)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Validate file size
    const maxSizeBytes = config.maxDeckSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        {
          error: `File size exceeds limit of ${config.maxDeckSizeMB}MB. Please use a smaller file.`,
        },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract PDF to check page count
    const slides = await extractSlidesFromPdf(buffer)
    const pageCount = slides.length

    // Validate page count
    if (pageCount > config.maxDeckPages) {
      return NextResponse.json(
        {
          error: `PDF has ${pageCount} pages, which exceeds the limit of ${config.maxDeckPages} pages. Please use a smaller deck.`,
        },
        { status: 400 }
      )
    }

    // Upload to Google Drive
    const driveResult = await uploadFileToDrive({
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      buffer,
    })

    // Build deck text from slides
    const deckText = slides
      .map((slide) => `Slide ${slide.slideNumber}:\n${slide.text}`)
      .join('\n\n')

    // Generate deck metadata
    const deckMetadata = await generateDeckMetadata(deckText)

    // Generate topics
    const topics = await generateTopics(deckText)

    // Label each slide
    const labeledSlides = await Promise.all(
      slides.map(async (slide) => {
        const label = await labelSlide(slide.text)
        return {
          slideNumber: slide.slideNumber,
          slideText: slide.text,
          label,
        }
      })
    )

    // Create deck record
    const deckRecord = await createDeckRecord({
      title: titleOverride || file.name,
      gdriveFileId: driveResult.fileId,
      gdriveFileUrl: driveResult.webViewLink,
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
      slides: labeledSlides,
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

