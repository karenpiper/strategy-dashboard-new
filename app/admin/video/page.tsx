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
import { VideoEmbed } from '@/components/video-embed'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  X,
  Pin,
  ExternalLink,
  Play,
  Eye
} from 'lucide-react'

interface Video {
  id: string
  title: string
  video_url: string
  description: string | null
  thumbnail_url: string | null
  category: string | null
  tags: string[] | null
  platform: string | null
  duration: number | null
  pinned: boolean
  submitted_by: string
  created_at: string
  updated_at: string
  submitted_by_profile?: {
    id: string
    email: string
    full_name: string | null
  }
}

const VIDEO_CATEGORIES = [
  'Training',
  'Meeting Recording',
  'Tutorial',
  'Presentation',
  'Demo',
  'Other'
]

export default function VideoAdmin() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPinned, setFilterPinned] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<Video | null>(null)
  const [viewingItem, setViewingItem] = useState<Video | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    description: '',
    thumbnail_url: '',
    category: '',
    tags: '',
    platform: '',
    duration: '',
    pinned: false,
  })

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

  // Fetch videos
  const fetchVideos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterPinned !== null) params.append('pinned', filterPinned)
      if (filterCategory !== 'all') params.append('category', filterCategory)
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)

      const response = await fetch(`/api/videos?${params.toString()}`)
      const result = await response.json()
      
      if (response.ok) {
        setVideos(result.data || [])
      } else {
        console.error('Error fetching videos:', result.error)
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  // Debounce search and refetch on sort/filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVideos()
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery, filterPinned, filterCategory, sortBy, sortOrder])

  // Handle add
  const handleAdd = async () => {
    try {
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          video_url: formData.video_url,
          description: formData.description || null,
          thumbnail_url: formData.thumbnail_url || null,
          category: formData.category || null,
          tags: formData.tags,
          platform: formData.platform || null,
          duration: formData.duration ? parseInt(formData.duration) : null,
          pinned: formData.pinned,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsAddDialogOpen(false)
        resetForm()
        fetchVideos()
      } else {
        const errorMsg = result.details 
          ? `${result.error}\n\nDetails: ${result.details}`
          : result.error || 'Failed to add video'
        console.error('Error adding video:', result)
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Error adding video:', error)
      alert(`Failed to add video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle edit
  const handleEdit = (item: Video) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      video_url: item.video_url,
      description: item.description || '',
      thumbnail_url: item.thumbnail_url || '',
      category: item.category || '',
      tags: item.tags?.join(', ') || '',
      platform: item.platform || '',
      duration: item.duration?.toString() || '',
      pinned: item.pinned,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingItem) return

    try {
      const response = await fetch('/api/videos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          title: formData.title,
          video_url: formData.video_url,
          description: formData.description || null,
          thumbnail_url: formData.thumbnail_url || null,
          category: formData.category || null,
          tags: formData.tags,
          platform: formData.platform || null,
          duration: formData.duration ? parseInt(formData.duration) : null,
          pinned: formData.pinned,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsEditDialogOpen(false)
        setEditingItem(null)
        resetForm()
        fetchVideos()
      } else {
        const errorMsg = result.details 
          ? `${result.error}\n\nDetails: ${result.details}`
          : result.error || 'Failed to update video'
        console.error('Error updating video:', result)
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Error updating video:', error)
      alert(`Failed to update video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return

    try {
      const response = await fetch(`/api/videos?id=${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchVideos()
        setSelectedIds(new Set())
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting video:', error)
      alert('Failed to delete video')
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} video(s)?`)) return

    try {
      const ids = Array.from(selectedIds).join(',')
      const response = await fetch(`/api/videos?ids=${ids}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchVideos()
        setSelectedIds(new Set())
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting videos:', error)
      alert('Failed to delete videos')
    }
  }

  // Handle pin toggle
  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      const response = await fetch('/api/videos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          pinned: !currentPinned,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchVideos()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error toggling pin:', error)
      alert('Failed to toggle pin')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      video_url: '',
      description: '',
      thumbnail_url: '',
      category: '',
      tags: '',
      platform: '',
      duration: '',
      pinned: false,
    })
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
    if (selectedIds.size === videos.length && videos.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(videos.map(item => item.id)))
    }
  }

  const filteredVideos = videos

  const cardStyle = getCardStyle()

  return (
    <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Videos</h1>
          <p className={`${getTextClass()}/70 text-sm font-normal`}>Manage video content</p>
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
                <DialogTitle className={cardStyle.text}>Add New Video</DialogTitle>
              </DialogHeader>
              {/* Pinned at the top */}
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pinned-add"
                    checked={formData.pinned}
                    onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="pinned-add" className={cardStyle.text}>Pinned</Label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <Label className={cardStyle.text}>Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="Enter video title"
                    />
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Video URL *</Label>
                    <Input
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="https://youtube.com/watch?v=..."
                      type="url"
                    />
                    <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                      Supports YouTube, Vimeo, or direct video links
                    </p>
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Thumbnail URL (optional)</Label>
                    <Input
                      value={formData.thumbnail_url}
                      onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="https://example.com/thumbnail.jpg"
                      type="url"
                    />
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Category (optional)</Label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                    >
                      <option value="">No Category</option>
                      {VIDEO_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Tags (comma-separated)</Label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="Tag1, Tag2, Tag3"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <Label className={cardStyle.text}>Description (optional)</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="Video description"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Platform (optional)</Label>
                    <select
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                    >
                      <option value="">Auto-detect</option>
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                      <option value="zoom">Zoom</option>
                      <option value="direct">Direct Link</option>
                    </select>
                    <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                      Platform is auto-detected from URL if not specified
                    </p>
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Duration in seconds (optional)</Label>
                    <Input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="3600"
                    />
                  </div>
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
                  disabled={!formData.title || !formData.video_url}
                  className={`${getRoundedClass('rounded-lg')} ${
                    mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                    mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                    'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                  } font-black uppercase tracking-wider`}
                >
                  Add
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
                placeholder="Search all fields..."
                className={`pl-7 h-8 text-xs ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1">
            <Filter className={`w-3 h-3 ${getTextClass()}/50`} />
            <select
              value={filterPinned || 'all'}
              onChange={(e) => setFilterPinned(e.target.value === 'all' ? null : e.target.value)}
              className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} h-8 px-2 text-xs ${getRoundedClass('rounded-md')}`}
            >
              <option value="all">All</option>
              <option value="true">Pinned Only</option>
              <option value="false">Not Pinned</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} h-8 px-2 text-xs ${getRoundedClass('rounded-md')}`}
            >
              <option value="all">All Categories</option>
              {VIDEO_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
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
              <option value="created_at-desc">Date (Newest)</option>
              <option value="created_at-asc">Date (Oldest)</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-3 ${getRoundedClass('rounded-xl')}`}>
            <p className={`${cardStyle.text} text-sm`}>Loading...</p>
          </Card>
        ) : filteredVideos.length === 0 ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-3 ${getRoundedClass('rounded-xl')}`}>
            <p className={`${cardStyle.text} text-sm`}>No videos found.</p>
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
                        checked={selectedIds.size === filteredVideos.length && filteredVideos.length > 0}
                        onChange={toggleSelectAll}
                        className="w-3 h-3"
                      />
                    </th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Pin</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Title</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Category</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Created On</th>
                    <th className={`p-2 text-right ${cardStyle.text} font-black uppercase text-xs`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVideos.map((item) => (
                    <tr
                      key={item.id}
                      className={`${cardStyle.border} border-b hover:opacity-80 transition-opacity ${
                        item.pinned ? 'bg-opacity-20' : ''
                      }`}
                      style={item.pinned ? { backgroundColor: `${cardStyle.accent}20` } : {}}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-3 h-3"
                        />
                      </td>
                      <td className="p-2">
                        {item.pinned && (
                          <Pin className={`w-3 h-3`} style={{ color: cardStyle.accent }} />
                        )}
                      </td>
                      <td className={`p-2 ${cardStyle.text} font-semibold text-sm`}>
                        {item.title}
                      </td>
                      <td className={`p-2 ${cardStyle.text}/70 text-xs font-normal`}>
                        {item.category || '-'}
                      </td>
                      <td className={`p-2 ${cardStyle.text}/70 text-xs font-normal`}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => handleTogglePin(item.id, item.pinned)}
                            size="sm"
                            variant="outline"
                            className={`${cardStyle.border} border ${cardStyle.text} h-6 px-2`}
                            title={item.pinned ? 'Unpin' : 'Pin'}
                          >
                            <Pin className={`w-3 h-3 ${item.pinned ? 'fill-current' : ''}`} />
                          </Button>
                          <Button
                            onClick={() => {
                              setViewingItem(item)
                              setIsViewDialogOpen(true)
                            }}
                            size="sm"
                            variant="outline"
                            className={`${cardStyle.border} border ${cardStyle.text} h-6 px-2`}
                            title="View video"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => window.open(item.video_url, '_blank')}
                            size="sm"
                            variant="outline"
                            className={`${cardStyle.border} border ${cardStyle.text} h-6 px-2`}
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
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
              <DialogTitle className={cardStyle.text}>Edit Video</DialogTitle>
            </DialogHeader>
            {/* Pinned at the top */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinned-edit"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="pinned-edit" className={cardStyle.text}>Pinned</Label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label className={cardStyle.text}>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Enter video title"
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Video URL *</Label>
                  <Input
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="https://youtube.com/watch?v=..."
                    type="url"
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Thumbnail URL (optional)</Label>
                  <Input
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="https://example.com/thumbnail.jpg"
                    type="url"
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Category (optional)</Label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                  >
                    <option value="">No Category</option>
                    {VIDEO_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className={cardStyle.text}>Tags (comma-separated)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Tag1, Tag2, Tag3"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label className={cardStyle.text}>Description (optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Video description"
                    rows={4}
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Platform (optional)</Label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                  >
                    <option value="">Auto-detect</option>
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="zoom">Zoom</option>
                    <option value="direct">Direct Link</option>
                  </select>
                </div>
                <div>
                  <Label className={cardStyle.text}>Duration in seconds (optional)</Label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="3600"
                  />
                </div>
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
                disabled={!formData.title || !formData.video_url}
                className={`${getRoundedClass('rounded-lg')} ${
                  mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                  mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                  'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                } font-black uppercase tracking-wider`}
              >
                Update
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog with Video Embed */}
        <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
          setIsViewDialogOpen(open)
          if (!open) {
            setViewingItem(null)
          }
        }}>
          <DialogContent className={`${cardStyle.bg} ${cardStyle.border} border max-w-5xl max-h-[90vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle className={cardStyle.text}>
                {viewingItem?.title || 'Video'}
              </DialogTitle>
            </DialogHeader>
            {viewingItem && (
              <div className="space-y-4">
                {/* Video Embed */}
                <VideoEmbed
                  videoUrl={viewingItem.video_url}
                  title={viewingItem.title}
                  platform={viewingItem.platform}
                  thumbnailUrl={viewingItem.thumbnail_url}
                  aspectRatio="16/9"
                />

                {/* Video Details */}
                <div className={`${cardStyle.border} border-t pt-4 space-y-2`}>
                  {viewingItem.description && (
                    <div>
                      <h3 className={`text-sm font-semibold ${cardStyle.text} mb-1`}>Description</h3>
                      <p className={`text-sm ${cardStyle.text}/70`}>{viewingItem.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {viewingItem.category && (
                      <div>
                        <span className={`font-semibold ${cardStyle.text}`}>Category: </span>
                        <span className={cardStyle.text + '/70'}>{viewingItem.category}</span>
                      </div>
                    )}
                    {viewingItem.platform && (
                      <div>
                        <span className={`font-semibold ${cardStyle.text}`}>Platform: </span>
                        <span className={cardStyle.text + '/70'}>{viewingItem.platform}</span>
                      </div>
                    )}
                    {viewingItem.duration && (
                      <div>
                        <span className={`font-semibold ${cardStyle.text}`}>Duration: </span>
                        <span className={cardStyle.text + '/70'}>
                          {Math.floor(viewingItem.duration / 60)}:{(viewingItem.duration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                    {viewingItem.created_at && (
                      <div>
                        <span className={`font-semibold ${cardStyle.text}`}>Created: </span>
                        <span className={cardStyle.text + '/70'}>
                          {new Date(viewingItem.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {viewingItem.tags && viewingItem.tags.length > 0 && (
                    <div>
                      <h3 className={`text-sm font-semibold ${cardStyle.text} mb-1`}>Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {viewingItem.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 ${getRoundedClass('rounded-md')} text-xs ${
                              mode === 'chaos' ? 'bg-[#C4F500]/20 text-[#C4F500]' :
                              mode === 'chill' ? 'bg-[#FFC043]/20 text-[#4A1818]' :
                              'bg-white/20 text-white'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingItem.submitted_by_profile && (
                    <div>
                      <span className={`font-semibold ${cardStyle.text}`}>Submitted by: </span>
                      <span className={cardStyle.text + '/70'}>
                        {viewingItem.submitted_by_profile.full_name || viewingItem.submitted_by_profile.email}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        setIsViewDialogOpen(false)
                        handleEdit(viewingItem)
                      }}
                      className={`${getRoundedClass('rounded-lg')} ${
                        mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                        mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                        'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                      } font-black uppercase tracking-wider`}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => window.open(viewingItem.video_url, '_blank')}
                      variant="outline"
                      className={`${cardStyle.border} border ${cardStyle.text}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Original
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
