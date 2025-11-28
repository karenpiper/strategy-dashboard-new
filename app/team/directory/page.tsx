'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Footer } from '@/components/footer'
import { createClient } from '@/lib/supabase/client'
import { Users, Search, Loader2, ArrowLeft, Crown } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function TeamDirectoryPage() {
  const { mode } = useMode()
  const { user, authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [directorySearch, setDirectorySearch] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    fetchAllProfiles()
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  const handleProfileClick = (profileId: string) => {
    const profile = allProfiles.find(p => p.id === profileId)
    if (profile) {
      setSelectedProfile(profile)
      setIsProfileDialogOpen(true)
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

  const filteredProfiles = allProfiles.filter(profile => {
    if (!directorySearch) return true
    const searchLower = directorySearch.toLowerCase()
    const fullName = (profile.full_name || '').toLowerCase()
    const email = (profile.email || '').toLowerCase()
    const role = (profile.role || '').toLowerCase()
    const discipline = (profile.discipline || '').toLowerCase()
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           role.includes(searchLower) || 
           discipline.includes(searchLower)
  })

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
                      ? 'bg-[#00C896] text-black'
                      : mode === 'chill'
                      ? 'bg-[#00C896] text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">Directory</span>
                </Link>
                
                <Link
                  href="/team/beast-history"
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    mode === 'chaos'
                      ? 'bg-[#00C896]/30 text-white/80 hover:bg-[#00C896]/50 text-white'
                      : mode === 'chill'
                      ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                      : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
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
            <div className={`w-12 h-12 ${getRoundedClass('rounded-lg')} flex items-center justify-center`} style={{ backgroundColor: greenColors.contrast }}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className={`text-3xl font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>Team Directory</h1>
          </div>
          
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${mode === 'chill' ? 'text-[#4A1818]/50' : 'text-white/50'}`} />
              <input
                type="text"
                placeholder="Search team members..."
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 ${getRoundedClass('rounded-lg')} ${
                  mode === 'chaos'
                    ? 'bg-[#1A1A1A] border border-[#00C896]/30 text-white placeholder-white/50'
                    : mode === 'chill'
                    ? 'bg-white/80 border border-[#1A5D52]/30 text-[#4A1818] placeholder-[#4A1818]/50'
                    : 'bg-black/40 border border-white/20 text-white placeholder-white/50'
                } focus:outline-none focus:ring-2`}
                style={{
                  '--tw-ring-color': mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.primaryPair : '#FFFFFF'
                } as React.CSSProperties}
              />
              {directorySearch && (
                <button
                  onClick={() => setDirectorySearch('')}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${mode === 'chill' ? 'text-[#4A1818]/50 hover:text-[#4A1818]' : 'text-white/50 hover:text-white'}`}
                >
                  ×
                </button>
              )}
            </div>
            {directorySearch && (
              <p className={`text-xs mt-2 ${mode === 'chill' ? 'text-[#4A1818]/50' : 'text-white/50'}`}>
                {filteredProfiles.length} result{filteredProfiles.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
          
          {/* Directory Grid */}
          {filteredProfiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleProfileClick(profile.id)}
                  className={`p-4 ${getRoundedClass('rounded-xl')} border hover:opacity-80 transition-opacity text-left w-full ${mode === 'chaos' ? 'bg-[#00C896]/10 border-[#00C896]/30' : mode === 'chill' ? 'bg-white/50 border-[#C8D961]/30' : 'bg-black/40 border-white/20'}`}
                >
                  <div className="flex items-center gap-3">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || 'User'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: (mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF') + '33' }}>
                        <Users className="w-6 h-6" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'} truncate`}>
                        {profile.full_name || profile.email || 'Unknown'}
                      </p>
                      {profile.role && (
                        <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} truncate`}>{profile.role}</p>
                      )}
                      {profile.discipline && (
                        <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'} truncate`}>{profile.discipline}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className={`text-center py-8 ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>
              {directorySearch ? `No team members found matching "${directorySearch}"` : 'No team members found'}
            </p>
          )}
        </Card>
          </div>
        </div>

        <Footer />
      </main>

      {/* Profile Dialog */}
      {selectedProfile && (
        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <DialogContent className={`${mode === 'chaos' ? 'bg-[#2A2A2A]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')} max-w-2xl max-h-[90vh] overflow-y-auto`} style={{ 
            borderColor: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF',
            borderWidth: mode === 'chaos' ? '2px' : '0px'
          }}>
            <DialogHeader>
              <DialogTitle className={mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}>
                {selectedProfile.full_name || selectedProfile.email || 'Unknown'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedProfile.avatar_url && (
                <img
                  src={selectedProfile.avatar_url}
                  alt={selectedProfile.full_name || 'User'}
                  className="w-24 h-24 rounded-full object-cover mx-auto"
                />
              )}
              {selectedProfile.role && (
                <div>
                  <p className={`text-sm font-semibold ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>Role</p>
                  <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>{selectedProfile.role}</p>
                </div>
              )}
              {selectedProfile.discipline && (
                <div>
                  <p className={`text-sm font-semibold ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>Discipline</p>
                  <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>{selectedProfile.discipline}</p>
                </div>
              )}
              {selectedProfile.email && (
                <div>
                  <p className={`text-sm font-semibold ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>Email</p>
                  <p className={`text-sm ${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'}`}>{selectedProfile.email}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

