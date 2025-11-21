'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Calendar, Briefcase, Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [birthday, setBirthday] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [role, setRole] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      
      setLoading(true)
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('birthday, discipline, role, avatar_url, full_name')
          .eq('id', user.id)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error loading profile:', profileError)
        }
        
        if (profile) {
          setBirthday(profile.birthday || '')
          setDiscipline(profile.discipline || '')
          setRole(profile.role || '')
          setAvatarUrl(profile.avatar_url || null)
          setFullName(profile.full_name || user.user_metadata?.full_name || '')
        } else {
          // No profile yet, use defaults
          setFullName(user.user_metadata?.full_name || user.email || '')
          setAvatarUrl(user.user_metadata?.avatar_url || null)
        }
      } catch (err) {
        console.error('Error in loadProfile:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (!authLoading && user) {
      loadProfile()
    }
  }, [user, authLoading, supabase])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    
    try {
      // Validate birthday format if provided
      if (birthday) {
        const birthdayRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/
        if (!birthdayRegex.test(birthday)) {
          setError('Please enter your birthday in MM/DD format (e.g., 03/15)')
          setSaving(false)
          return
        }
      }
      
      // Update or insert profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          birthday: birthday || null,
          discipline: discipline || null,
          role: role || null,
          full_name: fullName || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id)
      
      // If update fails (profile doesn't exist), try insert
      if (updateError && updateError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user?.id,
            birthday: birthday || null,
            discipline: discipline || null,
            role: role || null,
            full_name: fullName || null,
            email: user?.email || null,
            updated_at: new Date().toISOString(),
          })
        
        if (insertError) {
          throw insertError
        }
      } else if (updateError) {
        throw updateError
      }
      
      setSuccess('Profile updated successfully!')
      setSaving(false)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
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
    return null
  }

  // Generate initials for avatar fallback
  const getInitials = (name: string, email: string) => {
    if (name) {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  const initials = getInitials(fullName, user.email || '')
  const displayAvatarUrl = avatarUrl || user.user_metadata?.avatar_url || null
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <Card className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile information and preferences
            </p>
          </div>

          {/* Avatar Section */}
          <div className="mb-8 pb-8 border-b">
            <Label className="text-sm font-medium mb-4 block">Profile Picture</Label>
            <div className="flex items-center gap-4">
              {displayAvatarUrl ? (
                <img
                  src={displayAvatarUrl}
                  alt={fullName || user.email || 'User'}
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      const fallback = parent.querySelector('.avatar-fallback') as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }
                  }}
                />
              ) : null}
              <div 
                className={`avatar-fallback w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold bg-primary text-primary-foreground border-2 border-border ${displayAvatarUrl ? 'hidden' : ''}`}
              >
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium">{fullName || user.email || 'User'}</p>
                <p className="text-xs text-muted-foreground">Avatar from Google account</p>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="full-name" className="mb-2 block">
                Full Name
              </Label>
              <Input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="birthday" className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" />
                Birthday
              </Label>
              <Input
                id="birthday"
                type="text"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                placeholder="MM/DD (e.g., 03/15)"
                pattern="(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter your birthday in MM/DD format. Required for horoscope generation.
              </p>
            </div>
            
            <div>
              <Label htmlFor="discipline" className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" />
                Discipline
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
                Role
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
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

