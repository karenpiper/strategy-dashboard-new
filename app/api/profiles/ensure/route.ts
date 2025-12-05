import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/profiles/ensure
 * Ensures a profile exists for the authenticated user.
 * Creates one if missing (safety net if trigger fails).
 */
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

    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    // If profile exists, we're done
    if (existingProfile) {
      return NextResponse.json({ 
        message: 'Profile already exists',
        created: false 
      })
    }

    // Profile doesn't exist, create it
    // Extract user metadata from auth user
    const fullName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.email?.split('@')[0] || 
                     null
    // Prefer custom avatar backup if it exists, otherwise use OAuth avatar
    const avatarUrl = user.user_metadata?.custom_avatar_url_backup || 
                     user.user_metadata?.avatar_url || 
                     null

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || null,
        full_name: fullName,
        avatar_url: avatarUrl,
        base_role: 'user', // Default role
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      return NextResponse.json(
        { 
          error: 'Failed to create profile', 
          details: createError.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Profile created successfully',
      created: true,
      needsSetup: true, // Flag to indicate profile needs setup
      profile: newProfile
    })
  } catch (error: any) {
    console.error('Error in ensure profile:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

