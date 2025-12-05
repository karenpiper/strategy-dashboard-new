import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get auth token for extension
// This endpoint allows the extension to get a session token
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', authenticated: false },
        { status: 401 }
      )
    }

    // Get the session to extract the access token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found', authenticated: false },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      token: session.access_token,
      user: {
        id: user.id,
        email: user.email
      }
    })
  } catch (error: any) {
    console.error('Error in extension auth API:', error)
    return NextResponse.json(
      { error: 'Internal server error', authenticated: false },
      { status: 500 }
    )
  }
}


