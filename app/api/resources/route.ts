import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all'
    const userId = searchParams.get('userId')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build query
    let query = supabase
      .from('resources')
      .select('*')

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,source.ilike.%${search}%`)
    }

    // Apply category filter
    if (filter !== 'all') {
      query = query.eq('primary_category', filter)
    }

    // Apply sorting
    if (sortBy === 'name') {
      query = query.order('name', { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('created_at', { ascending: sortOrder === 'asc' })
    }

    const { data: resources, error } = await query

    if (error) {
      console.error('Error fetching resources:', error)
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
    }

    // Get recently viewed resources for the user
    let recentlyViewed: any[] = []
    if (userId) {
      const { data: views } = await supabase
        .from('resource_views')
        .select('resource_id, viewed_at, resources(*)')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(5)

      if (views) {
        recentlyViewed = views.map(v => v.resources).filter(Boolean)
      }
    }

    // Get most used resources (by view count)
    const { data: mostUsed } = await supabase
      .from('resources')
      .select('*')
      .order('view_count', { ascending: false })
      .limit(5)

    return NextResponse.json({
      data: resources || [],
      recentlyViewed: recentlyViewed || [],
      mostUsed: mostUsed || []
    })
  } catch (error: any) {
    console.error('Error in resources API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new resource or record a view
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
    
    // Check if this is a view tracking request (has resourceId and userId)
    if (body.resourceId && body.userId) {
      // Record view
      await supabase
        .from('resource_views')
        .insert({
          resource_id: body.resourceId,
          user_id: body.userId,
          viewed_at: new Date().toISOString()
        })

      // Get current view count and increment
      const { data: resource } = await supabase
        .from('resources')
        .select('view_count')
        .eq('id', body.resourceId)
        .single()

      if (resource) {
        // Update resource view count and last viewed timestamp
        await supabase
          .from('resources')
          .update({ 
            view_count: (resource.view_count || 0) + 1,
            last_viewed_at: new Date().toISOString()
          })
          .eq('id', body.resourceId)
      }

      return NextResponse.json({ success: true })
    }

    // Otherwise, create a new resource
    const { 
      name, 
      primary_category, 
      secondary_tags, 
      link, 
      source, 
      description, 
      username, 
      password, 
      instructions, 
      documentation 
    } = body

    if (!name || !primary_category || !link) {
      return NextResponse.json(
        { error: 'Name, primary category, and link are required' },
        { status: 400 }
      )
    }

    // Convert secondary_tags from comma-separated string to array if needed
    let tagsArray: string[] = []
    if (secondary_tags) {
      if (Array.isArray(secondary_tags)) {
        tagsArray = secondary_tags
      } else if (typeof secondary_tags === 'string') {
        tagsArray = secondary_tags.split(',').map(tag => tag.trim()).filter(Boolean)
      }
    }

    const { data, error } = await supabase
      .from('resources')
      .insert({
        name,
        primary_category,
        secondary_tags: tagsArray,
        link,
        source: source || null,
        description: description || null,
        username: username || null,
        password: password || null,
        instructions: instructions || null,
        documentation: documentation || null,
        view_count: 0,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating resource:', error)
      return NextResponse.json(
        { error: 'Failed to create resource', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error('Error in resources API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a resource
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
    const { 
      id,
      name, 
      primary_category, 
      secondary_tags, 
      link, 
      source, 
      description, 
      username, 
      password, 
      instructions, 
      documentation 
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    if (!name || !primary_category || !link) {
      return NextResponse.json(
        { error: 'Name, primary category, and link are required' },
        { status: 400 }
      )
    }

    // Convert secondary_tags from comma-separated string to array if needed
    let tagsArray: string[] = []
    if (secondary_tags !== undefined) {
      if (Array.isArray(secondary_tags)) {
        tagsArray = secondary_tags
      } else if (typeof secondary_tags === 'string') {
        tagsArray = secondary_tags.split(',').map(tag => tag.trim()).filter(Boolean)
      }
    }

    const updateData: any = {
      name,
      primary_category,
      secondary_tags: tagsArray,
      link,
      source: source || null,
      description: description || null,
      username: username || null,
      password: password || null,
      instructions: instructions || null,
      documentation: documentation || null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('resources')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating resource:', error)
      return NextResponse.json(
        { error: 'Failed to update resource', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in resources API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete resource(s)
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
    const ids = searchParams.get('ids') // Comma-separated list of IDs

    if (!id && !ids) {
      return NextResponse.json(
        { error: 'ID or IDs are required' },
        { status: 400 }
      )
    }

    // Handle single or multiple deletions
    let query = supabase.from('resources').delete()
    
    if (id) {
      query = query.eq('id', id)
    } else if (ids) {
      const idArray = ids.split(',').filter(Boolean)
      query = query.in('id', idArray)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting resource(s):', error)
      return NextResponse.json(
        { error: 'Failed to delete resource(s)', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in resources API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

