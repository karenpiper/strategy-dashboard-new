import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get request body
    const body = await request.json()
    const { message, conversationHistory } = body

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Get Elvex configuration from environment variables
    // Use the same assistant ID and version as deck processing
    const apiKey = process.env.ELVEX_API_KEY
    const assistantId = process.env.ELVEX_ASSISTANT_ID
    const version = process.env.ELVEX_VERSION || process.env.ELVEX_CHAT_VERSION
    const baseUrl = process.env.ELVEX_BASE_URL || 'https://api.elvex.ai'

    if (!apiKey) {
      console.error('ELVEX_API_KEY is not set')
      return NextResponse.json(
        { error: 'Elvex API key is not configured' },
        { status: 500 }
      )
    }

    if (!assistantId) {
      console.error('ELVEX_ASSISTANT_ID is not set')
      return NextResponse.json(
        { error: 'Elvex assistant ID is not configured' },
        { status: 500 }
      )
    }

    if (!version) {
      console.error('ELVEX_VERSION or ELVEX_CHAT_VERSION is not set')
      return NextResponse.json(
        { error: 'Elvex version is not configured. Please set ELVEX_VERSION or ELVEX_CHAT_VERSION' },
        { status: 500 }
      )
    }

    // Build conversation context from history if provided
    // Elvex expects a prompt, so we'll format the conversation history as context
    let prompt = message.trim()
    
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      // Format conversation history as context
      const historyContext = conversationHistory
        .map((msg: { role: string; content: string }) => {
          if (msg.role === 'user') {
            return `User: ${msg.content}`
          } else if (msg.role === 'assistant') {
            return `Assistant: ${msg.content}`
          }
          return null
        })
        .filter(Boolean)
        .join('\n\n')
      
      prompt = `${historyContext}\n\nUser: ${message.trim()}`
    }

    // Call Elvex API
    const elvexUrl = `${baseUrl}/v0/apps/${assistantId}/versions/${version}/text/generate`
    
    const response = await fetch(elvexUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Elvex API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Elvex API error: ${response.status} ${errorText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // Extract the response text from Elvex response
    // The exact structure may vary, so we'll handle different possible formats
    let responseText = ''
    
    if (result.text) {
      responseText = result.text
    } else if (result.response) {
      responseText = result.response
    } else if (result.content) {
      responseText = result.content
    } else if (typeof result === 'string') {
      responseText = result
    } else {
      // If we can't find the text, return the whole result as JSON string
      responseText = JSON.stringify(result)
    }

    return NextResponse.json({
      message: responseText,
      success: true,
    })
  } catch (error: any) {
    console.error('Error in Elvex chat API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

