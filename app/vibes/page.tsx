'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Music, MessageCircle, Archive, BarChart3, Lock, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'
import { PlaylistCard } from '@/components/playlist-card'
import { Footer } from '@/components/footer'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
  const [weeklyPlaylist, setWeeklyPlaylist] = useState<Playlist | null>(null)
  const [archivePlaylists, setArchivePlaylists] = useState<Playlist[]>([])
  const [selectedPoll, setSelectedPoll] = useState<any>(null)
  const [isPollDialogOpen, setIsPollDialogOpen] = useState(false)

  // PURPLE SYSTEM colors for vibes page
  // Primary: Bright Purple (#9D4EFF), Secondary: Deep Purple (#6B21A8), Complementary: Lavender (#C4B5FD), Contrast: Yellow (#FBBF24)
  const getPurpleSystemColors = () => {
    if (mode === 'chaos') {
      return {
        primary: '#9D4EFF',      // Bright Purple
        secondary: '#6B21A8',   // Deep Purple
        complementary: '#C4B5FD', // Lavender
        contrast: '#FBBF24',    // Yellow
        bg: '#1A1A1A',
        text: '#FFFFFF',
        cardBg: '#2A2A2A'
      }
    } else if (mode === 'chill') {
      return {
        primary: '#9D4EFF',      // Bright Purple
        secondary: '#6B21A8',   // Deep Purple
        complementary: '#C4B5FD', // Lavender
        contrast: '#FBBF24',    // Yellow
        bg: '#F5E6D3',
        text: '#4A1818',
        cardBg: '#FFFFFF'
      }
    } else {
      return {
        primary: '#FFFFFF',
        secondary: '#808080',
        complementary: '#666666',
        contrast: '#FFFFFF',
        bg: '#000000',
        text: '#FFFFFF',
        cardBg: '#1a1a1a'
      }
    }
  }

  const purpleColors = getPurpleSystemColors()

  // Get emoji for poll items
  const getPollItemEmoji = (itemName: string): string => {
    const name = itemName.toLowerCase()
    
    // Thanksgiving poll emojis
    if (name.includes('stuffing')) return '🍞'
    if (name.includes('mashed potato')) return '🥔'
    if (name.includes('peking duck')) return '🦆'
    if (name.includes('pumpkin pie')) return '🎃'
    if (name.includes('gravy')) return '🥘'
    if (name.includes('turkey')) return '🦃'
    if (name.includes('wine')) return '🍷'
    if (name.includes('cigarette')) return '🚬'
    if (name.includes('caviar')) return '🐟'
    if (name.includes('cheese')) return '🧀'
    if (name.includes('casserole')) return '🍲'
    if (name.includes('corn')) return '🌽'
    if (name.includes('sweet potato')) return '🍠'
    if (name.includes('custard')) return '🍮'
    if (name.includes('candy')) return '🍬'
    if (name.includes('monster')) return '🥤'
    if (name.includes('eggnog')) return '🥛'
    if (name.includes('whiskey')) return '🥃'
    if (name.includes('amaro')) return '🍸'
    if (name.includes('rice')) return '🍚'
    if (name.includes('biriyani') || name.includes('biriyani')) return '🍛'
    if (name.includes('arepa') || name.includes('empanada')) return '🥟'
    if (name.includes('ham')) return '🍖'
    if (name.includes('bread')) return '🍞'
    if (name.includes('squash')) return '🎃'
    if (name.includes('spread')) return '🍽️'
    
    // Movie soundtrack emojis
    if (name.includes('garden state')) return '🌳'
    if (name.includes('good will hunting')) return '🧠'
    if (name.includes('purple rain')) return '💜'
    if (name.includes('interstellar')) return '🌌'
    if (name.includes('trainspotting')) return '🚂'
    if (name.includes('scott pilgrim')) return '🎮'
    if (name.includes('marie antoinette')) return '👑'
    if (name.includes('royal tenenbaums')) return '🎭'
    if (name.includes('twilight')) return '🌙'
    if (name.includes('black panther')) return '🐆'
    
    // Default emoji
    return '✨'
  }

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
    
    async function fetchData() {
      try {
        // Fetch playlists
        const playlistsResponse = await fetch('/api/playlists')
        
        if (!mounted) return

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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes emojiBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.1); }
        }
        .animated-emoji {
          animation: emojiBounce 2s ease-in-out infinite;
          display: inline-block;
        }
      `}} />
      <SiteHeader />

      <main className="w-full max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24">
        <div className="flex gap-6 w-full">
          {/* Sidebar */}
          <Card className={`w-80 flex-shrink-0 min-w-80 hidden lg:block ${getRoundedClass('rounded-[2.5rem]')} p-6 flex flex-col h-fit sticky top-24 self-start`}
            style={{
              backgroundColor: mode === 'chaos' 
                ? purpleColors.secondary 
                : mode === 'chill'
                ? 'white'
                : '#1a1a1a',
              borderColor: mode === 'chaos' 
                ? purpleColors.primary 
                : mode === 'chill'
                ? purpleColors.secondary
                : '#FFFFFF',
              borderWidth: mode === 'chaos' ? '2px' : '0px'
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Archive className="w-5 h-5" style={{ 
                color: mode === 'chaos' ? purpleColors.primary : mode === 'chill' ? purpleColors.secondary : '#FFFFFF'
              }} />
              <h3 className={`text-sm uppercase tracking-wider font-black ${getTextClass()}`}>
                Archive
              </h3>
            </div>
            <div className="space-y-3">
              <Link
                href="/vibes/playlist-archive"
                className={`flex items-center gap-3 ${getRoundedClass('rounded-xl')} px-4 py-3 transition-all ${
                  mode === 'chaos'
                    ? 'bg-[#9D4EFF]/30 text-white/80 hover:bg-[#9D4EFF]/50 text-white'
                    : mode === 'chill'
                    ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                    : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                }`}
              >
                <Music className="w-4 h-4" />
                <span className="text-sm font-semibold">Playlist Archive</span>
              </Link>
              <Link
                href="/vibes/polls-archive"
                className={`flex items-center gap-3 ${getRoundedClass('rounded-xl')} px-4 py-3 transition-all ${
                  mode === 'chaos'
                    ? 'bg-[#9D4EFF]/30 text-white/80 hover:bg-[#9D4EFF]/50 text-white'
                    : mode === 'chill'
                    ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                    : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Polls Archive</span>
              </Link>
            </div>
          </Card>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
        {/* Header */}
        <h1 className={`text-4xl font-black uppercase mb-8 ${getTextClass()}`}>VIBES</h1>
        
        {loading && (
          <div className="text-center py-8">
            <p className={`${getTextClass()} opacity-60`}>Loading...</p>
          </div>
        )}

        {/* Top Row - Most Recent Playlist and Poll (1/2 width each) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Most Recent Playlist */}
          {(() => {
            const playlistStyle = mode === 'chaos' 
              ? { text: 'text-white', accent: purpleColors.primary }
              : mode === 'chill'
              ? { text: getTextClass(), accent: purpleColors.complementary }
              : { text: getTextClass(), accent: purpleColors.primary }
            return (
              <Card className={`bg-transparent border-0 p-6 ${getRoundedClass('rounded-[2.5rem]')} h-full flex flex-col`}>
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: playlistStyle.accent }}>
                  <Music className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Latest</span>
                </div>
                <h2 className={`text-2xl font-black mb-4 uppercase ${playlistStyle.text}`}>Playlist</h2>
                {weeklyPlaylist ? (
                  <div className="flex-1">
                    <PlaylistCard
                      id={weeklyPlaylist.id}
                      title={weeklyPlaylist.title || null}
                      curator={weeklyPlaylist.curator}
                      description={weeklyPlaylist.description || null}
                      spotify_url={weeklyPlaylist.spotify_url}
                      cover_url={weeklyPlaylist.cover_url || null}
                      curator_photo_url={weeklyPlaylist.curator_photo_url || null}
                      date={weeklyPlaylist.date}
                      week_label={weeklyPlaylist.week_label || null}
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

          {/* Most Recent Poll */}
          <Card 
            className={`${getRoundedClass('rounded-[2.5rem]')} p-6 h-full flex flex-col cursor-pointer transition-all hover:scale-105 hover:shadow-2xl`}
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
              const sandwichData = [
                { name: 'Team Chopped Cheese', count: 4, participants: ['Julian', 'Peter', 'Pat', 'Karen'] },
                { name: 'Team Cheesesteak', count: 3, participants: ['Rebecca', 'Anne', 'The Philly commenter', 'Adam (partial overlap)'] },
                { name: 'Team "They Are Different Foods, Stop Fighting"', count: 2, participants: ['Adam (later)', 'Jordan'] },
                { name: 'Team Never Had One', count: 1, participants: ['Laura'] },
                { name: 'Team Wawa Hoagie Truthers', count: 0, participants: ['Arjun', 'Rebecca', 'Kenan'], note: 'Not a stance' },
              ]
              
              setSelectedPoll({
                id: 'great-sandwich-schism',
                title: 'The Great Sandwich Schism',
                question: 'This chat behaves like a poll even though nobody called it that.',
                date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                totalResponses: 10,
                data: sandwichData,
                isSandwichPoll: true,
                imageUrl: '/emotional-geography-sandwiches.png',
                bigTakeaway: 'A big takeaway'
              })
              setIsPollDialogOpen(true)
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-6 h-6" style={{ color: purpleColors.primary }} />
              <h2 className={`text-2xl font-black uppercase ${getTextClass()}`}>Latest Poll</h2>
            </div>
            <h3 className={`text-xl font-black mb-3 ${getTextClass()}`}>The Great Sandwich Schism</h3>
            <p className={`text-base mb-4 ${getTextClass()} opacity-70`}>
              This chat behaves like a poll even though nobody called it that.
            </p>
            
            {/* Teams Summary */}
            <div className="flex-1 space-y-3">
              {(() => {
                const teams = [
                  { name: 'Team Chopped Cheese', count: 4 },
                  { name: 'Team Cheesesteak', count: 3 },
                  { name: 'Team "They Are Different Foods, Stop Fighting"', count: 2 },
                  { name: 'Team Never Had One', count: 1 },
                ]
                
                const maxCount = Math.max(...teams.map(t => t.count))
                
                return (
                  <>
                    {teams.slice(0, 4).map((team, index) => {
                      const percentage = (team.count / maxCount) * 100
                      const isTop = index === 0
                      
                      return (
                        <div key={team.name} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-semibold ${getTextClass()}`}>{team.name}</span>
                            <span 
                              className={`text-sm font-black ${getTextClass()}`}
                              style={{ color: isTop ? purpleColors.primary : undefined }}
                            >
                              {team.count}
                            </span>
                          </div>
                          <div 
                            className={`${getRoundedClass('rounded-full')} h-4 overflow-hidden`}
                            style={{
                              backgroundColor: mode === 'chaos' 
                                ? 'rgba(255, 255, 255, 0.1)' 
                                : mode === 'chill'
                                ? 'rgba(74, 24, 24, 0.1)'
                                : 'rgba(255, 255, 255, 0.1)'
                            }}
                          >
                            <div
                              className="h-full transition-all duration-1000"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: isTop 
                                  ? purpleColors.primary
                                  : (mode === 'chaos' ? 'rgba(157, 78, 255, 0.4)' : mode === 'chill' ? 'rgba(157, 78, 255, 0.4)' : 'rgba(157, 78, 255, 0.4)')
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </>
                )
              })()}
            </div>

            <div className={`flex items-center justify-between text-xs opacity-60 ${getTextClass()} mt-4`}>
              <span>10 responses</span>
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            </div>
          </Card>
        </div>
          </div>
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
              border: `2px solid ${purpleColors.primary}40`
            }}
          >
            {selectedPoll && (
              <>
                <DialogHeader className="mb-6">
                  <DialogTitle className={`text-3xl font-black uppercase mb-2 ${getTextClass()}`}>
                    {selectedPoll.title}
                  </DialogTitle>
                  <p className={`text-sm ${getTextClass()} opacity-60`}>
                    {selectedPoll.askedBy ? `Asked by ${selectedPoll.askedBy} • ` : ''}{selectedPoll.date} • {selectedPoll.totalResponses} responses
                  </p>
                </DialogHeader>
                
                <div className="mb-6">
                  <h3 className={`text-xl font-black mb-4 ${getTextClass()}`}>
                    {selectedPoll.question}
                  </h3>
                  
                  {/* Ranking Poll Display - Movie Soundtracks */}
                  {selectedPoll.isRanking && selectedPoll.ranking && (
                    <div className="my-8">
                      {/* Horizontal Bar Chart for all non-zero items */}
                      <div className="space-y-3 mb-6">
                        {selectedPoll.ranking.map((item: any) => {
                          const maxRank = Math.min(...selectedPoll.ranking.map((r: any) => r.rank))
                          const percentage = ((selectedPoll.ranking.length - item.rank + 1) / selectedPoll.ranking.length) * 100
                          const isTopVoted = item.rank <= 5
                          
                          return (
                            <div key={item.rank} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span 
                                    className={`text-lg font-black ${getTextClass()}`}
                                    style={{ color: isTopVoted ? purpleColors.primary : undefined, minWidth: '2rem' }}
                                  >
                                    {item.rank}.
                                  </span>
                                  <span className={`text-base font-semibold ${getTextClass()}`}>
                                    {item.name}
                                  </span>
                                </div>
                                {isTopVoted && (
                                  <span 
                                    className="animated-emoji text-5xl"
                                    style={{ animationDelay: `${item.rank * 0.1}s` }}
                                  >
                                    {getPollItemEmoji(item.name)}
                                  </span>
                                )}
                              </div>
                              <div 
                                className={`${getRoundedClass('rounded-full')} h-4 overflow-hidden`}
                                style={{
                                  backgroundColor: mode === 'chaos' 
                                    ? 'rgba(255, 255, 255, 0.1)' 
                                    : mode === 'chill'
                                    ? 'rgba(74, 24, 24, 0.1)'
                                    : 'rgba(255, 255, 255, 0.1)'
                                }}
                              >
                                <div
                                  className="h-full transition-all duration-1000"
                                  style={{
                                    width: `${percentage}%`,
                                    backgroundColor: isTopVoted 
                                      ? purpleColors.primary
                                      : 'rgba(157, 78, 255, 0.4)'
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Venn Diagram */}
                      <div className="mt-8 pt-8 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                        <p className={`text-xl font-black mb-4 ${getTextClass()}`}>
                          Slouching Protagonists vs Significant Chairs
                        </p>
                        <div className="flex justify-center">
                          <img 
                            src="/venn_movies.png" 
                            alt="Venn diagram showing Slouching Protagonists vs Significant Chairs"
                            className="max-w-full h-auto"
                            style={{ maxHeight: '500px' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Sandwich Poll Display */}
                  {selectedPoll.isSandwichPoll && selectedPoll.data && (
                    <div className="my-8">
                      {(() => {
                        const allData = selectedPoll.data.sort((a: any, b: any) => b.count - a.count)
                        const nonZeroData = allData.filter((item: any) => item.count > 0)
                        const zeroData = allData.filter((item: any) => item.count === 0)
                        const maxCount = Math.max(...nonZeroData.map((d: any) => d.count))
                        
                        return (
                          <>
                            {/* Positions by count */}
                            <div className="mb-8">
                              <h4 className={`text-2xl font-black mb-4 ${getTextClass()}`}>Positions by count</h4>
                              <div className="space-y-4">
                                {nonZeroData.map((item: any, index: number) => {
                                  const percentage = (item.count / maxCount) * 100
                                  const isTop = index === 0
                                  
                                  return (
                                    <div key={item.name} className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <span className={`text-lg font-black ${getTextClass()}`}>
                                            {item.name}
                                          </span>
                                          {item.participants && (
                                            <div className="mt-1">
                                              {item.participants.map((participant: string, pIdx: number) => (
                                                <span key={pIdx} className={`text-sm ${getTextClass()} opacity-70`}>
                                                  {participant}{pIdx < item.participants.length - 1 ? ', ' : ''}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span 
                                            className={`text-xl font-black ${getTextClass()}`}
                                            style={{ color: isTop ? purpleColors.primary : undefined }}
                                          >
                                            ({item.count} {item.count === 1 ? 'vote' : 'votes'})
                                          </span>
                                        </div>
                                      </div>
                                      <div 
                                        className={`${getRoundedClass('rounded-full')} h-4 overflow-hidden`}
                                        style={{
                                          backgroundColor: mode === 'chaos' 
                                            ? 'rgba(255, 255, 255, 0.1)' 
                                            : mode === 'chill'
                                            ? 'rgba(74, 24, 24, 0.1)'
                                            : 'rgba(255, 255, 255, 0.1)'
                                        }}
                                      >
                                        <div
                                          className="h-full transition-all duration-1000"
                                          style={{
                                            width: `${percentage}%`,
                                            backgroundColor: isTop 
                                              ? purpleColors.primary
                                              : 'rgba(157, 78, 255, 0.4)'
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              
                              {/* Zero count items */}
                              {zeroData.length > 0 && (
                                <div className="mt-6 pt-6 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                                  {zeroData.map((item: any) => (
                                    <div key={item.name} className="mb-4">
                                      <span className={`text-lg font-black ${getTextClass()}`}>
                                        {item.name}
                                      </span>
                                      {item.note && (
                                        <span className={`text-sm ${getTextClass()} opacity-70 ml-2`}>
                                          ({item.note})
                                        </span>
                                      )}
                                      {item.participants && (
                                        <div className="mt-1">
                                          {item.participants.map((participant: string, pIdx: number) => (
                                            <span key={pIdx} className={`text-sm ${getTextClass()} opacity-70`}>
                                              {participant}{pIdx < item.participants.length - 1 ? ', ' : ''}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Big Takeaway */}
                            {selectedPoll.bigTakeaway && (
                              <div className="mt-8 pt-8 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                                <h4 className={`text-2xl font-black mb-4 ${getTextClass()}`}>
                                  {selectedPoll.bigTakeaway}
                                </h4>
                              </div>
                            )}
                            
                            {/* Emotional Geography Image */}
                            {selectedPoll.imageUrl && (
                              <div className="mt-8 pt-8 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                                <div className="flex justify-center relative" style={{ maxHeight: '600px' }}>
                                  <Image 
                                    src={selectedPoll.imageUrl} 
                                    alt="The Emotional Geography of Sandwiches"
                                    width={1000}
                                    height={600}
                                    className="max-w-full h-auto"
                                    style={{ maxHeight: '600px', objectFit: 'contain' }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}
                  
                  {/* Count-based Poll Display - Thanksgiving */}
                  {!selectedPoll.isRanking && !selectedPoll.isSandwichPoll && selectedPoll.data && (
                    <div className="my-8">
                      {(() => {
                        const allData = selectedPoll.data.sort((a: any, b: any) => b.count - a.count)
                        const nonZeroData = allData.filter((item: any) => item.count > 0)
                        const zeroData = allData.filter((item: any) => item.count === 0)
                        const maxCount = Math.max(...nonZeroData.map((d: any) => d.count))
                        
                        return (
                          <>
                            {/* Horizontal Bar Chart for all non-zero items */}
                            <div className="space-y-3 mb-6">
                              {nonZeroData.map((item: any, index: number) => {
                                const percentage = (item.count / maxCount) * 100
                                const isTop = index === 0
                                
                                return (
                                  <div key={item.name} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className={`text-base font-semibold ${getTextClass()}`}>
                                        {item.name}
                                      </span>
                                      <div className="flex items-center gap-3">
                                        <span 
                                          className={`text-base font-black ${getTextClass()}`}
                                          style={{ color: isTop ? purpleColors.primary : undefined }}
                                        >
                                          {item.count}
                                        </span>
                                        {isTop && (
                                          <span 
                                            className="animated-emoji text-5xl"
                                          >
                                            {getPollItemEmoji(item.name)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div 
                                      className={`${getRoundedClass('rounded-full')} h-4 overflow-hidden`}
                                      style={{
                                        backgroundColor: mode === 'chaos' 
                                          ? 'rgba(255, 255, 255, 0.1)' 
                                          : mode === 'chill'
                                          ? 'rgba(74, 24, 24, 0.1)'
                                          : 'rgba(255, 255, 255, 0.1)'
                                      }}
                                    >
                                      <div
                                        className="h-full transition-all duration-1000"
                                        style={{
                                          width: `${percentage}%`,
                                          backgroundColor: isTop 
                                            ? purpleColors.primary
                                            : 'rgba(157, 78, 255, 0.4)'
                                        }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            
                            {/* List of zero-vote items */}
                            {zeroData.length > 0 && (
                              <div className="mt-6 pt-6 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                                <p className={`text-base font-black mb-3 ${getTextClass()}`}>
                                  And then there was one
                                </p>
                                <p className={`text-sm ${getTextClass()} opacity-70`}>
                                  {zeroData.map((item: any) => item.name).join(', ')}
                                </p>
                              </div>
                            )}
                            
                            {/* Thanksgiving Image */}
                            <div className="mt-8 pt-8 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                              <div className="flex justify-center relative" style={{ maxHeight: '500px' }}>
                                <Image 
                                  src="/thxgiving.png" 
                                  alt="Thanksgiving visualization"
                                  width={800}
                                  height={500}
                                  className="max-w-full h-auto"
                                  style={{ maxHeight: '500px', objectFit: 'contain' }}
                                />
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}
                  
                  {/* Shows to Binge Infographic Display */}
                  {selectedPoll.isShowsToBinge && selectedPoll.shows && (
                    <div className="my-8">
                      {(() => {
                        const shows = selectedPoll.shows
                        const maxSecrets = Math.max(...shows.map((s: any) => s.secretsPerSeason))
                        const maxGasps = Math.max(...shows.map((s: any) => s.gaspsPerMinute))
                        
                        return (
                          <div className="space-y-6">
                            {/* Header Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                              <div className={`${getRoundedClass('rounded-2xl')} p-4 text-center`}
                                style={{
                                  backgroundColor: mode === 'chaos' 
                                    ? 'rgba(157, 78, 255, 0.1)' 
                                    : mode === 'chill'
                                    ? 'rgba(157, 78, 255, 0.15)'
                                    : 'rgba(157, 78, 255, 0.1)',
                                  border: `1px solid ${purpleColors.primary}40`
                                }}
                              >
                                <Lock className="w-6 h-6 mx-auto mb-2" style={{ color: purpleColors.primary }} />
                                <p className={`text-xs uppercase tracking-wider ${getTextClass()} opacity-70 mb-1`}>Secrets</p>
                                <p className={`text-2xl font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                  {maxSecrets}
                                </p>
                                <p className={`text-xs ${getTextClass()} opacity-60`}>per season (max)</p>
                              </div>
                              <div className={`${getRoundedClass('rounded-2xl')} p-4 text-center`}
                                style={{
                                  backgroundColor: mode === 'chaos' 
                                    ? 'rgba(157, 78, 255, 0.1)' 
                                    : mode === 'chill'
                                    ? 'rgba(157, 78, 255, 0.15)'
                                    : 'rgba(157, 78, 255, 0.1)',
                                  border: `1px solid ${purpleColors.primary}40`
                                }}
                              >
                                <span className="text-4xl mb-2 block">😱</span>
                                <p className={`text-xs uppercase tracking-wider ${getTextClass()} opacity-70 mb-1`}>Gasps</p>
                                <p className={`text-2xl font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                  {maxGasps.toFixed(2)}
                                </p>
                                <p className={`text-xs ${getTextClass()} opacity-60`}>per minute (max)</p>
                              </div>
                              <div className={`${getRoundedClass('rounded-2xl')} p-4 text-center`}
                                style={{
                                  backgroundColor: mode === 'chaos' 
                                    ? 'rgba(157, 78, 255, 0.1)' 
                                    : mode === 'chill'
                                    ? 'rgba(157, 78, 255, 0.15)'
                                    : 'rgba(157, 78, 255, 0.1)',
                                  border: `1px solid ${purpleColors.primary}40`
                                }}
                              >
                                <TrendingUp className="w-6 h-6 mx-auto mb-2" style={{ color: purpleColors.primary }} />
                                <p className={`text-xs uppercase tracking-wider ${getTextClass()} opacity-70 mb-1`}>Change</p>
                                <p className={`text-2xl font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                  81%
                                </p>
                                <p className={`text-xs ${getTextClass()} opacity-60`}>that change nothing (max)</p>
                              </div>
                            </div>

                            {/* Show Cards - Infographic Style */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {shows.map((show: any, index: number) => {
                                const secretsPercentage = (show.secretsPerSeason / maxSecrets) * 100
                                const gaspsPercentage = (show.gaspsPerMinute / maxGasps) * 100
                                const isTopSecrets = show.secretsPerSeason === maxSecrets
                                const isTopGasps = show.gaspsPerMinute === maxGasps
                                
                                return (
                                  <div 
                                    key={show.name}
                                    className={`${getRoundedClass('rounded-2xl')} p-6 relative overflow-hidden`}
                                    style={{
                                      backgroundColor: mode === 'chaos' 
                                        ? 'rgba(255, 255, 255, 0.05)' 
                                        : mode === 'chill'
                                        ? 'rgba(74, 24, 24, 0.05)'
                                        : 'rgba(255, 255, 255, 0.05)',
                                      border: `2px solid ${isTopSecrets || isTopGasps ? purpleColors.primary : 'rgba(157, 78, 255, 0.2)'}`
                                    }}
                                  >
                                    {/* Show Name */}
                                    <h4 className={`text-xl font-black mb-4 ${getTextClass()}`} style={{ 
                                      color: (isTopSecrets || isTopGasps) ? purpleColors.primary : undefined 
                                    }}>
                                      {show.name}
                                    </h4>

                                    {/* Secrets Per Season */}
                                    <div className="mb-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <Lock className="w-4 h-4" style={{ color: purpleColors.primary }} />
                                          <span className={`text-sm font-semibold ${getTextClass()}`}>Secrets per season</span>
                                        </div>
                                        <span className={`text-lg font-black ${getTextClass()}`} style={{ 
                                          color: isTopSecrets ? purpleColors.primary : undefined 
                                        }}>
                                          {show.secretsPerSeason}
                                        </span>
                                      </div>
                                      <div 
                                        className={`${getRoundedClass('rounded-full')} h-3 overflow-hidden relative`}
                                        style={{
                                          backgroundColor: mode === 'chaos' 
                                            ? 'rgba(255, 255, 255, 0.1)' 
                                            : mode === 'chill'
                                            ? 'rgba(74, 24, 24, 0.1)'
                                            : 'rgba(255, 255, 255, 0.1)'
                                        }}
                                      >
                                        <div
                                          className="h-full transition-all duration-1000"
                                          style={{
                                            width: `${secretsPercentage}%`,
                                            backgroundColor: isTopSecrets 
                                              ? purpleColors.primary
                                              : 'rgba(157, 78, 255, 0.5)'
                                          }}
                                        />
                                        {/* Visual lock icons */}
                                        <div className="absolute inset-0 flex items-center justify-start px-1">
                                          {Array.from({ length: show.secretsPerSeason }).map((_, i) => (
                                            <Lock 
                                              key={i} 
                                              className="w-2 h-2" 
                                              style={{ 
                                                color: i < secretsPercentage / 10 ? purpleColors.primary : 'rgba(157, 78, 255, 0.3)',
                                                marginLeft: i > 0 ? '2px' : '0'
                                              }} 
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Gasps Per Minute */}
                                    <div className="mb-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">😱</span>
                                          <span className={`text-sm font-semibold ${getTextClass()}`}>Gasps per minute</span>
                                        </div>
                                        <span className={`text-lg font-black ${getTextClass()}`} style={{ 
                                          color: isTopGasps ? purpleColors.primary : undefined 
                                        }}>
                                          {show.gaspsPerMinute.toFixed(2)}
                                        </span>
                                      </div>
                                      <div 
                                        className={`${getRoundedClass('rounded-full')} h-3 overflow-hidden relative`}
                                        style={{
                                          backgroundColor: mode === 'chaos' 
                                            ? 'rgba(255, 255, 255, 0.1)' 
                                            : mode === 'chill'
                                            ? 'rgba(74, 24, 24, 0.1)'
                                            : 'rgba(255, 255, 255, 0.1)'
                                        }}
                                      >
                                        <div
                                          className="h-full transition-all duration-1000"
                                          style={{
                                            width: `${gaspsPercentage}%`,
                                            backgroundColor: isTopGasps 
                                              ? purpleColors.primary
                                              : 'rgba(157, 78, 255, 0.5)'
                                          }}
                                        />
                                        {/* Visual gasp indicators */}
                                        <div className="absolute inset-0 flex items-center justify-start px-1">
                                          {Array.from({ length: Math.ceil(show.gaspsPerMinute * 10) }).map((_, i) => (
                                            <span 
                                              key={i}
                                              className="text-xs"
                                              style={{ 
                                                marginLeft: i > 0 ? '3px' : '0',
                                                opacity: i < gaspsPercentage / 5 ? 1 : 0.3
                                              }}
                                            >
                                              😱
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Percent That Change Nothing - Circular Style */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4" style={{ color: purpleColors.secondary }} />
                                        <span className={`text-sm font-semibold ${getTextClass()}`}>Change nothing</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="relative w-12 h-12"
                                          style={{
                                            background: `conic-gradient(${purpleColors.primary} ${show.percentChangeNothing * 3.6}deg, rgba(157, 78, 255, 0.2) ${show.percentChangeNothing * 3.6}deg)`,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          <div 
                                            className="absolute inset-1 rounded-full"
                                            style={{
                                              backgroundColor: mode === 'chaos' 
                                                ? '#1A1A1A' 
                                                : mode === 'chill'
                                                ? '#F5E6D3'
                                                : '#000000'
                                            }}
                                          >
                                            <div className="h-full flex items-center justify-center">
                                              <span className={`text-xs font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                                {show.percentChangeNothing}%
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Butt Rock Edition Display */}
                  {selectedPoll.isButtRock && (
                    <div className="my-8 space-y-8">
                      {/* Top Songs by Number of Mentions */}
                      <div>
                        <h4 className={`text-2xl font-black mb-4 ${getTextClass()}`}>
                          Top Songs by Number of Mentions
                        </h4>
                        <div className="space-y-3">
                          {selectedPoll.topSongs && selectedPoll.topSongs.map((song: any, index: number) => {
                            const maxCount = Math.max(...selectedPoll.topSongs.map((s: any) => s.count))
                            const percentage = (song.count / maxCount) * 100
                            const isTop = index === 0
                            
                            return (
                              <div key={`${song.name}-${song.artist}`} className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <span className={`text-base font-semibold ${getTextClass()}`}>
                                      {song.name}
                                    </span>
                                    <span className={`text-sm ${getTextClass()} opacity-70 ml-2`}>
                                      — {song.artist}
                                    </span>
                                  </div>
                                  <span 
                                    className={`text-base font-black ${getTextClass()}`}
                                    style={{ color: isTop ? purpleColors.primary : undefined }}
                                  >
                                    ({song.count})
                                  </span>
                                </div>
                                <div 
                                  className={`${getRoundedClass('rounded-full')} h-4 overflow-hidden`}
                                  style={{
                                    backgroundColor: mode === 'chaos' 
                                      ? 'rgba(255, 255, 255, 0.1)' 
                                      : mode === 'chill'
                                      ? 'rgba(74, 24, 24, 0.1)'
                                      : 'rgba(255, 255, 255, 0.1)'
                                  }}
                                >
                                  <div
                                    className="h-full transition-all duration-1000"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: isTop 
                                        ? purpleColors.primary
                                        : 'rgba(157, 78, 255, 0.4)'
                                    }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Single-Mention Tracks */}
                      {selectedPoll.singleMentionTracks && selectedPoll.singleMentionTracks.length > 0 && (
                        <div className="pt-6 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                          <h4 className={`text-2xl font-black mb-4 ${getTextClass()}`}>
                            Single-Mention Tracks
                          </h4>
                          <div className="space-y-2">
                            {selectedPoll.singleMentionTracks.map((track: any) => (
                              <div key={`${track.name}-${track.artist}`} className={`text-base ${getTextClass()}`}>
                                <span className="font-semibold">{track.name}</span>
                                <span className={`opacity-70 ml-2`}>— {track.artist}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Artist Frequency */}
                      {selectedPoll.artistFrequency && selectedPoll.artistFrequency.length > 0 && (
                        <div className="pt-6 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                          <h4 className={`text-2xl font-black mb-4 ${getTextClass()}`}>
                            Artist Frequency
                          </h4>
                          <p className={`text-base ${getTextClass()} opacity-70 mb-2`}>
                            {selectedPoll.artistFrequency.join(', ')}
                          </p>
                          <p className={`text-sm ${getTextClass()} opacity-60 italic`}>
                            Each earns at least two separate mentions.
                          </p>
                          <p className={`text-sm ${getTextClass()} opacity-60 italic mt-2`}>
                            This gives a very tight "butt rock core seven."
                          </p>
                        </div>
                      )}

                      {/* Butt Rock Perfect Storm Index */}
                      <div className="pt-8 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                        <h4 className={`text-3xl font-black mb-6 ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                          Butt Rock Perfect Storm Index
                        </h4>
                        
                        <p className={`text-lg ${getTextClass()} opacity-80 mb-8`}>
                          When you score each song by three traits:
                        </p>

                        {/* Three Traits */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          <div className={`${getRoundedClass('rounded-2xl')} p-6 text-center`}
                            style={{
                              backgroundColor: mode === 'chaos' 
                                ? 'rgba(157, 78, 255, 0.1)' 
                                : mode === 'chill'
                                ? 'rgba(157, 78, 255, 0.15)'
                                : 'rgba(157, 78, 255, 0.1)',
                              border: `2px solid ${purpleColors.primary}40`
                            }}
                          >
                            <span className="text-4xl mb-3 block">🎤</span>
                            <p className={`text-sm font-black uppercase tracking-wider ${getTextClass()} mb-2`}>
                              Growly male vocal
                            </p>
                          </div>
                          <div className={`${getRoundedClass('rounded-2xl')} p-6 text-center`}
                            style={{
                              backgroundColor: mode === 'chaos' 
                                ? 'rgba(157, 78, 255, 0.1)' 
                                : mode === 'chill'
                                ? 'rgba(157, 78, 255, 0.15)'
                                : 'rgba(157, 78, 255, 0.1)',
                              border: `2px solid ${purpleColors.primary}40`
                            }}
                          >
                            <span className="text-4xl mb-3 block">💭</span>
                            <p className={`text-sm font-black uppercase tracking-wider ${getTextClass()} mb-2`}>
                              One-word emotional noun in the chorus
                            </p>
                          </div>
                          <div className={`${getRoundedClass('rounded-2xl')} p-6 text-center`}
                            style={{
                              backgroundColor: mode === 'chaos' 
                                ? 'rgba(157, 78, 255, 0.1)' 
                                : mode === 'chill'
                                ? 'rgba(157, 78, 255, 0.15)'
                                : 'rgba(157, 78, 255, 0.1)',
                              border: `2px solid ${purpleColors.primary}40`
                            }}
                          >
                            <span className="text-4xl mb-3 block">🏭</span>
                            <p className={`text-sm font-black uppercase tracking-wider ${getTextClass()} mb-2`}>
                              Music video set in warehouse, pit, or parking lot
                            </p>
                          </div>
                        </div>

                        <p className={`text-lg ${getTextClass()} opacity-80 mb-8`}>
                          You get this:
                        </p>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className={`${getRoundedClass('rounded-2xl')} p-6`}
                            style={{
                              backgroundColor: mode === 'chaos' 
                                ? 'rgba(157, 78, 255, 0.15)' 
                                : mode === 'chill'
                                ? 'rgba(157, 78, 255, 0.2)'
                                : 'rgba(157, 78, 255, 0.15)',
                              border: `2px solid ${purpleColors.primary}`
                            }}
                          >
                            <div className="flex items-center justify-center mb-4">
                              <div 
                                className="relative w-24 h-24"
                                style={{
                                  background: `conic-gradient(${purpleColors.primary} 360deg, rgba(157, 78, 255, 0.2) 360deg)`,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <div 
                                  className="absolute inset-2 rounded-full"
                                  style={{
                                    backgroundColor: mode === 'chaos' 
                                      ? '#1A1A1A' 
                                      : mode === 'chill'
                                      ? '#F5E6D3'
                                      : '#000000'
                                  }}
                                >
                                  <div className="h-full flex items-center justify-center">
                                    <span className={`text-3xl font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                      100%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className={`text-base ${getTextClass()} text-center font-semibold`}>
                              of the group's top-vote songs check at least two boxes
                            </p>
                          </div>

                          <div className={`${getRoundedClass('rounded-2xl')} p-6`}
                            style={{
                              backgroundColor: mode === 'chaos' 
                                ? 'rgba(157, 78, 255, 0.15)' 
                                : mode === 'chill'
                                ? 'rgba(157, 78, 255, 0.2)'
                                : 'rgba(157, 78, 255, 0.15)',
                              border: `2px solid ${purpleColors.primary}`
                            }}
                          >
                            <div className="flex items-center justify-center mb-4">
                              <div 
                                className="relative w-24 h-24"
                                style={{
                                  background: `conic-gradient(${purpleColors.primary} ${71 * 3.6}deg, rgba(157, 78, 255, 0.2) ${71 * 3.6}deg)`,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <div 
                                  className="absolute inset-2 rounded-full"
                                  style={{
                                    backgroundColor: mode === 'chaos' 
                                      ? '#1A1A1A' 
                                      : mode === 'chill'
                                      ? '#F5E6D3'
                                      : '#000000'
                                  }}
                                >
                                  <div className="h-full flex items-center justify-center">
                                    <span className={`text-3xl font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                      71%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className={`text-base ${getTextClass()} text-center font-semibold`}>
                              check all three
                            </p>
                          </div>
                        </div>

                        {/* Outlier Note */}
                        <div className={`${getRoundedClass('rounded-2xl')} p-6`}
                          style={{
                            backgroundColor: mode === 'chaos' 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : mode === 'chill'
                              ? 'rgba(74, 24, 24, 0.05)'
                              : 'rgba(255, 255, 255, 0.05)',
                            border: `2px solid ${purpleColors.secondary}60`
                          }}
                        >
                          <div className="flex items-start gap-4">
                            <span className="text-4xl">✨</span>
                            <div className="flex-1">
                              <p className={`text-base font-black ${getTextClass()} mb-2`}>
                                The only outlier is <span style={{ color: purpleColors.secondary }}>Butterfly by Crazy Town</span>
                              </p>
                              <p className={`text-sm ${getTextClass()} opacity-70 italic`}>
                                which swaps "warehouse angst" for "shirtless fairy energy."
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Footer />
      </main>
    </div>
  )
}
