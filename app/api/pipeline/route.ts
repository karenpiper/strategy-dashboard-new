import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all pipeline projects
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
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('pipeline_projects')
      .select(`
        id,
        name,
        type,
        description,
        due_date,
        lead,
        notes,
        status,
        team,
        url,
        tier,
        created_by,
        created_at,
        updated_at,
        created_by_profile:profiles!created_by(id, email, full_name)
      `)

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Sort by due_date (nulls last), then by created_at
    query = query.order('due_date', { ascending: true, nullsFirst: false })
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching pipeline projects:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pipeline projects', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error('Error in pipeline API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pipeline projects', details: error.toString() },
      { status: 500 }
    )
  }
}

// PUT - Update pipeline project (full update or status only)
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
    const { id, status, name, type, description, due_date, lead, notes, team, url, tier } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Build update object - if status is provided alone, it's a status-only update
    // Otherwise, it's a full update
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) {
      // Validate status
      const validStatuses = ['In Progress', 'Pending Decision', 'Long Lead', 'Won', 'Lost']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    // If other fields are provided, include them in the update
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type || null
    if (description !== undefined) updateData.description = description || null
    if (due_date !== undefined) updateData.due_date = due_date || null
    if (lead !== undefined) updateData.lead = lead || null
    if (notes !== undefined) updateData.notes = notes || null
    if (team !== undefined) updateData.team = team || null
    if (url !== undefined) updateData.url = url || null
    if (tier !== undefined) updateData.tier = tier !== null && tier !== '' ? tier : null

    const { data, error } = await supabase
      .from('pipeline_projects')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        name,
        type,
        description,
        due_date,
        lead,
        notes,
        status,
        team,
        url,
        tier,
        created_by,
        created_at,
        updated_at,
        created_by_profile:profiles!created_by(id, email, full_name)
      `)
      .single()

    if (error) {
      console.error('Error updating pipeline project:', error)
      return NextResponse.json(
        { error: 'Failed to update project', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in pipeline API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update project', details: error.toString() },
      { status: 500 }
    )
  }
}

// POST - Create new pipeline project
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
    const { name, type, description, due_date, lead, notes, status, team, url, tier } = body

    if (!name || !status) {
      return NextResponse.json(
        { error: 'Project name and status are required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['In Progress', 'Pending Decision', 'Long Lead', 'Won', 'Lost']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('pipeline_projects')
      .insert({
        name,
        type: type || null,
        description: description || null,
        due_date: due_date || null,
        lead: lead || null,
        notes: notes || null,
        status,
        team: team || null,
        url: url || null,
        tier: tier !== undefined ? tier : null,
        created_by: user.id,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating pipeline project:', error)
      return NextResponse.json(
        { error: 'Failed to create project', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in pipeline API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create project', details: error.toString() },
      { status: 500 }
    )
  }
}

