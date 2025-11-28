'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { RotateCw, Plus, Loader2, Shuffle, UserCheck, Calendar, Music, ExternalLink } from 'lucide-react'

interface CuratorAssignment {
  id: string
  playlist_id: string
  curator_name: string
  curator_profile_id: string | null
  assignment_date: string
  is_manual_override: boolean
  assigned_by: string | null
  created_at: string
  playlists: {
    id: string
    date: string
    title: string | null
    spotify_url: string
  }
}

interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  discipline: string | null
  role: string | null
  hierarchy_level: number | null
  avatar_url: string | null
  is_active: boolean
}

interface Playlist {
  id: string
  date: string
  title: string | null
  curator: string
  spotify_url: string
}

export default function CuratorRotationPage() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<CuratorAssignment[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [curatorCounts, setCuratorCounts] = useState<Record<string, number>>({})
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [formData, setFormData] = useState({
    playlist_id: '',
    assignment_date: new Date().toISOString().split('T')[0],
    curator_name: '',
    curator_profile_id: '',
    is_manual_override: false
  })

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

  const getCardStyle = () => {
    if (mode === 'chaos') {
      return { 
        bg: 'bg-[#000000]', 
        border: 'border border-[#C4F500]', 
        text: 'text-white', 
        accent: '#C4F500' 
      }
    } else if (mode === 'chill') {
      return { 
        bg: 'bg-white', 
        border: 'border border-[#FFC043]/30', 
        text: 'text-[#4A1818]', 
        accent: '#FFC043' 
      }
    } else {
      return { 
        bg: 'bg-[#000000]', 
        border: 'border border-[#FFFFFF]', 
        text: 'text-[#FFFFFF]', 
        accent: '#FFFFFF' 
      }
    }
  }

  const getRoundedClass = (base: string) => {
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    return base
  }

  const cardStyle = getCardStyle()

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch assignments and team members
      const response = await fetch('/api/curator-assignment?limit=100')
      const data = await response.json()
      
      if (data.assignments) {
        setAssignments(data.assignments)
      }
      if (data.teamMembers) {
        setTeamMembers(data.teamMembers)
      }
      if (data.rotationStatus?.curatorCounts) {
        setCuratorCounts(data.rotationStatus.curatorCounts)
      }

      // Fetch playlists for assignment
      const playlistsResponse = await fetch('/api/playlists')
      const playlistsData = await playlistsResponse.json()
      if (playlistsData.playlists) {
        setPlaylists(playlistsData.playlists)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRandomAssign = async () => {
    if (!formData.playlist_id || !formData.assignment_date) {
      alert('Please select a playlist and date')
      return
    }

    setAssigning(true)
    try {
      const response = await fetch('/api/curator-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlist_id: formData.playlist_id,
          assignment_date: formData.assignment_date,
          is_manual_override: false
        })
      })

      const data = await response.json()
      if (response.ok) {
        if (data.selectedCurator) {
          setFormData({
            ...formData,
            curator_name: data.selectedCurator.full_name,
            curator_profile_id: data.selectedCurator.id
          })
        }
        await fetchData()
        alert(`Randomly assigned: ${data.selectedCurator?.full_name || 'Unknown'}`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error: any) {
      console.error('Error assigning curator:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setAssigning(false)
    }
  }

  const handleManualAssign = async () => {
    if (!formData.playlist_id || !formData.assignment_date || !formData.curator_name) {
      alert('Please fill in all required fields')
      return
    }

    setAssigning(true)
    try {
      const response = await fetch('/api/curator-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlist_id: formData.playlist_id,
          assignment_date: formData.assignment_date,
          curator_name: formData.curator_name,
          curator_profile_id: formData.curator_profile_id || null,
          is_manual_override: true
        })
      })

      const data = await response.json()
      if (response.ok) {
        await fetchData()
        setIsAssignDialogOpen(false)
        setFormData({
          playlist_id: '',
          assignment_date: new Date().toISOString().split('T')[0],
          curator_name: '',
          curator_profile_id: '',
          is_manual_override: false
        })
        alert('Curator assigned successfully')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error: any) {
      console.error('Error assigning curator:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setAssigning(false)
    }
  }

  const getCuratorCount = (name: string) => {
    return curatorCounts[name.toLowerCase().trim()] || 0
  }

  if (loading) {
    return (
      <div className={`${getBgClass()} ${getTextClass()} min-h-screen p-6 flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-4">
          <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Curator Rotation</h1>
          <p className={`${getTextClass()}/70 text-sm font-normal`}>Manage weekly curator responsibilities with fair random rotation across disciplines and levels.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Assignments */}
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className={`w-6 h-6 ${getTextClass()}`} />
                <h2 className={`text-xl font-black uppercase ${getTextClass()}`}>Recent Assignments</h2>
              </div>
              <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className={`${getRoundedClass('rounded-lg')} ${
                      mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                      mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                      'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                    } font-black uppercase tracking-wider ${mode === 'code' ? 'font-mono' : ''}`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Assign Curator
                  </Button>
                </DialogTrigger>
                <DialogContent className={`${cardStyle.bg} ${cardStyle.border} border max-w-2xl`}>
                  <DialogHeader>
                    <DialogTitle className={cardStyle.text}>Assign Curator</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className={cardStyle.text}>Playlist *</Label>
                      <select
                        value={formData.playlist_id}
                        onChange={(e) => setFormData({ ...formData, playlist_id: e.target.value })}
                        className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')} mt-1`}
                      >
                        <option value="">Select a playlist</option>
                        {playlists.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.date} - {p.title || 'Untitled'} ({p.curator})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className={cardStyle.text}>Assignment Date *</Label>
                      <Input
                        type="date"
                        value={formData.assignment_date}
                        onChange={(e) => setFormData({ ...formData, assignment_date: e.target.value })}
                        className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRandomAssign}
                        disabled={assigning || !formData.playlist_id || !formData.assignment_date}
                        className={`flex-1 ${getRoundedClass('rounded-lg')} ${
                          mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                          mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                          'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                        } font-black uppercase tracking-wider`}
                      >
                        {assigning ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Shuffle className="w-4 h-4 mr-2" />
                        )}
                        Random Assign
                      </Button>
                    </div>
                    <div className="border-t pt-4">
                      <Label className={cardStyle.text}>Manual Override</Label>
                      <div className="mt-2 space-y-2">
                        <div>
                          <Label className={`${cardStyle.text} text-sm`}>Curator Name *</Label>
                          <Input
                            value={formData.curator_name}
                            onChange={(e) => setFormData({ ...formData, curator_name: e.target.value })}
                            className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                            placeholder="Enter curator name"
                          />
                        </div>
                        <div>
                          <Label className={`${cardStyle.text} text-sm`}>Or select from team:</Label>
                          <select
                            value={formData.curator_profile_id}
                            onChange={(e) => {
                              const member = teamMembers.find(m => m.id === e.target.value)
                              setFormData({
                                ...formData,
                                curator_profile_id: e.target.value,
                                curator_name: member?.full_name || ''
                              })
                            }}
                            className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')} mt-1`}
                          >
                            <option value="">Select team member</option>
                            {teamMembers.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.full_name} {m.discipline ? `(${m.discipline})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Button
                          onClick={handleManualAssign}
                          disabled={assigning || !formData.playlist_id || !formData.assignment_date || !formData.curator_name}
                          className={`w-full ${getRoundedClass('rounded-lg')} ${
                            mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                            mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                            'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                          } font-black uppercase tracking-wider`}
                        >
                          {assigning ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <UserCheck className="w-4 h-4 mr-2" />
                          )}
                          Assign Manually
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {assignments.length === 0 ? (
                <p className={`${cardStyle.text}/70 text-center py-8`}>No assignments yet</p>
              ) : (
                assignments.map(assignment => (
                  <div
                    key={assignment.id}
                    className={`${cardStyle.border} border ${getRoundedClass('rounded-lg')} p-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-bold ${cardStyle.text}`}>{assignment.curator_name}</span>
                          {assignment.is_manual_override && (
                            <span className={`text-xs ${cardStyle.text}/60 px-2 py-0.5 ${cardStyle.border} border ${getRoundedClass('rounded')}`}>
                              Manual
                            </span>
                          )}
                        </div>
                        <div className={`text-sm ${cardStyle.text}/70 mb-2`}>
                          {new Date(assignment.assignment_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        {assignment.playlists && (
                          <div className="flex items-center gap-2">
                            <Music className={`w-4 h-4 ${cardStyle.text}/60`} />
                            <span className={`text-sm ${cardStyle.text}/80`}>
                              {assignment.playlists.title || 'Untitled'}
                            </span>
                            {assignment.playlists.spotify_url && (
                              <a
                                href={assignment.playlists.spotify_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${cardStyle.text}/60 hover:${cardStyle.text} transition-colors`}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Team Members & Rotation Status */}
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center gap-3 mb-6">
              <UserCheck className={`w-6 h-6 ${getTextClass()}`} />
              <h2 className={`text-xl font-black uppercase ${getTextClass()}`}>Team Rotation Status</h2>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {teamMembers.length === 0 ? (
                <p className={`${cardStyle.text}/70 text-center py-8`}>No team members found</p>
              ) : (
                teamMembers
                  .sort((a, b) => {
                    const countA = getCuratorCount(a.full_name || '')
                    const countB = getCuratorCount(b.full_name || '')
                    if (countA !== countB) return countB - countA
                    return (a.full_name || '').localeCompare(b.full_name || '')
                  })
                  .map(member => {
                    const count = getCuratorCount(member.full_name || '')
                    return (
                      <div
                        key={member.id}
                        className={`${cardStyle.border} border ${getRoundedClass('rounded-lg')} p-4`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt={member.full_name || ''}
                                className={`w-10 h-10 ${getRoundedClass('rounded-full')} object-cover`}
                              />
                            ) : (
                              <div className={`w-10 h-10 ${getRoundedClass('rounded-full')} ${cardStyle.border} border flex items-center justify-center ${cardStyle.text}/60`}>
                                {(member.full_name || member.email || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className={`font-semibold ${cardStyle.text}`}>
                                {member.full_name || member.email || 'Unknown'}
                              </div>
                              <div className={`text-xs ${cardStyle.text}/60`}>
                                {member.discipline || 'No discipline'} {member.role ? `• ${member.role}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className={`text-right`}>
                            <div className={`text-lg font-bold ${cardStyle.text}`}>{count}</div>
                            <div className={`text-xs ${cardStyle.text}/60`}>assignments</div>
                          </div>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

