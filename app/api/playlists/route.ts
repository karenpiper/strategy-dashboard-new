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

// POST - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { date, title, curator, description, spotify_url, apple_playlist_url, cover_url, curator_photo_url, week_label, total_duration, track_count, artists_list } = body

    if (!date || !curator || !spotify_url) {
      return NextResponse.json(
        { error: 'Missing required fields: date, curator, and spotify_url are required' },
        { status: 400 }
      )
    }

    // Fetch Spotify data if cover_url or title are missing
    let finalTitle = title
    let finalCoverUrl = cover_url
    let finalDescription = description
    let finalCuratorPhotoUrl = curator_photo_url

    if (!cover_url || !title) {
      const spotifyData = await fetchSpotifyPlaylistData(spotify_url)
      if (spotifyData) {
        finalTitle = spotifyData.title || title
        finalCoverUrl = spotifyData.coverUrl || cover_url
        finalDescription = spotifyData.description || description
        finalCuratorPhotoUrl = spotifyData.curatorPhotoUrl || curator_photo_url
      }
    }

    // Look up curator's avatar from profiles if not provided
    if (!finalCuratorPhotoUrl) {
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

    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        date,
        title: finalTitle || null,
        curator,
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

