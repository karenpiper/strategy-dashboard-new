/**
 * Elvex Horoscope Service
 * 
 * Uses Elvex API to generate horoscope text and images.
 * 
 * Workflow:
 * 1. Transform horoscope text using Elvex Assistant API
 * 2. Use image prompt built by route (via buildHoroscopePrompt with slot-based logic)
 * 3. Generate image using Elvex images API
 * 
 * Setup required:
 * 1. Elvex account and API key
 * 2. Elvex Assistant for horoscope text transformation (or reuse deck talk assistant)
 * 3. Elvex image generation provider configured (Settings > Apps > Image generation provider)
 * 4. Environment variables:
 *    - ELVEX_API_KEY: Your Elvex API key
 *    - ELVEX_HOROSCOPE_ASSISTANT_ID: Assistant ID (or use ELVEX_ASSISTANT_ID)
 *    - ELVEX_HOROSCOPE_VERSION: Assistant version (or use ELVEX_VERSION)
 *    - ELVEX_BASE_URL: Elvex API base URL (optional, defaults to https://api.elvex.ai)
 */

interface HoroscopeGenerationRequest {
  cafeAstrologyText: string
  starSign: string
  imagePrompt: string // Required - built by route using buildHoroscopePrompt()
  userId: string
  date: string
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
 * Generate image using Elvex Assistant API
 * 
 * Elvex supports image generation through the assistant API. The assistant must have
 * "Image Generation" action enabled in its settings.
 * 
 * We send a prompt asking the assistant to generate an image, and it returns the image URL.
 */
async function generateImageWithElvex(prompt: string): Promise<string> {
  console.log('🖼️ Generating image using Elvex Assistant API...')
  
  const config = getElvexConfig()

  try {
    // Use the same assistant API endpoint, but with an image generation prompt
    // Try the configured version first, then try version 2 as fallback
    const versionsToTry = [config.version, '2'].filter((v, i, arr) => arr.indexOf(v) === i)
    
    let lastError: Error | null = null
    
    for (const version of versionsToTry) {
      const elvexUrl = `${config.baseUrl}/v0/apps/${config.assistantId}/versions/${version}/text/generate`
      
      console.log('🔍 Calling Elvex Assistant API for image generation:', {
        url: elvexUrl,
        assistantId: config.assistantId,
        version: version,
        promptLength: prompt.length,
        attempt: versionsToTry.indexOf(version) + 1,
        totalAttempts: versionsToTry.length
      })
      
      // Build prompt asking assistant to generate an image
      // Elvex assistants with image generation enabled will process this
      const imagePrompt = `Generate an image with the following description. Return only the image URL, nothing else.

${prompt}

using DALL-E 3`

      const response = await fetch(elvexUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          prompt: imagePrompt,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Elvex Assistant API returns: { data: { response: "..." } }
        const content = result.data?.response || result.response || result.text || result.content

        if (!content) {
          throw new Error('Empty response from Elvex for image generation')
        }

        // Try to extract image URL from the response
        // The assistant might return just the URL, or a JSON object, or text with the URL
        let imageUrl: string | null = null
        
        // Check if it's already a URL
        if (typeof content === 'string' && (content.startsWith('http://') || content.startsWith('https://'))) {
          imageUrl = content.trim()
        } else {
          // Try to parse as JSON
          try {
            const parsed = typeof content === 'string' ? JSON.parse(content) : content
            imageUrl = parsed.url || parsed.imageUrl || parsed.image_url || parsed.data?.url
          } catch {
            // Not JSON, try to extract URL from text
            const urlMatch = content.match(/https?:\/\/[^\s\)]+/i)
            if (urlMatch) {
              imageUrl = urlMatch[0]
            }
          }
        }

        if (imageUrl) {
          console.log(`✅ Successfully generated image with Elvex Assistant API (version ${version})`)
          return imageUrl
        } else {
          console.log(`⚠️ Elvex returned response but no image URL found, trying next version...`)
          lastError = new Error('Elvex assistant returned response but no image URL found')
        }
      } else {
        // Not successful, try next version
        const errorText = await response.text()
        lastError = new Error(`Elvex image generation failed with version ${version}: ${response.status} ${errorText}`)
        console.log(`⚠️ Version ${version} failed for image generation, trying next...`)
        
        // If this was the last version to try, throw the error
        if (version === versionsToTry[versionsToTry.length - 1]) {
          if (response.status === 404) {
            throw new Error(`${lastError.message}\n\nTroubleshooting:\n- Verify the assistant has "Image Generation" action enabled in Elvex dashboard (Assistant Settings > Actions > Image Generation)\n- Check that image generation provider is configured in Elvex (Settings > Apps > Image generation provider)\n- Ensure the assistant is published after enabling image generation`)
          }
          throw lastError
        }
      }
    }
    
    // Should never reach here, but just in case
    throw lastError || new Error('Failed to generate image with Elvex Assistant API')
  } catch (error: any) {
    console.error('❌ Error generating image with Elvex:', error)
    throw new Error(`Failed to generate image with Elvex: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Generate horoscope using Elvex API
 * 
 * This function:
 * 1. Transforms horoscope text using Elvex Assistant API
 * 2. Uses image prompt provided by route (built with slot-based logic via buildHoroscopePrompt)
 * 3. Generates image using Elvex images API
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
    // Step 1: Transform horoscope text using Elvex (independent operation)
    console.log('📝 Step 1: Generating horoscope text...')
    const textResult = await transformHoroscopeWithElvex(
      request.cafeAstrologyText,
      request.starSign
    )
    console.log('✅ Step 1 complete: Horoscope text generated')

    // Step 2: Generate image separately (independent operation)
    // If image generation fails, we still return the text
    const imagePrompt = request.imagePrompt
    let imageUrl: string | null = null
    
    try {
      console.log('🖼️ Step 2: Generating horoscope image (separate operation)...')
      imageUrl = await generateImageWithElvex(imagePrompt)
      console.log('✅ Step 2 complete: Image generated')
    } catch (imageError: any) {
      // Image generation failed, but we still have the text
      console.error('⚠️ Image generation failed, but horoscope text is available:', imageError.message)
      console.log('📝 Continuing with text-only horoscope (image will be null)')
      // Don't throw - we want to return the text even if image fails
    }

    const elapsed = Date.now() - startTime
    console.log(`✅ Horoscope generation completed in ${elapsed}ms (text: ✅, image: ${imageUrl ? '✅' : '❌'})`)

    return {
      horoscope: textResult.horoscope,
      dos: textResult.dos,
      donts: textResult.donts,
      imageUrl, // Can be null if image generation failed
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

