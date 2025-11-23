import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Like/unlike a tool
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

    // Check if user already liked the tool
    const { data: existingLike, error: fetchError } = await supabase
      .from('playground_tool_likes')
      .select('id')
      .eq('tool_id', tool_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking like:', fetchError)
      return NextResponse.json({ error: 'Failed to check like status' }, { status: 500 })
    }

    if (existingLike) {
      // Unlike: delete the like
      const { error: deleteError } = await supabase
        .from('playground_tool_likes')
        .delete()
        .eq('tool_id', tool_id)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Error unliking tool:', deleteError)
        return NextResponse.json({ error: 'Failed to unlike tool' }, { status: 500 })
      }

      return NextResponse.json({ liked: false, message: 'Tool unliked' })
    } else {
      // Like: insert the like
      const { error: insertError } = await supabase
        .from('playground_tool_likes')
        .insert({
          tool_id,
          user_id: user.id
        })

      if (insertError) {
        console.error('Error liking tool:', insertError)
        return NextResponse.json({ error: 'Failed to like tool' }, { status: 500 })
      }

      return NextResponse.json({ liked: true, message: 'Tool liked' })
    }
  } catch (error: any) {
    console.error('Error in POST /api/playground/likes:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

