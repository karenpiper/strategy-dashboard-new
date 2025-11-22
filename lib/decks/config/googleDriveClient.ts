import { google } from 'googleapis'
import { getEnv } from './env'

export interface GoogleDriveClient {
  drive: ReturnType<typeof google.drive>
  folderId: string
}

let driveClient: GoogleDriveClient | null = null

export function getGoogleDriveClient(): GoogleDriveClient {
  if (driveClient) {
    return driveClient
  }

  const config = getEnv()

  if (!config.googleClientEmail || !config.googlePrivateKey) {
    throw new Error('Google Drive authentication credentials are missing')
  }

  const auth = new google.auth.JWT({
    email: config.googleClientEmail,
    key: config.googlePrivateKey,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  driveClient = {
    drive: google.drive({ version: 'v3', auth }),
    folderId: config.googleDriveFolderId,
  }

  return driveClient
}

