import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables')
}

// Keep OpenAI SDK for image generation (DALL-E)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Dynamic import for Vercel AI SDK to avoid bundling issues
async function getVercelAISDK() {
  try {
    // Use dynamic import with explicit paths to avoid bundling issues
    const aiModule = await import('ai')
    const openaiModule = await import('@ai-sdk/openai')
    
    // Extract functions explicitly to avoid minification issues
    const generateText = aiModule.generateText
    const vercelOpenAI = openaiModule.openai
    
    if (typeof generateText !== 'function') {
      throw new Error('generateText is not a function')
    }
    if (typeof vercelOpenAI !== 'function') {
      throw new Error('vercelOpenAI is not a function')
    }
    
    return {
      generateText,
      vercelOpenAI
    }
  } catch (error: any) {
    console.error('❌ Failed to load Vercel AI SDK:', error)
    console.error('   Error details:', {
      message: error?.message,
      stack: error?.stack?.substring(0, 500),
      name: error?.name
    })
    throw new Error(`Failed to load Vercel AI SDK: ${error.message}. Make sure "ai" and "@ai-sdk/openai" packages are installed.`)
  }
}

/**
 * Transform a Cafe Astrology horoscope into Co-Star style with do's and don'ts
 */
export async function transformHoroscopeToCoStarStyle(
  cafeAstrologyText: string,
  starSign: string
): Promise<{ horoscope: string; dos: string[]; donts: string[] }> {
  console.log('Transforming horoscope to Co-Star style...')
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables')
    }
    
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

    // Use Vercel AI SDK for text generation with fallback support
    // Dynamically import to avoid bundling issues
    const { generateText, vercelOpenAI } = await getVercelAISDK()
    
    const primaryOpenAI = vercelOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    let result
    try {
      result = await generateText({
        model: primaryOpenAI('gpt-4o-mini', {
          responseFormat: { type: 'json_object' },
        }),
        system: 'You are a witty horoscope transformer. You take traditional horoscopes and make them irreverent and fun in the style of Co-Star. You always return valid JSON.',
        prompt: prompt,
        maxTokens: 600,
        temperature: 0.9,
      })
    } catch (error: any) {
      // Extract error message from various possible locations (Vercel AI SDK format)
      const errorMessage = error?.message || 
                          error?.cause?.message ||
                          error?.data?.error?.message ||
                          error?.toString() || 
                          ''
      const lowerMessage = errorMessage.toLowerCase()
      const status = error?.statusCode || 
                     error?.status || 
                     error?.cause?.statusCode ||
                     error?.cause?.status

      console.log('🔍 Vercel AI SDK error detected:', {
        message: errorMessage.substring(0, 200),
        status,
        hasFallback: !!process.env.OPENAI_API_KEY_FALLBACK,
        errorKeys: Object.keys(error || {}),
        fullError: JSON.stringify(error, null, 2).substring(0, 500)
      })

      // Check for quota/billing errors (can be 400, 402, or 429)
      // Vercel AI SDK may format errors differently
      // Also check error message content regardless of status code
      const isQuotaError = status === 402 ||
                          status === 401 || // Sometimes quota errors come as 401
                          (status === 429 && (
                            lowerMessage.includes('exceeded your current quota') ||
                            lowerMessage.includes('quota') ||
                            lowerMessage.includes('billing') ||
                            lowerMessage.includes('check your plan and billing')
                          )) ||
                          (status === 400 && (
                            lowerMessage.includes('quota') ||
                            lowerMessage.includes('billing')
                          )) ||
                          lowerMessage.includes('exceeded your current quota') ||
                          lowerMessage.includes('quota exceeded') ||
                          lowerMessage.includes('hard billing limit') ||
                          lowerMessage.includes('usage limit') ||
                          lowerMessage.includes('insufficient_quota') ||
                          lowerMessage.includes('billing_limit_reached') ||
                          lowerMessage.includes('quota/billing limit reached') // Catch this specific message
      
      console.log('🔍 Quota error detection:', {
        isQuotaError,
        status,
        lowerMessage: lowerMessage.substring(0, 100),
        hasFallback: !!process.env.OPENAI_API_KEY_FALLBACK
      })
      
      // Try fallback key if available and primary key hit limits
      // Be more aggressive - try fallback on ANY error if we have one configured
      if (process.env.OPENAI_API_KEY_FALLBACK && (isQuotaError || status === 429 || status === 401 || status === 400)) {
        console.log('⚠️ Primary OpenAI API key hit limits, trying fallback key for text transformation...')
        console.log('   Original error:', errorMessage.substring(0, 200))
        console.log('   Error status:', status)
        try {
          const fallbackOpenAI = vercelOpenAI({
            apiKey: process.env.OPENAI_API_KEY_FALLBACK,
          })
          result = await generateText({
            model: fallbackOpenAI('gpt-4o-mini', {
              responseFormat: { type: 'json_object' },
            }),
            system: 'You are a witty horoscope transformer. You take traditional horoscopes and make them irreverent and fun in the style of Co-Star. You always return valid JSON.',
            prompt: prompt,
            maxTokens: 600,
            temperature: 0.9,
          })
          console.log('✅ Fallback key succeeded!')
        } catch (fallbackError: any) {
          console.error('❌ Fallback API key also failed:', fallbackError?.message || fallbackError)
          const fallbackMessage = fallbackError?.message || 
                                  fallbackError?.cause?.message ||
                                  fallbackError?.toString() || ''
          const fallbackLower = fallbackMessage.toLowerCase()
          if (fallbackLower.includes('quota') || 
              fallbackLower.includes('billing') ||
              fallbackLower.includes('insufficient_quota') ||
              fallbackLower.includes('billing_limit_reached')) {
            throw new Error('Both primary and fallback OpenAI API keys have exceeded their quotas. Please check your OpenAI account billing settings.')
          }
          throw fallbackError
        }
      } else {
        // No fallback available or not a quota error - throw original error
        console.log('⚠️ Not trying fallback:', {
          hasFallback: !!process.env.OPENAI_API_KEY_FALLBACK,
          isQuotaError,
          status
        })
        throw error
      }
    }

    const responseText = result.text.trim()
    if (!responseText) {
      throw new Error('Failed to transform horoscope - empty response')
    }

    const parsed = JSON.parse(responseText)
    
    if (!parsed.horoscope || !Array.isArray(parsed.dos) || !Array.isArray(parsed.donts)) {
      throw new Error('Invalid response format from OpenAI')
    }

    console.log('Successfully transformed horoscope to Co-Star style')
    return {
      horoscope: parsed.horoscope,
      dos: parsed.dos,
      donts: parsed.donts,
    }
  } catch (error: any) {
    console.error('❌ Error transforming horoscope:', error)
    
    // Handle Vercel AI SDK errors
    const errorMessage = error?.message || error?.toString() || 'OpenAI API error'
    const status = error?.statusCode || error?.status
    const lowerMessage = errorMessage.toLowerCase()
    
    console.error('Vercel AI SDK error:', {
      status,
      errorMessage,
      error
    })
    
    // Check for billing/quota errors - fail immediately, don't retry
    if (status === 400 || status === 429) {
      if (lowerMessage.includes('billing') || 
          lowerMessage.includes('quota') ||
          lowerMessage.includes('hard billing limit') ||
          lowerMessage.includes('usage limit') ||
          lowerMessage.includes('exceeded your current quota')) {
        const billingError = 'OpenAI billing/quota limit reached. Please check your OpenAI account billing settings and add payment method if needed.'
        console.error('🚫 BILLING/QUOTA LIMIT REACHED:', billingError)
        throw new Error(billingError)
      }
    }
    
    // Rate limit (429) - but not quota-related
    if (status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again in a few minutes.')
    }
    
    throw error
  }
}

