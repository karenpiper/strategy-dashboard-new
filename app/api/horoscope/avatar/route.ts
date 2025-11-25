import { NextRequest, NextResponse } from 'next/server'
import { fetchHoroscopeConfig } from '@/lib/horoscope-config'
import { createClient } from '@/lib/supabase/server'
import { getTodayDateUTC } from '@/lib/utils'

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

    // Fetch user profile to get birthday, discipline, role, name, hobbies, and preferences
    const { data: profile, error: profileError } = await supabase
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
    // Use UTC for date calculation (consistent across all timezones)
    const todayDate = getTodayDateUTC()
    const now = new Date()
    
    console.log('🔍 Checking database for cached image - user:', userId)
    console.log('   Today (UTC):', todayDate)
    console.log('   Current UTC time:', now.toISOString())
    console.log('   Current local time:', now.toLocaleString())
    
    // CRITICAL: Check database FIRST before any generation
    // This is the primary check to prevent unnecessary API calls
    const { data: cachedHoroscope, error: cacheError } = await supabaseAdmin
      .from('horoscopes')
      .select('image_url, image_prompt, prompt_slots_json, date, generated_at')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
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
    
    // TEMPORARY: Cache check disabled for debugging n8n integration
    // TODO: Re-enable cache check once n8n is working properly
    // SAFETY CHECK: DISABLED - Always return latest from database
    // The main /api/horoscope endpoint generates and saves the image, so we just return what's in the DB
    console.log('🔄 CACHE CHECK DISABLED - Returning latest image from database (debugging mode)')
    
    if (cachedHoroscope && cachedHoroscope.image_url && cachedHoroscope.image_url.trim() !== '') {
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
    // TODO: Re-enable once n8n is working properly
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
    
    // Image generation is now handled in the main horoscope route via n8n
    // This endpoint now just returns the cached image if it exists
    // If no image exists, it means the horoscope hasn't been generated yet
    if (!cachedHoroscope?.image_url) {
      console.log('⚠️ No image found in database. Image generation is now handled by the main horoscope route.')
      console.log('   Please call /api/horoscope first to generate both text and image via n8n.')
      return NextResponse.json(
        { 
          error: 'Image not found. Please generate horoscope first by calling /api/horoscope endpoint.',
          details: 'Image generation is now combined with text generation in the main horoscope route.'
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

