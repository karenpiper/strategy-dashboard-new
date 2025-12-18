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

interface Snap {
  id: string
  snap_content: string
  mentioned: string | null
  submitted_by: string | null
  date: string
  recipients?: Array<{
    user_id: string
    recipient_profile: {
      id: string
      email: string | null
      full_name: string | null
    } | null
  }>
}

interface AddSnapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  adminMode?: boolean // If true, allows selecting "from" user
  defaultFromUserId?: string // Pre-select a "from" user in admin mode
  editSnap?: Snap | null // If provided, edit this snap instead of creating new
}

interface Profile {
  id: string
  full_name: string | null
  email: string | null
}

export function AddSnapDialog({ open, onOpenChange, onSuccess, adminMode = false, defaultFromUserId, editSnap }: AddSnapDialogProps) {
  const { user } = useAuth()
  const { mode } = useMode()
  const supabase = createClient()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [snapContent, setSnapContent] = useState('')
  const [mentioned, setMentioned] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState<Profile[]>([])
  const [submitAnonymously, setSubmitAnonymously] = useState(false)
  const [fromUser, setFromUser] = useState<Profile | null>(null)
  const [fromUserSearch, setFromUserSearch] = useState('')
  const [fromUserSuggestions, setFromUserSuggestions] = useState<Profile[]>([])
  const [showFromUserSuggestions, setShowFromUserSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Profile[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Make overlay transparent and ensure dialog content is opaque
  useEffect(() => {
    if (!open) return
    
    // Get background color based on mode
    let bgColor = '#1a1a1a' // default dark (chaos)
    if (mode === 'chill') {
      bgColor = '#FFFFFF'
    } else if (mode === 'code') {
      bgColor = '#000000'
    }
    
    const applyStyles = () => {
      // Make overlay transparent
      const overlay = document.querySelector('[data-radix-dialog-overlay]')
      if (overlay) {
        const overlayEl = overlay as HTMLElement
        overlayEl.style.setProperty('background-color', 'transparent', 'important')
        overlayEl.style.setProperty('opacity', '0', 'important')
      }
      
      // Find dialog content - try multiple times with different delays
      const findDialog = () => {
        // Try data attribute
        let dialog = document.querySelector('[data-radix-dialog-content]') as HTMLElement
        
        // Try role attribute
        if (!dialog) {
          const dialogs = document.querySelectorAll('[role="dialog"]')
          for (const d of dialogs) {
            const styles = window.getComputedStyle(d)
            if (styles.position === 'fixed' && (styles.zIndex === '50' || styles.zIndex === '50px')) {
              dialog = d as HTMLElement
              break
            }
          }
        }
        
        if (dialog) {
          dialog.style.setProperty('background-color', bgColor, 'important')
          dialog.style.setProperty('opacity', '1', 'important')
          dialog.style.setProperty('backdrop-filter', 'none', 'important')
          dialog.style.setProperty('background', bgColor, 'important')
          
          // Force remove any background classes
          dialog.classList.remove('bg-transparent', 'bg-background', 'bg-background/0', 'bg-background/50')
          
          return true
        }
        return false
      }
      
      // Try multiple times
      findDialog()
      setTimeout(findDialog, 0)
      setTimeout(findDialog, 50)
      setTimeout(findDialog, 100)
      setTimeout(findDialog, 200)
    }
    
    // Apply styles with multiple attempts
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyStyles()
      })
    })
    
    // Also use MutationObserver as backup
    const observer = new MutationObserver(() => {
      const overlay = document.querySelector('[data-radix-dialog-overlay]')
      if (overlay) {
        const overlayEl = overlay as HTMLElement
        overlayEl.style.setProperty('background-color', 'transparent', 'important')
        overlayEl.style.setProperty('opacity', '0', 'important')
      }
      
      const dialog = document.querySelector('[data-radix-dialog-content]') as HTMLElement
      if (dialog) {
        dialog.style.setProperty('background-color', bgColor, 'important')
        dialog.style.setProperty('opacity', '1', 'important')
        dialog.style.setProperty('backdrop-filter', 'none', 'important')
        dialog.style.setProperty('background', bgColor, 'important')
        dialog.classList.remove('bg-transparent', 'bg-background', 'bg-background/0', 'bg-background/50')
      }
    })
    
    observer.observe(document.body, { childList: true, subtree: true })
    
    return () => {
      observer.disconnect()
    }
  }, [open, mode])
  
  // Get background color based on mode
  const getBackgroundColor = () => {
    if (mode === 'chill') {
      return '#FFFFFF'
    } else if (mode === 'code') {
      return '#000000'
    }
    return '#1a1a1a' // default dark (chaos)
  }
  
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
  
  // Initialize from user if defaultFromUserId is provided
  useEffect(() => {
    if (adminMode && defaultFromUserId && allProfiles.length > 0 && !fromUser) {
      const defaultUser = allProfiles.find(p => p.id === defaultFromUserId)
      if (defaultUser) {
        setFromUser(defaultUser)
      }
    }
  }, [adminMode, defaultFromUserId, allProfiles, fromUser])

  // Populate form when editing
  useEffect(() => {
    if (editSnap && open) {
      setSnapContent(editSnap.snap_content || '')
      setMentioned(editSnap.mentioned || '')
      
      // Set recipients from editSnap
      if (editSnap.recipients && editSnap.recipients.length > 0) {
        const recipientProfiles = editSnap.recipients
          .map(r => r.recipient_profile)
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map(p => ({ id: p.id, full_name: p.full_name, email: p.email }))
        setSelectedRecipients(recipientProfiles)
      }
      
      // Set from user if not anonymous
      if (editSnap.submitted_by && allProfiles.length > 0) {
        const submitter = allProfiles.find(p => p.id === editSnap.submitted_by)
        if (submitter) {
          setFromUser(submitter)
          setSubmitAnonymously(false)
        } else {
          setFromUser(null)
          setSubmitAnonymously(true)
        }
      } else {
        setFromUser(null)
        setSubmitAnonymously(true)
      }
    } else if (!editSnap && open) {
      // Reset form when creating new snap
      setSnapContent('')
      setMentioned('')
      setSelectedRecipients([])
      setSubmitAnonymously(false)
      setFromUser(null)
      setFromUserSearch('')
    }
  }, [editSnap, open, allProfiles])
  
  // Debounced search for recipients autocomplete
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
      // Filter out already selected recipients
      const selectedIds = new Set(selectedRecipients.map(r => r.id))
      const filtered = allProfiles
        .filter(profile => {
          // Exclude already selected profiles
          if (selectedIds.has(profile.id)) return false
          const name = profile.full_name?.toLowerCase() || ''
          const email = profile.email?.toLowerCase() || ''
          return name.includes(searchLower) || email.includes(searchLower)
        })
        .slice(0, 5)
      
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
      setSelectedIndex(-1)
    }, 200)
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [mentioned, allProfiles, selectedRecipients])
  
  // Debounced search for "from" user autocomplete (admin mode)
  useEffect(() => {
    if (!adminMode) return
    
    const timer = setTimeout(() => {
      if (fromUserSearch.length < 1) {
        setFromUserSuggestions([])
        setShowFromUserSuggestions(false)
        return
      }
      
      const searchLower = fromUserSearch.toLowerCase()
      const filtered = allProfiles
        .filter(profile => {
          const name = profile.full_name?.toLowerCase() || ''
          const email = profile.email?.toLowerCase() || ''
          return name.includes(searchLower) || email.includes(searchLower)
        })
        .slice(0, 5)
      
      setFromUserSuggestions(filtered)
      setShowFromUserSuggestions(filtered.length > 0)
    }, 200)
    
    return () => clearTimeout(timer)
  }, [fromUserSearch, allProfiles, adminMode])
  
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
      handleSelectSuggestion(selected)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }
  
  const handleSelectSuggestion = (profile: Profile) => {
    // Add to selected recipients if not already selected
    if (!selectedRecipients.find(r => r.id === profile.id)) {
      setSelectedRecipients([...selectedRecipients, profile])
    }
    setMentioned('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleRemoveRecipient = (profileId: string) => {
    setSelectedRecipients(selectedRecipients.filter(r => r.id !== profileId))
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
      // Prepare recipient user IDs array
      const mentionedUserIds = selectedRecipients.map(r => r.id)
      // For backward compatibility, also send the first recipient's name as 'mentioned'
      const mentionedName = selectedRecipients.length > 0 
        ? selectedRecipients.map(r => r.full_name || r.email).join(', ')
        : mentioned.trim() || null

      // In admin mode, use the selected "from" user if provided, otherwise allow anonymous
      // In regular mode, use submitAnonymously flag
      const submittedByUserId = adminMode 
        ? (fromUser ? fromUser.id : null) 
        : (submitAnonymously ? null : user?.id)

      const url = editSnap ? `/api/snaps/${editSnap.id}` : '/api/snaps'
      const method = editSnap ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snap_content: snapContent,
          mentioned: mentionedName,
          mentioned_user_ids: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
          submit_anonymously: adminMode ? !fromUser : submitAnonymously, // Anonymous if no fromUser in admin mode
          submitted_by: submittedByUserId, // Admin can set this or leave null for anonymous
          admin_mode: adminMode, // Flag to indicate admin is creating this
          date: editSnap?.date, // Preserve date when editing
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create snap')
      }
      
      // Success - reset form and close dialog
      setSnapContent('')
      setMentioned('')
      setSelectedRecipients([])
      setSubmitAnonymously(false)
      setFromUser(null)
      setFromUserSearch('')
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
        className={`sm:max-w-lg`}
        style={{ 
          backgroundColor: getBackgroundColor(),
          opacity: 1,
          backdropFilter: 'none',
          background: getBackgroundColor()
        }}
      >
        <DialogHeader>
          <DialogTitle>{editSnap ? 'Edit Snap' : (adminMode ? 'Add Snap (Admin)' : 'Add a Snap')}</DialogTitle>
          <DialogDescription>
            {editSnap 
              ? 'Update the snap details'
              : adminMode 
                ? 'Create a snap on behalf of another user'
                : 'Recognize someone for their great work or contribution'
            }
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {adminMode && (
            <div className="relative">
              <Label htmlFor="from-user" className="mb-2 block">
                From (Who is giving this snap) <span className="text-destructive">*</span>
              </Label>
              {fromUser ? (
                <div className="flex items-center gap-2 mb-2">
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                    <span>{fromUser.full_name || fromUser.email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFromUser(null)
                        setFromUserSearch('')
                      }}
                      className="ml-1 hover:text-destructive"
                      aria-label="Remove from user"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    id="from-user"
                    type="text"
                    value={fromUserSearch}
                    onChange={(e) => setFromUserSearch(e.target.value)}
                    onFocus={() => {
                      if (fromUserSuggestions.length > 0) {
                        setShowFromUserSuggestions(true)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowFromUserSuggestions(false), 200)
                    }}
                    placeholder="Start typing a name... (optional for anonymous)"
                    className="w-full"
                  />
                  {showFromUserSuggestions && fromUserSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 border border-border rounded-md shadow-lg max-h-60 overflow-auto"
                      style={{ backgroundColor: 'rgb(0, 0, 0)', opacity: 1 }}
                    >
                      {fromUserSuggestions.map((profile) => (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => {
                            setFromUser(profile)
                            setFromUserSearch('')
                            setShowFromUserSuggestions(false)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-800 hover:text-white text-white"
                        >
                          {profile.full_name || profile.email}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Select the person who is giving this snap (leave empty for anonymous)
              </p>
            </div>
          )}
          
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
              Recipients {selectedRecipients.length > 0 && `(${selectedRecipients.length})`}
            </Label>
            
            {/* Selected Recipients */}
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedRecipients.map((profile) => (
                  <div
                    key={profile.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                  >
                    <span>{profile.full_name || profile.email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(profile.id)}
                      className="ml-1 hover:text-destructive"
                      aria-label="Remove recipient"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
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
              placeholder="Start typing a name to add recipients..."
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
              Add one or more people this snap is for (optional)
            </p>
          </div>
          
          {!adminMode && (
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
          )}
          
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
                  {editSnap ? 'Updating...' : 'Submitting...'}
                </>
              ) : (
                editSnap ? 'Update Snap' : 'Submit Snap'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

