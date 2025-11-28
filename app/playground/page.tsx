'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  Plus, 
  Heart, 
  MessageCircle, 
  ExternalLink, 
  Upload, 
  Tag, 
  Search, 
  X,
  Loader2,
  CheckCircle,
  Lightbulb,
  Bug,
  MessageSquare,
  Wrench,
  Clock,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { Footer } from '@/components/footer'

interface PlaygroundTool {
  id: string
  name: string
  link: string | null
  file_url: string | null
  made_by_user: boolean
  description: string | null
  why_i_like_it: string | null
  submitted_by: string
  date_submitted: string
  tags: string[]
  category: string | null
  likes_count: number
  user_liked: boolean
  view_count: number
  submitter: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
}

interface Comment {
  id: string
  comment: string
  created_at: string
  user: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
}

interface Feedback {
  id: string
  feedback_type: 'feature_suggestion' | 'bug_report' | 'general_feedback'
  feedback_text: string
  created_at: string
  user: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
}

export default function PlaygroundPage() {
  const { user, loading: authLoading } = useAuth()
  const { mode } = useMode()
  const router = useRouter()
  
  const [tools, setTools] = useState<PlaygroundTool[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<PlaygroundTool[]>([])
  const [mostUsed, setMostUsed] = useState<PlaygroundTool[]>([])
  const [loading, setLoading] = useState(true)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showToolDialog, setShowToolDialog] = useState(false)
  const [selectedTool, setSelectedTool] = useState<PlaygroundTool | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    link: '',
    file_url: '',
    made_by_user: false,
    description: '',
    why_i_like_it: '',
    tags: [] as string[],
    category: '',
    tagInput: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [newFeedback, setNewFeedback] = useState({
    type: 'general_feedback' as 'feature_suggestion' | 'bug_report' | 'general_feedback',
    text: ''
  })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  // RED SYSTEM colors
  const redColors = {
    primary: '#FF4C4C',      // Coral Red
    accent: '#C41E3A',       // Crimson
    complementary: '#FFD4C4', // Peach
    contrast: '#00A3E0'      // Ocean Blue
  }

  // Styling helpers
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

  const getRoundedClass = (defaultClass: string) => {
    return mode === 'code' ? 'rounded-none' : defaultClass
  }

  // Fetch tools
  useEffect(() => {
    fetchTools()
  }, [])

  const fetchTools = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/playground/tools')
      if (response.ok) {
        const data = await response.json()
        setTools(data.data || [])
        setRecentlyViewed(data.recentlyViewed || [])
        setMostUsed(data.mostUsed || [])
      }
    } catch (error) {
      console.error('Error fetching tools:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch comments and feedback for selected tool
  useEffect(() => {
    if (selectedTool) {
      fetchComments()
      fetchFeedback()
    }
  }, [selectedTool])

  const fetchComments = async () => {
    if (!selectedTool) return
    try {
      const response = await fetch(`/api/playground/comments?tool_id=${selectedTool.id}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const fetchFeedback = async () => {
    if (!selectedTool) return
    try {
      const response = await fetch(`/api/playground/feedback?tool_id=${selectedTool.id}`)
      if (response.ok) {
        const data = await response.json()
        setFeedback(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
    }
  }

  // Filter tools
  const filteredTools = tools.filter(tool => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!tool.name.toLowerCase().includes(query) &&
          !tool.description?.toLowerCase().includes(query) &&
          !tool.why_i_like_it?.toLowerCase().includes(query) &&
          !tool.tags.some(tag => tag.toLowerCase().includes(query))) {
        return false
      }
    }
    if (activeFilter !== 'all' && tool.category !== activeFilter) {
      return false
    }
    return true
  })

  // Get all unique categories for filter buttons
  const categories = Array.from(new Set(tools.map(t => t.category).filter(Boolean))) as string[]
  
  // Handle tool click - track view and open dialog
  const handleToolClick = async (tool: PlaygroundTool) => {
    if (user) {
      // Record view
      try {
        await fetch('/api/playground/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_id: tool.id })
        })
        // Refresh tools to update view counts
        await fetchTools()
      } catch (error) {
        console.error('Error recording view:', error)
      }
    }
    handleOpenTool(tool)
  }

  // Handle tool submission
  const handleSubmitTool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/playground/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          link: formData.link || null,
          file_url: formData.file_url || null,
          made_by_user: formData.made_by_user,
          description: formData.description || null,
          why_i_like_it: formData.why_i_like_it || null,
          tags: formData.tags,
          category: formData.category || null
        })
      })

      if (response.ok) {
        await fetchTools()
        setShowSubmitDialog(false)
        setFormData({
          name: '',
          link: '',
          file_url: '',
          made_by_user: false,
          description: '',
          why_i_like_it: '',
          tags: [],
          category: '',
          tagInput: ''
        })
      }
    } catch (error) {
      console.error('Error submitting tool:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle like/unlike
  const handleLike = async (toolId: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/playground/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId })
      })

      if (response.ok) {
        await fetchTools()
        if (selectedTool && selectedTool.id === toolId) {
          const updatedTool = tools.find(t => t.id === toolId)
          if (updatedTool) {
            setSelectedTool(updatedTool)
          }
        }
      }
    } catch (error) {
      console.error('Error liking tool:', error)
    }
  }

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!user || !selectedTool || !newComment.trim()) return

    setSubmittingComment(true)
    try {
      const response = await fetch('/api/playground/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id: selectedTool.id,
          comment: newComment
        })
      })

      if (response.ok) {
        setNewComment('')
        await fetchComments()
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  // Handle feedback submission
  const handleSubmitFeedback = async () => {
    if (!user || !selectedTool || !newFeedback.text.trim()) return

    setSubmittingFeedback(true)
    try {
      const response = await fetch('/api/playground/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id: selectedTool.id,
          feedback_type: newFeedback.type,
          feedback_text: newFeedback.text
        })
      })

      if (response.ok) {
        setNewFeedback({ type: 'general_feedback', text: '' })
        await fetchFeedback()
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setSubmittingFeedback(false)
    }
  }

  // Add tag to form
  const handleAddTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.tagInput.trim()],
        tagInput: ''
      })
    }
  }

  // Remove tag from form
  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    })
  }

  // Open tool dialog
  const handleOpenTool = (tool: PlaygroundTool) => {
    setSelectedTool(tool)
    setShowToolDialog(true)
  }

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getBgClass()}`}>
        <Loader2 className={`w-8 h-8 animate-spin ${getTextClass()}`} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex flex-col ${getBgClass()} ${getTextClass()}`}>
      <SiteHeader />

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24 w-full">
        <div className="flex gap-6">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* Page Title */}
            <div className="flex items-center justify-between mb-8">
              <h1 className={`text-5xl font-black ${getTextClass()}`}>Playground</h1>
              {user && (
                <Button
                  onClick={() => setShowSubmitDialog(true)}
                  className={`${getRoundedClass('rounded-xl')} px-6 py-3`}
                  style={{ 
                    backgroundColor: redColors.primary,
                    color: mode === 'chaos' ? '#000000' : '#FFFFFF'
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Tool
                </Button>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`} />
              <Input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-12 pr-4 py-6 ${getRoundedClass('rounded-2xl')} ${mode === 'chill' ? 'bg-white border-[#4A1818]/20' : mode === 'chaos' ? 'bg-[#2A2A2A] border-[#333333]' : 'bg-[#1a1a1a] border-white'} ${getTextClass()} text-lg`}
              />
              <Button
                onClick={() => {}}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${getRoundedClass('rounded-xl')} px-4`}
                style={{ backgroundColor: redColors.primary, color: mode === 'code' ? '#000000' : '#FFFFFF' }}
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-6 py-3 ${getRoundedClass('rounded-xl')} font-black uppercase text-sm transition-all ${
                  activeFilter === 'all'
                    ? `text-white`
                    : mode === 'chill'
                    ? 'text-[#4A1818]/60 hover:text-[#4A1818]'
                    : 'text-white/60 hover:text-white'
                }`}
                style={{
                  backgroundColor: activeFilter === 'all' ? redColors.primary : 'transparent',
                  border: activeFilter === 'all' ? 'none' : `2px solid ${mode === 'chill' ? '#4A1818/20' : '#333333'}`
                }}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveFilter(category)}
                  className={`px-6 py-3 ${getRoundedClass('rounded-xl')} font-black uppercase text-sm transition-all ${
                    activeFilter === category
                      ? `text-white`
                      : mode === 'chill'
                      ? 'text-[#4A1818]/60 hover:text-[#4A1818]'
                      : 'text-white/60 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: activeFilter === category ? redColors.primary : 'transparent',
                    border: activeFilter === category ? 'none' : `2px solid ${mode === 'chill' ? '#4A1818/20' : '#333333'}`
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Tools Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className={`w-8 h-8 animate-spin ${getTextClass()}`} />
              </div>
            ) : filteredTools.length === 0 ? (
              <div className="text-center py-12">
                <p className={`text-lg ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>
                  {searchQuery || activeFilter !== 'all'
                    ? 'No tools found. Try adjusting your search or filters.'
                    : 'No tools yet. Be the first to submit one!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTools.map(tool => (
                  <Card
                    key={tool.id}
                    onClick={() => handleToolClick(tool)}
                    className={`p-6 ${getRoundedClass('rounded-2xl')} cursor-pointer transition-all hover:scale-[1.02] ${
                      mode === 'chill' ? 'bg-white border-[#4A1818]/10' : mode === 'chaos' ? 'bg-[#2A2A2A] border-[#333333]' : 'bg-[#1a1a1a] border-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-10 h-10 ${getRoundedClass('rounded-lg')} flex items-center justify-center`}
                          style={{ backgroundColor: redColors.contrast }}
                        >
                          <Wrench className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-bold text-lg mb-1 ${getTextClass()}`}>{tool.name}</h3>
                          {tool.made_by_user && (
                            <p className={`text-xs ${mode === 'chill' ? 'text-[#4A1818]/60' : 'text-white/60'}`}>Made by us</p>
                          )}
                        </div>
                      </div>
                      {(tool.link || tool.file_url) && (
                        <ExternalLink className={`w-5 h-5 ${mode === 'chill' ? 'text-[#4A1818]/40' : 'text-white/40'}`} />
                      )}
                    </div>
                    
                    {tool.description && (
                      <p className={`text-sm mb-4 ${mode === 'chill' ? 'text-[#4A1818]/80' : 'text-white/80'}`}>
                        {tool.description}
                      </p>
                    )}

                    {tool.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tool.category && (
                          <span 
                            className={`${getRoundedClass('rounded-lg')} text-xs px-2 py-1`}
                            style={{ 
                              borderColor: redColors.accent,
                              color: redColors.accent,
                              backgroundColor: 'transparent',
                              border: '1px solid'
                            }}
                          >
                            {tool.category}
                          </span>
                        )}
                        {tool.tags.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className={`${getRoundedClass('rounded-lg')} text-xs px-2 py-1`}
                            style={{
                              borderColor: redColors.complementary,
                              color: redColors.complementary,
                              backgroundColor: 'transparent',
                              border: '1px solid'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-80 space-y-6">
            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <Card className={`${getRoundedClass('rounded-2xl')} p-6`} style={{ backgroundColor: redColors.accent }}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-white" />
                  <h3 className="font-black uppercase text-sm text-white">Recently Viewed</h3>
                </div>
                <div className="space-y-3">
                  {recentlyViewed.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolClick(tool)}
                      className="text-left w-full"
                    >
                      <p className="text-sm text-white/90 hover:text-white transition-colors">{tool.name}</p>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Most Used */}
            {mostUsed.length > 0 && (
              <Card className={`${getRoundedClass('rounded-2xl')} p-6`} style={{ backgroundColor: redColors.contrast }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <h3 className="font-black uppercase text-sm text-white">Most Used</h3>
                </div>
                <div className="space-y-3">
                  {mostUsed.map((tool, idx) => (
                    <div key={tool.id}>
                      {idx === 0 && (
                        <div 
                          className={`${getRoundedClass('rounded-lg')} p-3 mb-3`}
                          style={{ backgroundColor: redColors.complementary }}
                        >
                          <p className="text-sm font-bold text-black">{tool.name}</p>
                          <p className="text-xs text-black/80 mt-1">{tool.view_count} views this month</p>
                        </div>
                      )}
                      {idx > 0 && (
                        <button
                          onClick={() => handleToolClick(tool)}
                          className="text-left w-full"
                        >
                          <p className="text-sm text-white/90 hover:text-white transition-colors">{tool.name}</p>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        <Footer />
      </main>

      {/* Submit Tool Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit a Tool</DialogTitle>
            <DialogDescription>
              Share a tool that helps you be a better thinker, doer, strategist, manager, or leader
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitTool} className="space-y-4">
            <div>
              <Label htmlFor="name">Tool Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="link">Link (URL)</Label>
              <Input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="file">Upload File</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => {
                  // TODO: Implement file upload to Supabase Storage for playground tools
                  // This will allow users to upload tool files directly from the UI
                  console.log('File upload not yet implemented')
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="made_by_user"
                checked={formData.made_by_user}
                onChange={(e) => setFormData({ ...formData, made_by_user: e.target.checked })}
              />
              <Label htmlFor="made_by_user">I made this tool</Label>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="why_i_like_it">Why I Like It</Label>
              <Textarea
                id="why_i_like_it"
                value={formData.why_i_like_it}
                onChange={(e) => setFormData({ ...formData, why_i_like_it: e.target.value })}
                rows={3}
                placeholder="What makes this tool useful for you?"
              />
            </div>

            <div>
              <Label htmlFor="category">Category (TBD)</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Thinking, Doing, Managing..."
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="tags"
                  value={formData.tagInput}
                  onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                />
                <Button type="button" onClick={handleAddTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSubmitDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formData.name}
                style={{ backgroundColor: redColors.primary, color: '#FFFFFF' }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Tool'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tool Detail Dialog */}
      <Dialog open={showToolDialog} onOpenChange={setShowToolDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTool && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">{selectedTool.name}</DialogTitle>
                    {selectedTool.made_by_user && (
                      <span className="text-xs px-2 py-1 bg-muted rounded">Made by us</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(selectedTool.id)}
                      className="flex items-center gap-2"
                    >
                      <Heart 
                        className={`w-5 h-5 ${selectedTool.user_liked ? 'fill-current' : ''}`}
                        style={{ color: selectedTool.user_liked ? redColors.accent : 'currentColor' }}
                      />
                      <span>{selectedTool.likes_count}</span>
                    </button>
                    {(selectedTool.link || selectedTool.file_url) && (
                      <a
                        href={selectedTool.link || selectedTool.file_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-5 h-5" />
                        Open
                      </a>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {selectedTool.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedTool.description}</p>
                  </div>
                )}

                {selectedTool.why_i_like_it && (
                  <div>
                    <h4 className="font-semibold mb-2">Why I Like It</h4>
                    <p className="text-sm text-muted-foreground">{selectedTool.why_i_like_it}</p>
                  </div>
                )}

                {selectedTool.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTool.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-muted rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Submitted by {selectedTool.submitter.full_name || selectedTool.submitter.email || 'Unknown'} on{' '}
                  {new Date(selectedTool.date_submitted).toLocaleDateString()}
                </div>

                {/* Comments Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-4">Comments</h4>
                  <div className="space-y-4 mb-4">
                    {comments.map(comment => (
                      <div key={comment.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">
                            {comment.user.full_name || comment.user.email || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                  {user && (
                    <div className="flex gap-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || submittingComment}
                        style={{ backgroundColor: redColors.primary, color: '#FFFFFF' }}
                      >
                        {submittingComment ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Post'
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Feedback Section (only for tools made by users) */}
                {selectedTool.made_by_user && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-4">Feedback & Suggestions</h4>
                    <div className="space-y-4 mb-4">
                      {feedback.map(fb => (
                        <div key={fb.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {fb.feedback_type === 'feature_suggestion' && <Lightbulb className="w-4 h-4" />}
                            {fb.feedback_type === 'bug_report' && <Bug className="w-4 h-4" />}
                            {fb.feedback_type === 'general_feedback' && <MessageSquare className="w-4 h-4" />}
                            <span className="font-medium text-sm">
                              {fb.user.full_name || fb.user.email || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {fb.feedback_type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(fb.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{fb.feedback_text}</p>
                        </div>
                      ))}
                    </div>
                    {user && (
                      <div className="space-y-2">
                        <select
                          value={newFeedback.type}
                          onChange={(e) => setNewFeedback({ ...newFeedback, type: e.target.value as any })}
                          className="w-full px-3 py-2 border rounded"
                        >
                          <option value="general_feedback">General Feedback</option>
                          <option value="feature_suggestion">Feature Suggestion</option>
                          <option value="bug_report">Bug Report</option>
                        </select>
                        <div className="flex gap-2">
                          <Textarea
                            value={newFeedback.text}
                            onChange={(e) => setNewFeedback({ ...newFeedback, text: e.target.value })}
                            placeholder="Share your feedback..."
                            rows={3}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleSubmitFeedback}
                            disabled={!newFeedback.text.trim() || submittingFeedback}
                            style={{ backgroundColor: redColors.accent, color: '#FFFFFF' }}
                          >
                            {submittingFeedback ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Submit'
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

