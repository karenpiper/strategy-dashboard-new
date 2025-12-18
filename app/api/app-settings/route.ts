import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all app settings
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

    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('*')

    if (error) {
      console.error('Error fetching app settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings', details: error.message },
        { status: 500 }
      )
    }

    // Convert to a map for easier lookup
    const settingsMap: Record<string, string> = {}
    settings?.forEach(setting => {
      settingsMap[setting.setting_key] = setting.setting_value
    })

    return NextResponse.json({ settings: settingsMap })
  } catch (error: any) {
    console.error('Error in app-settings API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT - Update app settings (admin only)
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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('base_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.base_role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { settings } = body // { setting_key: setting_value, ... }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings payload' },
        { status: 400 }
      )
    }

    // Update each setting
    const results = []
    for (const [key, value] of Object.entries(settings)) {
      const { data, error } = await supabase
        .from('app_settings')
        .update({
          setting_value: String(value),
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', key)
        .select()
        .single()

      if (error) {
        console.error(`Error updating setting ${key}:`, error)
        results.push({ setting_key: key, error: error.message })
      } else {
        results.push({ setting_key: key, success: true, data })
      }
    }

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error: any) {
    console.error('Error in app-settings API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}




