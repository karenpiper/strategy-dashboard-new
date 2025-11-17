'use client'

import { Search, Calendar, Music, FileText, MessageCircle, Trophy, TrendingUp, Users, Zap, Star, Heart, Coffee, Lightbulb, ChevronRight, Play, CheckCircle, Clock, ArrowRight, Video, Sparkles } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ModeSwitcher } from "@/components/mode-switcher"
import { useMode } from "@/contexts/mode-context"

// Force dynamic rendering to avoid SSR issues with context
export const dynamic = 'force-dynamic'

export default function TeamDashboard() {
  const { mode } = useMode()

  // Chaos mode card color helpers based on brand guidelines
  const getChaosCardStyle = (section: 'hero' | 'recognition' | 'work' | 'team' | 'vibes' | 'community' | 'default'): { bg: string; border: string; glow: string } => {
    if (mode !== 'chaos') {
      return { bg: '', border: '', glow: '' }
    }
    
    const colors: Record<string, { bg: string; border: string; glow: string }> = {
      hero: { bg: 'bg-gradient-to-br from-[#C4F500] via-[#FFE500] to-[#00FF87]', border: 'border-4 border-[#C4F500]', glow: 'rgba(196, 245, 0, 0.4)' },
      recognition: { bg: 'bg-[#2A2A2A]', border: 'border-4 border-[#00FF87]', glow: 'rgba(0, 255, 135, 0.4)' },
      work: { bg: 'bg-[#2A2A2A]', border: 'border-4 border-[#FF6B00]', glow: 'rgba(255, 107, 0, 0.4)' },
      team: { bg: 'bg-[#2A2A2A]', border: 'border-4 border-[#00D4FF]', glow: 'rgba(0, 212, 255, 0.4)' },
      vibes: { bg: 'bg-[#2A2A2A]', border: 'border-4 border-[#FF00FF]', glow: 'rgba(255, 0, 255, 0.4)' },
      community: { bg: 'bg-[#2A2A2A]', border: 'border-4 border-[#9D4EFF]', glow: 'rgba(157, 78, 255, 0.4)' },
      default: { bg: 'bg-[#2A2A2A]', border: 'border-4 border-[#C4F500]', glow: 'rgba(196, 245, 0, 0.4)' },
    }
    return colors[section] || colors.default
  }

  // Mode-aware class helpers
  const getBgClass = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#1A1A1A]' // Charcoal
      case 'chill': return 'bg-[#F5E6D3]'
      case 'dark-grey': return 'bg-black'
      case 'light-grey': return 'bg-white'
      default: return 'bg-[#1A1A1A]'
    }
  }

  const getTextClass = () => {
    switch (mode) {
      case 'chaos': return 'text-white'
      case 'chill': return 'text-[#4A1818]'
      case 'dark-grey': return 'text-white'
      case 'light-grey': return 'text-black'
      default: return 'text-white'
    }
  }

  const getBorderClass = () => {
    switch (mode) {
      case 'chaos': return 'border-[#333333]'
      case 'chill': return 'border-[#4A1818]/20'
      case 'dark-grey': return 'border-[#333333]'
      case 'light-grey': return 'border-[#e0e0e0]'
      default: return 'border-[#333333]'
    }
  }

  const getNavLinkClass = (isActive = false) => {
    const base = 'transition-colors text-sm font-black uppercase'
    if (isActive) {
      switch (mode) {
        case 'chaos': return `${base} text-white hover:text-[#C4F500]`
        case 'chill': return `${base} text-[#4A1818] hover:text-[#FFC043]`
        case 'dark-grey': return `${base} text-white hover:text-[#cccccc]`
        case 'light-grey': return `${base} text-black hover:text-[#666666]`
        default: return `${base} text-white hover:text-[#C4F500]`
      }
    } else {
      switch (mode) {
        case 'chaos': return `${base} text-[#666666] hover:text-white`
        case 'chill': return `${base} text-[#8B4444] hover:text-[#4A1818]`
        case 'dark-grey': return `${base} text-[#808080] hover:text-white`
        case 'light-grey': return `${base} text-[#808080] hover:text-black`
        default: return `${base} text-[#666666] hover:text-white`
      }
    }
  }

  const getLogoBg = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#C4F500]' // Neon Lime
      case 'chill': return 'bg-[#FFC043]'
      case 'dark-grey': return 'bg-white'
      case 'light-grey': return 'bg-black'
      default: return 'bg-[#C4F500]'
    }
  }

  const getLogoText = () => {
    switch (mode) {
      case 'chaos': return 'text-black'
      case 'chill': return 'text-[#4A1818]'
      case 'dark-grey': return 'text-black'
      case 'light-grey': return 'text-white'
      default: return 'text-black'
    }
  }

  return (
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()} font-[family-name:var(--font-raleway)]`}>
      <header className={`border-b ${getBorderClass()} px-6 py-4`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className={`w-10 h-10 ${getLogoBg()} ${getLogoText()} rounded-xl flex items-center justify-center font-black text-lg`}>
              D
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
            <div className={`w-10 h-10 rounded-full border-2 ${
              mode === 'chaos' ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-purple-400/30' :
              mode === 'chill' ? 'bg-gradient-to-br from-[#FFB5D8] to-[#FFC043] border-[#4A1818]/20' :
              mode === 'dark-grey' ? 'bg-[#333333] border-[#666666]' :
              'bg-[#e0e0e0] border-[#cccccc]'
            }`} />
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Large Hero Card - Chaos Mode Brand Guidelines */}
            <Card className={`${mode === 'chaos' ? 'bg-gradient-to-br from-[#C4F500] via-[#FFE500] to-[#00FF87] text-black border-4 border-[#C4F500]' : 'bg-gradient-to-br from-[#FFB84D] via-[#FF8A5C] to-[#FF6B9D] text-black border-0'} p-0 rounded-[2.5rem] relative overflow-hidden group col-span-1 lg:col-span-2`}
                  style={mode === 'chaos' ? { boxShadow: '0 0 40px rgba(196, 245, 0, 0.4)' } : {}}
            >
            {mode === 'chaos' ? (
              <div className="absolute top-0 right-0 w-[55%] h-full bg-[#1A1A1A]" 
                   style={{
                     clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0 100%)'
                   }} 
              />
            ) : (
              <div className="absolute top-0 right-0 w-[55%] h-full bg-black" 
                   style={{
                     clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0 100%)'
                   }} 
              />
            )}
            <div className="relative z-10 p-8 h-full flex flex-col justify-between">
              <div>
                <Badge className={`${mode === 'chaos' ? 'bg-black text-[#C4F500]' : 'bg-black text-white'} hover:bg-black border-0 font-black mb-4 text-xs uppercase tracking-wider`}>Quick Actions</Badge>
                <h1 className="text-7xl md:text-8xl font-black mb-4 leading-[0.85] tracking-tight uppercase">READY!</h1>
                <p className={`text-xl font-semibold max-w-md ${mode === 'chaos' ? 'text-black' : 'text-black'}`}>
                  Let's ship something amazing today
                </p>
                <p className={`text-sm font-medium mt-3 ${mode === 'chaos' ? 'text-black/70' : 'text-black/70'}`}>Friday, November 14</p>
              </div>
              <div className="flex items-center gap-3 mt-6 flex-wrap">
                <Button className={`${mode === 'chaos' ? 'bg-black text-[#C4F500] hover:bg-[#0F0F0F]' : 'bg-black text-white hover:bg-zinc-900'} font-black rounded-full h-12 px-8 uppercase`}>
                  Give Snap <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button className={`${mode === 'chaos' ? 'bg-black text-[#C4F500] hover:bg-[#0F0F0F]' : 'bg-black text-white hover:bg-zinc-900'} font-black rounded-full h-12 px-8 uppercase`}>
                  Need Help <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button className={`${mode === 'chaos' ? 'bg-black text-[#C4F500] hover:bg-[#0F0F0F]' : 'bg-black text-white hover:bg-zinc-900'} font-black rounded-full h-12 px-8 uppercase`}>
                  Add Win <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>

            {/* Small Launch Pad */}
            <Card className={`${mode === 'chaos' ? 'bg-[#2A2A2A] border-4 border-[#C4F500]' : 'bg-zinc-900 border border-zinc-700'} p-8 rounded-[2.5rem] flex flex-col justify-center`}
                  style={mode === 'chaos' ? { boxShadow: '0 0 40px rgba(196, 245, 0, 0.4)' } : {}}
            >
            <div className={`w-12 h-12 ${mode === 'chaos' ? 'bg-[#C4F500]' : 'bg-[#E8FF00]'} rounded-2xl flex items-center justify-center mb-4`}>
              <Zap className={`w-6 h-6 ${mode === 'chaos' ? 'text-black' : 'text-black'}`} />
            </div>
            <p className={`text-xs uppercase tracking-wider font-black mb-2 ${mode === 'chaos' ? 'text-[#C4F500]' : 'text-zinc-500'}`}>Launch Pad</p>
            <h2 className={`text-4xl font-black leading-tight uppercase ${mode === 'chaos' ? 'text-white' : 'text-white'}`}>Quick Actions</h2>
          </Card>
        </div>
        </section>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : 'text-zinc-600'}`}>
          <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : 'bg-zinc-800'}`}></span>
          Personalized Information
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Horoscope */}
          <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('vibes').bg} ${getChaosCardStyle('vibes').border} p-6 rounded-[2.5rem]` : 'bg-gradient-to-br from-purple-600 to-purple-700 border-0 p-6 rounded-3xl'}`}
                style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('vibes').glow}` } : {}}
          >
            <div className={`flex items-center gap-2 text-sm mb-3 ${mode === 'chaos' ? 'text-[#FF00FF]' : 'text-[#E8FF00]'}`}>
              <Sparkles className="w-4 h-4" />
              <span className="uppercase tracking-wider font-black text-xs">Totally Real</span>
            </div>
            <h2 className={`text-4xl font-black mb-6 uppercase ${mode === 'chaos' ? 'text-[#FF00FF]' : 'text-[#E8FF00]'}`}>YOUR<br/>HOROSCOPE</h2>
            <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm rounded-2xl p-4 border-2 border-[#FF00FF]/40' : 'bg-purple-800/50 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30'}`}>
              <p className={`text-sm font-black mb-2 ${mode === 'chaos' ? 'text-[#FF00FF]' : 'text-[#E8FF00]'}`}>CANCER</p>
              <p className="text-white text-sm leading-relaxed">Mars aligns with your keyboard. Expect typos. So many typos. Idk stars have speelin.</p>
            </div>
          </Card>

          {/* Weather */}
          <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('team').bg} ${getChaosCardStyle('team').border} p-6 rounded-[2.5rem]` : 'bg-gradient-to-br from-sky-400 to-blue-500 border-0 p-6 rounded-3xl'} relative overflow-hidden`}
                style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('team').glow}` } : {}}
          >
            <div className="flex items-center gap-2 text-sm mb-3 text-white/90 relative z-10">
              <span className="uppercase tracking-wider font-black text-xs">Right Now</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-4 relative z-10 uppercase">WEATHER</h2>
            <div className="mb-6 relative z-10">
              <p className="text-7xl font-black text-white mb-2">72°</p>
              <p className="text-white text-lg font-bold">Partly Cloudy</p>
              <p className="text-sm text-white/80 font-medium">Your Location</p>
            </div>
            <div className="absolute bottom-20 right-8 text-white/20 text-9xl">☁️</div>
            <div className="grid grid-cols-2 gap-3 relative z-10">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <p className="text-xs text-white/90 font-bold uppercase tracking-wide">Humidity</p>
                <p className="text-2xl font-black text-white">65%</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <p className="text-xs text-white/90 font-bold uppercase tracking-wide">Wind</p>
                <p className="text-2xl font-black text-white">8 mph</p>
              </div>
            </div>
          </Card>

          {/* Time Zones */}
          <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('team').bg} ${getChaosCardStyle('team').border} p-6 rounded-[2.5rem]` : 'bg-zinc-900 border border-sky-500 p-6 rounded-3xl'}`}
                style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('team').glow}` } : {}}
          >
            <div className={`flex items-center gap-2 text-sm mb-3 ${mode === 'chaos' ? 'text-[#00D4FF]' : 'text-sky-400'}`}>
              <Clock className="w-4 h-4" />
              <span className="uppercase tracking-wider font-black text-xs">Global Team</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-6 uppercase">TIME<br/>ZONES</h2>
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-3 rounded-xl transition-colors ${mode === 'chaos' ? 'bg-[#00D4FF]/20 border-2 border-[#00D4FF]/40 hover:bg-[#00D4FF]/30' : 'bg-blue-500 hover:bg-blue-600'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-base">🌉</div>
                  <div>
                    <p className="text-white font-black text-sm">San Francisco</p>
                    <p className="text-xs text-white/70 font-medium">2 people</p>
                  </div>
                </div>
                <span className="text-white font-black text-sm">12:50 AM</span>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-xl transition-colors ${mode === 'chaos' ? 'bg-[#00FF87]/20 border-2 border-[#00FF87]/40 hover:bg-[#00FF87]/30' : 'bg-green-600 hover:bg-green-700'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-base">🗽</div>
                  <div>
                    <p className="text-white font-black text-sm">New York</p>
                    <p className="text-xs text-white/70 font-medium">5 people</p>
                  </div>
                </div>
                <span className="text-white font-black text-sm">03:50 AM</span>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-xl transition-colors ${mode === 'chaos' ? 'bg-[#9D4EFF]/20 border-2 border-[#9D4EFF]/40 hover:bg-[#9D4EFF]/30' : 'bg-purple-600 hover:bg-purple-700'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-base">🏰</div>
                  <div>
                    <p className="text-white font-black text-sm">London</p>
                    <p className="text-xs text-white/70 font-medium">3 people</p>
                  </div>
                </div>
                <span className="text-white font-black text-sm">08:50 AM</span>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-xl transition-colors ${mode === 'chaos' ? 'bg-[#FF00FF]/20 border-2 border-[#FF00FF]/40 hover:bg-[#FF00FF]/30' : 'bg-pink-600 hover:bg-pink-700'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-base">🗼</div>
                  <div>
                    <p className="text-white font-black text-sm">Tokyo</p>
                    <p className="text-xs text-white/70 font-medium">1 person</p>
                  </div>
                </div>
                <span className="text-white font-black text-sm">05:50 PM</span>
              </div>
            </div>
          </Card>
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : 'text-zinc-600'}`}>
          <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : 'bg-zinc-800'}`}></span>
          Work Updates
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Playlist */}
          <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('vibes').bg} ${getChaosCardStyle('vibes').border} p-6 rounded-[2.5rem]` : 'bg-gradient-to-br from-orange-500 to-orange-600 border-0 p-6 rounded-3xl'}`}
                style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('vibes').glow}` } : {}}
          >
            <div className={`flex items-center gap-2 text-sm mb-3 ${mode === 'chaos' ? 'text-[#FF00FF]' : 'text-black'}`}>
              <Music className="w-4 h-4" />
              <span className="uppercase tracking-wider font-black text-xs">Weekly</span>
            </div>
            <h2 className={`text-3xl font-black mb-4 uppercase ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>PLAYLIST</h2>
            <div className="flex items-center justify-center mb-4">
              <div className={`w-20 h-20 ${mode === 'chaos' ? 'bg-[#FF00FF]' : 'bg-black'} rounded-2xl flex items-center justify-center`}>
                <Music className={`w-10 h-10 ${mode === 'chaos' ? 'text-black' : 'text-orange-500'}`} />
              </div>
            </div>
            <p className={`font-black text-sm mb-1 ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>Coding Vibes</p>
            <p className={`text-xs mb-4 ${mode === 'chaos' ? 'text-white/70' : 'text-black/70'}`}>Curated by Alex</p>
            <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#FF00FF] hover:bg-[#0F0F0F]' : 'bg-black hover:bg-zinc-900 text-white'} font-black rounded-full h-10 text-sm uppercase`}>
              <Play className="w-4 h-4 mr-2" /> Play on Spotify
            </Button>
          </Card>

          {/* Friday Drop */}
          <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('work').bg} ${getChaosCardStyle('work').border} p-6 rounded-[2.5rem]` : 'bg-gradient-to-br from-teal-500 to-cyan-600 border-0 p-6 rounded-3xl'}`}
                style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('work').glow}` } : {}}
          >
            <div className={`flex items-center gap-2 text-sm mb-3 ${mode === 'chaos' ? 'text-[#FF6B00]' : 'text-black'}`}>
              <FileText className="w-4 h-4" />
              <span className="uppercase tracking-wider font-black text-xs">Weekly Report</span>
            </div>
            <h2 className={`text-3xl font-black mb-6 uppercase ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>THE<br/>FRIDAY<br/>DROP</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/10 backdrop-blur-sm rounded-xl p-3 border border-black/10 text-center">
                <p className="text-3xl font-black text-black">5</p>
                <p className="text-xs text-black/70 font-bold uppercase tracking-wide">New</p>
              </div>
              <div className="bg-black/10 backdrop-blur-sm rounded-xl p-3 border border-black/10 text-center">
                <p className="text-3xl font-black text-black">8</p>
                <p className="text-xs text-black/70 font-bold uppercase tracking-wide">Shipped</p>
              </div>
              <div className="bg-black/10 backdrop-blur-sm rounded-xl p-3 border border-black/10 text-center">
                <p className="text-3xl font-black text-black">12</p>
                <p className="text-xs text-black/70 font-bold uppercase tracking-wide">In QA</p>
              </div>
            </div>
          </Card>

          {/* Brand Redesign */}
          <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('vibes').bg} ${getChaosCardStyle('vibes').border} p-6 rounded-[2.5rem]` : 'bg-gradient-to-br from-pink-400 to-pink-500 border-0 p-6 rounded-3xl'} relative overflow-hidden`}
                style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('vibes').glow}` } : {}}
          >
            <Badge className={`${mode === 'chaos' ? 'bg-black text-[#FF00FF]' : 'bg-black text-white'} border-0 font-black mb-3 text-xs uppercase tracking-wider`}>Featured</Badge>
            <div className="mb-4">
              <p className={`text-sm font-medium mb-1 ${mode === 'chaos' ? 'text-white/70' : 'text-black/70'}`}>Active Drop</p>
              <h3 className={`text-2xl font-black uppercase ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>Brand Redesign</h3>
              <Badge className={`${mode === 'chaos' ? 'bg-black/40 text-[#FF00FF]' : 'bg-black/20 text-black'} border-0 font-black mt-2 text-xs`}>Branding</Badge>
            </div>
            <div className={`absolute bottom-4 right-4 text-8xl ${mode === 'chaos' ? 'opacity-10' : 'opacity-20'}`}>🎨</div>
            <ChevronRight className={`absolute bottom-4 right-4 w-6 h-6 ${mode === 'chaos' ? 'text-white' : 'text-black'}`} />
          </Card>

          {/* Stats */}
          <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('team').bg} ${getChaosCardStyle('team').border} p-6 rounded-[2.5rem]` : 'bg-white border-0 p-6 rounded-3xl'}`}
                style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('team').glow}` } : {}}
          >
            <p className={`text-xs uppercase tracking-wider mb-2 font-black ${mode === 'chaos' ? 'text-[#00D4FF]' : 'text-zinc-600'}`}>This Month</p>
            <h2 className={`text-3xl font-black mb-6 uppercase ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>STATS</h2>
            <div className="space-y-4">
              <div>
                <p className={`text-5xl font-black ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>24</p>
                <p className={`text-sm font-black ${mode === 'chaos' ? 'text-white/70' : 'text-zinc-600'}`}>Team</p>
              </div>
              <div>
                <p className={`text-5xl font-black ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>247</p>
                <p className={`text-sm font-black ${mode === 'chaos' ? 'text-white/70' : 'text-zinc-600'}`}>Snaps</p>
              </div>
              <div>
                <p className={`text-5xl font-black ${mode === 'chaos' ? 'text-[#00FF87]' : 'text-emerald-500'}`}>+15%</p>
                <p className={`text-sm font-black ${mode === 'chaos' ? 'text-white/70' : 'text-zinc-600'}`}>Growth</p>
              </div>
            </div>
          </Card>
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : 'text-zinc-600'}`}>
          <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : 'bg-zinc-800'}`}></span>
          Work Updates Continued
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Events */}
          <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('work').bg} ${getChaosCardStyle('work').border} p-6 rounded-[2.5rem]` : 'bg-zinc-900 border border-teal-500 p-6 rounded-3xl'}`}
                style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('work').glow}` } : {}}
          >
            <div className={`flex items-center gap-2 text-sm mb-3 ${mode === 'chaos' ? 'text-[#FF6B00]' : 'text-teal-400'}`}>
              <Calendar className="w-4 h-4" />
              <span className="uppercase tracking-wider font-black text-xs">Today</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-6 uppercase">EVENTS</h2>
            <div className="space-y-3">
              <div className={`flex items-center gap-3 p-3 rounded-xl ${mode === 'chaos' ? 'bg-[#FF6B00]/20 border-2 border-[#FF6B00]/40' : 'bg-teal-900/30 border border-teal-700/50'}`}>
                <Clock className={`w-4 h-4 ${mode === 'chaos' ? 'text-[#FF6B00]' : 'text-teal-400'}`} />
                <div className="flex-1">
                  <p className="text-sm font-black text-white">10:30 Team Standup</p>
                </div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl ${mode === 'chaos' ? 'bg-[#FF6B00]/20 border-2 border-[#FF6B00]/40' : 'bg-teal-900/30 border border-teal-700/50'}`}>
                <Clock className={`w-4 h-4 ${mode === 'chaos' ? 'text-[#FF6B00]' : 'text-teal-400'}`} />
                <div className="flex-1">
                  <p className="text-sm font-black text-white">14:00 Design Review</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Pipeline */}
          <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('work').bg} ${getChaosCardStyle('work').border} p-6 rounded-[2.5rem]` : 'bg-[#6FD89C] border-0 p-6 rounded-3xl'}`}
                style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('work').glow}` } : {}}
          >
            <p className={`text-xs uppercase tracking-wider mb-2 font-black ${mode === 'chaos' ? 'text-[#FF6B00]' : 'text-black/70'}`}>Work</p>
            <h2 className={`text-4xl font-black mb-6 uppercase ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>PIPELINE</h2>
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-4 rounded-xl ${mode === 'chaos' ? 'bg-black/40 border-2 border-[#FF6B00]/40' : 'bg-black/80 border border-black'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === 'chaos' ? 'bg-[#FFE500]' : 'bg-[#E8FF00]'}`}>
                    <FileText className={`w-4 h-4 ${mode === 'chaos' ? 'text-black' : 'text-black'}`} />
                  </div>
                  <span className="text-white font-black text-sm">New Business</span>
                </div>
                <span className={`text-2xl font-black ${mode === 'chaos' ? 'text-[#FFE500]' : 'text-[#E8FF00]'}`}>12</span>
              </div>
              <div className={`flex items-center justify-between p-4 rounded-xl ${mode === 'chaos' ? 'bg-black/40 border-2 border-[#9D4EFF]/40' : 'bg-black/80 border border-black'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === 'chaos' ? 'bg-[#9D4EFF]' : 'bg-purple-500'}`}>
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-black text-sm">In Progress</span>
                </div>
                <span className={`text-2xl font-black ${mode === 'chaos' ? 'text-[#9D4EFF]' : 'text-purple-300'}`}>8</span>
              </div>
              <div className={`flex items-center justify-between p-4 rounded-xl ${mode === 'chaos' ? 'bg-black/40 border-2 border-[#00FF87]/40' : 'bg-black/80 border border-black'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === 'chaos' ? 'bg-[#00FF87]' : 'bg-[#6FD89C]'}`}>
                    <CheckCircle className={`w-4 h-4 ${mode === 'chaos' ? 'text-black' : 'text-black'}`} />
                  </div>
                  <span className="text-white font-black text-sm">Completed</span>
                </div>
                <span className={`text-2xl font-black ${mode === 'chaos' ? 'text-[#00FF87]' : 'text-[#6FD89C]'}`}>24</span>
              </div>
            </div>
          </Card>

          {/* Who Needs What */}
          <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('work').bg} ${getChaosCardStyle('work').border} p-6 rounded-[2.5rem]` : 'bg-[#E8FF00] border-0 p-6 rounded-3xl'}`}
                style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('work').glow}` } : {}}
          >
            <Badge className={`${mode === 'chaos' ? 'bg-black text-[#FF6B00]' : 'bg-black text-[#E8FF00]'} border-0 font-black mb-3 text-xs uppercase tracking-wider`}>Recent Requests</Badge>
            <h2 className={`text-4xl font-black mb-6 uppercase ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>WHO<br/>NEEDS<br/>WHAT</h2>
            <div className="space-y-3 mb-4">
              <div className={`flex items-center justify-between p-3 rounded-xl ${mode === 'chaos' ? 'bg-black/40 border-2 border-[#FF6B00]/40' : 'bg-black'}`}>
                <div>
                  <p className="text-sm font-black text-white">Alex</p>
                  <p className={`text-xs ${mode === 'chaos' ? 'text-white/60' : 'text-zinc-400'}`}>Design Review</p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === 'chaos' ? 'bg-[#FF6B00]' : 'bg-[#E8FF00]'}`}>
                  <span className="text-lg">👀</span>
                </div>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-xl ${mode === 'chaos' ? 'bg-black/40 border-2 border-[#FF6B00]/40' : 'bg-black'}`}>
                <div>
                  <p className="text-sm font-black text-white">Sarah</p>
                  <p className={`text-xs ${mode === 'chaos' ? 'text-white/60' : 'text-zinc-400'}`}>Code Help</p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === 'chaos' ? 'bg-[#FF6B00]' : 'bg-[#E8FF00]'}`}>
                  <span className="text-lg">💻</span>
                </div>
              </div>
            </div>
            <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#FF6B00] hover:bg-[#0F0F0F]' : 'bg-black hover:bg-zinc-900 text-white'} font-black rounded-full h-12 uppercase`}>
              CLAIM REQUEST
            </Button>
          </Card>
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : 'text-zinc-600'}`}>
          <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : 'bg-zinc-800'}`}></span>
          Recognition & Culture
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Snaps */}
          <Card className={`lg:col-span-2 ${mode === 'chaos' ? `${getChaosCardStyle('recognition').bg} ${getChaosCardStyle('recognition').border} p-8 rounded-[2.5rem]` : 'bg-zinc-900 border border-purple-500 p-8 rounded-3xl'}`}
                style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('recognition').glow}` } : {}}
          >
            <div className={`flex items-center gap-2 text-sm mb-3 ${mode === 'chaos' ? 'text-[#00FF87]' : 'text-purple-400'}`}>
              <Sparkles className="w-4 h-4" />
              <span className="uppercase tracking-wider font-black text-xs">Recent Recognition</span>
            </div>
            <h2 className={`text-6xl font-black mb-8 uppercase ${mode === 'chaos' ? 'text-[#00FF87]' : 'text-[#E8FF00]'}`}>SNAPS</h2>
            <div className="space-y-3 mb-6">
              <div className={`backdrop-blur-sm rounded-xl p-5 transition-all ${mode === 'chaos' ? 'bg-black/40 border-2 border-[#00FF87]/40 hover:border-[#00FF87]/60' : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-[#E8FF00]/50'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${mode === 'chaos' ? 'bg-[#00D4FF]' : 'bg-blue-500'}`}>👍</div>
                  <div className="flex-1">
                    <p className="font-black text-white text-sm mb-1">
                      <span className="font-black">Alex</span> <span className={mode === 'chaos' ? 'text-white/50' : 'text-zinc-500'}>→</span> <span className="font-black">Jamie</span>
                    </p>
                    <p className={`text-sm leading-relaxed ${mode === 'chaos' ? 'text-white/80' : 'text-zinc-300'}`}>Amazing presentation! The client loved it</p>
                  </div>
                </div>
              </div>
              <div className={`backdrop-blur-sm rounded-xl p-5 transition-all ${mode === 'chaos' ? 'bg-black/40 border-2 border-[#00FF87]/40 hover:border-[#00FF87]/60' : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-[#E8FF00]/50'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${mode === 'chaos' ? 'bg-[#9D4EFF]' : 'bg-purple-500'}`}>🙌</div>
                  <div className="flex-1">
                    <p className="font-black text-white text-sm mb-1">
                      <span className="font-black">Sarah</span> <span className={mode === 'chaos' ? 'text-white/50' : 'text-zinc-500'}>→</span> <span className="font-black">Mike</span>
                    </p>
                    <p className={`text-sm leading-relaxed ${mode === 'chaos' ? 'text-white/80' : 'text-zinc-300'}`}>Thanks for the code review help today</p>
                  </div>
                </div>
              </div>
              <div className={`backdrop-blur-sm rounded-xl p-5 transition-all ${mode === 'chaos' ? 'bg-black/40 border-2 border-[#00FF87]/40 hover:border-[#00FF87]/60' : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-[#E8FF00]/50'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${mode === 'chaos' ? 'bg-[#FF00FF]' : 'bg-pink-500'}`}>⭐</div>
                  <div className="flex-1">
                    <p className="font-black text-white text-sm mb-1">
                      <span className="font-black">Chris</span> <span className={mode === 'chaos' ? 'text-white/50' : 'text-zinc-500'}>→</span> <span className="font-black">Taylor</span>
                    </p>
                    <p className={`text-sm leading-relaxed ${mode === 'chaos' ? 'text-white/80' : 'text-zinc-300'}`}>Great design work on the new landing page</p>
                  </div>
                </div>
              </div>
            </div>
            <Button className={`w-full ${mode === 'chaos' ? 'bg-gradient-to-r from-[#00FF87] to-[#00E676] hover:from-[#00FF87] hover:to-[#00FF87] text-black' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'} font-black rounded-full h-14 text-base uppercase`}>
              + GIVE A SNAP
            </Button>
          </Card>

          <div className="space-y-6">
            {/* Beast Babe */}
            <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('recognition').bg} ${getChaosCardStyle('recognition').border} p-6 rounded-[2.5rem]` : 'bg-gradient-to-br from-red-500 to-pink-600 border-0 p-6 rounded-3xl'}`}
                  style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('recognition').glow}` } : {}}
            >
            <p className={`text-xs uppercase tracking-wider mb-2 font-black ${mode === 'chaos' ? 'text-[#00FF87]' : 'text-white/80'}`}>This Week's</p>
            <h2 className={`text-4xl font-black text-white mb-6 uppercase ${mode === 'chaos' ? 'text-white' : 'text-white'}`}>BEAST<br/>BABE</h2>
            <div className="flex items-center justify-center mb-4">
              <div className={`w-20 h-20 ${mode === 'chaos' ? 'bg-[#00FF87]' : 'bg-[#E8FF00]'} rounded-full flex items-center justify-center`}>
                <Trophy className="w-10 h-10 text-black" />
              </div>
            </div>
            <p className="text-2xl font-black text-white text-center">Sarah J.</p>
            <p className={`text-sm text-center font-medium ${mode === 'chaos' ? 'text-white/80' : 'text-white/90'}`}>42 Snaps Received</p>
          </Card>

            {/* Wins Wall */}
            <Card className={`${mode === 'chaos' ? `${getChaosCardStyle('recognition').bg} ${getChaosCardStyle('recognition').border} p-6 rounded-[2.5rem]` : 'bg-white border-0 p-6 rounded-3xl'}`}
                  style={mode === 'chaos' ? { boxShadow: `0 0 40px ${getChaosCardStyle('recognition').glow}` } : {}}
            >
            <div className={`flex items-center gap-2 text-sm mb-2 ${mode === 'chaos' ? 'text-[#00FF87]' : 'text-black'}`}>
              <Trophy className="w-4 h-4" />
              <span className="uppercase tracking-wider font-black text-xs">Celebrate</span>
            </div>
            <h2 className={`text-4xl font-black mb-4 uppercase ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>WINS<br/>WALL</h2>
            <div className="space-y-2 mb-4">
              <div className={`flex items-center justify-between p-3 rounded-xl ${mode === 'chaos' ? 'bg-black/40 border-2 border-[#00FF87]/40' : 'bg-orange-50 border border-orange-200'}`}>
                <div>
                  <p className={`text-sm font-black ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>Alex Chen</p>
                  <p className={`text-xs font-medium ${mode === 'chaos' ? 'text-white/70' : 'text-zinc-700'}`}>Closed $50k deal!</p>
                </div>
                <span className="text-2xl">🎉</span>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-xl ${mode === 'chaos' ? 'bg-black/40 border-2 border-[#00FF87]/40' : 'bg-orange-50 border border-orange-200'}`}>
                <div>
                  <p className={`text-sm font-black ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>Jamie Park</p>
                  <p className={`text-xs font-medium ${mode === 'chaos' ? 'text-white/70' : 'text-zinc-700'}`}>Shipped v2.0!</p>
                </div>
                <span className="text-2xl">🚀</span>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-xl ${mode === 'chaos' ? 'bg-black/40 border-2 border-[#00FF87]/40' : 'bg-orange-50 border border-orange-200'}`}>
                <div>
                  <p className={`text-sm font-black ${mode === 'chaos' ? 'text-white' : 'text-black'}`}>Alex Chen</p>
                  <p className={`text-xs font-medium ${mode === 'chaos' ? 'text-white/70' : 'text-zinc-700'}`}>Closed $50k deal!</p>
                </div>
                <span className="text-2xl">⭐</span>
              </div>
            </div>
            <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#00FF87] hover:bg-[#0F0F0F]' : 'bg-orange-500 hover:bg-orange-600 text-white'} font-black rounded-full h-12 uppercase`}>
              Share Win
            </Button>
          </Card>
          </div>
        </div>

        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
          <span className="w-8 h-px bg-zinc-800"></span>
          More Modules
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Must Reads */}
          <Card className="bg-gradient-to-br from-pink-300 to-pink-400 border-0 p-6 rounded-3xl">
            <div className="flex items-center gap-2 text-sm mb-3 text-black">
              <FileText className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Weekly</span>
            </div>
            <h2 className="text-3xl font-black text-black mb-6">MUST<br/>READS</h2>
            <div className="space-y-3">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                <p className="text-sm font-black text-black mb-1">Design Systems 2024</p>
                <p className="text-xs text-pink-900 font-medium">By Emma Chen</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                <p className="text-sm font-black text-black mb-1">Better UX</p>
                <p className="text-xs text-pink-900 font-medium">By John Smith</p>
              </div>
            </div>
          </Card>

          {/* Ask The Hive */}
          <Card className="bg-gradient-to-br from-purple-300 to-purple-400 border-0 p-6 rounded-3xl">
            <div className="flex items-center gap-2 text-sm mb-3 text-black">
              <MessageCircle className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Community</span>
            </div>
            <h2 className="text-3xl font-black text-black mb-6">ASK THE<br/>HIVE</h2>
            <div className="space-y-3 mb-4">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                <p className="text-sm font-bold text-black mb-1">Best prototyping tool?</p>
                <p className="text-xs text-purple-900 font-medium">5 answers</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                <p className="text-sm font-bold text-black mb-1">Handle difficult client?</p>
                <p className="text-xs text-purple-900 font-medium">12 answers</p>
              </div>
            </div>
            <Button className="w-full bg-black hover:bg-zinc-900 text-white font-bold rounded-xl h-10 text-sm">
              Ask Question
            </Button>
          </Card>

          {/* Team Pulse */}
          <Card className="bg-white border-0 p-6 rounded-3xl">
            <Badge className="bg-emerald-500 text-white border-0 font-bold mb-4 text-xs">+85%</Badge>
            <h2 className="text-3xl font-black text-black mb-6">Team Pulse</h2>
            <div className="space-y-4 mb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-black">Happiness</p>
                  <p className="text-2xl font-black text-black">85</p>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2">
                  <div className="bg-[#E8FF00] h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-black">Energy</p>
                  <p className="text-2xl font-black text-black">72</p>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '72%' }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-wide mb-1">Excitements</p>
                <ul className="text-xs text-emerald-900 space-y-1">
                  <li>• New project kick-off</li>
                  <li>• Team offsite soon</li>
                </ul>
              </div>
              <div className="bg-pink-50 rounded-xl p-3 border border-pink-200">
                <p className="text-xs text-pink-700 font-bold uppercase tracking-wide mb-1">Frustrations</p>
                <ul className="text-xs text-pink-900 space-y-1">
                  <li>• Too many meetings</li>
                  <li>• Unclear priorities</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Loom Standup */}
          <Card className="bg-gradient-to-br from-blue-500 to-purple-600 border-0 p-6 rounded-3xl">
            <div className="flex items-center gap-2 text-sm mb-3 text-white">
              <Video className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Daily</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-6">LOOM<br/>STANDUP</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#E8FF00] rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer">
                <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mb-2">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <p className="text-xs font-black text-black">Alex</p>
                <p className="text-xs text-zinc-700">3:22</p>
              </div>
              <div className="bg-[#E8FF00] rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer">
                <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mb-2">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <p className="text-xs font-black text-black">Sarah</p>
                <p className="text-xs text-zinc-700">2:15</p>
              </div>
              <div className="bg-[#E8FF00] rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer">
                <div className="w-16 h-16 bg-pink-500 rounded-xl flex items-center justify-center mb-2">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <p className="text-xs font-black text-black">Mike</p>
                <p className="text-xs text-zinc-700">4:01</p>
              </div>
              <div className="bg-black/80 rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer border border-white/20">
                <div className="w-16 h-16 bg-zinc-700 rounded-xl flex items-center justify-center mb-2">
                  <Users className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-xs font-black text-white">Chris</p>
                <p className="text-xs text-zinc-400">On Leave</p>
              </div>
            </div>
          </Card>

          {/* Inspiration War */}
          <Card className="bg-[#E8FF00] border-0 p-8 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 text-sm mb-2 text-black">
                  <Lightbulb className="w-4 h-4" />
                  <span className="uppercase tracking-wide font-bold text-xs">Today's Theme</span>
                </div>
                <h2 className="text-4xl font-black text-black">INSPIRATION<br/>WAR</h2>
              </div>
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#E8FF00]" />
              </div>
            </div>
            <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-4 border border-black/10 mb-6">
              <p className="text-black font-bold text-lg text-center">Retro Futurism</p>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[16, 15, 9, 9].map((votes, i) => (
                <div key={i} className="bg-yellow-300/50 backdrop-blur-sm rounded-2xl p-4 border border-black/10 flex flex-col items-center justify-center hover:bg-yellow-300/70 transition-all cursor-pointer group">
                  <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">🎨</div>
                  <p className="text-xs text-black font-bold">~{votes}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <p className="text-black font-bold">🎨 24 entries</p>
              <p className="text-black font-bold">8h to vote</p>
            </div>
          </Card>
        </div>

        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
          <span className="w-8 h-px bg-zinc-800"></span>
          Browse Categories
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Categories */}
          <Card className="bg-white border-0 p-6 rounded-3xl">
            <p className="text-xs uppercase tracking-wide text-zinc-600 mb-2 font-bold">Browse</p>
            <h2 className="text-4xl font-black text-black mb-6">CATEGORIES</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button className="bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl h-16">
                <MessageCircle className="w-5 h-5 mr-2" />
                Comms
              </Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl h-16">
                <Lightbulb className="w-5 h-5 mr-2" />
                Creative
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl h-16">
                <Star className="w-5 h-5 mr-2" />
                Learn
              </Button>
              <Button className="bg-orange-700 hover:bg-orange-800 text-white font-bold rounded-xl h-16">
                <Search className="w-5 h-5 mr-2" />
                Research
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl h-16">
                <Lightbulb className="w-5 h-5 mr-2" />
                Strategy
              </Button>
              <Button className="bg-black hover:bg-zinc-900 text-white font-bold rounded-xl h-16">
                <Zap className="w-5 h-5 mr-2" />
                Tools
              </Button>
            </div>
          </Card>

          {/* Search */}
          <Card className="bg-zinc-900 border border-zinc-700 p-6 rounded-3xl">
            <div className="flex items-center gap-2 text-sm mb-3 text-zinc-500">
              <Search className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Find Anything</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-6">SEARCH</h2>
            <div className="relative">
              <Input 
                placeholder="Resources, people, projects..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 rounded-xl h-14 pr-14 font-medium"
              />
              <Button className="absolute right-2 top-2 bg-[#E8FF00] hover:bg-[#d4e600] text-black rounded-lg h-10 w-10 p-0">
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        </div>

        <footer className="border-t border-zinc-800 pt-8 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div>
              <h3 className="text-xl font-black text-white mb-2">Team Dashboard</h3>
              <p className="text-sm text-zinc-500">Built with love and way too much coffee</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold mb-2">Totally Real Stats</p>
              <p className="text-sm text-zinc-400">347 cups of coffee consumed</p>
              <p className="text-sm text-zinc-400">48 good vibes generated</p>
              <p className="text-sm text-zinc-400">100% team awesomeness</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold mb-2">Fun Fact</p>
              <p className="text-sm text-zinc-400">We put the 'fun' in 'functional' and also in 'funnel', but we don't talk about that</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold mb-2">Good Morning</p>
              <p className="text-sm text-zinc-400">Time to make today awesome! After coffee, obviously</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-600 pt-6 border-t border-zinc-800">
            <p>© 2025 Team Dashboard. Made with questionable decisions and great intentions.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-zinc-400 transition-colors">Privacy lol we're a team!</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Terms just be cool</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Contact we're right here</a>
            </div>
          </div>
          <p className="text-center text-[10px] text-zinc-700 mt-4">v1.2.3-beta-test.beta</p>
        </footer>
      </main>
    </div>
  )
}
