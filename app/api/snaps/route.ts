import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Cache configuration: 5 minutes for snaps
export const revalidate = 300

// GET - Fetch snaps with optional filters
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
    const mentionedUserId = searchParams.get('mentioned_user_id')
    const submittedBy = searchParams.get('submitted_by')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    // Build query - join with profiles to get submitter and mentioned user info
    // Also join with snap_recipients to get all recipients
    let query = supabase
      .from('snaps')
      .select(`
        id,
        date,
        snap_content,
        mentioned,
        mentioned_user_id,
        submitted_by,
        created_at,
        updated_at,
        submitted_by_profile:profiles!submitted_by(id, email, full_name, avatar_url),
        mentioned_user_profile:profiles!mentioned_user_id(id, email, full_name, avatar_url),
        recipients:snap_recipients(
          user_id,
          recipient_profile:profiles!user_id(id, email, full_name, avatar_url)
        )
      `)

    // Apply filters
    if (mentionedUserId) {
      // Check both the old mentioned_user_id field and the new junction table
      // First, get snap IDs from the junction table
      const { data: recipientSnaps } = await supabase
        .from('snap_recipients')
        .select('snap_id')
        .eq('user_id', mentionedUserId)
      
      const recipientSnapIds = recipientSnaps?.map(r => r.snap_id) || []
      
      // Query snaps that either have mentioned_user_id OR are in the junction table
      if (recipientSnapIds.length > 0) {
        // Combine both conditions: check mentioned_user_id OR id in recipientSnapIds
        query = query.or(`mentioned_user_id.eq.${mentionedUserId},id.in.(${recipientSnapIds.join(',')})`)
      } else {
        // Only check mentioned_user_id if no junction table entries found
        query = query.eq('mentioned_user_id', mentionedUserId)
      }
    }

    if (submittedBy) {
      query = query.eq('submitted_by', submittedBy)
    }

    // Apply sorting - most recent first
    query = query.order('date', { ascending: false })
    query = query.order('created_at', { ascending: false })

    // Apply limit and offset
    if (limit) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching snaps:', error)
      return NextResponse.json(
        { error: 'Failed to fetch snaps', details: error.message },
        { status: 500 }
      )
    }

    const response = NextResponse.json({ data: data || [] })
    // Add cache headers for client-side caching
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return response
  } catch (error: any) {
    console.error('Error in snaps API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch snaps', details: error.toString() },
      { status: 500 }
    )
  }
}

// POST - Create a new snap
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
    const { snap_content, mentioned, mentioned_user_ids, submit_anonymously, date, submitted_by, admin_mode } = body

    if (!snap_content || !snap_content.trim()) {
      return NextResponse.json(
        { error: 'Snap content is required' },
        { status: 400 }
      )
    }

    // Verify user exists in profiles table
    const { data: profileCheck, error: profileError } = await supabase
      .from('profiles')
      .select('id, base_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profileCheck) {
      console.error('User profile not found:', profileError)
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile setup.' },
        { status: 400 }
      )
    }

    // Check if admin mode is allowed (only admins can use admin_mode)
    const isAdmin = profileCheck.base_role === 'admin'
    if (admin_mode && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can create snaps on behalf of other users' },
        { status: 403 }
      )
    }

    // Determine who submitted the snap
    let finalSubmittedBy: string | null = null
    if (admin_mode) {
      // Admin mode: use submitted_by if provided, otherwise null (anonymous)
      if (submitted_by) {
        // Verify the submitted_by user exists
        const { data: submittedByUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', submitted_by)
          .single()

        if (!submittedByUser) {
          return NextResponse.json(
            { error: 'Invalid user selected for "from" field' },
            { status: 400 }
          )
        }
        finalSubmittedBy = submitted_by
      }
      // If submitted_by is null/undefined in admin mode, finalSubmittedBy remains null (anonymous)
    } else if (!submit_anonymously) {
      // Regular user creating their own snap
      finalSubmittedBy = user.id
    }
    // If submit_anonymously is true and not admin mode, finalSubmittedBy remains null

    // Handle multiple recipients: use mentioned_user_ids array if provided, otherwise fall back to mentioned
    let recipientUserIds: string[] = []
    
    if (mentioned_user_ids && Array.isArray(mentioned_user_ids) && mentioned_user_ids.length > 0) {
      // Use the provided array of user IDs
      recipientUserIds = mentioned_user_ids.filter((id: string) => id && id.trim())
    } else if (mentioned && mentioned.trim()) {
      // Legacy: Try to match mentioned name to a user profile
      const { data: mentionedUser } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', `%${mentioned.trim()}%`)
        .limit(1)
        .maybeSingle()

      if (mentionedUser) {
        recipientUserIds = [mentionedUser.id]
      }
    }

    // Use first recipient for backward compatibility with mentioned_user_id field
    const firstRecipientId = recipientUserIds.length > 0 ? recipientUserIds[0] : null

    // Prepare snap data
    const snapData: any = {
      snap_content: snap_content.trim(),
      mentioned: mentioned?.trim() || null,
      mentioned_user_id: firstRecipientId, // Keep for backward compatibility
      submitted_by: finalSubmittedBy, // Use the determined submitted_by value
      from_user_id: admin_mode ? finalSubmittedBy || user.id : user.id, // In admin mode, use the selected user, otherwise the logged-in admin
      to_user_id: firstRecipientId || user.id, // Recipient or fallback to user
      message: snap_content.trim(), // Also set message field
      date: date || new Date().toISOString().split('T')[0], // Use provided date or today
    }

    const { data: newSnap, error: insertError } = await supabase
      .from('snaps')
      .insert(snapData)
      .select(`
        id,
        date,
        snap_content,
        mentioned,
        mentioned_user_id,
        submitted_by,
        created_at,
        updated_at,
        submitted_by_profile:profiles!submitted_by(id, email, full_name, avatar_url),
        mentioned_user_profile:profiles!mentioned_user_id(id, email, full_name, avatar_url)
      `)
      .single()

    if (insertError) {
      console.error('Error creating snap:', insertError)
      return NextResponse.json(
        { error: 'Failed to create snap', details: insertError.message },
        { status: 500 }
      )
    }

    // Create entries in snap_recipients junction table for all recipients
    if (recipientUserIds.length > 0 && newSnap) {
      const recipientEntries = recipientUserIds.map(userId => ({
        snap_id: newSnap.id,
        user_id: userId
      }))

      const { error: recipientsError } = await supabase
        .from('snap_recipients')
        .insert(recipientEntries)

      if (recipientsError) {
        console.error('Error creating snap recipients:', recipientsError)
        // Don't fail the request, but log the error
      }
    }

    // Fetch the complete snap with recipients
    const { data: completeSnap, error: fetchError } = await supabase
      .from('snaps')
      .select(`
        id,
        date,
        snap_content,
        mentioned,
        mentioned_user_id,
        submitted_by,
        created_at,
        updated_at,
        submitted_by_profile:profiles!submitted_by(id, email, full_name, avatar_url),
        mentioned_user_profile:profiles!mentioned_user_id(id, email, full_name, avatar_url),
        recipients:snap_recipients(
          user_id,
          recipient_profile:profiles!user_id(id, email, full_name, avatar_url)
        )
      `)
      .eq('id', newSnap.id)
      .single()

    return NextResponse.json({ data: completeSnap || newSnap }, { status: 201 })
  } catch (error: any) {
    console.error('Error in snaps POST API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create snap', details: error.toString() },
      { status: 500 }
    )
  }
}

