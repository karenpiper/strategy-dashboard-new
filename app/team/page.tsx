'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Footer } from '@/components/footer'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, 
  Trophy, 
  MessageSquare, 
  Briefcase,
  Cake,
  PartyPopper,
  ArrowRight,
  Loader2,
  Mail,
  MapPin,
  Globe,
  Briefcase as BriefcaseIcon,
  Calendar as CalendarIcon,
  Crown,
  Music,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BeastBabeCard } from '@/components/beast-babe-card'

export default function TeamPage() {
  const { user, loading: authLoading } = useAuth()
  const { mode } = useMode()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [teamStats, setTeamStats] = useState({
    totalTeamMembers: 0,
    totalSnaps: 0,
    activePitches: 0,
    snapLeader: null as { id: string; full_name: string | null; email: string | null; count: number } | null
  })
  const [birthdays, setBirthdays] = useState<Array<{ id: string; full_name: string | null; birthday: string; avatar_url: string | null }>>([])
  const [anniversaries, setAnniversaries] = useState<Array<{ id: string; full_name: string | null; start_date: string; avatar_url: string | null; years: number }>>([])
  const [snapLeaderboard, setSnapLeaderboard] = useState<Array<{ id: string; full_name: string | null; email: string | null; count: number }>>([])
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [currentCurator, setCurrentCurator] = useState<{ curator: string; curator_photo_url: string | null; spotify_url: string | null; id: string } | null>(null)
  const [beastBabeHistory, setBeastBabeHistory] = useState<any[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchAllData()
    }
  }, [user])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchTeamStats(),
        fetchBirthdays(),
        fetchAnniversaries(),
        fetchSnapLeaderboard(),
        fetchAllProfiles(),
        fetchCurrentCurator(),
        fetchBeastBabeHistory()
      ])
    } catch (error) {
      console.error('Error fetching team data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleProfileClick = async (profileId: string) => {
    setLoadingProfile(true)
    setIsProfileDialogOpen(true)
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, discipline, birthday, start_date, bio, location, website, pronouns')
        .eq('id', profileId)
        .maybeSingle()
      
      if (!error && profile) {
        setSelectedProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const fetchTeamStats = async () => {
    try {
      // Total team members
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true)
      
      // Total snaps
      const { data: snaps, error: snapsError } = await supabase
        .from('snaps')
        .select('id')
      
      // Active pitches (work samples with type "Pitch" from last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const { data: pitches, error: pitchesError } = await supabase
        .from('work_samples')
        .select(`
          id,
          work_sample_types!inner(name)
        `)
        .eq('work_sample_types.name', 'Pitch')
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
      
      // Snap leader
      const { data: allSnaps, error: allSnapsError } = await supabase
        .from('snaps')
        .select('submitted_by, submitted_by_profile:profiles!submitted_by(id, full_name, email)')
      
      if (!allSnapsError && allSnaps) {
        const snapCounts: Record<string, { count: number; profile: any }> = {}
        allSnaps.forEach((snap: any) => {
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
        
        setTeamStats({
          totalTeamMembers: profiles?.length || 0,
          totalSnaps: snaps?.length || 0,
          activePitches: pitches?.length || 0,
          snapLeader: leader
        })
      }
    } catch (error) {
      console.error('Error fetching team stats:', error)
    }
  }

  const fetchBirthdays = async () => {
    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      const currentDay = now.getDate()
      
      // Calculate date 7 days from now
      const sevenDaysFromNow = new Date(now)
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      const endMonth = sevenDaysFromNow.getMonth() + 1
      const endDay = sevenDaysFromNow.getDate()
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, birthday, avatar_url')
        .eq('is_active', true)
        .not('birthday', 'is', null)
      
      if (!error && profiles) {
        const upcomingBirthdays = profiles
          .map(profile => {
            if (!profile.birthday) return null
            const [month, day] = profile.birthday.split('/').map(Number)
            return { profile, month, day }
          })
          .filter((item): item is { profile: any; month: number; day: number } => item !== null)
          .filter(item => {
            // Show birthdays in next 7 days
            const itemDate = new Date(currentYear, item.month - 1, item.day)
            const todayDate = new Date(currentYear, currentMonth - 1, currentDay)
            const endDate = new Date(currentYear, endMonth - 1, endDay)
            
            // Handle year wrap-around
            if (itemDate < todayDate) {
              itemDate.setFullYear(currentYear + 1)
            }
            
            return itemDate >= todayDate && itemDate <= endDate
          })
          .sort((a, b) => {
            const aDate = new Date(currentYear, a.month - 1, a.day)
            const bDate = new Date(currentYear, b.month - 1, b.day)
            if (aDate < new Date(currentYear, currentMonth - 1, currentDay)) {
              aDate.setFullYear(currentYear + 1)
            }
            if (bDate < new Date(currentYear, currentMonth - 1, currentDay)) {
              bDate.setFullYear(currentYear + 1)
            }
            return aDate.getTime() - bDate.getTime()
          })
          .map(item => item.profile)
        
        setBirthdays(upcomingBirthdays)
      }
    } catch (error) {
      console.error('Error fetching birthdays:', error)
    }
  }

  const fetchAnniversaries = async () => {
    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      const currentDay = now.getDate()
      
      // Calculate date 7 days from now
      const sevenDaysFromNow = new Date(now)
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      const endMonth = sevenDaysFromNow.getMonth() + 1
      const endDay = sevenDaysFromNow.getDate()
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, start_date, avatar_url')
        .eq('is_active', true)
        .not('start_date', 'is', null)
      
      if (!error && profiles) {
        const upcomingAnniversaries = profiles
          .map(profile => {
            if (!profile.start_date) return null
            const [year, month, day] = profile.start_date.split('-').map(Number)
            const years = currentYear - year
            return { profile, month, day, years }
          })
          .filter((item): item is { profile: any; month: number; day: number; years: number } => item !== null)
          .filter(item => {
            // Show anniversaries in next 7 days
            const itemDate = new Date(currentYear, item.month - 1, item.day)
            const todayDate = new Date(currentYear, currentMonth - 1, currentDay)
            const endDate = new Date(currentYear, endMonth - 1, endDay)
            
            // Handle year wrap-around
            if (itemDate < todayDate) {
              itemDate.setFullYear(currentYear + 1)
            }
            
            return itemDate >= todayDate && itemDate <= endDate
          })
          .sort((a, b) => {
            const aDate = new Date(currentYear, a.month - 1, a.day)
            const bDate = new Date(currentYear, b.month - 1, b.day)
            if (aDate < new Date(currentYear, currentMonth - 1, currentDay)) {
              aDate.setFullYear(currentYear + 1)
            }
            if (bDate < new Date(currentYear, currentMonth - 1, currentDay)) {
              bDate.setFullYear(currentYear + 1)
            }
            return aDate.getTime() - bDate.getTime()
          })
          .map(item => ({
            ...item.profile,
            years: item.years
          }))
        
        setAnniversaries(upcomingAnniversaries)
      }
    } catch (error) {
      console.error('Error fetching anniversaries:', error)
    }
  }

  const fetchSnapLeaderboard = async () => {
    try {
      const { data: allSnaps, error } = await supabase
        .from('snaps')
        .select('submitted_by, submitted_by_profile:profiles!submitted_by(id, full_name, email)')
      
      if (!error && allSnaps) {
        const snapCounts: Record<string, { count: number; profile: any }> = {}
        allSnaps.forEach((snap: any) => {
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
        
        const leaderboard = Object.entries(snapCounts)
          .map(([userId, data]) => ({
            id: userId,
            full_name: data.profile?.full_name || null,
            email: data.profile?.email || null,
            count: data.count
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
        
        setSnapLeaderboard(leaderboard)
      }
    } catch (error) {
      console.error('Error fetching snap leaderboard:', error)
    }
  }


  const fetchAllProfiles = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, discipline, birthday, start_date, location, manager_id, hierarchy_level')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
      
      if (!error && profiles) {
        setAllProfiles(profiles)
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    }
  }


  const fetchCurrentCurator = async () => {
    try {
      const response = await fetch('/api/playlists')
      if (response.ok) {
        const playlists = await response.json()
        if (playlists && playlists.length > 0) {
          // Get the most recent playlist (first one since they're ordered by date desc)
          const mostRecent = playlists[0]
          setCurrentCurator({
            curator: mostRecent.curator || '',
            curator_photo_url: mostRecent.curator_photo_url || null,
            spotify_url: mostRecent.spotify_url || null,
            id: mostRecent.id
          })
        }
      }
    } catch (error) {
      console.error('Error fetching current curator:', error)
    }
  }

  const fetchBeastBabeHistory = async () => {
    try {
      const { data: history, error } = await supabase
        .from('beast_babe_history')
        .select(`
          *,
          user:profiles!beast_babe_history_user_id_fkey(id, full_name, email, avatar_url),
          passed_by:profiles!beast_babe_history_passed_by_id_fkey(id, full_name, email, avatar_url)
        `)
        .order('date', { ascending: false })
      
      if (!error && history) {
        setBeastBabeHistory(history)
      }
    } catch (error) {
      console.error('Error fetching beast babe history:', error)
    }
  }

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

  // GREEN SYSTEM: Emerald (#00C896), Forest (#1A5D52), Lime (#C5F547), Orange (#FF8C42)
  const getGreenSystemColors = () => {
    if (mode === 'chaos') {
      return {
        primary: '#00C896',      // Emerald
        primaryPair: '#1A5D52',   // Forest Green
        complementary: '#C5F547',  // Lime Green
        contrast: '#FF8C42',      // Orange
        bg: '#1A1A1A',
        text: '#FFFFFF',
        cardBg: '#2A2A2A'
      }
    } else if (mode === 'chill') {
      return {
        primary: '#00C896',      // Emerald
        primaryPair: '#1A5D52',   // Forest Green
        complementary: '#C8D961', // Lime Green (adjusted for chill)
        contrast: '#FF8C42',      // Orange
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

  const greenColors = getGreenSystemColors()

  const getCardStyle = () => {
    if (mode === 'chaos') {
      return { 
        bg: 'bg-[#1A5D52]',  // Forest Green background
        border: 'border-2', 
        borderColor: greenColors.primary, // Emerald border
        text: 'text-white', 
        accent: greenColors.primary // Emerald accent
      }
    } else if (mode === 'chill') {
      return { 
        bg: 'bg-white', 
        border: 'border', 
        borderColor: greenColors.complementary + '30', // Lime border
        text: 'text-[#4A1818]', 
        accent: greenColors.complementary // Lime accent
      }
    } else {
      return { 
        bg: 'bg-[#1a1a1a]', 
        border: 'border', 
        borderColor: '#FFFFFF',
        text: 'text-[#FFFFFF]', 
        accent: '#FFFFFF' 
      }
    }
  }

  const getRoundedClass = (defaultClass: string) => {
    return mode === 'code' ? 'rounded-none' : defaultClass
  }
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'anniversaries' | 'birthdays' | 'beast-history'>('all')

  if (authLoading || loading) {
    return (
      <div className={`${getBgClass()} ${getTextClass()} min-h-screen flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
      </div>
    )
  }

  return (
    <div className={`flex flex-col min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <SiteHeader />

      <main className="w-full max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24">
        {loading && (
          <div className="text-center py-8 mb-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: greenColors.primary }} />
            <p className={getTextClass()}>Loading team data...</p>
          </div>
        )}
        <div className="flex gap-6 w-full min-w-0">
          {/* Left Sidebar Card */}
          <Card className={`w-80 flex-shrink-0 min-w-80 ${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')} p-6 flex flex-col h-fit sticky top-24 self-start`} style={{ 
            borderColor: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.primaryPair : '#FFFFFF',
            borderWidth: mode === 'chaos' ? '2px' : '0px'
          }}>
            {/* Quick Stats Section */}
            <div className="mb-6">
              <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${mode === 'chill' ? 'text-[#4A1818]' : mode === 'chaos' ? 'text-[#00C896]' : 'text-white'}`}>
                ▼ QUICK STATS
              </h3>
              <div className="space-y-3">
                <div className={`p-3 ${getRoundedClass('rounded-xl')}`} style={{ backgroundColor: mode === 'chaos' ? greenColors.primaryPair + '40' : mode === 'chill' ? greenColors.complementary + '20' : 'rgba(255,255,255,0.1)' }}>
                  <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} mb-1`}>Team Members</p>
                  <p className={`text-2xl font-black ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>{teamStats.totalTeamMembers}</p>
                </div>
                <div className={`p-3 ${getRoundedClass('rounded-xl')}`} style={{ backgroundColor: mode === 'chaos' ? greenColors.primaryPair + '40' : mode === 'chill' ? greenColors.complementary + '20' : 'rgba(255,255,255,0.1)' }}>
                  <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} mb-1`}>Total Snaps</p>
                  <p className={`text-2xl font-black ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>{teamStats.totalSnaps}</p>
                </div>
                <div className={`p-3 ${getRoundedClass('rounded-xl')}`} style={{ backgroundColor: mode === 'chaos' ? greenColors.primaryPair + '40' : mode === 'chill' ? greenColors.complementary + '20' : 'rgba(255,255,255,0.1)' }}>
                  <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} mb-1`}>Active Pitches</p>
                  <p className={`text-2xl font-black ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>{teamStats.activePitches}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className={`h-px mb-6 ${mode === 'chaos' ? 'bg-[#00C896]/40' : mode === 'chill' ? 'bg-[#4A1818]/20' : 'bg-white/20'}`}></div>

            {/* Navigation Section */}
            <div className="mb-6">
              <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${mode === 'chill' ? 'text-[#4A1818]' : mode === 'chaos' ? 'text-[#00C896]' : 'text-white'}`}>
                ▼ SECTIONS
              </h3>
              <div className="space-y-2">
                {(['all', 'anniversaries', 'birthdays', 'beast-history'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                      activeFilter === filter
                        ? mode === 'chaos'
                          ? 'bg-[#00C896] text-black'
                          : mode === 'chill'
                          ? 'bg-[#00C896] text-white'
                          : 'bg-white text-black'
                        : mode === 'chaos'
                        ? 'bg-[#00C896]/30 text-white/80 hover:bg-[#00C896]/50 text-white'
                        : mode === 'chill'
                        ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                        : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                    }`}
                  >
                    {filter === 'all' && <Users className="w-4 h-4" />}
                    {filter === 'anniversaries' && <PartyPopper className="w-4 h-4" />}
                    {filter === 'birthdays' && <Cake className="w-4 h-4" />}
                    {filter === 'beast-history' && <Crown className="w-4 h-4" />}
                    <span className="font-black uppercase text-sm">
                      {filter === 'all' ? 'All' : filter === 'beast-history' ? 'History of the Beast' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </span>
                  </button>
                ))}
                
                {/* Links to separate pages */}
                <Link
                  href="/team/directory"
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    mode === 'chaos'
                      ? 'bg-[#00C896]/30 text-white/80 hover:bg-[#00C896]/50 text-white'
                      : mode === 'chill'
                      ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                      : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">Directory</span>
                </Link>
              </div>
            </div>

          </Card>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className={`text-4xl font-black uppercase ${getTextClass()}`}>TEAM</h1>
              <div className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>
                {teamStats.totalTeamMembers} {teamStats.totalTeamMembers === 1 ? 'member' : 'members'}
              </div>
            </div>

            {/* Team by Numbers Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className={`${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-xl')} p-4`} style={{
                borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333',
                borderWidth: '1px'
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} mb-1`}>Team Members</p>
                    <p className={`text-2xl font-black ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>{teamStats.totalTeamMembers}</p>
                  </div>
                  <div className={`w-12 h-12 ${getRoundedClass('rounded-lg')} flex items-center justify-center`} style={{ backgroundColor: greenColors.contrast }}>
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>
              
              <Card className={`${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-xl')} p-4`} style={{
                borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333',
                borderWidth: '1px'
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} mb-1`}>Total Snaps</p>
                    <p className={`text-2xl font-black ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>{teamStats.totalSnaps}</p>
                  </div>
                  <div className={`w-12 h-12 ${getRoundedClass('rounded-lg')} flex items-center justify-center`} style={{ backgroundColor: greenColors.primaryPair }}>
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>
              
              <Card className={`${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-xl')} p-4`} style={{
                borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333',
                borderWidth: '1px'
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} mb-1`}>Active Pitches</p>
                    <p className={`text-2xl font-black ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>{teamStats.activePitches}</p>
                  </div>
                  <div className={`w-12 h-12 ${getRoundedClass('rounded-lg')} flex items-center justify-center`} style={{ backgroundColor: greenColors.complementary }}>
                    <Briefcase className="w-6 h-6" style={{ color: mode === 'chill' ? '#4A1818' : '#000' }} />
                  </div>
                </div>
              </Card>
              
              <Card className={`${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-xl')} p-4`} style={{
                borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333',
                borderWidth: '1px'
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} mb-1`}>Snap Leader</p>
                    <p className={`text-lg font-black ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'} truncate`}>
                      {teamStats.snapLeader?.full_name || teamStats.snapLeader?.email || 'N/A'}
                    </p>
                    {teamStats.snapLeader && (
                      <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/50' : 'text-white/50'}`}>{teamStats.snapLeader.count} snaps</p>
                    )}
                  </div>
                  <div className={`w-12 h-12 ${getRoundedClass('rounded-lg')} flex items-center justify-center`} style={{ backgroundColor: greenColors.primary }}>
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Beast Babe and Snap Leaderboard - Side by Side (1/2 each) - Show for 'all' */}
            {activeFilter === 'all' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Beast Babe - 1/2 width */}
                <div className="w-full">
                  <BeastBabeCard />
                </div>
                
                {/* Snap Leaderboard - 1/2 width */}
                <Card className={`${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-xl')} p-6 min-h-[600px] flex flex-col`} style={{
                  borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333',
                  borderWidth: '1px'
                }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-12 h-12 ${getRoundedClass('rounded-lg')} flex items-center justify-center`} style={{ backgroundColor: greenColors.primary }}>
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <h2 className={`text-2xl font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>Snap Leaderboard</h2>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    {snapLeaderboard.length > 0 ? (
                      <div className="space-y-3">
                        {snapLeaderboard.map((user, index) => (
                          <div key={user.id} className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${getRoundedClass('rounded-full')} flex items-center justify-center text-sm font-bold ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`} style={{ backgroundColor: greenColors.primary + '20' }}>
                              {index + 1}
                            </div>
                            {user.full_name || user.email ? (
                              <>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'} truncate`}>
                                    {user.full_name || user.email || 'Unknown'}
                                  </p>
                                  <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/50' : 'text-white/50'}`}>
                                    {user.count} {user.count === 1 ? 'snap' : 'snaps'}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <div className="flex-1">
                                <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/50' : 'text-white/50'}`}>Unknown user</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className={`${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>No snaps yet</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Curator, Anniversaries, and Birthdays - Show based on filter */}
            {(activeFilter === 'all' || activeFilter === 'anniversaries' || activeFilter === 'birthdays') && (
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-6`}>
                {/* Current Curator Card - Only show for 'all' */}
                {activeFilter === 'all' && (
                  <Card className={`${mode === 'chaos' ? 'bg-[#1A5D52]' : mode === 'chill' ? 'bg-[#E8F5E9]' : 'bg-[#1A5D52]'} ${getRoundedClass('rounded-xl')} p-6 flex flex-col`} style={{
                    borderColor: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.primaryPair : greenColors.primary,
                    borderWidth: '2px'
                  }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 ${getRoundedClass('rounded-lg')} flex items-center justify-center`} style={{ backgroundColor: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.primaryPair : greenColors.primary }}>
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <h2 className={`text-lg font-black uppercase ${mode === 'chill' ? 'text-[#1A5D52]' : 'text-white'}`}>Curator</h2>
                    </div>
                    
                    {currentCurator ? (
                      <div className="flex-1 flex flex-col">
                        {/* Curator Avatar */}
                        <div className="flex justify-center mb-4">
                          <div className="relative w-32 h-32 overflow-hidden rounded-full" style={{ borderWidth: '3px', borderColor: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.primaryPair : greenColors.primary }}>
                            {currentCurator.curator_photo_url ? (
                              <img
                                src={currentCurator.curator_photo_url}
                                alt={currentCurator.curator}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: mode === 'chaos' ? greenColors.primaryPair : mode === 'chill' ? greenColors.primary : greenColors.primaryPair }}>
                                <Music className="w-10 h-10 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Curator Name */}
                        <h3 className={`text-xl font-black text-center mb-4 ${mode === 'chill' ? 'text-[#1A5D52]' : 'text-white'}`}>
                          {currentCurator.curator}
                        </h3>
                        
                        {/* Playlist Link */}
                        {currentCurator.spotify_url && (
                          <div className="mt-auto">
                            <a
                              href={currentCurator.spotify_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-center gap-2 ${getRoundedClass('rounded-lg')} px-4 py-3 text-sm font-semibold transition-colors ${
                                mode === 'chaos'
                                  ? 'bg-[#00C896] text-black hover:bg-[#00B886]'
                                  : mode === 'chill'
                                  ? 'bg-[#1A5D52] text-white hover:bg-[#154A42]'
                                  : 'bg-[#00C896] text-black hover:bg-[#00B886]'
                              }`}
                            >
                              <span>View Playlist</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <p className={`text-sm ${mode === 'chill' ? 'text-[#1A5D52]/60' : 'text-white/60'}`}>No curator selected</p>
                      </div>
                    )}
                  </Card>
                )}

                {/* Anniversaries - Show for 'all' and 'anniversaries' */}
                {(activeFilter === 'all' || activeFilter === 'anniversaries') && (
                  <Card className={`${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-xl')} p-4 ${activeFilter === 'anniversaries' ? 'md:col-span-3' : ''}`} style={{
                    borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333',
                    borderWidth: '1px'
                  }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 ${getRoundedClass('rounded-lg')} flex items-center justify-center`} style={{ backgroundColor: greenColors.primaryPair }}>
                        <PartyPopper className="w-5 h-5 text-white" />
                      </div>
                      <h2 className={`text-lg font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>Anniversaries</h2>
                    </div>
                    {anniversaries.length > 0 ? (
                      <div className="space-y-3">
                        {anniversaries.map((anniversary) => (
                          <div key={anniversary.id} className="flex items-center gap-3">
                            {anniversary.avatar_url ? (
                              <img
                                src={anniversary.avatar_url}
                                alt={anniversary.full_name || 'User'}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: (mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF') + '33' }}>
                                <Users className="w-5 h-5" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'} truncate`}>
                                {anniversary.full_name || 'Unknown'}
                              </p>
                              <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>
                                {anniversary.years} {anniversary.years === 1 ? 'year' : 'years'} on {anniversary.start_date ? new Date(anniversary.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>No anniversaries in the next 7 days</p>
                    )}
                  </Card>
                )}

                {/* Birthdays - Show for 'all' and 'birthdays' */}
                {(activeFilter === 'all' || activeFilter === 'birthdays') && (
                  <Card className={`${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-xl')} p-4 ${activeFilter === 'birthdays' ? 'md:col-span-3' : ''}`} style={{
                    borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333',
                    borderWidth: '1px'
                  }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 ${getRoundedClass('rounded-lg')} flex items-center justify-center`} style={{ backgroundColor: greenColors.complementary }}>
                        <Cake className="w-5 h-5" style={{ color: mode === 'chill' ? '#4A1818' : '#000' }} />
                      </div>
                      <h2 className={`text-lg font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>Birthdays</h2>
                    </div>
                    {birthdays.length > 0 ? (
                      <div className="space-y-3">
                        {birthdays.map((birthday) => (
                          <div key={birthday.id} className="flex items-center gap-3">
                            {birthday.avatar_url ? (
                              <img
                                src={birthday.avatar_url}
                                alt={birthday.full_name || 'User'}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: (mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF') + '33' }}>
                                <Users className="w-5 h-5" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'} truncate`}>
                                {birthday.full_name || 'Unknown'}
                              </p>
                              <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>
                                {birthday.birthday}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>No birthdays in the next 7 days</p>
                    )}
                  </Card>
                )}
              </div>
            )}

            {/* History of the Beast - Show when 'beast-history' filter is active */}
            {activeFilter === 'beast-history' && (
              <Card className={`${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-xl')} p-6`} style={{
                borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333',
                borderWidth: '1px'
              }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 ${getRoundedClass('rounded-lg')} flex items-center justify-center`} style={{ backgroundColor: greenColors.primary }}>
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <h2 className={`text-2xl font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>History of the Beast</h2>
                </div>
                
                {beastBabeHistory.length > 0 ? (
                  <div className="relative" style={{ minHeight: `${Math.max(600, beastBabeHistory.length * 100)}px`, padding: '2rem 0' }}>
                    {/* Curving Path SVG */}
                    <svg 
                      className="absolute inset-0 w-full h-full" 
                      style={{ overflow: 'visible', pointerEvents: 'none' }}
                      viewBox="0 0 1000 1000"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <defs>
                        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={greenColors.primary} stopOpacity="0.8" />
                          <stop offset="50%" stopColor={greenColors.complementary} stopOpacity="0.6" />
                          <stop offset="100%" stopColor={greenColors.primaryPair} stopOpacity="0.4" />
                        </linearGradient>
                      </defs>
                      {/* Curving path - candyland style */}
                      <path
                        d={(() => {
                          const total = beastBabeHistory.length
                          let path = `M 100 50`
                          
                          for (let i = 1; i < total; i++) {
                            const progress = i / (total - 1)
                            // Create a curving path that snakes across
                            const baseX = 100 + progress * 700
                            const baseY = 50 + progress * 900
                            const curveX = baseX + Math.sin(progress * Math.PI * 6) * 80
                            const curveY = baseY + Math.cos(progress * Math.PI * 4) * 60
                            
                            if (i === 1) {
                              path += ` Q ${baseX - 50} ${baseY - 30}, ${curveX} ${curveY}`
                            } else {
                              const prevProgress = (i - 1) / (total - 1)
                              const prevX = 100 + prevProgress * 700 + Math.sin(prevProgress * Math.PI * 6) * 80
                              const prevY = 50 + prevProgress * 900 + Math.cos(prevProgress * Math.PI * 4) * 60
                              const cp1x = prevX + (curveX - prevX) * 0.3
                              const cp1y = prevY + (curveY - prevY) * 0.3
                              const cp2x = prevX + (curveX - prevX) * 0.7
                              const cp2y = prevY + (curveY - prevY) * 0.7
                              path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curveX} ${curveY}`
                            }
                          }
                          return path
                        })()}
                        fill="none"
                        stroke="url(#pathGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(0, 200, 150, 0.4))' }}
                      />
                    </svg>
                    
                    {/* Avatars positioned along the path */}
                    {beastBabeHistory.map((entry, index) => {
                      const progress = index / (beastBabeHistory.length - 1)
                      // Calculate position along the curving path
                      const baseX = 100 + progress * 700
                      const baseY = 50 + progress * 900
                      const pathX = baseX + Math.sin(progress * Math.PI * 6) * 80
                      const pathY = baseY + Math.cos(progress * Math.PI * 4) * 60
                      
                      // Position avatar offset to the side of the path
                      const angle = Math.atan2(
                        Math.cos(progress * Math.PI * 4) * -60,
                        Math.sin(progress * Math.PI * 6) * 80
                      )
                      const offsetX = Math.cos(angle + Math.PI / 2) * 100
                      const offsetY = Math.sin(angle + Math.PI / 2) * 100
                      
                      return (
                        <div
                          key={entry.id}
                          className="absolute z-10"
                          style={{
                            left: `${((pathX + offsetX) / 1000) * 100}%`,
                            top: `${((pathY + offsetY) / 1000) * 100}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div className="relative group">
                            {/* Avatar */}
                            <div className="relative">
                              {entry.user?.avatar_url ? (
                                <img
                                  src={entry.user.avatar_url}
                                  alt={entry.user.full_name || 'User'}
                                  className="w-12 h-12 rounded-full object-cover border-2 cursor-pointer transition-transform hover:scale-125"
                                  style={{ 
                                    borderColor: index === 0 ? greenColors.primary : greenColors.complementary,
                                    borderWidth: index === 0 ? '3px' : '2px',
                                    boxShadow: index === 0 ? `0 0 16px ${greenColors.primary}90` : `0 0 8px ${greenColors.complementary}50`
                                  }}
                                />
                              ) : (
                                <div 
                                  className="w-12 h-12 rounded-full flex items-center justify-center border-2 cursor-pointer transition-transform hover:scale-125"
                                  style={{ 
                                    backgroundColor: greenColors.primaryPair + '60',
                                    borderColor: index === 0 ? greenColors.primary : greenColors.complementary,
                                    borderWidth: index === 0 ? '3px' : '2px',
                                    boxShadow: index === 0 ? `0 0 16px ${greenColors.primary}90` : `0 0 8px ${greenColors.complementary}50`
                                  }}
                                >
                                  <Crown className="w-6 h-6" style={{ color: index === 0 ? greenColors.primary : greenColors.complementary }} />
                                </div>
                              )}
                              {/* Crown badge for current */}
                              {index === 0 && (
                                <div 
                                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center animate-bounce z-20"
                                  style={{ backgroundColor: greenColors.primary }}
                                >
                                  <Crown className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            
                            {/* Tooltip on hover */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 whitespace-nowrap">
                              <div 
                                className={`px-3 py-2 ${getRoundedClass('rounded-lg')} shadow-lg`}
                                style={{ 
                                  backgroundColor: mode === 'chaos' ? '#2A2A2A' : mode === 'chill' ? '#FFFFFF' : '#1a1a1a',
                                  border: `1px solid ${greenColors.primary}`
                                }}
                              >
                                <p className={`text-sm font-black ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>
                                  {entry.user?.full_name || entry.user?.email || 'Unknown'}
                                </p>
                                <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>
                                  {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                {entry.achievement && (
                                  <p className={`text-xs italic mt-1 ${mode === 'chill' ? 'text-[#4A1818]/80' : 'text-white/80'}`}>
                                    "{entry.achievement}"
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className={`text-center py-8 ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>No beast babe history found</p>
                )}
              </Card>
            )}

          </div>
        </div>

        <Footer />
      </main>
      
      {/* Profile View Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className={`${mode === 'chaos' ? 'bg-[#1A5D52]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')} max-w-2xl max-h-[90vh] overflow-y-auto`} style={{ 
          borderColor: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF',
          borderWidth: mode === 'chaos' ? '2px' : '0px'
        }}>
          {loadingProfile ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
            </div>
          ) : selectedProfile ? (
            <>
              <DialogHeader>
                <DialogTitle className={`text-2xl font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>
                  {selectedProfile.full_name || selectedProfile.email || 'Profile'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 mt-6">
                {/* Avatar and Basic Info */}
                <div className="flex items-start gap-6">
                  {selectedProfile.avatar_url ? (
                    <img
                      src={selectedProfile.avatar_url}
                      alt={selectedProfile.full_name || 'User'}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: (mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF') + '33' }}>
                      <Users className="w-12 h-12" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className={`text-xl font-black ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'} mb-2`}>
                      {selectedProfile.full_name || selectedProfile.email || 'Unknown'}
                    </h3>
                    {selectedProfile.pronouns && (
                      <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} mb-1`}>
                        {selectedProfile.pronouns}
                      </p>
                    )}
                    {selectedProfile.email && (
                      <div className="flex items-center gap-2 mt-2">
                        <Mail className="w-4 h-4" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                        <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>
                          {selectedProfile.email}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Bio */}
                {selectedProfile.bio && (
                  <div>
                    <h4 className={`text-sm font-black uppercase mb-2 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>Bio</h4>
                    <p className={`${mode === 'chill' ? 'text-[#4A1818]/80' : 'text-white/80'}`}>{selectedProfile.bio}</p>
                  </div>
                )}
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedProfile.role && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <BriefcaseIcon className="w-4 h-4" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                        <h4 className={`text-xs font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>Role</h4>
                      </div>
                      <p className={`${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>{selectedProfile.role}</p>
                    </div>
                  )}
                  
                  {selectedProfile.discipline && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                        <h4 className={`text-xs font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>Discipline</h4>
                      </div>
                      <p className={`${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>{selectedProfile.discipline}</p>
                    </div>
                  )}
                  
                  {selectedProfile.birthday && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Cake className="w-4 h-4" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                        <h4 className={`text-xs font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>Birthday</h4>
                      </div>
                      <p className={`${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>{selectedProfile.birthday}</p>
                    </div>
                  )}
                  
                  {selectedProfile.start_date && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CalendarIcon className="w-4 h-4" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                        <h4 className={`text-xs font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>Start Date</h4>
                      </div>
                      <p className={`${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>
                        {new Date(selectedProfile.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                  
                  {selectedProfile.location && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                        <h4 className={`text-xs font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>Location</h4>
                      </div>
                      <p className={`${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>{selectedProfile.location}</p>
                    </div>
                  )}
                  
                  {selectedProfile.website && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                        <h4 className={`text-xs font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>Website</h4>
                      </div>
                      <a 
                        href={selectedProfile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`text-sm ${mode === 'chill' ? 'text-[#4A1818] hover:text-[#4A1818]/80' : 'text-white hover:text-white/80'} underline`}
                      >
                        {selectedProfile.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

