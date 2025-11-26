'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Music, MessageCircle, Play, Star, Archive, BarChart3, X } from 'lucide-react'
import Link from 'next/link'
import { PlaylistCard } from '@/components/playlist-card'
import { Footer } from '@/components/footer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
  const [selectedPoll, setSelectedPoll] = useState<any>(null)
  const [isPollDialogOpen, setIsPollDialogOpen] = useState(false)

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

  // Fetch data - optimized to run in parallel and only once
  useEffect(() => {
    if (!user || authLoading) return
    
    let mounted = true
    setLoading(true)
    
    // Set static data immediately (no API call needed)
    setQuestionOfWeek("What's one thing you learned this week?")
    setAnswers([
      { id: '1', answer: "How to use CSS Grid effectively!", author: 'Alex' },
      { id: '2', answer: "Better time management techniques", author: 'Sarah' }
    ])
    
    async function fetchData() {
      try {
        // Fetch all data in parallel for faster loading
        const [beastBabeResponse, playlistsResponse] = await Promise.all([
          fetch('/api/beast-babe'),
          fetch('/api/playlists') // Remove refresh=true to speed up
        ])
        
        if (!mounted) return
        
        // Process Beast Babe
        if (beastBabeResponse.ok) {
          const beastBabeData = await beastBabeResponse.json()
          if (beastBabeData?.currentBeastBabe && mounted) {
            setBeastBabe({
              id: beastBabeData.currentBeastBabe.id,
              full_name: beastBabeData.currentBeastBabe.full_name,
              email: beastBabeData.currentBeastBabe.email,
              avatar_url: beastBabeData.currentBeastBabe.avatar_url,
              snaps_count: 0
            })
          }
        }

        // Process Playlists
        let playlists = null
        if (playlistsResponse.ok) {
          playlists = await playlistsResponse.json()
        } else {
          // Fallback to direct Supabase query if API fails
          const { data } = await supabase
            .from('playlists')
            .select('*')
            .order('date', { ascending: false })
          playlists = data
        }

        if (!mounted) return

        if (playlists && Array.isArray(playlists) && playlists.length > 0) {
          // Set the most recent playlist as weekly playlist
          const mostRecent = playlists[0]
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

          // Set remaining playlists as archive
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
          setArchivePlaylists(archive)
        } else {
          setWeeklyPlaylist(null)
          setArchivePlaylists([])
        }
      } catch (err: any) {
        console.error('[Vibes] Error fetching data:', err)
        if (mounted) {
          setWeeklyPlaylist(null)
          setArchivePlaylists([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    fetchData()
    
    return () => {
      mounted = false
    }
  }, [user]) // Removed supabase from dependencies - it's stable

  // Don't show loading screen - render page immediately with loading states
  if (!user && !authLoading) {
    return null
  }

  return (
    <div className={`flex flex-col min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <SiteHeader />

      <div className="flex flex-1 pt-24 w-full">
        {/* Sidebar with curved edges */}
        <aside className="sticky top-24 h-fit self-start ml-6 mr-8 hidden lg:block flex-shrink-0" style={{ width: '240px' }}>
          <nav 
            className={`${getRoundedClass('rounded-[2.5rem]')} p-6`}
            style={{
              backgroundColor: mode === 'chaos' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : mode === 'chill'
                ? 'rgba(74, 24, 24, 0.05)'
                : 'rgba(255, 255, 255, 0.05)',
              border: mode === 'chaos' 
                ? '1px solid rgba(255, 255, 255, 0.1)' 
                : mode === 'chill'
                ? '1px solid rgba(74, 24, 24, 0.1)'
                : '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Archive className="w-5 h-5" style={{ 
                color: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF' 
              }} />
              <h3 className={`text-sm uppercase tracking-wider font-black ${getTextClass()}`}>
                Archive
              </h3>
            </div>
            <div className="space-y-3">
              <Link
                href="/vibes/playlist-archive"
                className={`flex items-center gap-3 ${getRoundedClass('rounded-xl')} px-4 py-3 transition-all hover:opacity-70`}
                style={{
                  backgroundColor: mode === 'chaos' 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : mode === 'chill'
                    ? 'rgba(74, 24, 24, 0.05)'
                    : 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <Music className="w-4 h-4" />
                <span className="text-sm font-semibold">Playlist Archive</span>
              </Link>
              <Link
                href="/vibes/polls-archive"
                className={`flex items-center gap-3 ${getRoundedClass('rounded-xl')} px-4 py-3 transition-all hover:opacity-70`}
                style={{
                  backgroundColor: mode === 'chaos' 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : mode === 'chill'
                    ? 'rgba(74, 24, 24, 0.05)'
                    : 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Polls Archive</span>
              </Link>
            </div>
          </nav>
        </aside>

        <main className="flex-1 px-6 py-10 min-w-0" style={{ maxWidth: 'calc(100vw - 300px)' }}>
          <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <h1 className={`text-4xl font-black uppercase mb-8 ${getTextClass()}`}>VIBES</h1>
        
        {loading && (
          <div className="text-center py-8">
            <p className={`${getTextClass()} opacity-60`}>Loading...</p>
          </div>
        )}

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
            // Match dashboard styling: use playlist style for chaos, vibes style for others
            const playlistStyle = mode === 'chaos' 
              ? { text: 'text-white', accent: '#9333EA' } // Black bg with Purple accent (from dashboard)
              : mode === 'chill'
              ? { text: getTextClass(), accent: '#FFB5D8' }
              : { text: getTextClass(), accent: '#FFFFFF' }
            return (
              <Card className={`bg-transparent border-0 p-6 ${getRoundedClass('rounded-[2.5rem]')} h-full flex flex-col`}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: playlistStyle.accent }}>
                  <Music className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Weekly</span>
                </div>
                <h2 className={`text-3xl font-black mb-4 uppercase ${playlistStyle.text}`}>PLAYLIST</h2>
                {weeklyPlaylist ? (
                  <div className="flex-1">
                    <PlaylistCard
                      id={weeklyPlaylist.id}
                      title={weeklyPlaylist.title}
                      curator={weeklyPlaylist.curator}
                      description={weeklyPlaylist.description}
                      spotify_url={weeklyPlaylist.spotify_url}
                      cover_url={weeklyPlaylist.cover_url}
                      curator_photo_url={weeklyPlaylist.curator_photo_url}
                      date={weeklyPlaylist.date}
                      week_label={weeklyPlaylist.week_label}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className={`text-sm ${playlistStyle.text}/60`}>No playlist this week</p>
                  </div>
                )}
              </Card>
            )
          })()}
        </div>

        {/* Polls Section */}
        <div className="mb-12">
          <h2 className={`text-4xl font-black mb-6 ${getTextClass()}`}>Polls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Thanksgiving Poll Card */}
            <Card 
              className={`${getRoundedClass('rounded-[2.5rem]')} p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl`}
              style={{
                backgroundColor: mode === 'chaos' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : mode === 'chill'
                  ? 'rgba(74, 24, 24, 0.05)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: mode === 'chaos' 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : mode === 'chill'
                  ? '1px solid rgba(74, 24, 24, 0.1)'
                  : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => {
                setSelectedPoll({
                  id: 'thanksgiving-grub',
                  title: 'Thanksgiving Grub',
                  question: 'What are your top Thanksgiving dishes?',
                  date: 'November 2024',
                  totalResponses: 14,
                  data: [
                    { name: 'Stuffing', count: 7 },
                    { name: 'Mashed potatoes', count: 3 },
                    { name: 'Peking duck', count: 2 },
                    { name: 'Pumpkin pie', count: 2 },
                    { name: 'Gravy', count: 2 },
                  ]
                })
                setIsPollDialogOpen(true)
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6" style={{ color: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF' }} />
                <h3 className={`text-xl font-black uppercase ${getTextClass()}`}>Thanksgiving Grub</h3>
              </div>
              <p className={`text-sm mb-4 ${getTextClass()} opacity-70`}>
                What are your top Thanksgiving dishes?
              </p>
              <div className={`flex items-center justify-between text-xs opacity-60 ${getTextClass()}`}>
                <span>14 responses</span>
                <span>Nov 2024</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Archive Section */}
        <div className="mb-8">
          <h2 className={`text-4xl font-black mb-6 ${getTextClass()}`}>Archive</h2>
          {archivePlaylists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {archivePlaylists.map((playlist) => (
                <div key={playlist.id} className="p-6">
                  <PlaylistCard
                    id={playlist.id}
                    title={playlist.title}
                    curator={playlist.curator}
                    description={playlist.description}
                    spotify_url={playlist.spotify_url}
                    cover_url={playlist.cover_url}
                    curator_photo_url={playlist.curator_photo_url}
                    date={playlist.date}
                    week_label={playlist.week_label}
                    className="archive"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-lg ${getTextClass()} opacity-60`}>No archived playlists yet</p>
          )}
        </div>

        {/* Poll Dialog */}
        <Dialog open={isPollDialogOpen} onOpenChange={setIsPollDialogOpen}>
          <DialogContent 
            className={`${getRoundedClass('rounded-3xl')} max-w-4xl max-h-[90vh] overflow-y-auto`}
            style={{
              backgroundColor: mode === 'chaos' 
                ? '#1A1A1A' 
                : mode === 'chill'
                ? '#F5E6D3'
                : '#000000',
              border: mode === 'chaos' 
                ? '2px solid rgba(196, 245, 0, 0.3)' 
                : mode === 'chill'
                ? '2px solid rgba(255, 192, 67, 0.3)'
                : '2px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            {selectedPoll && (
              <>
                <DialogHeader className="mb-6">
                  <DialogTitle className={`text-3xl font-black uppercase mb-2 ${getTextClass()}`}>
                    {selectedPoll.title}
                  </DialogTitle>
                  <p className={`text-sm ${getTextClass()} opacity-60`}>
                    {selectedPoll.date} • {selectedPoll.totalResponses} responses
                  </p>
                </DialogHeader>
                
                <div className="mb-6">
                  <h3 className={`text-xl font-black mb-4 ${getTextClass()}`}>
                    {selectedPoll.question}
                  </h3>
                  
                  {/* Bar Chart */}
                  <div className="my-8">
                    <div className="space-y-4">
                      {selectedPoll.data
                        .sort((a: any, b: any) => b.count - a.count)
                        .map((item: any, index: number) => {
                          const maxCount = Math.max(...selectedPoll.data.map((d: any) => d.count))
                          const percentage = (item.count / maxCount) * 100
                          const isTop = index === 0
                          
                          return (
                            <div key={item.name} className="relative">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-semibold ${getTextClass()}`}>
                                  {item.name}
                                </span>
                                <span 
                                  className={`text-lg font-black ${getTextClass()}`}
                                  style={{ color: isTop ? (mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF') : undefined }}
                                >
                                  {item.count}
                                </span>
                              </div>
                              <div 
                                className={`${getRoundedClass('rounded-full')} h-8 overflow-hidden relative`}
                                style={{
                                  backgroundColor: mode === 'chaos' 
                                    ? 'rgba(255, 255, 255, 0.1)' 
                                    : mode === 'chill'
                                    ? 'rgba(74, 24, 24, 0.1)'
                                    : 'rgba(255, 255, 255, 0.1)'
                                }}
                              >
                                <div
                                  className="h-full transition-all duration-1000 flex items-center px-4"
                                  style={{
                                    width: `${percentage}%`,
                                    backgroundColor: isTop 
                                      ? (mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF')
                                      : (mode === 'chaos' ? 'rgba(196, 245, 0, 0.4)' : mode === 'chill' ? 'rgba(255, 192, 67, 0.4)' : 'rgba(255, 255, 255, 0.4)')
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
        
        <Footer />
          </div>
        </main>
      </div>
    </div>
  )
}
