import { getSupabaseClient } from '../config/supabaseClient'
import { embedText } from '../llm/embeddingService'
import type { DeckMetadataJson, TopicJson, SlideLabelJson } from '../llm/llmService'
import type { ElvexDeckMetadata, ElvexTopic, ElvexSlide } from './elvexService'
import type { N8nIngestPayload } from '../types/n8nPayloads'

export interface DeckRow {
  id: string
  created_at: string
  updated_at: string
  title: string
  gdrive_file_id: string
  gdrive_file_url: string | null
  deck_summary: string | null
  main_themes: string[]
  primary_audiences: string[]
  use_cases: string[]
}

export interface TopicRow {
  id: string
  created_at: string
  updated_at: string
  deck_id: string
  topic_title: string
  topic_summary: string
  story_context: string
  topics: string[]
  reuse_suggestions: string[]
  slide_numbers: number[]
  embedding: number[] | null
}

export interface SlideRow {
  id: string
  created_at: string
  updated_at: string
  deck_id: string
  slide_number: number
  slide_caption: string | null
  slide_type: string | null
  topics: string[]
  reusable: string | null
  embedding: number[] | null
}

export async function createDeckRecord(input: {
  title: string
  gdriveFileId: string
  gdriveFileUrl?: string
  deckMetadata: DeckMetadataJson | ElvexDeckMetadata
}): Promise<DeckRow> {
  const supabase = getSupabaseClient()

  const title = input.deckMetadata.deck_title || input.title

  const { data, error } = await supabase
    .from('decks')
    .insert({
      title,
      gdrive_file_id: input.gdriveFileId,
      gdrive_file_url: input.gdriveFileUrl || null,
      deck_summary: input.deckMetadata.deck_summary || null,
      main_themes: input.deckMetadata.main_themes || [],
      primary_audiences: input.deckMetadata.primary_audiences || [],
      use_cases: input.deckMetadata.use_cases_for_other_presentations || [],
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create deck record: ${error.message}`)
  }

  return data as DeckRow
}

export async function createTopicsForDeck(input: {
  deckId: string
  topics: TopicJson[] | ElvexTopic[]
}): Promise<TopicRow[]> {
  const supabase = getSupabaseClient()
  const topicRows: TopicRow[] = []

  for (const topic of input.topics) {
    // Generate embedding for topic_summary
    let embedding: number[] | null = null
    try {
      if (topic.topic_summary && topic.topic_summary.trim().length > 0) {
        embedding = await embedText(topic.topic_summary)
        // Add delay between embedding calls to avoid rate limits
        if (input.topics.indexOf(topic) < input.topics.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300)) // 300ms delay
        }
      }
    } catch (error) {
      console.warn(`Failed to generate embedding for topic "${topic.topic_title}":`, error)
      // Continue without embedding
    }

    const { data, error } = await supabase
      .from('topics')
      .insert({
        deck_id: input.deckId,
        topic_title: topic.topic_title,
        topic_summary: topic.topic_summary,
        story_context: topic.story_context,
        topics: topic.topics || [],
        reuse_suggestions: topic.reuse_suggestions || [],
        slide_numbers: topic.slide_numbers || [],
        embedding: embedding || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create topic record: ${error.message}`)
    }

    topicRows.push({
      ...data,
      embedding,
    } as TopicRow)
  }

  return topicRows
}

