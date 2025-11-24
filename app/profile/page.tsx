'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Calendar, Briefcase, Users, Upload, MapPin, Globe, FileText, Download, Image as ImageIcon, User, Activity, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { LocationAutocomplete } from '@/components/location-autocomplete'
import { AccountMenu } from '@/components/account-menu'
import { Footer } from '@/components/footer'

type ProfileTab = 'profile' | 'avatars' | 'activity'

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const { mode } = useMode()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')
  
  // Helper functions for styling
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
    if (mode === 'chaos') return defaultClass.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return defaultClass.replace('rounded', 'rounded-2xl')
    return mode === 'code' ? 'rounded-none' : defaultClass
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

  const getInputClass = () => {
    switch (mode) {
      case 'chaos': return 'bg-black/30 border-gray-600 text-white placeholder:text-gray-500'
      case 'chill': return 'bg-white border-gray-300 text-[#4A1818] placeholder:text-gray-400'
      case 'code': return 'bg-black/30 border-gray-600 text-white placeholder:text-gray-500'
      default: return 'bg-black/30 border-gray-600 text-white placeholder:text-gray-500'
    }
  }

  const getLabelClass = () => {
    return `${getTextClass()} text-sm font-semibold mb-2 block`
  }

  const getHintClass = () => {
    return `${getTextClass()}/60 text-xs mt-1`
  }

  const getCardStyle = () => {
    if (mode === 'chaos') {
      return { 
        bg: 'bg-[#2A2A2A]', 
        border: 'border-2 border-[#00C896]', 
        text: 'text-white', 
        accent: '#00C896' 
      }
    } else if (mode === 'chill') {
      return { 
        bg: 'bg-[#E8E0D0]', 
        border: 'border-2 border-[#C8D961]', 
        text: 'text-[#4A1818]', 
        accent: '#C8D961' 
      }
    } else { // code
      return { 
        bg: 'bg-[#1a1a1a]', 
        border: 'border-2 border-[#FFFFFF]', 
        text: 'text-[#FFFFFF]', 
        accent: '#FFFFFF' 
      }
    }
  }

  const getFieldCardStyle = () => {
    if (mode === 'chaos') {
      return {
        bg: 'bg-[#2A2A2A]',
        border: 'border-2 border-[#00C896]',
        text: 'text-white',
        label: 'text-white',
        hint: 'text-white/60'
      }
    } else if (mode === 'chill') {
      return {
        bg: 'bg-[#E8E0D0]',
        border: 'border-2 border-[#C8D961]',
        text: 'text-[#4A1818]',
        label: 'text-[#4A1818]',
        hint: 'text-[#4A1818]/60'
      }
    } else {
      return {
        bg: 'bg-[#1a1a1a]',
        border: 'border-2 border-[#FFFFFF]',
        text: 'text-white',
        label: 'text-white',
        hint: 'text-white/60'
      }
    }
  }

  const getInputFieldStyle = () => {
    if (mode === 'chaos') {
      return 'bg-[#1A1A1A] border-[#00C896] text-white placeholder:text-gray-400 focus:border-[#00C896] focus:ring-[#00C896]'
    } else if (mode === 'chill') {
      return 'bg-[#F5E6D3] border-[#C8D961] text-[#4A1818] placeholder:text-[#4A1818]/40 focus:border-[#C8D961] focus:ring-[#C8D961]'
    } else {
      return 'bg-black border-white text-white placeholder:text-gray-400 focus:border-white focus:ring-white'
    }
  }
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [birthday, setBirthday] = useState('')
  const [startDate, setStartDate] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [discipline, setDiscipline] = useState('')
  
  // Avatar gallery state
  const [avatarGallery, setAvatarGallery] = useState<Array<{
    id: string
    url: string
    date: string
    star_sign: string
    generated_at: string
  }>>([])
  const [loadingAvatars, setLoadingAvatars] = useState(false)

  // Activity state
  const [activities, setActivities] = useState<Array<{
    type: string
    id: string
    title: string
    description: string | null
    date: string
    created_at: string
  }>>([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  
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
          .select('birthday, discipline, role, avatar_url, full_name, pronouns, start_date, bio, location, website')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error loading profile:', profileError)
        }
        
        if (profile) {
          setBirthday(profile.birthday || '')
          setDiscipline(profile.discipline || '')
          setAvatarUrl(profile.avatar_url || null)
          setFullName(profile.full_name || user.user_metadata?.full_name || '')
          setPronouns(profile.pronouns || '')
          setBio(profile.bio || '')
          setLocation(profile.location || '')
          setWebsite(profile.website || '')
          
          if (profile.start_date) {
            const date = new Date(profile.start_date)
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const year = date.getFullYear()
            setStartDate(`${year}-${month}-${day}`)
          } else {
            setStartDate('')
          }
        } else {
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

  // Load avatar gallery
  useEffect(() => {
    async function loadAvatarGallery() {
      if (!user || activeTab !== 'avatars') return
      
      setLoadingAvatars(true)
      try {
        const response = await fetch('/api/profile/horoscope-avatars')
        if (response.ok) {
          const result = await response.json()
          setAvatarGallery(result.data || [])
        }
      } catch (err) {
        console.error('Error loading avatar gallery:', err)
      } finally {
        setLoadingAvatars(false)
      }
    }
    
    if (!authLoading && user && activeTab === 'avatars') {
      loadAvatarGallery()
    }
  }, [user, authLoading, activeTab])

  // Load activity
  useEffect(() => {
    async function loadActivity() {
      if (!user || activeTab !== 'activity') return
      
      setLoadingActivity(true)
      try {
        const response = await fetch('/api/profile/activity')
        if (response.ok) {
          const result = await response.json()
          setActivities(result.data || [])
        }
      } catch (err) {
        console.error('Error loading activity:', err)
      } finally {
        setLoadingActivity(false)
      }
    }
    
    if (!authLoading && user && activeTab === 'activity') {
      loadActivity()
    }
  }, [user, authLoading, activeTab])

  // Handle profile photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setUploading(true)
    setError(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      setAvatarUrl(publicUrl)
      setAvatarPreview(null)
      setSuccess('Profile photo updated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error uploading photo:', err)
      setError(err.message || 'Failed to upload photo. Please try again.')
    } finally {
      setUploading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    
    try {
      if (birthday) {
        const birthdayRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/
        if (!birthdayRegex.test(birthday)) {
          setError('Please enter your birthday in MM/DD format (e.g., 03/15)')
          setSaving(false)
          return
        }
      }

      if (website && website.trim() !== '') {
        try {
          const url = website.startsWith('http://') || website.startsWith('https://') 
            ? website 
            : `https://${website}`
          new URL(url)
        } catch {
          setError('Please enter a valid website URL')
          setSaving(false)
          return
        }
      }

      let startDateFormatted: string | null = null
      if (startDate) {
        startDateFormatted = startDate
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          birthday: birthday || null,
          discipline: discipline || null,
          start_date: startDateFormatted,
          bio: bio || null,
          location: location || null,
          website: website || null,
          full_name: fullName || null,
          pronouns: pronouns || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id)
      
      if (updateError && updateError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user?.id,
            birthday: birthday || null,
            discipline: discipline || null,
            start_date: startDateFormatted,
            bio: bio || null,
            location: location || null,
            website: website || null,
            full_name: fullName || null,
            pronouns: pronouns || null,
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
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error saving profile:', err)
      let errorMessage = err.message || 'Failed to save profile. Please try again.'
      
      if (errorMessage.includes('schema') || errorMessage.includes('column')) {
        errorMessage = 'Database schema needs to be updated. Please run the migration script: supabase/add-all-profile-fields.sql in your Supabase SQL Editor.'
      }
      
      setError(errorMessage)
      setSaving(false)
    }
  }

  const handleDownloadAvatar = async (avatarUrl: string, date: string) => {
    try {
      const response = await fetch(avatarUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `horoscope-avatar-${date}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error downloading avatar:', err)
      setError('Failed to download avatar')
    }
  }
  
  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getBgClass()}`}>
        <div className="text-center">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${getTextClass()}`} />
          <p className={getTextClass()}>Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return null
  }

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
  const displayAvatarUrl = avatarPreview || avatarUrl || user.user_metadata?.avatar_url || null
  const cardStyle = getCardStyle()
  
  return (
    <div className={`flex flex-col ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <header className={`border-b ${getBorderClass()} px-6 py-4 fixed top-0 left-0 right-0 z-50 ${getBgClass()}`}>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className={`w-10 h-10 ${getLogoBg()} ${getLogoText()} ${getRoundedClass('rounded-xl')} flex items-center justify-center font-black text-lg ${mode === 'code' ? 'font-mono' : ''}`}>
              {mode === 'code' ? 'C:\\>' : 'D'}
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className={getNavLinkClass()}>HOME</Link>
              <Link href="/snaps" className={getNavLinkClass()}>SNAPS</Link>
              <Link href="/resources" className={getNavLinkClass()}>RESOURCES</Link>
              <Link href="/work-samples" className={getNavLinkClass()}>WORK</Link>
              <a href="#" className={getNavLinkClass()}>TEAM</a>
              <Link href="/vibes" className={getNavLinkClass()}>VIBES</Link>
              <Link href="/playground" className={getNavLinkClass()}>PLAYGROUND</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-32">
        <div className="flex gap-6">
          {/* Left Sidebar Card - Matching Snaps Page Style */}
          <Card className={`w-80 ${mode === 'chaos' ? 'bg-[#1A5D52]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')} p-6 flex flex-col h-fit overflow-hidden`} style={{ 
            borderColor: mode === 'chaos' ? '#00C896' : mode === 'chill' ? '#C8D961' : '#FFFFFF',
            borderWidth: mode === 'chaos' ? '2px' : mode === 'chill' ? '2px' : '2px'
          }}>
            <div className="mb-6">
              <h3 className={`text-xs uppercase tracking-wider font-black mb-4 ${mode === 'chill' ? 'text-[#4A1818]' : mode === 'chaos' ? 'text-[#00C896]' : 'text-white'}`}>
                ▼ NAVIGATION
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    activeTab === 'profile'
                      ? mode === 'chaos'
                        ? 'bg-[#00C896] text-black'
                        : mode === 'chill'
                        ? 'bg-[#C8D961] text-[#4A1818]'
                        : 'bg-white text-black'
                      : mode === 'chaos'
                      ? 'bg-[#00C896]/30 text-black/80 hover:bg-[#00C896]/50 text-black'
                      : mode === 'chill'
                      ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                      : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">Profile</span>
                </button>
                <button
                  onClick={() => setActiveTab('avatars')}
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    activeTab === 'avatars'
                      ? mode === 'chaos'
                        ? 'bg-[#00C896] text-black'
                        : mode === 'chill'
                        ? 'bg-[#C8D961] text-[#4A1818]'
                        : 'bg-white text-black'
                      : mode === 'chaos'
                      ? 'bg-[#00C896]/30 text-black/80 hover:bg-[#00C896]/50 text-black'
                      : mode === 'chill'
                      ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                      : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">Avatars</span>
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`w-full text-left px-4 py-3 ${getRoundedClass('rounded-xl')} transition-all flex items-center gap-3 ${
                    activeTab === 'activity'
                      ? mode === 'chaos'
                        ? 'bg-[#00C896] text-black'
                        : mode === 'chill'
                        ? 'bg-[#C8D961] text-[#4A1818]'
                        : 'bg-white text-black'
                      : mode === 'chaos'
                      ? 'bg-[#00C896]/30 text-black/80 hover:bg-[#00C896]/50 text-black'
                      : mode === 'chill'
                      ? 'bg-white/30 text-[#4A1818]/60 hover:bg-white/50 text-[#4A1818]'
                      : 'bg-black/40 text-white/60 hover:bg-black/60 text-white'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span className="font-black uppercase text-sm">Activity</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {activeTab === 'profile' && (
              <>
                {/* Header */}
                <div className="mb-6">
                  <h1 className={`text-4xl font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>Profile Settings</h1>
                  <p className={`${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} mt-2`}>
                    Manage your profile information and preferences
                  </p>
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <Card className={`mb-4 p-4 ${getRoundedClass('rounded-xl')} ${mode === 'chaos' ? 'bg-[#2A2A2A] border-2 border-red-500' : mode === 'chill' ? 'bg-[#E8E0D0] border-2 border-red-500' : 'bg-[#1a1a1a] border-2 border-red-500'}`}>
                    <p className={`text-sm ${mode === 'chill' ? 'text-red-600' : 'text-red-400'}`}>{error}</p>
                  </Card>
                )}

                {success && (
                  <Card className={`mb-4 p-4 ${getRoundedClass('rounded-xl')} ${mode === 'chaos' ? 'bg-[#2A2A2A] border-2 border-[#00C896]' : mode === 'chill' ? 'bg-[#E8E0D0] border-2 border-green-500' : 'bg-[#1a1a1a] border-2 border-green-500'}`}>
                    <p className={`text-sm ${mode === 'chill' ? 'text-green-600' : 'text-green-400'}`}>{success}</p>
                  </Card>
                )}

                {/* Form Fields as Cards */}
                <form onSubmit={handleSubmit} className="space-y-2">
                  {/* Row 1: Full Name and Pronouns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-4`}>
                      <Label htmlFor="full-name" className={`text-sm font-semibold mb-2 block ${getFieldCardStyle().label}`}>
                        Full Name
                      </Label>
                      <Input
                        id="full-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className={`w-full ${getInputFieldStyle()}`}
                      />
                    </Card>
                    <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-4`}>
                      <Label htmlFor="pronouns" className={`text-sm font-semibold mb-2 block ${getFieldCardStyle().label}`}>
                        Pronouns
                      </Label>
                      <Input
                        id="pronouns"
                        type="text"
                        value={pronouns}
                        onChange={(e) => setPronouns(e.target.value)}
                        placeholder="e.g., she/her, he/him, they/them"
                        className={`w-full ${getInputFieldStyle()}`}
                      />
                      <p className={`text-xs mt-1 ${getFieldCardStyle().hint}`}>
                        Your pronouns (optional)
                      </p>
                    </Card>
                  </div>

                  {/* Row 2: Bio */}
                  <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-4`}>
                    <Label htmlFor="bio" className={`text-sm font-semibold mb-2 flex items-center gap-2 ${getFieldCardStyle().label}`}>
                      <FileText className="w-4 h-4" />
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className={`w-full min-h-[100px] ${getInputFieldStyle()}`}
                      rows={4}
                    />
                  </Card>

                  {/* Row 3: Birthday and Start Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-4`}>
                      <Label htmlFor="birthday" className={`text-sm font-semibold mb-2 flex items-center gap-2 ${getFieldCardStyle().label}`}>
                        <Calendar className="w-4 h-4" />
                        Birthday
                      </Label>
                      <Input
                        id="birthday"
                        type="text"
                        value={birthday}
                        onChange={(e) => {
                          let value = e.target.value
                          value = value.replace(/[^\d/]/g, '')
                          if (value.length === 2 && !value.includes('/')) {
                            value = value + '/'
                          }
                          if (value.length > 5) {
                            value = value.slice(0, 5)
                          }
                          setBirthday(value)
                        }}
                        placeholder="MM/DD (e.g., 03/15)"
                        maxLength={5}
                        className={`w-full ${getInputFieldStyle()}`}
                      />
                      <p className={`text-xs mt-1 ${getFieldCardStyle().hint}`}>
                        Month and day only (required for horoscope generation)
                      </p>
                    </Card>
                    <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-4`}>
                      <Label htmlFor="start-date" className={`text-sm font-semibold mb-2 flex items-center gap-2 ${getFieldCardStyle().label}`}>
                        <Calendar className="w-4 h-4" />
                        Start Date
                      </Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={`w-full ${getInputFieldStyle()}`}
                      />
                      <p className={`text-xs mt-1 ${getFieldCardStyle().hint}`}>
                        Your start date (month, day, and year)
                      </p>
                    </Card>
                  </div>

                  {/* Row 4: Location and Website */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-4`}>
                      <Label htmlFor="location" className={`text-sm font-semibold mb-2 flex items-center gap-2 ${getFieldCardStyle().label}`}>
                        <MapPin className="w-4 h-4" />
                        Location
                      </Label>
                      <LocationAutocomplete
                        value={location}
                        onChange={setLocation}
                        placeholder="Start typing a city or location..."
                        className={`w-full ${getInputFieldStyle()}`}
                      />
                      <p className={`text-xs mt-1 ${getFieldCardStyle().hint}`}>
                        Start typing to see location suggestions
                      </p>
                    </Card>
                    <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-4`}>
                      <Label htmlFor="website" className={`text-sm font-semibold mb-2 flex items-center gap-2 ${getFieldCardStyle().label}`}>
                        <Globe className="w-4 h-4" />
                        Website
                      </Label>
                      <Input
                        id="website"
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="example.com or https://example.com"
                        className={`w-full ${getInputFieldStyle()}`}
                      />
                      <p className={`text-xs mt-1 ${getFieldCardStyle().hint}`}>
                        Your personal or professional website
                      </p>
                    </Card>
                  </div>

                  {/* Row 5: Discipline and Profile Picture */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-4`}>
                      <Label htmlFor="discipline" className={`text-sm font-semibold mb-2 flex items-center gap-2 ${getFieldCardStyle().label}`}>
                        <Users className="w-4 h-4" />
                        Discipline
                      </Label>
                      <Input
                        id="discipline"
                        type="text"
                        value={discipline}
                        onChange={(e) => setDiscipline(e.target.value)}
                        placeholder="e.g., Design, Engineering, Marketing"
                        className={`w-full ${getInputFieldStyle()}`}
                      />
                      <p className={`text-xs mt-1 ${getFieldCardStyle().hint}`}>
                        Your department or team. This helps personalize your horoscope.
                      </p>
                    </Card>
                    <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-4`}>
                      <Label className={`text-sm font-semibold mb-3 block ${getFieldCardStyle().label}`}>
                        Profile Picture
                      </Label>
                      <div className="flex items-center gap-4">
                        {displayAvatarUrl ? (
                          <img
                            src={displayAvatarUrl}
                            alt={fullName || user.email || 'User'}
                            className={`w-20 h-20 ${getRoundedClass('rounded-full')} object-cover border-2`}
                            style={{ borderColor: mode === 'chaos' ? '#00C896' : mode === 'chill' ? '#C8D961' : '#000000' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : null}
                        <div 
                          className={`avatar-fallback w-20 h-20 ${getRoundedClass('rounded-full')} flex items-center justify-center text-2xl font-semibold border-2 ${displayAvatarUrl ? 'hidden' : ''}`}
                          style={{ 
                            backgroundColor: mode === 'chaos' ? '#00C896' : mode === 'chill' ? '#C8D961' : '#000000',
                            borderColor: mode === 'chaos' ? '#00C896' : mode === 'chill' ? '#C8D961' : '#000000',
                            color: '#FFFFFF'
                          }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className={`${mode === 'chaos' ? 'border-[#00C896] text-[#00C896] hover:bg-[#00C896]/10' : mode === 'chill' ? 'border-[#C8D961] text-[#C8D961] hover:bg-[#C8D961]/10' : 'border-black text-black hover:bg-black/10'}`}
                          >
                            {uploading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Photo
                              </>
                            )}
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <p className={`text-xs mt-2 ${getFieldCardStyle().hint}`}>
                            JPG, PNG or GIF. Max size 5MB
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                  
                  {/* Save Button Card */}
                  <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-4`}>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/')}
                        className={`${mode === 'chaos' ? 'border-[#00C896] text-[#00C896] hover:bg-[#00C896]/10' : mode === 'chill' ? 'border-[#C8D961] text-[#C8D961] hover:bg-[#C8D961]/10' : 'border-black text-black hover:bg-black/10'}`}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        className={`${mode === 'chaos' ? 'bg-[#00C896] text-black hover:bg-[#00C896]/80' : mode === 'chill' ? 'bg-[#C8D961] text-[#4A1818] hover:bg-[#C8D961]/80' : 'bg-black text-white hover:bg-black/80'}`}
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
                  </Card>
                </form>
              </>
            )}

            {activeTab === 'avatars' && (
              <>
                <div className="mb-6">
                  <h1 className={`text-4xl font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>Historical Avatars</h1>
                  <p className={`${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} mt-2`}>
                    AI-generated horoscope avatars you can download
                  </p>
                </div>

                {loadingAvatars ? (
                  <Card className={`bg-white ${getRoundedClass('rounded-xl')} p-12 shadow-sm`}>
                    <div className="flex items-center justify-center">
                      <Loader2 className={`w-6 h-6 animate-spin ${mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                    </div>
                  </Card>
                ) : avatarGallery.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {avatarGallery.map((avatar) => (
                      <Card
                        key={avatar.id}
                        className={`bg-white ${getRoundedClass('rounded-xl')} p-2 shadow-sm relative group overflow-hidden`}
                      >
                        <img
                          src={avatar.url}
                          alt={`Horoscope avatar ${avatar.date}`}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${getRoundedClass('rounded-xl')}`}>
                          <Button
                            size="sm"
                            onClick={() => handleDownloadAvatar(avatar.url, avatar.date)}
                            className={`${mode === 'chaos' ? 'bg-[#00C896] text-black hover:bg-[#00C896]/80' : mode === 'chill' ? 'bg-[#C8D961] text-[#4A1818] hover:bg-[#C8D961]/80' : 'bg-black text-white hover:bg-black/80'}`}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        <div className={`absolute top-2 left-2 px-2 py-1 ${getRoundedClass('rounded-md')} text-xs font-bold ${
                          mode === 'chaos' ? 'bg-[#00C896] text-black' : 
                          mode === 'chill' ? 'bg-[#C8D961] text-[#4A1818]' : 
                          'bg-black text-white'
                        }`}>
                          {new Date(avatar.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className={`bg-white ${getRoundedClass('rounded-xl')} p-12 shadow-sm text-center`}>
                    <Sparkles className={`w-12 h-12 mx-auto mb-4 opacity-50 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                    <p className={mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}>
                      No avatars found. Generate a horoscope on the dashboard to see your avatars here.
                    </p>
                  </Card>
                )}
              </>
            )}

            {activeTab === 'activity' && (
              <>
                <div className="mb-6">
                  <h1 className={`text-4xl font-black uppercase ${mode === 'chill' ? 'text-[#4A1818]' : 'text-white'}`}>Your Activity</h1>
                  <p className={`${mode === 'chill' ? 'text-[#4A1818]/70' : 'text-white/70'} mt-2`}>
                    All your contributions and submissions
                  </p>
                </div>

                {loadingActivity ? (
                  <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-12`}>
                    <div className="flex items-center justify-center">
                      <Loader2 className={`w-6 h-6 animate-spin ${getFieldCardStyle().text}`} />
                    </div>
                  </Card>
                ) : activities.length > 0 ? (
                  (() => {
                    // Group activities by type
                    const groupedActivities = activities.reduce((acc, activity) => {
                      if (!acc[activity.type]) {
                        acc[activity.type] = []
                      }
                      acc[activity.type].push(activity)
                      return acc
                    }, {} as Record<string, typeof activities>)

                    // Define type order and labels
                    const typeOrder = ['snap', 'work_sample', 'pipeline_project']
                    const typeLabels = {
                      snap: 'Snaps',
                      work_sample: 'Work Samples',
                      pipeline_project: 'Pipeline Projects'
                    }
                    const typeIcons = {
                      snap: Sparkles,
                      work_sample: FileText,
                      pipeline_project: Briefcase
                    }

                    return (
                      <div className="space-y-6">
                        {typeOrder.map((type) => {
                          const typeActivities = groupedActivities[type] || []
                          if (typeActivities.length === 0) return null

                          const IconComponent = typeIcons[type as keyof typeof typeIcons]

                          return (
                            <div key={type} className="space-y-2">
                              {/* Section Header */}
                              <div className="flex items-center gap-3 mb-3">
                                <IconComponent className={`w-5 h-5 ${getFieldCardStyle().text}`} />
                                <h2 className={`text-xl font-black uppercase ${getFieldCardStyle().text}`}>
                                  {typeLabels[type as keyof typeof typeLabels]} ({typeActivities.length})
                                </h2>
                              </div>
                              {/* Activities in this group */}
                              {typeActivities.map((activity) => (
                                <Card
                                  key={`${activity.type}-${activity.id}`}
                                  className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-4`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs ${getFieldCardStyle().hint}`}>
                                          {new Date(activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                      </div>
                                      <h3 className={`font-bold ${getFieldCardStyle().text} mb-1`}>{activity.title}</h3>
                                      {activity.description && (
                                        <p className={`text-sm ${getFieldCardStyle().hint} line-clamp-2`}>{activity.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()
                ) : (
                  <Card className={`${getFieldCardStyle().bg} ${getFieldCardStyle().border} ${getRoundedClass('rounded-xl')} p-12 text-center`}>
                    <Activity className={`w-12 h-12 mx-auto mb-4 opacity-50 ${getFieldCardStyle().text}`} />
                    <p className={getFieldCardStyle().text}>
                      No activity yet. Start contributing to see your activity here.
                    </p>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
        
        <Footer />
      </main>
    </div>
  )
}
