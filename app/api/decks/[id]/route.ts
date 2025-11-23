import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/decks/config/supabaseClient'
import type { DeckRow, TopicRow, SlideRow } from '@/lib/decks/services/ingestionService'

export const runtime = 'nodejs'

/**
 * Get deck by ID with related topics and slides
 * GET /api/decks/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deckId = params.id

    if (!deckId) {
      return NextResponse.json(
        { error: 'Deck ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Get deck
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .single()

    if (deckError || !deck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    // Get topics
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true })

    if (topicsError) {
      console.error('Error fetching topics:', topicsError)
      // Continue without topics rather than failing
    }

    // Get slides
    const { data: slides, error: slidesError } = await supabase
      .from('slides')
      .select('*')
      .eq('deck_id', deckId)
      .order('slide_number', { ascending: true })

    if (slidesError) {
      console.error('Error fetching slides:', slidesError)
      // Continue without slides rather than failing
    }

    return NextResponse.json({
      id: deck.id,
      title: deck.title,
      gdrive_file_id: deck.gdrive_file_id,
      gdrive_file_url: deck.gdrive_file_url,
      deck_summary: deck.deck_summary,
      main_themes: deck.main_themes || [],
      primary_audiences: deck.primary_audiences || [],
      use_cases: deck.use_cases || [],
      created_at: deck.created_at,
      updated_at: deck.updated_at,
      topics: (topics as TopicRow[]) || [],
      slides: (slides as SlideRow[]) || [],
    })
  } catch (error: any) {
    console.error('Error fetching deck:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch deck',
      },
      { status: 500 }
    )
  }
}

