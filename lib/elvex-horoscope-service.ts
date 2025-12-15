/**
 * Elvex Horoscope Service
 * 
 * Uses Elvex API to generate horoscope text, and Airtable for image generation.
 * 
 * Workflow:
 * 1. Transform horoscope text using Elvex Assistant API
 * 2. Generate image using Airtable (separate operation)
 * 
 * Setup required:
 * 1. Elvex account and API key
 * 2. Elvex Assistant for horoscope text transformation (or reuse deck talk assistant)
 * 3. Airtable setup for image generation (see generateImageViaAirtable function)
 * 4. Environment variables:
 *    - ELVEX_API_KEY: Your Elvex API key
 *    - ELVEX_HOROSCOPE_ASSISTANT_ID: Assistant ID (or use ELVEX_ASSISTANT_ID)
 *    - ELVEX_HOROSCOPE_VERSION: Assistant version (or use ELVEX_VERSION)
 *    - ELVEX_BASE_URL: Elvex API base URL (optional, defaults to https://api.elvex.ai)
 *    - AIRTABLE_API_KEY: Your Airtable API key (for image generation)
 *    - AIRTABLE_IMAGE_BASE_ID: Airtable base ID for image generation
 *    - AIRTABLE_IMAGE_TABLE_NAME: Airtable table name (default: "Image Generation")
 */

interface HoroscopeGenerationRequest {
  cafeAstrologyText: string
  starSign: string
  imagePrompt: string // Required - built by route using buildHoroscopePrompt()
  userId: string
  date: string
  timezone?: string // User's timezone for Airtable Created At field
  slots?: any
  reasoning?: any
}

interface HoroscopeGenerationResponse {
  horoscope: string
  dos: string[]
  donts: string[]
  character_name?: string | null
  prompt: string
  slots: any
  reasoning: any
}

/**
 * Get Elvex configuration from environment variables
 */
function getElvexConfig() {
  const apiKey = process.env.ELVEX_API_KEY
  const assistantId = process.env.ELVEX_HOROSCOPE_ASSISTANT_ID || process.env.ELVEX_ASSISTANT_ID
  const version = process.env.ELVEX_HOROSCOPE_VERSION || process.env.ELVEX_VERSION
  const baseUrl = process.env.ELVEX_BASE_URL || 'https://api.elvex.ai'

  // Debug: Log what we're reading (without exposing full API key)
  console.log('🔍 Reading Elvex config from env:', {
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
    ELVEX_HOROSCOPE_ASSISTANT_ID: process.env.ELVEX_HOROSCOPE_ASSISTANT_ID || 'not set',
    ELVEX_ASSISTANT_ID: process.env.ELVEX_ASSISTANT_ID || 'not set',
    selectedAssistantId: assistantId || 'not set',
    ELVEX_HOROSCOPE_VERSION: process.env.ELVEX_HOROSCOPE_VERSION || 'not set',
    ELVEX_VERSION: process.env.ELVEX_VERSION || 'not set',
    selectedVersion: version || 'not set',
    baseUrl,
  })

  if (!apiKey) {
    throw new Error('ELVEX_API_KEY is not set. Please set it in environment variables.')
  }

  if (!assistantId) {
    throw new Error('ELVEX_HOROSCOPE_ASSISTANT_ID or ELVEX_ASSISTANT_ID is not set. Please set it in environment variables.')
  }

  if (!version) {
    throw new Error('ELVEX_HOROSCOPE_VERSION or ELVEX_VERSION is not set. Please set it in environment variables.')
  }

  return { apiKey, assistantId, version, baseUrl }
}

/**
 * Transform horoscope text to Co-Star style using Elvex API
 */
