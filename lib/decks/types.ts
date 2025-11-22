/**
 * Shared types for deck ingestion system
 */

export interface DeckMetadataJson {
  deck_title: string
  deck_summary: string
  main_themes: string[]
  primary_audiences: string[]
  use_cases_for_other_presentations: string[]
}

export interface TopicJson {
  topic_title: string
  topic_summary: string
  story_context: string
  topics: string[]
  reuse_suggestions: string[]
  slide_numbers: number[]
}

export interface SlideLabelJson {
  slide_type: string
  slide_caption: string
  topics: string[]
  reusable: string
}

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

export interface SearchResult {
  type: 'topic' | 'slide'
  deck_id: string
  deck_title: string
  topic_id?: string
  slide_id?: string
  slide_number?: number
  summary: string
  score: number
}

export interface ChatReference {
  deck_id: string
  deck_title: string
  topic_id?: string
  topic_title?: string
  slide_id?: string
  slide_number?: number
}

