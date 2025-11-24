/**
 * Utility functions to extract video IDs and fetch thumbnails from various platforms
 */

export type PlatformType = 'youtube' | 'vimeo' | 'zoom' | 'direct' | 'unknown'

export interface VideoInfo {
  platform: PlatformType
  videoId: string | null
  embedUrl: string | null
  thumbnailUrl: string | null
}

/**
 * Extract video ID from YouTube URL
 */
function extractYouTubeId(url: string): string | null {
  // youtube.com/watch?v=ID
  const watchMatch = url.match(/[?&]v=([^&]+)/)
  if (watchMatch) return watchMatch[1]
  
  // youtube.com/embed/ID
  if (url.includes('/embed/')) {
    const embedMatch = url.match(/\/embed\/([^?]+)/)
    if (embedMatch) return embedMatch[1]
  }
  
  // youtu.be/ID
  if (url.includes('youtu.be/')) {
    const shortMatch = url.match(/youtu\.be\/([^?]+)/)
    if (shortMatch) return shortMatch[1]
  }
  
  // youtube.com/v/ID
  if (url.includes('/v/')) {
    const vMatch = url.match(/\/v\/([^?]+)/)
    if (vMatch) return vMatch[1]
  }
  
  return null
}

/**
 * Extract video ID from Vimeo URL
 */
function extractVimeoId(url: string): string | null {
  // vimeo.com/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return vimeoMatch[1]
  
  // player.vimeo.com/video/ID
  if (url.includes('/video/')) {
    const videoMatch = url.match(/\/video\/(\d+)/)
    if (videoMatch) return videoMatch[1]
  }
  
  return null
}

/**
 * Get YouTube thumbnail URL
 */
function getYouTubeThumbnail(videoId: string): string {
  // Try maxresdefault first (highest quality), fallback to hqdefault
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}

/**
 * Get Vimeo thumbnail URL using oEmbed API
 */
async function getVimeoThumbnail(videoId: string): Promise<string | null> {
  try {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`
    const response = await fetch(oembedUrl)
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    return data.thumbnail_url || null
  } catch (error) {
    console.error('Error fetching Vimeo thumbnail:', error)
    return null
  }
}

/**
 * Parse video URL and extract platform info
 */
export function parseVideoUrl(url: string, platform?: string | null): VideoInfo {
  const trimmedUrl = url.trim()
  let detectedPlatform: PlatformType = 'unknown'
  let videoId: string | null = null
  let embedUrl: string | null = null

  // Detect platform
  if (platform) {
    detectedPlatform = platform.toLowerCase() as PlatformType
  } else {
    if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
      detectedPlatform = 'youtube'
    } else if (trimmedUrl.includes('vimeo.com')) {
      detectedPlatform = 'vimeo'
    } else if (trimmedUrl.includes('zoom.us')) {
      detectedPlatform = 'zoom'
    } else {
      detectedPlatform = 'direct'
    }
  }

  // Extract video ID and create embed URL
  switch (detectedPlatform) {
    case 'youtube': {
      videoId = extractYouTubeId(trimmedUrl)
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`
      }
      break
    }
    case 'vimeo': {
      videoId = extractVimeoId(trimmedUrl)
      if (videoId) {
        embedUrl = `https://player.vimeo.com/video/${videoId}`
      }
      break
    }
    case 'zoom': {
      // Zoom URLs are typically share links, use as-is
      embedUrl = trimmedUrl
      break
    }
    default: {
      embedUrl = trimmedUrl
    }
  }

  return {
    platform: detectedPlatform,
    videoId,
    embedUrl,
    thumbnailUrl: null // Will be set by fetchThumbnail
  }
}

/**
 * Fetch thumbnail URL for a video
 */
export async function fetchThumbnail(videoUrl: string, platform?: string | null): Promise<string | null> {
  try {
    const videoInfo = parseVideoUrl(videoUrl, platform)
    
    switch (videoInfo.platform) {
      case 'youtube': {
        if (videoInfo.videoId) {
          // Try maxresdefault first, but also provide fallback
          return getYouTubeThumbnail(videoInfo.videoId)
        }
        break
      }
      case 'vimeo': {
        if (videoInfo.videoId) {
          return await getVimeoThumbnail(videoInfo.videoId)
        }
        break
      }
      case 'zoom': {
        // Zoom doesn't have a public thumbnail API
        // Return null and let the UI handle it
        return null
      }
      default: {
        // For direct links, we can't fetch thumbnails
        return null
      }
    }
  } catch (error) {
    console.error('Error fetching thumbnail:', error)
  }
  
  return null
}

/**
 * Verify if a thumbnail URL is accessible
 */
export async function verifyThumbnailUrl(thumbnailUrl: string): Promise<boolean> {
  try {
    const response = await fetch(thumbnailUrl, { method: 'HEAD' })
    return response.ok
  } catch (error) {
    return false
  }
}

