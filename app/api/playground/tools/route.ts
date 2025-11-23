import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all playground tools with related data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch tools with submitter info
    const { data: tools, error: toolsError } = await supabase
      .from('playground_tools')
      .select(`
        *,
        submitter:profiles!playground_tools_submitted_by_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .order('date_submitted', { ascending: false })

    if (toolsError) {
      console.error('Error fetching tools:', toolsError)
      return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 })
    }

    // Fetch likes count and user's like status for each tool
    const toolIds = tools?.map(t => t.id) || []
    if (toolIds.length > 0) {
      const { data: likes, error: likesError } = await supabase
        .from('playground_tool_likes')
        .select('tool_id, user_id')
        .in('tool_id', toolIds)

      if (!likesError && likes) {
        // Group likes by tool_id
        const likesByTool = likes.reduce((acc, like) => {
          if (!acc[like.tool_id]) {
            acc[like.tool_id] = { count: 0, userLiked: false }
          }
          acc[like.tool_id].count++
          if (like.user_id === user.id) {
            acc[like.tool_id].userLiked = true
          }
          return acc
        }, {} as Record<string, { count: number; userLiked: boolean }>)

        // Add likes data to tools
        tools?.forEach(tool => {
          const likeData = likesByTool[tool.id] || { count: 0, userLiked: false }
          tool.likes_count = likeData.count
          tool.user_liked = likeData.userLiked
        })
      }
    }

    // Add default likes data for tools without likes
    tools?.forEach(tool => {
      if (!tool.likes_count) tool.likes_count = 0
      if (!tool.user_liked) tool.user_liked = false
      if (!tool.view_count) tool.view_count = 0
    })

    // Get recently viewed tools for the user
    let recentlyViewed: any[] = []
    if (user) {
      const { data: views } = await supabase
        .from('playground_tool_views')
        .select(`
          tool_id,
          viewed_at,
          playground_tools:playground_tools!inner(
            *,
            submitter:profiles!playground_tools_submitted_by_fkey(
              id,
              full_name,
              email,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(5)

      if (views) {
        recentlyViewed = views
          .map((v: any) => v.playground_tools)
          .filter(Boolean)
        
        // Add likes data to recently viewed
        if (recentlyViewed.length > 0) {
          const recentlyViewedIds = recentlyViewed.map((t: any) => t.id)
          const { data: recentlyViewedLikes } = await supabase
            .from('playground_tool_likes')
            .select('tool_id, user_id')
            .in('tool_id', recentlyViewedIds)

          if (recentlyViewedLikes) {
            const likesByTool = recentlyViewedLikes.reduce((acc, like) => {
              if (!acc[like.tool_id]) {
                acc[like.tool_id] = { count: 0, userLiked: false }
              }
              acc[like.tool_id].count++
              if (like.user_id === user.id) {
                acc[like.tool_id].userLiked = true
              }
              return acc
            }, {} as Record<string, { count: number; userLiked: boolean }>)

            recentlyViewed.forEach((tool: any) => {
              const likeData = likesByTool[tool.id] || { count: 0, userLiked: false }
              tool.likes_count = likeData.count
              tool.user_liked = likeData.userLiked
              if (!tool.view_count) tool.view_count = 0
            })
          }
        }
      }
    }

    // Get most used tools (by view count)
    const { data: mostUsed } = await supabase
      .from('playground_tools')
      .select(`
        *,
        submitter:profiles!playground_tools_submitted_by_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .order('view_count', { ascending: false })
      .limit(5)

    // Add likes data to most used
    if (mostUsed && mostUsed.length > 0) {
      const mostUsedIds = mostUsed.map(t => t.id)
      const { data: mostUsedLikes } = await supabase
        .from('playground_tool_likes')
        .select('tool_id, user_id')
        .in('tool_id', mostUsedIds)

      if (mostUsedLikes) {
        const likesByTool = mostUsedLikes.reduce((acc, like) => {
          if (!acc[like.tool_id]) {
            acc[like.tool_id] = { count: 0, userLiked: false }
          }
          acc[like.tool_id].count++
          if (like.user_id === user.id) {
            acc[like.tool_id].userLiked = true
          }
          return acc
        }, {} as Record<string, { count: number; userLiked: boolean }>)

        mostUsed.forEach(tool => {
          const likeData = likesByTool[tool.id] || { count: 0, userLiked: false }
          tool.likes_count = likeData.count
          tool.user_liked = likeData.userLiked
          if (!tool.view_count) tool.view_count = 0
        })
      }
    }

    return NextResponse.json({ 
      data: tools || [],
      recentlyViewed: recentlyViewed || [],
      mostUsed: mostUsed || []
    })
  } catch (error: any) {
    console.error('Error in GET /api/playground/tools:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new playground tool
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      link,
      file_url,
      made_by_user,
      description,
      why_i_like_it,
      tags,
      category
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Tool name is required' }, { status: 400 })
    }

    const { data: tool, error: insertError } = await supabase
      .from('playground_tools')
      .insert({
        name,
        link: link || null,
        file_url: file_url || null,
        made_by_user: made_by_user || false,
        description: description || null,
        why_i_like_it: why_i_like_it || null,
        tags: tags || [],
        category: category || null,
        submitted_by: user.id
      })
      .select(`
        *,
        submitter:profiles!playground_tools_submitted_by_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating tool:', insertError)
      return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 })
    }

    // Initialize likes data
    tool.likes_count = 0
    tool.user_liked = false

    return NextResponse.json({ data: tool }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/playground/tools:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a playground tool
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Tool ID is required' }, { status: 400 })
    }

    // Check if user owns the tool
    const { data: existingTool, error: fetchError } = await supabase
      .from('playground_tools')
      .select('submitted_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    if (existingTool.submitted_by !== user.id) {
      return NextResponse.json({ error: 'You can only update your own tools' }, { status: 403 })
    }

    const { data: tool, error: updateError } = await supabase
      .from('playground_tools')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        submitter:profiles!playground_tools_submitted_by_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating tool:', updateError)
      return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 })
    }

    return NextResponse.json({ data: tool })
  } catch (error: any) {
    console.error('Error in PUT /api/playground/tools:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a playground tool
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
      return NextResponse.json({ error: 'Tool ID is required' }, { status: 400 })
    }

    // Check if user owns the tool
    const { data: existingTool, error: fetchError } = await supabase
      .from('playground_tools')
      .select('submitted_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    if (existingTool.submitted_by !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own tools' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('playground_tools')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting tool:', deleteError)
      return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Tool deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/playground/tools:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

