import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/presence/ping
 * Updates the user's last_seen timestamp to indicate they're online
 * Should be called periodically (every 30 seconds) while user is active
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Update last_seen timestamp
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString() // Also update updated_at
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating last_seen:', updateError)
      return NextResponse.json(
        { error: 'Failed to update presence' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in presence ping:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