async function transformHoroscopeWithElvex(
  cafeAstrologyText: string,
  starSign: string
): Promise<{ horoscope: string; dos: string[]; donts: string[] }> {
  console.log('🔄 Transforming horoscope to Co-Star style using Elvex API...')
  
  const config = getElvexConfig()
  console.log('🔍 Elvex config:', {
    assistantId: config.assistantId,
    version: config.version,
    baseUrl: config.baseUrl,
    apiKeyPrefix: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'not set'
  })

  const prompt = `Transform this horoscope from Cafe Astrology into the irreverent, silly style of Co-Star. Make it witty, slightly sarcastic, and fun. Keep the core meaning but make it more casual and entertaining.

Original horoscope for ${starSign}:
${cafeAstrologyText}

Return a JSON object with this exact structure:
{
  "horoscope": "An irreverent, expanded version of the horoscope in Co-Star's style. Make it approximately 150 words. Keep it witty, casual, and entertaining while expanding on the themes from the original. Break it into multiple paragraphs for readability.",
  "dos": ["Do thing 1", "Do thing 2", "Do thing 3"],
  "donts": ["Don't thing 1", "Don't thing 2", "Don't thing 3"]
}

Make the do's and don'ts silly, specific, and related to the horoscope content. They should be funny and slightly absurd but still relevant.`

  try {
    // Use Elvex Assistant API (same as deck talk)
    // Try the configured version first, then try version 2 as fallback (since deck talk uses version 2)
    const versionsToTry = [config.version, '2'].filter((v, i, arr) => arr.indexOf(v) === i) // Remove duplicates
    
    let lastError: Error | null = null
    
    for (const version of versionsToTry) {
      const elvexUrl = `${config.baseUrl}/v0/apps/${config.assistantId}/versions/${version}/text/generate`
      
      console.log('🔍 Calling Elvex Assistant API:', {
        url: elvexUrl,
        assistantId: config.assistantId,
        version: version,
        attempt: versionsToTry.indexOf(version) + 1,
        totalAttempts: versionsToTry.length
      })
      
      // Build the full prompt with system instructions
      const fullPrompt = `You are a witty horoscope transformer. You take traditional horoscopes and make them irreverent and fun in the style of Co-Star. You always return valid JSON.

${prompt}`

      // Add timeout to prevent hanging (30 seconds for text generation - reduced from 60)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.log(`⏱️ Request timeout after 30 seconds for version ${version}`)
      }, 30000)

      try {
        const response = await fetch(elvexUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            prompt: fullPrompt,
          }),
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)

        if (response.ok) {
          // Success! Use this version
          console.log(`✅ Successfully connected with version ${version}`)
          
          // Read response body once
          const responseText = await response.text()
          console.log('📥 Elvex API response (first 500 chars):', responseText.substring(0, 500))
          
          let result
          try {
            result = JSON.parse(responseText)
          } catch (parseError: any) {
            console.error('❌ Failed to parse Elvex response as JSON:', parseError)
            console.error('   Response text:', responseText.substring(0, 1000))
            throw new Error(`Elvex API returned invalid JSON: ${parseError.message}`)
          }
          
          console.log('📥 Elvex API parsed result keys:', Object.keys(result))
          console.log('📥 Elvex API result structure:', {
            hasData: !!result.data,
            hasResponse: !!result.response,
            hasText: !!result.text,
            hasContent: !!result.content,
            dataKeys: result.data ? Object.keys(result.data) : null,
          })
          
          // Elvex Assistant API returns: { data: { response: "..." } }
          const content = result.data?.response || result.response || result.text || result.content

          if (!content) {
            console.error('❌ Empty content from Elvex response')
            console.error('   Full result:', JSON.stringify(result, null, 2))
            throw new Error('Empty response from Elvex')
          }

          console.log('📥 Elvex content type:', typeof content)
          console.log('📥 Elvex content (first 500 chars):', typeof content === 'string' ? content.substring(0, 500) : JSON.stringify(content).substring(0, 500))

          // Parse JSON response (might be wrapped in text or already be JSON)
          let parsed
          try {
            parsed = typeof content === 'string' ? JSON.parse(content) : content
          } catch (e: any) {
            console.error('❌ Failed to parse content as JSON:', e.message)
            console.error('   Content type:', typeof content)
            console.error('   Content (first 1000 chars):', typeof content === 'string' ? content.substring(0, 1000) : JSON.stringify(content).substring(0, 1000))
            // If not JSON, try to extract JSON from the response
            const jsonMatch = typeof content === 'string' ? content.match(/\{[\s\S]*\}/) : null
            if (jsonMatch) {
              console.log('   Attempting to extract JSON from content...')
              parsed = JSON.parse(jsonMatch[0])
            } else {
              throw new Error(`Could not parse JSON from Elvex response: ${e.message}`)
            }
          }
          
          console.log('📥 Parsed result keys:', Object.keys(parsed))
          console.log('📥 Parsed result structure:', {
            hasHoroscope: !!parsed.horoscope,
            hasDos: Array.isArray(parsed.dos),
            hasDonts: Array.isArray(parsed.donts),
            dosCount: Array.isArray(parsed.dos) ? parsed.dos.length : 0,
            dontsCount: Array.isArray(parsed.donts) ? parsed.donts.length : 0,
          })
          
          if (!parsed.horoscope || !Array.isArray(parsed.dos) || !Array.isArray(parsed.donts)) {
            console.error('❌ Invalid response format from Elvex')
            console.error('   Parsed result:', JSON.stringify(parsed, null, 2))
            throw new Error(`Invalid response format from Elvex. Expected horoscope (string), dos (array), donts (array). Got: ${JSON.stringify(Object.keys(parsed))}`)
          }

          console.log('✅ Successfully transformed horoscope with Elvex')
          return {
            horoscope: parsed.horoscope,
            dos: parsed.dos,
            donts: parsed.donts,
          }
        } else {
          // Not successful, try next version
          const errorText = await response.text()
          lastError = new Error(`Elvex API call failed with version ${version}: ${response.status} ${errorText}`)
          console.log(`⚠️ Version ${version} failed, trying next...`)
          
          // If this was the last version to try, throw the error
          if (version === versionsToTry[versionsToTry.length - 1]) {
            if (response.status === 404) {
              console.error('❌ 404 Error Details:', {
                assistantId: config.assistantId,
                triedVersions: versionsToTry,
                url: elvexUrl,
                suggestion: 'Check: 1) API key has permission to access this assistant, 2) Assistant is published, 3) Version exists'
              })
              throw new Error(`${lastError.message}\n\nTroubleshooting:\n- **Most common:** Verify the API key has been granted access to assistant "${config.assistantId}" in Elvex dashboard:\n  → Go to assistant Settings > Security and Permissions\n  → Add the API key name as an Editor\n  → Click "Save & Publish"\n- Verify assistant ID "${config.assistantId}" exists and is correct\n- Check that one of these versions exists and is published: ${versionsToTry.join(', ')}\n- Ensure the assistant is active/published after granting API key access`)
            }
            throw lastError
          }
        }
      } catch (error: any) {
        clearTimeout(timeoutId)
        if (error.name === 'AbortError') {
          lastError = new Error(`Request timeout: Elvex API call took longer than 30 seconds for version ${version}`)
          console.log(`⏱️ Version ${version} timed out, trying next...`)
          if (version === versionsToTry[versionsToTry.length - 1]) {
            throw lastError
          }
        } else {
          // Log other errors but continue to next version
          console.error(`❌ Error calling Elvex API version ${version}:`, error.message)
          lastError = error
          if (version === versionsToTry[versionsToTry.length - 1]) {
            throw error
          }
        }
      }
    }
    
    // Should never reach here, but just in case
    throw lastError || new Error('Failed to connect to Elvex API')
  } catch (error: any) {
    console.error('❌ Error transforming horoscope with Elvex:', error)
    throw new Error(`Failed to transform horoscope with Elvex: ${error.message || 'Unknown error'}`)
  }
}

