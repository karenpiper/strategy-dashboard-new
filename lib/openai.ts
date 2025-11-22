import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a witty horoscope transformer. You take traditional horoscopes and make them irreverent and fun in the style of Co-Star. You always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 600,
      temperature: 0.9,
    })

    const responseText = completion.choices[0]?.message?.content?.trim()
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
    
    // Handle specific OpenAI API errors
    if (error.response) {
      const status = error.response.status
      const errorData = error.response.data
      const errorMessage = errorData?.error?.message || error.message || 'OpenAI API error'
      
      console.error('OpenAI API error response:', {
        status,
        errorData,
        errorMessage
      })
      
      // Check for billing/quota errors - fail immediately, don't retry
      if (status === 400 || status === 429) {
        const lowerMessage = errorMessage.toLowerCase()
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
    ? [...recentStyleGroupIds.filter((id) => id !== selectedStyleGroupId), selectedStyleGroupId].slice(-7)
    : recentStyleGroupIds

  const updatedStyleReferenceIds = [
    ...recentStyleReferenceIds.filter((id) => id !== slots.style_reference_id),
    slots.style_reference_id,
  ].slice(-7)

  const updatedSubjectRoleIds = [
    ...recentSubjectRoleIds.filter((id) => id !== slots.subject_role_id),
    slots.subject_role_id,
  ].slice(-7)

  const updatedSettingPlaceIds = [
    ...recentSettingPlaceIds.filter((id) => id !== slots.setting_place_id),
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

