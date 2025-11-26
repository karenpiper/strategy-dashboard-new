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

        <main className="flex-1 min-w-0">
          <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Header */}
        <h1 className={`text-4xl font-black uppercase mb-8 ${getTextClass()}`}>VIBES</h1>
        
        {loading && (
          <div className="text-center py-8">
            <p className={`${getTextClass()} opacity-60`}>Loading...</p>
          </div>
        )}

        {/* Top Row - Most Recent Poll and Playlist (1/2 width each) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Most Recent Poll */}
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
              <h2 className={`text-2xl font-black uppercase ${getTextClass()}`}>Latest Poll</h2>
            </div>
            <h3 className={`text-xl font-black mb-3 ${getTextClass()}`}>Thanksgiving Grub</h3>
            <p className={`text-sm mb-4 ${getTextClass()} opacity-70`}>
              What are your top Thanksgiving dishes?
            </p>
            
            {/* Top Results - Mini Chart */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${getTextClass()}`}>Stuffing</span>
                <span className={`text-sm font-black ${getTextClass()}`} style={{ color: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF' }}>7</span>
              </div>
              <div 
                className={`${getRoundedClass('rounded-full')} h-2 overflow-hidden`}
                style={{
                  backgroundColor: mode === 'chaos' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : mode === 'chill'
                    ? 'rgba(74, 24, 24, 0.1)'
                    : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                <div
                  className="h-full"
                  style={{
                    width: '100%',
                    backgroundColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF'
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs opacity-60">
                <span>Mashed potatoes: 3</span>
                <span>Peking duck: 2</span>
              </div>
            </div>

            {/* Fun Fact */}
            <div className="mb-4 pt-4 border-t" style={{ 
              borderColor: mode === 'chaos' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : mode === 'chill'
                ? 'rgba(74, 24, 24, 0.1)'
                : 'rgba(255, 255, 255, 0.1)'
            }}>
              <p className={`text-xs font-black mb-2 ${getTextClass()}`}>
                Fun Fact: Statistically speaking, cigarettes appear as often as:
              </p>
              <ul className={`space-y-0.5 text-xs ${getTextClass()} opacity-70`}>
                <li>• turkey</li>
                <li>• custard</li>
                <li>• caramel</li>
                <li>• mashed potatoes with gravy</li>
                <li>• empanadas</li>
                <li>• jollof rice</li>
              </ul>
            </div>

            <div className={`flex items-center justify-between text-xs opacity-60 ${getTextClass()}`}>
              <span>14 responses</span>
              <span>Nov 2024</span>
            </div>
          </Card>

          {/* Most Recent Playlist */}
          {(() => {
            const playlistStyle = mode === 'chaos' 
              ? { text: 'text-white', accent: '#9333EA' }
              : mode === 'chill'
              ? { text: getTextClass(), accent: '#FFB5D8' }
              : { text: getTextClass(), accent: '#FFFFFF' }
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
