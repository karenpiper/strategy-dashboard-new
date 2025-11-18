import { NextRequest, NextResponse } from 'next/server'
import { generateHoroscopeImage } from '@/lib/openai'
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

// Supabase client setup - uses service role for database operations
async function getSupabaseAdminClient() {
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
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
    // TEMPORARY: Hardcoded test data (remove when authentication is added back)
    const TEST_MODE = true // Set to false when auth is enabled
    
    let userId: string
    let profile: { birthday: string; discipline: string | null; role: string | null }
    
    if (TEST_MODE) {
      userId = '00000000-0000-0000-0000-000000000000'
      profile = {
        birthday: '03/15', // March 15th - Pisces
        discipline: 'Design',
        role: 'Creative Director'
      }
    } else {
      // TODO: Add authentication logic here
      return NextResponse.json({ error: 'Authentication not implemented' }, { status: 401 })
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
      }
    }
    
    if (!birthdayMonth || !birthdayDay || isNaN(birthdayMonth) || isNaN(birthdayDay)) {
      return NextResponse.json(
        { error: 'Birthday not set in profile' },
        { status: 400 }
      )
    }
    
    // Build user profile
    const supabase = await getSupabaseAdminClient()
    
    // Fetch horoscope configuration (shared logic)
    const config = await fetchHoroscopeConfig(
      supabase,
      birthdayMonth,
      birthdayDay,
      profile.discipline,
      profile.role
    )
    const { userProfile, resolvedChoices, starSign } = config
    
    // Check for cached image
    const today = new Date()
    const todayDate = today.toISOString().split('T')[0]
    
    const { data: cachedHoroscope } = await supabase
      .from('horoscopes')
      .select('image_url, image_prompt')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    if (cachedHoroscope?.image_url) {
      // For cached horoscopes, rebuild the config to get all the data (prompt tags, theme, etc.)
      // This ensures we have complete information even for cached images
      const config = await fetchHoroscopeConfig(
        supabase,
        birthdayMonth,
        birthdayDay,
        profile.discipline,
        profile.role
      )
      const { userProfile: rebuiltProfile, resolvedChoices: rebuiltChoices } = config
      
      return NextResponse.json({
        image_url: cachedHoroscope.image_url,
        image_prompt: cachedHoroscope.image_prompt || null,
        cached: true,
        config: {
          userProfile: {
            sign: starSign,
            element: rebuiltProfile.element,
            modality: rebuiltProfile.modality,
            discipline: profile.discipline || null,
            roleLevel: rebuiltProfile.roleLevel || null,
            weekday: rebuiltProfile.weekday,
            season: rebuiltProfile.season,
          },
          resolvedChoices: {
            styleKey: cachedHoroscope.style_key || rebuiltChoices.styleKey,
            styleLabel: cachedHoroscope.style_label || rebuiltChoices.styleLabel,
            characterType: cachedHoroscope.character_type || rebuiltChoices.characterType,
            settingHint: cachedHoroscope.setting_hint || null,
            promptTags: rebuiltChoices.promptTags || [],
            themeSnippet: rebuiltChoices.themeSnippet || null,
          },
          matchedSegments: config.matchedSegments || [],
          appliedRules: config.appliedRules || [],
          themes: config.themes || [],
        },
      })
    }
    
    // Generate new image with full user profile context
    const { imageUrl, prompt } = await generateHoroscopeImage(
      starSign,
      {
        characterType: resolvedChoices.characterType,
        styleLabel: resolvedChoices.styleLabel,
        promptTags: resolvedChoices.promptTags,
        themeSnippet: resolvedChoices.themeSnippet,
      },
      {
        element: userProfile.element,
        modality: userProfile.modality,
        discipline: profile.discipline || null,
        roleLevel: userProfile.roleLevel || null,
        weekday: userProfile.weekday,
        season: userProfile.season,
      }
    )
    
    // Save image URL and prompt to database (upsert horoscope record)
    await supabase
      .from('horoscopes')
      .upsert({
        user_id: userId,
        star_sign: starSign,
        image_url: imageUrl,
        image_prompt: prompt,
        style_key: resolvedChoices.styleKey,
        style_label: resolvedChoices.styleLabel,
        character_type: resolvedChoices.characterType,
        date: todayDate,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date',
      })
    
    // Get additional config data for display
    const fullConfig = await fetchHoroscopeConfig(
      supabase,
      birthdayMonth,
      birthdayDay,
      profile.discipline,
      profile.role
    )
    
    return NextResponse.json({
      image_url: imageUrl,
      image_prompt: prompt,
      cached: false,
      config: {
        userProfile: {
          sign: starSign,
          element: userProfile.element,
          modality: userProfile.modality,
          discipline: profile.discipline || null,
          roleLevel: userProfile.roleLevel || null,
          weekday: userProfile.weekday,
          season: userProfile.season,
        },
        resolvedChoices: {
          styleKey: resolvedChoices.styleKey,
          styleLabel: resolvedChoices.styleLabel,
          characterType: resolvedChoices.characterType,
          promptTags: resolvedChoices.promptTags || [],
          themeSnippet: resolvedChoices.themeSnippet || null,
          settingHint: resolvedChoices.settingHint || null,
        },
        matchedSegments: fullConfig.matchedSegments || [],
        appliedRules: fullConfig.appliedRules || [],
        themes: fullConfig.themes || [],
      },
    })
  } catch (error: any) {
    console.error('Error in horoscope image API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate horoscope image' },
      { status: 500 }
    )
  }
}

