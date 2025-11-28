import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get Supabase admin client (bypasses RLS)
async function getSupabaseAdminClient() {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// GET - Fetch all user profiles (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('base_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.base_role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Use admin client to fetch all profiles (bypasses RLS)
    const supabaseAdmin = await getSupabaseAdminClient()
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('Error fetching profiles:', error)
      return NextResponse.json({ error: 'Failed to fetch profiles', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: profiles || [] })
  } catch (error: any) {
    console.error('Error in profiles API GET:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch profiles' }, { status: 500 })
  }
}

// PUT - Update a user profile (admin only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('base_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.base_role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Format birthday if provided (MM/DD format)
    if (updates.birthday) {
      const birthdayRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/
      if (!birthdayRegex.test(updates.birthday)) {
        return NextResponse.json({ error: 'Birthday must be in MM/DD format (e.g., 03/15)' }, { status: 400 })
      }
    }

    // Format start_date if provided
    if (updates.start_date) {
      // Ensure it's a valid date string (YYYY-MM-DD)
      const date = new Date(updates.start_date)
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid start date format' }, { status: 400 })
      }
    }

    // Validate website URL if provided
    if (updates.website && updates.website.trim() !== '') {
      try {
        const url = updates.website.startsWith('http://') || updates.website.startsWith('https://') 
          ? updates.website 
          : `https://${updates.website}`
        new URL(url)
      } catch {
        return NextResponse.json({ error: 'Invalid website URL format' }, { status: 400 })
      }
    }

    // Validate base_role if provided
    if (updates.base_role && !['user', 'contributor', 'leader', 'admin'].includes(updates.base_role)) {
      return NextResponse.json({ error: 'Invalid base_role' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // Convert empty strings to null for optional fields
    const optionalFields = ['full_name', 'avatar_url', 'birthday', 'discipline', 'role', 'bio', 'location', 'website', 'pronouns', 'slack_id', 'manager_id']
    optionalFields.forEach(field => {
      if (updateData[field] === '') {
        updateData[field] = null
      }
    })
    
    // Prevent circular references (person can't be their own manager)
    if (updateData.manager_id === id) {
      return NextResponse.json({ error: 'A person cannot be their own manager' }, { status: 400 })
    }
    
    // Ensure is_active is a boolean (default to true if not provided)
    if (updateData.is_active === undefined || updateData.is_active === null) {
      updateData.is_active = true
    } else {
      updateData.is_active = Boolean(updateData.is_active)
    }

    // Use admin client to update profile (bypasses RLS)
    const supabaseAdmin = await getSupabaseAdminClient()
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: 'Failed to update profile', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in profiles API PUT:', error)
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 })
  }
}

