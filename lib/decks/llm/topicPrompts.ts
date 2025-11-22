export const TOPICS_PROMPT = `
You are analyzing a full presentation deck and must segment it into logical topics that represent distinct parts of the story.

You will receive the deck text, slide by slide, in this format:

"Slide 1:
[text]

Slide 2:
[text]

..."

Return a JSON array of topics. Each topic is one object with this exact shape:

{
  "topic_title": "short name for this topic",
  "topic_summary": "3-5 sentence description of what this topic covers in plain language.",
  "story_context": "one of: 'credibility', 'market_problem', 'solution_vision', 'implementation', 'results', 'other'. Choose the closest.",
  "topics": ["short keyword or phrase", "..."],
  "reuse_suggestions": [
    "Short sentence describing how this topic or group of slides could be reused in another presentation.",
    "..."
  ],
  "slide_numbers": [list of slide numbers this topic covers]
}

Rules:

Use only information clearly present in the deck text.

Create around 5 to 12 topics for a typical deck.

Slide numbers must match the input slide numbers.

Respond with a JSON array only, no commentary.

Deck text:
{{DECK_TEXT}}
`

export function buildTopicsPrompt(deckText: string): string {
  return TOPICS_PROMPT.replace('{{DECK_TEXT}}', deckText)
}

