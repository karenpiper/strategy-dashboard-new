'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
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

export function AddSnapDialog({ open, onOpenChange, onSuccess }: AddSnapDialogProps) {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [snapContent, setSnapContent] = useState('')
  const [mentioned, setMentioned] = useState('')
  const [submitAnonymously, setSubmitAnonymously] = useState(false)
  
  // Make overlay fully opaque (no transparency)
  useEffect(() => {
    if (open) {
      const overlay = document.querySelector('[data-radix-dialog-overlay]')
      if (overlay) {
        ;(overlay as HTMLElement).style.backgroundColor = 'rgb(0, 0, 0)'
      }
    }
  }, [open])
  
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
      <DialogContent className="sm:max-w-lg bg-background">
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
          
          <div>
            <Label htmlFor="mentioned" className="mb-2 block">
              Mentioned (Recipient)
            </Label>
            <Input
              id="mentioned"
              type="text"
              value={mentioned}
              onChange={(e) => setMentioned(e.target.value)}
              placeholder="Enter the person's name"
              className="w-full"
            />
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

