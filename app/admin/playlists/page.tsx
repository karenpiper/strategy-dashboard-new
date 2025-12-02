'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/contexts/permissions-context'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  Music,
  Loader2,
  ExternalLink,
  ShieldOff,
  Save
} from 'lucide-react'
import { PlaylistData } from '@/lib/spotify-player-types'

// Extended PlaylistData for admin form (includes manual entry flag)
interface ExtendedPlaylistData extends PlaylistData {
  manualEntry?: boolean;
}

interface Playlist {
  id: string
  date: string
  title: string | null
  curator: string
  curator_photo_url?: string | null
  cover_url?: string | null
  description?: string | null
  spotify_url: string
  created_at: string
  week_label?: string | null
  total_duration?: string | null
  track_count?: number | null
  artists_list?: string | null
}

export default function PlaylistsAdmin() {
  const { mode } = useMode()
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string>('date')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<Playlist | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  // Form state
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    spotify_url: '',
    curator: '',
    description: '',
    date: getTodayDate(),
    title: '', // For manual entry
    cover_url: '', // For manual entry
  })

  const [spotifyData, setSpotifyData] = useState<ExtendedPlaylistData | null>(null)
  const [fetchingSpotify, setFetchingSpotify] = useState(false)
  const [extractingCover, setExtractingCover] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  // Theme-aware styling helpers
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

  // Fetch playlists
  const fetchPlaylists = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)

      const response = await fetch(`/api/playlists?${params.toString()}`)
      const result = await response.json()
      
      if (response.ok) {
        setPlaylists(Array.isArray(result) ? result : [])
      } else {
        console.error('Error fetching playlists:', result.error)
        setPlaylists([])
      }
    } catch (error) {
      console.error('Error fetching playlists:', error)
      setPlaylists([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch Spotify data
  const fetchSpotifyData = async () => {
    if (!formData.spotify_url.trim()) {
      setError('Please enter a Spotify playlist URL')
      return
    }

    setFetchingSpotify(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/spotify/playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: formData.spotify_url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch playlist data')
      }

      const data = await response.json()
      
      // Curator is set by the user, not from the playlist owner
      // Use curator from form if provided, otherwise leave empty for user to fill
      const finalCurator = formData.curator.trim()
      
      // Check if tracklist is available (algorithm playlists won't have it)
      const hasTracklist = data.tracklistAvailable !== false && data.tracks && data.tracks.length > 0
      
      setSpotifyData({
        ...data,
        curator: finalCurator, // Only use curator from form, not from API
        curatorPhotoUrl: null, // Curator photo comes from user profile, not playlist owner
        description: formData.description.trim() || data.description || '',
      })
      
      // Update formData with fetched title and cover URL (for both add and edit dialogs)
      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title, // Update title from fetched data
        cover_url: data.coverUrl || prev.cover_url, // Update cover URL from fetched data
      }))
      
      // Show appropriate success message
      if (data.coverUrl && !hasTracklist) {
        setSuccess(true)
        setError(null)
        // Clear any previous errors - we got the cover image, just no tracklist
      } else if (data.coverUrl && hasTracklist) {
        setSuccess(true)
        setError(null)
      } else {
        setSuccess(true)
        setError(null)
      }
      
      // Don't auto-populate curator - user should enter it themselves
    } catch (err: any) {
      // If API fetch fails completely, allow manual entry
      const curatorValue = formData.curator.trim()
      
      // Even if API fails, we might have gotten cover from oEmbed
      // But if we're here, the whole request failed
      setError(`API fetch failed: ${err.message}. You can still add the playlist manually by filling in the details below, or use the "Extract Cover" button to get the cover image.`)
      setSpotifyData({
        title: '',
        curator: curatorValue,
        curatorPhotoUrl: undefined,
        description: formData.description.trim() || '',
        spotifyUrl: formData.spotify_url,
        coverUrl: undefined,
        tracks: [],
        trackCount: 0,
        totalDuration: undefined,
        artistsList: undefined,
        manualEntry: true,
      })
    } finally {
      setFetchingSpotify(false)
    }
  }

  // Debounce search and refetch on sort changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlaylists()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, sortBy, sortOrder])

  // Initial fetch
  useEffect(() => {
    fetchPlaylists()
  }, [])

  // Fetch current curator for the selected date
  useEffect(() => {
    async function fetchCurrentCurator() {
      if (!formData.date) {
        console.log('[Curator] No date set, skipping fetch')
        return
      }

      console.log('[Curator] Fetching curator for date:', formData.date)

      try {
        // Query for curator assignment - handle skipped field (may be null or not exist)
        let query = supabase
          .from('curator_assignments')
          .select('curator_name')
          .lte('start_date', formData.date)
          .gte('end_date', formData.date)
          .order('assignment_date', { ascending: false })
          .limit(1)

        // Only filter by skipped if the column exists (use or() to handle null values)
        // This matches the API route behavior which doesn't filter by skipped
        const { data, error } = await query.maybeSingle()

        if (error) {
          console.warn('[Curator] Error fetching current curator:', error)
          return
        }

        console.log('[Curator] Query result:', { data, error: error ? (error as any).code : null, date: formData.date })

        // Always set curator if found - this ensures it's populated when date changes or dialog opens
        // Admins can still override it manually after it's set
        if (data?.curator_name) {
          console.log('[Curator] Found curator for date:', data.curator_name)
          setFormData(prev => {
            const currentValue = prev.curator.trim()
            // Always set if empty, or if it matches placeholder text, or if it's the same value
            // Only skip if admin has manually entered a different value
            const shouldUpdate = !currentValue || 
                                currentValue === 'Auto-populated from current curator assignment' ||
                                currentValue === data.curator_name ||
                                // For admins, allow updating even if there's a value (they can override)
                                (permissions?.canManageUsers && currentValue !== data.curator_name)
            
            if (shouldUpdate) {
              console.log('[Curator] Updating curator from', currentValue || '(empty)', 'to', data.curator_name)
              return { ...prev, curator: data.curator_name }
            }
            console.log('[Curator] Not updating - curator already set to:', currentValue)
            return prev
          })
        } else {
          // If no curator found for this date, try to get the most recent assignment as a fallback
          console.log('[Curator] No curator found for date:', formData.date, '- trying to find most recent assignment')
          try {
            const { data: recentData, error: recentError } = await supabase
              .from('curator_assignments')
              .select('curator_name')
              .order('assignment_date', { ascending: false })
              .limit(1)
              .maybeSingle()
            
            if (recentData?.curator_name) {
              console.log('[Curator] Using most recent curator as fallback:', recentData.curator_name)
              setFormData(prev => {
                if (!prev.curator.trim()) {
                  return { ...prev, curator: recentData.curator_name }
                }
                return prev
              })
            } else {
              console.log('[Curator] No curator assignments found at all')
              setFormData(prev => {
                const currentValue = prev.curator.trim()
                if (!currentValue || currentValue === 'Auto-populated from current curator assignment') {
                  return { ...prev, curator: '' }
                }
                return prev
              })
            }
          } catch (fallbackErr) {
            console.warn('[Curator] Error fetching fallback curator:', fallbackErr)
            setFormData(prev => {
              if (!prev.curator.trim()) {
                return { ...prev, curator: '' }
              }
              return prev
            })
          }
        }
      } catch (err) {
        console.warn('[Curator] Error fetching current curator:', err)
      }
    }

    // Fetch when dialog opens or date changes
    if (isAddDialogOpen && formData.date) {
      console.log('[Curator] Dialog is open with date:', formData.date, '- fetching curator')
      fetchCurrentCurator()
    } else {
      console.log('[Curator] Skipping fetch - dialog open:', isAddDialogOpen, 'date:', formData.date)
    }
  }, [formData.date, isAddDialogOpen, permissions?.canManageUsers]) // Also fetch when dialog opens

  // Handle add
  const handleAdd = async () => {
    if (!formData.spotify_url.trim()) {
      setError('Please enter a Spotify playlist URL')
      return
    }

    if (!formData.date) {
      setError('Please fill in the date')
      return
    }

    // For manual entry (when API fetch failed), require at least title
    // Also allow adding without fetching if user enters title manually
    const hasTitle = spotifyData?.title?.trim() || formData.title?.trim()
    if ((spotifyData?.manualEntry || !spotifyData) && !hasTitle) {
      setError('Please enter a playlist title')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Curator should be auto-populated, but if empty, try to get from current assignment
      let finalCurator = formData.curator.trim()
      if (!finalCurator) {
        // Try to fetch current curator one more time (matching the useEffect logic)
        try {
          const { data, error } = await supabase
            .from('curator_assignments')
            .select('curator_name')
            .lte('start_date', formData.date)
            .gte('end_date', formData.date)
            .order('assignment_date', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (data?.curator_name) {
            finalCurator = data.curator_name
            console.log('[handleAdd] Found curator for date:', finalCurator)
          } else {
            // Try fallback to most recent curator
            console.log('[handleAdd] No curator for date, trying most recent')
            const { data: recentData } = await supabase
              .from('curator_assignments')
              .select('curator_name')
              .order('assignment_date', { ascending: false })
              .limit(1)
              .maybeSingle()
            
            if (recentData?.curator_name) {
              finalCurator = recentData.curator_name
              console.log('[handleAdd] Using most recent curator as fallback:', finalCurator)
            } else {
              setError('Please enter a curator name or ensure there is a curator assigned for this date')
              setSaving(false)
              return
            }
          }
        } catch (err) {
          console.error('[handleAdd] Error fetching curator:', err)
          setError('Please enter a curator name')
          setSaving(false)
          return
        }
      }

      const finalDescription = formData.description.trim() || spotifyData?.description || ''
      // Title is required - use form data first, then spotify data
      const finalTitle = formData.title?.trim() || spotifyData?.title
      if (!finalTitle || !finalTitle.trim()) {
        setError('Please enter a playlist title')
        setSaving(false)
        return
      }
      const finalCoverUrl = formData.cover_url?.trim() || spotifyData?.coverUrl || null

      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formData.date,
          title: finalTitle,
          curator: finalCurator,
          description: finalDescription || null,
          spotify_url: formData.spotify_url,
          cover_url: finalCoverUrl,
          curator_photo_url: spotifyData?.curatorPhotoUrl || null,
          total_duration: spotifyData?.totalDuration || null,
          track_count: spotifyData?.trackCount || null,
          artists_list: spotifyData?.artistsList || null,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsAddDialogOpen(false)
        resetForm()
        fetchPlaylists()
        if (result.autoAssignedCurator) {
          setSuccess(true)
          setTimeout(() => {
            setSuccess(false)
            alert(`Curator automatically assigned: ${result.autoAssignedCurator.full_name}\n\nThey now have curator permissions.`)
          }, 100)
        } else {
          setSuccess(true)
          setTimeout(() => setSuccess(false), 3000)
        }
      } else {
        const errorMsg = result.error || 'Failed to add playlist'
        setError(errorMsg)
        console.error('Error adding playlist:', result)
      }
    } catch (error) {
      console.error('Error adding playlist:', error)
      setError(`Failed to add playlist: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  // Handle edit
  const handleEdit = (item: Playlist) => {
    setEditingItem(item)
    setFormData({
      spotify_url: item.spotify_url,
      curator: item.curator,
      description: item.description || '',
      date: item.date,
      title: item.title || '',
      cover_url: item.cover_url || '',
    })
    // Set existing Spotify data if available
    if (item.title || item.cover_url) {
      setSpotifyData({
        title: item.title || '',
        curator: item.curator,
        curatorPhotoUrl: item.curator_photo_url || undefined,
        coverUrl: item.cover_url || undefined,
        description: item.description || undefined,
        spotifyUrl: item.spotify_url,
        tracks: [],
        artistsList: item.artists_list || undefined,
        totalDuration: item.total_duration || undefined,
        trackCount: item.track_count || undefined,
      })
    } else {
      setSpotifyData(null)
    }
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingItem) return

    if (!formData.date || !formData.curator.trim()) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // If we have Spotify data, use it; otherwise use form data
      // Prefer formData.title (which gets updated when fetching) over spotifyData.title
      const finalTitle = formData.title?.trim() || spotifyData?.title || editingItem.title
      const finalCoverUrl = formData.cover_url?.trim() || spotifyData?.coverUrl || editingItem.cover_url
      const finalDescription = formData.description.trim() || spotifyData?.description || editingItem.description || ''
      const finalCurator = formData.curator.trim()
      const finalTotalDuration = spotifyData?.totalDuration || editingItem.total_duration || null
      const finalTrackCount = spotifyData?.trackCount || editingItem.track_count || null
      const finalArtistsList = spotifyData?.artistsList || editingItem.artists_list || null

      const response = await fetch('/api/playlists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          date: formData.date,
          title: finalTitle,
          curator: finalCurator,
          description: finalDescription || null,
          spotify_url: formData.spotify_url,
          cover_url: finalCoverUrl || null,
          curator_photo_url: spotifyData?.curatorPhotoUrl || editingItem.curator_photo_url || null,
          total_duration: finalTotalDuration,
          track_count: finalTrackCount,
          artists_list: finalArtistsList,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsEditDialogOpen(false)
        setEditingItem(null)
        resetForm()
        fetchPlaylists()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const errorMsg = result.error || 'Failed to update playlist'
        setError(errorMsg)
        console.error('Error updating playlist:', result)
      }
    } catch (error) {
      console.error('Error updating playlist:', error)
      setError(`Failed to update playlist: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return

    try {
      const response = await fetch(`/api/playlists?id=${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        fetchPlaylists()
        setSelectedIds(new Set())
      } else {
        const errorMsg = result.error || result.details || 'Failed to delete playlist'
        setError(errorMsg)
        console.error('Error deleting playlist:', result)
        setTimeout(() => setError(null), 5000)
      }
    } catch (error) {
      console.error('Error deleting playlist:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete playlist'
      setError(errorMsg)
      setTimeout(() => setError(null), 5000)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} playlist(s)?`)) return

    try {
      const ids = Array.from(selectedIds)
      for (const id of ids) {
        const response = await fetch(`/api/playlists?id=${id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Failed to delete playlist')
        }
      }
      fetchPlaylists()
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Error deleting playlists:', error)
      alert(`Failed to delete playlists: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const resetForm = () => {
    setFormData({
      spotify_url: '',
      curator: '',
      description: '',
      date: getTodayDate(),
      title: '',
      cover_url: '',
    })
    setSpotifyData(null)
    setError(null)
    setSuccess(false)
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPlaylists.length && filteredPlaylists.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredPlaylists.map(item => item.id)))
    }
  }

  // Client-side filtering for search
  const filteredPlaylists = playlists.filter(playlist => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      playlist.title?.toLowerCase().includes(query) ||
      playlist.curator.toLowerCase().includes(query) ||
      playlist.description?.toLowerCase().includes(query) ||
      playlist.spotify_url.toLowerCase().includes(query)
    )
  })

  if (!permissions?.canManagePlaylists) {
    return (
      <div className={`${getBgClass()} ${getTextClass()} min-h-screen p-6`}>
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-8">
            <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Manage Playlists</h1>
          </div>
          <Card className={`${getCardStyle().bg} ${getCardStyle().border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center gap-3 text-destructive">
              <ShieldOff className="w-5 h-5" />
              <p>You don't have permission to manage playlists. You need the "Leader", "Admin", or "Curator" role.</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const cardStyle = getCardStyle()

  return (
    <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Playlists</h1>
          <p className={`${getTextClass()}/70 text-sm font-normal`}>Manage weekly playlists</p>
        </div>

        {/* Actions Bar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (open) {
              resetForm()
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                className={`${getRoundedClass('rounded-lg')} h-8 text-xs ${
                  mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                  mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                  'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                } font-black uppercase tracking-wider ${mode === 'code' ? 'font-mono' : ''}`}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className={`${cardStyle.bg} ${cardStyle.border} border max-w-4xl max-h-[90vh] overflow-y-auto`}>
              <DialogHeader>
                <DialogTitle className={cardStyle.text}>Add New Playlist</DialogTitle>
              </DialogHeader>
              {/* Fetch curator when dialog opens */}
              {isAddDialogOpen && !formData.curator.trim() && (
                <div className="text-xs text-muted-foreground mb-2">
                  Loading current curator...
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <Label className={cardStyle.text}>Spotify Playlist URL *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={formData.spotify_url}
                      onChange={(e) => {
                        setFormData({ ...formData, spotify_url: e.target.value })
                        setError(null)
                        setSuccess(false)
                      }}
                      className={`flex-1 ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="https://open.spotify.com/playlist/..."
                    />
                    <Button 
                      onClick={fetchSpotifyData} 
                      disabled={fetchingSpotify || !formData.spotify_url.trim()}
                      className={`${cardStyle.border} border ${cardStyle.text}`}
                    >
                      {fetchingSpotify ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <Music className="w-4 h-4 mr-2" />
                          Fetch
                        </>
                      )}
                    </Button>
                  </div>
                  <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                    Paste a Spotify playlist link and click Fetch to automatically get the cover image and tracklist. Cover images work for all playlists. Tracklists are available for user-created playlists. If tracklist isn't available, you can still add the playlist with just the cover image.
                  </p>
                </div>

                {error && (
                  <div className={`p-4 ${cardStyle.bg} ${cardStyle.border} border rounded-lg`} style={{ borderColor: '#ef444440' }}>
                    <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
                  </div>
                )}

                {success && spotifyData && (
                  <div className={`p-4 ${cardStyle.bg} ${cardStyle.border} border rounded-lg`} style={{ borderColor: '#22c55e40' }}>
                    <p className="text-sm" style={{ color: '#22c55e' }}>
                      {spotifyData.coverUrl && spotifyData.tracks && spotifyData.tracks.length > 0
                        ? 'Playlist data fetched successfully! Cover image and tracklist available.'
                        : spotifyData.coverUrl
                        ? 'Cover image fetched successfully! Tracklist not available for this playlist type (you can still add it).'
                        : 'Playlist data fetched successfully!'}
                    </p>
                  </div>
                )}

                {/* Show fetched data or manual entry form */}
                {spotifyData && !spotifyData.manualEntry && (
                  <div className={`p-4 ${cardStyle.bg} ${cardStyle.border} border rounded-lg space-y-3`}>
                    <div className="grid grid-cols-2 gap-4">
                      {spotifyData.coverUrl && (
                        <div>
                          <Label className={cardStyle.text}>Cover Image Preview</Label>
                          <img 
                            src={spotifyData.coverUrl} 
                            alt={spotifyData.title}
                            className="w-32 h-32 object-cover rounded-lg mt-2"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div>
                          <Label className={cardStyle.text}>Title</Label>
                          <p className={`text-sm font-semibold ${cardStyle.text}`}>{spotifyData.title}</p>
                        </div>
                        {spotifyData.totalDuration && (
                          <div>
                            <Label className={cardStyle.text}>Duration</Label>
                            <p className={`text-sm ${cardStyle.text}`}>{spotifyData.totalDuration}</p>
                          </div>
                        )}
                        {spotifyData.trackCount && (
                          <div>
                            <Label className={cardStyle.text}>Track Count</Label>
                            <p className={`text-sm ${cardStyle.text}`}>{spotifyData.trackCount} tracks</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {spotifyData.artistsList && (
                      <div>
                        <Label className={cardStyle.text}>Artists</Label>
                        <p className={`text-sm ${cardStyle.text} line-clamp-2`}>{spotifyData.artistsList}</p>
                      </div>
                    )}
                    <div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className={cardStyle.text}>Cover Image URL (Optional)</Label>
                          <Input
                            value={formData.cover_url || spotifyData.coverUrl || ''}
                            onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                            className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                            placeholder="https://i.scdn.co/image/..."
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={async () => {
                            if (!formData.spotify_url.trim()) {
                              setError('Please enter a Spotify playlist URL first')
                              return
                            }
                            try {
                              setExtractingCover(true)
                              setError(null)
                              const endpoint = '/api/spotify/extract-cover'
                              console.log('[Extract Cover] Calling endpoint:', endpoint)
                              console.log('[Extract Cover] Request body:', { url: formData.spotify_url })
                              
                              const response = await fetch(endpoint, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url: formData.spotify_url }),
                              })
                              
                              console.log('[Extract Cover] Response status:', response.status, response.statusText)
                              
                              const data = await response.json()
                              console.log('[Extract Cover] Response data:', data)
                              
                              if (response.ok && data.coverUrl) {
                                setFormData({ ...formData, cover_url: data.coverUrl })
                                setSuccess(true)
                                setTimeout(() => setSuccess(false), 3000)
                              } else {
                                // Log detailed error information
                                console.error('[Extract Cover] Error details:', {
                                  endpoint,
                                  statusCode: response.status,
                                  statusText: response.statusText,
                                  errorBody: data
                                })
                                
                                let errorMsg = data.error || 'Could not extract cover image. You can still add the playlist without it.'
                                if (data.details) {
                                  errorMsg += `\n\nDebug info:\n- Endpoint: ${data.details.endpoint || endpoint}\n- Status: ${data.details.statusCode || response.status}\n- Details: ${JSON.stringify(data.details, null, 2)}`
                                }
                                setError(errorMsg)
                              }
                            } catch (err: any) {
                              console.error('[Extract Cover] Exception:', err)
                              setError(`Failed to extract cover: ${err.message}. You can still add the playlist without it.`)
                            } finally {
                              setExtractingCover(false)
                            }
                          }}
                          disabled={extractingCover || fetchingSpotify || !formData.spotify_url.trim()}
                          className="mb-0"
                          variant="outline"
                        >
                          {extractingCover ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Extracting...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Extract Cover
                            </>
                          )}
                        </Button>
                      </div>
                      <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                        Optional: Click "Extract Cover" to automatically get the cover image URL from the Spotify page, or leave blank.
                      </p>
                    </div>
                  </div>
                )}

                {/* Manual entry fields when API fetch fails */}
                {spotifyData?.manualEntry && (
                  <div className={`p-4 ${cardStyle.bg} ${cardStyle.border} border rounded-lg space-y-4`}>
                    <div className={`p-3 ${cardStyle.bg} rounded-lg`} style={{ backgroundColor: cardStyle.accent + '20', borderColor: cardStyle.accent + '40' }}>
                      <p className={`text-sm ${cardStyle.text} font-medium`}>
                        API fetch unavailable. Please enter playlist details manually:
                      </p>
                    </div>
                    <div>
                      <Label className={cardStyle.text}>Playlist Title *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                        placeholder="Enter playlist title"
                      />
                    </div>
                    <div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className={cardStyle.text}>Cover Image URL (Optional)</Label>
                          <Input
                            value={formData.cover_url}
                            onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                            className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                            placeholder="https://i.scdn.co/image/..."
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={async () => {
                            if (!formData.spotify_url.trim()) {
                              setError('Please enter a Spotify playlist URL first')
                              return
                            }
                            try {
                              setFetchingSpotify(true)
                              setError(null)
                              const response = await fetch('/api/spotify/extract-cover', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url: formData.spotify_url }),
                              })
                              const data = await response.json()
                              if (response.ok && data.coverUrl) {
                                setFormData({ ...formData, cover_url: data.coverUrl })
                                setSuccess(true)
                                setTimeout(() => setSuccess(false), 3000)
                              } else {
                                setError(data.error || 'Could not extract cover image. You can still add the playlist without it.')
                              }
                            } catch (err: any) {
                              setError(`Failed to extract cover: ${err.message}. You can still add the playlist without it.`)
                            } finally {
                              setFetchingSpotify(false)
                            }
                          }}
                          disabled={fetchingSpotify || !formData.spotify_url.trim()}
                          className="mb-0"
                          variant="outline"
                        >
                          {extractingCover ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Extracting...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Extract Cover
                            </>
                          )}
                        </Button>
                      </div>
                      <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                        Optional: Click "Extract Cover" to automatically get the cover image URL from the Spotify page, or leave blank.
                      </p>
                      {formData.cover_url && (
                        <img 
                          src={formData.cover_url} 
                          alt="Cover preview"
                          className="w-32 h-32 object-cover rounded-lg mt-2"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className={cardStyle.text}>Date *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                    />
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Curator {permissions?.canManageUsers ? '(Editable)' : ''}</Label>
                    <Input
                      value={formData.curator}
                      onChange={(e) => setFormData({ ...formData, curator: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                      placeholder="Auto-populated from current curator assignment"
                      readOnly={!permissions?.canManageUsers && formData.curator.trim() !== ''}
                    />
                    <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                      {permissions?.canManageUsers
                        ? formData.curator.trim()
                          ? 'Curator will be set to the name you provide (admin override)'
                          : 'Defaults to the current curator assigned for this date. You can override as admin.'
                        : 'Curator is set to the current curator for this date'}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className={cardStyle.text}>Description (Optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                    placeholder="Playlist description..."
                    rows={3}
                  />
                  <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                    Will use Spotify description if left empty
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  onClick={() => setIsAddDialogOpen(false)}
                  variant="outline"
                  className={`${cardStyle.border} border ${cardStyle.text}`}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!formData.spotify_url.trim() || !formData.date || saving}
                  className={`${getRoundedClass('rounded-lg')} ${
                    mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                    mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                    'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                  } font-black uppercase tracking-wider`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {selectedIds.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className={`${getRoundedClass('rounded-lg')} h-8 text-xs font-black uppercase tracking-wider`}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete Selected ({selectedIds.size})
            </Button>
          )}

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 ${getTextClass()}/50`} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search playlists..."
                className={`pl-7 h-8 text-xs ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-')
                setSortBy(by)
                setSortOrder(order)
              }}
              className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} h-8 px-2 text-xs ${getRoundedClass('rounded-md')}`}
            >
              <option value="date-desc">Date (Newest)</option>
              <option value="date-asc">Date (Oldest)</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
              <option value="curator-asc">Curator (A-Z)</option>
              <option value="curator-desc">Curator (Z-A)</option>
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-3 ${getRoundedClass('rounded-xl')}`}>
            <p className={`${cardStyle.text} text-sm`}>Loading...</p>
          </Card>
        ) : filteredPlaylists.length === 0 ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-3 ${getRoundedClass('rounded-xl')}`}>
            <p className={`${cardStyle.text} text-sm`}>No playlists found.</p>
          </Card>
        ) : (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border ${getRoundedClass('rounded-xl')} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${cardStyle.border} border-b`}>
                    <th className="p-4 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredPlaylists.length && filteredPlaylists.length > 0}
                        onChange={toggleSelectAll}
                        className="w-3 h-3"
                      />
                    </th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Title</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Curator</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Date</th>
                    <th className={`p-2 text-right ${cardStyle.text} font-black uppercase text-xs`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlaylists.map((item) => (
                    <tr
                      key={item.id}
                      className={`${cardStyle.border} border-b hover:opacity-80 transition-opacity`}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-3 h-3"
                        />
                      </td>
                      <td className={`p-2 ${cardStyle.text} font-semibold text-sm`}>
                        {item.title || 'Untitled Playlist'}
                      </td>
                      <td className={`p-2 ${cardStyle.text} text-sm`}>
                        {item.curator}
                      </td>
                      <td className={`p-2 ${cardStyle.text}/70 text-xs font-normal`}>
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => handleEdit(item)}
                            size="sm"
                            variant="outline"
                            className={`${cardStyle.border} border ${cardStyle.text} h-6 px-2`}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(item.id)}
                            size="sm"
                            variant="destructive"
                            className="h-6 px-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className={`${cardStyle.bg} ${cardStyle.border} border max-w-4xl max-h-[90vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle className={cardStyle.text}>Edit Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className={cardStyle.text}>Spotify Playlist URL *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={formData.spotify_url}
                    onChange={(e) => {
                      setFormData({ ...formData, spotify_url: e.target.value })
                      setError(null)
                      setSuccess(false)
                    }}
                    className={`flex-1 ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="https://open.spotify.com/playlist/..."
                  />
                  <Button 
                    onClick={fetchSpotifyData} 
                    disabled={fetchingSpotify || !formData.spotify_url.trim()}
                    className={`${cardStyle.border} border ${cardStyle.text}`}
                  >
                    {fetchingSpotify ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Music className="w-4 h-4 mr-2" />
                        Fetch
                      </>
                    )}
                  </Button>
                </div>
                <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                  Update the Spotify URL and click Fetch to refresh playlist data
                </p>
              </div>

              {error && (
                <div className={`p-4 ${cardStyle.bg} ${cardStyle.border} border rounded-lg`} style={{ borderColor: '#ef444440' }}>
                  <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
                </div>
              )}

              {success && spotifyData && (
                <div className={`p-4 ${cardStyle.bg} ${cardStyle.border} border rounded-lg`} style={{ borderColor: '#22c55e40' }}>
                  <p className="text-sm" style={{ color: '#22c55e' }}>Playlist data fetched successfully!</p>
                </div>
              )}

              {spotifyData && (
                <div className={`p-4 ${cardStyle.bg} ${cardStyle.border} border rounded-lg space-y-3`}>
                  <div className="grid grid-cols-2 gap-4">
                    {spotifyData.coverUrl && (
                      <div>
                        <Label className={cardStyle.text}>Cover Image</Label>
                        <img 
                          src={spotifyData.coverUrl} 
                          alt={spotifyData.title || 'Playlist cover'}
                          className="w-32 h-32 object-cover rounded-lg mt-2"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      {spotifyData.totalDuration && (
                        <div>
                          <Label className={cardStyle.text}>Duration</Label>
                          <p className={`text-sm ${cardStyle.text}`}>{spotifyData.totalDuration}</p>
                        </div>
                      )}
                      {spotifyData.trackCount && (
                        <div>
                          <Label className={cardStyle.text}>Track Count</Label>
                          <p className={`text-sm ${cardStyle.text}`}>{spotifyData.trackCount} tracks</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {spotifyData.artistsList && (
                    <div>
                      <Label className={cardStyle.text}>Artists</Label>
                      <p className={`text-sm ${cardStyle.text} line-clamp-2`}>{spotifyData.artistsList}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label className={cardStyle.text}>Title *</Label>
                <Input
                  value={formData.title || spotifyData?.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                  placeholder="Playlist title"
                />
                <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                  {spotifyData?.title ? 'Title fetched from Spotify. You can edit it if needed.' : 'Enter playlist title or fetch from Spotify'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className={cardStyle.text}>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Curator * {permissions?.canManageUsers ? '(Editable)' : ''}</Label>
                  <Input
                    value={formData.curator}
                    onChange={(e) => setFormData({ ...formData, curator: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                    placeholder="Defaults to current curator for this date"
                    disabled={!permissions?.canManageUsers}
                  />
                  <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                    {permissions?.canManageUsers
                      ? 'You can override the curator as an admin'
                      : 'Curator is set to the current curator for this date'}
                  </p>
                </div>
              </div>

              <div>
                <Label className={cardStyle.text}>Description (Optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                  placeholder="Playlist description..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingItem(null)
                  resetForm()
                }}
                variant="outline"
                className={`${cardStyle.border} border ${cardStyle.text}`}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!formData.date || !formData.curator.trim() || saving}
                className={`${getRoundedClass('rounded-lg')} ${
                  mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                  mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                  'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                } font-black uppercase tracking-wider`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
