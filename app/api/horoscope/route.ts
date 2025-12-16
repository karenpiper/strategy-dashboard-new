import { NextRequest, NextResponse } from 'next/server'
import { generateHoroscopeViaElvex } from '@/lib/elvex-horoscope-service'
import { fetchCafeAstrologyHoroscope } from '@/lib/cafe-astrology'
import {
  buildUserProfile,
  fetchSegmentsForProfile,
  fetchRulesForSegments,
  fetchCurrentThemes,
  fetchThemeRules,
  fetchActiveStyles,
  resolveConfig,
  makeResolvedChoices,
} from '@/lib/horoscope-engine'
import { fetchHoroscopeConfig } from '@/lib/horoscope-config'
import { buildHoroscopePrompt, type UserProfile as PromptUserProfile } from '@/lib/horoscope-prompt-builder'
import { updateUserAvatarState } from '@/lib/horoscope-catalogs'
import { createClient } from '@/lib/supabase/server'
import { getTodayDateInTimezone } from '@/lib/utils'

// Supabase client setup - uses service role for database operations
async function getSupabaseAdminClient() {
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE
  
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    throw new Error('Missing Supabase URL: NEXT_PUBLIC_SUPABASE_URL must be set in environment variables')
  }
  
  if (!supabaseServiceKey || supabaseServiceKey.trim() === '') {
    throw new Error('Missing Supabase Service Role Key: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE must be set in Vercel environment variables.')
  }
  
  return createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
      }

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = user.id
    const supabaseAdmin = await getSupabaseAdminClient()
    
    // Get user profile for timezone
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('birthday, discipline, role, full_name, hobbies, likes_fantasy, likes_scifi, likes_cute, likes_minimal, hates_clowns, timezone')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile.' },
        { status: 404 }
      )
    }
    
    // Calculate today's date in user's timezone (defaults to America/New_York)
    const userTimezone = profile.timezone ? String(profile.timezone) : 'America/New_York'
    const todayDate = getTodayDateInTimezone(userTimezone)
    
    // Check database for cached horoscope
    const { data: cachedHoroscope, error: cacheError } = await supabaseAdmin
      .from('horoscopes')
      .select('star_sign, horoscope_text, horoscope_dos, horoscope_donts, date')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    if (cacheError) {
      console.error('Database error:', cacheError)
      return NextResponse.json(
        { error: 'Database error while checking cache: ' + cacheError.message },
        { status: 500 }
      )
    }
    
    // Return cached horoscope if found and has text
    if (cachedHoroscope && cachedHoroscope.horoscope_text && cachedHoroscope.date === todayDate) {
        return NextResponse.json({
          star_sign: cachedHoroscope.star_sign,
          horoscope_text: cachedHoroscope.horoscope_text,
          horoscope_dos: cachedHoroscope.horoscope_dos || [],
          horoscope_donts: cachedHoroscope.horoscope_donts || [],
          cached: true,
        })
    }
    
    // Parse birthday
    let birthdayMonth: number | null = null
    let birthdayDay: number | null = null
    
    if (profile.birthday) {
      if (typeof profile.birthday === 'string') {
        const parts = profile.birthday.split(/[\/\-]/)
        if (parts.length === 2) {
          birthdayMonth = parseInt(parts[0])
          birthdayDay = parseInt(parts[1])
        }
      } else if (profile.birthday.month && profile.birthday.day) {
        birthdayMonth = parseInt(profile.birthday.month)
        birthdayDay = parseInt(profile.birthday.day)
      }
    }
    
    const hasValidBirthday = birthdayMonth && birthdayDay && !isNaN(birthdayMonth) && !isNaN(birthdayDay)
    
    if (!hasValidBirthday) {
      return NextResponse.json(
        { error: 'Birthday is required to generate horoscope text. Please complete your profile.' },
        { status: 400 }
      )
    }
    
    // Fetch horoscope configuration
    const config = await fetchHoroscopeConfig(
      supabaseAdmin,
      birthdayMonth,
      birthdayDay,
      profile.discipline,
      profile.role
    )
    const { userProfile, resolvedChoices, starSign } = config
    
    // Generate horoscope via Elvex
    let horoscopeText: string
    let horoscopeDos: string[]
    let horoscopeDonts: string[]
    let imagePrompt: string
    let promptSlots: any
    let promptReasoning: any
    
    try {
      // Build user profile for prompt
      const promptUserProfile: PromptUserProfile = {
        id: userId,
        name: profile.full_name || 'User',
        role: profile.role || null,
        hobbies: profile.hobbies || null,
        starSign: starSign,
        element: userProfile.element,
        likes_fantasy: profile.likes_fantasy || false,
        likes_scifi: profile.likes_scifi || false,
        likes_cute: profile.likes_cute || false,
        likes_minimal: profile.likes_minimal || false,
        hates_clowns: profile.hates_clowns || false,
      }
      
      // Fetch Cafe Astrology and build prompt in parallel
        const [cafeAstrologyText, promptResult] = await Promise.all([
        fetchCafeAstrologyHoroscope(starSign),
          buildHoroscopePrompt(
            supabaseAdmin,
            userId,
            todayDate,
            promptUserProfile,
            userProfile.weekday,
            userProfile.season
        )
        ])
        
        imagePrompt = promptResult.prompt
        promptSlots = promptResult.slots
        promptReasoning = promptResult.reasoning
        
        if (!imagePrompt || imagePrompt.trim() === '') {
        throw new Error('Failed to build image prompt')
      }
      
      if (!process.env.ELVEX_API_KEY) {
        throw new Error('ELVEX_API_KEY is required')
      }
      
      // Generate via Elvex
      const directResult = await generateHoroscopeViaElvex({
            starSign,
            userId,
            date: todayDate,
            cafeAstrologyText: cafeAstrologyText,
        imagePrompt: imagePrompt,
            slots: promptSlots,
            reasoning: promptReasoning,
        timezone: userTimezone,
        })

        if (!directResult.horoscope || !directResult.dos || !directResult.donts) {
        throw new Error('Invalid Elvex API result: missing horoscope text, dos, or donts')
        }

        horoscopeText = directResult.horoscope
        horoscopeDos = directResult.dos
        horoscopeDonts = directResult.donts
      
    } catch (error: any) {
      console.error('Error generating horoscope:', error)
      
      if (error.message?.includes('Cannot find module') || error.code === 'MODULE_NOT_FOUND') {
        return NextResponse.json(
          { 
            error: 'Failed to generate horoscope: Required packages not installed',
            code: 'module_error',
          },
          { status: 500 }
        )
      }
      
      if (error.message?.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Horoscope generation timed out. Please try again.',
            code: 'timeout',
          },
          { status: 504 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `Failed to generate horoscope: ${error.message || 'Unknown error'}`,
          code: error.code || 'unknown_error',
        },
        { status: error.status || 500 }
      )
    }
    
    // Update user avatar state (if we have prompt slots)
    if (promptSlots) {
      try {
          const { data: styleReference } = await supabaseAdmin
            .from('prompt_slot_catalogs')
            .select('style_group_id')
            .eq('id', promptSlots.style_reference_id)
            .single()
          
          const selectedStyleGroupId = styleReference?.style_group_id
          
          const { data: avatarState } = await supabaseAdmin
            .from('user_avatar_state')
            .select('*')
        .eq('user_id', userId)
            .single()
          
          const recentStyleGroupIds = avatarState?.recent_style_group_ids || []
          const recentStyleReferenceIds = avatarState?.recent_style_reference_ids || []
          const recentSubjectRoleIds = avatarState?.recent_subject_role_ids || []
          const recentSettingPlaceIds = avatarState?.recent_setting_place_ids || []
          
          const updatedStyleGroupIds = selectedStyleGroupId
          ? [...recentStyleGroupIds.filter((id: string) => id !== selectedStyleGroupId), selectedStyleGroupId].slice(-7)
            : recentStyleGroupIds
          
          const updatedStyleReferenceIds = [
          ...recentStyleReferenceIds.filter((id: string) => id !== promptSlots.style_reference_id),
            promptSlots.style_reference_id,
          ].slice(-7)
          
          const updatedSubjectRoleIds = [
          ...recentSubjectRoleIds.filter((id: string) => id !== promptSlots.subject_role_id),
            promptSlots.subject_role_id,
          ].slice(-7)
          
          const updatedSettingPlaceIds = [
          ...recentSettingPlaceIds.filter((id: string) => id !== promptSlots.setting_place_id),
            promptSlots.setting_place_id,
          ].slice(-7)
          
          await updateUserAvatarState(supabaseAdmin, userId, {
            last_generated_date: todayDate,
            recent_style_group_ids: updatedStyleGroupIds,
            recent_style_reference_ids: updatedStyleReferenceIds,
            recent_subject_role_ids: updatedSubjectRoleIds,
            recent_setting_place_ids: updatedSettingPlaceIds,
          })
      } catch (avatarStateError: any) {
        // Don't fail the request if avatar state update fails
        console.warn('Failed to update avatar state:', avatarStateError)
      }
    }
    
    // Delete old horoscope records (keep only today's)
    await supabaseAdmin
      .from('horoscopes')
      .delete()
      .eq('user_id', userId)
      .neq('date', todayDate)
    
    // Save horoscope to database
    const upsertData: any = {
      user_id: userId,
      star_sign: starSign,
      horoscope_text: horoscopeText,
      horoscope_dos: horoscopeDos,
      horoscope_donts: horoscopeDonts,
      date: todayDate,
      generated_at: new Date().toISOString(),
      prompt_slots_json: promptSlots,
      image_prompt: imagePrompt,
    }
    
    const { error: upsertError } = await supabaseAdmin
      .from('horoscopes')
      .upsert(upsertData, {
        onConflict: 'user_id,date',
        ignoreDuplicates: false
    })
    
    if (upsertError) {
      console.error('Error saving horoscope:', upsertError)
        return NextResponse.json(
          { 
          error: 'Failed to save horoscope to database. Please try again.',
            details: upsertError.message,
          },
          { status: 500 }
        )
      }
    
    // Return generated horoscope
    return NextResponse.json({
      star_sign: starSign,
      horoscope_text: horoscopeText,
      horoscope_dos: horoscopeDos,
      horoscope_donts: horoscopeDonts,
      cached: false,
    })
  } catch (error: any) {
    console.error('Error in horoscope API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate horoscope' },
      { status: 500 }
    )
  }
}
