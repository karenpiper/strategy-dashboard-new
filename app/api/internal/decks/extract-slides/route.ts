import { NextRequest, NextResponse } from 'next/server'
import { N8nExtractSlidesRequestSchema } from '@/lib/decks/types/n8nPayloads'
import { getGoogleDriveClient } from '@/lib/decks/config/googleDriveClient'
import { extractSlidesFromPdf } from '@/lib/decks/services/pdfExtractionService'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large PDFs

/**
 * Internal endpoint for n8n to extract slides from a PDF in Google Drive
 * POST /api/internal/decks/extract-slides
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
    const validationResult = N8nExtractSlidesRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { googleFileId } = validationResult.data
    const { drive } = getGoogleDriveClient()

    // Get file metadata to determine type
    const fileMetadata = await drive.files.get({
      fileId: googleFileId,
      fields: 'mimeType, name',
      supportsAllDrives: true,
    } as any)

    if (!fileMetadata.data) {
      return NextResponse.json(
        { error: 'File not found in Google Drive' },
        { status: 404 }
      )
    }

    const mimeType = fileMetadata.data.mimeType || ''

    // Download PDF buffer
    let buffer: Buffer

    if (mimeType === 'application/vnd.google-apps.presentation') {
      // Google Slides: export as PDF
      const exportResponse = await drive.files.export(
        {
          fileId: googleFileId,
          mimeType: 'application/pdf',
        } as any,
        { responseType: 'arraybuffer' }
      )

      if (!exportResponse.data) {
        throw new Error('Failed to export Google Slides as PDF')
      }

      buffer = Buffer.from(exportResponse.data as ArrayBuffer)
    } else if (mimeType === 'application/pdf' || fileMetadata.data.name?.toLowerCase().endsWith('.pdf')) {
      // Regular PDF: download directly
      const downloadResponse = await drive.files.get(
        {
          fileId: googleFileId,
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

    // Map to response format
    const slides = extractedSlides.map((slide) => ({
      slide_number: slide.slideNumber,
      text: slide.text,
    }))

    return NextResponse.json({
      googleFileId,
      slides,
    })
  } catch (error: any) {
    console.error('Error extracting slides:', error)

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'File not found in Google Drive' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to extract slides',
      },
      { status: 500 }
    )
  }
}

