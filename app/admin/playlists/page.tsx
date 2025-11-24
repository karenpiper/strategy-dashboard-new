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
  })

  const [spotifyData, setSpotifyData] = useState<PlaylistData | null>(null)
  const [fetchingSpotify, setFetchingSpotify] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
      
      // Use curator from form if provided, otherwise use Spotify owner
      const finalCurator = formData.curator.trim() || data.curator
      
      setSpotifyData({
        ...data,
        curator: finalCurator,
        curatorPhotoUrl: data.curatorPhotoUrl || null,
        description: formData.description.trim() || data.description || '',
      })
      setSuccess(true)
      
      // Auto-populate curator if empty
      if (!formData.curator.trim()) {
        setFormData(prev => ({ ...prev, curator: data.curator }))
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch playlist data')
      setSpotifyData(null)
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

  // Handle add
  const handleAdd = async () => {
    if (!spotifyData) {
      setError('Please fetch playlist data from Spotify first')
      return
    }

    if (!formData.date || !formData.curator.trim()) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const finalCurator = formData.curator.trim() || spotifyData.curator
      const finalDescription = formData.description.trim() || spotifyData.description || ''

      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formData.date,
          title: spotifyData.title || null,
          curator: finalCurator,
          description: finalDescription || null,
          spotify_url: spotifyData.spotifyUrl || formData.spotify_url,
          cover_url: spotifyData.coverUrl || null,
          curator_photo_url: spotifyData.curatorPhotoUrl || null,
          total_duration: spotifyData.totalDuration || null,
          track_count: spotifyData.trackCount || null,
          artists_list: spotifyData.artistsList || null,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsAddDialogOpen(false)
        resetForm()
        fetchPlaylists()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
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
      const finalTitle = spotifyData?.title || editingItem.title
      const finalCoverUrl = spotifyData?.coverUrl || editingItem.cover_url
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
        fetchPlaylists()
        setSelectedIds(new Set())
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting playlist:', error)
      alert('Failed to delete playlist')
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
                    Paste a Spotify playlist link and click Fetch to automatically populate fields
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
                    <Label className={cardStyle.text}>Curator *</Label>
                    <Input
                      value={formData.curator}
                      onChange={(e) => setFormData({ ...formData, curator: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                      placeholder="Rebecca Smith"
                    />
                    <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                      Will use playlist owner if left empty
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
                  disabled={!spotifyData || !formData.date || !formData.curator.trim() || saving}
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
                  <Label className={cardStyle.text}>Curator *</Label>
                  <Input
                    value={formData.curator}
                    onChange={(e) => setFormData({ ...formData, curator: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                    placeholder="Rebecca Smith"
                  />
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
