import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { eventType, eventName, pagePath, metadata } = body

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 })
    }

    // Insert analytics event
    const { error: insertError } = await supabase
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_type: eventType,
        event_name: eventName || null,
        page_path: pagePath || null,
        metadata: metadata || {}
      })

    if (insertError) {
      console.error('Error inserting analytics event:', insertError)
      return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in analytics track API:', error)
    return NextResponse.json({ error: error.message || 'Failed to track event' }, { status: 500 })
  }
}



