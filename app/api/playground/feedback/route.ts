import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch feedback for a tool
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const toolId = searchParams.get('tool_id')

    if (!toolId) {
      return NextResponse.json({ error: 'Tool ID is required' }, { status: 400 })
    }

    const { data: feedback, error: feedbackError } = await supabase
      .from('playground_tool_feedback')
      .select(`
        *,
        user:profiles!playground_tool_feedback_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('tool_id', toolId)
      .order('created_at', { ascending: false })

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    return NextResponse.json({ data: feedback || [] })
  } catch (error: any) {
    console.error('Error in GET /api/playground/feedback:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new feedback
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { tool_id, feedback_type, feedback_text } = body

    if (!tool_id || !feedback_type || !feedback_text) {
      return NextResponse.json({ error: 'Tool ID, feedback type, and feedback text are required' }, { status: 400 })
    }

    // Verify the tool exists and was made by a user
    const { data: tool, error: toolError } = await supabase
      .from('playground_tools')
      .select('made_by_user, submitted_by')
      .eq('id', tool_id)
      .single()

    if (toolError || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    if (!tool.made_by_user) {
      return NextResponse.json({ error: 'Feedback can only be submitted for tools made by users' }, { status: 400 })
    }

    const { data: newFeedback, error: insertError } = await supabase
      .from('playground_tool_feedback')
      .insert({
        tool_id,
        user_id: user.id,
        feedback_type,
        feedback_text: feedback_text.trim()
      })
      .select(`
        *,
        user:profiles!playground_tool_feedback_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating feedback:', insertError)
      return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 })
    }

    return NextResponse.json({ data: newFeedback }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/playground/feedback:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete feedback
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Feedback ID is required' }, { status: 400 })
    }

    // Check if user owns the feedback
    const { data: existingFeedback, error: fetchError } = await supabase
      .from('playground_tool_feedback')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingFeedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    if (existingFeedback.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own feedback' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('playground_tool_feedback')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting feedback:', deleteError)
      return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Feedback deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/playground/feedback:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

