import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTodayDateUTC } from '@/lib/utils'

/**
 * Clear today's horoscope cache to force regeneration
 * This endpoint allows regenerating today's image (useful for testing or if image expired)
 */
export async function POST(request: NextRequest) {
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

    // Use admin client for database operations
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Calculate today's date using UTC (consistent across all timezones)
    const todayDate = getTodayDateUTC()
    const now = new Date()

    console.log(`Clearing horoscope cache for user ${userId}`)
    console.log('   Today (UTC):', todayDate)
    console.log('   Current UTC time:', now.toISOString())
    console.log('   Current local time:', now.toLocaleString())

    // Delete today's horoscope record
    const { error: deleteError } = await supabaseAdmin
      .from('horoscopes')
      .delete()
      .eq('user_id', userId)
      .eq('date', todayDate)

    if (deleteError) {
      console.error('Error clearing cache:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear cache: ' + deleteError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully cleared horoscope cache for user ${userId} on date ${todayDate}`)

    return NextResponse.json({
      success: true,
      message: 'Cache cleared. Next request will generate a new image.',
      date: todayDate
    })
  } catch (error: any) {
    console.error('Error in clear cache endpoint:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to clear cache' },
      { status: 500 }
    )
  }
}


