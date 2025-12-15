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
  imageUrl: string
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
    const elvexUrl = `${config.baseUrl}/v0/apps/${config.assistantId}/versions/${config.version}/text/generate`
    
    console.log('🔍 Calling Elvex Assistant API:', {
      url: elvexUrl,
      assistantId: config.assistantId,
      version: config.version
    })
    
    // Build the full prompt with system instructions
    const fullPrompt = `You are a witty horoscope transformer. You take traditional horoscopes and make them irreverent and fun in the style of Co-Star. You always return valid JSON.

${prompt}`

    const response = await fetch(elvexUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        prompt: fullPrompt,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      const errorMessage = `Elvex API call failed: ${response.status} ${errorText}`
      
      // Provide helpful error message for 404
      if (response.status === 404) {
        console.error('❌ 404 Error Details:', {
          assistantId: config.assistantId,
          version: config.version,
          url: elvexUrl,
          suggestion: 'Check Elvex dashboard to verify: 1) Assistant ID is correct, 2) Version exists and is published, 3) Assistant is active'
        })
        throw new Error(`${errorMessage}\n\nTroubleshooting:\n- Verify assistant ID "${config.assistantId}" exists in Elvex dashboard\n- Check that version "${config.version}" exists and is published for this assistant\n- Ensure the assistant is active/published`)
      }
      
      throw new Error(errorMessage)
    }

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
 * Generate image using Elvex API
 */
async function generateImageWithElvex(prompt: string): Promise<string> {
  console.log('🖼️ Generating image using Elvex API...')
  
  const config = getElvexConfig()

  try {
    // Try Elvex images endpoint (similar to OpenAI structure)
    const response = await fetch(`${config.baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3', // Elvex may use different model names
        prompt: prompt,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Elvex image generation failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    
    // Handle different possible response formats
    const imageUrl = result.data?.[0]?.url || 
                     result.url || 
                     result.image_url ||
                     result.imageUrl

    if (!imageUrl) {
      throw new Error('Failed to generate image - empty response from Elvex')
    }

    console.log('✅ Successfully generated image with Elvex')
    return imageUrl
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
    // Step 1: Transform horoscope text using Elvex
    const textResult = await transformHoroscopeWithElvex(
      request.cafeAstrologyText,
      request.starSign
    )

    // Step 2: Use the provided image prompt (built by route using slot-based system)
    // This prompt already includes all the sophisticated logic:
    // - Style selection based on user preferences
    // - Weighted selection by weekday, season, zodiac element
    // - Subject role, setting, mood, colors, etc. from catalogs
    const imagePrompt = request.imagePrompt

    // Step 3: Generate image using Elvex with the slot-based prompt
    const imageUrl = await generateImageWithElvex(imagePrompt)

    const elapsed = Date.now() - startTime
    console.log(`✅ Horoscope generation completed in ${elapsed}ms`)

    return {
      horoscope: textResult.horoscope,
      dos: textResult.dos,
      donts: textResult.donts,
      imageUrl,
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

