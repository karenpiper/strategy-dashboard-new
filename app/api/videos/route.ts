import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchThumbnail, parseVideoUrl } from '@/lib/video-thumbnails'

// GET - Fetch all videos with optional search and filter
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
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build query
    let query = supabase
      .from('videos')
      .select(`
        id,
        title,
        video_url,
        description,
        thumbnail_url,
        category,
        tags,
        platform,
        duration,
        pinned,
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
    } else if (sortBy === 'created_at' || sortBy === 'date') {
      query = query.order('created_at', { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('created_at', { ascending: sortOrder === 'asc' })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching videos:', error)
      return NextResponse.json(
        { error: 'Failed to fetch videos', details: error.message },
        { status: 500 }
      )
    }

    // Apply search filter in memory (search all fields)
    let filteredData = data || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = filteredData.filter((item: any) => {
        const titleMatch = item.title?.toLowerCase().includes(searchLower)
        const descriptionMatch = item.description?.toLowerCase().includes(searchLower)
        const categoryMatch = item.category?.toLowerCase().includes(searchLower)
        const tagsMatch = Array.isArray(item.tags) && item.tags.some((tag: string) => 
          tag.toLowerCase().includes(searchLower)
        )
        const submittedByName = item.submitted_by_profile?.full_name?.toLowerCase().includes(searchLower)
        const submittedByEmail = item.submitted_by_profile?.email?.toLowerCase().includes(searchLower)
        
        return titleMatch || descriptionMatch || categoryMatch || tagsMatch || submittedByName || submittedByEmail
      })
    }

    return NextResponse.json({ data: filteredData })
  } catch (error: any) {
    console.error('Error in videos API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos', details: error.toString() },
      { status: 500 }
    )
  }
}

// POST - Create a new video
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
      video_url, 
      description, 
      thumbnail_url, 
      category, 
      tags, 
      platform, 
      duration, 
      pinned 
    } = body

    if (!title || !video_url) {
      return NextResponse.json(
        { error: 'Title and video URL are required' },
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

    // Detect platform from URL if not provided
    let detectedPlatform = platform
    if (!detectedPlatform && video_url) {
      if (video_url.includes('youtube.com') || video_url.includes('youtu.be')) {
        detectedPlatform = 'youtube'
      } else if (video_url.includes('vimeo.com')) {
        detectedPlatform = 'vimeo'
      } else if (video_url.includes('zoom.us')) {
        detectedPlatform = 'zoom'
      } else {
        detectedPlatform = 'direct'
      }
    }

    // Auto-fetch thumbnail if not provided
    let finalThumbnailUrl = thumbnail_url
    if (!finalThumbnailUrl && video_url) {
      try {
        const fetchedThumbnail = await fetchThumbnail(video_url, detectedPlatform)
        if (fetchedThumbnail) {
          finalThumbnailUrl = fetchedThumbnail
        }
      } catch (error) {
        console.error('Error fetching thumbnail:', error)
        // Continue without thumbnail if fetch fails
      }
    }

    const { data, error } = await supabase
      .from('videos')
      .insert({
        title,
        video_url,
        description: description || null,
        thumbnail_url: finalThumbnailUrl || null,
        category: category || null,
        tags: tagsArray,
        platform: detectedPlatform || null,
        duration: duration || null,
        pinned: pinned || false,
        submitted_by: user.id,
        updated_at: new Date().toISOString()
      })
      .select(`
        id,
        title,
        video_url,
        description,
        thumbnail_url,
        category,
        tags,
        platform,
        duration,
        pinned,
        submitted_by,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Error creating video:', error)
      return NextResponse.json(
        { error: 'Failed to create video', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error('Error in videos API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create video', details: error.toString() },
      { status: 500 }
    )
  }
}

// PUT - Update a video
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
      video_url, 
      description, 
      thumbnail_url, 
      category, 
      tags, 
      platform, 
      duration, 
      pinned 
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    // If only pinned is being updated (pin toggle), allow it without requiring title/url
    const isPinOnlyUpdate = pinned !== undefined && title === undefined && video_url === undefined

    if (!isPinOnlyUpdate && (!title || !video_url)) {
      return NextResponse.json(
        { error: 'Title and video URL are required' },
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
    if (video_url !== undefined) {
      updateData.video_url = video_url
      // Re-detect platform if URL changed
      let detectedPlatform = updateData.platform
      if (video_url) {
        if (video_url.includes('youtube.com') || video_url.includes('youtu.be')) {
          detectedPlatform = 'youtube'
        } else if (video_url.includes('vimeo.com')) {
          detectedPlatform = 'vimeo'
        } else if (video_url.includes('zoom.us')) {
          detectedPlatform = 'zoom'
        } else {
          detectedPlatform = 'direct'
        }
        updateData.platform = detectedPlatform

        // Auto-fetch thumbnail if URL changed and thumbnail wasn't explicitly provided
        if (thumbnail_url === undefined && video_url) {
          try {
            const fetchedThumbnail = await fetchThumbnail(video_url, detectedPlatform)
            if (fetchedThumbnail) {
              updateData.thumbnail_url = fetchedThumbnail
            }
          } catch (error) {
            console.error('Error fetching thumbnail:', error)
            // Continue without updating thumbnail if fetch fails
          }
        }
      }
    }
    if (description !== undefined) {
      updateData.description = description || null
    }
    if (thumbnail_url !== undefined) {
      updateData.thumbnail_url = thumbnail_url || null
    }
    if (category !== undefined) {
      updateData.category = category || null
    }
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        updateData.tags = tags
      } else if (typeof tags === 'string') {
        updateData.tags = tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
      } else {
        updateData.tags = []
      }
    }
    if (platform !== undefined) {
      updateData.platform = platform || null
    }
    if (duration !== undefined) {
      updateData.duration = duration || null
    }
    if (pinned !== undefined) {
      updateData.pinned = pinned || false
    }

    const { data, error } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        title,
        video_url,
        description,
        thumbnail_url,
        category,
        tags,
        platform,
        duration,
        pinned,
        submitted_by,
        created_at,
        updated_at,
        submitted_by_profile:profiles!submitted_by(id, email, full_name)
      `)
      .single()

    if (error) {
      console.error('Error updating video:', error)
      return NextResponse.json(
        { error: 'Failed to update video', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in videos API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update video', details: error.toString() },
      { status: 500 }
    )
  }
}

// DELETE - Delete video(s)
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
    let query = supabase.from('videos').delete()
    
    if (id) {
      query = query.eq('id', id)
    } else if (ids) {
      const idArray = ids.split(',').filter(Boolean)
      query = query.in('id', idArray)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting video(s):', error)
      return NextResponse.json(
        { error: 'Failed to delete video(s)', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in videos API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete video(s)', details: error.toString() },
      { status: 500 }
    )
  }
}

