import { NextRequest, NextResponse } from 'next/server'
import { fetchHoroscopeConfig } from '@/lib/horoscope-config'
import { createClient } from '@/lib/supabase/server'
import { getTodayDateUTC, getTodayDateInTimezone } from '@/lib/utils'
import { generateImageViaAirtable } from '@/lib/elvex-horoscope-service'

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
      .select('image_url, image_prompt, prompt_slots_json, character_name, date, generated_at')
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
    
    // CRITICAL: Check if image exists FIRST - if it does, return it immediately
    // This prevents regenerating images that already exist
    if (cachedHoroscope && cachedHoroscope.image_url && cachedHoroscope.image_url.trim() !== '' && isFromToday) {
      console.log('🚀 ========== AVATAR ENDPOINT: FOUND CACHED IMAGE ==========')
      console.log('✅ Found existing image in database for today - returning it')
      console.log('   Image URL:', cachedHoroscope.image_url.substring(0, 100) + '...')
      console.log('   Date:', cachedHoroscope.date)
      console.log('   Generated at:', cachedHoroscope.generated_at)
      console.log('   Has prompt slots:', !!cachedHoroscope.prompt_slots_json)
      console.log('   Character name in DB:', cachedHoroscope.character_name || 'null/empty')
      console.log('   Character name type:', typeof cachedHoroscope.character_name)
      console.log('   ⚠️ NOT regenerating - image already exists for today')
      
      // Clean character_name if it's a JSON stringified object (one-time cleanup)
      let characterName = cachedHoroscope.character_name
      if (characterName && typeof characterName === 'string' && (characterName.startsWith('{') || characterName.startsWith('['))) {
        try {
          const parsed = JSON.parse(characterName)
          if (parsed && typeof parsed === 'object' && 'value' in parsed && typeof parsed.value === 'string' && parsed.value.length > 0) {
            characterName = parsed.value
            // Update database with cleaned value (one-time cleanup)
            await supabaseAdmin
              .from('horoscopes')
              .update({ character_name: characterName })
              .eq('user_id', userId)
              .eq('date', todayDate)
            console.log('   ✅ Cleaned JSON stringified character name:', characterName)
          } else {
            // Invalid format, clear it
            characterName = null
            await supabaseAdmin
              .from('horoscopes')
              .update({ character_name: null })
              .eq('user_id', userId)
              .eq('date', todayDate)
          }
        } catch (e) {
          // Not valid JSON, might be a regular string starting with {, keep as-is
        }
      }
      
      // If character_name is missing, check Airtable for it (read-only, don't create new records)
      if (!characterName && cachedHoroscope.image_prompt) {
        console.log('🔍 ========== CHECKING AIRTABLE FOR CHARACTER NAME ==========')
        console.log('   ⚠️ Character name missing in database - checking Airtable (read-only)...')
        console.log('   User ID:', userId)
        console.log('   Image prompt exists:', !!cachedHoroscope.image_prompt)
        try {
          // Read-only Airtable query - use same table identifier as generateImageViaAirtable
          // This ensures we use the same table ID/name that successfully finds images
          const apiKey = process.env.AIRTABLE_API_KEY
          const baseId = process.env.AIRTABLE_IMAGE_BASE_ID || process.env.AIRTABLE_AI_BASE_ID || process.env.AIRTABLE_BASE_ID
          const tableId = process.env.AIRTABLE_IMAGE_TABLE_ID || 'tblKPuAESzyVMrK5M'
          const tableName = process.env.AIRTABLE_IMAGE_TABLE_NAME || 'Image Generation'
          // Use table ID (same as generateImageViaAirtable) - more reliable than table name
          const tableIdentifier = tableId
          
          if (!apiKey || !baseId) {
            console.log('   ⚠️ Airtable credentials not configured - skipping character name check')
          } else {
            const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdentifier)}`
            
            // Get today's date in user's timezone (same format as generateImageViaAirtable)
            const userTimezone = profile.timezone || 'America/New_York'
            let createdAt: string
            if (userTimezone) {
              const dateTimeStr = getTodayDateInTimezone(userTimezone, now)
              createdAt = dateTimeStr.split('T')[0] // Extract YYYY-MM-DD
            } else {
              const nowUtc = new Date()
              createdAt = `${nowUtc.getUTCFullYear()}-${String(nowUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(nowUtc.getUTCDate()).padStart(2, '0')}`
            }
            
            console.log('   🔍 Airtable query parameters (read-only):', {
              userId,
              userTimezone,
              createdAt,
              baseId,
              tableId,
              tableIdentifier
            })
            
            // Query by User ID AND date to get only today's caption
            // Use same date format as generateImageViaAirtable uses
            const filterFormula = `AND({User ID} = "${userId}", {Created At} = "${createdAt}")`
            const queryUrl = `${url}?filterByFormula=${encodeURIComponent(filterFormula)}`
            
            console.log('   🔍 Querying Airtable (read-only) for today\'s caption:', {
              userId,
              createdAt,
              filterFormula,
              queryUrl: queryUrl.substring(0, 200) + '...'
            })
            
            const queryResponse = await fetch(queryUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            })
            
            if (queryResponse.ok) {
              const queryData = await queryResponse.json()
              console.log('   📋 Airtable query response:', {
                recordCount: queryData.records?.length || 0,
                hasRecords: !!(queryData.records && queryData.records.length > 0)
              })
              
              if (queryData.records && queryData.records.length > 0) {
                // Filter records to only those matching today's date
                // The query should already filter by date, but verify to be safe
                const todayRecords = queryData.records.filter((record: any) => {
                  const recordDate = record.fields?.['Created At']
                  if (!recordDate) return false
                  // Extract date part (YYYY-MM-DD) from Created At field
                  const recordDateStr = typeof recordDate === 'string' 
                    ? recordDate.split('T')[0] 
                    : String(recordDate).split('T')[0]
                  return recordDateStr === createdAt
                })
                
                console.log('   📅 Filtered to today\'s records:', {
                  totalRecords: queryData.records.length,
                  todayRecords: todayRecords.length,
                  expectedDate: createdAt
                })
                
                // Check today's records for caption (prioritize Caption field)
                for (const record of todayRecords) {
                  const captionField = record.fields?.['Caption']
                  const characterNameField = record.fields?.['Character Name']
                  const foundCaption = captionField || characterNameField
                  
                  console.log('   🔍 Checking today\'s record:', {
                    id: record.id,
                    createdAt: record.fields?.['Created At'],
                    hasCaption: !!captionField,
                    hasCharacterName: !!characterNameField,
                    captionValue: captionField,
                    allFields: Object.keys(record.fields || {})
                  })
                  
                  if (foundCaption && typeof foundCaption === 'string' && foundCaption.length > 0) {
                    console.log('   ✅ Found character name in Airtable (from Caption field) for today:', foundCaption)
                    characterName = foundCaption
                    // Update database with character name
                    const { error: updateError, data: updateData } = await supabaseAdmin
                      .from('horoscopes')
                      .update({ character_name: characterName })
                      .eq('user_id', userId)
                      .eq('date', todayDate)
                      .select('character_name')
                    
                    if (updateError) {
                      console.error('   ❌ Error updating database with character name:', updateError)
                    } else {
                      console.log('   ✅ Updated database with character_name from Airtable:', characterName)
                      console.log('   📊 Database update result:', updateData)
                    }
                    break // Found it, stop looking
                  }
                }
                
                if (!characterName) {
                  if (todayRecords.length === 0) {
                    console.log('   ⚠️ No Airtable records found for today\'s date')
                  } else {
                    console.log('   ⚠️ Today\'s records found but no character name in any of them')
                  }
                }
              } else {
                console.log('   ⚠️ No Airtable records found for user')
              }
            } else {
              const errorText = await queryResponse.text().catch(() => 'Unknown error')
              console.log('   ⚠️ Airtable query failed:', queryResponse.status, errorText.substring(0, 200))
            }
          }
        } catch (error: any) {
          console.error('   ❌ Error checking Airtable for character name:', error.message)
          // Continue without character name - don't fail the request
        }
      }
      
      // OLD CODE BELOW - REMOVED
      /*
          if (!baseId || !apiKey) {
            console.log('   ⚠️ Airtable credentials not configured - skipping character name check')
          } else {
            const tableIdentifier = tableName.includes(' ') ? encodeURIComponent(tableName) : tableName
            const url = `https://api.airtable.com/v0/${baseId}/${tableIdentifier}`
            
            // Get today's date in user's timezone for query
            const userTimezone = profile.timezone || 'America/New_York'
            const todayDateForQuery = getTodayDateInTimezone(userTimezone, now)
            const createdAt = todayDateForQuery // Format: YYYY-MM-DD
            
            console.log('   🔍 Airtable query parameters:', {
              userId,
              userTimezone,
              todayDateForQuery,
              createdAt,
              baseId,
              tableName,
              tableIdentifier
            })
            
            // Query Airtable for existing records (read-only)
            // Try multiple date formats and also try without date filter
            const filterFormulas = [
              `AND({User ID} = "${userId}", {Created At} = "${createdAt}")`,
              `{User ID} = "${userId}"`, // Just by User ID, no date filter
            ]
            
            let queryData = null
            let foundRecords = false
            
            for (const filterFormula of filterFormulas) {
              const queryUrl = `${url}?filterByFormula=${encodeURIComponent(filterFormula)}`
              console.log('   🔍 Trying Airtable query:', {
                filterFormula,
                queryUrl: queryUrl.substring(0, 200) + '...'
              })
              
              const queryResponse = await fetch(queryUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
              })
              
              if (queryResponse.ok) {
                queryData = await queryResponse.json()
                console.log('   📋 Airtable query response:', {
                  recordCount: queryData.records?.length || 0,
                  hasRecords: !!(queryData.records && queryData.records.length > 0),
                  status: queryResponse.status,
                  filterFormula
                })
                
                if (queryData.records && queryData.records.length > 0) {
                  foundRecords = true
                  console.log('   ✅ Found records with filter:', filterFormula)
                  break
                }
              } else {
                const errorText = await queryResponse.text().catch(() => 'Unknown error')
                console.log('   ⚠️ Airtable query failed:', queryResponse.status, errorText.substring(0, 200))
              }
            }
            
            if (foundRecords && queryData && queryData.records && queryData.records.length > 0) {
                // Check all records for character name (in case first one doesn't have it)
                // Priority: "Caption" field first (this is where Airtable stores it), then "Character Name"
                for (const record of queryData.records) {
                  const captionField = record.fields?.['Caption']
                  const characterNameField = record.fields?.['Character Name']
                  const foundCaption = captionField || characterNameField
                  
                  console.log('   🔍 Checking record:', {
                    id: record.id,
                    hasCaption: !!captionField,
                    hasCharacterName: !!characterNameField,
                    captionValue: captionField,
                    captionType: typeof captionField,
                    captionLength: typeof captionField === 'string' ? captionField.length : 0,
                    characterNameValue: characterNameField,
                    allFields: Object.keys(record.fields || {})
                  })
                  
                  if (foundCaption && typeof foundCaption === 'string' && foundCaption.length > 0) {
                    console.log('   ✅ Found character name in Airtable (from Caption field):', foundCaption)
                    characterName = foundCaption
                    // Update database with character name
                    const { error: updateError, data: updateData } = await supabaseAdmin
                      .from('horoscopes')
                      .update({ character_name: characterName })
                      .eq('user_id', userId)
                      .eq('date', todayDate)
                      .select('character_name')
                    
                    if (updateError) {
                      console.error('   ❌ Error updating database with character name:', updateError)
                    } else {
                      console.log('   ✅ Updated database with character_name from Airtable Caption field:', characterName)
                      console.log('   📊 Database update result:', updateData)
                    }
                    break // Found it, stop looking
                  } else {
                    console.log('   ⚠️ Record found but no valid caption:', {
                      foundCaption,
                      isString: typeof foundCaption === 'string',
                      length: typeof foundCaption === 'string' ? foundCaption.length : 'N/A'
                    })
                  }
                }
                
                if (!characterName) {
                  console.log('   ⚠️ No character name found in any Airtable record after checking all records')
                }
      */
      
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
      const cachedReasoning = slots?.reasoning || null
      
      // Return the existing image immediately - don't regenerate
      console.log('   📤 Returning cached image')
      console.log('      character_name value:', characterName)
      console.log('      character_name type:', typeof characterName)
      console.log('      character_name will be sent as:', characterName || null)
      const responseData = {
        image_url: cachedHoroscope.image_url,
        image_prompt: cachedHoroscope.image_prompt || null,
        prompt_slots: cachedHoroscope.prompt_slots_json || null,
        prompt_slots_labels: Object.keys(slotLabels).length > 0 ? slotLabels : null,
        prompt_slots_reasoning: cachedReasoning,
        character_name: characterName || null,
        cached: true,
      }
      console.log('   📤 Full response data character_name:', responseData.character_name)
      return NextResponse.json(responseData)
    }
    
    // CRITICAL SAFETY CHECK: DISABLED for debugging
    // This prevents race conditions if multiple requests come in simultaneously
    // TODO: Re-enable safety check once n8n workflow is stable and race conditions are resolved
    // if (doubleCheckHoroscope && doubleCheckHoroscope.image_url && doubleCheckHoroscope.image_url.trim() !== '') {
    //   ... (safety check code commented out)
    // }
    
    console.log('🔄 SAFETY CHECK DISABLED - Will return latest from database (debugging mode)')
    
    // Double-check database to get the absolute latest (in case it was just updated)
    // CRITICAL: Also check isFromToday here to prevent returning old images
    const { data: doubleCheckHoroscope } = await supabaseAdmin
      .from('horoscopes')
      .select('image_url, image_prompt, prompt_slots_json, character_name, date, generated_at')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()
    
    // Check if double-check found an image AND verify it's from today
    let doubleCheckIsFromToday = false
    if (doubleCheckHoroscope?.generated_at) {
      const doubleCheckGeneratedAt = new Date(doubleCheckHoroscope.generated_at)
      const doubleCheckGeneratedAtInUserTz = getTodayDateInTimezone(userTimezone, doubleCheckGeneratedAt)
      doubleCheckIsFromToday = doubleCheckGeneratedAtInUserTz === todayDate
      
      const hoursAgo = (now.getTime() - doubleCheckGeneratedAt.getTime()) / (1000 * 60 * 60)
      if (hoursAgo > 24) {
        doubleCheckIsFromToday = false
      }
    }
    
    if (doubleCheckHoroscope && doubleCheckHoroscope.image_url && doubleCheckHoroscope.image_url.trim() !== '' && doubleCheckIsFromToday) {
      console.log('✅ Found image in database (from double-check) - returning it')
      console.log('   Image URL:', doubleCheckHoroscope.image_url.substring(0, 100) + '...')
      console.log('   Generated at:', doubleCheckHoroscope.generated_at)
      console.log('   Date:', doubleCheckHoroscope.date)
      console.log('   Is from today:', doubleCheckIsFromToday)
      console.log('   ⚠️ NOT regenerating - image already exists for today')
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
        character_name: doubleCheckHoroscope.character_name || null,
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
    
    // CRITICAL: If we reach here, we have a horoscope but no image OR image is from different day
    // Check if image exists but is from different day - don't regenerate, just return error
    if (cachedHoroscope.image_url && cachedHoroscope.image_url.trim() !== '' && !isFromToday) {
      console.log('⚠️ Image found but was generated on a different day')
      console.log('   Cached date:', cachedHoroscope.date)
      console.log('   Generated at:', cachedHoroscope.generated_at)
      console.log('   Today (user timezone):', todayDate)
      console.log('   Is from today:', isFromToday)
      console.log('   ⚠️ NOT regenerating - returning error instead')
      return NextResponse.json(
        { 
          error: 'Image needs regeneration. Please generate horoscope first by calling /api/horoscope endpoint.',
          details: 'Image was generated on a different day and needs to be regenerated.'
        },
        { status: 404 }
      )
    }
    
    // CRITICAL: Image generation is now handled by the main horoscope endpoint
    // But this endpoint can check Airtable for existing images that were generated
    // This allows the frontend to poll this endpoint to check if an image is ready
    if ((!cachedHoroscope.image_url || cachedHoroscope.image_url.trim() === '') && isFromToday) {
      console.log('⚠️ Horoscope exists but image_url is null or empty')
      console.log('   Horoscope date:', cachedHoroscope.date)
      console.log('   Has text:', !!cachedHoroscope.horoscope_text)
      console.log('   Has image prompt:', !!cachedHoroscope.image_prompt)
      
      // Check Airtable for existing images that might have been generated
      if (cachedHoroscope.image_prompt && cachedHoroscope.image_prompt.trim() !== '') {
        console.log('🔍 Checking Airtable for existing images...')
        try {
          const { generateImageViaAirtable } = await import('@/lib/elvex-horoscope-service')
          const airtableImageResult = await generateImageViaAirtable(
            cachedHoroscope.image_prompt,
            profile.timezone || undefined,
            userId,
            userEmail
          )
          
          if (airtableImageResult.imageUrl) {
            console.log('✅ Found existing image in Airtable!')
            console.log('   Airtable image URL:', airtableImageResult.imageUrl.substring(0, 100) + '...')
            
            // Check if it's an Airtable URL (needs to be uploaded to Supabase)
            const isAirtableUrl = !airtableImageResult.imageUrl.includes('supabase.co')
            
            if (isAirtableUrl) {
              // Download and upload to Supabase
              console.log('📥 Downloading image from Airtable and uploading to Supabase...')
              const imageResponse = await fetch(airtableImageResult.imageUrl)
              if (imageResponse.ok) {
                const imageBlob = await imageResponse.blob()
                const imageBuffer = Buffer.from(await imageBlob.arrayBuffer())
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                const fileName = `horoscope-${userId}-${todayDate}-${timestamp}.png`
                const filePath = `${userId}/${fileName}`
                const bucketName = 'horoscope-avatars'
                
                const { error: uploadError } = await supabaseAdmin.storage
                  .from(bucketName)
                  .upload(filePath, imageBuffer, {
                    contentType: 'image/png',
                    upsert: false,
                  })
                
                if (!uploadError) {
                  const { data: urlData } = supabaseAdmin.storage
                    .from(bucketName)
                    .getPublicUrl(filePath)
                  
                  // Update the database
                  await supabaseAdmin
                    .from('horoscopes')
                    .update({ 
                      image_url: urlData.publicUrl,
                      character_name: airtableImageResult.caption || null
                    })
                    .eq('user_id', userId)
                    .eq('date', todayDate)
                  
                  console.log('✅ Uploaded image to Supabase and updated database')
                  
                  // Return the Supabase URL
                  const slots = cachedHoroscope.prompt_slots_json || {}
                  return NextResponse.json({
                    image_url: urlData.publicUrl,
                    image_prompt: cachedHoroscope.image_prompt,
                    prompt_slots: slots,
                    prompt_slots_labels: null,
                    prompt_slots_reasoning: slots?.reasoning || null,
                    character_name: airtableImageResult.caption || null,
                    cached: true,
                  })
                }
              }
            } else {
              // Already in Supabase, just return it
              const slots = cachedHoroscope.prompt_slots_json || {}
              return NextResponse.json({
                image_url: airtableImageResult.imageUrl,
                image_prompt: cachedHoroscope.image_prompt,
                prompt_slots: slots,
                prompt_slots_labels: null,
                prompt_slots_reasoning: slots?.reasoning || null,
                character_name: airtableImageResult.caption || null,
                cached: true,
              })
            }
          } else {
            console.log('⚠️ No image found in Airtable yet - will generate new image')
            
            // Generate new image via Airtable (this is the avatar endpoint's responsibility)
            console.log('🚀 ========== GENERATING NEW IMAGE VIA AIRTABLE ==========')
            console.log('   Image prompt length:', cachedHoroscope.image_prompt.length)
            console.log('   User ID:', userId)
            console.log('   User email:', userEmail || 'not available')
            console.log('   ⚠️ NOTE: Image generation happens in background - returning immediately')
            
            // Start image generation in background (don't await - return immediately)
            // The frontend will poll this endpoint to check for the image
            generateImageViaAirtable(
              cachedHoroscope.image_prompt,
              profile.timezone || undefined,
              userId,
              userEmail
            )
            .then(async (imageResult) => {
              if (imageResult.imageUrl) {
                console.log('✅ Background image generation completed successfully')
                console.log('   Airtable image URL:', imageResult.imageUrl.substring(0, 100) + '...')
                console.log('   Caption:', imageResult.caption || 'none')
                
                // Check if image is already in Supabase storage
                const isAirtableUrl = !imageResult.imageUrl.includes('supabase.co')
                
                if (isAirtableUrl) {
                  // Download and upload to Supabase storage
                  try {
                    console.log('📥 Downloading image from Airtable and uploading to Supabase storage...')
                    const imageResponse = await fetch(imageResult.imageUrl)
                    if (imageResponse.ok) {
                      const imageBlob = await imageResponse.blob()
                      const imageBuffer = Buffer.from(await imageBlob.arrayBuffer())
                      
                      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                      const fileName = `horoscope-${userId}-${todayDate}-${timestamp}.png`
                      const filePath = `${userId}/${fileName}`
                      const bucketName = 'horoscope-avatars'
                      
                      const { error: uploadError } = await supabaseAdmin.storage
                        .from(bucketName)
                        .upload(filePath, imageBuffer, {
                          contentType: 'image/png',
                          upsert: false,
                        })
                      
                      if (!uploadError) {
                        const { data: urlData } = supabaseAdmin.storage
                          .from(bucketName)
                          .getPublicUrl(filePath)
                        
                        // Update the database with the Supabase URL
                        await supabaseAdmin
                          .from('horoscopes')
                          .update({ 
                            image_url: urlData.publicUrl,
                            character_name: imageResult.caption || null
                          })
                          .eq('user_id', userId)
                          .eq('date', todayDate)
                        
                        console.log('✅ Background image uploaded to Supabase and database updated')
                      } else {
                        console.error('❌ Failed to upload image to Supabase:', uploadError)
                      }
                    }
                  } catch (uploadError: any) {
                    console.error('❌ Error uploading image to Supabase:', uploadError)
                  }
                } else {
                  // Already in Supabase, just update database
                  await supabaseAdmin
                    .from('horoscopes')
                    .update({ 
                      image_url: imageResult.imageUrl,
                      character_name: imageResult.caption || null
                    })
                    .eq('user_id', userId)
                    .eq('date', todayDate)
                  
                  console.log('✅ Background image URL saved to database')
                }
              }
            })
            .catch((imageError: any) => {
              console.error('❌ Background image generation failed:', imageError)
              console.error('   Error message:', imageError.message)
              // Don't throw - this is background, frontend can poll for image
            })
          }
        } catch (airtableCheckError: any) {
          console.warn('⚠️ Could not check/generate image in Airtable:', airtableCheckError.message)
        }
      }
      
      // No image found/generated yet - return generating status so frontend can poll again
      const slots = cachedHoroscope.prompt_slots_json || {}
      return NextResponse.json({
        image_url: null,
        image_prompt: cachedHoroscope.image_prompt,
        prompt_slots: slots,
        prompt_slots_labels: null,
        prompt_slots_reasoning: slots?.reasoning || null,
        character_name: cachedHoroscope.character_name || null,
        generating: true, // Indicates image is being generated in Airtable
        message: 'Image is being generated in Airtable. Please check again in a few moments.',
      })
    }
    
    // OLD CODE - DISABLED: Image generation moved to main horoscope endpoint
    // This prevents duplicate image generation
    /*
    if ((!cachedHoroscope.image_url || cachedHoroscope.image_url.trim() === '') && isFromToday) {
      console.log('⚠️ Horoscope exists but image_url is null or empty')
      console.log('   Horoscope date:', cachedHoroscope.date)
      console.log('   Has text:', !!cachedHoroscope.horoscope_text)
      console.log('   Has image prompt:', !!cachedHoroscope.image_prompt)
      console.log('   Image prompt length:', cachedHoroscope.image_prompt?.length || 0)
      
      // IMPORTANT: generateImageViaAirtable now checks for existing records first
      // It will use an existing completed image if found, or create a new record if needed
      // Try to generate image via Airtable if we have a prompt
      // IMPORTANT: This is completely independent from horoscope text generation
      // We return immediately and generate in the background to avoid blocking
      if (cachedHoroscope.image_prompt && cachedHoroscope.image_prompt.trim() !== '') {
        console.log('🚀 ========== STARTING BACKGROUND IMAGE GENERATION VIA AIRTABLE ==========')
        console.log('   Prompt:', cachedHoroscope.image_prompt.substring(0, 200) + '...')
        console.log('   Timezone:', profile.timezone || 'UTC')
        console.log('   ⚠️ NOTE: Image generation happens in background - returning immediately')
        
        // Start image generation in background (don't await - return immediately)
        // User is authenticated via Supabase OAuth, so userId and userEmail come from Supabase auth
        generateImageViaAirtable(cachedHoroscope.image_prompt, profile.timezone || undefined, userId, userEmail)
          .then(async (imageResult) => {
            if (imageResult.imageUrl) {
              console.log('✅ Background image generation completed successfully')
              console.log('   Airtable image URL:', imageResult.imageUrl.substring(0, 100) + '...')
              console.log('   Caption:', imageResult.caption || 'none')
              
              // First, save Airtable URL immediately so user can see the image
              const initialUpdateData: any = { 
                image_url: imageResult.imageUrl // Use Airtable URL first for immediate display
              }
              
              // Save caption to character_name field immediately
              if (imageResult.caption) {
                initialUpdateData.character_name = imageResult.caption
                console.log('   Saving caption to character_name field immediately')
              }
              
              const { error: initialUpdateError } = await supabaseAdmin
                .from('horoscopes')
                .update(initialUpdateData)
                .eq('user_id', userId)
                .eq('date', todayDate)
              
              if (initialUpdateError) {
                console.error('❌ Failed to save initial image URL:', initialUpdateError)
              } else {
                console.log('✅ Saved Airtable URL immediately - user can see image now')
              }
              
              // Then upload to Supabase storage in background (non-blocking)
              // This happens after the user already sees the image
              (async () => {
                try {
                  console.log('📥 Starting background upload to Supabase storage...')
                  
                  // Download the image from Airtable
                  const imageResponse = await fetch(imageResult.imageUrl)
                  if (!imageResponse.ok) {
                    throw new Error(`Failed to download image from Airtable: ${imageResponse.statusText}`)
                  }
                  
                  const imageBlob = await imageResponse.blob()
                  const imageBuffer = Buffer.from(await imageBlob.arrayBuffer())
                  console.log('✅ Image downloaded for Supabase upload, size:', imageBuffer.length, 'bytes')
                  
                  // Upload to Supabase storage (horoscope-avatars bucket)
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                  const fileName = `horoscope-${userId}-${todayDate}-${timestamp}.png`
                  const filePath = `${userId}/${fileName}`
                  const bucketName = 'horoscope-avatars'
                  
                  console.log('📤 Uploading image to Supabase storage in background...')
                  
                  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                    .from(bucketName)
                    .upload(filePath, imageBuffer, {
                      contentType: 'image/png',
                      upsert: false,
                    })
                  
                  if (uploadError) {
                    console.error('❌ Failed to upload image to Supabase storage:', uploadError)
                    return // Don't update database if upload failed
                  }
                  
                  // Get the public URL for the uploaded image
                  const { data: urlData } = supabaseAdmin.storage
                    .from(bucketName)
                    .getPublicUrl(filePath)
                  
                  const supabaseImageUrl = urlData.publicUrl
                  console.log('✅ Image uploaded to Supabase storage in background')
                  console.log('   Supabase storage URL:', supabaseImageUrl)
                  
                  // Update the horoscope record with Supabase storage URL (replacing Airtable URL)
                  const { error: updateError } = await supabaseAdmin
                    .from('horoscopes')
                    .update({ image_url: supabaseImageUrl })
                    .eq('user_id', userId)
                    .eq('date', todayDate)
                  
                  if (updateError) {
                    console.error('❌ Failed to update with Supabase storage URL:', updateError)
                  } else {
                    console.log('✅ Updated database with Supabase storage URL (replaced Airtable URL)')
                    console.log('   Image now permanently stored in Supabase')
                  }
                } catch (storageError: any) {
                  console.error('❌ Background Supabase upload failed:', storageError)
                  // Don't throw - image is already visible from Airtable URL
                }
              })()
            }
          })
          .catch((imageError: any) => {
            console.error('❌ Background image generation failed:', imageError)
            console.error('   Error message:', imageError.message)
            // Don't throw - this is background, user can retry later
          })
        
        // Return immediately - image is generating in background
        // Frontend can poll this endpoint again to check if image is ready
        const slots = cachedHoroscope.prompt_slots_json || {}
        return NextResponse.json({
          image_url: null,
          image_prompt: cachedHoroscope.image_prompt,
          prompt_slots: slots,
          prompt_slots_labels: null,
          prompt_slots_reasoning: slots?.reasoning || null,
          generating: true, // Indicates image is being generated in background
          message: 'Image generation started in background. Please check again in a few moments.',
        })
      }
    }
    */
    
    // If we get here, we should have an image (or the code above returned early)
    // Continue with returning the existing image
    
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

