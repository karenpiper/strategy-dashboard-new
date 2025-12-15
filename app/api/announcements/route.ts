import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - Fetch active announcements
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
    const admin = searchParams.get('admin') === 'true'

    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('announcements')
      .select(`
        id,
        headline,
        mode,
        event_name,
        target_date,
        text_format,
        custom_format,
        sticker_url,
        start_date,
        end_date,
        active,
        working_days_only,
        created_at,
        updated_at,
        created_by_profile:profiles!created_by(id, email, full_name)
      `)

    if (!admin) {
      // Public endpoint: only get active announcements within date range
      query = query
        .eq('active', true)
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('created_at', { ascending: false })
        .limit(1) // Only get the most recent active announcement
    } else {
      // Admin endpoint: get all announcements
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching announcements:', error)
      return NextResponse.json(
        { error: 'Failed to fetch announcements', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error('Error in announcements API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}

// POST - Create a new announcement
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
      headline,
      mode,
      event_name,
      target_date,
      text_format,
      custom_format,
      sticker_url,
      start_date,
      end_date,
      active,
      working_days_only
    } = body

    // Headline is only required for text mode
    if (mode !== 'countdown' && !headline) {
      return NextResponse.json(
        { error: 'Headline is required for text mode' },
        { status: 400 }
      )
    }

    if (mode === 'countdown' && (!event_name || !target_date)) {
      return NextResponse.json(
        { error: 'Event name and target date are required for countdown mode' },
        { status: 400 }
      )
    }

    const insertData: any = {
      mode: mode || 'text',
      event_name: mode === 'countdown' ? event_name : null,
      target_date: mode === 'countdown' ? target_date : null,
      text_format: mode === 'countdown' ? (text_format || 'days_until') : null,
      start_date: start_date || new Date().toISOString().split('T')[0],
      end_date: end_date || null,
      active: active !== undefined ? active : true,
      working_days_only: mode === 'countdown' ? (working_days_only || false) : false,
      created_by: user.id,
    }

    // Headline is only required for text mode
    if (mode === 'text') {
      insertData.headline = headline
    } else if (headline) {
      // Allow headline for countdown mode but it's optional
      insertData.headline = headline
    }

    // Only add custom_format if it's a custom format
    if (mode === 'countdown' && text_format === 'custom' && custom_format) {
      insertData.custom_format = custom_format
    }

    // Only add sticker_url if it exists
    if (sticker_url) {
      insertData.sticker_url = sticker_url
    }

    console.log('Inserting announcement with data:', insertData)

    const { data, error } = await supabase
      .from('announcements')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating announcement:', error)
      return NextResponse.json(
        { error: 'Failed to create announcement', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error('Error in announcements API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create announcement' },
      { status: 500 }
    )
  }
}

// PUT - Update an announcement
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
      headline,
      mode,
      event_name,
      target_date,
      text_format,
      custom_format,
      sticker_url,
      start_date,
      end_date,
      active,
      working_days_only
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    // First, fetch the existing announcement to check current values
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select('text_format, custom_format, sticker_url')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching existing announcement:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch existing announcement', details: fetchError.message },
        { status: 500 }
      )
    }

    const currentTextFormat = text_format !== undefined ? text_format : existingAnnouncement?.text_format

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (headline !== undefined) updateData.headline = headline
    if (mode !== undefined) updateData.mode = mode
    if (event_name !== undefined) updateData.event_name = event_name
    if (target_date !== undefined) updateData.target_date = target_date
    
    if (text_format !== undefined) {
      updateData.text_format = text_format
      // If switching away from custom format, clear custom_format
      if (text_format !== 'custom') {
        updateData.custom_format = null
      }
    }
    
    if (custom_format !== undefined) {
      // Only set custom_format if text_format is 'custom' (current or being set)
      if (currentTextFormat === 'custom') {
        updateData.custom_format = custom_format || null
      } else {
        // Not a custom format, so clear custom_format
        updateData.custom_format = null
      }
    }
    
    if (sticker_url !== undefined) {
      updateData.sticker_url = sticker_url || null
    }
    
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date
    if (active !== undefined) updateData.active = active
    if (working_days_only !== undefined) {
      updateData.working_days_only = mode === 'countdown' ? working_days_only : false
    }

    console.log('Updating announcement:', { id, updateData, currentTextFormat })

    const { data, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating announcement:', error)
      return NextResponse.json(
        { error: 'Failed to update announcement', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in announcements API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update announcement' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an announcement
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

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting announcement:', error)
      return NextResponse.json(
        { error: 'Failed to delete announcement', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in announcements API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete announcement' },
      { status: 500 }
    )
  }
}

