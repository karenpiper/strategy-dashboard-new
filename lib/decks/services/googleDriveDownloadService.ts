import { getGoogleDriveClient } from '../config/googleDriveClient'

/**
 * Download a file from Google Drive by file ID
 */
export async function downloadFileFromDrive(fileId: string): Promise<Buffer> {
  const { drive } = getGoogleDriveClient()

  try {
    const response = await drive.files.get(
      { 
        fileId, 
        alt: 'media',
        supportsAllDrives: true,
      } as any,
      { responseType: 'arraybuffer' }
    )

    if (!response.data) {
      throw new Error('Failed to download file from Google Drive: empty response')
    }

    return Buffer.from(response.data as ArrayBuffer)
  } catch (error: any) {
    console.error('Error downloading from Google Drive:', error)
    throw new Error(`Failed to download file from Google Drive: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Get file metadata from Google Drive
 */
export async function getDriveFileMetadata(fileId: string): Promise<{
  name: string
  mimeType: string
  webViewLink: string
}> {
  const { drive } = getGoogleDriveClient()

  try {
    const response = await drive.files.get({
      fileId,
      fields: 'name, mimeType, webViewLink',
      supportsAllDrives: true,
    } as any)

    if (!response.data) {
      throw new Error('Failed to get file metadata from Google Drive')
    }

    return {
      name: response.data.name || 'unknown.pdf',
      mimeType: response.data.mimeType || 'application/pdf',
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    }
  } catch (error: any) {
    console.error('Error getting Drive file metadata:', error)
    throw new Error(`Failed to get file metadata: ${error.message || 'Unknown error'}`)
  }
}

