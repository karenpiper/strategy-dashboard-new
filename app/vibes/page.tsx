'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Music, MessageCircle, Archive, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { PlaylistCard } from '@/components/playlist-card'
import { Footer } from '@/components/footer'
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

  // RED SYSTEM colors for vibes page
  // Primary: Coral Red (#FF4C4C), Secondary: Crimson (#C41E3A), Lightest: Peach (#FFD4C4)
  // Ocean Blue (#00A3E0) - buttons only
  const getRedSystemColors = () => {
    return {
      primary: '#FF4C4C',    // Coral Red
      secondary: '#C41E3A',  // Crimson
      lightest: '#FFD4C4',  // Peach
      button: '#00A3E0'     // Ocean Blue (buttons only)
    }
  }

  const redSystem = getRedSystemColors()

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
      <SiteHeader />

      <main className="max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24">
        <div className="flex gap-6">
          {/* Sidebar */}
          <Card className={`w-80 hidden lg:block ${getRoundedClass('rounded-[2.5rem]')} p-6 flex flex-col h-fit`}
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
                color: redSystem.primary
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
          </Card>

          {/* Main Content Area */}
          <div className="flex-1">
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
              ? { text: 'text-white', accent: redSystem.primary }
              : mode === 'chill'
              ? { text: getTextClass(), accent: redSystem.lightest }
              : { text: getTextClass(), accent: redSystem.primary }
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
            className={`${getRoundedClass('rounded-[2.5rem]')} p-6 h-full flex flex-col`}
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
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-6 h-6" style={{ color: redSystem.primary }} />
              <h2 className={`text-2xl font-black uppercase ${getTextClass()}`}>Latest Poll</h2>
                  </div>
            <h3 className={`text-xl font-black mb-3 ${getTextClass()}`}>Thanksgiving Grub</h3>
            <p className={`text-base mb-4 ${getTextClass()} opacity-70`}>
              What are your top Thanksgiving dishes?
            </p>
            
            {/* Chart and Fun Fact Side by Side */}
            <div className="flex-1 grid grid-cols-2 gap-6">
              {/* Horizontal Bar Chart - 1/2 width (left) */}
              <div className="space-y-3">
                {(() => {
                  const allData = [
                    { name: 'Stuffing', count: 7 },
                    { name: 'Mashed potatoes', count: 3 },
                    { name: 'Peking duck', count: 2 },
                    { name: 'Pumpkin pie', count: 2 },
                    { name: 'Gravy', count: 2 },
                    { name: 'Fried turkey', count: 1 },
                    { name: 'Turkey breast', count: 1 },
                    { name: 'Peppercorn encrusted filet mignon', count: 1 },
                    { name: 'Outdoor KBBQ', count: 1 },
                    { name: 'Chicken biriyani', count: 1 },
                    { name: 'Jollof rice', count: 1 },
                    { name: 'Arepas', count: 1 },
                    { name: 'Empanadas', count: 1 },
                    { name: 'Ham', count: 1 },
                    { name: 'Funeral potatoes', count: 1 },
                    { name: 'Cornbread', count: 1 },
                    { name: 'Corn soufflé', count: 1 },
                    { name: 'Fire-roasted sweet potatoes', count: 1 },
                    { name: 'Butternut squash', count: 1 },
                    { name: 'Sweet potato pie', count: 1 },
                    { name: 'Caramel custard', count: 1 },
                    { name: 'Custard pie', count: 1 },
                    { name: 'Dessert spread', count: 1 },
                    { name: 'Dots candy', count: 1 },
                    { name: 'Trolli exploding worms', count: 1 },
                    { name: 'White Monster', count: 1 },
                    { name: 'Eggnog', count: 1 },
                    { name: 'Appetizer red wine', count: 1 },
                    { name: 'Dinner red wine', count: 1 },
                    { name: 'Dessert amaro', count: 1 },
                    { name: 'Peanut butter whiskey "during gravy"', count: 1 },
                    { name: 'Skinny French cigarette', count: 1 },
                    { name: 'Capri cigarettes with my mother in law and great aunt', count: 1 },
                    { name: 'Caviar before dinner', count: 1 },
                    { name: 'Cheese plate before', count: 1 },
                    { name: 'All of the above mixed together in one perfect bite', count: 1 },
                    { name: 'Green bean casserole', count: 1 },
                    { name: 'Horseradish mashed potatoes', count: 1 },
                    { name: 'Hongshaorou', count: 1 },
                  ]
                  
                  const chartData = allData.filter(item => item.count > 0).sort((a, b) => b.count - a.count)
                  const maxCount = Math.max(...chartData.map(d => d.count))
                  
                  return (
                    <>
                      {chartData.map((item, index) => {
                        const percentage = (item.count / maxCount) * 100
                        const isTop = index === 0
                        
                        return (
                          <div key={item.name} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className={`text-base font-semibold ${getTextClass()}`}>{item.name}</span>
                              <span 
                                className={`text-base font-black ${getTextClass()}`}
                                style={{ color: isTop ? redSystem.primary : undefined }}
                              >
                                {item.count}
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
                                    ? redSystem.primary
                                    : (mode === 'chaos' ? 'rgba(255, 76, 76, 0.4)' : mode === 'chill' ? 'rgba(255, 76, 76, 0.4)' : 'rgba(255, 76, 76, 0.4)')
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

              {/* Fun Fact - 1/2 width (right) */}
              <div className="flex flex-col justify-start">
                <h4 className={`text-xl font-black mb-3 ${getTextClass()}`}>
                  Fun Fact: Statistically speaking, cigarettes appear as often as:
                </h4>
                <ul className={`space-y-1 text-base ${getTextClass()} opacity-70`}>
                  <li>• turkey</li>
                  <li>• custard</li>
                  <li>• caramel</li>
                  <li>• mashed potatoes with gravy</li>
                  <li>• empanadas</li>
                  <li>• jollof rice</li>
                </ul>
              </div>
            </div>

            <div className={`flex items-center justify-between text-xs opacity-60 ${getTextClass()}`}>
              <span>14 responses</span>
              <span>Nov 2024</span>
                </div>
              </Card>
        </div>

        {/* Polls Archive */}
        <div className="mb-12">
          <h2 className={`text-4xl font-black mb-6 ${getTextClass()}`}>Polls Archive</h2>
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
                const allData = [
                  { name: 'Stuffing', count: 7 },
                  { name: 'Mashed potatoes', count: 3 },
                  { name: 'Peking duck', count: 2 },
                  { name: 'Pumpkin pie', count: 2 },
                  { name: 'Gravy', count: 2 },
                  { name: 'Fried turkey', count: 1 },
                  { name: 'Turkey breast', count: 1 },
                  { name: 'Peppercorn encrusted filet mignon', count: 1 },
                  { name: 'Outdoor KBBQ', count: 1 },
                  { name: 'Chicken biriyani', count: 1 },
                  { name: 'Jollof rice', count: 1 },
                  { name: 'Arepas', count: 1 },
                  { name: 'Empanadas', count: 1 },
                  { name: 'Ham', count: 1 },
                  { name: 'Funeral potatoes', count: 1 },
                  { name: 'Cornbread', count: 1 },
                  { name: 'Corn soufflé', count: 1 },
                  { name: 'Fire-roasted sweet potatoes', count: 1 },
                  { name: 'Butternut squash', count: 1 },
                  { name: 'Sweet potato pie', count: 1 },
                  { name: 'Caramel custard', count: 1 },
                  { name: 'Custard pie', count: 1 },
                  { name: 'Dessert spread', count: 1 },
                  { name: 'Dots candy', count: 1 },
                  { name: 'Trolli exploding worms', count: 1 },
                  { name: 'White Monster', count: 1 },
                  { name: 'Eggnog', count: 1 },
                  { name: 'Appetizer red wine', count: 1 },
                  { name: 'Dinner red wine', count: 1 },
                  { name: 'Dessert amaro', count: 1 },
                  { name: 'Peanut butter whiskey "during gravy"', count: 1 },
                  { name: 'Skinny French cigarette', count: 1 },
                  { name: 'Capri cigarettes with my mother in law and great aunt', count: 1 },
                  { name: 'Caviar before dinner', count: 1 },
                  { name: 'Cheese plate before', count: 1 },
                  { name: 'All of the above mixed together in one perfect bite', count: 1 },
                  { name: 'Green bean casserole', count: 1 },
                  { name: 'Horseradish mashed potatoes', count: 1 },
                  { name: 'Hongshaorou', count: 1 },
                ]
                // Show full results in archive dialog
                const fullData = allData.sort((a, b) => b.count - a.count)
                
                setSelectedPoll({
                  id: 'thanksgiving-grub',
                  title: 'Thanksgiving Grub',
                  question: 'What are your top Thanksgiving dishes?',
                  date: 'November 2024',
                  totalResponses: 14,
                  data: fullData,
                  oneVoters: []
                })
                setIsPollDialogOpen(true)
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6" style={{ color: redSystem.primary }} />
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

            {/* Top 5 Movie Soundtracks Poll Card */}
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
                const ranking = [
                  { rank: 1, name: 'Garden State' },
                  { rank: 2, name: 'Good Will Hunting' },
                  { rank: 3, name: 'Purple Rain' },
                  { rank: 4, name: 'Interstellar' },
                  { rank: 5, name: 'Trainspotting' },
                  { rank: 6, name: 'Scott Pilgrim vs the World' },
                  { rank: 7, name: 'Marie Antoinette' },
                  { rank: 8, name: 'The Royal Tenenbaums' },
                  { rank: 9, name: 'Twilight' },
                  { rank: 10, name: 'Black Panther' },
                ]
                
                setSelectedPoll({
                  id: 'top-5-movie-soundtracks',
                  title: 'Top 5 Movie Soundtracks',
                  question: 'Top 5 movie sound tracks - ranked. You can choose to isolate musicals from non-musicals or combine',
                  askedBy: 'Rebecca Smith',
                  date: 'November 21, 2024',
                  totalResponses: 3,
                  ranking: ranking,
                  isRanking: true
                })
                setIsPollDialogOpen(true)
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6" style={{ color: redSystem.primary }} />
                <h3 className={`text-xl font-black uppercase ${getTextClass()}`}>Top 5 Movie Soundtracks</h3>
              </div>
              <p className={`text-sm mb-4 ${getTextClass()} opacity-70`}>
                Top 5 movie sound tracks - ranked. You can choose to isolate musicals from non-musicals or combine
              </p>
              <div className={`flex items-center justify-between text-xs opacity-60 ${getTextClass()}`}>
                <span>3 responses</span>
                <span>Nov 21</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Playlists Archive */}
        <div className="mb-8">
          <h2 className={`text-4xl font-black mb-6 ${getTextClass()}`}>Playlists Archive</h2>
          {archivePlaylists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {archivePlaylists.map((playlist) => (
                <div key={playlist.id} className="p-6">
                  <PlaylistCard
                    id={playlist.id}
                    title={playlist.title || null}
                    curator={playlist.curator}
                    description={playlist.description || null}
                    spotify_url={playlist.spotify_url}
                    cover_url={playlist.cover_url || null}
                    curator_photo_url={playlist.curator_photo_url || null}
                    date={playlist.date}
                    week_label={playlist.week_label || null}
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
              border: `2px solid ${redSystem.primary}40`
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
                  
                  {/* Ranking Poll Display */}
                  {selectedPoll.isRanking && selectedPoll.ranking && (
                    <div className="my-8">
                      <ol className={`space-y-3 ${getTextClass()}`}>
                        {selectedPoll.ranking.map((item: any) => (
                          <li key={item.rank} className="flex items-center gap-4">
                            <span 
                              className={`text-2xl font-black ${getTextClass()}`}
                              style={{ color: item.rank <= 5 ? redSystem.primary : undefined, minWidth: '2rem' }}
                            >
                              {item.rank}.
                            </span>
                            <span className={`text-lg font-semibold ${getTextClass()}`}>
                              {item.name}
                            </span>
                          </li>
                        ))}
                      </ol>
                      
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
                  
                  {/* Count-based Poll Display */}
                  {!selectedPoll.isRanking && selectedPoll.data && (
                    <div className="my-8">
                      {/* Full Results List */}
                      <ul className={`space-y-2 ${getTextClass()}`}>
                        {selectedPoll.data
                          .sort((a: any, b: any) => b.count - a.count)
                          .map((item: any, index: number) => {
                            const isTop = index === 0
                            
                            return (
                              <li key={item.name} className="flex items-center justify-between py-2">
                                <span className={`text-base font-semibold ${getTextClass()}`}>
                                  {item.name}
                                </span>
                                <span 
                                  className={`text-lg font-black ${getTextClass()}`}
                                  style={{ color: isTop ? redSystem.primary : undefined }}
                                >
                                  {item.count}
                                </span>
                              </li>
                            )
                          })}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
        
        <Footer />
          </div>
        </div>
      </main>
    </div>
  )
}
