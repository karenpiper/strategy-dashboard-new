import { getGoogleDriveClient } from '../config/googleDriveClient'

export interface UploadResult {
  fileId: string
  webViewLink: string
}

/**
 * Upload a file to Google Drive.
 * This function is kept for potential server-side use, but the API route
 * now uses the same direct upload pattern as work-samples.
 */
export async function uploadFileToDrive(input: {
  fileName: string
  mimeType: string
  buffer: Buffer
}): Promise<UploadResult> {
  const { drive, folderId } = getGoogleDriveClient()

  try {
    // Upload file to Google Drive
    // For large files, this will stream the upload
    const driveResponse = await drive.files.create({
      requestBody: {
        name: input.fileName,
        parents: [folderId],
      },
      media: {
        mimeType: input.mimeType,
        body: input.buffer,
      },
      fields: 'id, name, webViewLink, webContentLink',
    })

    if (!driveResponse.data.id) {
      throw new Error('Failed to upload file to Google Drive: no file ID returned')
    }

    const fileId = driveResponse.data.id

    // Make the file accessible (optional - adjust permissions as needed)
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      })
    } catch (permError) {
      // Permission setting is optional, log but don't fail
      console.warn('Failed to set file permissions:', permError)
    }

    // Get the file URL
    const webViewLink =
      driveResponse.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`

    return {
      fileId,
      webViewLink,
    }
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error)
    throw new Error(`Failed to upload file to Google Drive: ${error.message || 'Unknown error'}`)
  }
}

