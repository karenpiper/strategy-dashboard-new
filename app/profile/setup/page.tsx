'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Calendar, Briefcase, Users } from 'lucide-react'

export default function ProfileSetupPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [birthday, setBirthday] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [role, setRole] = useState('')
  
  // Check if profile already exists and has birthday
  useEffect(() => {
    async function checkProfile() {
      if (!user) return
      
      setLoading(true)
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('birthday, discipline, role')
          .eq('id', user.id)
          .single()
        
        if (profile && profile.birthday) {
          // Profile already set up, redirect to dashboard
          router.push('/')
          return
        }
        
        // Pre-fill if profile exists but missing birthday
        if (profile) {
          setDiscipline(profile.discipline || '')
          setRole(profile.role || '')
        }
      } catch (err) {
        console.error('Error checking profile:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (!authLoading && user) {
      checkProfile()
    }
  }, [user, authLoading, router, supabase])
  
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
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          birthday: birthday,
          discipline: discipline || null,
          role: role || null,
          updated_at: new Date().toISOString(),
        })
      
      if (updateError) {
        throw updateError
      }
      
      // Redirect to dashboard
      router.push('/')
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Failed to save profile. Please try again.')
      setSaving(false)
    }
  }
  
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    router.push('/login')
    return null
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            We need a few details to personalize your horoscope
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="birthday" className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" />
              Birthday <span className="text-destructive">*</span>
            </Label>
            <Input
              id="birthday"
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
            <Label htmlFor="discipline" className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" />
              Discipline (Optional)
            </Label>
            <Input
              id="discipline"
              type="text"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              placeholder="e.g., Design, Engineering, Marketing"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your department or team. This helps personalize your horoscope.
            </p>
          </div>
          
          <div>
            <Label htmlFor="role" className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4" />
              Role (Optional)
            </Label>
            <Input
              id="role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Creative Director, Senior Engineer"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your job title. This helps personalize your horoscope.
            </p>
          </div>
          
          <Button
            type="submit"
            disabled={saving || !birthday}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Complete Profile'
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}

