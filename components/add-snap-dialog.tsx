'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface AddSnapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Profile {
  id: string
  full_name: string | null
  email: string | null
}

export function AddSnapDialog({ open, onOpenChange, onSuccess }: AddSnapDialogProps) {
  const { user } = useAuth()
  const { mode } = useMode()
  const supabase = createClient()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [snapContent, setSnapContent] = useState('')
  const [mentioned, setMentioned] = useState('')
  const [submitAnonymously, setSubmitAnonymously] = useState(false)
  const [suggestions, setSuggestions] = useState<Profile[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Make overlay transparent and ensure dialog content is opaque
  useEffect(() => {
    if (open) {
      const overlay = document.querySelector('[data-radix-dialog-overlay]')
      if (overlay) {
        const overlayEl = overlay as HTMLElement
        overlayEl.style.setProperty('background-color', 'transparent', 'important')
        overlayEl.style.setProperty('opacity', '0', 'important')
      }
      
      // Ensure dialog content is opaque
      const dialogContent = document.querySelector('[data-radix-dialog-content]')
      if (dialogContent) {
        const contentEl = dialogContent as HTMLElement
        // Use a solid background color based on mode
        let bgColor = '#1a1a1a' // default dark (chaos)
        if (mode === 'chill') {
          bgColor = '#FFFFFF'
        } else if (mode === 'code') {
          bgColor = '#000000'
        }
        contentEl.style.setProperty('background-color', bgColor, 'important')
        contentEl.style.setProperty('opacity', '1', 'important')
        contentEl.style.setProperty('backdrop-filter', 'none', 'important')
      }
    }
  }, [open, mode])
  
  // Fetch team members for autocomplete
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name', { ascending: true })
        
        if (!error && data) {
          // Store all profiles for filtering
          setAllProfiles(data)
        }
      } catch (err) {
        console.error('Error fetching profiles:', err)
      }
    }
    
    if (open) {
      fetchProfiles()
    }
  }, [open, supabase])
  
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  
  // Debounced search for autocomplete
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    if (mentioned.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    
    debounceTimerRef.current = setTimeout(() => {
      const searchLower = mentioned.toLowerCase()
      const filtered = allProfiles.filter(profile => {
        const name = profile.full_name?.toLowerCase() || ''
        const email = profile.email?.toLowerCase() || ''
        return name.includes(searchLower) || email.includes(searchLower)
      }).slice(0, 5)
      
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
      setSelectedIndex(-1)
    }, 200)
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [mentioned, allProfiles])
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      const selected = suggestions[selectedIndex]
      setMentioned(selected.full_name || selected.email || '')
      setShowSuggestions(false)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }
  
  const handleSelectSuggestion = (profile: Profile) => {
    setMentioned(profile.full_name || profile.email || '')
    setShowSuggestions(false)
    inputRef.current?.blur()
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!snapContent.trim()) {
      setError('Snap content is required')
      return
    }
    
    setSubmitting(true)
    
    try {
      const response = await fetch('/api/snaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snap_content: snapContent,
          mentioned: mentioned.trim() || null,
          submit_anonymously: submitAnonymously,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create snap')
      }
      
      // Success - reset form and close dialog
      setSnapContent('')
      setMentioned('')
      setSubmitAnonymously(false)
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Error creating snap:', err)
      setError(err.message || 'Failed to create snap. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg bg-background"
        style={{ opacity: 1 }}
      >
        <DialogHeader>
          <DialogTitle>Add a Snap</DialogTitle>
          <DialogDescription>
            Recognize someone for their great work or contribution
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="snap-content" className="mb-2 block">
              Snap Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="snap-content"
              value={snapContent}
              onChange={(e) => setSnapContent(e.target.value)}
              placeholder="Write your snap message here..."
              className="w-full min-h-[120px]"
              required
            />
          </div>
          
          <div className="relative">
            <Label htmlFor="mentioned" className="mb-2 block">
              Mentioned (Recipient)
            </Label>
            <Input
              ref={inputRef}
              id="mentioned"
              type="text"
              value={mentioned}
              onChange={(e) => setMentioned(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 200)
              }}
              placeholder="Start typing a name..."
              className="w-full"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 border border-border rounded-md shadow-lg max-h-60 overflow-auto"
                style={{ backgroundColor: 'rgb(0, 0, 0)', opacity: 1 }}
              >
                {suggestions.map((profile, idx) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(profile)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-800 hover:text-white ${
                      idx === selectedIndex ? 'bg-gray-800 text-white' : 'text-white'
                    }`}
                    style={{ backgroundColor: idx === selectedIndex ? 'rgb(31, 41, 55)' : 'transparent' }}
                  >
                    {profile.full_name || profile.email}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              The person this snap is for (optional)
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="submit-anonymously"
              checked={submitAnonymously}
              onChange={(e) => setSubmitAnonymously(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="submit-anonymously" className="text-sm font-normal cursor-pointer">
              Submit anonymously
            </Label>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !snapContent.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Snap'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

