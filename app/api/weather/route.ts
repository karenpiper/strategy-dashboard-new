import { NextRequest, NextResponse } from 'next/server'

// WeatherAPI.com base URL
const WEATHERAPI_BASE = 'https://api.weatherapi.com/v1'

/**
 * Get weather emoji based on weather condition
 */
function getWeatherEmoji(condition: string, isDay: boolean = true): string {
  const lower = condition.toLowerCase()
  if (lower.includes('rain') || lower.includes('drizzle')) return '🌧️'
  if (lower.includes('snow')) return '❄️'
  if (lower.includes('thunder') || lower.includes('storm')) return '⛈️'
  if (lower.includes('cloud')) return '☁️'
  if (lower.includes('clear') || lower.includes('sun')) return isDay ? '☀️' : '🌙'
  if (lower.includes('fog') || lower.includes('mist')) return '🌫️'
  return '🌤️'
}


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const location = searchParams.get('location') // Accept location string directly

    // Get WeatherAPI.com API key from environment variables
    const apiKey = process.env.WEATHERAPI_KEY || process.env.NEXT_PUBLIC_WEATHERAPI_KEY
    if (!apiKey) {
      console.error('WEATHERAPI_KEY is not set')
      return NextResponse.json(
        { error: 'Weather service not configured. Please set WEATHERAPI_KEY in Vercel environment variables. Get a free API key from https://www.weatherapi.com/' },
        { status: 500 }
      )
    }

    // Determine query parameter - prefer location string, fallback to lat/lon
    let queryParam: string
    if (location) {
      queryParam = location
      console.log('Fetching weather for location:', location)
    } else if (lat && lon) {
      queryParam = `${lat},${lon}`
      console.log('Fetching weather for coordinates:', lat, lon)
    } else {
      return NextResponse.json(
        { error: 'Either location string or latitude/longitude are required' },
        { status: 400 }
      )
    }

    // WeatherAPI.com current weather endpoint
    // q parameter can be lat,lon, city name, or location string
    const weatherUrl = `${WEATHERAPI_BASE}/current.json?key=${apiKey}&q=${encodeURIComponent(queryParam)}&aqi=no`
    console.log('Fetching weather from WeatherAPI.com...')
    const weatherResponse = await fetch(weatherUrl)

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text()
      console.error('WeatherAPI.com API error:', weatherResponse.status, errorText)
      
      let errorDetails = 'Failed to fetch weather data'
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          errorDetails = errorJson.error.message
        }
      } catch {
        if (errorText) {
          errorDetails = errorText
        }
      }

      if (weatherResponse.status === 401) {
        return NextResponse.json(
          { 
            error: 'Invalid API key. Please check that WEATHERAPI_KEY is correct in Vercel environment variables.',
            details: errorDetails,
            troubleshooting: [
              '1. Verify the API key is correct in your WeatherAPI.com account dashboard',
              '2. Make sure you copied the entire key (no spaces)',
              '3. Ensure the environment variable is set in Vercel (not just locally)',
              '4. Redeploy your Vercel project after adding/updating the environment variable',
              '5. Check your WeatherAPI.com account status and API limits'
            ]
          },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: `Failed to fetch weather data: ${weatherResponse.statusText}`, details: errorDetails },
        { status: weatherResponse.status }
      )
    }

    const weatherData = await weatherResponse.json()
    const current = weatherData.current
    const location = weatherData.location

    // Extract weather data
    const temperature = Math.round(current.temp_f) // Already in Fahrenheit
    const condition = current.condition?.text || 'Unknown'
    const description = current.condition?.text || condition
    const humidity = current.humidity
    const windSpeed = Math.round(current.wind_mph) // Already in mph
    const isDay = current.is_day === 1

    // Get location name
    const locationName = location?.name || 
                        `${location?.region || ''}, ${location?.country || ''}`.trim() ||
                        'your location'

    return NextResponse.json({
      temperature,
      condition,
      description,
      humidity,
      windSpeed,
      emoji: getWeatherEmoji(description, isDay),
      location: locationName,
      cached: false,
    })
  } catch (error: any) {
    console.error('Error in weather API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch weather' },
      { status: 500 }
    )
  }
}

