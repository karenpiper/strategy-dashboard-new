import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 300 // Cache for 5 minutes

// GET - Fetch all quick links (public gets active only, admins get all)
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('base_role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.base_role === 'admin'

    // Build query - admins see all, others see only active
    let query = supabase
      .from('quick_links')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (!isAdmin) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching quick links:', error)
      return NextResponse.json(
        { error: 'Failed to fetch quick links', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error('Error in quick-links API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quick links', details: error.toString() },
      { status: 500 }
    )
  }
}

// POST - Create a new quick link
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('base_role')
      .eq('id', user.id)
      .single()

    if (profile?.base_role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { label, url, icon_name, password, display_order, is_active } = body

    if (!label || !url) {
      return NextResponse.json(
        { error: 'Label and URL are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('quick_links')
      .insert({
        label,
        url,
        icon_name: icon_name || null,
        password: password || null,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
        created_by: user.id,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating quick link:', error)
      return NextResponse.json(
        { error: 'Failed to create quick link', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error('Error in quick-links API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create quick link', details: error.toString() },
      { status: 500 }
    )
  }
}

// PUT - Update a quick link
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('base_role')
      .eq('id', user.id)
      .single()

    if (profile?.base_role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, label, url, icon_name, password, display_order, is_active } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Quick link ID is required' },
        { status: 400 }
      )
    }

    if (!label || !url) {
      return NextResponse.json(
        { error: 'Label and URL are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('quick_links')
      .update({
        label,
        url,
        icon_name: icon_name || null,
        password: password || null,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating quick link:', error)
      return NextResponse.json(
        { error: 'Failed to update quick link', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Error in quick-links API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update quick link', details: error.toString() },
      { status: 500 }
    )
  }
}

// DELETE - Delete a quick link
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('base_role')
      .eq('id', user.id)
      .single()

    if (profile?.base_role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Quick link ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('quick_links')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting quick link:', error)
      return NextResponse.json(
        { error: 'Failed to delete quick link', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Quick link deleted successfully' }, { status: 200 })
  } catch (error: any) {
    console.error('Error in quick-links API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete quick link', details: error.toString() },
      { status: 500 }
    )
  }
}


