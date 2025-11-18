'use client'

import { motion } from 'motion/react'

interface AudioEQProps {
  isPlaying?: boolean
  className?: string
  color?: string
}

export function AudioEQ({ isPlaying = false, className = '', color = '#1DB954' }: AudioEQProps) {
  const bars = Array.from({ length: 5 }, (_, i) => i)
  
  return (
    <div className={`flex items-end justify-center gap-1 h-8 ${className}`}>
      {bars.map((bar) => (
        <motion.div
          key={bar}
          className="w-1 bg-current"
          style={{ color }}
          animate={
            isPlaying
              ? {
                  height: ['20%', '60%', '40%', '80%', '30%', '20%'],
                }
              : {
                  height: '20%',
                }
          }
          transition={{
            duration: 0.6,
            repeat: isPlaying ? Infinity : 0,
            delay: bar * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

