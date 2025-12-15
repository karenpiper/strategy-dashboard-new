import { NextRequest, NextResponse } from 'next/server'
import { generateHoroscopeDirect } from '@/lib/horoscope-direct-service'
import { generateHoroscopeViaAirtable } from '@/lib/airtable-ai-service'
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
import { generateHoroscopeImage } from '@/lib/openai'
import { createClient } from '@/lib/supabase/server'
import { getTodayDateUTC, getTodayDateInTimezone } from '@/lib/utils'

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
    // Check for force regeneration parameter
    const { searchParams } = new URL(request.url)
    const forceRegenerate = searchParams.get('force') === 'true'
    
    if (forceRegenerate) {
      console.log('🔄 FORCE REGENERATION requested - bypassing cache')
    }
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
    
    // Fetch user profile FIRST to get timezone for date calculation
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
    
    // Use EST/EDT timezone for date calculation (America/New_York)
    // This ensures horoscopes regenerate based on Eastern time, not UTC
    // This fixes the issue where horoscopes generated late at night UTC were showing the next day
    const defaultTimezone = 'America/New_York' // EST/EDT
    const userTimezone = profile.timezone || defaultTimezone
    const todayDate = getTodayDateInTimezone(userTimezone)
    const now = new Date()
    
    console.log('🔍 Checking database for cached horoscope text - user:', userId)
    console.log('   User timezone:', userTimezone, '(from profile:', profile.timezone || 'not set, using default EST)')
    console.log('   Today (user timezone):', todayDate)
    console.log('   Today (UTC):', getTodayDateUTC())
    console.log('   Current UTC time:', now.toISOString())
    console.log('   Current local time:', now.toLocaleString())
    console.log('🔍 DEBUG: Date calculation with timezone:', {
      userTimezone,
      calculatedDate: todayDate,
      utcDate: getTodayDateUTC(),
      datesDiffer: todayDate !== getTodayDateUTC(),
      usingDefaultTimezone: !profile.timezone
    })
    
    // CRITICAL: Check database FIRST before any generation
    // This is the primary check to prevent unnecessary API calls
    // Use multiple strategies to find records (exact date match, date range, recent records)
    console.log('🔍 Checking database with date:', todayDate, 'type:', typeof todayDate)
    console.log('🔍 DEBUG: Date calculation details:', {
      utcYear: now.getUTCFullYear(),
      utcMonth: now.getUTCMonth() + 1,
      utcDate: now.getUTCDate(),
      utcHours: now.getUTCHours(),
      utcMinutes: now.getUTCMinutes(),
      calculatedDate: todayDate,
      dateString: todayDate,
      dateStringLength: todayDate.length
    })
    
    // DEBUG: First, get ALL horoscopes for this user to see what dates exist
    const { data: allHoroscopesDebug, error: debugError } = await supabaseAdmin
      .from('horoscopes')
      .select('id, date, generated_at, horoscope_text, image_url')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(10)
    
    if (!debugError && allHoroscopesDebug) {
      console.log('🔍 DEBUG: All horoscope records for user:', allHoroscopesDebug.map(h => ({
        id: h.id,
        date: h.date,
        dateType: typeof h.date,
        dateString: String(h.date),
        dateLength: String(h.date).length,
        generated_at: h.generated_at,
        hasText: !!h.horoscope_text,
        hasImage: !!h.image_url,
        dateMatchesToday: String(h.date) === todayDate,
        dateMatchesTodayStrict: h.date === todayDate
      })))
    } else {
      console.log('⚠️ DEBUG: Could not fetch all horoscopes:', debugError?.message)
    }
    
    const { data: cachedHoroscope, error: cacheError } = await supabaseAdmin
      .from('horoscopes')
      .select('star_sign, horoscope_text, horoscope_dos, horoscope_donts, image_url, date, generated_at, character_name, prompt_slots_json')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    // CRITICAL: Check if the horoscope date matches today's date
    // Primary check: date field must match todayDate
    // Secondary check: if generated_at exists, verify it's from today (within 24 hours)
    let isFromToday = false
    if (cachedHoroscope) {
      // Primary check: date field matches today
      const dateMatches = cachedHoroscope.date === todayDate
      
      if (dateMatches) {
        // If date matches, check generated_at as secondary validation
        if (cachedHoroscope.generated_at) {
          const generatedAt = new Date(cachedHoroscope.generated_at)
          const hoursAgo = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60)
          
          // If generated within last 24 hours, it's valid
          if (hoursAgo <= 24) {
            isFromToday = true
            console.log('✅ Cached horoscope is valid:', {
              dateMatches,
              hoursAgo: hoursAgo.toFixed(2),
              generatedAt: cachedHoroscope.generated_at
            })
          } else {
            console.log('⚠️ Horoscope date matches but was generated more than 24 hours ago:', {
              hoursAgo: hoursAgo.toFixed(2),
              generatedAt: cachedHoroscope.generated_at
            })
            isFromToday = false
          }
        } else {
          // Date matches but no generated_at - assume it's valid (might be old record)
          // This handles legacy records that don't have generated_at
          isFromToday = true
          console.log('✅ Cached horoscope date matches (no generated_at timestamp)')
        }
      } else {
        console.log('⚠️ Cached horoscope date does not match today:', {
          cachedDate: cachedHoroscope.date,
          todayDate,
          datesMatch: dateMatches
        })
        isFromToday = false
      }
    }
    
    console.log('🔍 DEBUG: Query result:', {
      found: !!cachedHoroscope,
      error: cacheError?.message || null,
      cachedDate: cachedHoroscope?.date || null,
      cachedDateType: cachedHoroscope?.date ? typeof cachedHoroscope.date : null,
      cachedDateString: cachedHoroscope?.date ? String(cachedHoroscope.date) : null,
      queryDate: todayDate,
      queryDateType: typeof todayDate,
      datesEqual: cachedHoroscope?.date ? cachedHoroscope.date === todayDate : false,
      datesEqualString: cachedHoroscope?.date ? String(cachedHoroscope.date) === todayDate : false,
      generatedAt: cachedHoroscope?.generated_at || null,
      isFromToday,
      shouldRegenerate: !isFromToday
    })
    
    if (cacheError) {
      console.error('❌ Error checking database cache:', cacheError)
      console.error('   Error details:', {
        message: cacheError.message,
        details: cacheError.details,
        hint: cacheError.hint,
        code: cacheError.code
      })
      // Don't proceed if there's a database error - return error instead of generating
      return NextResponse.json(
        { error: 'Database error while checking cache: ' + cacheError.message },
        { status: 500 }
      )
    }
    
    // SAFETY CHECK: Also check for records from the last 2 days as a fallback
    // This catches timezone issues or date calculation problems
    const yesterdayUTC = new Date(now)
    yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1)
    const yesterdayDate = `${yesterdayUTC.getUTCFullYear()}-${String(yesterdayUTC.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterdayUTC.getUTCDate()).padStart(2, '0')}`
    
    const { data: recentRecords, error: recentRecordsError } = await supabaseAdmin
      .from('horoscopes')
      .select('date, horoscope_text, image_url, generated_at')
      .eq('user_id', userId)
      .in('date', [todayDate, yesterdayDate])
      .order('date', { ascending: false })
      .limit(2)
    
    if (recentRecordsError) {
      console.error('⚠️ Error checking recent records:', recentRecordsError)
    }
    
    // If we found records for today or yesterday, log them
    if (recentRecords && recentRecords.length > 0) {
      console.log('📅 Found recent records:', recentRecords.map(r => ({
        date: r.date,
        dateType: typeof r.date,
        hasText: !!r.horoscope_text,
        hasImage: !!r.image_url
      })))
    }
    
    // Also check if there are any recent horoscopes for debugging
    // This helps identify if records exist but with different dates
    const { data: recentHoroscopes, error: recentHoroscopesError } = await supabaseAdmin
      .from('horoscopes')
      .select('date, horoscope_text, generated_at, image_url')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5)
    
    if (recentHoroscopesError) {
      console.error('❌ Error fetching recent horoscopes:', recentHoroscopesError)
      console.error('   This might indicate a database connection or permission issue')
    }
    
    // Also check if ANY records exist for this user (no date filter)
    const { data: allUserRecords, error: allRecordsError } = await supabaseAdmin
      .from('horoscopes')
      .select('date, horoscope_text, image_url')
      .eq('user_id', userId)
      .limit(1)
    
    // CRITICAL: Check if table is accessible and working
    // If we can't query the database properly, we should NOT generate
    if (cacheError || recentHoroscopesError || allRecordsError) {
      console.error('❌ DATABASE ERROR: Cannot verify cache - DO NOT GENERATE')
      console.error('   Cache error:', cacheError?.message)
      console.error('   Recent error:', recentHoroscopesError?.message)
      console.error('   All records error:', allRecordsError?.message)
      return NextResponse.json(
        { 
          error: 'Database connection error. Cannot verify if horoscope already exists. Please try again or contact support.',
          details: cacheError?.message || recentHoroscopesError?.message || allRecordsError?.message
        },
        { status: 500 }
      )
    }
    
    console.log('📊 Database cache check result:', {
      found: !!cachedHoroscope,
      hasText: !!cachedHoroscope?.horoscope_text,
      textLength: cachedHoroscope?.horoscope_text?.length || 0,
      textPreview: cachedHoroscope?.horoscope_text?.substring(0, 50) || 'none',
      hasImage: !!cachedHoroscope?.image_url,
      cachedDate: cachedHoroscope?.date,
      cachedDateType: typeof cachedHoroscope?.date,
      expectedDate: todayDate,
      expectedDateType: typeof todayDate,
      datesMatch: cachedHoroscope?.date === todayDate,
      dateComparison: {
        cached: cachedHoroscope?.date,
        expected: todayDate,
        match: cachedHoroscope?.date === todayDate,
        cachedIsString: typeof cachedHoroscope?.date === 'string',
        expectedIsString: typeof todayDate === 'string'
      },
      recentHoroscopes: recentHoroscopes?.map(h => ({ 
        date: h.date,
        dateType: typeof h.date,
        hasText: !!h.horoscope_text,
        textLength: h.horoscope_text?.length || 0,
        hasImage: !!h.image_url
      })),
      anyRecordsForUser: !!allUserRecords && allUserRecords.length > 0,
      recentRecordsCount: recentRecords?.length || 0,
      recentRecordsError: recentRecordsError?.message,
      recentHoroscopesError: recentHoroscopesError?.message,
      allRecordsError: allRecordsError?.message
    })
    
    // CACHE CHECK: Return cached horoscope if it exists and force regeneration is not requested
    // This ensures horoscope text is generated ONCE per day per user and cached in the database
    // This prevents hitting billing limits by regenerating unnecessarily
    // CRITICAL: Also verify the horoscope was generated today in the user's timezone
    console.log('🔍 DEBUG: Cache check decision:', {
      hasCachedHoroscope: !!cachedHoroscope,
      forceRegenerate,
      isFromToday,
      willReturnCached: !!cachedHoroscope && !forceRegenerate && isFromToday,
      cachedDate: cachedHoroscope?.date,
      todayDate,
      dateComparison: {
        strict: cachedHoroscope?.date === todayDate,
        string: cachedHoroscope?.date ? String(cachedHoroscope.date) === todayDate : false,
        cachedString: cachedHoroscope?.date ? String(cachedHoroscope.date) : null,
        todayString: todayDate
      }
    })
    
    if (cachedHoroscope && !forceRegenerate && isFromToday) {
      // Verify the cached horoscope has all required data
      if (cachedHoroscope.horoscope_text && cachedHoroscope.image_url) {
        console.log('✅ Returning cached horoscope from database')
        console.log('   Cached date:', cachedHoroscope.date, '(type:', typeof cachedHoroscope.date, ', string:', String(cachedHoroscope.date), ')')
        console.log('   Expected date:', todayDate, '(type:', typeof todayDate, ')')
        console.log('   Dates match (strict):', cachedHoroscope.date === todayDate)
        console.log('   Dates match (string):', String(cachedHoroscope.date) === todayDate)
        console.log('   Generated at:', cachedHoroscope.generated_at)
        console.log('   Text length:', cachedHoroscope.horoscope_text.length)
        console.log('   Has image URL:', !!cachedHoroscope.image_url)
        console.log('   ⚠️ DEBUG: This cached horoscope is being returned - is the date correct?')
        
        return NextResponse.json({
          star_sign: cachedHoroscope.star_sign,
          horoscope_text: cachedHoroscope.horoscope_text,
          horoscope_dos: cachedHoroscope.horoscope_dos || [],
          horoscope_donts: cachedHoroscope.horoscope_donts || [],
          image_url: cachedHoroscope.image_url,
          character_name: cachedHoroscope.character_name || null,
          cached: true,
        })
      } else {
        console.log('⚠️ Cached horoscope found but missing required data')
        console.log('   Has text:', !!cachedHoroscope.horoscope_text)
        console.log('   Has image:', !!cachedHoroscope.image_url)
        console.log('   Will regenerate to ensure complete data')
      }
    } else if (cachedHoroscope && !isFromToday) {
      console.log('⚠️ Cached horoscope found but was generated on a different day')
      console.log('   Cached date:', cachedHoroscope.date)
      console.log('   Generated at:', cachedHoroscope.generated_at)
      console.log('   Today (EST):', todayDate)
      console.log('   Will regenerate because it\'s from a previous day')
      
      // Delete the old record so we can generate a new one
      const { error: deleteOldError } = await supabaseAdmin
        .from('horoscopes')
        .delete()
        .eq('user_id', userId)
        .eq('date', cachedHoroscope.date)
      
      if (deleteOldError) {
        console.warn('⚠️ Could not delete old horoscope record:', deleteOldError)
      } else {
        console.log('🗑️ Deleted old horoscope record from previous day')
      }
      
      // Clear cachedHoroscope so we proceed to generation
      // This ensures the code below doesn't think we have a valid cached horoscope
      // Note: cachedHoroscope is const, so we'll use a flag instead
    } else if (cachedHoroscope && forceRegenerate) {
      console.log('🔄 FORCE REGENERATION requested - ignoring cached horoscope')
    } else {
      console.log('📝 No cached horoscope found - will generate new one')
    }
    
    // CRITICAL SAFETY CHECK: Before generating, verify database is working
    // If we can't find records and can't verify the database is accessible, don't generate
    // NOTE: Commented out to allow generation when database is empty (e.g., first-time users)
    /*
    if (!cachedHoroscope && (!allUserRecords || allUserRecords.length === 0)) {
      // Check if this is the first time ever (no records at all) vs database issue
      // Try a simple test query to verify database connectivity
      const { data: testQuery, error: testError } = await supabaseAdmin
        .from('horoscopes')
        .select('id')
        .limit(1)
      
      if (testError) {
        console.error('❌ CRITICAL: Cannot query horoscopes table - database may be inaccessible')
        console.error('   Test query error:', testError)
        return NextResponse.json(
          { 
            error: 'Database connection error. Cannot verify if horoscope exists. Please try again or contact support.',
            details: testError.message
          },
          { status: 500 }
        )
      }
      
      // HARD STOP: If database is accessible but we have NO records at all for this user,
      // and we've been generating before, this suggests records aren't being saved.
      // Return an error instead of generating to prevent quota waste.
      console.error('🚫 HARD STOP: Database is accessible but NO records found for user')
      console.error('   This suggests previous generations were not saved successfully')
      console.error('   Returning error to prevent quota waste')
      return NextResponse.json(
        { 
          error: 'No cached horoscope found and database appears empty. Previous generations may not have been saved. Please contact support before generating new content.',
          details: 'Database is accessible but contains no records for this user. This prevents unnecessary API calls.'
        },
        { status: 500 }
      )
    }
    */
    
    // Only generate new horoscope if there's NO cached text at all OR it's from a previous day
    // Generation is now enabled even when database is empty
    // BUT: We should have already found it in the checks above
    // If we get here, either no cache exists OR it was from a previous day (and we deleted it)
    console.log('⚠️ NO cached horoscope text found in database for user', userId, 'on date', todayDate, '(user timezone:', userTimezone, ')')
    console.log('   This could mean:')
    console.log('   1. No horoscope exists for today')
    console.log('   2. Horoscope exists but was generated on a different day (EST)')
    console.log('   3. Old horoscope was deleted and we need to generate a new one')
    console.log('   🔍 DEBUG: Generation decision details:', {
      cachedHoroscopeExists: !!cachedHoroscope,
      cachedDate: cachedHoroscope?.date || null,
      cachedDateString: cachedHoroscope?.date ? String(cachedHoroscope.date) : null,
      todayDate,
      datesMatch: cachedHoroscope?.date ? cachedHoroscope.date === todayDate : false,
      hasText: !!cachedHoroscope?.horoscope_text,
      hasImage: !!cachedHoroscope?.image_url,
      anyRecordsForUser: !!allUserRecords && allUserRecords.length > 0,
      recentHoroscopesCount: recentHoroscopes?.length || 0,
      recentHoroscopesDates: recentHoroscopes?.map(h => ({
        date: h.date,
        dateString: String(h.date),
        matchesToday: String(h.date) === todayDate
      })) || []
    })
    console.log('   ⚠️ PROCEEDING TO GENERATE NEW HOROSCOPE (this will call OpenAI API)')
    console.log('   ⚠️ THIS IS THE ONLY GENERATION FOR TODAY - NO MORE WILL BE GENERATED')
    
    // Note: profile, profileError, userTimezone, and todayDate are already declared at the beginning of the function
    
    console.log('🔍 DEBUG: Date calculation with timezone:', {
      userTimezone,
      calculatedDate: todayDate,
      usingLocalTime: userTimezone && userTimezone !== 'UTC',
      fallbackToUTC: !userTimezone || userTimezone === 'UTC'
    })
    
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
    
    // Birthday is required for text generation (Cafe Astrology), but optional for image generation
    const hasValidBirthday = birthdayMonth && birthdayDay && !isNaN(birthdayMonth) && !isNaN(birthdayDay)
    
    if (!hasValidBirthday) {
      // Allow image generation without birthday - use null values
      birthdayMonth = null
      birthdayDay = null
      console.log('⚠️ No birthday set - will generate image only using weekday/season/discipline/role segments')
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
    
    // Character name will come from n8n (generated from image analysis)
    let characterName: string | null = null
    
    // Fetch from Cafe Astrology and generate via n8n
    console.log('Generating horoscope for:', { starSign, profile: userProfile })
    let horoscopeText: string
    let horoscopeDos: string[]
    let horoscopeDonts: string[]
    let imageUrl: string | null = null
    let imagePrompt: string
    let promptSlots: any
    let promptReasoning: any
    
    try {
      console.log('🚀 Starting optimized horoscope generation...')
      const startTime = Date.now()
      
      // OPTIMIZATION: Parallelize Cafe Astrology fetch and prompt building (they're independent)
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
      
      // If no birthday, generate image only (skip text generation)
      if (!hasValidBirthday) {
        console.log('⚠️ No birthday - generating image only (text requires birthday for Cafe Astrology)')
        
        // Build image prompt
        const promptResult = await buildHoroscopePrompt(
          supabaseAdmin,
          userId,
          todayDate,
          promptUserProfile,
          userProfile.weekday,
          userProfile.season
        )
        
        imagePrompt = promptResult.prompt
        promptSlots = promptResult.slots
        promptReasoning = promptResult.reasoning
        
        // Generate image directly (without n8n, since we don't have text)
        console.log('🚀 Generating image directly (no birthday, skipping text generation)...')
        const imageResult = await generateHoroscopeImage(
          supabaseAdmin,
          userId,
          todayDate,
          {
            name: profile.full_name || 'User',
            role: profile.role || null,
            hobbies: profile.hobbies || null,
            starSign: starSign || undefined,
            element: userProfile.element || undefined,
            likes_fantasy: profile.likes_fantasy || false,
            likes_scifi: profile.likes_scifi || false,
            likes_cute: profile.likes_cute || false,
            likes_minimal: profile.likes_minimal || false,
            hates_clowns: profile.hates_clowns || false,
          },
          userProfile.weekday,
          userProfile.season
        )
        
        imageUrl = imageResult.imageUrl
        imagePrompt = imageResult.prompt
        promptSlots = imageResult.slots
        promptReasoning = imageResult.reasoning
        
        // No text when no birthday
        horoscopeText = null as any
        horoscopeDos = []
        horoscopeDonts = []
        characterName = null
        
        console.log('✅ Image generated successfully (without text)')
        console.log('   Image URL:', imageUrl.substring(0, 100) + '...')
        console.log('   Image is already in Supabase storage, no download/upload needed')
        
        // Update user avatar state (image is already in Supabase, no upload needed)
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
          ? [...recentStyleGroupIds.filter((id) => id !== selectedStyleGroupId), selectedStyleGroupId].slice(-7)
          : recentStyleGroupIds
        
        const updatedStyleReferenceIds = [
          ...recentStyleReferenceIds.filter((id) => id !== promptSlots.style_reference_id),
          promptSlots.style_reference_id,
        ].slice(-7)
        
        const updatedSubjectRoleIds = [
          ...recentSubjectRoleIds.filter((id) => id !== promptSlots.subject_role_id),
          promptSlots.subject_role_id,
        ].slice(-7)
        
        const updatedSettingPlaceIds = [
          ...recentSettingPlaceIds.filter((id) => id !== promptSlots.setting_place_id),
          promptSlots.setting_place_id,
        ].slice(-7)
        
        await updateUserAvatarState(supabaseAdmin, userId, {
          last_generated_date: todayDate,
          recent_style_group_ids: updatedStyleGroupIds,
          recent_style_reference_ids: updatedStyleReferenceIds,
          recent_subject_role_ids: updatedSubjectRoleIds,
          recent_setting_place_ids: updatedSettingPlaceIds,
        })
        
        console.log('✅ Updated user avatar state')
      } else {
        // Normal flow: has birthday, generate both text and image via n8n
        console.log('⚡ Running Cafe Astrology fetch and prompt building in parallel...')
        const [cafeAstrologyText, promptResult] = await Promise.all([
          // Fetch from Cafe Astrology (only needs starSign)
          fetchCafeAstrologyHoroscope(starSign).then(text => {
            console.log('✅ Fetched horoscope from Cafe Astrology')
            return text
          }),
          // Build image prompt (needs user profile, already fetched)
          buildHoroscopePrompt(
            supabaseAdmin,
            userId,
            todayDate,
            promptUserProfile,
            userProfile.weekday,
            userProfile.season
          ).then(result => {
            console.log('✅ Built image prompt:', result.prompt.substring(0, 200) + (result.prompt.length > 200 ? '...' : ''))
            console.log('   Prompt length:', result.prompt.length)
            console.log('   Prompt slots:', Object.keys(result.slots || {}))
            return result
          })
        ])
        
        imagePrompt = promptResult.prompt
        promptSlots = promptResult.slots
        promptReasoning = promptResult.reasoning
        
        // Validate prompt was built correctly
        if (!imagePrompt || imagePrompt.trim() === '') {
          throw new Error('Failed to build image prompt - prompt is empty')
        }
        
        // Use Elvex API (required)
        if (!process.env.ELVEX_API_KEY) {
          throw new Error('ELVEX_API_KEY is required. Please set it in environment variables.')
        }
        
        // Debug logging
        console.log('🔍 Using Elvex API for horoscope generation')
        
        let directResult
        {
          console.log('🚀 Generating horoscope text and image via Elvex API...')
          console.log('   Using Elvex API for both text and image generation')
          console.log('🔍 DEBUG: Elvex API call parameters:', {
            starSign,
            userId,
            date: todayDate,
            hasUserProfile: !!userProfile,
            weekday: userProfile.weekday,
            season: userProfile.season
          })
          const elvexStartTime = Date.now()
          
          // Call Elvex service
          directResult = await generateHoroscopeViaElvex({
            starSign,
            userId,
            date: todayDate,
            cafeAstrologyText: cafeAstrologyText,
            imagePrompt: imagePrompt, // Built by buildHoroscopePrompt() with slot-based logic
            slots: promptSlots,
            reasoning: promptReasoning,
            timezone: userTimezone, // Pass timezone for Airtable Created At field
          })
          
          const elvexElapsed = Date.now() - elvexStartTime
          console.log(`✅ Elvex API generation completed in ${elvexElapsed}ms`)
        }
        
        // Validate result before using it
        console.log('📥 Received direct API result:', {
          hasHoroscope: !!directResult.horoscope,
          horoscopeLength: directResult.horoscope?.length || 0,
          horoscopePreview: directResult.horoscope?.substring(0, 100) || 'MISSING',
          hasDos: !!directResult.dos,
          dosCount: directResult.dos?.length || 0,
          hasDonts: !!directResult.donts,
          dontsCount: directResult.donts?.length || 0,
          hasImageUrl: !!directResult.imageUrl,
          imageUrl: directResult.imageUrl || 'MISSING',
          imageUrlLength: directResult.imageUrl?.length || 0,
          imageUrlPreview: directResult.imageUrl?.substring(0, 100) || 'MISSING',
        })
        console.log('🔍 DEBUG: Direct API result validation:', {
          allFieldsPresent: !!(directResult.horoscope && directResult.dos && directResult.donts && directResult.imageUrl),
          missingFields: [
            !directResult.horoscope && 'horoscope',
            !directResult.dos && 'dos',
            !directResult.donts && 'donts',
            !directResult.imageUrl && 'imageUrl'
          ].filter(Boolean)
        })

        if (!directResult.horoscope || !directResult.dos || !directResult.donts) {
          throw new Error('Invalid direct API result: missing horoscope text, dos, or donts')
        }

        // Image URL is optional - horoscope text can be returned without image
        if (!directResult.imageUrl) {
          console.log('⚠️ No image URL in result - horoscope text will be returned without image')
        }

        horoscopeText = directResult.horoscope
        horoscopeDos = directResult.dos
        horoscopeDonts = directResult.donts
        imageUrl = directResult.imageUrl || null // Allow null image URL
        
        // Character name is not generated in direct mode (was previously from n8n image analysis)
        // Set to null for now - can be added later if needed
        characterName = directResult.character_name || null
        if (characterName) {
          console.log('✅ Using character name from direct API:', characterName)
        } else {
          console.log('ℹ️ Character name not generated (not available in direct mode)')
        }
      }

      if (hasValidBirthday) {
        console.log('✅ Using direct API result:', {
          horoscopeText: horoscopeText?.substring(0, 100) + '...',
          dosCount: horoscopeDos?.length || 0,
          dontsCount: horoscopeDonts?.length || 0,
          imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : 'null (no image)'
        })
      }
      
      // OPTIMIZATION: Start image download/upload in parallel with avatar state update
      // These operations are independent and can run concurrently
      // Note: If image was generated directly (no birthday), it's already in Supabase, skip upload
      if (!hasValidBirthday) {
        // Image already in Supabase from direct generation, skip upload
        console.log('✅ Image already in Supabase storage (generated directly), skipping upload')
      } else if (!imageUrl) {
        // No image URL available, skip upload
        console.log('⚠️ No image URL available, skipping image upload')
      } else {
        console.log('⚡ Starting parallel operations: image upload + avatar state update...')
        
        const [permanentImageUrl] = await Promise.all([
        // Download and upload image to Supabase storage
        (async () => {
          console.log('📥 Downloading image and uploading to Supabase storage...')
          console.log('   Source image URL:', imageUrl.substring(0, 100) + '...')
          
          try {
            // Download the image
            console.log('   Fetching image...')
            const imageResponse = await fetch(imageUrl)
            if (!imageResponse.ok) {
              throw new Error(`Failed to download image: ${imageResponse.statusText} (${imageResponse.status})`)
            }
            console.log('   Image downloaded successfully, size:', imageResponse.headers.get('content-length') || 'unknown')
            const imageBlob = await imageResponse.blob()
            const imageBuffer = Buffer.from(await imageBlob.arrayBuffer())
            console.log('   Image buffer size:', imageBuffer.length, 'bytes')
            
            // Upload to Supabase storage (horoscope-avatars bucket - separate from profile avatars)
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const fileName = `horoscope-${userId}-${todayDate}-${timestamp}.png`
            const filePath = `${userId}/${fileName}`
            const bucketName = 'horoscope-avatars'
            
            console.log('📤 Uploading image to Supabase storage...')
            console.log('   Bucket:', bucketName)
            console.log('   File path:', filePath)
            console.log('   File size:', imageBuffer.length, 'bytes')
            
            const { error: uploadError } = await supabaseAdmin.storage
              .from(bucketName)
              .upload(filePath, imageBuffer, {
                contentType: 'image/png',
                upsert: false,
              })
            
            if (uploadError) {
              console.error('❌ CRITICAL: Error uploading image to Supabase storage:', uploadError)
              throw new Error(`Failed to upload image to Supabase storage: ${uploadError.message}. Cannot save horoscope with temporary image URL.`)
            }
            
            // Get public URL from Supabase storage
            const { data: urlData } = supabaseAdmin.storage
              .from(bucketName)
              .getPublicUrl(filePath)
            
            if (!urlData || !urlData.publicUrl) {
              console.error('❌ CRITICAL: Failed to get public URL from Supabase storage')
              throw new Error('Failed to get public URL for uploaded image. Upload may have succeeded but URL generation failed.')
            }
            
            const permanentUrl = urlData.publicUrl
            console.log('✅ Image uploaded to Supabase storage successfully')
            console.log('   Public URL:', permanentUrl.substring(0, 100) + '...')
            
            // Verify the URL is a Supabase URL
            if (permanentUrl === imageUrl) {
              console.error('❌ CRITICAL: Permanent URL is same as original URL - upload failed!')
              throw new Error('Image upload failed - permanent URL matches temporary OpenAI URL')
            }
            
            if (!permanentUrl.includes('supabase.co') && !permanentUrl.includes('supabase')) {
              console.error('❌ CRITICAL: Permanent URL does not appear to be a Supabase URL!')
              throw new Error('Image upload may have failed - URL is not a Supabase storage URL')
            }
            
            // Verify the uploaded file exists
            const { data: fileData, error: fileCheckError } = await supabaseAdmin.storage
              .from(bucketName)
              .list(userId, {
                limit: 1,
                search: fileName
              })
            
            if (fileCheckError) {
              console.warn('⚠️ Could not verify uploaded file exists:', fileCheckError)
            } else if (!fileData || fileData.length === 0) {
              console.error('❌ CRITICAL: Uploaded file not found in storage!')
              throw new Error('Image upload verification failed - file not found in storage after upload')
            } else {
              console.log('✅ Verified uploaded file exists in storage:', fileData[0].name)
            }
            
            return permanentUrl
          } catch (imageError: any) {
            console.error('❌ CRITICAL: Error processing image upload:', imageError)
            throw imageError // Re-throw to fail the request
          }
        })(),
        // Update user avatar state (parallel with image upload)
        (async () => {
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
            ? [...recentStyleGroupIds.filter((id) => id !== selectedStyleGroupId), selectedStyleGroupId].slice(-7)
            : recentStyleGroupIds
          
          const updatedStyleReferenceIds = [
            ...recentStyleReferenceIds.filter((id) => id !== promptSlots.style_reference_id),
            promptSlots.style_reference_id,
          ].slice(-7)
          
          const updatedSubjectRoleIds = [
            ...recentSubjectRoleIds.filter((id) => id !== promptSlots.subject_role_id),
            promptSlots.subject_role_id,
          ].slice(-7)
          
          const updatedSettingPlaceIds = [
            ...recentSettingPlaceIds.filter((id) => id !== promptSlots.setting_place_id),
            promptSlots.setting_place_id,
          ].slice(-7)
          
          await updateUserAvatarState(supabaseAdmin, userId, {
            last_generated_date: todayDate,
            recent_style_group_ids: updatedStyleGroupIds,
            recent_style_reference_ids: updatedStyleReferenceIds,
            recent_subject_role_ids: updatedSubjectRoleIds,
            recent_setting_place_ids: updatedSettingPlaceIds,
          })
          
          console.log('✅ Updated user avatar state')
        })()
        ])
        
        imageUrl = permanentImageUrl
      }
      
      const elapsedTime = Date.now() - startTime
      console.log(`✅ Horoscope generation completed in ${elapsedTime}ms`)
      
      console.log('Horoscope generated successfully:', { 
        horoscopeText: horoscopeText ? horoscopeText.substring(0, 50) + '...' : 'N/A (no birthday)',
        dosCount: horoscopeDos?.length || 0,
        dontsCount: horoscopeDonts?.length || 0,
        hasImageUrl: !!imageUrl,
        imageUrl: imageUrl?.substring(0, 100) + '...' || 'MISSING',
        imageUrlLength: imageUrl?.length || 0
      })
      console.log('🔍 DEBUG: Generation complete, ready to save:', {
        hasText: !!horoscopeText,
        textLength: horoscopeText?.length || 0,
        hasDos: !!horoscopeDos,
        dosCount: horoscopeDos?.length || 0,
        hasDonts: !!horoscopeDonts,
        dontsCount: horoscopeDonts?.length || 0,
        hasImageUrl: !!imageUrl,
        imageUrlLength: imageUrl?.length || 0,
        todayDate,
        dateType: typeof todayDate
      })
      
      // CRITICAL: Verify imageUrl is set before saving
      if (!imageUrl || imageUrl.trim() === '') {
        console.error('❌ CRITICAL ERROR: imageUrl is empty before saving to database!')
        // Image URL is optional - horoscope can be saved without image
        console.log('⚠️ No image URL to save - horoscope will be saved without image')
      }
    } catch (error: any) {
      console.error('❌ Error generating horoscope:', error)
      console.error('   Error name:', error.name)
      console.error('   Error message:', error.message)
      console.error('   Error stack:', error.stack?.substring(0, 500))
      console.error('   Error code:', error.code)
      console.error('   Error type:', error.type)
      console.error('   Error status:', error.status)
      console.error('   Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2).substring(0, 1000))
      
      // Check for module import errors (Vercel AI SDK not installed)
      if (error.message?.includes('Cannot find module') || 
          error.message?.includes('Vercel AI SDK') ||
          error.code === 'MODULE_NOT_FOUND') {
        console.error('🚫 MODULE IMPORT ERROR - Vercel AI SDK packages may not be installed')
        return NextResponse.json(
          { 
            error: 'Failed to generate horoscope: Vercel AI SDK packages not installed',
            code: 'module_error',
            details: 'The "ai" and "@ai-sdk/openai" packages need to be installed. Please check Vercel deployment logs.'
          },
          { status: 500 }
        )
      }
      
      // Handle OpenAI API errors
      if (error.message?.includes('OpenAI') || error.message?.includes('billing') || error.message?.includes('rate limit')) {
        console.error('🚫 OPENAI API ERROR:', error.message)
        return NextResponse.json(
          { 
            error: `Failed to generate horoscope: ${error.message}`,
            code: 'openai_error',
            details: error.message.includes('billing') 
              ? 'OpenAI billing limit reached. Please check your OpenAI account billing settings.'
              : 'The horoscope generation service encountered an error. Please try again later.'
          },
          { status: error.message?.includes('billing') ? 402 : 503 }
        )
      }
      
      // Handle timeout errors
      if (error.message?.includes('timeout')) {
        console.error('🚫 TIMEOUT ERROR:', error.message)
        return NextResponse.json(
          { 
            error: 'Horoscope generation timed out. The request took too long to process.',
            code: 'timeout',
            details: 'Please try again. If the problem persists, contact support.'
          },
          { status: 504 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `Failed to generate horoscope: ${error.message || 'Unknown error'}`,
          code: error.code || 'unknown_error',
          details: error.details || error.message || 'An unexpected error occurred. Check server logs for details.'
        },
        { status: error.status || 500 }
      )
    }
    
    // CRITICAL SAFETY CHECK: Only save if we're not forcing regeneration and no cache exists
    // This prevents race conditions if multiple requests come in simultaneously
    // If forceRegenerate is true, we always save (user explicitly requested regeneration)
    // If cachedHoroscope exists and we're not forcing, we should have returned early above
    // So if we get here, either:
    // 1. No cached horoscope exists (first generation of the day)
    // 2. forceRegenerate is true (user wants new generation)
    // In both cases, we should save the new horoscope
    
    // Save horoscope text to database
    // Delete old horoscope records (keep only today's) - we only want to save the image, not historical horoscopes
    // This ensures the avatar gallery has all images, but we don't keep old horoscope text
    console.log('🗑️ DEBUG: About to delete old horoscope records (keeping date:', todayDate, ')')
    const { data: recordsBeforeDelete, error: checkBeforeDeleteError } = await supabaseAdmin
      .from('horoscopes')
      .select('id, date, user_id')
      .eq('user_id', userId)
    
    console.log('🗑️ DEBUG: Records before delete:', {
      count: recordsBeforeDelete?.length || 0,
      records: recordsBeforeDelete?.map(r => ({ id: r.id, date: r.date, dateString: String(r.date) })) || [],
      todayDate,
      error: checkBeforeDeleteError?.message
    })
    
    const { error: deleteOldError, data: deleteResult } = await supabaseAdmin
      .from('horoscopes')
      .delete()
      .eq('user_id', userId)
      .neq('date', todayDate) // Delete all records except today's
      .select('id, date') // Return deleted records for debugging
    
    if (deleteOldError) {
      console.warn('⚠️ Warning: Could not delete old horoscope records:', deleteOldError)
      console.warn('   Error details:', deleteOldError.message, deleteOldError.code)
      // Don't fail - continue with save
    } else {
      console.log('🗑️ Deleted old horoscope records (keeping only today\'s)')
      console.log('🗑️ DEBUG: Deleted records:', {
        count: deleteResult?.length || 0,
        deletedDates: deleteResult?.map(r => ({ id: r.id, date: r.date, dateString: String(r.date) })) || []
      })
      
      // Verify today's record still exists after delete
      const { data: todayRecordAfterDelete } = await supabaseAdmin
        .from('horoscopes')
        .select('id, date')
        .eq('user_id', userId)
        .eq('date', todayDate)
        .maybeSingle()
      
      console.log('🗑️ DEBUG: Today\'s record after delete:', {
        exists: !!todayRecordAfterDelete,
        date: todayRecordAfterDelete?.date,
        dateString: todayRecordAfterDelete?.date ? String(todayRecordAfterDelete.date) : null
      })
    }
    
    // Check if today's record exists (we'll upsert it)
    const { data: existingHoroscope } = await supabaseAdmin
      .from('horoscopes')
      .select('image_url, prompt_slots_json, image_prompt')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    // Image URL is optional - horoscope can be saved without image
    if (!imageUrl || imageUrl.trim() === '') {
      console.log('⚠️ No image URL to save - horoscope will be saved without image')
    }
    
    const upsertData: any = {
      user_id: userId,
      star_sign: starSign,
      horoscope_text: horoscopeText,
      horoscope_dos: horoscopeDos,
      horoscope_donts: horoscopeDonts,
      character_name: characterName,
      date: todayDate, // Explicitly set date to ensure consistency
      generated_at: new Date().toISOString(),
      image_url: imageUrl, // CRITICAL: Set image URL from Supabase storage (after upload)
      prompt_slots_json: promptSlots, // Set prompt slots from prompt building
      image_prompt: imagePrompt, // Set image prompt
    }
    
    // CRITICAL: Log the exact data being saved
    console.log('💾 Preparing to save horoscope with image URL:', {
      user_id: upsertData.user_id,
      date: upsertData.date,
      dateType: typeof upsertData.date,
      dateString: String(upsertData.date),
      dateLength: String(upsertData.date).length,
      todayDateCalculated: todayDate,
      datesMatch: upsertData.date === todayDate,
      has_image_url: !!upsertData.image_url,
      image_url_length: upsertData.image_url?.length || 0,
      image_url_preview: upsertData.image_url?.substring(0, 100) || 'MISSING',
      is_supabase_url: upsertData.image_url?.includes('supabase.co') || false,
      character_name: upsertData.character_name || 'MISSING',
      has_character_name: !!upsertData.character_name
    })
    console.log('🔍 DEBUG: Date being saved to database:', {
      value: upsertData.date,
      type: typeof upsertData.date,
      stringValue: String(upsertData.date),
      expectedFormat: 'YYYY-MM-DD',
      matchesExpected: String(upsertData.date).match(/^\d{4}-\d{2}-\d{2}$/) !== null
    })
    
    console.log('💾 Saving horoscope to database...')
    console.log('   Upsert data:', {
      user_id: upsertData.user_id,
      date: upsertData.date,
      star_sign: upsertData.star_sign,
      text_length: upsertData.horoscope_text?.length || 0,
      text_preview: upsertData.horoscope_text?.substring(0, 100) || 'MISSING',
      has_dos: !!upsertData.horoscope_dos?.length,
      dos_count: upsertData.horoscope_dos?.length || 0,
      has_donts: !!upsertData.horoscope_donts?.length,
      donts_count: upsertData.horoscope_donts?.length || 0,
      character_name: upsertData.character_name,
      image_url: upsertData.image_url || 'MISSING',
      image_url_length: upsertData.image_url?.length || 0,
      image_url_preview: upsertData.image_url?.substring(0, 100) || 'MISSING'
    })
    
    // Image URL is optional - horoscope can be saved without image
    if (!upsertData.image_url || upsertData.image_url.trim() === '') {
      console.log('⚠️ No image URL in upsert data - horoscope will be saved without image')
      console.log('   horoscopeText exists:', !!upsertData.horoscope_text)
      console.log('   imageUrl variable:', imageUrl)
      // Set to null explicitly to ensure database accepts it
      upsertData.image_url = null
    }
    
    console.log('💾 Executing database upsert...')
    console.log('   Upsert data image_url:', upsertData.image_url ? upsertData.image_url.substring(0, 150) + '...' : 'null (no image)')
    console.log('🔍 DEBUG: Upsert operation details:', {
      table: 'horoscopes',
      conflictColumns: 'user_id,date',
      dateBeingSaved: upsertData.date,
      dateType: typeof upsertData.date,
      dateString: String(upsertData.date),
      hasImageUrl: !!upsertData.image_url,
      hasText: !!upsertData.horoscope_text,
      textLength: upsertData.horoscope_text?.length || 0
    })
    
    const { data: upsertResult, error: upsertError } = await supabaseAdmin
      .from('horoscopes')
      .upsert(upsertData, {
        onConflict: 'user_id,date', // Use the unique constraint
        ignoreDuplicates: false // Update existing records
      })
      .select('id, user_id, date, image_url, horoscope_text, generated_at') // Explicitly select image_url
    
    console.log('🔍 DEBUG: Upsert result:', {
      success: !upsertError,
      error: upsertError?.message || null,
      errorCode: upsertError?.code || null,
      resultCount: upsertResult?.length || 0,
      result: upsertResult?.map(r => ({
        id: r.id,
        date: r.date,
        dateString: String(r.date),
        hasImageUrl: !!r.image_url,
        hasText: !!r.horoscope_text
      })) || null
    })
    
    if (upsertError) {
      // This is critical - if we can't save, we've wasted an API call
      console.error('❌ CRITICAL: Error upserting horoscope text:', upsertError)
      console.error('   Error details:', {
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
        code: upsertError.code
      })
      console.error('   This means we generated text but failed to save it - API call was wasted!')
      console.error('   Data that failed to save:', upsertData)
      
      // Try to verify if record exists despite error
      const { data: verifyRecord } = await supabaseAdmin
        .from('horoscopes')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayDate)
        .maybeSingle()
      
      if (verifyRecord) {
        console.log('   ⚠️ Record exists despite error - may have been saved by another request')
        // Record exists, so we can return it
      } else {
        console.error('   ❌ CONFIRMED: No record exists - save completely failed!')
        // CRITICAL: If we can't save, we should NOT return the generated horoscope
        // because it will be lost and we'll regenerate on next request
        // Return an error instead to prevent API waste
        return NextResponse.json(
          { 
            error: 'Failed to save horoscope to database. The generated horoscope was not saved. Please try again or contact support.',
            details: upsertError.message,
            code: upsertError.code
          },
          { status: 500 }
        )
      }
    } else {
      console.log('✅ Successfully saved horoscope text for user', userId, 'on date', todayDate)
      console.log('🔍 DEBUG: Verification - querying back the saved record:', {
        savedDate: todayDate,
        savedDateType: typeof todayDate
      })
      
      // Verify the save by querying it back
      const { data: verifySave, error: verifySaveError } = await supabaseAdmin
        .from('horoscopes')
        .select('id, date, generated_at, horoscope_text, image_url')
        .eq('user_id', userId)
        .eq('date', todayDate)
        .maybeSingle()
      
      if (verifySave) {
        console.log('🔍 DEBUG: Verified saved record:', {
          id: verifySave.id,
          date: verifySave.date,
          dateType: typeof verifySave.date,
          dateString: String(verifySave.date),
          matchesSaved: String(verifySave.date) === todayDate,
          generated_at: verifySave.generated_at,
          hasText: !!verifySave.horoscope_text,
          hasImage: !!verifySave.image_url
        })
      } else {
        console.error('❌ DEBUG: Could not verify saved record!', verifySaveError?.message)
      }
      if (upsertResult && upsertResult.length > 0) {
        console.log('   Saved record:', {
          id: upsertResult[0].id,
          date: upsertResult[0].date,
          text_length: upsertResult[0].horoscope_text?.length || 0,
          image_url: upsertResult[0].image_url || 'MISSING',
          image_url_length: upsertResult[0].image_url?.length || 0
        })
        
        // CRITICAL: Check if image_url was actually saved
        if (!upsertResult[0].image_url || upsertResult[0].image_url.trim() === '') {
          console.log('   ⚠️ No image_url in upsert result (this is OK - image is optional)')
          console.error('   This means the database save did not include the image_url field')
        } else {
          console.log('   ✅ image_url was saved successfully:', upsertResult[0].image_url.substring(0, 100) + '...')
        }
      } else {
        console.warn('   ⚠️ Upsert succeeded but no data returned')
      }
      
      // CRITICAL: Verify the record was actually saved
      // Wait a moment to ensure transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // First verification - immediate check
      const { data: verifyRecord, error: verifyRecordError } = await supabaseAdmin
        .from('horoscopes')
        .select('horoscope_text, date, id, image_url, image_prompt, prompt_slots_json, generated_at')
        .eq('user_id', userId)
        .eq('date', todayDate)
        .maybeSingle()
      
      if (verifyRecordError) {
        console.error('   ❌ CRITICAL: Error verifying saved record:', verifyRecordError)
        console.error('   This means the save may have failed silently!')
        throw new Error(`Database verification failed: ${verifyRecordError.message}`)
      } else if (verifyRecord) {
        console.log('   ✅ Verified: Record exists in database')
        console.log('   Record ID:', verifyRecord.id)
        console.log('   Record date:', verifyRecord.date)
        console.log('   Generated at:', verifyRecord.generated_at)
        console.log('   Text length:', verifyRecord.horoscope_text?.length || 0)
        console.log('   Image URL:', verifyRecord.image_url || 'MISSING')
        console.log('   Image URL length:', verifyRecord.image_url?.length || 0)
        console.log('   Image URL matches saved:', verifyRecord.image_url === imageUrl)
        
        // Image URL is optional - verify it was saved if provided
        if (!verifyRecord.image_url || verifyRecord.image_url.trim() === '') {
          console.log('   ⚠️ No image URL in database after save (this is OK - image is optional)')
        } else if (verifyRecord.image_url !== imageUrl && imageUrl) {
          console.warn('   ⚠️ WARNING: Image URL in database does not match what we tried to save!')
          console.warn('   Expected:', imageUrl)
          console.warn('   Actual:', verifyRecord.image_url)
        }
        
        // CRITICAL: Second verification with a fresh query to ensure data is actually persisted
        // Wait a bit longer and query again to ensure transaction committed
        await new Promise(resolve => setTimeout(resolve, 200))
        
        const { data: verifyRecord2, error: verifyError2 } = await supabaseAdmin
          .from('horoscopes')
          .select('id, horoscope_text, image_url, date')
          .eq('user_id', userId)
          .eq('date', todayDate)
          .maybeSingle()
        
        if (verifyError2) {
          console.error('   ❌ CRITICAL: Second verification query failed:', verifyError2)
          throw new Error(`Second database verification failed: ${verifyError2.message}`)
        } else if (!verifyRecord2) {
          console.error('   ❌ CRITICAL: Record disappeared after second verification!')
          console.error('   This suggests the transaction was rolled back or the record was deleted')
          throw new Error('Record not found in second verification - transaction may have been rolled back')
        } else {
          console.log('   ✅ Second verification passed - record is persisted')
          console.log('   Second check - Record ID:', verifyRecord2.id)
          console.log('   Second check - Has text:', !!verifyRecord2.horoscope_text)
          console.log('   Second check - Has image:', !!verifyRecord2.image_url)
        }
      } else {
        console.error('   ❌ CRITICAL VERIFICATION FAILED: Record not found after save!')
        console.error('   This means the upsert appeared to succeed but the record is missing!')
        console.error('   This is a critical database issue that needs immediate attention!')
        // Log the data we tried to save for debugging
        console.error('   Attempted to save:', {
          user_id: upsertData.user_id,
          date: upsertData.date,
          text_length: upsertData.horoscope_text?.length || 0,
          image_url: upsertData.image_url || 'MISSING'
        })
        
        // CRITICAL: Don't return success if we can't verify the save
        // This prevents returning data that wasn't actually saved
        return NextResponse.json(
          { 
            error: 'Failed to verify horoscope was saved to database. The generated horoscope may not have been persisted.',
            details: 'Database verification failed after save operation'
          },
          { status: 500 }
        )
      }
    }
    
    // CRITICAL: Only return response AFTER database save is verified
    // Log what we're returning to verify it matches what was saved
    console.log('📤 Returning horoscope response (AFTER database save verified):', {
      star_sign: starSign,
      text_length: horoscopeText?.length || 0,
      text_preview: horoscopeText?.substring(0, 100) || 'MISSING',
      dos_count: horoscopeDos?.length || 0,
      donts_count: horoscopeDonts?.length || 0,
      image_url: imageUrl || null,
      image_url_length: imageUrl?.length || 0,
      character_name: characterName
    })
    
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

