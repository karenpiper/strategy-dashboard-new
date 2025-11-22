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
    console.error('Error transforming horoscope:', error)
    if (error.response) {
      console.error('OpenAI API error response:', error.response.status, error.response.data)
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
  },
  weekday: string,
  season: string
): Promise<{ imageUrl: string; prompt: string; slots: any }> {
  console.log('Building horoscope prompt with slot-based system...')

  // Build prompt using new system
  const promptUserProfile: PromptUserProfile = {
    id: userId,
    name: userProfile.name,
    role: userProfile.role || null,
    hobbies: userProfile.hobbies || null,
    starSign: userProfile.starSign,
  }

  const { prompt, slots } = await buildHoroscopePrompt(
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
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables')
    }
    
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      size: '1024x1024', // Square format for portrait/avatar use
      quality: 'standard',
      n: 1,
    })

    const imageUrl = response.data[0]?.url
    if (!imageUrl) {
      throw new Error('Failed to generate horoscope image - empty response')
    }

    console.log('OpenAI DALL-E API call successful')
    return { imageUrl, prompt, slots }
  } catch (error: any) {
    console.error('Error generating horoscope image:', error)
    if (error.response) {
      console.error('OpenAI API error response:', error.response.status, error.response.data)
    }
    throw error
  }
}

