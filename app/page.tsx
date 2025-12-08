'use client'

import { Search, Calendar, Music, FileText, MessageSquare, Trophy, TrendingUp, Users, Zap, Star, Heart, Coffee, Lightbulb, ChevronRight, ChevronLeft, Play, Pause, CheckCircle, Clock, ArrowRight, Video, Sparkles, Loader2, Download, Bot, Info, ExternalLink, User, ChevronDown, ChevronUp, Plus, Check, RefreshCw, PartyPopper, Briefcase, Hand, Cpu, Palette } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useMode } from "@/contexts/mode-context"
import { useAuth } from "@/contexts/auth-context"
import { usePermissions } from "@/contexts/permissions-context"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { getStarSignEmoji } from '@/lib/horoscope-utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { generateSillyCharacterName } from '@/lib/silly-names'
import { SpotifyPlayer } from '@/components/spotify-player'
import { AudioEQ } from '@/components/audio-eq'
import { PlaylistData } from '@/lib/spotify-player-types'
import { ProfileSetupModal } from '@/components/profile-setup-modal'
import { createClient } from '@/lib/supabase/client'
import { AddSnapDialog } from '@/components/add-snap-dialog'
import { Chatbot } from '@/components/chatbot'
import { useGoogleCalendarToken } from '@/hooks/useGoogleCalendarToken'
import { TeamPulseCard } from '@/components/team-pulse-card'
import { Footer } from '@/components/footer'
import { BeastBabeCard } from '@/components/beast-babe-card'
import { VideoEmbed } from '@/components/video-embed'
import Image from 'next/image'

// Force dynamic rendering to avoid SSR issues with context
export const dynamic = 'force-dynamic'

