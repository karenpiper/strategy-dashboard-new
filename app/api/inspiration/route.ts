import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Cache configuration: 5 minutes for user-specific data
export const revalidate = 300

// GET - Fetch all inspiration items with optional search and filter
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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const pinned = searchParams.get('pinned')
    const category = searchParams.get('category')
    const contentType = searchParams.get('content_type')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    // Build query
    let query = supabase
      .from('inspiration')
      .select(`
        id,
        title,
        url,
        description,
        image_url,
        content_type,
        category,
        tags,
        pinned,
        submitted_by,
        created_at,
        updated_at,
        submitted_by_profile:profiles!submitted_by(id, email, full_name)
      `, { count: 'exact' })

    // Apply filters
    if (pinned === 'true') {
      query = query.eq('pinned', true)
    } else if (pinned === 'false') {
      query = query.eq('pinned', false)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    // Apply search
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,url.ilike.%${search}%`)
    }

    // Apply sorting - always prioritize pinned items first
    query = query.order('pinned', { ascending: false })
    
    if (sortBy === 'title') {
      query = query.order('title', { ascending: sortOrder === 'asc' })
    } else if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: sortOrder === 'asc' })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching inspiration:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inspiration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error in inspiration API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new inspiration item
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

    const body = await request.json()
    const { title, url, description, image_url, content_type, category, tags, pinned } = body

    // Validate required fields
    if (!title || !url) {
      return NextResponse.json(
        { error: 'Title and URL are required' },
        { status: 400 }
      )
    }

    // Get user profile to get submitted_by
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Insert inspiration item
    const { data: inspiration, error: insertError } = await supabase
      .from('inspiration')
      .insert({
        title: title.trim(),
        url: url.trim(),
        description: description?.trim() || null,
        image_url: image_url?.trim() || null,
        content_type: content_type || 'website',
        category: category?.trim() || null,
        tags: tags || [],
        pinned: pinned || false,
        submitted_by: profile.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting inspiration:', insertError)
      return NextResponse.json(
        { error: 'Failed to create inspiration item', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(inspiration, { status: 201 })
  } catch (error: any) {
    console.error('Error in inspiration API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update an inspiration item
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, title, url, description, image_url, content_type, category, tags, pinned } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    // Check if user has permission to update (owner or admin/leader)
    const { data: existing } = await supabase
      .from('inspiration')
      .select('submitted_by')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Inspiration item not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('base_role')
      .eq('id', user.id)
      .single()

    const isOwner = existing.submitted_by === user.id
    const isAdminOrLeader = profile?.base_role === 'admin' || profile?.base_role === 'leader'

    if (!isOwner && !isAdminOrLeader) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Update inspiration item
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title.trim()
    if (url !== undefined) updateData.url = url.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (image_url !== undefined) updateData.image_url = image_url?.trim() || null
    if (content_type !== undefined) updateData.content_type = content_type
    if (category !== undefined) updateData.category = category?.trim() || null
    if (tags !== undefined) updateData.tags = tags
    if (pinned !== undefined) updateData.pinned = pinned

    const { data: inspiration, error: updateError } = await supabase
      .from('inspiration')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating inspiration:', updateError)
      return NextResponse.json(
        { error: 'Failed to update inspiration item', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(inspiration)
  } catch (error: any) {
    console.error('Error in inspiration API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an inspiration item
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    // Check if user has permission to delete (owner or admin/leader)
    const { data: existing } = await supabase
      .from('inspiration')
      .select('submitted_by')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Inspiration item not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('base_role')
      .eq('id', user.id)
      .single()

    const isOwner = existing.submitted_by === user.id
    const isAdminOrLeader = profile?.base_role === 'admin' || profile?.base_role === 'leader'

    if (!isOwner && !isAdminOrLeader) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Delete inspiration item
    const { error: deleteError } = await supabase
      .from('inspiration')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting inspiration:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete inspiration item', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in inspiration API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


