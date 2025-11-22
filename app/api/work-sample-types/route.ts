import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all work sample types (alphabetically sorted)
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

    const { data, error } = await supabase
      .from('work_sample_types')
      .select('id, name, created_at')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching work sample types:', error)
      return NextResponse.json(
        { error: 'Failed to fetch work sample types', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error('Error in work-sample-types API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch work sample types', details: error.toString() },
      { status: 500 }
    )
  }
}

// POST - Create a new work sample type
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
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Type name is required' },
        { status: 400 }
      )
    }

    // Trim and capitalize first letter
    const trimmedName = name.trim()
    const capitalizedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1)

    const { data, error } = await supabase
      .from('work_sample_types')
      .insert({ name: capitalizedName })
      .select('id, name, created_at')
      .single()

    if (error) {
      // If it's a unique constraint violation, the type already exists
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This type already exists', details: error.message },
          { status: 409 }
        )
      }
      console.error('Error creating work sample type:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create work sample type', 
          details: error.message, 
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in work-sample-types API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create work sample type', details: error.toString() },
      { status: 500 }
    )
  }
}

