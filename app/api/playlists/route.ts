import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Extract playlist ID from Spotify URL
function extractPlaylistId(url: string): string | null {
  const patterns = [
    /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /playlist\/([a-zA-Z0-9]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

// Get Spotify access token using Client Credentials flow
async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.warn('Spotify credentials not configured')
    return null
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    if (!response.ok) {
      console.error('Failed to get Spotify access token')
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Error getting Spotify access token:', error)
    return null
  }
}

// Fetch playlist data from Spotify API
async function fetchPlaylistData(playlistId: string, accessToken: string) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: ${response.statusText}`)
  }

  return response.json()
}

// Helper function to fetch Spotify playlist data
async function fetchSpotifyPlaylistData(spotifyUrl: string) {
  try {
    const playlistId = extractPlaylistId(spotifyUrl)
    if (!playlistId) {
      return null
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      return null
    }

    const playlistData = await fetchPlaylistData(playlistId, accessToken)

    // Get cover image (use the largest available)
    const coverImage = playlistData.images?.[0]?.url || null

    return {
      title: playlistData.name,
      coverUrl: coverImage,
      description: playlistData.description || null,
      curatorPhotoUrl: playlistData.owner?.images?.[0]?.url || null,
    }
  } catch (error: any) {
    console.error('Error fetching Spotify data:', error)
    return null
  }
}

// Cache configuration: 15 minutes for playlists (less frequently updated)
export const revalidate = 900

// GET - Fetch all playlists, with optional Spotify data refresh
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const refreshSpotify = searchParams.get('refresh') === 'true'
    
    console.log('[API] Fetching playlists from database...')
    const { data: playlists, error } = await supabase
      .from('playlists')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('[API] Error fetching playlists from database:', error)
      console.error('[API] Error details:', JSON.stringify(error, null, 2))
      // Return empty array instead of error to prevent frontend issues
      return NextResponse.json([])
    }

    // Ensure playlists is always an array
    const playlistsArray = Array.isArray(playlists) ? playlists : []
    console.log(`[API] Found ${playlistsArray.length} playlist(s) in database`)

    // Look up curator avatars from profiles table (always get latest from profiles)
    for (const playlist of playlistsArray) {
      if (playlist.curator) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url, full_name, email')
            .or(`full_name.ilike.%${playlist.curator}%,email.ilike.%${playlist.curator}%`)
            .limit(1)
            .single()
          
          if (profile?.avatar_url) {
            // Always use the latest avatar from profiles table
            playlist.curator_photo_url = profile.avatar_url
          }
        } catch (err) {
          // Silently continue if lookup fails
          console.log(`[API] Could not find avatar for curator: ${playlist.curator}`)
        }
      }
    }

    // If refresh is requested and we have playlists with Spotify URLs but missing metadata
    if (refreshSpotify && playlistsArray.length > 0) {
      const playlistsToRefresh = playlistsArray.filter(
        (p: any) => p.spotify_url && (!p.cover_url || !p.title)
      )

      console.log(`[API] Refreshing metadata for ${playlistsToRefresh.length} playlist(s)`)

      if (playlistsToRefresh.length > 0) {
        // Refresh metadata for playlists missing it
        for (const playlist of playlistsToRefresh) {
          try {
            const spotifyData = await fetchSpotifyPlaylistData(playlist.spotify_url)
            if (spotifyData) {
              // Update playlist with Spotify data
              const { error: updateError } = await supabase
                .from('playlists')
                .update({
                  title: spotifyData.title || playlist.title,
                  cover_url: spotifyData.coverUrl || playlist.cover_url,
                  description: spotifyData.description || playlist.description,
                  curator_photo_url: spotifyData.curatorPhotoUrl || playlist.curator_photo_url,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', playlist.id)

              if (updateError) {
                console.error(`[API] Error updating playlist ${playlist.id}:`, updateError)
              } else {
                console.log(`[API] Successfully refreshed metadata for playlist ${playlist.id}`)
                // Update the playlist in our response array
                const updatedIndex = playlistsArray.findIndex((p: any) => p.id === playlist.id)
                if (updatedIndex !== -1) {
                  playlistsArray[updatedIndex] = {
                    ...playlistsArray[updatedIndex],
                    title: spotifyData.title || playlistsArray[updatedIndex].title,
                    cover_url: spotifyData.coverUrl || playlistsArray[updatedIndex].cover_url,
                    description: spotifyData.description || playlistsArray[updatedIndex].description,
                    curator_photo_url: spotifyData.curatorPhotoUrl || playlistsArray[updatedIndex].curator_photo_url,
                  }
                }
              }
            }
          } catch (err) {
            console.error(`[API] Error refreshing playlist ${playlist.id}:`, err)
          }
        }
      }
    }

    console.log(`[API] Returning ${playlistsArray.length} playlist(s)`)
    const response = NextResponse.json(playlistsArray)
    // Add cache headers for client-side caching
    response.headers.set('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800')
    return response
  } catch (error: any) {
    console.error('[API] Error in GET /api/playlists:', error)
    console.error('[API] Error stack:', error.stack)
    // Return empty array instead of error to prevent frontend issues
    return NextResponse.json([])
  }
}

// PUT - Update an existing playlist
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, date, title, curator, description, spotify_url, apple_playlist_url, cover_url, curator_photo_url, week_label, total_duration, track_count, artists_list } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      )
    }

    // If spotify_url is provided but cover_url/title are missing, fetch from Spotify
    let finalTitle = title
    let finalCoverUrl = cover_url
    let finalDescription = description
    let finalCuratorPhotoUrl = curator_photo_url

    if (spotify_url && (!cover_url || !title)) {
      const spotifyData = await fetchSpotifyPlaylistData(spotify_url)
      if (spotifyData) {
        finalTitle = spotifyData.title || title
        finalCoverUrl = spotifyData.coverUrl || cover_url
        finalDescription = spotifyData.description || description
        finalCuratorPhotoUrl = spotifyData.curatorPhotoUrl || curator_photo_url
      }
    }

    // Look up curator's avatar from profiles if not provided
    if (!finalCuratorPhotoUrl && curator) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .or(`full_name.ilike.%${curator}%,email.ilike.%${curator}%`)
        .limit(1)
        .single()
      
      if (profile?.avatar_url) {
        finalCuratorPhotoUrl = profile.avatar_url
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (date) updateData.date = date
    if (finalTitle !== undefined) updateData.title = finalTitle
    if (curator) updateData.curator = curator
    if (finalDescription !== undefined) updateData.description = finalDescription
    if (spotify_url) updateData.spotify_url = spotify_url
    if (apple_playlist_url !== undefined) updateData.apple_playlist_url = apple_playlist_url
    if (finalCoverUrl !== undefined) updateData.cover_url = finalCoverUrl
    if (finalCuratorPhotoUrl !== undefined) updateData.curator_photo_url = finalCuratorPhotoUrl
    if (week_label !== undefined) updateData.week_label = week_label
    if (total_duration !== undefined) updateData.total_duration = total_duration
    if (track_count !== undefined) updateData.track_count = track_count
    if (artists_list !== undefined) updateData.artists_list = artists_list

    const { data: playlist, error } = await supabase
      .from('playlists')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating playlist:', error)
      return NextResponse.json(
        { error: 'Failed to update playlist' },
        { status: 500 }
      )
    }

    return NextResponse.json(playlist)
  } catch (error: any) {
    console.error('Error in PUT /api/playlists:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Select a random curator ensuring fair rotation
 * Uses cryptographically secure random number generation
 */
async function selectRandomCurator(
  supabase: any,
  assignmentDate: string
): Promise<{ id: string; full_name: string; avatar_url: string | null; discipline: string | null; role: string | null } | null> {
  // Get all active team members (excluding guests)
  const { data: teamMembers, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, discipline, role, hierarchy_level, avatar_url, is_active')
    .eq('is_active', true)
    .neq('is_guest', true) // Exclude guests
    .not('full_name', 'is', null)

  if (error || !teamMembers || teamMembers.length === 0) {
    console.error('Error fetching team members:', error)
    return null
  }

  // Get recent curator assignments (last N assignments where N = team size)
  const { data: recentAssignments } = await supabase
    .from('curator_assignments')
    .select('curator_name, assignment_date')
    .order('assignment_date', { ascending: false })
    .limit(teamMembers.length)

  // Create a set of recently assigned curators (normalized to lowercase)
  const recentlyAssigned = new Set(
    (recentAssignments || []).map(a => a.curator_name.toLowerCase().trim())
  )

  // Filter out recently assigned curators
  let eligibleCurators = teamMembers.filter(member => {
    const name = member.full_name?.toLowerCase().trim()
    return name && !recentlyAssigned.has(name)
  })

  // If everyone has been assigned recently, reset and use all team members
  if (eligibleCurators.length === 0) {
    eligibleCurators = teamMembers
  }

  // Use cryptographically secure random number generation
  const randomBytes = new Uint32Array(1)
  crypto.getRandomValues(randomBytes)
  
  // Convert to float between 0 and 1
  const random = randomBytes[0] / (0xFFFFFFFF + 1)
  
  // Select random curator
  const selectedIndex = Math.floor(random * eligibleCurators.length)
  const selected = eligibleCurators[selectedIndex]

  if (!selected || !selected.full_name) {
    return null
  }

  return {
    id: selected.id,
    full_name: selected.full_name,
    avatar_url: selected.avatar_url || null,
    discipline: selected.discipline || null,
    role: selected.role || null
  }
}

/**
 * Grant curator permissions to a user
 */
async function grantCuratorPermissions(supabase: any, profileId: string): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('special_access')
    .eq('id', profileId)
    .single()

  if (profile) {
    const specialAccess = profile.special_access || []
    if (!specialAccess.includes('curator')) {
      await supabase
        .from('profiles')
        .update({
          special_access: [...specialAccess, 'curator']
        })
        .eq('id', profileId)
    }
  }
}

// POST - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { date, title, curator, description, spotify_url, apple_playlist_url, cover_url, curator_photo_url, week_label, total_duration, track_count, artists_list } = body

    if (!date || !spotify_url) {
      return NextResponse.json(
        { error: 'Missing required fields: date and spotify_url are required' },
        { status: 400 }
      )
    }

    // Find the active curator for this date
    let finalCurator = curator
    let finalCuratorPhotoUrl = curator_photo_url

    if (!curator || !curator.trim()) {
      // Find the current curator assignment for this date
      const { data: activeAssignment } = await supabase
        .from('curator_assignments')
        .select('curator_name, curator_profile_id, profiles(avatar_url)')
        .lte('start_date', date)
        .gte('end_date', date)
        .order('assignment_date', { ascending: false })
        .limit(1)
        .single()

      if (activeAssignment) {
        finalCurator = activeAssignment.curator_name
        if (activeAssignment.profiles && Array.isArray(activeAssignment.profiles) && activeAssignment.profiles[0]?.avatar_url) {
          finalCuratorPhotoUrl = activeAssignment.profiles[0].avatar_url
        } else if (activeAssignment.profiles && !Array.isArray(activeAssignment.profiles) && activeAssignment.profiles.avatar_url) {
          finalCuratorPhotoUrl = activeAssignment.profiles.avatar_url
        }
      } else {
        return NextResponse.json(
          { error: 'No active curator found for this date. Please assign a curator first via Curator Rotation.' },
          { status: 400 }
        )
      }
    } else {
      // Look up curator profile if name is provided
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .or(`full_name.ilike.%${curator}%,email.ilike.%${curator}%`)
        .limit(1)
        .single()
      
      if (profile && !finalCuratorPhotoUrl && profile.avatar_url) {
        finalCuratorPhotoUrl = profile.avatar_url
      }
    }

    // Fetch Spotify data if cover_url or title are missing
    let finalTitle = title
    let finalCoverUrl = cover_url
    let finalDescription = description

    if (!cover_url || !title) {
      const spotifyData = await fetchSpotifyPlaylistData(spotify_url)
      if (spotifyData) {
        finalTitle = spotifyData.title || title
        finalCoverUrl = spotifyData.coverUrl || cover_url
        finalDescription = spotifyData.description || description
        // Only use Spotify curator photo if we didn't auto-assign
        if (!autoAssignedCurator && !finalCuratorPhotoUrl) {
          finalCuratorPhotoUrl = spotifyData.curatorPhotoUrl || null
        }
      }
    }

    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        date,
        title: finalTitle || null,
        curator: finalCurator,
        description: finalDescription || null,
        spotify_url,
        apple_playlist_url: apple_playlist_url || null,
        cover_url: finalCoverUrl || null,
        curator_photo_url: finalCuratorPhotoUrl || null,
        week_label: week_label || null,
        total_duration: total_duration || null,
        track_count: track_count || null,
        artists_list: artists_list || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating playlist:', error)
      return NextResponse.json(
        { error: 'Failed to create playlist' },
        { status: 500 }
      )
    }

    // Link playlist to current curator assignment if curator matches
    // This allows the curator to see their playlist in the admin sidebar
    if (playlist && finalCurator) {
      const { data: activeAssignment } = await supabase
        .from('curator_assignments')
        .select('id')
        .eq('curator_name', finalCurator)
        .lte('start_date', date)
        .gte('end_date', date)
        .limit(1)
        .single()

      if (activeAssignment) {
        // Link playlist to the curator assignment so curator can see it in admin
        await supabase
          .from('curator_assignments')
          .update({ playlist_id: playlist.id })
          .eq('id', activeAssignment.id)
      }
    }

    return NextResponse.json(playlist, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/playlists:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a playlist
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      )
    }

    // First check if the playlist exists
    const { data: existingPlaylist, error: fetchError } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existingPlaylist) {
      console.error('Error fetching playlist for deletion:', fetchError)
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      )
    }

    // Delete the playlist
    const { error, data } = await supabase
      .from('playlists')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error deleting playlist:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { 
          error: 'Failed to delete playlist',
          details: error.message || 'Unknown error'
        },
        { status: 500 }
      )
    }

    console.log(`[API] Successfully deleted playlist: ${id}`)
    return NextResponse.json({ success: true, message: 'Playlist deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/playlists:', error)
    console.error('Error stack:', error?.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

