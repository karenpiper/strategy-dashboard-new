'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useMode } from '@/contexts/mode-context'
import { Plus, TrendingUp, Check, X, Edit, Trash2 } from 'lucide-react'

interface PipelineProject {
  id: string
  name: string
  type: string | null
  description: string | null
  due_date: string | null
  lead: string | null
  notes: string | null
  status: string
  team: string | null
  url: string | null
  tier: number | null
  revenue: number | null
  created_at: string
  updated_at: string
}

type KanbanColumn = 'In Progress' | 'Pending Decision' | 'Long Lead'

// Currency formatting helpers
const formatCurrency = (value: string | number | null | undefined): string => {
  if (!value && value !== 0) return ''
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value
  if (isNaN(num)) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

const parseCurrency = (value: string): string => {
  // Remove currency symbols and commas, keep only numbers and decimal point
  return value.replace(/[^0-9.-]/g, '')
}

export default function PipelinePage() {
  const { mode } = useMode()
  const [projects, setProjects] = useState<PipelineProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggedProject, setDraggedProject] = useState<PipelineProject | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<PipelineProject | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    due_date: '',
    lead: '',
    notes: '',
    status: 'In Progress' as KanbanColumn,
    team: '',
    url: '',
    tier: '',
    revenue: '',
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pipeline')
      if (!response.ok) {
        throw new Error('Failed to fetch pipeline projects')
      }
      const result = await response.json()
      setProjects(result.data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching projects:', err)
      setError(err.message || 'Failed to load pipeline projects')
    } finally {
      setLoading(false)
    }
  }

  const updateProjectStatus = async (projectId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/pipeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update project status')
      }

      // Update local state
      setProjects(prev => 
        prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p)
      )
    } catch (err: any) {
      console.error('Error updating project status:', err)
      alert('Failed to update project status')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      due_date: '',
      lead: '',
      notes: '',
      status: 'In Progress',
      team: '',
      url: '',
      tier: '',
      revenue: '',
    })
    setEditingProject(null)
  }

  const openEditDialog = (project: PipelineProject) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      type: project.type || '',
      description: project.description || '',
      due_date: project.due_date ? new Date(project.due_date).toISOString().split('T')[0] : '',
      lead: project.lead || '',
      notes: project.notes || '',
      status: project.status as KanbanColumn,
      team: project.team || '',
      url: project.url || '',
      tier: project.tier?.toString() || '',
      revenue: project.revenue ? formatCurrency(project.revenue) : '',
    })
    setIsEditDialogOpen(true)
  }

  const createProject = async () => {
    try {
      if (!formData.name.trim()) {
        alert('Project name is required')
        return
      }

      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tier: formData.tier ? parseInt(formData.tier) : null,
          revenue: formData.revenue ? parseFloat(parseCurrency(formData.revenue)) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      const result = await response.json()
      setProjects(prev => [...prev, result.data])
      setIsAddDialogOpen(false)
      resetForm()
    } catch (err: any) {
      console.error('Error creating project:', err)
      alert('Failed to create project')
    }
  }

  const updateProject = async () => {
    try {
      if (!editingProject) return
      if (!formData.name.trim()) {
        alert('Project name is required')
        return
      }

      const response = await fetch('/api/pipeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProject.id,
          name: formData.name,
          type: formData.type || null,
          description: formData.description || null,
          due_date: formData.due_date || null,
          lead: formData.lead || null,
          notes: formData.notes || null,
          status: formData.status,
          team: formData.team || null,
          url: formData.url || null,
          tier: formData.tier ? parseInt(formData.tier) : null,
          revenue: formData.revenue ? parseFloat(parseCurrency(formData.revenue)) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      const result = await response.json()
      setProjects(prev => 
        prev.map(p => p.id === editingProject.id ? result.data : p)
      )
      setIsEditDialogOpen(false)
      resetForm()
    } catch (err: any) {
      console.error('Error updating project:', err)
      alert('Failed to update project')
    }
  }

  const deleteProject = async () => {
    if (!editingProject) return

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete "${editingProject.name}"? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      const response = await fetch(`/api/pipeline?id=${editingProject.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      // Remove project from list
      setProjects(prev => prev.filter(p => p.id !== editingProject.id))
      setIsEditDialogOpen(false)
      resetForm()
    } catch (err: any) {
      console.error('Error deleting project:', err)
      alert('Failed to delete project')
    }
  }

  const handleDragStart = (e: React.DragEvent, project: PipelineProject) => {
    setDraggedProject(project)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: KanbanColumn) => {
    e.preventDefault()
    if (!draggedProject) return

    if (draggedProject.status !== targetStatus) {
      await updateProjectStatus(draggedProject.id, targetStatus)
    }
    setDraggedProject(null)
  }

  const handleWonLost = async (projectId: string, status: 'Won' | 'Lost') => {
    await updateProjectStatus(projectId, status)
  }

  const getBorderColor = () => {
    switch (mode) {
      case 'chaos':
        return '#C4F500'
      case 'chill':
        return '#FFC043'
      case 'code':
        return '#FFFFFF'
      default:
        return '#00FF87'
    }
  }

  const getTextClass = () => {
    switch (mode) {
      case 'chaos':
        return 'text-[#C4F500]'
      case 'chill':
        return 'text-[#FFC043]'
      case 'code':
        return 'text-[#FFFFFF] font-mono'
      default:
        return 'text-white'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
  }

  const columns: KanbanColumn[] = ['In Progress', 'Pending Decision', 'Long Lead']
  const borderColor = getBorderColor()

  const getProjectsByStatus = (status: string) => {
    return projects
      .filter(p => p.status === status)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const getTotalRevenue = (projectList: PipelineProject[]) => {
    return projectList.reduce((sum, project) => {
      return sum + (project.revenue || 0)
    }, 0)
  }

  const wonProjects = getProjectsByStatus('Won')
  const lostProjects = getProjectsByStatus('Lost')

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className={`text-center ${getTextClass()}`}>Loading pipeline...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className={`text-center text-destructive ${getTextClass()}`}>
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-6" style={{ color: borderColor }} />
        <h1 className={`text-3xl font-bold ${getTextClass()}`}>
            NEW BUSINESS PIPELINE
        </h1>
      </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              style={{
                backgroundColor: borderColor,
                color: '#000',
              }}
              className="font-black uppercase"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent
            style={{
              backgroundColor: '#1a1a1a',
              borderColor: borderColor,
              borderWidth: '2px',
            }}
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle className={getTextClass()}>Add New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className={getTextClass()}>Project Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                  placeholder="Enter project name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={getTextClass()}>Type</Label>
                  <Input
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="mt-1 bg-white/10 border-white/20 text-white"
                    placeholder="e.g., Platform Work"
                  />
                </div>
                <div>
                  <Label className={getTextClass()}>Status</Label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as KanbanColumn })}
                    className="mt-1 w-full h-9 rounded-md border border-white/20 bg-white/10 text-white px-3"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Pending Decision">Pending Decision</option>
                    <option value="Long Lead">Long Lead</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className={getTextClass()}>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                  placeholder="Project description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={getTextClass()}>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1 bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className={getTextClass()}>Tier (0-3)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="3"
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="mt-1 bg-white/10 border-white/20 text-white"
                    placeholder="0-3"
                  />
                </div>
              </div>
              <div>
                <Label className={getTextClass()}>Revenue</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 z-10">$</span>
                  <Input
                    type="text"
                    value={formData.revenue}
                    onChange={(e) => {
                      // Allow typing, just store the raw value
                      const value = e.target.value
                      const parsed = parseCurrency(value)
                      // Only update if it's empty or a valid number
                      if (parsed === '' || (!isNaN(parseFloat(parsed)) && parsed !== '-')) {
                        setFormData({ ...formData, revenue: value })
                      }
                    }}
                    onBlur={(e) => {
                      // Format on blur
                      const parsed = parseCurrency(e.target.value)
                      if (parsed && !isNaN(parseFloat(parsed))) {
                        setFormData({ ...formData, revenue: formatCurrency(parsed) })
                      } else if (parsed === '') {
                        setFormData({ ...formData, revenue: '' })
                      }
                    }}
                    className="mt-1 bg-white/10 border-white/20 text-white pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <Label className={getTextClass()}>Lead</Label>
                <Input
                  value={formData.lead}
                  onChange={(e) => setFormData({ ...formData, lead: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                  placeholder="Lead name"
                />
              </div>
              <div>
                <Label className={getTextClass()}>Team</Label>
                <Input
                  value={formData.team}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                  placeholder="Comma-separated team members"
                />
              </div>
              <div>
                <Label className={getTextClass()}>URL</Label>
                <Input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label className={getTextClass()}>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  style={{ borderColor: borderColor, color: borderColor }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createProject}
                  style={{ backgroundColor: borderColor, color: '#000' }}
                >
                  Create Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {columns.map((columnStatus) => {
          const columnProjects = getProjectsByStatus(columnStatus)
          
          return (
            <Card
              key={columnStatus}
              className="flex flex-col h-[calc(100vh-12rem)]"
              style={{
                backgroundColor: '#ffffff',
                borderColor: borderColor,
                borderWidth: '2px',
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, columnStatus)}
            >
              {/* Column Header */}
              <div className="p-4 border-b" style={{ borderColor: `${borderColor}40` }}>
                <h2 className="text-lg font-semibold text-black">
                  {columnStatus}
                </h2>
                <p className="text-sm text-black opacity-60">
                  {columnProjects.length} {columnProjects.length === 1 ? 'project' : 'projects'}
                </p>
                <p className="text-sm font-semibold text-black mt-1">
                  {formatCurrency(getTotalRevenue(columnProjects))}
                </p>
              </div>

              {/* Column Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {columnProjects.map((project) => {
                  const date = formatDate(project.due_date)
                  const displayText = project.type || 'Unknown'
                  
                  return (
                    <Card
                      key={project.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, project)}
                      onClick={() => openEditDialog(project)}
                      className="p-3 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: '#E8F5E9',
                        borderColor: `${borderColor}40`,
                        borderWidth: '1px',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {date && (
                            <div className="text-xs text-black opacity-60 mb-1">
                              {date}
                            </div>
                          )}
                          <div className="font-semibold text-black mb-1">
                            {project.name}
                          </div>
                          {displayText && (
                            <div className="text-xs text-black opacity-60 mb-1">
                              {displayText}
                            </div>
                          )}
                          {project.description && (
                            <div className="text-xs text-black opacity-70 mt-1 line-clamp-2">
                              {project.description}
                            </div>
                          )}
                          {project.lead && (
                            <div className="text-xs text-black opacity-50 mt-1">
                              Lead: {project.lead}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => handleWonLost(project.id, 'Won')}
                            className="w-5 h-5 rounded-full bg-green-500/20 hover:bg-green-500/40 flex items-center justify-center transition-colors"
                            title="Mark as Won"
                          >
                            <Check className="w-3 h-3 text-green-500" />
                          </button>
                          <button
                            onClick={() => handleWonLost(project.id, 'Lost')}
                            className="w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                            title="Mark as Lost"
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
                {columnProjects.length === 0 && (
                  <div className="text-center py-8 text-black opacity-40 text-sm">
                    Drop projects here
                  </div>
                )}
              </div>
            </Card>
          )
        })}

        {/* 4th Column - Won/Lost Split */}
        <Card
          className="flex flex-col h-[calc(100vh-12rem)]"
          style={{
            backgroundColor: '#ffffff',
            borderColor: borderColor,
            borderWidth: '2px',
          }}
        >
          {/* Won Section - Top Half */}
          <div 
            className="flex flex-col flex-1 min-h-0 border-b" 
            style={{ borderColor: `${borderColor}40` }}
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault()
              if (draggedProject && draggedProject.status !== 'Won') {
                updateProjectStatus(draggedProject.id, 'Won')
              }
              setDraggedProject(null)
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: `${borderColor}40` }}>
              <h2 className="text-lg font-semibold text-black">
                Won
              </h2>
              <p className="text-sm text-black opacity-60">
                {wonProjects.length} {wonProjects.length === 1 ? 'project' : 'projects'}
              </p>
              <p className="text-sm font-semibold text-black mt-1">
                {formatCurrency(getTotalRevenue(wonProjects))}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {wonProjects.map((project) => {
                const date = formatDate(project.due_date)
                const displayText = project.type || 'Unknown'
                
                return (
                  <Card
                    key={project.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project)}
                    onClick={() => openEditDialog(project)}
                    className="p-3 cursor-pointer hover:opacity-80 transition-opacity bg-gray-50"
                    style={{
                      borderColor: `${borderColor}40`,
                      borderWidth: '1px',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      {date && (
                        <div className="text-xs text-black opacity-60 mb-1">
                          {date}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold text-black">
                          {project.name}
                        </div>
                        <div className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 shadow-sm">
                          won!
                        </div>
                      </div>
                      {displayText && (
                        <div className="text-xs text-black opacity-60 mb-1">
                          {displayText}
                        </div>
                      )}
                      {project.description && (
                        <div className="text-xs text-black opacity-70 mt-1 line-clamp-2">
                          {project.description}
                        </div>
                      )}
                      {project.lead && (
                        <div className="text-xs text-black opacity-50 mt-1">
                          Lead: {project.lead}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
              {wonProjects.length === 0 && (
                <div className="text-center py-4 text-black opacity-40 text-sm">
                  No won projects
                </div>
              )}
            </div>
          </div>

          {/* Lost Section - Bottom Half */}
          <div 
            className="flex flex-col flex-1 min-h-0"
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault()
              if (draggedProject && draggedProject.status !== 'Lost') {
                updateProjectStatus(draggedProject.id, 'Lost')
              }
              setDraggedProject(null)
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: `${borderColor}40` }}>
              <h2 className="text-lg font-semibold text-black">
                Lost
              </h2>
              <p className="text-sm text-black opacity-60">
                {lostProjects.length} {lostProjects.length === 1 ? 'project' : 'projects'}
              </p>
              <p className="text-sm font-semibold text-black mt-1">
                {formatCurrency(getTotalRevenue(lostProjects))}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {lostProjects.map((project) => {
                const date = formatDate(project.due_date)
                const displayText = project.type || 'Unknown'
                
                return (
                  <Card
                    key={project.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project)}
                    onClick={() => openEditDialog(project)}
                    className="p-3 cursor-pointer hover:opacity-80 transition-opacity bg-gray-50"
                    style={{
                      borderColor: `${borderColor}40`,
                      borderWidth: '1px',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      {date && (
                        <div className="text-xs text-black opacity-60 mb-1">
                          {date}
                        </div>
                      )}
                      <div className="font-semibold text-black mb-1">
                        {project.name}
                      </div>
                      {displayText && (
                        <div className="text-xs text-black opacity-60 mb-1">
                          {displayText}
                        </div>
                      )}
                      {project.description && (
                        <div className="text-xs text-black opacity-70 mt-1 line-clamp-2">
                          {project.description}
                        </div>
                      )}
                      {project.lead && (
                        <div className="text-xs text-black opacity-50 mt-1">
                          Lead: {project.lead}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
              {lostProjects.length === 0 && (
                <div className="text-center py-4 text-black opacity-40 text-sm">
                  No lost projects
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          style={{
            backgroundColor: '#1a1a1a',
            borderColor: borderColor,
            borderWidth: '2px',
          }}
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className={getTextClass()}>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className={getTextClass()}>Project Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 bg-white/10 border-white/20 text-white"
                placeholder="Enter project name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={getTextClass()}>Type</Label>
                <Input
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                  placeholder="e.g., Platform Work"
                />
              </div>
              <div>
                <Label className={getTextClass()}>Status</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as KanbanColumn })}
                  className="mt-1 w-full h-9 rounded-md border border-white/20 bg-white/10 text-white px-3"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Pending Decision">Pending Decision</option>
                  <option value="Long Lead">Long Lead</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
            </div>
            <div>
              <Label className={getTextClass()}>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 bg-white/10 border-white/20 text-white"
                placeholder="Project description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={getTextClass()}>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className={getTextClass()}>Tier (0-3)</Label>
                <Input
                  type="number"
                  min="0"
                  max="3"
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                  placeholder="0-3"
                />
              </div>
            </div>
            <div>
              <Label className={getTextClass()}>Revenue</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 z-10">$</span>
                <Input
                  type="text"
                  value={formData.revenue}
                  onChange={(e) => {
                    // Allow typing, just store the raw value
                    const value = e.target.value
                    const parsed = parseCurrency(value)
                    // Only update if it's empty or a valid number
                    if (parsed === '' || (!isNaN(parseFloat(parsed)) && parsed !== '-')) {
                      setFormData({ ...formData, revenue: value })
                    }
                  }}
                  onBlur={(e) => {
                    // Format on blur
                    const parsed = parseCurrency(e.target.value)
                    if (parsed && !isNaN(parseFloat(parsed))) {
                      setFormData({ ...formData, revenue: formatCurrency(parsed) })
                    } else if (parsed === '') {
                      setFormData({ ...formData, revenue: '' })
                    }
                  }}
                  className="mt-1 bg-white/10 border-white/20 text-white pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label className={getTextClass()}>Lead</Label>
              <Input
                value={formData.lead}
                onChange={(e) => setFormData({ ...formData, lead: e.target.value })}
                className="mt-1 bg-white/10 border-white/20 text-white"
                placeholder="Lead name"
              />
            </div>
            <div>
              <Label className={getTextClass()}>Team</Label>
              <Input
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                className="mt-1 bg-white/10 border-white/20 text-white"
                placeholder="Comma-separated team members"
              />
            </div>
            <div>
              <Label className={getTextClass()}>URL</Label>
              <Input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="mt-1 bg-white/10 border-white/20 text-white"
                placeholder="https://..."
              />
            </div>
            <div>
              <Label className={getTextClass()}>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 bg-white/10 border-white/20 text-white"
                placeholder="Additional notes"
                rows={3}
              />
            </div>
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={deleteProject}
                style={{ borderColor: '#ef4444', color: '#ef4444' }}
                className="hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    resetForm()
                  }}
                  style={{ borderColor: borderColor, color: borderColor }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateProject}
                  style={{ backgroundColor: borderColor, color: '#000' }}
                >
                  Update Project
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
