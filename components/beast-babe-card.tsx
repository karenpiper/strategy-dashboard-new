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
    discipline: string | null
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
      <Card className="relative overflow-hidden bg-gradient-to-br from-[#6B2C91] via-[#4A1E6B] to-[#2D1B4E] border-0 rounded-[2.5rem] p-6 min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading...</div>
      </Card>
    )
  }

  const currentBeastBabe = beastBabeData?.currentBeastBabe

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-[#6B2C91] via-[#4A1E6B] to-[#2D1B4E] border-0 rounded-[2.5rem] p-6 min-h-[400px]">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Wavy lines */}
        <div className="absolute top-0 left-0 w-32 h-32 opacity-30">
          <svg className="w-full h-full text-pink-400 animate-pulse" viewBox="0 0 100 100" fill="none">
            <path d="M0,50 Q25,30 50,50 T100,50" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 w-40 h-40 opacity-20">
          <svg className="w-full h-full text-blue-300 animate-pulse" viewBox="0 0 100 100" fill="none" style={{ animationDelay: '1s' }}>
            <path d="M0,50 Q25,70 50,50 T100,50" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
        
        {/* Triangles */}
        <div className="absolute left-4 top-1/2 w-16 h-16 opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}>
          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[28px] border-b-green-400"></div>
        </div>
        <div className="absolute left-8 top-1/3 w-12 h-12 opacity-30 animate-pulse" style={{ animationDelay: '1.5s' }}>
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[21px] border-b-pink-400"></div>
        </div>
        
        {/* Circles */}
        <div className="absolute top-4 right-8 w-12 h-12 opacity-30 animate-pulse">
          <div className="w-full h-full rounded-full bg-yellow-400"></div>
        </div>
        <div className="absolute right-4 top-1/2 w-16 h-16 opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>
          <div className="w-full h-full rounded-full border-2 border-dashed border-blue-300"></div>
        </div>
        
        {/* Stars */}
        <div className="absolute top-8 right-12 opacity-40 animate-pulse" style={{ animationDelay: '0.3s' }}>
          <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
        </div>
        <div className="absolute bottom-12 right-8 opacity-30 animate-pulse" style={{ animationDelay: '0.7s' }}>
          <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400 animate-pulse" />
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">BEAST BABE</h2>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
            <HelpCircle className="w-5 h-5 text-white/60" />
          </div>
        </div>

        {/* Profile Section */}
        <div className="flex flex-col items-center mb-6">
          {/* Profile Picture with Gradient Ring */}
          <div className="relative mb-4 flex items-center justify-center">
            {/* Glowing effect behind profile */}
            <div className="absolute w-36 h-36 rounded-full bg-yellow-400/30 blur-xl animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            
            {/* Gradient Ring Container */}
            <div className="relative w-32 h-32">
              {/* Animated Gradient Ring */}
              <div 
                className="absolute inset-0 rounded-full animate-spin-slow"
                style={{
                  background: 'conic-gradient(from 0deg, #ec4899 0%, #eab308 25%, #3b82f6 50%, #a855f7 75%, #ec4899 100%)',
                }}
              >
                <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-[#6B2C91] via-[#4A1E6B] to-[#2D1B4E]"></div>
              </div>
              
              {/* Profile Picture */}
              <div className="absolute inset-[3px] rounded-full overflow-hidden z-10">
                {currentBeastBabe?.avatar_url ? (
                  <img
                    src={currentBeastBabe.avatar_url}
                    alt={currentBeastBabe.full_name || 'Beast Babe'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                    <Trophy className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <h3 className="text-2xl font-black text-white mb-1 text-center">
            {currentBeastBabe?.full_name || currentBeastBabe?.email || 'No Beast Babe Yet'}
          </h3>
          
          {/* Role/Level */}
          {currentBeastBabe?.role && (
            <p className="text-sm text-white/80 mb-4">{currentBeastBabe.role}</p>
          )}
        </div>

        {/* Achievement Description */}
        {currentBeastBabe?.history?.achievement && (
          <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            {/* Decorative elements in corners */}
            <div className="absolute bottom-2 left-2 w-8 h-8 opacity-40">
              <div className="w-full h-full bg-gradient-to-br from-pink-400 to-yellow-400 rounded-sm transform rotate-45"></div>
            </div>
            <div className="absolute bottom-2 right-2 w-12 h-4 opacity-30">
              <svg className="w-full h-full text-blue-300" viewBox="0 0 100 20" fill="none">
                <path d="M0,10 Q25,5 50,10 T100,10" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </div>
            
            <p className="text-sm text-white/90 leading-relaxed italic relative z-10">
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

      {/* Glowing border effect */}
      <div className="absolute inset-0 rounded-[2.5rem] border-2 border-yellow-400/20 pointer-events-none animate-pulse"></div>
    </Card>
  )
}

