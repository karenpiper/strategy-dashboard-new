import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Helper to get admin client for operations that need to bypass RLS
async function getSupabaseAdminClient() {
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// GET - Fetch all must reads with optional search and filter
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
    const submittedBy = searchParams.get('submitted_by')
    const assignedTo = searchParams.get('assigned_to')

    // Build query - use the column names that exist in the table
    // Include all possible columns to handle different table schemas
    let query = supabase
      .from('must_reads')
      .select(`
        id,
        title,
        article_title,
        url,
        article_url,
        notes,
        pinned,
        submitted_by,
        created_by,
        assigned_to,
        week_start_date,
        created_at,
        updated_at
      `)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (pinned === 'true') {
      query = query.eq('pinned', true)
    } else if (pinned === 'false') {
      query = query.eq('pinned', false)
    }

    if (submittedBy) {
      query = query.eq('submitted_by', submittedBy)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching must reads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch must reads', details: error.message },
        { status: 500 }
      )
    }

    // Map response to expected format (article_title, article_url)
    // Handle both old and new column name conventions
    let mappedData = (data || []).map((item: any) => ({
      ...item,
      article_title: item.title || item.article_title || '',
      article_url: item.url || item.article_url || '',
      // Ensure created_by is included if it exists
      created_by: item.created_by || item.submitted_by,
      submitted_by: item.submitted_by || item.created_by,
    }))

    // Apply search filter in memory (for title and notes)
    let filteredData = mappedData
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = filteredData.filter((item: any) => 
        item.article_title?.toLowerCase().includes(searchLower) ||
        item.notes?.toLowerCase().includes(searchLower) ||
        item.article_url?.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({ data: filteredData })
  } catch (error: any) {
    console.error('Error in must-reads API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch must reads', details: error.toString() },
      { status: 500 }
    )
  }
}

// POST - Create a new must read
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('User authenticated:', user.id)

    const body = await request.json()
    const { article_title, article_url, notes, pinned, assigned_to } = body

    console.log('Request body:', { article_title, article_url, notes, pinned, assigned_to })

    if (!article_title || !article_url) {
      return NextResponse.json(
        { error: 'Article title and URL are required' },
        { status: 400 }
      )
    }

    // Verify user exists in profiles table (required for foreign key)
    const { data: profileCheck, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (profileError || !profileCheck) {
      console.error('User profile not found:', profileError)
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile setup.', details: profileError?.message },
        { status: 400 }
      )
    }

    console.log('Profile check passed')

    // Test if table is accessible (try a simple select)
    const { error: tableTestError } = await supabase
      .from('must_reads')
      .select('id')
      .limit(1)

    if (tableTestError) {
      console.error('Table access test failed:', tableTestError)
      return NextResponse.json(
        { 
          error: 'Cannot access must_reads table', 
          details: tableTestError.message,
          code: tableTestError.code,
          hint: tableTestError.hint,
          fullError: tableTestError
        },
        { status: 500 }
      )
    }

    console.log('Table access test passed')

    // Verify assigned_to user exists if specified
    const assignedToId = (assigned_to && assigned_to.trim() !== '') ? assigned_to : user.id
    if (assigned_to && assigned_to.trim() !== '' && assigned_to !== user.id) {
      const { data: assignedProfile, error: assignedError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', assigned_to)
        .single()

      if (assignedError || !assignedProfile) {
        return NextResponse.json(
          { error: 'Assigned user profile not found', details: assignedError?.message },
          { status: 400 }
        )
      }
    }

    // Use the column names that exist in the table
    // Based on the error, the table has 'title', 'url', and 'week_start_date' columns
    // Calculate week_start_date (Monday of current week)
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // If Sunday, go back 6 days; otherwise go to Monday
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() + daysToMonday)
    weekStart.setHours(0, 0, 0, 0) // Start of day
    
    // Build insert data with all required fields
    // Based on errors, the table uses: title, url, week_start_date, created_by
    const insertData: any = {
      // Required fields based on errors
      title: article_title,  // Table uses 'title' not 'article_title'
      url: article_url,      // Table uses 'url' not 'article_url'
      created_by: user.id,   // Required field - who created the record
      week_start_date: weekStart.toISOString().split('T')[0], // Required - Monday of current week
      // Optional but commonly used fields
      notes: notes || null,
      pinned: pinned || false,
      submitted_by: user.id, // May or may not exist, but include it
      assigned_to: assignedToId,
      updated_at: new Date().toISOString(),
      // Include created_at in case it's not auto-generated
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('must_reads')
      .insert(insertData)
      .select(`
        id,
        title,
        article_title,
        url,
        article_url,
        notes,
        pinned,
        submitted_by,
        created_by,
        assigned_to,
        week_start_date,
        created_at,
        updated_at
      `)
      .single()

    // Map the response back to the expected format
    if (data) {
      data.article_title = data.title || data.article_title
      data.article_url = data.url || data.article_url
      // Ensure created_by is included
      data.created_by = data.created_by || data.submitted_by
      data.submitted_by = data.submitted_by || data.created_by
    }

    if (error) {
      console.error('Error creating must read:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { 
          error: 'Failed to create must read', 
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
    console.error('Error in must-reads API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create must read', details: error.toString() },
      { status: 500 }
    )
  }
}

// PUT - Update a must read
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
    const { id, article_title, article_url, notes, pinned, assigned_to } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    if (!article_title || !article_url) {
      return NextResponse.json(
        { error: 'Article title and URL are required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      title: article_title,  // Map to title column
      url: article_url,      // Map to url column
      notes: notes || null,
      pinned: pinned || false,
      updated_at: new Date().toISOString(),
    }

    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to || null
    }

    const { data, error } = await supabase
      .from('must_reads')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        title,
        article_title,
        url,
        article_url,
        notes,
        pinned,
        submitted_by,
        created_by,
        assigned_to,
        week_start_date,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Error updating must read:', error)
      return NextResponse.json(
        { error: 'Failed to update must read', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    // Map response to expected format
    if (data) {
      data.article_title = data.title || data.article_title
      data.article_url = data.url || data.article_url
      // Ensure created_by is included
      data.created_by = data.created_by || data.submitted_by
      data.submitted_by = data.submitted_by || data.created_by
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in must-reads API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update must read', details: error.toString() },
      { status: 500 }
    )
  }
}

// DELETE - Delete must read(s)
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
    let query = supabase.from('must_reads').delete()
    
    if (id) {
      query = query.eq('id', id)
    } else if (ids) {
      const idArray = ids.split(',').filter(Boolean)
      query = query.in('id', idArray)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting must read(s):', error)
      return NextResponse.json(
        { error: 'Failed to delete must read(s)', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in must-reads API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete must read(s)', details: error.toString() },
      { status: 500 }
    )
  }
}

