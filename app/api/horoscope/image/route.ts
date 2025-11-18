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
import { getStarSign } from '@/lib/horoscope-utils'

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
    const userProfile = buildUserProfile(
      birthdayMonth,
      birthdayDay,
      profile.discipline,
      profile.role
    )
    
    const starSign = userProfile.sign
    
    // Use admin client for all database operations
    const supabase = await getSupabaseAdminClient()
    
    // Fetch configuration from database
    const segments = await fetchSegmentsForProfile(supabase, userProfile)
    const segmentIds = segments.map(s => s.id)
    const rules = await fetchRulesForSegments(supabase, segmentIds)
    const themes = await fetchCurrentThemes(supabase, userProfile.today)
    
    let allThemeRules: any[] = []
    for (const theme of themes) {
      const themeRules = await fetchThemeRules(supabase, theme.id, segmentIds)
      allThemeRules.push(...themeRules)
    }
    
    const styles = await fetchActiveStyles(supabase)
    
    if (styles.length === 0) {
      return NextResponse.json(
        { error: 'Horoscope configuration not initialized' },
        { status: 500 }
      )
    }
    
    // Resolve config and make choices
    const resolvedConfig = resolveConfig(rules, themes, allThemeRules, styles)
    const resolvedChoices = makeResolvedChoices(resolvedConfig, styles)
    
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
      return NextResponse.json({
        image_url: cachedHoroscope.image_url,
        image_prompt: cachedHoroscope.image_prompt || null,
        cached: true,
      })
    }
    
    // Generate new image
    const { imageUrl, prompt } = await generateHoroscopeImage(starSign, {
      characterType: resolvedChoices.characterType,
      styleLabel: resolvedChoices.styleLabel,
      promptTags: resolvedChoices.promptTags,
      themeSnippet: resolvedChoices.themeSnippet,
    })
    
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
    
    return NextResponse.json({
      image_url: imageUrl,
      image_prompt: prompt,
      cached: false,
    })
  } catch (error: any) {
    console.error('Error in horoscope image API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate horoscope image' },
      { status: 500 }
    )
  }
}

