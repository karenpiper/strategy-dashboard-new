import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy endpoint to download horoscope images
 * This avoids CORS issues when downloading from OpenAI's blob storage
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const imageUrl = searchParams.get('url')
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }
    
    // Fetch the image from OpenAI's blob storage
    const response = await fetch(imageUrl, {
      headers: {
        'Referer': 'https://chat.openai.com/',
      },
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    // Get the image as a blob
    const blob = await response.blob()
    
    // Return the image with appropriate headers
    return new NextResponse(blob, {
      headers: {
        'Content-Type': blob.type || 'image/png',
        'Content-Disposition': `attachment; filename="horoscope-${new Date().toISOString().split('T')[0]}.png"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    console.error('Error proxying image download:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to download image' },
      { status: 500 }
    )
  }
}

