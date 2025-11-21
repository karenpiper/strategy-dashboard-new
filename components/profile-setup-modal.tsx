'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { Loader2, Calendar, Briefcase, Users } from 'lucide-react'

interface ProfileSetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function ProfileSetupModal({ open, onOpenChange, onComplete }: ProfileSetupModalProps) {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [birthday, setBirthday] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [role, setRole] = useState('')
  
  // Load existing profile data if available
  useEffect(() => {
    async function loadProfile() {
      if (!user || !open) return

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('birthday, discipline, role')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profile) {
          setBirthday(profile.birthday || '')
          setDiscipline(profile.discipline || '')
          setRole(profile.role || '')
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      }
    }

    loadProfile()
  }, [user, open, supabase])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    
    try {
      // Validate birthday format (MM/DD)
      const birthdayRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/
      if (!birthdayRegex.test(birthday)) {
        setError('Please enter your birthday in MM/DD format (e.g., 03/15)')
        setSaving(false)
        return
      }
      
      // Update or insert profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          birthday: birthday,
          discipline: discipline || null,
          role: role || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id)
      
      // If update fails (profile doesn't exist), try insert
      if (updateError && updateError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user?.id,
            birthday: birthday,
            discipline: discipline || null,
            role: role || null,
            email: user?.email || null,
            updated_at: new Date().toISOString(),
          })
        
        if (insertError) {
          throw insertError
        }
      } else if (updateError) {
        throw updateError
      }
      
      // Success - close modal and notify parent
      onComplete()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Error saving profile:', err)
      let errorMessage = err.message || 'Failed to save profile. Please try again.'
      
      // Provide helpful error message for schema issues
      if (errorMessage.includes('schema') || errorMessage.includes('birthday') || errorMessage.includes('column')) {
        errorMessage = 'Database schema needs to be updated. Please run the migration script: supabase/add-profile-fields.sql in your Supabase SQL Editor.'
      }
      
      setError(errorMessage)
      setSaving(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            We need a few details to personalize your horoscope
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="modal-birthday" className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" />
              Birthday <span className="text-destructive">*</span>
            </Label>
            <Input
              id="modal-birthday"
              type="text"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              placeholder="MM/DD (e.g., 03/15)"
              required
              pattern="(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter your birthday in MM/DD format. We only need the month and day for your horoscope.
            </p>
          </div>
          
          <div>
            <Label htmlFor="modal-discipline" className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" />
              Discipline (Optional)
            </Label>
            <Input
              id="modal-discipline"
              type="text"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              placeholder="e.g., Design, Engineering, Marketing"
              className="w-full"
            />
          </div>
          
          <div>
            <Label htmlFor="modal-role" className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4" />
              Role (Optional)
            </Label>
            <Input
              id="modal-role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Creative Director, Senior Engineer"
              className="w-full"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              disabled={saving || !birthday}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

