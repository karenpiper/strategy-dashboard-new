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
import { createClient } from '@/lib/supabase/server'

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
    // Get authenticated user from Supabase (server-side)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Fetch user profile to get birthday, discipline, and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('birthday, discipline, role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile.' },
        { status: 404 }
      )
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
    
    // Use admin client for database operations (bypasses RLS)
    const supabaseAdmin = await getSupabaseAdminClient()
    
    // Fetch horoscope configuration (shared logic)
    const config = await fetchHoroscopeConfig(
      supabaseAdmin,
      birthdayMonth,
      birthdayDay,
      profile.discipline,
      profile.role
    )
    const { userProfile, resolvedChoices, starSign } = config
    
    // Check for cached image - only generate once per user per day
    const today = new Date()
    const todayDate = today.toISOString().split('T')[0] // YYYY-MM-DD format
    
    console.log('Checking for cached image - user:', userId, 'date:', todayDate, 'UTC time:', today.toISOString())
    
    const { data: cachedHoroscope, error: cacheError } = await supabaseAdmin
      .from('horoscopes')
      .select('image_url, image_prompt, style_key, style_label, character_type, setting_hint, date, generated_at')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    if (cacheError) {
      console.error('Error checking cache:', cacheError)
    }
    
    // Also check if there are any recent horoscopes for debugging
    const { data: recentHoroscopes } = await supabaseAdmin
      .from('horoscopes')
      .select('date, image_url, generated_at')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5)
    
    console.log('Image cache check result:', {
      found: !!cachedHoroscope,
      hasImage: !!cachedHoroscope?.image_url,
      date: cachedHoroscope?.date,
      expectedDate: todayDate,
      recentHoroscopes: recentHoroscopes?.map(h => ({ date: h.date, hasImage: !!h.image_url }))
    })
    
    // If we have a cached image for today, return it immediately (don't regenerate)
    if (cachedHoroscope && cachedHoroscope.image_url && cachedHoroscope.image_url.trim() !== '') {
      console.log('✅ Returning cached image for user', userId, 'on date', todayDate)
      // For cached horoscopes, rebuild the config to get all the data (prompt tags, theme, etc.)
      // This ensures we have complete information even for cached images
      const config = await fetchHoroscopeConfig(
        supabaseAdmin,
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
    
    // Only generate new image if we don't have one cached for today
    console.log('No cached image found for user', userId, 'on date', todayDate, '- generating new image')
    
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
    // This ensures we only generate once per user per day
    // Historical images are preserved - each day gets its own row
    // First check if a record exists to preserve horoscope_text
    const { data: existingHoroscope } = await supabaseAdmin
      .from('horoscopes')
      .select('horoscope_text, horoscope_dos, horoscope_donts, star_sign')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    // Use upsert but preserve existing text if it exists
    const upsertData: any = {
      user_id: userId,
      star_sign: starSign,
      image_url: imageUrl,
      image_prompt: prompt,
      style_key: resolvedChoices.styleKey,
      style_label: resolvedChoices.styleLabel,
      character_type: resolvedChoices.characterType,
      date: todayDate, // Explicitly set date to ensure consistency
      generated_at: new Date().toISOString(),
    }
    
    // Preserve existing text if it exists
    if (existingHoroscope?.horoscope_text) {
      upsertData.horoscope_text = existingHoroscope.horoscope_text
      upsertData.horoscope_dos = existingHoroscope.horoscope_dos || []
      upsertData.horoscope_donts = existingHoroscope.horoscope_donts || []
    } else {
      // No existing text, set empty values (will be filled by text endpoint)
      upsertData.horoscope_text = ''
      upsertData.horoscope_dos = []
      upsertData.horoscope_donts = []
    }
    
    const { error: upsertError } = await supabaseAdmin
      .from('horoscopes')
      .upsert(upsertData, {
        onConflict: 'user_id,date', // Use the unique constraint
        ignoreDuplicates: false // Update existing records
      })
    
    if (upsertError) {
      console.error('Error upserting horoscope image:', upsertError)
      throw upsertError
    } else {
      console.log('Successfully saved horoscope image for user', userId, 'on date', todayDate)
    }
    
    // Get additional config data for display
    const fullConfig = await fetchHoroscopeConfig(
      supabaseAdmin,
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

