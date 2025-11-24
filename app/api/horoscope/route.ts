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
    
    console.log('🔍 Checking database for cached horoscope text - user:', userId, 'date:', todayDate, 'local time:', today.toLocaleString())
    
    // CRITICAL: Check database FIRST before any generation
    // This is the primary check to prevent unnecessary API calls
    // Use multiple strategies to find records (exact date match, date range, recent records)
    console.log('🔍 Checking database with date:', todayDate, 'type:', typeof todayDate)
    
    const { data: cachedHoroscope, error: cacheError } = await supabaseAdmin
      .from('horoscopes')
      .select('star_sign, horoscope_text, horoscope_dos, horoscope_donts, image_url, date, generated_at, character_name')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
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
    const yesterday = new Date(localDate)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = yesterday.toISOString().split('T')[0]
    
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
      date: cachedHoroscope?.date,
      expectedDate: todayDate,
      datesMatch: cachedHoroscope?.date === todayDate,
      recentHoroscopes: recentHoroscopes?.map(h => ({ 
        date: h.date, 
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
    
    // IMPORTANT: Only regenerate if there's NO cached text at all
    // This ensures horoscope text is generated ONCE per day per user and cached in the database
    // This prevents hitting billing limits by regenerating unnecessarily
    
    // SAFETY CHECK: If ANY record exists for today, check if it has text
    if (cachedHoroscope) {
      if (cachedHoroscope.horoscope_text && cachedHoroscope.horoscope_text.trim() !== '') {
        console.log('✅ FOUND cached horoscope text in database - RETURNING CACHED (NO API CALL)')
        console.log('   Text length:', cachedHoroscope.horoscope_text.length)
        console.log('   Date:', cachedHoroscope.date)
        console.log('   Generated at:', cachedHoroscope.generated_at)
        return NextResponse.json({
          star_sign: cachedHoroscope.star_sign,
          horoscope_text: cachedHoroscope.horoscope_text,
          horoscope_dos: cachedHoroscope.horoscope_dos || [],
          horoscope_donts: cachedHoroscope.horoscope_donts || [],
          image_url: cachedHoroscope.image_url || '',
          character_name: cachedHoroscope.character_name || null,
          cached: true,
        })
      } else {
        // Record exists but text is empty - this shouldn't happen, but don't regenerate
        console.log('⚠️ WARNING: Record exists for today but horoscope_text is empty/null')
        console.log('   Date:', cachedHoroscope.date)
        console.log('   Generated at:', cachedHoroscope.generated_at)
        console.log('   Returning existing record (NOT generating to avoid billing limits)')
        return NextResponse.json({
          star_sign: cachedHoroscope.star_sign || null,
          horoscope_text: '',
          horoscope_dos: [],
          horoscope_donts: [],
          image_url: cachedHoroscope.image_url || '',
          character_name: cachedHoroscope.character_name || null,
          cached: true,
          error: 'Horoscope text is missing from cached record. Please contact support.'
        })
      }
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
    
    // Only generate new horoscope if there's NO cached text at all
    // Generation is now enabled even when database is empty
    // BUT: We should have already found it in the checks above
    // If we get here, something is wrong with our logic
    console.log('⚠️ NO cached horoscope text found in database for user', userId, 'on date', todayDate)
    console.log('   Cached horoscope exists:', !!cachedHoroscope)
    console.log('   Has horoscope_text:', !!cachedHoroscope?.horoscope_text)
    console.log('   Text value:', cachedHoroscope?.horoscope_text || 'null/empty')
    console.log('   Any records for user:', !!allUserRecords && allUserRecords.length > 0)
    console.log('   ⚠️ PROCEEDING TO GENERATE NEW HOROSCOPE (this will call OpenAI API)')
    console.log('   ⚠️ THIS IS THE ONLY GENERATION FOR TODAY - NO MORE WILL BE GENERATED')
    
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
      // This calls OpenAI API - if it fails due to quota, we should not proceed
      console.log('⚠️ About to call OpenAI API for text transformation - this will use API credits')
      const transformed = await transformHoroscopeToCoStarStyle(cafeAstrologyText, starSign)
      horoscopeText = transformed.horoscope
      horoscopeDos = transformed.dos
      horoscopeDonts = transformed.donts
      
      const elapsedTime = Date.now() - startTime
      console.log(`✅ Horoscope text generation completed in ${elapsedTime}ms`)
      
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
      console.error('❌ Error generating horoscope:', error)
      console.error('   Error code:', error.code)
      console.error('   Error type:', error.type)
      console.error('   Error status:', error.status)
      
      // Check for quota/billing errors - return specific error
      if (error.code === 'insufficient_quota' || error.status === 429) {
        const quotaError = 'OpenAI quota exceeded. Please check your OpenAI account billing settings. The system attempted to generate but your account has no remaining credits.'
        console.error('🚫 QUOTA ERROR:', quotaError)
        return NextResponse.json(
          { 
            error: quotaError,
            code: error.code || 'insufficient_quota',
            details: 'Your OpenAI account has exceeded its quota. Please add credits or upgrade your plan.'
          },
          { status: 429 }
        )
      }
      
      // Check for billing limit errors
      if (error.code === 'billing_hard_limit_reached' || error.status === 400) {
        const billingError = 'OpenAI billing hard limit reached. Please check your OpenAI account billing settings and add payment method if needed.'
        console.error('🚫 BILLING LIMIT ERROR:', billingError)
        return NextResponse.json(
          { 
            error: billingError,
            code: error.code || 'billing_hard_limit_reached',
            details: 'Your OpenAI account has reached its billing limit. Please add a payment method or increase your spending limit.'
          },
          { status: 402 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `Failed to generate horoscope: ${error.message || 'Unknown error'}`,
          code: error.code,
          details: error.details
        },
        { status: error.status || 500 }
      )
    }
    
    // CRITICAL SAFETY CHECK: Double-check database one more time before saving
    // This prevents race conditions if multiple requests come in simultaneously
    const { data: doubleCheckHoroscope } = await supabaseAdmin
      .from('horoscopes')
      .select('horoscope_text, image_url, prompt_slots_json, image_prompt')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    if (doubleCheckHoroscope && doubleCheckHoroscope.horoscope_text && doubleCheckHoroscope.horoscope_text.trim() !== '') {
      console.log('🛡️ SAFETY CHECK: Horoscope text was created between checks - returning cached instead of saving')
      console.log('   This prevents duplicate API calls and billing limit hits')
      // Return cached text to prevent duplicate generation
      return NextResponse.json({
        star_sign: starSign, // Use the star sign we calculated
        horoscope_text: doubleCheckHoroscope.horoscope_text,
        horoscope_dos: cachedHoroscope?.horoscope_dos || [],
        horoscope_donts: cachedHoroscope?.horoscope_donts || [],
        image_url: doubleCheckHoroscope.image_url || '',
        character_name: cachedHoroscope?.character_name || characterName,
        cached: true,
      })
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
      console.log('   Preserving existing image_url')
    }
    if (existingHoroscope?.prompt_slots_json) {
      upsertData.prompt_slots_json = existingHoroscope.prompt_slots_json
      console.log('   Preserving existing prompt_slots_json')
    }
    if (existingHoroscope?.image_prompt) {
      upsertData.image_prompt = existingHoroscope.image_prompt
      console.log('   Preserving existing image_prompt')
    }
    
    console.log('💾 Saving horoscope text to database...')
    console.log('   Upsert data:', {
      user_id: upsertData.user_id,
      date: upsertData.date,
      star_sign: upsertData.star_sign,
      text_length: upsertData.horoscope_text?.length || 0,
      has_dos: !!upsertData.horoscope_dos?.length,
      has_donts: !!upsertData.horoscope_donts?.length,
      character_name: upsertData.character_name,
      has_image_url: !!upsertData.image_url
    })
    
    const { data: upsertResult, error: upsertError } = await supabaseAdmin
      .from('horoscopes')
      .upsert(upsertData, {
        onConflict: 'user_id,date', // Use the unique constraint
        ignoreDuplicates: false // Update existing records
      })
      .select() // Return the inserted/updated record
    
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
      if (upsertResult && upsertResult.length > 0) {
        console.log('   Saved record:', {
          id: upsertResult[0].id,
          date: upsertResult[0].date,
          text_length: upsertResult[0].horoscope_text?.length || 0
        })
      } else {
        console.warn('   ⚠️ Upsert succeeded but no data returned')
      }
      
      // CRITICAL: Verify the record was actually saved
      // If verification fails, this is a critical error - the save didn't work
      const { data: verifyRecord, error: verifyError } = await supabaseAdmin
        .from('horoscopes')
        .select('horoscope_text, date, id')
        .eq('user_id', userId)
        .eq('date', todayDate)
        .maybeSingle()
      
      if (verifyError) {
        console.error('   ❌ CRITICAL: Error verifying saved record:', verifyError)
        console.error('   This means the save may have failed silently!')
      } else if (verifyRecord) {
        console.log('   ✅ Verified: Record exists in database with text length:', verifyRecord.horoscope_text?.length || 0)
        console.log('   Record ID:', verifyRecord.id)
        console.log('   Record date:', verifyRecord.date)
      } else {
        console.error('   ❌ CRITICAL VERIFICATION FAILED: Record not found after save!')
        console.error('   This means the upsert appeared to succeed but the record is missing!')
        console.error('   This is a critical database issue that needs immediate attention!')
        // Log the data we tried to save for debugging
        console.error('   Attempted to save:', {
          user_id: upsertData.user_id,
          date: upsertData.date,
          text_length: upsertData.horoscope_text?.length || 0
        })
      }
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

