import { NextRequest, NextResponse } from 'next/server'

/**
 * Get Supabase admin client (same as horoscope route)
 */
async function getSupabaseAdminClient() {
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Webhook endpoint for Airtable to call when horoscope generation is complete
 * 
 * Airtable automation should call this endpoint with:
 * POST /api/airtable/horoscope-webhook
 * 
 * Body:
 * {
 *   recordId: "recXXXXXXXXXXXXXX",
 *   status: "Completed" | "Failed",
 *   horoscope?: string,
 *   dos?: string[],
 *   donts?: string[],
 *   imageUrl?: string,
 *   characterName?: string,
 *   errorMessage?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordId, status, horoscope, dos, donts, imageUrl, characterName, errorMessage } = body

    console.log('📥 Airtable webhook received:', {
      recordId,
      status,
      hasHoroscope: !!horoscope,
      hasImageUrl: !!imageUrl,
    })

    if (!recordId) {
      return NextResponse.json(
        { error: 'recordId is required' },
        { status: 400 }
      )
    }

    if (status === 'Failed') {
      console.error('❌ Airtable generation failed:', errorMessage)
      return NextResponse.json({
        success: true,
        message: 'Error recorded',
        error: errorMessage
      })
    }

    if (status !== 'Completed') {
      return NextResponse.json({
        success: true,
        message: 'Status update received',
        status
      })
    }

    // Validate required fields
    if (!horoscope || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: horoscope and imageUrl are required when status is Completed' },
        { status: 400 }
      )
    }

    // Get the record from Airtable to find user_id and date
    const airtableApiKey = process.env.AIRTABLE_API_KEY
    const airtableBaseId = process.env.AIRTABLE_AI_BASE_ID || process.env.AIRTABLE_BASE_ID
    const airtableTableName = process.env.AIRTABLE_AI_TABLE_NAME || 'Horoscope Generation'

    if (!airtableApiKey || !airtableBaseId) {
      return NextResponse.json(
        { error: 'Airtable configuration missing' },
        { status: 500 }
      )
    }

    // Fetch the record to get user_id and date
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}/${recordId}`
    const airtableResponse = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
      }
    })

    if (!airtableResponse.ok) {
      throw new Error(`Failed to fetch Airtable record: ${airtableResponse.statusText}`)
    }

    const airtableData = await airtableResponse.json()
    const fields = airtableData.fields
    const userId = fields['User ID']
    const date = fields['Date']

    if (!userId || !date) {
      return NextResponse.json(
        { error: 'Airtable record missing User ID or Date' },
        { status: 400 }
      )
    }

    // Store in Supabase
    const supabaseAdmin = await getSupabaseAdminClient()
    
    // Get star sign from Airtable record
    const starSign = fields['Star Sign'] || 'Unknown'
    
    // Parse dos/donts if they're JSON strings
    let dosArray = dos || []
    let dontsArray = donts || []
    
    if (typeof dos === 'string') {
      try {
        dosArray = JSON.parse(dos)
      } catch (e) {
        dosArray = dos.split(',').map(s => s.trim())
      }
    }
    
    if (typeof donts === 'string') {
      try {
        dontsArray = JSON.parse(donts)
      } catch (e) {
        dontsArray = donts.split(',').map(s => s.trim())
      }
    }

    // Upsert horoscope record
    const { error: upsertError } = await supabaseAdmin
      .from('horoscopes')
      .upsert({
        user_id: userId,
        date: date,
        star_sign: starSign,
        horoscope_text: horoscope,
        horoscope_dos: dosArray,
        horoscope_donts: dontsArray,
        image_url: imageUrl,
        image_prompt: fields['Image Prompt'] || null,
        character_type: characterName ? 'human' : null,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date'
      })

    if (upsertError) {
      console.error('Error storing horoscope in Supabase:', upsertError)
      return NextResponse.json(
        { error: 'Failed to store horoscope in database', details: upsertError.message },
        { status: 500 }
      )
    }

    console.log('✅ Horoscope stored in Supabase via webhook')

    return NextResponse.json({
      success: true,
      message: 'Horoscope stored successfully',
      userId,
      date
    })

  } catch (error: any) {
    console.error('❌ Error processing Airtable webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

