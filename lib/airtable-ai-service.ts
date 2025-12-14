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
 * Send webhook to Airtable to trigger horoscope generation
 * This is the preferred method - direct webhook-to-webhook communication
 */
async function triggerAirtableWebhook(request: HoroscopeGenerationRequest): Promise<void> {
  const webhookUrl = process.env.AIRTABLE_WEBHOOK_URL
  
  if (!webhookUrl) {
    throw new Error('AIRTABLE_WEBHOOK_URL is not set. Please set it to your Airtable webhook URL.')
  }

  // Build webhook callback URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                  'http://localhost:3000'
  const callbackUrl = `${baseUrl}/api/airtable/horoscope-webhook`

  // Send webhook to Airtable
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: request.userId,
      date: request.date,
      starSign: request.starSign,
      cafeAstrologyText: request.cafeAstrologyText,
      imagePrompt: request.imagePrompt,
      callbackUrl: callbackUrl, // Where Airtable should send results
      slots: request.slots,
      reasoning: request.reasoning,
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to trigger Airtable webhook: ${errorText}`)
  }

  console.log('✅ Webhook sent to Airtable successfully')
}

/**
 * Create a horoscope generation request in Airtable (record-based approach)
 * This will trigger an Airtable Script/Extension that uses AI to generate the horoscope
 * 
 * If webhook URL is provided, Airtable will call it when generation is complete.
 * Otherwise, we'll poll Airtable for results.
 */
async function createAirtableRequest(request: HoroscopeGenerationRequest, useWebhook: boolean = false): Promise<string> {
  const config = getAirtableConfig()
  const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}`

  // Build webhook URL if using webhook mode
  let webhookUrl = null
  if (useWebhook) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    webhookUrl = `${baseUrl}/api/airtable/horoscope-webhook`
  }

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
        // Include webhook URL if using webhook mode
        ...(webhookUrl && { 'Webhook URL': webhookUrl }),
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
 * This creates a record in Airtable, which triggers an Airtable Automation/Script
 * that uses AI to generate the horoscope text and image.
 * 
 * Two modes:
 * 1. Webhook mode (preferred): Airtable calls webhook when done, we wait for webhook
 * 2. Polling mode (fallback): We poll Airtable every 2 seconds until complete
 */
export async function generateHoroscopeViaAirtable(
  request: HoroscopeGenerationRequest,
  options?: { useWebhook?: boolean; waitForWebhook?: boolean }
): Promise<HoroscopeGenerationResponse> {
  console.log('🚀 Generating horoscope via Airtable AI...')
  console.log('Request:', {
    starSign: request.starSign,
    hasCafeAstrologyText: !!request.cafeAstrologyText,
    hasImagePrompt: !!request.imagePrompt,
    useWebhook: options?.useWebhook ?? true,
  })

  // Validate inputs
  if (!request.imagePrompt || request.imagePrompt.trim() === '') {
    throw new Error('Image prompt is empty - cannot generate image without prompt')
  }

  if (!request.cafeAstrologyText || request.cafeAstrologyText.trim() === '') {
    throw new Error('Cafe Astrology text is empty - cannot generate horoscope without source text')
  }

  const useWebhook = options?.useWebhook ?? true
  const waitForWebhook = options?.waitForWebhook ?? true

  // Check if we should use direct webhook (preferred) or record-based approach
  const useDirectWebhook = !!process.env.AIRTABLE_WEBHOOK_URL

  try {
    let recordId: string | null = null

    if (useDirectWebhook) {
      // Step 1a: Send webhook directly to Airtable (preferred method)
      console.log('📤 Sending webhook to Airtable to trigger horoscope generation...')
      await triggerAirtableWebhook(request)
      console.log('✅ Webhook sent to Airtable')
      console.log('⏳ Waiting for Airtable to process and call webhook callback...')
      
      // For direct webhook mode, we need to wait for the callback
      // The webhook will store results in Supabase
      // We'll poll Supabase for the results (since we know userId and date)
      const maxWaitTime = 120000 // 2 minutes
      const pollInterval = 2000 // 2 seconds
      const startTime = Date.now()
      
      // Get Supabase admin client
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase configuration missing for webhook polling')
      }
      
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      
      while (Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        
        // Check Supabase for the horoscope
        const { data: horoscope } = await supabaseAdmin
          .from('horoscopes')
          .select('*')
          .eq('user_id', request.userId)
          .eq('date', request.date)
          .single()
        
        if (horoscope && horoscope.horoscope_text && horoscope.image_url) {
          console.log('✅ Horoscope found in Supabase (via webhook callback)')
          return {
            horoscope: horoscope.horoscope_text,
            dos: horoscope.horoscope_dos || [],
            donts: horoscope.horoscope_donts || [],
            imageUrl: horoscope.image_url,
            character_name: horoscope.character_type || null,
            prompt: horoscope.image_prompt || '',
            slots: {},
            reasoning: {},
          }
        }
      }
      
      throw new Error('Timeout waiting for Airtable webhook callback. Results may still be processing.')
    } else {
      // Step 1b: Create record in Airtable (fallback method)
      console.log('📝 Creating horoscope generation request in Airtable...')
      recordId = await createAirtableRequest(request, useWebhook)
      console.log('✅ Request created in Airtable, record ID:', recordId)
    }

    if (useWebhook && waitForWebhook) {
      // Step 2a: Wait for webhook (with timeout fallback to polling)
      console.log('⏳ Waiting for Airtable webhook callback...')
      console.log('   If webhook doesn\'t arrive, will fall back to polling after 30 seconds')
      
      // Wait a bit for webhook, then fall back to polling if needed
      const webhookTimeout = 30000 // 30 seconds
      const startTime = Date.now()
      
      // Try to wait for webhook, but fall back to polling if timeout
      try {
        // For now, we'll still poll but with shorter timeout since webhook should be faster
        // In a production setup, you'd use a proper queue/event system
        const result = await pollAirtableResult(recordId, 15, 2000) // 15 attempts = 30 seconds
        console.log('✅ Horoscope generated successfully via Airtable AI (webhook mode)')
        return result
      } catch (error: any) {
        // If webhook didn't arrive in time, continue to polling
        console.log('⚠️ Webhook timeout, falling back to polling...')
      }
    }

    // Step 2b: Poll for results (fallback or if webhook disabled)
    console.log('⏳ Polling Airtable for horoscope generation results...')
    const result = await pollAirtableResult(recordId)
    console.log('✅ Horoscope generated successfully via Airtable AI')

    return result
  } catch (error: any) {
    console.error('❌ Error generating horoscope via Airtable AI:', error)
    throw error
  }
}
