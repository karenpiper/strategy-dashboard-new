import { NextRequest, NextResponse } from 'next/server'

// Extract playlist ID from Spotify URL
// Spotify playlist IDs are base62 encoded (alphanumeric + some special chars)
// URLs can be: https://open.spotify.com/playlist/ID or spotify:playlist:ID
function extractPlaylistId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null
  }

  // Clean the URL - remove query parameters and fragments
  // URLs like: https://open.spotify.com/playlist/37i9dQZF1DX1leCUq7he50?si=...
  const cleanUrl = url.trim().split('?')[0].split('#')[0]
  
  // Patterns to match Spotify playlist URLs (in order of specificity)
  const patterns = [
    // https://open.spotify.com/playlist/37i9dQZF1DX1leCUq7he50
    // https://spotify.com/playlist/37i9dQZF1DX1leCUq7he50
    /(?:open\.)?spotify\.com\/playlist\/([a-zA-Z0-9]+)/i,
    // spotify:playlist:37i9dQZF1DX1leCUq7he50
    /spotify:playlist:([a-zA-Z0-9]+)/i,
    // Just the ID if it's already extracted (Spotify IDs are 22 characters)
    /^([a-zA-Z0-9]{22})$/,
  ]
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern)
    if (match && match[1]) {
      const playlistId = match[1]
      console.log(`[Spotify API] Extracted playlist ID: ${playlistId} from URL: ${url}`)
      return playlistId
    }
  }
  
  console.error(`[Spotify API] Could not extract playlist ID from URL: ${url}`)
  console.error(`[Spotify API] Cleaned URL: ${cleanUrl}`)
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
  // Try without market parameter first - some playlists may not be available in specific markets
  // If that fails, we can try with market parameter
  const url = `https://api.spotify.com/v1/playlists/${playlistId}`
  console.log(`[Spotify API] Fetching playlist: ${playlistId} from ${url}`)
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Failed to fetch playlist: ${errorText}`
    
    // Try to parse as JSON for better error messages
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message
      }
    } catch {
      // Keep original error message if not JSON
    }
    
    // Log the specific error for debugging
    console.error(`[Spotify API] Error fetching playlist ${playlistId}:`, {
      status: response.status,
      statusText: response.statusText,
      errorMessage,
      errorText
    })
    
    // Create a more specific error with status code
    const error = new Error(errorMessage)
    ;(error as any).status = response.status
    throw error
  }

  return response.json()
}

// Fetch all tracks from a playlist (handles pagination)
async function fetchAllTracks(playlistId: string, accessToken: string, initialTracks: any) {
  if (!initialTracks || !Array.isArray(initialTracks.items)) {
    console.warn('Invalid initial tracks data, returning empty array')
    return []
  }

  const allTracks = [...initialTracks.items]
  let nextUrl = initialTracks.next

  // Fetch remaining tracks if there are more pages
  let pageCount = 0
  const maxPages = 10 // Safety limit to prevent infinite loops
  
  while (nextUrl && pageCount < maxPages) {
    try {
      const response = await fetch(nextUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        console.warn(`Failed to fetch additional tracks (page ${pageCount + 1}), using available tracks`)
        break
      }

      const data = await response.json()
      if (data.items && Array.isArray(data.items)) {
        allTracks.push(...data.items)
      }
      nextUrl = data.next
      pageCount++
    } catch (error: any) {
      console.warn(`Error fetching additional tracks (page ${pageCount + 1}), using available tracks:`, error?.message || error)
      break
    }
  }

  return allTracks
}

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Error parsing request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON with "url" field.' },
        { status: 400 }
      )
    }

    const { url } = body || {}

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { error: 'Spotify playlist URL is required' },
        { status: 400 }
      )
    }

    // Extract playlist ID from URL
    const playlistId = extractPlaylistId(url)
    if (!playlistId) {
      console.error('[Spotify API] Invalid playlist URL:', url)
      return NextResponse.json(
        { error: 'Invalid Spotify playlist URL. Please provide a valid Spotify playlist link.' },
        { status: 400 }
      )
    }
    
    console.log('[Spotify API] Extracted playlist ID:', playlistId, 'from URL:', url)

    // Get access token
    const accessToken = await getAccessToken()

    // Fetch playlist data
    const playlistData = await fetchPlaylistData(playlistId, accessToken)

    // Do not depend on owner data - it may not exist for Spotify-owned playlists
    // Extract owner info safely (owner may be null/undefined for Spotify-owned playlists)
    const playlistOwner = playlistData.owner || {}
    const ownerName = playlistOwner.display_name || playlistOwner.id || null
    const ownerPhoto = playlistOwner.images?.[0]?.url || null

    // Get basic metadata first (always available)
    const basicMetadata = {
      title: playlistData.name || 'Untitled Playlist',
      coverUrl: playlistData.images?.[0]?.url || null,
      description: playlistData.description || null,
      spotifyUrl: playlistData.external_urls?.spotify || url,
      trackCount: playlistData.tracks?.total || 0,
      // Owner info is optional and may not exist for Spotify-owned playlists
      owner: ownerName,
      ownerPhotoUrl: ownerPhoto,
    }

    // Check if tracks data exists
    if (!playlistData.tracks || !playlistData.tracks.items) {
      // Return basic metadata even if tracks aren't available
      return NextResponse.json({
        ...basicMetadata,
        totalDuration: '0:00',
        artistsList: '',
        tracks: [],
      })
    }

    // Fetch all tracks (handles pagination for playlists with >100 tracks)
    let allTrackItems: any[] = []
    try {
      // Start with initial tracks
      allTrackItems = [...(playlistData.tracks.items || [])]
      
      // Fetch additional pages if needed
      if (playlistData.tracks.next) {
        allTrackItems = await fetchAllTracks(playlistId, accessToken, playlistData.tracks)
      }
    } catch (error: any) {
      console.warn('Error fetching tracks, using initial tracks only:', error?.message || error)
      // If track fetching fails, use the initial tracks we already have
      allTrackItems = [...(playlistData.tracks.items || [])]
    }

    // Filter out null tracks and calculate total duration
    const validTracks = allTrackItems.filter((item: any) => item?.track)
    
    if (validTracks.length === 0) {
      // If no valid tracks but playlist exists, return basic metadata
      // This can happen with Spotify-owned playlists or playlists with unavailable tracks
      return NextResponse.json({
        ...basicMetadata,
        totalDuration: '0:00',
        artistsList: '',
        tracks: [],
      })
    }

    // Calculate total duration
    const totalMs = validTracks.reduce((sum: number, item: any) => {
      return sum + (item.track?.duration_ms || 0)
    }, 0)
    const totalMinutes = Math.floor(totalMs / 60000)
    const totalSeconds = Math.floor((totalMs % 60000) / 1000)
    const totalDuration = `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`

    // Extract unique artists
    const artists = new Set<string>()
    validTracks.forEach((item: any) => {
      if (item.track?.artists) {
        item.track.artists.forEach((artist: any) => {
          if (artist?.name) {
            artists.add(artist.name)
          }
        })
      }
    })
    const artistsList = Array.from(artists).join(', ')

    // Get cover image (use the largest available)
    const coverImage = playlistData.images?.[0]?.url || null

    // Format tracks
    const tracks = validTracks.map((item: any) => {
      const track = item.track
      const durationMs = track.duration_ms || 0
      const minutes = Math.floor(durationMs / 60000)
      const seconds = Math.floor((durationMs % 60000) / 1000)
      const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`

      return {
        name: track.name || 'Unknown Track',
        artist: track.artists?.map((a: any) => a.name).filter(Boolean).join(', ') || 'Unknown',
        duration,
        album: track.album?.name || 'Unknown Album',
        spotifyUrl: track.external_urls?.spotify || null,
      }
    })

    // Return playlist metadata - curator is set by the user, not from playlist owner
    // Owner info is already extracted above and may not exist for Spotify-owned playlists
    return NextResponse.json({
      title: playlistData.name,
      coverUrl: coverImage,
      description: playlistData.description || null,
      spotifyUrl: playlistData.external_urls?.spotify || url,
      trackCount: playlistData.tracks?.total || validTracks.length,
      totalDuration,
      artistsList,
      tracks,
      // Don't set curator - it's set by the user sharing the playlist
      // Owner info is optional and may not exist for Spotify-owned playlists
      owner: ownerName,
      ownerPhotoUrl: ownerPhoto,
    })
  } catch (error: any) {
    console.error('[Spotify API] Error fetching Spotify playlist:', error)
    console.error('[Spotify API] Error stack:', error?.stack)
    console.error('[Spotify API] Error details:', {
      message: error?.message,
      name: error?.name,
      cause: error?.cause,
      status: error?.status
    })
    
    // Provide more helpful error messages
    let errorMessage = error?.message || 'Failed to fetch playlist data'
    let statusCode = error?.status || 500
    
    // Check for specific error types based on status code or message
    if (statusCode === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage = 'Spotify authentication failed. Please check your API credentials.'
      statusCode = 401
    } else if (statusCode === 403 || errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      errorMessage = 'This playlist may be private or unavailable. Try a public playlist.'
      statusCode = 403
    } else if (statusCode === 404 || errorMessage.includes('404') || errorMessage.includes('Not Found') || errorMessage.includes('Resource not found')) {
      errorMessage = 'Playlist not found. Please check that the URL is correct and the playlist is public.'
      statusCode = 404
    } else if (statusCode === 429 || errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      errorMessage = 'Spotify API rate limit exceeded. Please try again in a moment.'
      statusCode = 429
    } else if (errorMessage.includes('credentials not configured')) {
      errorMessage = 'Spotify API credentials are not configured. Please contact an administrator.'
      statusCode = 500
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}

