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
    const client = searchParams.get('client')
    const sortBy = searchParams.get('sortBy') || 'date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build query - fetch base data first, then enrich with related data
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
        created_at,
        updated_at,
        thumbnail_url,
        file_url,
        file_link,
        file_name
      `)

    // Apply sorting
    const isAscending = sortOrder?.toLowerCase() === 'asc'
    
    if (sortBy === 'project_name' || sortBy === 'name') {
      query = query.order('project_name', { ascending: isAscending })
    } else if (sortBy === 'author_id') {
      query = query.order('author_id', { ascending: isAscending })
    } else if (sortBy === 'date') {
      // Sort by date field - desc means newest first (ascending: false)
      query = query.order('date', { ascending: isAscending })
    } else if (sortBy === 'client') {
      query = query.order('client', { ascending: isAscending })
    } else if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: isAscending })
    } else {
      // Default sorting - newest first
      query = query.order('date', { ascending: false })
    }

    // Apply filters
    if (typeId) {
      query = query.eq('type_id', typeId)
    }

    if (authorId) {
      query = query.eq('author_id', authorId)
    }

    if (client) {
      query = query.eq('client', client)
    }

    const { data: workSamplesData, error } = await query

    if (error) {
      console.error('Error fetching work samples:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Failed to fetch work samples', details: error.message, code: error.code, hint: error.hint },
        { status: 500 }
      )
    }

    console.log(`Fetched ${workSamplesData?.length || 0} work samples`)

    // Fetch related data separately
    const typeIds = [...new Set((workSamplesData || []).map((item: any) => item.type_id).filter(Boolean))]
    const authorIds = [...new Set((workSamplesData || []).map((item: any) => item.author_id).filter(Boolean))]
    const createdByIds = [...new Set((workSamplesData || []).map((item: any) => item.created_by).filter(Boolean))]

    // Fetch related data with proper error handling
    let typesResult = { data: [] as any[], error: null as any }
    let authorsResult = { data: [] as any[], error: null as any }
    let createdByResult = { data: [] as any[], error: null as any }

    if (typeIds.length > 0) {
      const result = await supabase.from('work_sample_types').select('id, name').in('id', typeIds)
      if (result.error) {
        console.error('Error fetching work sample types:', result.error)
      } else {
        typesResult = result
      }
    }

    if (authorIds.length > 0) {
      const result = await supabase.from('profiles').select('id, email, full_name').in('id', authorIds)
      if (result.error) {
        console.error('Error fetching authors:', result.error)
      } else {
        authorsResult = result
      }
    }

    if (createdByIds.length > 0) {
      const result = await supabase.from('profiles').select('id, email, full_name').in('id', createdByIds)
      if (result.error) {
        console.error('Error fetching created by profiles:', result.error)
      } else {
        createdByResult = result
      }
    }

    const typesMap = new Map((typesResult.data || []).map((t: any) => [t.id, t]))
    const authorsMap = new Map((authorsResult.data || []).map((a: any) => [a.id, a]))
    const createdByMap = new Map((createdByResult.data || []).map((c: any) => [c.id, c]))

    const enrichedData = (workSamplesData || []).map((item: any) => ({
      ...item,
      type: item.type_id ? typesMap.get(item.type_id) : null,
      author: item.author_id ? authorsMap.get(item.author_id) : null,
      created_by_profile: item.created_by ? createdByMap.get(item.created_by) : null
    }))

    // Apply search filter in memory (for project_name, description, client)
    let filteredData = enrichedData
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = filteredData.filter((item: any) => 
        item.project_name?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.client?.toLowerCase().includes(searchLower)
      )
    }

    // Apply client-side sorting for author (since it's a foreign key relationship)
    if (sortBy === 'author_id') {
      filteredData.sort((a: any, b: any) => {
        const authorA = a.author?.full_name || a.author?.email || ''
        const authorB = b.author?.full_name || b.author?.email || ''
        const comparison = authorA.localeCompare(authorB)
        return sortOrder === 'asc' ? comparison : -comparison
      })
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
    const { project_name, description, type_id, client, author_id, date, thumbnail_url, file_url, file_link, file_name } = body

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

    // created_by tracks who originally created the record
    const insertData: any = {
      project_name,
      description,
      client: client || null,
      type_id: type_id || null,
      author_id: authorId,
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
        created_at,
        updated_at,
        thumbnail_url,
        file_url,
        file_link,
        file_name,
        type:work_sample_types(id, name),
        author:profiles!author_id(id, email, full_name),
        created_by_profile:profiles!created_by(id, email, full_name)
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
    const { id, project_name, description, type_id, client, author_id, date, thumbnail_url, file_url, file_link, file_name } = body

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

    // created_by is not updated - it always keeps the original creator
    // This field is set automatically on create and cannot be changed

    const updateData: any = {
      project_name,
      description,
      client: client || null,
      type_id: type_id || null,
      author_id: authorId,
      date: finalDate,
      updated_at: new Date().toISOString(),
      thumbnail_url: thumbnail_url || null,
      file_url: file_url || null,
      file_link: file_link || null,
      file_name: file_name || null,
    }

    // created_by is not included in update - keeps original value

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
        created_at,
        updated_at,
        thumbnail_url,
        file_url,
        file_link,
        file_name,
        type:work_sample_types(id, name),
        author:profiles!author_id(id, email, full_name),
        created_by_profile:profiles!created_by(id, email, full_name)
      `)
      .single()

    if (error) {
      console.error('Error updating work sample:', error)
      console.error('Update data:', updateData)
      console.error('Request body:', body)
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

