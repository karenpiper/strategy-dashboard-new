import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all work samples with optional search and filter
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
    const typeId = searchParams.get('type_id')
    const authorId = searchParams.get('author_id')

    // Build query
    let query = supabase
      .from('work_samples')
      .select(`
        id,
        project_name,
        description,
        type_id,
        client,
        author_id,
        date,
        created_by,
        submitted_by,
        created_at,
        updated_at,
        thumbnail_url,
        file_url,
        file_link,
        file_name,
        type:work_sample_types(id, name),
        author:profiles!author_id(id, email, full_name),
        created_by_profile:profiles!created_by(id, email, full_name),
        submitted_by_profile:profiles!submitted_by(id, email, full_name)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (typeId) {
      query = query.eq('type_id', typeId)
    }

    if (authorId) {
      query = query.eq('author_id', authorId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching work samples:', error)
      return NextResponse.json(
        { error: 'Failed to fetch work samples', details: error.message },
        { status: 500 }
      )
    }

    // Apply search filter in memory (for project_name, description, client)
    let filteredData = data || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = filteredData.filter((item: any) => 
        item.project_name?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.client?.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({ data: filteredData })
  } catch (error: any) {
    console.error('Error in work-samples API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch work samples', details: error.toString() },
      { status: 500 }
    )
  }
}

// POST - Create a new work sample
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
    const { project_name, description, type_id, client, author_id, submitted_by, date, thumbnail_url, file_url, file_link, file_name } = body

    if (!project_name || !description) {
      return NextResponse.json(
        { error: 'Project name and description are required' },
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

    // Verify author exists if specified
    const authorId = author_id || user.id
    if (author_id && author_id !== user.id) {
      const { data: authorProfile, error: authorError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', author_id)
        .single()

      if (authorError || !authorProfile) {
        return NextResponse.json(
          { error: 'Author profile not found', details: authorError?.message },
          { status: 400 }
        )
      }
    }

    // Use provided date or default to today
    const finalDate = date || new Date().toISOString().split('T')[0]

    // Handle submitted_by: 
    // - If explicitly set to empty string, use NULL
    // - If provided with a value, verify and use it
    // - If not provided at all, default to user.id
    let submittedById = user.id // Default to logged-in user
    if (submitted_by !== undefined && submitted_by !== null) {
      if (submitted_by.trim() === '') {
        // Explicitly left blank - use NULL
        submittedById = null
      } else {
        // Verify submitted_by user exists if specified
        const { data: submittedByProfile, error: submittedByError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', submitted_by)
          .single()

        if (submittedByError || !submittedByProfile) {
          return NextResponse.json(
            { error: 'Submitted by user profile not found', details: submittedByError?.message },
            { status: 400 }
          )
        }
        submittedById = submitted_by
      }
    }

    const insertData: any = {
      project_name,
      description,
      client: client || null,
      type_id: type_id || null,
      author_id: authorId,
      submitted_by: submittedById,
      date: finalDate,
      created_by: user.id,
      updated_at: new Date().toISOString(),
      thumbnail_url: thumbnail_url || null,
      file_url: file_url || null,
      file_link: file_link || null,
      file_name: file_name || null,
    }

    const { data, error } = await supabase
      .from('work_samples')
      .insert(insertData)
      .select(`
        id,
        project_name,
        description,
        type_id,
        client,
        author_id,
        date,
        created_by,
        submitted_by,
        created_at,
        updated_at,
        thumbnail_url,
        file_url,
        file_link,
        file_name,
        type:work_sample_types(id, name),
        author:profiles!author_id(id, email, full_name),
        created_by_profile:profiles!created_by(id, email, full_name),
        submitted_by_profile:profiles!submitted_by(id, email, full_name)
      `)
      .single()

    if (error) {
      console.error('Error creating work sample:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create work sample', 
          details: error.message, 
          code: error.code,
          hint: error.hint,
          fullError: error
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in work-samples API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create work sample', details: error.toString() },
      { status: 500 }
    )
  }
}

// PUT - Update an existing work sample
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
    const { id, project_name, description, type_id, client, author_id, submitted_by, date, thumbnail_url, file_url, file_link, file_name } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Work sample ID is required' },
        { status: 400 }
      )
    }

    if (!project_name || !description) {
      return NextResponse.json(
        { error: 'Project name and description are required' },
        { status: 400 }
      )
    }

    // Verify author exists if specified
    const authorId = author_id || user.id
    if (author_id && author_id !== user.id) {
      const { data: authorProfile, error: authorError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', author_id)
        .single()

      if (authorError || !authorProfile) {
        return NextResponse.json(
          { error: 'Author profile not found', details: authorError?.message },
          { status: 400 }
        )
      }
    }

    // Use provided date or default to today
    const finalDate = date || new Date().toISOString().split('T')[0]

    // Handle submitted_by: 
    // - If explicitly set to empty string, use NULL
    // - If provided with a value, verify and use it
    // - If not provided at all, default to user.id
    let submittedById = user.id // Default to logged-in user
    if (submitted_by !== undefined && submitted_by !== null) {
      if (submitted_by.trim() === '') {
        // Explicitly left blank - use NULL
        submittedById = null
      } else {
        // Verify submitted_by user exists if specified
        const { data: submittedByProfile, error: submittedByError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', submitted_by)
          .single()

        if (submittedByError || !submittedByProfile) {
          return NextResponse.json(
            { error: 'Submitted by user profile not found', details: submittedByError?.message },
            { status: 400 }
          )
        }
        submittedById = submitted_by
      }
    }

    const updateData: any = {
      project_name,
      description,
      client: client || null,
      type_id: type_id || null,
      author_id: authorId,
      submitted_by: submittedById,
      date: finalDate,
      updated_at: new Date().toISOString(),
      thumbnail_url: thumbnail_url || null,
      file_url: file_url || null,
      file_link: file_link || null,
      file_name: file_name || null,
    }

    const { data, error } = await supabase
      .from('work_samples')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        project_name,
        description,
        type_id,
        client,
        author_id,
        date,
        created_by,
        submitted_by,
        created_at,
        updated_at,
        thumbnail_url,
        file_url,
        file_link,
        file_name,
        type:work_sample_types(id, name),
        author:profiles!author_id(id, email, full_name),
        created_by_profile:profiles!created_by(id, email, full_name),
        submitted_by_profile:profiles!submitted_by(id, email, full_name)
      `)
      .single()

    if (error) {
      console.error('Error updating work sample:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update work sample', 
          details: error.message, 
          code: error.code,
          hint: error.hint,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in work-samples API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update work sample', details: error.toString() },
      { status: 500 }
    )
  }
}

// DELETE - Delete a work sample
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
    const ids = searchParams.get('ids') // For bulk delete

    if (!id && !ids) {
      return NextResponse.json(
        { error: 'Work sample ID(s) required' },
        { status: 400 }
      )
    }

    let query = supabase.from('work_samples').delete()

    if (ids) {
      // Bulk delete
      const idArray = ids.split(',').map(id => id.trim())
      query = query.in('id', idArray)
    } else if (id) {
      query = query.eq('id', id)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting work sample:', error)
      return NextResponse.json(
        { 
          error: 'Failed to delete work sample', 
          details: error.message, 
          code: error.code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in work-samples API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete work sample', details: error.toString() },
      { status: 500 }
    )
  }
}

