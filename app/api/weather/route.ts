import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    // Use OpenWeatherMap API (free tier)
    // Check both possible environment variable names
    const apiKey = process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
    if (!apiKey) {
      console.error('OPENWEATHER_API_KEY is not set')
      return NextResponse.json(
        { error: 'Weather service not configured. Please set OPENWEATHER_API_KEY in Vercel environment variables. Get a free API key from https://openweathermap.org/api' },
        { status: 500 }
      )
    }

    // Log API key status (first 4 chars only for security)
    console.log('Weather API key status:', apiKey ? `${apiKey.substring(0, 4)}...` : 'NOT SET')
    console.log('API key length:', apiKey?.length || 0)
    
    // Check if API key looks valid (OpenWeatherMap keys are typically 32 characters)
    if (apiKey.length < 20) {
      console.warn('API key seems too short. OpenWeatherMap keys are typically 32 characters long.')
    }

    // Reverse geocode to get location name (server-side) - skip if API key fails
    let locationName = 'your location'
    try {
      const geoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
      const geoResponse = await fetch(geoUrl)
      if (geoResponse.ok) {
        const geoData = await geoResponse.json()
        if (geoData[0]) {
          locationName = geoData[0].name || locationName
        }
      } else if (geoResponse.status === 401) {
        console.error('OpenWeatherMap reverse geocoding 401 - API key may be invalid')
      }
    } catch (e) {
      console.error('Reverse geocoding error (non-fatal):', e)
      // Continue without location name
    }

    // Fetch current weather
    // Note: For free tier, use api.openweathermap.org (not pro.openweathermap.org)
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`
    console.log('Fetching weather from OpenWeatherMap...')
    console.log('Weather URL (without key):', `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=***&units=imperial`)
    const weatherResponse = await fetch(weatherUrl)

    if (!weatherResponse.ok) {
      console.error('OpenWeatherMap API error:', weatherResponse.status, weatherResponse.statusText)
      const errorText = await weatherResponse.text()
      console.error('Error response:', errorText)
      
      // Try to parse error details from OpenWeatherMap
      let errorDetails = 'The API key may be invalid, expired, or not activated.'
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.message) {
          errorDetails = errorJson.message
        }
      } catch {
        // If not JSON, use the text as-is
        if (errorText) {
          errorDetails = errorText
        }
      }
      
      // Provide more helpful error messages
      if (weatherResponse.status === 401) {
        // Test URL for user to verify key manually
        const testUrl = `https://api.openweathermap.org/data/2.5/weather?lat=45.5&lon=-122.6&appid=${apiKey.substring(0, 4)}...&units=imperial`
        
        return NextResponse.json(
          { 
            error: 'Invalid API key. Please check that OPENWEATHER_API_KEY is correct in Vercel environment variables. Make sure to redeploy after adding the key.',
            details: errorDetails,
            troubleshooting: [
              '1. Test your API key directly in a browser: https://api.openweathermap.org/data/2.5/weather?lat=45.5&lon=-122.6&appid=YOUR_KEY&units=imperial',
              '2. New API keys can take up to 2 HOURS to activate, even if they show "Active" in the dashboard',
              '3. Verify your OpenWeatherMap account has an active subscription (free tier is fine)',
              '4. Check that the API key is not restricted to specific services in your OpenWeatherMap dashboard',
              '5. Ensure you copied the entire key (should be ~32 characters, no spaces)',
              '6. Try the other API key from your dashboard if you have multiple',
              '7. Wait a few hours and try again if the key was just created',
              '8. Check Vercel logs to verify the key being used (first 4 chars shown in logs)'
            ],
            apiKeyPrefix: apiKey.substring(0, 4),
            apiKeyLength: apiKey.length
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: `Failed to fetch weather data: ${weatherResponse.statusText}`, details: errorText },
        { status: weatherResponse.status }
      )
    }

    const weatherData = await weatherResponse.json()

    const temperature = Math.round(weatherData.main.temp)
    const condition = weatherData.weather[0]?.main || 'Unknown'
    const description = weatherData.weather[0]?.description || condition
    const humidity = weatherData.main.humidity
    const windSpeed = Math.round(weatherData.wind?.speed || 0)
    const isDay = weatherData.dt > weatherData.sys.sunrise && weatherData.dt < weatherData.sys.sunset

    // Generate work-related weather report
    const workReport = await generateWorkWeatherReport(
      temperature,
      description,
      humidity,
      windSpeed,
      locationName
    )

    return NextResponse.json({
      temperature,
      condition,
      description,
      humidity,
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

