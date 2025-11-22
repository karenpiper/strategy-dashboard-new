/**
 * Test script to verify Google Drive authentication and service account setup
 * Run with: npx tsx scripts/test-google-drive-auth.ts
 */

import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

// Load environment variables from multiple possible locations
const envPaths = [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '.env.local'),
  resolve(process.cwd(), '..', '.env'),
]

let envLoaded = false
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath })
    console.log(`📁 Loaded environment from: ${envPath}\n`)
    envLoaded = true
    break
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env.local or .env file found. Using process.env directly.\n')
  // Still try to load from default location
  dotenv.config()
}

async function testGoogleDriveAuth() {
  console.log('🔍 Testing Google Drive Authentication...\n')

  // Step 1: Check environment variables
  console.log('1️⃣ Checking environment variables...')
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim()?.replace(/\.+$/, '')
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY

  if (!folderId) {
    console.error('❌ GOOGLE_DRIVE_FOLDER_ID is not set')
    console.error('\n💡 To test locally:')
    console.error('   1. Create a .env.local file in the project root')
    console.error('   2. Add your environment variables (see DECK_INGESTION_SETUP.md)')
    console.error('   3. Or run: GOOGLE_DRIVE_FOLDER_ID=... GOOGLE_SERVICE_ACCOUNT_JSON=... npx tsx scripts/test-google-drive-auth.ts')
    console.error('\n💡 To test in Vercel:')
    console.error('   Check your Vercel project settings → Environment Variables')
    return
  }
  console.log(`✅ GOOGLE_DRIVE_FOLDER_ID: ${folderId}`)

  let authEmail: string
  let authKey: string

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson)
      authEmail = parsed.client_email
      authKey = parsed.private_key
      console.log(`✅ GOOGLE_SERVICE_ACCOUNT_JSON: Parsed successfully`)
      console.log(`   Service Account Email: ${authEmail}`)
    } catch (error) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON:', error)
      return
    }
  } else if (clientEmail && privateKey) {
    authEmail = clientEmail
    authKey = privateKey.replace(/\\n/g, '\n')
    console.log(`✅ Using individual credentials`)
    console.log(`   Client Email: ${authEmail}`)
  } else {
    console.error('❌ No Google Drive authentication credentials found')
    console.error('   Set either GOOGLE_SERVICE_ACCOUNT_JSON or both GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY')
    return
  }

  // Step 2: Initialize authentication
  console.log('\n2️⃣ Initializing Google Drive authentication...')
  let auth
  try {
    auth = new google.auth.JWT({
      email: authEmail,
      key: authKey,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })
    console.log('✅ Authentication object created')
  } catch (error: any) {
    console.error('❌ Failed to create authentication object:', error.message)
    return
  }

  // Step 3: Get access token
  console.log('\n3️⃣ Getting access token...')
  let token
  try {
    const tokenResponse = await auth.getAccessToken()
    token = tokenResponse.token
    if (!token) {
      throw new Error('No token returned')
    }
    console.log('✅ Access token obtained')
    console.log(`   Token (first 20 chars): ${token.substring(0, 20)}...`)
  } catch (error: any) {
    console.error('❌ Failed to get access token:', error.message)
    console.error('   This usually means the private key is invalid or the service account is misconfigured')
    return
  }

  // Step 4: Initialize Drive API
  console.log('\n4️⃣ Initializing Google Drive API...')
  const drive = google.drive({ version: 'v3', auth })
  console.log('✅ Drive API client initialized')

  // Step 5: Test folder access
  console.log('\n5️⃣ Testing folder access...')
  try {
    const folderInfo = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, permissions',
    })
    
    if (folderInfo.data.mimeType !== 'application/vnd.google-apps.folder') {
      console.error(`❌ The ID "${folderId}" is not a folder. It is: ${folderInfo.data.mimeType}`)
      return
    }
    
    console.log('✅ Folder found and accessible')
    console.log(`   Folder Name: ${folderInfo.data.name}`)
    console.log(`   Folder ID: ${folderInfo.data.id}`)
    
    // Check if service account has access
    const permissions = folderInfo.data.permissions || []
    const hasAccess = permissions.some((p: any) => 
      p.emailAddress === authEmail || 
      p.emailAddress?.toLowerCase() === authEmail.toLowerCase()
    )
    
    if (hasAccess) {
      console.log(`✅ Service account has explicit access to this folder`)
    } else {
      console.log(`⚠️  Service account access not found in folder permissions`)
      console.log(`   This might be okay if the folder is in a shared drive or has domain-wide delegation`)
    }
  } catch (error: any) {
    if (error.code === 404) {
      console.error(`❌ Folder not found: ${folderId}`)
      console.error(`   Please verify the folder ID is correct`)
      console.error(`   Make sure the service account (${authEmail}) has been granted access to this folder`)
      console.error(`   To grant access: Open the folder in Google Drive → Click "Share" → Add ${authEmail} as Editor`)
    } else if (error.code === 403) {
      console.error(`❌ Permission denied accessing folder: ${folderId}`)
      console.error(`   The service account (${authEmail}) does not have access to this folder`)
      console.error(`   To grant access: Open the folder in Google Drive → Click "Share" → Add ${authEmail} as Editor`)
    } else {
      console.error(`❌ Error accessing folder:`, error.message)
    }
    return
  }

  // Step 6: Test file creation
  console.log('\n6️⃣ Testing file creation...')
  try {
    const testFileName = `test-${Date.now()}.txt`
    const testFile = await drive.files.create({
      requestBody: {
        name: testFileName,
        parents: [folderId],
      },
      media: {
        mimeType: 'text/plain',
        body: Buffer.from('This is a test file created by the authentication test script'),
      },
      fields: 'id, name, webViewLink',
    })

    if (!testFile.data.id) {
      throw new Error('No file ID returned')
    }

    console.log('✅ Test file created successfully')
    console.log(`   File ID: ${testFile.data.id}`)
    console.log(`   File Name: ${testFile.data.name}`)
    console.log(`   File URL: ${testFile.data.webViewLink}`)

    // Clean up: Delete the test file
    console.log('\n7️⃣ Cleaning up test file...')
    try {
      await drive.files.delete({
        fileId: testFile.data.id!,
      })
      console.log('✅ Test file deleted')
    } catch (deleteError: any) {
      console.warn(`⚠️  Could not delete test file: ${deleteError.message}`)
      console.warn(`   You may need to manually delete it: ${testFile.data.webViewLink}`)
    }
  } catch (error: any) {
    if (error.code === 404) {
      console.error(`❌ Folder not found when creating file`)
      console.error(`   The folder ID "${folderId}" may be incorrect or the service account doesn't have access`)
    } else if (error.code === 403) {
      console.error(`❌ Permission denied when creating file`)
      console.error(`   The service account (${authEmail}) needs "Editor" access to the folder`)
      console.error(`   To grant access: Open the folder in Google Drive → Click "Share" → Add ${authEmail} as Editor`)
    } else {
      console.error(`❌ Error creating test file:`, error.message)
    }
    return
  }

  console.log('\n✅ All tests passed! Google Drive authentication is working correctly.')
  console.log(`\n📝 Summary:`)
  console.log(`   - Service Account: ${authEmail}`)
  console.log(`   - Folder ID: ${folderId}`)
  console.log(`   - Status: Ready to use`)
}

// Run the test
testGoogleDriveAuth().catch((error) => {
  console.error('\n❌ Unexpected error:', error)
  process.exit(1)
})

