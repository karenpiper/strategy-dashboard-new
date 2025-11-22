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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<MustRead | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; email: string; full_name: string | null }>>([])
  
  // Form state
  const [formData, setFormData] = useState({
    article_title: '',
    article_url: '',
    notes: '',
    pinned: false,
    assigned_to: '',
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

  // Fetch must reads
  const fetchMustReads = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterPinned !== null) params.append('pinned', filterPinned)

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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMustReads()
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery, filterPinned])

  // Handle add
  const handleAdd = async () => {
    try {
      const response = await fetch('/api/must-reads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assigned_to: formData.assigned_to || user?.id,
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
      assigned_to: item.assigned_to || user?.id || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingItem) return

    try {
      const response = await fetch('/api/must-reads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          ...formData,
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
      assigned_to: user?.id || '',
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
              if (user?.id) {
                setFormData(prev => ({ ...prev, assigned_to: user.id }))
              }
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
            <DialogContent className={`${cardStyle.bg} ${cardStyle.border} border`}>
              <DialogHeader>
                <DialogTitle className={cardStyle.text}>Add New Must Read</DialogTitle>
              </DialogHeader>
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
                  <Label className={cardStyle.text}>Notes (optional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Add any notes about this article"
                    rows={3}
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
                  <Label className={cardStyle.text}>Assigned To</Label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
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
                placeholder="Search by title, URL, or notes..."
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
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredMustReads.length && filteredMustReads.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4"
              />
              <Label className={cardStyle.text}>Select All</Label>
            </div>

            {filteredMustReads.map((item) => (
              <Card
                key={item.id}
                className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')} ${
                  item.pinned ? 'ring-2' : ''
                }`}
                style={item.pinned ? { ringColor: cardStyle.accent } : {}}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="w-4 h-4 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {item.pinned && (
                            <Pin className={`w-4 h-4`} style={{ color: cardStyle.accent }} />
                          )}
                          <h3 className={`text-xl font-black uppercase ${cardStyle.text}`}>
                            {item.article_title}
                          </h3>
                        </div>
                        <a
                          href={item.article_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm ${cardStyle.text}/70 hover:${cardStyle.text} flex items-center gap-1 font-bold`}
                        >
                          {item.article_url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
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
                    </div>
                    {item.notes && (
                      <p className={`text-sm ${cardStyle.text}/70 mb-2 font-medium`}>{item.notes}</p>
                    )}
                    <div className={`flex items-center gap-4 text-xs ${cardStyle.text}/50 font-bold`}>
                      <span>
                        Submitted by: {item.submitted_by_profile?.full_name || item.submitted_by_profile?.email || 'Unknown'}
                      </span>
                      {item.assigned_to_profile && (
                        <span>
                          Assigned to: {item.assigned_to_profile.full_name || item.assigned_to_profile.email}
                        </span>
                      )}
                      <span>
                        Created: {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className={`${cardStyle.bg} ${cardStyle.border} border`}>
            <DialogHeader>
              <DialogTitle className={cardStyle.text}>Edit Must Read</DialogTitle>
            </DialogHeader>
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
                <Label className={cardStyle.text}>Notes (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                  placeholder="Add any notes about this article"
                  rows={3}
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
                <Label className={cardStyle.text}>Assigned To</Label>
                <select
                  value={formData.assigned_to}
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
              <div className="flex justify-end gap-2">
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
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

