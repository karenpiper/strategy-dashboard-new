/**
 * Direct Horoscope Generation Service
 * 
 * This service replaces n8n workflow with direct OpenAI API calls.
 * It generates both horoscope text and image in parallel for better performance.
 */

import { transformHoroscopeToCoStarStyle } from './openai'
import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables')
}

// Primary OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Fallback OpenAI client (optional)
let fallbackOpenai: OpenAI | null = null
if (process.env.OPENAI_API_KEY_FALLBACK) {
  fallbackOpenai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY_FALLBACK,
  })
}

/**
 * Call OpenAI API with automatic fallback to secondary key on quota/rate limit errors
 */
async function callOpenAIWithFallback<T>(
  apiCall: (client: OpenAI) => Promise<T>
): Promise<T> {
  try {
    return await apiCall(openai)
  } catch (error: any) {
    // Extract error message from various possible locations
    const errorMessage = error?.response?.data?.error?.message || 
                        error?.message || 
                        error?.error?.message || 
                        ''
    const lowerMessage = errorMessage.toLowerCase()
    const status = error?.response?.status || error?.status

    // Check for quota/billing errors (can be 400, 402, or 429)
    const isQuotaError = status === 402 ||
                        (status === 429 && (
                          lowerMessage.includes('exceeded your current quota') ||
                          lowerMessage.includes('quota') ||
                          lowerMessage.includes('billing') ||
                          lowerMessage.includes('check your plan and billing')
                        )) ||
                        lowerMessage.includes('exceeded your current quota') ||
                        lowerMessage.includes('quota exceeded') ||
                        lowerMessage.includes('hard billing limit') ||
                        lowerMessage.includes('usage limit')
    
    // If we have a fallback key and hit quota/rate limits, try it
    if ((isQuotaError || status === 429) && fallbackOpenai) {
      console.log('⚠️ Primary OpenAI API key hit limits, trying fallback key...')
      console.log('   Error:', errorMessage.substring(0, 200))
      try {
        return await apiCall(fallbackOpenai)
      } catch (fallbackError: any) {
        console.error('❌ Fallback API key also failed:', fallbackError?.message || fallbackError)
        // If fallback also fails with quota error, throw a clear message
        const fallbackMessage = fallbackError?.response?.data?.error?.message || fallbackError?.message || ''
        if (fallbackMessage.toLowerCase().includes('quota') || fallbackMessage.toLowerCase().includes('billing')) {
          throw new Error('Both primary and fallback OpenAI API keys have exceeded their quotas. Please check your OpenAI account billing settings.')
        }
        throw fallbackError
      }
    }
    throw error
  }
}

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
 * Generate horoscope image from a prompt using DALL-E 3
 */
async function generateImageFromPrompt(
  prompt: string
): Promise<{ imageUrl: string }> {
  console.log('🖼️ Generating image from prompt via DALL-E 3...')
  console.log('   Prompt length:', prompt.length)
  console.log('   Prompt preview:', prompt.substring(0, 150) + '...')

  const maxRetries = 3
  let lastError: any = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt - 1) + Math.random()
        console.log(`⏳ Retrying image generation (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay.toFixed(2)}s...`)
        await new Promise(resolve => setTimeout(resolve, delay * 1000))
      }

      const response = await callOpenAIWithFallback(async (client) => 
        await client.images.generate({
          model: 'dall-e-3',
          prompt: prompt,
          size: '1024x1024',
          quality: 'standard',
          n: 1,
        })
      )

      const imageUrl = response.data?.[0]?.url
      if (!imageUrl) {
        throw new Error('Failed to generate horoscope image - empty response')
      }

      console.log('✅ Image generated successfully')
      return { imageUrl }
    } catch (error: any) {
      lastError = error
      console.error(`❌ Error generating image (attempt ${attempt + 1}/${maxRetries + 1}):`, error)

      // Extract error message
      const errorMessage = error.response?.data?.error?.message || error.message || ''
      const lowerMessage = errorMessage.toLowerCase()
      const status = error.response?.status || error.status

      // Check for quota/billing errors (can be 400 or 429)
      const isQuotaError = lowerMessage.includes('exceeded your current quota') ||
                          lowerMessage.includes('quota') ||
                          lowerMessage.includes('billing') ||
                          lowerMessage.includes('hard billing limit') ||
                          lowerMessage.includes('usage limit') ||
                          lowerMessage.includes('check your plan and billing')

      // Don't retry on billing/quota errors - fail immediately
      if (isQuotaError || (status === 400 && isQuotaError)) {
        const hasFallback = !!process.env.OPENAI_API_KEY_FALLBACK
        throw new Error(
          `OpenAI quota/billing limit reached. ${hasFallback ? 'Fallback key will be tried automatically.' : 'Please check your OpenAI account billing settings and add payment method if needed. You can also set OPENAI_API_KEY_FALLBACK environment variable to use a secondary API key.'}`
        )
      }

      // Rate limit (429) that's not quota-related - retry with backoff
      if (status === 429 && !isQuotaError) {
        if (attempt < maxRetries) {
          const retryAfter = error.response?.headers?.['retry-after']
          const delay = retryAfter ? parseInt(retryAfter) : Math.pow(2, attempt)
          const jitter = Math.random()
          console.log(`⏳ Rate limit hit (429). Waiting ${(delay + jitter).toFixed(2)}s before retry...`)
          await new Promise(resolve => setTimeout(resolve, (delay + jitter) * 1000))
          continue
        }
        throw new Error('OpenAI API rate limit exceeded after retries. Please try again later.')
      }

      // Quota error with 429 status - don't retry
      if (status === 429 && isQuotaError) {
        const hasFallback = !!process.env.OPENAI_API_KEY_FALLBACK
        throw new Error(
          `OpenAI quota exceeded (429). ${hasFallback ? 'Fallback key will be tried automatically.' : 'Please check your OpenAI account billing settings. You can also set OPENAI_API_KEY_FALLBACK environment variable to use a secondary API key.'}`
        )
      }

      // If this was the last attempt, throw the error
      if (attempt >= maxRetries) {
        throw error
      }
    }
  }

  throw lastError || new Error('Failed to generate horoscope image after retries')
}

