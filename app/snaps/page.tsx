'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Users, TrendingUp, Calendar, ChevronDown, Sparkles, ArrowUp } from 'lucide-react'
import Link from 'next/link'
import { AddSnapDialog } from '@/components/add-snap-dialog'
import { Footer } from '@/components/footer'

interface SnapRecipient {
  user_id: string
  recipient_profile: {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

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
  recipients?: SnapRecipient[]
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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

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

  // Get card style for snaps using GREEN SYSTEM (Recognition & Culture)
  // GREEN SYSTEM: Emerald (#00C896), Forest (#1A5D52), Lime (#C5F547), Orange (#FF8C42)
  const getCardStyle = () => {
    if (mode === 'chaos') {
      return { bg: 'bg-[#00C896]', border: 'border-0', text: 'text-black', accent: '#1A5D52' } // Emerald bg with Forest accent (GREEN SYSTEM)
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

  // Fetch all snaps once on mount (no filters)
  useEffect(() => {
    async function fetchAllSnaps() {
      if (!user) return
      
      setLoading(true)
      setError(null)
      
      try {
        // Fetch ALL snaps without filters
        const response = await fetch('/api/snaps')
        
        if (response.ok) {
          const result = await response.json()
          if (result.data && Array.isArray(result.data)) {
            setAllSnaps(result.data)
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
        setInitialLoadComplete(true)
      }
    }
    
    if (user && !initialLoadComplete) {
      fetchAllSnaps()
    }
  }, [user, initialLoadComplete, supabase])

  // Filter snaps client-side based on activeFilter and timeFilter
  useEffect(() => {
    if (!user || !initialLoadComplete) return
    
    let filtered = [...allSnaps]
    
    // Apply active filter
    if (activeFilter === 'about-me') {
      filtered = filtered.filter(snap => snap.mentioned_user_id === user.id)
    } else if (activeFilter === 'i-gave') {
      filtered = filtered.filter(snap => snap.submitted_by === user.id)
    }
    
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
      
      filtered = filtered.filter((snap: Snap) => {
        const snapDate = new Date(snap.date)
        return snapDate >= filterDate
      })
    }
    
    setFilteredSnaps(filtered)
  }, [allSnaps, activeFilter, timeFilter, user, initialLoadComplete])

  const handleSnapAdded = async () => {
    // Refresh all snaps (client-side filtering will handle the rest)
    if (!user) return
    
    try {
      const response = await fetch('/api/snaps')
      
      if (response.ok) {
        const result = await response.json()
        if (result.data && Array.isArray(result.data)) {
          setAllSnaps(result.data)
          // Filtering will happen automatically via the useEffect
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

  // Don't show full loading screen - render page structure immediately
  if (!user && !authLoading) {
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
    <div className={`flex flex-col ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <SiteHeader />

      <main className="w-full max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24">
        {loading && (
          <div className="text-center py-8 mb-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: style.accent }} />
            <p className={getTextClass()}>Loading snaps...</p>
          </div>
        )}
        <div className="flex gap-6 w-full">
          {/* Left Sidebar Card */}
          <Card className={`w-80 flex-shrink-0 min-w-80 ${mode === 'chaos' ? 'bg-[#1A5D52]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')} p-6 flex flex-col h-fit sticky top-24 self-start`} style={{ 
            borderColor: mode === 'chaos' ? '#00C896' : mode === 'chill' ? '#C8D961' : '#FFFFFF',
            borderWidth: mode === 'chaos' ? '2px' : '0px'
          }}>
          {/* Filters Section */}
          <div className="mb-6">
            <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${mode === 'chill' ? 'text-[#4A1818]' : mode === 'chaos' ? 'text-[#00C896]' : 'text-white'}`}>
              ▼ FILTERS
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                  activeFilter === 'all'
                    ? mode === 'chaos'
                      ? 'bg-[#00C896] text-black'
                      : mode === 'chill'
                      ? 'bg-[#C8D961] text-[#4A1818]'
                      : 'bg-white text-black'
                    : mode === 'chaos'
                    ? 'bg-[#00C896]/30 text-black/80 hover:bg-[#00C896]/50 text-black'
                    : mode === 'chill'
                    ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                    : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="font-black uppercase text-sm">All Snaps</span>
              </button>
              <button
                onClick={() => setActiveFilter('about-me')}
                className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                  activeFilter === 'about-me'
                    ? mode === 'chaos'
                      ? 'bg-[#00C896] text-black'
                      : mode === 'chill'
                      ? 'bg-[#C8D961] text-[#4A1818]'
                      : 'bg-white text-black'
                    : mode === 'chaos'
                    ? 'bg-[#00C896]/30 text-black/80 hover:bg-[#00C896]/50 text-black'
                    : mode === 'chill'
                    ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                    : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
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
                      ? 'bg-[#00C896] text-black'
                      : mode === 'chill'
                      ? 'bg-[#C8D961] text-[#4A1818]'
                      : 'bg-white text-black'
                    : mode === 'chaos'
                    ? 'bg-[#00C896]/30 text-black/80 hover:bg-[#00C896]/50 text-black'
                    : mode === 'chill'
                    ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                    : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
                <span className="font-black uppercase text-sm">Snaps I Gave</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className={`h-px mb-6 ${mode === 'chaos' ? 'bg-[#00C896]/40' : mode === 'chill' ? 'bg-[#4A1818]/20' : 'bg-white/20'}`}></div>

          {/* Time Filter */}
          <div className="mb-6">
            <h3 className={`text-xs uppercase tracking-wider font-black mb-3 ${mode === 'chill' ? 'text-[#4A1818]' : mode === 'chaos' ? 'text-[#00C896]' : 'text-white'}`}>
              Time Filter
            </h3>
            <div className="relative">
              <button
                onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} ${
                  mode === 'chaos'
                    ? 'bg-[#00C896]/40 text-black'
                    : mode === 'chill'
                    ? 'bg-white text-[#4A1818]'
                    : 'bg-black/40 text-white'
                } flex items-center justify-between border`}
                style={{
                  borderColor: mode === 'chaos' ? 'rgba(0,200,150,0.3)' : mode === 'chill' ? 'rgba(74,24,24,0.2)' : 'rgba(255,255,255,0.2)'
                }}
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
                    ? 'bg-black border border-[#00C896]/30'
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
                            ? 'bg-[#00C896] text-black'
                            : mode === 'chill'
                            ? 'bg-[#C8D961] text-[#4A1818]'
                            : 'bg-white text-black'
                          : mode === 'chaos'
                          ? 'text-white'
                          : mode === 'chill'
                          ? 'text-[#4A1818]'
                          : 'text-white'
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
          <div className={`mt-auto ${getRoundedClass('rounded-xl')} p-4`} style={{ 
            backgroundColor: mode === 'chaos' ? '#FF8C42' : mode === 'chill' ? '#FF6B35' : '#FF6B6B' // Orange from GREEN SYSTEM
          }}>
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
          </Card>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className={`text-4xl font-black uppercase ${getTextClass()}`}>SNAPS</h1>
              <Button
                onClick={() => setShowAddDialog(true)}
                className={`${mode === 'chaos' ? 'bg-gradient-to-r from-[#00C896] to-[#1A5D52] hover:from-[#00C896] hover:to-[#00C896] text-black' : mode === 'chill' ? 'bg-gradient-to-r from-[#C8D961] to-[#FFC043] hover:from-[#C8D961] hover:to-[#C8D961] text-[#4A1818]' : 'bg-gradient-to-r from-[#cccccc] to-[#e5e5e5] hover:from-[#cccccc] hover:to-[#cccccc] text-black'} font-black ${getRoundedClass('rounded-full')} h-10 px-6 text-sm uppercase`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Snap
              </Button>
            </div>

            {/* Snaps List */}
            <div className="space-y-2">
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
              <>
                {filteredSnaps.map((snap) => {
                  const fromName = getDisplayName(snap.submitted_by_profile)
                  // Get all recipient names - prefer recipients array, fallback to mentioned_user_profile
                  const recipientNames = snap.recipients && snap.recipients.length > 0
                    ? snap.recipients.map(r => getDisplayName(r.recipient_profile)).filter(Boolean)
                    : [getDisplayName(snap.mentioned_user_profile) || snap.mentioned || 'Team'].filter(Boolean)
                  const toName = recipientNames.length > 0 
                    ? recipientNames.join(', ')
                    : 'Team'
                  const isAnonymous = !snap.submitted_by_profile
                  
                  // Get recipient profiles for avatar display
                  const recipientProfiles = snap.recipients && snap.recipients.length > 0
                    ? snap.recipients
                        .map(r => r.recipient_profile)
                        .filter((p): p is NonNullable<typeof p> => p !== null)
                    : snap.mentioned_user_profile
                      ? [snap.mentioned_user_profile]
                      : []
                  
                  // Determine which profile picture(s) to show based on filter
                  let profilesToShow: Array<{ id: string; avatar_url: string | null; full_name: string | null; email: string | null }> = []
                  if (activeFilter === 'all') {
                    profilesToShow = recipientProfiles
                  } else if (activeFilter === 'about-me') {
                    profilesToShow = snap.submitted_by_profile ? [snap.submitted_by_profile] : []
                  } else if (activeFilter === 'i-gave') {
                    profilesToShow = recipientProfiles
                  }
                  
                  const hasMultipleRecipients = recipientProfiles.length > 1
                  
                  return (
                    <Card
                      key={snap.id}
                      className={`bg-white ${getRoundedClass('rounded-xl')} p-2 shadow-sm`}
                    >
                      <div className="flex items-start gap-2">
                        {/* Avatar section - only show for single recipient, or show small avatars in rows for multiple */}
                        {profilesToShow.length > 0 && !hasMultipleRecipients ? (
                          <div className="flex-shrink-0" style={{ width: '100px', height: '100px' }}>
                            {profilesToShow[0]?.avatar_url ? (
                              <img
                                src={profilesToShow[0].avatar_url}
                                alt={profilesToShow[0].full_name || profilesToShow[0].email || 'User'}
                                className={`${getRoundedClass('rounded-lg')} w-full h-full object-cover border-2`}
                                style={{
                                  borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    const fallback = parent.querySelector('.snaps-page-avatar-fallback') as HTMLElement
                                    if (fallback) fallback.style.display = 'flex'
                                  }
                                }}
                              />
                            ) : (
                              <div className={`w-full h-full ${getRoundedClass('rounded-lg')} flex items-center justify-center border-2`} style={{
                                backgroundColor: style.accent,
                                borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                              }}>
                                <Users className={`w-10 h-10 ${mode === 'chaos' || mode === 'code' ? 'text-black' : mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                              </div>
                            )}
                            <div className="snaps-page-avatar-fallback w-full h-full rounded-lg flex items-center justify-center hidden border-2" style={{
                              backgroundColor: style.accent,
                              borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                            }}>
                              <Users className={`w-10 h-10 ${mode === 'chaos' || mode === 'code' ? 'text-black' : mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                            </div>
                          </div>
                        ) : hasMultipleRecipients ? (
                          <div className="flex-shrink-0" style={{ width: '100px', height: '100px' }}>
                            {/* Stacked overlapping avatars for multiple recipients */}
                            <div className="relative" style={{ width: '100px', height: '100px' }}>
                              {recipientProfiles.slice(0, 3).map((profile, index) => {
                                const avatarSize = 60
                                const overlap = 20
                                const leftOffset = index * (avatarSize - overlap)
                                const zIndex = 10 - index
                                
                                return (
                                  <div
                                    key={profile.id || index}
                                    className="absolute"
                                    style={{
                                      left: `${leftOffset}px`,
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      width: `${avatarSize}px`,
                                      height: `${avatarSize}px`,
                                      zIndex: zIndex,
                                    }}
                                  >
                                    {profile.avatar_url ? (
                                      <img
                                        src={profile.avatar_url}
                                        alt={profile.full_name || profile.email || 'User'}
                                        className={`${getRoundedClass('rounded-full')} w-full h-full object-cover border-2`}
                                        style={{
                                          borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                          backgroundColor: '#fff',
                                        }}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.style.display = 'none'
                                          const parent = target.parentElement
                                          if (parent) {
                                            const fallback = parent.querySelector(`.snaps-page-stacked-avatar-fallback-${index}`) as HTMLElement
                                            if (fallback) fallback.style.display = 'flex'
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className={`w-full h-full ${getRoundedClass('rounded-full')} flex items-center justify-center border-2`} style={{
                                        backgroundColor: style.accent,
                                        borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                      }}>
                                        <Users className={`w-6 h-6 ${mode === 'chaos' || mode === 'code' ? 'text-black' : mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                                      </div>
                                    )}
                                    <div className={`snaps-page-stacked-avatar-fallback-${index} w-full h-full rounded-full flex items-center justify-center hidden border-2`} style={{
                                      backgroundColor: style.accent,
                                      borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                    }}>
                                      <Users className={`w-6 h-6 ${mode === 'chaos' || mode === 'code' ? 'text-black' : mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                                    </div>
                                  </div>
                                )
                              })}
                              {/* Show count badge if more than 3 recipients */}
                              {recipientProfiles.length > 3 && (
                                <div
                                  className="absolute"
                                  style={{
                                    left: `${3 * (60 - 20)}px`,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '60px',
                                    height: '60px',
                                    zIndex: 1,
                                  }}
                                >
                                  <div className={`w-full h-full ${getRoundedClass('rounded-full')} flex items-center justify-center border-2 text-xs font-bold`} style={{
                                    backgroundColor: style.accent,
                                    borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                    color: mode === 'chaos' || mode === 'code' ? '#000000' : mode === 'chill' ? '#4A1818' : '#FFFFFF',
                                  }}>
                                    +{recipientProfiles.length - 3}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-[100px] h-[100px] rounded-full flex items-center justify-center" style={{ 
                            backgroundColor: style.accent
                          }}>
                            <Users className={`w-10 h-10 ${mode === 'chaos' || mode === 'code' ? 'text-black' : mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {activeFilter === 'all' && (
                            <p className={`text-xs mb-1 ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-gray-500'}`}>
                              To: {toName}
                            </p>
                          )}
                          <p className={`text-lg mb-2 leading-relaxed ${mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`}>
                            {snap.snap_content}
                          </p>
                          {activeFilter === 'all' && !isAnonymous && (
                            <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-gray-500'}`}>
                              From: {fromName}
                            </p>
                          )}
                          {activeFilter === 'about-me' && !isAnonymous && (
                            <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-gray-500'}`}>
                              From {fromName}
                            </p>
                          )}
                          {activeFilter === 'i-gave' && (
                            <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-gray-500'}`}>
                              To {toName}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </>
            )}
            </div>
          </div>
        </div>

        <Footer />
      </main>

      <AddSnapDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleSnapAdded}
      />
    </div>
  )
}

