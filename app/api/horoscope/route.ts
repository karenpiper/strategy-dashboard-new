import { NextRequest, NextResponse } from 'next/server'
import { transformHoroscopeToCoStarStyle, generateHoroscopeImage } from '@/lib/openai'
import { fetchCafeAstrologyHoroscope } from '@/lib/cafe-astrology'
import { generateSillyCharacterName } from '@/lib/silly-names'
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
// This bypasses RLS so the API can insert/update horoscopes
async function getSupabaseAdminClient() {
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Check both possible names for the service role key
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE
  
  // Check if environment variables are set and not empty
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    console.error('NEXT_PUBLIC_SUPABASE_URL is missing or empty')
    throw new Error('Missing Supabase URL: NEXT_PUBLIC_SUPABASE_URL must be set in environment variables')
  }
  
  if (!supabaseServiceKey || supabaseServiceKey.trim() === '') {
    console.error('Service role key is missing or empty')
    throw new Error('Missing Supabase Service Role Key: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE must be set in Vercel environment variables. Go to your Vercel project settings > Environment Variables and add the service role key from Supabase Dashboard > Settings > API')
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

// Supabase client for user authentication (uses anon key)
async function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
  }
  
  // Try to use @supabase/ssr if available, otherwise use @supabase/supabase-js
  try {
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch {
              // Ignore errors in server components
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch {
              // Ignore errors in server components
            }
          },
        },
      }
    )
        } catch {
          // Fallback to basic Supabase client if @supabase/ssr is not available
          const { createClient } = await import('@supabase/supabase-js')
          return createClient(
            supabaseUrl,
            supabaseAnonKey
          )
        }
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

    // Use admin client for database operations (bypasses RLS)
    const supabaseAdmin = await getSupabaseAdminClient()
    
    // Get today's date in YYYY-MM-DD format (use local timezone for midnight local time)
    const today = new Date()
    const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayDate = localDate.toISOString().split('T')[0] // YYYY-MM-DD format
    
    console.log('Checking for cached horoscope - user:', userId, 'date:', todayDate, 'local time:', today.toLocaleString())
    
    // Check for cached horoscope for today - return immediately if found
    // Use gte and lt to handle any timezone edge cases, but primarily use exact match
    const { data: cachedHoroscope, error: cacheError } = await supabaseAdmin
      .from('horoscopes')
      .select('star_sign, horoscope_text, horoscope_dos, horoscope_donts, image_url, date, generated_at, character_name')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    if (cacheError) {
      console.error('Error checking cache:', cacheError)
    }
    
    // Also check if there are any recent horoscopes for debugging
    const { data: recentHoroscopes } = await supabaseAdmin
      .from('horoscopes')
      .select('date, horoscope_text, generated_at')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5)
    
    console.log('Cache check result:', {
      found: !!cachedHoroscope,
      hasText: !!cachedHoroscope?.horoscope_text,
      date: cachedHoroscope?.date,
      expectedDate: todayDate,
      recentHoroscopes: recentHoroscopes?.map(h => ({ date: h.date, hasText: !!h.horoscope_text }))
    })
    
    // IMPORTANT: Only regenerate if there's NO cached text at all
    // This ensures horoscope text is generated ONCE per day per user and cached in the database
    // This prevents hitting billing limits by regenerating unnecessarily
    
    if (cachedHoroscope && cachedHoroscope.horoscope_text && cachedHoroscope.horoscope_text.trim() !== '') {
      console.log('✅ Returning cached horoscope text for user', userId, 'on date', todayDate, '- NO API CALL - using database cache')
      return NextResponse.json({
        star_sign: cachedHoroscope.star_sign,
        horoscope_text: cachedHoroscope.horoscope_text,
        horoscope_dos: cachedHoroscope.horoscope_dos || [],
        horoscope_donts: cachedHoroscope.horoscope_donts || [],
        image_url: cachedHoroscope.image_url || '',
        character_name: cachedHoroscope.character_name || null,
        cached: true,
      })
    }
    
    // Only generate new horoscope if we don't have one cached for today
    console.log('⚠️ No cached horoscope text found for user', userId, 'on date', todayDate, '- GENERATING NEW HOROSCOPE (this will call OpenAI API)')
    
    // Fetch user profile to get birthday, discipline (department), role (title)
    const { data: profile, error: profileError } = await supabaseAdmin
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
    
    // Parse birthday - could be stored as "MM/DD", "MM-DD", or separate fields
    let birthdayMonth: number | null = null
    let birthdayDay: number | null = null
    
    if (profile.birthday) {
      // Handle different birthday formats
      if (typeof profile.birthday === 'string') {
        // Format: "MM/DD" or "MM-DD"
        const parts = profile.birthday.split(/[\/\-]/)
        if (parts.length === 2) {
          birthdayMonth = parseInt(parts[0])
          birthdayDay = parseInt(parts[1])
        }
      } else if (profile.birthday.month && profile.birthday.day) {
        // Object format: { month: 3, day: 15 }
        birthdayMonth = parseInt(profile.birthday.month)
        birthdayDay = parseInt(profile.birthday.day)
      }
    }
    
    // Validate birthday fields exist
    if (!birthdayMonth || !birthdayDay || isNaN(birthdayMonth) || isNaN(birthdayDay)) {
      return NextResponse.json(
        { error: 'Birthday not set in profile. Please update your profile with your birthday.' },
        { status: 400 }
      )
    }
    
    // Fetch horoscope configuration (shared logic)
    console.log('Fetching horoscope configuration...')
    const config = await fetchHoroscopeConfig(
      supabaseAdmin,
      birthdayMonth,
      birthdayDay,
      profile.discipline,
      profile.role
    )
    const { userProfile, resolvedChoices, starSign } = config
    console.log('Resolved choices:', resolvedChoices)
    
    // Generate character name once per day (same time as horoscope text)
    const characterName = generateSillyCharacterName(starSign)
    console.log('Generated character name:', characterName)
    
    // Fetch from Cafe Astrology and transform to Co-Star style
    console.log('Generating horoscope for:', { starSign, profile: userProfile })
    let horoscopeText: string
    let horoscopeDos: string[]
    let horoscopeDonts: string[]
    let imageUrl: string
    
    try {
      console.log('Fetching horoscope from Cafe Astrology...')
      const startTime = Date.now()
      
      // Fetch from Cafe Astrology
      const cafeAstrologyText = await fetchCafeAstrologyHoroscope(starSign)
      console.log('Fetched horoscope from Cafe Astrology')
      
      // Transform to Co-Star style (image generation is now separate)
      const transformed = await transformHoroscopeToCoStarStyle(cafeAstrologyText, starSign)
      horoscopeText = transformed.horoscope
      horoscopeDos = transformed.dos
      horoscopeDonts = transformed.donts
      
      const elapsedTime = Date.now() - startTime
      console.log(`Horoscope text generation completed in ${elapsedTime}ms`)
      
      // Get image URL from database (it should already be generated by the image endpoint)
      const { data: cachedImage } = await supabaseAdmin
        .from('horoscopes')
        .select('image_url')
        .eq('user_id', userId)
        .eq('date', todayDate)
        .maybeSingle()
      
      imageUrl = cachedImage?.image_url || ''
      
      console.log('Horoscope generated successfully:', { 
        horoscopeText: horoscopeText.substring(0, 50) + '...', 
        dosCount: horoscopeDos.length,
        dontsCount: horoscopeDonts.length,
        imageUrl 
      })
    } catch (error: any) {
      console.error('Error generating horoscope or image:', error)
      return NextResponse.json(
        { error: `Failed to generate horoscope: ${error.message || 'Unknown error'}` },
        { status: 500 }
      )
    }
    
    // Save horoscope text to database
    // Use upsert to handle both insert and update in one operation
    // This ensures the date is always set correctly and avoids race conditions
    // First check if a record exists to preserve image_url and prompt_slots_json
    const { data: existingHoroscope } = await supabaseAdmin
      .from('horoscopes')
      .select('image_url, prompt_slots_json, image_prompt')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    const upsertData: any = {
      user_id: userId,
      star_sign: starSign,
      horoscope_text: horoscopeText,
      horoscope_dos: horoscopeDos,
      horoscope_donts: horoscopeDonts,
      character_name: characterName,
      date: todayDate, // Explicitly set date to ensure consistency
      generated_at: new Date().toISOString(),
    }
    
    // Preserve existing image data if it exists
    if (existingHoroscope?.image_url) {
      upsertData.image_url = existingHoroscope.image_url
    }
    if (existingHoroscope?.prompt_slots_json) {
      upsertData.prompt_slots_json = existingHoroscope.prompt_slots_json
    }
    if (existingHoroscope?.image_prompt) {
      upsertData.image_prompt = existingHoroscope.image_prompt
    }
    
    const { error: upsertError } = await supabaseAdmin
      .from('horoscopes')
      .upsert(upsertData, {
        onConflict: 'user_id,date', // Use the unique constraint
        ignoreDuplicates: false // Update existing records
      })
    
    if (upsertError) {
      // Continue anyway - we still return the generated horoscope
      console.error('Error upserting horoscope text:', upsertError)
      console.warn('Warning: Failed to save horoscope to database, but returning generated horoscope')
    } else {
      console.log('Successfully saved horoscope text for user', userId, 'on date', todayDate)
    }
    
    return NextResponse.json({
      star_sign: starSign,
      horoscope_text: horoscopeText,
      horoscope_dos: horoscopeDos,
      horoscope_donts: horoscopeDonts,
      image_url: imageUrl,
      character_name: characterName,
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

