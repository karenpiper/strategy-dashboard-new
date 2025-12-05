import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/profiles/test-reset
 * TEST ENDPOINT: Temporarily deletes your profile to test the creation flow
 * WARNING: Only use in development!
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // First, get the current profile to preserve custom avatar if it exists
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('avatar_url, full_name')
      .eq('id', user.id)
      .maybeSingle()

    // Store custom avatar URL in user metadata temporarily (if it's different from OAuth avatar)
    const customAvatarUrl = currentProfile?.avatar_url && 
                            currentProfile.avatar_url !== user.user_metadata?.avatar_url
      ? currentProfile.avatar_url
      : null

    if (customAvatarUrl) {
      // Store in user metadata temporarily so we can restore it
      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          custom_avatar_url_backup: customAvatarUrl
        }
      })
    }

    // Delete the user's profile
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (deleteError) {
      console.error('Error deleting profile:', deleteError)
      return NextResponse.json(
        { 
          error: 'Failed to delete profile', 
          details: deleteError.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Profile deleted successfully. Refresh the page to test profile creation flow.',
      userId: user.id,
      email: user.email
    })
  } catch (error: any) {
    console.error('Error in test reset:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

