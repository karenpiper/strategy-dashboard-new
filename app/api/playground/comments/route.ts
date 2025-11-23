import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch comments for a tool
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

    const { data: comments, error: commentsError } = await supabase
      .from('playground_tool_comments')
      .select(`
        *,
        user:profiles!playground_tool_comments_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('tool_id', toolId)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    return NextResponse.json({ data: comments || [] })
  } catch (error: any) {
    console.error('Error in GET /api/playground/comments:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { tool_id, comment } = body

    if (!tool_id || !comment) {
      return NextResponse.json({ error: 'Tool ID and comment are required' }, { status: 400 })
    }

    const { data: newComment, error: insertError } = await supabase
      .from('playground_tool_comments')
      .insert({
        tool_id,
        user_id: user.id,
        comment: comment.trim()
      })
      .select(`
        *,
        user:profiles!playground_tool_comments_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating comment:', insertError)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    return NextResponse.json({ data: newComment }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/playground/comments:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a comment
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
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 })
    }

    // Check if user owns the comment
    const { data: existingComment, error: fetchError } = await supabase
      .from('playground_tool_comments')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('playground_tool_comments')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Comment deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/playground/comments:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

