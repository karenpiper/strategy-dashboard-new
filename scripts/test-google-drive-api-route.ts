/**
 * Test the Google Drive API route directly
 * This tests the actual API endpoint that's used in production
 * Run with: npx tsx scripts/test-google-drive-api-route.ts
 */

import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

// Load environment variables
const envPaths = [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
]

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}
dotenv.config() // Also try default

// Replicate the exact getDriveClient function from create-upload-session/route.ts
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
    clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || ''
    privateKey = (process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Google Drive authentication required: either GOOGLE_SERVICE_ACCOUNT_JSON or both GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY must be set'
    )
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  return { drive: google.drive({ version: 'v3', auth }), folderId, auth, clientEmail }
}

async function test() {
  console.log('🔍 Testing Google Drive API (using same code as create-upload-session route)...\n')

  try {
    const { drive, folderId, auth, clientEmail } = getDriveClient()
    
    console.log(`✅ Configuration loaded`)
    console.log(`   Service Account: ${clientEmail}`)
    console.log(`   Folder ID: ${folderId}\n`)

    // Test 1: Get access token
    console.log('1️⃣ Testing access token...')
    const tokenResponse = await auth.getAccessToken()
    if (!tokenResponse.token) {
      throw new Error('Failed to get access token')
    }
    console.log('✅ Access token obtained\n')

    // Test 2: Try to create a file (this is what the route does)
    console.log('2️⃣ Testing file creation (same as create-upload-session route)...')
    const testFileName = `test-${Date.now()}.txt`
    
    const emptyFile = await drive.files.create({
      requestBody: {
        name: testFileName,
        parents: [folderId],
      },
      fields: 'id',
    })

    if (!emptyFile.data.id) {
      throw new Error('Failed to create empty file: no file ID returned')
    }

    const fileId = emptyFile.data.id
    console.log(`✅ File created successfully`)
    console.log(`   File ID: ${fileId}\n`)

    // Test 3: Get resumable upload URL
    console.log('3️⃣ Testing resumable upload URL generation...')
    const updateResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=resumable`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${tokenResponse.token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'text/plain',
          'X-Upload-Content-Length': '10',
        },
        body: JSON.stringify({}),
      }
    )

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      throw new Error(`Failed to create resumable upload URL: ${updateResponse.status} ${errorText}`)
    }

    const uploadUrl = updateResponse.headers.get('Location')
    if (!uploadUrl) {
      throw new Error('No Location header in response')
    }

    console.log(`✅ Resumable upload URL obtained`)
    console.log(`   URL: ${uploadUrl.substring(0, 80)}...\n`)

    // Clean up
    console.log('4️⃣ Cleaning up test file...')
    await drive.files.delete({ fileId })
    console.log('✅ Test file deleted\n')

    console.log('✅ All tests passed! Your Google Drive setup is working correctly.')
    console.log(`\n📝 Summary:`)
    console.log(`   - Service Account: ${clientEmail}`)
    console.log(`   - Folder ID: ${folderId}`)
    console.log(`   - Status: ✅ Ready for production`)

  } catch (error: any) {
    console.error('\n❌ Test failed!\n')
    
    if (error.message?.includes('GOOGLE_DRIVE_FOLDER_ID is required')) {
      console.error('Missing environment variable: GOOGLE_DRIVE_FOLDER_ID')
    } else if (error.message?.includes('authentication required')) {
      console.error('Missing authentication credentials')
      console.error('Set either GOOGLE_SERVICE_ACCOUNT_JSON or both GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY')
    } else if (error.code === 404 || error.message?.includes('not found')) {
      console.error(`❌ Folder not found: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`)
      console.error(`\n💡 To fix:`)
      console.error(`   1. Verify the folder ID is correct`)
      console.error(`   2. Open the folder in Google Drive`)
      console.error(`   3. Click "Share"`)
      console.error(`   4. Add the service account email: ${error.clientEmail || 'your-service-account@...'}`)
      console.error(`   5. Give it "Editor" permissions`)
    } else if (error.code === 403) {
      console.error(`❌ Permission denied`)
      console.error(`\n💡 The service account doesn't have access to the folder`)
      console.error(`   1. Open the folder in Google Drive`)
      console.error(`   2. Click "Share"`)
      console.error(`   3. Add the service account email`)
      console.error(`   4. Give it "Editor" permissions`)
    } else {
      console.error(`Error: ${error.message}`)
      if (error.stack) {
        console.error('\nStack trace:')
        console.error(error.stack)
      }
    }
    
    process.exit(1)
  }
}

test()

