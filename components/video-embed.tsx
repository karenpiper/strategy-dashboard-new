'use client'

import { useMemo } from 'react'
import { useMode } from '@/contexts/mode-context'
import { Video, ExternalLink } from 'lucide-react'

interface VideoEmbedProps {
  videoUrl: string
  title?: string
  platform?: string | null
  thumbnailUrl?: string | null
  className?: string
  aspectRatio?: '16/9' | '4/3' | '1/1'
}

type PlatformType = 'youtube' | 'vimeo' | 'zoom' | 'direct' | 'unknown'

export function VideoEmbed({ 
  videoUrl, 
  title, 
  platform,
  thumbnailUrl,
  className = '',
  aspectRatio = '16/9'
}: VideoEmbedProps) {
  const { mode } = useMode()

  // Detect platform and extract embed URL
  const embedData = useMemo(() => {
    if (!videoUrl) return null

    const url = videoUrl.trim()
    let detectedPlatform: PlatformType = 'unknown'
    let embedUrl: string | null = null

    // Detect platform from URL or use provided platform
    if (platform) {
      detectedPlatform = platform.toLowerCase() as PlatformType
    } else {
      // Auto-detect from URL
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        detectedPlatform = 'youtube'
      } else if (url.includes('vimeo.com')) {
        detectedPlatform = 'vimeo'
      } else if (url.includes('zoom.us')) {
        detectedPlatform = 'zoom'
      } else {
        detectedPlatform = 'direct'
      }
    }

    // Convert to embed URL based on platform
    switch (detectedPlatform) {
      case 'youtube': {
        // Handle various YouTube URL formats
        let videoId: string | null = null
        
        // youtube.com/watch?v=ID
        const watchMatch = url.match(/[?&]v=([^&]+)/)
        if (watchMatch) {
          videoId = watchMatch[1]
        }
        // youtube.com/embed/ID
        else if (url.includes('/embed/')) {
          videoId = url.split('/embed/')[1]?.split('?')[0]
        }
        // youtu.be/ID
        else if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1]?.split('?')[0]
        }
        // youtube.com/v/ID
        else if (url.includes('/v/')) {
          videoId = url.split('/v/')[1]?.split('?')[0]
        }

        if (videoId) {
          embedUrl = `https://www.youtube.com/embed/${videoId}`
        }
        break
      }

      case 'vimeo': {
        // Handle Vimeo URL formats
        let videoId: string | null = null
        
        // vimeo.com/ID
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
        if (vimeoMatch) {
          videoId = vimeoMatch[1]
        }
        // player.vimeo.com/video/ID
        else if (url.includes('/video/')) {
          videoId = url.split('/video/')[1]?.split('?')[0]
        }

        if (videoId) {
          embedUrl = `https://player.vimeo.com/video/${videoId}`
        }
        break
      }

      case 'zoom': {
        // Zoom recordings can be embedded
        // Zoom cloud recording URLs typically look like:
        // https://zoom.us/rec/share/... or https://us02web.zoom.us/rec/share/...
        // For embedding, we need to check if it's a shareable recording link
        if (url.includes('/rec/share/') || url.includes('/rec/play/')) {
          // Zoom recordings can be embedded directly
          embedUrl = url
        } else {
          // For other Zoom URLs, we might need to use the direct link
          embedUrl = url
        }
        break
      }

      case 'direct': {
        // For direct video links, try to embed directly
        embedUrl = url
        break
      }

      default:
        embedUrl = url
    }

    return {
      platform: detectedPlatform,
      embedUrl,
      originalUrl: url
    }
  }, [videoUrl, platform])

  const getCardStyle = () => {
    switch (mode) {
      case 'chaos':
        return {
          bg: 'bg-[#000000]',
          border: 'border border-[#C4F500]',
          text: 'text-white',
          accent: '#C4F500'
        }
      case 'chill':
        return {
          bg: 'bg-white',
          border: 'border border-[#FFC043]/30',
          text: 'text-[#4A1818]',
          accent: '#FFC043'
        }
      case 'code':
        return {
          bg: 'bg-[#000000]',
          border: 'border border-[#FFFFFF]',
          text: 'text-[#FFFFFF]',
          accent: '#FFFFFF'
        }
      default:
        return {
          bg: 'bg-[#000000]',
          border: 'border border-[#C4F500]',
          text: 'text-white',
          accent: '#C4F500'
        }
    }
  }

  const getRoundedClass = (base: string) => {
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    return base
  }

  const style = getCardStyle()
  const aspectRatioClass = {
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square'
  }[aspectRatio]

  if (!embedData || !embedData.embedUrl) {
    return (
      <div className={`${style.bg} ${style.border} border p-4 ${getRoundedClass('rounded-lg')} ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Video className={`w-4 h-4 ${style.text}`} />
          <span className={`text-sm font-semibold ${style.text}`}>{title || 'Video'}</span>
        </div>
        <p className={`text-xs ${style.text}/70 mb-2`}>Unable to generate embed for this video URL.</p>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs ${style.text} underline flex items-center gap-1`}
        >
          Open in new tab <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    )
  }

  // For Zoom, we might need special handling
  const isZoom = embedData.platform === 'zoom'
  const needsDirectLink = embedData.platform === 'direct' || (isZoom && !embedData.embedUrl.includes('/rec/'))

  if (needsDirectLink) {
    // For direct links or non-embeddable Zoom URLs, show a link card
    return (
      <div className={`${style.bg} ${style.border} border p-4 ${getRoundedClass('rounded-lg')} ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Video className={`w-4 h-4 ${style.text}`} />
          <span className={`text-sm font-semibold ${style.text}`}>{title || 'Video'}</span>
        </div>
        <p className={`text-xs ${style.text}/70 mb-3`}>
          {embedData.platform === 'zoom' 
            ? 'This Zoom recording may require authentication to view.'
            : 'This video cannot be embedded directly.'}
        </p>
        <a
          href={embedData.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-3 py-2 ${getRoundedClass('rounded-md')} text-sm font-medium transition-colors ${
            mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
            mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
            'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          Open Video
        </a>
      </div>
    )
  }

  return (
    <div className={`${style.bg} ${style.border} border overflow-hidden ${getRoundedClass('rounded-lg')} ${className}`}>
      {title && (
        <div className={`p-3 border-b ${style.border}`}>
          <div className="flex items-center gap-2">
            <Video className={`w-4 h-4 ${style.text}`} />
            <span className={`text-sm font-semibold ${style.text}`}>{title}</span>
          </div>
        </div>
      )}
      <div className={`relative w-full ${aspectRatioClass} bg-black`}>
        <iframe
          src={embedData.embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title={title || 'Video embed'}
        />
      </div>
      {embedData.platform === 'zoom' && (
        <div className={`p-2 border-t ${style.border}`}>
          <p className={`text-xs ${style.text}/70 text-center`}>
            Zoom recordings may require authentication
          </p>
        </div>
      )}
    </div>
  )
}

