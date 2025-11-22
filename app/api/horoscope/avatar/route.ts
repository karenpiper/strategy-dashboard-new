import { NextRequest, NextResponse } from 'next/server'
import { generateHoroscopeImage } from '@/lib/openai'
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
    // Use local timezone for date calculation (midnight local time)
    const today = new Date()
    const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayDate = localDate.toISOString().split('T')[0] // YYYY-MM-DD format
    
    console.log('Checking for cached image - user:', userId, 'date:', todayDate, 'local time:', today.toLocaleString())
    
    const { data: cachedHoroscope, error: cacheError } = await supabaseAdmin
      .from('horoscopes')
      .select('image_url, image_prompt, prompt_slots_json, date, generated_at')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    if (cacheError) {
      console.error('Error checking cache:', cacheError)
    }
    
    // Also check if there are any recent horoscopes for debugging
    const { data: recentHoroscopes } = await supabaseAdmin
      .from('horoscopes')
      .select('date, image_url, generated_at, prompt_slots_json')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5)
    
    console.log('Image cache check result:', {
      found: !!cachedHoroscope,
      hasImage: !!cachedHoroscope?.image_url,
      hasPromptSlots: !!cachedHoroscope?.prompt_slots_json,
      date: cachedHoroscope?.date,
      expectedDate: todayDate,
      recentHoroscopes: recentHoroscopes?.map(h => ({ date: h.date, hasImage: !!h.image_url, hasSlots: !!h.prompt_slots_json }))
    })
    
    // Helper function to check if image URL is expired or will expire soon
    // OpenAI DALL-E URLs expire after a certain time (typically 1 hour)
    // We check by attempting to fetch the image with a HEAD request
    const isImageUrlExpired = async (url: string): Promise<boolean> => {
      try {
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        // 410 = Gone (expired), 403 = Forbidden (expired/invalid)
        return !response.ok || response.status === 410 || response.status === 403
      } catch (error) {
        // Network errors or timeouts - assume expired
        console.log('Image URL check failed, assuming expired:', error)
        return true
      }
    }
    
    // Check if cached image exists and is valid
    let shouldRegenerate = false
    if (cachedHoroscope && cachedHoroscope.image_url && cachedHoroscope.image_url.trim() !== '') {
      // Check if URL is expired
      const isExpired = await isImageUrlExpired(cachedHoroscope.image_url)
      if (isExpired) {
        console.log('⚠️ Cached image URL is expired, will regenerate')
        shouldRegenerate = true
      }
    } else {
      shouldRegenerate = true
    }
    
    // Return cached image if it exists and is valid
    if (cachedHoroscope && cachedHoroscope.image_url && cachedHoroscope.image_url.trim() !== '' && !shouldRegenerate) {
      console.log('✅ Returning cached image for user', userId, 'on date', todayDate, '- NO API CALL - using database cache')
      
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
        cached: true,
      })
    }
    
    // Generate new image if there's no cached image or if the cached image URL is expired
    // This ensures we only generate once per day (unless URL expires) and avoid hitting billing limits
    if (shouldRegenerate) {
      console.log('⚠️ No valid cached image found for user', userId, 'on date', todayDate, '- GENERATING NEW IMAGE (this will call OpenAI API)')
    } else {
      console.log('⚠️ No cached image found for user', userId, 'on date', todayDate, '- GENERATING NEW IMAGE (this will call OpenAI API)')
    }
    
    // Generate new image with new slot-based prompt system
    const { imageUrl, prompt, slots, reasoning } = await generateHoroscopeImage(
      supabaseAdmin,
      userId,
      todayDate,
      {
        name: profile.full_name || userEmail || 'User',
        role: profile.role || null,
        hobbies: profile.hobbies || null,
        starSign: starSign,
        element: userProfile.element,
        likes_fantasy: profile.likes_fantasy || false,
        likes_scifi: profile.likes_scifi || false,
        likes_cute: profile.likes_cute || false,
        likes_minimal: profile.likes_minimal || false,
        hates_clowns: profile.hates_clowns || false,
      },
      userProfile.weekday,
      userProfile.season
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
    // Store slots and reasoning together in prompt_slots_json
    const upsertData: any = {
      user_id: userId,
      star_sign: starSign,
      image_url: imageUrl,
      image_prompt: prompt,
      prompt_slots_json: { ...slots, reasoning }, // Store selected slot IDs and reasoning
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
    
    // Resolve slot IDs to labels for display
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
    
    console.log('New image reasoning:', reasoning)
    console.log('Reasoning keys:', reasoning ? Object.keys(reasoning) : 'no reasoning')
    
    return NextResponse.json({
      image_url: imageUrl,
      image_prompt: prompt,
      prompt_slots: slots,
      prompt_slots_labels: slotLabels,
      prompt_slots_reasoning: reasoning,
      cached: false,
    })
  } catch (error: any) {
    console.error('Error in horoscope image API:', error)
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to generate horoscope image'
    let statusCode = 500
    
    // Check for specific error types
    if (error.message?.includes('billing limit') || error.message?.includes('billing')) {
      errorMessage = 'OpenAI billing limit reached. Please check your OpenAI account billing settings and add payment method if needed.'
      statusCode = 402 // Payment Required
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'OpenAI API rate limit exceeded. Please try again in a few minutes.'
      statusCode = 429 // Too Many Requests
    } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      errorMessage = 'Database tables not found. Please run the database migrations: create-prompt-slot-system.sql and seed-prompt-slot-catalogs.sql'
      statusCode = 500
    } else if (error.message?.includes('No style groups available') || error.message?.includes('No compatible style reference found')) {
      errorMessage = 'Prompt slot catalogs not found. Please run the seed-prompt-slot-catalogs.sql migration.'
      statusCode = 500
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: statusCode }
    )
  }
}

