'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { AccountMenu } from '@/components/account-menu'
import { ModeSwitcher } from '@/components/mode-switcher'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Music, MessageCircle, Play } from 'lucide-react'
import Link from 'next/link'
import { PlaylistCard } from '@/components/playlist-card'

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

  const getRoundedClass = (base: string) => {
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    if (mode === 'code') return 'rounded-none'
    return base
  }

  // Get accent color for cards
  const getAccentColor = () => {
    switch (mode) {
      case 'chaos': return '#C4F500'
      case 'chill': return '#FFC043'
      case 'code': return '#FFFFFF'
      default: return '#C4F500'
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
        // TODO: Fetch Beast Babe from beast_babe table when it's created
        // For now, using placeholder data
        setBeastBabe({
          id: 'placeholder',
          full_name: 'Sarah J.',
          email: null,
          avatar_url: null,
          snaps_count: 42
        })

        // Fetch Question of the Week (placeholder - you'll need to create a questions table)
        setQuestionOfWeek("What's one thing you learned this week?")
        setAnswers([
          { id: '1', answer: "How to use CSS Grid effectively!", author: 'Alex' },
          { id: '2', answer: "Better time management techniques", author: 'Sarah' }
        ])

        // Fetch playlists from database
        const { data: playlists, error: playlistsError } = await supabase
          .from('playlists')
          .select('*')
          .order('date', { ascending: false })

        if (playlistsError) {
          console.error('Error fetching playlists:', playlistsError)
        } else if (playlists && playlists.length > 0) {
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
          setArchivePlaylists(archive)
        }
      } catch (err: any) {
        console.error('Error fetching data:', err)
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

  const accentColor = getAccentColor()

  return (
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <header className={`border-b ${getBorderClass()} px-6 py-4`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <div className={`w-10 h-10 ${getLogoBg()} ${getLogoText()} ${getRoundedClass('rounded-xl')} flex items-center justify-center font-black text-lg ${mode === 'code' ? 'font-mono' : ''} cursor-pointer`}>
                {mode === 'code' ? 'C:\\>' : 'D'}
              </div>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className={getNavLinkClass()}>HOME</Link>
              <Link href="/snaps" className={getNavLinkClass()}>SNAPS</Link>
              <a href="#" className={getNavLinkClass()}>RESOURCES</a>
              <Link href="/work-samples" className={getNavLinkClass()}>WORK</Link>
              <a href="#" className={getNavLinkClass()}>TEAM</a>
              <Link href="/vibes" className={getNavLinkClass(true)}>VIBES</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ModeSwitcher />
            {user && (
              <AccountMenu />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        {/* Header */}
        <h1 className={`text-5xl font-black mb-8 ${getTextClass()}`}>Vibes</h1>

        {/* Top Row - Three Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Beast Babe Card */}
          <Card className={`${getRoundedClass('rounded-[2.5rem]')} p-6`} style={{ 
            backgroundColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF',
            color: mode === 'chill' ? '#4A1818' : '#000000'
          }}>
            <p className="text-xs uppercase tracking-wider font-black mb-2" style={{ 
              color: mode === 'chill' ? '#4A1818' : '#000000',
              opacity: 0.8
            }}>THIS WEEK'S</p>
            <h2 className="text-4xl font-black mb-6 uppercase" style={{ 
              color: mode === 'chill' ? '#4A1818' : '#000000'
            }}>BEAST<br/>BABE</h2>
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ 
                backgroundColor: mode === 'chill' ? '#4A1818' : '#000000'
              }}>
                <Trophy className="w-10 h-10" style={{ 
                  color: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF'
                }} />
              </div>
            </div>
            {beastBabe ? (
              <>
                <p className="text-2xl font-black text-center mb-1" style={{ 
                  color: mode === 'chill' ? '#4A1818' : '#000000'
                }}>
                  {beastBabe.full_name || 'Anonymous'}
                </p>
                <p className="text-sm font-medium text-center" style={{ 
                  color: mode === 'chill' ? '#4A1818' : '#000000',
                  opacity: 0.8
                }}>
                  {beastBabe.snaps_count} Snaps Received
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-center" style={{ 
                color: mode === 'chill' ? '#4A1818' : '#000000',
                opacity: 0.8
              }}>No data yet</p>
            )}
          </Card>

          {/* Question of the Week Card */}
          <Card className={`${getRoundedClass('rounded-[2.5rem]')} p-6`} style={{ 
            backgroundColor: mode === 'chaos' ? '#1a1a1a' : mode === 'chill' ? '#FFFFFF' : '#000000',
            borderColor: accentColor,
            borderWidth: '2px'
          }}>
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4" style={{ color: accentColor }} />
              <p className="text-xs uppercase tracking-wider font-black" style={{ color: accentColor }}>QUESTION OF THE WEEK</p>
            </div>
            <h2 className="text-2xl font-black mb-6 leading-tight" style={{ 
              color: mode === 'chill' ? '#4A1818' : '#FFFFFF'
            }}>
              {questionOfWeek}
            </h2>
            <div className="space-y-3 mb-6">
              {answers.map((answer) => (
                <div
                  key={answer.id}
                  className={`${getRoundedClass('rounded-xl')} p-3`}
                  style={{ 
                    backgroundColor: mode === 'chaos' ? 'rgba(196, 245, 0, 0.1)' : mode === 'chill' ? 'rgba(255, 192, 67, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                    borderColor: accentColor,
                    borderWidth: '1px'
                  }}
                >
                  <p className="text-sm font-medium" style={{ 
                    color: mode === 'chill' ? '#4A1818' : '#FFFFFF'
                  }}>"{answer.answer}"</p>
                  <p className="text-xs mt-1" style={{ 
                    color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
                    opacity: 0.7
                  }}>- {answer.author}</p>
                </div>
              ))}
            </div>
            <Button
              className={`w-full ${getRoundedClass('rounded-xl')} font-black h-12 uppercase`}
              style={{ 
                backgroundColor: accentColor,
                color: mode === 'chill' ? '#4A1818' : '#000000'
              }}
            >
              Share Your Answer
            </Button>
          </Card>

          {/* Weekly Playlist Card */}
          <Card className={`${getRoundedClass('rounded-[2.5rem]')} p-6`} style={{ 
            backgroundColor: mode === 'chaos' ? '#1a1a1a' : mode === 'chill' ? '#FFFFFF' : '#000000',
            borderColor: accentColor,
            borderWidth: '2px'
          }}>
            <p className="text-xs uppercase tracking-wider font-black mb-2" style={{ 
              color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
              opacity: 0.8
            }}>WEEKLY</p>
            <h2 className="text-4xl font-black mb-6 uppercase" style={{ 
              color: accentColor
            }}>PLAYLIST</h2>
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 ${getRoundedClass('rounded-xl')} flex items-center justify-center`} style={{ 
                backgroundColor: accentColor
              }}>
                <Music className="w-8 h-8" style={{ 
                  color: mode === 'chill' ? '#4A1818' : '#000000'
                }} />
              </div>
            </div>
            {weeklyPlaylist ? (
              <>
                <p className="text-lg font-black text-center mb-1" style={{ 
                  color: mode === 'chill' ? '#4A1818' : '#FFFFFF'
                }}>{weeklyPlaylist.title || 'Untitled Playlist'}</p>
                <p className="text-sm font-medium text-center mb-6" style={{ 
                  color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
                  opacity: 0.8
                }}>Curated by {weeklyPlaylist.curator}</p>
                <Button
                  className={`w-full ${getRoundedClass('rounded-xl')} font-black h-12 uppercase flex items-center justify-center gap-2`}
                  style={{ 
                    backgroundColor: accentColor,
                    color: mode === 'chill' ? '#4A1818' : '#000000'
                  }}
                  onClick={() => weeklyPlaylist.spotify_url && window.open(weeklyPlaylist.spotify_url, '_blank')}
                >
                  <Play className="w-4 h-4" />
                  Play on Spotify
                </Button>
              </>
            ) : (
              <p className="text-sm font-medium text-center" style={{ 
                color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
                opacity: 0.8
              }}>No playlist this week</p>
            )}
          </Card>
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
      </main>
    </div>
  )
}