/**
 * Generate horoscope text and image via direct OpenAI API calls (replaces n8n)
 * 
 * @param request - Request payload with cafeAstrologyText, starSign, imagePrompt, slots, reasoning
 * @returns Combined result with horoscope text, dos/donts, and image URL
 */
export async function generateHoroscopeDirect(
  request: HoroscopeGenerationRequest
): Promise<HoroscopeGenerationResponse> {
  console.log('🚀 Generating horoscope via direct OpenAI API calls (replacing n8n)...')
  console.log('Request payload:', {
    starSign: request.starSign,
    hasCafeAstrologyText: !!request.cafeAstrologyText,
    hasImagePrompt: !!request.imagePrompt,
    textLength: request.cafeAstrologyText?.length || 0,
    promptLength: request.imagePrompt?.length || 0,
  })

  // Validate inputs
  if (!request.imagePrompt || request.imagePrompt.trim() === '') {
    throw new Error('Image prompt is empty - cannot generate image without prompt')
  }

  if (!request.cafeAstrologyText || request.cafeAstrologyText.trim() === '') {
    throw new Error('Cafe Astrology text is empty - cannot generate horoscope without source text')
  }

  const startTime = Date.now()

  try {
    // Run text transformation and image generation in parallel for better performance
    console.log('⚡ Running text transformation and image generation in parallel...')
    
    const [textResult, imageResult] = await Promise.all([
      // Transform horoscope text to Co-Star style
      transformHoroscopeToCoStarStyle(request.cafeAstrologyText, request.starSign)
        .then(result => {
          console.log('✅ Text transformation completed')
          return result
        })
        .catch(error => {
          console.error('❌ Text transformation failed:', error)
          throw error
        }),
      
      // Generate image from prompt
      generateImageFromPrompt(request.imagePrompt)
        .then(result => {
          console.log('✅ Image generation completed')
          return result
        })
        .catch(error => {
          console.error('❌ Image generation failed:', error)
          throw error
        })
    ])

    const elapsedTime = Date.now() - startTime
    console.log(`✅ Horoscope generation completed in ${elapsedTime}ms`)

    // Validate results
    if (!textResult.horoscope || !Array.isArray(textResult.dos) || !Array.isArray(textResult.donts)) {
      throw new Error('Invalid text transformation result: missing horoscope text or dos/donts')
    }

    if (!imageResult.imageUrl) {
      throw new Error('Invalid image generation result: missing imageUrl')
    }

    console.log('✅ Successfully generated horoscope via direct API calls')
    console.log('Result:', {
      horoscopeLength: textResult.horoscope?.length || 0,
      dosCount: textResult.dos?.length || 0,
      dontsCount: textResult.donts?.length || 0,
      hasImageUrl: !!imageResult.imageUrl,
    })

    // Note: character_name is not generated in direct mode
    // It was previously generated by n8n from image analysis
    // If needed, we can add image analysis here later
    return {
      horoscope: textResult.horoscope,
      dos: textResult.dos,
      donts: textResult.donts,
      imageUrl: imageResult.imageUrl,
      character_name: null, // Not generated in direct mode
      prompt: request.imagePrompt,
      slots: request.slots,
      reasoning: request.reasoning,
    }
  } catch (error: any) {
    console.error('❌ Error in direct horoscope generation:', error)
    throw error
  }
}

