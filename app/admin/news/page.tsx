'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  Pin,
  ExternalLink,
  Upload,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NewsItem {
  id: string
  title: string
  content: string | null
  url: string | null
  image_url: string | null
  category: string | null
  tags: string[] | null
  pinned: boolean
  headline_only: boolean
  published_date: string
  submitted_by: string
  created_at: string
  updated_at: string
  submitted_by_profile?: {
    id: string
    email: string
    full_name: string | null
  }
}

const NEWS_CATEGORIES = [
  'Announcement',
  'Update',
  'Event',
  'Policy',
  'Team',
  'Other'
]

export default function NewsPage() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPinned, setFilterPinned] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('published_date')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Form state - default date to today
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0] // Format as YYYY-MM-DD
  }

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    url: '',
    image_url: '',
    category: '',
    tags: '',
    pinned: false,
    headline_only: false,
    published_date: getTodayDate(),
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageUploadRef = useRef<HTMLInputElement>(null)

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

  // Fetch news items
  const fetchNews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterPinned !== null) params.append('pinned', filterPinned)
      if (filterCategory !== 'all') params.append('category', filterCategory)
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)
      // Add cache-busting timestamp
      params.append('_t', Date.now().toString())

      const response = await fetch(`/api/news?${params.toString()}`, {
        cache: 'no-store'
      })
      const result = await response.json()
      
      if (response.ok) {
        setNewsItems(result.data || [])
      } else {
        console.error('Error fetching news:', result.error)
      }
    } catch (error) {
      console.error('Error fetching news:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  // Debounce search and refetch on sort/filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNews()
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery, filterPinned, filterCategory, sortBy, sortOrder])

  // Handle add
  const handleAdd = async () => {
    try {
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content || null,
          url: formData.url || null,
          image_url: formData.image_url || null,
          category: formData.category || null,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : null,
          pinned: formData.pinned,
          headline_only: formData.headline_only,
          published_date: formData.published_date,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsAddDialogOpen(false)
        resetForm()
        fetchNews()
      } else {
        const errorMsg = result.details 
          ? `${result.error}\n\nDetails: ${result.details}${result.code ? `\nCode: ${result.code}` : ''}`
          : result.error || 'Failed to add news item'
        console.error('Error adding news item:', result)
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Error adding news item:', error)
      alert(`Failed to add news item: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle edit
  const handleEdit = (item: NewsItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      content: item.content || '',
      url: item.url || '',
      image_url: item.image_url || '',
      category: item.category || '',
      tags: item.tags ? item.tags.join(', ') : '',
      pinned: item.pinned,
      headline_only: item.headline_only || false,
      published_date: item.published_date || getTodayDate(),
    })
    setImagePreview(item.image_url || null)
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingItem) return

    try {
      const response = await fetch('/api/news', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          title: formData.title,
          content: formData.content || null,
          url: formData.url || null,
          category: formData.category || null,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : null,
          pinned: formData.pinned,
          published_date: formData.published_date,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsEditDialogOpen(false)
        setEditingItem(null)
        resetForm()
        fetchNews()
      } else {
        const errorMsg = result.details 
          ? `${result.error}\n\nDetails: ${result.details}${result.code ? `\nCode: ${result.code}` : ''}`
          : result.error || 'Failed to update news item'
        console.error('Error updating news item:', result)
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Error updating news item:', error)
      alert(`Failed to update news item: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news item?')) return

    try {
      const response = await fetch(`/api/news?id=${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchNews()
        setSelectedIds(new Set())
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting news item:', error)
      alert('Failed to delete news item')
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} news item(s)?`)) return

    try {
      const ids = Array.from(selectedIds).join(',')
      const response = await fetch(`/api/news?ids=${ids}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchNews()
        setSelectedIds(new Set())
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting news items:', error)
      alert('Failed to delete news items')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      url: '',
      image_url: '',
      category: '',
      tags: '',
      pinned: false,
      headline_only: false,
      published_date: getTodayDate(),
    })
    setImagePreview(null)
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    setUploadingImage(true)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `news-image-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Supabase storage (using work-sample-thumbnails bucket)
      const { error: uploadError } = await supabase.storage
        .from('work-sample-thumbnails')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('work-sample-thumbnails')
        .getPublicUrl(filePath)

      setFormData({ ...formData, image_url: publicUrl })
      
      // Reset file input
      if (imageUploadRef.current) {
        imageUploadRef.current.value = ''
      }
    } catch (err: any) {
      console.error('Error uploading image:', err)
      alert(err.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  // Handle pin toggle
  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      const response = await fetch('/api/news', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          pinned: !currentPinned,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchNews()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error toggling pin:', error)
      alert('Failed to toggle pin')
    }
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
    if (selectedIds.size === filteredNews.length && filteredNews.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredNews.map(item => item.id)))
    }
  }

  // Filtering is done server-side via API, so we just use newsItems directly
  const filteredNews = newsItems

  const cardStyle = getCardStyle()

  return (
    <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>News</h1>
          <p className={`${getTextClass()}/70 text-sm font-normal`}>Manage team announcements and updates.</p>
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
                <DialogTitle className={cardStyle.text}>Add New News Item</DialogTitle>
              </DialogHeader>
              {/* Pinned and Headline Only at the top */}
              <div className="mb-4 space-y-2">
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="headline-only-add"
                    checked={formData.headline_only}
                    onChange={(e) => setFormData({ ...formData, headline_only: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="headline-only-add" className={cardStyle.text}>Headline Only (Oversized scrolling text)</Label>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className={cardStyle.text}>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Enter news title"
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Content</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Enter news content (optional)"
                    rows={6}
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>URL (optional)</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="https://example.com"
                    type="url"
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Image (optional)</Label>
                  <div className="space-y-2">
                    {imagePreview && (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-w-full h-48 object-cover rounded-md"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setImagePreview(null)
                            setFormData({ ...formData, image_url: '' })
                            if (imageUploadRef.current) {
                              imageUploadRef.current.value = ''
                            }
                          }}
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        ref={imageUploadRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload-add"
                      />
                      <Label
                        htmlFor="image-upload-add"
                        className={`flex items-center gap-2 px-4 py-2 ${cardStyle.border} border ${cardStyle.text} cursor-pointer ${getRoundedClass('rounded-md')} hover:opacity-80`}
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingImage ? 'Uploading...' : imagePreview ? 'Change Image' : 'Upload Image'}
                      </Label>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={cardStyle.text}>Category</Label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                    >
                      <option value="">Select category</option>
                      {NEWS_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Published Date</Label>
                    <Input
                      type="date"
                      value={formData.published_date}
                      onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    />
                  </div>
                </div>
                <div>
                  <Label className={cardStyle.text}>Tags (comma-separated)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    onClick={() => setIsAddDialogOpen(false)}
                    variant="outline"
                    className={`${cardStyle.border} border ${cardStyle.text}`}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={!formData.title}
                    className={`${getRoundedClass('rounded-lg')} ${
                      mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                      mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                      'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                    } font-black uppercase tracking-wider`}
                  >
                    Add
                  </Button>
                </div>
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
              {NEWS_CATEGORIES.map(cat => (
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
              <option value="published_date-desc">Date (Newest)</option>
              <option value="published_date-asc">Date (Oldest)</option>
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
        ) : filteredNews.length === 0 ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-3 ${getRoundedClass('rounded-xl')}`}>
            <p className={`${cardStyle.text} text-sm`}>No news items found.</p>
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
                        checked={selectedIds.size === filteredNews.length && filteredNews.length > 0}
                        onChange={toggleSelectAll}
                        className="w-3 h-3"
                      />
                    </th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Pin</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Title</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Category</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Published</th>
                    <th className={`p-2 text-right ${cardStyle.text} font-black uppercase text-xs`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNews.map((item) => (
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
                        <div className="flex items-center gap-2">
                          {item.title}
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs opacity-60 hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className={`p-2 ${cardStyle.text}/70 text-xs font-normal`}>
                        {item.category || '-'}
                      </td>
                      <td className={`p-2 ${cardStyle.text}/70 text-xs font-normal`}>
                        {new Date(item.published_date).toLocaleDateString()}
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
              <DialogTitle className={cardStyle.text}>Edit News Item</DialogTitle>
            </DialogHeader>
            {/* Pinned and Headline Only at the top */}
            <div className="mb-4 space-y-2">
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="headline-only-edit"
                  checked={formData.headline_only}
                  onChange={(e) => setFormData({ ...formData, headline_only: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="headline-only-edit" className={cardStyle.text}>Headline Only (Oversized scrolling text)</Label>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className={cardStyle.text}>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                  placeholder="Enter news title"
                />
              </div>
              <div>
                <Label className={cardStyle.text}>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                  placeholder="Enter news content (optional)"
                  rows={6}
                />
              </div>
              <div>
                <Label className={cardStyle.text}>URL (optional)</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>
              <div>
                <Label className={cardStyle.text}>Image (optional)</Label>
                <div className="space-y-2">
                  {imagePreview && (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-w-full h-48 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setImagePreview(null)
                          setFormData({ ...formData, image_url: '' })
                          if (imageUploadRef.current) {
                            imageUploadRef.current.value = ''
                          }
                        }}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={imageUploadRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload-edit"
                    />
                    <Label
                      htmlFor="image-upload-edit"
                      className={`flex items-center gap-2 px-4 py-2 ${cardStyle.border} border ${cardStyle.text} cursor-pointer ${getRoundedClass('rounded-md')} hover:opacity-80`}
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingImage ? 'Uploading...' : imagePreview ? 'Change Image' : 'Upload Image'}
                    </Label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={cardStyle.text}>Category</Label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                  >
                    <option value="">Select category</option>
                    {NEWS_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className={cardStyle.text}>Published Date</Label>
                  <Input
                    type="date"
                    value={formData.published_date}
                    onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                  />
                </div>
              </div>
              <div>
                <Label className={cardStyle.text}>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
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
                  disabled={!formData.title}
                  className={`${getRoundedClass('rounded-lg')} ${
                    mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                    mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                    'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                  } font-black uppercase tracking-wider`}
                >
                  Update
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
