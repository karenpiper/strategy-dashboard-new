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
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build query - select all possible columns to handle schema variations
    // Join with profiles to get submitted_by profile info
    let query = supabase
      .from('must_reads')
      .select(`
        id,
        article_title,
        title,
        article_url,
        url,
        notes,
        pinned,
        submitted_by,
        created_by,
        assigned_to,
        week_start_date,
        category,
        source,
        summary,
        tags,
        created_at,
        updated_at,
        submitted_by_profile:profiles!submitted_by(id, email, full_name),
        assigned_to_profile:profiles!assigned_to(id, email, full_name)
      `)

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

    // Apply sorting - always prioritize pinned items first
    query = query.order('pinned', { ascending: false })
    
    if (sortBy === 'article_title' || sortBy === 'title') {
      query = query.order('article_title', { ascending: sortOrder === 'asc' })
    } else if (sortBy === 'submitted_by') {
      // For submitted_by, we'll sort by profile name in memory after fetching
      query = query.order('submitted_by', { ascending: sortOrder === 'asc' })
    } else if (sortBy === 'created_at' || sortBy === 'date') {
      query = query.order('created_at', { ascending: sortOrder === 'asc' })
    } else {
      // Default: pinned first (already set), then by created_at
      query = query.order('created_at', { ascending: sortOrder === 'asc' })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching must reads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch must reads', details: error.message },
        { status: 500 }
      )
    }

    // Map response to expected format - prioritize article_title/article_url
    // Handle both old and new column name conventions
    let mappedData = (data || []).map((item: any) => ({
      ...item,
      // Prioritize article_title/article_url (what table actually uses)
      article_title: item.article_title || item.title || '',
      article_url: item.article_url || item.url || '',
      // Use submitted_by as-is (don't mix with created_by)
      submitted_by: item.submitted_by || null,
      created_by: item.created_by || null,
    }))

    // Apply search filter in memory (search all fields)
    let filteredData = mappedData
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = filteredData.filter((item: any) => {
        const titleMatch = item.article_title?.toLowerCase().includes(searchLower)
        const urlMatch = item.article_url?.toLowerCase().includes(searchLower)
        const notesMatch = item.notes?.toLowerCase().includes(searchLower)
        const categoryMatch = item.category?.toLowerCase().includes(searchLower)
        const sourceMatch = item.source?.toLowerCase().includes(searchLower)
        const summaryMatch = item.summary?.toLowerCase().includes(searchLower)
        const tagsMatch = Array.isArray(item.tags) && item.tags.some((tag: string) => 
          tag.toLowerCase().includes(searchLower)
        )
        const submittedByName = item.submitted_by_profile?.full_name?.toLowerCase().includes(searchLower)
        const submittedByEmail = item.submitted_by_profile?.email?.toLowerCase().includes(searchLower)
        
        return titleMatch || urlMatch || notesMatch || categoryMatch || sourceMatch || 
               summaryMatch || tagsMatch || submittedByName || submittedByEmail
      })
    }

    // Apply sorting for submitted_by (by profile name) if needed
    if (sortBy === 'submitted_by') {
      filteredData.sort((a: any, b: any) => {
        const aName = a.submitted_by_profile?.full_name || a.submitted_by_profile?.email || ''
        const bName = b.submitted_by_profile?.full_name || b.submitted_by_profile?.email || ''
        const comparison = aName.localeCompare(bName)
        return sortOrder === 'asc' ? comparison : -comparison
      })
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
    const { article_title, article_url, notes, pinned, assigned_to, submitted_by, week_start_date, category, source, summary, tags } = body

    console.log('Request body:', { article_title, article_url, notes, pinned, assigned_to, submitted_by, week_start_date, category, source, summary, tags })

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

    // Set submitted_by - can be null/empty if not specified
    const submittedById = submitted_by && submitted_by.trim() !== '' ? submitted_by : null

    // Verify submitted_by user exists if specified
    if (submitted_by && submitted_by.trim() !== '') {
      const { data: submittedProfile, error: submittedError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', submitted_by)
        .single()

      if (submittedError || !submittedProfile) {
        return NextResponse.json(
          { error: 'Submitted by user profile not found', details: submittedError?.message },
          { status: 400 }
        )
      }
    }

    // Verify assigned_to user exists if specified
    const assignedToId = (assigned_to && assigned_to.trim() !== '') ? assigned_to : null
    if (assigned_to && assigned_to.trim() !== '') {
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

    // Use provided week_start_date or calculate it (Monday of current week)
    let finalWeekStartDate = week_start_date
    if (!finalWeekStartDate) {
      const today = new Date()
      const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // If Sunday, go back 6 days; otherwise go to Monday
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() + daysToMonday)
      weekStart.setHours(0, 0, 0, 0) // Start of day
      finalWeekStartDate = weekStart.toISOString().split('T')[0] // Format as YYYY-MM-DD
    }
    
    // Build insert data with ALL possible required fields
    // Based on errors, the table uses: article_title, article_url, week_start_date, created_by
    // Include both column name variations to handle schema differences
    const insertData: any = {
      // Required fields - use article_title/article_url as primary (based on latest error)
      article_title: article_title,
      article_url: article_url,
      // Also include title/url in case table has both or uses different names
      title: article_title,
      url: article_url,
      // Required user fields
      created_by: user.id,   // Required - who created the record
      submitted_by: submittedById, // Default to logged-in user
      // Required date fields
      week_start_date: finalWeekStartDate, // Use provided date or calculated Monday
      // Optional fields
      notes: notes || null,
      pinned: pinned || false,
      assigned_to: assignedToId,
      // New fields
      category: category || null,
      source: source || null,
      summary: summary || null,
      tags: tags && Array.isArray(tags) ? tags : null,
      // Timestamps
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(), // In case it's not auto-generated
    }

    const { data, error } = await supabase
      .from('must_reads')
      .insert(insertData)
      .select(`
        id,
        article_title,
        title,
        article_url,
        url,
        notes,
        pinned,
        submitted_by,
        created_by,
        assigned_to,
        week_start_date,
        category,
        source,
        summary,
        tags,
        created_at,
        updated_at
      `)
      .single()

    // Map the response back to the expected format - prioritize article_title/article_url
    if (data) {
      // Prioritize article_title/article_url (what table actually uses)
      data.article_title = data.article_title || data.title || ''
      data.article_url = data.article_url || data.url || ''
      // Use submitted_by as-is (don't mix with created_by)
      data.submitted_by = data.submitted_by || null
      data.created_by = data.created_by || null
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
    const { id, article_title, article_url, notes, pinned, assigned_to, submitted_by, week_start_date, category, source, summary, tags } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    // If only pinned is being updated (pin toggle), allow it without requiring title/url
    const isPinOnlyUpdate = pinned !== undefined && article_title === undefined && article_url === undefined

    if (!isPinOnlyUpdate && (!article_title || !article_url)) {
      return NextResponse.json(
        { error: 'Article title and URL are required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Only update fields that are provided
    if (article_title !== undefined) {
      updateData.article_title = article_title
      updateData.title = article_title
    }
    if (article_url !== undefined) {
      updateData.article_url = article_url
      updateData.url = article_url
    }
    if (notes !== undefined) {
      updateData.notes = notes || null
    }
    if (pinned !== undefined) {
      updateData.pinned = pinned || false
    }
    if (submitted_by !== undefined) {
      updateData.submitted_by = submitted_by || null
    }

    // Include week_start_date if provided
    if (week_start_date) {
      updateData.week_start_date = week_start_date
    }

    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to || null
    }

    // Include new fields if provided
    if (category !== undefined) {
      updateData.category = category || null
    }
    if (source !== undefined) {
      updateData.source = source || null
    }
    if (summary !== undefined) {
      updateData.summary = summary || null
    }
    if (tags !== undefined) {
      updateData.tags = tags && Array.isArray(tags) ? tags : null
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
        category,
        source,
        summary,
        tags,
        created_at,
        updated_at,
        submitted_by_profile:profiles!submitted_by(id, email, full_name),
        assigned_to_profile:profiles!assigned_to(id, email, full_name)
      `)
      .single()

    if (error) {
      console.error('Error updating must read:', error)
      return NextResponse.json(
        { error: 'Failed to update must read', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    // Map response to expected format - prioritize article_title/article_url
    if (data) {
      // Prioritize article_title/article_url (what table actually uses)
      data.article_title = data.article_title || data.title || ''
      data.article_url = data.article_url || data.url || ''
      // Use submitted_by as-is (don't mix with created_by)
      data.submitted_by = data.submitted_by || null
      data.created_by = data.created_by || null
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

