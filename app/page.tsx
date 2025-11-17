'use client'

import { Search, Calendar, Music, FileText, MessageCircle, Trophy, TrendingUp, Users, Zap, Star, Heart, Coffee, Lightbulb, ChevronRight, Play, CheckCircle, Clock, ArrowRight, Video, Sparkles, Loader2, Download, Bot } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ModeSwitcher } from "@/components/mode-switcher"
import { useMode } from "@/contexts/mode-context"
import { useEffect, useState } from 'react'
import { getStarSignEmoji } from '@/lib/horoscope-utils'

// Force dynamic rendering to avoid SSR issues with context
export const dynamic = 'force-dynamic'

export default function TeamDashboard() {
  const { mode } = useMode()
  const [horoscope, setHoroscope] = useState<{
    star_sign: string
    horoscope_text: string
    horoscope_dos?: string[]
    horoscope_donts?: string[]
    image_url: string
  } | null>(null)
  const [horoscopeLoading, setHoroscopeLoading] = useState(true)
  const [horoscopeError, setHoroscopeError] = useState<string | null>(null)

  // Fetch horoscope on mount
  useEffect(() => {
    async function fetchHoroscope() {
      try {
        setHoroscopeLoading(true)
        setHoroscopeError(null)
        const response = await fetch('/api/horoscope')
        const data = await response.json()
        
        if (!response.ok) {
          console.error('Horoscope API error:', response.status, data)
          if (response.status === 401) {
            setHoroscopeError('Please log in to view your horoscope')
          } else {
            setHoroscopeError(data.error || 'Failed to load horoscope')
          }
          return
        }
        
        console.log('Horoscope data received:', data)
        setHoroscope(data)
      } catch (error: any) {
        console.error('Error fetching horoscope:', error)
        setHoroscopeError('Failed to load horoscope: ' + (error.message || 'Unknown error'))
      } finally {
        setHoroscopeLoading(false)
      }
    }
    fetchHoroscope()
  }, [])

  // Comprehensive mode-aware card styling
  type CardSection = 'hero' | 'recognition' | 'work' | 'team' | 'vibes' | 'community' | 'default'
  type SpecificCard = 'hero-large' | 'launch-pad' | 'horoscope' | 'weather' | 'timezones' | 'playlist' | 'friday-drop' | 'brand-redesign' | 'stats' | 'events' | 'pipeline' | 'who-needs-what' | 'snaps' | 'beast-babe' | 'wins-wall' | 'must-reads' | 'ask-hive' | 'team-pulse' | 'loom-standup' | 'inspiration-war' | 'categories' | 'search'
  
  const getSpecificCardStyle = (cardName: SpecificCard): { bg: string; border: string; glow: string; text: string; accent: string } => {
    if (mode === 'chaos') {
      const chaosCardStyles: Record<SpecificCard, { bg: string; border: string; glow: string; text: string; accent: string }> = {
        'hero-large': { bg: 'bg-gradient-to-br from-[#FFE500] via-[#FF8C00] to-[#FF6B6B]', border: 'border-0', glow: '', text: 'text-black', accent: '#FFE500' },
        'launch-pad': { bg: 'bg-gradient-to-br from-[#9D4EFF] to-[#6B2C91]', border: 'border-0', glow: '', text: 'text-white', accent: '#C4F500' },
        'horoscope': { bg: 'bg-[#6B2C91]', border: 'border-0', glow: '', text: 'text-white', accent: '#FFE500' },
        'weather': { bg: 'bg-gradient-to-br from-[#00B8D4] to-[#0066CC]', border: 'border-0', glow: '', text: 'text-white', accent: '#00D4FF' },
        'timezones': { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#00D4FF' },
        'playlist': { bg: 'bg-gradient-to-br from-[#FF6B00] to-[#FF8A00]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF00FF' },
        'friday-drop': { bg: 'bg-gradient-to-br from-[#00B8D4] to-[#00ACC1]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF6B00' },
        'brand-redesign': { bg: 'bg-gradient-to-br from-[#FF4081] to-[#E91E63]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF00FF' },
        'stats': { bg: 'bg-white', border: 'border-0', glow: '', text: 'text-black', accent: '#00FF87' },
        'events': { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#00FF87' },
        'pipeline': { bg: 'bg-[#6FD89C]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF6B00' },
        'who-needs-what': { bg: 'bg-[#E8FF00]', border: 'border-0', glow: '', text: 'text-black', accent: '#FF6B00' },
        'snaps': { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#E8FF00' },
        'beast-babe': { bg: 'bg-gradient-to-br from-[#FF0055] to-[#FF4081]', border: 'border-0', glow: '', text: 'text-white', accent: '#E8FF00' },
        'wins-wall': { bg: 'bg-white', border: 'border-0', glow: '', text: 'text-black', accent: '#00FF87' },
        'must-reads': { bg: 'bg-gradient-to-br from-[#FF4081] to-[#E91E63]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF00FF' },
        'ask-hive': { bg: 'bg-gradient-to-br from-[#9D4EFF] to-[#7B2CBE]', border: 'border-0', glow: '', text: 'text-white', accent: '#9D4EFF' },
        'team-pulse': { bg: 'bg-white', border: 'border-0', glow: '', text: 'text-black', accent: '#00FF87' },
        'loom-standup': { bg: 'bg-gradient-to-br from-[#2979FF] to-[#7B1FA2]', border: 'border-0', glow: '', text: 'text-white', accent: '#00D4FF' },
        'inspiration-war': { bg: 'bg-[#E8FF00]', border: 'border-0', glow: '', text: 'text-black', accent: '#C4F500' },
        'categories': { bg: 'bg-white', border: 'border-0', glow: '', text: 'text-black', accent: '#9D4EFF' },
        'search': { bg: 'bg-[#000000]', border: 'border border-[#E8FF00]', glow: '', text: 'text-white', accent: '#E8FF00' },
      }
      return chaosCardStyles[cardName] || chaosCardStyles['hero-large']
    } else {
      // For chill and code modes, use section-based styling
      return getCardStyle(cardName === 'hero-large' || cardName === 'launch-pad' ? 'hero' : 
                         cardName === 'snaps' || cardName === 'beast-babe' || cardName === 'wins-wall' ? 'recognition' :
                         cardName === 'events' || cardName === 'pipeline' || cardName === 'who-needs-what' || cardName === 'friday-drop' ? 'work' :
                         cardName === 'weather' || cardName === 'timezones' || cardName === 'team-pulse' || cardName === 'loom-standup' ? 'team' :
                         cardName === 'horoscope' || cardName === 'playlist' || cardName === 'brand-redesign' || cardName === 'must-reads' || cardName === 'inspiration-war' ? 'vibes' :
                         'community')
    }
  }
  
  const getCardStyle = (section: CardSection): { bg: string; border: string; glow: string; text: string; accent: string } => {
    if (mode === 'chaos') {
      // Fallback for section-based styling in chaos mode
      const chaosColors: Record<CardSection, { bg: string; border: string; glow: string; text: string; accent: string }> = {
        hero: { bg: 'bg-gradient-to-br from-[#FFB84D] via-[#FFE500] to-[#FFE500]', border: 'border-0', glow: '', text: 'text-black', accent: '#C4F500' },
        recognition: { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#00FF87' },
        work: { bg: 'bg-gradient-to-br from-[#00B8D4] to-[#0066CC]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF6B00' },
        team: { bg: 'bg-gradient-to-br from-[#00B8D4] to-[#0066CC]', border: 'border-0', glow: '', text: 'text-white', accent: '#00D4FF' },
        vibes: { bg: 'bg-gradient-to-br from-[#9D4EFF] to-[#6B2C91]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF00FF' },
        community: { bg: 'bg-gradient-to-br from-[#FF4081] to-[#E91E63]', border: 'border-0', glow: '', text: 'text-white', accent: '#9D4EFF' },
        default: { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#C4F500' },
      }
      return chaosColors[section] || chaosColors.default
    } else if (mode === 'chill') {
      const chillColors: Record<CardSection, { bg: string; border: string; glow: string; text: string; accent: string }> = {
        hero: { bg: 'bg-gradient-to-br from-[#FFC043] via-[#FFB5D8] to-[#C8D961]', border: 'border border-[#FFC043]/30', glow: '', text: 'text-[#4A1818]', accent: '#FFC043' },
        recognition: { bg: 'bg-white', border: 'border border-[#C8D961]/30', glow: '', text: 'text-[#4A1818]', accent: '#C8D961' },
        work: { bg: 'bg-white', border: 'border border-[#FF6B35]/30', glow: '', text: 'text-[#4A1818]', accent: '#FF6B35' },
        team: { bg: 'bg-white', border: 'border border-[#4A9BFF]/30', glow: '', text: 'text-[#4A1818]', accent: '#4A9BFF' },
        vibes: { bg: 'bg-white', border: 'border border-[#FFB5D8]/30', glow: '', text: 'text-[#4A1818]', accent: '#FFB5D8' },
        community: { bg: 'bg-white', border: 'border border-[#8B4444]/30', glow: '', text: 'text-[#4A1818]', accent: '#8B4444' },
        default: { bg: 'bg-white', border: 'border border-[#FFC043]/30', glow: '', text: 'text-[#4A1818]', accent: '#FFC043' },
      }
      return chillColors[section] || chillColors.default
    } else { // code mode - DOS/Terminal aesthetic
      const codeColors: Record<CardSection, { bg: string; border: string; glow: string; text: string; accent: string }> = {
        hero: { bg: 'bg-[#000000]', border: 'border border-[#00FF00]', glow: '', text: 'text-[#00FF00]', accent: '#00FF00' },
        recognition: { bg: 'bg-[#000000]', border: 'border border-[#00FF00]', glow: '', text: 'text-[#00FF00]', accent: '#00FF00' },
        work: { bg: 'bg-[#000000]', border: 'border border-[#00FF00]', glow: '', text: 'text-[#00FF00]', accent: '#00FF00' },
        team: { bg: 'bg-[#000000]', border: 'border border-[#00FF00]', glow: '', text: 'text-[#00FF00]', accent: '#00FF00' },
        vibes: { bg: 'bg-[#000000]', border: 'border border-[#00FF00]', glow: '', text: 'text-[#00FF00]', accent: '#00FF00' },
        community: { bg: 'bg-[#000000]', border: 'border border-[#00FF00]', glow: '', text: 'text-[#00FF00]', accent: '#00FF00' },
        default: { bg: 'bg-[#000000]', border: 'border border-[#00FF00]', glow: '', text: 'text-[#00FF00]', accent: '#00FF00' },
      }
      return codeColors[section] || codeColors.default
    }
  }

  // Mode-aware class helpers
  const getBgClass = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#1A1A1A]'
      case 'chill': return 'bg-[#F5E6D3]'
      case 'code': return 'bg-black'
      default: return 'bg-[#1A1A1A]'
    }
  }

  const getTextClass = () => {
    switch (mode) {
      case 'chaos': return 'text-white'
      case 'chill': return 'text-[#4A1818]'
      case 'code': return 'text-[#00FF00]'
      default: return 'text-white'
    }
  }

  const getBorderClass = () => {
    switch (mode) {
      case 'chaos': return 'border-[#333333]'
      case 'chill': return 'border-[#4A1818]/20'
      case 'code': return 'border-[#00FF00]'
      default: return 'border-[#333333]'
    }
  }

  const getNavLinkClass = (isActive = false) => {
    const base = `transition-colors text-sm font-black uppercase ${mode === 'code' ? 'font-mono' : ''}`
    if (isActive) {
      switch (mode) {
        case 'chaos': return `${base} text-white hover:text-[#C4F500]`
        case 'chill': return `${base} text-[#4A1818] hover:text-[#FFC043]`
        case 'code': return `${base} text-[#00FF00] hover:text-[#00FF00]`
        default: return `${base} text-white hover:text-[#C4F500]`
      }
    } else {
      switch (mode) {
        case 'chaos': return `${base} text-[#666666] hover:text-white`
        case 'chill': return `${base} text-[#8B4444] hover:text-[#4A1818]`
        case 'code': return `${base} text-[#808080] hover:text-[#00FF00]`
        default: return `${base} text-[#666666] hover:text-white`
      }
    }
  }

  const getLogoBg = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#C4F500]'
      case 'chill': return 'bg-[#FFC043]'
      case 'code': return 'bg-[#00FF00]'
      default: return 'bg-[#C4F500]'
    }
  }

  const getLogoText = () => {
    switch (mode) {
      case 'chaos': return 'text-black'
      case 'chill': return 'text-[#4A1818]'
      case 'code': return 'text-black'
      default: return 'text-black'
    }
  }

  // Code mode helpers
  const getRoundedClass = (defaultClass: string) => {
    return mode === 'code' ? 'rounded-none' : defaultClass
  }

  const getCodeHeading = (text: string) => {
    return mode === 'code' ? `> ${text.toUpperCase()}` : text
  }

  const getCodeButtonText = (text: string) => {
    return mode === 'code' ? `[${text.toUpperCase()}]` : text
  }

  const getCodeText = (text: string, opacity = 1) => {
    if (mode === 'code') {
      const opacityClass = opacity < 1 ? `text-white/70` : 'text-[#00FF00]'
      return <span className={opacityClass}>{text}</span>
    }
    return text
  }

  return (
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <header className={`border-b ${getBorderClass()} px-6 py-4`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className={`w-10 h-10 ${getLogoBg()} ${getLogoText()} ${getRoundedClass('rounded-xl')} flex items-center justify-center font-black text-lg ${mode === 'code' ? 'font-mono' : ''}`}>
              {mode === 'code' ? 'C:\\>' : 'D'}
            </div>
            <nav className="flex items-center gap-6">
              <a href="#" className={getNavLinkClass(true)}>HOME</a>
              <a href="#" className={getNavLinkClass()}>SNAPS</a>
              <a href="#" className={getNavLinkClass()}>RESOURCES</a>
              <a href="#" className={getNavLinkClass()}>WORK</a>
              <a href="#" className={getNavLinkClass()}>TEAM</a>
              <a href="#" className={getNavLinkClass()}>VIBES</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ModeSwitcher />
            <div className={`w-10 h-10 ${getRoundedClass('rounded-full')} border-2 ${
              mode === 'chaos' ? 'bg-[#C4F500] border-[#C4F500]/40' :
              mode === 'chill' ? 'bg-[#FFC043] border-[#FFC043]/30' :
              'bg-white border-white/20'
            }`} />
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        {/* Hero Section - Full Width */}
        <section className="mb-12">
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('hero-large') : getCardStyle('hero')
            return (
              <Card className={`${style.bg} ${style.border} p-0 ${mode === 'chaos' ? getRoundedClass('rounded-[2.5rem]') : getRoundedClass('rounded-[2.5rem]')} relative overflow-hidden group min-h-[500px] flex flex-col justify-between`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                {/* Black masked section on the right with transform/rotation */}
                {mode === 'chaos' && (
                  <div className={`absolute top-0 right-0 w-1/2 h-full ${getBgClass()} ${getRoundedClass('rounded-[2.5rem]')} transform translate-x-1/4 -rotate-12`}></div>
                )}
                {mode !== 'chaos' && (
                  <div className={`absolute top-0 right-0 w-[60%] h-full ${getBgClass()}`} 
                       style={{ clipPath: 'polygon(12% 0, 100% 0, 100% 100%, 0% 100%)' }} 
                  />
                )}
                <div className="relative z-10 p-8 md:p-12 h-full flex flex-col justify-between">
                  <div>
                    <Badge className={`${mode === 'chaos' ? 'bg-black text-[#FFE500]' : mode === 'chill' ? 'bg-[#4A1818] text-[#FFC043]' : mode === 'code' ? 'bg-[#00FF00] text-black border border-[#00FF00]' : 'bg-white text-black'} hover:opacity-90 ${mode === 'code' ? 'border-0' : 'border-0'} ${getRoundedClass('rounded-full')} font-black mb-4 md:mb-6 text-xs md:text-sm uppercase tracking-[0.2em] ${mode === 'code' ? 'font-mono' : ''} px-4 md:px-6 py-2 md:py-3`}>
                      {mode === 'code' ? '[AI CHAOS AGENT]' : mode === 'chaos' ? 'QUICK ACTIONS' : 'AI Chaos Agent'}
                    </Badge>
                    <h1 className={`text-[clamp(3rem,8vw+1rem,10rem)] font-black mb-4 md:mb-6 leading-[0.85] tracking-tight uppercase text-black ${mode === 'code' ? 'font-mono' : ''}`}>
                      {mode === 'code' ? '> READY!' : 'READY!'}
                    </h1>
                    <p className={`text-[clamp(1.25rem,3vw+0.5rem,2.5rem)] font-bold max-w-2xl leading-tight text-black ${mode === 'code' ? 'font-mono' : ''}`}>
                      {mode === 'code' ? ':: Let\'s ship something amazing today' : 'Let\'s ship something amazing today'}
                    </p>
                    <p className={`text-base md:text-lg lg:text-xl font-bold mt-4 text-black/70 ${mode === 'code' ? 'font-mono' : ''}`}>
                      {mode === 'code' ? 'C:\\> date: Friday, November 14' : 'Friday, November 14'}
                    </p>
                  </div>
                  <div className="relative z-10 flex items-center gap-3 md:gap-4 flex-wrap">
                    {['Give Snap', 'Need Help', 'Add Win'].map((label) => (
                      <Button key={label} className={`${mode === 'chaos' ? 'bg-black text-[#FFE500] hover:bg-[#0F0F0F] hover:scale-105' : mode === 'chill' ? 'bg-[#4A1818] text-[#FFC043] hover:bg-[#3A1414]' : mode === 'code' ? 'bg-[#00FF00] text-black border border-[#00FF00] hover:bg-[#00CC00]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black ${getRoundedClass('rounded-full')} py-3 md:py-4 px-6 md:px-8 text-base md:text-lg uppercase tracking-wider transition-all hover:shadow-2xl ${mode === 'code' ? 'font-mono' : ''}`}>
                        {mode === 'code' ? `[${label.toUpperCase().replace(' ', ' ')}]` : label} {mode !== 'code' && <ArrowRight className="w-4 h-4 ml-2" />}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            )
          })()}
        </section>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
              <span className="text-[#808080]">PERSONALIZED INFORMATION</span>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
          Personalized Information
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Horoscope - Double Width */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('horoscope') : getCardStyle('vibes')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} md:col-span-2`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
                  <Sparkles className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Totally Real</span>
                </div>
                <h2 className={`text-4xl font-black mb-6 uppercase`} style={{ color: style.accent }}>YOUR<br/>HOROSCOPE</h2>
                
                {horoscopeLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className={`w-6 h-6 animate-spin ${style.text}`} />
                  </div>
                ) : horoscopeError ? (
                  <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} ${getRoundedClass('rounded-2xl')} p-4 border-2`} style={{ borderColor: `${style.accent}40` }}>
                    <p className={`text-sm ${style.text}`}>{horoscopeError}</p>
                  </div>
                ) : horoscope ? (
                  <div className="space-y-6">
                    {/* Combined Image and Horoscope Text Container */}
                    <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} ${getRoundedClass('rounded-2xl')} p-6 border-2`} style={{ borderColor: `${style.accent}40` }}>
                      {/* Portrait Image - Floating Left */}
                      {horoscope.image_url && (
                        <div className="float-left mr-6 mb-4 relative">
                          <div className="w-48 md:w-64 aspect-square relative overflow-hidden" style={{ borderColor: style.accent, borderWidth: '2px' }}>
                            <img 
                              src={horoscope.image_url} 
                              alt={`${horoscope.star_sign} horoscope portrait`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {/* Download Button */}
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(horoscope.image_url)
                                const blob = await response.blob()
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `${horoscope.star_sign}-horoscope-${new Date().toISOString().split('T')[0]}.png`
                                document.body.appendChild(a)
                                a.click()
                                window.URL.revokeObjectURL(url)
                                document.body.removeChild(a)
                              } catch (error) {
                                console.error('Error downloading image:', error)
                              }
                            }}
                            className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 ${getRoundedClass('rounded-lg')} border-2 transition-opacity hover:opacity-80`}
                            style={{ 
                              borderColor: style.accent,
                              backgroundColor: `${style.accent}20`,
                              color: style.accent
                            }}
                          >
                            <Download className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-wider">Download</span>
                          </button>
                        </div>
                      )}
                      
                      {/* Horoscope Text - Flowing Around Image */}
                      <div className="overflow-hidden">
                        <p className="text-base font-black mb-3 flex items-center gap-2" style={{ color: style.accent }}>
                          <span>{getStarSignEmoji(horoscope.star_sign)}</span>
                          <span>{horoscope.star_sign.toUpperCase()}</span>
                        </p>
                        <div className={`text-base leading-relaxed ${style.text} space-y-3`}>
                          {horoscope.horoscope_text.split('\n\n').map((paragraph, idx) => (
                            <p key={idx}>{paragraph}</p>
                          ))}
                        </div>
                      </div>
                      
                      {/* Clear float */}
                      <div className="clear-both"></div>
                    </div>
                    
                    {/* Bottom Row: Do's and Don'ts - Half Width Each */}
                    {(horoscope.horoscope_dos?.length || horoscope.horoscope_donts?.length) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Do's - Left Half */}
                        {horoscope.horoscope_dos && horoscope.horoscope_dos.length > 0 && (
                          <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} ${getRoundedClass('rounded-2xl')} p-4 border-2`} style={{ borderColor: '#22c55e40' }}>
                            <p className="text-xs font-black mb-3 uppercase tracking-wider" style={{ color: '#22c55e' }}>Do</p>
                            <ul className="space-y-2">
                              {horoscope.horoscope_dos.map((item, idx) => (
                                <li key={idx} className={`text-xs ${style.text} flex items-start gap-2`}>
                                  <span style={{ color: '#22c55e' }}>✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Don'ts - Right Half */}
                        {horoscope.horoscope_donts && horoscope.horoscope_donts.length > 0 && (
                          <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} ${getRoundedClass('rounded-2xl')} p-4 border-2`} style={{ borderColor: '#ef444440' }}>
                            <p className="text-xs font-black mb-3 uppercase tracking-wider" style={{ color: '#ef4444' }}>Don't</p>
                            <ul className="space-y-2">
                              {horoscope.horoscope_donts.map((item, idx) => (
                                <li key={idx} className={`text-xs ${style.text} flex items-start gap-2`}>
                                  <span style={{ color: '#ef4444' }}>✗</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} ${getRoundedClass('rounded-2xl')} p-4 border-2`} style={{ borderColor: `${style.accent}40` }}>
                    <p className={`text-sm ${style.text}`}>No horoscope available</p>
                  </div>
                )}
              </Card>
            )
          })()}

          {/* Right Column: AI Chaos Agent, Weather and Time Zones */}
          <div className="flex flex-col gap-6">
            {/* AI Chaos Agent */}
            {(() => {
              const style = mode === 'chaos' ? getSpecificCardStyle('launch-pad') : getCardStyle('hero')
              return (
                <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} flex flex-col justify-center`}
                      style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
                >
                  <div className={`w-12 h-12 ${getRoundedClass('rounded-2xl')} flex items-center justify-center mb-4`} style={{ backgroundColor: style.accent }}>
                    <Bot className={`w-6 h-6 ${mode === 'chaos' || mode === 'code' ? 'text-black' : 'text-[#4A1818]'}`} />
                  </div>
                  <p className={`text-xs uppercase tracking-wider font-black mb-2 ${mode === 'code' ? 'font-mono' : ''}`} style={{ color: style.accent }}>
                    {mode === 'code' ? '[AI CHAOS AGENT]' : 'AI Chaos Agent'}
                  </p>
                  <h2 className={`text-3xl font-black leading-tight uppercase ${style.text} ${mode === 'code' ? 'font-mono' : ''}`}>
                    {mode === 'code' ? '> READY!' : 'Ready!'}
                  </h2>
                </Card>
              )
            })()}

            {/* Weather - Ultra Compact Card */}
            {(() => {
              const style = mode === 'chaos' ? getSpecificCardStyle('weather') : getCardStyle('team')
              return (
                <Card className={`${style.bg} ${style.border} p-2.5 ${getRoundedClass('rounded-[2.5rem]')} relative overflow-hidden`}
                      style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
                >
                  <div className="flex items-center justify-between mb-1 relative z-10">
                    <span className={`text-[10px] uppercase tracking-wider font-black ${style.text}/90`}>Right Now</span>
                    <span className="text-lg">☁️</span>
                  </div>
                  <h2 className={`text-sm font-black mb-1.5 relative z-10 uppercase ${style.text}`}>WEATHER</h2>
                  <div className="mb-1.5 relative z-10">
                    <p className={`text-2xl font-black leading-none mb-0.5 ${style.text}`}>72°</p>
                    <p className={`${style.text} text-xs font-bold`}>Partly Cloudy</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 relative z-10">
                    <div className={`${mode === 'chaos' ? 'bg-white/20 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-white/20'} ${getRoundedClass('rounded-md')} p-1 border`} style={{ borderColor: `${style.accent}30` }}>
                      <p className={`text-[9px] ${style.text}/90 font-bold uppercase tracking-wide leading-tight`}>Humidity</p>
                      <p className={`text-sm font-black leading-none ${style.text}`}>65%</p>
                    </div>
                    <div className={`${mode === 'chaos' ? 'bg-white/20 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-white/20'} ${getRoundedClass('rounded-md')} p-1 border`} style={{ borderColor: `${style.accent}30` }}>
                      <p className={`text-[9px] ${style.text}/90 font-bold uppercase tracking-wide leading-tight`}>Wind</p>
                      <p className={`text-sm font-black leading-none ${style.text}`}>8 mph</p>
                    </div>
                  </div>
                </Card>
              )
            })()}

            {/* Time Zones - Ultra Compact */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('timezones') : getCardStyle('team')
            const timeZoneColors = mode === 'chaos' 
              ? ['#00D4FF', '#00FF87', '#9D4EFF', '#FF00FF']
              : mode === 'chill'
              ? ['#4A9BFF', '#C8D961', '#8B4444', '#FFB5D8']
              : ['#cccccc', '#e5e5e5', '#999999', '#cccccc']
            return (
              <Card className={`${style.bg} ${style.border} p-2.5 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-1 text-xs mb-1.5" style={{ color: style.accent }}>
                  <Clock className="w-2.5 h-2.5" />
                  <span className="uppercase tracking-wider font-black text-[9px]">Global Team</span>
                </div>
                <h2 className={`text-base font-black mb-2 uppercase leading-tight ${style.text}`}>TIME<br/>ZONES</h2>
                <div className="space-y-1">
                  {[
                    { city: 'San Francisco', time: '12:50 AM', people: '2', emoji: '🌉' },
                    { city: 'New York', time: '03:50 AM', people: '5', emoji: '🗽' },
                    { city: 'London', time: '08:50 AM', people: '3', emoji: '🏰' },
                    { city: 'Tokyo', time: '05:50 PM', people: '1', emoji: '🗼' },
                  ].map((tz, idx) => (
                    <div key={tz.city} className="flex items-center justify-between p-1.5 rounded-md transition-colors hover:opacity-80" 
                         style={{ 
                           backgroundColor: `${timeZoneColors[idx]}${mode === 'chaos' ? '33' : mode === 'chill' ? '20' : '33'}`,
                           border: `1px solid ${timeZoneColors[idx]}${mode === 'chaos' ? '66' : mode === 'chill' ? '40' : '66'}`
                         }}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded flex items-center justify-center text-xs ${mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-white/20'}`}>{tz.emoji}</div>
                        <div>
                          <p className={`font-black text-[10px] leading-tight ${style.text}`}>{tz.city}</p>
                          <p className={`text-[9px] font-medium leading-tight ${style.text}/70`}>{tz.people} people</p>
                        </div>
                      </div>
                      <span className={`font-black text-[10px] ${style.text}`}>{tz.time}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })()}
          </div>
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
              <span className="text-[#808080]">WORK UPDATES</span>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
              Work Updates
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Playlist */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('playlist') : getCardStyle('vibes')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
              <Music className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Weekly</span>
            </div>
                <h2 className={`text-3xl font-black mb-4 uppercase ${style.text}`}>PLAYLIST</h2>
            <div className="flex items-center justify-center mb-4">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: style.accent }}>
                    <Music className={`w-10 h-10 ${mode === 'chaos' || mode === 'code' ? 'text-black' : 'text-[#4A1818]'}`} />
              </div>
            </div>
                <p className={`font-black text-sm mb-1 ${style.text}`}>Coding Vibes</p>
                <p className={`text-xs mb-4 ${style.text}/70`}>Curated by Alex</p>
                <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#FF00FF] hover:bg-[#0F0F0F]' : mode === 'chill' ? 'bg-[#4A1818] text-[#FFB5D8] hover:bg-[#3A1414]' : mode === 'code' ? 'bg-[#00FF00] text-black border border-[#00FF00] hover:bg-[#00CC00]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black ${getRoundedClass('rounded-full')} h-10 text-sm uppercase ${mode === 'code' ? 'font-mono' : ''}`}>
                  {mode === 'code' ? '[PLAY ON SPOTIFY]' : (
                    <>
                      <Play className="w-4 h-4 mr-2" /> Play on Spotify
                    </>
                  )}
                </Button>
          </Card>
            )
          })()}

          {/* Friday Drop */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('friday-drop') : getCardStyle('work')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
              <FileText className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Weekly Report</span>
            </div>
                <h2 className={`text-3xl font-black mb-6 uppercase ${style.text}`}>THE<br/>FRIDAY<br/>DROP</h2>
            <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: '5', label: 'New' },
                    { value: '8', label: 'Shipped' },
                    { value: '12', label: 'In QA' },
                  ].map((stat) => (
                    <div key={stat.label} className={`${mode === 'chaos' ? 'bg-black/10 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/10'} rounded-xl p-3 border text-center`} style={{ borderColor: `${style.accent}20` }}>
                      <p className={`text-3xl font-black ${style.text}`}>{stat.value}</p>
                      <p className={`text-xs font-bold uppercase tracking-wide ${style.text}/70`}>{stat.label}</p>
              </div>
                  ))}
            </div>
          </Card>
            )
          })()}

          {/* Brand Redesign */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('brand-redesign') : getCardStyle('vibes')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} relative overflow-hidden`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <Badge className={`${mode === 'chaos' ? 'bg-black text-[#FF00FF]' : mode === 'chill' ? 'bg-[#4A1818] text-[#FFB5D8]' : 'bg-white text-black'} border-0 font-black mb-3 text-xs uppercase tracking-wider`}>Featured</Badge>
            <div className="mb-4">
                  <p className={`text-sm font-medium mb-1 ${style.text}/70`}>Active Drop</p>
                  <h3 className={`text-2xl font-black uppercase ${style.text}`}>Brand Redesign</h3>
                  <Badge className={`${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} border-0 font-black mt-2 text-xs`} style={{ color: style.accent }}>Branding</Badge>
            </div>
                <div className={`absolute bottom-4 right-4 text-8xl ${mode === 'chaos' ? 'opacity-10' : mode === 'chill' ? 'opacity-20' : 'opacity-10'}`}>🎨</div>
                <ChevronRight className={`absolute bottom-4 right-4 w-6 h-6 ${style.text}`} />
          </Card>
            )
          })()}

          {/* Stats */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('stats') : getCardStyle('team')
            const growthColor = mode === 'chaos' ? '#00FF87' : mode === 'chill' ? '#C8D961' : '#cccccc'
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <p className="text-xs uppercase tracking-wider mb-2 font-black" style={{ color: style.accent }}>This Month</p>
                <h2 className={`text-3xl font-black mb-6 uppercase ${style.text}`}>STATS</h2>
            <div className="space-y-4">
              <div>
                    <p className={`text-5xl font-black ${style.text}`}>24</p>
                    <p className={`text-sm font-black ${style.text}/70`}>Team</p>
              </div>
              <div>
                    <p className={`text-5xl font-black ${style.text}`}>247</p>
                    <p className={`text-sm font-black ${style.text}/70`}>Snaps</p>
              </div>
              <div>
                    <p className="text-5xl font-black" style={{ color: growthColor }}>+15%</p>
                    <p className={`text-sm font-black ${style.text}/70`}>Growth</p>
              </div>
            </div>
          </Card>
            )
          })()}
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
              <span className="text-[#808080]">WORK UPDATES CONTINUED</span>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
              Work Updates Continued
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Events */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('events') : getCardStyle('work')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
              <Calendar className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Today</span>
            </div>
                <h2 className={`text-4xl font-black mb-6 uppercase ${style.text}`}>EVENTS</h2>
            <div className="space-y-3">
                  {[
                    { time: '10:30 Team Standup' },
                    { time: '14:00 Design Review' },
                  ].map((event) => (
                    <div key={event.time} className="flex items-center gap-3 p-3 rounded-xl" 
                         style={{ 
                           backgroundColor: `${style.accent}${mode === 'chaos' ? '33' : mode === 'chill' ? '20' : '33'}`,
                           border: `2px solid ${style.accent}${mode === 'chaos' ? '66' : mode === 'chill' ? '40' : '66'}`
                         }}>
                      <Clock className="w-4 h-4" style={{ color: style.accent }} />
                <div className="flex-1">
                        <p className={`text-sm font-black ${style.text}`}>{event.time}</p>
                </div>
              </div>
                  ))}
            </div>
          </Card>
            )
          })()}

          {/* Pipeline */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('pipeline') : getCardStyle('work')
            const pipelineItems = mode === 'chaos'
              ? [
                  { label: 'New Business', count: '12', iconColor: '#FFE500', icon: FileText },
                  { label: 'In Progress', count: '8', iconColor: '#9D4EFF', icon: TrendingUp },
                  { label: 'Completed', count: '24', iconColor: '#00FF87', icon: CheckCircle },
                ]
              : mode === 'chill'
              ? [
                  { label: 'New Business', count: '12', iconColor: '#FFC043', icon: FileText },
                  { label: 'In Progress', count: '8', iconColor: '#8B4444', icon: TrendingUp },
                  { label: 'Completed', count: '24', iconColor: '#C8D961', icon: CheckCircle },
                ]
              : [
                  { label: 'New Business', count: '12', iconColor: '#ffffff', icon: FileText },
                  { label: 'In Progress', count: '8', iconColor: '#cccccc', icon: TrendingUp },
                  { label: 'Completed', count: '24', iconColor: '#e5e5e5', icon: CheckCircle },
                ]
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <p className="text-xs uppercase tracking-wider mb-2 font-black" style={{ color: style.accent }}>Work</p>
                <h2 className={`text-4xl font-black mb-6 uppercase ${style.text}`}>PIPELINE</h2>
            <div className="space-y-3">
                  {pipelineItems.map((item) => {
                    const IconComponent = item.icon
                    return (
                      <div key={item.label} className={`${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/40'} rounded-xl p-4 border-2`} style={{ borderColor: `${item.iconColor}66` }}>
                        <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.iconColor }}>
                              <IconComponent className={`w-4 h-4 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                  </div>
                            <span className={`font-black text-sm ${style.text}`}>{item.label}</span>
                </div>
                          <span className="text-2xl font-black" style={{ color: item.iconColor }}>{item.count}</span>
              </div>
                  </div>
                    )
                  })}
            </div>
          </Card>
            )
          })()}

          {/* Who Needs What */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('who-needs-what') : getCardStyle('work')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <Badge className={`${mode === 'chaos' ? 'bg-black text-[#FF6B00]' : mode === 'chill' ? 'bg-[#4A1818] text-[#FF6B35]' : 'bg-white text-black'} border-0 font-black mb-3 text-xs uppercase tracking-wider`}>Recent Requests</Badge>
                <h2 className={`text-4xl font-black mb-6 uppercase ${style.text}`}>WHO<br/>NEEDS<br/>WHAT</h2>
            <div className="space-y-3 mb-4">
                  {[
                    { name: 'Alex', task: 'Design Review', emoji: '👀' },
                    { name: 'Sarah', task: 'Code Help', emoji: '💻' },
                  ].map((request) => (
                    <div key={request.name} className={`${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/40'} rounded-xl p-3 border-2`} style={{ borderColor: `${style.accent}66` }}>
                      <div className="flex items-center justify-between">
                <div>
                          <p className={`text-sm font-black ${style.text}`}>{request.name}</p>
                          <p className={`text-xs ${style.text}/60`}>{request.task}</p>
                </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: style.accent }}>
                          <span className="text-lg">{request.emoji}</span>
                </div>
              </div>
                </div>
                  ))}
                </div>
                <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#FF6B00] hover:bg-[#0F0F0F]' : mode === 'chill' ? 'bg-[#4A1818] text-[#FF6B35] hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black rounded-full h-12 uppercase`}>
              CLAIM REQUEST
            </Button>
          </Card>
            )
          })()}
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
              <span className="text-[#808080]">RECOGNITION & CULTURE</span>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
              Recognition & Culture
            </>
          )}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Snaps */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('snaps') : getCardStyle('recognition')
            const snapColors = mode === 'chaos'
              ? ['#00D4FF', '#9D4EFF', '#FF00FF']
              : mode === 'chill'
              ? ['#4A9BFF', '#8B4444', '#FFB5D8']
              : ['#cccccc', '#999999', '#e5e5e5']
            const snaps = [
              { from: 'Alex', to: 'Jamie', message: 'Amazing presentation! The client loved it', emoji: '👍' },
              { from: 'Sarah', to: 'Mike', message: 'Thanks for the code review help today', emoji: '🙌' },
              { from: 'Chris', to: 'Taylor', message: 'Great design work on the new landing page', emoji: '⭐' },
            ]
            return (
              <Card className={`lg:col-span-2 ${style.bg} ${style.border} p-8 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
              <Sparkles className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Recent Recognition</span>
            </div>
                <h2 className="text-6xl font-black mb-8 uppercase" style={{ color: style.accent }}>SNAPS</h2>
            <div className="space-y-3 mb-6">
                  {snaps.map((snap, idx) => (
                    <div key={idx} className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/40'} rounded-xl p-5 border-2 transition-all hover:opacity-80`} style={{ borderColor: `${style.accent}66` }}>
                <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: snapColors[idx] }}>{snap.emoji}</div>
                  <div className="flex-1">
                          <p className={`font-black text-sm mb-1 ${style.text}`}>
                            <span className="font-black">{snap.from}</span> <span className={`${style.text}/50`}>→</span> <span className="font-black">{snap.to}</span>
                    </p>
                          <p className={`text-sm leading-relaxed ${style.text}/80`}>{snap.message}</p>
                  </div>
                </div>
              </div>
                  ))}
                  </div>
                <Button className={`w-full ${mode === 'chaos' ? 'bg-gradient-to-r from-[#00FF87] to-[#00E676] hover:from-[#00FF87] hover:to-[#00FF87] text-black' : mode === 'chill' ? 'bg-gradient-to-r from-[#C8D961] to-[#FFC043] hover:from-[#C8D961] hover:to-[#C8D961] text-[#4A1818]' : 'bg-gradient-to-r from-[#cccccc] to-[#e5e5e5] hover:from-[#cccccc] hover:to-[#cccccc] text-black'} font-black rounded-full h-14 text-base uppercase`}>
              + GIVE A SNAP
            </Button>
          </Card>
            )
          })()}

          <div className="space-y-6">
            {/* Beast Babe */}
            {(() => {
              const style = mode === 'chaos' ? getSpecificCardStyle('beast-babe') : getCardStyle('recognition')
              return (
                <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                      style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
                >
                  <p className="text-xs uppercase tracking-wider mb-2 font-black" style={{ color: style.accent }}>This Week's</p>
                  <h2 className={`text-4xl font-black mb-6 uppercase ${style.text}`}>BEAST<br/>BABE</h2>
              <div className="flex items-center justify-center mb-4">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: style.accent }}>
                      <Trophy className={`w-10 h-10 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                </div>
              </div>
                  <p className={`text-2xl font-black text-center ${style.text}`}>Sarah J.</p>
                  <p className={`text-sm text-center font-medium ${style.text}/80`}>42 Snaps Received</p>
            </Card>
              )
            })()}

            {/* Wins Wall */}
            {(() => {
              const style = mode === 'chaos' ? getSpecificCardStyle('wins-wall') : getCardStyle('recognition')
              const wins = [
                { name: 'Alex Chen', win: 'Closed $50k deal!', emoji: '🎉' },
                { name: 'Jamie Park', win: 'Shipped v2.0!', emoji: '🚀' },
                { name: 'Alex Chen', win: 'Closed $50k deal!', emoji: '⭐' },
              ]
              return (
                <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                      style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
                >
                  <div className="flex items-center gap-2 text-sm mb-2" style={{ color: style.accent }}>
                <Trophy className="w-4 h-4" />
                    <span className="uppercase tracking-wider font-black text-xs">Celebrate</span>
              </div>
                  <h2 className={`text-4xl font-black mb-4 uppercase ${style.text}`}>WINS<br/>WALL</h2>
              <div className="space-y-2 mb-4">
                    {wins.map((win, idx) => (
                      <div key={idx} className={`${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/40'} rounded-xl p-3 border-2`} style={{ borderColor: `${style.accent}66` }}>
                        <div className="flex items-center justify-between">
                  <div>
                            <p className={`text-sm font-black ${style.text}`}>{win.name}</p>
                            <p className={`text-xs font-medium ${style.text}/70`}>{win.win}</p>
                  </div>
                          <span className="text-2xl">{win.emoji}</span>
                </div>
                  </div>
                    ))}
                </div>
                  <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#00FF87] hover:bg-[#0F0F0F]' : mode === 'chill' ? 'bg-[#4A1818] text-[#C8D961] hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black rounded-full h-12 uppercase`}>
                Share Win
              </Button>
            </Card>
              )
            })()}
          </div>
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
              <span className="text-[#808080]">MORE MODULES</span>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
              More Modules
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Must Reads */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('must-reads') : getCardStyle('vibes')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
              <FileText className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Weekly</span>
            </div>
                <h2 className={`text-3xl font-black mb-6 uppercase ${style.text}`}>MUST<br/>READS</h2>
            <div className="space-y-3">
                  {[
                    { title: 'Design Systems 2024', author: 'By Emma Chen' },
                    { title: 'Better UX', author: 'By John Smith' },
                  ].map((read) => (
                    <div key={read.title} className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} rounded-xl p-4 border-2`} style={{ borderColor: `${style.accent}40` }}>
                      <p className={`text-sm font-black mb-1 ${style.text}`}>{read.title}</p>
                      <p className={`text-xs font-medium ${style.text}/70`}>{read.author}</p>
              </div>
                  ))}
            </div>
          </Card>
            )
          })()}

          {/* Ask The Hive */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('ask-hive') : getCardStyle('community')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
              <MessageCircle className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Community</span>
            </div>
                <h2 className={`text-3xl font-black mb-6 uppercase ${style.text}`}>ASK THE<br/>HIVE</h2>
            <div className="space-y-3 mb-4">
                  {[
                    { question: 'Best prototyping tool?', answers: '5 answers' },
                    { question: 'Handle difficult client?', answers: '12 answers' },
                  ].map((item) => (
                    <div key={item.question} className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} rounded-xl p-4 border-2`} style={{ borderColor: `${style.accent}40` }}>
                      <p className={`text-sm font-black mb-1 ${style.text}`}>{item.question}</p>
                      <p className={`text-xs font-medium ${style.text}/70`}>{item.answers}</p>
              </div>
                  ))}
              </div>
                <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#9D4EFF] hover:bg-[#0F0F0F]' : mode === 'chill' ? 'bg-[#4A1818] text-[#8B4444] hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black rounded-full h-10 text-sm uppercase`}>
              Ask Question
            </Button>
          </Card>
            )
          })()}

          {/* Team Pulse */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('team-pulse') : getCardStyle('team')
            const barColor = mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#ffffff'
            const barColor2 = mode === 'chaos' ? '#FF6B00' : mode === 'chill' ? '#FF6B35' : '#cccccc'
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <Badge className={`${mode === 'chaos' ? 'bg-[#00FF87] text-black' : mode === 'chill' ? 'bg-[#C8D961] text-[#4A1818]' : 'bg-white text-black'} border-0 font-black mb-4 text-xs`}>+85%</Badge>
                <h2 className={`text-3xl font-black mb-6 uppercase ${style.text}`}>Team Pulse</h2>
            <div className="space-y-4 mb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                      <p className={`text-sm font-black ${style.text}`}>Happiness</p>
                      <p className={`text-2xl font-black ${style.text}`}>85</p>
                </div>
                    <div className={`w-full rounded-full h-2 ${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'}`}>
                      <div className="h-2 rounded-full" style={{ width: '85%', backgroundColor: barColor }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                      <p className={`text-sm font-black ${style.text}`}>Energy</p>
                      <p className={`text-2xl font-black ${style.text}`}>72</p>
                </div>
                    <div className={`w-full rounded-full h-2 ${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'}`}>
                      <div className="h-2 rounded-full" style={{ width: '72%', backgroundColor: barColor2 }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                  <div className={`${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} rounded-xl p-3 border-2`} style={{ borderColor: `${style.accent}40` }}>
                    <p className={`text-xs font-black uppercase tracking-wider mb-1 ${style.text}`}>Excitements</p>
                    <ul className={`text-xs space-y-1 ${style.text}/80`}>
                  <li>• New project kick-off</li>
                  <li>• Team offsite soon</li>
                </ul>
              </div>
                  <div className={`${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} rounded-xl p-3 border-2`} style={{ borderColor: `${style.accent}40` }}>
                    <p className={`text-xs font-black uppercase tracking-wider mb-1 ${style.text}`}>Frustrations</p>
                    <ul className={`text-xs space-y-1 ${style.text}/80`}>
                  <li>• Too many meetings</li>
                  <li>• Unclear priorities</li>
                </ul>
              </div>
            </div>
          </Card>
            )
          })()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Loom Standup */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('loom-standup') : getCardStyle('team')
            const standupColors = mode === 'chaos'
              ? ['#00D4FF', '#9D4EFF', '#FF00FF']
              : mode === 'chill'
              ? ['#4A9BFF', '#8B4444', '#FFB5D8']
              : ['#cccccc', '#999999', '#e5e5e5']
            const standups = [
              { name: 'Alex', time: '3:22', color: standupColors[0] },
              { name: 'Sarah', time: '2:15', color: standupColors[1] },
              { name: 'Mike', time: '4:01', color: standupColors[2] },
              { name: 'Chris', time: 'On Leave', isLeave: true },
            ]
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
              <Video className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Daily</span>
            </div>
                <h2 className={`text-4xl font-black mb-6 uppercase ${style.text}`}>LOOM<br/>STANDUP</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
                  {standups.map((standup, idx) => (
                    <div key={standup.name} className={`${standup.isLeave ? `${mode === 'chaos' ? 'bg-black/80' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/80'} border border-white/20` : ''} rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer`} style={!standup.isLeave ? { backgroundColor: style.accent } : {}}>
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: standup.isLeave ? (mode === 'code' ? '#666666' : '#666666') : standup.color }}>
                        {standup.isLeave ? <Users className={`w-8 h-8 ${mode === 'code' ? 'text-white' : 'text-zinc-400'}`} /> : <Video className="w-8 h-8 text-white" />}
                </div>
                      <p className={`text-xs font-black ${standup.isLeave ? style.text : (mode === 'chill' ? 'text-[#4A1818]' : 'text-black')}`}>{standup.name}</p>
                      <p className={`text-xs ${standup.isLeave ? `${style.text}/60` : (mode === 'chill' ? 'text-[#4A1818]/70' : 'text-zinc-700')}`}>{standup.time}</p>
              </div>
                  ))}
            </div>
          </Card>
            )
          })()}

          {/* Inspiration War */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('inspiration-war') : getCardStyle('hero')
            return (
              <Card className={`${style.bg} ${style.border} p-8 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
            <div className="flex items-center justify-between mb-6">
              <div>
                    <div className="flex items-center gap-2 text-sm mb-2" style={{ color: style.accent }}>
                  <Lightbulb className="w-4 h-4" />
                      <span className="uppercase tracking-wider font-black text-xs">Today's Theme</span>
                </div>
                    <h2 className={`text-4xl font-black uppercase ${style.text}`}>INSPIRATION<br/>WAR</h2>
              </div>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#4A1818' : '#000000' }}>
                    <Sparkles className="w-8 h-8" style={{ color: style.accent }} />
              </div>
            </div>
                <div className={`${mode === 'chaos' ? 'bg-black/10 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/10'} rounded-2xl p-4 border-2 mb-6`} style={{ borderColor: `${style.accent}20` }}>
                  <p className={`font-black text-lg text-center ${style.text}`}>Retro Futurism</p>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[16, 15, 9, 9].map((votes, i) => (
                    <div key={i} className={`${mode === 'chaos' ? 'bg-black/20 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/20'} rounded-2xl p-4 border-2 flex flex-col items-center justify-center hover:opacity-80 transition-all cursor-pointer group`} style={{ borderColor: `${style.accent}30` }}>
                  <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">🎨</div>
                      <p className={`text-xs font-black ${style.text}`}>~{votes}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
                  <p className={`font-black ${style.text}`}>🎨 24 entries</p>
                  <p className={`font-black ${style.text}`}>8h to vote</p>
            </div>
          </Card>
            )
          })()}
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
              <span className="text-[#808080]">BROWSE CATEGORIES</span>
              <span className="text-[#00FF00]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
              Browse Categories
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Categories */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('categories') : getCardStyle('community')
            const categoryColors = mode === 'chaos'
              ? ['#00D4FF', '#FF0055', '#00FF87', '#FF6B00', '#FF6B00', '#000000']
              : mode === 'chill'
              ? ['#4A9BFF', '#FF6B35', '#C8D961', '#FF6B35', '#FF6B35', '#4A1818']
              : ['#cccccc', '#999999', '#e5e5e5', '#999999', '#999999', '#ffffff']
            const categories = [
              { name: 'Comms', icon: MessageCircle, color: categoryColors[0] },
              { name: 'Creative', icon: Lightbulb, color: categoryColors[1] },
              { name: 'Learn', icon: Star, color: categoryColors[2] },
              { name: 'Research', icon: Search, color: categoryColors[3] },
              { name: 'Strategy', icon: Lightbulb, color: categoryColors[4] },
              { name: 'Tools', icon: Zap, color: categoryColors[5] },
            ]
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <p className={`text-xs uppercase tracking-wider mb-2 font-black ${style.text}/70`}>Browse</p>
                <h2 className={`text-4xl font-black mb-6 uppercase ${style.text}`}>CATEGORIES</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map((cat) => {
                    const IconComponent = cat.icon
                    return (
                      <Button key={cat.name} className="font-black rounded-full h-16 uppercase" style={{ backgroundColor: cat.color, color: mode === 'chill' && cat.color === '#4A1818' ? '#FFC043' : (cat.color === '#000000' || cat.color === '#ffffff') ? (mode === 'code' ? '#000000' : '#ffffff') : (mode === 'chill' ? '#4A1818' : '#000000') }}>
                        <IconComponent className="w-5 h-5 mr-2" />
                        {cat.name}
              </Button>
                    )
                  })}
            </div>
          </Card>
            )
          })()}

          {/* Search */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('search') : getCardStyle('hero')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
              <Search className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Find Anything</span>
            </div>
                <h2 className={`text-4xl font-black mb-6 uppercase ${style.text}`}>SEARCH</h2>
            <div className="relative">
              <Input 
                placeholder="Resources, people, projects..."
                    className={`${mode === 'chaos' ? 'bg-black/40 border-zinc-700' : mode === 'chill' ? 'bg-[#F5E6D3]/50 border-[#8B4444]/30' : 'bg-black/40 border-zinc-700'} ${style.text} placeholder:${style.text}/50 rounded-xl h-14 pr-14 font-medium`}
              />
                  <Button className="absolute right-2 top-2 rounded-lg h-10 w-10 p-0" style={{ backgroundColor: style.accent, color: mode === 'chill' ? '#4A1818' : '#000000' }}>
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </Card>
            )
          })()}
        </div>

        <footer className={`border-t pt-8 mt-12 ${getBorderClass()}`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div>
              <h3 className={`text-xl font-black mb-2 ${getTextClass()}`}>Team Dashboard</h3>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Built with love and way too much coffee</p>
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wider font-black mb-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Totally Real Stats</p>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>347 cups of coffee consumed</p>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>48 good vibes generated</p>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>100% team awesomeness</p>
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wider font-black mb-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Fun Fact</p>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>We put the 'fun' in 'functional' and also in 'funnel', but we don't talk about that</p>
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wider font-black mb-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Good Morning</p>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>Time to make today awesome! After coffee, obviously</p>
            </div>
          </div>
          <div className={`flex items-center justify-between text-xs pt-6 border-t ${getBorderClass()}`} style={{ color: mode === 'chaos' ? '#666666' : mode === 'chill' ? '#8B4444' : '#808080' }}>
            <p>© 2025 Team Dashboard. Made with questionable decisions and great intentions.</p>
            <div className="flex items-center gap-4">
              <a href="#" className={`transition-colors ${mode === 'chaos' ? 'hover:text-[#808080]' : mode === 'chill' ? 'hover:text-[#8B4444]/80' : 'hover:text-[#999999]'}`}>Privacy lol we're a team!</a>
              <a href="#" className={`transition-colors ${mode === 'chaos' ? 'hover:text-[#808080]' : mode === 'chill' ? 'hover:text-[#8B4444]/80' : 'hover:text-[#999999]'}`}>Terms just be cool</a>
              <a href="#" className={`transition-colors ${mode === 'chaos' ? 'hover:text-[#808080]' : mode === 'chill' ? 'hover:text-[#8B4444]/80' : 'hover:text-[#999999]'}`}>Contact we're right here</a>
            </div>
          </div>
          <p className={`text-center text-[10px] mt-4 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]/70' : 'text-[#666666]'}`}>v1.2.3-beta-test.beta</p>
        </footer>
      </main>
    </div>
  )
}
