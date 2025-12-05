'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { 
  Plus, 
  Edit, 
  Trash2,
  ArrowUp,
  ArrowDown,
  Link as LinkIcon
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'

interface QuickLink {
  id: string
  label: string
  url: string
  icon_name: string | null
  password: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

const COMMON_ICONS = [
  'Bot', 'MessageSquare', 'Briefcase', 'Music', 'Clock', 'FileText',
  'Sparkles', 'ExternalLink', 'Link', 'Zap', 'Star', 'Heart',
  'Coffee', 'Lightbulb', 'Video', 'Users', 'Calendar', 'Search'
]

export default function QuickLinksAdmin() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<QuickLink | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    label: '',
    url: '',
    icon_name: '',
    password: '',
    display_order: 0,
    is_active: true,
  })

  // Theme-aware styling
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
        border: 'border border-[#4A1818]', 
        text: 'text-[#4A1818]', 
        accent: '#4A1818' 
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

  const cardStyle = getCardStyle()

  // Fetch quick links
  const fetchQuickLinks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/quick-links')
      if (response.ok) {
        const result = await response.json()
        setQuickLinks(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching quick links:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuickLinks()
  }, [])

  // Handle add
  const handleAdd = async () => {
    if (!formData.label || !formData.url) {
      alert('Please fill in label and URL')
      return
    }

    try {
      const response = await fetch('/api/quick-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsAddDialogOpen(false)
        resetForm()
        fetchQuickLinks()
      } else {
        alert(result.error || 'Failed to add quick link')
      }
    } catch (error) {
      console.error('Error adding quick link:', error)
      alert('Failed to add quick link')
    }
  }

  // Handle edit
  const handleEdit = (item: QuickLink) => {
    setEditingItem(item)
    setFormData({
      label: item.label,
      url: item.url,
      icon_name: item.icon_name || '',
      password: item.password || '',
      display_order: item.display_order,
      is_active: item.is_active,
    })
    setIsEditDialogOpen(true)
  }

  // Handle update
  const handleUpdate = async () => {
    if (!editingItem || !formData.label || !formData.url) {
      alert('Please fill in label and URL')
      return
    }

    try {
      const response = await fetch('/api/quick-links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          ...formData,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsEditDialogOpen(false)
        setEditingItem(null)
        resetForm()
        fetchQuickLinks()
      } else {
        alert(result.error || 'Failed to update quick link')
      }
    } catch (error) {
      console.error('Error updating quick link:', error)
      alert('Failed to update quick link')
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quick link?')) return

    try {
      const response = await fetch(`/api/quick-links?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchQuickLinks()
      } else {
        const result = await response.json()
        alert(result.error || 'Failed to delete quick link')
      }
    } catch (error) {
      console.error('Error deleting quick link:', error)
      alert('Failed to delete quick link')
    }
  }

  // Handle reorder
  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const item = quickLinks.find(link => link.id === id)
    if (!item) return

    const currentIndex = quickLinks.findIndex(link => link.id === id)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= quickLinks.length) return

    const newOrder = quickLinks[newIndex].display_order
    const oldOrder = item.display_order

    // Swap orders
    try {
      await Promise.all([
        fetch('/api/quick-links', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, display_order: newOrder }),
        }),
        fetch('/api/quick-links', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: quickLinks[newIndex].id, 
            display_order: oldOrder 
          }),
        }),
      ])
      fetchQuickLinks()
    } catch (error) {
      console.error('Error reordering:', error)
      alert('Failed to reorder quick link')
    }
  }

  const resetForm = () => {
    setFormData({
      label: '',
      url: '',
      icon_name: '',
      password: '',
      display_order: 0,
      is_active: true,
    })
  }

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return LinkIcon
    const IconComponent = (LucideIcons as any)[iconName]
    return IconComponent || LinkIcon
  }

  return (
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()} p-6`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()}`}>
            Quick Links
          </h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  resetForm()
                  setIsAddDialogOpen(true)
                }}
                className={`${mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#A8D800]' : mode === 'chill' ? 'bg-[#4A1818] text-white hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Quick Link
              </Button>
            </DialogTrigger>
            <DialogContent className={cardStyle.bg + ' ' + cardStyle.border}>
              <DialogHeader>
                <DialogTitle className={cardStyle.text}>Add Quick Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className={cardStyle.text}>Label *</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className={cardStyle.bg + ' ' + cardStyle.border + ' ' + cardStyle.text}
                    placeholder="e.g., AI Resource Library"
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>URL *</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className={cardStyle.bg + ' ' + cardStyle.border + ' ' + cardStyle.text}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Icon Name</Label>
                  <select
                    value={formData.icon_name}
                    onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                    className={`w-full p-2 rounded ${cardStyle.bg} ${cardStyle.border} ${cardStyle.text}`}
                  >
                    <option value="">None</option>
                    {COMMON_ICONS.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className={cardStyle.text}>Password (optional)</Label>
                  <Input
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={cardStyle.bg + ' ' + cardStyle.border + ' ' + cardStyle.text}
                    placeholder="password: codeandtheory"
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Display Order</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className={cardStyle.bg + ' ' + cardStyle.border + ' ' + cardStyle.text}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <Label htmlFor="is_active" className={cardStyle.text}>Active</Label>
                </div>
                <Button
                  onClick={handleAdd}
                  className={`w-full ${mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#A8D800]' : mode === 'chill' ? 'bg-[#4A1818] text-white hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black`}
                >
                  Add
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className={cardStyle.text}>Loading...</p>
          </div>
        ) : quickLinks.length === 0 ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} p-6`}>
            <p className={`${cardStyle.text} text-center`}>No quick links yet. Add one to get started!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {quickLinks.map((link) => {
              const IconComponent = getIconComponent(link.icon_name)
              return (
                <Card key={link.id} className={`${cardStyle.bg} ${cardStyle.border} p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReorder(link.id, 'up')}
                          disabled={quickLinks.indexOf(link) === 0}
                          className={`${cardStyle.text} opacity-50 hover:opacity-100 disabled:opacity-20`}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReorder(link.id, 'down')}
                          disabled={quickLinks.indexOf(link) === quickLinks.length - 1}
                          className={`${cardStyle.text} opacity-50 hover:opacity-100 disabled:opacity-20`}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        {link.icon_name && <IconComponent className="w-4 h-4" />}
                        <div>
                          <p className={`font-semibold ${cardStyle.text}`}>{link.label}</p>
                          <p className={`text-sm opacity-60 ${cardStyle.text}`}>{link.url}</p>
                          {link.password && (
                            <p className={`text-xs opacity-50 ${cardStyle.text}`}>{link.password}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${link.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {link.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`text-xs ${cardStyle.text} opacity-50`}>
                          Order: {link.display_order}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleEdit(link)}
                        variant="ghost"
                        size="sm"
                        className={cardStyle.text}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(link.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className={cardStyle.bg + ' ' + cardStyle.border}>
            <DialogHeader>
              <DialogTitle className={cardStyle.text}>Edit Quick Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className={cardStyle.text}>Label *</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className={cardStyle.bg + ' ' + cardStyle.border + ' ' + cardStyle.text}
                />
              </div>
              <div>
                <Label className={cardStyle.text}>URL *</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className={cardStyle.bg + ' ' + cardStyle.border + ' ' + cardStyle.text}
                />
              </div>
              <div>
                <Label className={cardStyle.text}>Icon Name</Label>
                <select
                  value={formData.icon_name}
                  onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                  className={`w-full p-2 rounded ${cardStyle.bg} ${cardStyle.border} ${cardStyle.text}`}
                >
                  <option value="">None</option>
                  {COMMON_ICONS.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className={cardStyle.text}>Password (optional)</Label>
                <Input
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={cardStyle.bg + ' ' + cardStyle.border + ' ' + cardStyle.text}
                />
              </div>
              <div>
                <Label className={cardStyle.text}>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className={cardStyle.bg + ' ' + cardStyle.border + ' ' + cardStyle.text}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <Label htmlFor="edit_is_active" className={cardStyle.text}>Active</Label>
              </div>
              <Button
                onClick={handleUpdate}
                className={`w-full ${mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#A8D800]' : mode === 'chill' ? 'bg-[#4A1818] text-white hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black`}
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


