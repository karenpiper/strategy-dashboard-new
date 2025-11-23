'use client'

import { useEffect, useState } from 'react'
import { Trophy, Star, HelpCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface BeastBabeData {
  currentBeastBabe: {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
    role: string | null
    history: {
      achievement: string | null
      date: string
    } | null
  } | null
}

export function BeastBabeCard() {
  const [beastBabeData, setBeastBabeData] = useState<BeastBabeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBeastBabe()
  }, [])

  const fetchBeastBabe = async () => {
    try {
      const response = await fetch('/api/beast-babe')
      if (response.ok) {
        const data = await response.json()
        setBeastBabeData(data)
      }
    } catch (error) {
      console.error('Error fetching beast babe:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-[#047857] via-[#10B981] to-[#1A5D52] border-0 rounded-[2.5rem] min-h-[600px] flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading...</div>
      </Card>
    )
  }

  const currentBeastBabe = beastBabeData?.currentBeastBabe

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-[#047857] via-[#10B981] to-[#1A5D52] border-0 rounded-[2.5rem] min-h-[600px] h-full flex flex-col glitch-container">
      {/* Decorative background elements - GREEN SYSTEM with magenta */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#84CC16]/20 via-[#EC4899]/30 to-[#FF8C42]/20 animate-pulse"></div>
        
        {/* Wavy lines - Lime Green and Magenta */}
        <div className="absolute top-0 left-0 w-40 h-40 opacity-40 animate-bounce-slow">
          <svg className="w-full h-full text-[#84CC16] animate-pulse" viewBox="0 0 100 100" fill="none">
            <path d="M0,50 Q25,30 50,50 T100,50" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 w-48 h-48 opacity-30 animate-bounce-slow" style={{ animationDelay: '1s' }}>
          <svg className="w-full h-full text-[#EC4899] animate-pulse" viewBox="0 0 100 100" fill="none" style={{ animationDelay: '0.5s' }}>
            <path d="M0,50 Q25,70 50,50 T100,50" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
        
        {/* Triangles - Lime Green and Magenta */}
        <div className="absolute left-4 top-1/2 w-20 h-20 opacity-30 animate-spin-slow glitch-shift">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[35px] border-b-[#84CC16]"></div>
        </div>
        <div className="absolute left-8 top-1/3 w-16 h-16 opacity-40 animate-spin-slow glitch-shift" style={{ animationDelay: '1.5s', animationDirection: 'reverse' }}>
          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[28px] border-b-[#EC4899]"></div>
        </div>
        <div className="absolute right-8 bottom-1/4 w-14 h-14 opacity-35 animate-spin-slow glitch-shift" style={{ animationDelay: '0.8s' }}>
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[24px] border-b-[#FF8C42]"></div>
        </div>
        
        {/* Circles - Orange and Magenta */}
        <div className="absolute top-4 right-8 w-16 h-16 opacity-40 animate-ping">
          <div className="w-full h-full rounded-full bg-[#FF8C42]"></div>
        </div>
        <div className="absolute right-4 top-1/2 w-20 h-20 opacity-30 animate-pulse glitch-shift" style={{ animationDelay: '1s' }}>
          <div className="w-full h-full rounded-full border-2 border-dashed border-[#EC4899]"></div>
        </div>
        <div className="absolute left-1/4 bottom-8 w-12 h-12 opacity-35 animate-bounce">
          <div className="w-full h-full rounded-full bg-[#84CC16]"></div>
        </div>
        
        {/* Stars - Magenta and Lime */}
        <div className="absolute top-8 right-12 opacity-50 animate-pulse glitch-shift" style={{ animationDelay: '0.3s' }}>
          <Star className="w-8 h-8 text-[#EC4899] fill-[#EC4899]" />
        </div>
        <div className="absolute bottom-12 right-8 opacity-40 animate-pulse glitch-shift" style={{ animationDelay: '0.7s' }}>
          <Star className="w-6 h-6 text-[#84CC16] fill-[#84CC16]" />
        </div>
        <div className="absolute top-1/3 left-12 opacity-35 animate-pulse glitch-shift" style={{ animationDelay: '1.2s' }}>
          <Star className="w-5 h-5 text-[#FF8C42] fill-[#FF8C42]" />
        </div>
        
        {/* Glitch lines */}
        <div className="absolute inset-0 glitch-lines"></div>
      </div>

      {/* Avatar - Full bleed at top with 10px border */}
      <div className="relative w-full pt-[10px] px-[10px] flex justify-center">
        <div className="relative w-[calc(100%-20px)] aspect-square max-w-[400px] overflow-hidden rounded-full">
          {/* Multiple glowing effects behind avatar - GREEN SYSTEM + Magenta */}
          <div className="absolute inset-0 bg-[#84CC16]/40 blur-2xl animate-pulse glitch-shift" style={{ animationDelay: '0.3s' }}></div>
          <div className="absolute inset-0 bg-[#EC4899]/30 blur-xl animate-pulse glitch-shift" style={{ animationDelay: '0.6s' }}></div>
          <div className="absolute inset-0 bg-[#FF8C42]/25 blur-lg animate-pulse glitch-shift" style={{ animationDelay: '0.9s' }}></div>
          
          {/* Avatar Image */}
          {currentBeastBabe?.avatar_url ? (
            <>
              <img
                src={currentBeastBabe.avatar_url}
                alt={currentBeastBabe.full_name || 'Beast Babe'}
                className="w-full h-full object-cover relative z-10 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    const fallback = parent.querySelector('.beast-babe-avatar-fallback') as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }
                }}
              />
              <div className="beast-babe-avatar-fallback w-full h-full bg-gradient-to-br from-[#10B981] to-[#047857] flex items-center justify-center relative z-10 rounded-full hidden">
                <Trophy className="w-32 h-32 text-white" />
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#10B981] to-[#047857] flex items-center justify-center relative z-10 rounded-full">
              <Trophy className="w-32 h-32 text-white" />
            </div>
          )}
          
          {/* Gradient overlay on avatar */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#047857]/60 z-20 pointer-events-none rounded-full"></div>
        </div>
      </div>

      {/* Content below avatar */}
      <div className="relative z-10 px-6 pb-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 mt-4">
          <div className="flex items-center gap-2 glitch-text">
            <Trophy className="w-7 h-7 text-[#84CC16] animate-bounce" style={{ animationDuration: '1.5s' }} />
            <h2 className="text-5xl font-black text-white uppercase tracking-tight glitch-text">BEAST BABE</h2>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-[#EC4899] fill-[#EC4899] animate-pulse glitch-shift" style={{ animationDelay: '0.5s' }} />
            <HelpCircle className="w-5 h-5 text-white/60" />
          </div>
        </div>

        {/* Name */}
        <h3 className="text-4xl font-black text-white mb-2 text-left glitch-text">
          {currentBeastBabe?.full_name || currentBeastBabe?.email || 'No Beast Babe Yet'}
        </h3>

        {/* Achievement Description */}
        {currentBeastBabe?.history?.achievement && (
          <div className="relative bg-black/30 backdrop-blur-sm rounded-2xl p-5 border-2 border-[#84CC16]/40 glitch-border mt-4">
            {/* Decorative elements in corners - GREEN SYSTEM + Magenta */}
            <div className="absolute bottom-2 left-2 w-10 h-10 opacity-50 animate-spin-slow">
              <div className="w-full h-full bg-gradient-to-br from-[#EC4899] to-[#84CC16] rounded-sm transform rotate-45"></div>
            </div>
            <div className="absolute bottom-2 right-2 w-16 h-4 opacity-40 animate-pulse">
              <svg className="w-full h-full text-[#FF8C42]" viewBox="0 0 100 20" fill="none">
                <path d="M0,10 Q25,5 50,10 T100,10" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <div className="absolute top-2 right-4 w-6 h-6 opacity-40 animate-bounce">
              <Star className="w-full h-full text-[#EC4899] fill-[#EC4899]" />
            </div>
            
            <p className="text-base text-white/95 leading-relaxed italic relative z-10 glitch-text">
              "{currentBeastBabe.history.achievement}"
            </p>
          </div>
        )}

        {!currentBeastBabe && (
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <p className="text-white/60">No current Beast Babe</p>
          </div>
        )}
      </div>

      {/* Glowing border effect - GREEN SYSTEM + Magenta */}
      <div className="absolute inset-0 rounded-[2.5rem] border-2 border-[#84CC16]/30 pointer-events-none animate-pulse glitch-border"></div>
      <div className="absolute inset-0 rounded-[2.5rem] border border-[#EC4899]/20 pointer-events-none animate-pulse" style={{ animationDelay: '0.5s' }}></div>
    </Card>
  )
}

