import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all historical horoscope avatars for the authenticated user
// Lists files directly from storage bucket to show all generated avatars, not just those in database
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

    // List all files from horoscope-avatars storage bucket for this user
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('horoscope-avatars')
      .list(user.id, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (storageError) {
      console.error('Error listing storage files:', storageError)
      // Continue anyway - we'll try to get data from database
    }

    console.log(`Found ${storageFiles?.length || 0} files in storage for user ${user.id}`)

    // Also fetch horoscopes from database to get metadata (date, star_sign, etc.)
    const { data: horoscopes, error: fetchError } = await supabase
      .from('horoscopes')
      .select('id, image_url, date, star_sign, generated_at')
      .eq('user_id', user.id)
      .not('image_url', 'is', null)
      .order('generated_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching horoscopes from database:', fetchError)
    }

    console.log(`Found ${horoscopes?.length || 0} horoscopes in database for user ${user.id}`)

    // Create a map of image URLs to horoscope metadata for quick lookup
    const horoscopeMap = new Map<string, typeof horoscopes[0]>()
    if (horoscopes) {
      horoscopes.forEach(h => {
        if (h.image_url) {
          horoscopeMap.set(h.image_url, h)
        }
      })
    }

    // Build avatars from storage files
    const avatars = (storageFiles || [])
      .filter(file => file.name && file.name.endsWith('.png')) // Only image files
      .map(file => {
        const filePath = `${user.id}/${file.name}`
        const { data: { publicUrl } } = supabase.storage
          .from('horoscope-avatars')
          .getPublicUrl(filePath)

        // Try to extract date from filename (format: horoscope-{userId}-{date}-{timestamp}.png)
        let extractedDate = null
        const dateMatch = file.name.match(/horoscope-[^-]+-(\d{4}-\d{2}-\d{2})-/)
        if (dateMatch) {
          extractedDate = dateMatch[1]
        }

        // Look up metadata from database if available
        const horoscopeData = Array.from(horoscopeMap.values()).find(h => {
          // Check if the storage URL matches the database URL
          if (h.image_url && publicUrl) {
            return h.image_url.includes(file.name) || publicUrl.includes(file.name)
          }
          return false
        })

        return {
          id: horoscopeData?.id || file.id || file.name,
          url: publicUrl,
          date: horoscopeData?.date || extractedDate || file.created_at?.split('T')[0] || null,
          star_sign: horoscopeData?.star_sign || null,
          generated_at: horoscopeData?.generated_at || file.created_at || null,
          created_at: file.created_at,
          filename: file.name
        }
      })
      .sort((a, b) => {
        // Sort by created_at/generated_at descending (newest first)
        const dateA = new Date(a.generated_at || a.created_at || 0).getTime()
        const dateB = new Date(b.generated_at || b.created_at || 0).getTime()
        return dateB - dateA
      })

    console.log(`Returning ${avatars.length} avatars from storage`)

    return NextResponse.json({ data: avatars })
  } catch (error: any) {
    console.error('Error in horoscope avatars API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch horoscope avatars', details: error.toString() },
      { status: 500 }
    )
  }
}

