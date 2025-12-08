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

    // Prepare update data - exclude id and undefined values
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }
    
    // Only include defined fields from updates (exclude id)
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && updates[key] !== undefined) {
        updateData[key] = updates[key]
      }
    })

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

    // Ensure is_guest is a boolean (default to false if not provided)
    // Only set if the field exists in the request (don't force it if column doesn't exist yet)
    if ('is_guest' in updateData) {
      if (updateData.is_guest === undefined || updateData.is_guest === null) {
        updateData.is_guest = false
      } else {
        updateData.is_guest = Boolean(updateData.is_guest)
      }
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
      console.error('Update data:', JSON.stringify(updateData, null, 2))
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Error code:', error.code)
      console.error('Error hint:', error.hint)
      
      // Check if error is about missing column (various error patterns)
      const columnErrorPatterns = [
        'column',
        'does not exist',
        'unknown column',
        'no such column',
        'column "is_guest" does not exist'
      ]
      const isColumnError = error.message && columnErrorPatterns.some(pattern => 
        error.message.toLowerCase().includes(pattern.toLowerCase())
      )
      
      if (isColumnError) {
        return NextResponse.json({ 
          error: 'Failed to update profile', 
          details: error.message,
          code: error.code,
          hint: error.hint || 'The is_guest column may not exist yet. Please run the migration: supabase/add-is-guest-to-profiles.sql'
        }, { status: 500 })
      }
      
      // Check for constraint violations
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Failed to update profile', 
          details: error.message,
          code: error.code,
          hint: error.hint || 'A record with this value already exists'
        }, { status: 400 })
      }
      
      // Check for foreign key violations
      if (error.code === '23503') { // Foreign key constraint violation
        return NextResponse.json({ 
          error: 'Failed to update profile', 
          details: error.message,
          code: error.code,
          hint: error.hint || 'Referenced record does not exist'
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to update profile', 
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in profiles API PUT:', error)
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 })
  }
}

