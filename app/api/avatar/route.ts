import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTodayDateInTimezone } from '@/lib/utils'

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

// Helper: Check Airtable for existing image/caption for today
// Returns: { imageUrl, caption } if image found, { generating: true } if record exists but no image yet, null if nothing found
async function checkAirtableForImage(userId: string, date: string, timezone: string): Promise<{ imageUrl: string; caption: string } | { generating: true } | null> {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_IMAGE_BASE_ID || process.env.AIRTABLE_AI_BASE_ID || process.env.AIRTABLE_BASE_ID
  const tableId = process.env.AIRTABLE_IMAGE_TABLE_ID || 'tblKPuAESzyVMrK5M'
  const tableIdentifier = tableId
  
  if (!apiKey || !baseId) {
    return null
  }
  
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdentifier)}`
  
  // Use IS_SAME function for date comparison
  const filterFormula = `AND({User ID} = "${userId}", IS_SAME({Created At}, "${date}", "day"))`
  const queryUrl = `${url}?filterByFormula=${encodeURIComponent(filterFormula)}&sort[0][field]=Created At&sort[0][direction]=desc`
  
  try {
    const queryResponse = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!queryResponse.ok) {
      return null
    }
    
    const queryData = await queryResponse.json()
    
    if (!queryData.records || queryData.records.length === 0) {
      return null
    }
    
    // Find record with image for today
    let hasRecordForToday = false
    for (const record of queryData.records) {
      const recordDate = record.fields?.['Created At']
      if (!recordDate) continue
      
      const recordDateStr = typeof recordDate === 'string' ? recordDate.split('T')[0] : String(recordDate).split('T')[0]
      if (recordDateStr !== date) continue
      
      hasRecordForToday = true
      
      const imageField = record.fields?.Image
      const imageUrl = record.fields?.['Image URL']
      
      if (imageField || imageUrl) {
        let finalImageUrl = imageUrl
        if (!finalImageUrl && imageField && Array.isArray(imageField) && imageField.length > 0) {
          finalImageUrl = imageField[0].url
        }
        
        if (finalImageUrl) {
          // Try multiple possible field names (case variations)
          // Check 'character_name' first since that's the current field name in Airtable
          let caption = record.fields?.['character_name']
            || record.fields?.['Character Name']
            || record.fields?.['character name']
            || record.fields?.['CharacterName']
            || record.fields?.['characterName']
            || record.fields?.['Caption'] 
            || record.fields?.['caption'] 
            || null
          
          // If not found, search for any field containing "caption" or "character" (case insensitive)
          if (!caption && record.fields) {
            const fieldKeys = Object.keys(record.fields)
            console.log(`[Avatar API] Searching for caption in fields:`, fieldKeys)
            const captionField = fieldKeys.find(key => {
              const lowerKey = key.toLowerCase()
              return lowerKey.includes('caption') || 
                     lowerKey.includes('character') ||
                     lowerKey === 'name' ||
                     lowerKey.includes('name')
            })
            if (captionField) {
              caption = record.fields[captionField]
              console.log(`[Avatar API] Found caption in field "${captionField}":`, caption)
            } else {
              console.log(`[Avatar API] No caption field found. All fields:`, fieldKeys)
            }
          }
          
          console.log(`[Avatar API] Found image for user ${userId}, date ${date}`)
          console.log(`[Avatar API] Available fields:`, Object.keys(record.fields || {}))
          console.log(`[Avatar API] All field values:`, Object.entries(record.fields || {}).map(([key, val]) => `${key}: ${val}`))
          console.log(`[Avatar API] Caption value:`, caption)
          console.log(`[Avatar API] Caption type:`, typeof caption)
          
          // Convert to string and trim, return null if empty
          const captionValue = caption && typeof caption === 'string' 
            ? (caption.trim() || null)
            : (caption ? String(caption).trim() || null : null)
          
          console.log(`[Avatar API] Final caption value being returned:`, captionValue)
          
          return {
            imageUrl: finalImageUrl,
            caption: captionValue || ''
          }
        }
      }
    }
    
    // If we found a record for today but no image, it's still generating
    if (hasRecordForToday) {
      return { generating: true }
    }
    
    return null
  } catch (error) {
    console.error('Error checking Airtable for image:', error)
    return null
  }
}

// Helper: Download image from Airtable and upload to Supabase
async function downloadAndUploadImage(airtableImageUrl: string, userId: string, date: string, supabaseAdmin: any): Promise<string> {
  const imageResponse = await fetch(airtableImageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.statusText}`)
  }
  
  const imageBlob = await imageResponse.blob()
  const imageBuffer = Buffer.from(await imageBlob.arrayBuffer())
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `horoscope-${userId}-${date}-${timestamp}.png`
  const filePath = `${userId}/${fileName}`
  const bucketName = 'horoscope-avatars'
  
  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(filePath, imageBuffer, {
      contentType: 'image/png',
      upsert: false,
    })
  
  if (uploadError) {
    throw uploadError
  }
  
  const { data: urlData } = supabaseAdmin.storage
    .from(bucketName)
    .getPublicUrl(filePath)
  
  return urlData.publicUrl
}

