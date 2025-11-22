export const SLIDE_PROMPT = `
You are labeling a single presentation slide.

You receive the text content of a slide. Return a JSON object with this exact shape:

{
  "slide_type": "one of: 'case_study', 'vision', 'market_context', 'data_chart', 'model', 'process', 'roadmap', 'cover', 'credits', 'other'",
  "slide_caption": "one sentence in plain language that explains what this slide is about.",
  "topics": ["short keyword or phrase", "..."],
  "reusable": "yes" or "no" or "needs_edit"
}

Rules:

Use only the information present in the slide text.

Keep slide_caption short and concrete.

Respond with JSON only, no commentary.

Slide text:
{{SLIDE_TEXT}}
`

export function buildSlidePrompt(slideText: string): string {
  return SLIDE_PROMPT.replace('{{SLIDE_TEXT}}', slideText)
}

