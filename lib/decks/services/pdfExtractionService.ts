import pdfParse from 'pdf-parse'

export interface ExtractedSlide {
  slideNumber: number
  text: string
}

export async function extractSlidesFromPdf(buffer: Buffer): Promise<ExtractedSlide[]> {
  try {
    const data = await pdfParse(buffer)
    const pages = data.numpages

    if (pages === 0) {
      throw new Error('PDF has no pages')
    }

    // Extract text from each page
    // pdf-parse gives us the full text, so we need to split by pages
    // For now, we'll use a simple approach: split by page breaks if available
    // Otherwise, we'll treat the entire document as one slide (fallback)
    
    // Try to extract page-by-page text
    const slides: ExtractedSlide[] = []
    
    // pdf-parse doesn't directly support page-by-page extraction in the free version
    // We'll need to parse the full text and try to identify page boundaries
    // For v1, we'll use a simpler approach: split the text roughly by page count
    
    const fullText = data.text
    const textPerPage = fullText.length / pages
    
    // If we can't reliably split, treat each "chunk" as a page
    // This is a limitation of pdf-parse - for better results, consider pdfjs-dist
    for (let i = 0; i < pages; i++) {
      const start = Math.floor(i * textPerPage)
      const end = i === pages - 1 ? fullText.length : Math.floor((i + 1) * textPerPage)
      const pageText = fullText.substring(start, end).trim()
      
      slides.push({
        slideNumber: i + 1,
        text: pageText || `Slide ${i + 1}`, // Fallback if no text
      })
    }

    return slides
  } catch (error: any) {
    console.error('Error extracting PDF:', error)
    throw new Error(`Failed to extract PDF: ${error.message || 'Unknown error'}`)
  }
}

