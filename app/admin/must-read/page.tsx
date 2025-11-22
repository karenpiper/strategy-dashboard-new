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
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  X,
  Check,
  Pin,
  ExternalLink
} from 'lucide-react'

interface MustRead {
  id: string
  article_title: string
  article_url: string
  notes: string | null
  pinned: boolean
  submitted_by: string
  assigned_to: string | null
  week_start_date?: string
  category?: string | null
  source?: string | null
  summary?: string | null
  tags?: string[] | null
  created_at: string
  updated_at: string
  submitted_by_profile?: {
    id: string
    email: string
    full_name: string | null
  }
  assigned_to_profile?: {
    id: string
    email: string
    full_name: string | null
  }
}

export default function MustReadAdmin() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [mustReads, setMustReads] = useState<MustRead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPinned, setFilterPinned] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<MustRead | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; email: string; full_name: string | null }>>([])
  
  // Form state - default date to today
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0] // Format as YYYY-MM-DD
  }

  const [formData, setFormData] = useState({
    article_title: '',
    article_url: '',
    notes: '',
    pinned: false,
    assigned_to: '',
    submitted_by: '', // Can be blank
    date: getTodayDate(), // Default to current date
    category: '',
    source: '',
    summary: '',
    tags: [] as string[],
  })

  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [generatingTags, setGeneratingTags] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

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

  // Fetch must reads
  const fetchMustReads = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterPinned !== null) params.append('pinned', filterPinned)
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)

      const response = await fetch(`/api/must-reads?${params.toString()}`)
      const result = await response.json()
      
      if (response.ok) {
        setMustReads(result.data || [])
      } else {
        console.error('Error fetching must reads:', result.error)
      }
    } catch (error) {
      console.error('Error fetching must reads:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch users for the assigned_to dropdown
  const fetchUsers = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name', { ascending: true })

      if (!error && data) {
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Debounce search and refetch on sort/filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMustReads()
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery, filterPinned, sortBy, sortOrder])

  // Handle add
  const handleAdd = async () => {
    try {
      const { date, ...restFormData } = formData
      const response = await fetch('/api/must-reads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...restFormData,
          week_start_date: date, // Send date as week_start_date
          submitted_by: formData.submitted_by || null, // Can be null/empty
          assigned_to: formData.assigned_to || null,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsAddDialogOpen(false)
        resetForm()
        fetchMustReads()
      } else {
        const errorMsg = result.details 
          ? `${result.error}\n\nDetails: ${result.details}${result.code ? `\nCode: ${result.code}` : ''}`
          : result.error || 'Failed to add must read'
        console.error('Error adding must read:', result)
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Error adding must read:', error)
      alert(`Failed to add must read: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle edit
  const handleEdit = (item: MustRead) => {
    setEditingItem(item)
    setFormData({
      article_title: item.article_title,
      article_url: item.article_url,
      notes: item.notes || '',
      pinned: item.pinned,
      assigned_to: item.assigned_to || '',
      submitted_by: item.submitted_by || '',
      date: item.week_start_date || getTodayDate(), // Use week_start_date or default to today
      category: item.category || '',
      source: item.source || '',
      summary: item.summary || '',
      tags: item.tags || [],
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingItem) return

    try {
      const { date, ...restFormData } = formData
      const response = await fetch('/api/must-reads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          ...restFormData,
          week_start_date: date, // Send date as week_start_date
          submitted_by: formData.submitted_by || null,
          assigned_to: formData.assigned_to || null,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsEditDialogOpen(false)
        setEditingItem(null)
        resetForm()
        fetchMustReads()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error updating must read:', error)
      alert('Failed to update must read')
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this must read?')) return

    try {
      const response = await fetch(`/api/must-reads?id=${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchMustReads()
        setSelectedIds(new Set())
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting must read:', error)
      alert('Failed to delete must read')
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} must read(s)?`)) return

    try {
      const ids = Array.from(selectedIds).join(',')
      const response = await fetch(`/api/must-reads?ids=${ids}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchMustReads()
        setSelectedIds(new Set())
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting must reads:', error)
      alert('Failed to delete must reads')
    }
  }

  const resetForm = () => {
    setFormData({
      article_title: '',
      article_url: '',
      notes: '',
      pinned: false,
      assigned_to: '',
      submitted_by: '', // Can be blank
      date: getTodayDate(), // Reset to current date
      category: '',
      source: '',
      summary: '',
      tags: [],
    })
  }

  // Handle pin toggle
  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      const response = await fetch('/api/must-reads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          pinned: !currentPinned,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchMustReads()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error toggling pin:', error)
      alert('Failed to toggle pin')
    }
  }

  // Extract source (domain) from URL
  const extractSource = (url: string) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return ''
    }
  }

  // Auto-extract source when URL changes
  useEffect(() => {
    if (formData.article_url && !formData.source) {
      const source = extractSource(formData.article_url)
      if (source) {
        setFormData(prev => ({ ...prev, source }))
      }
    }
  }, [formData.article_url, formData.source])

  // Generate summary from article
  const handleGenerateSummary = async () => {
    if (!formData.article_url) {
      alert('Please enter an article URL first')
      return
    }

    try {
      setGeneratingSummary(true)
      const response = await fetch('/api/must-reads/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.article_url,
          title: formData.article_title,
          generateSummary: true,
        }),
      })

      const result = await response.json()
      
      if (response.ok && result.summary) {
        setFormData({ ...formData, summary: result.summary })
      } else {
        alert(result.summaryError || 'Failed to generate summary')
      }
    } catch (error) {
      console.error('Error generating summary:', error)
      alert('Failed to generate summary')
    } finally {
      setGeneratingSummary(false)
    }
  }

  // Generate tags from article
  const handleGenerateTags = async () => {
    if (!formData.article_url) {
      alert('Please enter an article URL first')
      return
    }

    try {
      setGeneratingTags(true)
      const response = await fetch('/api/must-reads/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.article_url,
          title: formData.article_title,
          generateTags: true,
        }),
      })

      const result = await response.json()
      
      if (response.ok && result.tags && Array.isArray(result.tags)) {
        setFormData({ ...formData, tags: result.tags })
      } else {
        alert(result.tagsError || 'Failed to generate tags')
      }
    } catch (error) {
      console.error('Error generating tags:', error)
      alert('Failed to generate tags')
    } finally {
      setGeneratingTags(false)
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
    if (selectedIds.size === filteredMustReads.length && filteredMustReads.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMustReads.map(item => item.id)))
    }
  }

  // Filtering is done server-side via API, so we just use mustReads directly
  const filteredMustReads = mustReads

  const cardStyle = getCardStyle()

  return (
    <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-black uppercase tracking-wider ${getTextClass()} mb-2`}>Must Reads</h1>
          <p className={`${getTextClass()}/70 font-bold`}>Manage articles and resources</p>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (open) {
              resetForm()
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                className={`${getRoundedClass('rounded-lg')} ${
                  mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                  mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                  'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                } font-black uppercase tracking-wider ${mode === 'code' ? 'font-mono' : ''}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className={`${cardStyle.bg} ${cardStyle.border} border max-w-4xl max-h-[90vh] overflow-y-auto`}>
              <DialogHeader>
                <DialogTitle className={cardStyle.text}>Add New Must Read</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <Label className={cardStyle.text}>Article Title *</Label>
                    <Input
                      value={formData.article_title}
                      onChange={(e) => setFormData({ ...formData, article_title: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="Enter article title"
                    />
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Article URL *</Label>
                    <Input
                      value={formData.article_url}
                      onChange={(e) => setFormData({ ...formData, article_url: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="https://example.com/article"
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
                      <option value="Technology">Technology</option>
                      <option value="Culture">Culture</option>
                      <option value="Fun">Fun</option>
                      <option value="Industry">Industry</option>
                      <option value="Craft">Craft</option>
                    </select>
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Source (optional)</Label>
                    <Input
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="Auto-extracted from URL"
                    />
                    <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                      Source is automatically extracted from the URL, but you can edit it
                    </p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <Label className={cardStyle.text}>Summary (optional)</Label>
                    <div className="flex gap-2">
                      <Textarea
                        value={formData.summary}
                        onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                        className={`flex-1 ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                        placeholder="AI-generated summary will appear here..."
                        rows={3}
                      />
                      <Button
                        type="button"
                        onClick={handleGenerateSummary}
                        disabled={!formData.article_url || generatingSummary}
                        variant="outline"
                        className={`${cardStyle.border} border ${cardStyle.text} whitespace-nowrap`}
                      >
                        {generatingSummary ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Tags (optional)</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} px-2 py-1 ${getRoundedClass('rounded-md')} text-sm flex items-center gap-1`}
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = formData.tags.filter((_, i) => i !== index)
                                setFormData({ ...formData, tags: newTags })
                              }}
                              className="hover:opacity-70"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        {formData.tags.length === 0 && (
                          <span className={`${cardStyle.text}/50 text-sm`}>No tags yet</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={handleGenerateTags}
                        disabled={!formData.article_url || generatingTags}
                        variant="outline"
                        className={`${cardStyle.border} border ${cardStyle.text} whitespace-nowrap`}
                      >
                        {generatingTags ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                    <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                      AI will generate up to 3 relevant tags from the article
                    </p>
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Notes (optional)</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="Add any notes about this article"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    />
                  </div>
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
                  <div>
                    <Label className={cardStyle.text}>Submitted By</Label>
                    <select
                      value={formData.submitted_by || ''}
                      onChange={(e) => setFormData({ ...formData, submitted_by: e.target.value })}
                      className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                    >
                      <option value="">None</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Assigned To</Label>
                    <select
                      value={formData.assigned_to || ''}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                    >
                      <option value="">None</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </option>
                      ))}
                    </select>
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
                    disabled={!formData.article_title || !formData.article_url}
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
              className={`${getRoundedClass('rounded-lg')} font-black uppercase tracking-wider`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedIds.size})
            </Button>
          )}

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${getTextClass()}/50`} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all fields..."
                className={`pl-10 ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${getTextClass()}/50`} />
            <select
              value={filterPinned || 'all'}
              onChange={(e) => setFilterPinned(e.target.value === 'all' ? null : e.target.value)}
              className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
            >
              <option value="all">All</option>
              <option value="true">Pinned Only</option>
              <option value="false">Not Pinned</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-')
                setSortBy(by)
                setSortOrder(order)
              }}
              className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
            >
              <option value="created_at-desc">Date (Newest)</option>
              <option value="created_at-asc">Date (Oldest)</option>
              <option value="article_title-asc">Article Name (A-Z)</option>
              <option value="article_title-desc">Article Name (Z-A)</option>
              <option value="submitted_by-asc">Submitted By (A-Z)</option>
              <option value="submitted_by-desc">Submitted By (Z-A)</option>
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <p className={cardStyle.text}>Loading...</p>
          </Card>
        ) : filteredMustReads.length === 0 ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <p className={cardStyle.text}>No must reads found.</p>
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
                        checked={selectedIds.size === filteredMustReads.length && filteredMustReads.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className={`p-4 text-left ${cardStyle.text} font-black uppercase text-sm`}>Pin</th>
                    <th className={`p-4 text-left ${cardStyle.text} font-black uppercase text-sm`}>Title</th>
                    <th className={`p-4 text-left ${cardStyle.text} font-black uppercase text-sm`}>Submitted By</th>
                    <th className={`p-4 text-left ${cardStyle.text} font-black uppercase text-sm`}>Created On</th>
                    <th className={`p-4 text-right ${cardStyle.text} font-black uppercase text-sm`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMustReads.map((item) => (
                    <tr
                      key={item.id}
                      className={`${cardStyle.border} border-b hover:opacity-80 transition-opacity ${
                        item.pinned ? 'bg-opacity-20' : ''
                      }`}
                      style={item.pinned ? { backgroundColor: `${cardStyle.accent}20` } : {}}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="p-4">
                        {item.pinned && (
                          <Pin className={`w-4 h-4`} style={{ color: cardStyle.accent }} />
                        )}
                      </td>
                      <td className={`p-4 ${cardStyle.text} font-black uppercase`}>
                        {item.article_title}
                      </td>
                      <td className={`p-4 ${cardStyle.text}/70 text-sm font-bold`}>
                        {item.submitted_by_profile?.full_name || item.submitted_by_profile?.email || 'Unknown'}
                      </td>
                      <td className={`p-4 ${cardStyle.text}/70 text-sm font-bold`}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleTogglePin(item.id, item.pinned)}
                            size="sm"
                            variant="outline"
                            className={`${cardStyle.border} border ${cardStyle.text}`}
                            title={item.pinned ? 'Unpin' : 'Pin'}
                          >
                            <Pin className={`w-4 h-4 ${item.pinned ? 'fill-current' : ''}`} />
                          </Button>
                          <Button
                            onClick={() => handleEdit(item)}
                            size="sm"
                            variant="outline"
                            className={`${cardStyle.border} border ${cardStyle.text}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(item.id)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="w-4 h-4" />
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
              <DialogTitle className={cardStyle.text}>Edit Must Read</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label className={cardStyle.text}>Article Title *</Label>
                  <Input
                    value={formData.article_title}
                    onChange={(e) => setFormData({ ...formData, article_title: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Enter article title"
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Article URL *</Label>
                  <Input
                    value={formData.article_url}
                    onChange={(e) => setFormData({ ...formData, article_url: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="https://example.com/article"
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
                    <option value="Technology">Technology</option>
                    <option value="Culture">Culture</option>
                    <option value="Fun">Fun</option>
                    <option value="Industry">Industry</option>
                    <option value="Craft">Craft</option>
                  </select>
                </div>
                <div>
                  <Label className={cardStyle.text}>Source (optional)</Label>
                  <Input
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Auto-extracted from URL"
                  />
                  <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                    Source is automatically extracted from the URL, but you can edit it
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label className={cardStyle.text}>Summary (optional)</Label>
                  <div className="flex gap-2">
                    <Textarea
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      className={`flex-1 ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="AI-generated summary will appear here..."
                      rows={3}
                    />
                    <Button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={!formData.article_url || generatingSummary}
                      variant="outline"
                      className={`${cardStyle.border} border ${cardStyle.text} whitespace-nowrap`}
                    >
                      {generatingSummary ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className={cardStyle.text}>Tags (optional)</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} px-2 py-1 ${getRoundedClass('rounded-md')} text-sm flex items-center gap-1`}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = formData.tags.filter((_, i) => i !== index)
                              setFormData({ ...formData, tags: newTags })
                            }}
                            className="hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {formData.tags.length === 0 && (
                        <span className={`${cardStyle.text}/50 text-sm`}>No tags yet</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={handleGenerateTags}
                      disabled={!formData.article_url || generatingTags}
                      variant="outline"
                      className={`${cardStyle.border} border ${cardStyle.text} whitespace-nowrap`}
                    >
                      {generatingTags ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                  <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                    AI will generate up to 3 relevant tags from the article
                  </p>
                </div>
                <div>
                  <Label className={cardStyle.text}>Notes (optional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Add any notes about this article"
                    rows={3}
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                  />
                </div>
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
                <div>
                  <Label className={cardStyle.text}>Submitted By</Label>
                  <select
                    value={formData.submitted_by || ''}
                    onChange={(e) => setFormData({ ...formData, submitted_by: e.target.value })}
                    className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                  >
                    <option value="">None</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className={cardStyle.text}>Assigned To</Label>
                  <select
                    value={formData.assigned_to || ''}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                  >
                    <option value="">None</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </option>
                    ))}
                  </select>
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
                  disabled={!formData.article_title || !formData.article_url}
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
      </div>
    </div>
  )
}

