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
import { Loader2, Calendar, Briefcase, Users, Upload, MapPin, Globe, FileText, Download, Image as ImageIcon, User, Activity, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { LocationAutocomplete } from '@/components/location-autocomplete'
import { SiteHeader } from '@/components/site-header'
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

  const getRoundedClass = (base: string) => {
    if (mode === 'code') return 'rounded-none'
    // For rounded-[2.5rem] or similar, keep it to match the rest of the site (like snaps page)
    if (base.includes('rounded-[')) {
      return base // Keep the original rounded class to match site styling
    }
    // For simple 'rounded' classes, do the replacement
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    return base
  }

  const getNavItemStyle = (isActive: boolean) => {
    if (isActive) {
      switch (mode) {
        case 'chaos': return 'bg-[#C4F500] text-black'
        case 'chill': return 'bg-[#FFC043] text-[#4A1818]'
        case 'code': return 'bg-[#FFFFFF] text-black'
        default: return 'bg-primary text-primary-foreground'
      }
    } else {
      return `${getTextClass()}/60 hover:${getTextClass()} hover:bg-black/10`
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
    } else { // code
      return { 
        bg: 'bg-[#000000]', 
        border: 'border border-[#FFFFFF]', 
        text: 'text-[#FFFFFF]', 
        accent: '#FFFFFF' 
      }
    }
  }

  const getFieldCardStyle = () => {
    if (mode === 'chaos') {
      return {
        bg: 'bg-[#000000]',
        border: 'border border-[#C4F500]',
        text: 'text-white',
        label: 'text-white',
        hint: 'text-white/60'
      }
    } else if (mode === 'chill') {
      return {
        bg: 'bg-white',
        border: 'border border-[#FFC043]/30',
        text: 'text-[#4A1818]',
        label: 'text-[#4A1818]',
        hint: 'text-[#4A1818]/60'
      }
    } else {
      return {
        bg: 'bg-[#000000]',
        border: 'border border-[#FFFFFF]',
        text: 'text-white',
        label: 'text-white',
        hint: 'text-white/60'
      }
    }
  }

  const getInputFieldStyle = () => {
    if (mode === 'chaos') {
      return 'bg-[#1A1A1A] border-[#C4F500] text-white placeholder:text-gray-400 focus:border-[#C4F500] focus:ring-[#C4F500]'
    } else if (mode === 'chill') {
      return 'bg-[#F5E6D3] border-[#FFC043]/30 text-[#4A1818] placeholder:text-[#4A1818]/40 focus:border-[#FFC043] focus:ring-[#FFC043]'
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
    for_who?: string
  }>>([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [expandedActivityTypes, setExpandedActivityTypes] = useState<Set<string>>(new Set())
  
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
          console.log('Avatar gallery API response:', result)
          console.log(`Received ${result.data?.length || 0} avatars`)
          if (result.data) {
            result.data.forEach((avatar: any, index: number) => {
              console.log(`Avatar ${index + 1}:`, {
                id: avatar.id,
                date: avatar.date,
                generated_at: avatar.generated_at,
                has_url: !!avatar.url,
                url_length: avatar.url?.length || 0
              })
            })
          }
          setAvatarGallery(result.data || [])
        } else {
          const errorData = await response.json()
          console.error('Avatar gallery API error:', response.status, errorData)
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
      <SiteHeader />

      <main className="max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24">
        <div className="flex gap-6">
          {/* Left Sidebar Card - Matching Admin Panel Style */}
          <Card className={`w-1/4 ${mode === 'chaos' ? 'bg-[#1A5D52]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')} p-4 flex flex-col sticky top-24 h-fit`} style={{ 
            borderColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF',
            borderWidth: mode === 'chaos' ? '2px' : '0px'
          }}>
            <div className="mb-4">
              <h1 className={`text-xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Profile</h1>
            </div>
            
            {/* Navigation */}
            <nav className="space-y-0.5 flex-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-2 py-1.5 ${getRoundedClass('rounded-lg')} transition-colors flex items-center gap-2 text-xs ${
                  getNavItemStyle(activeTab === 'profile')
                }`}
                style={{
                  borderRadius: mode === 'code' ? '0' : mode === 'chaos' ? '1.5rem' : mode === 'chill' ? '1rem' : '0.5rem'
                }}
              >
                <User className="w-3.5 h-3.5" />
                <span className="font-medium uppercase tracking-wider text-xs">Profile</span>
              </button>
              <button
                onClick={() => setActiveTab('avatars')}
                className={`w-full text-left px-2 py-1.5 ${getRoundedClass('rounded-lg')} transition-colors flex items-center gap-2 text-xs ${
                  getNavItemStyle(activeTab === 'avatars')
                }`}
                style={{
                  borderRadius: mode === 'code' ? '0' : mode === 'chaos' ? '1.5rem' : mode === 'chill' ? '1rem' : '0.5rem'
                }}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="font-medium uppercase tracking-wider text-xs">Avatars</span>
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`w-full text-left px-2 py-1.5 ${getRoundedClass('rounded-lg')} transition-colors flex items-center gap-2 text-xs ${
                  getNavItemStyle(activeTab === 'activity')
                }`}
                style={{
                  borderRadius: mode === 'code' ? '0' : mode === 'chaos' ? '1.5rem' : mode === 'chill' ? '1rem' : '0.5rem'
                }}
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="font-medium uppercase tracking-wider text-xs">Activity</span>
              </button>
            </nav>
          </Card>

          {/* Right Content Area - 3/4 width */}
          <div className="w-3/4">
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
                  <Card className={`mb-4 p-4 ${getRoundedClass('rounded-xl')} ${mode === 'chaos' ? 'bg-[#000000] border border-red-500' : mode === 'chill' ? 'bg-white border border-red-500' : 'bg-[#000000] border border-red-500'}`}>
                    <p className={`text-sm ${mode === 'chill' ? 'text-red-600' : 'text-red-400'}`}>{error}</p>
                  </Card>
                )}

                {success && (
                  <Card className={`mb-4 p-4 ${getRoundedClass('rounded-xl')} ${mode === 'chaos' ? 'bg-[#000000] border border-[#C4F500]' : mode === 'chill' ? 'bg-white border border-green-500' : 'bg-[#000000] border border-green-500'}`}>
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
                            style={{ borderColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#000000' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : null}
                        <div 
                          className={`avatar-fallback w-20 h-20 ${getRoundedClass('rounded-full')} flex items-center justify-center text-2xl font-semibold border-2 ${displayAvatarUrl ? 'hidden' : ''}`}
                          style={{ 
                            backgroundColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#000000',
                            borderColor: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#000000',
                            color: mode === 'chaos' ? '#000000' : mode === 'chill' ? '#4A1818' : '#FFFFFF'
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
                            className={`${mode === 'chaos' ? 'border-[#C4F500] text-[#C4F500] hover:bg-[#C4F500]/10' : mode === 'chill' ? 'border-[#FFC043] text-[#FFC043] hover:bg-[#FFC043]/10' : 'border-black text-black hover:bg-black/10'}`}
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
                        className={`${mode === 'chaos' ? 'border-[#C4F500] text-[#C4F500] hover:bg-[#C4F500]/10' : mode === 'chill' ? 'border-[#FFC043] text-[#FFC043] hover:bg-[#FFC043]/10' : 'border-black text-black hover:bg-black/10'}`}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        className={`${mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' : mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' : 'bg-black text-white hover:bg-black/80'}`}
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
                            className={`${mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' : mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' : 'bg-black text-white hover:bg-black/80'}`}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        <div className={`absolute top-2 left-2 px-2 py-1 ${getRoundedClass('rounded-md')} text-xs font-bold ${
                          mode === 'chaos' ? 'bg-[#C4F500] text-black' : 
                          mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818]' : 
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

                    const toggleActivityType = (type: string) => {
                      setExpandedActivityTypes(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has(type)) {
                          newSet.delete(type)
                        } else {
                          newSet.add(type)
                        }
                        return newSet
                      })
                    }

                    return (
                      <div className="space-y-4">
                        {typeOrder.map((type) => {
                          const typeActivities = groupedActivities[type] || []
                          if (typeActivities.length === 0) return null

                          const IconComponent = typeIcons[type as keyof typeof typeIcons]
                          const isExpanded = expandedActivityTypes.has(type)

                          return (
                            <div key={type} className="space-y-2">
                              {/* Section Header - Clickable */}
                              <button
                                onClick={() => toggleActivityType(type)}
                                className="w-full flex items-center gap-3 mb-2 hover:opacity-80 transition-opacity"
                              >
                                <IconComponent className={`w-5 h-5 ${getFieldCardStyle().text}`} />
                                <h2 className={`text-xl font-black uppercase ${getFieldCardStyle().text} flex-1 text-left`}>
                                  {typeLabels[type as keyof typeof typeLabels]} ({typeActivities.length})
                                </h2>
                                {isExpanded ? (
                                  <ChevronUp className={`w-5 h-5 ${getFieldCardStyle().text}`} />
                                ) : (
                                  <ChevronDown className={`w-5 h-5 ${getFieldCardStyle().text}`} />
                                )}
                              </button>
                              {/* Activities in this group - Collapsible */}
                              {isExpanded && (
                                <div className="space-y-2">
                                  {typeActivities.map((activity) => {
                                    const dateStr = new Date(activity.date || activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                    
                                    // For snaps, display as: date - snap text (for who)
                                    if (activity.type === 'snap') {
                                      const forWho = activity.for_who || 'Team'
                                      return (
                                        <div
                                          key={`${activity.type}-${activity.id}`}
                                          className="py-2 border-b border-gray-600/30 last:border-b-0"
                                        >
                                          <p className={`text-sm ${getFieldCardStyle().text}`}>
                                            {dateStr} - {activity.description}{' '}
                                            <span className={`${getFieldCardStyle().hint} font-normal`}>
                                              (for {forWho})
                                            </span>
                                          </p>
                                        </div>
                                      )
                                    }
                                    
                                    // For work samples, display as: date - project_name - description
                                    if (activity.type === 'work_sample') {
                                      return (
                                        <div
                                          key={`${activity.type}-${activity.id}`}
                                          className="py-2 border-b border-gray-600/30 last:border-b-0"
                                        >
                                          <p className={`text-sm ${getFieldCardStyle().text}`}>
                                            {dateStr} - {activity.title}
                                            {activity.description && (
                                              <>
                                                {' '}-{' '}
                                                <span className={`${getFieldCardStyle().hint} font-normal`}>
                                                  {activity.description}
                                                </span>
                                              </>
                                            )}
                                          </p>
                                        </div>
                                      )
                                    }
                                    
                                    // For pipeline projects, display as: date - name - description
                                    if (activity.type === 'pipeline_project') {
                                      return (
                                        <div
                                          key={`${activity.type}-${activity.id}`}
                                          className="py-2 border-b border-gray-600/30 last:border-b-0"
                                        >
                                          <p className={`text-sm ${getFieldCardStyle().text}`}>
                                            {dateStr} - {activity.title}
                                            {activity.description && (
                                              <>
                                                {' '}-{' '}
                                                <span className={`${getFieldCardStyle().hint} font-normal`}>
                                                  {activity.description}
                                                </span>
                                              </>
                                            )}
                                          </p>
                                        </div>
                                      )
                                    }
                                    
                                    // Fallback for any other activity types
                                    return (
                                      <div
                                        key={`${activity.type}-${activity.id}`}
                                        className="py-2 border-b border-gray-600/30 last:border-b-0"
                                      >
                                        <p className={`text-sm ${getFieldCardStyle().text}`}>
                                          {dateStr} - {activity.title}
                                          {activity.description && (
                                            <>
                                              {' '}-{' '}
                                              <span className={`${getFieldCardStyle().hint} font-normal`}>
                                                {activity.description}
                                              </span>
                                            </>
                                          )}
                                        </p>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
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
