import { NextRequest, NextResponse } from 'next/server'
import { fetchHoroscopeConfig } from '@/lib/horoscope-config'
import { createClient } from '@/lib/supabase/server'
import { getTodayDateUTC, getTodayDateInTimezone } from '@/lib/utils'

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
    const userEmail = user.email

    // Fetch user profile to get birthday, discipline, role, name, hobbies, preferences, and timezone
    const { data: profile, error: profileError } = await supabase
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
    
    // Parse birthday (optional for image generation)
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
    
    // Birthday is optional for image generation - we can use weekday/season/discipline/role segments
    // If birthday is invalid, set to null and continue without star sign segments
    if (birthdayMonth && birthdayDay && !isNaN(birthdayMonth) && !isNaN(birthdayDay)) {
      // Valid birthday - will use star sign segments
    } else {
      // No valid birthday - will use weekday/season/discipline/role segments only
      birthdayMonth = null
      birthdayDay = null
      console.log('⚠️ No birthday set - generating image using weekday/season/discipline/role segments only')
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
    // Use EST/EDT timezone for date calculation (America/New_York)
    // This ensures horoscopes regenerate based on Eastern time, not UTC
    const defaultTimezone = 'America/New_York' // EST/EDT
    const userTimezone = profile.timezone || defaultTimezone
    const todayDate = getTodayDateInTimezone(userTimezone)
    const now = new Date()
    
    console.log('🔍 DEBUG: Avatar date calculation:', {
      userTimezone,
      calculatedDate: todayDate,
      utcDate: getTodayDateUTC(),
      datesDiffer: todayDate !== getTodayDateUTC()
    })
    
    console.log('🔍 Checking database for cached image - user:', userId)
    console.log('   Today (UTC):', todayDate)
    console.log('   Current UTC time:', now.toISOString())
    console.log('   Current local time:', now.toLocaleString())
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
      .select('id, date, generated_at, image_url')
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
        hasImage: !!h.image_url,
        dateMatchesToday: String(h.date) === todayDate,
        dateMatchesTodayStrict: h.date === todayDate
      })))
    } else {
      console.log('⚠️ DEBUG: Could not fetch all horoscopes:', debugError?.message)
    }
    
    // CRITICAL: Check database FIRST before any generation
    // This is the primary check to prevent unnecessary API calls
    const { data: cachedHoroscope, error: cacheError } = await supabaseAdmin
      .from('horoscopes')
      .select('image_url, image_prompt, prompt_slots_json, date, generated_at')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    // CRITICAL: Also check if the horoscope was actually generated today in the user's timezone
    // This handles the case where old records have UTC dates that match today's EST date
    let isFromToday = false
    if (cachedHoroscope?.generated_at) {
      const generatedAt = new Date(cachedHoroscope.generated_at)
      const generatedAtInUserTz = getTodayDateInTimezone(userTimezone, generatedAt)
      isFromToday = generatedAtInUserTz === todayDate
      
      const hoursAgo = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60)
      
      console.log('🔍 DEBUG: Avatar generated_at validation:', {
        generatedAt: cachedHoroscope.generated_at,
        generatedAtISO: generatedAt.toISOString(),
        generatedAtInUserTz,
        todayDate,
        isFromToday,
        hoursAgo: hoursAgo.toFixed(2),
        generatedAtLocal: generatedAt.toLocaleString('en-US', { timeZone: userTimezone }),
        nowLocal: now.toLocaleString('en-US', { timeZone: userTimezone })
      })
      
      // If it was generated more than 24 hours ago, definitely regenerate
      if (hoursAgo > 24) {
        console.log('⚠️ Avatar was generated more than 24 hours ago - will regenerate')
        isFromToday = false
      }
    } else if (cachedHoroscope) {
      // If there's no generated_at timestamp, assume it's old and regenerate
      console.log('⚠️ Cached avatar found but no generated_at timestamp - will regenerate')
      isFromToday = false
    }
    
    console.log('🔍 DEBUG: Avatar query result:', {
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
      // Don't proceed if there's a database error - return error instead of generating
      return NextResponse.json(
        { error: 'Database error while checking cache: ' + cacheError.message },
        { status: 500 }
      )
    }
    
    // Also check if there are any recent horoscopes for debugging
    const { data: recentHoroscopes } = await supabaseAdmin
      .from('horoscopes')
      .select('date, image_url, generated_at, prompt_slots_json')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5)
    
    console.log('📊 Database cache check result:', {
      found: !!cachedHoroscope,
      hasImage: !!cachedHoroscope?.image_url,
      imageUrlLength: cachedHoroscope?.image_url?.length || 0,
      hasPromptSlots: !!cachedHoroscope?.prompt_slots_json,
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
        hasImage: !!h.image_url, 
        hasSlots: !!h.prompt_slots_json 
      }))
    })
    
    // IMPORTANT: Only regenerate if there's NO cached image at all
    // We return cached images even if:
    // - URL is expired (frontend will handle the error and show a message)
    // - prompt_slots_json is null (old system - we'll migrate gradually)
    // This prevents hitting billing limits by regenerating unnecessarily
    // Images are generated ONCE per day per user and cached in the database
    // Even if the URL expires, we don't regenerate - we only generate once per day
    
    // CRITICAL: Only return cached image if it was generated today in the user's timezone
    // This ensures images regenerate daily based on EST, not UTC
    console.log('🔍 DEBUG: Avatar cache check decision:', {
      hasCachedHoroscope: !!cachedHoroscope,
      hasImage: !!cachedHoroscope?.image_url,
      isFromToday,
      willReturnCached: !!cachedHoroscope && cachedHoroscope.image_url && isFromToday
    })
    
    if (cachedHoroscope && cachedHoroscope.image_url && cachedHoroscope.image_url.trim() !== '' && isFromToday) {
      console.log('✅ Found image in database - returning latest data')
      console.log('   Image URL:', cachedHoroscope.image_url.substring(0, 100) + '...')
      console.log('   Date:', cachedHoroscope.date)
      console.log('   Generated at:', cachedHoroscope.generated_at)
      console.log('   Has prompt slots:', !!cachedHoroscope.prompt_slots_json)
      
      // Resolve slot IDs to labels for display (only if prompt_slots_json exists)
      const slots = cachedHoroscope.prompt_slots_json
      const slotLabels: any = {}
      
      if (slots) {
        // Fetch catalog items for the slot IDs
        const slotIds = [
          slots.style_medium_id,
          slots.style_reference_id,
          slots.subject_role_id,
          slots.subject_twist_id,
          slots.setting_place_id,
          slots.setting_time_id,
          slots.activity_id,
          slots.mood_vibe_id,
          slots.color_palette_id,
          slots.camera_frame_id,
          slots.lighting_style_id,
          ...(slots.constraints_ids || []),
        ].filter(Boolean)
        
        if (slotIds.length > 0) {
          const { data: catalogItems } = await supabaseAdmin
            .from('prompt_slot_catalogs')
            .select('id, slot_type, label, value')
            .in('id', slotIds)
          
          if (catalogItems) {
            const catalogMap = new Map(catalogItems.map(item => [item.id, item]))
            
            slotLabels.style_medium = catalogMap.get(slots.style_medium_id)?.label
            slotLabels.style_reference = catalogMap.get(slots.style_reference_id)?.label
            slotLabels.subject_role = catalogMap.get(slots.subject_role_id)?.label
            slotLabels.subject_twist = slots.subject_twist_id ? catalogMap.get(slots.subject_twist_id)?.label : null
            slotLabels.setting_place = catalogMap.get(slots.setting_place_id)?.label
            slotLabels.setting_time = catalogMap.get(slots.setting_time_id)?.label
            slotLabels.activity = catalogMap.get(slots.activity_id)?.label
            slotLabels.mood_vibe = catalogMap.get(slots.mood_vibe_id)?.label
            slotLabels.color_palette = catalogMap.get(slots.color_palette_id)?.label
            slotLabels.camera_frame = catalogMap.get(slots.camera_frame_id)?.label
            slotLabels.lighting_style = catalogMap.get(slots.lighting_style_id)?.label
            slotLabels.constraints = (slots.constraints_ids || []).map((id: string) => catalogMap.get(id)?.label).filter(Boolean)
          }
        }
      }
      
      // Extract reasoning from cached slots if available
      // Reasoning is stored at the top level of prompt_slots_json: { ...slots, reasoning }
      const cachedReasoning = slots?.reasoning || null
      console.log('Cached reasoning:', cachedReasoning)
      console.log('Cached slots structure:', slots ? Object.keys(slots) : 'no slots')
      console.log('Has reasoning property:', slots && 'reasoning' in slots)
      if (slots && cachedReasoning) {
        console.log('Reasoning keys:', Object.keys(cachedReasoning))
      }
      
      return NextResponse.json({
        image_url: cachedHoroscope.image_url,
        image_prompt: cachedHoroscope.image_prompt || null,
        prompt_slots: cachedHoroscope.prompt_slots_json || null,
        prompt_slots_labels: Object.keys(slotLabels).length > 0 ? slotLabels : null,
        prompt_slots_reasoning: cachedReasoning,
        cached: false, // Mark as not cached since we're always returning latest
      })
    } else {
      console.log('⚠️ No image found in database for today - main endpoint should generate it first')
      console.log('   This endpoint only returns cached images, it does not generate new ones')
      console.log('   Please call /api/horoscope first to generate both text and image via n8n')
    }
    
    // CRITICAL SAFETY CHECK: DISABLED for debugging
    // This prevents race conditions if multiple requests come in simultaneously
    // TODO: Re-enable safety check once n8n workflow is stable and race conditions are resolved
    // if (doubleCheckHoroscope && doubleCheckHoroscope.image_url && doubleCheckHoroscope.image_url.trim() !== '') {
    //   ... (safety check code commented out)
    // }
    
    console.log('🔄 SAFETY CHECK DISABLED - Will return latest from database (debugging mode)')
    
    // Double-check database to get the absolute latest (in case it was just updated)
    const { data: doubleCheckHoroscope } = await supabaseAdmin
      .from('horoscopes')
      .select('image_url, image_prompt, prompt_slots_json, date, generated_at')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    if (doubleCheckHoroscope && doubleCheckHoroscope.image_url && doubleCheckHoroscope.image_url.trim() !== '') {
      console.log('✅ Found latest image in database (from double-check)')
      console.log('   Image URL:', doubleCheckHoroscope.image_url.substring(0, 100) + '...')
      console.log('   Generated at:', doubleCheckHoroscope.generated_at)
      // Return latest image from database
      // Re-fetch labels if needed (simplified for safety check)
      const slots = doubleCheckHoroscope.prompt_slots_json
      const slotLabels: any = {}
      
      if (slots) {
        const slotIds = [
          slots.style_medium_id,
          slots.style_reference_id,
          slots.subject_role_id,
          slots.subject_twist_id,
          slots.setting_place_id,
          slots.setting_time_id,
          slots.activity_id,
          slots.mood_vibe_id,
          slots.color_palette_id,
          slots.camera_frame_id,
          slots.lighting_style_id,
          ...(slots.constraints_ids || []),
        ].filter(Boolean)
        
        if (slotIds.length > 0) {
          const { data: catalogItems } = await supabaseAdmin
            .from('prompt_slot_catalogs')
            .select('id, slot_type, label, value')
            .in('id', slotIds)
          
          if (catalogItems) {
            const catalogMap = new Map(catalogItems.map(item => [item.id, item]))
            slotLabels.style_medium = catalogMap.get(slots.style_medium_id)?.label
            slotLabels.style_reference = catalogMap.get(slots.style_reference_id)?.label
            slotLabels.subject_role = catalogMap.get(slots.subject_role_id)?.label
            slotLabels.subject_twist = slots.subject_twist_id ? catalogMap.get(slots.subject_twist_id)?.label : null
            slotLabels.setting_place = catalogMap.get(slots.setting_place_id)?.label
            slotLabels.setting_time = catalogMap.get(slots.setting_time_id)?.label
            slotLabels.activity = catalogMap.get(slots.activity_id)?.label
            slotLabels.mood_vibe = catalogMap.get(slots.mood_vibe_id)?.label
            slotLabels.color_palette = catalogMap.get(slots.color_palette_id)?.label
            slotLabels.camera_frame = catalogMap.get(slots.camera_frame_id)?.label
            slotLabels.lighting_style = catalogMap.get(slots.lighting_style_id)?.label
            slotLabels.constraints = (slots.constraints_ids || []).map((id: string) => catalogMap.get(id)?.label).filter(Boolean)
          }
        }
      }
      
      const cachedReasoning = slots?.reasoning || null
      
      return NextResponse.json({
        image_url: doubleCheckHoroscope.image_url,
        image_prompt: doubleCheckHoroscope.image_prompt || null,
        prompt_slots: slots || null,
        prompt_slots_labels: Object.keys(slotLabels).length > 0 ? slotLabels : null,
        prompt_slots_reasoning: cachedReasoning,
        cached: true,
      })
    }
    
    // HARD STOP: If we have no records at all, don't generate
    // This prevents quota waste if previous saves failed
    // NOTE: Commented out to allow generation when database is empty (e.g., first-time users)
    /*
    const { data: anyUserRecords } = await supabaseAdmin
      .from('horoscopes')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
    
    if (!anyUserRecords || anyUserRecords.length === 0) {
      console.error('🚫 HARD STOP: No records found for user - previous generations may not have been saved')
      console.error('   Returning error to prevent quota waste')
      return NextResponse.json(
        { 
          error: 'No cached avatar found and database appears empty. Previous generations may not have been saved. Please contact support before generating new content.',
          details: 'Database is accessible but contains no records for this user. This prevents unnecessary API calls.'
        },
        { status: 500 }
      )
    }
    */
    
    // Image generation is now handled in the main horoscope route via Elvex/Airtable
    // This endpoint now just returns the cached image if it exists
    // If no image exists, check if horoscope exists (image generation may have failed)
    if (!cachedHoroscope) {
      console.log('⚠️ No horoscope found in database. Please call /api/horoscope first to generate horoscope.')
      return NextResponse.json(
        { 
          error: 'Horoscope not found. Please generate horoscope first by calling /api/horoscope endpoint.',
          details: 'Horoscope generation is required before image can be retrieved.'
        },
        { status: 404 }
      )
    }
    
    if (!isFromToday) {
      console.log('⚠️ Image found but was generated on a different day')
      console.log('   Cached date:', cachedHoroscope.date)
      console.log('   Generated at:', cachedHoroscope.generated_at)
      console.log('   Today (EST):', todayDate)
      console.log('   Will need to regenerate via main horoscope route')
      return NextResponse.json(
        { 
          error: 'Image needs regeneration. Please generate horoscope first by calling /api/horoscope endpoint.',
          details: 'Image was generated on a different day and needs to be regenerated.'
        },
        { status: 404 }
      )
    }
    
    if (!cachedHoroscope.image_url || cachedHoroscope.image_url.trim() === '') {
      console.log('⚠️ Horoscope exists but image_url is null or empty')
      console.log('   This means image generation failed (likely Airtable error)')
      console.log('   Horoscope date:', cachedHoroscope.date)
      console.log('   Has text:', !!cachedHoroscope.horoscope_text)
      console.log('   Image URL:', cachedHoroscope.image_url)
      return NextResponse.json(
        { 
          error: 'Image generation failed. The horoscope was generated but image generation via Airtable failed. Please check Airtable configuration and try regenerating.',
          details: 'Image generation is handled separately from text generation. Check Vercel logs for Airtable errors.',
          hasHoroscope: true,
          imageUrl: null
        },
        { status: 404 }
      )
    }
    
    // Return the existing image URL and related data
    // Image is already stored in Supabase storage by the main route
    const imageUrl = cachedHoroscope.image_url
    const prompt = cachedHoroscope.image_prompt || ''
    const slots = cachedHoroscope.prompt_slots_json || {}
    const reasoning = {} // Not stored in database, but kept for API compatibility
    
    console.log('✅ Returning cached image from database')
    
    // Resolve slot IDs to labels for display (same logic as before)
    const slotLabels: any = {}
    const slotIds = [
      slots.style_medium_id,
      slots.style_reference_id,
      slots.subject_role_id,
      slots.subject_twist_id,
      slots.setting_place_id,
      slots.setting_time_id,
      slots.activity_id,
      slots.mood_vibe_id,
      slots.color_palette_id,
      slots.camera_frame_id,
      slots.lighting_style_id,
      ...(slots.constraints_ids || [])
    ].filter(Boolean)
    
    if (slotIds.length > 0) {
      const { data: catalogItems } = await supabaseAdmin
        .from('prompt_slot_catalogs')
        .select('id, label')
        .in('id', slotIds)
      
      if (catalogItems) {
        const catalogMap = new Map(catalogItems.map(item => [item.id, item]))
        slotLabels.style_medium = catalogMap.get(slots.style_medium_id)?.label
        slotLabels.style_reference = catalogMap.get(slots.style_reference_id)?.label
        slotLabels.subject_role = catalogMap.get(slots.subject_role_id)?.label
        slotLabels.subject_twist = slots.subject_twist_id ? catalogMap.get(slots.subject_twist_id)?.label : null
        slotLabels.setting_place = catalogMap.get(slots.setting_place_id)?.label
        slotLabels.setting_time = catalogMap.get(slots.setting_time_id)?.label
        slotLabels.activity = catalogMap.get(slots.activity_id)?.label
        slotLabels.mood_vibe = catalogMap.get(slots.mood_vibe_id)?.label
        slotLabels.color_palette = catalogMap.get(slots.color_palette_id)?.label
        slotLabels.camera_frame = catalogMap.get(slots.camera_frame_id)?.label
        slotLabels.lighting_style = catalogMap.get(slots.lighting_style_id)?.label
        slotLabels.constraints = (slots.constraints_ids || []).map((id: string) => catalogMap.get(id)?.label).filter(Boolean)
      }
    }
    
    return NextResponse.json({
      image_url: imageUrl,
      image_prompt: prompt,
      prompt_slots: slots,
      prompt_slots_labels: Object.keys(slotLabels).length > 0 ? slotLabels : null,
      prompt_slots_reasoning: reasoning,
      cached: true,
    })
  } catch (error: any) {
    console.error('Error in horoscope avatar API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get horoscope avatar' },
      { status: 500 }
    )
  }
}

