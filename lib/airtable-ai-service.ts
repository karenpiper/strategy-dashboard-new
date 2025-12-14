/**
 * Airtable AI Service
 * 
 * Sends prompts to Airtable, which generates horoscope text and images using Airtable AI,
 * then retrieves the results and returns them to the app.
 * 
 * Workflow:
 * 1. Create a record in Airtable with the prompt and request data
 * 2. Airtable Script/Automation generates horoscope and image using AI
 * 3. Poll Airtable for the completed results
 * 4. Return the generated horoscope and image to the app
 * 
 * Setup required:
 * 1. Create an Airtable base with a "Horoscope Generation" table
 * 2. Set up an Airtable Script or Automation that:
 *    - Watches for new records with Status = "Pending"
 *    - Uses Airtable AI to generate horoscope text and image
 *    - Updates the record with Status = "Completed" and the results
 * 3. Set environment variables:
 *    - AIRTABLE_API_KEY: Your Airtable Personal Access Token
 *    - AIRTABLE_AI_BASE_ID: Your Airtable Base ID
 *    - AIRTABLE_AI_TABLE_NAME: Table name (default: "Horoscope Generation")
 */

interface HoroscopeGenerationRequest {
  cafeAstrologyText: string
  starSign: string
  imagePrompt: string
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
 * Get Airtable configuration from environment variables
 */
function getAirtableConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_AI_BASE_ID || process.env.AIRTABLE_BASE_ID
  const tableName = process.env.AIRTABLE_AI_TABLE_NAME || 'Horoscope Generation'

  if (!apiKey || !baseId) {
    throw new Error('Airtable AI configuration missing. Please set AIRTABLE_API_KEY and AIRTABLE_AI_BASE_ID environment variables.')
  }

  return { apiKey, baseId, tableName }
}

/**
 * Create a horoscope generation request in Airtable
 * This will trigger an Airtable Script/Extension that uses AI to generate the horoscope
 */
async function createAirtableRequest(request: HoroscopeGenerationRequest): Promise<string> {
  const config = getAirtableConfig()
  const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}`

  // Create a record in Airtable with the generation request
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        'User ID': request.userId,
        'Date': request.date,
        'Star Sign': request.starSign,
        'Cafe Astrology Text': request.cafeAstrologyText,
        'Image Prompt': request.imagePrompt,
        'Status': 'Pending',
        'Created At': new Date().toISOString(),
        // Store slots and reasoning as JSON strings if provided
        ...(request.slots && { 'Prompt Slots': JSON.stringify(request.slots) }),
        ...(request.reasoning && { 'Prompt Reasoning': JSON.stringify(request.reasoning) }),
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create Airtable record: ${errorText}`)
  }

  const data = await response.json()
  return data.id // Return the record ID
}

/**
 * Poll Airtable for the generated horoscope result
 * Checks the record until Status is "Completed" and results are available
 */
async function pollAirtableResult(recordId: string, maxAttempts = 60, delayMs = 2000): Promise<HoroscopeGenerationResponse> {
  const config = getAirtableConfig()
  const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}/${recordId}`

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Airtable record: ${response.statusText}`)
    }

    const data = await response.json()
    const fields = data.fields

    // Check if generation is complete
    if (fields.Status === 'Completed' || fields.Status === 'Complete') {
      // Extract the generated content
      const horoscope = fields['Horoscope Text'] || fields['Horoscope'] || ''
      const dos = Array.isArray(fields['Dos']) ? fields['Dos'] : 
                  (fields['Dos'] ? JSON.parse(fields['Dos']) : [])
      const donts = Array.isArray(fields['Donts']) ? fields['Donts'] : 
                    (fields['Donts'] ? JSON.parse(fields['Donts']) : [])
      const imageUrl = fields['Image URL'] || fields['Image'] || ''
      const characterName = fields['Character Name'] || null

      if (!horoscope || !imageUrl) {
        throw new Error('Airtable generation incomplete: missing horoscope text or image URL')
      }

      // Parse slots and reasoning if stored as JSON strings
      let slots = {}
      let reasoning = {}
      try {
        slots = fields['Prompt Slots'] ? 
          (typeof fields['Prompt Slots'] === 'string' ? JSON.parse(fields['Prompt Slots']) : fields['Prompt Slots']) : 
          {}
        reasoning = fields['Prompt Reasoning'] ? 
          (typeof fields['Prompt Reasoning'] === 'string' ? JSON.parse(fields['Prompt Reasoning']) : fields['Prompt Reasoning']) : 
          {}
      } catch (e) {
        console.warn('Failed to parse slots/reasoning from Airtable:', e)
      }

      return {
        horoscope,
        dos,
        donts,
        imageUrl,
        character_name: characterName,
        prompt: fields['Image Prompt'] || '',
        slots,
        reasoning,
      }
    }

    if (fields.Status === 'Failed' || fields.Status === 'Error') {
      const errorMsg = fields['Error Message'] || fields['Error'] || 'Airtable AI generation failed'
      throw new Error(errorMsg)
    }

    // Still processing, continue polling
    if (attempt % 5 === 0) { // Log every 5th attempt
      console.log(`⏳ Airtable generation in progress (attempt ${attempt + 1}/${maxAttempts})...`)
    }
  }

  throw new Error('Airtable AI generation timed out after maximum attempts')
}

/**
 * Generate horoscope using Airtable AI
 * 
 * This creates a record in Airtable, which should trigger an Airtable Script/Extension
 * that uses AI to generate the horoscope text and image.
 * Then it polls for the result.
 */
export async function generateHoroscopeViaAirtable(
  request: HoroscopeGenerationRequest
): Promise<HoroscopeGenerationResponse> {
  console.log('🚀 Generating horoscope via Airtable AI...')
  console.log('Request:', {
    starSign: request.starSign,
    hasCafeAstrologyText: !!request.cafeAstrologyText,
    hasImagePrompt: !!request.imagePrompt,
  })

  // Validate inputs
  if (!request.imagePrompt || request.imagePrompt.trim() === '') {
    throw new Error('Image prompt is empty - cannot generate image without prompt')
  }

  if (!request.cafeAstrologyText || request.cafeAstrologyText.trim() === '') {
    throw new Error('Cafe Astrology text is empty - cannot generate horoscope without source text')
  }

  try {
    // Step 1: Create request in Airtable
    console.log('📝 Creating horoscope generation request in Airtable...')
    const recordId = await createAirtableRequest(request)
    console.log('✅ Request created in Airtable, record ID:', recordId)

    // Step 2: Poll for results
    console.log('⏳ Waiting for Airtable AI to generate horoscope...')
    const result = await pollAirtableResult(recordId)
    console.log('✅ Horoscope generated successfully via Airtable AI')

    return result
  } catch (error: any) {
    console.error('❌ Error generating horoscope via Airtable AI:', error)
    throw error
  }
}
