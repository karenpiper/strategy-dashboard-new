import { NextRequest, NextResponse } from 'next/server'
import { searchKeywordAndSemantic } from '@/lib/decks/services/searchService'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limitParam = searchParams.get('limit')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 20
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be a number between 1 and 100' },
        { status: 400 }
      )
    }

    const results = await searchKeywordAndSemantic(query.trim(), { limit })

    return NextResponse.json({
      query: query.trim(),
      results,
    })
  } catch (error: any) {
    console.error('Error searching:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to perform search' },
      { status: 500 }
    )
  }
}

