'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, ExternalLink, BookOpen, Loader2, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

  // Fetch resources
  useEffect(() => {
    async function fetchResources() {
      if (!user) return

      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (searchQuery) params.append('search', searchQuery)
        if (activeFilter !== 'all') params.append('filter', activeFilter)
        if (user.id) params.append('userId', user.id)

        const response = await fetch(`/api/resources?${params.toString()}`)
        if (response.ok) {
          const result = await response.json()
          setResources(result.data || [])
          setFilteredResources(result.data || [])
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
  }, [user, searchQuery, activeFilter])

  // Filter resources based on search and category
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

    setFilteredResources(filtered)
  }, [resources, searchQuery, activeFilter])

  const handleResourceClick = async (resource: Resource) => {
    if (user) {
      // Record view
      await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: resource.id, userId: user.id })
      })
    }
    // Open in new tab
    window.open(resource.link, '_blank')
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

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getBgClass()}`}>
        <Loader2 className={`w-8 h-8 animate-spin ${orangeColors.primary}`} />
      </div>
    )
  }

  return (
    <div className={`flex flex-col min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <SiteHeader />

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-6 flex-1 pt-20 w-full">
        <div className="flex gap-6">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* Header with Title, Search, and Filters */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className={`text-3xl font-black uppercase ${getTextClass()}`}>RESOURCES</h1>
                <div className="text-sm text-gray-500">
                  {filteredResources.length} {filteredResources.length === 1 ? 'resource' : 'resources'}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`} />
                <Input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 pr-4 py-2 ${getRoundedClass('rounded-lg')} ${mode === 'chill' ? 'bg-white border-[#4A1818]/20' : mode === 'chaos' ? 'bg-[#2A2A2A] border-[#333333]' : 'bg-[#1a1a1a] border-white'} ${getTextClass()} text-sm`}
                />
              </div>

              {/* Filter Buttons - Compact */}
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 ${getRoundedClass('rounded-md')} font-semibold uppercase text-xs transition-all ${
                      activeFilter === filter
                        ? `text-white`
                        : mode === 'chill'
                        ? 'text-[#4A1818]/60 hover:text-[#4A1818]'
                        : 'text-white/60 hover:text-white'
                    }`}
                    style={{
                      backgroundColor: activeFilter === filter ? orangeColors.primary : 'transparent',
                      border: activeFilter === filter ? 'none' : `1px solid ${mode === 'chill' ? '#4A1818/20' : '#333333'}`
                    }}
                  >
                    {getFilterDisplayName(filter)}
                  </button>
                ))}
              </div>
            </div>

            {/* Resource List Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tags</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Source</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredResources.map((resource) => (
                      <tr
                        key={resource.id}
                        onClick={() => handleResourceClick(resource)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div 
                              className={`w-6 h-6 ${getRoundedClass('rounded')} flex items-center justify-center flex-shrink-0`}
                              style={{ backgroundColor: orangeColors.contrast }}
                            >
                              <BookOpen className="w-3 h-3 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm text-gray-900 truncate">{resource.name}</div>
                              {resource.description && (
                                <div className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{resource.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
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
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {resource.secondary_tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-1.5 py-0.5 ${getRoundedClass('rounded')} truncate`}
                                style={{
                                  color: orangeColors.complementary,
                                  backgroundColor: `${orangeColors.complementary}15`
                                }}
                                title={tag}
                              >
                                {tag}
                              </span>
                            ))}
                            {resource.secondary_tags.length > 3 && (
                              <span className="text-xs text-gray-400">+{resource.secondary_tags.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {resource.source && (
                            <span className="text-xs text-gray-600 truncate block max-w-xs" title={resource.source}>{resource.source}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <ExternalLink className="w-4 h-4 text-gray-400 mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredResources.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">
                    No resources found. Try adjusting your search or filters.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Compact */}
          <div className="w-64 space-y-4">
            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <Card className={`${getRoundedClass('rounded-lg')} p-4`} style={{ backgroundColor: orangeColors.primaryPair }}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-white" />
                  <h3 className="font-bold uppercase text-xs text-white">Recently Viewed</h3>
                </div>
                <div className="space-y-2">
                  {recentlyViewed.map((resource) => (
                    <button
                      key={resource.id}
                      onClick={() => handleResourceClick(resource)}
                      className="text-left w-full"
                    >
                      <p className="text-xs text-white/90 hover:text-white transition-colors line-clamp-1">{resource.name}</p>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Most Used */}
            {mostUsed.length > 0 && (
              <Card className={`${getRoundedClass('rounded-lg')} p-4`} style={{ backgroundColor: orangeColors.contrast }}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-white" />
                  <h3 className="font-bold uppercase text-xs text-white">Most Used</h3>
                </div>
                <div className="space-y-2">
                  {mostUsed.map((resource, idx) => (
                    <div key={resource.id}>
                      {idx === 0 && (
                        <div 
                          className={`${getRoundedClass('rounded')} p-2 mb-2`}
                          style={{ backgroundColor: orangeColors.complementary }}
                        >
                          <p className="text-xs font-bold text-white line-clamp-1">{resource.name}</p>
                          <p className="text-xs text-white/80 mt-0.5">{resource.view_count} views</p>
                        </div>
                      )}
                      {idx > 0 && (
                        <button
                          onClick={() => handleResourceClick(resource)}
                          className="text-left w-full"
                        >
                          <p className="text-xs text-white/90 hover:text-white transition-colors line-clamp-1">{resource.name}</p>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

