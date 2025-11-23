'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { AccountMenu } from '@/components/account-menu'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Music, MessageCircle, Play, Star } from 'lucide-react'
import Link from 'next/link'
import { PlaylistCard } from '@/components/playlist-card'
import { Footer } from '@/components/footer'

interface BeastBabe {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  snaps_count: number
}

interface QuestionAnswer {
  id: string
  answer: string
  author: string
}

interface Playlist {
  id: string
  date: string
  title: string | null
  curator: string
  curator_photo_url?: string | null
  cover_url?: string | null
  description?: string | null
  spotify_url: string
  created_at: string
  week_label?: string | null
}

export default function VibesPage() {
  const { user, loading: authLoading } = useAuth()
  const { mode } = useMode()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [beastBabe, setBeastBabe] = useState<BeastBabe | null>(null)
  const [questionOfWeek, setQuestionOfWeek] = useState<string>('')
  const [answers, setAnswers] = useState<QuestionAnswer[]>([])
  const [weeklyPlaylist, setWeeklyPlaylist] = useState<Playlist | null>(null)
  const [archivePlaylists, setArchivePlaylists] = useState<Playlist[]>([])

  // Dashboard styling helpers
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
      case 'code': return 'text-[#FFFFFF]'
      default: return 'text-white'
    }
  }

  const getBorderClass = () => {
    switch (mode) {
      case 'chaos': return 'border-[#333333]'
      case 'chill': return 'border-[#4A1818]/20'
      case 'code': return 'border-[#FFFFFF]'
      default: return 'border-[#333333]'
    }
  }

  const getNavLinkClass = (isActive = false) => {
    const base = `transition-colors text-sm font-black uppercase ${mode === 'code' ? 'font-mono' : ''}`
    if (isActive) {
      switch (mode) {
        case 'chaos': return `${base} text-white hover:text-[#C4F500]`
        case 'chill': return `${base} text-[#4A1818] hover:text-[#FFC043]`
        case 'code': return `${base} text-[#FFFFFF] hover:text-[#FFFFFF]`
        default: return `${base} text-white hover:text-[#C4F500]`
      }
    } else {
      switch (mode) {
        case 'chaos': return `${base} text-[#666666] hover:text-white`
        case 'chill': return `${base} text-[#8B4444] hover:text-[#4A1818]`
        case 'code': return `${base} text-[#808080] hover:text-[#FFFFFF]`
        default: return `${base} text-[#666666] hover:text-white`
      }
    }
  }

  const getLogoBg = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#C4F500]'
      case 'chill': return 'bg-[#FFC043]'
      case 'code': return 'bg-[#FFFFFF]'
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

  const getRoundedClass = (defaultClass: string) => {
    return mode === 'code' ? 'rounded-none' : defaultClass
  }

  // Get card styles using RED, ORANGE, and YELLOW SYSTEMS
  // Beast Babe: RED SYSTEM (Coral Red #FF4C4C, Crimson #C41E3A, Peach #FFD4C4, Ocean Blue #00A3E0)
  const getBeastBabeCardStyle = () => {
    if (mode === 'chaos') {
      return { bg: 'bg-[#FF4C4C]', text: 'text-black', accent: '#C41E3A' } // Coral Red bg with Crimson accent (RED SYSTEM)
    } else if (mode === 'chill') {
      return { bg: 'bg-white', text: 'text-[#4A1818]', accent: '#FFB5D8', border: 'border border-[#FFB5D8]/30' }
    } else {
      return { bg: 'bg-[#000000]', text: 'text-[#FFFFFF]', accent: '#FFFFFF', border: 'border border-[#FFFFFF]' }
    }
  }

  // Question of the Week: ORANGE SYSTEM (Orange #FF8C42, Brown #7A5C3D, Tan #D4C4A8, Purple #9B59B6)
  const getQuestionCardStyle = () => {
    if (mode === 'chaos') {
      return { bg: 'bg-[#FF8C42]', text: 'text-black', accent: '#7A5C3D' } // Orange bg with Brown accent (ORANGE SYSTEM)
    } else if (mode === 'chill') {
      return { bg: 'bg-white', text: 'text-[#4A1818]', accent: '#FFB5D8', border: 'border border-[#FFB5D8]/30' }
    } else {
      return { bg: 'bg-[#000000]', text: 'text-[#FFFFFF]', accent: '#FFFFFF', border: 'border border-[#FFFFFF]' }
    }
  }

  // Weekly Playlist: YELLOW SYSTEM (Yellow #FFD700, Gold #D4A60A, Light Yellow #FFF59D, Deep Purple #6B2E8C)
  const getPlaylistCardStyle = () => {
    if (mode === 'chaos') {
      return { bg: 'bg-[#FFD700]', text: 'text-black', accent: '#6B2E8C', border: 'border-0' } // Yellow bg with Deep Purple accent (YELLOW SYSTEM)
    } else if (mode === 'chill') {
      return { bg: 'bg-white', text: 'text-[#4A1818]', accent: '#FFB5D8', border: 'border border-[#FFB5D8]/30' }
    } else {
      return { bg: 'bg-[#000000]', text: 'text-[#FFFFFF]', accent: '#FFFFFF', border: 'border border-[#FFFFFF]' }
    }
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!user) return
      
      setLoading(true)
      
      try {
        // Fetch Beast Babe from API
        const beastBabeResponse = await fetch('/api/beast-babe')
        if (beastBabeResponse.ok) {
          const beastBabeData = await beastBabeResponse.json()
          if (beastBabeData?.currentBeastBabe) {
        setBeastBabe({
              id: beastBabeData.currentBeastBabe.id,
              full_name: beastBabeData.currentBeastBabe.full_name,
              email: beastBabeData.currentBeastBabe.email,
              avatar_url: beastBabeData.currentBeastBabe.avatar_url,
              snaps_count: 0 // This would need to come from the API if available
            })
          }
        }

        // Fetch Question of the Week (placeholder - you'll need to create a questions table)
        setQuestionOfWeek("What's one thing you learned this week?")
        setAnswers([
          { id: '1', answer: "How to use CSS Grid effectively!", author: 'Alex' },
          { id: '2', answer: "Better time management techniques", author: 'Sarah' }
        ])

        // Fetch playlists from database
        // First try with refresh to get Spotify metadata if missing
        console.log('[Vibes] Fetching playlists from API...')
        const playlistsResponse = await fetch('/api/playlists?refresh=true')
        console.log('[Vibes] Playlist API response status:', playlistsResponse.status, playlistsResponse.statusText)
        
        let playlists = null
        if (playlistsResponse.ok) {
          playlists = await playlistsResponse.json()
          console.log('[Vibes] Received playlists from API:', playlists)
          console.log('[Vibes] Playlists type:', typeof playlists)
          console.log('[Vibes] Is array:', Array.isArray(playlists))
          console.log('[Vibes] Playlists length:', playlists?.length ?? 'null/undefined')
        } else {
          console.warn('[Vibes] API request failed, falling back to direct Supabase query')
          const errorData = await playlistsResponse.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[Vibes] API error response:', playlistsResponse.status, errorData)
          
          // Fallback to direct Supabase query if API fails
          const { data, error: playlistsError } = await supabase
            .from('playlists')
            .select('*')
            .order('date', { ascending: false })
          
          if (playlistsError) {
            console.error('[Vibes] Error fetching playlists from Supabase:', playlistsError)
            console.error('[Vibes] Supabase error details:', JSON.stringify(playlistsError, null, 2))
          } else {
            console.log('[Vibes] Received playlists from Supabase:', data)
            playlists = data
          }
        }

        if (playlists && Array.isArray(playlists) && playlists.length > 0) {
          console.log(`[Vibes] Found ${playlists.length} playlist(s), setting weekly and archive playlists`)
          // Set the most recent playlist as weekly playlist
          const mostRecent = playlists[0]
          console.log('[Vibes] Setting weekly playlist:', mostRecent)
          setWeeklyPlaylist({
            id: mostRecent.id,
            date: mostRecent.date,
            title: mostRecent.title,
            curator: mostRecent.curator,
            curator_photo_url: mostRecent.curator_photo_url,
            cover_url: mostRecent.cover_url,
            description: mostRecent.description,
            spotify_url: mostRecent.spotify_url,
            created_at: mostRecent.created_at,
            week_label: mostRecent.week_label || 'This Week'
          })

          // Set remaining playlists as archive (skip the first one)
          const archive = playlists.slice(1).map((p, index) => ({
            id: p.id,
            date: p.date,
            title: p.title,
            curator: p.curator,
            curator_photo_url: p.curator_photo_url,
            cover_url: p.cover_url,
            description: p.description,
            spotify_url: p.spotify_url,
            created_at: p.created_at,
            week_label: p.week_label || (index === 0 ? 'Last Week' : index === 1 ? '2 Weeks Ago' : index === 2 ? '3 Weeks Ago' : null)
          }))
          console.log(`[Vibes] Setting ${archive.length} archive playlist(s)`)
          setArchivePlaylists(archive)
        } else {
          console.log('[Vibes] No playlists found or empty array')
          setWeeklyPlaylist(null)
          setArchivePlaylists([])
        }
      } catch (err: any) {
        console.error('[Vibes] Error fetching data:', err)
        if (err instanceof Error) {
          console.error('[Vibes] Error message:', err.message)
          console.error('[Vibes] Error stack:', err.stack)
        }
        setWeeklyPlaylist(null)
        setArchivePlaylists([])
      } finally {
        setLoading(false)
      }
    }
    
    if (user) {
      fetchData()
    }
  }, [user, supabase])

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getBgClass()}`}>
        <div className="text-center">
          <p className={getTextClass()}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={`flex flex-col ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <header className={`border-b ${getBorderClass()} px-6 py-4 fixed top-0 left-0 right-0 z-50 ${getBgClass()}`}>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <div className={`w-10 h-10 ${getLogoBg()} ${getLogoText()} ${getRoundedClass('rounded-xl')} flex items-center justify-center font-black text-lg ${mode === 'code' ? 'font-mono' : ''} cursor-pointer`}>
                {mode === 'code' ? 'C:\\>' : 'D'}
              </div>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className={getNavLinkClass()}>HOME</Link>
              <Link href="/snaps" className={getNavLinkClass()}>SNAPS</Link>
              <Link href="/resources" className={getNavLinkClass()}>RESOURCES</Link>
              <Link href="/work-samples" className={getNavLinkClass()}>WORK</Link>
              <a href="#" className={getNavLinkClass()}>TEAM</a>
              <Link href="/vibes" className={getNavLinkClass(true)}>VIBES</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <AccountMenu />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-20">
        {/* Header */}
        <h1 className={`text-5xl font-black mb-8 ${getTextClass()}`}>Vibes</h1>

        {/* Top Row - Three Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Beast Babe Card */}
          {(() => {
            const style = getBeastBabeCardStyle()
            // RED SYSTEM colors for chaos mode: Coral Red #FF4C4C, Crimson #C41E3A, Peach #FFD4C4, Ocean Blue #00A3E0
            const redColors = mode === 'chaos' ? {
              primary: '#FF4C4C',
              accent: '#C41E3A',
              secondary: '#FFD4C4',
              tertiary: '#00A3E0'
            } : {
              primary: '#4A1818',
              accent: '#FFB5D8',
              secondary: '#F5E6D3',
              tertiary: '#FFFFFF'
            }
            return (
              <Card className={`${style.bg} ${mode === 'chill' || mode === 'code' ? style.border || '' : 'border-0'} ${getRoundedClass('rounded-[2.5rem]')} p-6 relative overflow-hidden glitch-container min-h-[400px]`}>
                {/* Decorative background elements - RED SYSTEM */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br opacity-20 animate-pulse glitch-shift" style={{
                    background: mode === 'chaos' 
                      ? `linear-gradient(135deg, ${redColors.primary}20, ${redColors.accent}30, ${redColors.tertiary}20)`
                      : `linear-gradient(135deg, ${redColors.primary}15, ${redColors.accent}25, ${redColors.secondary}15)`
                  }}></div>
                  
                  {/* Wavy lines */}
                  <div className="absolute top-0 left-0 w-40 h-40 opacity-40 animate-bounce-slow glitch-shift">
                    <svg className="w-full h-full animate-pulse" viewBox="0 0 100 100" fill="none" style={{ color: redColors.accent }}>
                      <path d="M0,50 Q25,30 50,50 T100,50" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                  <div className="absolute bottom-0 right-0 w-48 h-48 opacity-30 animate-bounce-slow glitch-shift" style={{ animationDelay: '1s' }}>
                    <svg className="w-full h-full animate-pulse" viewBox="0 0 100 100" fill="none" style={{ color: redColors.primary, animationDelay: '0.5s' }}>
                      <path d="M0,50 Q25,70 50,50 T100,50" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                  
                  {/* Triangles */}
                  <div className="absolute left-4 top-1/2 w-20 h-20 opacity-30 animate-spin-slow glitch-shift">
                    <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[35px]" style={{ borderBottomColor: redColors.accent }}></div>
                  </div>
                  <div className="absolute left-8 top-1/3 w-16 h-16 opacity-40 animate-spin-slow glitch-shift" style={{ animationDelay: '1.5s', animationDirection: 'reverse' }}>
                    <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[28px]" style={{ borderBottomColor: redColors.primary }}></div>
                  </div>
                  
                  {/* Circles */}
                  <div className="absolute top-4 right-8 w-16 h-16 opacity-40 animate-ping glitch-shift">
                    <div className="w-full h-full rounded-full" style={{ backgroundColor: redColors.accent }}></div>
                  </div>
                  <div className="absolute right-4 top-1/2 w-20 h-20 opacity-30 animate-pulse glitch-shift" style={{ animationDelay: '1s' }}>
                    <div className="w-full h-full rounded-full border-2 border-dashed" style={{ borderColor: redColors.primary }}></div>
                  </div>
                  
                  {/* Stars */}
                  <div className="absolute top-8 right-12 opacity-50 animate-pulse glitch-shift" style={{ animationDelay: '0.3s' }}>
                    <Star className="w-8 h-8" style={{ color: redColors.accent, fill: redColors.accent }} />
                  </div>
                  <div className="absolute bottom-12 right-8 opacity-40 animate-pulse glitch-shift" style={{ animationDelay: '0.7s' }}>
                    <Star className="w-6 h-6" style={{ color: redColors.primary, fill: redColors.primary }} />
                  </div>
                  
                  {/* Glitch lines */}
                  <div className="absolute inset-0 glitch-lines"></div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 glitch-text">
                      <Trophy className="w-7 h-7 animate-bounce glitch-shift" style={{ color: redColors.accent, animationDuration: '1.5s' }} />
                      <h2 className={`text-5xl font-black uppercase tracking-tight glitch-text ${style.text}`}>BEAST BABE</h2>
                    </div>
                  </div>

                  {/* Profile Section */}
                  <div className="flex flex-col items-center mb-6">
                    {/* Profile Picture with Gradient Ring */}
                    <div className="relative mb-4 flex items-center justify-center">
                      {/* Multiple glowing effects behind profile - RED SYSTEM */}
                      <div className="absolute w-64 h-64 rounded-full blur-2xl animate-pulse glitch-shift" style={{ backgroundColor: `${redColors.accent}40`, animationDelay: '0.3s' }}></div>
                      <div className="absolute w-56 h-56 rounded-full blur-xl animate-pulse glitch-shift" style={{ backgroundColor: `${redColors.primary}30`, animationDelay: '0.6s' }}></div>
                      <div className="absolute w-52 h-52 rounded-full blur-lg animate-pulse glitch-shift" style={{ backgroundColor: `${redColors.tertiary}25`, animationDelay: '0.9s' }}></div>
                      
                      {/* Gradient Ring Container - RED SYSTEM */}
                      <div className="relative w-56 h-56">
                        {/* Animated Gradient Ring - Fast spin with RED SYSTEM colors */}
                        <div 
                          className="absolute inset-0 rounded-full animate-spin-fast glitch-shift"
                          style={{
                            background: mode === 'chaos'
                              ? `conic-gradient(from 0deg, ${redColors.accent} 0%, ${redColors.primary} 20%, ${redColors.tertiary} 40%, ${redColors.secondary} 60%, ${redColors.accent} 80%, ${redColors.primary} 100%)`
                              : `conic-gradient(from 0deg, ${redColors.accent} 0%, ${redColors.primary} 20%, ${redColors.secondary} 40%, ${redColors.accent} 60%, ${redColors.primary} 80%, ${redColors.accent} 100%)`,
                          }}
                        >
                          <div className="absolute inset-[3px] rounded-full" style={{
                            background: mode === 'chaos'
                              ? `linear-gradient(to bottom right, ${redColors.primary}, ${redColors.accent}, ${redColors.primary})`
                              : `linear-gradient(to bottom right, ${redColors.primary}, ${redColors.accent})`
                          }}></div>
                        </div>
                        
                        {/* Profile Picture - No glitch effects */}
                        <div className="absolute inset-[3px] rounded-full overflow-hidden z-10">
                          {beastBabe?.avatar_url ? (
                            <>
                              <img
                                src={beastBabe.avatar_url}
                                alt={beastBabe.full_name || 'Beast Babe'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    const fallback = parent.querySelector('.vibes-beast-babe-avatar-fallback') as HTMLElement
                                    if (fallback) fallback.style.display = 'flex'
                                  }
                                }}
                              />
                              <div className="vibes-beast-babe-avatar-fallback w-full h-full flex items-center justify-center hidden" style={{ backgroundColor: redColors.primary }}>
                                <Trophy className="w-24 h-24" style={{ color: redColors.accent }} />
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: redColors.primary }}>
                              <Trophy className="w-24 h-24" style={{ color: redColors.accent }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className={`text-3xl font-black mb-1 text-center glitch-text ${style.text}`}>
                      {beastBabe?.full_name || beastBabe?.email || 'No Beast Babe Yet'}
                    </h3>
                    
                    {/* Snaps count */}
                    {beastBabe && (
                      <p className={`text-sm ${style.text}`} style={{ opacity: 0.8 }}>
                        {beastBabe.snaps_count || 0} Snaps Received
                      </p>
                    )}
                  </div>
                </div>

                {/* Glowing border effect - RED SYSTEM */}
                <div className="absolute inset-0 rounded-[2.5rem] border-2 pointer-events-none animate-pulse glitch-border" style={{ borderColor: `${redColors.accent}30` }}></div>
                <div className="absolute inset-0 rounded-[2.5rem] border pointer-events-none animate-pulse glitch-shift" style={{ borderColor: `${redColors.primary}20`, animationDelay: '0.5s' }}></div>
              </Card>
            )
          })()}

          {/* Question of the Week Card */}
          {(() => {
            const style = getQuestionCardStyle()
            return (
              <Card className={`${style.bg} ${mode === 'chill' || mode === 'code' ? style.border || '' : 'border-0'} ${getRoundedClass('rounded-[2.5rem]')} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="w-4 h-4" style={{ color: style.accent }} />
                  <p className={`text-xs uppercase tracking-wider font-black`} style={{ color: style.accent }}>QUESTION OF THE WEEK</p>
                </div>
                <h2 className={`text-2xl font-black mb-6 leading-tight ${style.text}`}>
                  {questionOfWeek}
                </h2>
                <div className="space-y-3 mb-6">
                  {answers.map((answer) => (
                    <div
                      key={answer.id}
                      className={`${getRoundedClass('rounded-xl')} p-3`}
                      style={{ 
                        backgroundColor: mode === 'chaos' ? 'rgba(252, 211, 77, 0.2)' : mode === 'chill' ? 'rgba(255, 181, 216, 0.1)' : 'rgba(255, 255, 255, 0.1)', // Tan from ORANGE SYSTEM
                        borderColor: style.accent,
                        borderWidth: '1px'
                      }}
                    >
                      <p className={`text-sm font-medium ${style.text}`}>"{answer.answer}"</p>
                      <p className={`text-xs mt-1 ${style.text}`} style={{ opacity: 0.7 }}>- {answer.author}</p>
                    </div>
                  ))}
                </div>
                <Button
                  className={`w-full ${getRoundedClass('rounded-xl')} font-black h-12 uppercase`}
                  style={{ 
                    backgroundColor: mode === 'chaos' ? '#9333EA' : style.accent, // Purple from ORANGE SYSTEM (contrast color)
                    color: mode === 'chill' ? '#4A1818' : mode === 'code' ? '#000000' : '#FFFFFF'
                  }}
                >
                  Share Your Answer
                </Button>
              </Card>
            )
          })()}

          {/* Weekly Playlist Card */}
          {(() => {
            const style = getPlaylistCardStyle()
            return (
              <Card className={`${style.bg} ${mode === 'chill' || mode === 'code' ? style.border || '' : style.border || 'border-0'} ${getRoundedClass('rounded-[2.5rem]')} p-6`}
                    style={mode === 'chaos' && style.border?.includes('border-2') ? { borderColor: style.accent } : {}}
              >
                <p className={`text-xs uppercase tracking-wider font-black mb-2 ${style.text}`} style={{ opacity: 0.8 }}>WEEKLY</p>
                <h2 className={`text-4xl font-black mb-6 uppercase`} style={{ color: style.accent }}>PLAYLIST</h2>
                <div className="flex items-center justify-center mb-4">
                  <div className={`w-16 h-16 ${getRoundedClass('rounded-xl')} flex items-center justify-center`} style={{ 
                    backgroundColor: mode === 'chaos' ? '#D97706' : style.accent // Gold from YELLOW SYSTEM
                  }}>
                    <Music className="w-8 h-8" style={{ 
                      color: mode === 'chill' ? '#4A1818' : mode === 'code' ? '#000000' : '#000000'
                    }} />
                  </div>
                </div>
                {weeklyPlaylist ? (
                  <>
                    <p className={`text-lg font-black text-center mb-1 ${style.text}`}>{weeklyPlaylist.title || 'Untitled Playlist'}</p>
                    <p className={`text-sm font-medium text-center mb-6 ${style.text}`} style={{ opacity: 0.8 }}>Curated by {weeklyPlaylist.curator}</p>
                    <Button
                      className={`w-full ${getRoundedClass('rounded-xl')} font-black h-12 uppercase flex items-center justify-center gap-2`}
                      style={{ 
                        backgroundColor: mode === 'chaos' ? '#FEF08A' : style.accent, // Light Yellow from YELLOW SYSTEM (complementary color)
                        color: mode === 'chill' ? '#4A1818' : mode === 'code' ? '#000000' : '#000000'
                      }}
                      onClick={() => weeklyPlaylist.spotify_url && window.open(weeklyPlaylist.spotify_url, '_blank')}
                    >
                      <Play className="w-4 h-4" />
                      Play on Spotify
                    </Button>
                  </>
                ) : (
                  <p className={`text-sm font-medium text-center ${style.text}`} style={{ opacity: 0.8 }}>No playlist this week</p>
                )}
              </Card>
            )
          })()}
        </div>

        {/* Archive Section */}
        <div className="mb-8">
          <h2 className={`text-4xl font-black mb-6 ${getTextClass()}`}>Archive</h2>
          {archivePlaylists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {archivePlaylists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  id={playlist.id}
                  title={playlist.title}
                  curator={playlist.curator}
                  description={playlist.description}
                  spotify_url={playlist.spotify_url}
                  cover_url={playlist.cover_url}
                  curator_photo_url={playlist.curator_photo_url}
                  date={playlist.date}
                  week_label={playlist.week_label}
                />
              ))}
            </div>
          ) : (
            <p className={`text-lg ${getTextClass()} opacity-60`}>No archived playlists yet</p>
          )}
        </div>
        
        <Footer />
      </main>
    </div>
  )
}
