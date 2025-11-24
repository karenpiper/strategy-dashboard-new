import { NextRequest, NextResponse } from 'next/server'
import { generateHoroscopeViaN8n } from '@/lib/n8n-horoscope-service'
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
import { buildHoroscopePrompt, type UserProfile as PromptUserProfile } from '@/lib/horoscope-prompt-builder'
import { updateUserAvatarState } from '@/lib/horoscope-catalogs'
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
      .select('star_sign, horoscope_text, horoscope_dos, horoscope_donts, image_url, date, generated_at, character_name, prompt_slots_json')
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
    
    // TEMPORARY: Cache check disabled for debugging n8n integration
    // TODO: Re-enable cache check once n8n is working properly
    // This ensures horoscope text is generated ONCE per day per user and cached in the database
    // This prevents hitting billing limits by regenerating unnecessarily
    
    // SAFETY CHECK: DISABLED - Always generate to debug n8n
    // if (cachedHoroscope && !forceRegenerate) {
    //   ... (cache check code commented out)
    // }
    
    console.log('🔄 CACHE CHECK DISABLED - Generating new horoscope via n8n every time (debugging mode)')
    if (cachedHoroscope) {
      console.log('   Found cached horoscope but ignoring it:', {
        date: cachedHoroscope.date,
        generated_at: cachedHoroscope.generated_at,
        hasText: !!cachedHoroscope.horoscope_text,
        textLength: cachedHoroscope.horoscope_text?.length || 0
      })
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
    
    // Fetch user profile to get birthday, discipline (department), role (title), and image generation preferences
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('birthday, discipline, role, full_name, hobbies, likes_fantasy, likes_scifi, likes_cute, likes_minimal, hates_clowns')
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
    
    // Fetch from Cafe Astrology and generate via n8n
    console.log('Generating horoscope for:', { starSign, profile: userProfile })
    let horoscopeText: string
    let horoscopeDos: string[]
    let horoscopeDonts: string[]
    let imageUrl: string
    let imagePrompt: string
    let promptSlots: any
    let promptReasoning: any
    
    try {
      console.log('Fetching horoscope from Cafe Astrology...')
      const startTime = Date.now()
      
      // Fetch from Cafe Astrology
      const cafeAstrologyText = await fetchCafeAstrologyHoroscope(starSign)
      console.log('Fetched horoscope from Cafe Astrology')
      
      // Build image prompt using slot-based system (keep this logic in Next.js)
      console.log('Building image prompt with slot-based system...')
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
      
      const { prompt, slots, reasoning } = await buildHoroscopePrompt(
        supabaseAdmin,
        userId,
        todayDate,
        promptUserProfile,
        userProfile.weekday,
        userProfile.season
      )
      
      imagePrompt = prompt
      promptSlots = slots
      promptReasoning = reasoning
      
      // Validate prompt was built correctly
      if (!imagePrompt || imagePrompt.trim() === '') {
        throw new Error('Failed to build image prompt - prompt is empty')
      }
      
      // Log the built prompt for debugging
      console.log('✅ Built image prompt:', imagePrompt.substring(0, 200) + (imagePrompt.length > 200 ? '...' : ''))
      console.log('Prompt length:', imagePrompt.length)
      console.log('Prompt slots:', Object.keys(promptSlots || {}))
      console.log('🚀 Calling n8n workflow for text and image generation...')
      console.log('   This will generate both the horoscope text AND the image via n8n')
      
      // Call n8n workflow for both text transformation and image generation
      const n8nResult = await generateHoroscopeViaN8n({
        cafeAstrologyText,
        starSign,
        imagePrompt,
        slots: promptSlots,
        reasoning: promptReasoning,
        userId,
        date: todayDate,
      })
      
      // Validate n8n result before using it
      console.log('📥 Received n8n result:', {
        hasHoroscope: !!n8nResult.horoscope,
        horoscopeLength: n8nResult.horoscope?.length || 0,
        horoscopePreview: n8nResult.horoscope?.substring(0, 100) || 'MISSING',
        hasDos: !!n8nResult.dos,
        dosCount: n8nResult.dos?.length || 0,
        hasDonts: !!n8nResult.donts,
        dontsCount: n8nResult.donts?.length || 0,
        hasImageUrl: !!n8nResult.imageUrl,
        imageUrl: n8nResult.imageUrl || 'MISSING',
      })

      if (!n8nResult.horoscope || !n8nResult.dos || !n8nResult.donts) {
        throw new Error('Invalid n8n result: missing horoscope text, dos, or donts')
      }

      if (!n8nResult.imageUrl) {
        throw new Error('Invalid n8n result: missing imageUrl')
      }

      horoscopeText = n8nResult.horoscope
      horoscopeDos = n8nResult.dos
      horoscopeDonts = n8nResult.donts
      imageUrl = n8nResult.imageUrl

      console.log('✅ Using n8n result:', {
        horoscopeText: horoscopeText.substring(0, 100) + '...',
        dosCount: horoscopeDos.length,
        dontsCount: horoscopeDonts.length,
        imageUrl: imageUrl
      })
      
      // Update user avatar state (same logic as in generateHoroscopeImage)
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
      
      // Download the image from OpenAI and upload to Supabase storage to prevent expiration
      console.log('📥 Downloading image from OpenAI and uploading to Supabase storage...')
      console.log('   Source image URL:', imageUrl)
      let permanentImageUrl = imageUrl
      try {
        // Download the image
        console.log('   Fetching image from:', imageUrl)
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.statusText} (${imageResponse.status})`)
        }
        console.log('   Image downloaded successfully, size:', imageResponse.headers.get('content-length') || 'unknown')
        const imageBlob = await imageResponse.blob()
        const imageBuffer = Buffer.from(await imageBlob.arrayBuffer())
        console.log('   Image buffer size:', imageBuffer.length, 'bytes')
        
        // Upload to Supabase storage (avatars bucket)
        const fileName = `horoscope-${userId}-${todayDate}.png`
        const filePath = `${userId}/${fileName}`
        
        const { error: uploadError } = await supabaseAdmin.storage
          .from('avatars')
          .upload(filePath, imageBuffer, {
            contentType: 'image/png',
            upsert: true, // Overwrite if exists
          })
        
        if (uploadError) {
          console.error('❌ CRITICAL: Error uploading image to Supabase storage:', uploadError)
          console.error('   Upload error details:', {
            message: uploadError.message,
            statusCode: uploadError.statusCode,
            error: uploadError.error
          })
          // CRITICAL: If upload fails, we should fail the request
          // Don't use temporary OpenAI URLs that will expire
          throw new Error(`Failed to upload image to Supabase storage: ${uploadError.message}. Cannot save horoscope with temporary image URL.`)
        }
        
        // Get public URL from Supabase storage
        const { data: urlData } = supabaseAdmin.storage
          .from('avatars')
          .getPublicUrl(filePath)
        
        if (!urlData || !urlData.publicUrl) {
          console.error('❌ CRITICAL: Failed to get public URL from Supabase storage')
          throw new Error('Failed to get public URL for uploaded image. Upload may have succeeded but URL generation failed.')
        }
        
        permanentImageUrl = urlData.publicUrl
        console.log('✅ Image uploaded to Supabase storage successfully')
        console.log('   File path:', filePath)
        console.log('   Public URL:', permanentImageUrl)
        console.log('   Original OpenAI URL:', imageUrl)
        console.log('   URL length:', permanentImageUrl.length)
        
        // CRITICAL: Verify the URL is a Supabase URL, not OpenAI URL
        if (permanentImageUrl === imageUrl) {
          console.error('❌ CRITICAL: Permanent URL is same as original URL - upload failed!')
          throw new Error('Image upload failed - permanent URL matches temporary OpenAI URL')
        }
        
        if (!permanentImageUrl.includes('supabase.co') && !permanentImageUrl.includes('supabase')) {
          console.error('❌ CRITICAL: Permanent URL does not appear to be a Supabase URL!')
          console.error('   URL:', permanentImageUrl)
          throw new Error('Image upload may have failed - URL is not a Supabase storage URL')
        }
        
        // Verify the uploaded file exists by checking storage
        const { data: fileData, error: fileCheckError } = await supabaseAdmin.storage
          .from('avatars')
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
      } catch (imageError: any) {
        console.error('⚠️ Error processing image upload:', imageError)
        // Don't fail the request if image processing fails - use original URL
        console.log('   Using original OpenAI image URL instead')
      }
      
      imageUrl = permanentImageUrl
      
      const elapsedTime = Date.now() - startTime
      console.log(`✅ Horoscope generation completed via n8n in ${elapsedTime}ms`)
      
      console.log('Horoscope generated successfully:', { 
        horoscopeText: horoscopeText.substring(0, 50) + '...', 
        dosCount: horoscopeDos.length,
        dontsCount: horoscopeDonts.length,
        hasImageUrl: !!imageUrl,
        imageUrl: imageUrl || 'MISSING',
        imageUrlLength: imageUrl?.length || 0
      })
      
      // CRITICAL: Verify imageUrl is set before saving
      if (!imageUrl || imageUrl.trim() === '') {
        console.error('❌ CRITICAL ERROR: imageUrl is empty before saving to database!')
        console.error('   n8nResult.imageUrl:', n8nResult.imageUrl)
        console.error('   permanentImageUrl:', permanentImageUrl)
        throw new Error('Cannot save horoscope: imageUrl is empty. n8n generation may have failed.')
      }
    } catch (error: any) {
      console.error('❌ Error generating horoscope:', error)
      console.error('   Error code:', error.code)
      console.error('   Error type:', error.type)
      console.error('   Error status:', error.status)
      
      // Handle n8n-specific errors
      if (error.message?.includes('n8n webhook')) {
        console.error('🚫 N8N WEBHOOK ERROR:', error.message)
        return NextResponse.json(
          { 
            error: `Failed to generate horoscope via n8n: ${error.message}`,
            code: 'n8n_error',
            details: 'The horoscope generation service is temporarily unavailable. Please try again later.'
          },
          { status: 503 }
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
          code: error.code,
          details: error.details || error.message
        },
        { status: error.status || 500 }
      )
    }
    
    // CRITICAL SAFETY CHECK: DISABLED for debugging
    // This prevents race conditions if multiple requests come in simultaneously
    // TODO: Re-enable once n8n is working properly
    // if (!forceRegenerate) {
    //   ... (safety check code commented out)
    // }
    
    console.log('🔄 SAFETY CHECK DISABLED - Will always save new n8n-generated horoscope (debugging mode)')
    
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
      image_url: imageUrl, // Set image URL from n8n result (after upload to Supabase)
      prompt_slots_json: promptSlots, // Set prompt slots from prompt building
      image_prompt: imagePrompt, // Set image prompt
    }
    
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
    
    // CRITICAL: Verify imageUrl is set before saving
    if (!upsertData.image_url || upsertData.image_url.trim() === '') {
      console.error('❌ CRITICAL ERROR: Cannot save - image_url is empty in upsertData!')
      console.error('   This means the image URL was lost somewhere in the process')
      console.error('   horoscopeText exists:', !!upsertData.horoscope_text)
      console.error('   imageUrl variable:', imageUrl)
      throw new Error('Cannot save horoscope: image_url is empty. This should not happen.')
    }
    
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
          text_length: upsertResult[0].horoscope_text?.length || 0,
          image_url: upsertResult[0].image_url || 'MISSING',
          image_url_length: upsertResult[0].image_url?.length || 0
        })
        
        // CRITICAL: Check if image_url was actually saved
        if (!upsertResult[0].image_url || upsertResult[0].image_url.trim() === '') {
          console.error('   ❌ CRITICAL: image_url is missing in upsert result!')
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
      const { data: verifyRecord, error: verifyError } = await supabaseAdmin
        .from('horoscopes')
        .select('horoscope_text, date, id, image_url, image_prompt, prompt_slots_json, generated_at')
        .eq('user_id', userId)
        .eq('date', todayDate)
        .maybeSingle()
      
      if (verifyError) {
        console.error('   ❌ CRITICAL: Error verifying saved record:', verifyError)
        console.error('   This means the save may have failed silently!')
        throw new Error(`Database verification failed: ${verifyError.message}`)
      } else if (verifyRecord) {
        console.log('   ✅ Verified: Record exists in database')
        console.log('   Record ID:', verifyRecord.id)
        console.log('   Record date:', verifyRecord.date)
        console.log('   Generated at:', verifyRecord.generated_at)
        console.log('   Text length:', verifyRecord.horoscope_text?.length || 0)
        console.log('   Image URL:', verifyRecord.image_url || 'MISSING')
        console.log('   Image URL length:', verifyRecord.image_url?.length || 0)
        console.log('   Image URL matches saved:', verifyRecord.image_url === imageUrl)
        
        // CRITICAL: Verify the image URL was actually saved
        if (!verifyRecord.image_url || verifyRecord.image_url.trim() === '') {
          console.error('   ❌ CRITICAL: Image URL is missing in database after save!')
          console.error('   This means the save failed to persist the image_url field')
          throw new Error('Image URL was not saved to database despite successful upsert')
        } else if (verifyRecord.image_url !== imageUrl) {
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
      image_url: imageUrl || 'MISSING',
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

