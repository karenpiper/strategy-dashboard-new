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
      <main className="max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24 w-full">
        <div className="flex gap-6">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* Page Title */}
            <h1 className={`text-4xl font-black uppercase mb-8 ${getTextClass()}`}>RESOURCES</h1>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`} />
              <Input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-12 pr-4 py-6 ${getRoundedClass('rounded-2xl')} ${mode === 'chill' ? 'bg-white border-[#4A1818]/20' : mode === 'chaos' ? 'bg-[#2A2A2A] border-[#333333]' : 'bg-[#1a1a1a] border-white'} ${getTextClass()} text-lg`}
              />
              <Button
                onClick={() => {}}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${getRoundedClass('rounded-xl')} px-4`}
                style={{ backgroundColor: orangeColors.primary, color: mode === 'code' ? '#000000' : '#FFFFFF' }}
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-6 py-3 ${getRoundedClass('rounded-xl')} font-black uppercase text-sm transition-all ${
                    activeFilter === filter
                      ? `text-white`
                      : mode === 'chill'
                      ? 'text-[#4A1818]/60 hover:text-[#4A1818]'
                      : 'text-white/60 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: activeFilter === filter ? orangeColors.primary : 'transparent',
                    border: activeFilter === filter ? 'none' : `2px solid ${mode === 'chill' ? '#4A1818/20' : '#333333'}`
                  }}
                >
                  {getFilterDisplayName(filter)}
                </button>
              ))}
            </div>

            {/* Resource Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResources.map((resource) => (
                <Card
                  key={resource.id}
                  onClick={() => handleResourceClick(resource)}
                  className={`p-6 ${getRoundedClass('rounded-2xl')} cursor-pointer transition-all hover:scale-[1.02] bg-white border-gray-200`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-10 h-10 ${getRoundedClass('rounded-lg')} flex items-center justify-center`}
                        style={{ backgroundColor: orangeColors.contrast }}
                      >
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1 text-gray-900">{resource.name}</h3>
                        {resource.source && (
                          <p className="text-sm text-gray-600">{resource.source}</p>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  {resource.description && (
                    <p className="text-sm mb-4 text-gray-700">
                      {resource.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant="outline"
                      className={`${getRoundedClass('rounded-lg')} text-xs`}
                      style={{ 
                        borderColor: orangeColors.primaryPair,
                        color: orangeColors.primaryPair,
                        backgroundColor: 'transparent'
                      }}
                    >
                      {resource.primary_category}
                    </Badge>
                    {resource.secondary_tags.slice(0, 2).map((tag, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={`${getRoundedClass('rounded-lg')} text-xs`}
                        style={{
                          borderColor: orangeColors.complementary,
                          color: orangeColors.complementary,
                          backgroundColor: 'transparent'
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {filteredResources.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className={`text-lg ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>
                  No resources found. Try adjusting your search or filters.
                </p>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-80 space-y-6">
            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <Card className={`${getRoundedClass('rounded-2xl')} p-6`} style={{ backgroundColor: orangeColors.primaryPair }}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-white" />
                  <h3 className="font-black uppercase text-sm text-white">Recently Viewed</h3>
                </div>
                <div className="space-y-3">
                  {recentlyViewed.map((resource) => (
                    <button
                      key={resource.id}
                      onClick={() => handleResourceClick(resource)}
                      className="text-left w-full"
                    >
                      <p className="text-sm text-white/90 hover:text-white transition-colors">{resource.name}</p>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Most Used */}
            {mostUsed.length > 0 && (
              <Card className={`${getRoundedClass('rounded-2xl')} p-6`} style={{ backgroundColor: orangeColors.contrast }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <h3 className="font-black uppercase text-sm text-white">Most Used</h3>
                </div>
                <div className="space-y-3">
                  {mostUsed.map((resource, idx) => (
                    <div key={resource.id}>
                      {idx === 0 && (
                        <div 
                          className={`${getRoundedClass('rounded-lg')} p-3 mb-3`}
                          style={{ backgroundColor: orangeColors.complementary }}
                        >
                          <p className="text-sm font-bold text-white">{resource.name}</p>
                          <p className="text-xs text-white/80 mt-1">{resource.view_count} views this month</p>
                        </div>
                      )}
                      {idx > 0 && (
                        <button
                          onClick={() => handleResourceClick(resource)}
                          className="text-left w-full"
                        >
                          <p className="text-sm text-white/90 hover:text-white transition-colors">{resource.name}</p>
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

