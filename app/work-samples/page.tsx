'use client'

import { useState, useEffect } from 'react'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ExternalLink, User, Calendar, Filter, ArrowUpDown, ArrowUp, ArrowDown, Grid3x3, List } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AccountMenu } from '@/components/account-menu'
import { ModeSwitcher } from '@/components/mode-switcher'

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
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <header className={`border-b ${getBorderClass()} px-6 py-4`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <div className={`w-10 h-10 ${getLogoBg()} ${getLogoText()} ${getRoundedClass('rounded-xl')} flex items-center justify-center font-black text-lg ${mode === 'code' ? 'font-mono' : ''}`}>
                {mode === 'code' ? 'C:\\>' : 'D'}
              </div>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className={getNavLinkClass()}>HOME</Link>
              <Link href="/vibes" className={getNavLinkClass()}>SNAPS</Link>
              <a href="#" className={getNavLinkClass()}>RESOURCES</a>
              <Link href="/work-samples" className={getNavLinkClass(true)}>WORK</Link>
              <a href="#" className={getNavLinkClass()}>TEAM</a>
              <Link href="/vibes" className={getNavLinkClass()}>VIBES</Link>
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
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className={`text-4xl font-black uppercase ${getTextClass()}`}>WORK ARCHIVE</h1>
          </div>
          
          {/* Filters and Search */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${getTextClass()}/50`} />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search work samples..."
                  className={`pl-10 h-12 ${getRoundedClass('rounded-xl')} ${mode === 'chaos' ? 'bg-black/30 border-gray-600 text-white placeholder:text-gray-500' : mode === 'chill' ? 'bg-white border-gray-300 text-[#4A1818] placeholder:text-gray-400' : 'bg-black/30 border-gray-600 text-white placeholder:text-gray-500'}`}
                />
              </div>
            </form>
            
            {/* Filters */}
            <div className="flex items-center gap-3">
              <Filter className={`w-4 h-4 ${getTextClass()}/70`} />
              
              {/* Author Filter */}
              <select
                value={filterAuthorId || 'all'}
                onChange={(e) => setFilterAuthorId(e.target.value === 'all' ? null : e.target.value)}
                className={`h-12 px-4 ${mode === 'chaos' ? 'bg-black/30 border-gray-600 text-white' : mode === 'chill' ? 'bg-white border-gray-300 text-[#4A1818]' : 'bg-black/30 border-gray-600 text-white'} border ${getRoundedClass('rounded-xl')} text-sm font-medium focus:outline-none focus:ring-2 ${mode === 'chaos' ? 'focus:ring-[#C4F500]' : mode === 'chill' ? 'focus:ring-[#FFC043]' : 'focus:ring-white'}`}
              >
                <option value="all">All Authors</option>
                {uniqueAuthors.map(author => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
              
              {/* Type Filter */}
              <select
                value={filterTypeId || 'all'}
                onChange={(e) => setFilterTypeId(e.target.value === 'all' ? null : e.target.value)}
                className={`h-12 px-4 ${mode === 'chaos' ? 'bg-black/30 border-gray-600 text-white' : mode === 'chill' ? 'bg-white border-gray-300 text-[#4A1818]' : 'bg-black/30 border-gray-600 text-white'} border ${getRoundedClass('rounded-xl')} text-sm font-medium focus:outline-none focus:ring-2 ${mode === 'chaos' ? 'focus:ring-[#C4F500]' : mode === 'chill' ? 'focus:ring-[#FFC043]' : 'focus:ring-white'}`}
              >
                <option value="all">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              
              {/* Client Filter */}
              <select
                value={filterClient || 'all'}
                onChange={(e) => setFilterClient(e.target.value === 'all' ? null : e.target.value)}
                className={`h-12 px-4 ${mode === 'chaos' ? 'bg-black/30 border-gray-600 text-white' : mode === 'chill' ? 'bg-white border-gray-300 text-[#4A1818]' : 'bg-black/30 border-gray-600 text-white'} border ${getRoundedClass('rounded-xl')} text-sm font-medium focus:outline-none focus:ring-2 ${mode === 'chaos' ? 'focus:ring-[#C4F500]' : mode === 'chill' ? 'focus:ring-[#FFC043]' : 'focus:ring-white'}`}
              >
                <option value="all">All Clients</option>
                {uniqueClients.map(client => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2 border-l pl-4 ml-4">
              <button
                onClick={() => setViewMode('thumbnails')}
                className={`h-12 px-4 ${mode === 'chaos' ? viewMode === 'thumbnails' ? 'bg-[#C4F500] text-black border-[#C4F500]' : 'bg-black/30 border-gray-600 text-white hover:bg-black/50' : mode === 'chill' ? viewMode === 'thumbnails' ? 'bg-[#FFC043] text-[#4A1818] border-[#FFC043]' : 'bg-white border-gray-300 text-[#4A1818] hover:bg-gray-50' : viewMode === 'thumbnails' ? 'bg-white text-black border-white' : 'bg-black/30 border-gray-600 text-white hover:bg-black/50'} border ${getRoundedClass('rounded-xl')} flex items-center justify-center transition-colors`}
                title="Thumbnail View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`h-12 px-4 ${mode === 'chaos' ? viewMode === 'list' ? 'bg-[#C4F500] text-black border-[#C4F500]' : 'bg-black/30 border-gray-600 text-white hover:bg-black/50' : mode === 'chill' ? viewMode === 'list' ? 'bg-[#FFC043] text-[#4A1818] border-[#FFC043]' : 'bg-white border-gray-300 text-[#4A1818] hover:bg-gray-50' : viewMode === 'list' ? 'bg-white text-black border-white' : 'bg-black/30 border-gray-600 text-white hover:bg-black/50'} border ${getRoundedClass('rounded-xl')} flex items-center justify-center transition-colors`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            
            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className={`w-4 h-4 ${getTextClass()}/70`} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`h-12 px-4 ${mode === 'chaos' ? 'bg-black/30 border-gray-600 text-white' : mode === 'chill' ? 'bg-white border-gray-300 text-[#4A1818]' : 'bg-black/30 border-gray-600 text-white'} border ${getRoundedClass('rounded-xl')} text-sm font-medium focus:outline-none focus:ring-2 ${mode === 'chaos' ? 'focus:ring-[#C4F500]' : mode === 'chill' ? 'focus:ring-[#FFC043]' : 'focus:ring-white'}`}
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="client">Client</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className={`h-12 px-4 ${mode === 'chaos' ? 'bg-black/30 border-gray-600 text-white hover:bg-black/50' : mode === 'chill' ? 'bg-white border-gray-300 text-[#4A1818] hover:bg-gray-50' : 'bg-black/30 border-gray-600 text-white hover:bg-black/50'} border ${getRoundedClass('rounded-xl')} flex items-center justify-center transition-colors`}
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
                <Card key={sample.id} className={`${getBgClass()} border ${mode === 'chaos' ? 'border-gray-800' : mode === 'chill' ? 'border-gray-300' : 'border-gray-700'} ${getRoundedClass('rounded-2xl')} overflow-hidden`}>
                  <div className="flex flex-col">
                    {/* Thumbnail */}
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
                        className={`w-full aspect-video object-cover ${getRoundedClass('rounded-t-2xl')}`}
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
                    <div className={`w-full aspect-video ${getRoundedClass('rounded-t-2xl')} bg-gray-200 flex items-center justify-center ${sample.thumbnail_url ? 'hidden' : ''} border-b ${mode === 'chaos' ? 'border-gray-800' : mode === 'chill' ? 'border-gray-300' : 'border-gray-700'}`}>
                      <span className="text-gray-400 text-xs">No Image</span>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col gap-3">
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
                    <div className="flex-shrink-0 w-full md:w-48">
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
            <p className={`text-lg ${getTextClass()}/70`}>
              {searchQuery ? 'No work samples found matching your search.' : 'No work samples available.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

