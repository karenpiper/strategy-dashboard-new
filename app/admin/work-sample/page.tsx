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
import { Plus, Check } from 'lucide-react'

interface WorkSampleType {
  id: string
  name: string
}

interface User {
  id: string
  email: string
  full_name: string | null
}

export default function WorkSampleSubmit() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [types, setTypes] = useState<WorkSampleType[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')

  // Form state - default date to today
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0] // Format as YYYY-MM-DD
  }

  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    type_id: '',
    client: '',
    author_id: user?.id || '',
    date: getTodayDate(),
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

  const cardStyle = getCardStyle()

  // Fetch types and users
  useEffect(() => {
    fetchTypes()
    fetchUsers()
  }, [])

  const fetchTypes = async () => {
    try {
      const response = await fetch('/api/work-sample-types')
      const result = await response.json()
      if (response.ok) {
        setTypes(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching types:', error)
    }
  }

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

  const handleAddType = async () => {
    if (!newTypeName.trim()) return

    try {
      setLoading(true)
      const response = await fetch('/api/work-sample-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName.trim() }),
      })

      const result = await response.json()
      
      if (response.ok) {
        // Refresh types list
        await fetchTypes()
        // Set the new type as selected
        setFormData({ ...formData, type_id: result.data.id })
        setNewTypeName('')
        setShowAddTypeDialog(false)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error adding type:', error)
      alert('Failed to add type')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.project_name || !formData.description) {
      alert('Project name and description are required')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/work-samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type_id: formData.type_id || null,
          client: formData.client || null,
          author_id: formData.author_id || user?.id,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        // Reset form
        setFormData({
          project_name: '',
          description: '',
          type_id: '',
          client: '',
          author_id: user?.id || '',
          date: getTodayDate(),
        })
        alert('Work sample created successfully!')
      } else {
        const errorMsg = result.details 
          ? `${result.error}\n\nDetails: ${result.details}`
          : result.error || 'Failed to create work sample'
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Error creating work sample:', error)
      alert(`Failed to create work sample: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Get user display name
  const getUserDisplayName = (userId: string) => {
    const userProfile = users.find(u => u.id === userId)
    if (!userProfile) return 'Unknown'
    return userProfile.full_name || userProfile.email || 'Unknown'
  }

  return (
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()} p-8 ${mode === 'code' ? 'font-mono' : ''}`}>
      <div className="max-w-2xl mx-auto">
        <h1 className={`text-3xl font-black uppercase tracking-wider ${getTextClass()} mb-8 ${mode === 'code' ? 'font-mono' : ''}`}>
          Submit Work Sample
        </h1>

        <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
          <div className="space-y-6">
            {/* Project Name */}
            <div>
              <Label className={cardStyle.text}>Project Name</Label>
              <Input
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                placeholder="Enter project name"
              />
            </div>

            {/* Description */}
            <div>
              <Label className={cardStyle.text}>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                placeholder="Describe the work..."
                rows={4}
              />
            </div>

            {/* Type */}
            <div>
              <Label className={cardStyle.text}>Type (Optional)</Label>
              <div className="flex gap-2 mt-1">
                <select
                  value={formData.type_id}
                  onChange={(e) => setFormData({ ...formData, type_id: e.target.value })}
                  className={`flex-1 ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                >
                  <option value="">No Type</option>
                  {types.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={`${cardStyle.border} border ${cardStyle.text}`}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className={`${cardStyle.bg} ${cardStyle.border} border`}>
                    <DialogHeader>
                      <DialogTitle className={cardStyle.text}>Add New Type</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label className={cardStyle.text}>Type Name</Label>
                        <Input
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                          placeholder="Enter type name"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddType()
                            }
                          }}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => setShowAddTypeDialog(false)}
                          variant="outline"
                          className={`${cardStyle.border} border ${cardStyle.text}`}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddType}
                          disabled={!newTypeName.trim() || loading}
                          className={`${getRoundedClass('rounded-lg')} ${
                            mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                            mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                            'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                          } font-black uppercase tracking-wider`}
                        >
                          {loading ? 'Adding...' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                Categorize your work sample (optional)
              </p>
            </div>

            {/* Client */}
            <div>
              <Label className={cardStyle.text}>Client (Optional)</Label>
              <Input
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
                placeholder="Enter client name..."
              />
              <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                Name of the client or company this work was for
              </p>
            </div>

            {/* Author */}
            <div>
              <Label className={cardStyle.text}>Author</Label>
              <select
                value={formData.author_id}
                onChange={(e) => setFormData({ ...formData, author_id: e.target.value })}
                className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')} mt-1`}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} {u.full_name ? `(${u.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <Label className={cardStyle.text}>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} mt-1`}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!formData.project_name || !formData.description || submitting}
              className={`w-full ${getRoundedClass('rounded-lg')} ${
                mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
              } font-black uppercase tracking-wider ${mode === 'code' ? 'font-mono' : ''}`}
            >
              {submitting ? 'Creating...' : 'Create Work Sample'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

