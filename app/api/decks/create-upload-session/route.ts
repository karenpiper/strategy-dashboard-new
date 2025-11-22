import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

// Initialize Google Drive API
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

  return { drive: google.drive({ version: 'v3', auth }), folderId, auth }
}

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Step 1: Create a resumable upload session in Google Drive
 * This creates a resumable upload session and returns the file ID and upload URL
 * The client will then upload the file directly to Google Drive using this URL
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
    const { fileName, mimeType, fileSize } = body

    if (!fileName || !mimeType || !fileSize) {
      return NextResponse.json(
        { error: 'fileName, mimeType, and fileSize are required' },
        { status: 400 }
      )
    }

    const { folderId, auth } = getDriveClient()

    // Get access token
    const authClient = await auth.getAccessToken()
    if (!authClient.token) {
      throw new Error('Failed to get access token')
    }

    // Step 1: Create resumable upload session
    // POST to Google Drive API to initialize resumable upload
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authClient.token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': fileSize.toString(),
        },
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
        }),
      }
    )

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      throw new Error(`Failed to create resumable session: ${initResponse.status} ${errorText}`)
    }

    // Get the resumable upload URL from Location header
    const uploadUrl = initResponse.headers.get('Location')
    if (!uploadUrl) {
      throw new Error('Failed to get resumable upload session URL from Location header')
    }

    // Note: The file ID will be returned after the upload is complete
    // For now, we return the upload URL. The client will upload and get the file ID from the response
    return NextResponse.json({
      uploadUrl: uploadUrl,
    })
  } catch (error: any) {
    console.error('Error creating upload session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create upload session' },
      { status: 500 }
    )
  }
}

