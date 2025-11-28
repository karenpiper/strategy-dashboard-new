'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Footer } from '@/components/footer'
import { createClient } from '@/lib/supabase/client'
import { Crown, Loader2, ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'

export default function BeastHistoryPage() {
  const { mode } = useMode()
  const { user, authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [beastBabeHistory, setBeastBabeHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    fetchBeastBabeHistory()
  }, [])

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
    } finally {
      setLoading(false)
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
          <Card className={`w-80 flex-shrink-0 min-w-80 ${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')} p-6 flex flex-col h-fit`} style={{ 
            borderColor: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.primaryPair : '#FFFFFF',
            borderWidth: mode === 'chaos' ? '2px' : '0px'
          }}>
            {/* Quick Stats Section */}
            <div className="mb-6">
              <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${mode === 'chill' ? 'text-[#4A1818]' : mode === 'chaos' ? 'text-[#00C896]' : 'text-white'}`}>
                ▼ NAVIGATION
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
          
          {beastBabeHistory.length > 0 ? (
            <div className="relative">
              {beastBabeHistory.map((entry, index) => {
                const isLast = index === beastBabeHistory.length - 1
                
                return (
                  <div key={entry.id} className="relative pb-8">
                    {/* Rounded Connecting Line */}
                    {!isLast && (
                      <div className="absolute left-8 top-20 z-0" style={{ width: '2px', height: 'calc(100% - 0.5rem)' }}>
                        {/* Curved SVG line */}
                        <svg 
                          className="absolute inset-0 w-full h-full" 
                          style={{ overflow: 'visible' }}
                        >
                          <path
                            d={`M 0 0 Q 20 ${(beastBabeHistory.length - index) * 10} 0 ${(beastBabeHistory.length - index) * 20} L 0 100%`}
                            fill="none"
                            stroke={greenColors.primary}
                            strokeWidth="2"
                            strokeDasharray="4 4"
                            opacity="0.6"
                            className="animate-pulse"
                          />
                          {/* Animated dot */}
                          <circle
                            cx="0"
                            cy="0"
                            r="4"
                            fill={greenColors.primary}
                            opacity="0.8"
                            className="animate-ping"
                            style={{
                              animationDelay: `${index * 0.5}s`,
                              animationDuration: '2s'
                            }}
                          />
                        </svg>
                        {/* Straight line with gradient */}
                        <div 
                          className="absolute top-0 left-0 w-0.5 h-full"
                          style={{
                            background: `linear-gradient(to bottom, ${greenColors.primary}60, ${greenColors.complementary}60, transparent)`,
                            borderRadius: '2px'
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex items-start gap-4 relative z-10">
                      {/* Avatar with animated border */}
                      <div className="relative">
                        <div 
                          className="absolute inset-0 rounded-full animate-pulse"
                          style={{
                            backgroundColor: greenColors.primary + '30',
                            transform: 'scale(1.1)'
                          }}
                        />
                        {entry.user?.avatar_url ? (
                          <img
                            src={entry.user.avatar_url}
                            alt={entry.user.full_name || 'User'}
                            className="w-16 h-16 rounded-full object-cover border-2 relative z-10"
                            style={{ borderColor: greenColors.primary }}
                          />
                        ) : (
                          <div 
                            className="w-16 h-16 rounded-full flex items-center justify-center border-2 relative z-10"
                            style={{ 
                              backgroundColor: greenColors.primaryPair + '40',
                              borderColor: greenColors.primary
                            }}
                          >
                            <Crown className="w-8 h-8" style={{ color: greenColors.primary }} />
                          </div>
                        )}
                        {/* Crown badge for current */}
                        {index === 0 && (
                          <div 
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center animate-bounce z-20"
                            style={{ backgroundColor: greenColors.primary }}
                          >
                            <Crown className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className={`text-lg font-black ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>
                            {entry.user?.full_name || entry.user?.email || 'Unknown'}
                          </p>
                          {index === 0 && (
                            <span 
                              className="text-xs px-2 py-0.5 rounded-full font-black uppercase animate-pulse"
                              style={{ 
                                backgroundColor: greenColors.primary,
                                color: mode === 'chaos' ? '#000' : '#fff'
                              }}
                            >
                              Current
                            </span>
                          )}
                        </div>
                        
                        {entry.achievement && (
                          <p className={`text-sm italic mb-2 ${mode === 'chill' ? 'text-[#4A1818]/80' : 'text-white/80'}`}>
                            "{entry.achievement}"
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          <span className={`${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>
                            {new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          
                          {entry.passed_by && (
                            <>
                              <span className={`${mode === 'chill' ? 'text-[#4A1818]/40' : 'text-white/40'}`}>•</span>
                              <div className="flex items-center gap-2">
                                <span className={`${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>Passed from</span>
                                <div className="flex items-center gap-1">
                                  {entry.passed_by.avatar_url ? (
                                    <img
                                      src={entry.passed_by.avatar_url}
                                      alt={entry.passed_by.full_name || 'User'}
                                      className="w-5 h-5 rounded-full object-cover border"
                                      style={{ borderColor: greenColors.complementary }}
                                    />
                                  ) : (
                                    <div 
                                      className="w-5 h-5 rounded-full flex items-center justify-center border"
                                      style={{ 
                                        backgroundColor: greenColors.complementary + '40',
                                        borderColor: greenColors.complementary
                                      }}
                                    >
                                      <Users className="w-3 h-3" style={{ color: greenColors.complementary }} />
                                    </div>
                                  )}
                                  <span className={`font-semibold ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>
                                    {entry.passed_by.full_name || entry.passed_by.email || 'Unknown'}
                                  </span>
                                </div>
                              </div>
                            </>
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
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