// POST - Create a new user (admin only)
export async function POST(request: NextRequest) {
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

    let body
    try {
      body = await request.json()
      console.log('Received request body:', JSON.stringify(body, null, 2))
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body', details: parseError.message }, { status: 400 })
    }

    const { email, password, ...profileData } = body

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Use admin client to create user
    let supabaseAdmin
    try {
      supabaseAdmin = await getSupabaseAdminClient()
    } catch (adminError: any) {
      console.error('Error creating admin client:', adminError)
      return NextResponse.json({ 
        error: 'Failed to initialize admin client', 
        details: adminError.message || 'Check SUPABASE_SERVICE_ROLE_KEY environment variable' 
      }, { status: 500 })
    }

    // Create auth user first
    let authUserId: string
    if (password && password.trim()) {
      // Create user with password
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password: password,
        email_confirm: true, // Auto-confirm email
      })

      if (authError) {
        console.error('Error creating auth user:', JSON.stringify(authError, null, 2))
        console.error('Auth error code:', authError.code)
        console.error('Auth error status:', authError.status)
        
        // Check if it's a trigger/database error
        const isTriggerError = authError.message?.includes('Database error') || authError.code === 'unexpected_failure'
        const errorDetails = isTriggerError 
          ? `The database trigger that creates profiles may be failing. Please run the SQL fix in supabase/fix-profile-trigger.sql in your Supabase SQL Editor. Original error: ${authError.message || 'Database error creating new user'}`
          : authError.message || 'Database error creating new user'
        
        return NextResponse.json({ 
          error: 'Failed to create user', 
          details: errorDetails,
          code: authError.code,
          status: authError.status
        }, { status: 500 })
      }

      if (!authData.user) {
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
      }

      authUserId = authData.user.id
    } else {
      // Create user without password (they'll need to reset password)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        email_confirm: true,
      })

      if (authError) {
        console.error('Error creating auth user:', JSON.stringify(authError, null, 2))
        console.error('Auth error code:', authError.code)
        console.error('Auth error status:', authError.status)
        
        // Check if it's a trigger/database error
        const isTriggerError = authError.message?.includes('Database error') || authError.code === 'unexpected_failure'
        const errorDetails = isTriggerError 
          ? `The database trigger that creates profiles may be failing. Please run the SQL fix in supabase/fix-profile-trigger.sql in your Supabase SQL Editor. Original error: ${authError.message || 'Database error creating new user'}`
          : authError.message || 'Database error creating new user'
        
        return NextResponse.json({ 
          error: 'Failed to create user', 
          details: errorDetails,
          code: authError.code,
          status: authError.status
        }, { status: 500 })
      }

      if (!authData.user) {
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
      }

      authUserId = authData.user.id
    }

    // Format birthday if provided
    if (profileData.birthday) {
      const birthdayRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/
      if (!birthdayRegex.test(profileData.birthday)) {
        // Clean up auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        return NextResponse.json({ error: 'Birthday must be in MM/DD format (e.g., 03/15)' }, { status: 400 })
      }
    }

    // Format start_date if provided
    if (profileData.start_date) {
      const date = new Date(profileData.start_date)
      if (isNaN(date.getTime())) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        return NextResponse.json({ error: 'Invalid start date format' }, { status: 400 })
      }
    }

    // Validate website URL if provided
    if (profileData.website && profileData.website.trim() !== '') {
      try {
        const url = profileData.website.startsWith('http://') || profileData.website.startsWith('https://') 
          ? profileData.website 
          : `https://${profileData.website}`
        new URL(url)
      } catch {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        return NextResponse.json({ error: 'Invalid website URL format' }, { status: 400 })
      }
    }

    // Validate base_role if provided
    if (profileData.base_role && !['user', 'contributor', 'leader', 'admin'].includes(profileData.base_role)) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ error: 'Invalid base_role' }, { status: 400 })
    }

    // Prepare profile data - only include valid profile fields
    const validProfileFields = [
      'full_name', 'avatar_url', 'birthday', 'discipline', 'role', 
      'bio', 'location', 'website', 'pronouns', 'slack_id', 'manager_id',
      'base_role', 'is_active', 'is_guest', 'special_access'
    ]
    
    const profileInsertData: any = {
      id: authUserId,
      email: email.trim(),
      base_role: profileData.base_role || 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    // Only include is_active if the field exists in the database
    if (profileData.is_active !== undefined) {
      profileInsertData.is_active = Boolean(profileData.is_active)
    }
    
    // Only include is_guest if the field exists in the database
    if (profileData.is_guest !== undefined) {
      profileInsertData.is_guest = Boolean(profileData.is_guest)
    } else {
      profileInsertData.is_guest = false // Default to false
    }
    
    // Add only valid profile fields from profileData
    validProfileFields.forEach(field => {
      if (profileData[field] !== undefined && profileData[field] !== null) {
        const value = profileData[field]
        // Convert empty strings to null for optional fields
        if (value === '') {
          profileInsertData[field] = null
        } else {
          profileInsertData[field] = value
        }
      }
    })

    // Wait a moment for the trigger to create the profile
    // The trigger creates a basic profile automatically when auth user is created
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check if profile exists (created by trigger)
    let existingProfile
    let attempts = 0
    const maxAttempts = 5
    
    while (attempts < maxAttempts) {
      const { data: profile, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle()
      
      if (profile) {
        existingProfile = profile
        break
      }
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for profile:', checkError)
        break
      }
      
      // Wait a bit longer and try again
      await new Promise(resolve => setTimeout(resolve, 300))
      attempts++
    }

    let newProfile
    
    // If profile exists, delete it first, then insert fresh
    // This avoids any trigger/constraint issues
    if (existingProfile) {
      console.log('Profile exists, deleting before insert:', authUserId)
      
      const { error: deleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', authUserId)

      if (deleteError) {
        console.error('Error deleting existing profile:', JSON.stringify(deleteError, null, 2))
        // Continue anyway - try to insert
      }
    }
    
    // Remove created_at - let the database set it automatically
    const { created_at, ...insertData } = profileInsertData
    
    // Insert the profile
    console.log('Inserting profile:', authUserId)
    
    const { data: createdProfile, error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert(insertData)
      .select('*')
      .single()

    if (profileInsertError) {
      console.error('Error inserting profile:', JSON.stringify(profileInsertError, null, 2))
      console.error('Profile insert data:', JSON.stringify(insertData, null, 2))
      
      // Clean up auth user if profile insert fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      } catch (cleanupError) {
        console.error('Error cleaning up auth user:', cleanupError)
      }
      
      return NextResponse.json({ 
        error: 'Failed to create profile', 
        details: `Database error: ${profileInsertError.message || 'Unknown error'}. Code: ${profileInsertError.code || 'UNKNOWN'}`,
        code: profileInsertError.code,
        hint: profileInsertError.hint
      }, { status: 500 })
    }
    
    newProfile = createdProfile

    return NextResponse.json({ data: newProfile }, { status: 201 })
  } catch (error: any) {
    console.error('Error in profiles API POST:', error)
    console.error('Error stack:', error.stack)
    console.error('Error type:', error.constructor?.name)
    console.error('Error message:', error.message)
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    
    // Extract more details from the error
    const errorMessage = error.message || 'Failed to create user'
    const errorDetails = error.details || error.toString()
    const errorCode = error.code || error.constructor?.name || 'UNKNOWN'
    
    return NextResponse.json({ 
      error: errorMessage,
      details: `Database error creating new user: ${errorDetails}`,
      code: errorCode,
      type: error.constructor?.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