// Helper: Create new Airtable record with prompt
async function createAirtableRecord(prompt: string, userId: string, userEmail: string, date: string, timezone: string): Promise<void> {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_IMAGE_BASE_ID || process.env.AIRTABLE_AI_BASE_ID || process.env.AIRTABLE_BASE_ID
  const tableId = process.env.AIRTABLE_IMAGE_TABLE_ID || 'tblKPuAESzyVMrK5M'
  const tableIdentifier = tableId
  
  if (!apiKey || !baseId) {
    throw new Error('Airtable configuration missing')
  }
  
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdentifier)}`
  
  // Log the prompt being sent to verify it's using the slot system
  console.log('Creating Airtable record with prompt:')
  console.log('  Prompt length:', prompt.length)
  console.log('  Prompt preview:', prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''))
  console.log('  Prompt format check - contains style/medium:', /\.\s*[A-Z]/.test(prompt))
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        'User ID': userId,
        'User Email': userEmail || '',
        'Created At': date, // YYYY-MM-DD format
        'Image Prompt': prompt,
      }
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Failed to create Airtable record: ${errorText}`)
  }
  
  console.log('✅ Airtable record created successfully')
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
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

    // Get user profile for timezone
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile.' },
        { status: 404 }
      )
    }
    
    const supabaseAdmin = await getSupabaseAdminClient()
    
    // Calculate today's date in user's timezone
    const userTimezone = profile.timezone || 'America/New_York'
    const todayDate = getTodayDateInTimezone(userTimezone)
    
    // Step 1: Check database for today's image/caption
    const { data: cachedHoroscope, error: cacheError } = await supabaseAdmin
      .from('horoscopes')
      .select('image_url, character_name, image_prompt, prompt_slots_json, date')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    if (cacheError) {
      console.error('Database error:', cacheError)
      return NextResponse.json(
        { error: 'Database error while checking cache: ' + cacheError.message },
        { status: 500 }
      )
    }
    
    // If no horoscope for today, try to get the most recent one as fallback
    let horoscopeToUse = cachedHoroscope
    if (!horoscopeToUse) {
      console.log(`[Avatar API] No horoscope found for today (${todayDate}), checking for most recent...`)
      const { data: recentHoroscope } = await supabaseAdmin
        .from('horoscopes')
        .select('image_url, character_name, image_prompt, prompt_slots_json, date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (recentHoroscope) {
        console.log(`[Avatar API] Using most recent horoscope from date: ${recentHoroscope.date}`)
        horoscopeToUse = recentHoroscope
      }
    }
    
    // If image exists in database (today or fallback), check if character_name is missing and try to get it from Airtable
    if (horoscopeToUse && horoscopeToUse.image_url) {
      console.log(`[Avatar API] Found cached horoscope in database (date: ${horoscopeToUse.date})`)
      console.log(`[Avatar API] Cached character_name:`, horoscopeToUse.character_name, 'Type:', typeof horoscopeToUse.character_name)
      
      // If character_name is missing, try to get it from Airtable
      // Handle case where character_name might be an object (should be string)
      let characterName: string | null = null
      const rawCharacterName = horoscopeToUse.character_name
      
      console.log(`[Avatar API] Raw character_name from DB:`, rawCharacterName, 'Type:', typeof rawCharacterName, 'Is null:', rawCharacterName === null, 'Is undefined:', rawCharacterName === undefined)
      
      if (rawCharacterName !== null && rawCharacterName !== undefined) {
        if (typeof rawCharacterName === 'string') {
          const trimmed = rawCharacterName.trim()
          characterName = trimmed.length > 0 ? trimmed : null
          console.log(`[Avatar API] Character name is string:`, characterName)
        } else if (typeof rawCharacterName === 'object') {
          // If it's an object, it's invalid - set to null and fetch from Airtable
          console.log(`[Avatar API] Character name is object (invalid), will fetch from Airtable`)
          characterName = null
        } else {
          // Try to convert to string if it's a number or other type
          try {
            const str = String(rawCharacterName)
            characterName = str.trim() || null
            console.log(`[Avatar API] Converted character name to string:`, characterName)
          } catch {
            characterName = null
          }
        }
      }
      
      if (!characterName) {
        // Use the date from the horoscope we're actually using, not necessarily today
        const dateToCheck = horoscopeToUse?.date || todayDate
        console.log(`[Avatar API] Character name missing from cache, checking Airtable for date: ${dateToCheck}...`)
        try {
          const airtableResult = await checkAirtableForImage(userId, dateToCheck, userTimezone)
          console.log(`[Avatar API] Airtable result:`, airtableResult)
          console.log(`[Avatar API] Airtable result type:`, airtableResult ? (airtableResult.hasOwnProperty('imageUrl') ? 'has imageUrl' : 'generating or null') : 'null')
          
          if (airtableResult && 'imageUrl' in airtableResult) {
            console.log(`[Avatar API] Airtable caption value:`, airtableResult.caption, 'Type:', typeof airtableResult.caption)
            if (airtableResult.caption && typeof airtableResult.caption === 'string' && airtableResult.caption.trim()) {
              characterName = airtableResult.caption.trim()
              console.log(`[Avatar API] Found character_name in Airtable:`, characterName)
              // Update database with character_name (don't await - do it in background)
              Promise.resolve(supabaseAdmin
                .from('horoscopes')
                .update({ character_name: characterName })
                .eq('user_id', userId)
                .eq('date', dateToCheck))
                .then(() => console.log(`[Avatar API] Updated database with character_name`))
                .catch((err: any) => console.error(`[Avatar API] Error updating character_name:`, err))
            } else {
              console.log(`[Avatar API] Airtable caption is empty or invalid:`, airtableResult.caption)
            }
          } else {
            console.log(`[Avatar API] No Airtable result or image not found`)
          }
        } catch (airtableError: any) {
          console.error(`[Avatar API] Error checking Airtable for character_name:`, airtableError)
          // Don't fail the request if Airtable check fails
        }
      }
      
      const slots = horoscopeToUse.prompt_slots_json || {}
      
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
      
      // Ensure character_name is always a string or null, never an object
      const safeCharacterName = characterName && typeof characterName === 'string' && characterName.trim() && characterName !== '[object Object]'
        ? characterName.trim()
        : null
      
      console.log(`[Avatar API] Returning cached response with character_name:`, safeCharacterName, 'Type:', typeof safeCharacterName)
      
      return NextResponse.json({
        image_url: horoscopeToUse.image_url,
        image_prompt: horoscopeToUse.image_prompt || null,
        prompt_slots: slots,
        prompt_slots_labels: Object.keys(slotLabels).length > 0 ? slotLabels : null,
        prompt_slots_reasoning: slots?.reasoning || null,
        character_name: safeCharacterName,
        cached: true,
        date: horoscopeToUse.date,
      })
    }
    
    // Step 2: Check Airtable for today's image/caption
    const airtableResult = await checkAirtableForImage(userId, todayDate, userTimezone)
    
    if (airtableResult && 'generating' in airtableResult) {
      // Record exists in Airtable but image not ready yet
      const slots = horoscopeToUse?.prompt_slots_json || {}
        return NextResponse.json({
          image_url: null,
          image_prompt: horoscopeToUse?.image_prompt || null,
          prompt_slots: slots,
          prompt_slots_labels: null,
          prompt_slots_reasoning: slots?.reasoning || null,
          character_name: null,
          generating: true,
          message: 'Image is being generated. Please check again in a few moments.',
        })
    }
    
    if (airtableResult && 'imageUrl' in airtableResult) {
      // Image found in Airtable - download and upload to Supabase
      try {
        const isAirtableUrl = !airtableResult.imageUrl.includes('supabase.co')
        let supabaseImageUrl = airtableResult.imageUrl
        
        if (isAirtableUrl) {
          supabaseImageUrl = await downloadAndUploadImage(airtableResult.imageUrl, userId, todayDate, supabaseAdmin)
        }
        
        // Save to database
        const characterNameToSave = airtableResult.caption && airtableResult.caption.trim()
          ? airtableResult.caption.trim()
          : null
        
        console.log(`[Avatar API] Saving character_name to database:`, characterNameToSave)
        
        await supabaseAdmin
      .from('horoscopes')
          .update({
            image_url: supabaseImageUrl,
            character_name: characterNameToSave
          })
      .eq('user_id', userId)
          .eq('date', todayDate)
        
        // Return image/caption
        const slots = horoscopeToUse?.prompt_slots_json || {}
        const characterName = airtableResult.caption && typeof airtableResult.caption === 'string' && airtableResult.caption.trim() 
          ? airtableResult.caption.trim() 
          : null
        
        // Ensure character_name is always a string or null, never an object
        const safeCharacterName = characterName && typeof characterName === 'string' && characterName !== '[object Object]'
          ? characterName
          : null
        
        console.log(`[Avatar API] Returning character_name from Airtable:`, safeCharacterName, 'Type:', typeof safeCharacterName)
        
        return NextResponse.json({
          image_url: supabaseImageUrl,
          image_prompt: horoscopeToUse?.image_prompt || null,
          prompt_slots: slots,
          prompt_slots_labels: null,
          prompt_slots_reasoning: slots?.reasoning || null,
          character_name: safeCharacterName,
          cached: true,
        })
      } catch (error: any) {
        console.error('Error downloading/uploading image:', error)
        // Continue to create new record if download fails
      }
    }
    
    // Step 3: Create new Airtable record if nothing found
    if (!horoscopeToUse || !horoscopeToUse.image_prompt) {
      return NextResponse.json(
        { 
          error: 'Horoscope not found. Please generate horoscope first by calling /api/horoscope endpoint.',
          details: 'Horoscope generation is required before image can be generated.'
        },
        { status: 404 }
      )
    }
    
    try {
      await createAirtableRecord(
            horoscopeToUse.image_prompt,
            userId,
        userEmail || '',
        todayDate,
        userTimezone
      )
      
      // Return generating status
      const slots = horoscopeToUse.prompt_slots_json || {}
      return NextResponse.json({
        image_url: null,
        image_prompt: horoscopeToUse.image_prompt,
        prompt_slots: slots,
        prompt_slots_labels: null,
        prompt_slots_reasoning: slots?.reasoning || null,
        character_name: null,
        generating: true,
        message: 'Image generation started. Please check again in a few moments.',
      })
    } catch (error: any) {
      console.error('Error creating Airtable record:', error)
      return NextResponse.json(
        { 
          error: 'Failed to start image generation: ' + (error.message || 'Unknown error')
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in avatar API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get horoscope avatar' },
      { status: 500 }
    )
  }
}
