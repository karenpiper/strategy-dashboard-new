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
    return NextResponse.json(playlistsArray)
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
  // Get all active team members
  const { data: teamMembers, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, discipline, role, hierarchy_level, avatar_url, is_active')
    .eq('is_active', true)
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

    // Auto-assign curator if not provided
    let finalCurator = curator
    let finalCuratorPhotoUrl = curator_photo_url
    let autoAssignedCurator = null
    let curatorProfileId = null

    if (!curator || !curator.trim()) {
      // Auto-assign using random rotation
      autoAssignedCurator = await selectRandomCurator(supabase, date)
      if (autoAssignedCurator) {
        finalCurator = autoAssignedCurator.full_name
        finalCuratorPhotoUrl = autoAssignedCurator.avatar_url || null
        curatorProfileId = autoAssignedCurator.id
        
        // Grant curator permissions
        await grantCuratorPermissions(supabase, autoAssignedCurator.id)
      } else {
        return NextResponse.json(
          { error: 'No eligible curators found for auto-assignment' },
          { status: 400 }
        )
      }
    } else {
      // Look up curator profile if name is provided
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, avatar_url, special_access')
        .or(`full_name.ilike.%${curator}%,email.ilike.%${curator}%`)
        .limit(1)
        .single()
      
      if (profile) {
        curatorProfileId = profile.id
        if (!finalCuratorPhotoUrl && profile.avatar_url) {
          finalCuratorPhotoUrl = profile.avatar_url
        }
        // Grant curator permissions if not already granted
        await grantCuratorPermissions(supabase, profile.id)
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

    // Create curator assignment record if curator was auto-assigned or if we have a profile ID
    if (playlist && (autoAssignedCurator || curatorProfileId)) {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Calculate start_date (assignment_date + 3 days) and end_date (start_date + 7 days)
      const assignmentDateObj = new Date(date)
      const startDateObj = new Date(assignmentDateObj)
      startDateObj.setDate(startDateObj.getDate() + 3)
      const endDateObj = new Date(startDateObj)
      endDateObj.setDate(endDateObj.getDate() + 7)

      const start_date = startDateObj.toISOString().split('T')[0]
      const end_date = endDateObj.toISOString().split('T')[0]

      const { data: assignment } = await supabase
        .from('curator_assignments')
        .insert({
          playlist_id: playlist.id,
          curator_name: finalCurator,
          curator_profile_id: curatorProfileId || autoAssignedCurator?.id || null,
          assignment_date: date,
          start_date,
          end_date,
          is_manual_override: !autoAssignedCurator, // Manual if curator was provided
          assigned_by: user?.id || null
        })
        .select()
        .single()

      // Send Slack notification if curator was auto-assigned
      if (autoAssignedCurator && assignment) {
        const { data: curatorProfile } = await supabase
          .from('profiles')
          .select('slack_id, full_name')
          .eq('id', autoAssignedCurator.id)
          .single()

        if (curatorProfile?.slack_id) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const curationUrl = `${baseUrl}/curate?assignment=${assignment.id}`
          
          try {
            await fetch(`${baseUrl}/api/slack/notify-curator`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                slack_id: curatorProfile.slack_id,
                curator_name: curatorProfile.full_name || autoAssignedCurator.full_name,
                curation_url: curationUrl,
                start_date,
                end_date
              })
            })
          } catch (slackError) {
            console.error('Error sending Slack notification:', slackError)
            // Don't fail the playlist creation if Slack fails
          }
        }
      }
    }

    return NextResponse.json({
      ...playlist,
      autoAssignedCurator: autoAssignedCurator ? {
        id: autoAssignedCurator.id,
        full_name: autoAssignedCurator.full_name
      } : null
    }, { status: 201 })
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

    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting playlist:', error)
      return NextResponse.json(
        { error: 'Failed to delete playlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/playlists:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

