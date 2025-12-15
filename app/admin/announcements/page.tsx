'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { Plus, Edit, Trash2, X, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Announcement {
  id: string
  headline: string
  mode: 'text' | 'countdown'
  event_name: string | null
  target_date: string | null
  text_format: 'days_until' | 'happens_in' | 'custom' | null
  custom_format: string | null
  sticker_url: string | null
  start_date: string
  end_date: string | null
  active: boolean
  working_days_only: boolean | null
  created_at: string
  updated_at: string
  created_by_profile?: {
    id: string
    email: string
    full_name: string | null
  } | null
}

export default function AnnouncementsPage() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<Announcement | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    headline: '',
    mode: 'text' as 'text' | 'countdown',
    event_name: '',
    target_date: '',
    text_format: 'days_until' as 'days_until' | 'happens_in' | 'custom',
    custom_format: '',
    sticker_url: '',
    start_date: getTodayDate(),
    end_date: '',
    active: true,
    working_days_only: false,
  })
  const [stickerPreview, setStickerPreview] = useState<string | null>(null)
  const [uploadingSticker, setUploadingSticker] = useState(false)
  const stickerUploadRef = useRef<HTMLInputElement>(null)

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

  // Fetch all announcements (including inactive for admin view)
  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/announcements?admin=true', {
        cache: 'no-store'
      })
      
      if (response.ok) {
        const result = await response.json()
        setAnnouncements(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleAdd = async () => {
    try {
      const requestBody: any = {
        mode: formData.mode,
        event_name: formData.mode === 'countdown' ? formData.event_name : null,
        target_date: formData.mode === 'countdown' && formData.target_date ? new Date(formData.target_date).toISOString() : null,
        text_format: formData.mode === 'countdown' ? formData.text_format : null,
        custom_format: formData.mode === 'countdown' && formData.text_format === 'custom' ? formData.custom_format : null,
        sticker_url: formData.sticker_url || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        active: formData.active,
        working_days_only: formData.mode === 'countdown' ? formData.working_days_only : false,
      }

      // Only include headline for text mode
      if (formData.mode === 'text') {
        requestBody.headline = formData.headline
      } else if (formData.headline) {
        // Optional headline for countdown mode
        requestBody.headline = formData.headline
      }
      
      console.log('Adding announcement with data:', requestBody)
      console.log('Form data state:', formData)
      
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsAddDialogOpen(false)
        resetForm()
        fetchAnnouncements()
      } else {
        alert(result.error || 'Failed to add announcement')
      }
    } catch (error) {
      console.error('Error adding announcement:', error)
      alert('Failed to add announcement')
    }
  }

  const handleEdit = (item: Announcement) => {
    setEditingItem(item)
    // Convert ISO date to datetime-local format for target_date
    let targetDateLocal = ''
    if (item.target_date) {
      const date = new Date(item.target_date)
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      targetDateLocal = date.toISOString().slice(0, 16)
    }
    setFormData({
      headline: item.headline,
      mode: item.mode,
      event_name: item.event_name || '',
      target_date: targetDateLocal,
      text_format: item.text_format || 'days_until',
      custom_format: item.custom_format || '',
      sticker_url: item.sticker_url || '',
      start_date: item.start_date,
      end_date: item.end_date || '',
      active: item.active,
      working_days_only: item.working_days_only || false,
    })
    setStickerPreview(item.sticker_url || null)
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingItem) return

    try {
      const requestBody = {
        id: editingItem.id,
        mode: formData.mode,
        event_name: formData.mode === 'countdown' ? formData.event_name : null,
        target_date: formData.mode === 'countdown' && formData.target_date ? new Date(formData.target_date).toISOString() : null,
        text_format: formData.mode === 'countdown' ? formData.text_format : null,
        custom_format: formData.mode === 'countdown' && formData.text_format === 'custom' ? formData.custom_format : null,
        sticker_url: formData.sticker_url || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        active: formData.active,
        working_days_only: formData.mode === 'countdown' ? formData.working_days_only : false,
      }

      // Only include headline if it's text mode or if it exists
      if (formData.mode === 'text') {
        (requestBody as any).headline = formData.headline
      } else if (formData.headline) {
        (requestBody as any).headline = formData.headline
      }

      console.log('Updating announcement with data:', requestBody)
      console.log('Form data state:', formData)

      const response = await fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()
      
      if (response.ok) {
        console.log('Update successful:', result)
        setIsEditDialogOpen(false)
        setEditingItem(null)
        resetForm()
        fetchAnnouncements()
        alert('Announcement updated successfully!')
      } else {
        console.error('Update error:', result)
        alert(result.error || 'Failed to update announcement')
      }
    } catch (error) {
      console.error('Error updating announcement:', error)
      alert('Failed to update announcement')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return

    try {
      const response = await fetch(`/api/announcements?id=${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchAnnouncements()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting announcement:', error)
      alert('Failed to delete announcement')
    }
  }

  const resetForm = () => {
    setFormData({
      headline: '',
      mode: 'text',
      event_name: '',
      target_date: '',
      text_format: 'days_until',
      custom_format: '',
      sticker_url: '',
      start_date: getTodayDate(),
      end_date: '',
      active: true,
      working_days_only: false,
    })
    setStickerPreview(null)
  }

  // Handle sticker upload
  const handleStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Allow images and GIFs
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image or GIF file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File must be less than 5MB')
      return
    }

    setUploadingSticker(true)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `announcement-sticker-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setStickerPreview(reader.result as string)
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

      // Use functional update to avoid stale closure
      setFormData(prev => ({ ...prev, sticker_url: publicUrl }))
      
      // Reset file input
      if (stickerUploadRef.current) {
        stickerUploadRef.current.value = ''
      }
    } catch (err: any) {
      console.error('Error uploading sticker:', err)
      alert(err.message || 'Failed to upload sticker')
    } finally {
      setUploadingSticker(false)
    }
  }

  const cardStyle = getCardStyle()

  return (
    <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-4">
          <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Announcements</h1>
          <p className={`${getTextClass()}/70 text-sm font-normal`}>Manage banner announcements and countdowns.</p>
        </div>

        <div className="mb-3">
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
                } font-black uppercase tracking-wider`}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className={`${cardStyle.bg} ${cardStyle.border} border max-w-2xl`}>
              <DialogHeader>
                <DialogTitle className={cardStyle.text}>Add Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className={cardStyle.text}>Mode</Label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'text' | 'countdown' })}
                    className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                  >
                    <option value="text">Text (Scrolling headline)</option>
                    <option value="countdown">Countdown (Event countdown)</option>
                  </select>
                </div>
                {formData.mode === 'text' && (
                  <div>
                    <Label className={cardStyle.text}>Headline *</Label>
                    <Input
                      value={formData.headline}
                      onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="Enter announcement headline"
                    />
                  </div>
                )}
                <div>
                  <Label className={cardStyle.text}>Sticker/GIF (Breaker between text) (optional)</Label>
                  <div className="space-y-2">
                    {stickerPreview && (
                      <div className="relative">
                        <img 
                          src={stickerPreview} 
                          alt="Sticker preview" 
                          className="max-w-full h-24 object-contain rounded-md"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStickerPreview(null)
                            setFormData({ ...formData, sticker_url: '' })
                            if (stickerUploadRef.current) {
                              stickerUploadRef.current.value = ''
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
                        ref={stickerUploadRef}
                        type="file"
                        accept="image/*,.gif"
                        onChange={handleStickerUpload}
                        className="hidden"
                        id="sticker-upload-add"
                      />
                      <Label
                        htmlFor="sticker-upload-add"
                        className={`flex items-center gap-2 px-4 py-2 ${cardStyle.border} border ${cardStyle.text} cursor-pointer ${getRoundedClass('rounded-md')} hover:opacity-80`}
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingSticker ? 'Uploading...' : stickerPreview ? 'Change Sticker' : 'Upload Sticker/GIF'}
                      </Label>
                    </div>
                  </div>
                </div>
                {formData.mode === 'countdown' && (
                  <>
                    <div>
                      <Label className={cardStyle.text}>Event Name *</Label>
                      <Input
                        value={formData.event_name}
                        onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                        className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                        placeholder="e.g., Team Meeting, Launch Day"
                      />
                    </div>
                    <div>
                      <Label className={cardStyle.text}>Target Date & Time *</Label>
                      <Input
                        type="datetime-local"
                        value={formData.target_date}
                        onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                        className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      />
                    </div>
                    <div>
                      <Label className={cardStyle.text}>Text Format</Label>
                      <div className="space-y-2 mt-2">
                        <label className={`flex items-start gap-3 p-3 ${cardStyle.border} border rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                          formData.text_format === 'days_until' ? `${cardStyle.border} border-2` : ''
                        }`}>
                          <input
                            type="radio"
                            name="text_format"
                            value="days_until"
                            checked={formData.text_format === 'days_until'}
                            onChange={(e) => setFormData({ ...formData, text_format: e.target.value as 'days_until' | 'happens_in' | 'custom' })}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className={`font-semibold ${cardStyle.text} mb-1`}>
                              {"{days}"} days until {"{event}"}
                            </div>
                            <div className={`text-sm ${cardStyle.text}/70`}>
                              Example: "5 days until Team Meeting"
                            </div>
                          </div>
                        </label>
                        <label className={`flex items-start gap-3 p-3 ${cardStyle.border} border rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                          formData.text_format === 'happens_in' ? `${cardStyle.border} border-2` : ''
                        }`}>
                          <input
                            type="radio"
                            name="text_format"
                            value="happens_in"
                            checked={formData.text_format === 'happens_in'}
                            onChange={(e) => setFormData({ ...formData, text_format: e.target.value as 'days_until' | 'happens_in' | 'custom' })}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className={`font-semibold ${cardStyle.text} mb-1`}>
                              {"{event}"} happens in {"{days}"} days
                            </div>
                            <div className={`text-sm ${cardStyle.text}/70`}>
                              Example: "Product Launch happens in 10 days"
                            </div>
                          </div>
                        </label>
                        <label className={`flex items-start gap-3 p-3 ${cardStyle.border} border rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                          formData.text_format === 'custom' ? `${cardStyle.border} border-2` : ''
                        }`}>
                          <input
                            type="radio"
                            name="text_format"
                            value="custom"
                            checked={formData.text_format === 'custom'}
                            onChange={(e) => setFormData({ ...formData, text_format: e.target.value as 'days_until' | 'happens_in' | 'custom' })}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className={`font-semibold ${cardStyle.text} mb-1`}>
                              Custom (Free text with variables)
                            </div>
                            <div className={`text-sm ${cardStyle.text}/70 mb-2`}>
                              Use {"{days}"} for days remaining and {"{event}"} for event name
                            </div>
                            {formData.text_format === 'custom' && (
                              <Input
                                value={formData.custom_format}
                                onChange={(e) => setFormData({ ...formData, custom_format: e.target.value })}
                                className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-2`}
                                placeholder='e.g., "Only {days} more days until {event}!"'
                              />
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="working-days-only-add"
                        checked={formData.working_days_only}
                        onChange={(e) => setFormData({ ...formData, working_days_only: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="working-days-only-add" className={cardStyle.text}>
                        Count working days only (exclude weekends)
                      </Label>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={cardStyle.text}>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    />
                  </div>
                  <div>
                    <Label className={cardStyle.text}>End Date (optional)</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active-add"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="active-add" className={cardStyle.text}>Active</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className={getRoundedClass('rounded-lg')}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={(formData.mode === 'text' && !formData.headline) || (formData.mode === 'countdown' && (!formData.event_name || !formData.target_date || (formData.text_format === 'custom' && !formData.custom_format)))}
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
        </div>

        {loading ? (
          <div className={`${cardStyle.text} text-center py-8`}>Loading...</div>
        ) : announcements.length === 0 ? (
          <div className={`${cardStyle.text}/70 text-center py-8`}>No announcements yet</div>
        ) : (
          <div className="space-y-4">
            {announcements.map((item) => (
              <Card key={item.id} className={`${cardStyle.bg} ${cardStyle.border} border p-4 ${getRoundedClass('rounded-lg')}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2 py-1 ${getRoundedClass('rounded')} ${
                        item.mode === 'countdown' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.mode === 'countdown' ? 'Countdown' : 'Text'}
                      </span>
                      {item.active ? (
                        <span className="text-xs font-semibold px-2 py-1 bg-green-500/20 text-green-400 rounded">Active</span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-1 bg-gray-500/20 text-gray-400 rounded">Inactive</span>
                      )}
                    </div>
                    <h3 className={`text-lg font-bold ${cardStyle.text} mb-1`}>{item.headline}</h3>
                    {item.mode === 'countdown' && item.event_name && (
                      <p className={`text-sm ${cardStyle.text}/70 mb-1`}>
                        Event: {item.event_name} • Target: {item.target_date ? new Date(item.target_date).toLocaleDateString() : 'N/A'}
                      </p>
                    )}
                    <p className={`text-xs ${cardStyle.text}/60`}>
                      {item.start_date} {item.end_date ? `- ${item.end_date}` : '(no end date)'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className={getRoundedClass('rounded-lg')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className={getRoundedClass('rounded-lg')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className={`${cardStyle.bg} ${cardStyle.border} border max-w-2xl`}>
            <DialogHeader>
              <DialogTitle className={cardStyle.text}>Edit Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className={cardStyle.text}>Mode</Label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'text' | 'countdown' })}
                  className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                >
                  <option value="text">Text (Scrolling headline)</option>
                  <option value="countdown">Countdown (Event countdown)</option>
                </select>
              </div>
              {formData.mode === 'text' && (
                <div>
                  <Label className={cardStyle.text}>Headline *</Label>
                  <Input
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                  />
                </div>
              )}
              <div>
                <Label className={cardStyle.text}>Sticker/GIF (Breaker between text) (optional)</Label>
                <div className="space-y-2">
                  {stickerPreview && (
                    <div className="relative">
                      <img 
                        src={stickerPreview} 
                        alt="Sticker preview" 
                        className="max-w-full h-24 object-contain rounded-md"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStickerPreview(null)
                          setFormData({ ...formData, sticker_url: '' })
                          if (stickerUploadRef.current) {
                            stickerUploadRef.current.value = ''
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
                      ref={stickerUploadRef}
                      type="file"
                      accept="image/*,.gif"
                      onChange={handleStickerUpload}
                      className="hidden"
                      id="sticker-upload-edit"
                    />
                    <Label
                      htmlFor="sticker-upload-edit"
                      className={`flex items-center gap-2 px-4 py-2 ${cardStyle.border} border ${cardStyle.text} cursor-pointer ${getRoundedClass('rounded-md')} hover:opacity-80`}
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingSticker ? 'Uploading...' : stickerPreview ? 'Change Sticker' : 'Upload Sticker/GIF'}
                    </Label>
                  </div>
                </div>
              </div>
              {formData.mode === 'countdown' && (
                <>
                  <div>
                    <Label className={cardStyle.text}>Event Name *</Label>
                    <Input
                      value={formData.event_name}
                      onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    />
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Target Date & Time *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    />
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Text Format</Label>
                    <div className="space-y-2 mt-2">
                      <label className={`flex items-start gap-3 p-3 ${cardStyle.border} border rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                        formData.text_format === 'days_until' ? `${cardStyle.border} border-2` : ''
                      }`}>
                        <input
                          type="radio"
                          name="text_format_edit"
                          value="days_until"
                          checked={formData.text_format === 'days_until'}
                          onChange={(e) => setFormData({ ...formData, text_format: e.target.value as 'days_until' | 'happens_in' | 'custom' })}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className={`font-semibold ${cardStyle.text} mb-1`}>
                            {"{days}"} days until {"{event}"}
                          </div>
                          <div className={`text-sm ${cardStyle.text}/70`}>
                            Example: "5 days until Team Meeting"
                          </div>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-3 ${cardStyle.border} border rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                        formData.text_format === 'happens_in' ? `${cardStyle.border} border-2` : ''
                      }`}>
                        <input
                          type="radio"
                          name="text_format_edit"
                          value="happens_in"
                          checked={formData.text_format === 'happens_in'}
                          onChange={(e) => setFormData({ ...formData, text_format: e.target.value as 'days_until' | 'happens_in' | 'custom' })}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className={`font-semibold ${cardStyle.text} mb-1`}>
                            {"{event}"} happens in {"{days}"} days
                          </div>
                          <div className={`text-sm ${cardStyle.text}/70`}>
                            Example: "Product Launch happens in 10 days"
                          </div>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-3 ${cardStyle.border} border rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                        formData.text_format === 'custom' ? `${cardStyle.border} border-2` : ''
                      }`}>
                        <input
                          type="radio"
                          name="text_format_edit"
                          value="custom"
                          checked={formData.text_format === 'custom'}
                          onChange={(e) => setFormData({ ...formData, text_format: e.target.value as 'days_until' | 'happens_in' | 'custom' })}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className={`font-semibold ${cardStyle.text} mb-1`}>
                            Custom (Free text with variables)
                          </div>
                          <div className={`text-sm ${cardStyle.text}/70 mb-2`}>
                            Use {"{days}"} for days remaining and {"{event}"} for event name
                          </div>
                          {formData.text_format === 'custom' && (
                            <Input
                              value={formData.custom_format}
                              onChange={(e) => setFormData({ ...formData, custom_format: e.target.value })}
                              className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-2`}
                              placeholder='e.g., "Only {days} more days until {event}!"'
                            />
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="working-days-only-edit"
                      checked={formData.working_days_only}
                      onChange={(e) => setFormData({ ...formData, working_days_only: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="working-days-only-edit" className={cardStyle.text}>
                      Count working days only (exclude weekends)
                    </Label>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={cardStyle.text}>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>End Date (optional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active-edit"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="active-edit" className={cardStyle.text}>Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className={getRoundedClass('rounded-lg')}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={(formData.mode === 'text' && !formData.headline) || (formData.mode === 'countdown' && (!formData.event_name || !formData.target_date || (formData.text_format === 'custom' && !formData.custom_format)))}
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

