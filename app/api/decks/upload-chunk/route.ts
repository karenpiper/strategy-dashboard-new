import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Step 2: Upload file chunk to Google Drive using resumable URL
 * This endpoint proxies chunked uploads to Google Drive to avoid CORS issues
 * Supports resumable upload protocol with Content-Range headers
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
    const uploadUrl = formData.get('uploadUrl') as string
    const chunk = formData.get('chunk') as File | Blob
    const startByte = parseInt(formData.get('startByte') as string, 10)
    const endByte = parseInt(formData.get('endByte') as string, 10)
    const fileSize = parseInt(formData.get('fileSize') as string, 10)
    const mimeType = formData.get('mimeType') as string

    if (!uploadUrl || !chunk || isNaN(startByte) || isNaN(endByte) || isNaN(fileSize)) {
      return NextResponse.json(
        { error: 'uploadUrl, chunk, startByte, endByte, and fileSize are required' },
        { status: 400 }
      )
    }

    // Convert chunk to buffer
    const arrayBuffer = await chunk.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload chunk to Google Drive with Content-Range header
    const headers: HeadersInit = {
      'Content-Type': mimeType || 'application/pdf',
      'Content-Range': `bytes ${startByte}-${endByte}/${fileSize}`,
      'Content-Length': buffer.length.toString(),
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: buffer,
    })

    // Handle different response statuses
    if (uploadResponse.status === 200 || uploadResponse.status === 201) {
      // Upload complete - get file ID from response
      const responseText = await uploadResponse.text()
      let result: any = {}
      
      if (responseText) {
        try {
          result = JSON.parse(responseText)
        } catch (e) {
          console.warn('Failed to parse upload response as JSON:', responseText)
        }
      }

      const fileId = result.id
      if (!fileId) {
        throw new Error(`Upload completed but no file ID in response: ${responseText}`)
      }

      // Make file accessible
      try {
        const { google } = await import('googleapis')
        const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
        let clientEmail: string
        let privateKey: string
        
        if (serviceAccountJson) {
          const parsed = JSON.parse(serviceAccountJson)
          clientEmail = parsed.client_email
          privateKey = parsed.private_key
        } else {
          clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || ''
          privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
        }

        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        })

        const drive = google.drive({ version: 'v3', auth })
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        })
      } catch (permError: any) {
        // Log but don't fail - permissions are optional
        console.warn('Failed to set file permissions:', permError?.message || permError)
      }

      return NextResponse.json({
        success: true,
        complete: true,
        fileId: fileId,
        fileUrl: `https://drive.google.com/file/d/${fileId}/view`,
      })
    }

    if (uploadResponse.status === 308) {
      // Upload in progress - get the range that was successfully uploaded
      const range = uploadResponse.headers.get('Range')
      return NextResponse.json({
        success: true,
        inProgress: true,
        range,
      })
    }

    // Error response
    const errorText = await uploadResponse.text()
    throw new Error(`Google Drive upload failed: ${uploadResponse.status} ${errorText}`)
  } catch (error: any) {
    console.error('Error uploading chunk to Google Drive:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload file to Google Drive' },
      { status: 500 }
    )
  }
}