export async function createSlidesForDeck(input: {
  deckId: string
  slides: { slideNumber: number; slideText: string; label: SlideLabelJson }[]
}): Promise<SlideRow[]> {
  const supabase = getSupabaseClient()
  const slideRows: SlideRow[] = []

  for (const slide of input.slides) {
    // Generate embedding for slide_caption if present
    let embedding: number[] | null = null
    try {
      if (slide.label.slide_caption && slide.label.slide_caption.trim().length > 0) {
        embedding = await embedText(slide.label.slide_caption)
        // Add delay between embedding calls to avoid rate limits
        if (input.slides.indexOf(slide) < input.slides.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300)) // 300ms delay
        }
      }
    } catch (error) {
      console.warn(`Failed to generate embedding for slide ${slide.slideNumber}:`, error)
      // Continue without embedding
    }

    const { data, error } = await supabase
      .from('slides')
      .insert({
        deck_id: input.deckId,
        slide_number: slide.slideNumber,
        slide_caption: slide.label.slide_caption || null,
        slide_type: slide.label.slide_type || null,
        topics: slide.label.topics || [],
        reusable: slide.label.reusable || null,
        embedding: embedding || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create slide record: ${error.message}`)
    }

    slideRows.push({
      ...data,
      embedding,
    } as SlideRow)
  }

  return slideRows
}

/**
 * Ingest a fully processed deck from n8n
 * Handles transaction logic and field mapping (deck.deck_title -> title, googleFileId -> gdrive_file_id)
 */
export async function ingestDeckFromN8n(payload: N8nIngestPayload): Promise<{ deckId: string; googleFileId: string }> {
  const supabase = getSupabaseClient()

  // Start transaction by checking if deck exists
  const { data: existingDeck } = await supabase
    .from('decks')
    .select('id')
    .eq('gdrive_file_id', payload.googleFileId)
    .single()

  let deckId: string

  if (existingDeck) {
    // Update existing deck
    deckId = existingDeck.id

    // Delete existing topics and slides (CASCADE will handle this, but explicit is clearer)
    await supabase.from('topics').delete().eq('deck_id', deckId)
    await supabase.from('slides').delete().eq('deck_id', deckId)

    // Update deck row
    const { error: updateError } = await supabase
      .from('decks')
      .update({
        title: payload.deck.deck_title, // Map deck_title -> title
        deck_summary: payload.deck.deck_summary || null,
        main_themes: payload.deck.main_themes || [],
        primary_audiences: payload.deck.primary_audiences || [],
        use_cases: payload.deck.use_cases || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', deckId)

    if (updateError) {
      throw new Error(`Failed to update deck: ${updateError.message}`)
    }
  } else {
    // Insert new deck
    const { data: newDeck, error: insertError } = await supabase
      .from('decks')
      .insert({
        title: payload.deck.deck_title, // Map deck_title -> title
        gdrive_file_id: payload.googleFileId, // Map googleFileId -> gdrive_file_id
        deck_summary: payload.deck.deck_summary || null,
        main_themes: payload.deck.main_themes || [],
        primary_audiences: payload.deck.primary_audiences || [],
        use_cases: payload.deck.use_cases || [],
      })
      .select('id')
      .single()

    if (insertError) {
      throw new Error(`Failed to create deck: ${insertError.message}`)
    }

    if (!newDeck) {
      throw new Error('Failed to create deck: no ID returned')
    }

    deckId = newDeck.id
  }

  // Insert topics with embeddings
  if (payload.topics.length > 0) {
    const topicsToInsert = payload.topics.map((topic) => ({
      deck_id: deckId,
      topic_title: topic.topic_title,
      topic_summary: topic.topic_summary,
      story_context: topic.story_context,
      topics: topic.topics || [],
      reuse_suggestions: topic.reuse_suggestions || [],
      slide_numbers: topic.slide_numbers || [],
      embedding: topic.embedding, // Embedding already provided by n8n
    }))

    const { error: topicsError } = await supabase.from('topics').insert(topicsToInsert)

    if (topicsError) {
      throw new Error(`Failed to insert topics: ${topicsError.message}`)
    }
  }

  // Insert slides with embeddings
  if (payload.slides.length > 0) {
    const slidesToInsert = payload.slides.map((slide) => ({
      deck_id: deckId,
      slide_number: slide.slide_number,
      slide_caption: slide.slide_caption || null,
      slide_type: slide.slide_type || null,
      topics: slide.topics || [],
      reusable: slide.reusable || null, // Text, not boolean
      embedding: slide.embedding, // Embedding already provided by n8n
    }))

    const { error: slidesError } = await supabase.from('slides').insert(slidesToInsert)

    if (slidesError) {
      throw new Error(`Failed to insert slides: ${slidesError.message}`)
    }
  }

  return {
    deckId,
    googleFileId: payload.googleFileId,
  }
}

