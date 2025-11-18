import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// NWS API base URL (no API key required!)
const NWS_API_BASE = 'https://api.weather.gov'

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

/**
 * Generate work-related weather report using OpenAI
 */
async function generateWorkWeatherReport(
  temperature: number,
  condition: string,
  humidity: number,
  windSpeed: number,
  location: string
): Promise<string> {
  const prompt = `Based on the current weather in ${location}, create a brief, practical work-related weather tip (1-2 sentences max). Be specific and actionable.

Weather details:
- Temperature: ${temperature}°F
- Condition: ${condition}
- Humidity: ${humidity}%
- Wind Speed: ${windSpeed} mph

Examples:
- If rainy: "Bring an umbrella to brainstorms today - it's wet out there!"
- If sunny: "Perfect weather for a walking meeting - take advantage of the sunshine!"
- If cold: "Layer up for that client site visit - it's chilly today."
- If windy: "Hold onto your notes in outdoor meetings - it's breezy!"

Make it relevant, practical, and work-focused. Keep it concise and friendly.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides brief, practical work-related weather tips.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 100,
      temperature: 0.7,
    })

    return response.choices[0]?.message?.content?.trim() || 'Check the weather before heading out today!'
  } catch (error) {
    console.error('Error generating work weather report:', error)
    // Fallback message
    if (condition.toLowerCase().includes('rain')) {
      return 'Bring an umbrella to brainstorms today - it\'s wet out there!'
    }
    return 'Check the weather before heading out today!'
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    console.log('Fetching weather from National Weather Service API...')
    
    // NWS API requires a User-Agent header
    const headers = {
      'User-Agent': 'strategy-dashboard/1.0 (contact: your-email@example.com)',
      'Accept': 'application/json',
    }

    // Step 1: Get grid point from lat/lon
    // NWS API only works for US locations
    const pointsUrl = `${NWS_API_BASE}/points/${lat},${lon}`
    console.log('Fetching grid point from NWS...')
    const pointsResponse = await fetch(pointsUrl, { headers })

    if (!pointsResponse.ok) {
      if (pointsResponse.status === 404) {
        return NextResponse.json(
          { error: 'Location not found. NWS API only supports US locations.' },
          { status: 404 }
        )
      }
      const errorText = await pointsResponse.text()
      console.error('NWS points API error:', pointsResponse.status, errorText)
      return NextResponse.json(
        { error: `Failed to get location data: ${pointsResponse.statusText}`, details: errorText },
        { status: pointsResponse.status }
      )
    }

    const pointsData = await pointsResponse.json()
    const { gridId, gridX, gridY, properties } = pointsData
    const forecastOffice = properties?.forecastOffice?.replace(NWS_API_BASE, '') || ''
    const locationName = properties?.relativeLocation?.properties?.city || 
                        properties?.relativeLocation?.properties?.areaDescription || 
                        'your location'

    console.log(`NWS grid point: ${gridId} ${gridX},${gridY}`)

    // Step 2: Get current conditions from the grid point
    // We'll use the forecast endpoint which includes current conditions
    const forecastUrl = `${NWS_API_BASE}/gridpoints/${gridId}/${gridX},${gridY}/forecast`
    console.log('Fetching forecast from NWS...')
    const forecastResponse = await fetch(forecastUrl, { headers })

    if (!forecastResponse.ok) {
      const errorText = await forecastResponse.text()
      console.error('NWS forecast API error:', forecastResponse.status, errorText)
      return NextResponse.json(
        { error: `Failed to get weather forecast: ${forecastResponse.statusText}`, details: errorText },
        { status: forecastResponse.status }
      )
    }

    const forecastData = await forecastResponse.json()
    
    // Get current conditions from the first period (usually "Tonight" or "Today")
    const currentPeriod = forecastData.properties?.periods?.[0]
    if (!currentPeriod) {
      return NextResponse.json(
        { error: 'No weather data available for this location' },
        { status: 404 }
      )
    }

    // Step 3: Get detailed observations if available
    let temperature = currentPeriod.temperature
    let condition = currentPeriod.shortForecast || 'Unknown'
    let description = currentPeriod.detailedForecast || condition
    let windSpeed = 0
    let humidity = null
    let isDay = currentPeriod.isDaytime

    // Try to get more detailed observations from the station
    try {
      const stationsUrl = `${NWS_API_BASE}/gridpoints/${gridId}/${gridX},${gridY}/stations`
      const stationsResponse = await fetch(stationsUrl, { headers })
      
      if (stationsResponse.ok) {
        const stationsData = await stationsResponse.json()
        const observationStations = stationsData.features || []
        
        // Get the closest station's observations
        if (observationStations.length > 0) {
          const stationId = observationStations[0].properties?.stationIdentifier
          if (stationId) {
            const observationsUrl = `${NWS_API_BASE}/stations/${stationId}/observations/latest`
            const obsResponse = await fetch(observationsUrl, { headers })
            
            if (obsResponse.ok) {
              const obsData = await obsResponse.json()
              const observation = obsData.properties
              
              // Convert temperature from Celsius to Fahrenheit if needed
              if (observation.temperature?.value !== null) {
                temperature = Math.round((observation.temperature.value * 9/5) + 32)
              }
              
              // Get wind speed (convert from m/s to mph)
              if (observation.windSpeed?.value !== null) {
                windSpeed = Math.round(observation.windSpeed.value * 2.237) // m/s to mph
              }
              
              // Get relative humidity
              if (observation.relativeHumidity?.value !== null) {
                humidity = Math.round(observation.relativeHumidity.value)
              }
              
              // Get condition from observation
              if (observation.textDescription) {
                description = observation.textDescription
                condition = observation.textDescription.split(' ')[0] // First word
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch detailed observations, using forecast data:', e)
      // Continue with forecast data
    }

    // Ensure temperature is a number
    if (typeof temperature !== 'number') {
      temperature = currentPeriod.temperature || 0
    }

    // Generate work-related weather report
    const workReport = await generateWorkWeatherReport(
      temperature,
      description,
      humidity || 50, // Default to 50% if not available
      windSpeed,
      locationName
    )

    return NextResponse.json({
      temperature,
      condition,
      description,
      humidity: humidity || null,
      windSpeed,
      emoji: getWeatherEmoji(description, isDay),
      workReport,
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

