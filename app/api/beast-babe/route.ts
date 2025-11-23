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

// GET - Fetch current beast babe and full history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const supabaseAdmin = await getSupabaseAdminClient()

    // Find current beast babe (user with 'beast_babe' in special_access)
    // Fetch all profiles and filter in JavaScript (more reliable than array contains query)
    const { data: allProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, discipline, special_access')
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch profiles', details: profilesError.message }, { status: 500 })
    }
    
    const profiles = (allProfiles || []).filter((p: any) => 
      Array.isArray(p.special_access) && p.special_access.includes('beast_babe')
    )

    const currentBeastBabe = profiles && profiles.length > 0 ? profiles[0] : null

    // Get the most recent history entry for current beast babe
    let currentBeastBabeHistory = null
    if (currentBeastBabe) {
      const { data: historyData } = await supabaseAdmin
        .from('beast_babe_history')
        .select('*')
        .eq('user_id', currentBeastBabe.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      currentBeastBabeHistory = historyData
    }

    // Fetch full history with user details
    const { data: history, error: historyError } = await supabaseAdmin
      .from('beast_babe_history')
      .select(`
        *,
        user:profiles!beast_babe_history_user_id_fkey(id, email, full_name, avatar_url, role, discipline),
        passed_by:profiles!beast_babe_history_passed_by_user_id_fkey(id, email, full_name, avatar_url)
      `)
      .order('date', { ascending: false })

    if (historyError) {
      console.error('Error fetching beast babe history:', historyError)
      return NextResponse.json({ error: 'Failed to fetch history', details: historyError.message }, { status: 500 })
    }

    return NextResponse.json({
      currentBeastBabe: currentBeastBabe ? {
        ...currentBeastBabe,
        history: currentBeastBabeHistory
      } : null,
      history: history || []
    })
  } catch (error: any) {
    console.error('Error in beast babe API GET:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch beast babe data' }, { status: 500 })
  }
}

// POST - Pass the torch to next person
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check user permissions (must be beast babe or admin)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('base_role, special_access')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    const isBeastBabe = profile.special_access?.includes('beast_babe') || false
    const isAdmin = profile.base_role === 'admin'

    if (!isBeastBabe && !isAdmin) {
      return NextResponse.json({ error: 'Only the current Beast Babe or an admin can pass the torch' }, { status: 403 })
    }

    const body = await request.json()
    const { newBeastBabeUserId, achievement } = body

    if (!newBeastBabeUserId) {
      return NextResponse.json({ error: 'New beast babe user ID is required' }, { status: 400 })
    }

    const supabaseAdmin = await getSupabaseAdminClient()

    // Verify the new user exists
    const { data: newUser, error: newUserError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', newBeastBabeUserId)
      .single()

    if (newUserError || !newUser) {
      return NextResponse.json({ error: 'New beast babe user not found' }, { status: 404 })
    }

    // Don't allow passing to yourself
    if (newBeastBabeUserId === user.id) {
      return NextResponse.json({ error: 'You cannot pass the torch to yourself' }, { status: 400 })
    }

    // Get current beast babe (if any)
    // Fetch all profiles and filter in JavaScript
    const { data: allCurrentProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, special_access')
    
    const currentBeastBabeProfiles = (allCurrentProfiles || []).filter((p: any) => 
      Array.isArray(p.special_access) && p.special_access.includes('beast_babe')
    )

    const currentBeastBabeId = currentBeastBabeProfiles && currentBeastBabeProfiles.length > 0 
      ? currentBeastBabeProfiles[0].id 
      : null

    // Remove beast_babe from current user's special_access (if they are the current beast babe)
    if (currentBeastBabeId) {
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles')
        .select('special_access')
        .eq('id', currentBeastBabeId)
        .single()

      if (currentProfile && currentProfile.special_access) {
        const updatedSpecialAccess = (currentProfile.special_access as string[]).filter(
          (access: string) => access !== 'beast_babe'
        )

        const { error: removeError } = await supabaseAdmin
          .from('profiles')
          .update({ special_access: updatedSpecialAccess })
          .eq('id', currentBeastBabeId)

        if (removeError) {
          console.error('Error removing beast_babe from current user:', removeError)
          return NextResponse.json({ error: 'Failed to remove beast_babe from current user' }, { status: 500 })
        }
      }
    }

    // Add beast_babe to new user's special_access
    const { data: newUserProfile } = await supabaseAdmin
      .from('profiles')
      .select('special_access')
      .eq('id', newBeastBabeUserId)
      .single()

    if (!newUserProfile) {
      return NextResponse.json({ error: 'Failed to fetch new user profile' }, { status: 500 })
    }

    const currentSpecialAccess = (newUserProfile.special_access as string[]) || []
    const updatedSpecialAccess = currentSpecialAccess.includes('beast_babe')
      ? currentSpecialAccess
      : [...currentSpecialAccess, 'beast_babe']

    const { error: addError } = await supabaseAdmin
      .from('profiles')
      .update({ special_access: updatedSpecialAccess })
      .eq('id', newBeastBabeUserId)

    if (addError) {
      console.error('Error adding beast_babe to new user:', addError)
      return NextResponse.json({ error: 'Failed to add beast_babe to new user' }, { status: 500 })
    }

    // Create history entry
    const { data: historyEntry, error: historyError } = await supabaseAdmin
      .from('beast_babe_history')
      .insert({
        date: new Date().toISOString().split('T')[0], // Today's date
        user_id: newBeastBabeUserId,
        achievement: achievement || `Passed the torch from ${user.id === currentBeastBabeId ? 'the previous Beast Babe' : 'an admin'}`,
        passed_by_user_id: user.id,
      })
      .select(`
        *,
        user:profiles!beast_babe_history_user_id_fkey(id, email, full_name, avatar_url, role, discipline),
        passed_by:profiles!beast_babe_history_passed_by_user_id_fkey(id, email, full_name, avatar_url)
      `)
      .single()

    if (historyError) {
      console.error('Error creating history entry:', historyError)
      return NextResponse.json({ error: 'Failed to create history entry', details: historyError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Beast Babe torch passed to ${newUser.full_name || newUser.email}`,
      historyEntry
    })
  } catch (error: any) {
    console.error('Error in beast babe API POST:', error)
    return NextResponse.json({ error: error.message || 'Failed to pass beast babe torch' }, { status: 500 })
  }
}

