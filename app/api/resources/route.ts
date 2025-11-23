import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all'
    const userId = searchParams.get('userId')

    // Build query
    let query = supabase
      .from('resources')
      .select('*')
      .order('name', { ascending: true })

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,source.ilike.%${search}%`)
    }

    // Apply category filter
    if (filter !== 'all') {
      // Filter by primary category
      query = query.eq('primary_category', filter)
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { resourceId, userId } = body

    if (!resourceId || !userId) {
      return NextResponse.json({ error: 'Missing resourceId or userId' }, { status: 400 })
    }

    // Record view
    await supabase
      .from('resource_views')
      .insert({
        resource_id: resourceId,
        user_id: userId,
        viewed_at: new Date().toISOString()
      })

    // Get current view count and increment
    const { data: resource } = await supabase
      .from('resources')
      .select('view_count')
      .eq('id', resourceId)
      .single()

    if (resource) {
      // Update resource view count and last viewed timestamp
      await supabase
        .from('resources')
        .update({ 
          view_count: (resource.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', resourceId)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error recording resource view:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

