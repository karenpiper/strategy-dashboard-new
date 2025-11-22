export const DECK_PROMPT = `
You are analyzing a presentation deck used in an agency or consulting context.

You receive the deck text, slide by slide, in this format:

"Slide 1:
[text]

Slide 2:
[text]

..."

Your goal is to produce a JSON object with this exact shape:

{
  "deck_title": "cleaned up title in one line",
  "deck_summary": "2-4 sentences in plain language that explain what this deck is about and what problem it addresses.",
  "main_themes": ["short phrase", "short phrase", "..."],
  "primary_audiences": ["job roles or industries", "..."],
  "use_cases_for_other_presentations": [
    "Short sentence describing when this deck is useful to reuse in another presentation.",
    "..."
  ]
}

Rules:

Only use information clearly present in the text.

If you are not sure about a field, use an empty string or an empty array as appropriate.

Respond with JSON only, no commentary.

Deck text:
{{DECK_TEXT}}
`

export function buildDeckPrompt(deckText: string): string {
  return DECK_PROMPT.replace('{{DECK_TEXT}}', deckText)
}

