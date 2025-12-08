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
    // If we get a quota/rate limit error and have a fallback key, try it
    const isQuotaError = error?.status === 429 || 
                        error?.status === 402 ||
                        error?.message?.toLowerCase().includes('quota') ||
                        error?.message?.toLowerCase().includes('rate limit')
    
    if (isQuotaError && fallbackOpenai) {
      console.log('⚠️ Primary OpenAI API key hit limits, trying fallback key...')
      return await apiCall(fallbackOpenai)
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

      // Don't retry on billing/quota errors
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error?.message || error.message || ''
        const lowerMessage = errorMessage.toLowerCase()
        if (lowerMessage.includes('billing') || 
            lowerMessage.includes('quota') ||
            lowerMessage.includes('hard billing limit') ||
            lowerMessage.includes('usage limit')) {
          throw new Error('OpenAI billing/usage limit reached. Please check your OpenAI account billing settings.')
        }
        throw error
      }

      // Rate limit - retry with backoff
      if (error.response?.status === 429) {
        if (attempt < maxRetries) {
          const retryAfter = error.response.headers?.['retry-after']
          const delay = retryAfter ? parseInt(retryAfter) : Math.pow(2, attempt)
          const jitter = Math.random()
          await new Promise(resolve => setTimeout(resolve, (delay + jitter) * 1000))
          continue
        }
        throw new Error('OpenAI API rate limit exceeded after retries. Please try again later.')
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

