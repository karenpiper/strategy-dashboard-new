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
import { Footer } from '@/components/footer'

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

interface NewsItem {
  id: string
  title: string
  content: string | null
  url: string | null
  category: string | null
  tags: string[] | null
  pinned: boolean
  published_date: string
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
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // RED SYSTEM colors for media page
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

  const getRoundedClass = (base: string) => {
    if (mode === 'code') {
      return base.replace(/rounded(-[tblr]{1,2})?(-\w+)?/g, (match, direction) => {
        return direction ? `rounded${direction}-none` : 'rounded-none'
      })
    }
    if (mode === 'chaos') {
      // Replace rounded classes, preserving direction (t, b, l, r, tl, tr, bl, br)
      return base.replace(/rounded(-[tblr]{1,2})?(-\w+)?/g, (match, direction) => {
        return direction ? `rounded${direction}-[1.5rem]` : 'rounded-[1.5rem]'
      })
    }
    if (mode === 'chill') {
      // Replace rounded classes, preserving direction
      return base.replace(/rounded(-[tblr]{1,2})?(-\w+)?/g, (match, direction) => {
        return direction ? `rounded${direction}-2xl` : 'rounded-2xl'
      })
    }
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
        const [mustReadsRes, videosRes, newsRes] = await Promise.all([
          fetch('/api/must-reads'),
          fetch('/api/videos'),
          fetch('/api/news')
        ])

        if (mustReadsRes.ok) {
          const mustReadsData = await mustReadsRes.json()
          setMustReads(mustReadsData.data || [])
        }

        if (videosRes.ok) {
          const videosData = await videosRes.json()
          setVideos(videosData.data || [])
        }

        if (newsRes.ok) {
          const newsData = await newsRes.json()
          setNews(newsData.data || [])
        }
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
        } else if (item.type === 'news') {
          return item.title?.toLowerCase().includes(query) ||
                 item.content?.toLowerCase().includes(query) ||
                 item.url?.toLowerCase().includes(query) ||
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
        } else if (item.type === 'news') {
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
        // date - use published_date for news, created_at for others
        const aDate = a.type === 'news' ? (a.published_date || a.created_at) : a.created_at
        const bDate = b.type === 'news' ? (b.published_date || b.created_at) : b.created_at
        aValue = new Date(aDate || 0).getTime()
        bValue = new Date(bDate || 0).getTime()
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
    ...videos.map(v => v.category).filter(Boolean),
    ...news.map(n => n.category).filter(Boolean)
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

      <main className="w-full max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24">
        {loading && (
          <div className="text-center py-8 mb-8">
            <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${getTextClass()}`} />
            <p className={getTextClass()}>Loading media...</p>
          </div>
        )}
        <div className="flex gap-6 w-full">
          {/* Left Sidebar Card - RED SYSTEM background */}
          <Card className={`w-80 flex-shrink-0 min-w-80 ${mode === 'chaos' ? 'bg-[#FF4C4C]' : mode === 'chill' ? 'bg-[#FFD4C4]' : 'bg-[#C41E3A]'} ${getRoundedClass('rounded-2xl')} p-6 flex flex-col h-fit border-0`}>
            {/* Navigation Section */}
            <div className="mb-6">
              <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`}>
                ▼ NAVIGATION
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    activeTab === 'all'
                      ? 'text-white'
                      : mode === 'chill'
                      ? 'bg-white/50 text-[#4A1818]/80 hover:bg-white/70'
                      : 'bg-black/20 text-black/80 hover:bg-black/30'
                  }`}
                  style={activeTab === 'all' ? { backgroundColor: redSystem.button } : {}}
                >
                  <span className="font-black uppercase text-sm">All Media</span>
                  <span className="ml-auto text-xs opacity-60">{mustReads.length + videos.length + news.length}</span>
                </button>
                <button
                  onClick={() => setActiveTab('must-reads')}
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    activeTab === 'must-reads'
                      ? 'text-white'
                      : mode === 'chill'
                      ? 'bg-white/50 text-[#4A1818]/80 hover:bg-white/70'
                      : 'bg-black/20 text-black/80 hover:bg-black/30'
                  }`}
                  style={activeTab === 'must-reads' ? { backgroundColor: redSystem.button } : {}}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">Must Reads</span>
                  <span className="ml-auto text-xs opacity-60">{mustReads.length}</span>
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    activeTab === 'videos'
                      ? 'text-white'
                      : mode === 'chill'
                      ? 'bg-white/50 text-[#4A1818]/80 hover:bg-white/70'
                      : 'bg-black/20 text-black/80 hover:bg-black/30'
                  }`}
                  style={activeTab === 'videos' ? { backgroundColor: redSystem.button } : {}}
                >
                  <Video className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">Videos</span>
                  <span className="ml-auto text-xs opacity-60">{videos.length}</span>
                </button>
                <button
                  onClick={() => setActiveTab('news')}
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    activeTab === 'news'
                      ? 'text-white'
                      : mode === 'chill'
                      ? 'bg-white/50 text-[#4A1818]/80 hover:bg-white/70'
                      : 'bg-black/20 text-black/80 hover:bg-black/30'
                  }`}
                  style={activeTab === 'news' ? { backgroundColor: redSystem.button } : {}}
                >
                  <Newspaper className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">News</span>
                  <span className="ml-auto text-xs opacity-60">{news.length}</span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className={`h-px mb-6 ${mode === 'chill' ? 'bg-[#4A1818]/20' : 'bg-black/20'}`}></div>

            {/* Back to Dashboard */}
            <div className="mt-auto">
              <Link
                href="/"
                className={`flex items-center gap-2 px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all ${
                  mode === 'chill'
                    ? 'bg-white/50 text-[#4A1818]/80 hover:bg-white/70'
                    : 'bg-black/20 text-black/80 hover:bg-black/30'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="font-black uppercase text-sm">← Back to Dashboard</span>
              </Link>
            </div>
          </Card>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-8">
              <h1 className={`text-4xl font-black uppercase ${getTextClass()}`}>MEDIA ARCHIVE</h1>
              <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'} mt-2`}>
                {loading ? 'Loading...' : `${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'items'}`}
              </p>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${getTextClass()}/50`} />
                <Input
                  type="text"
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-12 pr-4 h-12 ${getRoundedClass('rounded-xl')} ${
                    mode === 'chill' 
                      ? 'bg-white border-gray-300 text-[#4A1818] placeholder:text-gray-400' 
                      : mode === 'chaos'
                      ? 'bg-black/30 border-gray-600 text-white placeholder:text-gray-500'
                      : 'bg-black/30 border-gray-600 text-white placeholder:text-gray-500'
                  }`}
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
                      className={`h-12 px-4 ${getRoundedClass('rounded-xl')} text-sm font-medium border focus:outline-none focus:ring-2 ${
                        mode === 'chill' 
                          ? 'bg-white border-gray-300 text-[#4A1818] focus:ring-gray-400' 
                          : mode === 'chaos'
                          ? 'bg-black/30 border-gray-600 text-white focus:ring-gray-500'
                          : 'bg-black/30 border-gray-600 text-white focus:ring-gray-500'
                      }`}
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
                    className={`h-12 px-4 ${getRoundedClass('rounded-xl')} text-sm font-medium border focus:outline-none focus:ring-2 ${
                      mode === 'chill' 
                        ? 'bg-white border-gray-300 text-[#4A1818] focus:ring-gray-400' 
                        : mode === 'chaos'
                        ? 'bg-black/30 border-gray-600 text-white focus:ring-gray-500'
                        : 'bg-black/30 border-gray-600 text-white focus:ring-gray-500'
                    }`}
                  >
                    <option value="date">Date</option>
                    <option value="title">Title</option>
                    <option value="category">Category</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className={`h-12 px-4 ${getRoundedClass('rounded-xl')} border flex items-center justify-center transition-colors ${
                      mode === 'chill' 
                        ? 'bg-white border-gray-300 text-[#4A1818] hover:bg-gray-50' 
                        : mode === 'chaos'
                        ? 'bg-black/30 border-gray-600 text-white hover:bg-black/50'
                        : 'bg-black/30 border-gray-600 text-white hover:bg-black/50'
                    }`}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`${getBgClass()} border ${mode === 'chaos' ? 'border-gray-800' : mode === 'chill' ? 'border-gray-300' : 'border-gray-700'} ${getRoundedClass('rounded-2xl')} overflow-hidden p-2`}
                  >
                    <div className="flex flex-col">
                    {item.type === 'must-read' ? (
                      <>
                        <div className="flex items-start justify-between mb-3 px-4 pt-2">
                          <div className="flex items-center gap-2">
                            <BookOpen className={`w-4 h-4 ${getTextClass()}/70`} />
                            <div className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'} w-fit`}>
                              <span className={`text-xs font-medium ${getTextClass()}`}>Article</span>
                            </div>
                          </div>
                          {item.pinned && (
                            <Badge className="bg-yellow-500 text-black text-xs">Pinned</Badge>
                          )}
                        </div>
                        <h3 className={`text-xl font-black uppercase ${getTextClass()} mb-2 px-4 line-clamp-2`}>
                          {item.article_title}
                        </h3>
                        {item.summary && (
                          <p className={`text-sm ${getTextClass()}/80 mb-3 px-4 line-clamp-2`}>
                            {item.summary}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3 px-4">
                          {item.category && (
                            <div className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'} w-fit`}>
                              <span className={`text-xs font-medium ${getTextClass()}`}>{item.category}</span>
                            </div>
                          )}
                          {item.source && (
                            <div className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'} w-fit`}>
                              <span className={`text-xs font-medium ${getTextClass()}`}>{item.source}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-auto px-4 pb-4">
                          <a
                            href={item.article_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 text-sm font-semibold ${getTextClass()} hover:opacity-70 transition-opacity`}
                          >
                            Read Article
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </>
                    ) : item.type === 'video' ? (
                      <>
                        <div className="flex items-start justify-between mb-3 px-4 pt-2">
                          <div className="flex items-center gap-2">
                            <Video className={`w-4 h-4 ${getTextClass()}/70`} />
                            <div className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'} w-fit`}>
                              <span className={`text-xs font-medium ${getTextClass()}`}>Video</span>
                            </div>
                          </div>
                          {item.pinned && (
                            <Badge className="bg-yellow-500 text-black text-xs">Pinned</Badge>
                          )}
                        </div>
                        <h3 className={`text-xl font-black uppercase ${getTextClass()} mb-2 px-4 line-clamp-2`}>
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className={`text-sm ${getTextClass()}/80 mb-3 px-4 line-clamp-2`}>
                            {item.description}
                          </p>
                        )}
                        <div className="mb-3 px-4">
                          <VideoEmbed
                            videoUrl={item.video_url}
                            platform={item.platform}
                            thumbnailUrl={item.thumbnail_url}
                            aspectRatio="16/9"
                            className={getRoundedClass('rounded-xl')}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3 px-4">
                          {item.category && (
                            <div className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'} w-fit`}>
                              <span className={`text-xs font-medium ${getTextClass()}`}>{item.category}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-auto px-4 pb-4">
                          <a
                            href={item.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 text-sm font-semibold ${getTextClass()} hover:opacity-70 transition-opacity`}
                          >
                            Watch Video
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </>
                    ) : item.type === 'news' ? (
                      <>
                        <div className="flex items-start justify-between mb-3 px-4 pt-2">
                          <div className="flex items-center gap-2">
                            <Newspaper className={`w-4 h-4 ${getTextClass()}/70`} />
                            <div className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'} w-fit`}>
                              <span className={`text-xs font-medium ${getTextClass()}`}>News</span>
                            </div>
                          </div>
                          {item.pinned && (
                            <Badge className="bg-yellow-500 text-black text-xs">Pinned</Badge>
                          )}
                        </div>
                        <h3 className={`text-xl font-black uppercase ${getTextClass()} mb-2 px-4 line-clamp-2`}>
                          {item.title}
                        </h3>
                        {item.content && (
                          <p className={`text-sm ${getTextClass()}/80 mb-3 px-4 line-clamp-3`}>
                            {item.content}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3 px-4">
                          {item.category && (
                            <div className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'} w-fit`}>
                              <span className={`text-xs font-medium ${getTextClass()}`}>{item.category}</span>
                            </div>
                          )}
                          {item.tags && item.tags.length > 0 && item.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <div key={idx} className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'} w-fit`}>
                              <span className={`text-xs font-medium ${getTextClass()}`}>{tag}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-auto px-4 pb-4">
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-2 text-sm font-semibold ${getTextClass()} hover:opacity-70 transition-opacity`}
                            >
                              Read More
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : (
                            <div className={`text-xs ${getTextClass()}/60`}>
                              Published {new Date(item.published_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </>
                    ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <Footer />
      </main>
    </div>
  )
}

