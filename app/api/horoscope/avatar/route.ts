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
    
    console.log('🔍 Checking database for cached image - user:', userId, 'date:', todayDate, 'local time:', today.toLocaleString())
    
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
      date: cachedHoroscope?.date,
      expectedDate: todayDate,
      datesMatch: cachedHoroscope?.date === todayDate,
      recentHoroscopes: recentHoroscopes?.map(h => ({ date: h.date, hasImage: !!h.image_url, hasSlots: !!h.prompt_slots_json }))
    })
    
    // IMPORTANT: Only regenerate if there's NO cached image at all
    // We return cached images even if:
    // - URL is expired (frontend will handle the error and show a message)
    // - prompt_slots_json is null (old system - we'll migrate gradually)
    // This prevents hitting billing limits by regenerating unnecessarily
    // Images are generated ONCE per day per user and cached in the database
    // Even if the URL expires, we don't regenerate - we only generate once per day
    
    // SAFETY CHECK: If ANY record exists for today, we should NOT generate
    // This prevents duplicate generations even if image_url is somehow empty
    if (cachedHoroscope) {
      if (cachedHoroscope.image_url && cachedHoroscope.image_url.trim() !== '') {
        console.log('✅ FOUND cached image in database - RETURNING CACHED (NO API CALL)')
        console.log('   Image URL:', cachedHoroscope.image_url.substring(0, 50) + '...')
        console.log('   Date:', cachedHoroscope.date)
        console.log('   Generated at:', cachedHoroscope.generated_at)
      } else {
        // Record exists but image_url is empty - this shouldn't happen, but don't regenerate
        console.log('⚠️ WARNING: Record exists for today but image_url is empty/null')
        console.log('   Date:', cachedHoroscope.date)
        console.log('   Generated at:', cachedHoroscope.generated_at)
        console.log('   Returning existing record (NOT generating to avoid billing limits)')
        return NextResponse.json({
          image_url: null,
          image_prompt: cachedHoroscope.image_prompt || null,
          prompt_slots: cachedHoroscope.prompt_slots_json || null,
          prompt_slots_labels: null,
          prompt_slots_reasoning: null,
          cached: true,
          error: 'Image URL is missing from cached record. Please contact support.'
        })
      }
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
    
    // CRITICAL SAFETY CHECK: Double-check database one more time before generating
    // This prevents race conditions if multiple requests come in simultaneously
    const { data: doubleCheckHoroscope } = await supabaseAdmin
      .from('horoscopes')
      .select('image_url, image_prompt, prompt_slots_json, date')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    if (doubleCheckHoroscope && doubleCheckHoroscope.image_url && doubleCheckHoroscope.image_url.trim() !== '') {
      console.log('🛡️ SAFETY CHECK: Image was created between checks - returning cached instead of generating')
      console.log('   This prevents duplicate API calls and billing limit hits')
      // Return cached image to prevent duplicate generation
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
    
    // Only generate new image if there's NO cached image at all
    // This ensures we only generate once per day and avoid hitting billing limits
    console.log('⚠️ NO cached image found in database for user', userId, 'on date', todayDate)
    console.log('   Cached horoscope exists:', !!cachedHoroscope)
    console.log('   Has image_url:', !!cachedHoroscope?.image_url)
    console.log('   Image URL value:', cachedHoroscope?.image_url || 'null/empty')
    console.log('   Double-check result:', !!doubleCheckHoroscope?.image_url)
    console.log('   ⚠️ PROCEEDING TO GENERATE NEW IMAGE (this will call OpenAI API)')
    console.log('   ⚠️ THIS IS THE ONLY GENERATION FOR TODAY - NO MORE WILL BE GENERATED')
    
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
    
    // Download the image from OpenAI and upload to Supabase storage to prevent expiration
    console.log('📥 Downloading image from OpenAI and uploading to Supabase storage...')
    let permanentImageUrl = imageUrl
    try {
      // Download the image
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.statusText}`)
      }
      const imageBlob = await imageResponse.blob()
      const imageBuffer = Buffer.from(await imageBlob.arrayBuffer())
      
      // Upload to Supabase storage (avatars bucket)
      const fileName = `horoscope-${userId}-${todayDate}.png`
      const filePath = `${userId}/${fileName}`
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, imageBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true
        })
      
      if (uploadError) {
        console.error('⚠️ Failed to upload to Supabase storage, using OpenAI URL:', uploadError)
        // Continue with OpenAI URL if upload fails
      } else {
        // Get public URL from Supabase
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('avatars')
          .getPublicUrl(filePath)
        
        permanentImageUrl = publicUrl
        console.log('✅ Image uploaded to Supabase storage:', permanentImageUrl)
      }
    } catch (storageError: any) {
      console.error('⚠️ Error storing image in Supabase, using OpenAI URL:', storageError)
      // Continue with OpenAI URL if storage fails
    }
    
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
    // Use permanentImageUrl (Supabase storage) instead of OpenAI URL to prevent expiration
    const upsertData: any = {
      user_id: userId,
      star_sign: starSign,
      image_url: permanentImageUrl, // Use Supabase storage URL (doesn't expire)
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
    
    console.log('💾 Saving avatar image to database...')
    console.log('   Upsert data:', {
      user_id: upsertData.user_id,
      date: upsertData.date,
      star_sign: upsertData.star_sign,
      has_image_url: !!upsertData.image_url,
      image_url_length: upsertData.image_url?.length || 0,
      has_prompt: !!upsertData.image_prompt,
      has_slots: !!upsertData.prompt_slots_json
    })
    
    const { data: upsertResult, error: upsertError } = await supabaseAdmin
      .from('horoscopes')
      .upsert(upsertData, {
        onConflict: 'user_id,date', // Use the unique constraint
        ignoreDuplicates: false // Update existing records
      })
      .select() // Return the inserted/updated record
    
    if (upsertError) {
      console.error('❌ CRITICAL: Error upserting horoscope image:', upsertError)
      console.error('   Error details:', {
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
        code: upsertError.code
      })
      console.error('   This means we generated image but failed to save it - API call was wasted!')
      
      // Verify if record exists despite error
      const { data: verifyRecord } = await supabaseAdmin
        .from('horoscopes')
        .select('image_url, date')
        .eq('user_id', userId)
        .eq('date', todayDate)
        .maybeSingle()
      
      if (verifyRecord) {
        console.log('   ⚠️ Record exists despite error - may have been saved by another request')
        // Continue with returning the image
      } else {
        console.error('   ❌ CONFIRMED: No record exists - save completely failed!')
        // CRITICAL: If we can't save, return error to prevent API waste
        throw new Error(`Failed to save image to database: ${upsertError.message}. The generated image was not saved.`)
      }
    } else {
      console.log('✅ Successfully saved horoscope image for user', userId, 'on date', todayDate)
      if (upsertResult && upsertResult.length > 0) {
        console.log('   Saved record:', {
          id: upsertResult[0].id,
          date: upsertResult[0].date,
          has_image_url: !!upsertResult[0].image_url
        })
      }
      
      // CRITICAL: Verify the record was actually saved
      // If verification fails, this is a critical error - the save didn't work
      const { data: verifyRecord, error: verifyError } = await supabaseAdmin
        .from('horoscopes')
        .select('image_url, date, id')
        .eq('user_id', userId)
        .eq('date', todayDate)
        .maybeSingle()
      
      if (verifyError) {
        console.error('   ❌ CRITICAL: Error verifying saved record:', verifyError)
        console.error('   This means the save may have failed silently!')
      } else if (verifyRecord) {
        console.log('   ✅ Verified: Record exists in database with image_url length:', verifyRecord.image_url?.length || 0)
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
          has_image_url: !!upsertData.image_url
        })
      }
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
      image_url: permanentImageUrl, // Return Supabase storage URL (doesn't expire)
      image_prompt: prompt,
      prompt_slots: slots,
      prompt_slots_labels: slotLabels,
      prompt_slots_reasoning: reasoning,
      cached: false,
    })
  } catch (error: any) {
    console.error('❌ ERROR in horoscope image API:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
      response: error.response?.data
    })
    
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

