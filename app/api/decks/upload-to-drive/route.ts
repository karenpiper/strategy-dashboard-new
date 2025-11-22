import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

// Initialize Google Drive API (same pattern as work-samples)
function getDriveClient() {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!clientEmail || !privateKey || !folderId) {
    throw new Error('Missing Google Drive configuration. Please set GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID environment variables.')
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  return { drive: google.drive({ version: 'v3', auth }), folderId }
}

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large file uploads

/**
 * This endpoint handles file uploads to Google Drive.
 * Uses the same implementation as work-samples upload-to-drive.
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

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type (PDF only)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Validate file size (max 100MB - same as work samples)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      )
    }

    const { drive, folderId } = getDriveClient()

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Google Drive
    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || 'application/pdf',
        body: buffer,
      },
      fields: 'id, name, webViewLink, webContentLink',
    })

    if (!driveResponse.data.id) {
      throw new Error('Failed to upload file to Google Drive')
    }

    // Make the file accessible
    try {
      await drive.permissions.create({
        fileId: driveResponse.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      })
    } catch (permError) {
      console.warn('Failed to set file permissions:', permError)
    }

    // Get the file URL
    const fileUrl = driveResponse.data.webViewLink || `https://drive.google.com/file/d/${driveResponse.data.id}/view`

    return NextResponse.json({
      fileId: driveResponse.data.id,
      fileName: driveResponse.data.name,
      fileUrl: fileUrl,
    })
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error)
    
    if (error.message?.includes('Missing Google Drive configuration')) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to upload file to Google Drive' },
      { status: 500 }
    )
  }
}

