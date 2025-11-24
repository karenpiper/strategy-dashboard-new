import { NextRequest, NextResponse } from 'next/server'

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
async function getAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  // Check if credentials are missing or empty strings
  if (!clientId || !clientSecret || clientId.trim() === '' || clientSecret.trim() === '') {
    const envKeys = Object.keys(process.env).filter(key => key.includes('SPOTIFY'))
    console.error('Spotify credentials check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length || 0,
      clientSecretLength: clientSecret?.length || 0,
      envKeysWithSpotify: envKeys,
      allEnvKeys: Object.keys(process.env).length
    })
    throw new Error('Spotify credentials not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables in .env.local and restart your development server. If you\'re on Vercel, make sure these are set in your project settings.')
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Fetch playlist data from Spotify API
async function fetchPlaylistData(playlistId: string, accessToken: string) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch playlist: ${error}`)
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'Spotify playlist URL is required' },
        { status: 400 }
      )
    }

    // Extract playlist ID from URL
    const playlistId = extractPlaylistId(url)
    if (!playlistId) {
      return NextResponse.json(
        { error: 'Invalid Spotify playlist URL' },
        { status: 400 }
      )
    }

    // Get access token
    const accessToken = await getAccessToken()

    // Fetch playlist data
    const playlistData = await fetchPlaylistData(playlistId, accessToken)

    // Calculate total duration
    const totalMs = playlistData.tracks.items.reduce((sum: number, item: any) => {
      return sum + (item.track?.duration_ms || 0)
    }, 0)
    const totalMinutes = Math.floor(totalMs / 60000)
    const totalSeconds = Math.floor((totalMs % 60000) / 1000)
    const totalDuration = `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`

    // Extract unique artists
    const artists = new Set<string>()
    playlistData.tracks.items.forEach((item: any) => {
      if (item.track?.artists) {
        item.track.artists.forEach((artist: any) => {
          artists.add(artist.name)
        })
      }
    })
    const artistsList = Array.from(artists).join(', ')

    // Get cover image (use the largest available)
    const coverImage = playlistData.images?.[0]?.url || null

    // Format tracks
    const tracks = playlistData.tracks.items
      .filter((item: any) => item.track) // Filter out null tracks
      .map((item: any) => {
        const track = item.track
        const durationMs = track.duration_ms || 0
        const minutes = Math.floor(durationMs / 60000)
        const seconds = Math.floor((durationMs % 60000) / 1000)
        const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`

        return {
          name: track.name,
          artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
          duration,
          album: track.album?.name,
          spotifyUrl: track.external_urls?.spotify,
        }
      })

    return NextResponse.json({
      title: playlistData.name,
      coverUrl: coverImage,
      description: playlistData.description || null,
      spotifyUrl: playlistData.external_urls?.spotify || url,
      trackCount: playlistData.tracks.total,
      totalDuration,
      artistsList,
      tracks,
      curator: playlistData.owner?.display_name || 'Unknown',
      curatorPhotoUrl: playlistData.owner?.images?.[0]?.url || null,
    })
  } catch (error: any) {
    console.error('Error fetching Spotify playlist:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch playlist data' },
      { status: 500 }
    )
  }
}

