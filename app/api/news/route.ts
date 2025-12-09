import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Disable caching for news API to ensure fresh data after adds/updates
export const dynamic = 'force-dynamic'

// GET - Fetch all news items with optional search and filter
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
    const sortBy = searchParams.get('sortBy') || 'published_date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const limit = parseInt(searchParams.get('limit') || '1000', 10)

    // Build query
    let query = supabase
      .from('news')
      .select(`
        id,
        title,
        content,
        url,
        category,
        tags,
        pinned,
        published_date,
        submitted_by,
        created_at,
        updated_at,
        submitted_by_profile:profiles!submitted_by(id, email, full_name)
      `)

    // Apply filters
    if (pinned === 'true') {
      query = query.eq('pinned', true)
    } else if (pinned === 'false') {
      query = query.eq('pinned', false)
    }

    if (category) {
      query = query.eq('category', category)
    }

    // Apply sorting - always prioritize pinned items first
    query = query.order('pinned', { ascending: false })
    
    if (sortBy === 'title') {
      query = query.order('title', { ascending: sortOrder === 'asc' })
    } else if (sortBy === 'published_date' || sortBy === 'date') {
      query = query.order('published_date', { ascending: sortOrder === 'asc' })
    } else if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('published_date', { ascending: sortOrder === 'asc' })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching news:', error)
      return NextResponse.json(
        { error: 'Failed to fetch news', details: error.message },
        { status: 500 }
      )
    }

    // Apply search filter in memory (search all fields)
    let filteredData = data || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = filteredData.filter((item: any) => {
        const titleMatch = item.title?.toLowerCase().includes(searchLower)
        const contentMatch = item.content?.toLowerCase().includes(searchLower)
        const categoryMatch = item.category?.toLowerCase().includes(searchLower)
        const tagsMatch = Array.isArray(item.tags) && item.tags.some((tag: string) => 
          tag.toLowerCase().includes(searchLower)
        )
        const submittedByName = item.submitted_by_profile?.full_name?.toLowerCase().includes(searchLower)
        const submittedByEmail = item.submitted_by_profile?.email?.toLowerCase().includes(searchLower)
        
        return titleMatch || contentMatch || categoryMatch || tagsMatch || submittedByName || submittedByEmail
      })
    }

    const response = NextResponse.json({ 
      data: filteredData,
      pagination: {
        total: count || filteredData.length,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false
      }
    })
    // Disable caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    return response
  } catch (error: any) {
    console.error('Error in news API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch news', details: error.toString() },
      { status: 500 }
    )
  }
}

// POST - Create a new news item
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
    const { 
      title, 
      content, 
      url, 
      category, 
      tags, 
      pinned,
      published_date
    } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Verify user exists in profiles table
    const { data: profileCheck, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (profileError || !profileCheck) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile setup.', details: profileError?.message },
        { status: 400 }
      )
    }

    // Convert tags from comma-separated string to array if needed
    let tagsArray: string[] = []
    if (tags) {
      if (Array.isArray(tags)) {
        tagsArray = tags
      } else if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean)
      }
    }

    // Parse published_date or default to today
    let publishedDate = published_date
    if (!publishedDate) {
      publishedDate = new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabase
      .from('news')
      .insert({
        title,
        content: content || null,
        url: url || null,
        category: category || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        pinned: pinned || false,
        published_date: publishedDate,
        submitted_by: user.id,
      })
      .select(`
        id,
        title,
        content,
        url,
        category,
        tags,
        pinned,
        published_date,
        submitted_by,
        created_at,
        updated_at,
        submitted_by_profile:profiles!submitted_by(id, email, full_name)
      `)
      .single()

    if (error) {
      console.error('Error creating news:', error)
      return NextResponse.json(
        { error: 'Failed to create news item', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error('Error in news API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create news item', details: error.toString() },
      { status: 500 }
    )
  }
}

// PUT - Update a news item
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
      title, 
      content, 
      url, 
      category, 
      tags, 
      pinned,
      published_date
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    // If only pinned is being updated (pin toggle), allow it without requiring title
    const isPinOnlyUpdate = pinned !== undefined && title === undefined

    if (!isPinOnlyUpdate && !title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Only update fields that are provided
    if (title !== undefined) {
      updateData.title = title
    }
    if (content !== undefined) {
      updateData.content = content || null
    }
    if (url !== undefined) {
      updateData.url = url || null
    }
    if (category !== undefined) {
      updateData.category = category || null
    }
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        updateData.tags = tags.length > 0 ? tags : null
      } else if (typeof tags === 'string') {
        const tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean)
        updateData.tags = tagsArray.length > 0 ? tagsArray : null
      } else {
        updateData.tags = null
      }
    }
    if (pinned !== undefined) {
      updateData.pinned = pinned || false
    }
    if (published_date !== undefined) {
      updateData.published_date = published_date
    }

    const { data, error } = await supabase
      .from('news')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        title,
        content,
        url,
        category,
        tags,
        pinned,
        published_date,
        submitted_by,
        created_at,
        updated_at,
        submitted_by_profile:profiles!submitted_by(id, email, full_name)
      `)
      .single()

    if (error) {
      console.error('Error updating news:', error)
      return NextResponse.json(
        { error: 'Failed to update news item', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in news API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update news item', details: error.toString() },
      { status: 500 }
    )
  }
}

// DELETE - Delete news item(s)
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
    let query = supabase.from('news').delete()
    
    if (id) {
      query = query.eq('id', id)
    } else if (ids) {
      const idArray = ids.split(',').filter(Boolean)
      query = query.in('id', idArray)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting news item(s):', error)
      return NextResponse.json(
        { error: 'Failed to delete news item(s)', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in news API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

