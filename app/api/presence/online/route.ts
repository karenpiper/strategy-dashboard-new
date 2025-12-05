import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/presence/online
 * Returns list of users who are currently online (last_seen within last 10 minutes)
 * Ultra-minimal database usage: only updates on navigation, polls every 5 minutes
 */
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

    // Get users who were active in the last 10 minutes
    // Longer window to account for 5-minute polling intervals
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    // Use admin client to bypass RLS for this query
    // We're only exposing public profile fields (name, avatar, email, role)
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey)

    const { data: onlineUsers, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url, email, role, last_seen')
      .gte('last_seen', tenMinutesAgo)
      .order('last_seen', { ascending: false })
      .limit(50) // Limit to 50 most recent

    if (fetchError) {
      console.error('Error fetching online users:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch online users' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      users: onlineUsers || [],
      count: onlineUsers?.length || 0
    })
  } catch (error: any) {
    console.error('Error in online users API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