import { buildHoroscopePrompt, type UserProfile as PromptUserProfile } from './horoscope-prompt-builder'
import { updateUserAvatarState } from './horoscope-catalogs'

/**
 * Generate a fun, illustrative portrait for the horoscope using the new slot-based prompt system
 * Returns both the image URL, the prompt used, and the selected slots
 */
export async function generateHoroscopeImage(
  supabase: any,
  userId: string,
  date: string, // YYYY-MM-DD format
  userProfile: {
    name: string
    role?: string | null
    hobbies?: string[] | null
    starSign?: string
    element?: string
    likes_fantasy?: boolean
    likes_scifi?: boolean
    likes_cute?: boolean
    likes_minimal?: boolean
    hates_clowns?: boolean
  },
  weekday: string,
  season: string
): Promise<{ imageUrl: string; prompt: string; slots: any; reasoning: any }> {
  console.log('Building horoscope prompt with slot-based system...')

  // Build prompt using new system
  const promptUserProfile: PromptUserProfile = {
    id: userId,
    name: userProfile.name,
    role: userProfile.role || null,
    hobbies: userProfile.hobbies || null,
    starSign: userProfile.starSign,
    element: userProfile.element,
    likes_fantasy: userProfile.likes_fantasy,
    likes_scifi: userProfile.likes_scifi,
    likes_cute: userProfile.likes_cute,
    likes_minimal: userProfile.likes_minimal,
    hates_clowns: userProfile.hates_clowns,
  }

  const { prompt, slots, reasoning } = await buildHoroscopePrompt(
    supabase,
    userId,
    date,
    promptUserProfile,
    weekday,
    season
  )

  // Get style group ID from the selected style reference
  const { data: styleReference } = await supabase
    .from('prompt_slot_catalogs')
    .select('style_group_id')
    .eq('id', slots.style_reference_id)
    .single()

  const selectedStyleGroupId = styleReference?.style_group_id

  // Get recent history from user avatar state and update
  const { data: avatarState } = await supabase
    .from('user_avatar_state')
    .select('*')
    .eq('user_id', userId)
    .single()

  const recentStyleGroupIds = avatarState?.recent_style_group_ids || []
  const recentStyleReferenceIds = avatarState?.recent_style_reference_ids || []
  const recentSubjectRoleIds = avatarState?.recent_subject_role_ids || []
  const recentSettingPlaceIds = avatarState?.recent_setting_place_ids || []

  // Add new selections to recent history (keep last 7)
  const updatedStyleGroupIds = selectedStyleGroupId
    ? [...recentStyleGroupIds.filter((id: string) => id !== selectedStyleGroupId), selectedStyleGroupId].slice(-7)
    : recentStyleGroupIds

  const updatedStyleReferenceIds = [
    ...recentStyleReferenceIds.filter((id: string) => id !== slots.style_reference_id),
    slots.style_reference_id,
  ].slice(-7)

  const updatedSubjectRoleIds = [
    ...recentSubjectRoleIds.filter((id: string) => id !== slots.subject_role_id),
    slots.subject_role_id,
  ].slice(-7)

  const updatedSettingPlaceIds = [
    ...recentSettingPlaceIds.filter((id: string) => id !== slots.setting_place_id),
    slots.setting_place_id,
  ].slice(-7)

  await updateUserAvatarState(supabase, userId, {
    last_generated_date: date,
    recent_style_group_ids: updatedStyleGroupIds,
    recent_style_reference_ids: updatedStyleReferenceIds,
    recent_subject_role_ids: updatedSubjectRoleIds,
    recent_setting_place_ids: updatedSettingPlaceIds,
  })

  console.log('Calling OpenAI DALL-E API with generated prompt...')
  
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables')
    }
    
  // Retry logic with exponential backoff for rate limits
  // IMPORTANT: We use exponential backoff with jitter to avoid thundering herd
  const maxRetries = 3
  let lastError: any = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempting OpenAI DALL-E API call (attempt ${attempt + 1}/${maxRetries + 1})...`)
    
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      size: '1024x1024', // Square format for portrait/avatar use
      quality: 'standard',
      n: 1,
    })

      // Note: Rate limit headers are not directly accessible in OpenAI SDK response
      // They would need to be accessed from the raw HTTP response if needed
      // For now, we rely on error responses to detect rate limits

      const imageUrl = response.data?.[0]?.url
    if (!imageUrl) {
      throw new Error('Failed to generate horoscope image - empty response')
    }

      console.log('✅ OpenAI DALL-E API call successful')
      return { imageUrl, prompt, slots, reasoning }
  } catch (error: any) {
      lastError = error
      console.error(`❌ Error generating horoscope image (attempt ${attempt + 1}/${maxRetries + 1}):`, error)
      
      // Handle specific OpenAI API errors
    if (error.response) {
        const status = error.response.status
        const errorData = error.response.data
        const errorMessage = errorData?.error?.message || error.message || 'OpenAI API error'
        
        console.error('OpenAI API error response:', {
          status,
          errorData,
          headers: error.response.headers
        })
        
        // Check for billing/quota errors - don't retry these, fail immediately
        if (status === 400) {
          const lowerMessage = errorMessage.toLowerCase()
          if (lowerMessage.includes('billing') || 
              lowerMessage.includes('quota') ||
              lowerMessage.includes('hard billing limit') ||
              lowerMessage.includes('usage limit')) {
            const billingError = 'OpenAI billing/usage limit reached. Please check your OpenAI account billing settings and add payment method if needed. The system will not retry to avoid further charges.'
            console.error('🚫 BILLING LIMIT REACHED - STOPPING ALL RETRIES:', billingError)
            throw new Error(billingError)
          }
          // Other 400 errors - don't retry
          throw error
        }
        
        // Rate limit (429) - retry with exponential backoff and jitter
        if (status === 429) {
          if (attempt < maxRetries) {
            // Get retry-after header or use exponential backoff
            const retryAfterHeader = error.response.headers?.['retry-after']
            const retryAfterSeconds = retryAfterHeader 
              ? parseInt(retryAfterHeader)
              : Math.pow(2, attempt) // Exponential backoff: 1s, 2s, 4s
            
            // Add random jitter (0-1 second) to prevent thundering herd
            const jitter = Math.random()
            const delay = retryAfterSeconds + jitter
            
            console.log(`⏳ Rate limit hit (429). Waiting ${delay.toFixed(2)} seconds before retry ${attempt + 1}/${maxRetries}...`)
            await new Promise(resolve => setTimeout(resolve, delay * 1000))
            continue // Retry the request
          } else {
            throw new Error('OpenAI API rate limit exceeded after retries. Please try again later.')
          }
        }
        
        // Other errors - don't retry
        throw error
      }
      
      // If no response object, don't retry
    throw error
  }
  }
  
  // If we exhausted all retries, throw the last error
  throw lastError || new Error('Failed to generate horoscope image after retries')
}

