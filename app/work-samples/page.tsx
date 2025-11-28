'use client'

import { useState, useEffect } from 'react'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ExternalLink, User, Calendar, Filter, ArrowUpDown, ArrowUp, ArrowDown, Grid3x3, List, Home } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { SiteHeader } from '@/components/site-header'
import { Footer } from '@/components/footer'

interface WorkSample {
  id: string
  project_name: string
  description: string
  type_id?: string | null
  type?: { id?: string; name: string } | null
  author_id?: string | null
  author?: { id?: string; full_name?: string; email?: string } | null
  client?: string | null
  date: string
  thumbnail_url?: string | null
  file_url?: string | null
  file_link?: string | null
  pitch_won?: boolean | null
}

export default function WorkSamplesPage() {
  const { mode } = useMode()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [workSamples, setWorkSamples] = useState<WorkSample[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [filterAuthorId, setFilterAuthorId] = useState<string | null>(null)
  const [filterTypeId, setFilterTypeId] = useState<string | null>(null)
  const [filterClient, setFilterClient] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'thumbnails' | 'list'>('thumbnails')
  
  // Unique values for filters (extracted from work samples)
  const [uniqueAuthors, setUniqueAuthors] = useState<Array<{ id: string; name: string }>>([])
  const [uniqueTypes, setUniqueTypes] = useState<Array<{ id: string; name: string }>>([])
  const [uniqueClients, setUniqueClients] = useState<string[]>([])

  // Theme-aware styling helpers (matching main dashboard)
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

  // BLUE SYSTEM colors for work page
  // Primary: Sky Blue (#4A90E2), Primary Pair: Navy (#1E3A5F), Complementary: Teal (#2DD4BF), Contrast: Coral (#FF6B6B)
  const getBlueSystemColors = () => {
    if (mode === 'chaos') {
      return {
        primary: '#4A90E2',      // Sky Blue
        primaryPair: '#1E3A5F',   // Navy
        complementary: '#2DD4BF', // Teal
        contrast: '#FF6B6B',      // Coral
        bg: '#1A1A1A',
        text: '#FFFFFF',
        cardBg: '#2A2A2A'
      }
    } else if (mode === 'chill') {
      return {
        primary: '#4A90E2',      // Sky Blue
        primaryPair: '#1E3A5F',   // Navy
        complementary: '#2DD4BF', // Teal
        contrast: '#FF6B6B',      // Coral
        bg: '#F5E6D3',
        text: '#4A1818',
        cardBg: '#FFFFFF'
      }
    } else {
      return {
        primary: '#FFFFFF',
        primaryPair: '#808080',
        complementary: '#666666',
        contrast: '#FFFFFF',
        bg: '#000000',
        text: '#FFFFFF',
        cardBg: '#1a1a1a'
      }
    }
  }

  const blueColors = getBlueSystemColors()

  const textStyle = getTextClass()
  const bgStyle = getBgClass()

  // Fetch work samples
  useEffect(() => {
    async function fetchWorkSamples() {
      if (!user) return
      
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (searchQuery) params.set('search', searchQuery)
        if (filterAuthorId) params.set('author_id', filterAuthorId)
        if (filterTypeId) params.set('type_id', filterTypeId)
        if (filterClient) params.set('client', filterClient)
        params.set('sortBy', sortBy)
        params.set('sortOrder', sortOrder)
        
        const response = await fetch(`/api/work-samples?${params.toString()}`)
        if (response.ok) {
          const result = await response.json()
          if (result.data && Array.isArray(result.data)) {
            setWorkSamples(result.data)
            
            // Extract unique values for filters
            const authors = new Map<string, { id: string; name: string }>()
            const types = new Map<string, { id: string; name: string }>()
            const clients = new Set<string>()
            
            result.data.forEach((sample: WorkSample) => {
              // Use author_id from the sample
              if (sample.author_id && sample.author && !authors.has(sample.author_id)) {
                authors.set(sample.author_id, {
                  id: sample.author_id,
                  name: sample.author.full_name || sample.author.email || 'Unknown'
                })
              }
              // Use type_id from the sample
              if (sample.type_id && sample.type && !types.has(sample.type_id)) {
                types.set(sample.type_id, {
                  id: sample.type_id,
                  name: sample.type.name
                })
              }
              if (sample.client) {
                clients.add(sample.client)
              }
            })
            
            setUniqueAuthors(Array.from(authors.values()).sort((a, b) => a.name.localeCompare(b.name)))
            setUniqueTypes(Array.from(types.values()).sort((a, b) => a.name.localeCompare(b.name)))
            setUniqueClients(Array.from(clients).sort())
          }
        }
      } catch (error) {
        console.error('Error fetching work samples:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchWorkSamples()
  }, [user, searchQuery, filterAuthorId, filterTypeId, filterClient, sortBy, sortOrder])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim())
    }
    router.push(`/work-samples${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <div className={`flex flex-col min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <SiteHeader />

      <main className="w-full max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24">
        <div className="flex gap-6 w-full">
          {/* Left Sidebar Card - Curved, Non-scrolling - BLUE SYSTEM background */}
          <Card className={`w-80 flex-shrink-0 min-w-80 ${mode === 'chaos' ? 'bg-[#4A90E2]' : mode === 'chill' ? 'bg-[#2DD4BF]' : 'bg-[#1E3A5F]'} ${getRoundedClass('rounded-2xl')} p-6 flex flex-col h-fit border-0 sticky top-24 self-start`}>
            {/* Filters Section */}
            <div className="mb-6">
              <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`}>
                ▼ FILTERS
              </h3>
              <div className="space-y-3">
                {/* Author Filter */}
                <div>
                  <label className={`text-xs font-medium mb-2 block ${mode === 'chill' ? 'text-[#4A1818]/80' : 'text-black/80'}`}>
                    Author
                  </label>
                  <select
                    value={filterAuthorId || 'all'}
                    onChange={(e) => setFilterAuthorId(e.target.value === 'all' ? null : e.target.value)}
                    className={`w-full h-10 px-3 ${getRoundedClass('rounded-xl')} text-sm font-medium border focus:outline-none focus:ring-2 ${
                      mode === 'chill' 
                        ? 'bg-white border-gray-300 text-[#4A1818] focus:ring-gray-400' 
                        : 'bg-white/90 border-white/50 text-black focus:ring-white'
                    }`}
                  >
                    <option value="all">All Authors</option>
                    {uniqueAuthors.map(author => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Type Filter */}
                <div>
                  <label className={`text-xs font-medium mb-2 block ${mode === 'chill' ? 'text-[#4A1818]/80' : 'text-black/80'}`}>
                    Type
                  </label>
                  <select
                    value={filterTypeId || 'all'}
                    onChange={(e) => setFilterTypeId(e.target.value === 'all' ? null : e.target.value)}
                    className={`w-full h-10 px-3 ${getRoundedClass('rounded-xl')} text-sm font-medium border focus:outline-none focus:ring-2 ${
                      mode === 'chill' 
                        ? 'bg-white border-gray-300 text-[#4A1818] focus:ring-gray-400' 
                        : 'bg-white/90 border-white/50 text-black focus:ring-white'
                    }`}
                  >
                    <option value="all">All Types</option>
                    {uniqueTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Client Filter */}
                <div>
                  <label className={`text-xs font-medium mb-2 block ${mode === 'chill' ? 'text-[#4A1818]/80' : 'text-black/80'}`}>
                    Client
                  </label>
                  <select
                    value={filterClient || 'all'}
                    onChange={(e) => setFilterClient(e.target.value === 'all' ? null : e.target.value)}
                    className={`w-full h-10 px-3 ${getRoundedClass('rounded-xl')} text-sm font-medium border focus:outline-none focus:ring-2 ${
                      mode === 'chill' 
                        ? 'bg-white border-gray-300 text-[#4A1818] focus:ring-gray-400' 
                        : 'bg-white/90 border-white/50 text-black focus:ring-white'
                    }`}
                  >
                    <option value="all">All Clients</option>
                    {uniqueClients.map(client => (
                      <option key={client} value={client}>
                        {client}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className={`h-px mb-6 ${mode === 'chill' ? 'bg-[#4A1818]/20' : 'bg-black/20'}`}></div>

            {/* View Toggle Section */}
            <div className="mb-6">
              <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`}>
                ▼ VIEW
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('thumbnails')}
                  className={`flex-1 h-10 px-4 ${getRoundedClass('rounded-xl')} transition-all flex items-center justify-center ${
                    viewMode === 'thumbnails'
                      ? 'text-white'
                      : mode === 'chill'
                      ? 'bg-white/50 text-[#4A1818]/80 hover:bg-white/70'
                      : 'bg-black/20 text-black/80 hover:bg-black/30'
                  }`}
                  style={viewMode === 'thumbnails' ? { backgroundColor: blueColors.contrast } : {}}
                  title="Grid View"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 h-10 px-4 ${getRoundedClass('rounded-xl')} transition-all flex items-center justify-center ${
                    viewMode === 'list'
                      ? 'text-white'
                      : mode === 'chill'
                      ? 'bg-white/50 text-[#4A1818]/80 hover:bg-white/70'
                      : 'bg-black/20 text-black/80 hover:bg-black/30'
                  }`}
                  style={viewMode === 'list' ? { backgroundColor: blueColors.contrast } : {}}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className={`h-px mb-6 ${mode === 'chill' ? 'bg-[#4A1818]/20' : 'bg-black/20'}`}></div>

            {/* Sort Section */}
            <div className="mb-6">
              <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`}>
                ▼ SORT
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={`text-xs font-medium mb-2 block ${mode === 'chill' ? 'text-[#4A1818]/80' : 'text-black/80'}`}>
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`w-full h-10 px-3 ${getRoundedClass('rounded-xl')} text-sm font-medium border focus:outline-none focus:ring-2 ${
                      mode === 'chill' 
                        ? 'bg-white border-gray-300 text-[#4A1818] focus:ring-gray-400' 
                        : 'bg-white/90 border-white/50 text-black focus:ring-white'
                    }`}
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className={`w-full h-10 px-4 ${getRoundedClass('rounded-xl')} border flex items-center justify-center gap-2 transition-colors ${
                    mode === 'chill' 
                      ? 'bg-white border-gray-300 text-[#4A1818] hover:bg-gray-50' 
                      : 'bg-white/90 border-white/50 text-black hover:bg-white'
                  }`}
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </span>
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
                    : 'bg-white/30 text-black/80 hover:bg-white/50'
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
              <h1 className={`text-4xl font-black uppercase ${getTextClass()}`}>WORK</h1>
              <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'} mt-2`}>
                {loading ? 'Loading...' : `${workSamples.length} ${workSamples.length === 1 ? 'work sample' : 'work samples'}`}
              </p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${getTextClass()}/50`} />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search work samples..."
                  className={`pl-12 pr-4 h-12 ${getRoundedClass('rounded-xl')} ${
                    mode === 'chill' 
                      ? 'bg-white border-gray-300 text-[#4A1818] placeholder:text-gray-400' 
                      : mode === 'chaos'
                      ? 'bg-black/30 border-gray-600 text-white placeholder:text-gray-500'
                      : 'bg-black/30 border-gray-600 text-white placeholder:text-gray-500'
                  }`}
                />
              </form>
            </div>

            {/* Work Samples - Thumbnail or List View */}
            {loading ? (
              <div className="text-center py-12">
                <p className={getTextClass()}>Loading...</p>
              </div>
            ) : workSamples.length > 0 ? (
          viewMode === 'thumbnails' ? (
            /* Thumbnail Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {workSamples.map((sample) => (
                <Card key={sample.id} className={`${getBgClass()} border ${mode === 'chaos' ? 'border-gray-800' : mode === 'chill' ? 'border-gray-300' : 'border-gray-700'} ${getRoundedClass('rounded-2xl')} overflow-hidden p-2`}>
                  <div className="flex flex-col">
                    {/* Thumbnail */}
                    <div className="relative">
                      {sample.thumbnail_url ? (
                        <img 
                          src={
                            // Use proxy immediately for Airtable URLs (they're expired)
                            sample.thumbnail_url.includes('airtable.com') || sample.thumbnail_url.includes('airtableusercontent.com')
                              ? `/api/work-samples/thumbnail?url=${encodeURIComponent(sample.thumbnail_url)}`
                              // For Supabase URLs, try direct first, fallback to proxy on error
                              : sample.thumbnail_url
                          }
                          alt={sample.project_name}
                          className={`w-full aspect-video object-cover ${getRoundedClass('rounded-2xl')}`}
                          onError={(e) => {
                            // Try proxy if direct URL fails (for Supabase URLs)
                            const target = e.target as HTMLImageElement
                            const originalSrc = target.src
                            if (originalSrc.includes('supabase') && !originalSrc.includes('/api/work-samples/thumbnail')) {
                              target.src = `/api/work-samples/thumbnail?url=${encodeURIComponent(originalSrc)}`
                            } else {
                              // Hide broken image and show placeholder
                              target.style.display = 'none'
                              const placeholder = target.nextElementSibling as HTMLElement
                              if (placeholder) {
                                placeholder.style.display = 'flex'
                              }
                            }
                          }}
                        />
                      ) : null}
                      <div className={`w-full aspect-video ${getRoundedClass('rounded-2xl')} bg-gray-200 flex items-center justify-center ${sample.thumbnail_url ? 'hidden' : ''} border-b ${mode === 'chaos' ? 'border-gray-800' : mode === 'chill' ? 'border-gray-300' : 'border-gray-700'}`}>
                        <span className="text-gray-400 text-xs">No Image</span>
                      </div>
                      {/* Won Badge - appears over thumbnail when pitch is won */}
                      {sample.type?.name?.toLowerCase() === 'pitch' && sample.pitch_won && (
                        <div className={`absolute top-2 right-2 px-2 py-1 ${getRoundedClass('rounded-full')} bg-[#C4F500] text-black shadow-lg flex items-center gap-1 z-10`}>
                          <span className="text-xs font-black uppercase">Won</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-4 pt-2 flex flex-col gap-3">
                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${getTextClass()}/70`} />
                        <p className={`text-xs ${getTextClass()}/70`}>
                          {sample.date ? new Date(sample.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                        </p>
                      </div>
                      
                      {/* Title with external link */}
                      {(sample.file_link || sample.file_url) ? (
                        <a
                          href={sample.file_link || sample.file_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xl font-black uppercase ${getTextClass()} hover:opacity-70 transition-opacity flex items-center gap-2`}
                        >
                          {sample.project_name}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <h3 className={`text-xl font-black uppercase ${getTextClass()}`}>{sample.project_name}</h3>
                      )}
                      
                      {/* Client as badge */}
                      {sample.client && (
                        <div className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'} w-fit`}>
                          <span className={`text-xs font-medium ${getTextClass()}`}>{sample.client}</span>
                        </div>
                      )}
                      
                      {/* Type */}
                      {sample.type && (
                        <div className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'} w-fit`}>
                          <span className={`text-xs font-medium ${getTextClass()}`}>{sample.type.name}</span>
                        </div>
                      )}
                      
                      {/* Author */}
                      {sample.author && (
                        <div className="flex items-center gap-2">
                          <User className={`w-4 h-4 ${getTextClass()}/70`} />
                          <p className={`text-sm ${getTextClass()}/70`}>
                            {sample.author.full_name || sample.author.email}
                          </p>
                        </div>
                      )}
                      
                      {/* Description */}
                      {sample.description && (
                        <p className={`text-sm ${getTextClass()}/80 line-clamp-3`}>{sample.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {workSamples.map((sample) => (
                <Card key={sample.id} className={`${getBgClass()} border ${mode === 'chaos' ? 'border-gray-800' : mode === 'chill' ? 'border-gray-300' : 'border-gray-700'} ${getRoundedClass('rounded-2xl')} overflow-hidden`}>
                  <div className="flex flex-col md:flex-row gap-6 p-6">
                    {/* Thumbnail - Smaller in list view */}
                    <div className="flex-shrink-0 w-full md:w-48 relative">
                      {sample.thumbnail_url ? (
                        <img 
                          src={
                            sample.thumbnail_url.includes('airtable.com') || sample.thumbnail_url.includes('airtableusercontent.com')
                              ? `/api/work-samples/thumbnail?url=${encodeURIComponent(sample.thumbnail_url)}`
                              : sample.thumbnail_url
                          }
                          alt={sample.project_name}
                          className={`w-full h-32 md:h-full object-cover ${getRoundedClass('rounded-xl')}`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            const originalSrc = target.src
                            if (originalSrc.includes('supabase') && !originalSrc.includes('/api/work-samples/thumbnail')) {
                              target.src = `/api/work-samples/thumbnail?url=${encodeURIComponent(originalSrc)}`
                            } else {
                              target.style.display = 'none'
                              const placeholder = target.nextElementSibling as HTMLElement
                              if (placeholder) {
                                placeholder.style.display = 'flex'
                              }
                            }
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-32 md:h-full ${getRoundedClass('rounded-xl')} bg-gray-200 flex items-center justify-center ${sample.thumbnail_url ? 'hidden' : ''} border ${mode === 'chaos' ? 'border-gray-800' : mode === 'chill' ? 'border-gray-300' : 'border-gray-700'}`}>
                        <span className="text-gray-400 text-xs">No Image</span>
                      </div>
                      {/* Won Badge - appears over thumbnail when pitch is won */}
                      {sample.type?.name?.toLowerCase() === 'pitch' && sample.pitch_won && (
                        <div className={`absolute top-2 right-2 px-2 py-1 ${getRoundedClass('rounded-full')} bg-[#C4F500] text-black shadow-lg flex items-center gap-1 z-10`}>
                          <span className="text-xs font-black uppercase">Won</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col gap-3">
                      {/* Title with external link */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {(sample.file_link || sample.file_url) ? (
                            <a
                              href={sample.file_link || sample.file_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-xl font-black uppercase ${getTextClass()} hover:opacity-70 transition-opacity flex items-center gap-2`}
                            >
                              {sample.project_name}
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : (
                            <h3 className={`text-xl font-black uppercase ${getTextClass()}`}>{sample.project_name}</h3>
                          )}
                        </div>
                        {/* Date - Right aligned in list view */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Calendar className={`w-4 h-4 ${getTextClass()}/70`} />
                          <p className={`text-xs ${getTextClass()}/70 whitespace-nowrap`}>
                            {sample.date ? new Date(sample.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </p>
                        </div>
                      </div>
                      
                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {sample.client && (
                          <div className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'}`}>
                            <span className={`text-xs font-medium ${getTextClass()}`}>{sample.client}</span>
                          </div>
                        )}
                        {sample.type && (
                          <div className={`inline-flex items-center px-3 py-1 rounded ${getRoundedClass('rounded-md')} ${mode === 'chaos' ? 'bg-gray-800' : mode === 'chill' ? 'bg-gray-200' : 'bg-gray-800'}`}>
                            <span className={`text-xs font-medium ${getTextClass()}`}>{sample.type.name}</span>
                          </div>
                        )}
                        {sample.author && (
                          <div className="flex items-center gap-2">
                            <User className={`w-4 h-4 ${getTextClass()}/70`} />
                            <p className={`text-xs ${getTextClass()}/70`}>
                              {sample.author.full_name || sample.author.email}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Description - Full in list view */}
                      {sample.description && (
                        <p className={`text-sm ${getTextClass()}/80`}>{sample.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <p className={`text-lg ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>
              {searchQuery ? 'No work samples found matching your search.' : 'No work samples available.'}
            </p>
          </div>
        )}
          </div>
        </div>

        <Footer />
      </main>
    </div>
  )
}

