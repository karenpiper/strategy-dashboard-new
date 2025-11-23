'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { AccountMenu } from '@/components/account-menu'
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
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'

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
  const [loading, setLoading] = useState(true)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showToolDialog, setShowToolDialog] = useState(false)
  const [selectedTool, setSelectedTool] = useState<PlaygroundTool | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  
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

  const getBorderClass = () => {
    switch (mode) {
      case 'chaos': return 'border-[#333333]'
      case 'chill': return 'border-[#4A1818]/20'
      case 'code': return 'border-[#FFFFFF]'
      default: return 'border-[#333333]'
    }
  }

  const getRoundedClass = (defaultClass: string) => {
    return mode === 'code' ? 'rounded-none' : defaultClass
  }

  const getNavLinkClass = (isActive = false) => {
    const base = `transition-colors text-sm font-black uppercase ${mode === 'code' ? 'font-mono' : ''}`
    if (isActive) {
      switch (mode) {
        case 'chaos': return `${base} text-white hover:text-[#C4F500]`
        case 'chill': return `${base} text-[#4A1818] hover:text-[#FFC043]`
        case 'code': return `${base} text-[#FFFFFF] hover:text-[#FFFFFF]`
        default: return `${base} text-white hover:text-[#C4F500]`
      }
    } else {
      switch (mode) {
        case 'chaos': return `${base} text-[#666666] hover:text-white`
        case 'chill': return `${base} text-[#8B4444] hover:text-[#4A1818]`
        case 'code': return `${base} text-[#808080] hover:text-[#FFFFFF]`
        default: return `${base} text-[#666666] hover:text-white`
      }
    }
  }

  const getLogoBg = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#C4F500]'
      case 'chill': return 'bg-[#FFC043]'
      case 'code': return 'bg-[#FFFFFF]'
      default: return 'bg-[#C4F500]'
    }
  }

  const getLogoText = () => {
    switch (mode) {
      case 'chaos': return 'text-black'
      case 'chill': return 'text-[#4A1818]'
      case 'code': return 'text-black'
      default: return 'text-black'
    }
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
    if (selectedCategory && tool.category !== selectedCategory) {
      return false
    }
    if (selectedTag && !tool.tags.includes(selectedTag)) {
      return false
    }
    return true
  })

  // Get all unique categories and tags
  const categories = Array.from(new Set(tools.map(t => t.category).filter(Boolean))) as string[]
  const allTags = Array.from(new Set(tools.flatMap(t => t.tags)))

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
      {/* Header */}
      <header className={`border-b ${getBorderClass()} px-6 py-4 fixed top-0 left-0 right-0 z-50 ${getBgClass()}`}>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className={`w-10 h-10 ${getLogoBg()} ${getLogoText()} ${getRoundedClass('rounded-xl')} flex items-center justify-center font-black text-lg ${mode === 'code' ? 'font-mono' : ''} cursor-pointer`}>
              {mode === 'code' ? 'C:\\>' : 'D'}
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className={getNavLinkClass()}>HOME</Link>
              <Link href="/snaps" className={getNavLinkClass()}>SNAPS</Link>
              <Link href="/resources" className={getNavLinkClass()}>RESOURCES</Link>
              <Link href="/work-samples" className={getNavLinkClass()}>WORK</Link>
              <a href="#" className={getNavLinkClass()}>TEAM</a>
              <Link href="/vibes" className={getNavLinkClass()}>VIBES</Link>
              <Link href="/playground" className={getNavLinkClass(true)}>PLAYGROUND</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-28">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className={`text-5xl font-black mb-2 ${getTextClass()}`}>Playground</h1>
              <p className={`text-lg ${getTextClass()}/70`}>
                A directory of tools to help us be better thinkers, doers, strategists, managers, and leaders
              </p>
            </div>
            {user && (
              <Button
                onClick={() => setShowSubmitDialog(true)}
                className={`${getRoundedClass('rounded-lg')} px-6 py-3`}
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

          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className={`px-4 py-2 ${getRoundedClass('rounded-lg')} border ${getBorderClass()} ${getBgClass()} ${getTextClass()}`}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
            {selectedTag && (
              <Button
                variant="outline"
                onClick={() => setSelectedTag(null)}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {selectedTag}
              </Button>
            )}
          </div>
        </div>

        {/* Tools Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className={`w-8 h-8 animate-spin ${getTextClass()}`} />
          </div>
        ) : filteredTools.length === 0 ? (
          <Card className={`p-12 text-center ${getRoundedClass('rounded-[2.5rem]')}`}>
            <p className={getTextClass()}>
              {searchQuery || selectedCategory || selectedTag 
                ? 'No tools found matching your filters.' 
                : 'No tools yet. Be the first to submit one!'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map(tool => (
              <Card
                key={tool.id}
                className={`${getRoundedClass('rounded-[2.5rem]')} p-6 cursor-pointer transition-all hover:scale-105`}
                style={{
                  backgroundColor: mode === 'chaos' ? redColors.primary : mode === 'chill' ? '#FFFFFF' : '#1a1a1a',
                  borderColor: redColors.accent,
                  borderWidth: '2px'
                }}
                onClick={() => handleOpenTool(tool)}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className={`text-xl font-black ${mode === 'chaos' ? 'text-black' : getTextClass()} flex-1`}>
                    {tool.name}
                  </h3>
                  {tool.made_by_user && (
                    <span className={`text-xs px-2 py-1 ${getRoundedClass('rounded')}`} style={{ backgroundColor: redColors.complementary, color: mode === 'chaos' ? '#000000' : '#4A1818' }}>
                      Made by us
                    </span>
                  )}
                </div>
                
                {tool.description && (
                  <p className={`text-sm mb-4 ${mode === 'chaos' ? 'text-black/80' : getTextClass()}/70 line-clamp-3`}>
                    {tool.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike(tool.id)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Heart 
                      className={`w-5 h-5 ${tool.user_liked ? 'fill-current' : ''}`}
                      style={{ color: tool.user_liked ? redColors.accent : (mode === 'chaos' ? '#000000' : getTextClass()) }}
                    />
                    <span className={mode === 'chaos' ? 'text-black' : getTextClass()}>{tool.likes_count}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <MessageCircle className={`w-5 h-5 ${mode === 'chaos' ? 'text-black' : getTextClass()}`} />
                    <span className={mode === 'chaos' ? 'text-black' : getTextClass()}>Comments</span>
                  </div>
                </div>

                {tool.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {tool.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTag(tag)
                        }}
                        className={`text-xs px-2 py-1 ${getRoundedClass('rounded')} cursor-pointer`}
                        style={{ backgroundColor: redColors.complementary, color: mode === 'chaos' ? '#000000' : '#4A1818' }}
                      >
                        {tag}
                      </span>
                    ))}
                    {tool.tags.length > 3 && (
                      <span className={`text-xs ${mode === 'chaos' ? 'text-black/60' : getTextClass()}/60`}>
                        +{tool.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
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
                  // TODO: Implement file upload to Supabase Storage
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

