/**
 * Type definitions and validation schemas for n8n webhook payloads
 */

import { z } from 'zod'

// Request body for /api/internal/decks/ingest-ready
export const N8nIngestPayloadSchema = z.object({
  googleFileId: z.string().min(1, 'googleFileId is required'),
  deck: z.object({
    deck_title: z.string().min(1, 'deck_title is required'),
    deck_summary: z.string().nullable().optional(),
    main_themes: z.array(z.string()).default([]),
    primary_audiences: z.array(z.string()).default([]),
    use_cases: z.array(z.string()).default([]),
  }),
  topics: z.array(
    z.object({
      topic_title: z.string().min(1, 'topic_title is required'),
      topic_summary: z.string().min(1, 'topic_summary is required'),
      story_context: z.string().min(1, 'story_context is required'),
      topics: z.array(z.string()).default([]),
      reuse_suggestions: z.array(z.string()).default([]),
      slide_numbers: z.array(z.number().int().positive()).default([]),
      embedding: z.array(z.number()).length(1536, 'Embedding must be exactly 1536 dimensions'),
    })
  ).default([]),
  slides: z.array(
    z.object({
      slide_number: z.number().int().positive(),
      slide_caption: z.string().nullable().optional(),
      slide_type: z.string().nullable().optional(),
      topics: z.array(z.string()).default([]),
      reusable: z.string().nullable().optional(), // Text, not boolean
      embedding: z.array(z.number()).length(1536, 'Embedding must be exactly 1536 dimensions'),
    })
  ).default([]),
})

export type N8nIngestPayload = z.infer<typeof N8nIngestPayloadSchema>

// Request body for /api/internal/decks/extract-slides
export const N8nExtractSlidesRequestSchema = z.object({
  googleFileId: z.string().min(1, 'googleFileId is required'),
})

export type N8nExtractSlidesRequest = z.infer<typeof N8nExtractSlidesRequestSchema>

// Response from /api/internal/decks/extract-slides
export const N8nExtractSlidesResponseSchema = z.object({
  googleFileId: z.string(),
  slides: z.array(
    z.object({
      slide_number: z.number().int().positive(),
      text: z.string(),
    })
  ),
})

export type N8nExtractSlidesResponse = z.infer<typeof N8nExtractSlidesResponseSchema>

// Webhook payload from frontend to n8n
export const N8nWebhookPayloadSchema = z.object({
  googleFileId: z.string().min(1, 'googleFileId is required'),
  originalFilename: z.string().optional(),
  uploaderUserId: z.string().optional(),
  uploaderEmail: z.string().optional(),
})

export type N8nWebhookPayload = z.infer<typeof N8nWebhookPayloadSchema>







