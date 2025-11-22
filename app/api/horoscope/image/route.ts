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
    
    // Helper function to check if Azure blob URL is expired
    const isUrlExpired = (url: string): boolean => {
      try {
        const urlObj = new URL(url)
        const seParam = urlObj.searchParams.get('se') // Expiration time parameter
        if (seParam) {
          const expirationTime = new Date(seParam)
          const now = new Date()
          // Regenerate if URL expires within the next hour (buffer time)
          return expirationTime.getTime() < now.getTime() + 3600000
        }
      } catch (e) {
        // If we can't parse the URL, assume it's valid
      }
      return false
    }
    
    // Check if we need to regenerate:
    // 1. No cached image
    // 2. Image URL exists but prompt_slots_json is null (old system - needs migration to new system)
    // 3. Empty image URL
    // 4. Image URL is expired (Azure blob signed URLs expire)
    const urlExpired = cachedHoroscope?.image_url ? isUrlExpired(cachedHoroscope.image_url) : false
    const needsRegeneration = !cachedHoroscope?.image_url || 
                              cachedHoroscope.image_url.trim() === '' ||
                              !cachedHoroscope.prompt_slots_json ||
                              urlExpired
    
    if (cachedHoroscope && cachedHoroscope.image_url && cachedHoroscope.image_url.trim() !== '' && cachedHoroscope.prompt_slots_json && !urlExpired) {
      console.log('✅ Returning cached image for user', userId, 'on date', todayDate)
      return NextResponse.json({
        image_url: cachedHoroscope.image_url,
        image_prompt: cachedHoroscope.image_prompt || null,
        prompt_slots: cachedHoroscope.prompt_slots_json || null,
        cached: true,
      })
    }
    
    if (needsRegeneration) {
      console.log('Regenerating image - reason:', {
        noCache: !cachedHoroscope,
        noImage: !cachedHoroscope?.image_url || cachedHoroscope.image_url.trim() === '',
        oldSystem: !cachedHoroscope?.prompt_slots_json,
        urlExpired: urlExpired,
      })
    }
    
    // Generate new image (either no cache, old system, or expired URL)
    console.log('Generating new image for user', userId, 'on date', todayDate)
    
    // Generate new image with new slot-based prompt system
    const { imageUrl, prompt, slots } = await generateHoroscopeImage(
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
    const upsertData: any = {
      user_id: userId,
      star_sign: starSign,
      image_url: imageUrl,
      image_prompt: prompt,
      prompt_slots_json: slots, // Store selected slot IDs
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
    
    return NextResponse.json({
      image_url: imageUrl,
      image_prompt: prompt,
      prompt_slots: slots,
      cached: false,
    })
  } catch (error: any) {
    console.error('Error in horoscope image API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate horoscope image' },
      { status: 500 }
    )
  }
}

