import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import { getEnv } from '@/lib/decks/config/env'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Generate a thumbnail from a PDF file in Google Drive
 * POST /api/work-samples/generate-pdf-thumbnail
 * 
 * Body: { fileId: string, userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { fileId, userId } = body

    if (!fileId) {
      return NextResponse.json(
        { error: 'Google Drive file ID is required' },
        { status: 400 }
      )
    }

    // Set up Google Drive auth
    const config = getEnv()
    const auth = new google.auth.JWT({
      email: config.googleClientEmail,
      key: config.googlePrivateKey,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
      ],
    })

    const drive = google.drive({ version: 'v3', auth })

    // Get thumbnail from Google Drive
    // Google Drive provides thumbnails for PDFs via the thumbnailLink field
    let thumbnailBuffer: Buffer | null = null

    try {
      // Get file metadata including thumbnailLink
      const fileResponse = await drive.files.get({
        fileId: fileId,
        fields: 'thumbnailLink',
        supportsAllDrives: true,
      } as any)

      if (fileResponse.data.thumbnailLink) {
        // Get access token for authenticated request
        const tokenResponse = await auth.getAccessToken()
        const accessToken = tokenResponse.token

        // Fetch the thumbnail image from Google Drive
        // Try with auth first, then without if that fails
        let imageResponse = await fetch(fileResponse.data.thumbnailLink, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
        
        if (!imageResponse.ok) {
          // If auth fails, try without auth (some thumbnails are public)
          imageResponse = await fetch(fileResponse.data.thumbnailLink)
        }
        
        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer()
          thumbnailBuffer = Buffer.from(arrayBuffer)
        }
      }
    } catch (error: any) {
      console.warn('Failed to get thumbnail from Google Drive:', error.message)
    }

    if (!thumbnailBuffer) {
      return NextResponse.json(
        { error: 'Could not generate thumbnail from PDF' },
        { status: 500 }
      )
    }

    // Upload thumbnail to Supabase storage
    const targetUserId = userId || user.id
    const fileName = `pdf-thumbnail-${Date.now()}.png`
    const filePath = `${targetUserId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('work-sample-thumbnails')
      .upload(filePath, thumbnailBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png',
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('work-sample-thumbnails')
      .getPublicUrl(filePath)

    return NextResponse.json({
      thumbnailUrl: publicUrl,
      filePath: filePath,
    })
  } catch (error: any) {
    console.error('Error generating PDF thumbnail:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF thumbnail' },
      { status: 500 }
    )
  }
}

