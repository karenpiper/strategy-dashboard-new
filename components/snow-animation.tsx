'use client'

import { useEffect, useState } from 'react'
import './snow-animation.css'

interface Snowflake {
  id: number
  left: number
  animationDuration: number
  animationDelay: number
  size: number
  opacity: number
}

interface SnowAnimationProps {
  enabled?: boolean
}

export function SnowAnimation({ enabled = true }: SnowAnimationProps) {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([])

  useEffect(() => {
    // Generate snowflakes with random properties
    const generateSnowflakes = () => {
      const flakes: Snowflake[] = []
      const flakeCount = 50 // Number of snowflakes

      for (let i = 0; i < flakeCount; i++) {
        flakes.push({
          id: i,
          left: Math.random() * 100, // Random horizontal position (0-100%)
          animationDuration: 3 + Math.random() * 4, // 3-7 seconds
          animationDelay: Math.random() * 5, // 0-5 seconds delay
          size: 4 + Math.random() * 6, // 4-10px
          opacity: 0.3 + Math.random() * 0.7, // 0.3-1.0 opacity
        })
      }

      setSnowflakes(flakes)
    }

    generateSnowflakes()
  }, [])

  if (!enabled) {
    return null
  }

  return (
    <div className="snow-container" aria-hidden="true">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake"
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            animationDuration: `${flake.animationDuration}s`,
            animationDelay: `${flake.animationDelay}s`,
            opacity: flake.opacity,
          }}
        />
      ))}
    </div>
  )
}

