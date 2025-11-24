'use client'

import { Music, ExternalLink } from 'lucide-react'
import { useMode } from '@/contexts/mode-context'
import '../styles/playlist-card.css'

interface PlaylistCardProps {
  id: string
  title: string | null
  curator: string
  description: string | null
  spotify_url: string
  cover_url: string | null
  curator_photo_url: string | null
  date: string
  week_label?: string | null
  onClick?: () => void
}

export function PlaylistCard({
  title,
  curator,
  description,
  spotify_url,
  cover_url,
  curator_photo_url,
  date,
  week_label,
  onClick
}: PlaylistCardProps) {
  const { mode } = useMode()

  const getRoundedClass = (base: string) => {
    if (mode === 'code') return 'rounded-none'
    return base
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (spotify_url) {
      window.open(spotify_url, '_blank')
    }
  }

  // Format date
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  // Fallback images
  const albumArtwork = cover_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop"
  const curatorAvatar = curator_photo_url || null

  return (
    <div 
      className={`playlist-card w-full cursor-pointer group`}
      onClick={handleClick}
    >
      {/* Media Row: cover and vinyl with proper overlap */}
      <div className="media mb-4">
        <div className="mediaGroup">
          {/* Cover - positioned on top */}
          <img
            src={albumArtwork}
            alt={title || 'Playlist cover'}
            className={`object-cover w-[var(--cover)] h-[var(--cover)] ${getRoundedClass('rounded-lg')} ring-2 transition-all group-hover:ring-4 relative z-10`}
            style={{
              ringColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF',
              ringOpacity: mode === 'chaos' ? '0.3' : mode === 'chill' ? '0.3' : '0.2'
            }}
          />
          {/* Vinyl - positioned behind cover */}
          <div className="vinylWrap">
            <div className={`vinyl ${getRoundedClass('rounded-full')} bg-black/90 ring-1 ring-black/40 pointer-events-none`}>
              {/* center label avatar */}
              {curatorAvatar ? (
                <>
                  <img
                    src={curatorAvatar}
                    alt={curator}
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 ${getRoundedClass('rounded-full')} ring-2 object-cover`}
                    style={{
                      ringColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#10b981'
                    }}
                    aria-hidden="true"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        const fallback = parent.querySelector('.playlist-curator-avatar-fallback') as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }
                    }}
                  />
                  <div 
                    className={`playlist-curator-avatar-fallback absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 ${getRoundedClass('rounded-full')} flex items-center justify-center text-white font-semibold text-base md:text-lg lg:text-xl hidden`}
                    style={{
                      backgroundColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#10b981',
                      color: mode === 'chaos' || mode === 'code' ? '#000000' : mode === 'chill' ? '#4A1818' : '#000000'
                    }}
                  >
                    {curator.charAt(0).toUpperCase()}
                  </div>
                </>
              ) : (
                <div 
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 ${getRoundedClass('rounded-full')} flex items-center justify-center text-white font-semibold text-base md:text-lg lg:text-xl`}
                  style={{
                    backgroundColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#10b981',
                    color: mode === 'chaos' || mode === 'code' ? '#000000' : mode === 'chill' ? '#4A1818' : '#000000'
                  }}
                >
                  {curator.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content below media row */}
      <div className="content text-left space-y-1">
        {title && (
          <h3 className={`text-lg md:text-xl font-semibold line-clamp-2 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-foreground'}`}>
            {title}
          </h3>
        )}
        <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/80' : 'text-foreground/80'}`}>
          by {curator}
        </p>
        {week_label && (
          <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-foreground/60'}`}>
            {week_label}
          </p>
        )}
        {description && (
          <p className={`text-xs md:text-sm mt-2 line-clamp-2 ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-foreground/70'}`}>
            {description}
          </p>
        )}
        <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/50' : 'text-foreground/50'}`}>
          {formattedDate}
        </p>
      </div>

      {/* Spotify Link Button */}
      <div className="mt-4">
        <button
          type="button"
          aria-label="Open in Spotify"
          onClick={(e) => {
            e.stopPropagation()
            if (spotify_url) {
              window.open(spotify_url, '_blank')
            }
          }}
          className={`h-10 px-4 ${getRoundedClass('rounded-full')} inline-flex items-center gap-2 transition-all hover:scale-105 focus:outline-none focus:ring-2`}
          style={{
            backgroundColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#10b981',
            color: mode === 'chaos' || mode === 'code' ? '#000000' : mode === 'chill' ? '#4A1818' : '#FFFFFF',
            focusRingColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#10b981'
          }}
        >
          <Music className="w-4 h-4" aria-hidden="true" />
          <span className="font-medium text-xs">Spotify</span>
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}


