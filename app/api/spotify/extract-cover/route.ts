import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Extract cover image URL from Spotify playlist using oEmbed endpoint
 * This is more reliable than HTML parsing and works for all playlists
 * 
 * Route: POST /api/spotify/extract-cover
 */

// GET handler for testing/debugging
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Extract Cover API is working',
    endpoint: '/api/spotify/extract-cover',
    method: 'POST',
    usage: 'Send a POST request with { url: "spotify_playlist_url" }',
    note: 'Uses Spotify oEmbed endpoint - no authentication required'
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body || {}

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { error: 'Spotify playlist URL is required' },
        { status: 400 }
      )
    }

    // Clean the URL - remove query parameters and fragments
    const cleanUrl = url.split('?')[0].split('#')[0].trim()

    try {
      // Use Spotify oEmbed endpoint (no authentication required)
      const encodedUrl = encodeURIComponent(cleanUrl)
      const oEmbedUrl = `https://open.spotify.com/oembed?url=${encodedUrl}`
      
      console.log('[Extract Cover] Fetching from oEmbed endpoint:', oEmbedUrl)
      
      const response = await fetch(oEmbedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      console.log('[Extract Cover] Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorBody = null
        try {
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            errorBody = await response.json()
          } else {
            errorBody = await response.text()
          }
        } catch (e) {
          // Couldn't parse error body
        }
        
        console.error('[Extract Cover] Error details:', {
          endpoint: oEmbedUrl,
          status: response.status,
          statusText: response.statusText,
          errorBody
        })
        
        return NextResponse.json(
          { 
            error: `Failed to fetch cover image: ${response.statusText}`,
            details: {
              endpoint: oEmbedUrl,
              statusCode: response.status,
              statusText: response.statusText,
              errorBody
            }
          },
          { status: response.status }
        )
      }

      const data = await response.json()
      
      if (data.thumbnail_url) {
        console.log('[Extract Cover] Successfully extracted cover URL from oEmbed')
        return NextResponse.json({ 
          coverUrl: data.thumbnail_url,
          title: data.title || null, // Also return title if available
        })
      }

      console.warn('[Extract Cover] oEmbed response did not include thumbnail_url')
      return NextResponse.json(
        { 
          error: 'Cover image not available from Spotify oEmbed endpoint.',
          details: {
            endpoint: oEmbedUrl,
            statusCode: 200,
            responseKeys: Object.keys(data)
          }
        },
        { status: 404 }
      )
    } catch (fetchError: any) {
      console.error('[Extract Cover] Error fetching from oEmbed:', fetchError)
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out. Please try again.' },
          { status: 408 }
        )
      }
      if (fetchError.message?.includes('CORS') || fetchError.message?.includes('fetch')) {
        return NextResponse.json(
          { error: 'Could not access the Spotify oEmbed endpoint. This may be due to CORS restrictions or the endpoint being unavailable.' },
          { status: 403 }
        )
      }
      throw fetchError
    }
  } catch (error: any) {
    console.error('[Extract Cover] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extract cover image' },
      { status: 500 }
    )
  }
}

