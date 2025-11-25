import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all historical horoscope avatars for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch all horoscopes for the user, ordered by generated_at descending to show all avatars
    const { data: horoscopes, error: fetchError } = await supabase
      .from('horoscopes')
      .select('id, image_url, date, star_sign, generated_at')
      .eq('user_id', user.id)
      .not('image_url', 'is', null)
      .order('generated_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching horoscope avatars:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch horoscope avatars', details: fetchError.message },
        { status: 500 }
      )
    }

    console.log(`Found ${horoscopes?.length || 0} horoscopes with image_url for user ${user.id}`)

    // Map all horoscopes with image_url to avatars
    const avatars = (horoscopes || [])
      .filter(h => h.image_url) // Double-check filter
      .map(h => ({
        id: h.id,
        url: h.image_url,
        date: h.date,
        star_sign: h.star_sign,
        generated_at: h.generated_at
      }))

    console.log(`Returning ${avatars.length} avatars`)

    return NextResponse.json({ data: avatars })
  } catch (error: any) {
    console.error('Error in horoscope avatars API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch horoscope avatars', details: error.toString() },
      { status: 500 }
    )
  }
}

