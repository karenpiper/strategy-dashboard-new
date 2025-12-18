import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT/PATCH - Update a snap
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profileCheck, error: profileError } = await supabase
      .from('profiles')
      .select('id, base_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profileCheck) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      )
    }

    const isAdmin = profileCheck.base_role === 'admin'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can update snaps' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { snap_content, mentioned, mentioned_user_ids, submitted_by, date } = body

    if (!snap_content || !snap_content.trim()) {
      return NextResponse.json(
        { error: 'Snap content is required' },
        { status: 400 }
      )
    }

    // Verify the snap exists
    const { data: existingSnap, error: fetchError } = await supabase
      .from('snaps')
      .select('id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingSnap) {
      return NextResponse.json(
        { error: 'Snap not found' },
        { status: 404 }
      )
    }

    // Handle recipients
    let recipientUserIds: string[] = []
    
    if (mentioned_user_ids && Array.isArray(mentioned_user_ids) && mentioned_user_ids.length > 0) {
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

    const firstRecipientId = recipientUserIds.length > 0 ? recipientUserIds[0] : null

    // Prepare update data
    const updateData: any = {
      snap_content: snap_content.trim(),
      mentioned: mentioned?.trim() || null,
      mentioned_user_id: firstRecipientId,
      updated_at: new Date().toISOString(),
    }

    // Only update submitted_by if provided
    if (submitted_by !== undefined) {
      if (submitted_by === null) {
        updateData.submitted_by = null
      } else {
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
        updateData.submitted_by = submitted_by
      }
    }

    // Update date if provided
    if (date) {
      updateData.date = date
    }

    // Update the snap
    const { data: updatedSnap, error: updateError } = await supabase
      .from('snaps')
      .update(updateData)
      .eq('id', params.id)
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

    if (updateError) {
      console.error('Error updating snap:', updateError)
      return NextResponse.json(
        { error: 'Failed to update snap', details: updateError.message },
        { status: 500 }
      )
    }

    // Update recipients in junction table
    // First, delete existing recipients
    const { error: deleteRecipientsError } = await supabase
      .from('snap_recipients')
      .delete()
      .eq('snap_id', params.id)

    if (deleteRecipientsError) {
      console.error('Error deleting snap recipients:', deleteRecipientsError)
    }

    // Then, insert new recipients
    if (recipientUserIds.length > 0) {
      const recipientEntries = recipientUserIds.map(userId => ({
        snap_id: params.id,
        user_id: userId
      }))

      const { error: recipientsError } = await supabase
        .from('snap_recipients')
        .insert(recipientEntries)

      if (recipientsError) {
        console.error('Error updating snap recipients:', recipientsError)
      }
    }

    // Fetch the complete snap with recipients
    const { data: completeSnap, error: fetchCompleteError } = await supabase
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
      .eq('id', params.id)
      .single()

    return NextResponse.json({ data: completeSnap || updatedSnap })
  } catch (error: any) {
    console.error('Error in snaps PUT API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update snap', details: error.toString() },
      { status: 500 }
    )
  }
}

// DELETE - Delete a snap
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profileCheck, error: profileError } = await supabase
      .from('profiles')
      .select('id, base_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profileCheck) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      )
    }

    const isAdmin = profileCheck.base_role === 'admin'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can delete snaps' },
        { status: 403 }
      )
    }

    // Verify the snap exists
    const { data: existingSnap, error: fetchError } = await supabase
      .from('snaps')
      .select('id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingSnap) {
      return NextResponse.json(
        { error: 'Snap not found' },
        { status: 404 }
      )
    }

    // Delete recipients first (cascade should handle this, but being explicit)
    const { error: deleteRecipientsError } = await supabase
      .from('snap_recipients')
      .delete()
      .eq('snap_id', params.id)

    if (deleteRecipientsError) {
      console.error('Error deleting snap recipients:', deleteRecipientsError)
    }

    // Delete the snap
    const { error: deleteError } = await supabase
      .from('snaps')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting snap:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete snap', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in snaps DELETE API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete snap', details: error.toString() },
      { status: 500 }
    )
  }
}

