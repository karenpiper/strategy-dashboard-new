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
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Users, TrendingUp, Calendar, ChevronDown, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { AddSnapDialog } from '@/components/add-snap-dialog'

interface Snap {
  id: string
  date: string
  snap_content: string
  mentioned: string | null
  mentioned_user_id: string | null
  submitted_by: string | null
  created_at: string
  submitted_by_profile: {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
  mentioned_user_profile: {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

type FilterType = 'all' | 'about-me' | 'i-gave'
type TimeFilter = 'all-time' | 'this-month' | 'this-week' | 'today'

interface SnapStats {
  totalSnaps: number
  snapLeader: {
    id: string
    full_name: string | null
    email: string | null
    count: number
  } | null
}

export default function SnapsPage() {
  const { user, loading: authLoading } = useAuth()
  const { mode } = useMode()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [allSnaps, setAllSnaps] = useState<Snap[]>([])
  const [filteredSnaps, setFilteredSnaps] = useState<Snap[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all-time')
  const [stats, setStats] = useState<SnapStats>({ totalSnaps: 0, snapLeader: null })
  const [showTimeDropdown, setShowTimeDropdown] = useState(false)

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

  const getRoundedClass = (defaultClass: string) => {
    return mode === 'code' ? 'rounded-none' : defaultClass
  }

  // Get card style for snaps using dashboard system
  const getCardStyle = () => {
    if (mode === 'chaos') {
      return { bg: 'bg-[#000000]', border: 'border-0', text: 'text-white', accent: '#E8FF00' }
    } else if (mode === 'chill') {
      return { bg: 'bg-white', border: 'border border-[#C8D961]/30', text: 'text-[#4A1818]', accent: '#C8D961' }
    } else {
      return { bg: 'bg-[#000000]', border: 'border border-[#FFFFFF]', text: 'text-[#FFFFFF]', accent: '#FFFFFF' }
    }
  }

  const style = getCardStyle()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch snaps and stats
  useEffect(() => {
    async function fetchData() {
      if (!user) return
      
      setLoading(true)
      setError(null)
      
      try {
        // Build query based on filters
        let url = '/api/snaps'
        const params = new URLSearchParams()
        
        if (activeFilter === 'about-me') {
          params.append('mentioned_user_id', user.id)
        } else if (activeFilter === 'i-gave') {
          params.append('submitted_by', user.id)
        }
        
        if (params.toString()) {
          url += '?' + params.toString()
        }
        
        const response = await fetch(url)
        
        if (response.ok) {
          const result = await response.json()
          if (result.data && Array.isArray(result.data)) {
            let snaps = result.data
            
            // Apply time filter
            if (timeFilter !== 'all-time') {
              const now = new Date()
              const filterDate = new Date()
              
              if (timeFilter === 'today') {
                filterDate.setHours(0, 0, 0, 0)
              } else if (timeFilter === 'this-week') {
                const dayOfWeek = now.getDay()
                filterDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
                filterDate.setHours(0, 0, 0, 0)
              } else if (timeFilter === 'this-month') {
                filterDate.setDate(1)
                filterDate.setHours(0, 0, 0, 0)
              }
              
              snaps = snaps.filter((snap: Snap) => {
                const snapDate = new Date(snap.date)
                return snapDate >= filterDate
              })
            }
            
            setAllSnaps(snaps)
            setFilteredSnaps(snaps)
          }
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to load snaps')
        }
        
        // Fetch stats for this month
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfMonthStr = startOfMonth.toISOString().split('T')[0]
        
        const { data: monthSnaps, error: statsError } = await supabase
          .from('snaps')
          .select('submitted_by, submitted_by_profile:profiles!submitted_by(id, full_name, email)')
          .gte('date', startOfMonthStr)
        
        if (!statsError && monthSnaps) {
          // Count total snaps
          const totalSnaps = monthSnaps.length
          
          // Find snap leader (person who gave the most snaps)
          const snapCounts: Record<string, { count: number; profile: any }> = {}
          monthSnaps.forEach((snap: any) => {
            if (snap.submitted_by) {
              if (!snapCounts[snap.submitted_by]) {
                snapCounts[snap.submitted_by] = {
                  count: 0,
                  profile: snap.submitted_by_profile
                }
              }
              snapCounts[snap.submitted_by].count++
            }
          })
          
          let leader: { id: string; full_name: string | null; email: string | null; count: number } | null = null
          Object.entries(snapCounts).forEach(([userId, data]) => {
            if (!leader || data.count > leader.count) {
              leader = {
                id: userId,
                full_name: data.profile?.full_name || null,
                email: data.profile?.email || null,
                count: data.count
              }
            }
          })
          
          setStats({ totalSnaps, snapLeader: leader })
        }
      } catch (err: any) {
        console.error('Error fetching snaps:', err)
        setError(err.message || 'Failed to load snaps')
      } finally {
        setLoading(false)
      }
    }
    
    if (user) {
      fetchData()
    }
  }, [user, activeFilter, timeFilter, supabase])

  const handleSnapAdded = async () => {
    // Refresh snaps list
    if (!user) return
    
    try {
      let url = '/api/snaps'
      const params = new URLSearchParams()
      
      if (activeFilter === 'about-me') {
        params.append('mentioned_user_id', user.id)
      } else if (activeFilter === 'i-gave') {
        params.append('submitted_by', user.id)
      }
      
      if (params.toString()) {
        url += '?' + params.toString()
      }
      
      const response = await fetch(url)
      
      if (response.ok) {
        const result = await response.json()
        if (result.data && Array.isArray(result.data)) {
          let snaps = result.data
          
          // Apply time filter
          if (timeFilter !== 'all-time') {
            const now = new Date()
            const filterDate = new Date()
            
            if (timeFilter === 'today') {
              filterDate.setHours(0, 0, 0, 0)
            } else if (timeFilter === 'this-week') {
              const dayOfWeek = now.getDay()
              filterDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
              filterDate.setHours(0, 0, 0, 0)
            } else if (timeFilter === 'this-month') {
              filterDate.setDate(1)
              filterDate.setHours(0, 0, 0, 0)
            }
            
            snaps = snaps.filter((snap: Snap) => {
              const snapDate = new Date(snap.date)
              return snapDate >= filterDate
            })
          }
          
          setAllSnaps(snaps)
          setFilteredSnaps(snaps)
        }
      }
    } catch (err) {
      console.error('Error refreshing snaps:', err)
    }
  }

  // Filter snaps based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSnaps(allSnaps)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = allSnaps.filter((snap) => {
      const contentMatch = snap.snap_content.toLowerCase().includes(query)
      const mentionedMatch = snap.mentioned?.toLowerCase().includes(query)
      const submitterMatch = snap.submitted_by_profile?.full_name?.toLowerCase().includes(query) ||
                            snap.submitted_by_profile?.email?.toLowerCase().includes(query)
      const mentionedUserMatch = snap.mentioned_user_profile?.full_name?.toLowerCase().includes(query) ||
                                 snap.mentioned_user_profile?.email?.toLowerCase().includes(query)
      
      return contentMatch || mentionedMatch || submitterMatch || mentionedUserMatch
    })
    
    setFilteredSnaps(filtered)
  }, [searchQuery, allSnaps])

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getBgClass()}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: style.accent }} />
          <p className={getTextClass()}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Format date for display (relative time)
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  // Get display name for a user
  const getDisplayName = (profile: { full_name: string | null; email: string | null } | null) => {
    if (!profile) return 'Anonymous'
    return profile.full_name || profile.email || 'Anonymous'
  }

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
              <Link href="/snaps" className={getNavLinkClass(true)}>SNAPS</Link>
              <a href="#" className={getNavLinkClass()}>RESOURCES</a>
              <Link href="/work-samples" className={getNavLinkClass()}>WORK</Link>
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

      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className={`w-80 ${style.bg} ${style.border} ${getRoundedClass('rounded-r-[2.5rem]')} p-6 flex flex-col`} style={{ borderRightWidth: mode === 'code' ? '1px' : '0' }}>
          {/* Filters Section */}
          <div className="mb-6">
            <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${style.text}`}>
              ▼ FILTERS
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                  activeFilter === 'all'
                    ? mode === 'chaos'
                      ? 'bg-[#E8FF00] text-black'
                      : mode === 'chill'
                      ? 'bg-[#C8D961] text-[#4A1818]'
                      : 'bg-white text-black'
                    : mode === 'chaos'
                    ? 'bg-black/40 text-white/60 hover:bg-black/60'
                    : mode === 'chill'
                    ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50'
                    : 'bg-black/40 text-white/60 hover:bg-black/60'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="font-black uppercase text-sm">All Snaps</span>
              </button>
              <button
                onClick={() => setActiveFilter('about-me')}
                className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                  activeFilter === 'about-me'
                    ? mode === 'chaos'
                      ? 'bg-[#E8FF00] text-black'
                      : mode === 'chill'
                      ? 'bg-[#C8D961] text-[#4A1818]'
                      : 'bg-white text-black'
                    : mode === 'chaos'
                    ? 'bg-black/40 text-white/60 hover:bg-black/60'
                    : mode === 'chill'
                    ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50'
                    : 'bg-black/40 text-white/60 hover:bg-black/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="font-black uppercase text-sm">Snaps About Me</span>
              </button>
              <button
                onClick={() => setActiveFilter('i-gave')}
                className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                  activeFilter === 'i-gave'
                    ? mode === 'chaos'
                      ? 'bg-[#E8FF00] text-black'
                      : mode === 'chill'
                      ? 'bg-[#C8D961] text-[#4A1818]'
                      : 'bg-white text-black'
                    : mode === 'chaos'
                    ? 'bg-black/40 text-white/60 hover:bg-black/60'
                    : mode === 'chill'
                    ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50'
                    : 'bg-black/40 text-white/60 hover:bg-black/60'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="font-black uppercase text-sm">Snaps I Gave</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className={`h-px mb-6 ${mode === 'chaos' ? 'bg-white/20' : mode === 'chill' ? 'bg-[#4A1818]/20' : 'bg-white/20'}`}></div>

          {/* Time Filter */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" style={{ color: style.accent }} />
              <h3 className={`text-xs uppercase tracking-wider font-black ${style.text}`}>
                Time Filter
              </h3>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} ${
                  mode === 'chaos'
                    ? 'bg-black/40 text-white'
                    : mode === 'chill'
                    ? 'bg-white text-[#4A1818]'
                    : 'bg-black/40 text-white'
                } flex items-center justify-between`}
              >
                <span className="font-black uppercase text-sm">
                  {timeFilter === 'all-time' ? 'All Time' :
                   timeFilter === 'this-month' ? 'This Month' :
                   timeFilter === 'this-week' ? 'This Week' : 'Today'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showTimeDropdown && (
                <div className={`absolute top-full left-0 right-0 mt-2 ${getRoundedClass('rounded-xl')} overflow-hidden z-10 ${
                  mode === 'chaos'
                    ? 'bg-black border border-white/20'
                    : mode === 'chill'
                    ? 'bg-white border border-[#C8D961]/30'
                    : 'bg-black border border-white/20'
                }`}>
                  {(['all-time', 'this-month', 'this-week', 'today'] as TimeFilter[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setTimeFilter(filter)
                        setShowTimeDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2 hover:opacity-80 transition-all ${
                        timeFilter === filter
                          ? mode === 'chaos'
                            ? 'bg-[#E8FF00] text-black'
                            : mode === 'chill'
                            ? 'bg-[#C8D961] text-[#4A1818]'
                            : 'bg-white text-black'
                          : style.text
                      }`}
                    >
                      <span className="font-black uppercase text-sm">
                        {filter === 'all-time' ? 'All Time' :
                         filter === 'this-month' ? 'This Month' :
                         filter === 'this-week' ? 'This Week' : 'Today'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* This Month Summary */}
          <div className={`mt-auto ${getRoundedClass('rounded-xl')} p-4`} style={{ backgroundColor: mode === 'chaos' ? '#FF6B6B' : mode === 'chill' ? '#FF6B35' : '#FF6B6B' }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-white" />
              <h3 className="text-xs uppercase tracking-wider font-black text-white">THIS MONTH</h3>
            </div>
            <div className="mb-4">
              <p className="text-4xl font-black text-white mb-1">{stats.totalSnaps}</p>
              <p className="text-xs font-medium text-white/90">Total Snaps</p>
            </div>
            {stats.snapLeader && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-white" />
                  <p className="text-xs font-black uppercase text-white">Snap Leader</p>
                </div>
                <p className="text-lg font-black text-white mb-1">
                  {stats.snapLeader.full_name || stats.snapLeader.email || 'Anonymous'}
                </p>
                <p className="text-xs font-medium text-white/90">
                  {stats.snapLeader.count} snaps given
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className={`${style.bg} ${style.border} p-6 flex items-center justify-between`} style={{ borderBottomWidth: mode === 'code' ? '1px' : '0' }}>
            <h1 className={`text-4xl font-black uppercase ${style.text}`}>Snaps</h1>
            <Button
              onClick={() => setShowAddDialog(true)}
              className={`${mode === 'chaos' ? 'bg-gradient-to-r from-[#00FF87] to-[#00E676] hover:from-[#00FF87] hover:to-[#00FF87] text-black' : mode === 'chill' ? 'bg-gradient-to-r from-[#C8D961] to-[#FFC043] hover:from-[#C8D961] hover:to-[#C8D961] text-[#4A1818]' : 'bg-gradient-to-r from-[#cccccc] to-[#e5e5e5] hover:from-[#cccccc] hover:to-[#cccccc] text-black'} font-black ${getRoundedClass('rounded-full')} h-10 px-6 text-sm uppercase`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Snap
            </Button>
          </div>

          {/* Snaps List */}
          <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: mode === 'chill' ? '#F5E6D3' : 'transparent' }}>
            {error && (
              <div className={`mb-4 p-4 ${getRoundedClass('rounded-xl')} border-2`} style={{ backgroundColor: mode === 'chaos' ? 'rgba(255, 0, 0, 0.1)' : mode === 'chill' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)', borderColor: '#ef4444' }}>
                <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
              </div>
            )}

            {filteredSnaps.length === 0 ? (
              <Card className={`p-12 text-center ${style.bg} ${style.border} ${getRoundedClass('rounded-[2.5rem]')}`}>
                <p className={style.text}>
                  {searchQuery ? 'No snaps found matching your search.' : 'No snaps yet.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredSnaps.map((snap) => {
                  const fromName = getDisplayName(snap.submitted_by_profile)
                  const toName = getDisplayName(snap.mentioned_user_profile) || snap.mentioned || 'Team'
                  const isAnonymous = !snap.submitted_by_profile
                  
                  return (
                    <Card
                      key={snap.id}
                      className={`${style.bg} ${style.border} ${getRoundedClass('rounded-xl')} p-4 relative`}
                      style={{
                        borderLeftWidth: '10px',
                        borderLeftColor: style.accent
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          <Sparkles className="w-5 h-5" style={{ color: style.accent }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className={`text-sm font-black ${style.text}`}>
                              {fromName} → {toName}
                            </p>
                            {isAnonymous && (
                              <span className={`px-2 py-1 ${getRoundedClass('rounded-full')} text-xs font-black uppercase flex items-center gap-1`} style={{ backgroundColor: style.accent, color: mode === 'chaos' || mode === 'code' ? '#000000' : '#4A1818' }}>
                                <Users className="w-3 h-3" />
                                Anonymous
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${style.text}/60 mb-3`}>
                            {formatTimeAgo(snap.date)}
                          </p>
                          <p className={`text-base leading-relaxed ${style.text}`}>
                            {snap.snap_content}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddSnapDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleSnapAdded}
      />
    </div>
  )
}