/**
 * NOTE: Image prompt is built by the route using buildHoroscopePrompt() with slot-based logic.
 * The prompt format matches the n8n workflow, for example:
 * 
 * "Rubber Hose Cartoon. Marker Illustration. Top Down View of Karen Piper, a co-head, 
 * as hero in an rpg living neon sign flying through the air. They are in cozy library 
 * at stormy afternoon. sci fi high tech mood, warm oranges and reds palette, soft natural 
 * lighting. sharp focus on the face, avatar friendly portrait ratio, clean, simple background, 
 * no text in the image."
 * 
 * The route builds the prompt and passes it as imagePrompt to this service.
 */

/**
 * Generate image using Airtable
 * 
 * Creates a record in Airtable with the image prompt, which triggers an Airtable
 * Automation/Script that generates the image using Airtable AI, then polls for the result.
 */
/**
 * Format a date in a specific timezone as ISO string
 * @param timezone - IANA timezone identifier (e.g., "America/New_York")
 * @returns ISO string formatted in the specified timezone
 * 
 * Note: This formats the current time in the user's timezone.
 * Airtable date fields should be configured with the same timezone
 * to ensure correct interpretation.
 */
function formatDateInTimezone(timezone: string): string {
  const now = new Date()
  
  // Format date parts in the specified timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  // Get the date/time parts in the timezone
  const parts = formatter.formatToParts(now)
  const year = parts.find(p => p.type === 'year')?.value || ''
  const month = parts.find(p => p.type === 'month')?.value || ''
  const day = parts.find(p => p.type === 'day')?.value || ''
  const hour = parts.find(p => p.type === 'hour')?.value || ''
  const minute = parts.find(p => p.type === 'minute')?.value || ''
  const second = parts.find(p => p.type === 'second')?.value || ''
  
  // Return ISO-like format (YYYY-MM-DDTHH:mm:ss)
  // Airtable will interpret this based on the field's timezone setting
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

export async function generateImageViaAirtable(prompt: string, timezone?: string, userId?: string, userEmail?: string): Promise<{ imageUrl: string; caption?: string | null }> {
  console.log('🚀 ========== STARTING AIRTABLE IMAGE GENERATION ==========')
  console.log('🖼️ Generating image via Airtable...')
  console.log('📥 FUNCTION CALLED - generateImageViaAirtable() invoked')
  console.log('   Prompt parameter received:', prompt ? 'YES' : 'NO')
  console.log('   Prompt type:', typeof prompt)
  console.log('   Prompt length:', prompt?.length || 0)
  console.log('📝 PROMPT RECEIVED:')
  console.log('   Prompt length:', prompt.length)
  console.log('   Prompt preview (first 200 chars):', prompt.substring(0, 200))
  console.log('   Prompt preview (last 200 chars):', prompt.substring(Math.max(0, prompt.length - 200)))
  console.log('   Full prompt:', prompt)
  console.log('📋 Airtable configuration check:')
  console.log('   AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? `${process.env.AIRTABLE_API_KEY.substring(0, 8)}...` : 'NOT SET')
  console.log('   AIRTABLE_IMAGE_BASE_ID:', process.env.AIRTABLE_IMAGE_BASE_ID || 'NOT SET')
  console.log('   AIRTABLE_AI_BASE_ID:', process.env.AIRTABLE_AI_BASE_ID || 'NOT SET')
  console.log('   AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID || 'NOT SET')
  console.log('   AIRTABLE_IMAGE_TABLE_NAME:', process.env.AIRTABLE_IMAGE_TABLE_NAME || 'NOT SET (will use default: Image Generation)')
  
  // Get Airtable configuration
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_IMAGE_BASE_ID || process.env.AIRTABLE_AI_BASE_ID || process.env.AIRTABLE_BASE_ID
  // Use table ID if provided, otherwise use table name
  // Table ID: tblKPuAESzyVMrK5M (from Airtable API docs)
  const tableId = process.env.AIRTABLE_IMAGE_TABLE_ID || 'tblKPuAESzyVMrK5M'
  const tableName = process.env.AIRTABLE_IMAGE_TABLE_NAME || 'Image Generation'
  // Prefer table ID over table name (more reliable, won't break if name changes)
  const tableIdentifier = tableId

  console.log('🔍 Resolved configuration:')
  console.log('   apiKey:', apiKey ? 'SET' : 'MISSING')
  console.log('   baseId:', baseId || 'MISSING')
  console.log('   tableId:', tableId)
  console.log('   tableName:', tableName)
  console.log('   Using table identifier:', tableIdentifier)

  if (!apiKey || !baseId) {
    const errorMsg = 'Airtable configuration missing. Please set AIRTABLE_API_KEY and AIRTABLE_IMAGE_BASE_ID (or AIRTABLE_AI_BASE_ID) environment variables.'
    console.error('❌', errorMsg)
    console.error('   Missing:', {
      apiKey: !apiKey,
      baseId: !baseId
    })
    throw new Error(errorMsg)
  }

  // Use table ID for more reliable API calls (won't break if table name changes)
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdentifier)}`

  // Format Created At in user's timezone, or UTC if not provided
  // Airtable Date field expects YYYY-MM-DD format (date only, no time)
  let createdAt: string
  if (timezone) {
    // Use formatDateInTimezone but extract just the date part (YYYY-MM-DD)
    const dateTimeStr = formatDateInTimezone(timezone)
    createdAt = dateTimeStr.split('T')[0] // Extract YYYY-MM-DD from YYYY-MM-DDTHH:mm:ss
  } else {
    // UTC fallback - just get the date part
    const now = new Date()
    createdAt = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
  }

  try {
    // Step 0: Check if an existing record with completed image already exists
    // This prevents creating duplicate records if image was already generated
    console.log('🔍 Checking for existing Airtable records...')
    let shouldCreateNewRecord = true // Flag to track if we should create a new record
    
    if (userId) {
      try {
        // Query Airtable for existing records with this User ID and Created At date
        const queryUrl = `${url}?filterByFormula=${encodeURIComponent(`AND({User ID} = "${userId}", {Created At} = "${createdAt}")`)}`
        console.log('   Querying Airtable for existing records:', queryUrl.substring(0, 150) + '...')
        
        const queryResponse = await fetch(queryUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (queryResponse.ok) {
          const queryData = await queryResponse.json()
          console.log(`   Found ${queryData.records?.length || 0} existing records`)
          
          // Check if any existing record has an image (no Status field anymore)
          if (queryData.records && queryData.records.length > 0) {
            for (const record of queryData.records) {
              const imageField = record.fields?.Image
              const imageUrl = record.fields?.['Image URL']
              
              console.log(`   Checking record ${record.id}: hasImage=${!!imageField}, hasImageUrl=${!!imageUrl}`)
              
              // If record has an image, use it (regardless of status since Status field doesn't exist)
              if (imageField || imageUrl) {
                console.log('✅ Found existing image in Airtable - using it')
                
                // Extract image URL from attachment field or use Image URL field
                let finalImageUrl = imageUrl
                if (!finalImageUrl && imageField && Array.isArray(imageField) && imageField.length > 0) {
                  finalImageUrl = imageField[0].url
                }
                
                if (finalImageUrl) {
                  console.log('   Using existing image URL:', finalImageUrl.substring(0, 100) + '...')
                  return {
                    imageUrl: finalImageUrl,
                    caption: record.fields?.['Character Name'] || record.fields?.['Caption'] || null,
                  }
                }
              }
            }
            
            // If we found records but none have images yet, use the most recent one and poll it
            // This handles the case where image is still being generated
            const recordWithoutImage = queryData.records.find((r: any) => {
              const hasImage = r.fields?.Image || r.fields?.['Image URL']
              return !hasImage
            })
            
            if (recordWithoutImage) {
              console.log('✅ Found existing record without image yet - will poll for completion instead of creating new one')
              console.log('   Record ID:', recordWithoutImage.id)
              // Use the existing record ID and poll for completion
              const recordId = recordWithoutImage.id
              console.log('   Using existing record ID:', recordId)
              
              // Don't create a new record - poll the existing one
              shouldCreateNewRecord = false
              
              // Poll the existing record
              const maxPollAttempts = 60 // Poll for up to 5 minutes (60 * 5 seconds)
              let pollAttempts = 0
              
              while (pollAttempts < maxPollAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds between polls
                pollAttempts++
                
                console.log(`   Polling attempt ${pollAttempts}/${maxPollAttempts}...`)
                const pollResponse = await fetch(`${url}/${recordId}`, {
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                })
                
                if (pollResponse.ok) {
                  const pollData = await pollResponse.json()
                  const imageField = pollData.fields?.Image
                  const imageUrl = pollData.fields?.['Image URL']
                  
                  console.log(`   Record hasImage: ${!!imageField}, hasImageUrl: ${!!imageUrl}`)
                  
                  if (imageField || imageUrl) {
                    console.log('✅ Existing record now has image!')
                    let finalImageUrl = imageUrl
                    if (!finalImageUrl && imageField && Array.isArray(imageField) && imageField.length > 0) {
                      finalImageUrl = imageField[0].url
                    }
                    
                    if (finalImageUrl) {
                      console.log('   Using completed image URL:', finalImageUrl.substring(0, 100) + '...')
                      return {
                        imageUrl: finalImageUrl,
                        caption: pollData.fields?.['Character Name'] || pollData.fields?.['Caption'] || null,
                      }
                    }
                  }
                  // If still no image, continue polling
                } else {
                  console.log(`   Poll failed: ${pollResponse.status}, will create new record`)
                  shouldCreateNewRecord = true
                  break
                }
              }
              
              if (!shouldCreateNewRecord && pollAttempts >= maxPollAttempts) {
                console.log('   Polling timeout - returning empty to indicate image is still generating')
                return {
                  imageUrl: '', // Empty string indicates still generating
                  caption: null,
                }
              }
            }
          }
        } else {
          console.log('   Query failed, will create new record:', queryResponse.status)
        }
      } catch (queryError: any) {
        console.log('   Error querying existing records, will create new record:', queryError.message)
        // Continue to create new record
      }
    }
    
    // Step 1: Create a record in Airtable with the image prompt
    // Only create if we didn't find an existing pending record to poll
    if (!shouldCreateNewRecord) {
      console.log('⏭️ Skipping record creation - using existing pending record')
      return {
        imageUrl: '', // Still generating
        caption: null,
      }
    }
    
    // Step 1: Create a record in Airtable with the image prompt
    // Only create if we didn't find an existing pending record to poll
    console.log('🚀 ========== ABOUT TO CREATE AIRTABLE RECORD ==========')
    console.log('📝 Creating image generation request in Airtable...')
    console.log(`   URL: ${url}`)
    console.log(`   Timezone: ${timezone || 'UTC (not provided)'}`)
    console.log(`   Created At: ${createdAt}`)
    console.log(`   Prompt length: ${prompt.length}`)
    console.log(`   Prompt preview: ${prompt.substring(0, 100)}...`)
    
    // Airtable API requires records array format
    // Note: Status field no longer exists in Airtable
    const requestBody: any = {
      records: [
        {
          fields: {
            'Image Prompt': prompt,
            'Created At': createdAt,
          }
        }
      ]
    }
    
    // Add user identifier fields if provided
    if (userId) {
      requestBody.records[0].fields['User ID'] = userId
    }
    if (userEmail) {
      requestBody.records[0].fields['User Email'] = userEmail
    }
    
    console.log('📤 Request body being sent to Airtable:')
    console.log('   Full request body:', JSON.stringify(requestBody, null, 2))
    console.log('   Prompt in request body:', requestBody.records[0].fields['Image Prompt'])
    console.log('   Prompt length in request:', requestBody.records[0].fields['Image Prompt'].length)
    console.log('   Status:', requestBody.records[0].fields['Status'])
    console.log('   Created At:', requestBody.records[0].fields['Created At'])
    
    console.log('🚀 ========== MAKING AIRTABLE API CALL ==========')
    console.log('   Method: POST')
    console.log('   URL:', url)
    console.log('   Headers:', {
      'Authorization': `Bearer ${apiKey ? apiKey.substring(0, 12) + '...' : 'MISSING'}`,
      'Content-Type': 'application/json'
    })
    
    const createResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log('🚀 ========== AIRTABLE API CALL COMPLETED ==========')

    console.log('📥 Airtable API response status:', createResponse.status, createResponse.statusText)
    console.log('📥 Airtable API response headers:', Object.fromEntries(createResponse.headers.entries()))

    // Read response body once - check if it's an error first
    const responseText = await createResponse.text()
    
    if (!createResponse.ok) {
      console.error('❌ Airtable API error response:', responseText)
      console.error('❌ Airtable API error details:')
      console.error('   Status:', createResponse.status, createResponse.statusText)
      console.error('   URL:', url)
      console.error('   Base ID:', baseId)
      console.error('   Table Name:', tableName)
      console.error('   API Key prefix:', apiKey ? apiKey.substring(0, 12) + '...' : 'MISSING')
      
      // Parse error for better messaging
      let errorMessage = `Failed to create Airtable record: ${responseText}`
      try {
        const errorData = JSON.parse(responseText)
        if (errorData.error?.type === 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND') {
          errorMessage = `Airtable API permission error (403 Forbidden). Possible causes:
1. API token doesn't have write access to base "${baseId}"
2. Table "${tableName}" doesn't exist in the base
3. Field names don't match (check: "Image Prompt", "Status", "Created At")
4. API token is invalid or expired

Error: ${errorData.error.message}

To fix:
- Go to Airtable > Help > API documentation
- Check that your API token has access to base "${baseId}"
- Verify table name is exactly: "${tableName}"
- Verify field names match exactly (case-sensitive)`
        }
      } catch (e) {
        // Error text is not JSON, use as-is
      }
      
      throw new Error(errorMessage)
    }

    // Parse the response text as JSON
    let createData
    try {
      createData = JSON.parse(responseText)
    } catch (parseError: any) {
      console.error('❌ Failed to parse Airtable response as JSON:', parseError)
      console.error('   Response text:', responseText.substring(0, 500))
      throw new Error(`Airtable API returned invalid JSON: ${parseError.message}`)
    }
    console.log('📥 Airtable API response data:', JSON.stringify(createData, null, 2))
    
    // Airtable returns { records: [{ id: "...", fields: {...} }] }
    if (!createData.records || !Array.isArray(createData.records) || createData.records.length === 0) {
      console.error('❌ CRITICAL: Airtable response missing records array!')
      console.error('   Response:', JSON.stringify(createData, null, 2))
      throw new Error('Airtable API returned success but no records in response')
    }
    
    const createdRecord = createData.records[0]
    if (!createdRecord || !createdRecord.id) {
      console.error('❌ CRITICAL: Airtable response missing record ID!')
      console.error('   Response:', JSON.stringify(createData, null, 2))
      throw new Error('Airtable API returned success but no record ID in response')
    }
    
    const recordId = createdRecord.id
    console.log('✅ Image generation request created in Airtable')
    console.log('   Record ID:', recordId)
    console.log('   Record fields:', JSON.stringify(createdRecord.fields, null, 2))
    console.log('   Full record data:', JSON.stringify(createdRecord, null, 2))
    
    // Verify the prompt was saved correctly
    const savedPrompt = createdRecord.fields['Image Prompt']
    console.log('🔍 VERIFICATION: Prompt saved in Airtable:')
    console.log('   Saved prompt length:', savedPrompt?.length || 0)
    console.log('   Saved prompt preview (first 200 chars):', savedPrompt?.substring(0, 200) || 'MISSING')
    console.log('   Prompt matches sent prompt:', savedPrompt === prompt ? 'YES ✅' : 'NO ❌')
    if (savedPrompt !== prompt) {
      console.error('   ⚠️ WARNING: Saved prompt does not match sent prompt!')
      console.error('   Sent prompt length:', prompt.length)
      console.error('   Saved prompt length:', savedPrompt?.length || 0)
    }
    
    // Verify the record was actually created by fetching it back
    console.log('🔍 Verifying record was created in Airtable...')
    const verifyUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdentifier)}/${recordId}`
    const verifyResponse = await fetch(verifyUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    })
    
    // Read verification response body once
    const verifyResponseText = await verifyResponse.text()
    
    if (verifyResponse.ok) {
      let verifyData
      try {
        verifyData = JSON.parse(verifyResponseText)
        console.log('✅ Verification successful - record exists in Airtable')
        console.log('   Verified record:', JSON.stringify(verifyData, null, 2))
      } catch (parseError: any) {
        console.error('❌ Failed to parse verification response as JSON:', parseError)
        console.error('   Response text:', verifyResponseText.substring(0, 500))
      }
    } else {
      console.error('❌ Verification failed - record not found in Airtable!')
      console.error('   Status:', verifyResponse.status, verifyResponse.statusText)
      console.error('   Error:', verifyResponseText)
    }

    // Step 2: Poll Airtable for the generated image
    // Airtable Automation/Script should generate the image and update the record
    console.log('⏳ Polling Airtable for image generation result...')
    const maxAttempts = 120 // 4 minutes max (120 attempts * 2 seconds) - image generation can take time
    const delayMs = 2000 // 2 seconds between polls

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      const getResponse = await fetch(`${url}/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      })

      if (!getResponse.ok) {
        const errorText = await getResponse.text()
        throw new Error(`Failed to fetch Airtable record: ${getResponse.statusText} - ${errorText}`)
      }

      // Read response body once
      const responseText = await getResponse.text()
      let recordData
      try {
        recordData = JSON.parse(responseText)
      } catch (parseError: any) {
        console.error('❌ Failed to parse Airtable polling response as JSON:', parseError)
        console.error('   Response text:', responseText.substring(0, 500))
        throw new Error(`Airtable API returned invalid JSON: ${parseError.message}`)
      }
      const fields = recordData.fields

      // Check if generation is complete
      if (fields.Status === 'Completed' || fields.Status === 'Complete') {
        // Extract the image URL from attachment field
        // Airtable "Generate image with AI" saves to the "Image" attachment field (fld19AGdPdfiu3IYV)
        // Attachment fields are arrays: [{ url: "...", filename: "...", size: ... }]
        let imageUrl: string | null = null
        
        console.log('🔍 Checking for image in completed record...')
        console.log('   Available fields:', Object.keys(fields))
        console.log('   Status:', fields.Status)
        console.log('   Has Image field:', !!fields['Image'])
        console.log('   Has Image URL field:', !!fields['Image URL'])
        console.log('   Image field type:', typeof fields['Image'])
        console.log('   Image field value:', fields['Image'] ? JSON.stringify(fields['Image']).substring(0, 200) : 'null/undefined')
        
        // Try the "Image" attachment field first (fld19AGdPdfiu3IYV)
        // This is where Airtable "Generate image with AI" saves the image
        const attachmentField = fields['Image'] || fields['fld19AGdPdfiu3IYV']
        
        if (attachmentField && Array.isArray(attachmentField) && attachmentField.length > 0) {
          // Airtable attachment field format: [{ url: "...", filename: "...", ... }]
          console.log('   Found Image attachment field with', attachmentField.length, 'attachment(s)')
          imageUrl = attachmentField[0].url
          console.log('   Extracted image URL from attachment:', imageUrl ? imageUrl.substring(0, 100) + '...' : 'null')
        } else if (typeof attachmentField === 'object' && attachmentField !== null && attachmentField.url) {
          // Single attachment object (not array)
          console.log('   Found Image as single attachment object')
          imageUrl = attachmentField.url
        } else if (fields['Image URL'] || fields['fldL8wx5cWDXDwUjJ']) {
          // Fallback: if stored in "Image URL" field (fldL8wx5cWDXDwUjJ)
          const urlField = fields['Image URL'] || fields['fldL8wx5cWDXDwUjJ']
          console.log('   Found Image URL field (fallback)')
          imageUrl = urlField
        }

        if (imageUrl) {
          // Extract caption from "Caption" field (renamed from "Error Message")
          const caption = fields['Caption'] || null
          console.log('✅ Image generated successfully via Airtable')
          console.log('   Image URL length:', imageUrl.length)
          console.log('   Caption:', caption || 'not found')
          console.log('   Available fields:', Object.keys(fields))
          return { imageUrl, caption: caption || null }
        } else {
          console.error('❌ No image URL found in any field')
          console.error('   Fields available:', Object.keys(fields))
          console.error('   Full fields object:', JSON.stringify(fields, null, 2))
          throw new Error('Airtable image generation completed but no image URL found in Image attachment field or Image URL field')
        }
      }

      if (fields.Status === 'Failed' || fields.Status === 'Error') {
        const errorMsg = fields['Error Message'] || fields['Error'] || 'Airtable image generation failed'
        throw new Error(errorMsg)
      }

      // Still processing, continue polling
      if (attempt % 10 === 0) { // Log every 10th attempt (every 20 seconds)
        console.log(`⏳ Image generation in progress (attempt ${attempt + 1}/${maxAttempts})...`)
        console.log(`   Current Status: ${fields.Status || 'Unknown'}`)
        console.log(`   Elapsed time: ${(attempt * delayMs / 1000).toFixed(0)} seconds`)
      }
    }

    // Timeout reached - log what we found
    console.error('❌ Polling timeout - checking final state...')
    const finalCheck = await fetch(`${url}/${recordId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    })
    
    if (finalCheck.ok) {
      const finalData = JSON.parse(await finalCheck.text())
      console.error('   Final Status:', finalData.fields?.Status || 'Unknown')
      console.error('   Final fields:', Object.keys(finalData.fields || {}))
      console.error('   Has Image field:', !!finalData.fields?.Image)
      console.error('   Has Image URL field:', !!finalData.fields?.['Image URL'])
      if (finalData.fields?.Image) {
        console.error('   Image field value:', JSON.stringify(finalData.fields.Image).substring(0, 500))
      }
    }
    
    throw new Error(`Airtable image generation timed out after ${maxAttempts} attempts (${(maxAttempts * delayMs / 1000 / 60).toFixed(1)} minutes). Check Airtable to see if image was generated.`)
  } catch (error: any) {
    console.error('❌ Error generating image via Airtable:', error)
    throw new Error(`Failed to generate image via Airtable: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Generate horoscope text using Elvex API
 * 
 * This function:
 * 1. Transforms horoscope text using Elvex Assistant API
 * 
 * Note: Image generation is NOT available via Elvex API. The image prompt is still
 * accepted and stored, but image generation will need to be handled separately.
 * 
 * The image prompt is built by the route using buildHoroscopePrompt() with slot-based logic.
 * The prompt format matches the n8n workflow (e.g., "Rubber Hose Cartoon. Marker Illustration. 
 * Top Down View of [name], as [role] in [setting]...")
 */
export async function generateHoroscopeViaElvex(
  request: HoroscopeGenerationRequest
): Promise<HoroscopeGenerationResponse> {
  console.log('🚀 Generating horoscope via Elvex API...')
  console.log('Request:', {
    starSign: request.starSign,
    hasCafeAstrologyText: !!request.cafeAstrologyText,
    hasImagePrompt: !!request.imagePrompt,
    imagePromptLength: request.imagePrompt?.length || 0,
  })

  // Validate inputs
  if (!request.cafeAstrologyText || request.cafeAstrologyText.trim() === '') {
    throw new Error('Cafe Astrology text is required')
  }

  if (!request.starSign || request.starSign.trim() === '') {
    throw new Error('Star sign is required')
  }

  const startTime = Date.now()

  try {
    // Generate horoscope text using Elvex only
    // Image and caption generation are handled separately via Airtable (avatar endpoint)
    console.log('📝 Generating horoscope text with Elvex...')
    const textResult = await transformHoroscopeWithElvex(
      request.cafeAstrologyText,
      request.starSign
    )
    console.log('✅ Horoscope text generated successfully')

    const elapsed = Date.now() - startTime
    console.log(`✅ Horoscope text generation completed in ${elapsed}ms`)

    return {
      horoscope: textResult.horoscope,
      dos: textResult.dos,
      donts: textResult.donts,
      character_name: null,
      prompt: request.imagePrompt || '', // Store prompt for reference, but don't generate image here
      slots: request.slots || {},
      reasoning: request.reasoning || {},
    }
  } catch (error: any) {
    console.error('❌ Error generating horoscope via Elvex:', error)
    throw error
  }
}

