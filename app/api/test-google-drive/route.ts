import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Test endpoint to verify Google Drive authentication and service account setup
 * This uses the same code as the actual upload routes, so it tests the real configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

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

    const results: any = {
      step1_config: { status: 'checking', message: '' },
      step2_auth: { status: 'checking', message: '' },
      step3_token: { status: 'checking', message: '' },
      step4_folder: { status: 'checking', message: '' },
      step5_create: { status: 'checking', message: '' },
      step6_upload_url: { status: 'checking', message: '' },
    }

    // Step 1: Check configuration
    try {
      const { drive, folderId: initialFolderId, auth, clientEmail } = getDriveClient()
      let folderId = initialFolderId
      results.step1_config = {
        status: 'success',
        message: 'Configuration loaded',
        data: {
          folderId: folderId.substring(0, 10) + '...',
          serviceAccount: clientEmail,
        },
      }

      // Step 2: Test authentication
      results.step2_auth = {
        status: 'success',
        message: 'Authentication object created',
      }

      // Step 3: Get access token
      try {
        const tokenResponse = await auth.getAccessToken()
        if (!tokenResponse.token) {
          throw new Error('No token returned')
        }
        results.step3_token = {
          status: 'success',
          message: 'Access token obtained',
          data: {
            tokenPreview: tokenResponse.token.substring(0, 20) + '...',
          },
        }
      } catch (error: any) {
        results.step3_token = {
          status: 'error',
          message: `Failed to get access token: ${error.message}`,
        }
        return NextResponse.json({ results }, { status: 500 })
      }

      // Step 4: Test folder access
      // First, let's see what folders the service account can access
      let folderListInfo: any = null
      try {
        console.log('Attempting to list accessible files/folders...')
        const listResponse = await drive.files.list({
          q: "mimeType='application/vnd.google-apps.folder'",
          fields: 'files(id, name)',
          pageSize: 20,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        } as any)
        
        folderListInfo = {
          status: 'success',
          message: `Service account can see ${listResponse.data.files?.length || 0} folders`,
          accessibleFolders: listResponse.data.files?.map((f: any) => ({
            id: f.id,
            name: f.name,
            matches: f.id === folderId || f.id === folderId.replace(/\.+$/, ''),
          })) || [],
          targetFolderId: folderId,
        }
      } catch (listError: any) {
        folderListInfo = {
          status: 'error',
          message: `Could not list folders: ${listError.message}`,
          errorCode: listError.code,
        }
      }

      // Now try to access the specific folder
      try {
        // Try with supportsAllDrives in case it's a shared drive
        const folderInfo = await drive.files.get({
          fileId: folderId,
          fields: 'id, name, mimeType',
          supportsAllDrives: true,
        } as any)

        if (folderInfo.data.mimeType !== 'application/vnd.google-apps.folder') {
          results.step4_folder = {
            status: 'error',
            message: `The ID is not a folder. It is: ${folderInfo.data.mimeType}`,
          }
          return NextResponse.json({ results }, { status: 500 })
        }

        results.step4_folder = {
          status: 'success',
          message: 'Folder found and accessible',
          data: {
            folderName: folderInfo.data.name,
            folderId: folderInfo.data.id,
            folderListInfo: folderListInfo,
          },
        }
      } catch (error: any) {
        // Try again without supportsAllDrives to see if that helps
        if (error.code === 404) {
          try {
            const folderInfoRetry = await drive.files.get({
              fileId: folderId,
              fields: 'id, name, mimeType',
            })
            // If this works, update the result
            if (folderInfoRetry.data.mimeType === 'application/vnd.google-apps.folder') {
              results.step4_folder = {
                status: 'success',
                message: 'Folder found and accessible (without supportsAllDrives)',
                data: {
                  folderName: folderInfoRetry.data.name,
                  folderId: folderInfoRetry.data.id,
                },
              }
            }
          } catch (retryError: any) {
            // Still 404 - check if folder ID has trailing period issue
            const cleanFolderId = folderId.replace(/\.+$/, '')
            let finalError = retryError
            
            // Try with cleaned folder ID if different
            if (cleanFolderId !== folderId) {
              try {
                const folderInfoClean = await drive.files.get({
                  fileId: cleanFolderId,
                  fields: 'id, name, mimeType',
                  supportsAllDrives: true,
                } as any)
                results.step4_folder = {
                  status: 'success',
                  message: 'Folder found after removing trailing period from folder ID',
                  data: {
                    folderName: folderInfoClean.data.name,
                    folderId: folderInfoClean.data.id,
                    originalFolderId: folderId,
                    cleanedFolderId: cleanFolderId,
                  },
                }
                // Update folderId for subsequent steps
                folderId = cleanFolderId
              } catch (cleanError: any) {
                finalError = cleanError
              }
            }
            
            if (finalError.code === 404) {
              // Still 404, provide detailed instructions
              results.step4_folder = {
                status: 'error',
                message: `Folder not found: ${folderId}`,
                details: {
                  folderId: folderId,
                  cleanedFolderId: cleanFolderId,
                  serviceAccount: clientEmail,
                  errorCode: finalError.code,
                  errorMessage: finalError.message,
                  note: 'The service account cannot see this folder. It needs to be explicitly shared.',
                  folderListInfo: folderListInfo, // Include what folders the service account CAN see
                },
                fix: [
                  `1. Verify the folder ID is correct: ${folderId}`,
                  `2. Open the folder in Google Drive: https://drive.google.com/drive/folders/${cleanFolderId}`,
                  `3. Click "Share" button (top right)`,
                  `4. Add this EXACT email: ${clientEmail}`,
                  `5. Give it "Editor" permissions (not Viewer)`,
                  `6. Make sure to click "Send" or "Done"`,
                  `7. Wait 10-30 seconds for permissions to propagate`,
                  `8. Try the test again`,
                  ``,
                  `Note: If this is a shared drive (Google Workspace), you may need to:`,
                  `- Add the service account to the shared drive's members (not just the folder)`,
                  `- Go to the shared drive settings → Members → Add ${clientEmail}`,
                  `- Give it "Content Manager" or "Manager" role`,
                  `- Or use domain-wide delegation (more complex setup)`,
                ],
              }
              return NextResponse.json({ results }, { status: 500 })
            }
          }
        } else if (error.code === 403) {
          results.step4_folder = {
            status: 'error',
            message: `Permission denied accessing folder`,
            fix: [
              `The service account (${clientEmail}) does not have access to this folder.`,
              `To grant access:`,
              `1. Open the folder in Google Drive: https://drive.google.com/drive/folders/${folderId}`,
              `2. Click "Share" button`,
              `3. Add this email: ${clientEmail}`,
              `4. Give it "Editor" permissions`,
              `5. Click "Send" or "Done"`,
            ],
          }
          return NextResponse.json({ results }, { status: 500 })
        } else {
          results.step4_folder = {
            status: 'error',
            message: `Error accessing folder: ${error.message}`,
            details: {
              errorCode: error.code,
              errorMessage: error.message,
            },
          }
          return NextResponse.json({ results }, { status: 500 })
        }
      }

      // Step 5: Test file creation
      try {
        const testFileName = `test-${Date.now()}.txt`
        const emptyFile = await drive.files.create({
          requestBody: {
            name: testFileName,
            parents: [folderId],
          },
          fields: 'id',
          supportsAllDrives: true,
        } as any)

        if (!emptyFile.data.id) {
          throw new Error('No file ID returned')
        }

        const fileId = emptyFile.data.id
        results.step5_create = {
          status: 'success',
          message: 'Test file created successfully',
          data: {
            fileId,
            fileName: testFileName,
          },
        }

        // Step 6: Test resumable upload URL
        try {
          const tokenResponse = await auth.getAccessToken()
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

          results.step6_upload_url = {
            status: 'success',
            message: 'Resumable upload URL obtained',
            data: {
              uploadUrlPreview: uploadUrl.substring(0, 80) + '...',
            },
          }

          // Clean up test file
          await drive.files.delete({ fileId })
        } catch (error: any) {
          results.step6_upload_url = {
            status: 'error',
            message: `Failed to get resumable upload URL: ${error.message}`,
          }
          // Still try to clean up
          try {
            await drive.files.delete({ fileId: emptyFile.data.id! })
          } catch {}
        }
      } catch (error: any) {
        if (error.code === 404) {
          results.step5_create = {
            status: 'error',
            message: 'Folder not found when creating file',
            fix: `The folder ID "${folderId}" may be incorrect or the service account doesn't have access`,
          }
        } else if (error.code === 403) {
          results.step5_create = {
            status: 'error',
            message: 'Permission denied when creating file',
            fix: `The service account (${clientEmail}) needs "Editor" access to the folder. To grant access: Open the folder in Google Drive → Click "Share" → Add ${clientEmail} as Editor`,
          }
        } else {
          results.step5_create = {
            status: 'error',
            message: `Error creating test file: ${error.message}`,
          }
        }
        return NextResponse.json({ results }, { status: 500 })
      }
    } catch (error: any) {
      results.step1_config = {
        status: 'error',
        message: error.message || 'Failed to load configuration',
      }
      return NextResponse.json({ results }, { status: 500 })
    }

    // All tests passed
    return NextResponse.json({
      success: true,
      message: 'All Google Drive tests passed! Your setup is working correctly.',
      results,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unexpected error',
        results: {},
      },
      { status: 500 }
    )
  }
}

