'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Footer } from '@/components/footer'
import { createClient } from '@/lib/supabase/client'
import { Crown, Loader2, ArrowLeft, Users, PartyPopper, Cake, Trophy, Calendar as CalendarIcon } from 'lucide-react'
import Link from 'next/link'

export default function BeastHistoryPage() {
  const { mode } = useMode()
  const { user, authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [beastBabeHistory, setBeastBabeHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [teamStats, setTeamStats] = useState({
    totalTeamMembers: 0,
    totalSnaps: 0,
    activePitches: 0,
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    fetchBeastBabeHistory()
    fetchTeamStats()
  }, [])

  const fetchBeastBabeHistory = async () => {
    try {
      setLoading(true)
      // Simple query - just get the history data
      const { data: history, error } = await supabase
        .from('beast_babe_history')
        .select('*')
        .order('date', { ascending: false })
      
      if (error) {
        console.error('Error fetching beast babe history:', error)
        setBeastBabeHistory([])
        return
      }
      
      if (!history || history.length === 0) {
        setBeastBabeHistory([])
        return
      }
      
      // Manually fetch user profiles
      const userIds = [...new Set(history.map((h: any) => h.user_id).filter(Boolean))]
      const passedByIds = [...new Set(history.map((h: any) => h.passed_by_user_id).filter(Boolean))]
      const allIds = [...new Set([...userIds, ...passedByIds])]
      
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', allIds)
        
        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])
        
        const enrichedHistory = history.map((entry: any) => ({
          ...entry,
          user: profileMap.get(entry.user_id) || null,
          passed_by: entry.passed_by_user_id ? profileMap.get(entry.passed_by_user_id) || null : null
        }))
        
        setBeastBabeHistory(enrichedHistory)
      } else {
        setBeastBabeHistory(history)
      }
    } catch (error) {
      console.error('Error fetching beast babe history:', error)
      setBeastBabeHistory([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamStats = async () => {
    try {
      // Total team members
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true)
      
      // Total snaps
      const { data: snaps } = await supabase
        .from('snaps')
        .select('id')
      
      // Active pitches (work samples with type "Pitch" from last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const { data: pitches } = await supabase
        .from('work_samples')
        .select(`
          id,
          work_sample_types!inner(name)
        `)
        .eq('work_sample_types.name', 'Pitch')
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
      
      setTeamStats({
        totalTeamMembers: profiles?.length || 0,
        totalSnaps: snaps?.length || 0,
        activePitches: pitches?.length || 0,
      })
    } catch (error) {
      console.error('Error fetching team stats:', error)
    }
  }

  const getBgClass = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#1A1A1A]'
      case 'chill': return 'bg-[#F5E6D3]'
      case 'code': return 'bg-black'
      default: return 'bg-black'
    }
  }

  const getTextClass = () => {
    switch (mode) {
      case 'chaos': return 'text-[#00C896]'
      case 'chill': return 'text-[#4A1818]'
      case 'code': return 'text-[#FFFFFF]'
      default: return 'text-white'
    }
  }

  const getGreenSystemColors = () => {
    if (mode === 'chaos') {
      return {
        primary: '#00C896',
        primaryPair: '#1A5D52',
        complementary: '#C5F547',
        contrast: '#FF8C42',
      }
    } else if (mode === 'chill') {
      return {
        primary: '#00C896',
        primaryPair: '#1A5D52',
        complementary: '#C8D961',
        contrast: '#FF8C42',
      }
    } else {
      return {
        primary: '#FFFFFF',
        primaryPair: '#808080',
        complementary: '#666666',
        contrast: '#FFFFFF',
      }
    }
  }

  const greenColors = getGreenSystemColors()

  const getRoundedClass = (defaultClass: string) => {
    return mode === 'code' ? 'rounded-none' : defaultClass
  }

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
        <div className="flex gap-6 w-full">
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
                <Link
                  href="/team"
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    mode === 'chaos'
                      ? 'bg-[#00C896]/30 text-white/80 hover:bg-[#00C896]/50 text-white'
                      : mode === 'chill'
                      ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                      : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">All</span>
                </Link>
                
                <Link
                  href="/team"
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    mode === 'chaos'
                      ? 'bg-[#00C896]/30 text-white/80 hover:bg-[#00C896]/50 text-white'
                      : mode === 'chill'
                      ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                      : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">Team Dates</span>
                </Link>
                
                <Link
                  href="/team/beast-history"
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    mode === 'chaos'
                      ? 'bg-[#00C896] text-black'
                      : mode === 'chill'
                      ? 'bg-[#00C896] text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">History of the Beast</span>
                </Link>
                
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
          <div className="flex-1 min-w-0">
        <Card className={`${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-xl')} p-6`} style={{
          borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333',
          borderWidth: '1px'
        }}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 ${getRoundedClass('rounded-lg')} flex items-center justify-center`} style={{ backgroundColor: greenColors.primary }}>
              <Crown className="w-6 h-6 text-white" />
            </div>
            <h1 className={`text-3xl font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>History of the Beast</h1>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
            </div>
          ) : beastBabeHistory.length > 0 ? (
            <div className="relative" style={{ minHeight: `${beastBabeHistory.length * 120}px`, padding: '2rem 0' }}>
              {/* Horizontal zigzag timeline SVG */}
              <svg 
                className="absolute inset-0 w-full h-full" 
                style={{ overflow: 'visible', pointerEvents: 'none' }}
                viewBox={`0 0 1000 ${beastBabeHistory.length * 120}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={greenColors.primary} stopOpacity="0.9" />
                    <stop offset="50%" stopColor={greenColors.complementary} stopOpacity="0.7" />
                    <stop offset="100%" stopColor={greenColors.primaryPair} stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                {/* Horizontal zigzag path */}
                <path
                  d={(() => {
                    const segmentHeight = 120
                    let path = `M 50 60`
                    
                    for (let i = 1; i < beastBabeHistory.length; i++) {
                      const y = 60 + (i * segmentHeight)
                      // Alternate between left and right sides
                      const isRight = i % 2 === 1
                      const x = isRight ? 950 : 50
                      
                      if (i === 1) {
                        // First segment goes right
                        path += ` L 950 ${y}`
                      } else {
                        // Subsequent segments zigzag
                        const prevY = 60 + ((i - 1) * segmentHeight)
                        const prevIsRight = (i - 1) % 2 === 1
                        const prevX = prevIsRight ? 950 : 50
                        
                        // Vertical line down, then horizontal to the other side
                        path += ` L ${prevX} ${y} L ${x} ${y}`
                      }
                    }
                    return path
                  })()}
                  fill="none"
                  stroke="url(#timelineGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(0, 200, 150, 0.3))' }}
                />
              </svg>
              
              {/* Avatars positioned along the timeline */}
              {beastBabeHistory.map((entry, index) => {
                const segmentHeight = 120
                const y = 60 + (index * segmentHeight)
                // Alternate between left and right sides
                const isRight = index % 2 === 1
                const x = isRight ? 950 : 50
                
                return (
                  <div
                    key={entry.id}
                    className="absolute z-10"
                    style={{
                      left: `${(x / 1000) * 100}%`,
                      top: `${(y / (beastBabeHistory.length * 120)) * 100}%`,
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
                            className="w-14 h-14 rounded-full object-cover border-2 cursor-pointer transition-transform hover:scale-110"
                            style={{ 
                              borderColor: index === 0 ? greenColors.primary : greenColors.complementary,
                              borderWidth: index === 0 ? '3px' : '2px',
                              boxShadow: index === 0 ? `0 0 12px ${greenColors.primary}80` : `0 0 6px ${greenColors.complementary}40`
                            }}
                          />
                        ) : (
                          <div 
                            className="w-14 h-14 rounded-full flex items-center justify-center border-2 cursor-pointer transition-transform hover:scale-110"
                            style={{ 
                              backgroundColor: greenColors.primaryPair + '60',
                              borderColor: index === 0 ? greenColors.primary : greenColors.complementary,
                              borderWidth: index === 0 ? '3px' : '2px',
                              boxShadow: index === 0 ? `0 0 12px ${greenColors.primary}80` : `0 0 6px ${greenColors.complementary}40`
                            }}
                          >
                            <Crown className="w-7 h-7" style={{ color: index === 0 ? greenColors.primary : greenColors.complementary }} />
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
                      
                      {/* Compact tooltip on hover */}
                      <div className={`absolute ${isRight ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 max-w-xs`}>
                        <div 
                          className={`px-3 py-2 ${getRoundedClass('rounded-md')} shadow-lg backdrop-blur-sm`}
                          style={{ 
                            backgroundColor: mode === 'chaos' ? 'rgba(42, 42, 42, 0.95)' : mode === 'chill' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(26, 26, 26, 0.95)',
                            border: `1px solid ${greenColors.primary}40`
                          }}
                        >
                          <p className={`text-xs font-semibold mb-1 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>
                            {entry.user?.full_name || entry.user?.email || 'Unknown'}
                          </p>
                          <p className={`text-[10px] mb-1 ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          {entry.achievement && (
                            <p className={`text-[10px] italic ${mode === 'chill' ? 'text-[#4A1818]/80' : 'text-white/80'} leading-tight`}>
                              {entry.achievement}
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
            <div className="text-center py-12">
              <p className={`text-lg mb-2 ${mode === 'chill' ? 'text-[#4A1818]/80' : 'text-white/80'}`}>No beast babe history found</p>
              <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>
                Beast babe recipients will appear here once data is available.
              </p>
            </div>
          )}
        </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

