'use client'

import { useState, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import { useMode } from '@/contexts/mode-context'

interface SpotifyPlayerProps {
  albumCoverUrl?: string
  trackName?: string
  artistName?: string
  isPlaying?: boolean
  onPlayPause?: () => void
  className?: string
}

export function SpotifyPlayer({
  albumCoverUrl = 'https://via.placeholder.com/300/1DB954/FFFFFF?text=Album',
  trackName = 'Track Name',
  artistName = 'Artist Name',
  isPlaying = false,
  onPlayPause,
  className = '',
}: SpotifyPlayerProps) {
  const { mode } = useMode()
  const [isSpinning, setIsSpinning] = useState(isPlaying)

  useEffect(() => {
    setIsSpinning(isPlaying)
  }, [isPlaying])

  const handlePlayPause = () => {
    if (onPlayPause) {
      onPlayPause()
    } else {
      setIsSpinning(!isSpinning)
    }
  }

  const getRoundedClass = (baseClass: string) => {
    return mode === 'code' ? baseClass.replace(/rounded-[^s]*/g, 'rounded-none') : baseClass
  }

  return (
    <div className={`relative ${className}`}>
      {/* Spinning Record Container */}
      <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-4">
        {/* Outer ring (record edge) */}
        <div className={`absolute inset-0 ${getRoundedClass('rounded-full')} bg-gradient-to-br from-gray-800 via-gray-900 to-black border-4 ${
          mode === 'chaos' ? 'border-[#FF00FF]/30' : 
          mode === 'chill' ? 'border-[#FFB5D8]/30' : 
          'border-white/20'
        } shadow-2xl`} />
        
        {/* Album Cover - Spinning */}
        <div className={`absolute inset-2 ${getRoundedClass('rounded-full')} overflow-hidden ${
          isSpinning ? 'animate-spin' : ''
        }`} style={{ animationDuration: '8s' }}>
          <img
            src={albumCoverUrl}
            alt={trackName}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              e.currentTarget.src = 'https://via.placeholder.com/300/1DB954/FFFFFF?text=Album'
            }}
          />
        </div>

        {/* Center label (record center) */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 ${getRoundedClass('rounded-full')} ${
          mode === 'chaos' ? 'bg-black' : 
          mode === 'chill' ? 'bg-[#4A1818]' : 
          'bg-black'
        } border-2 ${
          mode === 'chaos' ? 'border-[#FF00FF]' : 
          mode === 'chill' ? 'border-[#FFB5D8]' : 
          'border-white/40'
        } flex items-center justify-center shadow-lg z-10`}>
          <div className={`w-2 h-2 ${getRoundedClass('rounded-full')} ${
            mode === 'chaos' ? 'bg-[#FF00FF]' : 
            mode === 'chill' ? 'bg-[#FFB5D8]' : 
            'bg-white/60'
          }`} />
        </div>

        {/* Play/Pause Button Overlay */}
        <button
          onClick={handlePlayPause}
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 ${getRoundedClass('rounded-full')} ${
            mode === 'chaos' ? 'bg-[#FF00FF] hover:bg-[#FF00FF]/80' : 
            mode === 'chill' ? 'bg-[#FFB5D8] hover:bg-[#FFB5D8]/80' : 
            'bg-white/90 hover:bg-white'
          } flex items-center justify-center shadow-xl transition-all z-20 opacity-0 hover:opacity-100 group-hover:opacity-100`}
          aria-label={isSpinning ? 'Pause' : 'Play'}
        >
          {isSpinning ? (
            <Pause className={`w-6 h-6 ${
              mode === 'chaos' || mode === 'code' ? 'text-black' : 'text-[#4A1818]'
            }`} />
          ) : (
            <Play className={`w-6 h-6 ${
              mode === 'chaos' || mode === 'code' ? 'text-black' : 'text-[#4A1818]'
            } ml-1`} />
          )}
        </button>
      </div>

      {/* Track Info */}
      <div className="text-center">
        <p className={`font-bold text-sm mb-1 ${
          mode === 'chaos' ? 'text-white' : 
          mode === 'chill' ? 'text-white' : 
          'text-white'
        } truncate`}>
          {trackName}
        </p>
        <p className={`text-xs ${
          mode === 'chaos' ? 'text-white/70' : 
          mode === 'chill' ? 'text-white/70' : 
          'text-white/70'
        } truncate`}>
          {artistName}
        </p>
      </div>
    </div>
  )
}

