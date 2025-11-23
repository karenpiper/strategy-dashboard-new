import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

// Initialize Google Drive API (supports both service account JSON and individual vars)
function getDriveClient() {
  // Clean folder ID: trim whitespace and remove trailing periods
  let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim()
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is required')
  }
  // Remove trailing periods (common copy-paste issue)
  folderId = folderId.replace(/\.+$/, '')

  // Try service account JSON first, then fallback to individual vars
  let clientEmail: string
  let privateKey: string
  
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson)
      clientEmail = parsed.client_email
      privateKey = parsed.private_key
    } catch (error) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON')
    }
  } else {
    clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || ''
    privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Google Drive authentication required: either GOOGLE_SERVICE_ACCOUNT_JSON or both GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY must be set'
    )
  }

  // For shared drives, we need the full drive scope
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/drive', // Full access (needed for shared drives)
      'https://www.googleapis.com/auth/drive.file', // Files created by app
    ],
  })

  return { drive: google.drive({ version: 'v3', auth }), folderId, auth, clientEmail }
}

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Step 1: Create an empty file in Google Drive to get the file ID,
 * then get a resumable upload URL for that file ID.
 * This two-step approach ensures we have the file ID upfront.
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

    const { drive, folderId, auth, clientEmail } = getDriveClient()

    // Step 1: Create an empty file in Google Drive to get the file ID
    // We don't verify the folder first - if it doesn't exist or we don't have access,
    // the create operation will fail with a clear error message
    console.log('Creating empty file in Google Drive:', { fileName, folderId })
    
    let fileId: string
    try {
      const emptyFile = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        fields: 'id',
        supportsAllDrives: true,
      } as any)

      if (!emptyFile.data.id) {
        throw new Error('Failed to create empty file in Google Drive: no file ID returned')
      }

      fileId = emptyFile.data.id
      console.log('Created empty file with ID:', fileId)
    } catch (createError: any) {
      // Provide helpful error message if folder access is the issue
      if (createError.code === 404 || createError.message?.includes('not found')) {
        throw new Error(`Folder not found or inaccessible: ${folderId}. Please verify the folder ID and ensure the service account (${clientEmail}) has been granted access to this folder in Google Drive.`)
      }
      throw createError
    }

    // Step 3: Get resumable upload URL for this file ID using files.update
    const authClient = await auth.getAccessToken()
    if (!authClient.token) {
      throw new Error('Failed to get access token')
    }

    // Initialize resumable upload for the existing file
    // Use raw fetch to get the Location header with the resumable upload URL
    // For shared drives, we need to include the driveId in the query
    const updateUrl = new URL(`https://www.googleapis.com/upload/drive/v3/files/${fileId}`)
    updateUrl.searchParams.set('uploadType', 'resumable')
    updateUrl.searchParams.set('supportsAllDrives', 'true')
    
    const updateResponse = await fetch(updateUrl.toString(), {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authClient.token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': fileSize.toString(),
      },
      body: JSON.stringify({}), // Empty body, we're just getting the upload URL
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('Failed to create resumable upload URL:', updateResponse.status, errorText)
      throw new Error(`Failed to create resumable upload URL: ${updateResponse.status} ${errorText}`)
    }

    // Get the resumable upload URL from Location header
    const uploadUrl = updateResponse.headers.get('Location')
    if (!uploadUrl) {
      console.error('Update response headers:', Object.fromEntries(updateResponse.headers.entries()))
      console.error('Update response status:', updateResponse.status)
      const errorText = await updateResponse.text()
      console.error('Update response body:', errorText)
      throw new Error('Failed to get resumable upload session URL from Location header')
    }

    console.log('Created resumable upload URL for file ID:', fileId)

    // Return both file ID and upload URL
    return NextResponse.json({
      fileId: fileId,
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