export default function TeamDashboard() {
  const { mode } = useMode()
  const { user, loading: authLoading, signOut } = useAuth()
  const { permissions } = usePermissions()
  const router = useRouter()
  
  // Check if user is admin (can manage horoscopes)
  const isAdmin = permissions?.canManageHoroscopes || false

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }
  const [horoscope, setHoroscope] = useState<{
    star_sign: string
    horoscope_text: string
    horoscope_dos?: string[]
    horoscope_donts?: string[]
    character_name?: string | null
  } | null>(null)
  const [workSamples, setWorkSamples] = useState<Array<{
    id: string
    project_name: string
    description: string
    type?: { name: string } | null
    author?: { full_name?: string; email?: string } | null
    client?: string | null
    date: string
    thumbnail_url?: string | null
    file_url?: string | null
    file_link?: string | null
    pitch_won?: boolean | null
  }>>([])
  const [workSamplesSearchQuery, setWorkSamplesSearchQuery] = useState('')
  const [resourcesSearchQuery, setResourcesSearchQuery] = useState('')
  const [universalSearchQuery, setUniversalSearchQuery] = useState('')
  const [universalSearchResults, setUniversalSearchResults] = useState<Array<{
    type: string
    id: string
    title: string
    description?: string
    url?: string
    metadata?: Record<string, any>
    score: number
  }>>([])
  const [universalSearchLoading, setUniversalSearchLoading] = useState(false)
  const [universalSearchHasSearched, setUniversalSearchHasSearched] = useState(false)
  const universalSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [horoscopeImage, setHoroscopeImage] = useState<string | null>(null)
  const [horoscopeImagePrompt, setHoroscopeImagePrompt] = useState<string | null>(null)
  const [horoscopeImageSlots, setHoroscopeImageSlots] = useState<any>(null)
  const [horoscopeImageSlotsLabels, setHoroscopeImageSlotsLabels] = useState<any>(null)
  const [horoscopeImageSlotsReasoning, setHoroscopeImageSlotsReasoning] = useState<any>(null)
  const [horoscopeLoading, setHoroscopeLoading] = useState(true)
  const [horoscopeImageLoading, setHoroscopeImageLoading] = useState(true)
  const [horoscopeError, setHoroscopeError] = useState<string | null>(null)
  const [horoscopeImageError, setHoroscopeImageError] = useState<string | null>(null)
  
  // Rotating loading messages
  const horoscopeLoadingMessages = [
    'Consulting the cosmos...',
    'Reading the stars...',
    'Channeling universal wisdom...',
    'Aligning with celestial frequencies...',
    'Decoding cosmic signals...',
    'Tuning into the universe...',
    'Receiving astral guidance...',
    'Translating stellar messages...',
  ]
  
  const imageLoadingMessages = [
    'Scanning your vibe...',
    'Conducting a competitive audit...',
    'Analyzing your energy signature...',
    'Running a vibe check...',
    'Assessing your aura...',
    'Measuring your frequency...',
    'Calibrating your energy output...',
    'Mapping your energetic landscape...',
  ]
  
  const [horoscopeLoadingMessageIndex, setHoroscopeLoadingMessageIndex] = useState(0)
  const [imageLoadingMessageIndex, setImageLoadingMessageIndex] = useState(0)
  const [userName, setUserName] = useState<string>('Friend')
  const [userFirstName, setUserFirstName] = useState<string>('')
  const [temperature, setTemperature] = useState<string | null>(null)
  const [weatherCondition, setWeatherCondition] = useState<string | null>(null)
  const [characterName, setCharacterName] = useState<string | null>(null)
  const [userTimeZone, setUserTimeZone] = useState<string | null>(null)
  const [timeZones, setTimeZones] = useState<Array<{ label: string; city: string; time: string; offset: number }>>([])
  const [todayDate, setTodayDate] = useState<string>('')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)
  const [snaps, setSnaps] = useState<Array<{
    id: string
    date: string
    snap_content: string
    mentioned: string | null
    submitted_by_profile: {
      full_name: string | null
      email: string | null
      avatar_url: string | null
    } | null
    mentioned_user_profile: {
      full_name: string | null
      email: string | null
      avatar_url: string | null
    } | null
    recipients?: Array<{
      user_id: string
      recipient_profile: {
        full_name: string | null
        email: string | null
        avatar_url: string | null
      } | null
    }>
  }>>([])
  const [snapViewType, setSnapViewType] = useState<'received' | 'given'>('received')
  const [showAddSnapDialog, setShowAddSnapDialog] = useState(false)
  const [showChatbot, setShowChatbot] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<Array<{
    id: string
    summary: string
    start: { dateTime?: string; date?: string }
    end: { dateTime?: string; date?: string }
    location?: string
    description?: string
    calendarId: string
    calendarName?: string
  }>>([])
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const [eventsExpanded, setEventsExpanded] = useState(false)
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null)
  const [pipelineData, setPipelineData] = useState<Array<{
    id: string
    name: string
    type: string | null
    description: string | null
    due_date: string | null
    lead: string | null
    notes: string | null
    status: string
    team: string | null
    url: string | null
    tier: number | null
    pitch_won: boolean | null
    updated_at: string | null
  }>>([])
  const [pipelineLoading, setPipelineLoading] = useState(true)
  const [selectedPipelineProject, setSelectedPipelineProject] = useState<typeof pipelineData[0] | null>(null)
  const [isPipelineDialogOpen, setIsPipelineDialogOpen] = useState(false)
  const [completedFilter, setCompletedFilter] = useState<'Pending Decision' | 'Won' | 'Lost'>('Pending Decision')
  const [thisWeekStats, setThisWeekStats] = useState<Array<{
    position: number
    title: string
    value: string
  }>>([])
  const [thisWeekStatsLoading, setThisWeekStatsLoading] = useState(true)
  const [weeklyPlaylist, setWeeklyPlaylist] = useState<{
    id: string
    date: string
    title: string | null
    curator: string
    curator_photo_url: string | null
    cover_url: string | null
    description: string | null
    spotify_url: string
    total_duration?: string | null
    track_count?: number | null
    artists_list?: string | null
  } | null>(null)
  const [playlistLoading, setPlaylistLoading] = useState(true)
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false)
  const [latestMustReads, setLatestMustReads] = useState<Array<{
    id: string
    article_title: string
    article_url: string
    created_at: string
    pinned: boolean
    category: string | null
  }>>([])
  const [mustReadsLoading, setMustReadsLoading] = useState(true)
  const [lastVisitTime, setLastVisitTime] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('this-week')
  const [allMustReads, setAllMustReads] = useState<Array<{
    id: string
    article_title: string
    article_url: string
    created_at: string
    pinned: boolean
    category: string | null
  }>>([])
  const [quickLinks, setQuickLinks] = useState<Array<{
    id: string
    label: string
    url: string
    icon_name: string | null
    password: string | null
    display_order: number
    is_active: boolean
  }>>([])
  const [quickLinksLoading, setQuickLinksLoading] = useState(true)
  const [profiles, setProfiles] = useState<Array<{
    id: string
    full_name: string | null
    birthday: string | null
    start_date: string | null
  }>>([])
  const [videos, setVideos] = useState<Array<{
    id: string
    title: string
    video_url: string
    thumbnail_url: string | null
    platform: string | null
    pinned: boolean
    created_at: string
  }>>([])
  const [videosLoading, setVideosLoading] = useState(true)
  const [dailyNews, setDailyNews] = useState<Array<{
    id: string
    title: string
    content: string
    date: string
    created_at: string
  }>>([])
  
  // Get Google Calendar access token using refresh tokens
  const { accessToken: googleCalendarToken, loading: tokenLoading, error: tokenError, refreshToken: refreshCalendarToken, needsAuth, initiateAuth } = useGoogleCalendarToken()

  // Rotate loading messages while loading
  useEffect(() => {
    if (horoscopeLoading) {
      const interval = setInterval(() => {
        setHoroscopeLoadingMessageIndex((prev) => (prev + 1) % horoscopeLoadingMessages.length)
      }, 2000) // Change message every 2 seconds
      return () => clearInterval(interval)
    }
  }, [horoscopeLoading, horoscopeLoadingMessages.length])

  useEffect(() => {
    if (horoscopeImageLoading) {
      const interval = setInterval(() => {
        setImageLoadingMessageIndex((prev) => (prev + 1) % imageLoadingMessages.length)
      }, 2000) // Change message every 2 seconds
      return () => clearInterval(interval)
    }
  }, [horoscopeImageLoading, imageLoadingMessages.length])

  // Calendar IDs - can be hardcoded or dynamically fetched
  const [calendarIds, setCalendarIds] = useState<string[]>([
    'codeandtheory.com_6elnqlt8ok3kmcpim2vge0qqqk@group.calendar.google.com', // Out of office 1
    'codeandtheory.com_ojeuiov0bhit2k17g8d6gj4i68@group.calendar.google.com', // Out of office 2
    'codeandtheory.com_5b18ulcjgibgffc35hbtmv6sfs@group.calendar.google.com', // Office events
    'en.usa#holiday@group.v.calendar.google.com', // Holidays
    'c_6236655ee40ad4fcbedc4e96ce72c39783f27645dbdd22714ca9bc90fcc551ac@group.calendar.google.com', // Strategy team
  ])
  const [userCalendars, setUserCalendars] = useState<Array<{
    id: string
    summary: string
    selected?: boolean
  }>>([])
  // Set to false to use only the hardcoded calendar IDs (OOO, Holidays, Strategy team, Office events)
  // We're not using dynamic calendars to avoid personal calendars
  const [useDynamicCalendars, setUseDynamicCalendars] = useState(false)

  // Handle OAuth callback redirects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const calendarAuth = params.get('calendar_auth')
      
      if (calendarAuth === 'success') {
        // Successfully authenticated, clear URL params and trigger token refresh
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('calendar_auth')
        newUrl.searchParams.delete('error')
        window.history.replaceState({}, '', newUrl.toString())
        
        // Trigger token refresh to get the new access token
        if (refreshCalendarToken) {
          setTimeout(() => {
            refreshCalendarToken()
          }, 1000)
        }
      } else if (calendarAuth === 'error') {
        // Authentication failed, show error message
        const error = params.get('error') || 'Failed to authenticate with Google Calendar'
        console.error('Calendar authentication error:', error)
        
        // Clear URL params
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('calendar_auth')
        newUrl.searchParams.delete('error')
        window.history.replaceState({}, '', newUrl.toString())
      }
      
      // Check if we just authenticated and need to get calendar refresh token
      const needsRefreshToken = params.get('needs_calendar_refresh_token')
      const justAuthenticated = params.get('just_authenticated')
      
      if (justAuthenticated === 'true') {
        // Set flag in sessionStorage so useGoogleCalendarToken can detect it
        sessionStorage.setItem('just_authenticated', 'true')
        sessionStorage.setItem('auth_timestamp', Date.now().toString())
        // Remove the query parameter from URL without reload
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('just_authenticated')
        window.history.replaceState({}, '', newUrl.toString())
      }
      
      // If we need a refresh token and don't have one, automatically trigger calendar OAuth
      if (needsRefreshToken === 'true' && !googleCalendarToken && !tokenLoading && needsAuth && initiateAuth) {
        console.log('🔄 Just authenticated with Google, automatically requesting calendar refresh token...')
        // Clear the URL parameter
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('needs_calendar_refresh_token')
        window.history.replaceState({}, '', newUrl.toString())
        
        // Wait a bit for the session to be fully established, then trigger calendar OAuth
        setTimeout(() => {
          if (initiateAuth) {
            console.log('🚀 Initiating calendar OAuth to get refresh token...')
            initiateAuth()
          }
        }, 2000) // Wait 2 seconds for session to be ready
      }
    }
  }, [refreshCalendarToken, googleCalendarToken, tokenLoading, needsAuth, initiateAuth])

  // Format today's date in user's timezone
  useEffect(() => {
    const updateDate = () => {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      setTodayDate(formatter.format(now))
    }
    
    updateDate()
    // Update every minute to keep it current (though date rarely changes)
    const interval = setInterval(updateDate, 60000)
    return () => clearInterval(interval)
  }, [])

  // Track current hour to trigger gradient updates
  const [currentHour, setCurrentHour] = useState(new Date().getHours())
  useEffect(() => {
    const updateHour = () => {
      setCurrentHour(new Date().getHours())
    }
    
    updateHour()
    // Update every hour to trigger gradient changes at time boundaries
    // Also check every 5 minutes to catch transitions more smoothly
    const interval = setInterval(updateHour, 5 * 60000)
    return () => clearInterval(interval)
  }, [])
  
  // Detect user timezone and calculate timezone times
  useEffect(() => {
    async function detectTimezone() {
      let detectedTz: string | null = null
      
      // First, try to get timezone from profile (fallback)
      if (user) {
        try {
          const supabase = createClient()
          const { data: profile } = await supabase
            .from('profiles')
            .select('timezone')
            .eq('id', user.id)
            .maybeSingle()
          
          if (profile?.timezone) {
            // Map profile timezone to our labels
            const tzMap: Record<string, string> = {
              'America/Los_Angeles': 'PST',
              'America/Denver': 'MST',
              'America/Chicago': 'CST',
              'America/New_York': 'EST',
              'Europe/London': 'GMT',
              'Asia/Kolkata': 'IST',
              'Asia/Manila': 'PHT',
            }
            
            for (const [tz, label] of Object.entries(tzMap)) {
              if (profile.timezone.includes(tz.split('/')[1]) || profile.timezone === tz) {
                detectedTz = label
                break
              }
            }
          }
        } catch (error) {
          console.error('Error fetching profile timezone:', error)
        }
      }
      
      // If no profile timezone, use browser timezone
      if (!detectedTz) {
        try {
          const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone
          // Map common timezone names to our timezone labels
          const tzMap: Record<string, string> = {
            'America/Los_Angeles': 'PST',
            'America/Denver': 'MST',
            'America/Chicago': 'CST',
            'America/New_York': 'EST',
            'Europe/London': 'GMT',
            'Asia/Kolkata': 'IST',
            'Asia/Manila': 'PHT',
          }
          
          // Find matching timezone
          for (const [tz, label] of Object.entries(tzMap)) {
            if (userTz.includes(tz.split('/')[1]) || userTz === tz) {
              detectedTz = label
              break
            }
          }
          
          // If no exact match, try to infer from offset
          if (!detectedTz) {
            const now = new Date()
            const userOffset = -now.getTimezoneOffset() / 60 // Convert to hours
            const offsetMap: Record<string, string> = {
              '-8': 'PST', '-7': 'MST', '-6': 'CST', '-5': 'EST', '0': 'GMT', '5.5': 'IST', '8': 'PHT'
            }
            // Find closest match
            const closest = Object.entries(offsetMap).reduce((prev, [offset, label]) => {
              const diff = Math.abs(parseFloat(offset) - userOffset)
              const prevDiff = Math.abs(parseFloat(prev[0]) - userOffset)
              return diff < prevDiff ? [offset, label] : prev
            }, ['0', 'GMT'])
            detectedTz = closest[1]
          }
        } catch (error) {
          console.error('Error detecting timezone:', error)
        }
      }
      
      if (detectedTz) {
        setUserTimeZone(detectedTz)
      }
    }
    
    detectTimezone()
    
    // Calculate times for each timezone
    const timeZonesData = [
      { label: 'PST', city: 'Los Angeles', offset: -8 },
      { label: 'MST', city: 'Colorado', offset: -7 },
      { label: 'CST', city: 'Chicago', offset: -6 },
      { label: 'EST', city: 'NYC', offset: -5 },
      { label: 'GMT', city: 'London', offset: 0 },
      { label: 'IST', city: 'India', offset: 5.5 },
      { label: 'PHT', city: 'Manila', offset: 8 },
    ]
    
    const updateTimes = () => {
      const now = new Date()
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
      
      const times = timeZonesData.map(tz => {
        const localTime = new Date(utc + (tz.offset * 3600000))
        const hours = localTime.getHours()
        const minutes = localTime.getMinutes()
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours % 12 || 12
        const displayMinutes = minutes.toString().padStart(2, '0')
        return {
          ...tz,
          time: `${displayHours}:${displayMinutes} ${ampm}`,
        }
      })
      
      setTimeZones(times)
    }
    
    updateTimes()
    const interval = setInterval(updateTimes, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [userTimeZone, user])
  
  // Check if profile needs to be set up (only for users missing required details)
  useEffect(() => {
    async function checkProfileSetup() {
      if (!user || profileChecked) return
      
      try {
        const supabase = createClient()
        const { data: profile } = await supabase
          .from('profiles')
          .select('birthday')
          .eq('id', user.id)
          .maybeSingle()
        
        // Only show modal if profile is incomplete (missing birthday - the only required field)
        // Users who already have their details set up won't see the modal
        if (!profile || !profile.birthday) {
          setShowProfileModal(true)
        }
        setProfileChecked(true)
      } catch (err) {
        console.error('Error checking profile:', err)
        setProfileChecked(true)
      }
    }
    
    if (user && !authLoading) {
      checkProfileSetup()
    }
  }, [user, authLoading, profileChecked])

  // Fetch user's first name from profile
  useEffect(() => {
    async function fetchUserFirstName() {
      if (!user) {
        setUserFirstName('')
        return
      }
      
      try {
        const supabase = createClient()
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()
        
        const fullName = profile?.full_name || user.user_metadata?.full_name || user.email || ''
        // Extract first name
        const firstName = fullName.split(' ')[0] || fullName || ''
        setUserFirstName(firstName)
      } catch (err) {
        console.error('Error fetching user first name:', err)
        setUserFirstName('')
      }
    }
    
    if (user && !authLoading) {
      fetchUserFirstName()
    }
  }, [user, authLoading])

  // Fetch weather based on user's location
  useEffect(() => {
    async function fetchWeather() {
      if (!user) {
        setTemperature(null)
        setWeatherCondition(null)
        return
      }
      
      try {
        const supabase = createClient()
        const { data: profile } = await supabase
          .from('profiles')
          .select('location')
          .eq('id', user.id)
          .maybeSingle()
        
        if (!profile?.location) {
          setTemperature(null)
        setWeatherCondition(null)
          return
        }
        
        // Try to get coordinates from location string
        // First, try to geocode the location
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(profile.location)}&limit=1`,
          {
            headers: {
              'User-Agent': 'Strategy Dashboard App'
            }
          }
        )
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json()
          if (geocodeData && geocodeData.length > 0) {
            const lat = geocodeData[0].lat
            const lon = geocodeData[0].lon
            
            // Fetch weather using coordinates
            const weatherResponse = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
            if (weatherResponse.ok) {
              const weatherData = await weatherResponse.json()
              if (weatherData.temperature) {
                setTemperature(`${weatherData.temperature}°F`)
              }
              if (weatherData.condition) {
                setWeatherCondition(weatherData.condition.toLowerCase())
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching weather:', err)
        setTemperature(null)
        setWeatherCondition(null)
      }
    }
    
    if (user && !authLoading) {
      fetchWeather()
    }
  }, [user, authLoading])

  // Fetch work samples
  useEffect(() => {
    async function fetchWorkSamples() {
      if (!user) return
      
      try {
        const response = await fetch('/api/work-samples?sortBy=date&sortOrder=desc')
        if (response.ok) {
          const result = await response.json()
          if (result.data && Array.isArray(result.data)) {
            setWorkSamples(result.data.slice(0, 4))
          }
        }
      } catch (error) {
        console.error('Error fetching work samples:', error)
      }
    }
    
    fetchWorkSamples()
  }, [user])

  // Fetch videos
  useEffect(() => {
    async function fetchVideos() {
      if (!user) return
      
      try {
        setVideosLoading(true)
        // Fetch all videos, sorted by pinned first, then by date
        const response = await fetch('/api/videos?sortBy=created_at&sortOrder=desc')
        if (response.ok) {
          const result = await response.json()
          if (result.data && Array.isArray(result.data)) {
            // Get pinned videos first, then fill with recent videos - only show 1 video
            const pinnedVideos = result.data.filter((v: any) => v.pinned)
            const otherVideos = result.data.filter((v: any) => !v.pinned)
            const allVideos = [...pinnedVideos, ...otherVideos].slice(0, 1)
            setVideos(allVideos)
          }
        }
      } catch (error) {
        console.error('Error fetching videos:', error)
      } finally {
        setVideosLoading(false)
      }
    }
    
    fetchVideos()
  }, [user])

  // Fetch pipeline data
  useEffect(() => {
    async function fetchPipeline() {
      if (!user) return
      
      try {
        setPipelineLoading(true)
        const response = await fetch('/api/pipeline')
        if (response.ok) {
          const result = await response.json()
          console.log('Pipeline API response:', result)
          if (result.data && Array.isArray(result.data)) {
            console.log('Setting pipeline data:', result.data.length, 'projects')
            setPipelineData(result.data)
          } else {
            console.warn('Pipeline API returned unexpected data structure:', result)
            setPipelineData([])
          }
        } else {
          console.error('Pipeline API error:', response.status, response.statusText)
          const errorData = await response.json().catch(() => ({}))
          console.error('Pipeline API error details:', errorData)
        }
      } catch (error) {
        console.error('Error fetching pipeline:', error)
        setPipelineData([])
      } finally {
        setPipelineLoading(false)
      }
    }
    
    fetchPipeline()
  }, [user])

  // Fetch this week stats
  useEffect(() => {
    async function fetchThisWeekStats() {
      if (!user) return
      
      try {
        setThisWeekStatsLoading(true)
        const response = await fetch('/api/this-week-stats')
        if (response.ok) {
          const result = await response.json()
          if (result.stats && Array.isArray(result.stats)) {
            // Filter to only positions 1-3, sort by position, and extract title/value
            const sorted = result.stats
              .filter((stat: any) => stat.position >= 1 && stat.position <= 3)
              .sort((a: any, b: any) => a.position - b.position)
              .slice(0, 3) // Ensure we only take 3 stats max
              .map((stat: any) => ({
                position: stat.position,
                title: stat.title || '',
                value: stat.value || '0',
              }))
            setThisWeekStats(sorted)
          } else {
            setThisWeekStats([])
          }
        } else {
          console.error('This week stats API error:', response.status, response.statusText)
          setThisWeekStats([])
        }
      } catch (error) {
        console.error('Error fetching this week stats:', error)
        setThisWeekStats([])
      } finally {
        setThisWeekStatsLoading(false)
      }
    }
    
    fetchThisWeekStats()
  }, [user])

  // Fetch weekly playlist
  useEffect(() => {
    async function fetchWeeklyPlaylist() {
      if (!user) return
      
      // Only fetch if we haven't fetched for this user yet
      if (playlistFetchedForUserRef.current === user.id) {
        return
      }
      
      try {
        setPlaylistLoading(true)
        // Try with refresh to get Spotify metadata if missing
        const response = await fetch('/api/playlists?refresh=true')
        
        if (response.ok) {
          const playlists = await response.json()
          
          if (playlists && Array.isArray(playlists) && playlists.length > 0) {
            // Get the most recent playlist
            setWeeklyPlaylist(playlists[0])
          } else {
            setWeeklyPlaylist(null)
          }
          
          // Mark as fetched for this user
          playlistFetchedForUserRef.current = user.id
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[Frontend] Playlist API error:', response.status, errorData)
          setWeeklyPlaylist(null)
        }
      } catch (error) {
        console.error('[Frontend] Error fetching playlist:', error)
        setWeeklyPlaylist(null)
      } finally {
        setPlaylistLoading(false)
      }
    }
    
    fetchWeeklyPlaylist()
  }, [user])

  // Load last visit time from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboard_last_visit')
      setLastVisitTime(stored)
      // Update last visit time to now
      localStorage.setItem('dashboard_last_visit', new Date().toISOString())
    }
  }, [])

  // Fetch latest must reads for display (10 most recent)
  useEffect(() => {
    async function fetchLatestMustReads() {
      try {
        setMustReadsLoading(true)
        const response = await fetch('/api/must-reads?sortBy=created_at&sortOrder=desc&limit=10')
        if (response.ok) {
          const result = await response.json()
          // Get all must reads (we'll separate pinned vs weekly in the UI)
          setLatestMustReads(result.data || [])
        }
      } catch (error) {
        console.error('Error fetching must reads:', error)
      } finally {
        setMustReadsLoading(false)
      }
    }
    
    fetchLatestMustReads()
  }, [])

  // Fetch all must reads to determine available categories
  useEffect(() => {
    async function fetchAllMustReads() {
      try {
        const response = await fetch('/api/must-reads?sortBy=created_at&sortOrder=desc&limit=1000')
        if (response.ok) {
          const result = await response.json()
          setAllMustReads(result.data || [])
        }
      } catch (error) {
        console.error('Error fetching all must reads:', error)
      }
    }
    
    fetchAllMustReads()
  }, [])

  // Fetch quick links
  useEffect(() => {
    async function fetchQuickLinks() {
      try {
        setQuickLinksLoading(true)
        const response = await fetch('/api/quick-links')
        if (response.ok) {
          const result = await response.json()
          setQuickLinks(result.data || [])
        }
      } catch (error) {
        console.error('Error fetching quick links:', error)
      } finally {
        setQuickLinksLoading(false)
      }
    }
    
    fetchQuickLinks()
  }, [])

  // Universal search handler
  const handleUniversalSearch = async (query: string) => {
    if (!query.trim()) {
      setUniversalSearchResults([])
      setUniversalSearchHasSearched(false)
      return
    }

    // Clear existing timeout
    if (universalSearchTimeoutRef.current) {
      clearTimeout(universalSearchTimeoutRef.current)
    }

    // Debounce search
    universalSearchTimeoutRef.current = setTimeout(async () => {
      setUniversalSearchLoading(true)
      setUniversalSearchHasSearched(true)

      try {
        const response = await fetch(`/api/search/universal?q=${encodeURIComponent(query.trim())}&limit=20`)
        if (response.ok) {
          const data = await response.json()
          setUniversalSearchResults(data.results || [])
        } else {
          const errorData = await response.json()
          console.error('Search error:', errorData)
          setUniversalSearchResults([])
        }
      } catch (error) {
        console.error('Error performing search:', error)
        setUniversalSearchResults([])
      } finally {
        setUniversalSearchLoading(false)
      }
    }, 300) // 300ms debounce
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (universalSearchTimeoutRef.current) {
        clearTimeout(universalSearchTimeoutRef.current)
      }
    }
  }, [])

  // Fetch recent snaps for the logged-in user
  useEffect(() => {
    async function fetchSnaps() {
      if (!user) return
      
      try {
        const url = snapViewType === 'received' 
          ? `/api/snaps?mentioned_user_id=${user.id}&limit=6`
          : `/api/snaps?submitted_by=${user.id}&limit=6`
        const response = await fetch(url)
        if (response.ok) {
          const result = await response.json()
          if (result.data && Array.isArray(result.data)) {
            setSnaps(result.data)
          }
        }
      } catch (error) {
        console.error('Error fetching snaps:', error)
      }
    }
    
    fetchSnaps()
  }, [user, snapViewType])

  // Fetch profiles for birthdays and anniversaries
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, birthday, start_date')
          .eq('is_active', true)
          .neq('is_guest', true) // Exclude guests
          .or('birthday.not.is.null,start_date.not.is.null')
        
        if (error) {
          console.error('Error fetching profiles:', error)
          return
        }
        
        setProfiles(data || [])
      } catch (error) {
        console.error('Error fetching profiles:', error)
      }
    }
    
    fetchProfiles()
  }, [])

  // Fetch user's calendars dynamically (if token is available)
  useEffect(() => {
    async function fetchUserCalendars() {
      if (!googleCalendarToken || tokenLoading) return
      
      try {
        console.log('🔄 Fetching user calendars with token...')
        const response = await fetch(
          `/api/calendars/list?accessToken=${encodeURIComponent(googleCalendarToken)}`
        )
        
        if (response.ok) {
          const result = await response.json()
          if (result.calendars && Array.isArray(result.calendars)) {
            console.log(`✅ Successfully fetched ${result.calendars.length} calendars`)
            setUserCalendars(result.calendars)
            
            // Filter calendars - you can customize this filter
            const filteredCalendars = result.calendars
              .filter((cal: any) => {
                // By default, include all calendars that are selected/enabled
                // You can customize this filter to only include specific calendars
                const summary = cal.summary?.toLowerCase() || ''
                
                // Example filters (uncomment to use):
                // - Only include calendars with specific keywords:
                // return summary.includes('office') || summary.includes('holiday') || summary.includes('team')
                // - Only include calendars the user owns:
                // return cal.accessRole === 'owner'
                // - Exclude specific calendars:
                // return !summary.includes('birthday') && !summary.includes('contacts')
                
                // Default: include all selected calendars
                return cal.selected !== false
              })
              .map((cal: any) => cal.id)
            
            // Automatically use dynamic calendars if available and enabled
            // Set useDynamicCalendars to true to enable this feature
            if (useDynamicCalendars && filteredCalendars.length > 0) {
              setCalendarIds(filteredCalendars)
              console.log(`✅ Using ${filteredCalendars.length} dynamically fetched calendars:`, filteredCalendars)
            } else if (filteredCalendars.length > 0) {
              console.log(`ℹ️ Found ${filteredCalendars.length} accessible calendars (not using - enable useDynamicCalendars to use them)`)
            } else {
              console.warn('⚠️ No calendars found after filtering')
            }
          } else {
            console.warn('⚠️ Unexpected response format:', result)
          }
        } else {
          // Handle error response
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ Failed to fetch calendars:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
            details: errorData.details
          })
          
          if (response.status === 401 || response.status === 403) {
            console.error('🔐 Authentication issue - token may be invalid or missing calendar scopes')
            // Check if token expired and needs refresh
            if (response.status === 401 && errorData.tokenExpired) {
              console.log('ℹ️  401 error in calendars list - token expired, will refresh')
              // Token refresh will be handled by the hook or calendar events endpoint
            } else if (response.status === 401) {
              console.log('ℹ️  401 error in calendars list - calendar events endpoint will handle token refresh if needed')
            } else {
              console.error('💡 Try re-authenticating with Google and granting calendar permissions')
            }
          }
        }
      } catch (error) {
        console.error('❌ Error fetching user calendars:', error)
      }
    }
    
    fetchUserCalendars()
  }, [googleCalendarToken, tokenLoading, useDynamicCalendars])

  // Track token refresh attempts to prevent infinite loops
  const tokenRefreshAttemptsRef = useRef(0)
  const lastTokenRefreshRef = useRef<number>(0) // Track last token refresh timestamp
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Track debounce timeout
  
  // Track fetch state to prevent duplicate API calls
  const playlistFetchedForUserRef = useRef<string | null>(null) // Track which user we've fetched playlist for
  const calendarFetchInProgressRef = useRef(false) // Track if calendar fetch is in progress
  const lastCalendarFetchUserRef = useRef<string | null>(null) // Track last user we fetched calendar for
  const lastCalendarFetchTokenRef = useRef<string | null>(null) // Track last token we used to fetch
  const lastSuccessfulFetchRef = useRef<number>(0) // Track timestamp of last successful fetch
  
  // Fetch calendar events
  useEffect(() => {
    async function fetchCalendarEvents() {
      if (!user) {
        console.log('⏸️  Calendar fetch skipped: no user')
        return
      }
      
      // Prevent duplicate fetches: only fetch if user changed, token changed, or if not already in progress
      const userChanged = lastCalendarFetchUserRef.current !== user.id
      const tokenChanged = lastCalendarFetchTokenRef.current !== googleCalendarToken
      const timeSinceLastFetch = Date.now() - lastSuccessfulFetchRef.current
      const MIN_FETCH_INTERVAL = 5000 // Don't fetch more than once every 5 seconds
      
      // Skip if already fetching (unless user changed or token just became available)
      if (calendarFetchInProgressRef.current && !userChanged && !tokenChanged) {
        console.log('⏸️  Calendar fetch skipped: already in progress')
        return
      }
      
      // Skip if we just fetched recently (unless user/token changed or eventsExpanded changed)
      if (!userChanged && !tokenChanged && timeSinceLastFetch < MIN_FETCH_INTERVAL) {
        console.log(`⏸️  Calendar fetch skipped: fetched ${Math.round(timeSinceLastFetch / 1000)}s ago`)
        return
      }

      calendarFetchInProgressRef.current = true
      lastCalendarFetchUserRef.current = user.id

      try {
        setCalendarLoading(true)
        setCalendarError(null)

        // Check if we have calendar IDs to fetch
        if (!calendarIds || calendarIds.length === 0) {
          console.warn('⚠️ No calendar IDs configured - skipping fetch')
          setCalendarEvents([])
          setCalendarLoading(false)
          calendarFetchInProgressRef.current = false
          return
        }

        // Calculate time range based on expanded state
        const now = new Date()
        const timeMin = now.toISOString()
        const timeMax = eventsExpanded
          ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days for week view
          : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // 1 day for today view

        // Encode calendar IDs for the API (they're already decoded in the array)
        const calendarIdsParam = calendarIds.map(id => encodeURIComponent(id)).join(',')
        
        // Build API URL with optional access token
        let apiUrl = `/api/calendar?calendarIds=${calendarIdsParam}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=50`
        if (googleCalendarToken) {
          apiUrl += `&accessToken=${encodeURIComponent(googleCalendarToken)}`
          console.log('🔄 Fetching calendar events with OAuth token...')
        } else {
          console.warn('⚠️ No OAuth token available - using fallback authentication (service account)')
          console.warn('⚠️ Service account may not have access to Code and Theory calendars')
          if (needsAuth) {
            console.warn('💡 User needs to authenticate with Google Calendar. Check for auth button in UI.')
          } else if (tokenLoading) {
            console.log('⏳ Token is still loading, will retry when available...')
          }
        }
        
        console.log(`📅 Fetching from ${calendarIds.length} calendar(s):`, calendarIds)
        const response = await fetch(apiUrl)

        if (response.ok) {
          const result = await response.json()
          console.log(`✅ Calendar API response: ${result.count} events, ${result.successfulCalendars} successful, ${result.failedCalendars} failed`)
          
          // IMPORTANT: Set events FIRST before handling token refresh
          // This ensures events are displayed even if token refresh is needed
          if (result.events && Array.isArray(result.events)) {
            console.log(`📅 Setting ${result.events.length} calendar events`)
            setCalendarEvents(result.events)
            lastSuccessfulFetchRef.current = Date.now() // Track successful fetch
            lastCalendarFetchTokenRef.current = googleCalendarToken || null // Track token used
          } else {
            setCalendarEvents([])
          }
          
          // Handle errors and auth info
          if (result.failedCalendars > 0) {
            const failedDetails = result.failedCalendarDetails || []
            
            const hasCodeAndTheoryCalendars = failedDetails.some((f: any) => 
              f.id.includes('codeandtheory.com_')
            )
            
            if (result.count === 0 && result.successfulCalendars === 0) {
              // Only show error if no events were loaded at all (all calendars failed)
              const failedCount = failedDetails.length
              
              // Create a user-friendly summary
              let errorSummary = ''
              if (hasCodeAndTheoryCalendars && failedCount <= 3) {
                errorSummary = `${failedCount} Code and Theory calendar${failedCount > 1 ? 's' : ''}`
              } else {
                errorSummary = `${failedCount} calendar${failedCount > 1 ? 's' : ''}`
              }
              
              let errorMessage = `Some calendars are not accessible. ${errorSummary}: Calendar not found or not accessible. Please ensure the OAuth2 account has access to these calendars.`
              
              setCalendarError(errorMessage)
              console.warn(`${result.failedCalendars} calendar(s) failed to load. Check server logs for details.`)
            } else {
              // Some calendars worked, but some failed
              if (hasCodeAndTheoryCalendars) {
                const failedCodeAndTheory = failedDetails.filter((f: any) => f.id.includes('codeandtheory.com_')).length
                if (failedCodeAndTheory > 0) {
                  console.warn(`⚠️ ${failedCodeAndTheory} Code and Theory calendar(s) failed - OAuth2 account may not have access`)
                  console.warn('💡 Ensure the OAuth2 account has access to these calendars')
                  setCalendarError(`${failedCodeAndTheory} Code and Theory calendar(s) not accessible. Please ensure the OAuth2 account has access.`)
                } else {
                  setCalendarError(null)
                }
              } else {
                // Some calendars worked, so clear any previous error
                setCalendarError(null)
              }
            }
          } else {
            // No failed calendars, clear any previous error
            setCalendarError(null)
          }
          
          if (result.authInfo) {
            setServiceAccountEmail(result.authInfo)
          }
          
          // Check if token expired and refresh if needed (AFTER setting events)
          // This way events are displayed even if token needs refresh
          // NOTE: We refresh the token silently for future use, but don't re-fetch events
          // to avoid infinite loops. The next natural fetch will use the refreshed token.
          if (result.tokenExpired && googleCalendarToken && refreshCalendarToken) {
            const now = Date.now()
            const fiveMinutes = 5 * 60 * 1000
            
            // Check cooldown: only allow refresh if last refresh was > 5 minutes ago
            if (lastTokenRefreshRef.current > 0 && (now - lastTokenRefreshRef.current) < fiveMinutes) {
              const timeRemaining = Math.ceil((fiveMinutes - (now - lastTokenRefreshRef.current)) / 1000)
              console.log(`⏸️  Token refresh cooldown active. Please wait ${timeRemaining} seconds. Using fallback authentication.`)
              // Don't trigger refresh, just continue with fallback
              // Reset counter and continue processing
              tokenRefreshAttemptsRef.current = 0
            } else {
              // Clear any existing debounce timeout
              if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current)
              }
              
              // Debounce: wait 1 second before triggering refresh to avoid multiple simultaneous calls
              refreshTimeoutRef.current = setTimeout(() => {
                // Prevent infinite retry loops
                if (tokenRefreshAttemptsRef.current < 2) {
                  tokenRefreshAttemptsRef.current += 1
                  lastTokenRefreshRef.current = now
                  console.log(`🔄 Token expired detected - refreshing token silently (attempt ${tokenRefreshAttemptsRef.current})...`)
                  refreshCalendarToken()
                  // Don't re-fetch events here - events are already set above
                  // The next natural fetch (when user expands/collapses or component re-mounts) will use the refreshed token
                } else {
                  console.error('⚠️ Token refresh failed after multiple attempts - using fallback authentication')
                  tokenRefreshAttemptsRef.current = 0 // Reset for next time
                  // Continue processing with fallback auth
                }
              }, 1000) // 1 second debounce
              // Don't return early - events are already set above
            }
          } else {
            // Reset counter on successful response
            tokenRefreshAttemptsRef.current = 0
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ Calendar API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
            details: errorData.details
          })
          setCalendarError(errorData.error || 'Failed to fetch calendar events')
        }
      } catch (error: any) {
        console.error('❌ Error fetching calendar events:', error)
        setCalendarError(error.message || 'Failed to load calendar events')
      } finally {
        setCalendarLoading(false)
        calendarFetchInProgressRef.current = false
      }
    }

    // Fetch events - wait a bit for token to load if it's still loading
    // Token will be used if available, otherwise falls back to service account
    if (tokenLoading && !googleCalendarToken) {
      // Wait a bit for token to load, then fetch
      const timeoutId = setTimeout(() => {
        console.log('⏳ Token loading timeout - fetching with fallback auth')
        fetchCalendarEvents()
      }, 2000) // Wait 2 seconds for token to load
      
      return () => {
        clearTimeout(timeoutId)
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current)
        }
      }
    } else {
      fetchCalendarEvents()
    }
    
    // Cleanup: clear timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [user, eventsExpanded, googleCalendarToken, calendarIds, tokenLoading, needsAuth]) // Removed refreshCalendarToken to prevent infinite loops

  const handleSnapAdded = async () => {
    // Refresh snaps list for the logged-in user
    if (!user) return
    
      try {
        const url = snapViewType === 'received' 
          ? `/api/snaps?mentioned_user_id=${user.id}&limit=6`
          : `/api/snaps?submitted_by=${user.id}&limit=6`
        const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.data && Array.isArray(result.data)) {
          setSnaps(result.data)
        }
      }
    } catch (error) {
      console.error('Error refreshing snaps:', error)
    }
  }
  
  // Fetch horoscope text and image on mount - only fetches today's data
  // Historical horoscopes are stored in the database but only today's is displayed
  const isFetchingRef = useRef(false) // Use ref to persist across re-renders
  const hasFetchedRef = useRef(false) // Track if we've successfully fetched data
  
  useEffect(() => {
    let isMounted = true // Prevent state updates if component unmounts
    
    async function fetchHoroscopeData() {
      // Only fetch if user is authenticated
      if (!user) {
        if (isMounted) {
          setHoroscopeLoading(false)
          setHoroscopeImageLoading(false)
          setHoroscopeError('Please log in to view your horoscope')
          setHoroscopeImageError('Please log in to view your horoscope image')
        }
        return
      }

      // CRITICAL: Don't re-fetch if we already have data for today
      // This prevents the horoscope from disappearing when component re-renders
      if (horoscope && horoscopeImage && hasFetchedRef.current) {
        console.log('✅ Already have horoscope data, skipping fetch')
        if (isMounted) {
          setHoroscopeLoading(false)
          setHoroscopeImageLoading(false)
        }
        return
      }

      // Prevent multiple simultaneous requests
      if (isFetchingRef.current) {
        console.log('⏸️ Request already in progress, skipping duplicate request')
        return
      }
      
      isFetchingRef.current = true
      console.log('🚀 Starting horoscope fetch...')

      // Don't redirect to profile setup from here - let the API handle it
      console.log('Fetching horoscope data for authenticated user...')

      // CRITICAL: Only set loading states if we don't already have data
      // This prevents clearing existing data during re-fetch
      if (isMounted && !horoscope) {
        setHoroscopeLoading(true)
      }
      if (isMounted && !horoscopeImage) {
        setHoroscopeImageLoading(true)
      }
      // Don't clear errors if we're just refreshing
      if (isMounted && !horoscope && !horoscopeImage) {
        setHoroscopeError(null)
        setHoroscopeImageError(null)
      }
      
      try {
        // Fetch horoscope text first (it includes image_url from n8n)
        const textResponse = await fetch('/api/horoscope')
        
        // Process text response first to get image URL
        const textData = await textResponse.json()
        
        // Only fetch avatar endpoint if we don't have image_url from main endpoint
        // This prevents race conditions where avatar endpoint returns old cached data
        let imageResponse = null
        let imageData = null
        
        if (!textData.image_url && textResponse.ok) {
          // No image URL in main response, try avatar endpoint
          console.log('No image_url in main response, fetching from avatar endpoint...')
          imageResponse = await fetch('/api/horoscope/avatar')
          imageData = await imageResponse.json()
        } else if (textData.image_url) {
          // We have image URL from main endpoint, use it directly
          console.log('✅ Using image_url from main horoscope endpoint:', textData.image_url.substring(0, 50) + '...')
          // Create a mock response object for consistency
          imageData = {
            image_url: textData.image_url,
            image_prompt: null, // Will be fetched from avatar endpoint if needed
            prompt_slots: null,
            prompt_slots_labels: null,
            prompt_slots_reasoning: null,
          }
          // Still fetch avatar endpoint for metadata (slots, reasoning) but don't wait for it
          fetch('/api/horoscope/avatar').then(async (response) => {
            if (response.ok) {
              const metadata = await response.json()
              setHoroscopeImagePrompt(metadata.image_prompt || null)
              setHoroscopeImageSlots(metadata.prompt_slots || null)
              setHoroscopeImageSlotsLabels(metadata.prompt_slots_labels || null)
              setHoroscopeImageSlotsReasoning(metadata.prompt_slots_reasoning || null)
            }
          }).catch(err => {
            console.warn('Failed to fetch avatar metadata:', err)
          })
        }
        
        if (!isMounted) {
          isFetchingRef.current = false
          return // Don't process if component unmounted
        }
        
        // Process text response (already parsed above)
        if (!textResponse.ok) {
          console.error('Horoscope API error:', textResponse.status, textData)
          if (textResponse.status === 401) {
            setHoroscopeError('Please log in to view your horoscope')
          } else if (textResponse.status === 404 && textData.error?.includes('profile')) {
            // Profile setup needed - show modal instead of redirecting
            if (user && !showProfileModal) {
              setShowProfileModal(true)
            }
          } else {
            setHoroscopeError(textData.error || 'Failed to load horoscope')
          }
        } else {
          console.log('Horoscope data received:', textData)
          console.log('   Has horoscope_text:', !!textData.horoscope_text)
          console.log('   horoscope_text length:', textData.horoscope_text?.length || 0)
          console.log('   star_sign:', textData.star_sign)
          
          // Only set today's horoscope - historical horoscopes remain in database
          if (isMounted) {
            setHoroscope({
              star_sign: textData.star_sign,
              horoscope_text: textData.horoscope_text,
              horoscope_dos: textData.horoscope_dos || [],
              horoscope_donts: textData.horoscope_donts || [],
            })
            // Generate silly character name based on star sign
            if (textData.star_sign) {
              // Use character_name from API if available, otherwise generate (for backwards compatibility)
              setCharacterName(textData.character_name || generateSillyCharacterName(textData.star_sign))
            }
            
            // Clear loading state for horoscope text
            setHoroscopeLoading(false)
            setHoroscopeError(null)
            hasFetchedRef.current = true // Mark as fetched
            
            // If image_url is in the text response, use it immediately (from n8n)
            if (textData.image_url) {
              console.log('✅ Using image URL from horoscope text response:', textData.image_url)
              console.log('   Image URL length:', textData.image_url.length)
              console.log('   Image URL type:', typeof textData.image_url)
              setHoroscopeImage(textData.image_url)
              setHoroscopeImageLoading(false)
              setHoroscopeImageError(null)
            } else {
              console.warn('⚠️ No image_url in text response:', {
                hasImageUrl: !!textData.image_url,
                imageUrl: textData.image_url,
                responseKeys: Object.keys(textData)
              })
            }
          }
        }
        
        // Process image response (if we fetched it)
        if (imageResponse) {
          imageData = await imageResponse.json()
        }
        
        if (imageResponse && !imageResponse.ok) {
          console.error('Horoscope image API error:', imageResponse.status, imageData)
          if (imageResponse.status === 401) {
            setHoroscopeImageError('Please log in to view your horoscope image')
          } else if (imageResponse.status === 402) {
            // Payment required / billing limit
            setHoroscopeImageError('OpenAI billing limit reached. Please check your OpenAI account billing settings.')
          } else if (imageResponse.status === 404 && imageData.error?.includes('profile')) {
            // Profile setup needed - will be handled by text response redirect
            setHoroscopeImageError('Please complete your profile to view your horoscope image')
          } else {
            setHoroscopeImageError(imageData.error || 'Failed to load horoscope image')
          }
        } else if (imageData && imageData.image_url) {
          console.log('Horoscope image received from avatar endpoint:', imageData)
          console.log('   Image URL:', imageData.image_url)
          console.log('   Image URL length:', imageData.image_url?.length || 0)
          console.log('Reasoning received:', imageData.prompt_slots_reasoning)
          // Only set today's image - historical images remain in database
          // Only overwrite if we don't already have an image from text response
          if (isMounted) {
            if (!horoscopeImage || !textData.image_url) {
              console.log('   Setting image from avatar endpoint')
              setHoroscopeImage(imageData.image_url)
            } else {
              console.log('   Keeping image from text response, not overwriting with avatar endpoint')
            }
            setHoroscopeImagePrompt(imageData.image_prompt || null)
            setHoroscopeImageSlots(imageData.prompt_slots || null)
            setHoroscopeImageSlotsLabels(imageData.prompt_slots_labels || null)
            setHoroscopeImageSlotsReasoning(imageData.prompt_slots_reasoning || null)
            console.log('Reasoning state set to:', imageData.prompt_slots_reasoning)
            hasFetchedRef.current = true // Mark as fetched
          }
        } else if (textData.image_url) {
          // Image URL was already set from text response above
          console.log('✅ Image URL already set from text response:', textData.image_url)
          // Make sure loading is cleared
          if (isMounted && horoscopeImageLoading) {
            setHoroscopeImageLoading(false)
            hasFetchedRef.current = true // Mark as fetched
          }
        } else {
          console.warn('⚠️ No image URL found in either text or avatar response')
          console.warn('   Text response keys:', Object.keys(textData))
          console.warn('   Image data:', imageData)
          // Still clear loading even if no image
          setHoroscopeImageLoading(false)
        }
        
        // Final check - ensure loading states are cleared
        console.log('📊 Final state check:', {
          horoscopeLoading,
          horoscopeImageLoading,
          hasHoroscope: !!horoscope,
          hasHoroscopeText: !!horoscope?.horoscope_text,
          hasHoroscopeImage: !!horoscopeImage
        })
      } catch (error: any) {
        console.error('Error fetching horoscope data:', error)
        setHoroscopeError('Failed to load horoscope: ' + (error.message || 'Unknown error'))
        setHoroscopeImageError('Failed to load horoscope image: ' + (error.message || 'Unknown error'))
        // Clear loading on error
        setHoroscopeLoading(false)
        setHoroscopeImageLoading(false)
      } finally {
        isFetchingRef.current = false // Reset fetching flag
        if (isMounted) {
          // Double-check loading states are cleared
          console.log('🔚 Finally block - ensuring loading states are cleared')
          setHoroscopeLoading(false)
          setHoroscopeImageLoading(false)
        }
      }
    }
    
    // Only fetch if not already fetching and we don't have data
    // Only fetch if not already fetching and we don't have data
    // Use refs to check state without triggering re-renders
    if (!isFetchingRef.current && !hasFetchedRef.current) {
      fetchHoroscopeData()
    } else {
      console.log('⏸️ Skipping fetch - already in progress or already fetched')
    }
    
    return () => {
      isMounted = false // Cleanup on unmount
      // Don't reset isFetchingRef here - let it complete naturally
    }
  }, [user?.id]) // Only depend on user.id - don't include horoscope/horoscopeImage to prevent re-fetches

  // Time-based gradient for hero section (chaos mode - vibrant colors)
  const getTimeBasedGradient = (): { bg: string; text: string; accent: string } => {
    const now = new Date()
    const hour = now.getHours()
    
    // Define time periods and their corresponding gradients using our color systems
    // Sunrise: 5-7 AM - Orange/Yellow system (warm, bright)
    // Daytime: 7 AM - 5 PM - Blue system (clear, bright)
    // Sunset: 5-7 PM - Red/Orange system (warm, vibrant)
    // Dusk: 7-9 PM - Purple system (deep, transitioning)
    // Nighttime: 9 PM - 5 AM - Deep Purple/Navy (dark, cool)
    
    if (hour >= 5 && hour < 7) {
      // Sunrise: Orange/Yellow system
      // ORANGE SYSTEM: Orange (#FF8C42), Golden Yellow (#FFD700)
      return {
        bg: 'bg-gradient-to-br from-[#FFD700] via-[#FF8C42] to-[#FFB84D]',
        text: 'text-black',
        accent: '#FFD700'
      }
    } else if (hour >= 7 && hour < 17) {
      // Daytime: Blue system
      // BLUE SYSTEM: Ocean Blue (#00A3E0), Sky Blue (#7DD3F0), Navy Blue (#1B4D7C)
      return {
        bg: 'bg-gradient-to-br from-[#7DD3F0] via-[#00A3E0] to-[#1B4D7C]',
        text: 'text-white',
        accent: '#00A3E0'
      }
    } else if (hour >= 17 && hour < 19) {
      // Sunset: Red/Orange system
      // RED SYSTEM: Coral Red (#FF4C4C), Orange (#FF8C42), Crimson (#C41E3A)
      return {
        bg: 'bg-gradient-to-br from-[#FF4C4C] via-[#FF8C42] to-[#C41E3A]',
        text: 'text-white',
        accent: '#FF4C4C'
      }
    } else if (hour >= 19 && hour < 21) {
      // Dusk: Purple system
      // PURPLE SYSTEM: Purple (#9B59B6), Deep Purple (#6B2E8C), Lavender
      return {
        bg: 'bg-gradient-to-br from-[#9B59B6] via-[#6B2E8C] to-[#4A148C]',
        text: 'text-white',
        accent: '#9B59B6'
      }
    } else {
      // Nighttime: Deep Purple/Navy
      // Deep Purple (#6B2E8C), Navy Blue (#1B4D7C)
      return {
        bg: 'bg-gradient-to-br from-[#6B2E8C] via-[#1B4D7C] to-[#0F172A]',
        text: 'text-white',
        accent: '#6B2E8C'
      }
    }
  }

  // Time-based gradient for hero section (chill mode - softer, lighter colors)
  const getTimeBasedGradientChill = (): { bg: string; text: string; accent: string; border: string } => {
    const now = new Date()
    const hour = now.getHours()
    
    // Chill mode uses softer, lighter versions of the same color systems
    // Adapted to work with warm cream background and maintain readability
    
    if (hour >= 5 && hour < 7) {
      // Sunrise: Soft Orange/Yellow
      // YELLOW SYSTEM: Golden Yellow (#FFC043), Light Yellow, Peach tones
      return {
        bg: 'bg-gradient-to-br from-[#FFE5B4] via-[#FFC043] to-[#FFB84D]',
        text: 'text-[#4A1818]',
        accent: '#FFC043',
        border: 'border border-[#FFC043]/30'
      }
    } else if (hour >= 7 && hour < 17) {
      // Daytime: Soft Blue
      // BLUE SYSTEM: Sky Blue (#4A9BFF), lighter tones
      return {
        bg: 'bg-gradient-to-br from-[#E6F2FF] via-[#B3D9FF] to-[#4A9BFF]',
        text: 'text-[#4A1818]',
        accent: '#4A9BFF',
        border: 'border border-[#4A9BFF]/30'
      }
    } else if (hour >= 17 && hour < 19) {
      // Sunset: Soft Red/Orange
      // RED SYSTEM: Soft Pink/Orange tones
      return {
        bg: 'bg-gradient-to-br from-[#FFE5D9] via-[#FFB5D8] to-[#FF8C6B]',
        text: 'text-[#4A1818]',
        accent: '#FF6B35',
        border: 'border border-[#FF6B35]/30'
      }
    } else if (hour >= 19 && hour < 21) {
      // Dusk: Soft Purple
      // PURPLE SYSTEM: Lavender tones
      return {
        bg: 'bg-gradient-to-br from-[#F3E5F5] via-[#E1BEE7] to-[#CE93D8]',
        text: 'text-[#4A1818]',
        accent: '#FFB5D8',
        border: 'border border-[#FFB5D8]/30'
      }
    } else {
      // Nighttime: Soft muted tones
      // Deep but softer maroon/purple
      return {
        bg: 'bg-gradient-to-br from-[#F5E6D3] via-[#E8D5C4] to-[#D4C4A8]',
        text: 'text-[#4A1818]',
        accent: '#8B4444',
        border: 'border border-[#8B4444]/30'
      }
    }
  }

  // Comprehensive mode-aware card styling
  type CardSection = 'hero' | 'recognition' | 'work' | 'team' | 'vibes' | 'community' | 'community2' | 'default'
  type SpecificCard = 'hero-large' | 'launch-pad' | 'horoscope' | 'timezones' | 'playlist' | 'friday-drop' | 'brand-redesign' | 'stats' | 'events' | 'pipeline' | 'who-needs-what' | 'snaps' | 'beast-babe' | 'wins-wall' | 'ask-hive' | 'team-pulse' | 'loom-standup' | 'inspiration-war' | 'search'
  
  const getSpecificCardStyle = (cardName: SpecificCard): { bg: string; border: string; glow: string; text: string; accent: string } => {
    if (mode === 'chaos') {
      const timeGradient = getTimeBasedGradient()
      const chaosCardStyles: Record<SpecificCard, { bg: string; border: string; glow: string; text: string; accent: string }> = {
        // Hero - time-based gradient
        'hero-large': { bg: timeGradient.bg, border: 'border-0', glow: '', text: timeGradient.text, accent: timeGradient.accent },
        
        // Recognition & Culture - GREEN SYSTEM: Emerald, Forest Green, Lime Green, Orange
        'beast-babe': { bg: 'bg-[#10B981]', border: 'border-0', glow: '', text: 'text-black', accent: '#047857' }, // Emerald bg with Forest Green accent
        'wins-wall': { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#84CC16' }, // Black bg with Lime Green accent
        'snaps': { bg: 'bg-[#1E293B]', border: 'border-0', glow: '', text: 'text-white', accent: '#10B981' }, // Slate Grey bg with Emerald accent
        
        // Work - BLUE SYSTEM: Ocean (#00A3E0), Navy (#1B4D7C), Sky (#7DD3F0), Golden Yellow (#FFD700)
        'events': { bg: 'bg-[#00A3E0]', border: 'border-0', glow: '', text: 'text-black', accent: '#1B4D7C' }, // Ocean bg with Navy accent
        'pipeline': { bg: 'bg-[#1B4D7C]', border: 'border-0', glow: '', text: 'text-white', accent: '#7DD3F0' }, // Navy bg with Sky accent
        'friday-drop': { bg: 'bg-[#FFD700]', border: 'border-0', glow: '', text: 'text-black', accent: '#00A3E0' }, // Golden Yellow bg with Ocean accent
        'who-needs-what': { bg: 'bg-[#7DD3F0]', border: 'border-0', glow: '', text: 'text-black', accent: '#1B4D7C' }, // Sky bg with Navy accent
        
        // Team - ORANGE SYSTEM: Orange (#FF8C42), Brown (#7A5C3D), Tan (#D4C4A8), Purple (#9B59B6)
        'timezones': { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF8C42' }, // Black bg with Orange accent
        
        // Vibes - PURPLE SYSTEM: Purple, Deep Purple, Lavender, Lime Green
        'horoscope': { bg: 'bg-[#9B59B6]', border: 'border-0', glow: '', text: 'text-white', accent: '#6B2E8C' }, // Purple bg (#9B59B6) with Deep Purple accent (#6B2E8C)
        'playlist': { bg: 'bg-[#000000]', border: 'border-2', glow: '', text: 'text-white', accent: '#9333EA' }, // Black bg with Purple border and accent
        
        // Community 1: Hive/Pulse - RED SYSTEM: Coral Red (#FF4C4C), Crimson (#C41E3A), Peach (#FFD4C4), Ocean Blue (#00A3E0)
        'ask-hive': { bg: 'bg-[#FF4C4C]', border: 'border-0', glow: '', text: 'text-black', accent: '#C41E3A' }, // Coral Red bg with Crimson accent
        'team-pulse': { bg: 'bg-[#F4F4F5]', border: 'border-0', glow: '', text: 'text-black', accent: '#FF4C4C' }, // Zinc bg with Coral Red accent
        
        // Community 2: Loop/Inspo War/Search - YELLOW SYSTEM: Yellow (#FFD700), Gold (#D4A60A), Light Yellow (#FFF59D), Deep Purple (#6B2E8C)
        'loom-standup': { bg: 'bg-[#FFD700]', border: 'border-0', glow: '', text: 'text-black', accent: '#D4A60A' }, // Yellow bg with Gold accent
        'inspiration-war': { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#FFD700' }, // Black bg with Yellow accent
        'search': { bg: 'bg-[#000000]', border: 'border-2', glow: '', text: 'text-white', accent: '#9333EA' }, // Black bg with Purple border and accent
        
        // Other cards - keeping existing or using appropriate section colors
        'launch-pad': { bg: 'bg-gradient-to-br from-[#9D4EFF] to-[#6B2C91]', border: 'border-0', glow: '', text: 'text-white', accent: '#C4F500' },
        'brand-redesign': { bg: 'bg-[#F4F4F5]', border: 'border-0', glow: '', text: 'text-black', accent: '#9333EA' }, // Zinc bg with Purple accent (vibes section)
        'stats': { bg: 'bg-[#F4F4F5]', border: 'border-0', glow: '', text: 'text-black', accent: '#10B981' }, // Zinc bg with Emerald accent (recognition section)
      }
      return chaosCardStyles[cardName] || chaosCardStyles['hero-large']
    } else {
      // Special case for wins-wall - always use blue background
      if (cardName === 'wins-wall') {
        return { bg: 'bg-gradient-to-br from-[#00B8D4] to-[#0066CC]', border: 'border-0', glow: '', text: 'text-white', accent: '#00D4FF' }
      }
      // For chill and code modes, use section-based styling
      return getCardStyle(cardName === 'hero-large' || cardName === 'launch-pad' ? 'hero' : 
                         cardName === 'snaps' || cardName === 'beast-babe' ? 'recognition' :
                         cardName === 'events' || cardName === 'pipeline' || cardName === 'who-needs-what' || cardName === 'friday-drop' ? 'work' :
                         cardName === 'timezones' ? 'team' :
                         cardName === 'horoscope' || cardName === 'playlist' || cardName === 'brand-redesign' ? 'vibes' :
                         cardName === 'ask-hive' || cardName === 'team-pulse' ? 'community' :
                         cardName === 'loom-standup' || cardName === 'inspiration-war' || cardName === 'search' ? 'community2' :
                         'recognition')
    }
  }
  
  const getCardStyle = (section: CardSection): { bg: string; border: string; glow: string; text: string; accent: string } => {
    if (mode === 'chaos') {
      // Fallback for section-based styling in chaos mode - using 7 new color systems
      const timeGradient = getTimeBasedGradient()
      const chaosColors: Record<CardSection, { bg: string; border: string; glow: string; text: string; accent: string }> = {
        hero: { bg: timeGradient.bg, border: 'border-0', glow: '', text: timeGradient.text, accent: timeGradient.accent }, // Time-based gradient
        recognition: { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#10B981' }, // GREEN SYSTEM - Emerald accent
        work: { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#00A3E0' }, // BLUE SYSTEM - Ocean accent
        team: { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF8C42' }, // ORANGE SYSTEM - Orange accent
        vibes: { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#9333EA' }, // PURPLE SYSTEM - Purple accent
        community: { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF4C4C' }, // RED SYSTEM - Coral Red accent
        community2: { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#FFD700' }, // YELLOW SYSTEM - Yellow accent
        default: { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#10B981' },
      }
      return chaosColors[section] || chaosColors.default
    } else if (mode === 'chill') {
      const timeGradientChill = getTimeBasedGradientChill()
      const chillColors: Record<CardSection, { bg: string; border: string; glow: string; text: string; accent: string }> = {
        hero: { bg: timeGradientChill.bg, border: timeGradientChill.border, glow: '', text: timeGradientChill.text, accent: timeGradientChill.accent }, // Time-based gradient
        recognition: { bg: 'bg-white', border: 'border border-[#C8D961]/30', glow: '', text: 'text-[#4A1818]', accent: '#C8D961' },
        work: { bg: 'bg-white', border: 'border border-[#FF6B35]/30', glow: '', text: 'text-[#4A1818]', accent: '#FF6B35' },
        team: { bg: 'bg-white', border: 'border border-[#4A9BFF]/30', glow: '', text: 'text-[#4A1818]', accent: '#4A9BFF' },
        vibes: { bg: 'bg-white', border: 'border border-[#FFB5D8]/30', glow: '', text: 'text-[#4A1818]', accent: '#FFB5D8' },
        community: { bg: 'bg-white', border: 'border border-[#8B4444]/30', glow: '', text: 'text-[#4A1818]', accent: '#8B4444' },
        community2: { bg: 'bg-white', border: 'border border-[#FFC043]/30', glow: '', text: 'text-[#4A1818]', accent: '#FFC043' },
        default: { bg: 'bg-white', border: 'border border-[#FFC043]/30', glow: '', text: 'text-[#4A1818]', accent: '#FFC043' },
      }
      return chillColors[section] || chillColors.default
    } else { // code mode - DOS/Terminal aesthetic
      const codeColors: Record<CardSection, { bg: string; border: string; glow: string; text: string; accent: string }> = {
        hero: { bg: 'bg-[#000000]', border: 'border border-[#FFFFFF]', glow: '', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
        recognition: { bg: 'bg-[#000000]', border: 'border border-[#FFFFFF]', glow: '', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
        work: { bg: 'bg-[#000000]', border: 'border border-[#FFFFFF]', glow: '', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
        team: { bg: 'bg-[#000000]', border: 'border border-[#FFFFFF]', glow: '', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
        vibes: { bg: 'bg-[#000000]', border: 'border border-[#FFFFFF]', glow: '', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
        community: { bg: 'bg-[#000000]', border: 'border border-[#FFFFFF]', glow: '', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
        community2: { bg: 'bg-[#000000]', border: 'border border-[#FFFFFF]', glow: '', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
        default: { bg: 'bg-[#000000]', border: 'border border-[#FFFFFF]', glow: '', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
      }
      return codeColors[section] || codeColors.default
    }
  }

  // Get accent colors for a section (returns array of colors: [accent, black/white, secondary accent])
  const getSectionAccentColors = (section: CardSection): string[] => {
    const style = getCardStyle(section)
    if (mode === 'chaos') {
      // For chaos mode, return accent, black, and a secondary color based on section
      const secondaryColors: Record<CardSection, string> = {
        recognition: '#84CC16', // Lime Green (GREEN SYSTEM)
        work: '#7DD3F0', // Sky (BLUE SYSTEM)
        team: '#D4C4A8', // Tan (ORANGE SYSTEM)
        vibes: '#C084FC', // Lavender (PURPLE SYSTEM)
        community: '#FFD4C4', // Peach (RED SYSTEM)
        community2: '#FFF59D', // Light Yellow (YELLOW SYSTEM)
        hero: '#C4F500', // Lime
        default: '#EAB308',
      }
      return [style.accent, '#000000', secondaryColors[section] || secondaryColors.default]
    } else if (mode === 'chill') {
      // For chill mode, return accent, text color (dark), and a lighter version
      return [style.accent, '#4A1818', style.accent]
    } else {
      // For code mode, return white variations
      return ['#FFFFFF', '#808080', '#FFFFFF']
    }
  }

  // Mode-aware class helpers
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


  // Code mode helpers
  const getRoundedClass = (defaultClass: string) => {
    return mode === 'code' ? 'rounded-none' : defaultClass
  }

  const getCodeHeading = (text: string) => {
    return mode === 'code' ? `> ${text.toUpperCase()}` : text
  }

  const getCodeButtonText = (text: string) => {
    return mode === 'code' ? `[${text.toUpperCase()}]` : text
  }

  const getCodeText = (text: string, opacity = 1) => {
    if (mode === 'code') {
      const opacityClass = opacity < 1 ? `text-white/70` : 'text-[#FFFFFF]'
      return <span className={opacityClass}>{text}</span>
    }
    return text
  }

  // Horoscope Image Actions - Tooltip, Reload (admin only), and Download
  const horoscopeImageActions = horoscopeImage && (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Info button - admin only */}
        {isAdmin && (horoscopeImageSlotsLabels || horoscopeImagePrompt) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                type="button"
                className={`p-2 ${getRoundedClass('rounded-full')} border-2 transition-all hover:opacity-80 ${
                  mode === 'chaos' ? 'bg-black/20 border-[#C4F500]/40 hover:bg-black/30' :
                  mode === 'chill' ? 'bg-[#F5E6D3]/30 border-[#FFC043]/40 hover:bg-[#F5E6D3]/40' :
                  'bg-black/20 border-white/20 hover:bg-black/30'
                }`}
              >
                <Info className={`w-4 h-4 ${
                  mode === 'chaos' ? 'text-[#C4F500]' :
                  mode === 'chill' ? 'text-[#FFC043]' :
                  'text-white'
                }`} />
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="bottom"
              className="max-w-2xl p-4 bg-black/95 text-white text-xs border border-white/20 z-[10000] max-h-[80vh] overflow-y-auto"
            >
              <p className="font-bold mb-3 text-sm">Image Generation Details</p>
              <div className="space-y-4">
                {/* Debug: Show reasoning object if available */}
                {process.env.NODE_ENV === 'development' && horoscopeImageSlotsReasoning && (
                  <div className="text-[10px] text-gray-500 border-t border-gray-700 pt-2">
                    <p className="font-semibold mb-1">Debug - Reasoning Object:</p>
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(horoscopeImageSlotsReasoning, null, 2)}</pre>
                  </div>
                )}
                {/* Prompt Slots Section */}
                {horoscopeImageSlotsLabels && (
                  <div>
                    <p className="font-semibold mb-2 text-[#C4F500]">Selected Slots:</p>
                    <div className="space-y-2 pl-2 text-xs">
                      {horoscopeImageSlotsLabels.style_medium && (
                        <div>
                          <p><span className="text-gray-400">Style Medium:</span> {horoscopeImageSlotsLabels.style_medium}</p>
                          {horoscopeImageSlotsReasoning?.style_medium && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.style_medium}</p>
                          )}
                        </div>
                      )}
                      {horoscopeImageSlotsLabels.style_reference && (
                        <div>
                          <p><span className="text-gray-400">Style Reference:</span> {horoscopeImageSlotsLabels.style_reference}</p>
                          {horoscopeImageSlotsReasoning?.style_reference && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.style_reference}</p>
                          )}
                        </div>
                      )}
                      {horoscopeImageSlotsLabels.subject_role && (
                        <div>
                          <p><span className="text-gray-400">Subject Role:</span> {horoscopeImageSlotsLabels.subject_role}</p>
                          {horoscopeImageSlotsReasoning?.subject_role && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.subject_role}</p>
                          )}
                        </div>
                      )}
                      {horoscopeImageSlotsLabels.subject_twist && (
                        <div>
                          <p><span className="text-gray-400">Subject Twist:</span> {horoscopeImageSlotsLabels.subject_twist}</p>
                          {horoscopeImageSlotsReasoning?.subject_twist && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.subject_twist}</p>
                          )}
                        </div>
                      )}
                      {horoscopeImageSlotsLabels.setting_place && (
                        <div>
                          <p><span className="text-gray-400">Setting Place:</span> {horoscopeImageSlotsLabels.setting_place}</p>
                          {horoscopeImageSlotsReasoning?.setting_place && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.setting_place}</p>
                          )}
                        </div>
                      )}
                      {horoscopeImageSlotsLabels.setting_time && (
                        <div>
                          <p><span className="text-gray-400">Setting Time:</span> {horoscopeImageSlotsLabels.setting_time}</p>
                          {horoscopeImageSlotsReasoning?.setting_time && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.setting_time}</p>
                          )}
                        </div>
                      )}
                      {horoscopeImageSlotsLabels.activity && (
                        <div>
                          <p><span className="text-gray-400">Activity:</span> {horoscopeImageSlotsLabels.activity}</p>
                          {horoscopeImageSlotsReasoning?.activity && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.activity}</p>
                          )}
                        </div>
                      )}
                      {horoscopeImageSlotsLabels.mood_vibe && (
                        <div>
                          <p><span className="text-gray-400">Mood Vibe:</span> {horoscopeImageSlotsLabels.mood_vibe}</p>
                          {horoscopeImageSlotsReasoning?.mood_vibe && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.mood_vibe}</p>
                          )}
                        </div>
                      )}
                      {horoscopeImageSlotsLabels.color_palette && (
                        <div>
                          <p><span className="text-gray-400">Color Palette:</span> {horoscopeImageSlotsLabels.color_palette}</p>
                          {horoscopeImageSlotsReasoning?.color_palette && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.color_palette}</p>
                          )}
                        </div>
                      )}
                      {horoscopeImageSlotsLabels.camera_frame && (
                        <div>
                          <p><span className="text-gray-400">Camera Frame:</span> {horoscopeImageSlotsLabels.camera_frame}</p>
                          {horoscopeImageSlotsReasoning?.camera_frame && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.camera_frame}</p>
                          )}
                        </div>
                      )}
                      {horoscopeImageSlotsLabels.lighting_style && (
                        <div>
                          <p><span className="text-gray-400">Lighting Style:</span> {horoscopeImageSlotsLabels.lighting_style}</p>
                          {horoscopeImageSlotsReasoning?.lighting_style && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.lighting_style}</p>
                          )}
                        </div>
                      )}
                      {horoscopeImageSlotsLabels.constraints && horoscopeImageSlotsLabels.constraints.length > 0 && (
                        <div>
                          <p>
                            <span className="text-gray-400">Constraints:</span>{' '}
                            {horoscopeImageSlotsLabels.constraints.join(', ')}
                          </p>
                          {horoscopeImageSlotsReasoning?.constraints && (
                            <p className="text-gray-500 text-[10px] pl-4 italic">→ {horoscopeImageSlotsReasoning.constraints}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Full Prompt Section */}
                {horoscopeImagePrompt && (
                  <div>
                    <p className="font-semibold mb-2 text-[#C4F500]">Full Prompt:</p>
                    <p className="text-xs pl-2 text-gray-300 whitespace-pre-wrap break-words">{horoscopeImagePrompt}</p>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        {/* Reload button - admin only */}
        {isAdmin && (
          <button
            type="button"
            onClick={async () => {
              try {
                setHoroscopeLoading(true)
                setHoroscopeImageLoading(true)
                setHoroscopeError(null)
                setHoroscopeImageError(null)
                
                // Force regenerate by calling with force=true
                const [textResponse, imageResponse] = await Promise.all([
                  fetch('/api/horoscope?force=true'),
                  fetch('/api/horoscope/avatar')
                ])
                
                const textData = await textResponse.json()
                const imageData = await imageResponse.json()
                
                if (textResponse.ok) {
                  setHoroscope({
                    star_sign: textData.star_sign,
                    horoscope_text: textData.horoscope_text,
                    horoscope_dos: textData.horoscope_dos || [],
                    horoscope_donts: textData.horoscope_donts || [],
                  })
                  if (textData.star_sign) {
                    setCharacterName(textData.character_name || generateSillyCharacterName(textData.star_sign))
                  }
                }
                
                if (imageResponse.ok) {
                  setHoroscopeImage(imageData.image_url)
                  setHoroscopeImagePrompt(imageData.image_prompt || null)
                  setHoroscopeImageSlots(imageData.prompt_slots || null)
                  setHoroscopeImageSlotsLabels(imageData.prompt_slots_labels || null)
                  setHoroscopeImageSlotsReasoning(imageData.prompt_slots_reasoning || null)
                }
                
                setHoroscopeLoading(false)
                setHoroscopeImageLoading(false)
              } catch (error) {
                console.error('Error regenerating horoscope:', error)
                setHoroscopeError('Failed to regenerate horoscope')
                setHoroscopeImageError('Failed to regenerate horoscope image')
                setHoroscopeLoading(false)
                setHoroscopeImageLoading(false)
              }
            }}
            className={`p-2 ${getRoundedClass('rounded-full')} border-2 transition-all hover:opacity-80 ${
              mode === 'chaos' ? 'bg-black/20 border-[#C4F500]/40 hover:bg-black/30' :
              mode === 'chill' ? 'bg-[#F5E6D3]/30 border-[#FFC043]/40 hover:bg-[#F5E6D3]/40' :
              'bg-black/20 border-white/20 hover:bg-black/30'
            }`}
            title="Regenerate horoscope (Admin only)"
          >
            <RefreshCw className={`w-4 h-4 ${
              mode === 'chaos' ? 'text-[#C4F500]' :
              mode === 'chill' ? 'text-[#FFC043]' :
              'text-white'
            }`} />
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              // Use our API proxy to avoid CORS issues
              const downloadUrl = `/api/horoscope/avatar/download?url=${encodeURIComponent(horoscopeImage)}`
              const a = document.createElement('a')
              a.href = downloadUrl
              a.download = `horoscope-${horoscope?.star_sign || 'daily'}-${new Date().toISOString().split('T')[0]}.png`
              document.body.appendChild(a)
              a.click()
              // Clean up after a short delay
              setTimeout(() => {
                document.body.removeChild(a)
              }, 100)
            } catch (error) {
              console.error('Error downloading horoscope image:', error)
              // Fallback: open image in new tab if download fails
              window.open(horoscopeImage, '_blank')
            }
          }}
          className={`p-2 ${getRoundedClass('rounded-full')} border-2 transition-all hover:opacity-80 ${
            mode === 'chaos' ? 'bg-black/20 border-[#C4F500]/40 hover:bg-black/30' :
            mode === 'chill' ? 'bg-[#F5E6D3]/30 border-[#FFC043]/40 hover:bg-[#F5E6D3]/40' :
            'bg-black/20 border-white/20 hover:bg-black/30'
          }`}
          title="Download image"
        >
          <Download className={`w-4 h-4 ${
            mode === 'chaos' ? 'text-[#C4F500]' :
            mode === 'chill' ? 'text-[#FFC043]' :
            'text-white'
          }`} />
        </button>
      </div>
    </TooltipProvider>
  )

  return (
    <div className={`flex flex-col ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <SiteHeader rightContent={horoscopeImageActions} />

      <main className="w-full max-w-[1200px] mx-auto px-6 py-4 flex-1 pb-0 pt-24 relative">
        {/* Hero Section and Quick Links - Side by Side */}
        <section className="mb-12 relative">
          <div className="flex items-stretch gap-4 w-full">
            {(() => {
              const style = mode === 'chaos' ? getSpecificCardStyle('hero-large') : getCardStyle('hero')
              const heroStyle = mode === 'chaos' ? getSpecificCardStyle('hero-large') : getCardStyle('hero')
              const isLightBg = heroStyle.text === 'text-black'
              
              // Extract color from gradient or use accent color for dark background
              let heroBgColor = heroStyle.accent
              if (mode === 'chaos') {
                const timeGradient = getTimeBasedGradient()
                heroBgColor = timeGradient.accent
              } else if (mode === 'chill') {
                const timeGradientChill = getTimeBasedGradientChill()
                heroBgColor = timeGradientChill.accent
              } else {
                heroBgColor = '#FFFFFF'
              }
              
              // Convert hex to rgba with 30% opacity
              const hexToRgba = (hex: string, alpha: number) => {
                const r = parseInt(hex.slice(1, 3), 16)
                const g = parseInt(hex.slice(3, 5), 16)
                const b = parseInt(hex.slice(5, 7), 16)
                return `rgba(${r}, ${g}, ${b}, ${alpha})`
              }
              
              const darkBgColor = hexToRgba(heroBgColor, 0.3)
              
              return (
                <>
                  {/* Hero Card - 7/8 width */}
                  <Card className={`${style.bg} ${style.border} p-0 ${mode === 'chaos' ? getRoundedClass('rounded-[2.5rem]') : getRoundedClass('rounded-[2.5rem]')} relative overflow-hidden group min-h-[300px] flex flex-col justify-between flex-[7]`}
                        style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
                  >
                {/* Black masked section on the right with transform/rotation - contains horoscope image */}
                {mode === 'chaos' && (
                  <div className={`absolute top-1/2 right-0 -translate-y-1/2 w-[40%] aspect-[5/4] ${getBgClass()} ${getRoundedClass('rounded-[2.5rem]')} transform -translate-x-[100px] -rotate-12 overflow-hidden border-4 border-white shadow-2xl`} style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 4px rgba(255, 255, 255, 0.3)' }}>
                    {horoscopeImageLoading ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4">
                        <Loader2 className="w-8 h-8 animate-spin text-white mb-3" />
                        <p className="text-white text-xs text-center font-medium max-w-[120px]">
                          {imageLoadingMessages[imageLoadingMessageIndex]}
                        </p>
                      </div>
                    ) : horoscopeImageError ? (
                      <div className="w-full h-full flex items-center justify-center p-8">
                        <p className="text-white text-sm text-center">{horoscopeImageError}</p>
                      </div>
                    ) : horoscopeImage ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={horoscopeImage} 
                          alt="Horoscope portrait"
                          className="w-full h-full object-cover"
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          onError={(e) => {
                            // Image failed to load (likely expired URL from old system)
                            // New images are stored in Supabase and won't expire
                            // Just hide the broken image
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            // Only show error for old expired URLs, not for new Supabase-stored images
                            if (horoscopeImage && horoscopeImage.includes('oaidalleapiprodscus')) {
                              setHoroscopeImageError('Image URL has expired. A new image will be generated tomorrow.')
                              console.log('Image URL expired (old OpenAI URL). New images are stored permanently in Supabase.')
                            }
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                )}
                {mode !== 'chaos' && (
                  <div className={`absolute top-1/2 right-0 -translate-y-1/2 w-[45%] aspect-[5/4] ${getBgClass()} transform -translate-x-[100px] overflow-hidden border-4 border-white shadow-2xl`} 
                       style={{ 
                         clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0% 100%)',
                         boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 4px rgba(255, 255, 255, 0.3)'
                       }} 
                  >
                    {horoscopeImageLoading ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4">
                        <Loader2 className="w-8 h-8 animate-spin text-white mb-3" />
                        <p className="text-white text-xs text-center font-medium max-w-[120px]">
                          {imageLoadingMessages[imageLoadingMessageIndex]}
                        </p>
                      </div>
                    ) : horoscopeImageError ? (
                      <div className="w-full h-full flex items-center justify-center p-8">
                        <p className="text-white text-sm text-center">{horoscopeImageError}</p>
                      </div>
                    ) : horoscopeImage ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={horoscopeImage} 
                          alt="Horoscope portrait"
                          className="w-full h-full object-cover"
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          onError={(e) => {
                            // Image failed to load (likely expired URL from old system)
                            // New images are stored in Supabase and won't expire
                            // Just hide the broken image
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            // Only show error for old expired URLs, not for new Supabase-stored images
                            if (horoscopeImage && horoscopeImage.includes('oaidalleapiprodscus')) {
                              setHoroscopeImageError('Image URL has expired. A new image will be generated tomorrow.')
                              console.log('Image URL expired (old OpenAI URL). New images are stored permanently in Supabase.')
                            }
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-between">
                  <div>
                    {mode !== 'chaos' && (
                      <Badge className={`${mode === 'chill' ? 'bg-[#4A1818] text-[#FFC043]' : mode === 'code' ? 'bg-[#FFFFFF] text-black border border-[#FFFFFF]' : 'bg-white text-black'} hover:opacity-90 ${mode === 'code' ? 'border-0' : 'border-0'} ${getRoundedClass('rounded-full')} font-black mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-[0.2em] ${mode === 'code' ? 'font-mono' : ''} px-3 md:px-4 py-1.5 md:py-2`}>
                        {mode === 'code' ? '[AI CHAOS AGENT]' : 'AI Chaos Agent'}
                      </Badge>
                    )}
                    <h1 className={`text-[clamp(2.5rem,7vw+0.5rem,7rem)] font-black mb-2 md:mb-3 leading-[0.85] tracking-tight uppercase ${mode === 'code' ? 'font-mono text-[#FFFFFF]' : style.text}`}>
                      {mode === 'code' ? `> Hello,` : `Hello,`}
                    </h1>
                    <h2 className={`text-[clamp(2rem,6vw+0.5rem,6rem)] font-black mb-2 md:mb-3 leading-[0.85] tracking-tight uppercase ${mode === 'code' ? 'font-mono text-[#FFFFFF]' : style.text}`}>
                      {mode === 'code' ? `${userFirstName || userName}` : `${userFirstName || userName}`}
                    </h2>
                    <p className={`text-[clamp(0.875rem,2vw+0.5rem,1.25rem)] font-semibold max-w-2xl leading-[1.2] tracking-tight ${mode === 'code' ? 'font-mono text-[#FFFFFF]' : style.text}`}>
                      {mode === 'code' 
                        ? `It's ${todayDate || 'Loading...'}`
                        : `It's ${todayDate || 'Loading...'}`
                      }
                    </p>
                    {(temperature || weatherCondition) && (
                      <p className={`text-[clamp(0.875rem,2vw+0.5rem,1.25rem)] font-semibold max-w-2xl leading-[1.2] tracking-tight mt-1 ${mode === 'code' ? 'font-mono text-[#FFFFFF]' : style.text}`}>
                        {mode === 'code' 
                          ? `${temperature || ''}${temperature && weatherCondition ? ' and ' : ''}${weatherCondition ? weatherCondition.charAt(0).toUpperCase() + weatherCondition.slice(1) : ''}`
                          : `${temperature || ''}${temperature && weatherCondition ? ' and ' : ''}${weatherCondition ? weatherCondition.charAt(0).toUpperCase() + weatherCondition.slice(1) : ''}`
                        }
                      </p>
                    )}
                    {characterName && (
                      <p className={`text-[clamp(0.875rem,2vw+0.5rem,1.25rem)] font-semibold max-w-2xl leading-[1.2] tracking-tight mt-1 ${mode === 'code' ? 'font-mono text-[#FFFFFF]' : style.text}`}>
                        {characterName}
                      </p>
                    )}
                  </div>
                  </div>
                  </Card>
                  
                  {/* Quick Links Card - 1/8 width, matches hero height */}
                  <div 
                    className={`transition-all duration-300 flex items-end justify-end py-3 px-6 flex-[1] min-h-[300px]`}
                  >
                    <div className="flex flex-col items-end gap-3 h-full w-full">
                      {/* Give Snap - Special action button, keep hardcoded */}
                      <Button 
                        onClick={() => setShowAddSnapDialog(true)}
                        className={`${mode === 'chaos' ? (isLightBg ? 'hover:bg-[#0F0F0F]' : 'hover:bg-[#2a2a2a]') + ' hover:scale-105' : mode === 'chill' ? 'hover:bg-[#3A1414]' : mode === 'code' ? 'hover:bg-[#1a1a1a] border border-[#FFFFFF]' : 'hover:bg-[#1a1a1a]'} font-semibold ${getRoundedClass('rounded-full')} py-2 px-5 text-sm tracking-normal transition-all hover:shadow-2xl ${mode === 'code' ? 'font-mono' : ''}`}
                        style={mode === 'chaos' ? {
                          backgroundColor: isLightBg ? '#000000' : '#1a1a1a',
                          color: '#FFFFFF'
                        } : mode === 'chill' ? {
                          backgroundColor: '#4A1818',
                          color: '#FFFFFF'
                        } : mode === 'code' ? {
                          backgroundColor: '#000000',
                          color: '#FFFFFF'
                        } : {
                          backgroundColor: '#000000',
                          color: '#FFFFFF'
                        }}
                      >
                        {mode === 'code' ? '[GIVE SNAP]' : 'Give Snap'} {mode !== 'code' && <Sparkles className="w-3 h-3 ml-2" />}
                      </Button>
                      
                      {/* Dynamic Quick Links from Database */}
                      {quickLinksLoading ? (
                        <div className="text-center py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        quickLinks.map((link) => {
                          // Get icon component dynamically
                          const IconComponent = link.icon_name && (LucideIcons as any)[link.icon_name] 
                            ? (LucideIcons as any)[link.icon_name] 
                            : ExternalLink
                          
                          // Handle URL - check if it's internal or external, or special actions
                          let handleClick: () => void
                          if (link.url === 'chatbot') {
                            handleClick = () => setShowChatbot(true)
                          } else if (link.url === 'playlist-section') {
                            handleClick = () => {
                          const playlistSection = document.getElementById('playlist-section')
                          if (playlistSection) {
                            playlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }
                            }
                          } else if (link.url.startsWith('/')) {
                            handleClick = () => router.push(link.url)
                          } else {
                            handleClick = () => window.open(link.url, '_blank')
                          }
                          
                          return (
                            <div key={link.id} className="flex flex-col items-end gap-1">
                      <Button 
                                onClick={handleClick}
                        className={`${mode === 'chaos' ? (isLightBg ? 'hover:bg-[#0F0F0F]' : 'hover:bg-[#2a2a2a]') + ' hover:scale-105' : mode === 'chill' ? 'hover:bg-[#3A1414]' : mode === 'code' ? 'hover:bg-[#1a1a1a] border border-[#FFFFFF]' : 'hover:bg-[#1a1a1a]'} font-semibold ${getRoundedClass('rounded-full')} py-2 px-5 text-sm tracking-normal transition-all hover:shadow-2xl ${mode === 'code' ? 'font-mono' : ''}`}
                        style={mode === 'chaos' ? {
                          backgroundColor: isLightBg ? '#000000' : '#1a1a1a',
                          color: '#FFFFFF'
                        } : mode === 'chill' ? {
                          backgroundColor: '#4A1818',
                          color: '#FFFFFF'
                        } : mode === 'code' ? {
                          backgroundColor: '#000000',
                          color: '#FFFFFF'
                        } : {
                          backgroundColor: '#000000',
                          color: '#FFFFFF'
                        }}
                      >
                                {mode === 'code' ? `[${link.label.toUpperCase()}]` : link.label} 
                                {mode !== 'code' && <IconComponent className="w-3 h-3 ml-2" />}
                      </Button>
                              {link.password && (
                                <span className={`text-[10px] ${mode === 'chaos' ? (isLightBg ? 'text-black/60' : 'text-white/60') : mode === 'chill' ? 'text-white/60' : 'text-white/60'}`}>
                                  {link.password}
                                </span>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </section>

        {/* News/Updates Card - Full width, only shown if there's news for today */}
        {(() => {
          const heroStyle = mode === 'chaos' ? getSpecificCardStyle('hero-large') : getCardStyle('hero')
          
          // Extract color from gradient or use accent color for dark background
          let heroBgColor = heroStyle.accent
          if (mode === 'chaos') {
            const timeGradient = getTimeBasedGradient()
            heroBgColor = timeGradient.accent
          } else if (mode === 'chill') {
            const timeGradientChill = getTimeBasedGradientChill()
            heroBgColor = timeGradientChill.accent
          } else {
            heroBgColor = '#FFFFFF'
          }
          
          // Convert hex to rgba with 30% opacity
          const hexToRgba = (hex: string, alpha: number) => {
            const r = parseInt(hex.slice(1, 3), 16)
            const g = parseInt(hex.slice(3, 5), 16)
            const b = parseInt(hex.slice(5, 7), 16)
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
          }
          
          const darkBgColor = hexToRgba(heroBgColor, 0.3)
          
          // Filter news for today
          const today = new Date().toISOString().split('T')[0]
          const todaysNews = dailyNews.filter(news => news.date === today)
          const hasNews = todaysNews.length > 0
          
          return hasNews ? (
            <section className="mb-6">
              <Card 
                className={`${getRoundedClass('rounded-[2.5rem]')} transition-all duration-300 flex items-center py-3 px-6 w-full`}
                style={{ 
                  backgroundColor: darkBgColor,
                  border: 'none',
                  minHeight: '70px'
                }}
              >
                <div className="flex items-center gap-4 w-full">
                  <span className={`font-black text-sm uppercase tracking-wider ${heroStyle.text} flex-shrink-0`}>
                    {mode === 'code' ? '[NEWS]' : 'News & Updates'}
                  </span>
                  <div className="flex-1 flex items-center gap-3 overflow-x-auto">
                    {todaysNews.map((news, index) => (
                      <div key={news.id} className="flex items-center gap-2 flex-shrink-0">
                        {index > 0 && <span className={`${heroStyle.text}/30`}>•</span>}
                        <span className={`text-sm ${heroStyle.text}`}>{news.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </section>
          ) : null
        })()}

        {/* Time Zones - 100% width, very short, between hero and horoscope */}
        <section className="mb-6">
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('timezones') : getCardStyle('team')
            // Get the hero gradient for the user's timezone card
            const heroGradient = mode === 'chaos' 
              ? getTimeBasedGradient()
              : mode === 'chill'
              ? getTimeBasedGradientChill()
              : { bg: 'bg-gradient-to-br from-[#6B2E8C] via-[#1B4D7C] to-[#0F172A]', text: 'text-white', accent: '#6B2E8C' }
            
            const emojiMap: Record<string, string> = {
              'PST': '🌉',
              'MST': '🏔️',
              'CST': '🏙️',
              'EST': '🗽',
              'GMT': '🏰',
              'IST': '🕌',
              'PHT': '🏝️',
            }
            
            return (
              <Card className={`${style.bg} ${style.border} p-3 ${getRoundedClass('rounded-xl')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center justify-between gap-2 md:gap-4 overflow-x-auto">
                  {timeZones.length > 0 ? timeZones.map((tz, idx) => {
                    const isUserTz = userTimeZone === tz.label
                    return (
                      <div 
                        key={tz.label} 
                        className={`flex items-center gap-2 flex-1 min-w-[100px] p-2 ${getRoundedClass('rounded-lg')} transition-all ${
                          isUserTz ? heroGradient.bg : ''
                        }`}
                        style={isUserTz ? {} : {
                          backgroundColor: '#333333',
                        } as React.CSSProperties}
                      >
                        <span className="text-2xl flex-shrink-0">{emojiMap[tz.label] || '🌍'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-black text-xs truncate ${
                            isUserTz 
                              ? heroGradient.text
                              : 'text-white'
                          }`}>
                            {tz.label}
                          </p>
                          <p className={`text-xs font-medium truncate ${
                            isUserTz 
                              ? mode === 'chaos' 
                                ? 'text-black/70' 
                                : mode === 'chill'
                                ? 'text-[#4A1818]/80'
                                : 'text-white/80'
                              : 'text-white/80'
                          }`}>
                            {tz.time}
                          </p>
                          {isUserTz && (
                            <p className={`text-[10px] font-bold mt-0.5 ${
                              mode === 'chaos' 
                                ? 'text-black/80' 
                                : mode === 'chill'
                                ? 'text-[#4A1818]/90'
                                : 'text-white/90'
                            }`}>
                              YOU
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  }) : (
                    // Loading state
                    <div className="flex items-center gap-2 flex-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                </div>
              </Card>
            )
          })()}
        </section>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
              <span className="text-[#808080]">FOR YOU</span>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
          For You
              {(() => {
                const colors = getSectionAccentColors('vibes')
                return (
                  <span className="flex items-center gap-1.5 ml-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[0] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[1] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[2] }}></span>
                  </span>
                )
              })()}
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-stretch">
          {/* Horoscope - 2 columns */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('horoscope') : getCardStyle('vibes')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} md:col-span-2 h-full flex flex-col`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                  <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
                <Sparkles className="w-4 h-4" />
                    <span className="uppercase tracking-wider font-black text-xs">Horoscope</span>
              </div>
                  <h2 className={`text-4xl font-black mb-6 uppercase`} style={{ color: style.accent }}>
                    {mode === 'code' ? `:: The universe tagged you in some feedback` : `The universe tagged you in some feedback`}
                  </h2>
                  
                  {horoscopeLoading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Loader2 className={`w-6 h-6 animate-spin ${style.text}`} />
                      <p className={`text-sm font-medium ${style.text} text-center`}>
                        {horoscopeLoadingMessages[horoscopeLoadingMessageIndex]}
                      </p>
              </div>
                  ) : horoscopeError ? (
                    <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} ${getRoundedClass('rounded-2xl')} p-4 border-2`} style={{ borderColor: `${style.accent}40` }}>
                      <p className={`text-sm ${style.text}`}>{horoscopeError}</p>
              </div>
                  ) : horoscope ? (
                    <div className="space-y-6">
                      {/* Horoscope Text Container */}
                      <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} ${getRoundedClass('rounded-2xl')} p-6 border-2`} style={{ borderColor: `${style.accent}40` }}>
                        <p className="text-base font-black mb-3 flex items-center gap-2" style={{ color: style.accent }}>
                          <span>{getStarSignEmoji(horoscope.star_sign)}</span>
                          <span>{horoscope.star_sign.toUpperCase()}</span>
                        </p>
                        <div className={`text-base leading-relaxed ${style.text} space-y-3`}>
                          {horoscope.horoscope_text.split('\n\n').map((paragraph, idx) => (
                            <p key={idx}>{paragraph}</p>
                          ))}
                </div>
                </div>
                    
                    {/* Bottom Row: Do's and Don'ts - Half Width Each */}
                    {(horoscope.horoscope_dos?.length || horoscope.horoscope_donts?.length) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Do's - Left Half */}
                        {horoscope.horoscope_dos && horoscope.horoscope_dos.length > 0 && (
                          <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} ${getRoundedClass('rounded-2xl')} p-4 border-2`} style={{ borderColor: '#22c55e40' }}>
                            <p className="text-xs font-black mb-3 uppercase tracking-wider" style={{ color: '#22c55e' }}>Do</p>
                            <ul className="space-y-2">
                              {horoscope.horoscope_dos.map((item, idx) => (
                                <li key={idx} className={`text-xs ${style.text} flex items-start gap-2`}>
                                  <span style={{ color: '#22c55e' }}>✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
            </div>
                        )}
                        
                        {/* Don'ts - Right Half */}
                        {horoscope.horoscope_donts && horoscope.horoscope_donts.length > 0 && (
                          <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} ${getRoundedClass('rounded-2xl')} p-4 border-2`} style={{ borderColor: '#ef444440' }}>
                            <p className="text-xs font-black mb-3 uppercase tracking-wider" style={{ color: '#ef4444' }}>Don't</p>
                            <ul className="space-y-2">
                              {horoscope.horoscope_donts.map((item, idx) => (
                                <li key={idx} className={`text-xs ${style.text} flex items-start gap-2`}>
                                  <span style={{ color: '#ef4444' }}>✗</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
            </div>
                        )}
                  </div>
                    )}
                  </div>
                  ) : (
                    <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} ${getRoundedClass('rounded-2xl')} p-4 border-2`} style={{ borderColor: `${style.accent}40` }}>
                      <p className={`text-sm ${style.text}`}>No horoscope available</p>
                </div>
                  )}
              </Card>
            )
          })()}

          {/* Right Column: Team Pulse */}
          <div className="md:col-span-1">
            <TeamPulseCard />
          </div>
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
              <span className="text-[#808080]">RECOGNITION & CULTURE</span>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
          Recognition & Culture
              {(() => {
                const colors = getSectionAccentColors('recognition')
                return (
                  <span className="flex items-center gap-1.5 ml-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[0] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[1] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[2] }}></span>
                  </span>
                )
              })()}
            </>
          )}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 items-stretch">
          <div className="flex flex-col h-full">
            {/* Beast Babe */}
            <BeastBabeCard />
          </div>

          {/* Snaps */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('snaps') : getCardStyle('recognition')
            return (
              <Card className={`lg:col-span-2 ${style.bg} ${style.border} p-8 ${getRoundedClass('rounded-[2.5rem]')} h-full flex flex-col`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : style.border.includes('border-2') ? { borderColor: style.accent } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-6" style={{ color: style.accent }}>
                  <Sparkles className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Recent Recognition</span>
                </div>
                <h2 className="text-6xl font-black mb-4 uppercase" style={{ color: style.accent }}>Your Snaps</h2>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSnapViewType('received')}
                      className={`px-4 py-2 rounded-full text-sm font-black uppercase transition-all ${
                        snapViewType === 'received'
                          ? mode === 'chaos'
                            ? 'bg-[#84CC16] text-black'
                            : mode === 'chill'
                            ? 'bg-[#FFB5D8] text-[#4A1818]'
                            : 'bg-white text-black'
                          : mode === 'chaos'
                          ? 'bg-black/40 text-[#84CC16]/60 border border-[#84CC16]/40'
                          : mode === 'chill'
                          ? 'bg-[#F5E6D3]/30 text-[#4A1818]/60 border border-[#FFB5D8]/40'
                          : 'bg-black/40 text-white/60 border border-white/40'
                      }`}
                    >
                      Received
                    </button>
                    <button
                      onClick={() => setSnapViewType('given')}
                      className={`px-4 py-2 rounded-full text-sm font-black uppercase transition-all ${
                        snapViewType === 'given'
                          ? mode === 'chaos'
                            ? 'bg-[#84CC16] text-black'
                            : mode === 'chill'
                            ? 'bg-[#FFB5D8] text-[#4A1818]'
                            : 'bg-white text-black'
                          : mode === 'chaos'
                          ? 'bg-black/40 text-[#84CC16]/60 border border-[#84CC16]/40'
                          : mode === 'chill'
                          ? 'bg-[#F5E6D3]/30 text-[#4A1818]/60 border border-[#FFB5D8]/40'
                          : 'bg-black/40 text-white/60 border border-white/40'
                      }`}
                    >
                      Given
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/snaps">
                      <Button className={`${mode === 'chaos' ? 'bg-black/40 hover:bg-black/60 border-2 border-[#84CC16] text-[#84CC16]' : mode === 'chill' ? 'bg-[#F5E6D3]/30 hover:bg-[#F5E6D3]/50 border-2 border-[#FFB5D8] text-[#4A1818]' : 'bg-black/40 hover:bg-black/60 border-2 border-white text-white'} font-black rounded-full h-10 px-6 text-sm uppercase`}>
                        VIEW ALL
                      </Button>
                    </Link>
                    <Button 
                      onClick={() => setShowAddSnapDialog(true)}
                      className={`${mode === 'chaos' ? 'bg-gradient-to-r from-[#10B981] to-[#047857] hover:from-[#10B981] hover:to-[#10B981] text-black' : mode === 'chill' ? 'bg-gradient-to-r from-[#C8D961] to-[#FFC043] hover:from-[#C8D961] hover:to-[#C8D961] text-[#4A1818]' : 'bg-gradient-to-r from-[#cccccc] to-[#e5e5e5] hover:from-[#cccccc] hover:to-[#cccccc] text-black'} font-black rounded-full h-10 px-6 text-sm uppercase`}
                    >
                      + GIVE A SNAP
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 mb-6 mt-2 flex-1 flex flex-col">
                  {snaps.length === 0 ? (
                    <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/40'} rounded-xl p-5 border-2`} style={{ borderColor: `${style.accent}66` }}>
                      <p className={`text-sm ${style.text}/80 text-center`}>No snaps yet. Be the first to recognize someone!</p>
                    </div>
                  ) : (
                    snaps.map((snap, idx) => {
                      const senderName = snap.submitted_by_profile?.full_name || snap.submitted_by_profile?.email || null
                      // Get all recipient names - prefer recipients array, fallback to mentioned_user_profile
                      const recipientNames = snap.recipients && snap.recipients.length > 0
                        ? snap.recipients.map(r => r.recipient_profile?.full_name || r.recipient_profile?.email).filter(Boolean)
                        : [snap.mentioned_user_profile?.full_name || snap.mentioned_user_profile?.email || snap.mentioned || 'Team'].filter(Boolean)
                      const recipientName = recipientNames.length > 0 
                        ? recipientNames.join(', ')
                        : 'Team'
                      
                      // Get recipient profiles for avatar display
                      const recipientProfiles = snap.recipients && snap.recipients.length > 0
                        ? snap.recipients
                            .map(r => r.recipient_profile)
                            .filter((p): p is NonNullable<typeof p> => p !== null)
                        : snap.mentioned_user_profile
                          ? [snap.mentioned_user_profile]
                          : []
                      
                      // Determine if there are multiple recipients
                      const hasMultipleRecipients = recipientProfiles.length > 1
                      
                      // For single recipient: show normal avatar
                      // For multiple recipients: show small avatars in rows
                      let profilePicture: string | null = null
                      let avatarName: string | null = null
                      if (!hasMultipleRecipients) {
                        if (snapViewType === 'received') {
                          profilePicture = snap.submitted_by_profile?.avatar_url || null
                          avatarName = senderName
                        } else {
                          profilePicture = snap.mentioned_user_profile?.avatar_url || null
                          avatarName = recipientName
                        }
                      }
                      
                      return (
                        <div key={snap.id} className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/40'} rounded-xl p-1.5 border-2 transition-all hover:opacity-80 relative`} style={{ borderColor: `${style.accent}66` }}>
                          <div className="flex items-start gap-2">
                            {/* Avatar section - only show for single recipient, or show small avatars in rows for multiple */}
                            {!hasMultipleRecipients && profilePicture ? (
                              <div className="flex-shrink-0" style={{ width: '50px', height: '50px' }}>
                                <img
                                  src={profilePicture}
                                  alt={avatarName || 'User'}
                                  className="rounded-lg w-full h-full object-cover border"
                                  style={{
                                    borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                    borderWidth: '1.5px',
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                    const parent = target.parentElement
                                    if (parent) {
                                      const fallback = parent.querySelector(`.snap-avatar-fallback-${idx}`) as HTMLElement
                                      if (fallback) fallback.style.display = 'flex'
                                    }
                                  }}
                                />
                                <div
                                  className={`snap-avatar-fallback-${idx} w-full h-full rounded-lg flex items-center justify-center hidden border`}
                                  style={{
                                    backgroundColor: style.accent,
                                    borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                    borderWidth: '1.5px',
                                  }}
                                >
                                  <User className={`w-3 h-3 ${mode === 'chaos' || mode === 'code' ? 'text-black' : mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                                </div>
                              </div>
                            ) : hasMultipleRecipients ? (
                              <div className="flex-shrink-0" style={{ width: '50px', height: '50px' }}>
                                {/* Stacked overlapping avatars for multiple recipients */}
                                <div className="relative" style={{ width: '50px', height: '50px' }}>
                                  {recipientProfiles.slice(0, 3).map((profile, index) => {
                                    const avatarSize = 32
                                    const overlap = 12
                                    const leftOffset = index * (avatarSize - overlap)
                                    const zIndex = 10 - index
                                    
                                    return (
                                      <div
                                        key={(profile as any).id || `profile-${idx}-${index}`}
                                        className="absolute"
                                        style={{
                                          left: `${leftOffset}px`,
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          width: `${avatarSize}px`,
                                          height: `${avatarSize}px`,
                                          zIndex: zIndex,
                                        }}
                                      >
                                        {profile.avatar_url ? (
                                          <img
                                            src={profile.avatar_url}
                                            alt={profile.full_name || profile.email || 'User'}
                                            className="rounded-full w-full h-full object-cover border-2"
                                            style={{
                                              borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                              backgroundColor: '#fff',
                                            }}
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement
                                              target.style.display = 'none'
                                              const parent = target.parentElement
                                              if (parent) {
                                                const fallback = parent.querySelector(`.snap-stacked-avatar-fallback-${idx}-${index}`) as HTMLElement
                                                if (fallback) fallback.style.display = 'flex'
                                              }
                                            }}
                                          />
                                        ) : (
                                          <div className="w-full h-full rounded-full flex items-center justify-center border-2" style={{
                                            backgroundColor: style.accent,
                                            borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                          }}>
                                            <User className={`w-3 h-3 ${mode === 'chaos' || mode === 'code' ? 'text-black' : mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                                          </div>
                                        )}
                                        <div className={`snap-stacked-avatar-fallback-${idx}-${index} w-full h-full rounded-full flex items-center justify-center hidden border-2`} style={{
                                          backgroundColor: style.accent,
                                          borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                        }}>
                                          <User className={`w-3 h-3 ${mode === 'chaos' || mode === 'code' ? 'text-black' : mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                                        </div>
                                      </div>
                                    )
                                  })}
                                  {/* Show count badge if more than 3 recipients */}
                                  {recipientProfiles.length > 3 && (
                                    <div
                                      className="absolute"
                                      style={{
                                        left: `${3 * (32 - 12)}px`,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '32px',
                                        height: '32px',
                                        zIndex: 1,
                                      }}
                                    >
                                      <div className="w-full h-full rounded-full flex items-center justify-center border-2 text-[8px] font-bold" style={{
                                        backgroundColor: style.accent,
                                        borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                        color: mode === 'chaos' || mode === 'code' ? '#000000' : mode === 'chill' ? '#4A1818' : '#FFFFFF',
                                      }}>
                                        +{recipientProfiles.length - 3}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex-shrink-0 w-[50px] h-[50px] rounded-lg flex items-center justify-center border" style={{
                                backgroundColor: style.accent,
                                borderColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#FFFFFF' : '#FFFFFF',
                                borderWidth: '1.5px',
                              }}>
                                <User className={`w-3 h-3 ${mode === 'chaos' || mode === 'code' ? 'text-black' : mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <p className={`text-lg mb-2 leading-relaxed ${style.text}`}>{snap.snap_content}</p>
                              {snapViewType === 'received' && senderName && (
                                <p className={`text-xs ${style.text}/60`}>
                                  From: {senderName}
                                </p>
                              )}
                              {snapViewType === 'given' && (
                                <p className={`text-xs ${style.text}/60`}>
                                  To: {recipientName}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </Card>
            )
          })()}
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
              <span className="text-[#808080]">THIS WEEK</span>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
          This Week
              {(() => {
                const colors = getSectionAccentColors('work')
                return (
                  <span className="flex items-center gap-1.5 ml-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[0] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[1] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[2] }}></span>
                  </span>
                )
              })()}
            </>
          )}
        </p>

        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-stretch`}>
          {/* Events */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('events') : getCardStyle('work')
            const mintColor = mode === 'chaos' ? '#00A3E0' : '#00FF87' // Work section uses Ocean from BLUE SYSTEM
            
            // Filter events for today or week view
            const now = new Date()
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
            const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000)
            
            // Calculate birthdays and anniversaries for the week
            const getBirthdaysAndAnniversaries = () => {
              const events: Array<{
                id: string
                summary: string
                start: { date: string }
                end: { date: string }
                calendarId: string
                calendarName: string
                isBirthday?: boolean
                isAnniversary?: boolean
              }> = []
              
              const currentYear = now.getFullYear()
              const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
              weekStart.setHours(0, 0, 0, 0)
              const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
              
              profiles.forEach(profile => {
                // Process birthdays
                if (profile.birthday) {
                  const [month, day] = profile.birthday.split('/').map(Number)
                  if (month && day) {
                    const birthdayThisYear = new Date(currentYear, month - 1, day)
                    birthdayThisYear.setHours(0, 0, 0, 0)
                    
                    // Check if birthday falls in the week
                    if (birthdayThisYear >= weekStart && birthdayThisYear < weekEnd) {
                      const dateStr = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      events.push({
                        id: `birthday-${profile.id}-${dateStr}`,
                        summary: `🎂 ${profile.full_name || 'Unknown'}`,
                        start: { date: dateStr },
                        end: { date: dateStr },
                        calendarId: 'birthdays',
                        calendarName: 'Birthdays',
                        isBirthday: true
                      })
                    }
                  }
                }
                
                // Process anniversaries (work start date)
                if (profile.start_date) {
                  // Parse start_date as local date (YYYY-MM-DD format)
                  const [year, month, day] = profile.start_date.split('-').map(Number)
                  if (year && month && day) {
                    const startMonth = month
                    const startDay = day
                    
                    const anniversaryThisYear = new Date(currentYear, startMonth - 1, startDay)
                    anniversaryThisYear.setHours(0, 0, 0, 0)
                    
                    // Check if anniversary falls in the week
                    if (anniversaryThisYear >= weekStart && anniversaryThisYear < weekEnd) {
                      const dateStr = `${currentYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
                      const years = currentYear - year
                      events.push({
                        id: `anniversary-${profile.id}-${dateStr}`,
                        summary: `🎉 ${profile.full_name || 'Unknown'} (${years} year${years !== 1 ? 's' : ''})`,
                        start: { date: dateStr },
                        end: { date: dateStr },
                        calendarId: 'anniversaries',
                        calendarName: 'Anniversaries',
                        isAnniversary: true
                      })
                    }
                  }
                }
              })
              
              return events
            }

            // Filter events and deduplicate
            const filteredEvents = (() => {
              // First, filter events by date range
              const dateFilteredEvents = calendarEvents.filter(event => {
                const eventStart = event.start.dateTime 
                  ? new Date(event.start.dateTime)
                  : event.start.date 
                    ? new Date(event.start.date)
                    : null
                
                if (!eventStart) return false
                
                // For week view, include events that overlap with the week
                if (eventsExpanded) {
                  const eventEnd = event.end.dateTime 
                    ? new Date(event.end.dateTime)
                    : event.end.date 
                      ? new Date(event.end.date)
                      : eventStart
                  
                  // For all-day events, end date is exclusive (next day), so subtract 1 day
                  const actualEnd = event.end.date 
                    ? new Date(eventEnd.getTime() - 24 * 60 * 60 * 1000)
                    : eventEnd
                  
                  // Event overlaps if it starts before week ends and ends after week starts
                  return eventStart < weekEnd && actualEnd >= todayStart
                } else {
                  // For today view, exclude OOO events (we'll show them separately)
                  const isOOO = event.calendarId.includes('6elnqlt8ok3kmcpim2vge0qqqk') || event.calendarId.includes('ojeuiov0bhit2k17g8d6gj4i68')
                  if (isOOO) return false
                  
                  // Show events that start today or in the rest of the week
                  // We'll separate them in the rendering
                  return eventStart >= todayStart && eventStart < weekEnd
                }
              })
              
              // First, collect all holiday dates to mark office events on those days
              const holidayDates = new Set<string>()
              const getEventDateString = (event: typeof calendarEvents[0]) => {
                if (event.start.date) {
                  return event.start.date // All-day event, date is YYYY-MM-DD
                } else if (event.start.dateTime) {
                  const date = new Date(event.start.dateTime)
                  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                }
                return ''
              }
              
              dateFilteredEvents.forEach(event => {
                if (event.calendarId.includes('holiday')) {
                  const startDate = getEventDateString(event)
                  if (startDate) {
                    // Add start date
                    holidayDates.add(startDate)
                    
                    // If it's a multi-day holiday, add all days
                    if (event.end.date) {
                      const endDate = new Date(event.end.date)
                      endDate.setDate(endDate.getDate() - 1) // Google Calendar end dates are exclusive
                      const start = new Date(startDate)
                      const current = new Date(start)
                      while (current <= endDate) {
                        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
                        holidayDates.add(dateStr)
                        current.setDate(current.getDate() + 1)
                      }
                    } else if (event.end.dateTime) {
                      const endDate = new Date(event.end.dateTime)
                      const start = new Date(startDate)
                      const current = new Date(start)
                      while (current <= endDate) {
                        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
                        holidayDates.add(dateStr)
                        current.setDate(current.getDate() + 1)
                      }
                    }
                  }
                }
              })
              
              // Deduplicate events - same event might appear in multiple calendars (e.g., holidays and office events)
              // Use a Map to track the best event for each normalized key
              const eventMap = dateFilteredEvents.reduce((eventMap: Map<string, typeof calendarEvents[0] & { isOfficeClosed?: boolean }>, event) => {
                // Normalize event summary (remove common variations, trim, lowercase for comparison)
                const normalizeSummary = (summary: string) => {
                  return summary
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .replace(/[^\w\s]/g, '') // Remove punctuation for comparison
                }
                
                // Check if two normalized summaries are similar enough to be considered the same event
                const areSimilar = (summary1: string, summary2: string) => {
                  const norm1 = normalizeSummary(summary1)
                  const norm2 = normalizeSummary(summary2)
                  
                  // Exact match after normalization
                  if (norm1 === norm2) return true
                  
                  // One contains the other (e.g., "thanksgiving" vs "thanksgiving day")
                  if (norm1.includes(norm2) || norm2.includes(norm1)) {
                    // Only consider it a match if the shorter one is at least 5 characters
                    const shorter = norm1.length < norm2.length ? norm1 : norm2
                    return shorter.length >= 5
                  }
                  
                  return false
                }
                
                // Get event date (for all-day events, use date; for timed events, use dateTime)
                const getEventDate = (event: typeof calendarEvents[0]) => {
                  if (event.start.date) {
                    return event.start.date // All-day event, date is YYYY-MM-DD
                  } else if (event.start.dateTime) {
                    const date = new Date(event.start.dateTime)
                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                  }
                  return ''
                }
                
                const eventDate = getEventDate(event)
                const normalizedSummary = normalizeSummary(event.summary)
                
                // Check if we already have a similar event on the same date
                let existingEvent: typeof calendarEvents[0] & { isOfficeClosed?: boolean } | undefined = undefined
                let existingKey: string | undefined = undefined
                
                for (const [key, existing] of eventMap.entries()) {
                  const [, existingDate] = key.split('|')
                  if (existingDate === eventDate && areSimilar(event.summary, existing.summary)) {
                    existingEvent = existing
                    existingKey = key
                    break
                  }
                }
                
                // Helper function to check if an event is on a holiday date
                const checkIfOnHolidayDate = (evt: typeof calendarEvents[0], evtDate: string): boolean => {
                  let isOnHoliday = holidayDates.has(evtDate)
                  
                  // If it's a multi-day event, check if any day overlaps with a holiday
                  if (!isOnHoliday) {
                    if (evt.end.date) {
                      const endDate = new Date(evt.end.date)
                      endDate.setDate(endDate.getDate() - 1) // Google Calendar end dates are exclusive
                      const start = new Date(evtDate)
                      const current = new Date(start)
                      while (current <= endDate && !isOnHoliday) {
                        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
                        if (holidayDates.has(dateStr)) {
                          isOnHoliday = true
                          break
                        }
                        current.setDate(current.getDate() + 1)
                      }
                    } else if (evt.end.dateTime) {
                      const endDate = new Date(evt.end.dateTime)
                      const start = new Date(evtDate)
                      const current = new Date(start)
                      while (current <= endDate && !isOnHoliday) {
                        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
                        if (holidayDates.has(dateStr)) {
                          isOnHoliday = true
                          break
                        }
                        current.setDate(current.getDate() + 1)
                      }
                    }
                  }
                  
                  return isOnHoliday
                }
                
                // Check if this office event is on a holiday date
                const isOfficeEvent = event.calendarId.includes('5b18ulcjgibgffc35hbtmv6sfs')
                const isOnHolidayDate = isOfficeEvent ? checkIfOnHolidayDate(event, eventDate) : false
                
                if (!existingEvent) {
                  // First time seeing this event, add it with normalized key
                  const eventKey = `${normalizedSummary}|${eventDate}`
                  // If it's an office event on a holiday date, mark it as office closed
                  const eventToAdd = isOfficeEvent && isOnHolidayDate 
                    ? { ...event, isOfficeClosed: true }
                    : event
                  eventMap.set(eventKey, eventToAdd)
                } else {
                  // Duplicate found - check calendar types
                  const isExistingHoliday = existingEvent.calendarId.includes('holiday')
                  const isCurrentHoliday = event.calendarId.includes('holiday')
                  const isExistingOffice = existingEvent.calendarId.includes('5b18ulcjgibgffc35hbtmv6sfs')
                  const isCurrentOffice = event.calendarId.includes('5b18ulcjgibgffc35hbtmv6sfs')
                  
                  // If both are holidays, don't add (we don't show holidays)
                  if (isCurrentHoliday && isExistingHoliday) {
                    // Skip - we don't show holidays
                  } else if (isCurrentHoliday) {
                    // Current is holiday, existing is not - skip holiday (we don't show holidays)
                  } else if (isExistingHoliday) {
                    // Existing is holiday, current is not - replace with current (office event)
                    if (existingKey) {
                      eventMap.delete(existingKey)
                    }
                    const newKey = `${normalizedSummary}|${eventDate}`
                    const eventToAdd = isCurrentOffice && isOnHolidayDate 
                      ? { ...event, isOfficeClosed: true }
                      : event
                    eventMap.set(newKey, eventToAdd)
                  } else if (isCurrentOffice && isExistingOffice) {
                    // Both are office events, keep existing (don't add duplicate)
                    // But check if either event is on a holiday date and update accordingly
                    const existingEventDate = getEventDate(existingEvent)
                    const existingIsOnHoliday = checkIfOnHolidayDate(existingEvent, existingEventDate)
                    const shouldBeOfficeClosed = isOnHolidayDate || existingIsOnHoliday
                    
                    if (shouldBeOfficeClosed && !(existingEvent as any).isOfficeClosed) {
                      if (existingKey) {
                        eventMap.delete(existingKey)
                      }
                      const newKey = `${normalizedSummary}|${eventDate}`
                      eventMap.set(newKey, { ...existingEvent, isOfficeClosed: true })
                    }
                  } else {
                    // Different types, prefer office
                    if (isCurrentOffice) {
                      if (existingKey) {
                        eventMap.delete(existingKey)
                      }
                      const newKey = `${normalizedSummary}|${eventDate}`
                      const eventToAdd = isOnHolidayDate 
                        ? { ...event, isOfficeClosed: true }
                        : event
                      eventMap.set(newKey, eventToAdd)
                    }
                    // Otherwise keep existing
                  }
                }
                
                return eventMap
              }, new Map())
              
              // Convert Map values to array
              const deduplicatedEvents = Array.from(eventMap.values())
              
              // Filter out all holidays - we don't show holidays, only office events (which may be marked as office closed)
              const filteredDeduplicatedEvents = deduplicatedEvents.filter(event => {
                const isHoliday = event.calendarId.includes('holiday')
                // Don't show holidays at all
                return !isHoliday
              })
              
              // Add birthdays and anniversaries at the top (only for week view)
              const birthdaysAndAnniversaries = eventsExpanded ? getBirthdaysAndAnniversaries() : []
              
              // Combine and sort: birthdays/anniversaries first, then other events
              const allEvents = [...birthdaysAndAnniversaries, ...filteredDeduplicatedEvents].sort((a, b) => {
                // Birthdays and anniversaries always come first
                const aIsSpecial = (a as any).isBirthday || (a as any).isAnniversary
                const bIsSpecial = (b as any).isBirthday || (b as any).isAnniversary
                
                if (aIsSpecial && !bIsSpecial) return -1
                if (!aIsSpecial && bIsSpecial) return 1
                
                // Within same category, sort by date
                const aStart = a.start.dateTime ? new Date(a.start.dateTime) : (a.start.date ? new Date(a.start.date) : new Date(0))
                const bStart = b.start.dateTime ? new Date(b.start.dateTime) : (b.start.date ? new Date(b.start.date) : new Date(0))
                return aStart.getTime() - bStart.getTime()
              })
              
              return allEvents
            })()

            // Format time for display
            const formatEventTime = (event: typeof calendarEvents[0]) => {
              if (event.start.dateTime) {
                const date = new Date(event.start.dateTime)
                return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              } else if (event.start.date) {
                return 'All Day'
              }
              return ''
            }

            // Get event color based on calendar type
            const getEventColor = (event: typeof calendarEvents[0] & { isOfficeClosed?: boolean; isBirthday?: boolean; isAnniversary?: boolean }) => {
              const calendarId = event.calendarId
              
              // Birthdays and anniversaries
              if (event.isBirthday) {
                return '#FFB6C1' // Light pink for birthdays
              }
              if (event.isAnniversary) {
                return '#FFD700' // Gold for anniversaries
              }
              
              // Out of office (both calendars)
              if (calendarId.includes('6elnqlt8ok3kmcpim2vge0qqqk') || calendarId.includes('ojeuiov0bhit2k17g8d6gj4i68')) {
                return '#FF6B6B' // Red
              }
              
              // Strategy team
              if (calendarId.includes('6236655ee40ad4fcbedc4e96ce72c39783f27645dbdd22714ca9bc90fcc551ac')) {
                return mode === 'chaos' ? '#1B4D7C' : '#9D4EFF' // Navy from BLUE SYSTEM
              }
              
              // Office events on holiday dates (office closed) - check this before regular office events
              if (event.isOfficeClosed) {
                return mode === 'chaos' ? '#FFA500' : '#FF8C00' // Orange to indicate office closed
              }
              
              // Office events (default)
              if (calendarId.includes('5b18ulcjgibgffc35hbtmv6sfs')) {
                return mode === 'chaos' ? '#00A3E0' : '#00FF87' // Ocean from BLUE SYSTEM
              }
              
              // Default fallback
              return mode === 'chaos' ? '#00A3E0' : '#00FF87' // Ocean from BLUE SYSTEM
            }

            // Generate week days for Gantt chart
            const getWeekDays = () => {
              const days = []
              // Use local date to avoid timezone issues
              const today = new Date()
              today.setHours(0, 0, 0, 0) // Set to local midnight
              for (let i = 0; i < 7; i++) {
                const day = new Date(today)
                day.setDate(today.getDate() + i)
                days.push(day)
              }
              return days
            }

            // Calculate event span across days
            const getEventSpan = (event: typeof calendarEvents[0]) => {
              let start: Date | null = null
              let end: Date | null = null
              
              if (event.start.dateTime) {
                // Timed event - parse as-is (includes timezone info)
                start = new Date(event.start.dateTime)
              } else if (event.start.date) {
                // All-day event - parse date string as local date (YYYY-MM-DD)
                // Split and create date in local timezone to avoid UTC conversion issues
                const [year, month, day] = event.start.date.split('-').map(Number)
                start = new Date(year, month - 1, day)
                start.setHours(0, 0, 0, 0)
              }
              
              if (event.end.dateTime) {
                end = new Date(event.end.dateTime)
              } else if (event.end.date) {
                // All-day event - parse date string as local date
                const [year, month, day] = event.end.date.split('-').map(Number)
                end = new Date(year, month - 1, day)
                end.setHours(0, 0, 0, 0)
                // For all-day events, Google Calendar uses exclusive end dates (next day)
                // So we need to subtract 1 day to get the actual last day
                end = new Date(end.getTime() - 24 * 60 * 60 * 1000)
              }
              
              if (!start) return { startDay: 0, endDay: 0, isMultiDay: false }
              if (!end) end = start
              
              // Use local date for week start to match
              const weekStart = new Date()
              weekStart.setHours(0, 0, 0, 0)
              
              // Calculate days relative to week start
              const startDay = Math.floor((start.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
              const endDay = Math.floor((end.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
              
              return {
                startDay: Math.max(0, Math.min(6, startDay)),
                endDay: Math.max(0, Math.min(6, endDay)),
                isMultiDay: endDay > startDay,
                start,
                end
              }
            }

            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} ${eventsExpanded ? 'md:col-span-2' : 'md:col-span-1'} h-full flex flex-col`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : { borderColor: style.accent }}
              >
                <div className="flex items-start justify-between mb-4">
                  <h2 className={`text-3xl font-black uppercase ${style.text}`}>EVENTS</h2>
                  <button
                    onClick={() => setEventsExpanded(!eventsExpanded)}
                    className={`${getRoundedClass('rounded-lg')} px-3 py-1.5 flex items-center gap-1 text-xs font-black transition-all flex-shrink-0`}
                    style={{ 
                      backgroundColor: style.accent,
                      color: mode === 'chaos' ? '#000000' : mode === 'chill' ? '#4A1818' : '#FFFFFF'
                    }}
                  >
                    {eventsExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        Expand
                      </>
                    )}
                  </button>
                </div>
                
                {/* White Container - wraps calendar and key only */}
                <div className="bg-white rounded-[2rem] p-6 flex-1 flex flex-col">
                  {calendarLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-black" />
                  </div>
                ) : calendarError ? (
                  <div className={`${getRoundedClass('rounded-lg')} p-4 space-y-2`} style={{ backgroundColor: `${mintColor}33` }}>
                    <p className="text-sm font-black text-black">Calendar Connection Issue</p>
                    {calendarError.includes('Google Calendar API has not been used') || calendarError.includes('disabled') ? (
                      <div className={`text-xs ${style.text}/80 space-y-1`}>
                        <p>The Google Calendar API needs to be enabled in your Google Cloud project.</p>
                        <p className="mt-2">Enable it at:</p>
                        <a 
                          href="https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=141888268813" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline text-blue-400 hover:text-blue-300"
                        >
                          Google Cloud Console
                        </a>
                      </div>
                    ) : calendarError.includes('Not Found') || calendarError.includes('404') ? (
                      <div className={`text-xs ${style.text}/80 space-y-2`}>
                        <p>Some calendars are not accessible. The app is using your Google account to access calendars.</p>
                        {tokenError && (
                          <div className={`${getRoundedClass('rounded-lg')} p-2 mt-2`} style={{ backgroundColor: `${mintColor}22` }}>
                            <p className="font-semibold mb-1 text-red-400">Token Error:</p>
                            <p className="text-[10px]">{tokenError}</p>
                            {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                              <p className="text-[10px] mt-1">Make sure NEXT_PUBLIC_GOOGLE_CLIENT_ID is set in your environment variables.</p>
                            )}
                          </div>
                        )}
                        {((!googleCalendarToken && !tokenLoading) || needsAuth) && (
                          <div className={`${getRoundedClass('rounded-lg')} p-2 mt-2`} style={{ backgroundColor: `${mintColor}22` }}>
                            <p className="font-semibold mb-1">Google Calendar Access Required</p>
                            {tokenError ? (
                              <>
                                <p className="text-[10px] mb-2 text-red-400">{tokenError}</p>
                                {tokenError.includes('NEXT_PUBLIC_GOOGLE_CLIENT_ID') && (
                                  <p className="text-[10px] mt-2 font-semibold text-yellow-400">
                                    ⚠️ Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env.local file and restart the dev server.
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-[10px] mb-2">The app needs permission to access your Google Calendar to show your events.</p>
                            )}
                            {initiateAuth && (
                              <Button
                                onClick={initiateAuth}
                                className="mt-2 text-xs h-7 px-3"
                                size="sm"
                              >
                                Connect Google Calendar
                              </Button>
                            )}
                          </div>
                        )}
                        {tokenLoading && !needsAuth && (
                          <div className={`${getRoundedClass('rounded-lg')} p-2 mt-2`} style={{ backgroundColor: `${mintColor}22` }}>
                            <p className="text-[10px]">⏳ Loading Google Calendar access...</p>
                          </div>
                        )}
                        {/* Debug info */}
                        <div className={`${getRoundedClass('rounded-lg')} p-2 mt-2 text-[10px]`} style={{ backgroundColor: `${mintColor}11` }}>
                          <p className="font-semibold mb-1">Debug Info:</p>
                          <p>Token Status: {googleCalendarToken ? '✅ Available' : tokenLoading ? '⏳ Loading...' : '❌ Not available'}</p>
                          <p>Token Error: {tokenError || 'None'}</p>
                          <p>Auth Method: {serviceAccountEmail || 'Unknown'}</p>
                          {googleCalendarToken && (
                            <p className="text-green-400">✅ Using OAuth token (should work with shared calendars)</p>
                          )}
                          {!googleCalendarToken && !tokenLoading && (
                            <p className="text-yellow-400">⚠️ Using fallback authentication (service account - may not work with shared calendars)</p>
                          )}
                        </div>
                        {serviceAccountEmail && !serviceAccountEmail.includes('OAuth2') && (
                          <div className={`${getRoundedClass('rounded-lg')} p-2 mt-2`} style={{ backgroundColor: `${mintColor}22` }}>
                            <p className="font-semibold mb-1">Fallback Authentication:</p>
                            <p className="font-mono text-[10px] break-all">{serviceAccountEmail}</p>
                          </div>
                        )}
                        <p className="mt-2 font-semibold">To fix shared calendar access:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Make sure you're logged in with the Google account that has access to these calendars</li>
                          <li>Grant calendar access when prompted (the consent dialog should appear automatically)</li>
                          <li>If calendars still don't load, verify you can see them in your Google Calendar app</li>
                        </ol>
                      </div>
                    ) : (
                    <p className={`text-xs ${style.text}/80`}>{calendarError}</p>
                    )}
                  </div>
                ) : eventsExpanded ? (
                  // Week view - Gantt chart style
                  <div className="space-y-4 flex-1 flex flex-col">
                    {/* Key/Legend */}
                    <div className={`${getRoundedClass('rounded-lg')} p-3 mb-4`} style={{ backgroundColor: `${mintColor}22` }}>
                      <p className="text-xs font-black uppercase mb-2 text-black">Key:</p>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FF6B6B' }}></div>
                          <span className="text-[10px] text-black/80">Out of Office</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: mode === 'chaos' ? '#1E3A8A' : '#9D4EFF' }}></div>
                          <span className="text-[10px] text-black/80">Strategy Team</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: mode === 'chaos' ? '#FFA500' : '#FF8C00' }}></div>
                          <span className="text-[10px] text-black/80">Office Closed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: mode === 'chaos' ? '#0EA5E9' : '#00FF87' }}></div>
                          <span className="text-[10px] text-black/80">Office Events</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Calendar Container */}
                    <div className={`${getRoundedClass('rounded-xl')} border-2 relative`} style={{ 
                      backgroundColor: 'transparent',
                      borderColor: mode === 'chaos' ? '#0EA5E9' : mode === 'chill' ? 'rgba(74, 24, 24, 0.2)' : '#FFFFFF',
                      padding: '1rem'
                    }}>
                      {/* Day headers with dark blue background */}
                      {(() => {
                        const hasBirthdaysOrAnniversaries = filteredEvents.some((e: any) => e.isBirthday || e.isAnniversary)
                        return (
                          <div className={`grid grid-cols-7 pb-3 pt-2 rounded-t-lg ${hasBirthdaysOrAnniversaries ? 'mb-3' : 'mb-0'}`} style={{ 
                            backgroundColor: mode === 'chaos' ? '#1E3A8A' : mode === 'chill' ? '#4A1818' : '#000000',
                            borderBottom: `1px solid ${mode === 'chaos' ? 'rgba(14, 165, 233, 0.3)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.3)' : 'rgba(255, 255, 255, 0.3)'}`
                          }}>
                        {getWeekDays().map((day, index) => {
                          const isToday = day.toDateString() === now.toDateString()
                          const dayName = day.toLocaleDateString('en-US', { weekday: 'short' })
                          const dayNumber = day.getDate()
                          return (
                            <div 
                              key={index} 
                              className="text-center relative"
                              style={{ 
                                borderRight: index < 6 ? `1px solid ${mode === 'chaos' ? 'rgba(14, 165, 233, 0.3)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.3)' : 'rgba(255, 255, 255, 0.3)'}` : 'none'
                              }}
                            >
                              <p className={`text-xs font-black uppercase mb-0.5`} style={{ color: isToday ? mintColor : '#FFFFFF' }}>
                                {isToday ? 'TODAY' : dayName}
                              </p>
                              <p className={`text-sm font-black`} style={{ color: '#FFFFFF' }}>{dayNumber}</p>
                            </div>
                          )
                        })}
                          </div>
                        )
                      })()}
                      
                      {/* Check if there are any birthdays/anniversaries to determine top spacing */}
                      {(() => {
                        const hasBirthdaysOrAnniversaries = filteredEvents.some((e: any) => e.isBirthday || e.isAnniversary)
                        // Calculate top offset: if there are birthdays/anniversaries, start after them (top-20), otherwise start right after headers
                        // Header has pt-2 pb-3, so approximately 3.5rem from top of container
                        const headerHeight = '3.5rem'
                        const topOffset = hasBirthdaysOrAnniversaries ? 'top-20' : headerHeight
                        
                        return (
                          <>
                            {/* Background grid for vertical lines (behind events) */}
                            <div className={`absolute inset-x-4 bottom-4 ${hasBirthdaysOrAnniversaries ? 'top-20' : ''} pointer-events-none`} style={hasBirthdaysOrAnniversaries ? {} : { top: headerHeight }}>
                              <div className="grid grid-cols-7 h-full">
                                {Array.from({ length: 7 }).map((_, index) => (
                                  <div
                                    key={index}
                                    style={{
                                      borderRight: index < 6 ? `1px solid ${mode === 'chaos' ? '#1E3A8A' : mode === 'chill' ? '#4A1818' : '#000000'}` : 'none'
                                    }}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Events as Gantt bars - use grid for aligned columns */}
                            <div className={`space-y-2 relative z-10`} style={{ marginTop: hasBirthdaysOrAnniversaries ? '0' : '0' }}>
                              {filteredEvents.map((event) => {
                          const eventColor = getEventColor(event)
                          const span = getEventSpan(event)
                          const colSpan = span.endDay - span.startDay + 1
                          const startCol = span.startDay + 1
                          
                          // Check if this is an OOO event
                          const isOOO = event.calendarId.includes('6elnqlt8ok3kmcpim2vge0qqqk') || event.calendarId.includes('ojeuiov0bhit2k17g8d6gj4i68')
                          
                          // For OOO events, extract just the person's name
                          let displayText = event.summary
                          if (isOOO) {
                            // Remove [PENDING APPROVAL] prefix (case-insensitive)
                            displayText = displayText.replace(/^\[PENDING APPROVAL\]\s*/i, '')
                            // Extract just the name (before " - " or other details)
                            const nameMatch = displayText.match(/^([^-]+?)(?:\s*-\s*|\s+vacation|\s+parental|\s+leave)/i)
                            displayText = nameMatch ? nameMatch[1].trim() : displayText.split(' - ')[0].trim()
                          }
                          
                          // Height: half for OOO, full for others
                          const eventHeight = isOOO ? 'h-6' : 'h-12'
                          
                          return (
                            <div key={event.id} className="relative mb-2">
                              {/* Event bar spanning days - continuous line with padding only on edges */}
                              <div className="grid grid-cols-7">
                                {getWeekDays().map((day, index) => {
                                  const isInSpan = index >= span.startDay && index <= span.endDay
                                  if (!isInSpan) {
                                    return (
                                      <div 
                                        key={index} 
                                        className={`${eventHeight}`}
                                      ></div>
                                    )
                                  }
                                  
                                  const isStart = index === span.startDay
                                  const isEnd = index === span.endDay
                                  
                                  return (
                                    <div
                                      key={index}
                                      className={`${eventHeight} ${getRoundedClass(isStart && isEnd ? 'rounded-lg' : isStart ? 'rounded-l-lg' : isEnd ? 'rounded-r-lg' : '')} flex items-center`}
                                      style={{ 
                                        backgroundColor: `${eventColor}88`,
                                        borderLeft: isStart ? `3px solid ${eventColor}` : 'none',
                                        // Only add padding on the far left and far right edges
                                        paddingLeft: isStart ? '0.5rem' : '0',
                                        paddingRight: isEnd ? '0.5rem' : '0',
                                      }}
                                    >
                                      {isStart && (
                                        <div className="flex-1 min-w-0">
                                          {isOOO ? (
                                            <p className={`text-xs font-black truncate`} style={{ color: mode === 'chaos' ? '#000000' : mode === 'chill' ? '#4A1818' : '#FFFFFF' }}>{displayText}</p>
                                          ) : (
                                            <>
                                              <p className={`text-xs font-black truncate`} style={{ color: mode === 'chaos' ? '#000000' : mode === 'chill' ? '#4A1818' : '#FFFFFF' }}>{displayText}</p>
                                              <p className={`text-[10px]`} style={{ color: mode === 'chaos' ? 'rgba(0, 0, 0, 0.7)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.7)' : 'rgba(255, 255, 255, 0.7)' }}>{formatEventTime(event)}</p>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                        {filteredEvents.length === 0 && (
                          <p className={`text-sm text-center py-4`} style={{ color: mode === 'chaos' ? 'rgba(255, 255, 255, 0.8)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.8)' : 'rgba(255, 255, 255, 0.8)' }}>No events this week</p>
                        )}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                ) : (
                  // Today view
                  <div className="space-y-4 flex-1 flex flex-col">
                    {/* OOO People List */}
                    {(() => {
                      const oooEventsToday = calendarEvents.filter(event => {
                        const isOOO = event.calendarId.includes('6elnqlt8ok3kmcpim2vge0qqqk') || event.calendarId.includes('ojeuiov0bhit2k17g8d6gj4i68')
                        if (!isOOO) return false
                        
                        const eventStart = event.start.dateTime 
                          ? new Date(event.start.dateTime)
                          : event.start.date 
                            ? new Date(event.start.date)
                            : null
                        
                        if (!eventStart) return false
                        
                        // Check if event overlaps with today
                        const eventEnd = event.end.dateTime 
                          ? new Date(event.end.dateTime)
                          : event.end.date 
                            ? new Date(event.end.date)
                            : eventStart
                        
                        const actualEnd = event.end.date 
                          ? new Date(eventEnd.getTime() - 24 * 60 * 60 * 1000)
                          : eventEnd
                        
                        return eventStart <= todayEnd && actualEnd >= todayStart
                      })
                      
                      // Extract person names from event summaries (assuming format like "Name - reason")
                      const oooPeople = Array.from(new Set(
                        oooEventsToday
                          .map(event => {
                            // Remove [PENDING APPROVAL] prefix (case-insensitive)
                            let summary = event.summary.replace(/^\[PENDING APPROVAL\]\s*/i, '')
                            
                            // Extract name (usually before " - " or " vacation" etc)
                            const nameMatch = summary.match(/^([^-]+?)(?:\s*-\s*|\s+vacation|\s+parental|\s+leave)/i)
                            return nameMatch ? nameMatch[1].trim() : summary.split(' - ')[0].trim()
                          })
                          .filter(Boolean)
                      ))
                      
                      // Get birthdays and anniversaries for today
                      const todayBirthdays: string[] = []
                      const todayAnniversaries: Array<{ name: string; years: number }> = []
                      
                      const currentYear = now.getFullYear()
                      const todayMonth = now.getMonth() + 1
                      const todayDay = now.getDate()
                      
                      profiles.forEach(profile => {
                        // Check birthdays
                        if (profile.birthday) {
                          const [month, day] = profile.birthday.split('/').map(Number)
                          if (month === todayMonth && day === todayDay) {
                            todayBirthdays.push(profile.full_name || 'Unknown')
                          }
                        }
                        
                        // Check anniversaries
                        if (profile.start_date) {
                          const startDate = new Date(profile.start_date)
                          const startMonth = startDate.getMonth() + 1
                          const startDay = startDate.getDate()
                          
                          if (startMonth === todayMonth && startDay === todayDay) {
                            const years = currentYear - startDate.getFullYear()
                            todayAnniversaries.push({
                              name: profile.full_name || 'Unknown',
                              years
                            })
                          }
                        }
                      })
                      
                      return (
                        <div className="space-y-4">
                          {oooPeople.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs uppercase tracking-wider font-black text-black/70 mb-2">Out of Office Today</p>
                              <div className={`${getRoundedClass('rounded-lg')} p-4`} style={{ backgroundColor: '#FF6B6B20' }}>
                                <div className="flex flex-wrap gap-2.5">
                                  {oooPeople.map((name, idx) => (
                                    <span 
                                      key={idx}
                                      className={`text-sm font-semibold px-3 py-1.5 ${getRoundedClass('rounded-md')}`}
                                      style={{ 
                                        backgroundColor: '#FF6B6B',
                                        color: '#FFFFFF',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                                      }}
                                    >
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {todayBirthdays.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs uppercase tracking-wider font-black text-black/70 mb-2">🎂 Birthdays Today</p>
                              <div className={`${getRoundedClass('rounded-lg')} p-4`} style={{ backgroundColor: '#FFB6C120' }}>
                                <div className="flex flex-wrap gap-2.5">
                                  {todayBirthdays.map((name, idx) => (
                                    <span 
                                      key={idx}
                                      className={`text-sm font-semibold px-3 py-1.5 ${getRoundedClass('rounded-md')}`}
                                      style={{ 
                                        backgroundColor: '#FFB6C1',
                                        color: '#000000',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                                      }}
                                    >
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {todayAnniversaries.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs uppercase tracking-wider font-black text-black/70 mb-2">🎉 Anniversaries Today</p>
                              <div className={`${getRoundedClass('rounded-lg')} p-4`} style={{ backgroundColor: '#FFD70020' }}>
                                <div className="flex flex-wrap gap-2.5">
                                  {todayAnniversaries.map((item, idx) => (
                                    <span 
                                      key={idx}
                                      className={`text-sm font-semibold px-3 py-1.5 ${getRoundedClass('rounded-md')}`}
                                      style={{ 
                                        backgroundColor: '#FFD700',
                                        color: '#000000',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                                      }}
                                    >
                                      {item.name} ({item.years} year{item.years !== 1 ? 's' : ''})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                      return null
                    })()}
                    
                    {/* Other Events */}
                  <div className="space-y-2">
                    {(() => {
                      // Separate events into today and rest of week
                      const todayEvents: typeof filteredEvents = []
                      const restOfWeekEvents: typeof filteredEvents = []
                      
                      filteredEvents.forEach((event) => {
                        const eventStart = event.start.dateTime 
                          ? new Date(event.start.dateTime)
                          : event.start.date 
                            ? new Date(event.start.date)
                            : null
                        
                        if (!eventStart) return
                        
                        // Check if event starts today
                        const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate())
                        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                        
                        if (eventStartDate.getTime() === todayDate.getTime()) {
                          todayEvents.push(event)
                        } else {
                          restOfWeekEvents.push(event)
                        }
                      })
                      
                      // Sort today's events by time
                      todayEvents.sort((a, b) => {
                        const aTime = a.start.dateTime ? new Date(a.start.dateTime).getTime() : 0
                        const bTime = b.start.dateTime ? new Date(b.start.dateTime).getTime() : 0
                        return aTime - bTime
                      })
                      
                      // Sort rest of week events by date
                      restOfWeekEvents.sort((a, b) => {
                        const aStart = a.start.dateTime ? new Date(a.start.dateTime) : (a.start.date ? new Date(a.start.date) : new Date(0))
                        const bStart = b.start.dateTime ? new Date(b.start.dateTime) : (b.start.date ? new Date(b.start.date) : new Date(0))
                        return aStart.getTime() - bStart.getTime()
                      })
                      
                      if (todayEvents.length === 0 && restOfWeekEvents.length === 0) {
                        return <p className="text-sm text-black/80 text-center py-4">No events this week</p>
                      }
                      
                      return (
                        <>
                          {/* Today's Events */}
                          {todayEvents.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs uppercase tracking-wider font-black text-black/70 mb-2">Today</p>
                              {todayEvents.map((event) => {
                                const eventColor = getEventColor(event)
                                return (
                                  <div key={event.id} className={`${getRoundedClass('rounded-lg')} p-3 flex items-center gap-2`} style={{ backgroundColor: `${eventColor}33` }}>
                                    <Clock className="w-4 h-4" style={{ color: eventColor }} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-black text-black truncate">{event.summary}</p>
                                      <p className="text-xs text-black/60">{formatEventTime(event)}</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          
                          {/* Breaker Line */}
                          {todayEvents.length > 0 && restOfWeekEvents.length > 0 && (
                            <div className="flex items-center gap-2 my-4">
                              <div className="flex-1 border-t" style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}></div>
                              <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">Rest of Week</span>
                              <div className="flex-1 border-t" style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}></div>
                            </div>
                          )}
                          
                          {/* Rest of Week Events */}
                          {restOfWeekEvents.length > 0 && (
                            <div className="space-y-2">
                              {/* Header for Rest of Week */}
                              <p className="text-xs uppercase tracking-wider font-black text-black/70 mb-2">This Week's Events</p>
                              {restOfWeekEvents.map((event) => {
                                const eventColor = getEventColor(event)
                                const eventStart = event.start.dateTime 
                                  ? new Date(event.start.dateTime)
                                  : event.start.date 
                                    ? new Date(event.start.date)
                                    : null
                                
                                // Format date for display
                                const eventDateStr = eventStart 
                                  ? eventStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                  : ''
                                
                                return (
                                  <div key={event.id} className={`${getRoundedClass('rounded-lg')} p-3 flex items-center gap-2`} style={{ backgroundColor: `${eventColor}33` }}>
                                    <Clock className="w-4 h-4" style={{ color: eventColor }} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-black text-black truncate">{event.summary}</p>
                                      <p className="text-xs text-black/60">
                                        {eventDateStr} {formatEventTime(event) !== 'All Day' ? `at ${formatEventTime(event)}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )
                    })()}
                    </div>
                  </div>
                )}
                </div>
              </Card>
            )
          })()}

          {/* Pipeline with This Week stats bar above it */}
          <div className={`${eventsExpanded ? 'md:col-span-1' : 'md:col-span-2'} flex flex-col ${eventsExpanded ? 'gap-4 h-full' : 'gap-6'}`}>
            {/* This Week Stats Bar */}
            {(() => {
              const style = mode === 'chaos' ? getSpecificCardStyle('friday-drop') : getCardStyle('work')
              const mintColor = mode === 'chaos' ? '#00A3E0' : '#00FF87' // Work section uses Ocean from BLUE SYSTEM
              // Use this week stats from API, or show loading/empty state
              // Only show exactly 3 stats - filter by position 1-3 and take first 3
              let stats: Array<{ value: string; label: string }> = []
              
              if (thisWeekStatsLoading) {
                stats = [
                  { value: '...', label: 'loading' },
                  { value: '...', label: 'loading' },
                  { value: '...', label: 'loading' },
                ]
              } else if (thisWeekStats.length > 0) {
                // Filter to only positions 1-3, sort, and take exactly 3
                const filtered = thisWeekStats
                  .filter(stat => stat.position >= 1 && stat.position <= 3)
                  .sort((a, b) => a.position - b.position)
                  .slice(0, 3)
                  .map(stat => ({
                    value: stat.value,
                    label: stat.title,
                  }))
                
                // Ensure we have exactly 3 stats (pad with empty if needed)
                while (filtered.length < 3) {
                  filtered.push({ value: '0', label: '' })
                }
                // Strictly limit to exactly 3 stats
                stats = filtered.slice(0, 3)
                
                // Debug: log if we have more than 3
                if (filtered.length > 3) {
                  console.warn('More than 3 stats detected, limiting to 3:', filtered.length)
                }
              } else {
                stats = [
                  { value: '0', label: 'active projects' },
                  { value: '0', label: 'new business' },
                  { value: '0', label: 'pitches due' },
                ]
              }
              return (
                <Card 
                  className={`${style.bg} ${style.border} ${eventsExpanded ? 'p-6 flex-1' : 'py-3 px-6'} ${getRoundedClass('rounded-[2.5rem]')} transition-all duration-300 flex flex-col`} 
                  style={eventsExpanded ? {} : { flex: '0 0 auto', height: 'auto', minHeight: '70px' }}
                >
                  {eventsExpanded ? (
                    /* Horizontal stats view when expanded - labels below numbers */
                    <div className="flex flex-col gap-4 h-full">
                      <h2 className={`text-2xl font-black uppercase leading-none ${style.text}`}>THIS WEEK</h2>
                      <div className="flex items-center justify-between gap-4 flex-1">
                      {stats.slice(0, 3).map((stat, index) => (
                          <div 
                            key={`stat-${index}-${stat.value}`} 
                            className="flex flex-col items-center justify-center flex-1"
                          >
                            <div 
                              className={`text-5xl font-black ${style.text} px-4 py-2 rounded-lg mb-2 w-full text-center`}
                            style={{
                              backgroundColor: mode === 'chaos' ? 'rgba(14, 165, 233, 0.3)' : mode === 'chill' ? 'rgba(74,24,24,0.25)' : 'rgba(0,0,0,0.35)',
                            }}
                          >
                            {stat.value}
                          </div>
                            <div className={`text-xs font-black uppercase tracking-wider ${style.text} text-center`}>
                              {stat.label}
                            </div>
                        </div>
                      ))}
                      </div>
                    </div>
                  ) : (
                    /* Horizontal banner view when not expanded */
                    <div className="flex items-center justify-between gap-6 h-full">
                      <h2 className={`text-3xl font-black uppercase leading-none ${style.text} whitespace-nowrap`}>THIS WEEK</h2>
                      <div className="flex gap-4 items-center">
                      {stats.slice(0, 3).map((stat, index) => (
                        <div 
                          key={`stat-${index}-${stat.value}`} 
                            className={`flex flex-row items-center justify-center px-4 py-3 gap-3 ${getRoundedClass('rounded-2xl')} transition-all duration-300`}
                          style={{
                            backgroundColor: mode === 'chaos' ? 'rgba(14, 165, 233, 0.25)' : mode === 'chill' ? 'rgba(74,24,24,0.15)' : 'rgba(0,0,0,0.25)',
                            animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                          }}
                        >
                            <span className={`text-3xl font-black ${style.text} leading-none transition-all duration-300`}>
                            {stat.value}
                          </span>
                            <span className={`text-xs font-black uppercase tracking-wider ${style.text} transition-opacity duration-300 whitespace-nowrap`}>
                              {stat.label}
                            </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                  <style jsx>{`
                    @keyframes fadeInUp {
                      from {
                        opacity: 0;
                        transform: translateY(15px);
                      }
                      to {
                        opacity: 1;
                        transform: translateY(0);
                      }
                    }
                  `}</style>
                </Card>
              )
            })()}

            {/* Pipeline */}
            {(() => {
              // Explicitly capture completedFilter to ensure it's in scope
              const currentCompletedFilter = completedFilter
              const pipelineStyle = mode === 'chaos' ? getSpecificCardStyle('pipeline') : getCardStyle('work')
              const borderColor = pipelineStyle.accent
              
              const inProgressProjects = pipelineData.filter(p => p.status === 'In Progress')
              const pendingDecisionProjects = pipelineData.filter(p => p.status === 'Pending Decision')
              const wonProjects = pipelineData.filter(p => p.status === 'Won')
              const lostProjects = pipelineData.filter(p => p.status === 'Lost')
              
              // Calculate counts for displayed statuses
              const statusCounts = {
                'In Progress': pipelineData.filter(p => p.status === 'In Progress').length,
                'Pending Decision': pipelineData.filter(p => p.status === 'Pending Decision').length,
                'Won': pipelineData.filter(p => p.status === 'Won').length,
                'Lost': pipelineData.filter(p => p.status === 'Lost').length,
              }
              
              const formatDate = (dateString: string | null) => {
                if (!dateString) return null
                const date = new Date(dateString)
                return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
              }
              
              const handleProjectClick = (project: typeof pipelineData[0]) => {
                setSelectedPipelineProject(project)
                setIsPipelineDialogOpen(true)
              }
              
              const renderProjectItem = (project: typeof pipelineData[0], index: number, total: number) => {
                const date = formatDate(project.due_date)
                const displayText = project.type || project.description || 'Unknown'
              return (
                  <div key={project.id} className="flex items-start gap-3 py-2">
                    {/* Plus button on the left */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={`shrink-0 rounded-full border h-7 w-7 mt-0.5`}
                      style={{
                        backgroundColor: `${pipelineStyle.accent}20`,
                        borderColor: `${pipelineStyle.accent}40`,
                      }}
                      onClick={() => handleProjectClick(project)}
                    >
                      <Plus className={`size-4 ${pipelineStyle.text}`} />
                    </Button>
                    {/* Content */}
                    <div className="flex-1 min-w-0 text-sm">
                      {date && (
                        <div className={`${pipelineStyle.text}/60 mb-1 text-xs`}>{date}</div>
                      )}
                      <div className={`font-bold ${pipelineStyle.text} truncate`}>{project.name}</div>
                      <div className={`${pipelineStyle.text}/60 truncate text-xs`}>{displayText}</div>
                    </div>
                  </div>
                )
              }

              const renderWonLostItem = (project: typeof pipelineData[0], index: number) => {
                const clientName = project.name || ''
                const type = project.type || project.description || ''
                const displayText = type ? `${clientName} - ${type}` : clientName
                return (
                  <div key={project.id} className="flex items-start gap-2 py-1">
                    {/* Dot on the left */}
                    <div 
                      className="shrink-0 w-2 h-2 rounded-full mt-1.5"
                      style={{
                        backgroundColor: pipelineStyle.accent,
                      }}
                    />
                    {/* Content - wraps */}
                    <div className={`text-sm ${pipelineStyle.text} break-words min-w-0 flex-1`}>
                      {displayText}
                    </div>
                  </div>
                )
              }
              
                      return (
                <>
                  <Card 
                    className={`${pipelineStyle.bg} ${pipelineStyle.border} ${eventsExpanded ? 'p-6 flex-1' : 'p-6'} ${getRoundedClass('rounded-[2.5rem]')} transition-all duration-300 overflow-hidden`}
                    style={pipelineStyle.glow ? { boxShadow: `0 0 40px ${pipelineStyle.glow}` } : {}}
                  >
                    
                    {eventsExpanded ? (
                      /* Vertical stats view when expanded */
                      <div className="flex flex-col gap-2 h-full">
                        <h2 className={`text-2xl mb-3 font-black uppercase ${pipelineStyle.text}`}>PIPELINE</h2>
                        <div className="flex items-center justify-between">
                          <div className={`text-base ${pipelineStyle.text} font-normal tracking-wide`}>In Progress</div>
                          <div 
                            className={`text-5xl font-black ${pipelineStyle.text} px-4 py-2 rounded-lg`}
                            style={{
                              backgroundColor: mode === 'chaos' ? 'rgba(14, 165, 233, 0.3)' : mode === 'chill' ? 'rgba(74,24,24,0.25)' : 'rgba(0,0,0,0.35)',
                            }}
                          >
                            {pipelineLoading ? '0' : statusCounts['In Progress']}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`text-base ${pipelineStyle.text} font-normal tracking-wide`}>Pending Decision</div>
                          <div 
                            className={`text-5xl font-black ${pipelineStyle.text} px-4 py-2 rounded-lg`}
                            style={{
                              backgroundColor: mode === 'chaos' ? 'rgba(14, 165, 233, 0.3)' : mode === 'chill' ? 'rgba(74,24,24,0.25)' : 'rgba(0,0,0,0.35)',
                            }}
                          >
                            {pipelineLoading ? '0' : statusCounts['Pending Decision']}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`text-base ${pipelineStyle.text} font-normal tracking-wide`}>Won</div>
                          <div 
                            className={`text-5xl font-black ${pipelineStyle.text} px-4 py-2 rounded-lg`}
                            style={{
                              backgroundColor: mode === 'chaos' ? 'rgba(14, 165, 233, 0.3)' : mode === 'chill' ? 'rgba(74,24,24,0.25)' : 'rgba(0,0,0,0.35)',
                            }}
                          >
                            {pipelineLoading ? '0' : statusCounts['Won']}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`text-base ${pipelineStyle.text} font-normal tracking-wide`}>Lost</div>
                          <div 
                            className={`text-5xl font-black ${pipelineStyle.text} px-4 py-2 rounded-lg`}
                            style={{
                              backgroundColor: mode === 'chaos' ? 'rgba(14, 165, 233, 0.3)' : mode === 'chill' ? 'rgba(74,24,24,0.25)' : 'rgba(0,0,0,0.35)',
                            }}
                          >
                            {pipelineLoading ? '0' : statusCounts['Lost']}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* 3-column view when collapsed */
                      <div className="flex flex-col h-full">
                        <h2 className={`text-2xl mb-4 font-black uppercase ${pipelineStyle.text}`}>PIPELINE</h2>
                        <div className="grid grid-cols-3 gap-4 flex-1 overflow-hidden" style={{ maxHeight: '400px', height: '400px' }}>
                          {/* Column 1: In Progress */}
                          <div className="flex flex-col overflow-hidden h-full min-w-0">
                            <div className={`text-sm font-semibold ${pipelineStyle.text} mb-3 uppercase tracking-wide truncate`}>In Progress</div>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 min-h-0">
                          <div className="space-y-1">
                            {!pipelineLoading && inProgressProjects.length > 0 ? (
                              inProgressProjects.map((project, index) => 
                                renderProjectItem(project, index, inProgressProjects.length)
                              )
                            ) : (
                              <div className={`${pipelineStyle.text}/60 text-sm py-4`}>
                                No projects in progress
                  </div>
                            )}
                          </div>
                        </div>
                      </div>

                          {/* Column 2: Pending Decision */}
                          <div className="flex flex-col overflow-hidden h-full min-w-0">
                            <div className={`text-sm font-semibold ${pipelineStyle.text} mb-3 uppercase tracking-wide truncate`}>Pending Decision</div>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 min-h-0">
                              <div className="space-y-1">
                                {!pipelineLoading && pendingDecisionProjects.length > 0 ? (
                                  pendingDecisionProjects.map((project, index) => 
                                    renderProjectItem(project, index, pendingDecisionProjects.length)
                                  )
                                ) : (
                                  <div className={`${pipelineStyle.text}/60 text-sm py-4`}>
                                    No pending decisions
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Column 3: Won / Lost Split */}
                          <div className="flex flex-col overflow-hidden h-full min-w-0">
                            {/* Won - Top Half */}
                            <div className="flex flex-col flex-1 min-h-0 mb-4">
                              <div className={`text-sm font-semibold ${pipelineStyle.text} mb-3 uppercase tracking-wide truncate`}>Won</div>
                              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 min-h-0">
                                <div className="space-y-1">
                                  {!pipelineLoading && wonProjects.length > 0 ? (
                                    wonProjects.map((project, index) => 
                                      renderWonLostItem(project, index)
                                    )
                                  ) : (
                                    <div className={`${pipelineStyle.text}/60 text-sm py-4`}>
                                      No won projects
                                    </div>
                                  )}
                                </div>
                          </div>
                        </div>
                        
                            {/* Lost - Bottom Half */}
                            <div className="flex flex-col flex-1 min-h-0 border-t" style={{ borderColor: `${borderColor}40` }}>
                              <div className={`text-sm font-semibold ${pipelineStyle.text} mb-3 mt-4 uppercase tracking-wide truncate`}>Lost</div>
                              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 min-h-0">
                          <div className="space-y-1">
                                  {!pipelineLoading && lostProjects.length > 0 ? (
                                    lostProjects.map((project, index) => 
                                      renderWonLostItem(project, index)
                              )
                            ) : (
                              <div className={`${pipelineStyle.text}/60 text-sm py-4`}>
                                      No lost projects
                              </div>
                            )}
                                </div>
                              </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    )}
                </Card>

                  {/* Project Details Dialog */}
                  <Dialog open={isPipelineDialogOpen} onOpenChange={setIsPipelineDialogOpen}>
                    <DialogContent 
                      className="max-w-2xl"
                      style={{
                        backgroundColor: mode === 'chaos' ? '#1E3A8A' : mode === 'chill' ? '#FFFFFF' : '#1a1a1a',
                        borderColor: borderColor,
                        borderWidth: '2px',
                        opacity: 1,
                      }}
                    >
                      <DialogHeader>
                        <DialogTitle className={pipelineStyle.text}>
                          {selectedPipelineProject?.name}
                        </DialogTitle>
                        <DialogDescription className={`${pipelineStyle.text}/60`}>
                          {selectedPipelineProject?.type || selectedPipelineProject?.description || 'No description'}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {selectedPipelineProject && (
                        <div className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className={`text-sm font-semibold ${pipelineStyle.text} mb-1`}>Status</p>
                              <p className={`${pipelineStyle.text}/80`}>{selectedPipelineProject.status}</p>
                            </div>
                            {selectedPipelineProject.due_date && (
                              <div>
                                <p className={`text-sm font-semibold ${pipelineStyle.text} mb-1`}>Due Date</p>
                                <p className={`${pipelineStyle.text}/80`}>{formatDate(selectedPipelineProject.due_date)}</p>
                              </div>
                            )}
                          </div>
                          
                          {selectedPipelineProject.lead && (
                            <div>
                              <p className={`text-sm font-semibold ${pipelineStyle.text} mb-1`}>Lead</p>
                              <p className={`${pipelineStyle.text}/80`}>{selectedPipelineProject.lead}</p>
                            </div>
                          )}
                          
                          {selectedPipelineProject.team && (
                            <div>
                              <p className={`text-sm font-semibold ${pipelineStyle.text} mb-1`}>Team</p>
                              <p className={`${pipelineStyle.text}/80`}>{selectedPipelineProject.team}</p>
                            </div>
                          )}
                          
                          {selectedPipelineProject.description && (
                            <div>
                              <p className={`text-sm font-semibold ${pipelineStyle.text} mb-1`}>Description</p>
                              <p className={`${pipelineStyle.text}/80 whitespace-pre-wrap`}>{selectedPipelineProject.description}</p>
                            </div>
                          )}
                          
                          {selectedPipelineProject.notes && (
                            <div>
                              <p className={`text-sm font-semibold ${pipelineStyle.text} mb-1`}>Notes</p>
                              <p className={`${pipelineStyle.text}/80 whitespace-pre-wrap`}>{selectedPipelineProject.notes}</p>
                            </div>
                          )}
                          
                          {selectedPipelineProject.tier !== null && (
                            <div>
                              <p className="text-sm font-semibold text-white mb-1">Tier</p>
                              <p className="text-white/80">{selectedPipelineProject.tier}</p>
                            </div>
                          )}
                          
                          {selectedPipelineProject.url && (
                            <div>
                              <p className="text-sm font-semibold text-white mb-1">URL</p>
                              <a 
                              href={selectedPipelineProject.url || undefined} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-white/80 hover:text-white underline"
                              >
                                {selectedPipelineProject.url}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </>
              )
            })()}
          </div>
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
              <span className="text-[#808080]">WORK UPDATES</span>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
          Work Updates
              {(() => {
                const colors = getSectionAccentColors('work')
                return (
                  <span className="flex items-center gap-1.5 ml-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[0] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[1] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[2] }}></span>
                  </span>
                )
              })()}
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-start">
          {/* Right side container - Work Samples */}
          <div className="col-span-1 md:col-span-3 flex flex-col gap-6 h-full">

            {/* Work Samples - 3/4 width, fills remaining height, right under Friday Drop */}
            {(() => {
              const textStyle = mode === 'chaos' ? 'text-white' : mode === 'chill' ? 'text-[#4A1818]' : 'text-[#FFFFFF]'
              
              const handleSearchSubmit = (e: React.FormEvent) => {
                e.preventDefault()
                if (workSamplesSearchQuery.trim()) {
                  router.push(`/work-samples?search=${encodeURIComponent(workSamplesSearchQuery.trim())}`)
                } else {
                  router.push('/work-samples')
                }
              }
              
              // Check if a work sample matches a won pitch project
              const isWonProject = (projectName: string) => {
                return pipelineData.some(p => 
                  p.type?.toLowerCase() === 'pitch' &&
                  p.pitch_won === true &&
                  p.name.toLowerCase().trim() === projectName.toLowerCase().trim()
                )
              }
              
              return (
                <div className="flex-1 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-3xl font-black uppercase leading-tight ${textStyle}`}>RECENT WORK</h2>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => setShowChatbot(true)}
                        className={`${mode === 'chaos' ? 'hover:bg-[#2a2a2a]' : mode === 'chill' ? 'hover:bg-[#3A1414]' : 'hover:bg-[#1a1a1a] border border-[#FFFFFF]'} font-semibold ${getRoundedClass('rounded-full')} py-1.5 px-4 text-xs tracking-normal transition-all hover:shadow-lg ${mode === 'code' ? 'font-mono' : ''}`}
                        style={mode === 'chaos' ? {
                          backgroundColor: '#1a1a1a',
                          color: '#FFFFFF'
                        } : mode === 'chill' ? {
                          backgroundColor: '#4A1818',
                          color: '#FFFFFF'
                        } : mode === 'code' ? {
                          backgroundColor: '#000000',
                          color: '#FFFFFF'
                        } : {
                          backgroundColor: '#000000',
                          color: '#FFFFFF'
                        }}
                      >
                        {mode === 'code' ? '[DECKTALK]' : 'DeckTalk'} {mode !== 'code' && <Bot className="w-3 h-3 ml-1.5" />}
                      </Button>
                      <Link 
                        href="/work-samples"
                        className={`text-xs uppercase tracking-wider font-black ${textStyle} hover:opacity-70 transition-opacity`}
                      >
                        View All
                      </Link>
                      <form onSubmit={handleSearchSubmit} className="flex items-center">
                        <div className="relative">
                          <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 ${textStyle}/50`} />
                          <Input
                            type="text"
                            value={workSamplesSearchQuery}
                            onChange={(e) => setWorkSamplesSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className={`pl-8 h-8 w-48 text-xs ${mode === 'chaos' ? 'bg-black/30 border-gray-600 text-white placeholder:text-gray-500' : mode === 'chill' ? 'bg-white border-gray-300 text-[#4A1818] placeholder:text-gray-400' : 'bg-black/30 border-gray-600 text-white placeholder:text-gray-500'}`}
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-8">
                    {workSamples.length > 0 ? (
                      workSamples.map((sample) => (
                        <div key={sample.id} className="flex flex-col">
                          <div className="relative mb-3">
                          {sample.thumbnail_url ? (
                            <div className={`relative w-full aspect-video ${getRoundedClass('rounded-xl')} overflow-hidden border ${mode === 'chaos' ? 'border-gray-800' : mode === 'chill' ? 'border-gray-300' : 'border-gray-700'}`}>
                              <Image 
                                src={
                                  // Use proxy immediately for Airtable URLs (they're expired)
                                  sample.thumbnail_url.includes('airtable.com') || sample.thumbnail_url.includes('airtableusercontent.com')
                                    ? `/api/work-samples/thumbnail?url=${encodeURIComponent(sample.thumbnail_url)}`
                                    // For Supabase URLs, try direct first, fallback to proxy on error
                                    : sample.thumbnail_url
                                }
                                alt={sample.project_name}
                                fill
                                className="object-cover"
                                unoptimized={sample.thumbnail_url.includes('airtable.com') || sample.thumbnail_url.includes('airtableusercontent.com')}
                                onError={() => {
                                  // For Supabase URLs that fail, the proxy will handle it
                                  // Placeholder will show via conditional rendering
                                }}
                              />
                            </div>
                          ) : null}
                            <div className={`w-full aspect-video ${getRoundedClass('rounded-xl')} bg-gray-200 flex items-center justify-center border ${mode === 'chaos' ? 'border-gray-800' : mode === 'chill' ? 'border-gray-300' : 'border-gray-700'} ${sample.thumbnail_url ? 'hidden' : ''}`}>
                            <span className="text-gray-400 text-xs">No Image</span>
                            </div>
                            {/* Won Badge - appears over thumbnail when pitch is won */}
                            {sample.type?.name?.toLowerCase() === 'pitch' && sample.pitch_won && (
                              <div className={`absolute top-2 right-2 px-2 py-1 ${getRoundedClass('rounded-full')} bg-[#C4F500] text-black shadow-lg flex items-center gap-1 z-10`}>
                                <span className="text-xs font-black uppercase">Won</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {/* Date */}
                            <p className={`text-xs ${textStyle}/70`}>
                              {sample.date ? new Date(sample.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </p>
                            
                            {/* Title with external link and won badge */}
                            <div className="flex items-center gap-2">
                            {(sample.file_link || sample.file_url) ? (
                              <a
                                href={sample.file_link || sample.file_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-base font-black uppercase ${textStyle} hover:opacity-70 transition-opacity flex items-center gap-1`}
                              >
                                {sample.project_name}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <h3 className={`text-base font-black uppercase ${textStyle}`}>{sample.project_name}</h3>
                            )}
                              {isWonProject(sample.project_name) && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40">
                                  <Check className="w-3 h-3 text-green-500" />
                                </div>
                              )}
                            </div>
                            
                            {/* Client as badge */}
                            {sample.client && (
                              <div className={`inline-flex items-center px-2 py-1 rounded ${getRoundedClass('rounded-md')} bg-gray-800 w-fit`}>
                                <span className={`text-xs font-medium ${textStyle}`}>{sample.client}</span>
                              </div>
                            )}
                            
                            {/* Author with icon */}
                            {sample.author && (
                              <div className="flex items-center gap-2">
                                <User className={`w-3 h-3 ${textStyle}/70`} />
                                <p className={`text-xs ${textStyle}/70`}>
                                  {sample.author.full_name || sample.author.email}
                                </p>
                              </div>
                            )}
                            
                            {/* Description */}
                            {sample.description && (
                              <p className={`text-sm ${textStyle}/80 line-clamp-2`}>{sample.description}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className={`text-sm col-span-4 ${textStyle}/70`}>No work samples available</p>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Resources Section */}
        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
              <span className="text-[#808080]">RESOURCES</span>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
          Resources
              {(() => {
                // RED SYSTEM colors: Coral Red (#FF4C4C), Crimson (#C41E3A), Peach (#FFD4C4), Ocean Blue (#00A3E0)
                const redSystemColors = mode === 'chaos'
                  ? ['#FF4C4C', '#C41E3A', '#00A3E0'] // Coral Red, Crimson, Ocean Blue
                  : mode === 'chill'
                  ? ['#FF4C4C', '#C41E3A', '#FFD4C4'] // Coral Red, Crimson, Peach
                  : ['#FF4C4C', '#C41E3A', '#00A3E0']
                return (
                  <span className="flex items-center gap-1.5 ml-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: redSystemColors[0] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: redSystemColors[1] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: redSystemColors[2] }}></span>
                  </span>
                )
              })()}
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-stretch">
          {/* Ask The Hive */}
          {/* {(() => {
            // RED SYSTEM: Coral Red bg with Crimson accent (no colored borders on colored backgrounds)
            const hiveStyle = mode === 'chaos' 
              ? { bg: 'bg-[#FF4C4C]', border: 'border-0', glow: '', text: 'text-black', accent: '#C41E3A' } // Coral Red bg with Crimson accent
              : mode === 'chill'
              ? { bg: 'bg-white', border: 'border border-[#FF4C4C]/30', glow: '', text: 'text-[#4A1818]', accent: '#C41E3A' } // White bg with colored border
              : { bg: 'bg-[#000000]', border: 'border border-[#FF4C4C]', glow: '', text: 'text-white', accent: '#C41E3A' } // Black bg with colored border
            
            return (
              <Card className={`${hiveStyle.bg} ${hiveStyle.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} h-full flex flex-col`}
                    style={hiveStyle.glow ? { boxShadow: `0 0 40px ${hiveStyle.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: hiveStyle.accent }}>
              <MessageCircle className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Community</span>
            </div>
                <h2 className={`text-3xl font-black mb-6 uppercase ${hiveStyle.text}`}>ASK THE<br/>HIVE</h2>
            <div className="space-y-3 mb-4">
                  {[
                    { question: 'Best prototyping tool?', answers: '5 answers' },
                    { question: 'Handle difficult client?', answers: '12 answers' },
                  ].map((item) => (
                    <div key={item.question} className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} rounded-xl p-4 border-2`} style={{ borderColor: `${hiveStyle.accent}40` }}>
                      <p className={`text-sm font-black mb-1 ${hiveStyle.text}`}>{item.question}</p>
                      <p className={`text-xs font-medium ${hiveStyle.text}/70`}>{item.answers}</p>
              </div>
                  ))}
              </div>
                <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#C41E3A] hover:bg-[#0F0F0F]' : mode === 'chill' ? 'bg-[#4A1818] text-[#C41E3A] hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black rounded-full h-10 text-sm uppercase`}>
              Ask Question
            </Button>
          </Card>
            )
          })()} */}

          {/* Media (Playlist) */}
          {(() => {
            const playlistStyle = mode === 'chaos' ? getSpecificCardStyle('playlist') : getCardStyle('vibes')
            return (
              <Card id="playlist-section" className={`bg-transparent border-0 p-6 md:col-span-1 ${getRoundedClass('rounded-[2.5rem]')} h-full flex flex-col`}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: playlistStyle.accent }}>
                  <Music className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Weekly</span>
                </div>
                <h2 className={`text-3xl font-black mb-4 uppercase ${playlistStyle.text}`}>MEDIA</h2>
                {playlistLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: playlistStyle.accent }} />
                  </div>
                ) : weeklyPlaylist ? (
                  <div className="flex-1">
                    <SpotifyPlayer
                      playlist={{
                        title: weeklyPlaylist.title || 'Untitled Playlist',
                        curator: weeklyPlaylist.curator,
                        curatorPhotoUrl: weeklyPlaylist.curator_photo_url || undefined,
                        coverUrl: weeklyPlaylist.cover_url || undefined,
                        description: weeklyPlaylist.description || undefined,
                        spotifyUrl: weeklyPlaylist.spotify_url || undefined,
                        tracks: [],
                        totalDuration: weeklyPlaylist.total_duration || undefined,
                        trackCount: weeklyPlaylist.track_count || undefined,
                        artistsList: weeklyPlaylist.artists_list || undefined,
                      }}
                      onSpotifyLink={() => {
                        if (weeklyPlaylist.spotify_url) {
                          window.open(weeklyPlaylist.spotify_url, '_blank')
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className={`text-sm ${playlistStyle.text}/60`}>No playlist this week</p>
                  </div>
                )}
              </Card>
            )
          })()}

          {/* Latest Video */}
          {(() => {
            // RED SYSTEM: Crimson bg with Ocean Blue accent (no colored borders on colored backgrounds)
            const videoStyle = mode === 'chaos' 
              ? { bg: 'bg-[#C41E3A]', border: 'border-0', glow: '', text: 'text-white', accent: '#00A3E0' } // Crimson bg with Ocean Blue accent
              : mode === 'chill'
              ? { bg: 'bg-white', border: 'border border-[#C41E3A]/30', glow: '', text: 'text-[#4A1818]', accent: '#00A3E0' } // White bg with colored border
              : { bg: 'bg-[#000000]', border: 'border border-[#C41E3A]', glow: '', text: 'text-white', accent: '#00A3E0' } // Black bg with colored border
            
            return (
              <Card className={`${videoStyle.bg} ${videoStyle.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} h-full flex flex-col`}
                    style={videoStyle.glow ? { boxShadow: `0 0 40px ${videoStyle.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: videoStyle.accent }}>
                  <Video className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Watch</span>
        </div>
                <h2 className={`text-3xl font-black mb-6 uppercase ${videoStyle.text}`}>LATEST<br/>VIDEO</h2>
                <div className="mb-4 flex-1 overflow-y-auto">
                  {videosLoading ? (
                    <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} rounded-xl p-4 border-2 flex items-center justify-center`} style={{ borderColor: `${videoStyle.accent}40` }}>
                      <Loader2 className={`w-5 h-5 animate-spin ${videoStyle.text}`} />
                    </div>
                  ) : videos.length === 0 ? (
                    <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} rounded-xl p-4 border-2`} style={{ borderColor: `${videoStyle.accent}40` }}>
                      <p className={`text-sm font-black mb-1 ${videoStyle.text}`}>No videos yet</p>
                      <p className={`text-xs font-medium ${videoStyle.text}/70`}>Videos will appear here</p>
                    </div>
                  ) : (
                    <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} rounded-xl p-2 border-2`} style={{ borderColor: `${videoStyle.accent}40` }}>
                      <div className="mb-2">
                        <p className={`text-sm font-semibold ${videoStyle.text} line-clamp-2`}>{videos[0].title}</p>
                      </div>
                      <VideoEmbed
                        videoUrl={videos[0].video_url}
                        platform={videos[0].platform}
                        thumbnailUrl={videos[0].thumbnail_url}
                        aspectRatio="16/9"
                        className="border-0"
                      />
                    </div>
                  )}
                </div>
                <Link href="/media">
                  <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#00A3E0] hover:bg-[#0F0F0F]' : mode === 'chill' ? 'bg-[#4A1818] text-[#00A3E0] hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black rounded-full h-10 text-sm uppercase`}>
                    View Archive
                  </Button>
                </Link>
              </Card>
            )
          })()}

          {/* Must Reads */}
          {(() => {
            // RED SYSTEM: Peach bg with Ocean Blue accent (no colored borders on colored backgrounds)
            const mustReadsStyle = mode === 'chaos' 
              ? { bg: 'bg-[#FFD4C4]', border: 'border-0', glow: '', text: 'text-black', accent: '#00A3E0' } // Peach bg with Ocean Blue accent
              : mode === 'chill'
              ? { bg: 'bg-white', border: 'border border-[#FFD4C4]/30', glow: '', text: 'text-[#4A1818]', accent: '#00A3E0' } // White bg with colored border
              : { bg: 'bg-[#000000]', border: 'border border-[#FFD4C4]', glow: '', text: 'text-white', accent: '#00A3E0' } // Black bg with colored border
            
            return (
              <Card className={`${mustReadsStyle.bg} ${mustReadsStyle.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} h-full flex flex-col`}
                    style={mustReadsStyle.glow ? { boxShadow: `0 0 40px ${mustReadsStyle.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: mustReadsStyle.accent }}>
                  <FileText className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Latest</span>
                </div>
                <h2 className={`text-3xl font-black mb-4 uppercase ${mustReadsStyle.text}`}>MUST<br/>READS</h2>
                {mustReadsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: mustReadsStyle.accent }} />
                  </div>
                ) : (() => {
                  // Helper function to check if article is new
                  const isNew = (createdAt: string) => {
                    if (!lastVisitTime) return false
                    return new Date(createdAt) > new Date(lastVisitTime)
                  }
                  
                  // Helper function to check if article is from this week
                  const isThisWeek = (createdAt: string) => {
                    const articleDate = new Date(createdAt)
                    const now = new Date()
                    const weekStart = new Date(now)
                    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)) // Monday
                    weekStart.setHours(0, 0, 0, 0)
                    return articleDate >= weekStart
                  }
                  
                  // Separate pinned articles
                  const pinnedArticles = latestMustReads.filter(read => read.pinned)
                  
                  // Filter articles based on selected tab
                  let filteredArticles: typeof latestMustReads = []
                  if (selectedCategory === 'this-week') {
                    // Show non-pinned articles from this week
                    filteredArticles = latestMustReads
                      .filter(read => !read.pinned && isThisWeek(read.created_at))
                      .slice(0, 5)
                  } else {
                    // Show articles by category (non-pinned, latest 5)
                    filteredArticles = latestMustReads
                      .filter(read => !read.pinned && read.category === selectedCategory)
                      .slice(0, 5)
                  }
                  
                  const categories = ['technology', 'culture', 'fun', 'industry', 'craft']
                  const categoryLabels: Record<string, string> = {
                    'technology': 'Technology',
                    'culture': 'Culture',
                    'fun': 'Fun',
                    'industry': 'Industry',
                    'craft': 'Craft'
                  }
                  
                  // Category icons mapping
                  const categoryIcons: Record<string, any> = {
                    'technology': Zap,
                    'culture': Heart,
                    'fun': PartyPopper,
                    'industry': Briefcase,
                    'craft': Palette
                  }
                  
                  // Filter categories to only show if there are articles in that category (any articles, not just this week)
                  // Check both allMustReads (if loaded) and latestMustReads as fallback
                  const mustReadsToCheck = allMustReads.length > 0 ? allMustReads : latestMustReads
                  const availableCategories = categories.filter(cat => {
                    const hasCategory = mustReadsToCheck.some(read => 
                      !read.pinned && 
                      read.category && 
                      read.category.toLowerCase().trim() === cat.toLowerCase().trim()
                    )
                    return hasCategory
                  })
                  
                  // Debug: log all categories found in must-reads
                  if (process.env.NODE_ENV === 'development' && mustReadsToCheck.length > 0) {
                    const foundCategories = new Set(
                      mustReadsToCheck
                        .filter(read => !read.pinned && read.category)
                        .map(read => read.category?.toLowerCase().trim())
                        .filter(Boolean)
                    )
                    console.log('[Must Reads] Categories found in database:', Array.from(foundCategories))
                    console.log('[Must Reads] Available categories after filter:', availableCategories)
                    console.log('[Must Reads] Total must-reads checked:', mustReadsToCheck.length)
                  }
                  
                  const getCategoryIcon = (category: string | null) => {
                    if (!category || !categoryIcons[category]) return null
                    const IconComponent = categoryIcons[category]
                    return <IconComponent className="w-3 h-3" />
                  }
                  
                  return latestMustReads.length > 0 ? (
                  <div className="space-y-3 flex-1">
                      {/* Pinned Articles Section */}
                      {pinnedArticles.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2.5">
                            <Star className="w-4 h-4" style={{ color: mustReadsStyle.accent }} fill={mustReadsStyle.accent} />
                            <span className={`text-sm font-black uppercase ${mustReadsStyle.text}`}>Pinned</span>
                          </div>
                          <div className="space-y-1.5">
                            {pinnedArticles.map((read, index) => (
                      <a
                        key={read.id}
                        href={read.article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                                className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all group ${
                                  mode === 'chaos' ? 'bg-black/20 hover:bg-black/30' : 
                                  mode === 'chill' ? 'bg-[#F5E6D3]/30 hover:bg-[#F5E6D3]/40' : 
                                  'bg-white/5 hover:bg-white/10'
                                }`}
                              >
                                <p className={`text-sm font-black flex-1 ${mustReadsStyle.text} line-clamp-1 group-hover:underline`}>{read.article_title}</p>
                                <div className="flex items-center gap-2 shrink-0">
                                  {isNew(read.created_at) && (
                                    <Badge className="text-[8px] px-2 py-0.5 font-black uppercase" style={{ backgroundColor: mustReadsStyle.accent, color: mode === 'chill' ? '#4A1818' : 'white' }}>
                                      New
                                    </Badge>
                                  )}
                                  <span className={`text-xs ${mustReadsStyle.text}/60`}>
                                    {new Date(read.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                      </a>
                    ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Category Tabs */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <button
                          onClick={() => setSelectedCategory('this-week')}
                          className={`flex items-center gap-1.5 text-xs font-black uppercase px-3 py-2 rounded-md transition-all ${
                            selectedCategory === 'this-week'
                              ? `${mode === 'chaos' ? 'bg-black text-[#00A3E0]' : mode === 'chill' ? 'bg-[#4A1818] text-[#00A3E0]' : 'bg-white text-black'}`
                              : `opacity-50 hover:opacity-70 ${mustReadsStyle.text} ${mode === 'chaos' ? 'bg-black/20' : mode === 'chill' ? 'bg-[#F5E6D3]/20' : 'bg-white/5'}`
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          This Week
                        </button>
                        {availableCategories.map((cat) => {
                          const IconComponent = categoryIcons[cat]
                          return (
                            <button
                              key={cat}
                              onClick={() => setSelectedCategory(cat)}
                              className={`flex items-center gap-1.5 text-xs font-black uppercase px-3 py-2 rounded-md transition-all ${
                                selectedCategory === cat
                                  ? `${mode === 'chaos' ? 'bg-black text-[#00A3E0]' : mode === 'chill' ? 'bg-[#4A1818] text-[#00A3E0]' : 'bg-white text-black'}`
                                  : `opacity-50 hover:opacity-70 ${mustReadsStyle.text} ${mode === 'chaos' ? 'bg-black/20' : mode === 'chill' ? 'bg-[#F5E6D3]/20' : 'bg-white/5'}`
                              }`}
                            >
                              {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                              {categoryLabels[cat]}
                            </button>
                          )
                        })}
                      </div>
                      
                      {/* Filtered Articles Section */}
                      {filteredArticles.length > 0 ? (
                        <div className="space-y-1.5">
                          {filteredArticles.map((read) => {
                            const CategoryIcon = read.category ? categoryIcons[read.category] : null
                            return (
                              <a
                                key={read.id}
                                href={read.article_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all group ${
                                  mode === 'chaos' ? 'bg-black/20 hover:bg-black/30' : 
                                  mode === 'chill' ? 'bg-[#F5E6D3]/30 hover:bg-[#F5E6D3]/40' : 
                                  'bg-white/5 hover:bg-white/10'
                                }`}
                              >
                                {selectedCategory === 'this-week' && CategoryIcon && (
                                  <div style={{ color: mustReadsStyle.accent }}>
                                    <CategoryIcon className="w-4 h-4" />
                                  </div>
                                )}
                                <p className={`text-sm font-black flex-1 ${mustReadsStyle.text} line-clamp-1 group-hover:underline`}>{read.article_title}</p>
                                <div className="flex items-center gap-2 shrink-0">
                                  {isNew(read.created_at) && (
                                    <Badge className="text-[8px] px-2 py-0.5 font-black uppercase" style={{ backgroundColor: mustReadsStyle.accent, color: mode === 'chill' ? '#4A1818' : 'white' }}>
                                      New
                                    </Badge>
                                  )}
                                  <span className={`text-xs ${mustReadsStyle.text}/60`}>
                                    {new Date(read.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              </a>
                            )
                          })}
                          {/* View Archive Link */}
                          <Link
                            href="/media"
                            className={`block text-xs font-black uppercase opacity-60 hover:opacity-100 transition-all mt-4 text-center ${mustReadsStyle.text}`}
                          >
                            View Archive →
                          </Link>
                        </div>
                      ) : (
                        <div className="py-4">
                          <p className={`text-sm ${mustReadsStyle.text}/60 text-center`}>
                            {selectedCategory === 'this-week' 
                              ? 'No articles this week' 
                              : `No ${categoryLabels[selectedCategory]} articles`}
                          </p>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className={`text-sm ${mustReadsStyle.text}/60`}>No must reads yet</p>
                  </div>
                  )
                })()}
                <Link href="/admin/must-read">
                  <Button className={`w-full mt-4 ${mode === 'chaos' ? 'bg-black text-[#00A3E0] hover:bg-[#0F0F0F]' : mode === 'chill' ? 'bg-[#4A1818] text-[#00A3E0] hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black rounded-full h-10 text-sm uppercase`}>
                    View All Must Reads
                  </Button>
                </Link>
              </Card>
            )
          })()}

        </div>

        {/* Take a Break Section */}
        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
              <span className="text-[#808080]">TAKE A BREAK</span>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
          Take a Break
              {(() => {
                // RED SYSTEM colors: Coral Red (#FF4C4C), Crimson (#C41E3A), Peach (#FFD4C4), Ocean Blue (#00A3E0)
                const redSystemColors = mode === 'chaos'
                  ? ['#FF4C4C', '#C41E3A', '#00A3E0'] // Coral Red, Crimson, Ocean Blue
                  : mode === 'chill'
                  ? ['#FF4C4C', '#C41E3A', '#FFD4C4'] // Coral Red, Crimson, Peach
                  : ['#FF4C4C', '#C41E3A', '#00A3E0']
                return (
                  <span className="flex items-center gap-1.5 ml-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: redSystemColors[0] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: redSystemColors[1] }}></span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: redSystemColors[2] }}></span>
                  </span>
                )
              })()}
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-stretch">
          {/* Playlist */}
          {/* {(() => {
            const playlistStyle = mode === 'chaos' ? getSpecificCardStyle('playlist') : getCardStyle('vibes')
            return (
              <Card id="playlist-section" className={`bg-transparent border-0 p-6 md:col-span-1 ${getRoundedClass('rounded-[2.5rem]')} h-full flex flex-col`}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: playlistStyle.accent }}>
                  <Music className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Weekly</span>
                </div>
                <h2 className={`text-3xl font-black mb-4 uppercase ${playlistStyle.text}`}>PLAYLIST</h2>
                {playlistLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: playlistStyle.accent }} />
                  </div>
                ) : weeklyPlaylist ? (
                  <div className="flex-1">
                    <SpotifyPlayer
                      playlist={{
                        title: weeklyPlaylist.title || 'Untitled Playlist',
                        curator: weeklyPlaylist.curator,
                        curatorPhotoUrl: weeklyPlaylist.curator_photo_url || undefined,
                        coverUrl: weeklyPlaylist.cover_url || undefined,
                        description: weeklyPlaylist.description || undefined,
                        spotifyUrl: weeklyPlaylist.spotify_url || undefined,
                        tracks: [],
                        totalDuration: weeklyPlaylist.total_duration || undefined,
                        trackCount: weeklyPlaylist.track_count || undefined,
                        artistsList: weeklyPlaylist.artists_list || undefined,
                      }}
                      onSpotifyLink={() => {
                        if (weeklyPlaylist.spotify_url) {
                          window.open(weeklyPlaylist.spotify_url, '_blank')
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className={`text-sm ${playlistStyle.text}/60`}>No playlist this week</p>
                  </div>
                )}
              </Card>
            )
          })()} */}

          {/* Inspiration War */}
          {/* {(() => {
            const inspirationStyle = mode === 'chaos' ? getSpecificCardStyle('inspiration-war') : getCardStyle('hero')
            return (
              <Card className={`${inspirationStyle.bg} ${inspirationStyle.border} p-6 md:col-span-2 ${getRoundedClass('rounded-[2.5rem]')} h-full flex flex-col`}
                    style={inspirationStyle.glow ? { boxShadow: `0 0 40px ${inspirationStyle.glow}` } : {}}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm mb-2" style={{ color: inspirationStyle.accent }}>
                      <Lightbulb className="w-4 h-4" />
                      <span className="uppercase tracking-wider font-black text-xs">Today's Theme</span>
                    </div>
                    <h2 className={`text-3xl font-black uppercase ${inspirationStyle.text}`}>INSPIRATION<br/>WAR</h2>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#4A1818' : '#000000' }}>
                    <Sparkles className="w-6 h-6" style={{ color: inspirationStyle.accent }} />
                  </div>
                </div>
                <div className={`${mode === 'chaos' ? 'bg-black/10 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/10'} rounded-2xl p-3 border-2 mb-4`} style={{ borderColor: `${inspirationStyle.accent}20` }}>
                  <p className={`font-black text-sm text-center ${inspirationStyle.text}`}>Retro Futurism</p>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[16, 15, 9, 9].map((votes, i) => (
                    <div key={i} className={`${mode === 'chaos' ? 'bg-black/20 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/20'} rounded-2xl p-3 border-2 flex flex-col items-center justify-center hover:opacity-80 transition-all cursor-pointer group`} style={{ borderColor: `${inspirationStyle.accent}30` }}>
                      <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🎨</div>
                      <p className={`text-xs font-black ${inspirationStyle.text}`}>~{votes}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <p className={`font-black ${inspirationStyle.text}`}>🎨 24 entries</p>
                  <p className={`font-black ${inspirationStyle.text}`}>8h to vote</p>
                </div>
              </Card>
            )
          })()} */}
        </div>

        <div className="mb-6">
          {(() => {
            // RED SYSTEM: White/Black bg with Ocean Blue accent (Ocean Blue only as accent, not background)
            const searchStyle = mode === 'chaos' 
              ? { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#00A3E0' } // Black bg with Ocean Blue accent
              : mode === 'chill'
              ? { bg: 'bg-white', border: 'border-0', glow: '', text: 'text-[#4A1818]', accent: '#00A3E0' } // White bg with Ocean Blue accent
              : { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#00A3E0' } // Black bg with Ocean Blue accent
            
            return (
              <Card className={`${searchStyle.bg} ${searchStyle.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={searchStyle.glow ? { boxShadow: `0 0 40px ${searchStyle.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: searchStyle.accent }}>
                  <Search className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Find Anything</span>
                </div>
                <h2 className={`text-4xl font-black mb-6 uppercase ${searchStyle.text}`}>SEARCH</h2>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  handleUniversalSearch(universalSearchQuery)
                }} className="relative mb-4">
                  <Input 
                    value={universalSearchQuery}
                    onChange={(e) => {
                      setUniversalSearchQuery(e.target.value)
                      if (e.target.value.trim()) {
                        handleUniversalSearch(e.target.value)
                      } else {
                        setUniversalSearchResults([])
                        setUniversalSearchHasSearched(false)
                      }
                    }}
                    placeholder="Resources, people, projects..."
                    className={`${mode === 'chaos' ? 'bg-black/40 border-zinc-700' : mode === 'chill' ? 'bg-[#F5E6D3]/50 border-[#8B4444]/30' : 'bg-black/40 border-zinc-700'} ${searchStyle.text} placeholder:${searchStyle.text}/50 rounded-xl h-14 pr-14 font-medium`}
                  />
                  <Button 
                    type="submit"
                    className="absolute right-2 top-2 rounded-lg h-10 w-10 p-0" 
                    style={{ backgroundColor: searchStyle.accent, color: mode === 'chill' ? '#4A1818' : '#FFFFFF' }}
                    disabled={universalSearchLoading}
                  >
                    {universalSearchLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </Button>
                </form>
                
                {/* Search Results */}
                {universalSearchHasSearched && (
                  <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto">
                    {universalSearchLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: searchStyle.accent }} />
                        <p className={`text-sm ${searchStyle.text}/60`}>Searching...</p>
                      </div>
                    ) : universalSearchResults.length > 0 ? (
                      <>
                        <p className={`text-sm font-semibold ${searchStyle.text}/70 mb-2`}>
                          Found {universalSearchResults.length} result{universalSearchResults.length !== 1 ? 's' : ''}
                        </p>
                        {universalSearchResults.map((result, idx) => {
                          const getTypeIcon = () => {
                            switch (result.type) {
                              case 'resource': return <FileText className="w-4 h-4" />
                              case 'work_sample': return <Briefcase className="w-4 h-4" />
                              case 'must_read': return <FileText className="w-4 h-4" />
                              case 'news': return <MessageSquare className="w-4 h-4" />
                              case 'person': return <User className="w-4 h-4" />
                              case 'project': return <TrendingUp className="w-4 h-4" />
                              case 'playlist': return <Music className="w-4 h-4" />
                              default: return <Search className="w-4 h-4" />
                            }
                          }

                          const getTypeLabel = () => {
                            switch (result.type) {
                              case 'resource': return 'Resource'
                              case 'work_sample': return 'Work Sample'
                              case 'must_read': return 'Must Read'
                              case 'news': return 'News'
                              case 'person': return 'Person'
                              case 'project': return 'Project'
                              case 'playlist': return 'Playlist'
                              default: return 'Item'
                            }
                          }

                          const handleClick = () => {
                            if (result.url) {
                              window.open(result.url, '_blank')
                            } else {
                              // Navigate based on type
                              switch (result.type) {
                                case 'resource':
                                  router.push(`/resources`)
                                  break
                                case 'work_sample':
                                  router.push(`/work-samples`)
                                  break
                                case 'must_read':
                                  router.push(`/`)
                                  break
                                case 'news':
                                  router.push(`/`)
                                  break
                                case 'person':
                                  router.push(`/team/directory`)
                                  break
                                case 'project':
                                  router.push(`/`)
                                  break
                                case 'playlist':
                                  router.push(`/vibes`)
                                  break
                              }
                            }
                          }

                          return (
                            <Card
                              key={`${result.type}-${result.id}-${idx}`}
                              className={`${mode === 'chaos' ? 'bg-black/30 border-zinc-700/50' : mode === 'chill' ? 'bg-white/50 border-[#8B4444]/20' : 'bg-black/30 border-zinc-700/50'} p-4 cursor-pointer hover:opacity-80 transition-opacity`}
                              onClick={handleClick}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5" style={{ color: searchStyle.accent }}>
                                  {getTypeIcon()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className={`font-semibold ${searchStyle.text} truncate`}>{result.title}</h3>
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs"
                                      style={{ 
                                        borderColor: searchStyle.accent,
                                        color: searchStyle.accent
                                      }}
                                    >
                                      {getTypeLabel()}
                                    </Badge>
                                  </div>
                                  {result.description && (
                                    <p className={`text-sm ${searchStyle.text}/70 line-clamp-2 mb-2`}>
                                      {result.description}
                                    </p>
                                  )}
                                  {result.metadata && (
                                    <div className="flex flex-wrap gap-2 text-xs">
                                      {result.metadata.category && (
                                        <span className={`${searchStyle.text}/50`}>Category: {result.metadata.category}</span>
                                      )}
                                      {result.metadata.role && (
                                        <span className={`${searchStyle.text}/50`}>Role: {result.metadata.role}</span>
                                      )}
                                      {result.metadata.status && (
                                        <span className={`${searchStyle.text}/50`}>Status: {result.metadata.status}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {result.url && (
                                  <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: searchStyle.accent }} />
                                )}
                              </div>
                            </Card>
                          )
                        })}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Search className="w-8 h-8 mx-auto mb-2" style={{ color: searchStyle.accent, opacity: 0.5 }} />
                        <p className={`text-sm ${searchStyle.text}/60`}>No results found</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })()}
        </div>

        {/* Loom Standup - Hidden for now */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 items-stretch">
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('loom-standup') : getCardStyle('team')
            const standupColors = mode === 'chaos'
              ? ['#FF8C42', '#7A5C3D', '#D4C4A8'] // ORANGE SYSTEM: Orange, Brown, Tan
              : mode === 'chill'
              ? ['#4A9BFF', '#8B4444', '#FFB5D8']
              : ['#cccccc', '#999999', '#e5e5e5']
            const standups = [
              { name: 'Alex', time: '3:22', color: standupColors[0] },
              { name: 'Sarah', time: '2:15', color: standupColors[1] },
              { name: 'Mike', time: '4:01', color: standupColors[2] },
              { name: 'Chris', time: 'On Leave', isLeave: true },
            ]
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} h-full flex flex-col`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
              <Video className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Daily</span>
            </div>
                <h2 className={`text-4xl font-black mb-6 uppercase ${style.text}`}>LOOM<br/>STANDUP</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
                  {standups.map((standup, idx) => (
                    <div key={standup.name} className={`${standup.isLeave ? `${mode === 'chaos' ? 'bg-black/80' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/80'} border border-white/20` : ''} rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer`} style={!standup.isLeave ? { backgroundColor: style.accent } : {}}>
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: standup.isLeave ? (mode === 'code' ? '#666666' : '#666666') : standup.color }}>
                        {standup.isLeave ? <Users className={`w-8 h-8 ${mode === 'code' ? 'text-white' : 'text-zinc-400'}`} /> : <Video className="w-8 h-8 text-white" />}
                </div>
                      <p className={`text-xs font-black ${standup.isLeave ? style.text : (mode === 'chill' ? 'text-[#4A1818]' : 'text-black')}`}>{standup.name}</p>
                      <p className={`text-xs ${standup.isLeave ? `${style.text}/60` : (mode === 'chill' ? 'text-[#4A1818]/70' : 'text-zinc-700')}`}>{standup.time}</p>
              </div>
                  ))}
            </div>
          </Card>
            )
          })()}
        </div> */}


        <Footer />
      </main>
      
      {/* Profile Setup Modal - Shows only for users missing required profile details */}
      <ProfileSetupModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        onComplete={() => {
          // Refresh horoscope data after profile is completed
          window.location.reload()
        }}
      />

      {/* Add Snap Dialog */}
      <AddSnapDialog
        open={showAddSnapDialog}
        onOpenChange={setShowAddSnapDialog}
        onSuccess={handleSnapAdded}
      />
      <Chatbot
        open={showChatbot}
        onOpenChange={setShowChatbot}
      />

      {/* Weekly Playlist Dialog */}
      <Dialog open={isPlaylistDialogOpen} onOpenChange={setIsPlaylistDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {playlistLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : weeklyPlaylist ? (
            <SpotifyPlayer
              playlist={{
                title: weeklyPlaylist.title || 'Untitled Playlist',
                curator: weeklyPlaylist.curator,
                curatorPhotoUrl: weeklyPlaylist.curator_photo_url || undefined,
                coverUrl: weeklyPlaylist.cover_url || undefined,
                description: weeklyPlaylist.description || undefined,
                spotifyUrl: weeklyPlaylist.spotify_url || undefined,
                tracks: [],
                totalDuration: weeklyPlaylist.total_duration || undefined,
                trackCount: weeklyPlaylist.track_count || undefined,
                artistsList: weeklyPlaylist.artists_list || undefined,
              }}
              onSpotifyLink={() => {
                if (weeklyPlaylist.spotify_url) {
                  window.open(weeklyPlaylist.spotify_url, '_blank')
                }
              }}
            />
          ) : (
            <div className="text-center py-16 px-6">
              <p className="text-sm text-muted-foreground">No playlist this week</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
