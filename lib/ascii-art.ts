/**
 * Converts an image URL to ASCII art
 * @param imageUrl - URL of the image to convert
 * @param width - Width of ASCII art in characters (default: 60)
 * @param height - Height of ASCII art in characters (default: 30)
 * @returns Promise<string> - ASCII art representation of the image
 */
/**
 * Converts an image URL to ASCII art
 * Handles CORS issues by proxying through fetch API
 * @param imageUrl - URL of the image to convert
 * @param width - Width of ASCII art in characters (default: 60)
 * @param height - Height of ASCII art in characters (default: 30)
 * @returns Promise<string> - ASCII art representation of the image
 */
export async function imageToAscii(
  imageUrl: string,
  width: number = 60,
  height: number = 30
): Promise<string> {
  try {
    // Fetch the image as a blob to handle CORS issues
    const response = await fetch(imageUrl, { mode: 'cors' })
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          // Create a canvas to draw the image
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            URL.revokeObjectURL(objectUrl)
            reject(new Error('Could not get canvas context'))
            return
          }
          
          // Set canvas size to match desired ASCII dimensions
          canvas.width = width
          canvas.height = height
          
          // Draw the image to the canvas (scaled down)
          ctx.drawImage(img, 0, 0, width, height)
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, width, height)
          const data = imageData.data
          
          // ASCII characters from darkest to lightest
          const asciiChars = '@%#*+=-:. '
          
          let asciiArt = ''
          
          // Process each pixel
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const index = (y * width + x) * 4
              
              // Get RGB values
              const r = data[index]
              const g = data[index + 1]
              const b = data[index + 2]
              
              // Calculate brightness (luminance formula)
              const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255
              
              // Map brightness to ASCII character
              const charIndex = Math.floor(brightness * (asciiChars.length - 1))
              const char = asciiChars[charIndex]
              
              asciiArt += char
            }
            asciiArt += '\n'
          }
          
          // Clean up object URL
          URL.revokeObjectURL(objectUrl)
          resolve(asciiArt)
        } catch (error) {
          URL.revokeObjectURL(objectUrl)
          reject(error)
        }
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Failed to load image'))
      }
      
      img.src = objectUrl
    })
  } catch (error: any) {
    // If CORS fails, return a placeholder ASCII art
    console.warn('Failed to convert image to ASCII (CORS issue):', error.message)
    return generatePlaceholderAscii(width, height)
  }
}

/**
 * Generate a placeholder ASCII art when image conversion fails
 */
function generatePlaceholderAscii(width: number, height: number): string {
  let ascii = ''
  const placeholder = '█'
  const empty = ' '
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create a simple pattern
      if ((x + y) % 4 === 0) {
        ascii += placeholder
      } else {
        ascii += empty
      }
    }
    ascii += '\n'
  }
  
  return ascii
}

