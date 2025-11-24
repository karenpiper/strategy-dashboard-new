'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  BookOpen, 
  Video, 
  Newspaper, 
  ExternalLink, 
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Home
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { VideoEmbed } from '@/components/video-embed'

interface MustRead {
  id: string
  article_title: string
  article_url: string
  notes: string | null
  pinned: boolean
  category: string | null
  source: string | null
  summary: string | null
  tags: string[] | null
  submitted_by: string | null
  created_at: string
  submitted_by_profile?: {
    id: string
    email: string
    full_name: string | null
  } | null
}

interface VideoItem {
  id: string
  title: string
  video_url: string
  description: string | null
  thumbnail_url: string | null
  category: string | null
  tags: string[] | null
  platform: string | null
  pinned: boolean
  created_at: string
  submitted_by_profile?: {
    id: string
    email: string
    full_name: string | null
  } | null
}

type MediaType = 'all' | 'must-reads' | 'videos' | 'news'
type SortField = 'title' | 'date' | 'category'

export default function MediaPage() {
  const { user, loading: authLoading } = useAuth()
  const { mode } = useMode()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<MediaType>('all')
  const [mustReads, setMustReads] = useState<MustRead[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [news, setNews] = useState<any[]>([]) // Placeholder for news
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Get card style for media using RED SYSTEM (Video/Media)
  // RED SYSTEM: Crimson (#C41E3A), Ocean Blue (#00A3E0), Peach (#FFD4C4)
  const getCardStyle = () => {
    if (mode === 'chaos') {
      return { bg: 'bg-[#C41E3A]', border: 'border-0', text: 'text-white', accent: '#00A3E0' } // Crimson bg with Ocean Blue accent (RED SYSTEM)
    } else if (mode === 'chill') {
      return { bg: 'bg-white', border: 'border border-[#C41E3A]/30', text: 'text-[#4A1818]', accent: '#00A3E0' }
    } else {
      return { bg: 'bg-[#000000]', border: 'border border-[#C41E3A]', text: 'text-[#FFFFFF]', accent: '#00A3E0' }
    }
  }

  const style = getCardStyle()

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

  const getRoundedClass = (base: string) => {
    if (mode === 'code') return 'rounded-none'
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    return base
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch all media data
  useEffect(() => {
    async function fetchMedia() {
      if (!user) return

      setLoading(true)
      try {
        // Fetch all data in parallel
        const [mustReadsRes, videosRes] = await Promise.all([
          fetch('/api/must-reads'),
          fetch('/api/videos')
        ])

        if (mustReadsRes.ok) {
          const mustReadsData = await mustReadsRes.json()
          setMustReads(mustReadsData.data || [])
        }

        if (videosRes.ok) {
          const videosData = await videosRes.json()
          setVideos(videosData.data || [])
        }

        // News placeholder - will be implemented later
        setNews([])
      } catch (error) {
        console.error('Error fetching media:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMedia()
  }, [user])

  // Filter and sort combined results
  const getFilteredAndSortedItems = () => {
    let items: any[] = []

    // Combine items based on active tab
    if (activeTab === 'all' || activeTab === 'must-reads') {
      items = [...items, ...mustReads.map(mr => ({ ...mr, type: 'must-read' as const }))]
    }
    if (activeTab === 'all' || activeTab === 'videos') {
      items = [...items, ...videos.map(v => ({ ...v, type: 'video' as const }))]
    }
    if (activeTab === 'all' || activeTab === 'news') {
      items = [...items, ...news.map(n => ({ ...n, type: 'news' as const }))]
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      items = items.filter(item => {
        if (item.type === 'must-read') {
          return item.article_title?.toLowerCase().includes(query) ||
                 item.article_url?.toLowerCase().includes(query) ||
                 item.notes?.toLowerCase().includes(query) ||
                 item.source?.toLowerCase().includes(query) ||
                 item.summary?.toLowerCase().includes(query) ||
                 item.tags?.some((tag: string) => tag.toLowerCase().includes(query))
        } else if (item.type === 'video') {
          return item.title?.toLowerCase().includes(query) ||
                 item.description?.toLowerCase().includes(query) ||
                 item.category?.toLowerCase().includes(query) ||
                 item.tags?.some((tag: string) => tag.toLowerCase().includes(query))
        }
        return true
      })
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      items = items.filter(item => {
        if (item.type === 'must-read') {
          return item.category === filterCategory
        } else if (item.type === 'video') {
          return item.category === filterCategory
        }
        return false
      })
    }

    // Apply sorting
    items.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      if (sortBy === 'title') {
        aValue = (a.type === 'must-read' ? a.article_title : a.title || '').toLowerCase()
        bValue = (b.type === 'must-read' ? b.article_title : b.title || '').toLowerCase()
      } else if (sortBy === 'category') {
        aValue = (a.category || '').toLowerCase()
        bValue = (b.category || '').toLowerCase()
      } else {
        // date
        aValue = new Date(a.created_at || 0).getTime()
        bValue = new Date(b.created_at || 0).getTime()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return items
  }

  const filteredItems = getFilteredAndSortedItems()

  // Get unique categories
  const categories = Array.from(new Set([
    ...mustReads.map(mr => mr.category).filter(Boolean),
    ...videos.map(v => v.category).filter(Boolean)
  ])) as string[]

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-gray-700" />
      : <ArrowDown className="w-3 h-3 text-gray-700" />
  }

  if (!user && !authLoading) {
    return null
  }

  return (
    <div className={`flex flex-col min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <SiteHeader />

      <main className="max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24">
        {loading && (
          <div className="text-center py-8 mb-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: style.accent }} />
            <p className={getTextClass()}>Loading media...</p>
          </div>
        )}
        <div className="flex gap-6">
          {/* Left Sidebar Card */}
          <Card className={`w-80 ${mode === 'chaos' ? 'bg-[#C41E3A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')} p-6 flex flex-col h-fit`} style={{ 
            borderColor: mode === 'chaos' ? '#00A3E0' : mode === 'chill' ? '#C41E3A' : '#C41E3A',
            borderWidth: mode === 'chaos' ? '2px' : mode === 'chill' ? '2px' : '2px'
          }}>
            {/* Navigation Section */}
            <div className="mb-6">
              <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${mode === 'chill' ? 'text-[#4A1818]' : mode === 'chaos' ? 'text-white' : 'text-white'}`}>
                ▼ NAVIGATION
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    activeTab === 'all'
                      ? mode === 'chaos'
                        ? 'bg-[#00A3E0] text-white'
                        : mode === 'chill'
                        ? 'bg-[#00A3E0] text-white'
                        : 'bg-[#00A3E0] text-white'
                      : mode === 'chaos'
                      ? 'bg-[#00A3E0]/30 text-white/80 hover:bg-[#00A3E0]/50'
                      : mode === 'chill'
                      ? 'bg-[#00A3E0]/20 text-[#4A1818]/60 hover:bg-[#00A3E0]/30'
                      : 'bg-[#00A3E0]/30 text-white/60 hover:bg-[#00A3E0]/50'
                  }`}
                >
                  <span className="font-black uppercase text-sm">All Media</span>
                  <span className="ml-auto text-xs opacity-60">{mustReads.length + videos.length + news.length}</span>
                </button>
                <button
                  onClick={() => setActiveTab('must-reads')}
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    activeTab === 'must-reads'
                      ? mode === 'chaos'
                        ? 'bg-[#00A3E0] text-white'
                        : mode === 'chill'
                        ? 'bg-[#00A3E0] text-white'
                        : 'bg-[#00A3E0] text-white'
                      : mode === 'chaos'
                      ? 'bg-[#00A3E0]/30 text-white/80 hover:bg-[#00A3E0]/50'
                      : mode === 'chill'
                      ? 'bg-[#00A3E0]/20 text-[#4A1818]/60 hover:bg-[#00A3E0]/30'
                      : 'bg-[#00A3E0]/30 text-white/60 hover:bg-[#00A3E0]/50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">Must Reads</span>
                  <span className="ml-auto text-xs opacity-60">{mustReads.length}</span>
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    activeTab === 'videos'
                      ? mode === 'chaos'
                        ? 'bg-[#00A3E0] text-white'
                        : mode === 'chill'
                        ? 'bg-[#00A3E0] text-white'
                        : 'bg-[#00A3E0] text-white'
                      : mode === 'chaos'
                      ? 'bg-[#00A3E0]/30 text-white/80 hover:bg-[#00A3E0]/50'
                      : mode === 'chill'
                      ? 'bg-[#00A3E0]/20 text-[#4A1818]/60 hover:bg-[#00A3E0]/30'
                      : 'bg-[#00A3E0]/30 text-white/60 hover:bg-[#00A3E0]/50'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">Videos</span>
                  <span className="ml-auto text-xs opacity-60">{videos.length}</span>
                </button>
                <button
                  onClick={() => setActiveTab('news')}
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    activeTab === 'news'
                      ? mode === 'chaos'
                        ? 'bg-[#00A3E0] text-white'
                        : mode === 'chill'
                        ? 'bg-[#00A3E0] text-white'
                        : 'bg-[#00A3E0] text-white'
                      : mode === 'chaos'
                      ? 'bg-[#00A3E0]/30 text-white/80 hover:bg-[#00A3E0]/50'
                      : mode === 'chill'
                      ? 'bg-[#00A3E0]/20 text-[#4A1818]/60 hover:bg-[#00A3E0]/30'
                      : 'bg-[#00A3E0]/30 text-white/60 hover:bg-[#00A3E0]/50'
                  }`}
                >
                  <Newspaper className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">News</span>
                  <span className="ml-auto text-xs opacity-60">{news.length}</span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className={`h-px mb-6 ${mode === 'chaos' ? 'bg-[#00A3E0]/40' : mode === 'chill' ? 'bg-[#4A1818]/20' : 'bg-white/20'}`}></div>

            {/* Back to Dashboard */}
            <div className="mt-auto">
              <Link
                href="/"
                className={`flex items-center gap-2 px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all ${
                  mode === 'chaos'
                    ? 'bg-[#00A3E0]/30 text-white/80 hover:bg-[#00A3E0]/50'
                    : mode === 'chill'
                    ? 'bg-[#00A3E0]/20 text-[#4A1818]/60 hover:bg-[#00A3E0]/30'
                    : 'bg-[#00A3E0]/30 text-white/60 hover:bg-[#00A3E0]/50'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="font-black uppercase text-sm">← Back to Dashboard</span>
              </Link>
            </div>
          </Card>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Header */}
            <div className="mb-8">
              <h1 className={`text-4xl font-black uppercase ${getTextClass()}`}>MEDIA ARCHIVE</h1>
              <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'} mt-2`}>
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5`} style={{ color: style.accent }} />
                <Input
                  type="text"
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-12 pr-4 h-12 ${getRoundedClass('rounded-xl')} ${
                    mode === 'chill' 
                      ? 'bg-white border-gray-300 text-[#4A1818] placeholder:text-gray-400' 
                      : mode === 'chaos'
                      ? 'bg-black/40 border-2 text-white placeholder:text-white/60'
                      : 'bg-black/40 border-2 text-white placeholder:text-white/60'
                  }`}
                  style={{
                    borderColor: mode === 'chaos' || mode === 'code' ? style.accent : undefined
                  }}
                />
              </div>

              {/* Filters and Sort */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Category Filter */}
                {categories.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Filter className={`w-4 h-4 ${getTextClass()}/70`} />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className={`h-12 px-4 ${getRoundedClass('rounded-xl')} text-sm font-medium border-2 focus:outline-none focus:ring-2 ${
                        mode === 'chill' 
                          ? 'bg-white border-gray-300 text-[#4A1818] focus:ring-[#00A3E0]' 
                          : mode === 'chaos'
                          ? 'bg-black/40 text-white focus:ring-white'
                          : 'bg-black/40 text-white focus:ring-white'
                      }`}
                      style={{
                        borderColor: mode === 'chaos' || mode === 'code' ? style.accent : undefined
                      }}
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className={`w-4 h-4 ${getTextClass()}/70`} />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortField)}
                    className={`h-12 px-4 ${getRoundedClass('rounded-xl')} text-sm font-medium border-2 focus:outline-none focus:ring-2 ${
                      mode === 'chill' 
                        ? 'bg-white border-gray-300 text-[#4A1818] focus:ring-[#00A3E0]' 
                        : mode === 'chaos'
                        ? 'bg-black/40 text-white focus:ring-white'
                        : 'bg-black/40 text-white focus:ring-white'
                    }`}
                    style={{
                      borderColor: mode === 'chaos' || mode === 'code' ? style.accent : undefined
                    }}
                  >
                    <option value="date">Date</option>
                    <option value="title">Title</option>
                    <option value="category">Category</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className={`h-12 px-4 ${getRoundedClass('rounded-xl')} border-2 flex items-center justify-center transition-colors ${
                      mode === 'chill' 
                        ? 'bg-white border-gray-300 text-[#4A1818] hover:bg-gray-50' 
                        : mode === 'chaos'
                        ? 'bg-black/40 text-white hover:bg-black/60'
                        : 'bg-black/40 text-white hover:bg-black/60'
                    }`}
                    style={{
                      borderColor: mode === 'chaos' || mode === 'code' ? style.accent : undefined
                    }}
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Media Items Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className={`text-lg ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>
                  No media found. Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`${getRoundedClass('rounded-xl')} p-4 h-full flex flex-col ${
                      mode === 'chill' 
                        ? 'bg-white border-gray-200' 
                        : mode === 'chaos'
                        ? 'bg-[#2A2A2A] border-[#333333]'
                        : 'bg-[#1a1a1a] border-white'
                    }`}
                  >
                    {item.type === 'must-read' ? (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className={`w-4 h-4 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`} />
                            <Badge 
                              variant="outline"
                              className={`${getRoundedClass('rounded')} text-xs`}
                              style={{
                                borderColor: style.accent,
                                color: style.accent
                              }}
                            >
                              Article
                            </Badge>
                          </div>
                          {item.pinned && (
                            <Badge className="bg-yellow-500 text-black text-xs">Pinned</Badge>
                          )}
                        </div>
                        <h3 className={`font-bold text-lg mb-2 ${mode === 'chill' ? 'text-gray-900' : 'text-white'} line-clamp-2`}>
                          {item.article_title}
                        </h3>
                        {item.summary && (
                          <p className={`text-sm mb-3 ${mode === 'chill' ? 'text-gray-600' : 'text-gray-300'} line-clamp-2`}>
                            {item.summary}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.category && (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                          {item.source && (
                            <Badge variant="outline" className="text-xs">
                              {item.source}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-auto">
                          <a
                            href={item.article_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 text-sm font-semibold ${
                              mode === 'chill' ? 'text-[#4A1818] hover:text-[#3A1414]' : 'text-white hover:text-gray-300'
                            } transition-colors`}
                          >
                            Read Article
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </>
                    ) : item.type === 'video' ? (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Video className={`w-4 h-4 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`} />
                            <Badge 
                              variant="outline"
                              className={`${getRoundedClass('rounded')} text-xs`}
                              style={{
                                borderColor: style.accent,
                                color: style.accent
                              }}
                            >
                              Video
                            </Badge>
                          </div>
                          {item.pinned && (
                            <Badge className="bg-yellow-500 text-black text-xs">Pinned</Badge>
                          )}
                        </div>
                        <h3 className={`font-bold text-lg mb-2 ${mode === 'chill' ? 'text-gray-900' : 'text-white'} line-clamp-2`}>
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className={`text-sm mb-3 ${mode === 'chill' ? 'text-gray-600' : 'text-gray-300'} line-clamp-2`}>
                            {item.description}
                          </p>
                        )}
                        <div className="mb-3">
                          <VideoEmbed
                            videoUrl={item.video_url}
                            platform={item.platform}
                            thumbnailUrl={item.thumbnail_url}
                            aspectRatio="16/9"
                            className="rounded-lg"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.category && (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-auto">
                          <a
                            href={item.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 text-sm font-semibold ${
                              mode === 'chill' ? 'text-[#4A1818] hover:text-[#3A1414]' : 'text-white hover:text-gray-300'
                            } transition-colors`}
                          >
                            Watch Video
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

