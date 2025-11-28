'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, ExternalLink, BookOpen, Loader2, Clock, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Footer } from '@/components/footer'

interface Resource {
  id: string
  name: string
  primary_category: string
  secondary_tags: string[]
  link: string
  source: string | null
  description: string | null
  username: string | null
  password: string | null
  instructions: string | null
  documentation: string | null
  view_count: number
}

type FilterType = 'all' | 'Communication & Presentation' | 'Creative & Inspiration' | 'Learning & Technology' | 'Research & Insights' | 'Strategy & Planning' | 'Tools & Templates'

export default function ResourcesPage() {
  const { user, loading: authLoading } = useAuth()
  const { mode } = useMode()
  const router = useRouter()
  const supabase = createClient()

  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<Resource[]>([])
  const [mostUsed, setMostUsed] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'source' | 'views'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

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

  // ORANGE SYSTEM colors
  // Orange (Primary), Brown (Primary Pair), Tan (Complementary), Purple (Contrast)
  const getOrangeSystemColors = () => {
    if (mode === 'chaos') {
      return {
        primary: '#FF8C42',      // Orange
        primaryPair: '#8B4513',   // Brown
        complementary: '#D2B48C', // Tan
        contrast: '#9D4EFF',     // Purple
        bg: '#1A1A1A',
        text: '#FFFFFF',
        cardBg: '#2A2A2A'
      }
    } else if (mode === 'chill') {
      return {
        primary: '#FF8C42',      // Orange
        primaryPair: '#8B4513',   // Brown
        complementary: '#D2B48C', // Tan
        contrast: '#9D4EFF',     // Purple
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

  const orangeColors = getOrangeSystemColors()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch all resources once on initial load
  useEffect(() => {
    async function fetchResources() {
      if (!user) return

      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (user.id) params.append('userId', user.id)

        // Fetch all resources without filters - we'll filter client-side
        const response = await fetch(`/api/resources?${params.toString()}`)
        if (response.ok) {
          const result = await response.json()
          setResources(result.data || [])
          setRecentlyViewed(result.recentlyViewed || [])
          setMostUsed(result.mostUsed || [])
        }
      } catch (error) {
        console.error('Error fetching resources:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResources()
  }, [user]) // Only fetch when user changes, not on filter/search changes

  // Filter and sort resources
  useEffect(() => {
    let filtered = resources

    // Apply category filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(resource => 
        resource.primary_category === activeFilter ||
        resource.secondary_tags.includes(activeFilter)
      )
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(resource =>
        resource.name.toLowerCase().includes(query) ||
        resource.description?.toLowerCase().includes(query) ||
        resource.source?.toLowerCase().includes(query) ||
        resource.secondary_tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'category':
          aValue = a.primary_category.toLowerCase()
          bValue = b.primary_category.toLowerCase()
          break
        case 'source':
          aValue = (a.source || '').toLowerCase()
          bValue = (b.source || '').toLowerCase()
          break
        case 'views':
          aValue = a.view_count
          bValue = b.view_count
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredResources(filtered)
  }, [resources, searchQuery, activeFilter, sortBy, sortOrder])

  const handleResourceClick = async (resource: Resource) => {
    // Open in new tab immediately (don't wait for API call)
    window.open(resource.link, '_blank')
    
    // Record view in background (non-blocking)
    if (user) {
      fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: resource.id, userId: user.id })
      }).then(() => {
        // Update view count locally without refetching
        setResources(prevResources => 
          prevResources.map(r => 
            r.id === resource.id 
              ? { ...r, view_count: r.view_count + 1 }
              : r
          )
        )
      }).catch(err => console.error('Error recording view:', err))
    }
  }

  const filters: FilterType[] = [
    'all',
    'Communication & Presentation',
    'Creative & Inspiration',
    'Learning & Technology',
    'Research & Insights',
    'Strategy & Planning',
    'Tools & Templates'
  ]

  const getFilterDisplayName = (filter: FilterType) => {
    if (filter === 'all') return 'All'
    return filter.split(' & ')[0] // Return first part (e.g., "Communication" from "Communication & Presentation")
  }

  const handleSort = (field: 'name' | 'category' | 'source' | 'views') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (field: 'name' | 'category' | 'source' | 'views') => {
    if (sortBy !== field) {
      return null
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4" />
      : <ArrowDown className="w-4 h-4" />
  }

  // Don't show full loading screen - render page structure immediately
  if (!user && !authLoading) {
    return null
  }

  return (
    <div className={`flex flex-col min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <SiteHeader />

      <main className="w-full max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24">
        {loading && (
          <div className="text-center py-8 mb-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: orangeColors.primary }} />
            <p className={getTextClass()}>Loading resources...</p>
          </div>
        )}
        <div className="flex gap-6 w-full">
          {/* Left Sidebar Card */}
          <Card className={`w-80 flex-shrink-0 min-w-80 ${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')} p-6 flex flex-col h-fit`} style={{ 
            borderColor: mode === 'chaos' ? orangeColors.primary : mode === 'chill' ? orangeColors.primaryPair : '#FFFFFF',
            borderWidth: mode === 'chaos' ? '2px' : '0px'
          }}>
            {/* Filters Section */}
            <div className="mb-6">
              <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${mode === 'chill' ? 'text-[#4A1818]' : mode === 'chaos' ? 'text-[#FF8C42]' : 'text-white'}`}>
                ▼ FILTERS
              </h3>
              <div className="space-y-2">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                      activeFilter === filter
                        ? mode === 'chaos'
                          ? 'bg-[#FF8C42] text-black'
                          : mode === 'chill'
                          ? 'bg-[#FF8C42] text-white'
                          : 'bg-white text-black'
                        : mode === 'chaos'
                        ? 'bg-[#FF8C42]/30 text-white/80 hover:bg-[#FF8C42]/50 text-white'
                        : mode === 'chill'
                        ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                        : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="font-black uppercase text-sm">{getFilterDisplayName(filter)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className={`h-px mb-6 ${mode === 'chaos' ? 'bg-[#FF8C42]/40' : mode === 'chill' ? 'bg-[#4A1818]/20' : 'bg-white/20'}`}></div>

            {/* Sort Section */}
            <div className="mb-6">
              <h3 className={`text-xs uppercase tracking-wider font-black mb-3 ${mode === 'chill' ? 'text-[#4A1818]' : mode === 'chaos' ? 'text-[#FF8C42]' : 'text-white'}`}>
                Sort By
              </h3>
              <div className="space-y-2">
                {(['name', 'category', 'source', 'views'] as const).map((field) => (
                  <button
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center justify-between ${
                      sortBy === field
                        ? mode === 'chaos'
                          ? 'bg-[#FF8C42] text-black'
                          : mode === 'chill'
                          ? 'bg-[#FF8C42] text-white'
                          : 'bg-white text-black'
                        : mode === 'chaos'
                        ? 'bg-[#FF8C42]/30 text-white/80 hover:bg-[#FF8C42]/50 text-white'
                        : mode === 'chill'
                        ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                        : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                    }`}
                  >
                    <span className="font-black uppercase text-sm">
                      {field === 'name' ? 'Name' : field === 'category' ? 'Category' : field === 'source' ? 'Source' : 'Views'}
                    </span>
                    {getSortIcon(field)}
                  </button>
                ))}
              </div>
            </div>

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <>
                <div className={`h-px mb-6 ${mode === 'chaos' ? 'bg-[#FF8C42]/40' : mode === 'chill' ? 'bg-[#4A1818]/20' : 'bg-white/20'}`}></div>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className={`w-4 h-4 ${mode === 'chill' ? 'text-[#4A1818]' : mode === 'chaos' ? 'text-[#FF8C42]' : 'text-white'}`} />
                    <h3 className={`font-bold uppercase text-xs ${mode === 'chill' ? 'text-[#4A1818]' : mode === 'chaos' ? 'text-[#FF8C42]' : 'text-white'}`}>Recently Viewed</h3>
                  </div>
                  <div className="space-y-2">
                    {recentlyViewed.map((resource) => (
                      <button
                        key={resource.id}
                        onClick={() => handleResourceClick(resource)}
                        className="text-left w-full"
                      >
                        <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/80 hover:text-[#4A1818]' : 'text-white/80 hover:text-white'} transition-colors line-clamp-1`}>{resource.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Most Used */}
            {mostUsed.length > 0 && (
              <div className={`mt-auto ${getRoundedClass('rounded-xl')} p-4`} style={{ 
                backgroundColor: mode === 'chaos' ? orangeColors.primary : mode === 'chill' ? orangeColors.primary : orangeColors.primary
              }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-white" />
                  <h3 className="text-xs uppercase tracking-wider font-black text-white">MOST USED</h3>
                </div>
                {mostUsed[0] && (
                  <div className="mb-4">
                    <p className="text-2xl font-black text-white mb-1 line-clamp-1">{mostUsed[0].name}</p>
                    <p className="text-xs font-medium text-white/90">{mostUsed[0].view_count} views</p>
                  </div>
                )}
                {mostUsed.length > 1 && (
                  <div className="space-y-1">
                    {mostUsed.slice(1, 4).map((resource) => (
                      <button
                        key={resource.id}
                        onClick={() => handleResourceClick(resource)}
                        className="text-left w-full"
                      >
                        <p className="text-xs text-white/90 hover:text-white transition-colors line-clamp-1">{resource.name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className={`text-4xl font-black uppercase ${getTextClass()}`}>RESOURCES</h1>
              <div className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>
                {loading ? 'Loading...' : `${filteredResources.length} ${filteredResources.length === 1 ? 'resource' : 'resources'}`}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`} />
              <Input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-12 pr-4 py-3 ${getRoundedClass('rounded-xl')} ${mode === 'chill' ? 'bg-white border-[#4A1818]/20' : mode === 'chaos' ? 'bg-[#2A2A2A] border-[#333333]' : 'bg-[#1a1a1a] border-white'} ${getTextClass()} text-base`}
              />
            </div>

            {/* Resources List */}
            <div className="space-y-2">
              {filteredResources.length === 0 && !loading ? (
                <Card className={`p-12 text-center ${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')}`}>
                  <p className={getTextClass()}>
                    {searchQuery ? 'No resources found matching your search.' : 'No resources found. Try adjusting your filters.'}
                  </p>
                </Card>
              ) : (
                <>
                  {filteredResources.map((resource) => (
                    <Card
                      key={resource.id}
                      onClick={() => handleResourceClick(resource)}
                      className={`${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-xl')} p-4 shadow-sm cursor-pointer hover:opacity-90 transition-opacity`}
                      style={{
                        borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333',
                        borderWidth: '1px'
                      }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div 
                          className={`w-12 h-12 ${getRoundedClass('rounded-lg')} flex items-center justify-center flex-shrink-0`}
                          style={{ backgroundColor: orangeColors.contrast }}
                        >
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-lg font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'} mb-1`}>
                                {resource.name}
                              </h3>
                              {resource.description && (
                                <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} line-clamp-2`}>
                                  {resource.description}
                                </p>
                              )}
                            </div>
                            <ExternalLink className={`w-5 h-5 flex-shrink-0 ${mode === 'chill' ? 'text-[#4A1818]/50' : 'text-white/50'}`} />
                          </div>
                          
                          {/* Badges and Meta */}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Badge 
                              variant="outline"
                              className={`${getRoundedClass('rounded')} text-xs px-2 py-0.5`}
                              style={{ 
                                borderColor: orangeColors.primaryPair,
                                color: orangeColors.primaryPair,
                                backgroundColor: 'transparent'
                              }}
                            >
                              {resource.primary_category.split(' & ')[0]}
                            </Badge>
                            
                            {resource.secondary_tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-0.5 ${getRoundedClass('rounded')}`}
                                style={{
                                  color: orangeColors.complementary,
                                  backgroundColor: `${orangeColors.complementary}20`
                                }}
                                title={tag}
                              >
                                {tag}
                              </span>
                            ))}
                            
                            {resource.secondary_tags.length > 3 && (
                              <span className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/50' : 'text-white/50'}`}>
                                +{resource.secondary_tags.length - 3}
                              </span>
                            )}
                            
                            {resource.source && (
                              <span className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>
                                • {resource.source}
                              </span>
                            )}
                            
                            {resource.view_count > 0 && (
                              <div className="flex items-center gap-1 ml-auto">
                                <TrendingUp className={`w-3 h-3 ${mode === 'chill' ? 'text-[#4A1818]/50' : 'text-white/50'}`} />
                                <span className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/50' : 'text-white/50'}`}>
                                  {resource.view_count}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
        
        <Footer />
      </main>
    </div>
  )
}

