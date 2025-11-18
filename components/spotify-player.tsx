'use client'

import { useState, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMode } from '@/contexts/mode-context'

interface SpotifyPlayerProps {
  albumCoverUrl?: string
  userImageUrl?: string // User image for the center label
  trackName?: string
  artistName?: string
  isPlaying?: boolean
  onPlayPause?: () => void
  className?: string
  hideText?: boolean // Hide track info text
}

// Image with fallback component
function ImageWithFallback({ 
  src, 
  alt, 
  className = '',
  onError 
}: { 
  src: string
  alt: string
  className?: string
  onError?: () => void
}) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
    if (onError) onError()
  }

  if (didError) {
    return (
      <div className={`inline-block bg-gray-100 text-center align-middle ${className}`}>
        <div className="flex items-center justify-center w-full h-full">
          <span className="text-gray-400 text-xs">♪</span>
        </div>
      </div>
    )
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      onError={handleError}
    />
  )
}

export function SpotifyPlayer({
  albumCoverUrl = 'https://via.placeholder.com/300/1DB954/FFFFFF?text=Album',
  userImageUrl,
  trackName = 'Track Name',
  artistName = 'Artist Name',
  isPlaying = false,
  onPlayPause,
  className = '',
  hideText = false,
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
        {/* Vinyl Record with Spinning Animation */}
        <motion.div
          className={`w-full h-full ${getRoundedClass('rounded-full')} relative overflow-hidden shadow-2xl`}
          animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
          transition={{ 
            duration: 8, 
            repeat: isSpinning ? Infinity : 0, 
            ease: "linear" 
          }}
          style={{
            background: 'radial-gradient(circle at center, #1a1a1a 15%, #000000 30%, #1a1a1a 45%, #000000 60%, #1a1a1a 75%, #000000 90%)'
          }}
        >
          {/* Vinyl grooves - concentric circles for detail */}
          <div className={`absolute inset-0 ${getRoundedClass('rounded-full')} border-2 ${
            mode === 'chaos' ? 'border-[#FF00FF]/20' : 
            mode === 'chill' ? 'border-[#FFB5D8]/20' : 
            'border-gray-700/30'
          }`}></div>
          <div className={`absolute inset-3 ${getRoundedClass('rounded-full')} border ${
            mode === 'chaos' ? 'border-[#FF00FF]/15' : 
            mode === 'chill' ? 'border-[#FFB5D8]/15' : 
            'border-gray-700/25'
          }`}></div>
          <div className={`absolute inset-6 ${getRoundedClass('rounded-full')} border ${
            mode === 'chaos' ? 'border-[#FF00FF]/10' : 
            mode === 'chill' ? 'border-[#FFB5D8]/10' : 
            'border-gray-700/20'
          }`}></div>
          <div className={`absolute inset-9 ${getRoundedClass('rounded-full')} border ${
            mode === 'chaos' ? 'border-[#FF00FF]/8' : 
            mode === 'chill' ? 'border-[#FFB5D8]/8' : 
            'border-gray-700/15'
          }`}></div>
          <div className={`absolute inset-12 ${getRoundedClass('rounded-full')} border ${
            mode === 'chaos' ? 'border-[#FF00FF]/5' : 
            mode === 'chill' ? 'border-[#FFB5D8]/5' : 
            'border-gray-700/10'
          }`}></div>
          <div className={`absolute inset-16 ${getRoundedClass('rounded-full')} border ${
            mode === 'chaos' ? 'border-[#FF00FF]/3' : 
            mode === 'chill' ? 'border-[#FFB5D8]/3' : 
            'border-gray-700/8'
          }`}></div>
          
          {/* Center label with user image (or fallback) */}
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 ${getRoundedClass('rounded-full')} overflow-hidden border-2 ${
            mode === 'chaos' ? 'border-[#FF00FF] bg-[#FF00FF]/10' : 
            mode === 'chill' ? 'border-[#FFB5D8] bg-[#FFB5D8]/10' : 
            'border-yellow-400 bg-yellow-100'
          } shadow-lg`}>
            {userImageUrl ? (
              <ImageWithFallback 
                src={userImageUrl}
                alt="User"
                className="w-full h-full object-cover"
              />
            ) : albumCoverUrl ? (
              <ImageWithFallback 
                src={albumCoverUrl}
                alt={trackName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full ${
                mode === 'chaos' ? 'bg-[#FF00FF]/20' : 
                mode === 'chill' ? 'bg-[#FFB5D8]/20' : 
                'bg-gradient-to-br from-green-400 to-green-500'
              } flex items-center justify-center`}>
                <span className={`text-xs ${
                  mode === 'chaos' || mode === 'chill' ? 'text-white' : 'text-white'
                }`}>♪</span>
              </div>
            )}
          </div>
          
          {/* Center hole */}
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 ${getRoundedClass('rounded-full')} bg-black border ${
            mode === 'chaos' ? 'border-[#FF00FF]/40' : 
            mode === 'chill' ? 'border-[#FFB5D8]/40' : 
            'border-gray-600'
          } shadow-inner z-10`}></div>

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
        </motion.div>
      </div>

      {/* Track Info - Only show if not hidden */}
      {!hideText && (
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
      )}
    </div>
  )
}
