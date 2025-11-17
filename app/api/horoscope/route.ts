import { NextRequest, NextResponse } from 'next/server'
import { transformHoroscopeToCoStarStyle, generateHoroscopeImage } from '@/lib/openai'
import { fetchCafeAstrologyHoroscope } from '@/lib/cafe-astrology'
import {
  buildUserProfile,
  resolveChoices,
} from '@/lib/horoscope-engine-simple'

// Supabase client setup - uses service role for database operations
// This bypasses RLS so the API can insert/update horoscopes
async function getSupabaseAdminClient() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
  // Try to use @supabase/ssr if available, otherwise use @supabase/supabase-js
  try {
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // TEMPORARY: Hardcoded test data (remove when authentication is added back)
    const TEST_MODE = true // Set to false when auth is enabled
    
    let userId: string
    let profile: { birthday: string; discipline: string | null; role: string | null }
    
    if (TEST_MODE) {
      // Hardcoded test user data
      userId = '00000000-0000-0000-0000-000000000000' // Test user ID
      profile = {
        birthday: '03/15', // March 15th - Pisces
        discipline: 'Design',
        role: 'Creative Director'
      }
      console.log('Horoscope API - Using hardcoded test data:', profile)
    } else {
      // Use auth client to get user session
      const supabaseAuth = await getSupabaseAuthClient()
      
      // Get user from session
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
      
      if (authError) {
        console.error('Auth error in horoscope API:', authError)
        return NextResponse.json({ error: 'Authentication error: ' + authError.message }, { status: 401 })
      }
      
      if (!user) {
        console.log('No user found in horoscope API')
        return NextResponse.json({ error: 'Please log in to view your horoscope' }, { status: 401 })
      }
      
      console.log('Horoscope API - User authenticated:', user.email)
      userId = user.id
      
      // Use admin client for database operations (bypasses RLS)
      const supabase = await getSupabaseAdminClient()
    
      // Get today's date
      const today = new Date()
      const todayDate = today.toISOString().split('T')[0] // YYYY-MM-DD format
      
      // Check for cached horoscope
      const { data: cachedHoroscope, error: cacheError } = await supabase
        .from('horoscopes')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayDate)
        .maybeSingle()
      
      // If cached and generated within last 24 hours, return it
      if (cachedHoroscope && !cacheError) {
        const generatedAt = new Date(cachedHoroscope.generated_at)
        const hoursSinceGeneration = (today.getTime() - generatedAt.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceGeneration < 24) {
          return NextResponse.json({
            star_sign: cachedHoroscope.star_sign,
            horoscope_text: cachedHoroscope.horoscope_text,
            horoscope_dos: cachedHoroscope.horoscope_dos || [],
            horoscope_donts: cachedHoroscope.horoscope_donts || [],
            image_url: cachedHoroscope.image_url,
            cached: true,
          })
        }
      }
      
      // Fetch user profile to get birthday, discipline (department), role (title)
      // Try 'profiles' table first, fallback to 'users' if needed
      let profileData: any = null
      
      // Try profiles table first
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('birthday, discipline, role')
        .eq('id', userId)
        .maybeSingle()
      
      if (profileErr || !data) {
        // Try users table as fallback
        const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('birthday, discipline, role')
          .eq('id', userId)
          .maybeSingle()
        
        if (userErr || !userData) {
          console.error('Profile error:', profileErr || userErr)
          return NextResponse.json(
            { error: 'User profile not found. Please ensure your profile has a birthday set.' },
            { status: 404 }
          )
        }
        profileData = userData
      } else {
        profileData = data
      }
      
      profile = profileData
    }
    
    // Get today's date (for both test mode and auth mode)
    const today = new Date()
    const todayDate = today.toISOString().split('T')[0] // YYYY-MM-DD format
    
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
    
    // Build user profile (logic in code)
    const userProfile = buildUserProfile(
      birthdayMonth,
      birthdayDay,
      profile.discipline,
      profile.role
    )
    
    const starSign = userProfile.sign
    
    // Resolve choices using decision trees (logic in code)
    const resolvedChoices = resolveChoices(userProfile)
    console.log('Resolved choices:', resolvedChoices)
    
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
      
      // Transform to Co-Star style and generate image in parallel
      const [transformResult, imageResult] = await Promise.allSettled([
        transformHoroscopeToCoStarStyle(cafeAstrologyText, starSign),
        generateHoroscopeImage(starSign, resolvedChoices),
      ])
      
      const elapsedTime = Date.now() - startTime
      console.log(`Horoscope generation completed in ${elapsedTime}ms`)
      
      // Check transformation result
      if (transformResult.status === 'fulfilled') {
        horoscopeText = transformResult.value.horoscope
        horoscopeDos = transformResult.value.dos
        horoscopeDonts = transformResult.value.donts
        console.log('Horoscope transformed to Co-Star style successfully')
      } else {
        console.error('Error transforming horoscope:', transformResult.reason)
        throw new Error(`Failed to transform horoscope: ${transformResult.reason?.message || 'Unknown error'}`)
      }
      
      // Check image result
      if (imageResult.status === 'fulfilled') {
        imageUrl = imageResult.value
        console.log('Horoscope image generated successfully')
      } else {
        console.error('Error generating horoscope image:', imageResult.reason)
        throw new Error(`Failed to generate horoscope image: ${imageResult.reason?.message || 'Unknown error'}`)
      }
      
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
    
    // Save to database (skip in test mode)
    if (!TEST_MODE) {
      const supabase = await getSupabaseAdminClient()
      const { error: insertError } = await supabase
        .from('horoscopes')
        .upsert({
          user_id: userId,
          star_sign: starSign,
          horoscope_text: horoscopeText,
          horoscope_dos: horoscopeDos,
          horoscope_donts: horoscopeDonts,
          image_url: imageUrl,
          style_family: resolvedChoices.styleFamily,
          style_key: resolvedChoices.styleKey,
          style_label: resolvedChoices.styleLabel,
          character_type: resolvedChoices.characterType,
          setting_hint: resolvedChoices.settingHint || null,
          date: todayDate,
          generated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,date',
        })
      
      if (insertError) {
        console.error('Error saving horoscope:', insertError)
        // Still return the generated horoscope even if save fails
      }
    } else {
      console.log('Test mode: Skipping database save')
    }
    
    return NextResponse.json({
      star_sign: starSign,
      horoscope_text: horoscopeText,
      horoscope_dos: horoscopeDos,
      horoscope_donts: horoscopeDonts,
      image_url: imageUrl,
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

