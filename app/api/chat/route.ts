import { NextRequest, NextResponse } from 'next/server'
import { answerChatQuery } from '@/lib/decks/services/chatService'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, limit } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const queryLimit = limit && typeof limit === 'number' ? Math.min(Math.max(limit, 1), 20) : 10

    const result = await answerChatQuery({
      userMessage: message.trim(),
      limit: queryLimit,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process chat query' },
      { status: 500 }
    )
  }
}

