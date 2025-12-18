'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/contexts/permissions-context'
import { AddSnapDialog } from '@/components/add-snap-dialog'
import { Sparkles, Plus, Edit2, Trash2, Loader2 } from 'lucide-react'

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
  updated_at: string
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
  recipients: SnapRecipient[]
}

export default function SnapsAdmin() {
  const { mode } = useMode()
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editSnap, setEditSnap] = useState<Snap | null>(null)
  const [snaps, setSnaps] = useState<Snap[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  // Check if user is admin
  const isAdmin = permissions?.canManageUsers || user?.baseRole === 'admin'

  // Fetch all snaps
  useEffect(() => {
    async function fetchSnaps() {
      if (!isAdmin) return
      
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/snaps')
        
        if (!response.ok) {
          throw new Error('Failed to fetch snaps')
        }
        
        const result = await response.json()
        setSnaps(result.data || [])
      } catch (err: any) {
        console.error('Error fetching snaps:', err)
        setError(err.message || 'Failed to load snaps')
      } finally {
        setLoading(false)
      }
    }
    
    fetchSnaps()
  }, [isAdmin])

  const handleSnapAdded = () => {
    // Refresh snaps list
    async function refreshSnaps() {
      try {
        const response = await fetch('/api/snaps')
        if (response.ok) {
          const result = await response.json()
          setSnaps(result.data || [])
        }
      } catch (err) {
        console.error('Error refreshing snaps:', err)
      }
    }
    refreshSnaps()
    setEditSnap(null)
    setShowAddDialog(false)
  }

  const handleEdit = (snap: Snap) => {
    setEditSnap(snap)
    setShowAddDialog(true)
  }

  const handleDelete = async (snapId: string) => {
    if (!confirm('Are you sure you want to delete this snap? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(snapId)
      const response = await fetch(`/api/snaps/${snapId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete snap')
      }

      // Remove from list
      setSnaps(snaps.filter(s => s.id !== snapId))
    } catch (err: any) {
      console.error('Error deleting snap:', err)
      alert(err.message || 'Failed to delete snap')
    } finally {
      setDeletingId(null)
    }
  }

  const getDisplayName = (profile: { full_name: string | null; email: string | null } | null) => {
    if (!profile) return 'Anonymous'
    return profile.full_name || profile.email || 'Anonymous'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (!isAdmin) {
    return (
      <div className={`${getBgClass()} ${getTextClass()} min-h-screen p-6 flex items-center justify-center`}>
        <p>You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Manage Snaps</h1>
            <p className={`${getTextClass()}/70 text-sm font-normal`}>
              View, create, edit, and delete snaps ({snaps.length} total)
            </p>
          </div>
          <Button
            onClick={() => {
              setEditSnap(null)
              setShowAddDialog(true)
            }}
            className={`${getRoundedClass('rounded-lg')} ${
              mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
              mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
              'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
            } font-black uppercase tracking-wider ${mode === 'code' ? 'font-mono' : ''}`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Snap
          </Button>
        </div>

        {error && (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-4 mb-6 ${getRoundedClass('rounded-xl')}`}>
            <p className={cardStyle.text} style={{ color: '#ef4444' }}>{error}</p>
          </Card>
        )}

        {loading ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-12 ${getRoundedClass('rounded-xl')} text-center`}>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: cardStyle.accent }} />
            <p className={cardStyle.text}>Loading snaps...</p>
          </Card>
        ) : snaps.length === 0 ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-12 ${getRoundedClass('rounded-xl')} text-center`}>
            <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: cardStyle.accent, opacity: 0.5 }} />
            <p className={cardStyle.text}>No snaps yet. Create your first snap!</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {snaps.map((snap) => {
              const fromName = getDisplayName(snap.submitted_by_profile)
              const recipientNames = snap.recipients && snap.recipients.length > 0
                ? snap.recipients.map(r => getDisplayName(r.recipient_profile)).filter(Boolean)
                : [getDisplayName(snap.mentioned_user_profile) || snap.mentioned || 'Team'].filter(Boolean)
              const toName = recipientNames.length > 0 ? recipientNames.join(', ') : 'Team'

              return (
                <Card
                  key={snap.id}
                  className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: cardStyle.accent }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-bold ${cardStyle.text}`}>
                              {fromName}
                            </span>
                            <span className={cardStyle.text} style={{ opacity: 0.6 }}>→</span>
                            <span className={`text-sm ${cardStyle.text}`} style={{ opacity: 0.8 }}>
                              {toName}
                            </span>
                          </div>
                          <p className={`text-xs ${cardStyle.text}`} style={{ opacity: 0.6 }}>
                            {formatDate(snap.date)}
                          </p>
                        </div>
                      </div>
                      <p className={`${cardStyle.text} whitespace-pre-wrap`}>
                        {snap.snap_content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        onClick={() => handleEdit(snap)}
                        variant="outline"
                        size="sm"
                        className={`${getRoundedClass('rounded-lg')} ${
                          mode === 'chaos' ? 'border-[#C4F500] text-[#C4F500] hover:bg-[#C4F500]/10' :
                          mode === 'chill' ? 'border-[#FFC043] text-[#FFC043] hover:bg-[#FFC043]/10' :
                          'border-white text-white hover:bg-white/10'
                        }`}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(snap.id)}
                        variant="outline"
                        size="sm"
                        className={`${getRoundedClass('rounded-lg')} border-red-500 text-red-500 hover:bg-red-500/10`}
                        disabled={deletingId === snap.id}
                      >
                        {deletingId === snap.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-1" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        <AddSnapDialog
          open={showAddDialog}
          onOpenChange={(open) => {
            setShowAddDialog(open)
            if (!open) {
              setEditSnap(null)
            }
          }}
          onSuccess={handleSnapAdded}
          adminMode={true}
          editSnap={editSnap}
        />
      </div>
    </div>
  )
}
