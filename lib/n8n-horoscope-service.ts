/**
 * n8n Horoscope Generation Service
 * 
 * This service handles synchronous calls to n8n workflow for horoscope generation.
 * It replaces direct OpenAI API calls with n8n webhook calls.
 */

interface HoroscopeGenerationRequest {
  cafeAstrologyText: string
  starSign: string
  imagePrompt: string
  slots: any
  reasoning: any
  userId?: string
  date?: string
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
 * Generate horoscope text and image via n8n workflow
 * 
 * @param request - Request payload with cafeAstrologyText, starSign, imagePrompt, slots, reasoning
 * @returns Combined result with horoscope text, dos/donts, and image URL
 */
export async function generateHoroscopeViaN8n(
  request: HoroscopeGenerationRequest
): Promise<HoroscopeGenerationResponse> {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_HOROSCOPE_WEBHOOK_URL

  if (!webhookUrl) {
    throw new Error(
      'NEXT_PUBLIC_N8N_HOROSCOPE_WEBHOOK_URL is not set in environment variables'
    )
  }

  console.log('Calling n8n webhook for horoscope generation...')
  console.log('Webhook URL:', webhookUrl)
  
  // Validate image prompt before sending
  if (!request.imagePrompt || request.imagePrompt.trim() === '') {
    throw new Error('Image prompt is empty - cannot generate image without prompt')
  }
  
  console.log('Request payload:', {
    starSign: request.starSign,
    hasCafeAstrologyText: !!request.cafeAstrologyText,
    hasImagePrompt: !!request.imagePrompt,
    textLength: request.cafeAstrologyText?.length || 0,
    promptLength: request.imagePrompt?.length || 0,
    promptPreview: request.imagePrompt.substring(0, 150) + (request.imagePrompt.length > 150 ? '...' : ''),
  })

  const maxRetries = 3
  let lastError: any = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff with jitter
        const delay = Math.pow(2, attempt - 1) + Math.random()
        console.log(`Retrying n8n webhook call (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay.toFixed(2)}s...`)
        await new Promise(resolve => setTimeout(resolve, delay * 1000))
      }

      const startTime = Date.now()
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cafeAstrologyText: request.cafeAstrologyText,
          starSign: request.starSign,
          imagePrompt: request.imagePrompt,
          slots: request.slots,
          reasoning: request.reasoning,
          userId: request.userId,
          date: request.date,
        }),
        // Set timeout to 60 seconds for synchronous workflow
        signal: AbortSignal.timeout(60000),
      })

      const elapsedTime = Date.now() - startTime
      console.log(`n8n webhook response received in ${elapsedTime}ms`)

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `n8n webhook returned status ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorJson.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(errorMessage)
        }

        // Retry on server errors (5xx) or network errors
        throw new Error(`n8n webhook error: ${errorMessage}`)
      }

      // Get response text first to check if it's empty or invalid
      const responseText = await response.text()
      
      if (!responseText || responseText.trim() === '') {
        console.error('❌ n8n webhook returned empty response body', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          url: webhookUrl,
          attempt: attempt + 1,
          requestPayload: {
            starSign: request.starSign,
            hasCafeAstrologyText: !!request.cafeAstrologyText,
            hasImagePrompt: !!request.imagePrompt,
          }
        })
        throw new Error('n8n webhook returned empty response body. The workflow may have failed, timed out, or the Response node is not configured correctly. Check n8n workflow execution logs and ensure the "Combine Results" node is connected to a Response node that returns JSON data.')
      }

      // Try to parse JSON with better error handling
      let result: any
      try {
        result = JSON.parse(responseText)
      } catch (parseError: any) {
        console.error('Failed to parse n8n response as JSON:', {
          responseText: responseText.substring(0, 500), // Log first 500 chars for debugging
          error: parseError.message
        })
        throw new Error(
          `n8n webhook returned invalid JSON response. Response body: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`
        )
      }

      // Validate response structure
      if (!result.horoscope || !Array.isArray(result.dos) || !Array.isArray(result.donts)) {
        throw new Error('Invalid response format from n8n workflow: missing horoscope text or dos/donts')
      }

      if (!result.imageUrl) {
        throw new Error('Invalid response format from n8n workflow: missing imageUrl')
      }

      console.log('✅ Successfully generated horoscope via n8n')
      console.log('Result:', {
        horoscopeLength: result.horoscope?.length || 0,
        dosCount: result.dos?.length || 0,
        dontsCount: result.donts?.length || 0,
        hasImageUrl: !!result.imageUrl,
      })

      return {
        horoscope: result.horoscope,
        dos: result.dos,
        donts: result.donts,
        imageUrl: result.imageUrl,
        character_name: result.character_name || null,
        prompt: result.prompt || request.imagePrompt,
        slots: result.slots || request.slots,
        reasoning: result.reasoning || request.reasoning,
      }
    } catch (error: any) {
      lastError = error
      console.error(`❌ Error calling n8n webhook (attempt ${attempt + 1}/${maxRetries + 1}):`, error)

      // Don't retry on certain errors
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        throw new Error('n8n webhook request timed out after 60 seconds')
      }

      // Don't retry on invalid response format (data structure issues)
      if (error.message?.includes('Invalid response format')) {
        throw error
      }

      // Retry on empty responses (might be transient workflow issues)
      // Empty response errors will be retried automatically in the loop

      // If this was the last attempt, throw the error
      if (attempt >= maxRetries) {
        // Enhance error message for better debugging
        if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
          throw new Error(
            `Failed to connect to n8n webhook. Please verify NEXT_PUBLIC_N8N_HOROSCOPE_WEBHOOK_URL is correct and n8n workflow is active. Original error: ${error.message}`
          )
        }
        throw error
      }
    }
  }

  throw lastError || new Error('Failed to generate horoscope via n8n after retries')
}

