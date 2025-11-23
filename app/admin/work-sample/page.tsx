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
  ExternalLink,
  Image as ImageIcon,
  File,
  Upload
} from 'lucide-react'

interface WorkSampleType {
  id: string
  name: string
}

interface User {
  id: string
  email: string
  full_name: string | null
}

interface WorkSample {
  id: string
  project_name: string
  description: string
  type_id: string | null
  client: string | null
  author_id: string
  date: string
  created_by: string
  created_at: string
  updated_at: string
  thumbnail_url: string | null
  file_url: string | null
  file_link: string | null
  file_name: string | null
  type?: WorkSampleType | null
  author?: User | null
  created_by_profile?: User | null
}

export default function WorkSampleAdmin() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [workSamples, setWorkSamples] = useState<WorkSample[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTypeId, setFilterTypeId] = useState<string | null>(null)
  const [filterAuthorId, setFilterAuthorId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<WorkSample | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [types, setTypes] = useState<WorkSampleType[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const supabase = createClient()

  // Form state - default date to today
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    type_id: '',
    client: '',
    author_id: user?.id || '',
    date: getTodayDate(),
    thumbnail_url: '',
    file_url: '',
    file_link: '',
    file_name: '',
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

  // Fetch work samples
  const fetchWorkSamples = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterTypeId) params.append('type_id', filterTypeId)
      if (filterAuthorId) params.append('author_id', filterAuthorId)
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)

      const response = await fetch(`/api/work-samples?${params.toString()}`)
      const result = await response.json()
      
      if (response.ok) {
        setWorkSamples(result.data || [])
      } else {
        console.error('Error fetching work samples:', result)
        console.error('Full error details:', result.details, result.code, result.hint)
        alert(`Error fetching work samples: ${result.error || 'Unknown error'}\n${result.details || ''}`)
      }
    } catch (error) {
      console.error('Error fetching work samples:', error)
    } finally {
      setLoading(false)
    }
  }

  // Extract unique types and authors from work samples
  useEffect(() => {
    // Extract unique types that have work samples
    const uniqueTypes = new Map<string, WorkSampleType>()
    workSamples.forEach(sample => {
      if (sample.type && sample.type_id) {
        uniqueTypes.set(sample.type_id, sample.type)
      }
    })
    setTypes(Array.from(uniqueTypes.values()).sort((a, b) => a.name.localeCompare(b.name)))

    // Extract unique authors that have work samples
    const uniqueAuthors = new Map<string, User>()
    workSamples.forEach(sample => {
      if (sample.author && sample.author_id) {
        uniqueAuthors.set(sample.author_id, sample.author)
      }
    })
    setUsers(Array.from(uniqueAuthors.values()).sort((a, b) => {
      const nameA = a.full_name || a.email || ''
      const nameB = b.full_name || b.email || ''
      return nameA.localeCompare(nameB)
    }))
  }, [workSamples])

  // Fetch all types for the add/edit dialogs (where we need all types, not just ones with samples)
  const [allTypes, setAllTypes] = useState<WorkSampleType[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])

  useEffect(() => {
    fetchAllTypes()
    fetchAllUsers()
    fetchWorkSamples()
  }, [])

  const fetchAllTypes = async () => {
    try {
      const response = await fetch('/api/work-sample-types')
      const result = await response.json()
      if (response.ok) {
        setAllTypes(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching types:', error)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name', { ascending: true })

      if (!error && data) {
        setAllUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkSamples()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, filterTypeId, filterAuthorId, sortBy, sortOrder])

  // Handle thumbnail upload
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingThumbnail(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Supabase storage
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

      setFormData({ ...formData, thumbnail_url: publicUrl })
    } catch (err: any) {
      console.error('Error uploading thumbnail:', err)
      alert(err.message || 'Failed to upload thumbnail')
    } finally {
      setUploadingThumbnail(false)
    }
  }

  // Handle file upload to Google Drive (chunked upload)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = [
      'application/pdf',
      'application/zip',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.apple.keynote',
    ]

    const allowedExtensions = ['.pdf', '.zip', '.ppt', '.pptx', '.doc', '.docx', '.key']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      alert('Invalid file type. Allowed types: PDF, Keynote, ZIP, PPT, DOC')
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('File size exceeds 100MB limit')
      return
    }

    setUploadingFile(true)
    setSelectedFile(file)

    try {
      // Step 1: Create upload session (creates empty file and gets upload URL)
      const sessionResponse = await fetch('/api/work-samples/create-upload-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
        }),
      })

      const sessionResult = await sessionResponse.json()

      if (!sessionResponse.ok) {
        throw new Error(sessionResult.error || 'Failed to create upload session')
      }

      const { fileId, uploadUrl } = sessionResult

      if (!fileId || !uploadUrl) {
        throw new Error('Failed to get file ID and upload URL from session')
      }

      // Step 2: Upload file in chunks to Google Drive via our server
      const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB chunks (safe for Vercel's 4.5MB limit)
      const fileSize = file.size
      let uploadedBytes = 0

      // Upload file in chunks
      while (uploadedBytes < fileSize) {
        const chunkEnd = Math.min(uploadedBytes + CHUNK_SIZE - 1, fileSize - 1)
        const chunk = file.slice(uploadedBytes, chunkEnd + 1)
        
        // Update progress
        const progress = Math.round((uploadedBytes / fileSize) * 100)
        setUploadProgress(`Uploading... ${progress}%`)

        const uploadFormData = new FormData()
        uploadFormData.append('uploadUrl', uploadUrl)
        uploadFormData.append('fileId', fileId)
        uploadFormData.append('chunk', chunk)
        uploadFormData.append('startByte', uploadedBytes.toString())
        uploadFormData.append('endByte', chunkEnd.toString())
        uploadFormData.append('fileSize', fileSize.toString())
        uploadFormData.append('mimeType', file.type || 'application/octet-stream')

        const uploadResponse = await fetch('/api/work-samples/upload-chunk', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadResult = await uploadResponse.json()

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || 'Failed to upload chunk to Google Drive')
        }

        // Check if upload is complete
        if (uploadResult.complete && uploadResult.fileId) {
          // Upload complete - update form data
          setUploadProgress('Upload complete!')
          
          // If it's a PDF and no thumbnail has been set, generate one automatically
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
          if (isPdf && !formData.thumbnail_url && user) {
            try {
              setUploadProgress('Generating thumbnail from PDF...')
              const thumbnailResponse = await fetch('/api/work-samples/generate-pdf-thumbnail', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  fileId: uploadResult.fileId,
                  userId: user.id,
                }),
              })

              if (thumbnailResponse.ok) {
                const thumbnailResult = await thumbnailResponse.json()
                // Set thumbnail preview and URL
                setThumbnailPreview(thumbnailResult.thumbnailUrl)
                setFormData(prev => ({
                  ...prev,
                  file_url: uploadResult.fileUrl || `https://drive.google.com/file/d/${uploadResult.fileId}/view`,
                  file_name: file.name,
                  thumbnail_url: thumbnailResult.thumbnailUrl,
                }))
              } else {
                // If thumbnail generation fails, just set the file info
                console.warn('Failed to generate PDF thumbnail, continuing without it')
                setFormData(prev => ({
                  ...prev,
                  file_url: uploadResult.fileUrl || `https://drive.google.com/file/d/${uploadResult.fileId}/view`,
                  file_name: file.name,
                }))
              }
            } catch (thumbnailError: any) {
              // If thumbnail generation fails, just set the file info
              console.warn('Error generating PDF thumbnail:', thumbnailError)
              setFormData(prev => ({
                ...prev,
                file_url: uploadResult.fileUrl || `https://drive.google.com/file/d/${uploadResult.fileId}/view`,
                file_name: file.name,
              }))
            }
          } else {
            // Not a PDF or thumbnail already set, just update file info
            setFormData(prev => ({
              ...prev,
              file_url: uploadResult.fileUrl || `https://drive.google.com/file/d/${uploadResult.fileId}/view`,
              file_name: file.name,
            }))
          }
          break
        }

        // Update uploaded bytes based on response
        if (uploadResult.range) {
          // Parse range header (e.g., "bytes=0-2097151")
          const match = uploadResult.range.match(/bytes=0-(\d+)/)
          if (match) {
            uploadedBytes = parseInt(match[1], 10) + 1
          } else {
            uploadedBytes = chunkEnd + 1
          }
        } else {
          uploadedBytes = chunkEnd + 1
        }
      }
    } catch (err: any) {
      console.error('Error uploading file:', err)
      setUploadProgress('')
      alert(err.message || 'Failed to upload file')
      setSelectedFile(null)
    } finally {
      setUploadingFile(false)
      setUploadProgress('')
    }
  }

  const handleAddType = async () => {
    if (!newTypeName.trim()) return

    try {
      const response = await fetch('/api/work-sample-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName.trim() }),
      })

      const result = await response.json()
      
      if (response.ok) {
        await fetchAllTypes()
        setFormData({ ...formData, type_id: result.data.id })
        setNewTypeName('')
        setShowAddTypeDialog(false)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error adding type:', error)
      alert('Failed to add type')
    }
  }

  // Handle add
  const handleAdd = async () => {
    if (!formData.project_name || !formData.description) {
      alert('Project name and description are required')
      return
    }

    if (!formData.file_url && !formData.file_link) {
      alert('Either a file upload or file link is required')
      return
    }

    // If no thumbnail was uploaded and we have a PDF file, try to generate one
    if (!formData.thumbnail_url && formData.file_url && formData.file_name && user) {
      const isPdf = formData.file_name.toLowerCase().endsWith('.pdf')
      if (isPdf) {
        try {
          // Extract file ID from Google Drive URL
          const fileIdMatch = formData.file_url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
          if (fileIdMatch && fileIdMatch[1]) {
            const fileId = fileIdMatch[1]
            const thumbnailResponse = await fetch('/api/work-samples/generate-pdf-thumbnail', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileId: fileId,
                userId: user.id,
              }),
            })

            if (thumbnailResponse.ok) {
              const thumbnailResult = await thumbnailResponse.json()
              formData.thumbnail_url = thumbnailResult.thumbnailUrl
            }
          }
        } catch (thumbnailError: any) {
          console.warn('Failed to generate thumbnail, continuing without it:', thumbnailError)
        }
      }
    }

    try {
      const response = await fetch('/api/work-samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type_id: formData.type_id || null,
          client: formData.client || null,
          author_id: formData.author_id || user?.id,
          // created_by is automatically set to logged-in user by API
          thumbnail_url: formData.thumbnail_url || null,
          file_url: formData.file_url || null,
          file_link: formData.file_link || null,
          file_name: formData.file_name || null,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsAddDialogOpen(false)
        resetForm()
        fetchWorkSamples()
      } else {
        const errorMsg = result.details 
          ? `${result.error}\n\nDetails: ${result.details}`
          : result.error || 'Failed to add work sample'
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Error adding work sample:', error)
      alert(`Failed to add work sample: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle edit
  const handleEdit = (item: WorkSample) => {
    setEditingItem(item)
    setFormData({
      project_name: item.project_name,
      description: item.description,
      type_id: item.type_id || '',
      client: item.client || '',
      author_id: item.author_id,
      date: item.date,
      thumbnail_url: item.thumbnail_url || '',
      file_url: item.file_url || '',
      file_link: item.file_link || '',
      file_name: item.file_name || '',
    })
    setThumbnailPreview(item.thumbnail_url)
    setSelectedFile(null)
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingItem) return
    if (!formData.project_name || !formData.description) {
      alert('Project name and description are required')
      return
    }

    try {
      const updatePayload: any = {
        id: editingItem.id,
        project_name: formData.project_name,
        description: formData.description,
        type_id: formData.type_id || null,
        client: formData.client || null,
        author_id: formData.author_id,
        date: formData.date,
        thumbnail_url: formData.thumbnail_url || null,
        file_url: formData.file_url || null,
        file_link: formData.file_link || null,
        file_name: formData.file_name || null,
        // created_by is not updated - keeps original creator
      }

      const response = await fetch('/api/work-samples', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      const result = await response.json()
      
      if (response.ok) {
        setIsEditDialogOpen(false)
        setEditingItem(null)
        resetForm()
        fetchWorkSamples()
      } else {
        const errorMsg = result.details 
          ? `${result.error}\n\nDetails: ${result.details}${result.code ? `\nCode: ${result.code}` : ''}`
          : result.error || 'Failed to update work sample'
        console.error('Error updating work sample:', result)
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Error updating work sample:', error)
      alert(`Failed to update work sample: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work sample?')) return

    try {
      const response = await fetch(`/api/work-samples?id=${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchWorkSamples()
        setSelectedIds(new Set())
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting work sample:', error)
      alert('Failed to delete work sample')
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} work sample(s)?`)) return

    try {
      const ids = Array.from(selectedIds).join(',')
      const response = await fetch(`/api/work-samples?ids=${ids}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        fetchWorkSamples()
        setSelectedIds(new Set())
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting work samples:', error)
      alert('Failed to delete work samples')
    }
  }

  const resetForm = () => {
    setFormData({
      project_name: '',
      description: '',
      type_id: '',
      client: '',
      author_id: user?.id || '',
      date: getTodayDate(),
      thumbnail_url: '',
      file_url: '',
      file_link: '',
      file_name: '',
    })
    setThumbnailPreview(null)
    setSelectedFile(null)
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
    if (selectedIds.size === filteredWorkSamples.length && filteredWorkSamples.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredWorkSamples.map(item => item.id)))
    }
  }

  const filteredWorkSamples = workSamples

  return (
    <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Work Samples</h1>
          <p className={`${getTextClass()}/70 text-sm font-normal`}>Manage work samples and portfolios</p>
        </div>

        {/* Actions Bar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (open) {
              resetForm()
              if (user?.id) {
                setFormData(prev => ({ ...prev, author_id: user.id }))
              }
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
                <DialogTitle className={cardStyle.text}>Add New Work Sample</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <Label className={cardStyle.text}>Project Name *</Label>
                    <Input
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Description *</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="Describe the work..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Type (optional)</Label>
                    <div className="flex gap-2">
                      <select
                        value={formData.type_id}
                        onChange={(e) => setFormData({ ...formData, type_id: e.target.value })}
                        className={`flex-1 ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                      >
                        <option value="">No Type</option>
                        {allTypes.map(type => (
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
                                disabled={!newTypeName.trim()}
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
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Client (optional)</Label>
                    <Input
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="Enter client name..."
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
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <Label className={cardStyle.text}>Author</Label>
                    <select
                      value={formData.author_id}
                      onChange={(e) => setFormData({ ...formData, author_id: e.target.value })}
                      className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                    >
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className={cardStyle.text}>File Upload <span className="text-red-500">*</span></Label>
                    <p className={`text-xs ${cardStyle.text}/70 mb-1`}>PDF, Keynote, ZIP, PPT, DOC (max 100MB)</p>
                    <Input
                      type="file"
                      accept=".pdf,.zip,.ppt,.pptx,.doc,.docx,.key"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      required
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    />
                    {selectedFile && (
                      <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    {formData.file_name && !selectedFile && (
                      <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                        Current file: {formData.file_name}
                      </p>
                    )}
                    {uploadingFile && (
                      <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                        {uploadProgress || 'Uploading to Google Drive...'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Thumbnail (optional)</Label>
                    <p className={`text-xs ${cardStyle.text}/70 mb-1`}>Auto-generated for PDFs if not provided</p>
                    <div>
                      {thumbnailPreview && (
                        <div className="mb-2">
                          <img 
                            src={thumbnailPreview} 
                            alt="Thumbnail preview" 
                            className="w-32 h-32 object-cover rounded"
                          />
                        </div>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        disabled={uploadingThumbnail}
                        className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      />
                      {uploadingThumbnail && <p className={`text-xs ${cardStyle.text}/70 mt-1`}>Uploading...</p>}
                    </div>
                  </div>
                  <div>
                    <Label className={cardStyle.text}>Link (optional)</Label>
                    <Input
                      type="url"
                      value={formData.file_link}
                      onChange={(e) => setFormData({ ...formData, file_link: e.target.value })}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                      placeholder="https://example.com/file"
                    />
                    <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                      Link Figma or Keynote file here (optional)
                    </p>
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
                  disabled={!formData.project_name || !formData.description}
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
              value={filterTypeId || 'all'}
              onChange={(e) => setFilterTypeId(e.target.value === 'all' ? null : e.target.value)}
              className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} h-8 px-2 text-xs ${getRoundedClass('rounded-md')}`}
            >
              <option value="all">All Types</option>
              {types.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <select
              value={filterAuthorId || 'all'}
              onChange={(e) => setFilterAuthorId(e.target.value === 'all' ? null : e.target.value)}
              className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} h-8 px-2 text-xs ${getRoundedClass('rounded-md')}`}
            >
              <option value="all">All Authors</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
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
              <option value="project_name-asc">Project Name (A-Z)</option>
              <option value="project_name-desc">Project Name (Z-A)</option>
              <option value="author_id-asc">Author (A-Z)</option>
              <option value="author_id-desc">Author (Z-A)</option>
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-3 ${getRoundedClass('rounded-xl')}`}>
            <p className={`${cardStyle.text} text-sm`}>Loading...</p>
          </Card>
        ) : filteredWorkSamples.length === 0 ? (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-3 ${getRoundedClass('rounded-xl')}`}>
            <p className={`${cardStyle.text} text-sm`}>No work samples found.</p>
          </Card>
        ) : (
          <Card className={`${cardStyle.bg} ${cardStyle.border} border ${getRoundedClass('rounded-xl')} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${cardStyle.border} border-b`}>
                    <th className="p-2 w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredWorkSamples.length && filteredWorkSamples.length > 0}
                        onChange={toggleSelectAll}
                        className="w-3 h-3"
                      />
                    </th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Project Name</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Type</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Author</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Client</th>
                    <th className={`p-2 text-left ${cardStyle.text} font-black uppercase text-xs`}>Date</th>
                    <th className={`p-2 text-right ${cardStyle.text} font-black uppercase text-xs`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkSamples.map((item) => (
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
                        {item.project_name}
                      </td>
                      <td className={`p-2 ${cardStyle.text}/70 text-xs font-normal`}>
                        {item.type?.name || '—'}
                      </td>
                      <td className={`p-2 ${cardStyle.text}/70 text-xs font-normal`}>
                        {item.author?.full_name || item.author?.email || 'Unknown'}
                      </td>
                      <td className={`p-2 ${cardStyle.text}/70 text-xs font-normal`}>
                        {item.client || '—'}
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
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setEditingItem(null)
            resetForm()
          }
        }}>
          <DialogContent className={`${cardStyle.bg} ${cardStyle.border} border max-w-4xl max-h-[90vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle className={cardStyle.text}>Edit Work Sample</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label className={cardStyle.text}>Project Name *</Label>
                  <Input
                    value={formData.project_name}
                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Describe the work..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label className={cardStyle.text}>Type (optional)</Label>
                  <select
                    value={formData.type_id}
                    onChange={(e) => setFormData({ ...formData, type_id: e.target.value })}
                    className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                  >
                    <option value="">No Type</option>
                    {allTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className={cardStyle.text}>Client (optional)</Label>
                  <Input
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="Enter client name..."
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
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label className={cardStyle.text}>Author</Label>
                  <select
                    value={formData.author_id}
                    onChange={(e) => setFormData({ ...formData, author_id: e.target.value })}
                    className={`w-full ${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} p-2 ${getRoundedClass('rounded-md')}`}
                  >
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className={cardStyle.text}>File Link (optional)</Label>
                  <Input
                    type="url"
                    value={formData.file_link}
                    onChange={(e) => setFormData({ ...formData, file_link: e.target.value })}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    placeholder="https://example.com/file"
                  />
                  <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                    Alternative to file upload - provide a link to the file
                  </p>
                </div>
                <div>
                  <Label className={cardStyle.text}>Thumbnail Image (optional)</Label>
                  <div>
                    {thumbnailPreview && (
                      <div className="mb-2">
                        <img 
                          src={thumbnailPreview} 
                          alt="Thumbnail preview" 
                          className="w-32 h-32 object-cover rounded"
                        />
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      disabled={uploadingThumbnail}
                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                    />
                    {uploadingThumbnail && <p className={`text-xs ${cardStyle.text}/70 mt-1`}>Uploading...</p>}
                  </div>
                </div>
                <div>
                  <Label className={cardStyle.text}>File Upload (optional)</Label>
                  <p className={`text-xs ${cardStyle.text}/70 mb-1`}>PDF, Keynote, ZIP, PPT, DOC (max 100MB)</p>
                  <Input
                    type="file"
                    accept=".pdf,.zip,.ppt,.pptx,.doc,.docx,.key"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text}`}
                  />
                  {selectedFile && (
                    <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  {formData.file_name && !selectedFile && (
                    <p className={`text-xs ${cardStyle.text}/70 mt-1`}>
                      Current file: {formData.file_name}
                    </p>
                  )}
                  {uploadingFile && <p className={`text-xs ${cardStyle.text}/70 mt-1`}>Uploading to Google Drive...</p>}
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
                  disabled={!formData.project_name || !formData.description}
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
