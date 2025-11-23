'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { usePermissions } from '@/contexts/permissions-context'
import { useMode } from '@/contexts/mode-context'
import { Crown, ShieldOff, Users, ArrowRight, Loader2, History, Calendar, Search } from 'lucide-react'

interface User {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: string | null
  discipline: string | null
  is_active: boolean | null
}

interface BeastBabeHistory {
  id: string
  date: string
  user_id: string
  achievement: string | null
  passed_by_user_id: string | null
  created_at: string
  user: User
  passed_by: User | null
}

interface BeastBabeData {
  currentBeastBabe: (User & { history: BeastBabeHistory | null }) | null
  history: BeastBabeHistory[]
}

export default function BeastBabeAdmin() {
  const { permissions, user } = usePermissions()
  const { mode } = useMode()
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [achievement, setAchievement] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [passing, setPassing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [beastBabeData, setBeastBabeData] = useState<BeastBabeData | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showBrowseDialog, setShowBrowseDialog] = useState(false)
  const [browseSearchQuery, setBrowseSearchQuery] = useState('')

  useEffect(() => {
    fetchBeastBabeData()
    fetchUsers()
  }, [])

  const fetchBeastBabeData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/beast-babe')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch beast babe data')
      }

      const data = await response.json()
      setBeastBabeData(data)
    } catch (err: any) {
      console.error('Error fetching beast babe data:', err)
      setError(err.message || 'Failed to load beast babe data')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await fetch('/api/profiles')
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const result = await response.json()
      const users = result.data || []
      
      // Filter out current beast babe and inactive users from available users
      const currentBeastBabeId = beastBabeData?.currentBeastBabe?.id
      const availableUsers = users.filter((u: any) => {
        // Exclude current beast babe
        if (currentBeastBabeId && u.id === currentBeastBabeId) return false
        // Only include active users (is_active !== false)
        return u.is_active !== false
      })
      
      setAllUsers(availableUsers)
    } catch (err: any) {
      console.error('Error fetching users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  // Refetch users when beast babe data changes
  useEffect(() => {
    if (beastBabeData) {
      fetchUsers()
    }
  }, [beastBabeData?.currentBeastBabe?.id])

  const handlePassTorch = async () => {
    if (!selectedUserId) {
      setError('Please select a user to pass the torch to')
      return
    }

    if (!achievement.trim()) {
      setError('Please provide a reason for why they are the next Beast Babe')
      return
    }

    try {
      setPassing(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/beast-babe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newBeastBabeUserId: selectedUserId,
          achievement: achievement.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to pass torch')
      }

      setSuccess(data.message || 'Torch passed successfully!')
      setSelectedUserId('')
      setAchievement('')
      
      // Refetch data
      await fetchBeastBabeData()
    } catch (err: any) {
      console.error('Error passing torch:', err)
      setError(err.message || 'Failed to pass torch')
    } finally {
      setPassing(false)
    }
  }

  if (!permissions?.canPassBeastBabe) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Beast Babe Torch</h1>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <ShieldOff className="w-5 h-5" />
            <p>You don't have permission to pass the beast babe torch. Only the current Beast Babe or an admin can pass it to the next person.</p>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentBeastBabe = beastBabeData?.currentBeastBabe
  const history = beastBabeData?.history || []

  // Filter users based on search query - only show results when searching
  const filteredUsers = allUsers.filter(user => {
    if (!searchQuery.trim()) return false // Don't show any users until user searches
    const query = searchQuery.toLowerCase()
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query) ||
      user.discipline?.toLowerCase().includes(query)
    )
  })

  // Filter users for browse dialog
  const filteredBrowseUsers = allUsers.filter(user => {
    if (!browseSearchQuery.trim()) return true
    const query = browseSearchQuery.toLowerCase()
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query) ||
      user.discipline?.toLowerCase().includes(query)
    )
  })

  const handleSelectFromDialog = (userId: string) => {
    setSelectedUserId(userId)
    setShowBrowseDialog(false)
    setBrowseSearchQuery('')
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-8 h-8 text-yellow-500" />
          <h1 className="text-4xl font-bold text-foreground">Beast Babe Torch</h1>
        </div>
        <p className="text-muted-foreground">
          Pass the Beast Babe torch to the next deserving person
        </p>
      </div>

      {/* Current Beast Babe */}
      {currentBeastBabe && (
        <Card className="p-6">
          <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-semibold text-foreground">Current Beast Babe</h2>
            </div>
            <div className="flex items-start gap-4">
              {currentBeastBabe.avatar_url ? (
                <img
                  src={currentBeastBabe.avatar_url}
                  alt={currentBeastBabe.full_name || 'Beast Babe'}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-yellow-500" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {currentBeastBabe.full_name || currentBeastBabe.email || 'Unknown'}
                </h3>
                {currentBeastBabe.history?.achievement && (
                  <p className="text-sm text-foreground mt-2 italic">
                    "{currentBeastBabe.history.achievement}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {!currentBeastBabe && (
        <Card className="p-6">
          <div className="text-center py-8">
            <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No current Beast Babe. Select someone to start!</p>
          </div>
        </Card>
      )}

      {/* Pass Torch Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Pass the Torch</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="block text-sm font-medium text-foreground">
                Select Next Beast Babe
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBrowseDialog(true)}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Browse Team
              </Button>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !searchQuery.trim() ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Start typing to search for team members, or click "Browse Team" to see everyone</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No users found</p>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full p-4 border rounded-lg text-left transition-colors ${
                        selectedUserId === user.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name || 'User'}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  const fallback = parent.querySelector('.beast-babe-user-fallback') as HTMLElement
                                  if (fallback) fallback.style.display = 'flex'
                                }
                              }}
                            />
                          ) : null}
                          <div className={`beast-babe-user-fallback w-10 h-10 rounded-full bg-muted flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
                            <Users className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <span className="font-medium text-foreground block">
                              {user.full_name || user.email || 'Unknown'}
                            </span>
                            {user.role && (
                              <span className="text-xs text-muted-foreground">{user.role}</span>
                            )}
                          </div>
                        </div>
                        {selectedUserId === user.id && (
                          <Crown className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="achievement" className="block text-sm font-medium text-foreground mb-2">
              Achievement / Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="achievement"
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              placeholder="Why are they the next Beast Babe?"
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
            <Button
              onClick={handlePassTorch}
              disabled={!selectedUserId || !achievement.trim() || passing}
              size="lg"
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            >
              {passing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Passing...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Pass the Torch
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* History Section */}
      {history.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">History</h2>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {entry.user.avatar_url ? (
                    <img
                      src={entry.user.avatar_url}
                      alt={entry.user.full_name || 'User'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {entry.user.full_name || entry.user.email || 'Unknown'}
                      </h3>
                      {entry.user.id === currentBeastBabe?.id && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(entry.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                      {entry.passed_by && (
                        <>
                          <span>•</span>
                          <span>Passed by {entry.passed_by.full_name || entry.passed_by.email || 'Unknown'}</span>
                        </>
                      )}
                    </div>
                    {entry.achievement && (
                      <p className="text-sm text-foreground italic mt-2">
                        "{entry.achievement}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Browse Team Dialog */}
      <Dialog open={showBrowseDialog} onOpenChange={setShowBrowseDialog}>
        <DialogContent 
          className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border" 
          style={{ 
            backgroundColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#000000',
            borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? 'rgba(74, 24, 24, 0.2)' : '#FFFFFF'
          }}
        >
          <DialogHeader>
            <DialogTitle>Browse Team</DialogTitle>
            <DialogDescription>
              Select a team member to pass the Beast Babe torch to
            </DialogDescription>
          </DialogHeader>
          
          {/* Search in Dialog */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, role, or discipline..."
              value={browseSearchQuery}
              onChange={(e) => setBrowseSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Team List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBrowseUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No team members found</p>
            ) : (
              filteredBrowseUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectFromDialog(user.id)}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    selectedUserId === user.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name || 'User'}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              const fallback = parent.querySelector('.browse-dialog-user-fallback') as HTMLElement
                              if (fallback) fallback.style.display = 'flex'
                            }
                          }}
                        />
                      ) : null}
                      <div className={`browse-dialog-user-fallback w-12 h-12 rounded-full bg-muted flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
                        <Users className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground block">
                          {user.full_name || user.email || 'Unknown'}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {user.discipline && (
                            <span className="text-xs text-muted-foreground">{user.discipline}</span>
                          )}
                          {user.role && (
                            <>
                              {user.discipline && <span className="text-xs text-muted-foreground">•</span>}
                              <span className="text-xs text-muted-foreground">{user.role}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedUserId === user.id && (
                      <Crown className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

