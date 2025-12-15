import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// No caching - always fetch fresh data
export const revalidate = 0
export const dynamic = 'force-dynamic'

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
    
    // Pagination parameters (optional)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 1000 // Default to large limit if not specified
    const offset = (page - 1) * limit

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
        file_name,
        pitch_won
      `, { count: 'exact' })

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

    // Apply pagination only if limit is specified and reasonable
    if (limitParam && limit < 10000) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: workSamplesData, error, count } = await query

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

    const response = NextResponse.json({ 
      data: filteredData,
      pagination: {
        total: count || filteredData.length,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false
      }
    })
    // No caching - always return fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
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
    const { project_name, description, type_id, client, author_id, date, thumbnail_url, file_url, file_link, file_name, pitch_won } = body

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
      pitch_won: pitch_won !== undefined ? pitch_won : false,
    }

    console.log('Creating work sample with data:', {
      project_name,
      description,
      author_id: authorId,
      created_by: user.id,
      date: finalDate,
      has_file_url: !!file_url,
      has_file_link: !!file_link,
    })

    // First, insert the data without complex joins to ensure insert succeeds
    const { data: insertedData, error: insertError } = await supabase
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
        pitch_won
      `)
      .single()

    if (insertError) {
      console.error('Error creating work sample:', {
        message: insertError.message,
        code: insertError.code,
        hint: insertError.hint,
        details: insertError.details,
        fullError: JSON.stringify(insertError, null, 2),
      })
      return NextResponse.json(
        { 
          error: 'Failed to create work sample', 
          details: insertError.message, 
          code: insertError.code,
          hint: insertError.hint,
          fullError: insertError
        },
        { status: 500 }
      )
    }

    if (!insertedData) {
      console.error('Insert succeeded but no data returned - this should not happen')
      return NextResponse.json(
        { 
          error: 'Work sample was created but no data was returned',
          details: 'Please check the database directly'
        },
        { status: 500 }
      )
    }

    console.log('Work sample created successfully:', {
      id: insertedData.id,
      project_name: insertedData.project_name,
      created_at: insertedData.created_at,
    })

    // Now fetch the related data separately to avoid join issues
    const enrichedData = { ...insertedData, type: null, author: null, created_by_profile: null }

    // Fetch type if type_id exists
    if (insertedData.type_id) {
      const { data: typeData } = await supabase
        .from('work_sample_types')
        .select('id, name')
        .eq('id', insertedData.type_id)
        .single()
      if (typeData) {
        enrichedData.type = typeData
      }
    }

    // Fetch author if author_id exists
    if (insertedData.author_id) {
      const { data: authorData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', insertedData.author_id)
        .single()
      if (authorData) {
        enrichedData.author = authorData
      }
    }

    // Fetch created_by profile if created_by exists
    if (insertedData.created_by) {
      const { data: createdByData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', insertedData.created_by)
        .single()
      if (createdByData) {
        enrichedData.created_by_profile = createdByData
      }
    }

    return NextResponse.json({ data: enrichedData })
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
    const { id, project_name, description, type_id, client, author_id, date, thumbnail_url, file_url, file_link, file_name, pitch_won } = body

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
      pitch_won: pitch_won !== undefined ? pitch_won : false,
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
        pitch_won,
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
    console.log('DELETE request received for work samples')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Authentication failed for DELETE request:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const ids = searchParams.get('ids') // For bulk delete

    console.log('Delete request params:', { id, ids, userId: user.id })

    if (!id && !ids) {
      console.error('No ID provided for delete')
      return NextResponse.json(
        { error: 'Work sample ID(s) required' },
        { status: 400 }
      )
    }

    // First, fetch the work samples to get their file URLs before deleting
    let workSamplesToDelete: any[] = []
    
    if (ids) {
      // Bulk delete - fetch all work samples
      const idArray = ids.split(',').map(id => id.trim())
      const { data, error: fetchError } = await supabase
        .from('work_samples')
        .select('id, file_url, file_name')
        .in('id', idArray)
      
      if (fetchError) {
        console.error('Error fetching work samples for deletion:', fetchError)
      } else {
        workSamplesToDelete = data || []
        console.log(`Fetched ${workSamplesToDelete.length} work samples for deletion`)
      }
    } else if (id) {
      // Single delete - fetch the work sample
      const { data, error: fetchError } = await supabase
        .from('work_samples')
        .select('id, file_url, file_name')
        .eq('id', id)
        .single()
      
      if (fetchError) {
        console.error('Error fetching work sample for deletion:', fetchError)
      } else if (data) {
        workSamplesToDelete = [data]
        console.log(`Fetched work sample for deletion:`, { id: data.id, file_url: data.file_url, file_name: data.file_name })
      }
    }

    // Delete files from Google Drive if file_url exists
    if (workSamplesToDelete.length > 0) {
      const { getGoogleDriveClient } = await import('@/lib/decks/config/googleDriveClient')
      
      try {
        const { drive } = getGoogleDriveClient()
        
        for (const workSample of workSamplesToDelete) {
          if (workSample.file_url) {
            // Extract Google Drive file ID from URL
            // Format: https://drive.google.com/file/d/{fileId}/view
            // Or: https://drive.google.com/file/d/{fileId}
            // Or: just the fileId itself
            let fileId: string | null = null
            
            // Try to extract from URL pattern
            const fileIdMatch = workSample.file_url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
            if (fileIdMatch && fileIdMatch[1]) {
              fileId = fileIdMatch[1]
            } else {
              // If it doesn't match the URL pattern, it might be just the file ID
              // Check if it looks like a file ID (alphanumeric with dashes/underscores, typically 33 chars)
              if (/^[a-zA-Z0-9_-]{20,}$/.test(workSample.file_url)) {
                fileId = workSample.file_url
              }
            }
            
            if (fileId) {
              try {
                console.log(`Attempting to delete Google Drive file: ${fileId} for work sample ${workSample.id}`)
                
                // First, try to get file metadata to verify it exists and check permissions
                try {
                  const fileMetadata = await drive.files.get({
                    fileId: fileId,
                    fields: 'id, name, owners, permissions',
                    supportsAllDrives: true,
                  } as any)
                  console.log(`File metadata retrieved:`, {
                    id: fileMetadata.data.id,
                    name: fileMetadata.data.name,
                    owners: fileMetadata.data.owners?.map((o: any) => o.emailAddress),
                  })
                } catch (metadataError: any) {
                  console.warn(`Could not retrieve file metadata (file may not exist or be inaccessible):`, {
                    message: metadataError.message,
                    code: metadataError.code,
                  })
                }
                
                // Now attempt deletion
                await drive.files.delete({
                  fileId: fileId,
                  supportsAllDrives: true,
                } as any)
                console.log(`✅ Successfully deleted Google Drive file: ${fileId} for work sample ${workSample.id}`)
              } catch (driveError: any) {
                // Log detailed error information
                console.error(`❌ Failed to delete Google Drive file ${fileId} for work sample ${workSample.id}:`, {
                  message: driveError.message,
                  code: driveError.code,
                  status: driveError.response?.status,
                  statusText: driveError.response?.statusText,
                  errors: driveError.errors || driveError.response?.data?.error,
                  fullError: JSON.stringify(driveError, null, 2),
                })
              }
            } else {
              console.warn(`Could not extract file ID from file_url: ${workSample.file_url} for work sample ${workSample.id}`)
            }
          } else {
            console.log(`No file_url found for work sample ${workSample.id}, skipping Google Drive deletion`)
          }
        }
      } catch (driveError: any) {
        // Log but don't fail - continue with database deletion even if Drive deletion fails
        console.warn('Error deleting files from Google Drive:', driveError.message)
      }
    }

    // Now delete from database
    let query = supabase.from('work_samples').delete()

    if (ids) {
      // Bulk delete
      const idArray = ids.split(',').map(id => id.trim())
      console.log(`Deleting ${idArray.length} work samples:`, idArray)
      query = query.in('id', idArray)
    } else if (id) {
      console.log(`Deleting work sample with ID: ${id}`)
      query = query.eq('id', id)
    }

    console.log('Executing delete query...')
    const { error, data } = await query
    console.log('Delete query result:', { error: error?.message, hasError: !!error, data })

    if (error) {
      console.error('Error deleting work sample:', error)
      const errorResponse = NextResponse.json(
        { 
          error: 'Failed to delete work sample', 
          details: error.message, 
          code: error.code,
        },
        { status: 500 }
      )
      // No caching for error responses
      errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      errorResponse.headers.set('Pragma', 'no-cache')
      return errorResponse
    }

    console.log(`Successfully deleted work sample(s): ${id || ids}`)
    const successResponse = NextResponse.json({ success: true })
    // No caching for delete responses
    successResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    successResponse.headers.set('Pragma', 'no-cache')
    successResponse.headers.set('Expires', '0')
    return successResponse
  } catch (error: any) {
    console.error('Error in work-samples API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete work sample', details: error.toString() },
      { status: 500 }
    )
  }
}

