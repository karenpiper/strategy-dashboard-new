import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Record a view for a tool
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { tool_id } = body

    if (!tool_id) {
      return NextResponse.json({ error: 'Tool ID is required' }, { status: 400 })
    }

    // Check if user already viewed this tool today
    const today = new Date().toISOString().split('T')[0]
    const { data: existingView } = await supabase
      .from('playground_tool_views')
      .select('id')
      .eq('tool_id', tool_id)
      .eq('user_id', user.id)
      .gte('viewed_at', `${today}T00:00:00.000Z`)
      .lt('viewed_at', `${today}T23:59:59.999Z`)
      .single()

    // Only record if not viewed today (to prevent spam)
    if (!existingView) {
      const { error: insertError } = await supabase
        .from('playground_tool_views')
        .insert({
          tool_id,
          user_id: user.id
        })

      if (insertError) {
        // If it's a unique constraint error, that's okay (already viewed today)
        if (insertError.code !== '23505') {
          console.error('Error recording view:', insertError)
          return NextResponse.json({ error: 'Failed to record view' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ message: 'View recorded' })
  } catch (error: any) {
    console.error('Error in POST /api/playground/views:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

