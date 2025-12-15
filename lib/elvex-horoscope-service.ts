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
  imageUrl: string | null // Can be null if image generation fails
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

      // Add timeout to prevent hanging (60 seconds for text generation)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.log(`⏱️ Request timeout after 60 seconds for version ${version}`)
      }, 60000)

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
          const result = await response.json()
          
          // Elvex Assistant API returns: { data: { response: "..." } }
          const content = result.data?.response || result.response || result.text || result.content

          if (!content) {
            throw new Error('Empty response from Elvex')
          }

          // Parse JSON response (might be wrapped in text or already be JSON)
          let parsed
          try {
            parsed = typeof content === 'string' ? JSON.parse(content) : content
          } catch (e) {
            // If not JSON, try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0])
            } else {
              throw new Error('Could not parse JSON from Elvex response')
            }
          }
          
          if (!parsed.horoscope || !Array.isArray(parsed.dos) || !Array.isArray(parsed.donts)) {
            throw new Error('Invalid response format from Elvex')
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
          lastError = new Error(`Request timeout: Elvex API call took longer than 60 seconds for version ${version}`)
          console.log(`⏱️ Version ${version} timed out, trying next...`)
          if (version === versionsToTry[versionsToTry.length - 1]) {
            throw lastError
          }
        } else {
          throw error
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

async function generateImageViaAirtable(prompt: string, timezone?: string): Promise<string> {
  console.log('🖼️ Generating image via Airtable...')
  console.log('📋 Airtable configuration check:')
  console.log('   AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? `${process.env.AIRTABLE_API_KEY.substring(0, 8)}...` : 'NOT SET')
  console.log('   AIRTABLE_IMAGE_BASE_ID:', process.env.AIRTABLE_IMAGE_BASE_ID || 'NOT SET')
  console.log('   AIRTABLE_AI_BASE_ID:', process.env.AIRTABLE_AI_BASE_ID || 'NOT SET')
  console.log('   AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID || 'NOT SET')
  console.log('   AIRTABLE_IMAGE_TABLE_NAME:', process.env.AIRTABLE_IMAGE_TABLE_NAME || 'NOT SET (will use default: Image Generation)')
  
  // Get Airtable configuration
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_IMAGE_BASE_ID || process.env.AIRTABLE_AI_BASE_ID || process.env.AIRTABLE_BASE_ID
  const tableName = process.env.AIRTABLE_IMAGE_TABLE_NAME || 'Image Generation'

  console.log('🔍 Resolved configuration:')
  console.log('   apiKey:', apiKey ? 'SET' : 'MISSING')
  console.log('   baseId:', baseId || 'MISSING')
  console.log('   tableName:', tableName)

  if (!apiKey || !baseId) {
    const errorMsg = 'Airtable configuration missing. Please set AIRTABLE_API_KEY and AIRTABLE_IMAGE_BASE_ID (or AIRTABLE_AI_BASE_ID) environment variables.'
    console.error('❌', errorMsg)
    console.error('   Missing:', {
      apiKey: !apiKey,
      baseId: !baseId
    })
    throw new Error(errorMsg)
  }

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`

  // Format Created At in user's timezone, or UTC if not provided
  const createdAt = timezone 
    ? formatDateInTimezone(timezone)
    : new Date().toISOString()

  try {
    // Step 1: Create a record in Airtable with the image prompt
    console.log('📝 Creating image generation request in Airtable...')
    console.log(`   URL: ${url}`)
    console.log(`   Timezone: ${timezone || 'UTC (not provided)'}`)
    console.log(`   Created At: ${createdAt}`)
    console.log(`   Prompt length: ${prompt.length}`)
    console.log(`   Prompt preview: ${prompt.substring(0, 100)}...`)
    
    const requestBody = {
      fields: {
        'Image Prompt': prompt,
        'Status': 'Pending',
        'Created At': createdAt,
      }
    }
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2))
    
    const createResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📥 Airtable API response status:', createResponse.status, createResponse.statusText)
    console.log('📥 Airtable API response headers:', Object.fromEntries(createResponse.headers.entries()))

    // Read response body once - check if it's an error first
    const responseText = await createResponse.text()
    
    if (!createResponse.ok) {
      console.error('❌ Airtable API error response:', responseText)
      throw new Error(`Failed to create Airtable record: ${responseText}`)
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
    
    if (!createData.id) {
      console.error('❌ CRITICAL: Airtable response missing record ID!')
      console.error('   Response:', JSON.stringify(createData, null, 2))
      throw new Error('Airtable API returned success but no record ID in response')
    }
    
    const recordId = createData.id
    console.log('✅ Image generation request created in Airtable')
    console.log('   Record ID:', recordId)
    console.log('   Record fields:', JSON.stringify(createData.fields, null, 2))
    console.log('   Full record data:', JSON.stringify(createData, null, 2))
    
    // Verify the record was actually created by fetching it back
    console.log('🔍 Verifying record was created in Airtable...')
    const verifyUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`
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
    const maxAttempts = 60 // 2 minutes max (60 attempts * 2 seconds)
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
        // Airtable "Generate image with AI" saves to an attachment field
        // Attachment fields are arrays: [{ url: "...", filename: "...", size: ... }]
        let imageUrl: string | null = null
        
        // Try different possible field names for the attachment
        const attachmentField = fields['Image'] || 
                               fields['Image Attachment'] || 
                               fields['Generated Image'] ||
                               fields['Image File']
        
        if (attachmentField && Array.isArray(attachmentField) && attachmentField.length > 0) {
          // Airtable attachment field format: [{ url: "...", filename: "...", ... }]
          imageUrl = attachmentField[0].url
        } else if (typeof attachmentField === 'object' && attachmentField !== null && attachmentField.url) {
          // Single attachment object (not array)
          imageUrl = attachmentField.url
        } else if (fields['Image URL']) {
          // Fallback: if stored as URL field instead of attachment
          imageUrl = fields['Image URL']
        }

        if (imageUrl) {
          console.log('✅ Image generated successfully via Airtable')
          return imageUrl
        } else {
          throw new Error('Airtable image generation completed but no image URL found in attachment field')
        }
      }

      if (fields.Status === 'Failed' || fields.Status === 'Error') {
        const errorMsg = fields['Error Message'] || fields['Error'] || 'Airtable image generation failed'
        throw new Error(errorMsg)
      }

      // Still processing, continue polling
      if (attempt % 10 === 0) { // Log every 10th attempt (every 20 seconds)
        console.log(`⏳ Image generation in progress (attempt ${attempt + 1}/${maxAttempts})...`)
      }
    }

    throw new Error('Airtable image generation timed out after maximum attempts')
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

  // Validate that image prompt is provided (should be built by route using buildHoroscopePrompt)
  if (!request.imagePrompt || request.imagePrompt.trim() === '') {
    throw new Error('Image prompt is required. The route should build it using buildHoroscopePrompt() with slot-based logic.')
  }

  try {
    // Generate horoscope text using Elvex
    console.log('📝 Generating horoscope text with Elvex...')
    const textResult = await transformHoroscopeWithElvex(
      request.cafeAstrologyText,
      request.starSign
    )
    console.log('✅ Horoscope text generated successfully')

    // Generate image using Airtable (separate operation)
    const imagePrompt = request.imagePrompt
    let imageUrl: string | null = null
    
    if (imagePrompt) {
      console.log('🖼️ Image prompt provided, attempting Airtable image generation...')
      console.log('   Image prompt length:', imagePrompt.length)
      console.log('   Image prompt preview:', imagePrompt.substring(0, 100) + '...')
      try {
        // Pass timezone from request if available
        imageUrl = await generateImageViaAirtable(imagePrompt, request.timezone)
        console.log('✅ Image generated successfully via Airtable')
      } catch (imageError: any) {
        // Image generation failed, but we still have the text
        console.error('❌ Image generation via Airtable failed:')
        console.error('   Error message:', imageError.message)
        console.error('   Error stack:', imageError.stack?.substring(0, 500))
        console.log('📝 Continuing with text-only horoscope (image will be null)')
        // Don't throw - we want to return the text even if image fails
      }
    } else {
      console.log('⚠️ No image prompt provided - skipping Airtable image generation')
    }

    const elapsed = Date.now() - startTime
    console.log(`✅ Horoscope generation completed in ${elapsed}ms (text: ✅, image: ${imageUrl ? '✅' : '❌'})`)

    return {
      horoscope: textResult.horoscope,
      dos: textResult.dos,
      donts: textResult.donts,
      imageUrl, // null if image generation failed
      character_name: null,
      prompt: imagePrompt,
      slots: request.slots || {},
      reasoning: request.reasoning || {},
    }
  } catch (error: any) {
    console.error('❌ Error generating horoscope via Elvex:', error)
    throw error
  }
}

